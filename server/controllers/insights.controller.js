import Task from '../models/Task.js'
import StudySession from '../models/StudySession.js'
import Subject from '../models/Subject.js'
import Exam from '../models/Exam.js'
import TaskAssignment from '../models/TaskAssignment.js'
import { visibleTaskFilter } from '../services/taskAccess.service.js'
import {
  taskSnapshotStats,
  buildTaskTrend,
  buildStudyTrend,
  assignmentStats,
  examScoreStats,
} from '../services/analytics.service.js'
import { daysAgo } from '../utils/dates.js'

const DEFAULT_RANGE_DAYS = 30
const SUBJECT_SNAPSHOT = 'name color'

function startOfDay(date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function endOfDay(date) {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

// GET /api/analytics/insights?from=&to= — the collaboration dashboard in one
// response. Two kinds of numbers live here: snapshot stats (current truth
// over all visible tasks, unaffected by the range) and range-scoped activity
// (trends, study, assignments). Every query is scoped to the signed-in user
// through the same visibility rules as the task list, applied before any
// grouping happens.
export async function getInsights(req, res) {
  const query = req.validatedQuery ?? {}
  const from = startOfDay(query.from ?? daysAgo(DEFAULT_RANGE_DAYS - 1))
  const to = endOfDay(query.to ?? new Date())
  const ownerId = req.user._id

  const [visibleTasks, sessions, assignments, exams] = await Promise.all([
    // One task fetch powers both the snapshot and the trend; the range cut
    // happens in memory on the fetched fields.
    Task.find(await visibleTaskFilter(ownerId), 'status priority dueDate createdAt completedAt').lean(),
    StudySession.find(
      { owner: ownerId, startedAt: { $gte: from, $lte: to } },
      'startedAt durationMinutes subject'
    ).lean(),
    TaskAssignment.find(
      { $or: [{ assignee: ownerId }, { assignedBy: ownerId }], createdAt: { $gte: from, $lte: to } },
      'status assignee assignedBy createdAt acceptedAt submittedAt'
    ).lean(),
    Exam.find({ owner: ownerId }, 'subject examDate score').lean(),
  ])

  const ownerIdString = String(ownerId)
  const assignedToMe = assignments.filter((item) => String(item.assignee) === ownerIdString)
  const createdByMe = assignments.filter((item) => String(item.assignedBy) === ownerIdString)

  // Tasks join the trend when either endpoint of their story falls inside
  // the window (created here, or finished here after starting earlier).
  const trendTasks = visibleTasks.filter(
    (task) =>
      (task.createdAt && task.createdAt >= from && task.createdAt <= to) ||
      (task.completedAt && task.completedAt >= from && task.completedAt <= to)
  )

  // Subject names for study distribution and exam scores resolve in one
  // owner-scoped query; unknown/deleted subjects fall back to General labels.
  const subjectIdStrings = [
    ...sessions.map((session) => session.subject),
    ...exams.filter((exam) => exam.score !== null && exam.score !== undefined).map((exam) => exam.subject),
  ]
    .filter(Boolean)
    .map(String)
  const uniqueSubjectIds = [...new Set(subjectIdStrings)]
  const subjects = uniqueSubjectIds.length
    ? await Subject.find({ _id: { $in: uniqueSubjectIds }, owner: ownerId }, SUBJECT_SNAPSHOT).lean()
    : []
  const subjectById = new Map(subjects.map((subject) => [String(subject._id), subject]))

  // Lifetime-free study distribution: only sessions inside the range count.
  const bySubjectMap = new Map()
  for (const session of sessions) {
    const key = session.subject ? String(session.subject) : 'general'
    if (!bySubjectMap.has(key)) {
      const subject = session.subject ? subjectById.get(String(session.subject)) : null
      bySubjectMap.set(key, {
        name: subject ? subject.name : 'General study',
        color: subject ? subject.color : null,
        minutes: 0,
        sessions: 0,
      })
    }
    const entry = bySubjectMap.get(key)
    entry.minutes += session.durationMinutes
    entry.sessions += 1
  }
  const totalStudyMinutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0)
  const bySubject = [...bySubjectMap.values()]
    .map((entry) => ({
      ...entry,
      percent: totalStudyMinutes > 0 ? Math.round((entry.minutes / totalStudyMinutes) * 100) : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes)

  const now = new Date()
  const upcomingExams = exams.filter((exam) => new Date(exam.examDate) >= now).length
  const scores = examScoreStats(exams, subjectById)

  res.status(200).json({
    success: true,
    data: {
      range: { from: from.toISOString(), to: to.toISOString() },
      tasks: {
        snapshot: taskSnapshotStats(visibleTasks, now),
        trend: buildTaskTrend(trendTasks, from, to),
      },
      study: {
        totalMinutes: totalStudyMinutes,
        sessionCount: sessions.length,
        byDay: buildStudyTrend(sessions, from, to).map(({ date, minutes }) => ({ date, minutes })),
        bySubject,
      },
      assignments: {
        assignedToMe: assignmentStats(assignedToMe),
        createdByMe: assignmentStats(createdByMe),
      },
      academic: {
        exams: { total: exams.length, upcoming: upcomingExams, past: exams.length - upcomingExams },
        ...scores,
      },
    },
  })
}
