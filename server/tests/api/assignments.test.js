import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startTestDb, stopTestDb } from '../helpers/testDb.js'
import { createUserAgent } from '../helpers/auth.js'

// Assignment lifecycle exercised sequentially against one shared task so
// transitions build on each other the way they would in real usage.
let creator
let assignee
let secondAssignee
let groupAdmin
let outsider
let group
let task

before(async () => {
  await startTestDb()
  creator = await createUserAgent({ name: 'Task Creator' })
  assignee = await createUserAgent({ name: 'Assignee One' })
  secondAssignee = await createUserAgent({ name: 'Assignee Two' })
  groupAdmin = await createUserAgent({ name: 'Group Admin' })
  outsider = await createUserAgent({ name: 'Outside User' })

  // A group where the creator is owner and groupAdmin is an active member —
  // used to prove that membership alone never grants task access.
  const groupRes = await creator.agent.post('/api/groups').send({ name: 'Study Circle' })
  group = groupRes.body.data.group
  await creator.agent
    .post(`/api/groups/${group._id}/invitations`)
    .send({ email: groupAdmin.payload.email })
  await groupAdmin.agent.post(`/api/groups/${group._id}/invitations/accept`)
})

after(async () => {
  await stopTestDb()
})

test('creator assigns a registered user, who sees it in their inbox', async () => {
  const created = await creator.agent
    .post('/api/tasks')
    .send({ title: 'Build API docs', group: group._id })
  assert.equal(created.status, 201)
  task = created.body.data.task

  const res = await creator.agent
    .post(`/api/tasks/${task._id}/assignments`)
    .send({ email: assignee.payload.email })
  assert.equal(res.status, 201)
  assert.equal(res.body.data.assignment.status, 'pending')

  const mine = await assignee.agent.get('/api/assignments/mine')
  assert.equal(mine.body.data.assignments.length, 1)
  assert.equal(mine.body.data.assignments[0].task.title, 'Build API docs')
})

test('rejects unknown emails, duplicates, and self-assignment', async () => {
  const unknown = await creator.agent
    .post(`/api/tasks/${task._id}/assignments`)
    .send({ email: 'ghost@test.local' })
  assert.equal(unknown.status, 404)

  const duplicate = await creator.agent
    .post(`/api/tasks/${task._id}/assignments`)
    .send({ email: assignee.payload.email })
  assert.equal(duplicate.status, 409)

  const self = await creator.agent
    .post(`/api/tasks/${task._id}/assignments`)
    .send({ email: creator.payload.email })
  assert.equal(self.status, 400)
})

test('assignee and creator can read the task; group admin and outsider cannot', async () => {
  const asAssignee = await assignee.agent.get(`/api/tasks/${task._id}`)
  assert.equal(asAssignee.status, 200)
  assert.equal(asAssignee.body.data.myAssignment.status, 'pending')

  const asCreator = await creator.agent.get(`/api/tasks/${task._id}`)
  assert.equal(asCreator.status, 200)
  assert.equal(asCreator.body.data.myAssignment, null)
  assert.equal(asCreator.body.data.assignments.length, 1)

  // The privacy rule: active group membership — even admin — grants nothing.
  const asGroupAdmin = await groupAdmin.agent.get(`/api/tasks/${task._id}`)
  assert.equal(asGroupAdmin.status, 404)
  const listAsGroupAdmin = await groupAdmin.agent.get('/api/tasks')
  assert.ok(!listAsGroupAdmin.body.data.tasks.some((item) => item._id === task._id))

  const asOutsider = await outsider.agent.get(`/api/tasks/${task._id}`)
  assert.equal(asOutsider.status, 404)
})

test('assignments list is visible to the assignee, hidden from the group admin', async () => {
  const visible = await assignee.agent.get(`/api/tasks/${task._id}/assignments`)
  assert.equal(visible.status, 200)
  assert.equal(visible.body.data.assignments.length, 1)

  const hidden = await groupAdmin.agent.get(`/api/tasks/${task._id}/assignments`)
  assert.equal(hidden.status, 404)
})

test('assigned tasks appear in the assignee list but not for unrelated users', async () => {
  const mine = await assignee.agent.get('/api/tasks')
  assert.ok(mine.body.data.tasks.some((item) => item._id === task._id))

  const notMine = await outsider.agent.get('/api/tasks')
  assert.ok(!notMine.body.data.tasks.some((item) => item._id === task._id))
})

test('assignees cannot edit or delete the task', async () => {
  const edit = await assignee.agent.patch(`/api/tasks/${task._id}`).send({ title: 'Hijacked' })
  assert.equal(edit.status, 404)

  const del = await assignee.agent.delete(`/api/tasks/${task._id}`)
  assert.equal(del.status, 404)
})

test('assignee lifecycle: accept, start, submit', async () => {
  const accepted = await assignee.agent
    .patch(`/api/tasks/${task._id}/assignments/${assignee.user.id}`)
    .send({ status: 'accepted' })
  assert.equal(accepted.status, 200)
  assert.ok(accepted.body.data.assignment.acceptedAt)

  const started = await assignee.agent
    .patch(`/api/tasks/${task._id}/assignments/${assignee.user.id}`)
    .send({ status: 'in_progress' })
  assert.equal(started.status, 200)

  const submitted = await assignee.agent
    .patch(`/api/tasks/${task._id}/assignments/${assignee.user.id}`)
    .send({ status: 'submitted', note: 'First draft ready' })
  assert.equal(submitted.status, 200)
  assert.equal(submitted.body.data.assignment.note, 'First draft ready')
  assert.ok(submitted.body.data.assignment.submittedAt)
})

