---
title: 'feat: Deep slug URLs and static image export'
type: feat
status: active
date: 2026-05-04
origin: docs/brainstorms/2026-05-04-deep-slugs-and-image-export-requirements.md
---

# feat: Deep slug URLs and static image export

## Overview

Replace opaque `?entity=person/42` query-param deep links with human-readable path-based URLs (`/map/person/dario-amodei`) backed by a persistent DB slug column. Add a download button that exports the current map or plot canvas view as a 2x PNG.

## Problem Frame

Stakeholders share entity links in emails, Slack, and reports. The current `?entity=person%2F42` format is hard to read, impossible to remember, and invisible to search engines. Clean URLs like `/map/person/dario-amodei` make links self-documenting and shareable. Separately, users presenting map findings have no way to export what they see as a static image for slides, reports, or social sharing.

(see origin: docs/brainstorms/2026-05-04-deep-slugs-and-image-export-requirements.md)

## Requirements Trace

- R1. Entity URLs: `/map/{type}/{name-slug}` where type is `person`, `org`, or `resource`
- R2. `slug` column on entity table, generated on creation, backfilled for existing rows
- R3. Slugs unique per entity type; same-type collisions get `-2`, `-3` suffixes
- R4. Opening a slug URL zooms to entity, highlights connections, opens detail panel
- R5. Share button copies the slug-based URL
- R6. Old `?entity=person/42` links still work as fallback
- R7. `map-data.json` includes slug field in skeleton (not detail-only)
- R8. Cloudflare Pages routing rewrites `/map/{type}/{slug}` to serve `map.html`
- R9. Download button exports current view as 2x PNG
- R10. Export captures current filter/selection/zoom state (WYSIWYG)
- R11. Both network and plot views support export (both are canvas-based)
- R12. Downloaded file named by view context (e.g., `mapping-ai-network-all.png`)

## Scope Boundaries

- No server-side rendering or OG image generation
- No resolution picker; single 2x export
- No detail-panel-as-card export
- No admin slug editing UI
- No redirect from old `?entity=` URLs to slug URLs; both formats just work
- No `history.pushState` URL updates when clicking between entities (deferred; current behavior is deep link resolution on page load only)

## Context & Research

### Relevant Code and Patterns

- **DB migrations**: `scripts/migrate.js` — single-file idempotent migrations with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in the `4b` section (line 174)
- **Entity creation trigger**: `scripts/migrate.js` line 327 — `before_submission_update()` PL/pgSQL trigger auto-inserts entity rows when a submission is approved. The INSERT lists all columns explicitly
- **Export pipeline**: `api/export-map.ts` — `toFrontendShape()` (line 89) is the explicit allowlist mapping DB columns to frontend fields. `DETAIL_FIELDS` set (line 285) controls skeleton vs. detail split
- **Deep linking**: `src/map/engine.js` lines 609-643 — `buildSlugMaps()`, `getEntitySlug()`, `getDeepLinkUrl()`, `resolveDeepLink()` all use ID-based `person/42` keying with `?entity=` query params
- **Share**: `src/map/engine.js` lines 994-1041 — `shareEntity()` copies URL via clipboard/Web Share API
- **Canvas rendering**: `src/map/engine.js` — both network and plot views render to a single `<canvas>` element with DPR scaling. Canvas accessible via `document.querySelector('#map-container canvas')`
- **Map controls UI**: `src/map/App.tsx` line 770 — zoom controls div; new buttons go adjacent
- **Cloudflare routing**: No `_redirects` file exists yet; `public/_headers` does. Pages Functions at `functions/` serve API and R2 data
- **Admin approve flow**: `functions/api/admin.ts` line 238 — updates submission status, trigger creates entity, then `refreshMapData()` regenerates map-data.json to R2
- **Type definitions**: `src/shared/db-types.ts` (`DbEntityRow`), `src/types/entity.ts` (`Entity`)

### Institutional Learnings

