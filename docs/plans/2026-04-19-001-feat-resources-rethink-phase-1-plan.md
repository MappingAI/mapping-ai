---
title: 'feat: Resources Rethink — Phase 1 (Library page, multi-tag schema, advocated beliefs, map cleanup)'
type: feat
status: active
date: 2026-04-19
deepened: 2026-04-19
origin: docs/brainstorms/2026-04-19-resources-rethink-requirements.md
---

# feat: Resources Rethink — Phase 1 (Library page, multi-tag schema, advocated beliefs, map cleanup)

## Overview

Resources on mapping-ai are under-modelled (single-value format as category, no topic taxonomy, no advocated beliefs) and rendered using the wrong spatial model (force-directed graph built for actors). Phase 1 ships:

1. A schema upgrade: multi-value `topic_tags` and `format_tags` Postgres arrays, three advocated-belief fields (`advocated_stance`, `advocated_timeline`, `advocated_risk`), and `source` / `source_url` attribution columns for ingested resources.
2. A new `/library` Vite MPA page with faceted search, grid/list display modes, a detail panel, a secondary reading-tracks tab, and a pinned "sister ecosystem maps" section.
3. Cleanup of `map.html`: the standalone Resources sub-tab is removed, resources show edges-only by default in the Network All view with a toggle, and Library joins the global site navigation.

Product decisions are locked in the origin document (see origin: `docs/brainstorms/2026-04-19-resources-rethink-requirements.md`). Enrichment (LLM-powered tag/stance proposal) and sister-map ingest scripts are Phase 2.

## Problem Frame

Today 154 approved resources exist alongside 1,423 people+orgs. Only 120 edges touch a resource, so resources average under one connection and render as floating islands in the force-directed map. The nine `resource_type` values (Book, Podcast, Essay, etc.) are format descriptors, not topical groupings. There is no belief signal on resources, so they cannot be filtered, compared, or plotted the way actors can.

