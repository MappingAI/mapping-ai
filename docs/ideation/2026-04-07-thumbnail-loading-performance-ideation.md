---
date: 2026-04-07
topic: thumbnail-loading-performance
focus: Fast, reliable thumbnail loading for ~700 entities on stakeholder map
---

# Ideation: Thumbnail Loading Performance

## Codebase Context

**Project:** Static HTML/JS frontend with D3.js map showing ~400 people + ~300 orgs. AWS Lambda API, RDS PostgreSQL, S3/CloudFront CDN.

**Current Problem:**
- `scripts/cache-thumbnails.js` has 50%+ fail rate (Wikipedia API inconsistent, Google Favicons fail on obscure domains)
- Fallback chain: `thumbnail_url` (S3) → Google Favicons → Wikipedia API → initials
- 700 runtime image fetches if cache fails, causing slow map load (2-5 seconds of image popping in)

**Existing Infrastructure:**
- CI/CD: GitHub Actions deploys to S3 + CloudFront
- `map-data.json` is pre-generated and served from CDN (static-first design)
- S3 bucket + CloudFront distribution already exists for thumbnails
- Hardcoded `ORG_DOMAINS` (66 entries) and `PEOPLE_IMAGES` (75 entries) in map.html

## Ranked Ideas

### 1. Pre-resolve thumbnail URLs at build time
**Description:** During `export-map-data.js`, resolve all thumbnail URLs and embed them directly in map-data.json. For orgs, compute CloudFront/Google Favicons URL; for people, include Wikipedia URLs from cache or API. Frontend receives ready-to-use URLs.
**Rationale:** Eliminates 700 runtime lookups and fallback chains. Map renders immediately with all images ready. Zero client-side resolution logic needed. Leverages existing CI/CD pipeline.
**Downsides:** Build time increases slightly (~30s for 700 entities). Need to handle stale/changed URLs.
**Confidence:** 90%
**Complexity:** Low
**Status:** Selected for brainstorm

### 2. Run cache-thumbnails.js in CI/CD pipeline
**Description:** Add `node scripts/cache-thumbnails.js` to `.github/workflows/deploy.yml`. Every deploy automatically caches new entity thumbnails to S3, making coverage compound over time.
**Rationale:** Makes caching automatic, not manual. New entities automatically get cached thumbnails. 50%+ fail rate becomes a one-time problem per entity, not a recurring one.
**Downsides:** Increases deploy time by 2-5 minutes. Need to handle Wikipedia API failures gracefully (skip, don't fail build).
**Confidence:** 85%
**Complexity:** Low
**Status:** Selected for brainstorm

### 3. Store Wikipedia URLs directly when S3 cache fails
**Description:** Modify cache-thumbnails.js to store Wikipedia source URLs (not just S3-cached images) when S3 upload fails. Even "failed" caches become useful URLs in map-data.json.
**Rationale:** Eliminates runtime Wikipedia API calls entirely. Frontend can use Wikipedia URLs directly without API calls.
**Downsides:** Wikipedia URLs may change over time. Less control over image size/format.
**Confidence:** 80%
**Complexity:** Low
**Status:** Unexplored

### 4. Pre-bake SVG initials as fallback in map-data.json
**Description:** Generate colored SVG initials (2-letter, category-colored circles) as base64 data URIs during export. Every entity ships with a guaranteed "thumbnail_url" that renders instantly.
**Rationale:** Zero network requests for fallbacks. Map renders complete on first paint. No flash of empty → initials → image.
**Downsides:** Adds ~100KB to map-data.json. SVG generation adds complexity.
**Confidence:** 85%
**Complexity:** Medium
**Status:** Unexplored

### 5. Prioritize VIP entities (top 100 by importance)
**Description:** Track which entities get most views (via submission_count, detail panel opens). Ensure those always have working thumbnails via manual curation + aggressive caching prioritization.
**Rationale:** 80/20 rule - most users only examine major entities. Perfect coverage for Sam Altman, OpenAI, etc. matters more than 100% coverage.
**Downsides:** Requires defining "important" entities. Manual work for edge cases.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

### 6. Thumbnail validation + status tracking
**Description:** Pre-validate all thumbnail URLs and store status field (cached|external|failed|initials). Frontend shows initials immediately for failed entities - no wasted HTTP requests.
**Rationale:** Frontend knows instantly which entities have no image. Failed entities render correctly on first paint. Provides data for prioritizing manual uploads.
**Downsides:** Adds complexity to cache script. Another field to maintain.
**Confidence:** 80%
**Complexity:** Medium
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Canvas-based node rendering | Too expensive - requires full D3 rewrite for marginal gain |
| 2 | AI-generated portraits | Overkill - adds vendor cost and quality concerns |
| 3 | Image CDN (Cloudinary/imgix) | Adds vendor dependency; solvable in-house |
| 4 | Downloadable asset pack ZIP | Overcomplicated; browser caching already works |
| 5 | Programmatic SVG patterns (identicons) | Users want real photos, not abstract patterns |
| 6 | Connection-aware loading | Complexity without significant UX gain |
| 7 | Multiple srcset sizes | Overcomplicated for small thumbnails (<128px) |
| 8 | Service worker image cache | Helps repeat visits only, not first load |
| 9 | IndexedDB client cache | Same as service worker - wrong problem |
| 10 | Blur-up placeholders | Adds complexity without solving core issue |
| 11 | Lazy load on hover only | Too aggressive - map looks empty |
| 12 | Sprite sheet of all thumbnails | Complex to maintain; HTTP/2 makes it less valuable |
| 13 | Base64 inline all images | Would bloat map-data.json to 5MB+ |

## Session Log
- 2026-04-07: Initial ideation — 40 candidates generated, 6 survived. User selected #1+2 for brainstorm.
