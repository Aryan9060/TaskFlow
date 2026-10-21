import { z } from 'zod'

// A task comment body
export const createCommentSchema = z.object({
  body: z
    .string({ error: 'Comment text is required' })
    .trim()
    .min(1, 'Comment text is required')
    .max(2000, 'Comment must be at most 2000 characters'),
})
