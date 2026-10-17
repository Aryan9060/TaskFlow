import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { getMe, updateProfile } from '../controllers/auth.controller.js'
import { validate } from '../middleware/validate.middleware.js'
import { updateProfileSchema } from '../validators/auth.validators.js'

const router = Router()

// Every /api/users/* route requires a valid session
router.use(protect)

router.get('/me', getMe)
router.patch('/me', validate(updateProfileSchema), updateProfile)

export default router
