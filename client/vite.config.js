import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The proxy forwards /api calls from the Vite dev server to Express,
// so the frontend can use relative URLs like /api/health with no CORS issues.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
