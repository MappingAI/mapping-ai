---
title: 'refactor: Migrate infrastructure from AWS to Cloudflare + Neon + TanStack Start'
type: refactor
status: active
date: 2026-04-21
last_updated: 2026-04-21
---

> **Update 2026-04-21:** Phase 1.1 (npm → pnpm) shipped in [PR #44](https://github.com/MappingAI/mapping-ai/pull/44). See changelog at the end of this file.

# refactor: Migrate infrastructure from AWS to Cloudflare + Neon + TanStack Start

## Overview

Move the mapping-ai stack off AWS (RDS + Lambda + API Gateway + CloudFront + S3 + SAM + npm) to a Cloudflare-native stack (Workers + R2 + Neon + TanStack Start + pnpm). Rationale, alternatives considered, and consequences captured in [ADR-0001](../architecture/adrs/0001-migrate-off-aws.md). Current state of production lives in [`docs/architecture/current.md`](../architecture/current.md); target state lives in [`docs/architecture/target.md`](../architecture/target.md).

This plan is a task-by-task checklist. Check items off as they land. Each phase is one or more PRs. Phase 0 is complete; Phase 1+ is open.

## Canonical references

Before starting any task in this plan, read these in order:

1. [`docs/architecture/adrs/0001-migrate-off-aws.md`](../architecture/adrs/0001-migrate-off-aws.md): decision, alternatives considered, phasing, risk mitigations.
2. [`docs/architecture/current.md`](../architecture/current.md): live stack. Updated atomically at each cutover, so if it says "AWS RDS Postgres" that is what is actually running.
3. [`docs/architecture/target.md`](../architecture/target.md): target stack with per-area status table. Update the table as each row ships.
4. This file: task checklist and handoff context.

## Status summary

| Phase                                    | Status     | PR / Notes                                                                                            |
| ---------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| 0: Docs hygiene                          | ✅ Done    | [PR #43](https://github.com/MappingAI/mapping-ai/pull/43), merged 2026-04-21                          |
| 1.1: npm → pnpm                          | ✅ Done    | [PR #44](https://github.com/MappingAI/mapping-ai/pull/44), merged 2026-04-21                          |
| 1.2: Security baseline                   | ⏸ Deferred | Run post-Phase 3 when the target stack is live (more informative baseline)                            |
| 1.3: Reconnaissance doc                  | ⏳ Pending | Can run in parallel with 1.1                                                                          |
| 2.0: R2 bucket + Pages Function          | ✅ Done    | [PR #51](https://github.com/MappingAI/mapping-ai/pull/51), branch `feat/crosspartisan-enrichment`     |
| 2.1: Schema + data to Neon               | 🟡 Active  | Neon `claims-pilot` branch has full data. Schema diff audited 2026-04-26. See Phase 2.1 details below |
| 2.2: Per-PR Neon branch automation       | ⏳ Pending | Depends on 2.1                                                                                        |
| 3.0: TanStack Start map spike            | ⏳ Pending | Throwaway spike. Decision gate for Phase 3+                                                           |
| 3.1–3.10: Full TanStack Start migration  | ⏳ Pending | Gated on 3.0 outcome                                                                                  |
| 4.x: End-to-end preview deploys          | ⏳ Pending | Depends on Phase 2 + 3                                                                                |
| 5.x: Tech debt (pending IDs, analytics…) | ⏳ Pending | Post-cutover. Not blocking.                                                                           |

Legend: ✅ done, 🟡 active, ⏳ pending, ⏸ deferred.

---

## Phase 0: Docs hygiene (COMPLETE)

Shipped 2026-04-21 in [PR #43](https://github.com/MappingAI/mapping-ai/pull/43) (merge commit `30d02c2c`).

- [x] Audit every instruction file and memory file for architecture claims that will contradict the target stack
- [x] Scaffold `docs/architecture/` with `current.md`, `target.md`, `adrs/0001-migrate-off-aws.md`, `phase-0-audit.md`
- [x] Absorb `TECH.md` into `current.md`, delete `TECH.md`
- [x] Trim `CLAUDE.md` (27KB to 11KB), point to `docs/architecture/` instead of asserting architecture
- [x] Trim `ONBOARDING.md` (removed ASCII topology + external deps table, pointers to `current.md`)
- [x] Trim `README.md` (tech stack bullets collapsed to one-line summary + pointer)
- [x] Banner on `docs/DEPLOYMENT.md` naming the current stack so procedures are framed
- [x] Historical-context header on 5 post-mortem and integration-issue docs
- [x] Delete obsolete memory files (`aws_migration.md`, `project_arch.md`, `react_migration_status.md`, `launch_timeline.md`, `backend_lessons.md`)
- [x] Rewrite stale memory (`data_pipeline.md`)
- [x] Add delete-at-cutover markers to `feedback_sam_deploy_danger.md`, `feedback_no_defer_d3.md`
- [x] Save Neon project ID to `memory/neon_project.md`
- [x] Update `MEMORY.md` index

---

## Phase 1: Low-risk standalone wins

Each of these is one PR. None blocks the others. All operate on the current AWS stack.

### 1.1 npm to pnpm migration ✅ DONE 2026-04-21

Shipped in [PR #44](https://github.com/MappingAI/mapping-ai/pull/44).

- [x] Create branch `chore/pnpm-migration` off latest `main`
- [x] Verify pnpm availability locally (installed via `npm install -g pnpm@10.33.0`)
- [x] Run `pnpm import` to convert `package-lock.json` → `pnpm-lock.yaml`
- [x] Delete `package-lock.json`
- [x] Run `pnpm install` clean; confirm `node_modules` is sane
- [x] Exercise every script in `package.json`: typecheck, lint, format:check, test (45 pass), build, build:tiptap
- [x] Update `.github/workflows/ci.yml`: `pnpm/action-setup@v4.1.0` SHA-pinned, `cache: pnpm`, `pnpm install --frozen-lockfile`
- [x] Update `.github/workflows/deploy.yml`: same install pattern, `pnpm exec` replaces `npx`
- [x] Update `scripts/build-preview.sh` for Cloudflare Pages (self-installs pnpm via corepack as fallback)
- [x] Update `CLAUDE.md` Commands section
- [x] Update `ONBOARDING.md` setup commands and scripts table
- [x] Update `README.md` Quick Start
- [x] Update `docs/DEPLOYMENT.md`
- [x] Update `docs/architecture/current.md`: Package management section
- [x] Update `docs/architecture/target.md`: Package manager row marked shipped
- [x] Update `src/workshop/App.tsx` and `workshop/DATABASE-ORIENTATION.md` (caught in pre-merge audit)
- [x] Fix `package.json` dev script (`concurrently` `npm:` shorthand → explicit `pnpm run`) per Devin review
- [x] Update CF Pages dashboard Build command from `npm ci && bash scripts/build-preview.sh` to `bash scripts/build-preview.sh` (dashboard change, not in repo)
- [x] PR merged, prod deploy ran on pnpm pipeline, smoke test 6/6 green

**Post-merge observations:**

- Dependabot's `npm` ecosystem auto-detects pnpm and updates `pnpm-lock.yaml` correctly; no `.github/dependabot.yml` changes needed.
- GitHub is deprecating Node 20 actions in June 2026. All our pinned actions (checkout, setup-node, configure-aws-credentials, pnpm/action-setup) will need bumps eventually. Low priority.
- Pre-existing PR #36 (dotenv bump from before the migration) may have merge conflicts. Rebase or close and let Dependabot recreate.

### 1.2 Security baseline with /security-review (DEFERRED)

User's call 2026-04-21: run this post-Phase 3 against the target stack, not now. A pre-migration baseline on a stack we're about to replace has limited value. Revisit after 3.9 cutover.

- [ ] (Deferred) Run `/security-review` against main post-Phase 3
- [ ] (Deferred) Save output to `docs/security-baselines/YYYY-MM-DD-post-migration.md`
- [ ] (Deferred) Triage findings, open issues for any needing action

### 1.3 Reconnaissance doc (read-only)

Investigation to surface gaps before later phases depend on assumptions. Pure read-only; output is one markdown doc.

- [ ] Thumbnail pipeline: trace end-to-end (generation trigger, what runs when, cache semantics, what happens on skip/fail, what the frontend expects). Source: `scripts/cache-thumbnails.js`, `api/admin.ts` (thumbnail_url handling), `map.html` (resolveEntityImage), and the 2026-04-19 integration-issue doc.
- [ ] Pending-entity negative-ID system: where the negative IDs are generated, where consumed, what breaks if the scheme changes. Touches Phase 5.1.
- [ ] Programmatic enrichment submissions: how `scripts/enrich-*.ts` write to the DB today, whether they hit `/submit` or INSERT directly, and whether they need staging isolation.
- [ ] CI coverage reality: what `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, and `sam validate` actually cover vs what instruction files claim. Check whether any script is stale or silently skipped.
- [ ] Output: `docs/brainstorms/2026-04-21-phase-1-recon.md`

---

## Phase 2: Neon + R2 migration

Prereq: `neonctl` authenticated on Anushree's machine (done 2026-04-21). Project `calm-tree-46517731` in `aws-us-east-1`. See `memory/neon_project.md`.

### 2.0 R2 bucket + Pages Function ✅ DONE 2026-04-26

Shipped in [PR #51](https://github.com/MappingAI/mapping-ai/pull/51) on branch `feat/crosspartisan-enrichment`.

- [x] Create R2 bucket `mapping-ai-data` via `wrangler r2 bucket create`
- [x] Enable public `r2.dev` URL for initial testing, then disable it
- [x] Set CORS rules for `r2.dev` (later removed when public access disabled)
- [x] Create `functions/data/[file].ts` Pages Function to proxy R2 objects through the Pages domain
- [x] Allowlist: `claims-detail.json`, `agi-definitions.json` (add more as needed)
- [x] Cache-Control: `public, max-age=300, s-maxage=3600` (5 min browser, 1 hour edge)
- [x] Add `wrangler.toml` with R2 binding (`DATA_BUCKET` -> `mapping-ai-data`)
- [x] Add R2 binding in Cloudflare Pages dashboard (Settings > Bindings > R2 bucket)
- [x] Create `scripts/export-claims-data.js` for Neon -> R2 upload pipeline
- [x] Add `pnpm run db:export-claims` and `pnpm run db:export-claims:upload` npm scripts
- [x] Gitignore `public/claims-detail.json` and `public/agi-definitions.json`
- [x] Verify data serves at `/data/claims-detail.json` and `/data/agi-definitions.json` on preview

**R2 bucket details:**

- Bucket: `mapping-ai-data`
- Public access: Disabled (private bucket, served via Pages Function only)
- Upload: `pnpm run db:export-claims:upload` (requires `wrangler login`)
- Files currently stored: `claims-detail.json` (2.1 MB), `agi-definitions.json` (295 KB)

**To add `map-data.json` and `map-detail.json` to R2 (Phase 3.7):**

- Add them to the `ALLOWED_FILES` set in `functions/data/[file].ts`
- Update the export script or add them to `export-claims-data.js`
- Update `map.html` to fetch from `/data/map-data.json` instead of relative `/map-data.json`

### 2.1 Schema and data cutover

**Schema audit completed 2026-04-26.** Findings from comparing `scripts/migrate.js` (RDS schema) against live Neon `claims-pilot` branch:

**Neon has everything RDS has, plus:**

- Two extra tables: `claim` (19 cols), `source` (11 cols) for the claims pipeline
- Six extra entity columns: `qa_approved`, `importance`, `notes_confidence`, `notes_sources`, `enrichment_version`, `notes_v1`
- Four extra edge columns: `confidence`, `start_date`, `end_date`, `source_url`
- One extra submission column: `affiliated_org_ids` (JSONB)
- All triggers and functions from RDS exist on Neon (verified: `trg_entity_search`, `trg_before_submission_update`, `trg_after_submission_update`, all 4 functions)
- Three orphaned legacy functions on Neon (safe to drop): `update_people_search`, `update_organizations_search`, `update_resources_search`

**Default value difference:** `entity.status` defaults to `'approved'` on Neon vs `'pending'` on RDS. The `before_submission_update()` trigger sets status explicitly, so this only affects direct INSERTs outside the submission flow.

**`qa_approved` column:** Exists on Neon (BOOLEAN default false). The RDS `migrate.js` references it in the `before_submission_update()` trigger INSERT but never creates it as a column. It was likely added via ad-hoc ALTER TABLE on RDS. `api/export-map.js` filters on `qa_approved = true` (lines 118, 127-128).

**Type widening:** Neon widened most VARCHAR columns to TEXT. Functionally compatible and preferable in PostgreSQL.

**What must happen before DB cutover:**

- [ ] Fresh data sync: `pg_dump` from RDS, `pg_restore` to Neon main branch (not the `claims-pilot` branch). Compare row counts for `entity`, `submission`, `edge`.
- [ ] Verify `qa_approved` column exists and is populated correctly on the target Neon branch (it does on `claims-pilot`)
- [ ] Verify all 4 triggers fire correctly: submit a test entity, approve it, confirm entity is created and scores recalculated
- [ ] Verify `entity.status` default won't cause issues (submission flow always sets it explicitly)
- [ ] Drop orphaned functions: `update_people_search`, `update_organizations_search`, `update_resources_search`
- [ ] Take a final RDS snapshot via AWS Console or CLI before cutover

**Testing on this branch (before merging to main):**

- [ ] Run `DATABASE_URL=<neon-pilot> pnpm run dev` locally
- [ ] Test form submission flow: submit from `/contribute`, verify INSERT into `submission` table
- [ ] Test admin flow: approve submission, verify entity created via trigger, scores recalculated
- [ ] Test search: verify full-text search works against Neon
- [ ] Test `pnpm run db:export-map`: verify `map-data.json` generates correctly from Neon
- [ ] Test `pnpm run db:export-claims:upload`: verify claims data exports and uploads to R2
- [ ] Verify map renders with Neon-sourced data (map.html loads map-data.json + claims-detail.json)
- [ ] Verify insights page loads crosspartisan viz + AGI definition space from R2

**Production cutover (separate from this branch):**

- [ ] Update GitHub Secrets `DATABASE_URL` to Neon prod URL
- [ ] Update Lambda via `sam deploy` with new `DatabaseUrl` parameter (drift-check first)
- [ ] Update local `.env`s for team members
- [ ] Smoke test: submit, approve, verify map regenerates
- [ ] Keep RDS warm as fallback for one week minimum
- [ ] Update `docs/architecture/current.md`: Database section flips to Neon
- [ ] Update `docs/architecture/target.md`: mark Database row as **shipped**
- [ ] Update `memory/credentials.md`: note Neon cutover

**API endpoint migration (Lambda -> Pages Functions):**

Currently all 6 API endpoints run as Lambda functions. For a complete migration:

| Endpoint             | Lambda handler         | Pages Function path              | Writes to              | Reads from               | Side effects                                            |
| -------------------- | ---------------------- | -------------------------------- | ---------------------- | ------------------------ | ------------------------------------------------------- |
| POST /submit         | api/submit.js          | functions/api/submit.ts          | submission             | contributor_keys         | LLM review (fire-and-forget)                            |
| GET /search          | api/search.js          | functions/api/search.ts          | (none)                 | entity (full-text)       | (none)                                                  |
| GET /semantic-search | api/semantic-search.js | functions/api/semantic-search.ts | (none)                 | entity                   | Anthropic API call                                      |
| GET/POST /admin      | api/admin.js           | functions/api/admin.ts           | submission, entity     | entity, edge, submission | S3 upload -> R2, CloudFront invalidation -> cache purge |
| POST /upload         | api/upload.js          | functions/api/upload.ts          | entity (thumbnail_url) | (none)                   | S3 upload -> R2                                         |
| GET /submissions     | api/submissions.js     | functions/api/submissions.ts     | (none)                 | entity, edge             | (none)                                                  |

The admin and upload endpoints need the most work because they currently use `@aws-sdk/client-s3` and `@aws-sdk/client-cloudfront`. These would be replaced with R2 bucket bindings and Cloudflare Cache Purge API.

**Secrets that need updating:**

| Current secret               | Where used                             | New value                            |
| ---------------------------- | -------------------------------------- | ------------------------------------ |
| `DATABASE_URL`               | GitHub Actions, Lambda env, local .env | Neon prod URL                        |
| `AWS_ACCESS_KEY_ID`          | GitHub Actions (S3 sync, CloudFront)   | Remove (use wrangler deploy instead) |
| `AWS_SECRET_ACCESS_KEY`      | GitHub Actions                         | Remove                               |
| `S3_BUCKET_NAME`             | GitHub Actions (deploy.yml)            | Remove (R2 via Pages Function)       |
| `CLOUDFRONT_DISTRIBUTION_ID` | GitHub Actions, Lambda env             | Remove (Cloudflare CDN purge)        |
| `ADMIN_KEY`                  | Lambda env, GitHub Actions             | Keep (Cloudflare Pages env)          |
| `ANTHROPIC_API_KEY`          | Lambda env                             | Keep (Cloudflare Pages env)          |
| `SITE_PASSWORD`              | GitHub Actions                         | Keep (Cloudflare Pages env)          |
| `CF_ANALYTICS_TOKEN`         | GitHub Actions                         | Keep                                 |
| (new) `VOYAGE_API_KEY`       | Scripts only                           | Add to GitHub Secrets                |
| (new) `R2_BUCKET_NAME`       | wrangler.toml, scripts                 | `mapping-ai-data`                    |

**GitHub Actions workflow changes:**

The current `deploy.yml` does: build > verify DB schema > export map-data > inject secrets > S3 sync > CloudFront invalidation > smoke test. For the Cloudflare migration, this becomes: build > verify DB schema > export map-data + claims-data > upload to R2 > wrangler pages deploy > smoke test. The S3 sync, CloudFront invalidation, and AWS credential steps are removed.

### 2.2 Per-PR Neon branch automation

- [ ] Write a GitHub Actions workflow (or CLI script) that on PR open creates a Neon branch via `neonctl branches create --parent main`, extracts the connection string, and writes it to the PR's preview environment.
- [ ] On PR close/merge, delete the Neon branch (`neonctl branches delete`).
- [ ] Document the preview-branch lifecycle in `docs/architecture/current.md` or `docs/CONTRIBUTOR.md`.
- [ ] Test end-to-end with a throwaway PR.

**Watch out for:** Neon free tier allows up to 10 branches. If PR load exceeds that, either tighten cleanup or upgrade. Monitor `neonctl branches list | wc -l` during onboarding.

---

## Phase 3: TanStack Start + Cloudflare Workers + R2

Biggest change, biggest risk. Spike first.

### 3.0 Map page spike (throwaway, DECISION GATE)

- [ ] New branch `spike/tanstack-map` (keep it throwaway; do not merge)
- [ ] Scaffold a minimal TanStack Start project
- [ ] Port `map.html`'s D3 + Canvas 2D + Tiptap logic into a client-rendered React component in that project. Preserve: force simulation, canvas rendering, quadtree hit-testing, sprite pre-rasterization, @mention handling, plot view.
- [ ] Decision gate: if the spike takes more than 3 working days or reveals blocking framework incompatibilities, STOP and re-plan Phase 3. Document findings either way.
- [ ] Output: a short notes doc (in `docs/brainstorms/` or attached to the spike PR description)

Proceed to 3.1+ only after the spike is green.

### 3.1 Scaffold TanStack Start alongside existing Vite

- [ ] Add TanStack Start as a second build in the repo without removing Vite yet
- [ ] Get one simple static page (about or landing) rendering via TanStack Start
- [ ] Configure `wrangler` to deploy against a staging Worker (not the prod domain yet)
- [ ] Verify staging preview URL works

### 3.2 Port static pages

- [ ] landing (`/`), about, theoryofchange, workshop
- [ ] Confirm they are pre-rendered at build, not dynamically served per request (one of the reasons we chose TanStack Start over Next.js per ADR-0001)
- [ ] Delete the Vite entry points for these pages

### 3.3 Port contribute form and its server route

- [ ] Port `api/submit.ts` into a TanStack Start server route
- [ ] Port the contribute form UI (components already in `src/contribute/`)
- [ ] Confirm auto-save, duplicate detection, inline org creation panel, Tiptap @mentions, and location search all still work
- [ ] Contract parity check: every request/response shape matches the current API reference in `docs/architecture/current.md`

### 3.4 Port map page (into the main repo now, leveraging spike learnings)

- [ ] Based on outcome of 3.0
- [ ] Port all D3 + Canvas 2D logic
- [ ] Verify interactions: hover tooltip, click to zoom, drag to reheat simulation, search + highlight, dim unconnected, one-hop display, plot view
- [ ] Delete `map.html`, `assets/js/tiptap-notes.js`, `src/tiptap-notes.js` (legacy bundle)
- [ ] Delete or archive the `docs/solutions/best-practices/mobile-entity-directory-replacing-d3-map-2026-04-08.md` referencing the inline map, with framing updated

### 3.5 Port insights and admin pages

- [ ] Insights (D3 charts, already React)
- [ ] Admin (entity review, approval, merge, update, delete)
- [ ] Verify admin actions still trigger map-data regeneration

### 3.6 Port remaining API routes

- [ ] `/submissions` → server route
- [ ] `/search` → server route
- [ ] `/semantic-search` → server route; preserve the 1 req/s + 3 burst rate limit (Cloudflare Workers has per-zone rate limiting; verify equivalent behavior)
- [ ] `/admin` → server route; preserve `X-Admin-Key` auth and the side effect that approve/merge/delete regenerate `map-data.json`
- [ ] `/upload` → server route; destination is now R2 (see 3.7)

### 3.7 R2 migration (partially done via Phase 2.0)

- [x] Create R2 bucket `mapping-ai-data` for static data
- [x] Set up Pages Function routing so R2 is reachable at `mapping-ai.org/data/...` (preserves same-origin fetch, no public bucket URL)
- [x] Upload pipeline: `pnpm run db:export-claims:upload` generates from Neon + uploads to R2 via wrangler
- [x] CORS disabled (not needed, same-origin via Pages Function)
- [ ] Add `map-data.json`, `map-detail.json` to R2 (currently served from S3/CloudFront build pipeline; add to `ALLOWED_FILES` in `functions/data/[file].ts`)
- [ ] Script: sync thumbnails from S3 to R2 preserving keys (or regenerate via `cache-thumbnails.js`)
- [ ] Update `scripts/cache-thumbnails.js` to write to R2
- [ ] Update `/upload` route to write to R2 instead of S3
- [ ] Frontend fetch URLs stay unchanged because Pages Function serves at `/data/`

### 3.8 CSP, security headers, URL rewrites

- [ ] Replicate CSP from `template.yaml` `SecurityHeadersPolicy` into Cloudflare Workers response headers (or Transform Rules). Compare resulting headers byte-for-byte; do not loosen `script-src` or `connect-src`.
- [ ] URL rewrites: TanStack Start's router should handle clean URLs natively. Verify every existing entry still resolves (`/`, `/contribute`, `/map`, `/about`, `/insights`, `/admin`, `/workshop`, `/theoryofchange`).
- [ ] HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy all match current state.

### 3.9 Cutover

Atomic flip. This is the big one.

- [ ] Pick a low-traffic window
- [ ] Point DNS from CloudFront to Cloudflare Workers (Cloudflare-side change; quick revert path)
- [ ] Verify `mapping-ai.org` resolves to Workers
- [ ] Smoke test all 6 pages + submit a form + admin approve end-to-end
- [ ] Keep AWS stack running for at least 1 week as rollback
- [ ] Flip `docs/architecture/current.md` in one commit: topology diagram, all infrastructure sections, deploy flow, env vars, known limitations. This is the atomic flip the whole docs pattern was designed for.
- [ ] `docs/architecture/target.md`: mark Compute, Frontend build, CDN, IaC, Deploy trigger, DNS, Secrets rows as **shipped**
- [ ] Delete `memory/feedback_sam_deploy_danger.md` and `memory/feedback_no_defer_d3.md` (their delete-at-cutover markers fire now)
- [ ] Archive `docs/architecture/phase-0-audit.md` (move to `docs/archive/` or delete; it was a working artifact)
- [ ] Update `MEMORY.md` index

### 3.10 AWS teardown (after 1 week of stable Cloudflare)

Do NOT teardown until Cloudflare has been serving prod for at least one full week and at least one manual data change has been round-tripped successfully.

- [ ] Disable CloudFront distribution (do not delete yet; disabled leaves rollback option)
- [ ] Disable RDS instance
- [ ] `sam delete` the Lambda stack
- [ ] Delete `template.yaml`, `samconfig.toml`
- [ ] Delete the old `.github/workflows/deploy.yml` (replaced by wrangler-based workflow earlier in Phase 3)
- [ ] Remove `@aws-sdk/client-s3`, `@aws-sdk/client-cloudfront` from `package.json` (only used by Lambdas)
- [ ] Update `docs/DEPLOYMENT.md`: replace the AWS-era banner and procedures with post-migration content
- [ ] Update `memory/credentials.md`: remove AWS creds; mark Neon as primary
- [ ] After another 2 weeks of stability, fully delete (not just disable) CloudFront, S3, RDS

---

## Phase 4: Preview deploys end-to-end

Wires together the Neon branches from 2.2 and Wrangler preview URLs from 3.1. This is the payoff: every PR gets a live preview backed by its own isolated DB.

### 4.1 Per-PR preview deploy

- [ ] GitHub Actions workflow: on PR open, create Neon branch, deploy via `wrangler deploy --env preview`, wire up that branch's DATABASE_URL
- [ ] Comment the preview URL on the PR
- [ ] On PR close/merge: delete Neon branch, teardown preview
- [ ] Test with a throwaway PR (open it, check preview works, merge it, confirm teardown)

### 4.2 Contractor-facing docs

Goal: the OpenAI engineer implementing search/chatbot can clone the repo and be productive in under 30 minutes.

- [ ] `docs/CONTRIBUTOR.md`: update for target-stack API (TanStack Start routes, new base URL)
- [ ] `ONBOARDING.md`: post-migration setup (pnpm, `pnpm dev`, Neon CLI)
- [ ] `docs/architecture/current.md`: "How to run locally" section
- [ ] Verify the https://ai-sdk.dev/docs/getting-started/tanstack-start integration pattern is ready (this is the contractor's entry point)

---

## Phase 5: Tech debt (post-cutover, not blocking)

### 5.1 Replace pending-entity negative-ID hack

Based on reconnaissance findings from 1.3.

- [ ] Design doc comparing: status column on `entity`, separate `pending_entities` table, staging schema, or none-of-the-above
- [ ] Trade-offs, migration path, impact on edges / submissions
- [ ] User sign-off before implementation

### 5.2 Thumbnail caching improvements

- [ ] Content-hash cache busting
- [ ] Lazy generation on submit vs batch-script cadence
- [ ] R2 lifecycle policy for orphaned thumbs

### 5.3 Analytics upgrade

- [ ] Decide: stay on Cloudflare Web Analytics or move to PostHog / Plausible / GA4
- [ ] If moving: contribute form funnel, map interactions, search queries are the big wins
- [ ] Scope TBD

### 5.4 Isolated path for programmatic enrichment submissions

- [ ] Based on 1.3 findings
- [ ] Ensure enrichment contractor or scripts do not collide with manual submissions and do not require spinning up full staging DBs

### 5.5 Audit log table

Planned pre-launch but deprioritized for launch. Now post-migration makes sense.

- [ ] Design: snapshot-based vs diff-based (memory/db_audit_log.md leans snapshot for v1)
- [ ] Schema + trigger implementation
- [ ] Admin UI for browsing audit log + revert

---

## Handoff context for a new session

If a new Claude session is picking this up, read in this order:

1. `docs/architecture/adrs/0001-migrate-off-aws.md`: the decision and why
2. `docs/architecture/current.md`: what is actually running in prod right now (canonical)
3. `docs/architecture/target.md`: target stack and what has shipped
4. This plan: check the status table at the top for where we left off

### Repo-specific constraints

- Every PR to `main` needs either user approval or `--admin` override. User (Anushree) is sole reviewer. `--admin` override is fine for self-approved docs changes she explicitly asks to merge, per 2026-04-21 precedent (PR #43).
- Cloudflare Pages builds a preview for every branch. Test the preview before asking user to merge.
- `main` auto-deploys frontend to S3/CloudFront (while Phase 3 hasn't cut over). `sam deploy` is a separate manual command for Lambda; do not run without `aws cloudformation detect-stack-drift` first (see `memory/feedback_sam_deploy_danger.md`).
- After any push to main, verify all 6 pages (`/`, `/contribute`, `/map`, `/about`, `/insights`, `/admin`) return 200. The automated smoke test in the deploy workflow handles this but verify manually too (per `memory/feedback_test_after_push.md`).

### Writing style (user preferences)

Apply to commit messages, PR descriptions, docs, and conversational replies:

- No em-dashes with spaces (`—`). Use periods, colons, commas, or parens instead.
- No "X not Y" antithesis constructions.
- No rule-of-three lists where two items or one sentence would do.
- No "not just X but Y", no "the key insight is", no starting replies with "Let me" or "I'll".
- No `Co-Authored-By: Claude` trailer on commits. No "Generated with Claude Code" footer on PRs.

Full list: `memory/feedback_writing_style.md`, `memory/feedback_no_claude_coauthor.md`.

### Memory files worth knowing

At `~/.claude/projects/<slug>/memory/`:

- `neon_project.md`: Neon project ID (`calm-tree-46517731`), region, auth state
- `feedback_sam_deploy_danger.md`: active through Phase 3 cutover
- `feedback_no_defer_d3.md`: active through Phase 3 cutover
- `feedback_test_after_push.md`, `feedback_never_push_main_directly.md`, `feedback_test_thoroughly.md`: process rules
- `db_audit_log.md`: Phase 5.5 design target
- `data_pipeline.md`: enrichment lessons (Exa summary vs highlights, Wikipedia REST, Clearbit dead)
- `MEMORY.md`: index

### Decision tracker

- ADR-0001 (2026-04-21): migrate off AWS to Cloudflare + Neon + TanStack Start + pnpm. Accepted.
- Future ADRs go in `docs/architecture/adrs/` numbered sequentially; never renumber, never edit merged ADRs except for typos.

---

## Risk register

| Risk                                                   | Phase    | Mitigation                                                                                         |
| ------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------- |
| TanStack Start can't handle D3 + Canvas 2D map cleanly | 3.0      | Throwaway spike first. Fail fast. Decision gate before committing to 3.1+.                         |
| SAM drift during migration window                      | 2.x, 3.x | Established rule: never `sam deploy` without drift check. Obsolete after 3.9.                      |
| RDS → Neon data divergence                             | 2.1      | pg_dump row-count comparison + staging branch verification before prod cutover.                    |
| R2 + Worker URL pattern breaks CSP or thumbnail fetch  | 3.7, 3.8 | Byte-compare CSP headers before and after. Test mapping-ai.org/thumbnails/ explicitly.             |
| OpenAI contractor blocked on stale docs mid-migration  | ongoing  | `current.md` is authoritative; target.md shows what is shipped. CLAUDE.md asserts neither.         |
| Phase 3 scope explosion                                | 3.x      | Spike (3.0) first. Per-page PRs (3.2, 3.3, 3.4, 3.5, 3.6). Halt and re-plan if >3 days.            |
| Branch protection bypassed carelessly via --admin      | any      | Only use --admin when user explicitly says merge. Never for code PRs without review.               |
| entity.status default mismatch (pending vs approved)   | 2.1      | Submission flow always sets status explicitly. Direct INSERTs outside the flow need to set status. |
| qa_approved column missing from migrate.js             | 2.1      | Column exists on Neon, used by export-map.js. Add to migrate.js or verify it exists on target.     |
| claims-detail.json stale after enrichment              | ongoing  | Run `pnpm run db:export-claims:upload` after any enrichment run to sync R2.                        |

---

## Open questions

Resolve before or during the relevant phase; capturing here so they don't get lost.

- Does the OpenAI contractor start before or after Phase 3 cutover? If during, clarify which stack they work against (likely target, via a preview branch).
- Analytics upgrade in Phase 5.3: stay on Cloudflare Web Analytics or migrate to PostHog/Plausible/GA4?
- Audit log in Phase 5.5: snapshot or diff storage? Memory leans snapshot for v1 simplicity.
- During Phase 3, do we keep the separate Cloudflare Pages preview deploys running (current state) or collapse everything onto wrangler previews? The `test_after_push` memory's smoke-test URLs assume the Cloudflare Pages preview pattern stays around.

---

## Changelog

- **2026-04-21:** Plan created. Phase 0 marked complete (PR #43 merged). Next up: 1.1 pnpm migration.
- **2026-04-21:** Phase 1.1 (npm → pnpm) shipped in PR #44. Target.md Package manager row marked shipped. Workshop docs, CI workflows, and build-preview.sh all migrated. Cloudflare Pages build command updated in dashboard. Next up: 1.3 reconnaissance doc, or Phase 2 (Neon migration).
- **2026-04-26:** Phase 2.0 (R2 bucket + Pages Function) completed in PR #51. R2 bucket `mapping-ai-data` created, Pages Function at `functions/data/[file].ts` serves files through the Pages domain with CDN caching. Public bucket URL disabled. Upload pipeline: `pnpm run db:export-claims:upload`. Files served: `claims-detail.json` (2.1 MB, 3,779 claims), `agi-definitions.json` (295 KB, 240 entities with Voyage AI embeddings + UMAP + Claude clustering). Dashboard binding `DATA_BUCKET` -> `mapping-ai-data` configured.
- **2026-04-26:** Phase 2.1 schema audit completed. Neon `claims-pilot` branch has all RDS tables, triggers, and functions plus extra tables (`claim`, `source`) and columns (`qa_approved`, `importance`, etc.). Default value difference on `entity.status` documented. Full testing checklist added to plan. API endpoint migration table added with per-endpoint dependencies. Secrets update table added.
