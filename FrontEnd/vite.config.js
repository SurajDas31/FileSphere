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
      // Create a proxy for external file fetching to bypass CORS
      '/api/proxy': {
        target: 'https://raw.githubusercontent.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy/, ''),
        secure: false,
      }
    }
  }
})
