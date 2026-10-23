import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

import { libraryPlugin } from './server/library.ts'

// https://vite.dev/config/
export default defineConfig({
  // The library's .md files live in ./library (see server/library.ts).
  plugins: [react(), libraryPlugin(fileURLToPath(new URL('./library', import.meta.url)))],
  server: {
    proxy: {
      // Local models: the browser talks to /ollama, Vite forwards to Ollama,
      // so there's no CORS setup. Set OLLAMA_URL if it runs elsewhere.
      '/ollama': {
        target: process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
    },
  },
})
