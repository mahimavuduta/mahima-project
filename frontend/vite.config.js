import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/predict': 'http://localhost:8000',
      '/reverse': 'http://localhost:8000',
      '/scenario': 'http://localhost:8000',
      '/memory':   'http://localhost:8000',
      '/history':  'http://localhost:8000',
      '/auth':     'http://localhost:8000',
      '/chat':     'http://localhost:8000',
    },
  },
})
