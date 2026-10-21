import Task from '../models/Task.js'
import TaskAssignment from '../models/TaskAssignment.js'
import TaskComment from '../models/TaskComment.js'
import { validateOwnedSubject } from '../services/subject.service.js'
import { getActiveMembership } from '../services/group.service.js'
import { canAccessTask, visibleTaskFilter } from '../services/taskAccess.service.js'
import { runInTransaction } from '../services/transaction.service.js'
import { recordActivity } from '../services/activity.service.js'
import { nextDueDate } from '../utils/dates.js'

// Sorting ranks keep priority and status in human order instead of the
// alphabetical order a plain Mongo sort would give ("high, low, medium").
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }
const STATUS_RANK = { 'in-progress': 0, todo: 1, completed: 2, cancelled: 3 }

// Escapes regex characters so a search for "C++" cannot break the query.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Ensures an attached group exists and the creator is an active member of it.
// Attaching a group only adds context — it never grants anyone task access.
async function validateTaskGroup(userId, groupId) {
  if (!groupId) return null
  const membership = await getActiveMembership(groupId, userId)
  if (!membership) return 'Group not found.'
  return null
}

// Comparator used for server-side sorting of the filtered list.
function compareTasks(a, b, sortKey, order) {
  const direction = order === 'desc' ? -1 : 1

  if (sortKey === 'priority') {
    return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * direction
  }
  if (sortKey === 'status') {
    return (STATUS_RANK[a.status] - STATUS_RANK[b.status]) * direction
  }
  if (sortKey === 'title') {
    return a.title.localeCompare(b.title) * direction
  }
  if (sortKey === 'createdAt') {
    return (new Date(a.createdAt) - new Date(b.createdAt)) * direction
  }

  // dueDate (default): tasks without a date always sort last
  if (!a.dueDate || !b.dueDate) {
    if (!a.dueDate && !b.dueDate) return 0
    return a.dueDate ? -1 : 1
  }
  return (new Date(a.dueDate) - new Date(b.dueDate)) * direction
}

// Creates the next copy of a recurring task and records the link on the
// completed task. Returns null when the task does not repeat, has no due
// date, or already spawned its successor.
async function scheduleNextOccurrence(task) {
  if (task.recurrence === 'none' || !task.dueDate || task.nextOccurrenceId) return null

  const nextTask = await Task.create({
    owner: task.owner,
    subject: task.subject,
    kind: task.kind,
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: nextDueDate(task.dueDate, task.recurrence),
    estimatedMinutes: task.estimatedMinutes,
    recurrence: task.recurrence,
  })

  task.nextOccurrenceId = nextTask._id
  await task.save()
  await nextTask.populate('subject', 'name color code')
  await nextTask.populate('group', 'name')

  return nextTask
}

// GET /api/tasks — supports kind, status, priority, subject, search,
// sort and order query parameters. The access filter covers tasks the user
// owns and tasks assigned to them; every other filter composes with it.
export async function listTasks(req, res) {
  const { kind, status, priority, subject, search, sort = 'dueDate', order = 'asc' } = req.query

  const filter = { ...(await visibleTaskFilter(req.user._id)) }
  if (kind) filter.kind = kind
  if (status) filter.status = status
  if (priority) filter.priority = priority
  if (subject) filter.subject = subject

  if (search && search.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i')
    // Search narrows the visible set; it is merged through $and because
    // assigning $or here would replace the access filter's $or and widen
    // visibility for assignees.
    filter.$and = [...(filter.$and ?? []), { $or: [{ title: pattern }, { description: pattern }] }]
  }

  const tasks = await Task.find(filter).populate('subject', 'name color code')
  const validSort = ['dueDate', 'priority', 'status', 'title', 'createdAt'].includes(sort)
    ? sort
    : 'dueDate'
  tasks.sort((a, b) => compareTasks(a, b, validSort, order === 'desc' ? 'desc' : 'asc'))

  res.status(200).json({ success: true, data: { tasks } })
}

