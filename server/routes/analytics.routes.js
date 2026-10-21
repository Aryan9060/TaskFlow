import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { validateQuery } from '../middleware/validate.middleware.js'
import { getAnalyticsSummary } from '../controllers/analytics.controller.js'
import { getInsights } from '../controllers/insights.controller.js'
import { insightsQuerySchema } from '../validators/analytics.validators.js'

const router = Router()

// Analytics always requires a signed-in user; the controller scopes by owner.
router.use(protect)

router.get('/summary', getAnalyticsSummary)
router.get('/insights', validateQuery(insightsQuerySchema), getInsights)

export default router
