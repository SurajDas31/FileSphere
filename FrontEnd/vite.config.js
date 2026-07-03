import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
    exclude: ['canvas']
  },
  build: {
    target: 'esnext'
  },
  worker: {
    format: 'es'
  },
  server: {
    proxy: {
      '/api/proxy': {
        target: 'https://raw.githubusercontent.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy/, ''),
        secure: false,
      },
      '/api/auth': {
        target: 'http://localhost:7000',
        changeOrigin: true,
      },
      '/oauth2': {
        target: 'http://localhost:7000',
        changeOrigin: true,
      },
      '/login/oauth2': {
        target: 'http://localhost:7000',
        changeOrigin: true,
      },
      // Proxy all other /api calls to the Go backend
      '/api': {
        target: 'http://localhost:7000',
        changeOrigin: true,
      }
    }
  }
})
