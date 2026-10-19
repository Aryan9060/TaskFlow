import api from './api.js'

// Fetches exams; pass true to include only today onwards.
export async function getExams(upcomingOnly = false) {
  const response = await api.get('/exams', {
    params: upcomingOnly ? { upcoming: 'true' } : {},
  })
  return response.data
}

// Schedules a new exam.
export async function createExam(payload) {
  const response = await api.post('/exams', payload)
  return response.data
}

// Edits an exam.
export async function updateExam(id, payload) {
  const response = await api.patch(`/exams/${id}`, payload)
  return response.data
}

// Deletes an exam after confirmation.
export async function deleteExam(id) {
  const response = await api.delete(`/exams/${id}`)
  return response.data
}
