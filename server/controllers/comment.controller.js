import TaskComment from '../models/TaskComment.js'
import { canAccessTask } from '../services/taskAccess.service.js'
import { runInTransaction } from '../services/transaction.service.js'
import { recordActivity } from '../services/activity.service.js'
import { getTaskParticipantIds, notifyUsers } from '../services/notification.service.js'

// Shared gate: the task must exist and the caller must be its creator or an
// assignee. Group membership alone never passes.
async function loadAccessibleTask(taskId, userId) {
  const { task, hasAccess } = await canAccessTask(taskId, userId)
  return hasAccess ? task : null
}

// POST /api/tasks/:id/comments — the creator or an assignee comments. The
// write, its activity entry, and participant notifications share a transaction.
export async function addComment(req, res) {
  const task = await loadAccessibleTask(req.params.id, req.user._id)
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found.' })
  }

  const comment = await runInTransaction(async (session) => {
    const options = session ? { session } : {}
    const [created] = await TaskComment.create(
      [{ task: task._id, author: req.user._id, body: req.body.body }],
      options
    )
    await recordActivity({
      taskId: task._id,
      actorId: req.user._id,
      action: 'comment_added',
      details: { commentId: String(created._id) },
      session,
    })
    const participants = await getTaskParticipantIds(task)
    await notifyUsers({
      userIds: participants,
      actorId: req.user._id,
      type: 'comment_added',
      message: `${req.user.name} commented on "${task.title}"`,
      taskId: task._id,
      session,
    })
    return created
  })

  await comment.populate('author', 'name')
  res.status(201).json({ success: true, message: 'Comment added.', data: { comment } })
}

// GET /api/tasks/:id/comments — the conversation, oldest first.
export async function listComments(req, res) {
  const task = await loadAccessibleTask(req.params.id, req.user._id)
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found.' })
  }

  const comments = await TaskComment.find({ task: task._id })
    .populate('author', 'name')
    .sort({ createdAt: 1 })

  res.status(200).json({ success: true, data: { comments } })
}

// DELETE /api/tasks/:id/comments/:commentId — the author, or the task
// creator acting as moderator.
export async function deleteComment(req, res) {
  const task = await loadAccessibleTask(req.params.id, req.user._id)
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found.' })
  }

  const comment = await TaskComment.findOne({ _id: req.params.commentId, task: task._id })
  if (!comment) {
    return res.status(404).json({ success: false, message: 'Comment not found.' })
  }

  const isAuthor = String(comment.author) === String(req.user._id)
  const isCreator = String(task.owner) === String(req.user._id)
  if (!isAuthor && !isCreator) {
    return res
      .status(403)
      .json({ success: false, message: 'Only the comment author or the task creator can delete a comment.' })
  }

  await runInTransaction(async (session) => {
    await comment.deleteOne({ session })
    await recordActivity({
      taskId: task._id,
      actorId: req.user._id,
      action: 'comment_deleted',
      details: { commentId: String(comment._id) },
      session,
    })
  })

  res.status(200).json({ success: true, message: 'Comment deleted.' })
}
