import api from './api.js'

// Fetches lifetime counters and the derived achievement badges.
export async function getAchievements() {
  const response = await api.get('/achievements')
  return response.data
}
