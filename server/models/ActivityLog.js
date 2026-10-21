import mongoose from 'mongoose'

// Server-generated audit trail for task and assignment events. Entries are
// append-only: controllers may create them, but no API updates or deletes
// them, and they intentionally outlive the tasks they describe.
const ACTIVITY_ACTIONS = [
  'task_created',
  'task_updated',
  'task_deleted',
  'assignment_created',
  'assignment_accepted',
  'assignment_declined',
  'assignment_started',
  'assignment_submitted',
  'assignment_reviewed',
  'assignment_cancelled',
  'assignment_removed',
  'comment_added',
  'comment_deleted',
]

const activityLogSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ACTIVITY_ACTIONS, required: true },
    // Safe summary only: titles, field names, decisions — never secrets.
    details: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
)

activityLogSchema.index({ task: 1, createdAt: -1 })

export default mongoose.model('ActivityLog', activityLogSchema)
