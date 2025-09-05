import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deploys to GitHub Pages at https://systemplasma.github.io/wkw-deckbuilder/
// Base must match the repo name to fix asset paths in production.
export default defineConfig({
  plugins: [react()],
  base: '/wkw-deckbuilder/',
});

