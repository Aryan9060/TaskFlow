import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startTestDb, stopTestDb } from '../helpers/testDb.js'
import { createUserAgent } from '../helpers/auth.js'

// Group lifecycle is exercised sequentially against one shared group so the
// permission rules build on each other the way they would in real usage.
let owner
let admin
let member
let outsider
let group

before(async () => {
  await startTestDb()
  owner = await createUserAgent({ name: 'Group Owner' })
  admin = await createUserAgent({ name: 'Future Admin' })
  member = await createUserAgent({ name: 'Group Member' })
  outsider = await createUserAgent({ name: 'Outside User' })
})

after(async () => {
  await stopTestDb()
})

test('creates a group and makes the creator owner', async () => {
  const res = await owner.agent
    .post('/api/groups')
    .send({ name: 'Project Phoenix', description: 'MCA final year project' })

  assert.equal(res.status, 201)
  group = res.body.data.group

  const detail = await owner.agent.get(`/api/groups/${group._id}`)
  assert.equal(detail.status, 200)
  assert.equal(detail.body.data.myRole, 'owner')
  assert.equal(detail.body.data.members.length, 1)
})

test('rejects an invalid group name', async () => {
  const res = await owner.agent.post('/api/groups').send({ name: 'x' })
  assert.equal(res.status, 400)
})

test('lists only groups where the user is an active member', async () => {
  await outsider.agent.post('/api/groups').send({ name: 'Outsider Circle' })

  const res = await owner.agent.get('/api/groups')
  const names = res.body.data.groups.map((g) => g.name)
  assert.ok(names.includes('Project Phoenix'))
  assert.ok(!names.includes('Outsider Circle'))
})

test('hides group details from non-members', async () => {
  const res = await outsider.agent.get(`/api/groups/${group._id}`)
  assert.equal(res.status, 404)
})

test('manager invites a registered user by email', async () => {
  const res = await owner.agent
    .post(`/api/groups/${group._id}/invitations`)
    .send({ email: admin.payload.email })

  assert.equal(res.status, 201)
  assert.equal(res.body.data.invitation.user.email, admin.payload.email)

  const mine = await admin.agent.get('/api/groups/invitations/mine')
  assert.equal(mine.body.data.invitations.length, 1)
  assert.equal(mine.body.data.invitations[0].group.name, 'Project Phoenix')
})

test('rejects duplicate invitations and unknown emails', async () => {
  const duplicate = await owner.agent
    .post(`/api/groups/${group._id}/invitations`)
    .send({ email: admin.payload.email })
  assert.equal(duplicate.status, 409)

  const unknown = await owner.agent
    .post(`/api/groups/${group._id}/invitations`)
    .send({ email: 'nobody@test.local' })
  assert.equal(unknown.status, 404)
})

test('non-members cannot invite', async () => {
  const res = await outsider.agent
    .post(`/api/groups/${group._id}/invitations`)
    .send({ email: admin.payload.email })
  assert.equal(res.status, 404)
})

test('invitee accepts and becomes an active member', async () => {
  const res = await admin.agent.post(`/api/groups/${group._id}/invitations/accept`)
  assert.equal(res.status, 200)

  const detail = await admin.agent.get(`/api/groups/${group._id}`)
  assert.equal(detail.status, 200)
  assert.equal(detail.body.data.myRole, 'member')

  const mine = await admin.agent.get('/api/groups/invitations/mine')
  assert.equal(mine.body.data.invitations.length, 0)
})

test('accepting without an invitation fails', async () => {
  const res = await outsider.agent.post(`/api/groups/${group._id}/invitations/accept`)
  assert.equal(res.status, 404)
})

test('invitee can decline an invitation', async () => {
  await owner.agent.post(`/api/groups/${group._id}/invitations`).send({ email: outsider.payload.email })

  const res = await outsider.agent.delete(`/api/groups/${group._id}/invitations/${outsider.user.id}`)
  assert.equal(res.status, 200)

  const mine = await outsider.agent.get('/api/groups/invitations/mine')
  assert.equal(mine.body.data.invitations.length, 0)
  const detail = await outsider.agent.get(`/api/groups/${group._id}`)
  assert.equal(detail.status, 404)
})

