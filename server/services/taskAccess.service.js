import Task from '../models/Task.js'
import TaskAssignment from '../models/TaskAssignment.js'

// The one task privacy rule, shared by detail, list, search, comments,
// activity and export endpoints: a task is visible to its creator and to
// users holding an assignment on it. Group membership — even group admin —
// never grants access on its own.
export async function canAccessTask(taskId, userId) {
  const task = await Task.findById(taskId)
  if (!task) return { task: null, hasAccess: false }

  if (String(task.owner) === String(userId)) {
    return { task, hasAccess: true }
  }

  const assignment = await TaskAssignment.exists({ task: task._id, assignee: userId })
  return { task, hasAccess: Boolean(assignment) }
}

// Mongo filter matching every task the user may list: everything they own
// plus everything assigned to them. Controllers apply this before any
// sorting or pagination so inaccessible records never enter the result set.
export async function visibleTaskFilter(userId) {
  const assignedTaskIds = await TaskAssignment.distinct('task', { assignee: userId })
  if (assignedTaskIds.length === 0) return { owner: userId }
  return { $or: [{ owner: userId }, { _id: { $in: assignedTaskIds } }] }
}
