import Notification from '../models/Notification.js'

// GET /api/notifications — the caller's inbox, newest first, with an unread
// count. `?unread=true` filters to unread entries only.
export async function listNotifications(req, res) {
  const filter = { user: req.user._id }
  if (req.query.unread === 'true') filter.readAt = null

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ user: req.user._id, readAt: null }),
  ])

  res.status(200).json({ success: true, data: { notifications, unreadCount } })
}

// PATCH /api/notifications/:id/read — only the recipient can mark their own
// notification as read; marking an already-read one is idempotent.
export async function markNotificationRead(req, res) {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id })
  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found.' })
  }

  if (!notification.readAt) {
    notification.readAt = new Date()
    await notification.save()
  }

  res.status(200).json({ success: true, message: 'Notification marked as read.', data: { notification } })
}

// POST /api/notifications/read-all — bulk mark every unread entry as read.
export async function markAllNotificationsRead(req, res) {
  await Notification.updateMany({ user: req.user._id, readAt: null }, { readAt: new Date() })
  res.status(200).json({ success: true, message: 'All notifications marked as read.' })
}
