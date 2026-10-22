import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
