---
date: 2026-04-08
topic: performance-optimization
focus: Website loading speed, D3 rendering, caching, search/zoom responsiveness at 1,600+ entities
---

# Ideation: Performance Optimization at Scale

## Codebase Context

The site grew from ~654 to 1,600+ entities after a batch import on 2026-04-07. Key bottlenecks identified:

- **map-data.json**: ~2.9 MB pretty-printed (projected), ~700 KB gzipped. Single blocking fetch before any render.
- **D3 force simulation**: 6 forces, alphaDecay=0.04, ~100-168 ticks. O(n log n) per tick at 1,600 nodes. Runs from scratch on every page load AND every filter/view change (render() does `selectAll('*').remove()`).
- **Image loading**: 1,600 parallel fetch test chains (S3 → Wikipedia → Google Favicons) per page load. `thumbnail_url` is populated on 0/1,601 entities despite `cache-thumbnails.js` script existing.
- **DOM**: ~10,000+ SVG elements (1,600 `<g>` groups with clipPaths, patterns, images).
- **Deploy workflow**: No Cache-Control headers on any S3 objects.
- **Google Fonts**: Render-blocking `@import` in `<style>` on all pages.
- **Notes field**: avg 417 chars/entity, ~40-45% of JSON payload, only shown in detail panel on click.

## Ranked Ideas

### 1. Deploy-Time Thumbnail Caching
**Description:** Run existing `scripts/cache-thumbnails.js` to fetch all external images (Wikipedia, Google Favicons) into S3 with 1-year cache headers, populating `entity.thumbnail_url` in the DB. Add to CI deploy workflow. Eliminates all 1,600 runtime image probe chains.
**Rationale:** Script already exists and is fully implemented. Currently 0/1,601 entities have thumbnail_url set. Every page load fires 1,600+ parallel image probes with fallback chains.
**Downsides:** First run takes several minutes (1,600 external fetches). Must verify it doesn't overwrite admin-uploaded thumbnails.
**Confidence:** 90%
**Complexity:** Low
**Status:** Explored — 783/1,601 entities (49%) already have thumbnail_url populated. Remaining 387 people lack Wikipedia coverage, 270 orgs lack website URLs. Script correctly skips these. No CI integration needed since coverage is static.

### 2. Pre-Compute Force Simulation Positions at Deploy Time
**Description:** Run `d3-force` in Node.js during CI export step. Store final x,y per node in map-data.json (normalized to [0,1] coordinate space). Client skips simulation or runs 5-10 settle ticks instead of 100-168. Requires adding `d3-force` as a dev dependency.
**Rationale:** Force simulation is the dominant CPU cost. At 1,600 nodes: O(n log n) x 168 ticks = millions of calculations per page load. All users compute the identical deterministic layout — pure waste.
**Downsides:** Cluster centers currently computed from clientWidth/clientHeight at runtime. Pre-computed positions need normalization and runtime scaling. Different screen sizes get slightly different layouts during the settle pass.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Implemented (2026-04-08) — scripts/compute-positions.js replicates the full simulation (170 ticks) at deploy time. Client uses alpha=0.05/alphaDecay=0.1 (~25 ticks) for collision resolution. 85% reduction in client-side simulation cost.

### 3. Cache-Control Headers on Static Assets
**Description:** Deploy workflow `aws s3 sync` sets zero cache headers. Set: HTML -> `no-cache`, map-data.json -> `max-age=60, stale-while-revalidate=300`, CSS/JS/images -> `max-age=86400`.
**Rationale:** Every return visitor re-downloads all assets. The 700 KB gzipped JSON is fetched in full on every visit.
**Downsides:** Per-file cache-control in aws s3 sync requires exclude/include patterns.
**Confidence:** 85%
**Complexity:** Low
**Status:** Implemented (2026-04-08)

### 4. Incremental Re-Rendering (Stop Destroying SVG on Filter Changes)
**Description:** `render()` at line 3358 does `selectAll('*').remove()` on every filter chip click, stance toggle, and view switch. Refactor: maintain long-lived simulation, use D3 data join for add/remove, toggle `.filtered-hidden` CSS classes for filters. Pattern already exists in `applyFiltersToSearchResults()`.
**Rationale:** Every filter toggle triggers full SVG teardown + rebuild of 10,000+ elements + simulation restart from alpha=0.5. At 1,600 nodes this is 200-400ms of jank per click.
**Downsides:** Requires restructuring the 500-line render() monolith into setup + update phases. High correctness risk — zoom state, event handlers, simulation state must survive across filter changes. Ship after launch.
**Confidence:** 70%
**Complexity:** High
**Status:** Unexplored

