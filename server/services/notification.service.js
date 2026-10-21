import TaskAssignment from '../models/TaskAssignment.js'
import Notification from '../models/Notification.js'

// Every user attached to a task: the creator plus all assignees. Used to fan
// out comment and lifecycle notifications.
export async function getTaskParticipantIds(task) {
  const assignments = await TaskAssignment.find({ task: task._id }, { assignee: 1 })
  return [String(task.owner), ...assignments.map((item) => String(item.assignee))]
}

// One notification per recipient, skipping the actor. Failures are logged and
// swallowed: a missed nudge must never fail the action that triggered it.
export async function notifyUsers({ userIds, actorId, type, message, taskId = null, session = null }) {
  const recipients = userIds.filter((id) => id && String(id) !== String(actorId))
  if (recipients.length === 0) return

  try {
    await Notification.create(
      recipients.map((userId) => ({ user: userId, type, message, task: taskId, actor: actorId })),
      session ? { session } : {}
    )
  } catch (err) {
    console.error(`Notification failed: ${err.message}`)
  }
}
