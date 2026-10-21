import mongoose from 'mongoose'

// A scheduled exam. `examDate` is a full timestamp so morning/afternoon
// slots survive; the calendar renders it in the user's local time.
const examSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    title: { type: String, required: [true, 'Exam title is required'], trim: true, maxlength: 120 },
    examDate: { type: Date, required: [true, 'Exam date is required'] },
    // Optional result as a percentage. Left null until the exam is graded;
    // score analytics only consider exams that carry a number.
    score: { type: Number, min: 0, max: 100, default: null },
    location: { type: String, trim: true, maxlength: 120, default: '' },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true }
)

examSchema.index({ owner: 1, examDate: 1 })

export default mongoose.model('Exam', examSchema)
