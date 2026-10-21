import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { startTestDb, stopTestDb, app } from '../helpers/testDb.js'
import { createUserAgent } from '../helpers/auth.js'
import Task from '../../models/Task.js'
import StudySession from '../../models/StudySession.js'

// Insights math is exercised end to end: snapshot counts and rates, the
// assignment lifecycle metrics from both roles, cross-user isolation, and
// the date-range window.
const DAY = 24 * 60 * 60 * 1000

let owner
let collaborator
let stranger

function iso(daysFromNow) {
  return new Date(Date.now() + daysFromNow * DAY).toISOString()
}

// Local-midnight ISO so trend lengths are exact calendar days even across
// daylight-saving shifts (ms arithmetic could land on the wrong day).
function midnightIso(daysBack) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - daysBack)
  return date.toISOString()
}

async function createTask(agent, payload) {
  const res = await agent.post('/api/tasks').send(payload)
  assert.equal(res.status, 201)
  return res.body.data.task
}

async function insights(agent, query = '') {
  const res = await agent.get(`/api/analytics/insights${query}`)
  assert.equal(res.status, 200)
  return res.body.data
}

before(async () => {
  await startTestDb()
  owner = await createUserAgent({ name: 'Analytics Owner' })
  collaborator = await createUserAgent({ name: 'Analytics Collaborator' })
  stranger = await createUserAgent({ name: 'Analytics Stranger' })
})

after(async () => {
  await stopTestDb()
})

test('insights require authentication', async () => {
  const res = await request(app).get('/api/analytics/insights')
  assert.equal(res.status, 401)
})

test('a fresh account gets zeroed insights with null rates', async () => {
  const data = await insights(owner.agent)

  assert.equal(data.tasks.snapshot.total, 0)
  assert.equal(data.tasks.snapshot.completionRate, null)
  assert.equal(data.tasks.snapshot.onTimeRate, null)
  assert.equal(data.study.totalMinutes, 0)
  assert.equal(data.study.byDay.length, 30)
  assert.equal(data.assignments.createdByMe.total, 0)
  assert.equal(data.assignments.createdByMe.acceptanceRate, null)
  assert.equal(data.assignments.assignedToMe.total, 0)
  assert.equal(data.academic.exams.total, 0)
  assert.equal(data.academic.overallAvgScore, null)
})

test('snapshot counts, overdue, and rates are precise', async () => {
  const futureTodo = await createTask(owner.agent, { title: 'Future todo', dueDate: iso(3) })
  await createTask(owner.agent, { title: 'Overdue todo', dueDate: iso(-2) })
  // Completed after its due date: counts as done, but never on time.
  const lateDone = await createTask(owner.agent, { title: 'Late done', dueDate: iso(-1) })
  await owner.agent.patch(`/api/tasks/${lateDone._id}`).send({ status: 'completed' })
  const abandoned = await createTask(owner.agent, { title: 'Given up' })
  await owner.agent.patch(`/api/tasks/${abandoned._id}`).send({ status: 'cancelled' })
  const onTimeDone = await createTask(owner.agent, { title: 'On time', dueDate: iso(2) })
  await owner.agent.patch(`/api/tasks/${onTimeDone._id}`).send({ status: 'completed' })
  assert.ok(futureTodo)

  const data = await insights(owner.agent)
  const snapshot = data.tasks.snapshot

  assert.equal(snapshot.total, 5)
  assert.equal(snapshot.open, 2)
  assert.equal(snapshot.completed, 2)
  assert.equal(snapshot.cancelled, 1)
  assert.equal(snapshot.overdue, 1)
  assert.equal(snapshot.completionRate, 50)
  assert.equal(snapshot.onTimeRate, 50)
  assert.ok(snapshot.avgCompletionHours >= 0)

  // The dashboard agrees: cancelled work is not outstanding anywhere.
  const dashboard = await owner.agent.get('/api/dashboard/summary')
  assert.equal(dashboard.status, 200)
  assert.equal(dashboard.body.data.stats.overdue, 1)
  assert.equal(dashboard.body.data.stats.openTasks, 2)
})

