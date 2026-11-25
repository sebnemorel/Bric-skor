import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages'te yayınlarken base'i repo adına göre ayarla: '/bric-skor/'
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
})
