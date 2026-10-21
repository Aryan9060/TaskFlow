import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notification.controller.js'

const router = Router()

// Personal notification inbox; only the recipient ever sees or updates an entry.
router.use(protect)

router.get('/', listNotifications)
router.post('/read-all', markAllNotificationsRead)
router.patch('/:id/read', markNotificationRead)

export default router