### 5. Split map-data.json into Skeleton + Lazy-Loaded Detail
**Description:** Export two files: slim render JSON (id, name, entity_type, category, scores, thumbnail_url, x/y — ~300-400 KB) and detail JSON (notes, stance_detail, threat_models, etc. — fetched on detail panel click). Notes alone = ~40-45% of payload.
**Rationale:** Map rendering uses ~8-10 fields per entity. The rest (notes, belief details, social links) are only shown when clicking a node. Halves first-load payload.
**Downsides:** `buildConnections()` and `inferredLinks` may reference some detail-only fields. Admin Lambda must output both files. Requires careful field audit.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Implemented (2026-04-09) — splitMapData() strips detail-only fields (notes, stance_detail, threat_models, evidence_source, key_argument, twitter, bluesky, etc.) into map-detail.json. Skeleton: 142 KB gzipped (was 392 KB). Detail: 236 KB lazy-loaded in background after render. Zero data loss verified. Admin Lambda uploads both files. Deploy workflow updated.

### 6. Export Pipeline Cleanup (Minify JSON + Remove Dead Edge Array)
**Description:** (a) Change `JSON.stringify(data, null, 2)` to `JSON.stringify(data)` — saves ~15% raw. (b) Remove unused `edges` array from export — `allData.edges` has zero references in map.html. Saves 40 KB raw.
**Rationale:** Literal 1-2 line changes with zero risk. Gzip compresses whitespace well so real savings are ~5-8 KB gzipped, but it's free.
**Downsides:** Minification makes raw JSON harder to inspect. Marginal gzipped savings.
**Confidence:** 95%
**Complexity:** Low
**Status:** Implemented (2026-04-08)

### 7. Defer Google Fonts Loading (All Pages)
**Description:** Replace render-blocking `@import url(...)` inside `<style>` with non-blocking `<link rel="stylesheet" media="print" onload="this.media='all'">` + `<link rel="preconnect">`. Applied to all 6 HTML pages.
**Rationale:** Google Fonts CSS blocks first paint on every page load. The `media="print"` + onload pattern is the standard non-blocking font strategy.
**Downsides:** Brief FOUT (flash of unstyled text) while fonts load.
**Confidence:** 90%
**Complexity:** Low
**Status:** Implemented (2026-04-08)

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Viewport culling + LoD rendering | Premature at 1,600 nodes; simulation cost dwarfs DOM cost; multi-week effort for 2-3 person team |
| 2 | Web Worker for simulation | Pre-baked positions achieve same goal at 1/10th cost; Worker requires full architecture rewrite |
| 3 | Progressive DOM construction (requestIdleCallback) | Wrong bottleneck; simulation cost dwarfs DOM insert; creates pop-in visual jank |
| 4 | Pre-built inverted search index | O(n) scan over 5k objects is ~5ms; index adds payload cost with no perceptible benefit |
| 5 | Galaxy/cluster aggregate default view | Product decision, not perf fix; changes core value prop; needs design validation |
| 6 | Persist positions in localStorage | Superseded by deploy-time pre-computation; cache key needs version x view x viewport x filters |
| 7 | localStorage image cache | Moot after deploy-time thumbnail caching; stale URL risk |
| 8 | Batch/throttle image loading | Deploy-time caching solves at root; throttling is a symptom fix |

## Implementation Priority

**Shipped (2026-04-08):**
- Minify map-data.json (removed pretty-printing) — 18.5% raw savings
- Remove dead `edges` array from export — confirmed zero frontend refs
- Defer Google Fonts on all 6 pages — non-blocking `<link>` with preconnect
- Cache-Control headers in deploy workflow — HTML no-cache, JSON 60s+SWR, assets 24h
- Pre-compute force positions at deploy time — 85% simulation cost reduction
- Build adjacency Map index at load time — O(1) connection lookups
- Verified thumbnail_url coverage — 49% of entities already cached

**Post-launch:**
1. ~~Split JSON into skeleton + detail (idea 5)~~ — Done (2026-04-09). 63.9% initial payload reduction.
2. Incremental re-rendering / stop nuking SVG (idea 4) — eliminates filter jank

## Session Log
- 2026-04-08: Initial ideation — 38 candidates generated across 5 frames, 7 survived adversarial filtering. 4 quick wins implemented immediately (minify JSON, remove dead edges, defer fonts on 6 pages, cache-control headers). 3 ideas queued for pre-launch, 2 for post-launch.
- 2026-04-08: Session 2 — Implemented pre-computed positions (scripts/compute-positions.js, 170-tick server-side sim → 25-tick client settle). Built adjacency index (Map-based O(1) lookups replacing O(n) scans in buildConnections). Verified thumbnail coverage is already 49%. Final JSON: 1.96 MB raw, 402 KB gzipped for 1,020 entities.
- 2026-04-09: Session 3 — Implemented split JSON (idea 5). map-data.json skeleton: 1,118 KB raw / 142 KB gzipped. map-detail.json: 804 KB raw / 236 KB gzipped. 63.9% gzipped reduction for initial load. Detail lazy-loaded after render via background fetch. Also completed security hardening plan: CORS origin allowlist (shared api/cors.js replacing wildcard), API Gateway throttle 10→100 rps, artillery load testing infrastructure.
