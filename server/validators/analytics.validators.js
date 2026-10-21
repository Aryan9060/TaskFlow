import { z } from 'zod'

const MAX_RANGE_DAYS = 366

// GET /api/analytics/insights?from=ISO&to=ISO — both parameters optional.
// When both are present the window must be ordered and cannot exceed a year,
// which keeps the day-by-day series bounded.
export const insightsQuerySchema = z
  .object({
    from: z.coerce.date({ error: 'From must be a valid date.' }).optional(),
    to: z.coerce.date({ error: 'To must be a valid date.' }).optional(),
  })
  .refine((value) => !value.from || !value.to || value.to >= value.from, {
    message: 'The end date must be on or after the start date.',
    path: ['to'],
  })
  .refine(
    (value) =>
      !value.from || !value.to || value.to.getTime() - value.from.getTime() <= MAX_RANGE_DAYS * 24 * 60 * 60 * 1000,
    {
      message: 'Date range cannot exceed 366 days.',
      path: ['to'],
    }
  )
