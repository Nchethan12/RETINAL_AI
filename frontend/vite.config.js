import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/analyze': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/analyze-selfie': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/sample-cases': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})

