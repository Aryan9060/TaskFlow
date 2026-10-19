import api from './api.js'

// Fetches the dashboard summary (stats, weekly series, exams, sessions).
export async function getDashboard() {
  const response = await api.get('/dashboard/summary')
  return response.data
}
