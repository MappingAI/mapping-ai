// ESLint 9 flat config for Mapping AI.
//
// Scope today: src/**/*.{ts,tsx} only. api/, scripts/, and dev-server.js are
// still JavaScript and are ignored here. A later PR migrates them to TypeScript
// and folds them into this config.
//
// Layout:
//   1. Global ignores (generated + vendored files)
//   2. Baseline JS recommended rules
//   3. Type-aware TS + React rules for src/
//   4. Prettier compatibility layer (MUST BE LAST)
//
// Prettier owns whitespace, line length, quote style, trailing commas, etc.
// ESLint rules that overlap with Prettier are disabled via eslint-config-prettier.

import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettier from 'eslint-config-prettier'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default tseslint.config(
  // 1. Global ignores.
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.aws-sam/**',
      'coverage/**',
      // Generated bundle served as an asset; source is src/tiptap-notes.js.
      'assets/js/tiptap-notes.js',
      // Generated data artifacts.
      'map-data.json',
      'map-detail.json',
      'backup-*.json',
      'backup-*.sql',
      // Archived one-off enrichment scripts: out of the TS/lint scope.
      'scripts/archive/**',
      // Still JavaScript. Moves under linting when the TS migration lands.
      'api/**',
      'scripts/**',
      'dev-server.js',
      'test-handlers.mjs',
    ],
  },

  // 2. Baseline recommended JS rules. Applies everywhere the config reaches.
  js.configs.recommended,

  // 3. Type-aware TypeScript + React rules for src/.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        // Uses TypeScript's project service — picks up tsconfig.json automatically
        // and avoids the per-file "parserOptions.project" plumbing.
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,

      // Allow underscored unused bindings. We use `_foo` when a parameter or
      // binding is required by a signature but intentionally unused (common
      // in destructured props and event handlers).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },

  // 4. Prettier compatibility — disables stylistic ESLint rules that fight
  //    Prettier. Must be last so it wins conflicts.
  prettier,
)
