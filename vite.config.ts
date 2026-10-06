import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(() => ({
  // Relative asset URLs: the same build works at a custom domain's root and under
  // https://yossizahn.github.io/jgcalendar/ (no client-side routing, so this is safe).
  base: "./",
  plugins: [react(), tailwindcss()],
  // ~200 kB gzipped, mostly react-dom + Base UI; not worth splitting for a single-page tool.
  build: { chunkSizeWarningLimit: 700 },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
}))
