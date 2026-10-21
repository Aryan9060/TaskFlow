import { z } from 'zod'

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user id.')

const groupName = z
  .string({ error: 'Group name is required' })
  .trim()
  .min(2, 'Group name must be at least 2 characters')
  .max(80, 'Group name must be at most 80 characters')

// Fields accepted when creating a group
export const createGroupSchema = z.object({
  name: groupName,
  description: z.string().trim().max(500, 'Description is too long').optional().default(''),
})

// All fields optional for partial updates
export const updateGroupSchema = z.object({
  name: groupName.optional(),
  description: z.string().trim().max(500, 'Description is too long').optional(),
})

// Managers invite registered users by email
export const inviteMemberSchema = z.object({
  email: z.email('Please provide a valid email').trim().toLowerCase(),
})

// Owners choose between admin and member; 'owner' is reachable only via transfer
export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member'], 'Invalid role'),
})

// Body for the ownership transfer endpoint
export const transferOwnershipSchema = z.object({
  userId: objectId,
})
