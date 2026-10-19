import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { app, startTestDb, stopTestDb } from '../helpers/testDb.js'
import { createUserAgent } from '../helpers/auth.js'

before(startTestDb)
after(stopTestDb)

test('registration rejects invalid input with readable messages', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'A', email: 'not-an-email', password: 'short' })

  assert.equal(response.status, 400)
  assert.equal(response.body.success, false)
  assert.match(response.body.message, /at least 2 characters/)
  assert.match(response.body.message, /valid email/)
  assert.match(response.body.message, /at least 8 characters/)
})

test('registration creates an account and sets an httpOnly session cookie', async () => {
  const { response, payload } = await createUserAgent()

  assert.equal(response.status, 201)
  assert.equal(response.body.data.user.email, payload.email)
  assert.equal(response.body.data.user.passwordHash, undefined)

  const cookie = response.headers['set-cookie'][0]
  assert.match(cookie, /taskflow_token=/)
  assert.match(cookie, /HttpOnly/i)
  assert.match(cookie, /SameSite=Lax/i)
})

test('registering the same email twice returns 409', async () => {
  const { payload } = await createUserAgent()

  const response = await request(app).post('/api/auth/register').send(payload)

  assert.equal(response.status, 409)
  assert.match(response.body.message, /already exists/)
})

test('login rejects a wrong password with the same generic message', async () => {
  const { payload } = await createUserAgent()

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: payload.email, password: 'WrongPassword1' })

  assert.equal(response.status, 401)
  assert.equal(response.body.message, 'Invalid email or password.')
})

test('login succeeds with valid credentials', async () => {
  const { payload } = await createUserAgent()

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: payload.email, password: payload.password })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.user.email, payload.email)
})

test('protected routes reject requests without a session', async () => {
  const response = await request(app).get('/api/users/me')

  assert.equal(response.status, 401)
  assert.match(response.body.message, /Not authenticated/)
})

test('a logged-in user can read and update their profile preferences', async () => {
  const { agent } = await createUserAgent()

  const profile = await agent.get('/api/users/me')
  assert.equal(profile.status, 200)

  const updated = await agent
    .patch('/api/users/me')
    .send({ preferences: { weeklyGoalMinutes: 900 } })

  assert.equal(updated.status, 200)
  assert.equal(updated.body.data.user.preferences.weeklyGoalMinutes, 900)
})

test('profile validation rejects a weekly goal below one hour', async () => {
  const { agent } = await createUserAgent()

  const response = await agent
    .patch('/api/users/me')
    .send({ preferences: { weeklyGoalMinutes: 30 } })

  assert.equal(response.status, 400)
  assert.match(response.body.message, /at least 1 hour/)
})

test('MongoDB operator payloads are stripped before validation', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: { $gt: '' }, password: 'anything' })

  assert.equal(response.status, 400)
  assert.match(response.body.message, /valid email/)
})

test('logout clears the session cookie and the user becomes anonymous', async () => {
  const { agent } = await createUserAgent()

  const logout = await agent.post('/api/auth/logout')
  assert.equal(logout.status, 200)

  const clearedCookie = logout.headers['set-cookie']?.[0] || ''
  assert.match(clearedCookie, /taskflow_token=;/)
  assert.match(clearedCookie, /SameSite=Lax/i)

  const profile = await agent.get('/api/users/me')
  assert.equal(profile.status, 401)
})
