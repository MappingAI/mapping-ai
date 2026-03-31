---
date: 2026-03-31
topic: launch-critical-and-phase2
focus: "Launch-critical data integrity, admin edge cases, UX, and Phase 2/3 improvements for mapping-ai.org launch (Phase 1: 4/3, Phase 2: 4/7, Phase 3: 4/9)"
---

# Ideation: Launch-Critical Fixes + Phase 2/3 Improvements

## Codebase Context

**Project:** Static HTML/CSS/JS app with D3.js stakeholder map, crowdsourced contribution forms, and admin panel. Backend is AWS Lambda (Node.js 20) + RDS Postgres 17, deployed via SAM + GitHub Actions.

**Recent migration:** 6 DB tables (people, organizations, resources, submissions, relationships, person_organizations) consolidated to 3 tables (entity, submission, edge). Already hit a bug where the export layer didn't map new column names to frontend field names (plot view empty, resources showed "null").

**Launch timeline:** Phase 1 (trusted network) 4/3, Phase 2 (outreach) 4/7, Phase 3 (public) 4/9.

**Key findings from codebase scan:**
- map.html reads `relationships`/`person_organizations` keys but export outputs `edges` -- all network connections are invisible
- Edge table lacks `source_type`/`target_type` that map.html uses for node resolution
- Search API default status filter is a no-op, leaking pending/internal entities
- Admin key hardcoded in client-side HTML (admin.html:696)
- `update_entity` admin action doesn't refresh map data
- Export spreads all DB columns into public map-data.json (exposes scoring internals)
- dev-server.js and ~10 scripts in `scripts/` all reference old table names
- No onboarding/methodology guidance on the map page
- Dropdown border CSS artifact on contribute forms
- Resources in All view float disconnected at map center (119/161 have zero edges)

**Past learnings:** No `docs/solutions/` directory exists. Institutional knowledge is in CLAUDE.md and auto-memory.

---

## Ranked Ideas

### Tier 1: Launch-Critical (fix on `main` before 4/3)

### 1. Fix edges pipeline end-to-end (map connections completely broken)
**Description:** The export layer (`api/export-map.js`) outputs data under the `edges` key, but `map.html` reads `relationships` and `person_organizations` (defaulting to empty arrays). Additionally, the new `edge` table has only `source_id`/`target_id` (no `source_type`/`target_type`), but map.html resolves nodes via `nodeById['person-123']` using type fields. Fix: update map.html to read from `edges`, and enrich the export query with a JOIN to entity to include `source_type`/`target_type` on each edge row.
**Rationale:** This is the highest-severity bug. All connection lines, cluster ordering by link density, resource positioning near related entities, and the detail panel "Connections" section are dead. Users see disconnected dots, not a stakeholder network. The core value proposition of the *map* is broken.
**Downsides:** Requires coordinated changes in both `api/export-map.js` (JOIN query) and `map.html` (15+ references to old field names). Error-prone if any reference is missed.
**Confidence:** 95%
**Complexity:** Medium
**Status:** Unexplored

### 2. Search API leaks pending/internal entities + admin key in client source
**Description:** In `api/search.js:42`, the status clause defaults to empty string when no status param is passed, meaning public search returns ALL statuses including pending and internal. Fix: default to `AND status = 'approved'`. Separately, the admin key `mappingai-admin-2026` is in `admin.html:696` (client-side), `template.yaml:88,121`, and `api/admin.js:17` (as fallback). Move to prompt-on-load or environment-based auth.
**Rationale:** Public search exposes unapproved draft data and internal-only entities. Hardcoded admin key gives any source-viewer full admin access (approve/reject/merge/delete). Together these are the most serious security issues for launch.
**Downsides:** Admin key change requires coordinating template.yaml deploy + admin.html update + clearing the fallback in admin.js.
**Confidence:** 90%
**Complexity:** Low-Medium
**Status:** Unexplored

### 3. update_entity missing map refresh + admin cache invalidation
**Description:** The admin `update_entity` action (`api/admin.js:305-327`) writes to the entity table but never calls `refreshMapData()`. Approve, merge, and delete all do. Additionally, the admin panel's `allEntitiesCache` and `_adminEntityCache` in `admin.html` are never cleared after mutation operations. Fix: add `refreshMapData()` to update_entity, and clear entity caches after approve/merge/update/delete.
**Rationale:** Admins will be actively editing entities before and during launch. Edits silently don't appear on the map, and the admin panel shows stale data in autocomplete and entity browser until page reload.
**Downsides:** Adding refreshMapData to every mutation increases S3/CloudFront API calls, but volume is low during admin sessions.
**Confidence:** 90%
**Complexity:** Low
**Status:** Unexplored