Newcomers lose the best on-ramp ("read these ten things"). Researchers cannot filter. Contributors are pushed to pick a single category for items that genuinely span multiple formats and topics. Sister ecosystem maps (CAIDP, MIT, IAPP, Gabriel's) are invisible inside the product.

Full framing: see origin doc's "Problem Frame" section.

## Requirements Trace

Carrying forward the 18 requirements from the origin document.

- **R1-R6b.** Library surface: new `/library` page, faceted filtering, grid + dense list display modes, detail panel, reading-tracks secondary tab, sister maps as first-class resources with a highlighted pinned section, optional one-off ingest with source attribution.
- **R7-R10.** Taxonomy: hybrid curated-core + emergent topic tags, multi-value format tags, no single category on resources.
- **R11-R13.** Advocated beliefs: nullable `advocated_stance` / `advocated_timeline` / `advocated_risk`, filters tolerate nulls, optional at submission.
- **R14-R16.** Map integration: resources sub-tab removed, in-All edges-only default with toggle, detail view shared with library.
- **R17-R18.** UI-first MVP: library ships before enrichment is complete; admin enrichment workflow spec'd but not built in Phase 1.

## Scope Boundaries

Phase 1 **does not** include:

- LLM enrichment pipeline (Claude Haiku proposing tags / stance), or the admin review queue for it.
- Sister-map structured-data ingest scripts. The library hosts these maps as manually-created resources with `source` attribution; automated ingest is Phase 2.
- Admin tag-merge / tag-promotion tooling. Admins merge via SQL or the existing admin edit form in Phase 1.
- Contributor-submitted reading tracks. Tracks are repo-committed JSON in Phase 1.
- Full per-resource wiki pages. Detail view is a panel / modal.
- Changes to person / organisation belief modelling. Advocated-belief fields are parallel, distinct columns.
- Cross-resource "read next" recommendations. Sequencing lives inside tracks only.

## Context & Research

### Relevant Code and Patterns

**Vite MPA page convention**

- Entries hand-listed in `vite.config.ts` `build.rollupOptions.input` (lines 15-24). Auto-discovery is not used.
- Existing page skeletons: `about.html` + `src/about/{main.tsx, App.tsx}` (simplest); `insights.html` + `src/insights/` (data-heavy reference). TanStack Query providers are created locally per page, not shared (see `src/admin/App.tsx` line 9).
- Global site nav: `src/components/Navigation.tsx` `NAV_LINKS` array (lines 4-9). Currently lists `/`, `/contribute`, `/map`, `/about`. `/library` needs adding here.
- Deploy smoke-test path list: `.github/workflows/deploy.yml` lines 132-152 hardcodes `/ /contribute /map /about /insights /admin`. Must add `/library`.

**Schema + migration pattern**

- Single migration runner: `scripts/migrate.js`. Pattern for additive columns: `ALTER TABLE … ADD COLUMN IF NOT EXISTS …` (lines 160-162, 176). Triggers and functions use `CREATE OR REPLACE FUNCTION` + `DROP TRIGGER IF EXISTS … CREATE TRIGGER`.
- DB→frontend field mapping layer: `api/export-map.js` `toFrontendShape()`. Flagged in CLAUDE.md as "fragile … any schema change must update this mapping or the map/plot will break silently."
- `search_vector` trigger (`update_entity_search`, migrate.js 370-386) concatenates named columns. Must be extended to include new tag columns.
- Admin-edit allowlist: `api/admin.js` `ENTITY_FIELDS` (lines 60-69). Any field not listed is silently dropped on `update_entity`.

**Multi-tag precedent**

- No existing Postgres array usage. Only "multi-ish" column is `other_categories TEXT` (CSV or JSON-array string). `parseOtherCategories(raw)` in `map.html:2560` already tolerates both serializations.
- `TagInput` component (`src/components/TagInput.tsx`) supports tags backed by searchable reference data (orgs, authors, locations). Emergent-tag support requires either the `renderTrailingOption(query)` hook or caller-side synthetic results in `searchFn`.
- React Hook Form integration pattern: `<Controller>` wraps TagInput; callers serialize `Tag[] → CSV string` ad-hoc in `ResourceForm.tsx:113-116` etc. There is no shared `Tag[] → Postgres-array` helper today.

**Client-side cache + search**

- `useEntityCache()` (`src/hooks/useEntityCache.ts:31`) already merges `people + organizations + resources` into a unified `{ entities, byId }` with `staleTime: Infinity`. `/library` can filter on `entity_type === 'resource'` with no new API.
- `fuzzySearch()` (`src/lib/search.ts:34`) with resource field list `['title', 'author', 'category', 'notes']`. Must be extended to include `key_argument` + topic/format tags for R2.

**map.html tab + view system**

- Top-level mode tabs at lines 886-897 (`.mode-btn[data-mode]`); Network sub-tabs at 899-904 (`.view-btn[data-view]`). localStorage keys: `mapMode`, `mapSubView`.
- `getVisibleNodes()` at line 3093 is the single branch point that decides what renders. `'resources'` branch at 3221-3230; `'all'` branch at 3231-3265. Resources render without any connectivity filter today.
- Node-click detail: `showDetail(d, nodes)` at line 4347; resource branch at 4413-4432.
- `parseOtherCategories` at line 2560 handles CSV and JSON-array strings — extending to parse Postgres-array JSON (same JSON shape) is zero-risk.

### Institutional Learnings

- **`docs/solutions/integration-issues/vite-react-typescript-migration-from-inline-html-2026-04-15.md`** — blueprint for new MPA entry. Reuse shared components; new TS types must mirror `toFrontendShape()` output.
- **`docs/post-mortems/2026-04-09-d3-defer-map-outage.md`** — CRITICAL for map.html edits. Inline map code runs during parsing and depends synchronously on D3 loaded. Never add `defer`/`async`. Manually browser-test map.html after every edit.
- **`docs/solutions/best-practices/mobile-entity-directory-replacing-d3-map-2026-04-08.md`** — establishes that map.html shared helpers (`resolveEntityImage`, `buildConnections`, `escHtml`, `shareEntity`) are used by desktop + mobile and the deep-link shape `?entity=type/id`. Library page should follow the same deep-link convention if it links into individual entities.
- **`docs/solutions/integration-issues/thumbnail-pipeline-dead-cloudfront-and-external-fallbacks-2026-04-19.md`** — Library must read `entity.thumbnail_url` only. `''` is the "tried, no image" sentinel (render placeholder). No live Wikipedia / Favicon calls. No hardcoded CloudFront subdomains.
- **`docs/solutions/integration-issues/sam-deploy-overwrites-manual-cloudfront-config-2026-04-16.md`** — if Phase 1 Lambda changes ship, use `--no-execute-changeset` and drift detection. Prefer targeted `aws lambda update-function-code` over full `sam deploy`.
- Explicit gaps (no prior art): Postgres array columns, resource-specific belief semantics, adding `/library` to the global nav, removing a top-level map tab. Plan designs these from first principles.

### External References

Not pursued. Local patterns are sufficient for every surface of Phase 1. Repo-research-analyst confirmed strong local patterns exist for Vite MPA pages, additive schema migrations, admin-edit allowlists, and client-side faceted search over `map-data.json`.

## Key Technical Decisions

**KD1. Topic tags and format tags are Postgres `TEXT[]` with GIN indexes, not new CSV columns.**
Rationale: The whole purpose of Phase 1 is faceted search over tags. Arrays with GIN are the canonical Postgres solution (`@>` containment, fast any-of queries). CSV in TEXT works but blocks indexed containment queries and requires constant split-strings in every filter path. No precedent exists in the repo either way, so we pick the right tool rather than inheriting the `other_categories` shortcut. `other_categories` stays on people/orgs for backward compat and for the existing `parseOtherCategories` fallback in map.html.

**KD2. Resources' existing `category` / `resource_category` / `other_categories` / `resource_type` stay on the table but are deprecated for resources. Backfilled once into `topic_tags` / `format_tags` at migration time.**
Rationale: The origin doc (R10) says "drop category on resources in the UI model"; it does not require a destructive DB column drop. Keeping the columns preserves data lineage and avoids a multi-step migration. Frontend reads `topic_tags` / `format_tags` for resources going forward; `toFrontendShape()` fills them from the legacy columns when empty.

**KD3. Advocated-belief fields (`advocated_stance`, `advocated_timeline`, `advocated_risk`) are standalone TEXT columns on `entity` and `submission`, not reused `belief_*` columns.**
Rationale: The existing `belief_*_wavg / _wvar / _n` trigger machinery is designed to aggregate submitter-contributed opinions about a person/org with weighted scoring (self=10, connector=2, external=1). A resource's advocated stance is semantically different: it is "what this resource argues for", authored by one claim, not aggregated. Reusing belief\_\* columns would conflate the two models and break the aggregation trigger for resources. Cost of new columns is one extra column per dimension. Values use the same label vocabulary as `belief_regulatory_stance` etc. so filter UIs can reuse existing option lists.

**KD4. Advocated beliefs skip the `recalculate_entity_scores` trigger entirely.**
Rationale: The trigger operates on weighted averages of submission-level belief\_\*\_score fields. Advocated beliefs have no weighted-aggregation semantics. They are admin-written or (Phase 2) LLM-written scalars. The trigger does not need touching.

**KD4a. The `before_submission_update` trigger MUST be rewritten** in the same migration as the column additions, to carry the 7 new columns (topic_tags, format_tags, advocated_stance, advocated_timeline, advocated_risk, source, source_url) from submission → entity on approval.
Rationale: The existing trigger at `scripts/migrate.js:301-336` enumerates every column it copies when an admin approves a new-resource submission. Without rewriting it, contributor-submitted tags survive all the way to the approval queue and then silently vanish into a NULL-tagged entity row. Caught during deepening. Called out separately from KD3 because it is the single highest-consequence correctness bug in the plan.

**KD5. Reading tracks are JSON files under `content/tracks/*.json`, served statically from `dist/`.**
Rationale: Tracks are admin-authored low-volume (3 at launch, maybe 10 ever). A DB table + admin form is 10× the work for no user-facing difference. Git-committed JSON fits the existing editorial workflow (PR review). If Phase 2 ever needs contributor-submitted tracks, migrating to a DB is straightforward.

**KD6. Library is a global nav entry (`Navigation.tsx`), not a "mode" button on map.html.**
Rationale: Modes in map.html toggle canvas view state. Library is a separate page. Making Library a map-mode that navigates away would be an anti-pattern (mode-button that behaves like a link). Library is public-facing and belongs in `NAV_LINKS` alongside `/`, `/contribute`, `/map`, `/about`. Insights and Admin are intentionally unlisted in the global nav (reachable by URL only); Library is not — it should be discoverable. Satisfies the origin doc's "sibling top-level tab" intent via global nav rather than a per-page tab.

**KD7. Library filters run client-side over `map-data.json` via `useEntityCache()`. No new API endpoint.**
Rationale: 154 resources today, projected low-thousands after enrichment. `map-data.json` is already cached globally on CloudFront with `staleTime: Infinity`. Client-side filtering on a pre-built index is instant and requires no Lambda. The existing `fuzzySearch()` handles free-text; we extend `SEARCH_FIELDS.resource` to include `key_argument` and tag content. If scale ever demands server-side, `api/search.js` already exists and can be extended.

**KD8. Map.html change surface is minimal: remove one sub-tab, add one filter branch + toggle in `getVisibleNodes()`, add one checkbox to controls sidebar.**
Rationale: Map.html is inline D3 with production-outage history (see 2026-04-09 post-mortem). Change surface is kept to the smallest footprint that delivers R14-R16. Detail view is unchanged (still routes through `showDetail`). Node rendering path is unchanged. Only the eligibility filter in the All branch and the tab list change.

**KD9. Tag input allows emergent tags via the `TagInput`'s `renderTrailingOption` "Add '<query>' as new tag" affordance.**
Rationale: The component already supports this for "Add 'X' as new org" in org searches. Reusing the same pattern for topic and format tags keeps contributor UX consistent and requires no new widget. Admin-side tag merging is intentionally out of scope for Phase 1; admins merge via SQL.

## Open Questions

### Resolved During Planning

- **Schema shape for topic tags** (origin DT1): Postgres `TEXT[]` + GIN index. Resolved in KD1.
- **Advocated-belief storage** (origin DT2): separate `advocated_*` columns; no trigger involvement. Resolved in KD3+KD4.
- **Reading tracks storage** (origin DT3): JSON files under `content/tracks/`. Resolved in KD5.
- **Map tab refactor mechanism** (origin DT4): Library via global nav; Resources sub-tab removed; edges-only filter lives inside `getVisibleNodes()`. Resolved in KD6+KD8.
- **Faceted filter location** (origin DT5): client-side over `map-data.json`. Resolved in KD7.

### Deferred to Implementation

- Exact display vocabulary and display order for advocated-stance / timeline / risk filter chips — finalize when the filter UI is built; the canonical vocabulary may need tweaks once real resources are tagged.
- Whether the Library detail panel is a modal, a right-side slide-over, or a dedicated route — all three work; decide during UI build based on how sister-map links render naturally. If we deep-link into resources, a route is simplest; if we stay on the library page, a slide-over feels right.
- Whether the Library's free-text search should call `api/search.js` for pending-status resources (as `ContributeForm` does) in addition to local fuzzy search — likely yes for parity, but defer until the basic surface works.
- Final backfill logic for `resource_type` → `format_tags[0]` — mapping is 1:1 for the 9 existing values; confirm at implementation that there are no dirty strings in production data before running.

### Deferred to Phase 2

- Claude Haiku enrichment pipeline (origin DT6).
- Sister-map structured-data ingest scripts (origin R6b-implementation; see new deferred question in origin).
- Admin tag-merge / tag-promotion tooling.

## High-Level Technical Design

> _This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce._

### Data model

```text
entity (existing)
├── id, name, entity_type, ... (unchanged)
├── category, other_categories (kept; deprecated for resources)
├── resource_type (kept; backfilled into format_tags; deprecated)
├── belief_regulatory_stance, belief_agi_timeline, belief_ai_risk (unchanged; for people/orgs)
├── + topic_tags        TEXT[]    (GIN-indexed)
├── + format_tags       TEXT[]    (GIN-indexed)
├── + advocated_stance  TEXT      (nullable; resource-oriented)
├── + advocated_timeline TEXT     (nullable)
├── + advocated_risk    TEXT      (nullable)
├── + source            TEXT      (e.g. 'CAIDP', 'MIT-AI-Governance')
└── + source_url        TEXT      (canonical URL at the origin map)

submission (existing)
├── (mirror of entity columns)
├── + topic_tags        TEXT[]
├── + format_tags       TEXT[]
├── + advocated_stance, advocated_timeline, advocated_risk, source, source_url
```

Migration block at `scripts/migrate.js` uses `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, runs idempotently, backfills `format_tags` from `resource_type` and `topic_tags` from `(resource_category, other_categories)` for rows where `entity_type='resource'`, and adds GIN indexes.

`search_vector` trigger adds `array_to_string(topic_tags, ' ')` and `array_to_string(format_tags, ' ')` so tag content is full-text-searchable server-side. Existing rows reindex via a one-shot `UPDATE entity SET id = id WHERE entity_type = 'resource'` at the tail of the migration.

### Page structure

```text
library.html                     (repo root)
└── <div id="library-root" />    (React mount)

src/library/
├── main.tsx                     (bootstrap, ≈15 lines)
├── App.tsx                      (top-level: QueryClient, layout, tab switch Library|Tracks)
├── hooks/
│   ├── useResourceFilters.ts    (filter state + localStorage persistence)
│   └── useTracks.ts             (load content/tracks/*.json at runtime)
├── components/
│   ├── FilterRail.tsx           (topic, format, stance, timeline, risk, year)
│   ├── ResourceGrid.tsx         (visual card grid)
│   ├── ResourceList.tsx         (dense table)
│   ├── ResourceDetail.tsx       (panel/slide-over with tags, beliefs, connections)
│   ├── SisterMapsRow.tsx        (pinned highlighted sister maps)
│   └── TrackList.tsx            (curated editorial sequences)
└── (no new API; reuse useEntityCache)

content/tracks/
├── new-to-ai-policy.json
├── the-regulation-debate.json
└── alignment-foundations.json
```

### Map.html change surface (minimal diff)

```text
map.html (inline)
├── <nav id="network-sub-tabs">
│   └── REMOVE <button data-view="resources">  (line ~903)
├── getVisibleNodes() 'all' branch (line ~3231)
│   └── filter resources to those with ≥1 edge; apply showResources toggle
├── controls sidebar
│   └── ADD checkbox "Show resources in All" (localStorage: showResourcesInAll)
└── node-click path (showDetail) UNCHANGED — resources still open the existing detail panel
```

## Implementation Units

- [ ] **Unit 1: Schema migration + field mapping layer**

**Goal:** Land the DB schema changes, extend `toFrontendShape()`, extend TypeScript types, backfill existing resource data into the new columns, and update the `search_vector` trigger so tag content is full-text-searchable.

**Requirements:** R7, R8, R9, R10, R11, R12, R13, R6b (source attribution).

**Dependencies:** None (foundational).

**Files:**

- Modify: `scripts/migrate.js` (column adds, indexes, `update_entity_search` trigger, `before_submission_update` trigger, backfill, verification queries)
- Modify: `api/export-map.js` (`toFrontendShape`)
- Modify: `scripts/export-map-data.js` (add schema-presence precondition check at the top; fail loudly if new columns missing)
- Modify: `src/types/entity.ts`
- Modify: `src/types/api.ts`
- Test: `src/__tests__/lib/entity-shape.test.ts` (extend or create; verify new fields round-trip with a locked fixture)

**Approach:**

- **Pre-migration audit** (run manually before the migration, paste output into PR description):
  - `SELECT DISTINCT resource_type FROM entity WHERE entity_type='resource'` — ensures the curated `FORMAT_TAGS` list in Unit 3 is a strict superset of real data.
  - `SELECT DISTINCT resource_category, other_categories FROM entity WHERE entity_type='resource' AND (resource_category IS NOT NULL OR other_categories IS NOT NULL)` — surface any UTF-8 smart quotes, trailing commas, JSON-vs-CSV mixed serializations.
- Add new columns to `entity` via `ADD COLUMN IF NOT EXISTS`: `topic_tags TEXT[]`, `format_tags TEXT[]`, `advocated_stance TEXT`, `advocated_timeline TEXT`, `advocated_risk TEXT`, `source TEXT`, `source_url TEXT`. Mirror to `submission`.
- Add two `CREATE INDEX IF NOT EXISTS` statements creating GIN indexes on `entity.topic_tags` and `entity.format_tags`.
- **Backfill (explicit, not hand-wavy)** — runs inside the same migration transaction:
  - `format_tags`: for resources with `format_tags IS NULL AND resource_type IS NOT NULL`, set `format_tags := ARRAY[trim(resource_type)]`. Slashed values like `'Substack/Newsletter'` remain single-element arrays by design.
  - `topic_tags`: for resources with `topic_tags IS NULL`, compute as follows:
    - Normalize `other_categories` via `CASE WHEN trim(other_categories) LIKE '[%' THEN (SELECT array_agg(trim(elem)) FROM jsonb_array_elements_text(other_categories::jsonb) elem) ELSE string_to_array(other_categories, ',') END`.
    - Merge with `ARRAY[trim(resource_category)]` where non-null.
    - Apply `array_remove(array_remove(arr, ''), NULL)` to drop empty strings and nulls.
    - Trim whitespace on each element via `array_agg(trim(x))` over the unnest.
  - **Post-backfill validation** (fails the migration if not zero):
    - `SELECT COUNT(*) FROM entity WHERE entity_type='resource' AND ('' = ANY(topic_tags) OR '' = ANY(format_tags))` must be `0`.
    - `SELECT COUNT(*) FROM entity WHERE entity_type='resource' AND EXISTS (SELECT 1 FROM unnest(topic_tags) t WHERE t ~ '^\s|\s$|^"|"$')` must be `0`.
- Update `update_entity_search` trigger (migrate.js 370-386) to include `COALESCE(array_to_string(NEW.topic_tags, ' '), '')` and `COALESCE(array_to_string(NEW.format_tags, ' '), '')` in the tsvector concatenation. Follow existing `CREATE OR REPLACE FUNCTION` pattern.
- **Rewrite `before_submission_update` trigger** (migrate.js 301-336) to include the 7 new columns in both the `INSERT INTO entity (...)` column list and the `VALUES (...)` list. Otherwise every newly-approved resource submission loses its tags silently (see KD4a).
- Tail of migration: force `update_entity_search` to re-run on existing resource rows so their `search_vector` includes the new tag columns. Mechanism: `UPDATE entity SET search_vector = NULL WHERE entity_type = 'resource'` (forces a real write + trigger fire on the next UPDATE), then `UPDATE entity SET updated_at = NOW() WHERE entity_type = 'resource'` which performs the actual trigger-invoking write. (The earlier "HOT-update optimization skipping the write" justification was wrong — HOT affects index-update cost, not whether BEFORE UPDATE triggers fire. Triggers fire on every UPDATE. But to guarantee a real write on PG17 where no-op self-assignments may be skipped, touching `search_vector = NULL` then `updated_at = NOW()` is defensive.)
- Wrap the entire migration (column add + trigger replace + backfill + validation + tail-update) in a single transaction. Pause admin approvals during the migration window so no race between `before_submission_update` replace and an in-flight approval.
- `toFrontendShape()`: add the 7 new fields to the output object. For resources with empty `topic_tags`, fall back to `parseOtherCategories(category, other_categories)` → always a JS array, never a mixed string-or-array. For resources with empty `format_tags`, fall back to `[resource_type]` when present.
- Add a schema-presence precondition at the top of `scripts/export-map-data.js`: query `information_schema.columns` for `topic_tags` and `format_tags`; throw (fail CI) if absent. Converts "frontend shipped without migration" from silent breakage into a loud CI failure.
- `src/types/entity.ts` + `src/types/api.ts`: add `topic_tags: string[]`, `format_tags: string[]`, `advocated_stance: string | null`, `advocated_timeline: string | null`, `advocated_risk: string | null`, `source: string | null`, `source_url: string | null`.

**Patterns to follow:**

- Additive `ALTER TABLE … ADD COLUMN IF NOT EXISTS` pattern at `scripts/migrate.js:161,176`.
- Trigger re-create pattern at `scripts/migrate.js:370-386`.
- Frontend shape mapping in `api/export-map.js` (existing `toFrontendShape`).

**Test scenarios:**

- Happy path: A resource with `topic_tags = ARRAY['AI Safety', 'Alignment']` and `format_tags = ARRAY['Essay']` flows through `toFrontendShape()` and exits as `{ topic_tags: ['AI Safety','Alignment'], format_tags: ['Essay'], ... }`.
- Happy path: A resource with `advocated_stance = 'Cautious'`, `advocated_timeline = 'Short'`, `advocated_risk = 'High'` surfaces all three string values in the shape output.
- Edge case: A resource with empty `topic_tags` and legacy `resource_category = 'AI Safety'` + `other_categories = 'Policy, Governance'` produces `topic_tags: ['AI Safety', 'Policy', 'Governance']` via the fallback.
- Edge case: A resource with all new fields NULL produces `{ topic_tags: [], format_tags: [], advocated_*: null, source: null, source_url: null }` (empty arrays, not null arrays).
- Edge case: A person entity with `topic_tags = null` passes through with `topic_tags: []` (consistency).
- Integration: Running `scripts/migrate.js` twice in a row against a fresh DB yields the same schema and the same backfilled data (idempotent).
- Integration: After migration, `SELECT * FROM entity WHERE 'AI Safety' = ANY(topic_tags)` returns the expected row count (GIN index works end-to-end).
- Integration: Creating a new-resource submission with `topicTags: ['AI Safety']` and approving it via `admin.html` produces an `entity` row with `topic_tags = ARRAY['AI Safety']` (proves the rewritten `before_submission_update` trigger carries tags).
- Integration: Running `scripts/export-map-data.js` against a DB missing the new columns exits with a clear error message (proves the schema-presence precondition works).
- Integration: `pg` driver round-trip — writing `topic_tags := ARRAY['foo','bar']::TEXT[]` and reading it back returns a native JS `['foo','bar']`, not a string `'{foo,bar}'`.

**Verification:**

- `psql ... -c "\d entity"` shows the 7 new columns with correct types.
- `psql ... -c "SELECT COUNT(*) FROM entity WHERE entity_type = 'resource' AND format_tags IS NOT NULL"` approximately equals the count of pre-existing resources with non-null `resource_type`.
- `npm run typecheck` passes with the new `src/types/entity.ts` fields referenced by `toFrontendShape()` consumers.

---

- [ ] **Unit 2: Backend allowlists and submission flow**

**Goal:** Make the new fields writable through the admin edit path and the public submission path.

**Requirements:** R11, R13 (advocated beliefs optional at submit), R7, R8 (contributor adds tags), R6b (admin can mark `source` on ingested resources).

**Dependencies:** Unit 1.

**Files:**

- Modify: `api/admin.js` (`ENTITY_FIELDS` allowlist, update_entity path, merge_submission path, **`pending_merges` query at lines 95-136** — the hardcoded `json_build_object` column list must include the 7 new fields, otherwise admins reviewing edit-submissions won't see proposed tag/stance changes)
- Modify: `api/submit.js` (submission body → submission row mapping)
- Modify: `api/search.js` (SELECT projection at lines 94-108 is a hardcoded column list; add `topic_tags`, `format_tags`, `advocated_stance`, `advocated_timeline`, `advocated_risk`, `source` so the contribute-form autocomplete preview surfaces tags for pending resources)
- Test: `api/__tests__/admin-update.test.js` (extend if present; otherwise create)
- Test: `api/__tests__/submit.test.js` (extend if present)

**Approach:**

- Add `topic_tags`, `format_tags`, `advocated_stance`, `advocated_timeline`, `advocated_risk`, `source`, `source_url` to `ENTITY_FIELDS` in `api/admin.js`.
- Update `api/admin.js` `pending_merges` query: the hardcoded `json_build_object(...)` at lines 95-136 enumerates every field shown to admins in the edit-submission review UI. New fields must be added or admins cannot see proposed changes.
- In `update_entity`, pass array fields with an explicit `::text[]` cast in the SQL (`SET topic_tags = $N::text[]`) to avoid `pg` driver binding edge cases on empty arrays.
- **Field-absent vs empty-array semantics** (avoiding the thumbnail_url blind-overwrite bug class from `docs/solutions/integration-issues/thumbnail-pipeline-dead-cloudfront-and-external-fallbacks-2026-04-19.md`): the admin `update_entity` path must use `Object.prototype.hasOwnProperty.call(data, field)` to decide whether to update a field. If the field is absent in the request body, skip it. If the field is present as `[]` or `null`, clear it. Document this contract in a comment.
- In `api/submit.js`, accept `topicTags`, `formatTags`, `advocatedStance`, `advocatedTimeline`, `advocatedRisk`, `source`, `sourceUrl` in the camelCase `data` object and write to the corresponding snake_case submission columns.
- In `api/search.js`, extend the SELECT projection for all three entity types (or at minimum the resource branch if the query is per-type).
- **Trigger ownership note:** the `before_submission_update` trigger rewrite (KD4a) is owned by Unit 1 as part of the single migration transaction. Unit 2 does NOT touch `scripts/migrate.js` or the trigger body; it only updates the `pending_merges` JSON projection in the admin Lambda so admins can see the proposed new-field values in the review UI before they approve. If Unit 2 finds itself editing the trigger, that is a sign the migration in Unit 1 shipped incomplete.

**Patterns to follow:**

- `ENTITY_FIELDS` allowlist at `api/admin.js:60-69`.
- camelCase-in / snake_case-out pattern in `api/submit.js:197` etc.

**Test scenarios:**

- Happy path: `POST /admin { action: 'update_entity', entity_id: N, data: { topic_tags: ['AI Safety','Alignment'] } }` → updated row has the two-element array.
- Happy path: `POST /submit { data: { entityType: 'resource', title: '…', topicTags: ['Compute'], formatTags: ['Report'], advocatedStance: 'Cautious' } }` → submission row populated, `llm_review` fires asynchronously.
- Edge case: Submitting with `topicTags: []` stores `[]`, not null.
- Edge case: Submitting without any advocated\_\* fields leaves them null.
- Error path: `update_entity` with an unknown field in the allowlist (e.g. a typo like `topicTag`) returns the pre-existing "unknown field" behavior (silently dropped — existing contract).
- Integration: After admin updates `topic_tags`, the next `refreshMapData` call regenerates `map-data.json` with the new tags visible in the shape output.

**Verification:**

- Manual: via `admin.html`, edit a resource, add a topic tag through the new input, save, reload, confirm the tag persisted in `map-data.json` within 60s.
- Manual: submit a new resource via `contribute.html` with topic + format tags; verify it lands in the submission table with the arrays populated.

---

- [ ] **Unit 3: Contributor form — tag inputs and advocated-belief fields on ResourceForm**

**Goal:** Let contributors tag resources richly (topic + format, both multi-value with emergent-tag support) and optionally capture advocated beliefs.

**Requirements:** R7, R8, R9, R11, R13.

**Dependencies:** Unit 2.

**Files:**

- Modify: `src/contribute/ResourceForm.tsx`
- Modify (if needed): `src/components/TagInput.tsx` (only if `renderTrailingOption` needs a small tweak to support "Add '<query>' as new topic"; expect no change)
- Create: `src/lib/tagSerialization.ts` (shared `tagsToStringArray` / `stringArrayToTags` helpers so future forms don't reinvent the wheel)
- Test: `src/__tests__/components/ResourceForm.test.tsx` (extend)
- Test: `src/__tests__/lib/tagSerialization.test.ts` (new)

**Approach:**

- Replace the single `TYPE_OPTIONS` CustomSelect for `resource_type` with a multi-value `TagInput` bound to `format_tags`, searchFn sourced from the curated `FORMAT_TAGS` list, with `renderTrailingOption` enabling emergent formats.
- Add a new multi-value `TagInput` for `topic_tags`, searchFn sourced from the curated `TOPIC_CORE` list + previously-seen emergent tags (aggregated from map-data.json at render time via `useEntityCache`), with `renderTrailingOption` enabling emergent topics.
- Add three `CustomSelect` fields for `advocated_stance`, `advocated_timeline`, `advocated_risk`, each backed by the existing belief-label vocabularies (reuse option arrays from `PersonForm.tsx` / `OrgForm.tsx`). All three nullable.
- On submit, map `format_tags` / `topic_tags` to `formatTags` / `topicTags` string arrays via `tagsToStringArray` helper. Keep the existing author tag serialization unchanged.
- Mirror the advocated field set into the existing `UPDATE`/edit flow.

**Patterns to follow:**

- `TagInput` + `<Controller>` usage at `src/contribute/PersonForm.tsx` for affiliated orgs.
- `CustomSelect` usage for stance/timeline/risk in `PersonForm.tsx` / `OrgForm.tsx`.

**Test scenarios:**

- Happy path: User types "AI Safety", selects from dropdown — topic_tags contains `['AI Safety']` on submit.
- Happy path: User types "mechanistic-interp" (not in curated list), clicks "Add 'mechanistic-interp' as new topic" — topic_tags contains the emergent tag.
- Happy path: User selects advocated_stance = "Cautious", submits — submission has `advocatedStance: 'Cautious'`.
- Edge case: User adds 5 topic tags, removes 2 via backspace, submits — array contains the remaining 3 in insertion order.
- Edge case: User submits with zero topic tags and zero format tags — submission contains `topicTags: [], formatTags: []`.
- Error path: Tag text longer than 100 chars is truncated or rejected with a visible message (UX polish; assert whatever path is implemented).
- Integration: Draft auto-save (localStorage) persists the tag arrays across reloads (the existing auto-save hook already covers this).

**Verification:**

- Manual: Open `/contribute`, switch to Resource tab, tag a fake resource with 3 topic tags (one emergent) and 2 format tags, submit, open admin queue, confirm the submission row shows all tags.
- `npx vitest run src/__tests__/components/ResourceForm.test.tsx` passes.

---

- [ ] **Unit 4: Library page skeleton + data layer**

**Goal:** Stand up the `/library` Vite MPA entry, register it with build and nav, and expose a reactive filter state bound to `useEntityCache`.

**Requirements:** R1, R2, R17.

**Dependencies:** Unit 1 (types + shape output).

**Files:**

- Create: `library.html`
- Create: `src/library/main.tsx`
- Create: `src/library/App.tsx`
- Create: `src/library/hooks/useResourceFilters.ts`
- Modify: `vite.config.ts` (add entry to `build.rollupOptions.input`)
- Modify: `src/components/Navigation.tsx` (add `/library` to `NAV_LINKS`)
- Modify: `.github/workflows/deploy.yml` (add `/library` to smoke-test path list at lines 132-152)
- Test: `src/__tests__/library/useResourceFilters.test.ts` (new)

**Approach:**

- `library.html` modelled on `about.html`: root div `<div id="library-root"></div>`, module script, Cloudflare beacon with `__CF_ANALYTICS_TOKEN__` placeholder, standard favicon + fonts preload.
- `main.tsx` mirrors `src/about/main.tsx` (13 lines).
- `App.tsx` wraps content in `<QueryClientProvider>` (locally constructed QueryClient, per existing convention), renders `<Navigation />`, renders a `LibraryShell` with primary tab ("Library") and secondary tab ("Reading tracks").
- `useResourceFilters` holds selected topic tags, format tags, advocated-stance/timeline/risk filters, year range, free-text query, display mode (`grid` | `list`). State persisted to localStorage under key `libraryFilters`. Reads resources from `useEntityCache()` and returns `{ filteredResources, counts, displayMode, setX, ... }`.
- Library should override the library page's QueryClient default for `map-data.json` to a finite `staleTime` (e.g. 10 minutes) with `refetchOnWindowFocus: true`, so admin edits become visible to open tabs within a reasonable window. The default `staleTime: Infinity` is fine for map.html (infrequent visits) but wrong for a page readers may keep open for research sessions.
- Filter logic: client-side. Topic/format: array-intersection with selected tags. Stance/timeline/risk: exact string match against selected values (tolerating null with an explicit "Unknown" filter). Year: range. Free-text: extend `fuzzySearch` to include `key_argument` + tags, OR run a lightweight local search inside `useResourceFilters`.

**Patterns to follow:**

- `src/about/main.tsx` + `src/about/App.tsx` for entry skeleton.
- `src/admin/App.tsx` for QueryClient-per-page.
- Existing filter-state-with-localStorage patterns in map.html's filter system (as inspiration; not direct code reuse).

**Test scenarios:**

- Happy path: `useResourceFilters` with topic filter `['AI Safety']` returns only resources whose `topic_tags` contain 'AI Safety'.
- Happy path: Filter state persists across page reloads (localStorage round-trip).
- Edge case: Empty filter state returns all resources.
- Edge case: Topic filter `['AI Safety']` AND format filter `['Book']` returns intersection.
- Edge case: advocated_stance filter includes "Unknown" — matches resources with `advocated_stance === null`.
- Edge case: Year range `[2020, 2024]` includes boundary years.
- Edge case: Free-text query "alignment" matches resources whose title, key_argument, or any topic tag contains "alignment" (case-insensitive).
- Integration: Changing display mode from `grid` to `list` is reflected in localStorage immediately.

**Verification:**

- Running `npx vite build` emits `dist/library.html` and a `src/library/*` chunk.
- Running `npm run dev` and opening `http://localhost:5173/library.html` renders without errors.
- Deploy smoke test path list now includes `/library`.

---

- [ ] **Unit 5: Library UI — FilterRail, ResourceGrid, ResourceList, display mode toggle**

**Goal:** Ship the visual and dense list views plus the faceted filter rail. Mirrors mockup variants A + B at `docs/mockups/resources-library/index.html`.

**Requirements:** R1, R2, R3, R9, R12.

**Dependencies:** Unit 4.

**Files:**

- Create: `src/library/components/FilterRail.tsx`
- Create: `src/library/components/ResourceGrid.tsx`
- Create: `src/library/components/ResourceList.tsx`
- Create: `src/library/components/ResourceCard.tsx` (shared card used by grid)
- Create: `src/library/components/ResourceRow.tsx` (shared row used by list)
- Create: `src/library/components/StanceIndicator.tsx` (gradient bar + marker; reused in card, row, detail)
- Modify: `src/library/App.tsx` (wire the shell to these components)
- Test: `src/__tests__/library/FilterRail.test.tsx`
- Test: `src/__tests__/library/ResourceGrid.test.tsx`
- Test: `src/__tests__/library/ResourceList.test.tsx`

**Approach:**

- `FilterRail`: Core topic chips (curated) with counts; "+ N emergent tags" collapsible; format chips; stance/timeline/risk checkbox groups; year slider; reset button. Uses `useResourceFilters`.
- `ResourceGrid`: Cover-forward cards (book-spine visual treatment per mockup A). Pinned sister-maps row at the top rendered separately by `SisterMapsRow` (Unit 6). Grid scrolls; does not paginate in Phase 1 (154-item scroll is fine).
- `ResourceList`: Table with columns #, Title/author/argument, Tags, Stance, Timeline, Risk, Cited. Dense mode per mockup B.
- `ResourceCard` + `ResourceRow`: shared rendering primitives so detail panel and grid share styling.
- `StanceIndicator`: gradient bar with a position marker. Reused across card, row, detail.
- Display-mode toggle persists in `useResourceFilters`.

**Patterns to follow:**

- Tailwind conventions from `src/about/App.tsx`.
- `docs/mockups/resources-library/index.html` is the target visual.

**Test scenarios:**

- Happy path: `FilterRail` renders all 16 curated topics with correct counts from a supplied resource list.
- Happy path: Selecting an emergent tag updates filters and causes the grid to filter to matching resources.
- Edge case: Filter set with zero matches renders an "empty state" message, not a blank grid.
- Edge case: `ResourceCard` renders a resource with `advocated_stance: null` → StanceIndicator shows "stance unknown" muted variant.
- Edge case: `ResourceList` sorts by "Most cited" by default; changing sort updates order.
- Integration: Clicking a tag chip on `ResourceCard` adds that tag to the filter set (drill-down affordance).

**Verification:**

- Running the dev server and visiting `/library` produces a page visually matching mockup variant A (default) and B (when list mode selected).
- `npx vitest run src/__tests__/library/` passes.
- Manual: filter by topic, format, stance; verify grid/list both respond.

---

- [ ] **Unit 6: Library UI — Detail panel, SisterMapsRow, resource→entity navigation**

**Goal:** Ship the detail view plus the pinned sister-map highlight, matching mockup variants C (sister maps) and D (detail).

**Requirements:** R4, R6, R6a, R16 (shared detail shape with map.html).

**Dependencies:** Unit 5.

**Files:**

- Create: `src/library/components/ResourceDetail.tsx`
- Create: `src/library/components/SisterMapsRow.tsx`
- Create: `src/library/components/ConnectedEntities.tsx` (authored-by, cited-by, mentioned-in)
- Modify: `src/library/App.tsx` (route detail-open events)
- Test: `src/__tests__/library/ResourceDetail.test.tsx`
- Test: `src/__tests__/library/SisterMapsRow.test.tsx`

**Approach:**

- `ResourceDetail` is a right-side slide-over panel (`fixed inset-y-0 right-0 w-[720px]` style), backed by a selectedResourceId in URL hash or local state. Shows: title, author(s) linked to entities, format + topic tags, advocated beliefs with StanceIndicator, key argument, "Authored by" / "Cited by" / "Mentioned in" lists built from the `relationships` array in map-data.json, "Appears in tracks" chips, read-original CTA, "open in map graph" link.
- `ConnectedEntities`: reads `relationships` from `useEntityCache`, finds edges where the resource is source or target, splits by `edge_type` (authored_by, cited_by, mentioned_in), joins with `byId` to produce display rows.
- `SisterMapsRow`: reads pinned resources where `source IS NOT NULL` (the plan's schema in Unit 1 does not add a `pinned` column; sister-map status is inferred from the `source` attribution field alone). Rendered above the grid in Unit 5's `ResourceGrid`. Also shows a secondary link-out block at the bottom of FilterRail (per mockup A).
- Deep-link convention: `/library?entity=resource/<id>` opens the detail panel, mirroring map.html's existing `?entity=<type>/<id>` query-param pattern (documented in `docs/solutions/best-practices/mobile-entity-directory-replacing-d3-map-2026-04-08.md`). Use the same `selectEntityById` helper to parse the URL and hydrate state. Also reachable from map.html by having its "open in library" link on a resource node detail panel emit the same URL shape.

**Patterns to follow:**

- `src/components/ExistingEntitySidebar.tsx` for existing "entity sidebar" rendering primitives.
- map.html `buildConnections` / `showDetail` for the shape of the connections panel.

**Test scenarios:**

- Happy path: Opening `/library?entity=resource/101` mounts the detail panel with resource 101 populated.
- Happy path: Resource with 2 authors renders both, each linked to the author's entity detail.
- Happy path: Resource with `source = 'CAIDP'` renders a "Via CAIDP" attribution badge.
- Edge case: Resource with zero edges shows "No connections yet" in the ConnectedEntities section.
- Edge case: Resource with null advocated beliefs renders the StanceIndicator in "unknown" mode and hides timeline/risk rows.
- Edge case: SisterMapsRow is hidden when no resource has `source IS NOT NULL`.
- Integration: Clicking an author in the detail panel navigates to `/map?entity=person/<id>` (deep-link to map).

**Verification:**

- Dev server: visiting `/library?entity=resource/101` opens detail panel in the correct state.
- Opening a sister map resource shows source attribution correctly.
- Manual visual comparison with mockup variants C and D.

---

- [ ] **Unit 7: Reading tracks — content files, loader, and secondary tab**

**Goal:** Ship the "Reading tracks" secondary tab with 3 seed tracks.

**Requirements:** R5.

**Dependencies:** Unit 4 (library shell).

**Files:**

- Create: `content/tracks/new-to-ai-policy.json`
- Create: `content/tracks/the-regulation-debate.json`
- Create: `content/tracks/alignment-foundations.json`
- Create: `src/library/hooks/useTracks.ts`
- Create: `src/library/components/TrackList.tsx`
- Create: `src/library/components/TrackDetail.tsx`
- Modify: `vite.config.ts` or `package.json` scripts (if needed to copy `content/tracks/*` into `dist/tracks/`; Vite's static handling of `public/` is the standard pattern, so consider moving `content/tracks/` to `public/tracks/` for zero-config)
- Test: `src/__tests__/library/useTracks.test.ts`

**Approach:**

- Track JSON shape matches `docs/mockups/resources-library/data.js` `MOCK_TRACKS` plus `resource_id` references. Fields: `id`, `title`, `subtitle`, `audience`, `items: [{ resource_id, blurb }]`.
- `useTracks` fetches `/tracks/index.json` at mount (returns the list of tracks with metadata), then lazily fetches each track file when its detail is opened.
- `TrackList` shows audience-tagged sequence summaries. Clicking a track opens `TrackDetail` which renders a numbered ordered list. Each item renders a lightweight `ResourceRow` with an editorial `blurb` overlay.
- Secondary tab on the library page toggles between the Library grid/list and the Tracks view.
- Track items that reference a `resource_id` not present in map-data.json are skipped with a console warning (devs notice, users see no broken row).

**Patterns to follow:**

- Vite static asset serving via `public/` directory.
- TanStack Query for the track fetches (same QueryClient as the library).

**Test scenarios:**

- Happy path: Opening the "Reading tracks" tab renders the 3 seed tracks.
- Happy path: Opening a track renders its items in order with the editorial blurb visible.
- Edge case: Track with a missing `resource_id` skips that item and logs a warning.
- Edge case: A resource that appears in a track shows "Appears in tracks" in its detail panel (integration with Unit 6).
- Integration: Track data loads from the same CloudFront edge as other static assets (verified at deploy).

**Verification:**

- Dev server: all 3 tracks visible; clicking one opens its detail.
- `npm run build` copies the track files into `dist/tracks/` (or `public/tracks/` served directly).

---

- [ ] **Unit 8: map.html cleanup — remove Resources sub-tab, edges-only default in All, "Show resources" toggle**

**Goal:** Apply the minimal map.html changes agreed in KD8.

**Requirements:** R14, R15, R16.

**Dependencies:** None (can land after Unit 4 so the "view Library" link lands somewhere real).

**Execution note:** Browser-test after every change. D3 defer-class risk — see `docs/post-mortems/2026-04-09-d3-defer-map-outage.md`.

**Files:**

- Modify: `map.html` (inline sections around lines 886-909 for sub-tabs; around 3093-3265 for `getVisibleNodes`; controls sidebar block for the new toggle)

**Approach:**

- Remove the `<button class="view-btn" data-view="resources">Resources</button>` element from `#network-sub-tabs`. Keep `all | orgs | people` sub-tabs.
- **Audit every `currentView === 'resources'` read-site** and convert each one. There are 9 known sites: lines 2597 (cluster-key branch), 2812/2821/2827 (source-type filter UI that hides connector option for Resources view), 3140 (total-count computation), 3221 (main `getVisibleNodes` branch), 4621/4623/4876/4878 (connection/edge-rendering branches). Remove the branch at 3221-3230 outright; the other 8 sites either become dead code (delete) or remain as reachable-only-via-localStorage paths that the init-time redirect neutralizes. Prefer deletion over leaving dead branches to avoid confusion for the next editor.
- **LocalStorage redirect must execute before any `currentView` read.** Line 2860 is the first assignment from localStorage. The redirect (`if (storedSubView === 'resources') { storedSubView = 'all'; localStorage.setItem('mapSubView', 'all'); }`) must precede line 2860, not just be nearby.
- In the `'all'` branch (lines 3231-3265), add a filter: resources must have ≥1 edge AND the `showResourcesInAll` toggle must be true. Toggle defaults to `true` in localStorage.
- Add a new checkbox to the controls sidebar (in the "Views" or "Filters" section, whichever reads more naturally) labelled "Show resources". Wire to `showResourcesInAll` localStorage key. Changing the toggle calls `render()` / `applyViewState()`.
- Update the onboarding tip at line 856 to drop "Resources" from the list of sub-tabs and add a line pointing at Library.

**Patterns to follow:**

- Existing `applyViewState` + localStorage persistence at lines 2853-2933.
- Existing checkbox controls in the sidebar (the stance toggles, the submission count ring toggle).

**Test scenarios:**

- Happy path: Default load with no prior localStorage shows Network All with resources present (edges only), Resources sub-tab gone.
- Happy path: User with `mapSubView = 'resources'` in localStorage is redirected to `'all'` on load.
- Happy path: Toggling "Show resources" off hides all resources from the All view.
- Edge case: A resource with zero edges is not rendered in the All view under any toggle state (still hidden by the ≥1-edge rule).
- Edge case: Switching to Orgs-only or People-only view: resources are not shown regardless of the toggle state (existing behavior preserved).
- Integration: Clicking a resource node still opens the existing `showDetail` panel with correct resource content.

**Verification:**

- Manual: Open the built `dist/map.html` in a browser. Confirm Resources sub-tab is gone, resources render in All with edges, toggle works. Click a resource node → detail panel opens.
- Manual: Test on a fresh browser (no localStorage) AND on a session with `mapSubView = 'resources'` set.
- Run `npx vite build` and diff `dist/map.html` against `map.html` to confirm Vite passed it through cleanly (per 2026-04-15 migration solution).

## System-Wide Impact

- **Interaction graph:**
  - `api/admin.js` `update_entity` writes new columns → next `refreshMapData` regenerates `map-data.json` → CloudFront invalidation → _new page loads_ pick up the change. Existing open tabs do NOT see updates (see "Caching / staleness" below).
  - `api/submit.js` writes submissions → `llm_review` runs asynchronously (Claude Haiku) → on admin approval, rewritten `before_submission_update` trigger creates the entity row WITH the 7 new columns populated.
  - `useEntityCache` merges `map-data.json` + `map-detail.json` → library filters + map render both consume the unified cache.

- **Error propagation:**
  - Any change to `toFrontendShape()` that drops a field makes map.html and library.html silently render blanks. Verified via end-to-end flow: contributor → admin approve → confirm the field shows in both UIs.
  - `scripts/export-map-data.js` schema-presence precondition (Unit 1) fails the CI build if migration hasn't run, converting a silent bad state into a loud one.
  - Postgres array columns serialize to native JS arrays via `pg` with no custom types configured in this repo. Unit tests verify round-trip.

- **State lifecycle risks:**
  - Migration re-runs must stay idempotent. Unit 1 test scenario explicitly covers second-run behavior.
  - Backfill is wrapped in the migration transaction. `WHERE topic_tags IS NULL` is intentional — rows with an empty array `'{}'` (admin-cleared) are not retargeted. Rows with dirty arrays (empty string tags) must be caught by the post-backfill validation query, not by backfill rerun.
  - Mid-flight approvals between column-add and trigger-replace must be frozen (admin pauses approvals for the migration window, ~5 min). Otherwise a race window exists where new-resource submissions get approved through the old trigger and skip the 7 new columns.

- **API surface parity:**
  - New fields must appear in: `api/admin.js` `ENTITY_FIELDS` + `pending_merges` JSON query, `api/submit.js` body handling, `api/search.js` SELECT projection, `api/export-map.js` `toFrontendShape`, `src/types/entity.ts`, the admin UI `editableFields` list, and the rewritten `before_submission_update` trigger. Missing any one of these is a silent drop. Explicitly tracked in Units 1-3.
  - `useSubmissionLedger` (`src/hooks/useSubmissionLedger.ts`) stores only IDs + names in localStorage, not the full shape. Verified unaffected; no change required.

- **Deploy-surface brownout windows** (three independent deploy surfaces: DB / Lambda / frontend):
  - **Required order: (1) pause admin approvals, (2) `scripts/migrate.js`, (3) SAM deploy Lambdas, (4) `git push` (frontend), (5) unpause approvals, (6) smoke test all six paths.**
  - (1) → (2) skipped: admin approval during migration races the trigger replace → new resources get approved with NULL tags. Mitigated by explicit pause.
  - (2) → (3) gap: contributor submits new fields, old Lambda drops them silently. Acceptable (submission still valid; admin can edit post-approval). Noted but not mitigated.
  - (3) → (4) gap: admin approval during this window runs new Lambda's `refreshMapData` → emits `map-data.json` with new fields → old frontend (cached in users' browsers) receives extra fields → benign (JS ignores unknown keys). Safe.
  - (4) → (3) reversed ordering is UNSAFE: old Lambda's `refreshMapData` overwrites the CI-built `map-data.json` with old-shape output, stripping new fields. Library page silently renders empty facets. Prevented by mandating (3) before (4).
  - (2) skipped before (4): CI build runs `scripts/export-map-data.js` which now throws on missing schema columns; CI fails loudly, old frontend stays live. Safe.

- **Caching / staleness interaction:**
  - `useEntityCache` uses `staleTime: Infinity` → open tabs never refetch. Admin edits visible only after full page reload. For Library specifically, Unit 4's `useResourceFilters` should use a finite stale time (e.g. 10 min) or enable `refetchOnWindowFocus: true` to narrow the gap.
  - CloudFront invalidation covers the AWS CDN layer (~5-60s). Cloudflare sits in front via CNAME flattening; `map-data.json` must bypass Cloudflare cache (verify Page Rules / Cache Rules set for `*.json` paths). Otherwise the effective propagation time is Cloudflare's TTL, not CloudFront's. Document as an operational gate in the deploy checklist.
  - The origin doc's "updates within ~60 seconds" claim applies only to cold cache (new page load after invalidation). Warm sessions require refresh.

- **Library-detail vs map.html-detail drift (R16):**
  - Phase 1 ships two independent implementations: React `src/library/components/ResourceDetail.tsx` (Unit 6) and inline JS `showDetail()` in map.html. These WILL drift on copy, layout, and future fields.
  - Pragmatic decision: document as Phase 2 tech debt. Map.html rewrite is out of scope; rewriting `showDetail` as React is multi-month work. For Phase 1, both implementations must consume the same `toFrontendShape` output (source of truth) and the same field vocabulary. Add a snapshot test comparing field sets rendered by both so drift surfaces in CI.

- **Integration coverage:**
  - Library faceted filtering (client-side) depends on `map-data.json` containing the new fields. Unit 4 adds a filter-hook test with realistic data.
  - Map.html detail panel for a resource must continue to render after schema changes. Manual browser test is mandatory (see Unit 8 execution note).
  - Deploy smoke test at `.github/workflows/deploy.yml:132-152` must include `/library` as a **strict 200-or-fail** check. Verify the existing loop fails CI on a single-path non-200 (add the check if it doesn't).

## Risks & Dependencies

- **R1 (High): `before_submission_update` trigger drops new fields.** Existing trigger at `scripts/migrate.js:301-336` does not carry the 7 new columns from submission to entity on approval. Contributor-submitted tags/stance vanish silently on approval. Mitigation: KD4a + Unit 1 rewrites the trigger in the same migration. Integration test in Unit 1 proves the tags survive approval.
- **R2 (High): map.html rendering regressions.** Inline D3 code is outage-prone (see 2026-04-09 post-mortem). Mitigation: Unit 8 execution note requires browser testing after every edit. Diff `dist/map.html` after `vite build`. Do not change `<script>` tag ordering. Unit 8 now explicitly enumerates all 9 `currentView === 'resources'` read-sites to prevent dead-code confusion.
- **R3 (High): deploy-surface brownout.** Three independent deploy surfaces (DB / Lambda / frontend) can land in unsafe intermediate states. Mitigation: System-Wide Impact section pins the order (migrate → SAM → frontend → smoke, with approvals paused). `scripts/export-map-data.js` schema-presence precondition prevents (4)-before-(2). Reversing (3) and (4) is explicitly forbidden.
- **R4 (Medium): backfill produces dirty arrays.** `other_categories` may contain empty strings, trailing commas, whitespace, UTF-8 smart quotes, or mixed CSV/JSON serializations. Naive `string_to_array` yields garbage like `['', ' AI Safety', '"Policy"']`. Mitigation: explicit `CASE WHEN … LIKE '[%'` branch, `trim()`, `array_remove(arr, '')`, post-backfill zero-row validation queries in Unit 1. Pre-migration `SELECT DISTINCT` audits pasted in PR description.
- **R5 (Medium): `toFrontendShape()` drift.** Any missing field = silent UI blank. Mitigation: Unit 1 test asserts a locked fixture, not free prose. Post-deploy smoke query `curl $URL/map-data.json | jq '[.resources[] | select(.topic_tags | length > 0)] | length'` must be >100 of 154 resources.
- **R6 (Medium): admin edit silently overwrites tag arrays to null.** Same bug class as the thumbnail_url blind-overwrite bug already documented. Mitigation: Unit 2 specifies `Object.prototype.hasOwnProperty.call(data, field)` semantics explicitly.
- **R7 (Medium): library-detail vs map.html-detail drift.** Two implementations of "resource detail panel" on two surfaces. Mitigation: Documented as Phase 2 tech debt. Snapshot test compares rendered field sets to surface divergence in CI.
- **R8 (Medium): `staleTime: Infinity` means admin edits invisible to open-tab users.** Mitigation: Unit 4 uses a finite stale time (10 min) or enables `refetchOnWindowFocus: true` for library specifically. Deploy checklist includes a Cloudflare cache-bypass verification for `map-data.json`.
- **R9 (Low): Postgres driver array serialization.** `pg` returns native JS arrays for `TEXT[]` out of the box; no custom types in this repo. Unit 1 round-trip integration test verifies.
- **R10 (Low): `search_vector` trigger reprocessing cost.** Tail `UPDATE entity SET updated_at = updated_at WHERE entity_type = 'resource'` touches ≤200 rows. Negligible on db.t4g.micro.
- **R11 (Low): localStorage migration for map.html.** Users with `mapSubView = 'resources'` redirected to `'all'`. One-time, harmless. Unit 8 runs the redirect before any `currentView` read.
- **Dependency: Admin willingness to SQL-merge tags in Phase 1.** Tag-merge UI is Phase 2. Admins merge via `UPDATE entity SET topic_tags = array_remove(topic_tags, 'old-tag') || ARRAY['new-tag'] WHERE 'old-tag' = ANY(topic_tags)`. Documented in Phase 1 launch notes.
- **Dependency: Lambda redeploy.** Units 1, 2 change Lambda code. `sam deploy` required for `submit.js`, `admin.js`, `export-map.js`, `search.js`. Follow 2026-04-16 post-mortem guidance: `--no-execute-changeset` review, drift detection, or targeted `aws lambda update-function-code` on the four Lambdas only.
- **Dependency: Stale enrichment scripts.** `scripts/discover-with-exa.js`, `scripts/import-aisafety-csv.js`, `scripts/quality-pass.js`, `scripts/enrich-with-exa.js` reference the old multi-table schema or hardcoded `resource_type` vocabulary. Documented as Phase 2 rewrites. Not Phase 1 blockers.

## Documentation / Operational Notes

- **CLAUDE.md updates:** Add a row to the Database Schema section describing `topic_tags`, `format_tags`, `advocated_*`, `source`, `source_url`. Add a note that `resource_type`, `resource_category`, and `other_categories` are deprecated-for-resources (kept for backward compat; read only via `toFrontendShape` fallback).

- **Pre-migration audit** (paste output into PR description):
  - `SELECT DISTINCT resource_type FROM entity WHERE entity_type='resource'` — confirm curated `FORMAT_TAGS` is a superset.
  - `SELECT DISTINCT resource_category, other_categories FROM entity WHERE entity_type='resource'` — confirm backfill handles all serialization shapes.

- **Deploy checklist (required order):**
  1. **Announce maintenance** — pause admin approvals for the ~10 min migration + deploy window.
  2. **Backup** — `npm run db:backup` uploads JSON + SQL snapshot to S3.
  3. **Snapshot map-data.json** — `aws s3 cp s3://.../map-data.json s3://.../map-data.json.prev` (fast rollback artefact).
  4. **Run migration** — `scripts/migrate.js` against prod DB. Migration runs in a single transaction and will fail if post-backfill validation queries return non-zero rows.
  5. **GO/NO-GO verification queries** (all must pass before proceeding):
     - `SELECT COUNT(*) FROM entity WHERE entity_type='resource' AND format_tags IS NOT NULL` — should approximate count of resources with non-null `resource_type`.
     - `SELECT COUNT(*) FROM entity WHERE entity_type='resource' AND ('' = ANY(topic_tags) OR '' = ANY(format_tags))` — must be `0`.
     - `SELECT COUNT(*) FROM entity WHERE entity_type='resource' AND EXISTS (SELECT 1 FROM unnest(topic_tags) t WHERE t ~ '^\s|\s$|^"|"$')` — must be `0`.
     - `SELECT DISTINCT unnest(topic_tags) FROM entity WHERE entity_type='resource' ORDER BY 1` — eyeball for CSV/JSON contamination.
     - `SELECT id FROM entity WHERE entity_type='resource' AND search_vector @@ to_tsquery('english', 'safety') LIMIT 5` — must return resources tagged AI Safety.
  6. **Approval-path integration test** — create a test submission via `contribute.html`, approve it via `admin.html`, `SELECT topic_tags FROM entity WHERE id = <new>` must return the submitted array (proves `before_submission_update` carries new columns).
  7. **SAM deploy Lambdas** — `submit.js`, `admin.js`, `search.js`, `export-map.js`. Use `--no-execute-changeset` review per 2026-04-16 post-mortem. Or `aws lambda update-function-code` for the four functions directly.
  8. **Frontend push** — `git push origin main`. GitHub Actions builds, uploads, invalidates CloudFront.
  9. **Verify Cloudflare cache bypass for `map-data.json`** — Cloudflare Page Rules or Cache Rules must respect CloudFront's `Cache-Control: no-cache` on `*.json`. If Cloudflare caches it with long TTL, propagation is Cloudflare's TTL, not CloudFront's.
  10. **Post-deploy parity check** — `curl https://mapping-ai.org/map-data.json | jq '[.resources[] | select(.topic_tags | length > 0)] | length'` — must be >100 of 154 resources.
  11. **Smoke test** — `/`, `/contribute`, `/map`, `/about`, `/insights`, `/admin`, `/library` all return 200.
  12. **Unpause approvals.**

- **Rollback mechanics:**
  - **Frontend broken, DB/Lambda healthy:** `git revert <sha> && git push origin main` — ~90s to recovery via CI. `map-data.json.prev` restore is a belt-and-braces fallback (`aws s3 cp .../map-data.json.prev .../map-data.json && aws cloudfront create-invalidation --paths "/map-data.json"`).
  - **Bad backfill:** `UPDATE entity SET topic_tags = NULL, format_tags = NULL WHERE entity_type='resource'` resets to pre-backfill state; then re-run migration after fixing backfill SQL.
  - **`map-data.json` corrupted** (malformed `toFrontendShape` output): restore `map-data.json.prev` immediately (≤30s), then root-cause the shape bug.
  - **`before_submission_update` trigger broken**: DB is still consistent; any approved submissions during the break will need manual tag/stance backfill from the submission row's `topic_tags`. Document this as the "bad trigger" rollback SQL snippet in the runbook.
  - **Schema columns are additive** — `DROP COLUMN IF EXISTS` is always available but rarely needed since old code ignores unknown keys.

- **Admin runbook additions:**
  - "How to merge emergent tags": `UPDATE entity SET topic_tags = array_remove(topic_tags, 'old-tag') || ARRAY['new-tag'] WHERE 'old-tag' = ANY(topic_tags)`.
  - "How to clear a resource's tags" (for testing): `UPDATE entity SET topic_tags = '{}', format_tags = '{}' WHERE id = <id>`.
  - "How to backfill advocated beliefs manually": `UPDATE entity SET advocated_stance = 'Cautious', advocated_timeline = 'Short' WHERE id = <id>`.

- **CSP review:** Library page uses images via `thumbnail_url` and no new CDNs. No CSP change expected. Re-check before merge (see 2026-04-19 thumbnail-pipeline doc for the CSP gotcha).

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-19-resources-rethink-requirements.md](../brainstorms/2026-04-19-resources-rethink-requirements.md)
- **Mockups:** [docs/mockups/resources-library/index.html](../mockups/resources-library/index.html) — four UI variants (A: grid, B: dense list, C: tracks-first, D: detail panel)
- **Vite MPA migration solution:** [docs/solutions/integration-issues/vite-react-typescript-migration-from-inline-html-2026-04-15.md](../solutions/integration-issues/vite-react-typescript-migration-from-inline-html-2026-04-15.md)
- **D3 defer outage post-mortem:** [docs/post-mortems/2026-04-09-d3-defer-map-outage.md](../post-mortems/2026-04-09-d3-defer-map-outage.md)
- **Thumbnail pipeline + CloudFront rules:** [docs/solutions/integration-issues/thumbnail-pipeline-dead-cloudfront-and-external-fallbacks-2026-04-19.md](../solutions/integration-issues/thumbnail-pipeline-dead-cloudfront-and-external-fallbacks-2026-04-19.md)
- **SAM deploy drift post-mortem:** [docs/solutions/integration-issues/sam-deploy-overwrites-manual-cloudfront-config-2026-04-16.md](../solutions/integration-issues/sam-deploy-overwrites-manual-cloudfront-config-2026-04-16.md)
- **Mobile entity directory patterns:** [docs/solutions/best-practices/mobile-entity-directory-replacing-d3-map-2026-04-08.md](../solutions/best-practices/mobile-entity-directory-replacing-d3-map-2026-04-08.md)
- Related files: `scripts/migrate.js`, `api/export-map.js`, `api/admin.js`, `api/submit.js`, `map.html`, `src/hooks/useEntityCache.ts`, `src/components/TagInput.tsx`, `src/contribute/ResourceForm.tsx`, `src/components/Navigation.tsx`, `vite.config.ts`, `.github/workflows/deploy.yml`
