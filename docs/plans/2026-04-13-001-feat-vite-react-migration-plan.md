---
title: "feat: Migrate to Vite + React — Phase 1: Contribute Form"
type: feat
status: active
date: 2026-04-13
deepened: 2026-04-13
---

# feat: Migrate to Vite + React — Phase 1: Contribute Form

## Overview

Migrate the mapping-ai frontend from static HTML/CSS/JS to Vite + React + TypeScript, starting with the contribute form. The migration is modular — one page at a time — with the existing site fully functional at every intermediate step. This plan covers the build infrastructure (all pages) and the first page migration (contribute.html). Map, admin, and other pages are future phases.

## Problem Frame

The site has no frontend framework. All 6 pages use inline `<style>` and `<script>` blocks with no component boundaries, no type safety, and no shared abstractions. contribute.html alone is 4,036 lines with 2,295 lines of imperative JS, 1,022 lines of CSS, and 132+ event listeners. Common patterns (navigation, dropdowns, tag inputs, search) are copy-pasted and diverge between pages. This makes every change risky and slow.

A React migration enables: component reuse, type safety, declarative state management, a modern build pipeline with HMR, and preview deployments for safe testing.

## Requirements Trace

- R1. Vite MPA build tool wrapping all existing HTML pages — zero behavioral change on non-migrated pages
- R2. TypeScript from day one with typed API responses and component props
- R3. Tailwind CSS v4 for styling migrated components
- R4. TanStack Query for all server-state (search, submit, entity cache)
- R5. React Hook Form for form field state, validation, and submission
- R6. contribute.html fully migrated to React components
- R7. CI/CD updated: Vite build → `dist/` → S3 sync, with per-PR preview URLs
- R8. Password gate preserved as React component
- R9. iframe compatibility (map.html embeds contribute.html)
- R10. Auto-save/restore parity with current behavior (improved: include tag state)
- R11. No regression on non-migrated pages (map, admin, about, index, theoryofchange, workshop)
- R12. "How it works" onboarding overlay preserved with iframe-conditional behavior
- R13. Cross-form navigation (author/org "edit" links switching tabs + entering update mode) preserved

## Scope Boundaries

- **In scope:** Vite setup (all pages), Tailwind config, CI/CD preview deploys, contribute.html full React migration
- **Out of scope:** map.html migration (Phase 2 — D3 is the hardest target, migrate last), admin.html migration (Phase 3), TanStack Router (deferred until 4+ pages are React), about/index/workshop migration (trivial, Phase 4)
- **Out of scope:** Backend changes — Lambda functions, API Gateway, database schema unchanged
- **Explicit non-goal:** Converting map.html's 4,378-line D3 visualization. It continues loading D3 synchronously from CDN with its inline script block untouched.

## Context & Research

### Relevant Code and Patterns

