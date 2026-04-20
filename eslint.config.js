import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    ignores: [
      'dist/',
      'node_modules/',
      '.aws-sam/',
      'assets/js/',
      'archive/',
      'src/tiptap-notes.js',
      // One-off admin/analysis scripts stay out of lint. Production-critical
      // scripts (cache-thumbnails, export-map-data, migrate, seed, backup-db,
      // ensure-map-data, compute-positions) are linted via the scripts/ block
      // below — those run in deploy or handle prod data.
      'scripts/add-party-affiliations.js',
      'scripts/analyze-*.js',
      'scripts/apply-importance.cjs',
      'scripts/check-*.js',
      'scripts/cleanup-*.js',
      'scripts/compare-databases.cjs',
      'scripts/create-*.js',
      'scripts/dedupe-*.js',
      'scripts/deep-quality-review.js',
      'scripts/diagnose-*.js',
      'scripts/discover-*.js',
      'scripts/enrich-*.js',
      'scripts/export.js',
      'scripts/export-edge-review.js',
      'scripts/fill-gaps.js',
      'scripts/fix-*.js',
      'scripts/import-*.js',
      'scripts/inspect-*.js',
      'scripts/list-*.js',
      'scripts/merge-*.js',
      'scripts/migrate-staging-to-production.cjs',
      'scripts/migrate-to-rds-new-schema.js',
      'scripts/patch-*.js',
      'scripts/preview-*.js',
      'scripts/prune-*.js',
      'scripts/report-*.js',
      'scripts/reset-*.js',
      'scripts/review-*.js',
      'scripts/run-*.js',
      'scripts/seed-*.js',
      'scripts/setup-hierarchy.js',
      'scripts/verify-*.cjs',
    ],
  },
  {
    languageOptions: {
      globals: {
        // Browser globals
        document: 'readonly',
        window: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        IntersectionObserver: 'readonly',
        MutationObserver: 'readonly',
        Event: 'readonly',
        Node: 'readonly',
        NodeList: 'readonly',
        Element: 'readonly',
        DOMRect: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
        confirm: 'readonly',
        AbortSignal: 'readonly',
        AbortController: 'readonly',
        // D3 loaded via CDN
        d3: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Lambda handlers under `api/` run on Node, not the browser. `process` +
  // `Buffer` are ambient globals there. Also: `console.log` is the standard
  // CloudWatch logging path, so we drop the `no-console` restriction.
  {
    files: ['api/**/*.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Node-run scripts: prod globals, console allowed. Placed after the browser
    // globals block so its `no-console: off` override actually wins — flat
    // config applies later blocks over earlier ones for matching files.
    files: ['scripts/**/*.{js,cjs,ts}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
)
