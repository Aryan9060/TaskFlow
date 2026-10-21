import { dayKey } from '../utils/dates.js'

// Pure analytics math. Every helper takes plain documents (lean objects) and
// returns plain values so both the API layer and unit tests can use them
// without a database connection.

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

// Statuses proving an assignee said yes (or moved past acceptance).
const ACCEPTED_STATUSES = ['accepted', 'in_progress', 'submitted', 'completed', 'needs_revision']
// Statuses proving work was handed in at least once.
const SUBMITTED_STATUSES = ['submitted', 'completed', 'needs_revision']

// Rounds to one decimal so hour averages read cleanly in the UI.
export function round1(value) {
  return Math.round(value * 10) / 10
}

// Snapshot totals over the caller's visible tasks. Cancelled work is excluded
// from every rate and from overdue so abandoning a task never looks like
// progress; on-time compares against the due date, and tasks without one are
// left out of the on-time denominator rather than silently counted as late.
export function taskSnapshotStats(tasks, now = new Date()) {
  let open = 0
  let completed = 0
  let cancelled = 0
  let overdue = 0
  let completedWithDueDate = 0
  let onTime = 0
  let completionMsTotal = 0
  let completionCount = 0

  for (const task of tasks) {
    if (task.status === 'cancelled') {
      cancelled += 1
      continue
    }

    if (task.status === 'completed') {
      completed += 1
      if (task.dueDate) {
        completedWithDueDate += 1
        if (new Date(task.completedAt) <= new Date(task.dueDate)) onTime += 1
      }
      if (task.completedAt && task.createdAt) {
        completionMsTotal += new Date(task.completedAt) - new Date(task.createdAt)
        completionCount += 1
      }
      continue
    }

    open += 1
    if (task.dueDate && new Date(task.dueDate) < now) overdue += 1
  }

  const ratedTotal = completed + open
  return {
    total: tasks.length,
    open,
    completed,
    cancelled,
    overdue,
    completionRate: ratedTotal > 0 ? Math.round((completed / ratedTotal) * 100) : null,
    onTimeRate: completedWithDueDate > 0 ? Math.round((onTime / completedWithDueDate) * 100) : null,
    avgCompletionHours:
      completionCount > 0 ? round1(completionMsTotal / completionCount / HOUR_MS) : null,
  }
}

// Day-by-day created/completed counts covering every day from..to inclusive.
// A task adds to `created` on its creation day and to `completed` on the day
// it was finished, so work carried across the window boundary shows up on
// the correct side.
export function buildTaskTrend(tasks, from, to) {
  const series = []
  const indexByDate = new Map()
  const cursor = new Date(from)

  while (cursor.getTime() <= to.getTime()) {
    const date = dayKey(cursor)
    indexByDate.set(date, series.length)
    series.push({ date, created: 0, completed: 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  for (const task of tasks) {
    if (task.createdAt) {
      const index = indexByDate.get(dayKey(new Date(task.createdAt)))
      if (index !== undefined) series[index].created += 1
    }
    if (task.status === 'completed' && task.completedAt) {
      const index = indexByDate.get(dayKey(new Date(task.completedAt)))
      if (index !== undefined) series[index].completed += 1
    }
  }

  return series
}

// Day-by-day study minutes and session counts for the range.
export function buildStudyTrend(sessions, from, to) {
  const series = []
  const indexByDate = new Map()
  const cursor = new Date(from)

  while (cursor.getTime() <= to.getTime()) {
    const date = dayKey(cursor)
    indexByDate.set(date, series.length)
    series.push({ date, minutes: 0, sessions: 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  for (const session of sessions) {
    const index = indexByDate.get(dayKey(new Date(session.startedAt)))
    if (index !== undefined) {
      series[index].minutes += session.durationMinutes
      series[index].sessions += 1
    }
  }

  return series
}

// Status counts, acceptance/submission rates, and turnaround averages for
// one role view of assignments (as assignee or as assigner).
//
// acceptanceRate: share of actionable assignments that were accepted.
//   Declined and cancelled are removed from the denominator — they were
//   never workable, and counting them would punish refusals.
// submissionRate: share of accepted work that was handed in.
//   Pending assignments stay in the acceptance denominator (silence is not
//   acceptance) but not in the submission denominator.
export function assignmentStats(assignments) {
  const byStatus = {}
  let acceptMsTotal = 0
  let acceptCount = 0
  let submitMsTotal = 0
  let submitCount = 0

  for (const assignment of assignments) {
    byStatus[assignment.status] = (byStatus[assignment.status] ?? 0) + 1
    if (assignment.acceptedAt && assignment.createdAt) {
      acceptMsTotal += new Date(assignment.acceptedAt) - new Date(assignment.createdAt)
      acceptCount += 1
    }
    if (assignment.submittedAt && assignment.acceptedAt) {
      submitMsTotal += new Date(assignment.submittedAt) - new Date(assignment.acceptedAt)
      submitCount += 1
    }
  }

  const countOf = (statuses) => statuses.reduce((sum, status) => sum + (byStatus[status] ?? 0), 0)
  const acceptedOrBeyond = countOf(ACCEPTED_STATUSES)
  const submittedOrBeyond = countOf(SUBMITTED_STATUSES)
  const actionable = assignments.length - (byStatus.declined ?? 0) - (byStatus.cancelled ?? 0)

  return {
    total: assignments.length,
    byStatus,
    acceptanceRate: actionable > 0 ? Math.round((acceptedOrBeyond / actionable) * 100) : null,
    submissionRate: acceptedOrBeyond > 0 ? Math.round((submittedOrBeyond / acceptedOrBeyond) * 100) : null,
    avgHoursToAccept: acceptCount > 0 ? round1(acceptMsTotal / acceptCount / HOUR_MS) : null,
    avgHoursToSubmit: submitCount > 0 ? round1(submitMsTotal / submitCount / HOUR_MS) : null,
  }
}

// Average exam score grouped by subject for exams that carry a grade.
// Ungraded exams are skipped entirely; unlinked subjects fall into a
// "General" bucket so a deleted subject never loses its history.
export function examScoreStats(exams, subjectById) {
  const groups = new Map()
  let scoreTotal = 0
  let scoredCount = 0

  for (const exam of exams) {
    if (exam.score === null || exam.score === undefined) continue
    scoreTotal += exam.score
    scoredCount += 1

    const key = exam.subject ? String(exam.subject) : 'general'
    if (!groups.has(key)) {
      const subject = exam.subject ? subjectById.get(String(exam.subject)) : null
      groups.set(key, {
        name: subject ? subject.name : 'General',
        color: subject ? subject.color : null,
        total: 0,
        count: 0,
      })
    }
    const group = groups.get(key)
    group.total += exam.score
    group.count += 1
  }

  const avgScoreBySubject = [...groups.values()]
    .map((group) => ({
      name: group.name,
      color: group.color,
      avgScore: Math.round(group.total / group.count),
      examCount: group.count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)

  return {
    scoredExams: scoredCount,
    overallAvgScore: scoredCount > 0 ? Math.round(scoreTotal / scoredCount) : null,
    avgScoreBySubject,
  }
}
