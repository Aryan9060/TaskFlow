import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { register, login, logout } from '../controllers/auth.controller.js'
import { validate } from '../middleware/validate.middleware.js'
import { registerSchema, loginSchema } from '../validators/auth.validators.js'

const router = Router()

// Throttle credential endpoints against brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
})

router.post('/register', authLimiter, validate(registerSchema), register)
router.post('/login', authLimiter, validate(loginSchema), login)
router.post('/logout', logout)

export default router
