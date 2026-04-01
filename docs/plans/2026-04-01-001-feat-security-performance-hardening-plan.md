---
title: "feat: Security hardening + performance optimization for Phase 2/3"
type: feat
status: active
date: 2026-04-01
---

# Security Hardening + Performance Optimization

## Overview

Harden the API layer, add load testing, implement caching for faster UX, and tune the D3 force simulation before Phase 2 (4/7 outreach) and Phase 3 (4/9 public launch). The current infrastructure handles low traffic well but has known gaps that will surface under real-world load and adversarial use.

## Problem Frame

The site launches to trusted contacts on 4/3 and goes public on 4/9. Current issues:
- **Connection exhaustion risk**: Each Lambda creates a 10-connection pool. RDS db.t4g.micro supports ~82 connections. 50 concurrent Lambda containers = 500 connections = crash.
- **No load testing**: Zero baseline measurements. API Gateway throttle is 10 req/s — will 429 most traffic at scale.
- **SQL injection surface**: search.js uses string interpolation for type/status clauses. Safe today via whitelist but fragile.
- **Pending data leaked**: `/search?status=pending` accessible without auth. Exposes unreviewed submissions.
- **CORS wide open**: All Lambdas return `Access-Control-Allow-Origin: *`, overriding API Gateway's origin whitelist.
- **Image loading slow**: ~50 favicon 404s per page load, Wikipedia API called on every visit, no persistent cache.
- **Map jiggle**: D3 force simulation over-reacts after dragging — nodes bounce for several seconds due to slow alpha decay and low velocity damping.

## Requirements Trace

- R1. API survives 1000 concurrent read requests without connection exhaustion or 5xx errors
- R2. Write path (submissions) survives 100 concurrent POSTs without data loss
- R3. Search API restricts `status=pending` and `status=all` to authenticated requests
- R4. All SQL in search.js uses parameterized queries (no string interpolation)
- R5. CORS headers restrict to known origins (not `*`)
- R6. Image URLs cached in localStorage to eliminate redundant 404s and API calls
- R7. Map nodes settle within 1 second after drag release (no prolonged jiggle)
- R8. Load test script exists and can be run before each phase launch

## Scope Boundaries

