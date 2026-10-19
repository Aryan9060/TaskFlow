import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { getDashboardSummary } from '../controllers/dashboard.controller.js'

const router = Router()

// Dashboard data is private to the signed-in user
router.use(protect)

router.get('/summary', getDashboardSummary)

export default router
