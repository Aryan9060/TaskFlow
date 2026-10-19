import Task from '../models/Task.js'
import Exam from '../models/Exam.js'
import StudySession from '../models/StudySession.js'
import Subject from '../models/Subject.js'
import { startOfToday, daysAgo, dayKey, buildDaySeries } from '../utils/dates.js'

const SUBJECT_SNAPSHOT = 'name code color'

// GET /api/dashboard/summary — everything the dashboard renders, scoped to
// the signed-in user and fetched in one round of parallel queries.
export async function getDashboardSummary(req, res) {
  const owner = req.user._id
  const today = startOfToday()

  const [dueToday, overdue, statusCounts, upcomingExams, recentSessions, weekSessions, subjectCount] =
    await Promise.all([
      // Open work due today (tasks + assignments)
      Task.countDocuments({ owner, status: { $ne: 'completed' }, dueDate: { $gte: today, $lt: daysAgo(-1) } }),
      // Open work past its due date
      Task.countDocuments({ owner, status: { $ne: 'completed' }, dueDate: { $lt: today } }),
      // Totals per status for the summary cards
      Task.aggregate([
        { $match: { owner } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Next 5 exams, soonest first, with subject details for chips
      Exam.find({ owner, examDate: { $gte: new Date() } })
        .sort({ examDate: 1 })
        .limit(5)
        .populate('subject', SUBJECT_SNAPSHOT),
      // Last 5 finished sessions
      StudySession.find({ owner }).sort({ startedAt: -1 }).limit(5).populate('subject', SUBJECT_SNAPSHOT),
      // Sessions started in the last 7 whole days, bucketed per day in memory
      StudySession.find({ owner, startedAt: { $gte: daysAgo(6) } }, { startedAt: 1, durationMinutes: 1 }),
      // Active (non-archived) subjects
      Subject.countDocuments({ owner, archived: false }),
    ])

  // Bucket session minutes onto calendar days for the weekly chart
  const weekly = buildDaySeries(7)
  const indexByDate = new Map(weekly.map((entry) => [entry.date, entry]))
  for (const session of weekSessions) {
    const entry = indexByDate.get(dayKey(session.startedAt))
    if (entry) entry.minutes += session.durationMinutes
  }

  const statusMap = Object.fromEntries(statusCounts.map((row) => [row._id, row.count]))

  res.status(200).json({
    success: true,
    data: {
      stats: {
        dueToday,
        overdue,
        inProgress: statusMap['in-progress'] || 0,
        openTasks: (statusMap['todo'] || 0) + (statusMap['in-progress'] || 0),
        subjects: subjectCount,
      },
      weekly,
      upcomingExams,
      recentSessions,
    },
  })
}
