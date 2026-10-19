import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createExamSchema, updateExamSchema } from '../validators/exam.validators.js'
import {
  listExams,
  createExam,
  updateExam,
  deleteExam,
} from '../controllers/exam.controller.js'

const router = Router()

// Every exam route requires a session; every query filters by owner.
router.use(protect)

router.get('/', listExams)
router.post('/', validate(createExamSchema), createExam)
router.patch('/:id', validate(updateExamSchema), updateExam)
router.delete('/:id', deleteExam)

export default router
