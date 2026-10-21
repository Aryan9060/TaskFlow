import { z } from 'zod'

// GET /api/export/activity.csv?taskId= — the task id is required and must be
// well-formed before the database is touched; access is then enforced by the
// controller (creator and assignees only, 404 for everyone else).
export const activityExportQuerySchema = z.object({
  taskId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Task is not valid.'),
})
