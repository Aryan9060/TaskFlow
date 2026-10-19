import { z } from 'zod'

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Linked item is not valid.')

// Accepts an ISO timestamp and rejects impossible dates.
const timestamp = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed
}, z.date({ error: 'Please provide a valid date.' }))

const optionalRef = z.preprocess(
  (value) => (value === '' ? null : value),
  objectId.nullable()
)

// A completed study session. endedAt must come after startedAt.
export const createSessionSchema = z
  .object({
    subject: optionalRef.optional(),
    task: optionalRef.optional(),
    mode: z.enum(['stopwatch', 'pomodoro'], 'Invalid timer mode').optional().default('stopwatch'),
    startedAt: timestamp,
    endedAt: timestamp,
    durationMinutes: z.coerce
      .number({ error: 'Duration is required.' })
      .int('Duration must be a whole number of minutes')
      .min(1, 'Sessions must be at least one minute')
      .max(1440, 'Sessions cannot be longer than 24 hours'),
    note: z.string().trim().max(500, 'Note is too long').optional().default(''),
  })
  .refine((data) => data.endedAt > data.startedAt, {
    message: 'The session must end after it starts.',
    path: ['endedAt'],
  })
