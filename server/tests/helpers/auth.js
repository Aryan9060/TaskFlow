import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { app } from '../helpers/testDb.js'

// Registers a unique user and returns a supertest agent that keeps the
// session cookie for every following request.
export async function createUserAgent(overrides = {}) {
  const agent = request.agent(app)
  const payload = {
    name: 'Test Student',
    email: `student-${randomUUID()}@test.local`,
    password: 'Password123',
    ...overrides,
  }

  const response = await agent.post('/api/auth/register').send(payload)
  return { agent, payload, response, user: response.body.data?.user }
}
