import api from './api.js'

// Fetches the user's subjects; pass true to include archived ones.
export async function getSubjects(includeArchived = false) {
  const response = await api.get('/subjects', { params: includeArchived ? { includeArchived: 'true' } : {} })
  return response.data
}

// Creates a new subject.
export async function createSubject(payload) {
  const response = await api.post('/subjects', payload)
  return response.data
}

// Edits a subject (fields or archived flag).
export async function updateSubject(id, payload) {
  const response = await api.patch(`/subjects/${id}`, payload)
  return response.data
}

// Deletes a subject (the server rejects deletes with linked tasks).
export async function deleteSubject(id) {
  const response = await api.delete(`/subjects/${id}`)
  return response.data
}