- **Prior slug attempt failed**: `docs/solutions/best-practices/mobile-entity-directory-replacing-d3-map-2026-04-08.md` documents that name-based URL slugs were tried and abandoned for ID-based links due to collision issues. The DB-stored slug approach with uniqueness constraints addresses this.
- **Canvas CORS taint risk**: `docs/solutions/ui-bugs/canvas-sprite-dimming-and-cache-invalidation.md` documents that thumbnails loaded without `crossOrigin` on preview deploys cause CORS failures. `canvas.toBlob()` will throw `SecurityError` on a tainted canvas. Production is same-origin (safe), but preview deploys need attention.
- **D3 defer post-mortem**: `docs/post-mortems/2026-04-09-d3-defer-map-outage.md` mandates browser-testing all map.html changes. Asset path resolution must work from rewritten paths like `/map/person/slug`.

## Key Technical Decisions

- **`_redirects` splat rules for routing** (not Pages Function): Cloudflare Pages `_redirects` supports `200` status rewrites (serve different content without changing the URL). Three rules (`/map/person/*`, `/map/org/*`, `/map/resource/*` → `/map.html 200`) handle all slug paths with zero compute cost. A Pages Function catch-all would work but adds unnecessary complexity. The `_redirects` file goes in `public/` so Vite copies it to `dist/`.

- **Application-level slug generation** (not PL/pgSQL trigger): The `before_submission_update` trigger already lists every column explicitly in its INSERT. Adding PL/pgSQL slugification (with `unaccent`, collision detection, and suffix logic) is complex. Instead, generate slugs in JS: after the trigger creates the entity (with `slug = NULL`), the admin handler generates and sets the slug before calling `refreshMapData()`. A shared JS slugify utility handles unicode normalization. Enrichment scripts use the same utility.

- **Composite unique index `(entity_type, slug)`**: Slugs are unique within each type, not globally. This allows (unlikely but possible) `person/openai` and `org/openai` to coexist without conflict.

- **`canvas.toBlob()` for export** (not `toDataURL()`): Async, better memory behavior for large canvases, and directly produces a downloadable Blob. The canvas already renders at DPR resolution, so on Retina displays the export is automatically high-res.

- **Both views share the same export path**: Research confirmed both network and plot views now render to Canvas 2D (plot was migrated from SVG). A single `canvas.toBlob()` call handles both uniformly.

## Open Questions

### Resolved During Planning

- **Slugify library vs. custom function**: Use a lightweight custom function. The project has minimal dependencies for the map layer, and slug generation is simple: `normalize('NFD')` → strip combining marks → lowercase → replace non-alphanumeric with hyphens → collapse multiple hyphens → trim. No npm package needed.

- **Plot view uses SVG?**: No, research confirmed both views now use Canvas 2D. R11 is simpler than originally expected.

- **Asset paths from rewritten URLs**: Vite's build output uses absolute paths (starting with `/`). Serving `map.html` at `/map/person/dario-amodei` will not break asset loading. The D3 CDN script tag also uses an absolute URL.

- **Canvas taint on production**: Thumbnails are served from `mapping-ai.org/thumbnails/` (same-origin). `canvas.toBlob()` will work without CORS issues on production. Preview deploys may have cross-origin taint; acceptable limitation for now.

### Deferred to Implementation

