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
      'assets/**', // legacy vanilla JS used by index.html
      'backups/**', // one-off migration/backup scripts
    ],
  },

  // 2. Baseline recommended JS rules. Applies everywhere the config reaches.
  js.configs.recommended,

  // 3. TypeScript + React rules for src/.
  //
  // Rule-set choice: `recommended` + `stylistic` (not `recommendedTypeChecked`).
  // The type-checked preset's `no-unsafe-*` family flags every `any` that
  // propagates through the React/TipTap/DOM-API layer — over a thousand
  // findings in this codebase, most of them acknowledging genuine `any`
  // boundaries we'd need to refactor with runtime validators to close
  // properly. Rather than suppress them en masse, we keep the check off and
  // add targeted type-aware rules that catch the highest-value bugs
  // (forgotten awaits, promises in event handlers). `no-explicit-any`
  // remains on to discourage _new_ explicit `any` — use `unknown` + narrow.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended, ...tseslint.configs.stylistic],
    languageOptions: {
      parserOptions: {
        // TypeScript's project service picks up tsconfig.json automatically
        // and avoids per-file `parserOptions.project` plumbing.
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

      // TypeScript's compiler checks for undefined identifiers — ESLint's
      // `no-undef` just double-flags the same thing and needs a globals list
      // to stop shouting at `document`, `fetch`, etc.
      'no-undef': 'off',

      // Allow underscored unused bindings. `_foo` is our convention for
      // parameters that a signature requires but the body doesn't use.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      // Targeted type-aware rules — these catch real bugs rather than
      // broad `any` noise, and they're cheap to keep clean going forward.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-for-in-array': 'error',

      // React-idiomatic: `() => {}` is the standard default for optional
      // callback props. Explicitly allow arrow + function forms.
      '@typescript-eslint/no-empty-function': [
        'error',
        { allow: ['arrowFunctions', 'functions', 'methods'] },
      ],

      // Style nudges — warn, don't block. Convert `||` to `??` opportunistically.
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',

      // Accessibility — rules stay ON but report as warnings for now.
      // The contribute forms, admin panel, and a few map controls were built
      // without programmatic label/control association or keyboard handlers
      // on div-with-onClick patterns. Fixing them properly wants a shared
      // <FormField> component and a pass over the interactive divs — that
      // refactor lands in a follow-up PR so this tooling PR stays focused.
      // Warnings are counted in CI output so the ratchet is visible.
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/interactive-supports-focus': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/no-autofocus': 'warn',
    },
  },

  // 4. Prettier compatibility — disables stylistic ESLint rules that fight
  //    Prettier. Must be last so it wins conflicts.
  prettier,
)
