import StudySession from '../models/StudySession.js'
import Task from '../models/Task.js'
import Subject from '../models/Subject.js'
import { dayKey, daysAgo } from '../utils/dates.js'

const DEFAULT_WEEKLY_GOAL = 600

// Counts consecutive study days ending today (or yesterday when today has
// no session yet, so a streak is not declared dead before the day is over).
function currentStreak(studyDays) {
  const studied = new Set(studyDays.map((session) => dayKey(session.startedAt)))
  if (studied.size === 0) return 0

  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  if (!studied.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (studied.has(dayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// Turns raw counters into badge objects with a 0-100 progress value.
function buildAchievements({ totalSessions, lifetimeMinutes, streakDays, completedTasks, subjectCount, goalMet }) {
  const definitions = [
    {
      id: 'first-block',
      title: 'First block',
      description: 'Log your first study session.',
      icon: 'flame',
      unit: 'count',
      value: totalSessions,
      target: 1,
    },
    {
      id: 'ten-blocks',
      title: 'Ten blocks',
      description: 'Log ten focus sessions.',
      icon: 'clock',
      unit: 'count',
      value: totalSessions,
      target: 10,
    },
    {
      id: 'ten-hours',
      title: 'Ten-hour club',
      description: 'Study for ten hours in total.',
      icon: 'trophy',
      unit: 'minutes',
      value: lifetimeMinutes,
      target: 600,
    },
    {
      id: 'fifty-hours',
      title: 'Fifty-hour scholar',
      description: 'Study for fifty hours in total.',
      icon: 'trophy',
      unit: 'minutes',
      value: lifetimeMinutes,
      target: 3000,
    },
    {
      id: 'week-streak',
      title: 'Seven-day streak',
      description: 'Study on seven days in a row.',
      icon: 'flame',
      unit: 'count',
      value: streakDays,
      target: 7,
    },
    {
      id: 'goal-getter',
      title: 'Goal getter',
      description: 'Reach your weekly study goal.',
      icon: 'chart',
      unit: 'count',
      value: goalMet ? 1 : 0,
      target: 1,
    },
    {
      id: 'task-slayer',
      title: 'Task slayer',
      description: 'Complete ten tasks or assignments.',
      icon: 'tasks',
      unit: 'count',
      value: completedTasks,
      target: 10,
    },
    {
      id: 'well-rounded',
      title: 'Well rounded',
      description: 'Track five subjects.',
      icon: 'book',
      unit: 'count',
      value: subjectCount,
      target: 5,
    },
  ]

  return definitions.map(({ id, title, description, icon, unit, value, target }) => ({
    id,
    title,
    description,
    icon,
    unit,
    value,
    target,
    earned: value >= target,
    progress: Math.min(100, Math.round((value / target) * 100)),
  }))
}

// GET /api/achievements — lifetime counters plus the badge board. Rules are
// derived data, so nothing extra needs to be stored or migrated.
export async function getAchievements(req, res) {
  const owner = req.user._id
  const weeklyGoalMinutes = req.user.preferences.weeklyGoalMinutes || DEFAULT_WEEKLY_GOAL

  const [lifetimeRows, studyDays, completedTasks, subjectCount, weekRows] = await Promise.all([
    StudySession.aggregate([
      { $match: { owner } },
      {
        $group: {
          _id: null,
          minutes: { $sum: '$durationMinutes' },
          sessions: { $sum: 1 },
        },
      },
    ]),
    StudySession.find({ owner }, { startedAt: 1 }),
    Task.countDocuments({ owner, status: 'completed' }),
    Subject.countDocuments({ owner }),
    StudySession.aggregate([
      { $match: { owner, startedAt: { $gte: daysAgo(6) } } },
      { $group: { _id: null, minutes: { $sum: '$durationMinutes' } } },
    ]),
  ])

  const lifetime = lifetimeRows[0] || { minutes: 0, sessions: 0 }
  const weekMinutes = weekRows[0]?.minutes || 0
  const streakDays = currentStreak(studyDays)

  const achievements = buildAchievements({
    totalSessions: lifetime.sessions,
    lifetimeMinutes: lifetime.minutes,
    streakDays,
    completedTasks,
    subjectCount,
    goalMet: weekMinutes >= weeklyGoalMinutes,
  })

  res.status(200).json({
    success: true,
    data: {
      stats: {
        lifetimeMinutes: lifetime.minutes,
        totalSessions: lifetime.sessions,
        streakDays,
        completedTasks,
        subjectCount,
      },
      achievements,
    },
  })
}
