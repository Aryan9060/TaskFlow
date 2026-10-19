import StudySession from '../models/StudySession.js'
import Task from '../models/Task.js'
import { validateOwnedSubject } from '../services/subject.service.js'
import { startOfToday, daysAgo } from '../utils/dates.js'

// GET /api/sessions — the 12 most recent study sessions for the user.
export async function listSessions(req, res) {
  const sessions = await StudySession.find({ owner: req.user._id })
    .populate('subject', 'name color')
    .populate('task', 'title kind')
    .sort({ endedAt: -1 })
    .limit(12)

  res.status(200).json({ success: true, data: { sessions } })
}

// GET /api/sessions/stats — today and rolling-week totals for the timer
// and analytics headers.
export async function getSessionStats(req, res) {
  const owner = req.user._id

  const [today] = await StudySession.aggregate([
    { $match: { owner, endedAt: { $gte: startOfToday() } } },
    { $group: { _id: null, minutes: { $sum: '$durationMinutes' }, sessions: { $sum: 1 } } },
  ])

  const [week] = await StudySession.aggregate([
    { $match: { owner, endedAt: { $gte: daysAgo(6) } } },
    { $group: { _id: null, minutes: { $sum: '$durationMinutes' }, sessions: { $sum: 1 } } },
  ])

  const pomodoroSessions = await StudySession.countDocuments({
    owner,
    mode: 'pomodoro',
  })

  res.status(200).json({
    success: true,
    data: {
      stats: {
        todayMinutes: today?.minutes || 0,
        weekMinutes: week?.minutes || 0,
        sessionsToday: today?.sessions || 0,
        pomodoroSessions,
      },
    },
  })
}

// POST /api/sessions — save a finished stopwatch or Pomodoro block.
export async function createSession(req, res) {
  const subjectError = await validateOwnedSubject(req.user._id, req.body.subject)
  if (subjectError) {
    return res.status(400).json({ success: false, message: subjectError })
  }

  if (req.body.task) {
    const task = await Task.findOne({ _id: req.body.task, owner: req.user._id })
    if (!task) {
      return res.status(400).json({ success: false, message: 'Task not found.' })
    }
  }

  const session = await StudySession.create({ ...req.body, owner: req.user._id })
  await session.populate('subject', 'name color')
  await session.populate('task', 'title kind')

  res.status(201).json({
    success: true,
    message: 'Study session saved.',
    data: { session },
  })
}
