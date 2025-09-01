import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use leading and trailing slashes for correct asset paths on GitHub Pages
  base: "/wkw-deckbuilder/"
})
