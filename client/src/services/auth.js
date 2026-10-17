import api from './api.js'

export async function registerUser(formData) {
  const response = await api.post('/auth/register', formData)
  return response.data
}

export async function loginUser(credentials) {
  const response = await api.post('/auth/login', credentials)
  return response.data
}

export async function logoutUser() {
  const response = await api.post('/auth/logout')
  return response.data
}

export async function getMe() {
  const response = await api.get('/users/me')
  return response.data
}

export async function updateMe(payload) {
  const response = await api.patch('/users/me', payload)
  return response.data
}
