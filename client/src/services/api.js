import axios from 'axios'

// Relative baseURL + the Vite dev proxy (see vite.config.js) keeps
// dev requests same-origin and CORS-free.
const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
})

export async function getHealth() {
  const response = await api.get('/health')
  return response.data
}