- **In scope**: Lambda connection config, search.js hardening, CORS fix, image caching, D3 physics tuning, load testing with artillery/k6, API Gateway throttle adjustment
- **Not in scope**: RDS Proxy (adds cost/complexity, revisit if connection pooling fix isn't sufficient), Redis/ElastiCache, switching to canvas rendering, full auth system (OAuth/JWT), rate limiting per-IP

## Context & Research

### Relevant Code and Patterns

- **Connection pooling**: All 5 Lambdas use `new pg.Pool({ connectionString, ssl })` at module scope. No `max`, `idleTimeoutMillis`, or `connectionTimeoutMillis` configured. `pg` defaults to `max: 10`.
- **SQL construction**: `api/search.js:47` interpolates `entityType` from whitelist into SQL. `statusClause` on line 42 uses ternary with hardcoded strings. Both are safe-by-coincidence but not defense-in-depth.
- **Image loading**: `map.html` has two-tier org logo loading (S3 cached → Google Favicons fallback) and three-tier people images (thumbnail_url → hardcoded map → Wikipedia API). In-memory `wikiImageCache` prevents duplicate calls within a session but not across page loads.
- **D3 simulation**: `alphaDecay(0.04)`, no `velocityDecay` set (default 0.4). Drag sets `alphaTarget(0.3)` on start, `alphaTarget(0)` on end. Post-drag cooldown takes ~75 ticks at 0.04 decay.
- **API Gateway**: `ThrottlingRateLimit: 10`, `ThrottlingBurstLimit: 20` in template.yaml. Very restrictive for public launch.
- **CORS**: template.yaml restricts origins but every Lambda handler returns `Access-Control-Allow-Origin: *`, overriding the gateway config.
- **CDN caching**: `map-data.json` has `max-age=60` when uploaded by admin Lambda. Static files via deploy.yml get CloudFront's default CachingOptimized (24h TTL).

### Institutional Learnings

- D3 force simulation outperforms Cytoscape for this use case (validated in frontend_lessons.md)
- Client-side search from static JSON is the performance strategy — don't add server round-trips for approved entities
- No prior load testing exists anywhere in the codebase
- No connection pooling strategy documented; Lambda-RDS co-located in eu-west-2

## Key Technical Decisions

- **Pool max=1 per Lambda** instead of RDS Proxy: Lambda is single-threaded per invocation. Setting `max: 1` limits each container to 1 DB connection. With 82 max_connections on db.t4g.micro, this supports ~80 concurrent Lambda containers across all functions. RDS Proxy would raise this ceiling but adds $15/mo and operational complexity — defer until needed.
- **Parameterize via positional params** not template literals: Switch type/status to `$N` placeholders in the SQL query. More robust than the current whitelist approach.
- **localStorage for image cache** not sessionStorage: Persist across page loads so returning users don't re-fetch. Use a TTL of 7 days to avoid stale URLs.
- **Increase alpha decay on drag end** not snap to zero: Setting alpha=0 instantly freezes the layout mid-transition. Better to increase `alphaDecay` temporarily (0.15 → settles in ~20 ticks ≈ 0.3s) then restore the original value.
- **Artillery for load testing** not k6: Artillery is Node.js-native, matches the stack, and has built-in AWS Lambda support. Install as devDep.

## Open Questions

### Resolved During Planning

- **Q: Should we use RDS Proxy?** No — pool max=1 is sufficient for the expected traffic. RDS Proxy is a scaling option if we exceed ~80 concurrent containers.
- **Q: Should image caching be service worker-based?** No — localStorage with TTL is simpler and sufficient. Service workers add complexity for minimal gain on a static site.

### Deferred to Implementation

- **Q: Exact artillery scenario shape** — Will depend on the actual response times observed in baseline testing.
- **Q: Which favicon domains have S3-cached logos already?** — Need to list S3 logos/ prefix to determine coverage.

## Implementation Units

- [ ] **Unit 1: Lambda connection hardening**

  **Goal:** Prevent connection exhaustion under load by limiting pool size and adding timeouts.

  **Requirements:** R1, R2

  **Dependencies:** None

  **Files:**
  - Modify: `api/search.js`, `api/submit.js`, `api/admin.js`, `api/submissions.js`, `api/upload.js`

  **Approach:**
  - Set `max: 1` on every `pg.Pool` (Lambda runs one request at a time per container)
  - Add `connectionTimeoutMillis: 5000` (fail fast if RDS is overloaded)
  - Add `idleTimeoutMillis: 30000` (release idle connections for Lambda reuse)
  - Add `statement_timeout` via pool `options` parameter: `options: '-c statement_timeout=10000'` (10s query timeout)

  **Patterns to follow:** Existing module-scope pool pattern in all 5 files.

  **Test scenarios:**
  - Happy path: Search query completes within 5s with pool max=1
  - Edge case: Pool connection timeout fires after 5s when RDS is unreachable (verify error message, not hang)
  - Error path: Statement timeout kills a slow query after 10s

  **Verification:** All 5 Lambda files have identical pool config. `grep -c "max: 1" api/*.js` returns 5.

---

- [ ] **Unit 2: Parameterize search.js SQL**

  **Goal:** Eliminate string interpolation in SQL queries for defense-in-depth.

  **Requirements:** R4

  **Dependencies:** None

  **Files:**
  - Modify: `api/search.js`

  **Approach:**
  - Replace `typeClause` string interpolation with a conditional `$N` parameter
  - Replace `statusClause` string concatenation with a conditional `$N` parameter
  - Build the query dynamically with a params array, incrementing the placeholder index

  **Patterns to follow:** The `$1`/`$2` parameterization already used for `q` and `%${query}%` in the same file.

  **Test scenarios:**
  - Happy path: `?q=anthropic&type=person` returns only person entities
  - Happy path: `?q=anthropic` (no type) returns all entity types
  - Edge case: `?type=invalid_value` returns results with no type filter (typeMap lookup fails → no clause)
  - Error path: `?q=test' OR 1=1--&type=person` returns empty results (parameterized query prevents injection)

  **Verification:** Zero string interpolation in the SQL query. All user-derived values use `$N` placeholders.

---

- [ ] **Unit 3: Restrict search status to admin-only**

  **Goal:** Prevent unauthenticated access to pending/internal entities via search.

  **Requirements:** R3

  **Dependencies:** None

  **Files:**
  - Modify: `api/search.js`
  - Modify: `contribute.html` (remove `status=pending` from autocomplete fallback)

  **Approach:**
  - If `status=pending` or `status=all` is requested, check for admin key in `event.headers?.['x-admin-key']` or `event.queryStringParameters?.key`
  - If no valid key, ignore the status param and default to `approved`
  - Update contribute.html pending entity search to not pass `status=pending` — it should only search approved entities for autocomplete. Pending entities are admin-only concern.

  **Patterns to follow:** Admin key check pattern in `api/admin.js` (reads `process.env.ADMIN_KEY`).

  **Test scenarios:**
  - Happy path: `/search?q=test` returns only approved entities
  - Happy path: `/search?q=test&status=pending&key=ADMIN_KEY` returns pending entities
  - Error path: `/search?q=test&status=pending` (no key) returns only approved entities (status param silently ignored)
  - Integration: contribute.html autocomplete no longer shows pending entities in results

  **Verification:** `curl /search?q=a&status=pending` without admin key returns zero pending-status results.

---

- [ ] **Unit 4: Fix CORS headers**

  **Goal:** Restrict API access to known origins instead of `*`.

  **Requirements:** R5

  **Dependencies:** None

  **Files:**
  - Modify: `api/search.js`, `api/submit.js`, `api/admin.js`, `api/submissions.js`, `api/upload.js`

  **Approach:**
  - Create shared CORS helper (or inline) that checks `event.headers?.origin` against an allowlist
  - Allowlist: `mapping-ai.org`, `www.mapping-ai.org`, `aimapping.org`, `www.aimapping.org`, CloudFront domain, `localhost:3000`
  - Return the matched origin in `Access-Control-Allow-Origin` (not `*`)
  - If origin not in list, omit the CORS header (browser blocks the request)

  **Patterns to follow:** Origin allowlist already defined in template.yaml `CorsConfiguration.AllowOrigins`.

  **Test scenarios:**
  - Happy path: Request from `https://mapping-ai.org` gets `Access-Control-Allow-Origin: https://mapping-ai.org`
  - Happy path: Request from `http://localhost:3000` gets the matching origin header
  - Error path: Request from `https://evil.com` gets no CORS header
  - Edge case: Request with no Origin header (direct curl) still works (CORS is browser-enforced)

  **Verification:** `grep -r "Allow-Origin.*\*" api/` returns zero matches.

---

- [ ] **Unit 5: Image URL caching in localStorage**

  **Goal:** Cache resolved image URLs to eliminate redundant 404s and Wikipedia API calls across page loads.

  **Requirements:** R6

  **Dependencies:** None

  **Files:**
  - Modify: `map.html`

  **Approach:**
  - Create an `ImageCache` helper that wraps localStorage with a 7-day TTL per entry
  - Key format: `img:${domain}` for favicons, `img:${name}` for people
  - Before fetching favicon/Wikipedia, check cache. On success, store URL. On failure (404), store `'none'` to skip future attempts.
  - Apply to both the org logo loading chain and the Wikipedia headshot chain
  - Cap total cache entries at ~500 (LRU eviction or just clear all if over limit)

  **Patterns to follow:** Existing `wikiImageCache` in-memory pattern in map.html (lines 914+). Existing localStorage usage for theme, onboarding, view.

  **Test scenarios:**
  - Happy path: First visit fetches Wikipedia API, second visit reads from localStorage (no network call)
  - Happy path: Cached `'none'` entry skips the fetch entirely for known-404 domains
  - Edge case: Cache entry older than 7 days is ignored and re-fetched
  - Edge case: Cache exceeds 500 entries — oldest entries are evicted

  **Verification:** Open map, observe network tab shows Wikipedia API calls. Reload — Wikipedia calls should be zero (all served from cache).

---

- [ ] **Unit 6: D3 force simulation damping**

  **Goal:** Reduce post-drag jiggle so nodes settle within ~1 second.

  **Requirements:** R7

  **Dependencies:** None

  **Files:**
  - Modify: `map.html`

  **Approach:**
  - Add `velocityDecay(0.6)` to the simulation (default 0.4 — higher = more damping)
  - On drag end: temporarily set `alphaDecay(0.15)` (currently 0.04) so simulation cools 3.75x faster
  - After simulation reaches `alphaMin` (settled), restore `alphaDecay(0.04)` for future interactions
  - Use `simulation.on('end', () => simulation.alphaDecay(0.04))` to restore

  **Patterns to follow:** Existing drag behavior in map.html (lines 1811-1814 for cluster view, lines 2200-2203 for plot view). Apply to both.

  **Test scenarios:**
  - Happy path: Drag a node and release — other nodes settle within 1 second (no prolonged bouncing)
  - Happy path: Initial page load still animates smoothly into cluster positions (velocityDecay doesn't over-dampen the initial layout)
  - Edge case: Rapid successive drags don't accumulate alpha and create chaotic motion

  **Verification:** Visual — drag and release a node, count seconds until motion stops. Should be <1s.

---

- [ ] **Unit 7: API Gateway throttle adjustment**

  **Goal:** Increase API throughput limits for Phase 2/3 traffic.

  **Requirements:** R1

  **Dependencies:** None

  **Files:**
  - Modify: `template.yaml`

  **Approach:**
  - Increase `ThrottlingRateLimit` from 10 to 100 req/s
  - Increase `ThrottlingBurstLimit` from 20 to 200
  - These are across all routes. Per-route throttling can be added later if needed (e.g., tighter on `/submit` to prevent spam floods)

  **Test scenarios:**
  - Happy path: 50 concurrent requests to `/search` all return 200 (no 429s)
  - Edge case: 300 requests/s sustained — verify some get 429 (throttle still works, just higher)

  **Verification:** `sam deploy` succeeds. Load test confirms no 429s at expected traffic levels.

---

- [ ] **Unit 8: Load testing script**

  **Goal:** Create a repeatable load test that validates R1 and R2 before each phase launch.

  **Requirements:** R1, R2, R8

  **Dependencies:** Units 1, 7 (pool config and throttle should be deployed first)

  **Files:**
  - Create: `scripts/load-test.yml` (artillery config)
  - Create: `scripts/load-test.sh` (wrapper script)
  - Modify: `package.json` (add `artillery` to devDependencies, add `test:load` script)

  **Approach:**
  - Artillery YAML config with 3 phases: warm-up (10 rps, 30s), ramp (10→100 rps, 60s), sustained (100 rps, 60s)
  - Scenarios: 70% GET /search (read), 20% GET /submissions (heavy read), 10% POST /submit (write)
  - Assert: p99 latency < 3s, error rate < 1%, zero 5xx
  - Wrapper script sources .env for API_BASE and runs artillery

  **Test scenarios:**
  - Happy path: All phases complete with p99 < 3s and 0% errors
  - Error path: Connection exhaustion under sustained load — artillery report shows 5xx spike (this is the baseline we're trying to prevent with Unit 1)

  **Verification:** `npm run test:load` completes and generates a report. Share report before each phase launch.

## System-Wide Impact

- **Connection pooling change (Unit 1):** Affects all 5 Lambda functions. Reduces max connections per container from 10 to 1. Must deploy all functions simultaneously via `sam deploy`.
- **CORS change (Unit 4):** May break any third-party integrations calling the API directly. Currently none known, but verify with team.
- **Throttle increase (Unit 7):** Higher throughput means more RDS load. Unit 1 (connection limits) must be deployed first to prevent connection exhaustion.
- **contribute.html change (Unit 3):** Removing pending entity search from autocomplete means contributors can't see if their recent submission already exists as pending. Acceptable tradeoff — they can still see approved entities.

## Risks & Dependencies

| Risk | Impact | Mitigation |
|------|--------|------------|
| RDS connection exhaustion at 80+ concurrent Lambdas | 5xx errors, data loss on writes | Pool max=1, connectionTimeout, statement_timeout. Monitor with CloudWatch RDS metrics. Escalation path: RDS Proxy. |
| API Gateway throttle too aggressive | 429 errors for legitimate users | Increase to 100/200. Monitor 429 count in CloudWatch. |
| localStorage cache grows unbounded | Slows page load on low-memory devices | Cap at 500 entries, 7-day TTL, LRU eviction |
| CORS tightening breaks existing users | API calls fail from unlisted origins | Allowlist includes all known domains + localhost. Add `aimapping.org` variants. |
| Artillery load test against production | Actual user impact during test | Run during low-traffic hours (late night ET). Or test against dev-server locally for smoke test. |

## Sequencing

**Phase A (deploy before 4/3 launch):**
- Unit 1: Connection hardening (prevents crash under any load)
- Unit 2: SQL parameterization (quick, zero-risk improvement)
- Unit 3: Search auth for pending (security fix)
- Unit 6: D3 damping (UX fix, client-side only)

**Phase B (deploy before 4/7 Phase 2):**
- Unit 4: CORS fix (coordinate with team to verify no breakage)
- Unit 5: Image caching (client-side, low risk)
- Unit 7: Throttle adjustment (needs Unit 1 deployed first)
- Unit 8: Load test (validate everything together)
