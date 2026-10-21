import mongoose from 'mongoose'

// A comment on a task. Visibility follows the task privacy rule: only the
// creator and assigned users can read or write comments.
const taskCommentSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      minlength: [1, 'Comment text is required'],
      maxlength: [2000, 'Comment must be at most 2000 characters'],
    },
  },
  { timestamps: true }
)

taskCommentSchema.index({ task: 1, createdAt: 1 })

export default mongoose.model('TaskComment', taskCommentSchema)
