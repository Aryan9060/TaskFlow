import api from './api.js'

// Fetches the most recent study sessions.
export async function getSessions() {
  const response = await api.get('/sessions')
  return response.data
}

// Fetches today/week minute totals for the timer header.
export async function getSessionStats() {
  const response = await api.get('/sessions/stats')
  return response.data
}

// Saves a finished study block.
export async function createSession(payload) {
  const response = await api.post('/sessions', payload)
  return response.data
}
