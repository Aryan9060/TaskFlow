import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startTestDb, stopTestDb } from '../helpers/testDb.js'
import { createUserAgent } from '../helpers/auth.js'
import ActivityLog from '../../models/ActivityLog.js'
import TaskAssignment from '../../models/TaskAssignment.js'
import TaskComment from '../../models/TaskComment.js'

// Comments, activity history, and notifications exercised against one shared
// task; the final test proves deletion cascades without touching history.
let creator
let assignee
let outsider
let task
let assignment

before(async () => {
  await startTestDb()
  creator = await createUserAgent({ name: 'Creator' })
  assignee = await createUserAgent({ name: 'Assignee' })
  outsider = await createUserAgent({ name: 'Outsider' })

  const created = await creator.agent.post('/api/tasks').send({ title: 'Shared project' })
  assert.equal(created.status, 201)
  task = created.body.data.task

  const invited = await creator.agent
    .post(`/api/tasks/${task._id}/assignments`)
    .send({ email: assignee.payload.email })
  assert.equal(invited.status, 201)

  const mine = await assignee.agent.get('/api/assignments/mine')
  assignment = mine.body.data.assignments[0]
})

after(async () => {
  await stopTestDb()
})

test('task and assignment creation are recorded server-side in activity', async () => {
  const res = await creator.agent.get(`/api/tasks/${task._id}/activity`)
  assert.equal(res.status, 200)

  const actions = res.body.data.activity.map((entry) => entry.action)
  assert.ok(actions.includes('task_created'))
  assert.ok(actions.includes('assignment_created'))
  // Newest first: the assignment is the latest entry.
  assert.equal(res.body.data.activity[0].action, 'assignment_created')
  assert.ok(res.body.data.activity[0].actor.name)
})

test('outsider can read neither activity nor comments', async () => {
  const activity = await outsider.agent.get(`/api/tasks/${task._id}/activity`)
  assert.equal(activity.status, 404)

  const comments = await outsider.agent.get(`/api/tasks/${task._id}/comments`)
  assert.equal(comments.status, 404)
})

test('assignee comments and the creator is notified', async () => {
  const added = await assignee.agent
    .post(`/api/tasks/${task._id}/comments`)
    .send({ body: 'Started the research section.' })
  assert.equal(added.status, 201)

  const list = await creator.agent.get(`/api/tasks/${task._id}/comments`)
  assert.equal(list.body.data.comments.length, 1)
  assert.equal(list.body.data.comments[0].author.name, 'Assignee')

  const activity = await assignee.agent.get(`/api/tasks/${task._id}/activity`)
  assert.ok(activity.body.data.activity.some((entry) => entry.action === 'comment_added'))

  const inbox = await creator.agent.get('/api/notifications')
  assert.ok(inbox.body.data.notifications.some((entry) => entry.type === 'comment_added'))
  assert.ok(inbox.body.data.unreadCount >= 1)
})

test('comment bodies are validated', async () => {
  const res = await assignee.agent.post(`/api/tasks/${task._id}/comments`).send({ body: '' })
  assert.equal(res.status, 400)
})

test('comment deletion is author-or-creator only', async () => {
  const byCreator = await creator.agent
    .post(`/api/tasks/${task._id}/comments`)
    .send({ body: 'Looks good so far.' })
  const creatorComment = byCreator.body.data.comment

  const forbidden = await assignee.agent.delete(
    `/api/tasks/${task._id}/comments/${creatorComment._id}`
  )
  assert.equal(forbidden.status, 403)

  const moderated = await creator.agent.delete(
    `/api/tasks/${task._id}/comments/${assignment._id && (await assigneeCommentId())}`
  )
  assert.equal(moderated.status, 200)

  const remaining = await assignee.agent.get(`/api/tasks/${task._id}/comments`)
  assert.equal(remaining.body.data.comments.length, 1)
  assert.equal(remaining.body.data.comments[0].body, 'Looks good so far.')
})

async function assigneeCommentId() {
  const list = await assignee.agent.get(`/api/tasks/${task._id}/comments`)
  return list.body.data.comments.find((c) => c.body === 'Started the research section.')._id
}

test('lifecycle events notify the right participant', async () => {
  const accepted = await assignee.agent
    .patch(`/api/tasks/${task._id}/assignments/${assignee.user.id}`)
    .send({ status: 'accepted' })
  assert.equal(accepted.status, 200)

  const creatorInbox = await creator.agent.get('/api/notifications')
  assert.ok(creatorInbox.body.data.notifications.some((n) => n.type === 'assignment_updated'))

  await assignee.agent
    .patch(`/api/tasks/${task._id}/assignments/${assignee.user.id}`)
    .send({ status: 'in_progress' })

  await assignee.agent
    .patch(`/api/tasks/${task._id}/assignments/${assignee.user.id}`)
    .send({ status: 'submitted', note: 'Draft one' })

  const review = await creator.agent
    .post(`/api/tasks/${task._id}/assignments/${assignee.user.id}/review`)
    .send({ decision: 'needs_revision', note: 'Add citations' })
  assert.equal(review.status, 200)

  const assigneeInbox = await assignee.agent.get('/api/notifications')
  assert.ok(assigneeInbox.body.data.notifications.some((n) => n.type === 'assignment_reviewed'))
  assert.ok(assigneeInbox.body.data.notifications.some((n) => n.message.includes('requested changes')))
})

test('unread filtering, single read, and read-all work', async () => {
  const inbox = await assignee.agent.get('/api/notifications')
  const firstUnread = inbox.body.data.notifications.find((n) => n.readAt === null)

  const marked = await assignee.agent.patch(`/api/notifications/${firstUnread._id}/read`)
  assert.equal(marked.status, 200)
  assert.ok(marked.body.data.notification.readAt)

  const unreadOnly = await assignee.agent.get('/api/notifications?unread=true')
  assert.ok(unreadOnly.body.data.notifications.every((n) => n.readAt === null))

  await assignee.agent.post('/api/notifications/read-all')
  const after = await assignee.agent.get('/api/notifications')
  assert.equal(after.body.data.unreadCount, 0)
})

test('failed actions leave no misleading activity entries', async () => {
  const before = await creator.agent.get(`/api/tasks/${task._id}/activity`)
  const countBefore = before.body.data.activity.length

  // The assignment is completed-terminal in this flow? No: needs_revision.
  // A forbidden transition attempt must be rejected and must not log.
  const rejected = await creator.agent
    .patch(`/api/tasks/${task._id}/assignments/${assignee.user.id}`)
    .send({ status: 'in_progress' })
  assert.equal(rejected.status, 403)

  const after = await creator.agent.get(`/api/tasks/${task._id}/activity`)
  assert.equal(after.body.data.activity.length, countBefore)
})

test('deleting a task cascades assignments and comments, keeping history', async () => {
  const deleted = await creator.agent.delete(`/api/tasks/${task._id}`)
  assert.equal(deleted.status, 200)

  const assignmentsLeft = await TaskAssignment.countDocuments({ task: task._id })
  assert.equal(assignmentsLeft, 0)

  const commentsLeft = await TaskComment.countDocuments({ task: task._id })
  assert.equal(commentsLeft, 0)

  const history = await ActivityLog.countDocuments({ task: task._id })
  assert.ok(history > 0)

  const mine = await assignee.agent.get('/api/assignments/mine')
  assert.ok(!mine.body.data.assignments.some((item) => item.task && item.task.title === 'Shared project'))
})
