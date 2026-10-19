import axios from 'axios'

// Relative baseURL + the Vite dev proxy (see vite.config.js) keeps
// dev requests same-origin and CORS-free.
// withCredentials sends the HTTP-only session cookie with every request.
const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
  withCredentials: true,
})

// Fetches the API health payload (server + database status).
export async function getHealth() {
  const response = await api.get('/health')
  return response.data
}

export default api