test('plain members cannot invite, admins can', async () => {
  await owner.agent.post(`/api/groups/${group._id}/invitations`).send({ email: outsider.payload.email })
  await outsider.agent.post(`/api/groups/${group._id}/invitations/accept`)

  const blocked = await outsider.agent
    .post(`/api/groups/${group._id}/invitations`)
    .send({ email: member.payload.email })
  assert.equal(blocked.status, 403)

  await owner.agent.patch(`/api/groups/${group._id}/members/${admin.user.id}`).send({ role: 'admin' })
  const allowed = await admin.agent
    .post(`/api/groups/${group._id}/invitations`)
    .send({ email: member.payload.email })
  assert.equal(allowed.status, 201)
})

test('members cannot edit the group, managers can', async () => {
  const blocked = await outsider.agent.patch(`/api/groups/${group._id}`).send({ name: 'Hijacked' })
  assert.equal(blocked.status, 403)

  const allowed = await admin.agent.patch(`/api/groups/${group._id}`).send({ description: 'Admin edit' })
  assert.equal(allowed.status, 200)
  assert.equal(allowed.body.data.group.description, 'Admin edit')
})

test('role changes are owner-only, never self, and never to owner directly', async () => {
  const byAdmin = await admin.agent
    .patch(`/api/groups/${group._id}/members/${outsider.user.id}`)
    .send({ role: 'admin' })
  assert.equal(byAdmin.status, 403)

  const selfChange = await owner.agent
    .patch(`/api/groups/${group._id}/members/${owner.user.id}`)
    .send({ role: 'member' })
  assert.equal(selfChange.status, 400)

  const ownerRole = await owner.agent
    .patch(`/api/groups/${group._id}/members/${outsider.user.id}`)
    .send({ role: 'owner' })
  assert.equal(ownerRole.status, 400)

  const promoted = await owner.agent
    .patch(`/api/groups/${group._id}/members/${outsider.user.id}`)
    .send({ role: 'admin' })
  assert.equal(promoted.status, 200)
  assert.equal(promoted.body.data.membership.role, 'admin')
})

test('removal rules protect the owner and other admins', async () => {
  const removeOwner = await admin.agent.delete(`/api/groups/${group._id}/members/${owner.user.id}`)
  assert.equal(removeOwner.status, 403)

  const removeAdmin = await admin.agent.delete(`/api/groups/${group._id}/members/${outsider.user.id}`)
  assert.equal(removeAdmin.status, 403)

  const removed = await owner.agent.delete(`/api/groups/${group._id}/members/${outsider.user.id}`)
  assert.equal(removed.status, 200)

  const detail = await outsider.agent.get(`/api/groups/${group._id}`)
  assert.equal(detail.status, 404)
})

test('plain members cannot remove anyone', async () => {
  await member.agent.post(`/api/groups/${group._id}/invitations/accept`)

  const res = await member.agent.delete(`/api/groups/${group._id}/members/${owner.user.id}`)
  assert.equal(res.status, 403)
})

test('a non-owner member can leave, the owner cannot remove themselves', async () => {
  const leave = await member.agent.delete(`/api/groups/${group._id}/members/${member.user.id}`)
  assert.equal(leave.status, 200)

  const gone = await member.agent.get(`/api/groups/${group._id}`)
  assert.equal(gone.status, 404)

  const ownerLeave = await owner.agent.delete(`/api/groups/${group._id}/members/${owner.user.id}`)
  assert.equal(ownerLeave.status, 400)
})

test('ownership transfer swaps roles and delete rights follow it', async () => {
  const transferred = await owner.agent
    .post(`/api/groups/${group._id}/transfer`)
    .send({ userId: admin.user.id })
  assert.equal(transferred.status, 200)

  const oldOwnerView = await owner.agent.get(`/api/groups/${group._id}`)
  assert.equal(oldOwnerView.body.data.myRole, 'admin')

  const byNonOwner = await owner.agent
    .post(`/api/groups/${group._id}/transfer`)
    .send({ userId: owner.user.id })
  assert.equal(byNonOwner.status, 403)

  const deleteByOldOwner = await owner.agent.delete(`/api/groups/${group._id}`)
  assert.equal(deleteByOldOwner.status, 403)

  const deleteByNewOwner = await admin.agent.delete(`/api/groups/${group._id}`)
  assert.equal(deleteByNewOwner.status, 200)

  const gone = await admin.agent.get(`/api/groups/${group._id}`)
  assert.equal(gone.status, 404)
})
