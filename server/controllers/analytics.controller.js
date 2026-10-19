import Task from '../models/Task.js'
import StudySession from '../models/StudySession.js'
import Subject from '../models/Subject.js'
import { buildDaySeries, dayKey, daysAgo } from '../utils/dates.js'

const SUBJECT_SNAPSHOT = 'name code color'
const MONTH_DAYS = 30
const HEATMAP_DAYS = 84
const DEFAULT_WEEKLY_GOAL = 600

// Turns per-kind status rows into completed/pending totals and a percentage.
// A null rate means "no data yet" so the UI can show an empty state.
function summariseCompletion(rows) {
  const buckets = {
    task: { completed: 0, pending: 0 },
    assignment: { completed: 0, pending: 0 },
  }

  for (const row of rows) {
    const kind = row._id?.kind === 'assignment' ? 'assignment' : 'task'
    if (row._id?.status === 'completed') {
      buckets[kind].completed += row.count
    } else {
      buckets[kind].pending += row.count
    }
  }

  return Object.fromEntries(
    Object.entries(buckets).map(([kind, counts]) => {
      const total = counts.completed + counts.pending
      return [
        kind,
        {
          completed: counts.completed,
          pending: counts.pending,
          total,
          rate: total > 0 ? Math.round((counts.completed / total) * 100) : null,
        },
      ]
    })
  )
}

// GET /api/analytics/summary — study totals, a 7-day series, lifetime
// subject distribution, task completion rates, and weekly goal progress.
export async function getAnalyticsSummary(req, res) {
  const owner = req.user._id

  // One parallel round: recent sessions for totals, an aggregation for
  // subject shares, and an aggregation for task/assignment status counts.
  const [recentSessions, subjectRows, kindStatusRows] = await Promise.all([
    // 84 days powers the heatmap; the 30-day totals are filtered in memory
    // so both views share one query.
    StudySession.find(
      { owner, startedAt: { $gte: daysAgo(HEATMAP_DAYS - 1) } },
      { startedAt: 1, durationMinutes: 1 }
    ),
    StudySession.aggregate([
      { $match: { owner } },
      {
        $group: {
          _id: '$subject',
          minutes: { $sum: '$durationMinutes' },
          sessions: { $sum: 1 },
        },
      },
      { $sort: { minutes: -1 } },
    ]),
    Task.aggregate([
      { $match: { owner } },
      { $group: { _id: { kind: '$kind', status: '$status' }, count: { $sum: 1 } } },
    ]),
  ])

  // Bucket sessions into the 12-week heatmap, the weekly chart, and the
  // rolling 30-day totals in one pass.
  const weekly = buildDaySeries(7)
  const heatmap = buildDaySeries(HEATMAP_DAYS)
  const entryByDate = new Map(weekly.map((entry) => [entry.date, entry]))
  const heatmapByDate = new Map(heatmap.map((entry) => [entry.date, entry]))
  const monthStart = daysAgo(MONTH_DAYS - 1)
  const today = dayKey(new Date())
  let todayMinutes = 0
  let monthMinutes = 0
  let monthSessionCount = 0

  for (const session of recentSessions) {
    const date = dayKey(session.startedAt)

    if (session.startedAt >= monthStart) {
      monthMinutes += session.durationMinutes
      monthSessionCount += 1
    }
    if (date === today) todayMinutes += session.durationMinutes

    const weekEntry = entryByDate.get(date)
    if (weekEntry) weekEntry.minutes += session.durationMinutes
    const heatEntry = heatmapByDate.get(date)
    if (heatEntry) heatEntry.minutes += session.durationMinutes
  }

  const weekMinutes = weekly.reduce((sum, day) => sum + day.minutes, 0)

  // Resolve subject names and colours; sessions without a subject (or whose
  // subject was deleted) are grouped under "General study".
  const subjectIds = subjectRows.map((row) => row._id).filter(Boolean)
  const subjects = subjectIds.length
    ? await Subject.find({ _id: { $in: subjectIds }, owner }, SUBJECT_SNAPSHOT)
    : []
  const subjectById = new Map(subjects.map((subject) => [String(subject._id), subject]))
  const lifetimeMinutes = subjectRows.reduce((sum, row) => sum + row.minutes, 0)

  const distribution = subjectRows.map((row) => {
    const subject = row._id ? subjectById.get(String(row._id)) : null
    return {
      name: subject ? subject.name : 'General study',
      color: subject ? subject.color : null,
      minutes: row.minutes,
      sessions: row.sessions,
      percent: lifetimeMinutes > 0 ? Math.round((row.minutes / lifetimeMinutes) * 100) : 0,
    }
  })

  const weeklyGoalMinutes = req.user.preferences.weeklyGoalMinutes || DEFAULT_WEEKLY_GOAL
  const percent = weeklyGoalMinutes > 0
    ? Math.min(100, Math.round((weekMinutes / weeklyGoalMinutes) * 100))
    : 0

  res.status(200).json({
    success: true,
    data: {
      totals: {
        todayMinutes,
        weekMinutes,
        monthMinutes,
        sessionCount: monthSessionCount,
      },
      weekly,
      heatmap,
      distribution,
      completion: summariseCompletion(kindStatusRows),
      goal: {
        weeklyGoalMinutes,
        weekMinutes,
        percent,
        remainingMinutes: Math.max(0, weeklyGoalMinutes - weekMinutes),
        met: weekMinutes >= weeklyGoalMinutes,
      },
    },
  })
}
