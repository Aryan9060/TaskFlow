import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createTaskSchema, updateTaskSchema } from '../validators/task.validators.js'
import {
  createAssignmentSchema,
  transitionAssignmentSchema,
  reviewAssignmentSchema,
} from '../validators/assignment.validators.js'
import { listTasks, getTask, createTask, updateTask, deleteTask } from '../controllers/task.controller.js'
import {
  createAssignment,
  listTaskAssignments,
  transitionAssignment,
  reviewAssignment,
  deleteAssignment,
} from '../controllers/assignment.controller.js'

const router = Router()

// Every task route requires a session. Reads use the creator-or-assignee
// access rule; mutations below stay creator-only.
router.use(protect)

router.get('/', listTasks)
router.post('/', validate(createTaskSchema), createTask)
router.get('/:id', getTask)
router.patch('/:id', validate(updateTaskSchema), updateTask)
router.delete('/:id', deleteTask)
router.post('/:id/assignments', validate(createAssignmentSchema), createAssignment)
router.get('/:id/assignments', listTaskAssignments)
router.patch('/:id/assignments/:userId', validate(transitionAssignmentSchema), transitionAssignment)
router.post('/:id/assignments/:userId/review', validate(reviewAssignmentSchema), reviewAssignment)
router.delete('/:id/assignments/:userId', deleteAssignment)

export default router
