import mongoose from 'mongoose'

// A subject (course/unit) that tasks, exams, and sessions can belong to.
// Belongs to exactly one user; `archived` hides it without losing history.
const subjectSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Subject name is required'], trim: true, maxlength: 80 },
    code: { type: String, trim: true, maxlength: 20, default: '' },
    semester: { type: String, trim: true, maxlength: 20, default: '' },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    color: { type: String, match: [/^#[0-9a-fA-F]{6}$/, 'Color must be a hex code like #FFE14D'], default: '#FFE14D' },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
)

subjectSchema.index({ owner: 1, name: 1 })

export default mongoose.model('Subject', subjectSchema)
