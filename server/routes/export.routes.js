import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { exportSessionsCsv, exportTasksCsv } from '../controllers/export.controller.js'

const router = Router()

// Exports contain private data, so they always require a session.
router.use(protect)

router.get('/sessions.csv', exportSessionsCsv)
router.get('/tasks.csv', exportTasksCsv)

export default router
