import api from './api.js'

// Fetches open work due soon and exams approaching this week.
export async function getReminders() {
  const response = await api.get('/reminders')
  return response.data
}
