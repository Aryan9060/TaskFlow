import mongoose from 'mongoose'

// One completed focus block. Duration is stored explicitly (not re-derived
// from start/end) so pause behaviour and clock adjustments cannot corrupt
// historical totals.
const studySessionSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    mode: { type: String, enum: ['stopwatch', 'pomodoro'], default: 'stopwatch' },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 1, max: 1440 },
    note: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
)

studySessionSchema.index({ owner: 1, startedAt: -1 })

export default mongoose.model('StudySession', studySessionSchema)