- **Exact collision resolution query**: The backfill script needs to detect existing slugs per entity type and append suffixes. The exact SQL for this depends on the iteration approach (batch vs. per-row).
- **Edge case: entities with no name**: Resources use `title` instead of `name`. The slugify utility must accept either field. Entities with neither field (shouldn't exist in approved data) get a fallback slug like `entity-{id}`.
- **Dev server Vite plugin ordering**: The middleware rewrite must run before Vite's static file serving. Verify during implementation.

## Implementation Units

- [ ] **Unit 1: DB migration — add slug column**

  **Goal:** Add the `slug` column to the entity table with a composite unique index.

  **Requirements:** R2, R3

  **Dependencies:** None

  **Files:**
  - Modify: `scripts/migrate.js`
  - Modify: `src/shared/db-types.ts`
  - Modify: `src/types/entity.ts`

  **Approach:**
  - Append two statements to the `4b. Schema migrations` section in `migrate.js`: `ALTER TABLE entity ADD COLUMN IF NOT EXISTS slug VARCHAR(250)` and `CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_type_slug ON entity(entity_type, slug)`.
  - Add `slug: string | null` to `DbEntityRow` in `db-types.ts` and to the `Entity` interface in `entity.ts`.
  - The column is nullable because existing entities won't have slugs until the backfill runs.

  **Patterns to follow:**
  - Existing `ALTER TABLE` statements in `migrate.js` lines 174-186
  - Column type pattern: `VARCHAR(250)` matches the existing `name VARCHAR(200)` with extra room for suffixes

  **Test scenarios:**
  - Happy path: Running `pnpm run db:migrate` succeeds and the column + index exist afterward
  - Edge case: Running migrate twice is idempotent (both `ADD COLUMN IF NOT EXISTS` and `CREATE ... IF NOT EXISTS`)

  **Verification:**
  - `\d entity` in psql shows the slug column
  - The unique index appears in `\di` output

- [ ] **Unit 2: Slug generation utility and backfill script**

  **Goal:** Create a shared slugify function and a one-time backfill script that generates slugs for all existing entities.

  **Requirements:** R2, R3

  **Dependencies:** Unit 1

  **Files:**
  - Create: `src/shared/slugify.ts`
  - Create: `scripts/backfill-slugs.ts`

  **Approach:**
  - `slugify.ts` exports a `slugify(text: string): string` function: NFD normalize → strip combining marks (regex `[̀-ͯ]`) → lowercase → replace non-alphanumeric sequences with single hyphens → trim leading/trailing hyphens.
  - `slugify.ts` also exports `generateEntitySlug(name: string, entityType: string, existingSlugs: Set<string>): string` that calls `slugify()` and appends `-2`, `-3`, etc. if the base slug already exists in the set.
  - `backfill-slugs.ts` fetches all entities grouped by `entity_type`, generates slugs in ID order (first entity gets the base slug, later collisions get suffixes), and batch-UPDATEs. Uses the DB connection pattern from existing scripts (`pg.Pool` with `DATABASE_URL`).
  - Entity name source: `name` for people/orgs, `resource_title` or `title` or `name` for resources (matching the `toFrontendShape` logic).

  **Patterns to follow:**
  - Existing script structure in `scripts/export-map-data.ts` (pool setup, async main, cleanup)
  - The `toFrontendShape` name resolution for resources at `api/export-map.ts` line 123

  **Test scenarios:**
  - Happy path: `slugify("Dario Amodei")` → `"dario-amodei"`
  - Edge case: accented characters: `slugify("Yoshua Bengio")` → `"yoshua-bengio"`, `slugify("François Chollet")` → `"francois-chollet"`
  - Edge case: special characters: `slugify("O'Brien & Associates")` → `"obrien-associates"`
  - Edge case: collision handling: two entities named "John Smith" (same type) → `"john-smith"` and `"john-smith-2"`
  - Edge case: entity with empty/null name → fallback slug `"entity-{id}"`
  - Edge case: CJK or entirely non-Latin names → produce a reasonable slug (may be empty after stripping; fall back to `"entity-{id}"`)
  - Happy path: backfill script sets slugs for all approved entities and reports count

  **Verification:**
  - After running `pnpm run db:migrate && npx tsx scripts/backfill-slugs.ts`, every entity with `status = 'approved'` has a non-null slug
  - No duplicate `(entity_type, slug)` pairs exist: `SELECT entity_type, slug, COUNT(*) FROM entity GROUP BY 1,2 HAVING COUNT(*) > 1` returns zero rows

- [ ] **Unit 3: Data pipeline — include slug in map-data.json**

  **Goal:** Add the slug field to the export pipeline so it appears in `map-data.json` skeleton data.

  **Requirements:** R7

  **Dependencies:** Unit 1

  **Files:**
  - Modify: `api/export-map.ts`

  **Approach:**
  - Add `slug: row.slug` to the `toFrontendShape()` output object (after `name` field, around line 94).
  - Slug is NOT in `DETAIL_FIELDS`, so it stays in the skeleton by default.
  - The `RawEntityRow` type alias (if it exists as a separate type) or the raw query result both include `slug` after the migration.

  **Patterns to follow:**
  - Existing field mapping in `toFrontendShape()` at `api/export-map.ts` lines 89-149

  **Test scenarios:**
  - Happy path: after re-exporting (`pnpm run db:export-map`), `map-data.json` entities include a `slug` field
  - Happy path: slug appears in the skeleton file, not only in the detail file

  **Verification:**
  - `jq '.people[0].slug' map-data.json` returns a non-null string
  - `jq '.organizations[0].slug' map-data.json` returns a non-null string

- [ ] **Unit 4: Cloudflare Pages routing + Vite dev server**

  **Goal:** Make `/map/person/{slug}`, `/map/org/{slug}`, and `/map/resource/{slug}` serve `map.html` in both production (Cloudflare Pages) and development (Vite dev server).

  **Requirements:** R8

  **Dependencies:** None (can be done in parallel with DB work)

  **Files:**
  - Create: `public/_redirects`
  - Modify: `vite.config.ts`

  **Approach:**
  - Create `public/_redirects` with three rewrite rules:
    ```
    /map/person/* /map.html 200
    /map/org/* /map.html 200
    /map/resource/* /map.html 200
    ```
    Cloudflare Pages evaluates `_redirects` before filesystem lookup. The `200` status code means "rewrite" (serve the target content at the original URL) rather than "redirect."
  - Add a Vite plugin in `vite.config.ts` that adds server middleware to rewrite `/map/(person|org|resource)/*` to `/map.html` during development. This must be added using the `configureServer` hook so it runs before Vite's built-in static file serving.
  - Verify that assets (JS, CSS, D3 CDN) still load correctly from rewritten paths. Since all paths in the built output are absolute (`/assets/...`), this should work without changes.

  **Patterns to follow:**
  - Existing `public/_headers` file for the Cloudflare Pages convention
  - Vite `configureServer` plugin API for dev server middleware

  **Test scenarios:**
  - Happy path: `curl -s https://preview-url/map/person/test-slug` returns the map.html content with 200 status
  - Happy path: `curl -s http://localhost:5173/map/person/test-slug` returns map.html in dev mode
  - Edge case: `/map/person/` (trailing slash, no slug) still serves map.html without error
  - Edge case: `/map` without any slug suffix still works as before (serves `map.html` directly)
  - Edge case: existing routes (`/map.html`, `/api/*`, `/data/*`) are not affected by the rewrite rules

  **Verification:**
  - The map loads and D3 initializes when accessing `/map/person/anything` in the browser
  - All CSS, JS, and image assets load correctly (no 404s in the network tab)

- [ ] **Unit 5: Client-side deep link resolution with slug URLs**

  **Goal:** Update the deep linking code in `engine.js` to resolve entities from path-based slug URLs while maintaining `?entity=` fallback.

  **Requirements:** R1, R4, R5, R6

  **Dependencies:** Unit 3 (slug field in map-data.json), Unit 4 (routing serves map.html)

  **Files:**
  - Modify: `src/map/engine.js`

  **Approach:**
  - Modify `buildSlugMaps()` to build two lookup maps: the existing ID-based map (`"person/42" → entity`) for fallback, and a new slug-based map (`"person/dario-amodei" → entity`) using the slug field from map-data.json. The `typePrefix` mapping stays the same: `{ person: 'person', organization: 'org', resource: 'resource' }`.
  - Modify `resolveDeepLink()` to first check `window.location.pathname` for a match against `/map/(person|org|resource)/(.+)`. If the path matches, look up the slug in the slug-based map. If no path match, fall back to reading the `?entity=` query param and looking up in the ID-based map. This gives R6 backward compatibility.
  - Modify `getEntitySlug(d)` to return `typePrefix + "/" + d.slug` (falling back to `typePrefix + "/" + d.id` if slug is null).
  - Modify `getDeepLinkUrl(d)` to construct `origin + "/map/" + getEntitySlug(d)` (path-based URL, no query param). This changes the share URL format (R5).
  - The existing deep link resolution behavior (zoom to entity at 3x scale, highlight connections, open detail panel) does not change. Only the URL parsing and URL construction change.

  **Patterns to follow:**
  - Existing deep link code structure at `engine.js` lines 609-643
  - The `resolveDeepLink()` call sites: desktop at line ~1650 and mobile at line ~1580

  **Test scenarios:**
  - Happy path: visiting `/map/person/dario-amodei` zooms to Dario Amodei's node and opens the detail panel
  - Happy path: visiting `/map/org/anthropic` zooms to the Anthropic org node
  - Happy path: visiting `/map?entity=person/42` (old format) still resolves correctly
  - Edge case: visiting `/map/person/nonexistent-slug` gracefully shows the map without selecting an entity (no error)
  - Edge case: entity with no slug (null) falls back to ID-based URL in share link
  - Happy path: clicking the share button copies a URL in the format `https://mapping-ai.org/map/person/dario-amodei`
  - Integration: share URL → paste in new tab → entity loads correctly (round-trip test)

  **Verification:**
  - Browser-test: navigate to a slug URL, verify zoom + detail panel + highlighted connections
  - Browser-test: navigate to an old `?entity=` URL, verify it still works
  - Browser-test: share button copies the new URL format

- [ ] **Unit 6: Slug generation on entity approval**

  **Goal:** Generate and persist a slug whenever a new entity is created through the admin approval flow.

  **Requirements:** R2, R3

  **Dependencies:** Unit 1 (slug column), Unit 2 (slugify utility)

  **Files:**
  - Modify: `functions/api/admin.ts`

  **Approach:**
  - After the existing `UPDATE submission SET ... status = 'approved'` call (which fires the trigger and creates the entity), query for the newly created entity's ID and name. The trigger sets `submission.entity_id`, so re-read the submission to get the entity ID.
  - Fetch existing slugs for that entity type to detect collisions.
  - Call `generateEntitySlug(name, entityType, existingSlugs)` from the shared utility.
  - UPDATE the entity to set the slug.
  - This runs before `refreshMapData()`, so the slug is included in the next map-data.json export.
  - The same pattern applies to any other admin paths that create entities (currently only the approve flow creates new entities; merge updates existing ones).

  **Patterns to follow:**
  - The admin handler's existing post-trigger flow at `functions/api/admin.ts` lines 238-264
  - Import convention: the admin handler already imports from `../../api/export-map`. The slugify utility at `src/shared/slugify.ts` can be imported similarly.

  **Test scenarios:**
  - Happy path: approving a new submission creates an entity with a generated slug matching the name
  - Edge case: approving a submission whose name collides with an existing entity's slug (same type) gets a `-2` suffix
  - Edge case: approving a submission with accented characters produces a clean ASCII slug
  - Happy path: the slug appears in map-data.json after the admin handler calls `refreshMapData()`

  **Verification:**
  - Approve a test submission via the admin UI, then verify `SELECT slug FROM entity WHERE id = <new_id>` returns a non-null, well-formed slug

- [ ] **Unit 7: Static image export button and download**

  **Goal:** Add a download button to the map controls that exports the current canvas view as a 2x-resolution PNG.

  **Requirements:** R9, R10, R11, R12

  **Dependencies:** None (independent of slug work)

  **Files:**
  - Modify: `src/map/App.tsx`
  - Modify: `src/map/engine.js`
  - Modify: `src/map/map.css`

  **Approach:**
  - Add a download button in `App.tsx` next to the zoom controls div (after line 780). Use an `id` attribute (e.g., `download-map`) so `engine.js` can attach the click handler imperatively, matching the existing pattern for zoom buttons and theme toggle.
  - In `engine.js`, attach a click handler to `#download-map` during initialization. The handler:
    1. Gets the canvas element from the DOM (`document.querySelector('#map-container canvas')`)
    2. Calls `canvas.toBlob(callback, 'image/png')` — this captures the current visual state including all filters, selections, dimming, and zoom (WYSIWYG per R10)
    3. Creates a download link: `URL.createObjectURL(blob)` → create `<a>` element with `download` attribute → click → revoke URL
    4. Filename follows R12 pattern: construct from current view mode and sub-view. For network view: `mapping-ai-network-{subView}.png` (e.g., `mapping-ai-network-all.png`). For plot view: `mapping-ai-plot-{xAxis}-vs-{yAxis}.png`.
  - The canvas DPR handling means exports are already at device resolution (2x on Retina). No additional scaling needed. For 1x-DPR displays, consider drawing to a temporary 2x canvas if 2x export is required regardless of device.
  - Style the download button to match the zoom buttons (`.zoom-btn` class) with a download icon (down-arrow SVG or unicode ⬇).

  **Patterns to follow:**
  - Zoom button DOM structure and event wiring in `App.tsx` and `engine.js`
  - The `_canvasSel`, `currentView`, and sub-view state variables in `engine.js` for filename construction
  - Toast notification pattern from `shareEntity()` for success feedback

  **Test scenarios:**
  - Happy path: clicking the download button on the network "All" view downloads `mapping-ai-network-all.png`
  - Happy path: clicking download on the plot view downloads a file named with the plot axes
  - Happy path: exported image matches what's visible on screen (filtered nodes, dimmed selections, zoom level)
  - Edge case: export on a 1x-DPR display still produces a usable image (may be 1x unless explicitly upscaled)
  - Edge case: download button is hidden on mobile (canvas is not rendered on mobile; it uses the directory view)
  - Edge case: canvas with many nodes (500+) exports without hanging the browser (`toBlob` is async)
  - Integration: apply a category filter → click download → the PNG shows only filtered entities

  **Verification:**
  - Browser-test: click download, open the PNG, verify it matches the on-screen view
  - Check that the download works in both network and plot view modes
  - Verify the download button doesn't appear on mobile

## System-Wide Impact

- **Interaction graph:** The admin approve flow (`admin.ts` → trigger → entity INSERT) gains a post-insert slug generation step. This is a synchronous addition before `refreshMapData()` and does not affect other admin actions (merge, reject, update). The `refreshMapData()` → `toFrontendShape()` path gains the slug field output.
- **Error propagation:** If slug generation fails (unexpected: it's string manipulation), the entity is still created with `slug = NULL`. The client falls back to ID-based URLs. No approval flow should fail because of a slug error.
- **State lifecycle risks:** The backfill is a one-time operation. After that, new entities get slugs on approval. Entities created by enrichment scripts need to call the slugify utility explicitly or they'll have NULL slugs (graceful degradation via ID fallback).
- **API surface parity:** The search API (`/api/search`) returns entity data but doesn't need slug changes since it's not used for URL construction.
- **Integration coverage:** The critical round-trip path is: approve entity → slug generated → map-data.json refreshed → client loads data → slug URL resolves to entity → share copies slug URL. Test this end-to-end after all units are complete.

## Risks & Dependencies

- **Cloudflare `_redirects` ordering**: Redirects are evaluated top-to-bottom, first match wins. The slug rewrite rules must not shadow `/map` itself. Since the rules require a type prefix (`/map/person/*`), bare `/map` is unaffected. Verify on a preview deploy.
- **Canvas taint on preview deploys**: If thumbnails load cross-origin on `*.mapping-ai.pages.dev`, `canvas.toBlob()` will throw. This is an acceptable limitation for preview environments; document it. Production uses same-origin thumbnails and is unaffected.
- **Slug stability**: Once shared, a slug URL is a permanent link. If an entity's name changes, the slug should NOT auto-update (that would break existing links). The slug is set once on creation. Admin slug editing is out of scope but supported by the DB column for future use.
- **Enrichment scripts**: Scripts that directly INSERT entities bypass the admin approval flow and won't auto-generate slugs. The backfill script catches up any entities with NULL slugs. Over time, enrichment scripts should be updated to use the slugify utility.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-04-deep-slugs-and-image-export-requirements.md](docs/brainstorms/2026-05-04-deep-slugs-and-image-export-requirements.md)
- Prior slug attempt: `docs/solutions/best-practices/mobile-entity-directory-replacing-d3-map-2026-04-08.md`
- Canvas CORS taint: `docs/solutions/ui-bugs/canvas-sprite-dimming-and-cache-invalidation.md`
- D3 defer post-mortem: `docs/post-mortems/2026-04-09-d3-defer-map-outage.md`
- Cloudflare Pages `_redirects`: Cloudflare docs on Pages redirects (200 rewrites are supported)
