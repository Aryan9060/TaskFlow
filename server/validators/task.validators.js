import { z } from 'zod'

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Subject is not valid.')

// Empty form fields arrive as '' or null; convert them to null so optional
// dates and numbers are stored cleanly instead of as epoch values.
const emptyToNull = (value) => (value === '' || value === null ? null : value)

const dueDate = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed
  },
  z.date({ error: 'Due date is not a valid date.' }).nullable()
)
const estimatedMinutes = z.preprocess(
  emptyToNull,
  z.coerce
    .number()
    .int('Estimated effort must be a whole number')
    .min(0, 'Estimated effort cannot be negative')
    .max(10080, 'Estimated effort must be 7 days or less')
    .nullable()
)
const subject = z.preprocess(
  (value) => (value === '' ? null : value),
  objectId.nullable()
)
const group = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().regex(/^[0-9a-fA-F]{24}$/, 'Group is not valid.').nullable()
)

const taskFields = {
  title: z
    .string({ error: 'Title is required' })
    .trim()
    .min(1, 'Title is required')
    .max(120, 'Title is too long'),
  description: z.string().trim().max(2000, 'Description is too long'),
  subject,
  status: z.enum(['todo', 'in-progress', 'completed', 'cancelled'], 'Invalid status'),
  priority: z.enum(['low', 'medium', 'high'], 'Invalid priority'),
  dueDate,
  estimatedMinutes,
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly'], 'Invalid recurrence'),
}

// Fields accepted when creating a task or assignment
export const createTaskSchema = z.object({
  ...taskFields,
  description: taskFields.description.optional().default(''),
  subject: subject.optional(),
  group: group.optional(),
  status: taskFields.status.optional().default('todo'),
  priority: taskFields.priority.optional().default('medium'),
  dueDate: dueDate.optional(),
  estimatedMinutes: estimatedMinutes.optional(),
  recurrence: taskFields.recurrence.optional().default('none'),
  kind: z.enum(['task', 'assignment'], 'Invalid kind').optional().default('task'),
})

// All fields optional for partial updates
export const updateTaskSchema = z.object({
  title: taskFields.title.optional(),
  description: taskFields.description.optional(),
  subject: subject.optional(),
  group: group.optional(),
  status: taskFields.status.optional(),
  priority: taskFields.priority.optional(),
  dueDate: dueDate.optional(),
  estimatedMinutes: estimatedMinutes.optional(),
  recurrence: taskFields.recurrence.optional(),
})
