import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createSessionSchema } from '../validators/session.validators.js'
import {
  listSessions,
  getSessionStats,
  createSession,
} from '../controllers/session.controller.js'

const router = Router()

// Every session route requires a session; every query filters by owner.
router.use(protect)

router.get('/', listSessions)
router.get('/stats', getSessionStats)
router.post('/', validate(createSessionSchema), createSession)

export default router
