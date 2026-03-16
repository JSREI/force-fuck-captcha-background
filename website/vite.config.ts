import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages deploys under /<repo>/, local dev stays at /
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
});
