import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Build for original working path
  base: '/wkw-deckbuilder/',
  build: { sourcemap: false }
})
