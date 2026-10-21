import ActivityLog from '../models/ActivityLog.js'
import { canAccessTask } from '../services/taskAccess.service.js'

// GET /api/tasks/:id/activity — newest-first timeline for a task, visible to
// the creator and assignees only. Capped so a long-lived task stays cheap.
export async function listTaskActivity(req, res) {
  const { task, hasAccess } = await canAccessTask(req.params.id, req.user._id)
  if (!task || !hasAccess) {
    return res.status(404).json({ success: false, message: 'Task not found.' })
  }

  const activity = await ActivityLog.find({ task: task._id })
    .populate('actor', 'name')
    .sort({ createdAt: -1 })
    .limit(100)

  res.status(200).json({ success: true, data: { activity } })
}
