---
title: "fix: React migration feature parity — contribute form + map + CI/CD"
type: fix
status: active
date: 2026-04-15
origin: docs/plans/2026-04-13-001-feat-vite-react-migration-plan.md
---

# fix: React migration feature parity — contribute form + map + CI/CD

## Overview

The Vite + React migration (feat/react-contribute branch, 16 commits) successfully migrated the architecture for all 7 pages, but the contribute form has significant feature gaps compared to the original 4,041-line inline implementation. The map page was reverted to inline after a failed extraction. CI/CD has not been updated yet. This plan addresses all remaining work to reach production-ready quality.

## Problem Frame

The migration got the architecture right (Vite 8 MPA, React 19, TypeScript, Tailwind, TanStack Query, React Hook Form) but the contribute form's React components miss many subtle UX details from the original. The original had 132+ event listeners, 4 custom dropdown patterns, 3 TipTap instances, and dozens of small UX touches (tooltips, disclaimers, examples, pending entity search) that were not carried over.

## Current State (as of 2026-04-15)

### What's working
- All 7 HTML pages build and serve under Vite MPA mode
- 5 pages fully migrated to React: index, about, theoryofchange, workshop, admin
- Contribute form: basic structure works (tabs, pills, CustomSelect, form fields, TipTap editor renders)
- Map page: works perfectly as inline HTML under Vite (reverted from failed extraction)
- 28 automated tests passing, TypeScript strict mode clean
- Infinite re-render loop in ContributeForm fixed (useRef for stable form references)

### What's broken or missing