// POST /api/tasks — create a task or assignment for the signed-in user.
export async function createTask(req, res) {
  const subjectError = await validateOwnedSubject(req.user._id, req.body.subject)
  if (subjectError) {
    return res.status(400).json({ success: false, message: subjectError })
  }

  const groupError = await validateTaskGroup(req.user._id, req.body.group)
  if (groupError) {
    return res.status(400).json({ success: false, message: groupError })
  }

  const payload = { ...req.body, owner: req.user._id }

  if (payload.recurrence && payload.recurrence !== 'none' && !payload.dueDate) {
    return res.status(400).json({ success: false, message: 'Recurring tasks need a due date.' })
  }

  if (payload.status === 'completed') payload.completedAt = new Date()

  const task = await runInTransaction(async (session) => {
    const options = session ? { session } : {}
    const [created] = await Task.create([{ ...payload }], options)
    await recordActivity({
      taskId: created._id,
      actorId: req.user._id,
      action: 'task_created',
      details: { title: created.title, kind: created.kind },
      session,
    })
    return created
  })
  await task.populate('subject', 'name color code')
  await task.populate('group', 'name')

  // Creating an already-completed recurring task still schedules the next one.
  const nextOccurrence = task.status === 'completed' ? await scheduleNextOccurrence(task) : null

  res.status(201).json({ success: true, message: 'Task created.', data: { task, nextOccurrence } })
}

// PATCH /api/tasks/:id — partial update. Status changes keep completedAt
// in sync so analytics and streaks stay accurate.
export async function updateTask(req, res) {
  const task = await Task.findOne({ _id: req.params.id, owner: req.user._id })
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found.' })
  }

  if ('subject' in req.body) {
    const subjectError = await validateOwnedSubject(req.user._id, req.body.subject)
    if (subjectError) {
      return res.status(400).json({ success: false, message: subjectError })
    }
  }

  if ('group' in req.body) {
    const groupError = await validateTaskGroup(req.user._id, req.body.group)
    if (groupError) {
      return res.status(400).json({ success: false, message: groupError })
    }
  }

  const previousStatus = task.status
  const wasCompleted = previousStatus === 'completed'

  const changedFields = []
  for (const field of [
    'title',
    'description',
    'subject',
    'group',
    'status',
    'priority',
    'dueDate',
    'estimatedMinutes',
    'recurrence',
  ]) {
    if (field in req.body) {
      task[field] = req.body[field]
      changedFields.push(field)
    }
  }

  if (task.recurrence !== 'none' && !task.dueDate) {
    return res.status(400).json({ success: false, message: 'Recurring tasks need a due date.' })
  }

  if ('status' in req.body) {
    task.completedAt = req.body.status === 'completed' ? task.completedAt || new Date() : null
  }

  const details = { fields: changedFields }
  if (changedFields.includes('status')) {
    details.statusFrom = previousStatus
    details.statusTo = task.status
  }

  // The task write and its activity entry commit or roll back together.
  await runInTransaction(async (session) => {
    await task.save({ session })
    await recordActivity({
      taskId: task._id,
      actorId: req.user._id,
      action: 'task_updated',
      details,
      session,
    })
  })
  await task.populate('subject', 'name color code')
  await task.populate('group', 'name')

  // Only the todo/in-progress -> completed transition spawns a successor;
  // re-completing an already-linked task stays idempotent.
  const justCompleted = task.status === 'completed' && !wasCompleted
  const nextOccurrence = justCompleted ? await scheduleNextOccurrence(task) : null

  res.status(200).json({ success: true, message: 'Task updated.', data: { task, nextOccurrence } })
}

// DELETE /api/tasks/:id — owner-scoped delete. Assignments and comments go
// with the task; activity entries remain as append-only history.
export async function deleteTask(req, res) {
  const task = await Task.findOne({ _id: req.params.id, owner: req.user._id })
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found.' })
  }

  await runInTransaction(async (session) => {
    await TaskAssignment.deleteMany({ task: task._id }, { session })
    await TaskComment.deleteMany({ task: task._id }, { session })
    await recordActivity({
      taskId: task._id,
      actorId: req.user._id,
      action: 'task_deleted',
      details: { title: task.title },
      session,
    })
    await task.deleteOne({ session })
  })

  res.status(200).json({ success: true, message: 'Task deleted.' })
}

// GET /api/tasks/:id — task detail with its assignments. Visible to the
// creator and to assigned users only; myAssignment carries the caller's own
// assignment state when they are an assignee, and stays null for the creator.
export async function getTask(req, res) {
  const { task, hasAccess } = await canAccessTask(req.params.id, req.user._id)
  if (!task || !hasAccess) {
    return res.status(404).json({ success: false, message: 'Task not found.' })
  }

  const assignments = await TaskAssignment.find({ task: task._id })
    .populate('assignee', 'name email')
    .sort({ createdAt: 1 })

  const myAssignment =
    assignments.find((item) => String(item.assignee._id) === String(req.user._id)) ?? null

  await task.populate('subject', 'name color code')
  await task.populate('group', 'name')

  res.status(200).json({ success: true, data: { task, assignments, myAssignment } })
}
