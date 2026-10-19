import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { getReminders } from '../controllers/reminder.controller.js'

const router = Router()

// Reminders are always scoped to the signed-in user.
router.use(protect)

router.get('/', getReminders)

export default router
