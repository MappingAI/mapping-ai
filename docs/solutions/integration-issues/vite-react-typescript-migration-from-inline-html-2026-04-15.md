---
title: 'Migrating mapping-ai from inline HTML/CSS/JS to Vite + React + TypeScript'
date: 2026-04-15
category: integration-issues
module: frontend
problem_type: developer_experience
component: tooling
symptoms:
  - '7 HTML pages totaling ~13,500 lines of inline CSS/JS with no code sharing'
  - 'Duplicated components across pages (navigation, dropdowns, forms, TipTap editors)'
  - 'No type safety — vanilla JS with implicit contracts between frontend and API'
  - 'D3 map page (5,743 lines) too tightly coupled to extract without breaking'
root_cause: missing_tooling
resolution_type: migration
severity: high
tags:
  - react-migration
  - vite
  - typescript
  - tailwind-css
  - multi-page-app
  - d3-inline-constraint
  - component-extraction
  - tiptap-react
  - form-architecture
---

# Migrating mapping-ai from inline HTML/CSS/JS to Vite + React + TypeScript

> **Historical context:** this document describes behavior on the AWS stack (RDS + Lambda + CloudFront + S3 + SAM). See [`docs/architecture/current.md`](../../architecture/current.md) for today's live stack and [ADR-0001](../../architecture/adrs/0001-migrate-off-aws.md) for migration status.

## Problem

Seven HTML pages totaling ~13,500 lines used inline `<style>` and `<script>` blocks with zero framework, no component boundaries, no type safety, and copy-pasted patterns (navigation, dropdowns, tag inputs, search) that diverged across pages. contribute.html alone was 4,041 lines with 2,295 lines of imperative JS, 1,022 lines of CSS, and 132+ event listeners. Every change was risky and slow.

## Symptoms

- Identical UI patterns (custom selects, tag inputs, TipTap editors, search autocomplete) reimplemented independently in each page with subtle behavioral differences.
- No TypeScript — runtime type errors only discovered in production.
- No component reuse — Navigation markup copy-pasted 7 times.
- No HMR or modern dev tooling — every change required full page reload.
- Inline CSS blocks meant styles could not be shared, linted, or tree-shaken.
- No test infrastructure — zero automated tests, all validation was manual browser testing.
- `esbuild` used only for TipTap bundle; everything else served raw.

## What Didn't Work

### 1. D3 engine extraction from map.html

Commit `9c7b247` extracted 4,378 lines of inline JS into `src/map/engine.js` and 835 lines of CSS into `src/map/map.css`. **The D3 engine creates all UI elements (controls sidebar, filters, search, detail panel, zoom, plot view) as imperative DOM manipulation** — it does not render into a fixed HTML structure. When served as an external file through Vite, the engine failed to render anything.

Root cause: the D3 code depends on synchronous loading order, global DOM element IDs, and inline-script execution context. Simply moving it to an external file changes the execution timing and module scope. Reverted in commit `4b7ccda`.

