import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  taskSnapshotStats,
  assignmentStats,
  buildTaskTrend,
  buildStudyTrend,
  examScoreStats,
} from '../../services/analytics.service.js'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

// Midnight three days ago, so trend windows have stable boundaries.
function midnightDaysAgo(days) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return date
}

function endOfToday() {
  const date = new Date()
  date.setHours(23, 59, 59, 999)
  return date
}

test('cancelled tasks stay out of rates and overdue counts', () => {
  const yesterday = new Date(Date.now() - DAY)
  const stats = taskSnapshotStats([
    { status: 'todo', dueDate: yesterday },
    { status: 'cancelled', dueDate: yesterday },
    { status: 'completed', dueDate: null, completedAt: new Date(), createdAt: new Date() },
  ])

  assert.equal(stats.total, 3)
  assert.equal(stats.open, 1)
  assert.equal(stats.completed, 1)
  assert.equal(stats.cancelled, 1)
  assert.equal(stats.overdue, 1)
  assert.equal(stats.completionRate, 50)
  assert.equal(stats.onTimeRate, null)
})

test('on-time rate compares completion against the due date', () => {
  const now = new Date()
  const stats = taskSnapshotStats([
    { status: 'completed', dueDate: new Date(now.getTime() + DAY), completedAt: now, createdAt: now },
    { status: 'completed', dueDate: new Date(now.getTime() - DAY), completedAt: now, createdAt: now },
  ])

  assert.equal(stats.onTimeRate, 50)
  assert.ok(stats.avgCompletionHours >= 0)
})

test('assignment rates skip declined and cancelled work', () => {
  const mixed = assignmentStats([
    { status: 'completed' },
    { status: 'declined' },
    { status: 'pending' },
  ])
  // Only the completed assignment was actionable out of three minus one decline.
  assert.equal(mixed.total, 3)
  assert.equal(mixed.acceptanceRate, 50)
  assert.equal(mixed.submissionRate, 100)

  const allCancelled = assignmentStats([{ status: 'cancelled' }])
  assert.equal(allCancelled.acceptanceRate, null)
  assert.equal(allCancelled.submissionRate, null)

  const allDeclined = assignmentStats([{ status: 'declined' }])
  assert.equal(allDeclined.acceptanceRate, null)
  assert.equal(allDeclined.submissionRate, null)
})

test('turnaround averages are reported in hours', () => {
  const createdAt = new Date('2026-01-01T08:00:00Z')
  const stats = assignmentStats([
    {
      status: 'completed',
      createdAt,
      acceptedAt: new Date(createdAt.getTime() + 2 * HOUR),
      submittedAt: new Date(createdAt.getTime() + 5 * HOUR),
    },
  ])

  assert.equal(stats.avgHoursToAccept, 2)
  assert.equal(stats.avgHoursToSubmit, 3)
})

test('task trend counts created and completed on their own days', () => {
  const from = midnightDaysAgo(2)
  const series = buildTaskTrend(
    [
      { createdAt: new Date(from.getTime() + HOUR), status: 'completed', completedAt: new Date(endOfToday().getTime() - HOUR) },
      { createdAt: new Date(midnightDaysAgo(1).getTime() + HOUR), status: 'todo', completedAt: null },
    ],
    from,
    endOfToday()
  )

  assert.equal(series.length, 3)
  assert.equal(series[0].created, 1)
  assert.equal(series[0].completed, 0)
  assert.equal(series[1].created, 1)
  assert.equal(series[2].completed, 1)
})

test('study trend buckets minutes onto their session day', () => {
  const from = midnightDaysAgo(1)
  const series = buildStudyTrend(
    [
      { startedAt: new Date(from.getTime() + HOUR), durationMinutes: 25 },
      { startedAt: new Date(from.getTime() + 2 * HOUR), durationMinutes: 35 },
    ],
    from,
    endOfToday()
  )

  assert.equal(series.length, 2)
  assert.equal(series[0].minutes, 60)
  assert.equal(series[0].sessions, 2)
  assert.equal(series[1].minutes, 0)
})

test('exam scores average per subject and skip ungraded exams', () => {
  const subjectById = new Map([['s1', { name: 'Mathematics', color: '#123456' }]])
  const stats = examScoreStats(
    [
      { subject: 's1', score: 80 },
      { subject: 's1', score: 90 },
      { subject: null, score: 70 },
      { subject: 's1', score: null },
    ],
    subjectById
  )

  assert.equal(stats.scoredExams, 3)
  assert.equal(stats.overallAvgScore, 80)
  assert.deepEqual(stats.avgScoreBySubject, [
    { name: 'Mathematics', color: '#123456', avgScore: 85, examCount: 2 },
    { name: 'General', color: null, avgScore: 70, examCount: 1 },
  ])
})
