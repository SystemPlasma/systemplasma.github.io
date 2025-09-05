import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Ensure correct asset paths on GitHub Pages
  base: '/wkw-deckbuilder/',
});

