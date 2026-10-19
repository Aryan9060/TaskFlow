import api from './api.js'

// Sends registration details and returns the new user profile.
export async function registerUser(formData) {
  const response = await api.post('/auth/register', formData)
  return response.data
}

// Exchanges email/password for a session cookie and returns the profile.
export async function loginUser(credentials) {
  const response = await api.post('/auth/login', credentials)
  return response.data
}

// Asks the server to expire the session cookie.
export async function logoutUser() {
  const response = await api.post('/auth/logout')
  return response.data
}

// Restores the current user from the httpOnly cookie on page load.
export async function getMe() {
  const response = await api.get('/users/me')
  return response.data
}

// Updates the signed-in user's profile and preferences.
export async function updateMe(payload) {
  const response = await api.patch('/users/me', payload)
  return response.data
}
