import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ponytail: default outDir = frontend/dist, Vercel finds it via outputDirectory in vercel.json
  server: { proxy: { '/invoices': 'http://localhost:3000', '/users': 'http://localhost:3000', '/buyers': 'http://localhost:3000', '/notifications': 'http://localhost:3000', '/system': 'http://localhost:3000', '/health': 'http://localhost:3000' } },
})
