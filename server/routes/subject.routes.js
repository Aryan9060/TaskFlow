import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createSubjectSchema, updateSubjectSchema } from '../validators/subject.validators.js'
import {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../controllers/subject.controller.js'

const router = Router()

// Every subject route requires a session; every query filters by owner.
router.use(protect)

router.get('/', listSubjects)
router.post('/', validate(createSubjectSchema), createSubject)
router.patch('/:id', validate(updateSubjectSchema), updateSubject)
router.delete('/:id', deleteSubject)

export default router
