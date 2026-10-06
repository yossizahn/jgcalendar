import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Served from https://yossizahn.github.io/jgcalendar/ (override with BASE_PATH for other hosts).
  base: command === "build" ? (process.env.BASE_PATH ?? "/jgcalendar/") : "/",
  plugins: [react(), tailwindcss()],
  // ~200 kB gzipped, mostly react-dom + Base UI; not worth splitting for a single-page tool.
  build: { chunkSizeWarningLimit: 700 },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
}))