**Lesson:** A proper D3 migration requires a ground-up React refactor using `useRef` and `useEffect` patterns — not file extraction. (auto memory [claude]: the D3 defer outage on 2026-04-09 already established that D3's inline execution dependency is a hard constraint.)

### 2. `forms` record pattern causing infinite re-renders

The initial ContributeForm created a `forms` object literal each render:

```typescript
// BAD — new object reference every render
const forms: Record<FormType, UseFormReturn> = {
  person: personForm,
  organization: orgForm,
  resource: resourceForm,
}
// ...used in useCallback deps → infinite loop
const cancelUpdate = useCallback(
  (formType) => {
    forms[formType].reset({})
  },
  [forms],
) // forms changes every render!
```

This produced "Maximum update depth exceeded" errors and crashed the contribute iframe inside map.html.

### 3. Feature parity gaps in the contribute form

After architectural assembly, the React form was missing ~15 specific UX details from the 4,041-line original: tooltips, example submissions, @mention search, email disclaimer, pending entity search, conditional detail textareas, and duplicate detection wiring. Architecture was complete but feature fidelity was not.

## Solution

### Architecture: Vite MPA + React islands

Vite 8 in MPA mode (`appType: 'mpa'`) with all 7 HTML pages as Rollup input entries. Each page gets its own React root via separate `main.tsx` files. Non-migrated pages (map.html) keep their inline scripts — Vite passes them through untransformed.

**P0 spike (critical):** Before committing to the architecture, a minimal Vite config was built and `vite build` was run. The spike confirmed `dist/map.html` preserved all 5,743 lines of inline code, placeholder strings (`__SITE_PASSWORD_HASH__`), and D3 CDN script tags exactly. This took one commit and prevented a failed migration.

### Stack

- **Vite 8** — MPA mode, dev proxy to Express API server on port 3000
- **React 19** — separate entry point per page (islands pattern)
- **TypeScript** — strict mode, types mirroring `toFrontendShape()` DB-to-frontend mapping
- **Tailwind CSS v4** — `@tailwindcss/vite` plugin, preflight disabled during coexistence
- **TanStack Query** — server state (entity cache, search, submit mutations)
- **React Hook Form** — form field state, validation, Controller for custom components
- **Vitest** — 28 tests across 4 test files

### Phased implementation (17 commits)

| Phase                | Commits | What                                                                                               |
| -------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| 0: Infrastructure    | 1       | Vite MPA + TS + Tailwind + Vitest scaffolding                                                      |
| 1: React plumbing    | 3       | Entry points, providers, API hooks, Navigation                                                     |
| 2: Component library | 7       | CustomSelect, TagInput, TipTap, DuplicateDetection, OrgSearch, search components, OrgCreationPanel |
| 3: Form assembly     | 1       | PersonForm, OrgForm, ResourceForm + cutover (4,041 → 32 lines)                                     |
| Static pages         | 1       | about, index, theoryofchange, workshop (1,862 lines removed)                                       |
| Admin                | 1       | Dashboard with auth, stats, pending queue, entity table (1,859 → 21 lines)                         |
| Map                  | 2       | Extraction attempted → reverted to inline                                                          |
| Bugfix               | 1       | Infinite re-render loop fix                                                                        |

### Infinite re-render fix

Replace the `forms` object with a stable ref:

```typescript
// GOOD — stable reference across renders
const formsRef = useRef({
  person: personForm,
  organization: orgForm,
  resource: resourceForm,
})
formsRef.current = { person: personForm, organization: orgForm, resource: resourceForm }

const cancelUpdate = useCallback((formType: FormType) => {
  formsRef.current[formType].reset({})
}, []) // empty deps — formsRef is stable
```

### Tab switching: display:none, not conditional rendering

All 3 form components stay mounted (hidden via CSS). Conditional rendering would destroy TipTap editor instances on tab switch, losing cursor position, undo history, and open dropdown states.

## Why This Works

**Vite MPA mode is a perfect bridge for incremental migration.** Setting `appType: 'mpa'` tells Vite to treat each HTML file as an independent entry point and pass through inline `<script>` blocks without transformation. Non-migrated pages continue working identically. Migrated pages replace inline code with a module script that Vite processes through the React/TypeScript/Tailwind pipeline. The two coexist in a single build output.

**React islands match the actual architecture.** Each page is a fundamentally different application (D3 force graph, rich form, admin dashboard, static content) with minimal shared state. The only shared code is Navigation, which Vite automatically code-splits.

**`useRef` for stable callback references.** React refs have a stable `.current` property whose reference identity never changes across renders. Reading form instances from `formsRef.current` inside callbacks means the callbacks need no dependencies on the form instances, breaking the render-update-render cycle.

## Prevention

1. **Spike before extracting tightly-coupled code.** The P0 spike that validated Vite MPA passthrough took one commit and prevented a premature map migration. The map extraction attempted without a spike broke immediately. Any code extraction that changes execution context (inline to external, synchronous to module) needs a working proof first.

2. **Never put mutable objects in useCallback/useMemo dependency arrays.** Object literals and record patterns created inline during render produce new references every render. Use `useRef` for stable references to mutable collections:

   ```typescript
   // BAD: new object every render → infinite loop in deps
   const lookup = { a: hookA, b: hookB }
   const fn = useCallback(() => lookup.a.doThing(), [lookup])

   // GOOD: stable ref
   const lookupRef = useRef({ a: hookA, b: hookB })
   lookupRef.current = { a: hookA, b: hookB }
   const fn = useCallback(() => lookupRef.current.a.doThing(), [])
   ```

3. **Feature fidelity checklist before cutover.** Architecture and component assembly are the easy part. The hard part is hundreds of subtle UX details in a mature form: tooltips, placeholder text, conditional fields, error states, keyboard navigation, info text, disclaimers. Build a feature-by-feature parity checklist from the original and verify each item before removing the old code.

4. **Single feature branch for large migrations.** `feat/react-contribute` accumulated 17 commits without merging to main. This eliminated all coexistence risks (dual auto-save, dual password gates, sed injection timing) since production never saw an intermediate state.

5. **Imperative D3 visualizations need a dedicated migration strategy.** Extracting inline D3 code to an external file does not work when the code creates all DOM elements dynamically and assumes synchronous inline execution. The correct approach is a `useRef`-based bridge: React owns the container, D3 owns everything inside via `useEffect`, communication flows through refs.

## Related Issues

- **D3 defer outage post-mortem:** `docs/post-mortems/2026-04-09-d3-defer-map-outage.md` — established the constraint that D3 must load synchronously, directly influencing the map migration approach.
- **Contribute form UX bugs plan:** `docs/plans/2026-04-08-002-fix-contribute-form-ux-bugs-plan.md` — 13 UX fixes in the original contribute.html that must be preserved in the React version.
- **Inline org panel solution:** `docs/solutions/ui-bugs/inline-org-panel-rich-field-parity.md` — TipTap init patterns and MutationObserver discipline, replaced by React equivalents.
- **Migration plan:** `docs/plans/2026-04-13-001-feat-vite-react-migration-plan.md` — the original plan with 17 implementation units, document review findings, and architecture decisions.
- **Feature parity follow-up plan:** `docs/plans/2026-04-15-001-fix-react-migration-feature-parity-plan.md` — 12 implementation units for remaining contribute form feature gaps.

### Documents that may become stale

- `docs/DEPLOYMENT.md` — deploy pipeline changes fundamentally (Vite build, `dist/` output)
- `CLAUDE.md` — references "Static HTML/CSS/JS (no framework)" architecture
- `docs/solutions/ui-bugs/inline-org-panel-rich-field-parity.md` — TipTap/MutationObserver patterns replaced by React
- `docs/plans/2026-04-08-002-fix-contribute-form-ux-bugs-plan.md` — references line numbers in old vanilla JS