### 4. Export leaks raw DB columns into public map-data.json
**Description:** `toFrontendShape()` in `api/export-map.js` does `const out = { ...row }` (spreading all DB columns) then adds mapped names, but never removes the originals. `stripSensitive()` only removes 3 fields. All `belief_*_wavg`, `belief_*_wvar`, `belief_*_n`, duplicate `belief_*` prefixed columns, and internal fields ship to the public CDN. Fix: use an explicit allowlist of exported fields.
**Rationale:** map-data.json is publicly accessible on CloudFront. It exposes internal scoring metadata (weighted averages, variance, submission counts), the raw DB schema, and bloats the JSON with redundant/null fields. A researcher could reverse-engineer the weighting system.
**Downsides:** Switching to an allowlist requires listing every frontend-needed field explicitly. Risk of missing a field the frontend reads.
**Confidence:** 85%
**Complexity:** Low-Medium
**Status:** Unexplored

### 5. Submit API silently drops parent_org_id
**Description:** The `api/submit.js` INSERT for organization submissions has no `parent_org_id` column in its column list (`lines 96-153`). Even if the form sends a `parentOrgId` field, it is silently discarded. The entity table has the column, and the admin update_entity whitelist includes it, but crowdsourced submissions never record it.
**Rationale:** Org hierarchy links submitted via the contribute form are permanently lost. The org hierarchy graph will always be incomplete unless admins manually fix every org relationship.
**Downsides:** Minimal -- adding one column to the INSERT statement.
**Confidence:** 80%
**Complexity:** Low
**Status:** Unexplored

