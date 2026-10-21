import Task from '../models/Task.js'
import TaskAssignment from '../models/TaskAssignment.js'
import User from '../models/User.js'
import { canAccessTask } from '../services/taskAccess.service.js'
import {
  isValidAssigneeTransition,
  canReviewAssignment,
  applyAssignmentStatus,
  TERMINAL_ASSIGNMENT_STATUSES,
} from '../services/assignment.service.js'
import { runInTransaction } from '../services/transaction.service.js'
import { recordActivity } from '../services/activity.service.js'
import { notifyUsers } from '../services/notification.service.js'

const ASSIGNEE_SNAPSHOT = 'name email'

// Maps a new assignment status to its activity action and notification verb.
const ACTION_BY_STATUS = {
  accepted: 'assignment_accepted',
  declined: 'assignment_declined',
  in_progress: 'assignment_started',
  submitted: 'assignment_submitted',
  cancelled: 'assignment_cancelled',
}
const VERB_BY_STATUS = {
  accepted: 'accepted their assignment on',
  declined: 'declined their assignment on',
  in_progress: 'started working on',
  submitted: 'submitted work for',
  cancelled: 'cancelled an assignment on',
}

// Shared gate for the assignment subroutes: the task must exist and the actor
// must be its creator or an assignee. Group membership alone never passes.
async function loadAccessibleTask(taskId, userId) {
  const { task, hasAccess } = await canAccessTask(taskId, userId)
  return hasAccess ? task : null
}

// Loads one assignment by task + assignee id with the assignee populated.
async function findAssignment(taskId, assigneeId) {
  return TaskAssignment.findOne({ task: taskId, assignee: assigneeId }).populate(
    'assignee',
    ASSIGNEE_SNAPSHOT
  )
}

// POST /api/tasks/:id/assignments — the creator assigns a registered user,
// starting a fresh pending lifecycle for that assignee.
export async function createAssignment(req, res) {
  const task = await loadAccessibleTask(req.params.id, req.user._id)
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found.' })
  }
  if (String(task.owner) !== String(req.user._id)) {
    return res
      .status(403)
      .json({ success: false, message: 'Only the task creator can assign collaborators.' })
  }

  const assignee = await User.findOne({ email: req.body.email })
  if (!assignee) {
    return res.status(404).json({ success: false, message: 'No registered user with that email.' })
  }
  if (String(assignee._id) === String(req.user._id)) {
    return res
      .status(400)
      .json({ success: false, message: 'You are the creator; assigning yourself is not needed.' })
  }

  const existing = await TaskAssignment.exists({ task: task._id, assignee: assignee._id })
  if (existing) {
    return res.status(409).json({ success: false, message: 'That user is already assigned to this task.' })
  }

  const assignment = await runInTransaction(async (session) => {
    const options = session ? { session } : {}
    const [created] = await TaskAssignment.create(
      [{ task: task._id, assignee: assignee._id, assignedBy: req.user._id }],
      options
    )
    await recordActivity({
      taskId: task._id,
      actorId: req.user._id,
      action: 'assignment_created',
      details: { assigneeId: String(assignee._id) },
      session,
    })
    await notifyUsers({
      userIds: [String(assignee._id)],
      actorId: req.user._id,
      type: 'assignment_created',
      message: `${req.user.name} assigned you "${task.title}"`,
      taskId: task._id,
      session,
    })
    return created
  })
  await assignment.populate('assignee', ASSIGNEE_SNAPSHOT)

  res.status(201).json({ success: true, message: 'Assignment created.', data: { assignment } })
}

// GET /api/tasks/:id/assignments — every assignment on a task the actor may see.
export async function listTaskAssignments(req, res) {
  const task = await loadAccessibleTask(req.params.id, req.user._id)
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found.' })
  }

  const assignments = await TaskAssignment.find({ task: task._id })
    .populate('assignee', ASSIGNEE_SNAPSHOT)
    .sort({ createdAt: 1 })

  res.status(200).json({ success: true, data: { assignments } })
}

// GET /api/assignments/mine — the caller's assignments across all tasks,
// optionally filtered by status (e.g. ?status=pending).
export async function listMyAssignments(req, res) {
  const filter = { assignee: req.user._id }
  if (req.query.status) filter.status = req.query.status

  const assignments = await TaskAssignment.find(filter)
    .populate('task', 'title description dueDate status priority kind')
    .populate('assignedBy', 'name')
    .sort({ updatedAt: -1 })

  res.status(200).json({ success: true, data: { assignments } })
}

