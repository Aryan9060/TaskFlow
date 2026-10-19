import api from './api.js'

// Downloads a protected CSV through Axios (so the session cookie is sent),
// then turns the blob into a temporary object URL for the browser.
export async function downloadCsv(path, filename) {
  const response = await api.get(path, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
