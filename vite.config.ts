import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  appType: 'mpa',
  plugins: [tailwindcss(), react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        contribute: resolve(__dirname, 'contribute.html'),
        map: resolve(__dirname, 'map.html'),
        about: resolve(__dirname, 'about.html'),
        admin: resolve(__dirname, 'admin.html'),
        theoryofchange: resolve(__dirname, 'theoryofchange.html'),
        workshop: resolve(__dirname, 'workshop/index.html'),
        workshopSlides: resolve(__dirname, 'workshop/slides.html'),
        insights: resolve(__dirname, 'insights.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Fallback for local/preview dev that doesn't generate map-data.json:
      // pull the canonical copy from production so the map renders.
      '/map-data.json': {
        target: 'https://mapping-ai.org',
        changeOrigin: true,
      },
      '/map-detail.json': {
        target: 'https://mapping-ai.org',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['.aws-sam/**', 'node_modules/**'],
  },
})
