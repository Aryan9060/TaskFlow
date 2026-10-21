import { z } from 'zod'

// The creator assigns registered users by email, matching group invitations.
export const createAssignmentSchema = z.object({
  email: z.email('Please provide a valid email').trim().toLowerCase(),
})

// Assignee-driven lifecycle moves. 'completed' and 'needs_revision' are
// reachable only through the creator's review endpoint; 'cancelled' only by
// the creator through the transition endpoint.
export const transitionAssignmentSchema = z.object({
  status: z.enum(['accepted', 'declined', 'in_progress', 'submitted', 'cancelled'], 'Invalid status'),
  note: z.string().trim().max(1000, 'Note is too long').optional().default(''),
})

// The creator's review decision on a submitted assignment.
export const reviewAssignmentSchema = z.object({
  decision: z.enum(['completed', 'needs_revision'], 'Invalid review decision'),
  note: z.string().trim().max(1000, 'Note is too long').optional().default(''),
})
