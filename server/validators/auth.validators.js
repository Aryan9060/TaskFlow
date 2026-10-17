import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name must be at most 50 characters'),
  email: z.email('Please provide a valid email').trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number'),
})

export const loginSchema = z.object({
  email: z.email('Please provide a valid email').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
})

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters')
    .optional(),
  preferences: z
    .object({
      pomodoroFocusMinutes: z.number().int().min(5).max(120).optional(),
      pomodoroBreakMinutes: z.number().int().min(1).max(60).optional(),
    })
    .optional(),
})