// PATCH /api/tasks/:id/assignments/:userId — assignees drive their own
// lifecycle; only the creator may cancel (from a non-terminal state).
export async function transitionAssignment(req, res) {
  const task = await loadAccessibleTask(req.params.id, req.user._id)
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found.' })
  }

  const assignment = await findAssignment(task._id, req.params.userId)
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Assignment not found.' })
  }

  const next = req.body.status
  const isAssignee = String(assignment.assignee._id) === String(req.user._id)
  const isCreator = String(task.owner) === String(req.user._id)

  if (next === 'cancelled') {
    if (!isCreator) {
      return res.status(403).json({ success: false, message: 'Only the task creator can cancel an assignment.' })
    }
    if (TERMINAL_ASSIGNMENT_STATUSES.includes(assignment.status)) {
      return res
        .status(400)
        .json({ success: false, message: `An assignment that is ${assignment.status} cannot be cancelled.` })
    }
  } else {
    if (!isAssignee) {
      return res.status(403).json({ success: false, message: 'Only the assignee can update this assignment.' })
    }
    if (!isValidAssigneeTransition(assignment.status, next)) {
      return res
        .status(400)
        .json({ success: false, message: `Cannot move an assignment from ${assignment.status} to ${next}.` })
    }
  }

  const previousStatus = assignment.status
  applyAssignmentStatus(assignment, next)
  if (req.body.note) assignment.note = req.body.note

  const assigneeId = String(assignment.assignee._id)

  await runInTransaction(async (session) => {
    await assignment.save({ session })
    await recordActivity({
      taskId: task._id,
      actorId: req.user._id,
      action: ACTION_BY_STATUS[next],
      details: { from: previousStatus, to: next, assigneeId },
      session,
    })
    // Assignee moves inform the creator; a creator cancellation informs the assignee.
    await notifyUsers({
      userIds: next === 'cancelled' ? [assigneeId] : [String(task.owner)],
      actorId: req.user._id,
      type: next === 'cancelled' ? 'assignment_cancelled' : 'assignment_updated',
      message: `${req.user.name} ${VERB_BY_STATUS[next]} "${task.title}"`,
      taskId: task._id,
      session,
    })
  })

  res.status(200).json({ success: true, message: 'Assignment updated.', data: { assignment } })
}

// POST /api/tasks/:id/assignments/:userId/review — the creator completes or
// returns a submitted assignment. Reviews are the only path out of submitted.
export async function reviewAssignment(req, res) {
  const task = await loadAccessibleTask(req.params.id, req.user._id)
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found.' })
  }
  if (String(task.owner) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: 'Only the task creator can review submissions.' })
  }

  const assignment = await findAssignment(task._id, req.params.userId)
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Assignment not found.' })
  }
  if (!canReviewAssignment(assignment)) {
    return res.status(400).json({ success: false, message: 'Only submitted assignments can be reviewed.' })
  }

  applyAssignmentStatus(assignment, req.body.decision)
  if (req.body.note) assignment.note = req.body.note

  const decisionVerb = req.body.decision === 'completed' ? 'approved' : 'requested changes to'
  await runInTransaction(async (session) => {
    await assignment.save({ session })
    await recordActivity({
      taskId: task._id,
      actorId: req.user._id,
      action: 'assignment_reviewed',
      details: { decision: req.body.decision, assigneeId: String(assignment.assignee._id) },
      session,
    })
    await notifyUsers({
      userIds: [String(assignment.assignee._id)],
      actorId: req.user._id,
      type: 'assignment_reviewed',
      message: `${req.user.name} ${decisionVerb} "${task.title}"`,
      taskId: task._id,
      session,
    })
  })

  res.status(200).json({ success: true, message: 'Review recorded.', data: { assignment } })
}

// DELETE /api/tasks/:id/assignments/:userId — the creator hard-removes an
// assignment (reassignment cleanup). Removing the doc also revokes that
// user's task access, which is the privacy rule working as designed.
export async function deleteAssignment(req, res) {
  const task = await loadAccessibleTask(req.params.id, req.user._id)
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found.' })
  }
  if (String(task.owner) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: 'Only the task creator can remove assignments.' })
  }

  const assignment = await findAssignment(task._id, req.params.userId)
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Assignment not found.' })
  }

  await runInTransaction(async (session) => {
    await assignment.deleteOne({ session })
    await recordActivity({
      taskId: task._id,
      actorId: req.user._id,
      action: 'assignment_removed',
      details: { assigneeId: String(assignment.assignee._id) },
      session,
    })
    await notifyUsers({
      userIds: [String(assignment.assignee._id)],
      actorId: req.user._id,
      type: 'assignment_cancelled',
      message: `${req.user.name} removed an assignment on "${task.title}"`,
      taskId: task._id,
      session,
    })
  })

  res.status(200).json({ success: true, message: 'Assignment removed.' })
}
