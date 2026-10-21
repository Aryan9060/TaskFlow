import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { listMyAssignments } from '../controllers/assignment.controller.js'

const router = Router()

// The assignee's cross-task inbox; the task-scoped assignment routes live
// under /api/tasks/:id/assignments.
router.use(protect)

router.get('/mine', listMyAssignments)

export default router