- `contribute.html` — 4,036 lines, monolithic. 47-48 natural React components identified. 4 custom dropdown patterns, 3 TipTap instances, 6 API endpoints, 7 localStorage interactions.
- `src/tiptap-notes.js` (468 lines) — Already modular ES module, bundled via esbuild to IIFE. Exposes `window.initTipTapEditors`. Will become `@tiptap/react` `useEditor` hook.
- `map.html` — 5,743 lines, 4,378 lines of inline D3 JS. **Not migrated in this phase.** D3 loaded synchronously (line 28), inline script depends on global `d3`. Embeds contribute.html in iframe.
- `.github/workflows/deploy.yml` — Current pipeline: npm ci → build:tiptap → export-map-data → sed injections → S3 sync from repo root → CloudFront invalidation.
- `api/export-map.js` (`toFrontendShape()`) — Critical field mapping layer: DB columns → frontend names (e.g., `belief_regulatory_stance` → `regulatory_stance`, `belief_ai_risk` → `ai_risk_level`). TypeScript types must mirror this mapping.
- `template.yaml` — CORS config already includes `localhost:5173` (Vite's default port).

### Institutional Learnings

- **D3 defer outage (P0, 2026-04-09):** Adding `defer` to D3 script broke the entire map. Inline scripts depend on synchronous D3 loading. This constraint only applies while map.html uses inline scripts — irrelevant to contribute.html migration, but map.html must remain untouched.
- **TipTap idempotent init:** `initTipTapEditors()` must guard with `container._editor` check. In React, each TipTap instance is its own component with `useEditor()` — eliminates this problem.
- **MutationObserver loops:** The inline org panel uses MutationObserver on search result divs to inject "Add new org" options. This is incompatible with React's virtual DOM (fires on every re-render). Must be replaced with declarative rendering.
- **Client-side search is fast path:** Entity cache from `map-data.json` searched in-memory (80ms debounce). API search (150ms debounce) is only for pending entities. Do not replace local search with API calls.
- **Auto-save does not persist tag state:** Existing bug — affiliated orgs, locations, authors tags are lost on page reload. Fix during migration.

### External References

- Vite MPA mode: `appType: 'mpa'` with `rollupOptions.input` listing each HTML entry
- TanStack Query v5: single-object parameter API, `isPending` (not `isLoading`), React 18+ required
- `@tiptap/react` v3: `useEditor` hook, `EditorContent` component, `shouldRerenderOnTransaction` defaults false (use `useEditorState` for toolbar state)
- BubbleMenu/FloatingMenu moved to `@tiptap/react/menus` in v3 (requires `@floating-ui/dom`)
- Tailwind CSS v4: CSS-first config, `@import "tailwindcss"` in CSS entry
- Preview deploys: S3 path-prefix per PR (`preview/pr-{number}/`), single CloudFront distribution

## Key Technical Decisions

- **Vite MPA mode, not SPA:** Each page remains a separate HTML entry. Pages are fundamentally different apps (D3 map, rich form, admin dashboard) with minimal shared navigation state. SPA routing adds complexity with no benefit at this stage. TanStack Router deferred to Phase 4 when 4+ pages are React.

- **React islands per page, not full-app conversion:** Each page gets its own React root (`<div id="contribute-root">` + `<script type="module">`). Non-migrated pages keep their inline scripts untouched. Vite serves them as-is in dev and builds them as-is in production.

- **Tailwind CSS v4 over CSS Modules:** User preference. Higher upfront effort (rewriting 1,022 lines of inline CSS as utility classes) but faster iteration for new components and consistent design tokens. Tailwind's JIT compiler integrates natively with Vite. **Critical coexistence constraint:** Tailwind's preflight CSS normalizes margins, headings, lists, and links — which the existing inline CSS explicitly styles. During the coexistence period (Units 5-16), `preflight: false` in Tailwind config or `@layer`-scoped preflight. Enable full preflight only at Unit 17 cutover when inline CSS is removed.

- **React Hook Form + TanStack Query (not TanStack Form):** RHF has deeper ecosystem support for the complex patterns needed: `Controller` for custom selects/tag inputs, `useFieldArray` for dynamic fields, mature validation. TanStack Query handles server state (search, submit, entity cache). Clean separation of concerns.

- **Inline org panel as React portal (not route):** The panel is a form-within-a-form that communicates back to the parent via callbacks. A portal renders it at DOM root level (for `position: fixed`) while keeping it in the React component tree. This preserves iframe compatibility — the panel stays within the iframe viewport.

- **`updateEntityId` scoped per form type with cross-form navigation:** Currently a global variable shared across all 3 forms. In React, each form type maintains its own update context. Switching tabs preserves update state (improvement over current behavior where it's lost on tab switch). Cross-form "edit" links (e.g., resource form author "edit" → person tab) are supported via a `switchToFormInUpdateMode(formType, entityData)` callback on `ContributeForm` that sets the target tab, calls `reset()` with prefilled data, and sets `updateEntityId` on the target form's `useForm` instance.

- **Tab switching uses `display:none`, not conditional rendering:** All 3 form components stay mounted (hidden via CSS). Conditional rendering would destroy TipTap editor instances on tab switch, losing cursor position, undo history, and open dropdown states. The re-render cost of 3 forms is negligible. `useForm` instances persist across tab switches since the components never unmount.

- **Two-tier search modeled as `useMemo` + `useQuery`:** Local cache search via `useMemo` (synchronous, instant). Pending entity search via `useQuery` with debounced query key. Merged in component. This preserves the current UX where local results appear instantly and pending results append asynchronously.

- **`sed` injection: dual mechanism during migration (explicit tech debt):** React-migrated pages (contribute.html) use `import.meta.env.VITE_*` for password hash and analytics token. Non-migrated pages (map.html, admin.html, etc.) still use `sed` replacement on the `dist/` output — Vite MPA mode passes through inline scripts in non-migrated HTML without transformation, preserving `__SITE_PASSWORD_HASH__` and `__CF_ANALYTICS_TOKEN__` placeholders. This dual mechanism is tech debt to retire in Phase 4 when all pages are migrated. Must verify Vite does not mangle placeholder strings in non-migrated inline scripts.

- **`useEntityCache` fetches `map-data.json` and `map-detail.json` independently:** Two separate TanStack Query hooks, both with `staleTime: Infinity`. `map-detail.json` failure does not block `map-data.json` — entity search works with degraded detail (no notes, no social handles) rather than failing entirely. This matches current behavior where `map-detail.json` fetch uses `.catch(() => ({}))`.

- **`map-data.json` and `map-detail.json` stay outside Vite build graph:** Generated by `export-map-data.js` during CI, copied to `dist/` as a post-build step. They change independently of code deploys (admin approvals trigger refresh). Managed by TanStack Query with `staleTime: Infinity` in the contribute form.

- **Delegate pure component builds to Codex:** CustomSelect, TagInput, search components, and CI/CD workflow files are well-scoped, independently testable units ideal for external delegation. Core form logic, state management, and integration work stays in primary context.

- **Branching strategy: single feature branch, no incremental merges to main.** The entire migration (Phase 0 through Phase 3, Units 1-17) happens on a `feat/react-contribute` branch. Nothing merges to main until the full migration is complete and thoroughly tested. Preview deploys provide testing URLs. Merge `main` into the feature branch periodically to stay current. This eliminates all coexistence risks (dual auto-save, sed timing, password gate overlap) since production never sees an intermediate state. The single merge to main is the cutover.

- **Local development: Vite dev server + Express API server.** Vite replaces `npx serve .` for static file serving with HMR. The existing `dev-server.js` continues running on port 3000 for local API endpoints (submit, search, admin). Vite's proxy forwards `/api/*` to `localhost:3000`. Developers run both: `npm run dev` (Vite on 5173) + `node dev-server.js` (Express on 3000). Document this in README or DEPLOYMENT.md.

- **CustomSelect mutual exclusion via shared context.** A `DropdownContext` in `ContributeForm` tracks which dropdown ID is currently open. Opening any `CustomSelect` or search dropdown closes all others. Each dropdown registers/unregisters with the context. This replaces the current document-level click handler approach.

- **Org creation panel inception guard.** `OrgSearch` and `TagInput` accept an `allowOrgCreation` prop (default `true`, set to `false` inside `OrgCreationPanel`). Prevents recursive panel opening.

- **iframe detection via module constant.** `src/lib/iframe.ts` exports `IS_IFRAME = window !== window.top` — a constant that never changes after page load. No React context needed (context is for dynamic state that triggers re-renders). Components import and use directly to: hide "See Map" button, suppress "How it works" overlay on first visit, set link targets to `_top` where needed.

## Open Questions

### Resolved During Planning

- **Q: Should we use TanStack Router now?** No. Pages are too different. Defer to Phase 4 after 4+ pages are React. Navigation between pages uses regular `<a>` tags.
- **Q: How to handle D3 synchronous loading?** map.html is not migrated in this phase. It keeps its synchronous D3 CDN script tag. Vite serves it as static HTML unchanged.
- **Q: Replace esbuild for TipTap?** Yes, but not immediately. During the coexistence period (Units 5-16), the old inline script still loads `assets/js/tiptap-notes.js` via `<script>` tag. The `build:tiptap` esbuild step must remain in the deploy workflow alongside `vite build` until Unit 17 cutover removes the inline script. At cutover, `build:tiptap` is removed and TipTap is imported as a React component.
- **Q: Conditional rendering or display:none for tab switching?** `display:none`. Conditional rendering destroys TipTap editor instances on tab switch (cursor position, undo history, open dropdowns all lost). All 3 forms stay mounted, hidden via CSS. Re-render cost is negligible.
- **Q: How should cross-form "edit" links work?** `ContributeForm` exposes `switchToFormInUpdateMode(formType, entityData)` that sets the target tab active, calls `reset()` on the target form's `useForm`, and sets its `updateEntityId`. Resource form author "edit" and org "edit" links call this.
- **Q: How to handle `map-detail.json` failure?** Fetch independently from `map-data.json` as a separate TanStack Query. Detail failure degrades gracefully (no notes/social data) without blocking entity search.
- **Q: Should the password gate brute-force protection be ported?** Yes. Port the 5-attempt limit, 30-second lockout, and sessionStorage tracking into `usePasswordGate.ts`.
- **Q: What about the `assets/css/styles.css` and `assets/js/script.js`?** Legacy files from an earlier version. Neither is referenced by current pages. Ignore during migration, clean up later.
- **Q: Should checkbox `disabled` change to avoid RHF exclusion?** Yes. React Hook Form excludes disabled fields from form values. Use a custom validation approach (visual-only disable via Tailwind classes + validation rule) instead of HTML `disabled` attribute.

### Deferred to Implementation

- **Exact Tailwind class mappings for all 1,022 CSS lines** — will be determined component-by-component during implementation.
- **Whether to use Radix Select or build custom for CustomSelect** — evaluate during Unit 8 implementation. Radix adds a dependency but handles accessibility; custom is lighter but more work.
- **TipTap v3 peer dependency resolution** — current `@tiptap/core` is v3.20.5, `@tiptap/react` may pull a different minor version. Pin during `npm install`.
- **Exact behavior of org panel when embedded in iframe** — test during Unit 14. The portal renders at iframe document root, which should be within iframe bounds, but needs empirical verification.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### File Structure

```
mapping-ai/
├── vite.config.ts                   # MPA entries for all 7 pages
├── tsconfig.json                    # Strict TS config
├── tailwind.config.ts               # Design tokens, color mappings
├── postcss.config.js                # Tailwind PostCSS plugin
├── src/
│   ├── styles/
│   │   └── global.css               # Tailwind imports + CSS variable bridge
│   ├── types/
│   │   ├── entity.ts                # Entity, Submission, Edge types (mirrors DB→frontend mapping)
│   │   └── api.ts                   # API request/response types
│   ├── lib/
│   │   ├── api.ts                   # Typed fetch wrapper, API_BASE logic
│   │   ├── search.ts                # Client-side fuzzy search (ported from current JS)
│   │   └── iframe.ts                # IS_IFRAME module constant (window !== window.top)
│   ├── hooks/
│   │   ├── useEntityCache.ts        # TanStack Query: map-data.json + map-detail.json
│   │   ├── useSearch.ts             # Debounced search with local + pending merge
│   │   ├── useSubmitEntity.ts       # TanStack Query mutation for /submit
│   │   ├── useAutoSave.ts           # localStorage persistence (500ms debounce)
│   │   └── usePasswordGate.ts       # SHA-256 check + localStorage unlock
│   ├── contexts/
│   │   └── DropdownContext.tsx       # Mutual exclusion for open dropdowns
│   ├── components/
│   │   ├── Navigation.tsx           # Shared nav bar
│   │   ├── PasswordGate.tsx         # Lock overlay + modal + brute-force protection
│   │   ├── HowItWorks.tsx           # First-visit onboarding overlay
│   │   ├── CustomSelect.tsx         # Searchable color-coded dropdown
│   │   ├── TagInput.tsx             # Generic multi-tag input with pluggable search
│   │   ├── TipTapEditor.tsx         # Rich text with @mentions
│   │   ├── DuplicateDetection.tsx   # Fuzzy match + pending search results
│   │   └── EntityCard.tsx           # Existing entity sidebar card
│   └── contribute/
│       ├── main.tsx                 # React root mount
│       ├── App.tsx                  # QueryClientProvider + PasswordGate wrapper
│       ├── ContributeForm.tsx       # Tab container + shared state
│       ├── PersonForm.tsx           # Person-specific fields
│       ├── OrganizationForm.tsx     # Org-specific fields
│       ├── ResourceForm.tsx         # Resource-specific fields
│       ├── OrgSearch.tsx            # Primary/affiliated/parent org search
│       ├── OrgCreationPanel.tsx     # Slide-in side panel (portal)
│       ├── LocationSearch.tsx       # Photon API multi-city tags
│       ├── BlueskySearch.tsx        # Live API autocomplete
│       ├── TwitterSearch.tsx        # Cache-based autocomplete
│       ├── PillToggle.tsx           # Relationship selector
│       └── SuccessMessage.tsx       # Post-submission feedback
├── contribute.html                  # Slimmed: just <div id="root"> + <script type="module">
├── map.html                         # UNCHANGED — inline D3, synchronous loading
├── index.html                       # UNCHANGED — served by Vite as static HTML
├── about.html                       # UNCHANGED
├── admin.html                       # UNCHANGED
├── theoryofchange.html              # UNCHANGED
└── .github/workflows/
    ├── deploy.yml                   # Updated: vite build → dist/ → S3
    └── preview.yml                  # NEW: per-PR preview deploys
```

### Data Flow (Contribute Form)

```
                     ┌─────────────────────────────┐
                     │     TanStack Query Cache     │
                     │                               │
                     │  useEntityCache (staleTime:∞) │──── map-data.json + map-detail.json
                     │  useSearch (debounced)        │──── GET /search?q=...&status=pending
                     │  useSubmitEntity (mutation)   │──── POST /submit
                     └──────────┬──────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                        │
  ┌─────▼─────┐          ┌─────▼──────┐          ┌─────▼──────┐
  │PersonForm │          │  OrgForm   │          │ResourceForm│
  │(useForm)  │          │ (useForm)  │          │ (useForm)  │
  └─────┬─────┘          └─────┬──────┘          └─────┬──────┘
        │                       │                        │
        ├── CustomSelect ───────┼────────────────────────┤
        ├── TagInput ───────────┼────────────────────────┤
        ├── TipTapEditor ───────┼────────────────────────┤
        ├── DuplicateDetection ─┼────────────────────────┤
        ├── OrgSearch ──────────┤                        │
        │       └── OrgCreationPanel (portal)            │
        ├── LocationSearch ─────┼────────────────────────┤
        └── BlueskySearch ──────┼────────────────────────┘
                                │
                         useAutoSave (localStorage, 500ms)
```

## Implementation Units

### Phase 0: Build Infrastructure

- [ ] **Unit 1: Vite MPA scaffolding + TypeScript**

  **Goal:** Add Vite as the build tool wrapping all existing HTML pages. All pages continue to work identically — zero behavioral change.

  **Requirements:** R1, R2, R11

  **Dependencies:** None

  **Files:**
  - Create: `vite.config.ts`
  - Create: `tsconfig.json`
  - Create: `tsconfig.node.json`
  - Modify: `package.json` (add vite, react, react-dom, @vitejs/plugin-react, typescript, @types/react, @types/react-dom, vitest, @testing-library/react, @testing-library/jest-dom, jsdom; add `dev`, `build`, and `test` scripts; keep `build:tiptap` alongside)
  - Modify: `contribute.html` (add React mount point div alongside existing content, initially hidden)
  - Test: Manual browser verification of all 7 pages via `vite dev`

  **Approach:**
  - Use `appType: 'mpa'` in Vite config with all **7** HTML files as rollup input entries: `index.html`, `contribute.html`, `map.html`, `about.html`, `admin.html`, `theoryofchange.html`, `workshop/index.html`
  - TypeScript strict mode. `tsconfig.json` with `"strict": true`, `"jsx": "react-jsx"`, `"moduleResolution": "bundler"`
  - Existing inline `<style>` and `<script>` blocks in HTML files work as-is under Vite — no changes needed to non-migrated pages. **Verify that Vite does not transform or mangle inline script content** (especially `__SITE_PASSWORD_HASH__` and `__CF_ANALYTICS_TOKEN__` placeholders in non-migrated pages)
  - The `build:tiptap` esbuild script is NOT removed — it stays alongside `vite build` in package.json until Unit 17 cutover. The old IIFE TipTap bundle is still loaded by contribute.html's inline script during the coexistence period.
  - D3 CDN script tag in map.html remains exactly as-is
  - Install Vitest (native Vite test runner) + Testing Library for React component tests. Configure `jsdom` environment.
  - Vite dev server proxy: `/api/*` forwards to `localhost:3000` (Express dev-server.js running separately)

  **Patterns to follow:**
  - Vite MPA config: `build.rollupOptions.input` object with named entries
  - See existing `package.json` for ESM module type (`"type": "module"`)

  **Test scenarios:**
  - Happy path: `vite dev` serves all 7 pages at their current paths; `vite build` outputs to `dist/` with all HTML files and hashed assets
  - Happy path: `npm test` (Vitest) runs and passes with zero tests (framework smoke test)
  - Edge case: `map.html` with synchronous D3 CDN script still works (D3 renders, no `d3 is undefined` errors)
  - Edge case: `contribute.html` TipTap editor still initializes (IIFE bundle loaded via `<script>` tag works under Vite dev server)
  - Edge case: `workshop/index.html` nested path resolves correctly in both dev and build
  - Edge case: `theoryofchange.html` included in build output and loads correctly
  - Edge case: `__SITE_PASSWORD_HASH__` and `__CF_ANALYTICS_TOKEN__` placeholder strings survive Vite build in non-migrated pages (not transformed or tree-shaken)
  - Edge case: CSP compliance — Vite production build's `<script type="module">` tags work under existing CloudFront CSP (`script-src 'self' 'unsafe-inline'`)
  - Integration: Vite proxy config routes `/api/*` to `localhost:3000` for local development with Express dev server

  **Verification:**
  - All 7 pages load and function identically in `vite dev` mode
  - `vite build` produces `dist/` with correct file structure (7 HTML files + hashed assets)
  - `npx serve dist` serves the built site correctly
  - Placeholder strings intact in `dist/map.html` inline scripts (grep test)

---

- [ ] **Unit 2: Tailwind CSS v4 setup**

  **Goal:** Configure Tailwind CSS v4 with design tokens extracted from existing inline CSS variables. Tailwind available for new components but existing pages unchanged.

  **Requirements:** R3

  **Dependencies:** Unit 1

  **Files:**
  - Create: `src/styles/global.css` (Tailwind directives + CSS variable bridge)
  - Create: `tailwind.config.ts` (design tokens: fonts, colors from existing vars + SELECT_COLORS + CATEGORY_COLORS)
  - Create: `postcss.config.js`
  - Modify: `package.json` (add tailwindcss, postcss, autoprefixer)

  **Approach:**
  - Tailwind v4 uses CSS-first config: `@import "tailwindcss"` in the CSS entry
  - Map existing CSS variables to Tailwind theme: `--serif` (EB Garamond) → `fontFamily.serif`, `--mono` (DM Mono) → `fontFamily.mono`, `--accent` → `colors.accent`, etc.
  - Include `SELECT_COLORS` (30+ option-to-hex mappings from contribute.html line 1795) and `CATEGORY_COLORS` (40+ from map.html) as Tailwind color extensions
  - Global CSS imported only by React entry points — non-migrated pages unaffected

  **Execution note:** Execution target: external-delegate

  **Patterns to follow:**
  - Tailwind v4 CSS-first config pattern
  - Existing CSS variable names in contribute.html `:root` block (lines 27-37)

  **Test scenarios:**
  - Happy path: A test React component renders with Tailwind utility classes
  - Edge case: Existing pages with inline CSS are unaffected (no Tailwind class conflicts)
  - Edge case: Custom colors from SELECT_COLORS render correctly (e.g., `bg-category-frontier-lab`)

  **Verification:**
  - Tailwind classes work in a test component
  - Non-migrated pages render identically (no CSS leaks)

---

- [ ] **Unit 3: Update deploy workflow for Vite build**

  **Goal:** Modify the GitHub Actions deploy workflow to build with Vite and sync from `dist/` instead of repo root.

  **Requirements:** R7

  **Dependencies:** Unit 1

  **Files:**
  - Modify: `.github/workflows/deploy.yml`
  - Modify: `.gitignore` (add `.env.*` to prevent accidental commit of `.env.production` containing password hash)

  **Approach:**
  - Add `npm run build` (Vite) as a new step ALONGSIDE `npm run build:tiptap` (esbuild). Both run during CI. The TipTap IIFE bundle is still needed by contribute.html's inline script during the coexistence period (Units 5-16). Remove `build:tiptap` only in Unit 17 cutover.
  - Change S3 sync source from `.` to `dist/`
  - **Step ordering matters:** Write `.env.production` BEFORE `npm run build` (Vite embeds `import.meta.env.VITE_*` at build time). Then run `vite build`. Then run `sed` on `dist/` output. Then S3 sync.
  - Write `.env.production` file in CI step with `VITE_SITE_PASSWORD_HASH` and `VITE_CF_ANALYTICS_TOKEN` for React-migrated pages
  - Keep the `sed` step but run it on `dist/` output using `find dist/ -name '*.html' -exec sed -i ... {} +` (not `dist/*.html`) to catch nested paths like `workshop/index.html`. Target non-migrated pages (map.html, admin.html, theoryofchange.html, etc.) that still use `__SITE_PASSWORD_HASH__` and `__CF_ANALYTICS_TOKEN__` placeholders in inline scripts. **During coexistence (Units 3-16), sed must continue to target `dist/contribute.html` for password hash.** Remove contribute.html from sed only at Unit 17 cutover. This dual mechanism is transitional tech debt.
  - **CSP fix:** Update `template.yaml` SecurityHeadersPolicy to add `https://static.cloudflareinsights.com` to `script-src` (currently missing — analytics beacon is blocked by CSP). Requires `sam deploy`.
  - Copy `map-data.json` and `map-detail.json` into `dist/` after generation (post-build step, before S3 sync)
  - Cache headers: HTML `no-cache`, JSON `max-age=60,stale-while-revalidate=300`, hashed assets `max-age=31536000,immutable`
  - **S3 asset deletion race fix:** Do NOT use `--delete` on the hashed assets sync. Old hashed asset files stay in S3 until a separate cleanup job removes files older than 7 days. This prevents 404s for users with cached HTML pointing to previous build's asset filenames during the brief deploy window.
  - The DB schema smoke test and export-map-data steps remain unchanged

  **Execution note:** Execution target: external-delegate

  **Patterns to follow:**
  - Current `deploy.yml` structure and S3 sync patterns
  - Vite `dist/` output structure

  **Test scenarios:**
  - Happy path: Push to main triggers build → dist/ → S3 → CloudFront invalidation; site loads correctly
  - Edge case: map-data.json and map-detail.json are present in dist/ and accessible at root paths
  - Edge case: Hashed assets (e.g., `assets/contribute-abc123.js`) served with immutable cache headers
  - Error path: Build failure halts the pipeline before S3 sync (no partial deploy)

  **Verification:**
  - Deploy workflow completes successfully
  - All 6 pages load from CloudFront after deploy
  - map-data.json accessible at `https://mapping-ai.org/map-data.json`

---

- [ ] **Unit 4: Preview deploy workflow**

  **Goal:** Add per-PR preview deployments so every PR gets its own URL for testing before merge.

  **Requirements:** R7

  **Dependencies:** Unit 3

  **Files:**
  - Create: `.github/workflows/preview.yml`

  **Approach:**
  - Trigger on `pull_request` events (opened, synchronize, closed)
  - Build with Vite using `base: './'` (relative paths for correct asset resolution under prefix)
  - Deploy to `s3://mapping-ai-website-561047280976/preview/pr-{number}/`
  - Post a comment on the PR with the preview URL: `https://mapping-ai.org/preview/pr-{number}/contribute.html`
  - On PR close: delete the preview prefix from S3
  - Add S3 lifecycle rule on `preview/` prefix to auto-expire objects after 14 days (safety net for abandoned PRs)
  - Skip DB export step for previews — use production map-data.json (fetch from live CDN or hardcode production URL)

  **Execution note:** Execution target: external-delegate

  **Patterns to follow:**
  - S3 path-prefix per PR pattern (proven AWS preview deploy strategy)
  - Current deploy.yml for AWS credential configuration (OIDC or access keys)

  **Test scenarios:**
  - Happy path: Open PR → preview deployed → comment posted with URL → pages load at preview path
  - Happy path: Push new commit to PR → preview updated → new comment or updated comment
  - Happy path: Close PR → preview files deleted from S3
  - Edge case: Preview URL correctly resolves asset paths (CSS/JS) with relative `base: './'`
  - Edge case: API calls from preview use production API Gateway (not proxied)

  **Verification:**
  - PR comment contains working preview URL
  - contribute.html loads and functions at the preview URL
  - map-data.json is accessible (either copied or fetched from production)

---

### Phase 1: Shared Infrastructure

- [ ] **Unit 5: React entry point + providers for contribute.html**

  **Goal:** Mount a React application into contribute.html with TanStack Query and password gate providers. Initially renders a placeholder alongside existing content.

  **Requirements:** R4, R5, R8, R9

  **Dependencies:** Unit 1, Unit 2

  **Files:**
  - Create: `src/contribute/main.tsx`
  - Create: `src/contribute/App.tsx`
  - Create: `src/hooks/usePasswordGate.ts`
  - Create: `src/components/PasswordGate.tsx`
  - Create: `src/components/HowItWorks.tsx`
  - Create: `src/lib/iframe.ts`
  - Modify: `contribute.html` (add `<div id="contribute-root">`, add `<script type="module" src="/src/contribute/main.tsx">`)

  **Approach:**
  - `main.tsx` renders `<App />` into `#contribute-root` via `createRoot`
  - `App.tsx` wraps everything in `QueryClientProvider` + `PasswordGateProvider`
  - `iframe.ts`: module-level constant `IS_IFRAME = window !== window.top`. Components import directly — no provider needed for a value that never changes. Used to: hide "See Map" button, suppress first-visit overlay in iframe, set link `target="_top"` where needed.
  - Password gate: context provider checks `localStorage.getItem('siteUnlocked')`, renders lock overlay if not authenticated. SHA-256 hash comparison against `import.meta.env.VITE_SITE_PASSWORD_HASH` (falls back to dev-mode bypass if not set). **Includes brute-force protection:** 5-attempt limit, 30-second lockout, sessionStorage tracking (ported from current lines 3948-3952).
  - `HowItWorks`: First-visit onboarding overlay explaining how submissions work, weighted belief scores, and privacy policy. Shown when `!localStorage.getItem('contributeInfoDismissed')` AND `!isIframe`. Dismiss sets localStorage flag. Matches current behavior (lines 1070-1081, 1713-1721).
  - During transition: the React root and existing inline scripts coexist. The React tree initially renders a placeholder `<div>Migration in progress</div>` that is `display:none` — proving the mount works without affecting the page. Note: during coexistence (Units 5-16), both old inline password gate and React PasswordGate exist but the React tree is hidden, so only the old gate renders.

  **Patterns to follow:**
  - TanStack Query v5 setup: `new QueryClient()` with `QueryClientProvider`
  - Current password gate logic in contribute.html lines 3923-4023

  **Test scenarios:**
  - Happy path: React mounts successfully alongside existing inline scripts; page functions identically
  - Happy path: Password gate locks the page when `siteUnlocked` is not in localStorage
  - Edge case: Password gate works in iframe-embedded mode (checks within iframe's localStorage context)
  - Edge case: `import.meta.env.VITE_SITE_PASSWORD_HASH` is empty → gate auto-bypasses (dev mode)
  - Error path: React mount failure does not break existing inline form functionality

  **Verification:**
  - React DevTools shows mounted component tree
  - TanStack Query DevTools accessible
  - Page functions identically to current version

---

- [ ] **Unit 6: TypeScript types + API client + TanStack Query hooks**

  **Goal:** Create typed API layer and reusable data-fetching hooks for all server-state needed by the contribute form.

  **Requirements:** R2, R4

  **Dependencies:** Unit 5

  **Files:**
  - Create: `src/types/entity.ts`
  - Create: `src/types/api.ts`
  - Create: `src/lib/api.ts`
  - Create: `src/lib/search.ts`
  - Create: `src/hooks/useEntityCache.ts`
  - Create: `src/hooks/useSearch.ts`
  - Create: `src/hooks/useSubmitEntity.ts`
  - Test: `src/__tests__/hooks/useEntityCache.test.ts`
  - Test: `src/__tests__/lib/search.test.ts`

  **Approach:**
  - `entity.ts`: TypeScript interfaces for `Entity`, `Person`, `Organization`, `Resource`, `Submission`, `Edge`. Must mirror the `toFrontendShape()` mapping in `api/export-map.js` — field names are frontend names (e.g., `regulatory_stance`, not `belief_regulatory_stance`)
  - `api.ts`: Request/response types for `/submit`, `/search`, entity cache JSON
  - `api.ts` (lib): Typed fetch wrapper with `API_BASE` logic (`import.meta.env.PROD ? 'https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com' : '/api'`)
  - `search.ts`: Port of the client-side fuzzy search algorithm from contribute.html (name match scoring: exact=100, startsWith=80, includes=60; secondary field matching)
  - `useEntityCache`: TanStack Query hook fetching `map-data.json` + `map-detail.json`, merged. `staleTime: Infinity` since data only changes on deploy/admin approval.
  - `useSearch`: Combines `useMemo` (local cache fuzzy search) with `useQuery` (debounced pending search from API). Merges results with deduplication by ID. Returns `{ localResults, pendingResults, allResults, isLoadingPending }`.
  - `useSubmitEntity`: TanStack Query `useMutation` wrapping POST to `/submit`. Invalidates `['entities']` and `['search']` on success. Returns `{ mutate, isPending, isSuccess, isError, error }`.

  **Execution note:** Execution target: external-delegate. Provide the TypeScript types and `toFrontendShape()` mapping as context.

  **Patterns to follow:**
  - Current fuzzy search in contribute.html lines 1942-2000
  - Current entity cache loading in contribute.html lines 1930-1940
  - TanStack Query v5 patterns: `queryOptions` factory, `useMutation` with `onSuccess` invalidation

  **Test scenarios:**
  - Happy path: `useEntityCache` fetches and merges map-data.json + map-detail.json; returns typed entities
  - Happy path: `useSearch` returns instant local results and async pending results merged with deduplication
  - Happy path: `useSubmitEntity` posts form data, returns success, invalidates caches
  - Edge case: `useEntityCache` handles network failure gracefully (error state, retry)
  - Edge case: `useSearch` with empty query returns empty results (no API call)
  - Edge case: `useSearch` deduplicates entities that appear in both local cache and pending results
  - Error path: `useSubmitEntity` parses error JSON and surfaces specific message (rate limit vs validation vs server error)
  - Integration: `useSearch` debounces API calls at 150ms (pending) while local search runs immediately

  **Verification:**
  - Hooks return correctly typed data
  - TypeScript compilation passes with strict mode
  - Search scoring matches current behavior for known test cases

---

- [ ] **Unit 7: Navigation component**

  **Goal:** Extract the duplicated navigation bar into a shared React component.

  **Requirements:** R6

  **Dependencies:** Unit 5

  **Files:**
  - Create: `src/components/Navigation.tsx`

  **Approach:**
  - Extract nav HTML structure from contribute.html (lines 1052-1063)
  - Tailwind-styled (replace inline CSS nav styles: lines 841-907)
  - Active state based on `window.location.pathname`
  - Hamburger menu toggle with Tailwind responsive classes
  - Only used by React-migrated pages — non-migrated pages keep their inline nav

  **Execution note:** Execution target: external-delegate

  **Patterns to follow:**
  - Current nav HTML structure (identical across all pages)
  - Current nav CSS (contribute.html lines 841-907)

  **Test scenarios:**
  - Happy path: Nav renders with correct links, active state highlights current page
  - Edge case: Hamburger menu toggles on mobile viewport
  - Edge case: Nav works in iframe-embedded mode (links target `_top` or `_parent`)

  **Verification:**
  - Visual parity with current navigation
  - Links navigate correctly

---

### Phase 2: Form Component Library

- [ ] **Unit 8: CustomSelect component**

  **Goal:** Build a reusable, accessible custom select dropdown integrated with React Hook Form.

  **Requirements:** R5, R6

  **Dependencies:** Unit 5

  **Files:**
  - Create: `src/components/CustomSelect.tsx`
  - Test: `src/__tests__/components/CustomSelect.test.tsx`

  **Approach:**
  - Props: `options: { value, label, color? }[]`, `placeholder`, `searchable`, `clearable` (click-to-deselect), `name` (for RHF), `control` (RHF Controller)
  - Render: trigger button showing selected value (with color dot if applicable), dropdown with optional search input, option list
  - Color dots: render `<span>` with `backgroundColor` from option's color property. Color mappings come from Tailwind config or passed as props.
  - Keyboard: ArrowUp/Down to navigate, Enter to select, Escape to close, type-to-search
  - Click-to-deselect: clicking the currently selected option clears the value (sets to empty string)
  - Click-outside close: `useRef` + `useEffect` with document click listener
  - Accessibility: `role="listbox"`, `aria-expanded`, `aria-activedescendant`
  - Integration with RHF via `Controller`: the component is a controlled input that calls `field.onChange` on selection

  **Patterns to follow:**
  - Current custom select implementation in contribute.html lines 1794-1926
  - SELECT_COLORS mapping (contribute.html line 1795)

  **Test scenarios:**
  - Happy path: Open dropdown, search, select option → value reflected in RHF form state
  - Happy path: Click selected option → value cleared (deselect)
  - Happy path: Arrow key navigation cycles through visible options, Enter selects
  - Edge case: Search filtering shows "No options" when no matches
  - Edge case: Opening one CustomSelect closes any other open CustomSelects
  - Edge case: Dropdown positions correctly near viewport edge (doesn't overflow)
  - Integration: RHF `watch()` reflects value changes immediately

  **Verification:**
  - Visual parity with current custom selects (color dots, search, selection state)
  - Keyboard navigation works identically to current implementation
  - Click-to-deselect clears RHF form value

---

- [ ] **Unit 9: TagInput component**

  **Goal:** Build a reusable multi-tag input with pluggable search source, integrated with React Hook Form.

  **Requirements:** R5, R6, R10

  **Dependencies:** Unit 6

  **Files:**
  - Create: `src/components/TagInput.tsx`
  - Test: `src/__tests__/components/TagInput.test.tsx`

  **Approach:**
  - Generic component used for 5 different fields: affiliated orgs (entity search), locations (Photon API), authors (entity search), other categories (static list), resource orgs (entity search)
  - Props: `searchFn: (query: string) => Promise<SearchResult[]> | SearchResult[]`, `renderResult`, `renderTag`, `placeholder`, `maxTags?`, `name`, `control`
  - State: array of selected tags `{ id, label, meta? }[]`
  - Search: debounced input triggers `searchFn`, results shown in dropdown
  - Tag rendering: each tag shows label + × remove button
  - Keyboard: Backspace on empty input removes last tag, ArrowUp/Down in dropdown, Enter to select
  - RHF integration: `Controller` wrapping the component, `field.onChange` called with serialized tag array
  - For org searches: include "Add 'X' as new org..." option at the bottom of results when no exact match (declarative, not MutationObserver)

  **Patterns to follow:**
  - Current affiliated org tag input: contribute.html lines 2366-2459
  - Current location tag input: contribute.html lines 2583-2669
  - Declarative "Add new org" option replaces MutationObserver injection pattern

  **Test scenarios:**
  - Happy path: Type query → results appear → click to add tag → tag rendered with × button → click × to remove
  - Happy path: Multiple tags added, each appears in order
  - Edge case: Backspace on empty input removes the last tag
  - Edge case: Duplicate tag prevented (same ID already in tag list)
  - Edge case: "Add new org" option appears when search has no exact match
  - Edge case: Max tags enforced (if `maxTags` prop set)
  - Integration: RHF form value is serialized array of tag IDs `[1, 2, 3]`

  **Verification:**
  - Tags add/remove correctly with immediate RHF state sync
  - Auto-save hook (Unit 11) can serialize/restore tag state from localStorage

---

- [ ] **Unit 10: TipTap React editor component**

  **Goal:** Create a React TipTap editor with @mention support, replacing the vanilla JS IIFE bundle.

  **Requirements:** R6

  **Dependencies:** Unit 6

  **Files:**
  - Create: `src/components/TipTapEditor.tsx`
  - Create: `src/components/MentionDropdown.tsx`
  - Create: `src/components/EditorToolbar.tsx`
  - Modify: `package.json` (add `@tiptap/react`, `@floating-ui/dom`)

  **Approach:**
  - `TipTapEditor`: Uses `useEditor` hook with `StarterKit`, `Link`, `Mention`, `Placeholder` extensions. Props: `content`, `onUpdate: (html: string, mentions: MentionData[]) => void`, `searchEntities: (query: string) => Entity[]`, `placeholder`
  - `MentionDropdown`: Renders the @mention suggestion popup. Shows entity type badge (Person/Org/Resource), name with ellipsis, detail text. Uses `tippy.js` for positioning (same as current) or migrate to `@floating-ui`
  - `EditorToolbar`: Bold/italic/strike/list/blockquote/link buttons. Uses `useEditorState` hook to track active formatting state (v3 pattern where `shouldRerenderOnTransaction` is false)
  - `@mention` search: receives `searchEntities` prop (connected to entity cache via context or parent). Filters by query, returns top results with type/name/detail
  - Link insertion: Cmd+K shortcut opens link popover (port from current `src/tiptap-notes.js` link handling)
  - Outputs: calls `onUpdate` with `editor.getHTML()` and extracted mention data on every change
  - RHF integration: parent component uses `Controller`, passing `field.onChange` as `onUpdate`

  **Patterns to follow:**
  - Current `src/tiptap-notes.js` (468 lines) — mention suggestion config, link handling, toolbar logic
  - `@tiptap/react` v3 patterns: `useEditor`, `EditorContent`, `useEditorState`
  - TipTap idempotent init is automatic in React (component lifecycle manages editor)

  **Test scenarios:**
  - Happy path: Editor renders with placeholder, accepts text input, formatting toolbar works
  - Happy path: Type @ → mention dropdown appears → search filters entities → select inserts mention chip
  - Happy path: Cmd+K opens link popover → enter URL → link inserted
  - Edge case: Multiple TipTap instances on the same page (person notes + org panel notes) operate independently
  - Edge case: Mention dropdown shows type badge and truncates long names
  - Edge case: Editor content restoration from auto-save (HTML string passed as `content` prop)
  - Integration: `onUpdate` fires with HTML and mentions on every editor change; RHF form state updates

  **Verification:**
  - Visual parity with current TipTap editor (formatting, @mentions, links)
  - Mention search connected to entity cache
  - Multiple independent instances work simultaneously

---

### Phase 3: Contribute Form Migration

- [ ] **Unit 11: Form shell — tabs, pill toggle, auto-save**

  **Goal:** Build the form container with tab switching, relationship pill toggle, and localStorage auto-save. This is the React replacement for the top-level form structure.

  **Requirements:** R5, R6, R10

  **Dependencies:** Unit 8, Unit 9, Unit 10

  **Files:**
  - Create: `src/contribute/ContributeForm.tsx`
  - Create: `src/contribute/PillToggle.tsx`
  - Create: `src/hooks/useAutoSave.ts`
  - Test: `src/__tests__/hooks/useAutoSave.test.ts`

  **Approach:**
  - `ContributeForm`: manages active tab state (person/org/resource). Creates 3 separate `useForm` instances (one per form type), each with its own `updateEntityId` state. All 3 forms stay mounted, inactive forms hidden via `display:none` (not conditional rendering — preserves TipTap editor state, undo history, cursor position, and open dropdown states across tab switches). Exposes `switchToFormInUpdateMode(formType, entityData)` callback for cross-form navigation (e.g., resource form author "edit" → person tab in update mode). Wraps forms in a `DropdownContext` that tracks which dropdown ID is open (for mutual exclusion — opening one closes others).
  - `PillToggle`: three buttons (self/connected/external), click to select, click again to deselect. Purely visual + sets RHF value.
  - `useAutoSave`: Custom hook that subscribes to RHF `watch()` and debounces writes to localStorage at 500ms. **Uses a new key `mappingai_form_draft_v2`** (not the old `mappingai_form_draft`) to avoid collisions with the old inline auto-save during the coexistence period and to support the new serialization format (includes tag arrays). On first mount: checks for old-format draft at `mappingai_form_draft`, migrates it to the new key if present (best-effort field mapping, skip unknown fields), then deletes the old key. Serializes: all field values, tag arrays (improvement over current), TipTap HTML, active tab, relationship pill. Does NOT serialize: update mode state (`updateEntityId`), inline org panel state. On mount: reads localStorage draft and calls `reset()` to restore. Shows "Draft restored" toast if fields were populated. Suppression flag prevents saves during programmatic resets. **During coexistence (Units 5-16): `useAutoSave` is disabled** — the old inline auto-save remains active. Enabled only at Unit 17 cutover.
  - Clear form: resets RHF form, clears tags, resets TipTap content, clears localStorage draft for that form type.

  **Patterns to follow:**
  - Current form toggle: contribute.html lines 1730-1756
  - Current pill toggle: contribute.html lines 3232-3247
  - Current auto-save: contribute.html lines 2915-3058 (with tag state improvement)

  **Test scenarios:**
  - Happy path: Tab switch renders correct form, preserves other form state
  - Happy path: Pill toggle selects/deselects relationship, value reflected in RHF
  - Happy path: Auto-save persists form state to localStorage after 500ms of inactivity
  - Happy path: Page reload restores saved draft with "Draft restored" toast
  - Edge case: Switching tabs preserves unsaved form state (each form has its own useForm)
  - Edge case: Clear form resets all fields including tags, TipTap, custom selects, and clears localStorage draft
  - Edge case: Auto-save suppression during programmatic reset prevents saving empty state
  - Edge case: Tag state (affiliated orgs, locations) included in auto-save (new behavior)
  - Integration: Auto-save correctly serializes/restores TipTap HTML content

  **Verification:**
  - Form state persists across page reloads
  - Tab switching is instant with no state loss
  - Clear form fully resets all state

---

- [ ] **Unit 12: Duplicate detection component**

  **Goal:** Build the duplicate detection system that searches for existing entities as the user types a name.

  **Requirements:** R6

  **Dependencies:** Unit 6, Unit 11

  **Files:**
  - Create: `src/components/DuplicateDetection.tsx`
  - Create: `src/components/EntityCard.tsx`
  - Create: `src/components/UpdateBanner.tsx`

  **Approach:**
  - `DuplicateDetection`: Watches the name field via RHF `watch('name')`. Runs `useSearch` hook (local fuzzy + pending async). Renders match cards with "View existing" and "Add info to this entry" buttons.
  - "View existing": opens `EntityCard` sidebar (fixed right panel) with full entity details
  - "Add info to this entry": activates update mode — sets `updateEntityId` in form context, calls `reset()` with prefilled values from existing entity, makes name field read-only, shows `UpdateBanner`
  - `UpdateBanner`: shows "Updating {name} — adjust any fields..." with cancel button. Cancel clears `updateEntityId`, resets form, unlocks name field.
  - Blur-vs-click race: use `onMouseDown` (fires before blur) on duplicate result buttons instead of `onClick`. This eliminates the 300ms setTimeout hack.
  - Prefill scope: scalar fields (name, title, category, primary_org, website, location, social handles), custom selects, checkboxes. Does NOT prefill tags (affiliated orgs, locations) or TipTap content — matches current behavior.

  **Patterns to follow:**
  - Current duplicate detection: contribute.html lines 2027-2130
  - Current entity card sidebar: contribute.html lines 2176-2227
  - Current form prefill: contribute.html lines 2238-2341

  **Test scenarios:**
  - Happy path: Type name → local results appear instantly → pending results append after debounce
  - Happy path: Click "Add info to this entry" → form prefilled, name locked, update banner shown
  - Happy path: Click cancel on update banner → form cleared, name unlocked, update mode exited
  - Edge case: Blur on name field does not dismiss results before user can click a button (onMouseDown pattern)
  - Edge case: Results deduplicated between local cache and pending API results
  - Edge case: Short queries (<2 chars) skip API search, only show local results
  - Edge case: Update mode includes `entityId` in submission payload
  - Integration: Entity card sidebar shows full details from entity cache

  **Verification:**
  - Duplicate results appear within 100ms of typing (local search)
  - Update mode correctly prefills form and includes entityId in submission

---

- [ ] **Unit 13: Org search components**

  **Goal:** Build org search for primary org, affiliated orgs, and parent org fields with "Add new org" integration.

  **Requirements:** R6

  **Dependencies:** Unit 9 (TagInput), Unit 6

  **Files:**
  - Create: `src/contribute/OrgSearch.tsx`

  **Approach:**
  - Reuses `TagInput` (affiliated orgs — multi-select) and a single-select variant (primary org, parent org)
  - Single-select org search: input field with dropdown results, shows approved orgs + pending orgs with badge, "edit existing" link per result. Arrow key navigation. Selecting an org fills the visible input and stores the entity ID in a hidden RHF field.
  - "Add new org" option: rendered declaratively at the bottom of search results when no exact match found. Triggers `OrgCreationPanel` open (via callback prop).
  - "Can't find it? Add this org" link: also triggers panel open
  - Focus preload: on focus, show top 5 orgs from cache (before user types)
  - All org search instances share the same entity cache data but maintain independent selection state

  **Patterns to follow:**
  - Current primary org search: contribute.html lines 2366-2459
  - Current affiliated org tags: contribute.html lines 2462-2571
  - Declarative "Add new org" replaces MutationObserver injection

  **Test scenarios:**
  - Happy path: Focus → top 5 orgs shown → type query → filtered results → select org → ID stored in RHF
  - Happy path: "Add new org" option appears at bottom of results when no exact match
  - Edge case: Pending org results show "pending" badge
  - Edge case: Selecting a pending org stores submission ID (not entity ID) — existing behavior preserved
  - Edge case: Focus preload works when entity cache is still loading (shows "Loading..." or empty)
  - Integration: Clicking "Add new org" triggers OrgCreationPanel open with search query pre-filled

  **Verification:**
  - Org search matches current behavior (approved + pending, focus preload, arrow keys)
  - Selected org ID correctly stored in RHF form state

---

- [ ] **Unit 14: Inline org creation panel**

  **Goal:** Build the slide-in org creation panel as a React portal, communicating back to the parent form.

  **Requirements:** R6, R9

  **Dependencies:** Unit 8 (CustomSelect), Unit 9 (TagInput), Unit 10 (TipTap), Unit 13 (OrgSearch)

  **Files:**
  - Create: `src/contribute/OrgCreationPanel.tsx`

  **Approach:**
  - React portal rendered at `document.body` level (position: fixed, 460px wide, 100vw on mobile)
  - Props: `isOpen`, `onClose`, `onOrgCreated: (org: { id, name }) => void`, `initialName: string`, `triggerType: 'primary' | 'parent' | 'affiliated'`
  - Contains a mini org form: name (pre-filled), category (CustomSelect), website, location (LocationSearch TagInput), expandable section with funding model, regulatory stance, Twitter, Bluesky, TipTap notes
  - Own `useForm` instance (independent from parent form)
  - Own `useSubmitEntity` mutation for POST /submit
  - **Inception guard:** All `OrgSearch` and `TagInput` components rendered inside the panel receive `allowOrgCreation={false}`, preventing recursive panel opening. The panel's org-related fields are simple text inputs, not full org search widgets.
  - On success: calls `onOrgCreated` with new org data, parent form's OrgSearch updates the triggering field, new org pushed into TanStack Query entity cache. For affiliated orgs (multi-select TagInput), `onOrgCreated` adds the new org as a tag via the TagInput's imperative `addTag` method or RHF `setValue` on the affiliated orgs field array.
  - Success overlay shown for 1.5s, then auto-close
  - Background overlay for click-outside close
  - Portal stays within iframe bounds when contribute.html is embedded in map.html

  **Patterns to follow:**
  - Current org panel IIFE: contribute.html lines 3339-3905 (570 lines)
  - Post-submission cache update: push `{ id: submissionId, name, ... }` into entity cache

  **Test scenarios:**
  - Happy path: Panel slides open with pre-filled name → fill fields → submit → success overlay → panel closes → parent field updated
  - Happy path: Expandable "Add more details" section shows extra fields
  - Edge case: Panel's TipTap instance is independent from parent form's TipTap
  - Edge case: Panel works when contribute.html is in an iframe (portal renders within iframe document)
  - Edge case: Click outside panel (on overlay) closes it without submitting
  - Error path: Submission failure shows error in panel (not in parent form)
  - Integration: After panel close, `onOrgCreated` callback updates the correct org field (primary/affiliated/parent based on `triggerType`)

  **Verification:**
  - Panel slide animation matches current implementation
  - New org appears in parent form's org search immediately after creation
  - Works in both standalone and iframe-embedded modes

---

- [ ] **Unit 15: Location, Bluesky, Twitter search components**

  **Goal:** Build specialized search components for location geocoding, Bluesky handle search, and Twitter handle autocomplete.

  **Requirements:** R6

  **Dependencies:** Unit 9 (TagInput)

  **Files:**
  - Create: `src/contribute/LocationSearch.tsx`
  - Create: `src/contribute/BlueskySearch.tsx`
  - Create: `src/contribute/TwitterSearch.tsx`

  **Approach:**
  - `LocationSearch`: TagInput variant with Photon/OpenStreetMap geocoding API as search source. Debounced at 150ms. Results show city + state/country. Includes "Remote" option for org forms. Serializes to comma-separated city string.
  - `BlueskySearch`: Single-select input with live Bluesky public API search (`app.bsky.actor.searchActorsTypeahead`). Debounced at 150ms. Results show handle + display name + avatar. Selecting fills `@handle` format.
  - `TwitterSearch`: Single-select input searching against entity cache Twitter handles. No external API call — purely client-side filtering.
  - All three use the same debounce + dropdown + arrow-key pattern but with different search sources.

  **Execution note:** Execution target: external-delegate. These are well-scoped, independently testable components.

  **Patterns to follow:**
  - Current location search: contribute.html lines 2583-2669
  - Current Bluesky search: contribute.html lines 2870-2913
  - Current Twitter search: contribute.html lines 2828-2868
  - Debounce at 150ms for external APIs (established pattern)

  **Test scenarios:**
  - Happy path: LocationSearch — type city → Photon results → select → tag added with city name
  - Happy path: BlueskySearch — type handle → API results → select → @handle filled
  - Happy path: TwitterSearch — type @ → cache-filtered results → select → handle filled
  - Edge case: LocationSearch "Remote" option for organization forms
  - Edge case: Photon API failure → graceful degradation (show error, allow manual text entry)
  - Edge case: Bluesky API rate limiting handled gracefully

  **Verification:**
  - Location tags match current behavior (multi-city with × remove)
  - Bluesky search returns real results from public API
  - All three use consistent dropdown/keyboard-nav patterns

---

- [ ] **Unit 16: Form submission + success state + error handling**

  **Goal:** Wire up the complete form submission flow with proper error handling (replacing `alert()`).

  **Requirements:** R5, R6

  **Dependencies:** Unit 11 (form shell), Unit 6 (useSubmitEntity)

  **Files:**
  - Create: `src/contribute/SuccessMessage.tsx`
  - Modify: `src/contribute/ContributeForm.tsx` (wire up onSubmit)

  **Approach:**
  - Each form type's submit button triggers RHF `handleSubmit()` which validates and calls `useSubmitEntity.mutate()`
  - Builds the camelCase `data` object from RHF form values (matches current API contract: `{ type, timestamp, data, _hp }`)
  - Includes `entityId` when in update mode, `affiliatedOrgIds` as array, checkbox groups as comma-separated strings
  - `SuccessMessage`: full-page overlay with "Thank you!" message and form-type-specific text. Matches current success UI.
  - Error handling: parse response JSON. Show specific messages for rate limiting (429 — "Please wait X seconds"), validation errors (400 — field-specific), and server errors (500 — "Something went wrong, please try again"). Displayed inline above submit button (not `alert()`).
  - On success: clear form, clear localStorage draft, show success message
  - Honeypot field `_hp` included as hidden empty input (spam prevention)

  **Patterns to follow:**
  - Current submission handler: contribute.html lines 3168-3230
  - Current success message: contribute.html lines 1677-1679
  - API contract: `{ type: 'person|organization|resource', timestamp: ISO string, data: { ...camelCase fields }, _hp: '' }`

  **Test scenarios:**
  - Happy path: Fill form → submit → loading state on button → success message shown → form cleared → draft removed
  - Happy path: Update mode submission includes `entityId` in payload
  - Error path: 429 response → "Please wait" message with countdown
  - Error path: 400 response → field-specific validation errors shown inline
  - Error path: 500 response → generic error message, form NOT cleared, draft NOT removed
  - Edge case: Double-submit prevention (button disabled during `isPending`)
  - Integration: TanStack Query cache invalidated on success (search results updated)

  **Verification:**
  - Submission payload matches current API contract exactly
  - Success/error states display correctly
  - Form state fully cleared on success

---

- [ ] **Unit 17: Full form assembly + cutover**

  **Goal:** Assemble all components into complete PersonForm, OrganizationForm, and ResourceForm. Remove old inline JS/CSS. Make React the primary rendering path.

  **Requirements:** R6, R9, R11

  **Dependencies:** All prior units

  **Files:**
  - Create: `src/contribute/PersonForm.tsx`
  - Create: `src/contribute/OrganizationForm.tsx`
  - Create: `src/contribute/ResourceForm.tsx`
  - Modify: `contribute.html` (remove inline `<style>` and `<script>` blocks, keep only `<div id="contribute-root">` + React module script + D3-independent structural HTML like `<head>` meta tags)

  **Approach:**
  - Each form component composes: Navigation, FormField wrappers, CustomSelect (for category, stance, etc.), OrgSearch, TagInput (for affiliated orgs, locations, other categories), LocationSearch, BlueskySearch, TwitterSearch, TipTapEditor, DuplicateDetection, checkbox groups (threat models with max-3 validation), radio groups (influence type), email validation
  - Person form: name, relationship pill, category (exec/researcher/etc), title, primary org, affiliated orgs, location, influence type, threat models, evidence source, stance, AGI timeline, AI risk, twitter, bluesky, website, TipTap notes, email
  - Organization form: name, category, website, parent org, location (with Remote), funding model, stance, TipTap notes, email
  - Resource form: title, resource category, resource type, author (person search), resource org (org search), year, URL, key argument, TipTap notes, email
  - The cutover: remove the old inline `<style>` block (1,022 lines) and `<script>` block (2,295 lines) from contribute.html. The React mount point becomes the only content. Keep `<head>` with meta tags, Google Fonts, and Cloudflare analytics script.
  - Preserve the example submissions `<details>` sections — either migrate to React or keep as static HTML above the React mount point.

  **Patterns to follow:**
  - Current form field layout: contribute.html two-column grid (CSS lines 115-119)
  - Current field ordering per form type
  - Current example submissions sections

  **Test scenarios:**
  - Happy path: All 3 form types render with correct fields in correct order
  - Happy path: Complete submission flow works end-to-end for each form type
  - Happy path: Auto-save persists and restores all fields including tags and TipTap
  - Edge case: iframe embed (map.html loads contribute.html) — form renders and functions correctly
  - Edge case: Example @mention hover cards work (fetch entity details from search API)
  - Edge case: Mobile responsive layout matches current behavior (single column on small screens)
  - Edge case: All custom selects, tag inputs, and search fields have keyboard navigation
  - Regression: Non-migrated pages (map, admin, about, index, workshop) still work identically
  - Integration: Full flow — open form → fill fields → duplicate detection → create inline org → submit → success

  **Verification:**
  - Visual parity with current contribute.html (layout, colors, typography, spacing)
  - All form fields submit correct data to API (verify payload shape matches current)
  - Browser test on Chrome, Firefox, Safari (desktop and mobile viewport)
  - Test in iframe embed from map.html
  - contribute.html file size reduced from 4,036 lines to ~50 lines (mount point + head)

---

## System-Wide Impact

- **Interaction graph:** The contribute form is embedded as an `<iframe>` in map.html's collapsible sidebar. The React version must work in both standalone and iframe modes. localStorage is shared (same origin), so auto-save and password gate state are consistent between modes.
- **Error propagation:** TanStack Query provides consistent error handling via `isError`/`error` states on mutations and queries. Network failures surface to components via these states. The current `alert()` pattern is replaced with inline error messages.
- **State lifecycle risks:** The inline org creation panel pushes submission IDs (not entity IDs) into the entity cache. This is an existing data integrity concern — the admin approval trigger creates the real entity with a different ID. The React migration preserves this behavior but documents it as tech debt.
- **API surface parity:** No API changes. The React form submits identical payloads to `/submit`. The entity cache reads the same `map-data.json` and `map-detail.json` files. The search API is called with the same parameters.
- **Build pipeline change:** The deploy workflow changes from `npm run build:tiptap` + S3 sync from root to `vite build` + S3 sync from `dist/`. This affects every deploy, not just contribute.html. Must be tested thoroughly before merging.
- **Non-migrated page risk:** Vite MPA mode serves non-migrated pages as static HTML. Their inline `<style>` and `<script>` blocks work unchanged. The primary risk is Vite's dev server behavior differing from the current `npx serve .` or `node dev-server.js` — verify all pages in `vite dev` mode.

## Risks & Dependencies

- **Highest risk — CI/CD pipeline change (Unit 3):** Changing the deploy workflow affects the entire site. A broken deploy means all 7 pages go down. Mitigation: test the Vite build output locally with `npx serve dist/` before merging. Keep the old workflow as a commented-out fallback for 2 weeks. First PR that changes deploy should include a manual smoke test checklist.
- **High risk — D3 page regression (R11):** map.html's synchronous D3 loading must work under Vite's dev server and production build. Vite should not transform or defer the CDN script tag. Mitigation: explicit browser test of map.html D3 rendering in both `vite dev` and `npx serve dist/` as part of every PR.
- **High risk — Vite transforming non-migrated inline scripts:** Vite MPA mode must pass through inline `<script>` blocks in non-migrated HTML files without transformation. If Vite minifies or tree-shakes inline scripts, placeholder strings (`__SITE_PASSWORD_HASH__`, `__CF_ANALYTICS_TOKEN__`) could be mangled, breaking the password gate and analytics on map.html, admin.html, etc. Mitigation: grep `dist/map.html` for placeholder strings in Unit 1 verification. If Vite transforms them, configure `build.rollupOptions.output.inlineDynamicImports` or exclude those pages from Vite's transform pipeline.
- **Medium risk — Tailwind preflight CSS conflict during coexistence:** Between Units 2 and 17, both Tailwind styles and old inline CSS coexist in contribute.html. Tailwind's preflight normalizes margins, headings, lists, and links. Mitigation: `preflight: false` in Tailwind config until Unit 17 cutover.
- **Medium risk — Tailwind class volume:** Rewriting 1,022 lines of CSS as Tailwind utility classes is significant effort. Some CSS patterns (complex selectors, `:has()`, adjacent sibling combinators) may not map cleanly to utilities. Mitigation: use `@apply` sparingly for complex patterns; allow hybrid CSS Modules for edge cases.
- **Medium risk — TipTap version alignment:** Installing `@tiptap/react` alongside existing `@tiptap/core` may cause version conflicts. Mitigation: pin all `@tiptap/*` packages to the same version during install.
- **Medium risk — S3 hashed asset deletion:** Using `--delete` on S3 sync removes old hashed assets before cached HTML can reference them. Brief 404 window for in-flight users. Mitigation: do NOT use `--delete` on the assets sync; add a separate cleanup job for files older than 7 days.
- **Low risk — iframe behavior change:** The React version renders differently than the inline-script version. Subtle layout shifts in the iframe embed could affect map.html's sidebar. Mitigation: test iframe embed explicitly in Unit 17. Note: React portal for org panel renders into iframe `document.body` (not parent document) — `position: fixed` is relative to iframe viewport, preserving current behavior.
- **Dependency — Password gate still active:** The password gate must work from the first deployable unit. It's addressed in Unit 5 as part of the React provider setup, including brute-force protection.
- **Tech debt — Dual `sed` + `import.meta.env` mechanism:** During migration, React pages use Vite env vars while non-migrated pages use `sed` on `dist/`. This dual mechanism should be retired in Phase 4 when all pages are migrated. Document clearly in deploy workflow comments.

## Phased Delivery

All phases happen on a single `feat/react-contribute` branch. Nothing ships to production until the full migration is tested and ready.

### Phase 0: Build Infrastructure (Units 1-4)
Vite scaffolding, Tailwind config, deploy workflow updates, preview deploys. After this phase, the branch has a working Vite build with all pages functional. **Critical gate: Unit 1 must verify Vite does not transform inline scripts in non-migrated pages (P0 finding). If it does, add a fallback: exclude non-migrated pages from rollupOptions.input and copy them raw to dist/ as a post-build step.**

### Phase 1: Shared Infrastructure (Units 5-7)
React mounts on contribute.html alongside existing content. Shared hooks, API client, and Navigation component built. The old inline scripts still run the form on the branch.

### Phase 2: Form Component Library (Units 8-10)
Reusable components built and tested in isolation. No user-facing change yet — components exist but aren't wired into the form.

### Phase 3: Contribute Form Migration (Units 11-17)
Full assembly + cutover. Old inline code removed, React components assembled into the full form. The 4,036-line file shrinks to ~50 lines. After Unit 17, the branch is ready for thorough testing before the single merge to main.

### Future Phases (out of scope)
- Phase 4: about.html, index.html, workshop migration (trivial — small pages)
- Phase 5: admin.html migration
- Phase 6: map.html migration (D3 useRef pattern, largest effort)
- Phase 7: TanStack Router (once 4+ pages are React, add client-side navigation)

## Documentation / Operational Notes

- **Local development changes:** Two-process setup. `npm run dev` starts Vite dev server on port 5173 (replaces `npx serve .` for static files + HMR). `node dev-server.js` continues running on port 3000 for local API endpoints. Vite's proxy forwards `/api/*` to `localhost:3000`. This preserves the local-database development workflow. Document in `docs/DEPLOYMENT.md`.
- **Build command changes:** `npm run build` runs `vite build` (replaces `npm run build:tiptap`). Output in `dist/`.
- **Deploy command changes:** S3 sync source changes from `.` to `dist/`. Document in `docs/DEPLOYMENT.md`.
- **Browser testing still mandatory:** Vite build + TypeScript + React do not catch rendering regressions. Browser-test map.html, contribute.html (standalone + iframe), and admin.html before every merge to main.
- **TanStack Query DevTools:** Available in development builds for debugging cache state, mutations, and query timing. Strip from production via Vite's tree-shaking (`@tanstack/react-query-devtools` is a dev dependency).

## Sources & References

- Related code: `contribute.html` (4,036 lines), `src/tiptap-notes.js` (468 lines), `api/export-map.js` (field mapping), `.github/workflows/deploy.yml`
- Related plans: `docs/plans/2026-04-08-002-fix-contribute-form-ux-bugs-plan.md` (active form UX fixes on `fix/contribute-form-ux` branch)
- Post-mortem: `docs/post-mortems/2026-04-09-d3-defer-map-outage.md` (D3 synchronous loading constraint)
- Institutional learnings: `docs/solutions/ui-bugs/inline-org-panel-rich-field-parity.md` (TipTap init patterns), `docs/solutions/best-practices/mobile-entity-directory-replacing-d3-map-2026-04-08.md` (D3 + React patterns)
- External docs: Vite MPA mode, TanStack Query v5, `@tiptap/react` v3, Tailwind CSS v4, React Hook Form
