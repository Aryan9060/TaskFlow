import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { getAchievements } from '../controllers/achievement.controller.js'

const router = Router()

// Badge progress is derived from the signed-in user's own records.
router.use(protect)

router.get('/', getAchievements)

export default router
