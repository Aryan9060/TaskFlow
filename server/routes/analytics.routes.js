import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { getAnalyticsSummary } from '../controllers/analytics.controller.js'

const router = Router()

// Analytics always requires a signed-in user; the controller scopes by owner.
router.use(protect)

router.get('/summary', getAnalyticsSummary)

export default router
