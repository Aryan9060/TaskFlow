import Task from '../models/Task.js'
import { validateOwnedSubject } from '../services/subject.service.js'
import { nextDueDate } from '../utils/dates.js'

// Sorting ranks keep priority and status in human order instead of the
// alphabetical order a plain Mongo sort would give ("high, low, medium").
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }
const STATUS_RANK = { 'in-progress': 0, todo: 1, completed: 2 }

// Escapes regex characters so a search for "C++" cannot break the query.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

  return nextTask
}

// GET /api/tasks — supports kind, status, priority, subject, search,
// sort and order query parameters. Every query stays scoped to the owner.
export async function listTasks(req, res) {
  const { kind, status, priority, subject, search, sort = 'dueDate', order = 'asc' } = req.query

  const filter = { owner: req.user._id }
  if (kind) filter.kind = kind
  if (status) filter.status = status
  if (priority) filter.priority = priority
  if (subject) filter.subject = subject

  if (search && search.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i')
    filter.$or = [{ title: pattern }, { description: pattern }]
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

  const payload = { ...req.body, owner: req.user._id }

  if (payload.recurrence && payload.recurrence !== 'none' && !payload.dueDate) {
    return res.status(400).json({ success: false, message: 'Recurring tasks need a due date.' })
  }

  if (payload.status === 'completed') payload.completedAt = new Date()

  const task = await Task.create(payload)
  await task.populate('subject', 'name color code')

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

  const wasCompleted = task.status === 'completed'

  for (const field of [
    'title',
    'description',
    'subject',
    'status',
    'priority',
    'dueDate',
    'estimatedMinutes',
    'recurrence',
  ]) {
    if (field in req.body) task[field] = req.body[field]
  }

  if (task.recurrence !== 'none' && !task.dueDate) {
    return res.status(400).json({ success: false, message: 'Recurring tasks need a due date.' })
  }

  if ('status' in req.body) {
    task.completedAt = req.body.status === 'completed' ? task.completedAt || new Date() : null
  }

  await task.save()
  await task.populate('subject', 'name color code')

  // Only the todo/in-progress -> completed transition spawns a successor;
  // re-completing an already-linked task stays idempotent.
  const justCompleted = task.status === 'completed' && !wasCompleted
  const nextOccurrence = justCompleted ? await scheduleNextOccurrence(task) : null

  res.status(200).json({ success: true, message: 'Task updated.', data: { task, nextOccurrence } })
}

// DELETE /api/tasks/:id — owner-scoped delete.
export async function deleteTask(req, res) {
  const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id })
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found.' })
  }

  res.status(200).json({ success: true, message: 'Task deleted.' })
}
