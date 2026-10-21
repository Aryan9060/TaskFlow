import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { validateQuery } from '../middleware/validate.middleware.js'
import {
  exportSessionsCsv,
  exportTasksCsv,
  exportAssignmentsCsv,
  exportActivityCsv,
  exportWorkbookXlsx,
} from '../controllers/export.controller.js'
import { activityExportQuerySchema } from '../validators/export.validators.js'

const router = Router()

// Exports contain private data, so they always require a session.
router.use(protect)

router.get('/sessions.csv', exportSessionsCsv)
router.get('/tasks.csv', exportTasksCsv)
router.get('/assignments.csv', exportAssignmentsCsv)
router.get('/activity.csv', validateQuery(activityExportQuerySchema), exportActivityCsv)
router.get('/workbook.xlsx', exportWorkbookXlsx)

export default router
