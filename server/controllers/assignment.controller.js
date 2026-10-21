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

const ASSIGNEE_SNAPSHOT = 'name email'

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

  const assignment = await TaskAssignment.create({
    task: task._id,
    assignee: assignee._id,
    assignedBy: req.user._id,
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

  applyAssignmentStatus(assignment, next)
  if (req.body.note) assignment.note = req.body.note
  await assignment.save()

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
  await assignment.save()

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

  await assignment.deleteOne()
  res.status(200).json({ success: true, message: 'Assignment removed.' })
}
