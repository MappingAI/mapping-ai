/// <reference types="vitest" />
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

function mapSlugRewrite(): Plugin {
  return {
    name: 'map-slug-rewrite',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url && /^\/map\/(person|org|resource|edge|belief)\//.test(req.url)) {
          req.url = '/map.html'
        }
        next()
      })
    },
  }
}

// Injects <link rel="modulepreload"> for engine.js into map.html at build time.
// engine.js is the largest chunk on the critical render path but is dynamically
// imported, so Vite doesn't auto-preload it. Without this, it can't start
// downloading until React mounts and the useEffect fires (~350ms into page load).
function preloadMapEngine(): Plugin {
  return {
    name: 'preload-map-engine',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler(html: string, ctx: any) {
        if (!ctx.filename?.includes('map.html') || !ctx.bundle) return html
        const entry = Object.entries(ctx.bundle).find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ([fileName, chunk]: [string, any]) =>
            chunk.type === 'chunk' && chunk.name === 'engine' && fileName.endsWith('.js'),
        )
        if (!entry) return html
        const [fileName] = entry
        return html.replace('</head>', `  <link rel="modulepreload" crossorigin href="/${fileName}">\n  </head>`)
      },
    },
  }
}

export default defineConfig({
  appType: 'mpa',
  plugins: [mapSlugRewrite(), preloadMapEngine(), tailwindcss(), react()],
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
        mappingParty: resolve(__dirname, 'workshop/mapping-party.html'),
        guide: resolve(__dirname, 'guide.html'),
        insights: resolve(__dirname, 'insights.html'),
        methodology: resolve(__dirname, 'methodology.html'),
        verify: resolve(__dirname, 'verify.html'),
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
      '/data': {
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