#### Contribute Form Feature Gaps (Priority 1)
1. **TipTap @mention not returning search results** — The `searchEntities` function passed to TipTapEditor needs to connect to the entity cache via `useEntityCache`. Currently the search function may not have access to loaded cache data.
2. **No pending entity results in searches** — OrgSearch, author search, TipTap mentions all need to include pending entities from the `/search?status=pending` API call. Currently only searching the local cache (approved entities from map-data.json).
3. **No info tooltips** — The original has `<span class="info-tip">i<span class="tip-content">...</span></span>` patterns on AGI Timeline, Notes field, and other fields. These need a Tooltip component.
4. **No AGI timeline definition tooltip** — Specific tooltip: "Artificial General Intelligence—AI that matches or exceeds human-level reasoning across domains. Definitions vary widely."
5. **No notes field guidance tooltip** — The original has a detailed tooltip explaining what to include in notes (policy positions, relationships, funding, career) with @mention example.
6. **No example submission sections** — Three collapsible `<details>` sections showing example person/org/resource submissions with interactive @mention hover cards.
7. **No email privacy disclaimer** — "Your email will not be displayed publicly" text below the email field.
8. **No "Can't find it? Add this org" helper links** — Below primary org and affiliated org search fields.
9. **No conditional detail textarea for regulatory stance** — Selecting "Other" or "Mixed/unclear" should reveal a textarea for elaboration. The DB has a `belief_regulatory_stance_detail` column.
10. **No duplicate detection wired to the form** — DuplicateDetection component exists but isn't rendered in PersonForm/OrgForm/ResourceForm.
11. **Missing form validation feedback** — Email validation (green/red border + helper text on blur), required field indicators beyond the asterisk.
12. **No honeypot field** — The `_hp` spam prevention field is missing from the form submission.
13. **No existing entity card sidebar** — When duplicate detection shows matches, clicking "View existing" should open a right sidebar with full entity details.
14. **Auto-save not wired** — useAutoSave exists but is disabled during coexistence (and coexistence is over for contribute.html since it's fully React now).

#### Map Page (Priority 2)
15. **Map stays inline** — The D3 engine extraction broke the page. The engine creates all UI dynamically and references DOM elements by ID. It stays as inline HTML under Vite MPA mode (proven working). A proper React migration requires a ground-up refactor using the D3-useRef pattern, which is a separate multi-week project.

#### CI/CD (Priority 3)
16. **Deploy workflow not updated** — `.github/workflows/deploy.yml` still syncs from repo root. Needs to: add `vite build` step alongside `build:tiptap`, change S3 sync source to `dist/` for migrated pages (while keeping map.html from root), run `sed` for password/analytics tokens on `dist/` output.
17. **Preview deploy workflow not created** — `preview.yml` for per-PR preview URLs (S3 path prefix, PR comment bot).
18. **`.env.production` handling** — Write env file before `vite build` so `import.meta.env.VITE_*` variables are embedded at build time.

## Implementation Units

### Phase 1: Contribute Form Feature Parity (Priority)

- [ ] **Unit 1: Wire TipTap @mention search to entity cache**

  **Goal:** Make @mentions in the Notes field return entity search results.

  **Files:**
  - Modify: `src/contribute/PersonForm.tsx`
  - Modify: `src/contribute/OrganizationForm.tsx`
  - Modify: `src/contribute/ResourceForm.tsx`

  **Approach:**
  - Each form already has a `searchEntities` callback for TipTap. Verify it receives the entity cache from `useEntityCache()` and returns formatted results.
  - The search should include both approved entities (from cache) AND pending entities (from `/search?status=pending` API). Use the `useSearch` hook pattern.
  - Test: type @ in notes → dropdown appears with entity results.

---

- [ ] **Unit 2: Add pending entity search to OrgSearch and all search fields**

  **Goal:** Pending entities (status=pending) appear in org search, author search, and TipTap mention results alongside approved entities.

  **Files:**
  - Modify: `src/contribute/OrgSearch.tsx`
  - Modify: `src/hooks/useSearch.ts`

  **Approach:**
  - OrgSearch should use `useSearch` hook which already combines local cache + pending API results.
  - Verify that pending results show with a "pending" badge.
  - Currently OrgSearch may be doing its own search rather than using the shared `useSearch` hook. Align it.

---

- [ ] **Unit 3: Add info tooltips component + wire to form fields**

  **Goal:** Info (ⓘ) tooltips on AGI Timeline, Notes, and other fields matching original behavior.

  **Files:**
  - Create: `src/components/InfoTooltip.tsx`
  - Modify: `src/contribute/PersonForm.tsx`

  **Approach:**
  - Create a reusable `InfoTooltip` component: small "i" circle that shows a tooltip on hover/click with rich content (HTML-capable).
  - Add to AGI Timeline field: "Artificial General Intelligence—AI that matches or exceeds human-level reasoning across domains. Definitions vary widely. Learn more (link to Wikipedia)."
  - Add to Notes field: guidance on what to include (policy positions, relationships, funding, career) with @mention example showing bidirectional linking.
  - Match original styling: small circle with "i", tooltip appears on hover, max-width 300px.

---

- [ ] **Unit 4: Add email privacy disclaimer**

  **Goal:** "Your email will not be displayed publicly" text below the email field.

  **Files:**
  - Modify: `src/contribute/PersonForm.tsx`
  - Modify: `src/contribute/OrganizationForm.tsx`
  - Modify: `src/contribute/ResourceForm.tsx`

  **Approach:**
  - Add helper text below the email input: `<span className="text-[12px] font-mono text-[#888]">Your email will not be displayed publicly. It's used only if we need to contact you about your submission.</span>`

---

- [ ] **Unit 5: Add example submission sections**

  **Goal:** Collapsible example sections showing sample person/org/resource submissions.

  **Files:**
  - Create: `src/contribute/ExampleSubmission.tsx`
  - Modify: `src/contribute/ContributeForm.tsx`

  **Approach:**
  - Create an `ExampleSubmission` component using `<details>/<summary>` elements.
  - Three examples: one person (Dario Amodei), one org (Anthropic), one resource (Situational Awareness).
  - Each example shows formatted fields matching the form layout.
  - Include @mention hover cards that use the entity cache to show entity details on hover.
  - Render above the form in ContributeForm.tsx, toggled by active tab.

---

- [ ] **Unit 6: Add conditional detail textarea for regulatory stance**

  **Goal:** Selecting "Other" or "Mixed/unclear" for regulatory stance reveals a detail textarea.

  **Files:**
  - Modify: `src/contribute/PersonForm.tsx`
  - Modify: `src/contribute/OrganizationForm.tsx`

  **Approach:**
  - Watch the `regulatoryStance` field value via RHF `watch()`.
  - When value is "Other", "Mixed/unclear", or "Mixed/nuanced", render a textarea below the dropdown.
  - The textarea maps to `regulatoryStanceDetail` in the form data (maps to `belief_regulatory_stance_detail` in the DB).

---

- [ ] **Unit 7: Wire DuplicateDetection into forms**

  **Goal:** Typing in the Name field shows existing entity matches with "View existing" and "Add info" buttons.

  **Files:**
  - Modify: `src/contribute/PersonForm.tsx`
  - Modify: `src/contribute/OrganizationForm.tsx`
  - Modify: `src/contribute/ResourceForm.tsx`

  **Approach:**
  - Import and render `DuplicateDetection` component, passing `watch('name')` as query, entity type, and callbacks for view/update actions.
  - Position below the Name field.
  - `onUpdateExisting` should trigger update mode (set updateContext in ContributeForm).

---

- [ ] **Unit 8: Enable auto-save**

  **Goal:** Form state persists to localStorage and restores on page load.

  **Files:**
  - Modify: `src/contribute/ContributeForm.tsx`
  - Modify: `src/hooks/useAutoSave.ts`

  **Approach:**
  - Set `enabled={true}` on useAutoSave (it's currently disabled for coexistence, but coexistence is over since contribute.html is fully React).
  - Test: fill some fields → navigate away → return → fields restored with "Draft restored" toast.

---

- [ ] **Unit 9: Add honeypot field and fix submission payload**

  **Goal:** Include the `_hp` honeypot field in form submission for spam prevention. Ensure the submission payload matches the exact API contract.

  **Files:**
  - Modify: `src/contribute/PersonForm.tsx` (and Org/Resource)

  **Approach:**
  - Add a hidden `_hp` input (`position: absolute; left: -9999px`).
  - Verify the `onSubmit` handler builds the correct camelCase `data` object matching the API contract: `{ type, timestamp, data: { ...fields }, _hp }`.
  - Include `affiliatedOrgIds` as JSON array, checkbox groups as comma-separated strings.

---

- [ ] **Unit 10: Browser test all contribute form interactions**

  **Goal:** Comprehensive agent-browser testing of every form interaction.

  **Approach:**
  - Test each form type (person/org/resource) tab switching
  - Test CustomSelect open/search/select/deselect
  - Test pill toggle select/deselect
  - Test TipTap formatting toolbar (bold, italic, lists, links)
  - Test TipTap @mention search + selection
  - Test name field duplicate detection
  - Test auto-save persistence across page reloads
  - Test form submission (requires dev-server.js running)
  - Test info tooltips on hover
  - Test example section expand/collapse
  - Test clear form functionality
  - Screenshot each state for documentation

### Phase 2: Map Page (Deferred)

- [ ] **Unit 11: Map page — keep inline, document migration path**

  The map.html stays as 5,743 lines of inline HTML/CSS/JS. It works perfectly under Vite MPA mode. A proper D3-to-React migration requires:
  - React shell with SVG ref for D3 force simulation
  - React components for: controls sidebar, filters, search, detail panel, contribute panel
  - D3 only manages the SVG element contents
  - This is a multi-week project separate from this migration

### Phase 3: CI/CD

- [ ] **Unit 12: Update deploy workflow for Vite build**

  **Files:**
  - Modify: `.github/workflows/deploy.yml`

  **Approach:**
  - Add `vite build` step after `build:tiptap`
  - For migrated pages (all except map.html): serve from `dist/`
  - For map.html: copy directly from repo root to `dist/` (Vite's MPA output handles this automatically since map.html is an input entry)
  - Write `.env.production` BEFORE `vite build`
  - Run `sed` on `dist/` output for map.html's password hash/analytics token
  - Keep `build:tiptap` for now (TipTap IIFE bundle still loaded by map.html's contribute iframe)
  - Update S3 sync cache headers for hashed assets

## Key Technical Decisions

- **Map stays inline** — Attempting to extract the D3 engine broke the page. The engine is 4,378 lines that create all UI elements dynamically. It cannot be simply moved to a separate file. Vite MPA mode serves it correctly as-is.
- **useRef for form callbacks** — The `forms` object in ContributeForm was recreated every render, causing infinite loops in useCallback. Fixed with `formsRef.current`.
- **TanStack Form not needed** — The feature gaps are UI/content issues (tooltips, examples, pending search), not form library limitations. React Hook Form handles the form state correctly.

## Verification

The migration is complete when:
1. All contribute form interactions match the original (visual parity + functional parity)
2. Map page renders identically to production (it does — inline HTML unchanged)
3. All 7 pages load in `vite dev` and `vite build` + `npx serve dist/`
4. CI/CD deploys the Vite-built site to S3 + CloudFront
5. Tests pass (28 existing + new tests for feature-parity fixes)

## Sources

- Original plan: `docs/plans/2026-04-13-001-feat-vite-react-migration-plan.md`
- Branch: `feat/react-contribute` (16 commits)
- Original contribute.html (pre-migration): `git show 04c3393^:contribute.html`
