import Task from '../models/Task.js'
import Exam from '../models/Exam.js'
import { daysFromNow } from '../utils/dates.js'

const SUBJECT_SNAPSHOT = 'name code color'

// GET /api/reminders — in-app nudges for open work due within the next
// three days (overdue included) and exams in the coming week. This is
// deliberately pull-based: reminders appear when the app is open, as the
// plan notes that browser-only timers cannot fire when the app is closed.
export async function getReminders(req, res) {
  const owner = req.user._id

  const [tasks, exams] = await Promise.all([
    Task.find({
      owner,
      status: { $ne: 'completed' },
      dueDate: { $ne: null, $lt: daysFromNow(3) },
    })
      .populate('subject', SUBJECT_SNAPSHOT)
      .sort({ dueDate: 1 })
      .limit(6),
    Exam.find({ owner, examDate: { $gte: new Date(), $lt: daysFromNow(7) } })
      .populate('subject', SUBJECT_SNAPSHOT)
      .sort({ examDate: 1 })
      .limit(4),
  ])

  res.status(200).json({
    success: true,
    data: { tasks, exams, total: tasks.length + exams.length },
  })
}
