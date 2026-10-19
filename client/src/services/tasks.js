import api from './api.js'

// Fetches tasks/assignments with optional search, filter and sort params.
export async function getTasks(params = {}) {
  const response = await api.get('/tasks', { params })
  return response.data
}

// Creates a task or assignment.
export async function createTask(payload) {
  const response = await api.post('/tasks', payload)
  return response.data
}

// Updates any task fields (including status for complete toggles).
export async function updateTask(id, payload) {
  const response = await api.patch(`/tasks/${id}`, payload)
  return response.data
}

// Deletes a task after the user confirms.
export async function deleteTask(id) {
  const response = await api.delete(`/tasks/${id}`)
  return response.data
}
