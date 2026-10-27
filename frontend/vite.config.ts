import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base so the static build also opens from a USB stick or file share at the viva.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