### 6. Merge null-overwrite guard blocks intentional corrections
**Description:** The merge handler (`api/admin.js:271`) skips any submitted value that is null or empty when the entity already has a non-null value. This makes it impossible to clear incorrect fields via merge (e.g., remove a wrong location). Fix: add explicit null-intent signaling (e.g., `clearFields` array) or change the guard to only protect against unintentional blanking.
**Rationale:** Before launch, admins will clean data -- removing wrong locations, outdated handles, incorrect stances. Both correction paths are currently broken (merge drops corrections, update_entity doesn't refresh map).
**Downsides:** Removing the guard entirely risks accidental overwrites from sloppy submissions. Needs a targeted approach.
**Confidence:** 75%
**Complexity:** Low
**Status:** Unexplored

### 7. Contribute form dropdown border artifact + sticky mobile submit
**Description:** The custom select dropdown has a visual seam where `border-top: none` on `.select-options` plus `max-height` CSS transition creates a flickering line artifact on open/close (`contribute.html:411-420`). Fix with `margin-top: -1px` or `box-shadow` approach. Separately, add a sticky submit button on mobile so it's always accessible on the 20+ screen-height form.
**Rationale:** The dropdown artifact affects every dropdown on the form (category, stance, funding model). The missing sticky submit means mobile users scroll the entire form with no persistent way to submit.
**Downsides:** Minor CSS changes with low risk.
**Confidence:** 85%
**Complexity:** Low
**Status:** Unexplored

### 8. Map onboarding tooltip + methodology panel
**Description:** Add a dismissable "How to use this map" overlay on first visit (localStorage flag) explaining views, filters, search, and click interactions. Add an "About this map" info button in controls explaining data sources, belief score methodology (weighted averages: self=10, connector=2, external=1), and stance color meanings.
**Rationale:** The map has 5 views, multiple filter types, semantic search, and belief-derived color coding -- none explained. Source type filter shows cryptic icons with no explanation. Trusted early users (researchers) will immediately ask "what do these colors mean?"
**Downsides:** Design consideration needed to avoid clutter. Content writing required for methodology explanation.
**Confidence:** 80%
**Complexity:** Low-Medium
**Status:** Unexplored

---

### Tier 2: Phase 2/3 (start now on feature branch, ~1 week to test)

### 9. Resource_category clustering in Resources view
**Description:** Resources view currently clusters by `resource_type` (Book, Report, Essay) which tells format not topic. The data already has `resource_category` with meaningful values (AI Safety, AI Policy, Labor & Economy, National Security). Switch clustering dimension from format to topic, or offer a toggle.
**Rationale:** User flagged Resources view categories as "uninformative." Topic-based clustering makes the view useful for discovering related content.
**Downsides:** Requires updating filter chip generation and cluster logic in map.html.
**Confidence:** 80%
**Complexity:** Medium
**Status:** Unexplored

### 10. Anchor orphan resources in All view near matching org sector
**Description:** 119/161 resources have zero edges and currently dump to map center. Position them near the org-sector cluster that matches their `resource_category` (e.g., "AI Safety" resources near AI Safety org cluster, "AI Policy" near Think Tank cluster).
**Rationale:** Even after fixing the edges bug, most resources lack connections. Topic-to-sector mapping gives them spatial meaning. A user exploring Think Tank cluster sees nearby policy reports.
**Downsides:** Requires a resource_category-to-org-sector mapping. Heuristic may not be perfect for all categories.
**Confidence:** 80%
**Complexity:** Medium
**Status:** Unexplored

### 11. Multi-category tags via comma-split parsing
**Description:** Resource categories already contain comma-separated values in the data (e.g., "AI Safety, Policy Proposal"). Extend category handling to split on commas, use first value as primary (for clustering), and all values for filtering. No schema change needed.
**Rationale:** User explicitly flagged "no support for multiple categories/tags per entity." The data already has multi-category values naturally. Minimal change that unlocks multi-tag filtering, extensible to orgs and people later.
**Downsides:** Need to handle edge cases in normalization. Filter UI needs to show combined tags.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

### 12. Rewrite dev-server.js for 3-table schema
**Description:** Every SQL query in dev-server.js references old table names (people, organizations, resources, submissions, relationships, person_organizations). Rewrite all queries to use entity/submission/edge tables with proper field mapping.
**Rationale:** Local development is completely broken. Any contributor running `node dev-server.js` gets 500 errors on every endpoint. Critical for onboarding new contributors.
**Downsides:** Significant rewrite of ~300 lines. Should mirror the Lambda handler logic closely.
**Confidence:** 85%
**Complexity:** Medium
**Status:** Unexplored

### 13. Schema smoke-test in CI
**Description:** Add a lightweight CI step that verifies entity/submission/edge tables exist and old table names (people, organizations, resources) do NOT exist. Run before S3 sync in deploy.yml.
**Rationale:** The 6-to-3 migration was done but verification was not. A 30-second smoke test would have caught dev-server.js and scripts/ breakage immediately. Prevents the same class of bug on the next migration.
**Downsides:** Requires CI to have DB access (it already does for export-map-data.js).
**Confidence:** 80%
**Complexity:** Low
**Status:** Unexplored

### 14. Mobile bottom sheet for map controls
**Description:** Replace the current mobile filter overlay (fixed position, 60vh max-height, no gesture support) with a bottom sheet pattern that slides up with drag-to-dismiss. Standard mobile UX pattern (Google Maps, Apple Maps).
**Rationale:** Current mobile implementation hides filters behind a button with no drag affordance, competing with the detail panel for screen space. Bottom sheet pattern feels native on mobile.
**Downsides:** Major UI change. Needs touch gesture handling and animation work.
**Confidence:** 70%
**Complexity:** High
**Status:** Unexplored

### 15. Shared field mapping module
**Description:** The codebase has three naming conventions (DB: `belief_regulatory_stance`, API: `regulatoryStance`, frontend: `regulatory_stance`). The mapping lives in export-map.js, submit.js, and implicitly in every script. Create a single shared module that is the source of truth.
**Rationale:** CLAUDE.md warns "Any schema change must update this mapping or the map/plot will break silently." A new field requires edits in 4+ files. Missing any one produces silent data loss.
**Downsides:** Refactoring risk -- touching the mapping layer 3 days before launch is dangerous. Better for Phase 2 branch.
**Confidence:** 75%
**Complexity:** Medium-High
**Status:** Unexplored

### 16. Touch-friendly map interactions
**Description:** Add distinct touch gestures: single-tap opens detail panel, double-tap or tap-hold zooms. Current click handler combines both, causing the viewport to jump underneath an opaque mobile detail panel.
**Rationale:** On mobile, the zoom animation plays behind a full-width detail panel the user can't see. Separating gestures gives users control.
**Downsides:** Complex interaction design. Touch event handling is finicky across devices.
**Confidence:** 70%
**Complexity:** Medium
**Status:** Unexplored

### 17. Data-driven normalizeCategory
**Description:** Replace the 17-line `if (c.includes(...))` chain in map.html with a declarative mapping object. Makes it easy to add categories, testable, and extensible to resource categories.
**Rationale:** User flagged category normalization as fragile. Currently adding a new sector means finding the right spot in an if/else chain.
**Downsides:** Low risk refactor but needs to cover all existing variants.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

### 18. Topic-colored resource borders in All view
**Description:** Give resources a border/stroke color based on `resource_category` mapped to nearest org sector color, while keeping the rounded-square shape as differentiator.
**Rationale:** Resources in All view are visually identical. Topic coloring creates visual continuity with nearby org clusters without needing explicit edges.
**Downsides:** Requires the resource-to-sector color mapping from idea #10.
**Confidence:** 70%
**Complexity:** Low
**Status:** Unexplored

---

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | SQL injection via string interpolation | Currently mitigated by whitelist check on type; statusClause interpolation is more concerning but lower risk than functional bugs |
| 2 | Resource double-stores title/category | Low divergence probability before launch; submit.js stores consistently |
| 3 | Field name mismatch in pending resource search | Only affects pending resource autocomplete -- very narrow edge case |
| 4 | ~10 enrichment scripts query old tables | Batch maintenance tools not needed for launch; worth fixing later |
| 5 | seed-test-data.js old columns | Dev-only, not production path |
| 6 | template.yaml says "from Neon" | Documentation nit, zero runtime impact |
| 7 | API base URL hardcoded in 3 files | URL won't change during launch window |
| 8 | Shared CSS extraction | High leverage but risky regressions if done hastily; better as dedicated Phase 2 effort |
| 9 | Progressive disclosure form | Major form restructuring, too disruptive for current timeline |
| 10 | Plot view field validation | Defensive measure for a bug already fixed |

---

## Session Log
- 2026-03-31: Initial ideation -- 46 raw candidates generated across 6 sub-agents, 18 survived after adversarial filtering and user refinement. Split into Tier 1 (8 launch-critical) and Tier 2 (10 Phase 2/3 items).
