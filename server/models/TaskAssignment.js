import mongoose from 'mongoose'

// One document per (task, assignee) so every collaborator carries an
// independent lifecycle. Assignment status is separate from Task.status on
// purpose: assignees progress through their own work while the task itself
// stays under its creator's control.
const taskAssignmentSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'in_progress', 'submitted', 'completed', 'cancelled', 'needs_revision'],
      default: 'pending',
      index: true,
    },
    // Latest submission or review note. The full history arrives with ActivityLog.
    note: { type: String, trim: true, maxlength: 1000, default: '' },
    acceptedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    declinedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
)

taskAssignmentSchema.index({ task: 1, assignee: 1 }, { unique: true })
taskAssignmentSchema.index({ assignee: 1, status: 1 })

export default mongoose.model('TaskAssignment', taskAssignmentSchema)
