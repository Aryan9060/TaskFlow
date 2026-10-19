import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { app } from '../helpers/testDb.js'

// This file intentionally runs real requests against the login endpoint.
// Invalid bodies fail validation before any database lookup, so no DB is needed.
test('authentication endpoints rate limit repeated attempts', async () => {
  let lastResponse

  for (let attempt = 0; attempt < 31; attempt += 1) {
    lastResponse = await request(app).post('/api/auth/login').send({})
  }

  assert.equal(lastResponse.status, 429)
  assert.match(lastResponse.body.message, /Too many attempts/)
})
