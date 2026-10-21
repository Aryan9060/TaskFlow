import { z } from 'zod'

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Subject is not valid.')

// Accepts ISO strings from the date/time inputs and rejects impossible dates.
const examDate = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed
}, z.date({ error: 'Please choose a valid exam date and time.' }))

const subject = z.preprocess(
  (value) => (value === '' ? null : value),
  objectId.nullable()
)

// Optional graded result as a percentage. Empty form fields become null so
// "not graded yet" is stored cleanly instead of as a zero score.
const score = z.preprocess(
  (value) => (value === '' || value === null ? null : value),
  z.coerce
    .number({ error: 'Score must be a number between 0 and 100.' })
    .min(0, 'Score cannot be below 0')
    .max(100, 'Score cannot exceed 100')
    .nullable()
)

// Fields accepted when scheduling an exam
export const createExamSchema = z.object({
  title: z
    .string({ error: 'Exam title is required' })
    .trim()
    .min(1, 'Exam title is required')
    .max(120, 'Exam title is too long'),
  examDate,
  subject: subject.optional(),
  score: score.optional(),
  location: z.string().trim().max(120, 'Location is too long').optional().default(''),
  notes: z.string().trim().max(2000, 'Notes are too long').optional().default(''),
})

// All fields optional for partial updates
export const updateExamSchema = z.object({
  title: z.string().trim().min(1, 'Exam title is required').max(120, 'Exam title is too long').optional(),
  examDate: examDate.optional(),
  subject: subject.optional(),
  score: score.optional(),
  location: z.string().trim().max(120, 'Location is too long').optional(),
  notes: z.string().trim().max(2000, 'Notes are too long').optional(),
})
