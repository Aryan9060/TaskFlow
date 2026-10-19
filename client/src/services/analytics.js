import api from './api.js'

// Fetches every derived metric for the Analytics page in one request.
export async function getAnalyticsSummary() {
  const response = await api.get('/analytics/summary')
  return response.data
}
