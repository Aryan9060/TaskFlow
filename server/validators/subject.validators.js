import { z } from 'zod'

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex code like #FFE14D')

// Fields accepted when creating a subject
export const createSubjectSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),
  code: z.string().trim().max(20, 'Code is too long').optional().default(''),
  semester: z.string().trim().max(20, 'Semester is too long').optional().default(''),
  description: z.string().trim().max(500, 'Description is too long').optional().default(''),
  color: color.optional().default('#FFE14D'),
})

// All fields optional for updates; `archived` powers archive/unarchive
export const updateSubjectSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  code: z.string().trim().max(20).optional(),
  semester: z.string().trim().max(20).optional(),
  description: z.string().trim().max(500).optional(),
  color: color.optional(),
  archived: z.boolean().optional(),
})
