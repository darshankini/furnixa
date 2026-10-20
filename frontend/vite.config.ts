import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()],
  server: {
    proxy: {
      // Browser calls /api/... on :5173, Vite forwards them to NestJS on :3000
      '/api': 'http://localhost:3000',
    },
  },
})
