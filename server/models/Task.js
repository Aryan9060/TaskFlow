import mongoose from 'mongoose'

// A unit of work. `kind` splits the same document between "tasks" and
// "assignments" so both pages share one collection and one CRUD API.
const taskSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    // Optional group context. Attaching a group never grants access by
    // itself: the task stays visible only to its creator and assignees.
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null, index: true },
    kind: { type: String, enum: ['task', 'assignment'], default: 'task', index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: ['todo', 'in-progress', 'completed'], default: 'todo', index: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date, default: null, index: true },
    estimatedMinutes: { type: Number, min: 0, max: 10080, default: null },
    completedAt: { type: Date, default: null },
    recurrence: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
    // Set when a completed recurring task spawns its next copy. This keeps
    // toggling completed -> todo -> completed from duplicating the chain.
    nextOccurrenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  },
  { timestamps: true }
)

export default mongoose.model('Task', taskSchema)
