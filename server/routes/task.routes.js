import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createTaskSchema, updateTaskSchema } from '../validators/task.validators.js'
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/task.controller.js'

const router = Router()

// Every task route requires a session; every query filters by owner.
router.use(protect)

router.get('/', listTasks)
router.post('/', validate(createTaskSchema), createTask)
router.patch('/:id', validate(updateTaskSchema), updateTask)
router.delete('/:id', deleteTask)

export default router