test('only the assignee can drive their own transitions', async () => {
  const notAssignee = await secondAssignee.agent
    .patch(`/api/tasks/${task._id}/assignments/${assignee.user.id}`)
    .send({ status: 'accepted' })
  assert.equal(notAssignee.status, 404)

  const creatorTries = await creator.agent
    .patch(`/api/tasks/${task._id}/assignments/${assignee.user.id}`)
    .send({ status: 'in_progress' })
  assert.equal(creatorTries.status, 403)
})

test('backwards transitions are rejected', async () => {
  const backwards = await assignee.agent
    .patch(`/api/tasks/${task._id}/assignments/${assignee.user.id}`)
    .send({ status: 'accepted' })
  assert.equal(backwards.status, 400)
})

test('review is creator-only and targets submitted assignments', async () => {
  const byAssignee = await assignee.agent
    .post(`/api/tasks/${task._id}/assignments/${assignee.user.id}/review`)
    .send({ decision: 'completed' })
  assert.equal(byAssignee.status, 403)

  const needsWork = await creator.agent
    .post(`/api/tasks/${task._id}/assignments/${assignee.user.id}/review`)
    .send({ decision: 'needs_revision', note: 'Add the error handling section' })
  assert.equal(needsWork.status, 200)
  assert.equal(needsWork.body.data.assignment.status, 'needs_revision')
  assert.equal(needsWork.body.data.assignment.note, 'Add the error handling section')
})

test('resubmission after needs_revision ends in completion', async () => {
  const resubmitted = await assignee.agent
    .patch(`/api/tasks/${task._id}/assignments/${assignee.user.id}`)
    .send({ status: 'submitted', note: 'Updated draft' })
  assert.equal(resubmitted.status, 200)

  const completed = await creator.agent
    .post(`/api/tasks/${task._id}/assignments/${assignee.user.id}/review`)
    .send({ decision: 'completed' })
  assert.equal(completed.status, 200)
  assert.equal(completed.body.data.assignment.status, 'completed')
  assert.ok(completed.body.data.assignment.completedAt)

  const done = await assignee.agent.get('/api/assignments/mine?status=completed')
  assert.equal(done.body.data.assignments.length, 1)

  const terminal = await assignee.agent
    .patch(`/api/tasks/${task._id}/assignments/${assignee.user.id}`)
    .send({ status: 'submitted' })
  assert.equal(terminal.status, 400)
})

test('decline is terminal for the second assignee', async () => {
  const invited = await creator.agent
    .post(`/api/tasks/${task._id}/assignments`)
    .send({ email: secondAssignee.payload.email })
  assert.equal(invited.status, 201)

  const declined = await secondAssignee.agent
    .patch(`/api/tasks/${task._id}/assignments/${secondAssignee.user.id}`)
    .send({ status: 'declined' })
  assert.equal(declined.status, 200)

  const again = await secondAssignee.agent
    .patch(`/api/tasks/${task._id}/assignments/${secondAssignee.user.id}`)
    .send({ status: 'accepted' })
  assert.equal(again.status, 400)
})

test('only the creator can cancel, and only before a terminal state', async () => {
  await creator.agent
    .post(`/api/tasks/${task._id}/assignments`)
    .send({ email: outsider.payload.email })

  const byAssignee = await outsider.agent
    .patch(`/api/tasks/${task._id}/assignments/${outsider.user.id}`)
    .send({ status: 'cancelled' })
  assert.equal(byAssignee.status, 403)

  const byCreator = await creator.agent
    .patch(`/api/tasks/${task._id}/assignments/${outsider.user.id}`)
    .send({ status: 'cancelled' })
  assert.equal(byCreator.status, 200)
  assert.ok(byCreator.body.data.assignment.cancelledAt)

  const cancelledAgain = await creator.agent
    .patch(`/api/tasks/${task._id}/assignments/${outsider.user.id}`)
    .send({ status: 'cancelled' })
  assert.equal(cancelledAgain.status, 400)
})

test('removing an assignment revokes that user task access', async () => {
  const forbidden = await assignee.agent.delete(
    `/api/tasks/${task._id}/assignments/${secondAssignee.user.id}`
  )
  assert.equal(forbidden.status, 403)

  const removed = await creator.agent.delete(
    `/api/tasks/${task._id}/assignments/${secondAssignee.user.id}`
  )
  assert.equal(removed.status, 200)

  const detail = await secondAssignee.agent.get(`/api/tasks/${task._id}`)
  assert.equal(detail.status, 404)
})

test('attaching a group requires membership in that group', async () => {
  const otherGroup = await groupAdmin.agent.post('/api/groups').send({ name: 'Admin Circle' })

  const sneaky = await creator.agent
    .post('/api/tasks')
    .send({ title: 'Sneaky attach', group: otherGroup.body.data.group._id })
  assert.equal(sneaky.status, 400)

  const detach = await creator.agent.patch(`/api/tasks/${task._id}`).send({ group: '' })
  assert.equal(detach.status, 200)
  assert.equal(detach.body.data.task.group, null)

  const reattach = await creator.agent.patch(`/api/tasks/${task._id}`).send({ group: group._id })
  assert.equal(reattach.status, 200)
  assert.equal(reattach.body.data.task.group.name, 'Study Circle')
})

test('an assignee can log a study session against the shared task', async () => {
  const res = await assignee.agent.post('/api/sessions').send({
    task: task._id,
    startedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    endedAt: new Date().toISOString(),
    durationMinutes: 30,
  })
  assert.equal(res.status, 201)
})