test('assignment lifecycle metrics are computed per role', async () => {
  // Assignment one runs the full happy path to completed.
  const essay = await createTask(owner.agent, { title: 'Analytics essay', kind: 'assignment' })
  await owner.agent
    .post(`/api/tasks/${essay._id}/assignments`)
    .send({ email: collaborator.payload.email })
  await collaborator.agent
    .patch(`/api/tasks/${essay._id}/assignments/${collaborator.user.id}`)
    .send({ status: 'accepted' })
  await collaborator.agent
    .patch(`/api/tasks/${essay._id}/assignments/${collaborator.user.id}`)
    .send({ status: 'in_progress' })
  await collaborator.agent
    .patch(`/api/tasks/${essay._id}/assignments/${collaborator.user.id}`)
    .send({ status: 'submitted' })
  await owner.agent
    .post(`/api/tasks/${essay._id}/assignments/${collaborator.user.id}/review`)
    .send({ decision: 'completed' })

  // Assignment two is declined, assignment three stays pending.
  const lab = await createTask(owner.agent, { title: 'Analytics lab', kind: 'assignment' })
  await owner.agent.post(`/api/tasks/${lab._id}/assignments`).send({ email: collaborator.payload.email })
  await collaborator.agent
    .patch(`/api/tasks/${lab._id}/assignments/${collaborator.user.id}`)
    .send({ status: 'declined' })

  const reading = await createTask(owner.agent, { title: 'Analytics reading', kind: 'assignment' })
  await owner.agent.post(`/api/tasks/${reading._id}/assignments`).send({ email: collaborator.payload.email })

  const ownerView = await insights(owner.agent)
  const created = ownerView.assignments.createdByMe
  assert.equal(created.total, 3)
  assert.equal(created.byStatus.completed, 1)
  assert.equal(created.byStatus.declined, 1)
  assert.equal(created.byStatus.pending, 1)
  // Declined is removed from the denominator; pending stays in it.
  assert.equal(created.acceptanceRate, 50)
  assert.equal(created.submissionRate, 100)
  assert.ok(created.avgHoursToAccept >= 0)
  assert.ok(created.avgHoursToSubmit >= 0)

  // The assignee sees the same numbers from the other side of the table.
  const assigneeView = await insights(collaborator.agent)
  const mine = assigneeView.assignments.assignedToMe
  assert.equal(mine.total, 3)
  assert.equal(mine.acceptanceRate, 50)
  assert.equal(mine.submissionRate, 100)

  // A stranger shares none of it.
  const strangerView = await insights(stranger.agent)
  assert.equal(strangerView.assignments.createdByMe.total, 0)
  assert.equal(strangerView.assignments.assignedToMe.total, 0)
})

test('insights never include other users tasks or sessions', async () => {
  const before = await insights(owner.agent)
  assert.equal(before.tasks.snapshot.total, 8)

  await createTask(stranger.agent, { title: 'Stranger work one' })
  await createTask(stranger.agent, { title: 'Stranger work two' })
  const session = await stranger.agent.post('/api/sessions').send({
    durationMinutes: 45,
    startedAt: iso(0),
    endedAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
  })
  assert.equal(session.status, 201)

  const afterOwner = await insights(owner.agent)
  assert.equal(afterOwner.tasks.snapshot.total, 8)
  assert.equal(afterOwner.study.totalMinutes, 0)

  const strangerView = await insights(stranger.agent)
  assert.equal(strangerView.tasks.snapshot.total, 2)
  assert.equal(strangerView.study.totalMinutes, 45)
})

test('date ranges trim the trend and study windows but not the snapshot', async () => {
  const backdated = await createTask(owner.agent, { title: 'Backdated work' })
  const fortyDaysAgo = new Date(Date.now() - 40 * DAY)
  await Task.updateOne({ _id: backdated._id }, { $set: { createdAt: fortyDaysAgo } })
  await StudySession.create({
    owner: owner.user.id,
    startedAt: new Date(fortyDaysAgo.getTime() + 10 * 60 * 60 * 1000),
    endedAt: new Date(fortyDaysAgo.getTime() + 10 * 60 * 60 * 1000 + 30 * 60 * 1000),
    durationMinutes: 30,
  })

  // Wide window: 41 days back through today inclusive, session inside.
  const wide = await insights(owner.agent, `?from=${midnightIso(41)}&to=${iso(0)}`)
  assert.equal(wide.study.totalMinutes, 30)
  assert.equal(wide.tasks.trend.length, 42)
  assert.equal(wide.tasks.snapshot.total, 9)

  // Narrow window: the backdated session and creation fall outside, but the
  // snapshot keeps reporting the current truth.
  const narrow = await insights(owner.agent, `?from=${midnightIso(29)}&to=${iso(0)}`)
  assert.equal(narrow.study.totalMinutes, 0)
  assert.equal(narrow.tasks.snapshot.total, 9)
  assert.equal(narrow.tasks.trend.length, 30)
})

test('invalid date ranges are rejected before any queries run', async () => {
  const reversed = await owner.agent.get(`/api/analytics/insights?from=${iso(0)}&to=${iso(-5)}`)
  assert.equal(reversed.status, 400)

  const tooLong = await owner.agent.get(`/api/analytics/insights?from=${iso(-400)}&to=${iso(0)}`)
  assert.equal(tooLong.status, 400)

  const garbage = await owner.agent.get('/api/analytics/insights?from=not-a-date')
  assert.equal(garbage.status, 400)
})
