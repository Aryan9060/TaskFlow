import axios from 'axios'

// VITE_API_URL points production builds at the deployed API. In development
// it stays empty and requests go through Vite's /api proxy (see vite.config.js).
// withCredentials sends the HTTP-only session cookie with every request.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  withCredentials: true,
})

// Fetches the API health payload (server + database status).
export async function getHealth() {
  const response = await api.get('/health')
  return response.data
}

export default api
