import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { app, startTestDb, stopTestDb } from '../helpers/testDb.js'
import { createUserAgent } from '../helpers/auth.js'

before(startTestDb)
after(stopTestDb)

// Returns an ISO date n days from now, used for due-date payloads.
function dueInDays(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

test('creating a task requires a title', async () => {
  const { agent } = await createUserAgent()

  const response = await agent.post('/api/tasks').send({ title: '' })

  assert.equal(response.status, 400)
  assert.match(response.body.message, /Title is required/)
})

test('creating a task rejects an unknown status', async () => {
  const { agent } = await createUserAgent()

  const response = await agent
    .post('/api/tasks')
    .send({ title: 'Read chapter 3', status: 'later' })

  assert.equal(response.status, 400)
  assert.match(response.body.message, /Invalid status/)
})

test('task CRUD works and list returns only the owner tasks', async () => {
  const { agent } = await createUserAgent()

  const created = await agent.post('/api/tasks').send({
    title: 'Finish assignment 1',
    kind: 'assignment',
    priority: 'high',
    dueDate: dueInDays(3),
    estimatedMinutes: 90,
  })

  assert.equal(created.status, 201)
  const taskId = created.body.data.task._id
  assert.equal(created.body.data.task.title, 'Finish assignment 1')

  const listed = await agent.get('/api/tasks')
  assert.equal(listed.status, 200)
  assert.equal(listed.body.data.tasks.length, 1)

  const updated = await agent
    .patch(`/api/tasks/${taskId}`)
    .send({ status: 'completed' })

  assert.equal(updated.status, 200)
  assert.equal(updated.body.data.task.status, 'completed')
  assert.ok(updated.body.data.task.completedAt)

  const deleted = await agent.delete(`/api/tasks/${taskId}`)
  assert.equal(deleted.status, 200)

  const missing = await agent.delete(`/api/tasks/${taskId}`)
  assert.equal(missing.status, 404)
})

test('updating a task validates the due date', async () => {
  const { agent } = await createUserAgent()

  const created = await agent.post('/api/tasks').send({ title: 'Valid task' })
  const response = await agent
    .patch(`/api/tasks/${created.body.data.task._id}`)
    .send({ dueDate: 'not-a-date' })

  assert.equal(response.status, 400)
  assert.match(response.body.message, /valid date/)
})

test('ownership boundaries hide other users tasks and block edits', async () => {
  const owner = await createUserAgent()
  const stranger = await createUserAgent()

  const created = await owner.agent
    .post('/api/tasks')
    .send({ title: 'Private task' })
  const taskId = created.body.data.task._id

  const strangerList = await stranger.agent.get('/api/tasks')
  assert.equal(strangerList.status, 200)
  assert.equal(strangerList.body.data.tasks.length, 0)

  const strangerUpdate = await stranger.agent
    .patch(`/api/tasks/${taskId}`)
    .send({ title: 'Hijacked' })
  assert.equal(strangerUpdate.status, 404)

  const strangerDelete = await stranger.agent.delete(`/api/tasks/${taskId}`)
  assert.equal(strangerDelete.status, 404)

  const ownerList = await owner.agent.get('/api/tasks')
  assert.equal(ownerList.body.data.tasks[0].title, 'Private task')
})

test('recurring tasks reject a missing due date', async () => {
  const { agent } = await createUserAgent()

  const response = await agent
    .post('/api/tasks')
    .send({ title: 'Daily reading', recurrence: 'daily' })

  assert.equal(response.status, 400)
  assert.match(response.body.message, /need a due date/)
})

test('completing a recurring task schedules exactly one successor', async () => {
  const { agent } = await createUserAgent()
  const dueDate = dueInDays(1)

  const created = await agent.post('/api/tasks').send({
    title: 'Daily reading',
    recurrence: 'daily',
    dueDate,
  })
  const taskId = created.body.data.task._id

  const completed = await agent
    .patch(`/api/tasks/${taskId}`)
    .send({ status: 'completed' })

  assert.equal(completed.status, 200)
  assert.ok(completed.body.data.nextOccurrence)
  assert.equal(completed.body.data.nextOccurrence.title, 'Daily reading')

  const original = new Date(dueDate)
  const successor = new Date(completed.body.data.nextOccurrence.dueDate)
  assert.equal(successor.getTime() - original.getTime(), 24 * 60 * 60 * 1000)

  // Re-saving the completed task must not spawn a second copy.
  const again = await agent
    .patch(`/api/tasks/${taskId}`)
    .send({ status: 'completed' })
  assert.equal(again.body.data.nextOccurrence, null)

  const list = await agent.get('/api/tasks')
  assert.equal(list.body.data.tasks.length, 2)
})

test('invalid JSON returns a 400 instead of crashing the server', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{"email":')

  assert.equal(response.status, 400)
  assert.match(response.body.message, /Invalid JSON/)
})
