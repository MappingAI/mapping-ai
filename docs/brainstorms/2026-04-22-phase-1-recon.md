---
date: 2026-04-22
topic: phase-1-recon
status: draft
---

# Phase 1.3 reconnaissance: load-bearing mechanisms in the current stack

Four traces of systems that Phase 2+ will assume they understand. Each reports what the code actually does, what breaks on migration, and what surprised me. Source is `origin/main` at `ca4ec54` except where noted.

---

## 1. Thumbnail pipeline

### What triggers generation

Two distinct triggers, neither sync-on-submit:

1. **Manual batch run** of `scripts/cache-thumbnails.js` (node script with `pg` + S3 SDK). Admin-triggered from a shell. CLI flags: `--dry-run`, `--type=org|person`, `--limit=N`. No schedule, no cron, no Lambda.
2. **Admin upload** through `api/upload.ts` (`POST /upload`, requires `X-Admin-Key`). Admin dashboard posts a multipart image; Lambda writes to S3 and updates `entity.thumbnail_url`.

Nothing in `/submit` or `/admin approve` generates thumbnails. A new submission sits at `thumbnail_url = NULL` until someone runs the script or uploads manually.

### What runs when

Batch run loop (`scripts/cache-thumbnails.js:228–256`):

- `SELECT id, entity_type, name, website, thumbnail_url FROM entity WHERE status = 'approved' AND (thumbnail_url IS NULL OR (thumbnail_url != '' AND thumbnail_url NOT LIKE 'https://mapping-ai.org/thumbnails/%'))`.
- Per row: if `thumbnail_url` already points at an external host (Wikimedia, Google Favicon), call `reCacheExternalUrl()` to pull that exact URL down into S3 under `thumbnails/<type>-<id>.{png,jpg}`. Otherwise run the discovery path (`cacheOrgLogo` → Google Favicons `sz=128`; `cachePersonPhoto` → Wikipedia REST API summary → `thumbnail.source`).
- `HeadObjectCommand` short-circuits if the S3 key already exists (`s3Exists()`).
- 100ms sleep between entities to avoid external rate limits. No parallelism.

### Cache semantics

- **Store:** S3 bucket `mapping-ai-website-561047280976`, prefix `thumbnails/`, hardcoded in the script at line 26. `CacheControl: public, max-age=31536000, immutable` (1 year).
- **URL shape written to DB:** `https://mapping-ai.org/<key>` — the alias, not the CloudFront subdomain. This is deliberate per the 2026-04-19 post-mortem.
- **Invalidation:** none from the script. S3 `HeadObject` just checks existence; the script won't overwrite an existing S3 object even if the source changed. **To force a re-cache you set `thumbnail_url` back to `NULL` in the DB manually.** There is no cache-bust knob.

### Skip / fail / tried-and-no-image

The tri-state is enforced in the main loop (`scripts/cache-thumbnails.js:293–300`):

- `cached` or `exists` → write the S3 URL into `thumbnail_url`.
- `skip` or `fail` → write `thumbnail_url = ''`. This is a sentinel: "we tried, no image available, don't retry."
- The next run's WHERE clause excludes `thumbnail_url != ''` so `''` rows are permanently skipped until manually NULLed.
- Dry-run status exists (`--dry-run`) but does not update the DB.

### What the frontend expects

`map.html:1394-1402` `resolveEntityImage()`:

```js
function resolveEntityImage(d, onSuccess) {
  if (d.entityType === 'resource') return
  const url = d.thumbnail_url
  if (!url) return
  const img = new Image()
  img.referrerPolicy = 'no-referrer'
  img.onload = () => onSuccess(url)
  img.src = url
}
```

Three input shapes, two render paths:

- `null` → no callback fires, canvas renders initials glyph.
- `''` → treated as falsy, same as null. **Single line at 1396**: `if (!url) return`. The empty string and NULL are indistinguishable at render time; the distinction only matters to the cache script.
- non-empty string → browser loads it. No fallback chain, no Wikipedia probe, no Google Favicon retry. **If the URL 404s the image just doesn't appear.**

### Migration risk (S3 → R2)

- **Hardcoded bucket name and region** (`scripts/cache-thumbnails.js:26-27`, `eu-west-2`). Must flip to R2 env vars or a new binding.
- **Hardcoded domain alias** `mapping-ai.org` at line 27. This is the load-bearing rule from the post-mortem: stays the same after cutover because Cloudflare will serve R2 under the same alias. **Good** — URL shapes in the DB don't need to migrate.
- **S3 key format** `thumbnails/<type>-<id>.{png,jpg}` is simple enough to copy 1:1 to R2. No content-hash, no variant resolution, no image pipeline.
- **`reCacheExternalUrl()` writes a different key** (`thumbnails/<type>-<id>.jpg` regardless of content type at line 203) than the discovery path does (`thumbnails/<type>-<id>.png` for orgs). **Surprise:** org rows that went through `reCacheExternalUrl` got `.jpg` extensions; orgs cached via Favicon got `.png`. The DB stores the URL so this is not currently broken, but any migration script that reconstructs keys from (type, id) will collide with this inconsistency.
- **Hardcoded `d3fo5mm9fktie3.cloudfront.net`** appears in a comment at line 27 only. Code path is clean. But grep for `cloudfront.net` across the repo before the R2 flip.
- **`api/admin.ts update_entity`** (line 430–465): loops over `ENTITY_FIELDS` and writes every field present in `body.data`. `thumbnail_url` is listed at line 89. **The post-mortem's prevention item "never-overwrite-with-null" was not implemented.** If the React admin form sends `thumbnail_url: null` with an otherwise-unrelated edit, the cache script's work is wiped. The pre-migration fix recommended in the doc was a `diffFields()` helper — still open.
- **`api/upload.ts`** (`BUCKET = process.env.THUMBNAIL_BUCKET`, `CF_DOMAIN = process.env.CLOUDFRONT_DOMAIN`) is cleaner: env-var-driven. Plugs into R2 by swapping those. Key format same as the discovery path (`thumbnails/<type>-<id>.{ext}`).

### Surprises

- **The tri-state is in the DB column, not as a separate status field.** An `''` is doing the work a `thumbnail_status = 'tried_no_image'` would do. Any ORM or TypeScript type that models this field as "URL or null" will lose the distinction and break the skip-on-next-run invariant.
- **No automated refresh.** Every new entity sits at `thumbnail_url = NULL` until someone remembers to run the script. The lazy-on-submit idea in Phase 5.2 of the migration plan is real work, not a polish item.
- **Scripts have two different extension conventions.** `reCacheExternalUrl` always writes `.jpg` for people, `.png` for orgs (line 202), but the original path writes `.jpg` for people and `.png` for orgs too — so actually consistent here. The case that diverges is: if an org's `entity.thumbnail_url` is an external Wikimedia `.jpg`, `reCacheExternalUrl` stores it under `.png` (line 202 forces ext by type, not by content). **Potential mislabeled content-type in S3 if this has happened.**

---

## 2. Pending-entity negative-ID system

### Where IDs are generated

`src/hooks/useSubmitEntity.ts:73`:

```ts
const pendingId = -Math.abs(entity.id)
```

Input: the `id` returned by `POST /submit` — which is the **submission table's** serial PK (positive integer). The hook negates it to avoid collision with the `entity` table's serial PK. Same negation in `src/hooks/useSubmissionLedger.ts:111` when the localStorage ledger seeds the cache on page load.

There is no central generator. Two call sites, one formula.

### Where IDs are consumed

- **`src/hooks/useEntityCache.ts`** — flattens `people + organizations + resources` from the `['map-data']` TanStack Query cache. Pending entries, with negative IDs, are merged in by `useAddPendingEntity` or seeded by `useSeedCacheFromLedger`.
- **`src/hooks/useSearch.ts:39-60`** — local fuzzy search runs against the cache (so it sees negative-ID pending rows). Pending API results from `/search?status=pending` are merged, deduplicated by both direct ID match and **by `-r.id`** (line 44) so client-injected negative IDs dedupe against server positive IDs for the same pending submission.
- **`src/contribute/PersonForm.tsx:161,174`**, **`ResourceForm.tsx:100`**, **`OrganizationForm.tsx:172`**, **`OrgSearch.tsx:57,210`**, **`DuplicateDetection.tsx:74`**, **`TagInput.tsx:20,226`**, **`ExistingEntitySidebar.tsx:51,118`** all key off `.isPending` + `.id`. When `isPending` is true they skip the `cache.byId.get(entity.id)` lookup because the ID won't resolve (it's a submission ID / negative ID, not an entity ID).
- **`src/lib/search.ts:53-64`** applies a `+20` recency boost to entries marked `_pending: true` so the user's own recent submission sorts above matching approved entities.

### Client ↔ server contract

- `/submit` returns `{ id, ... }` where `id` is `submission.id` (positive). Client negates it for cache use. Server does not know about negation.
- `/search?status=pending` hits the `submission` table directly (`api/search.ts:108-128`) with `entity_id IS NULL AND status = 'pending'`. Returns submission IDs (positive). The client's dedup trick at `useSearch.ts:44` (`seenIds.add(-r.id)`) assumes these positive IDs correspond 1:1 to its own negated versions.
- **The form body stores these pending IDs as-is in the `notes_mentions` JSONB field** (TipTap @mentions), which means the DB persists references to submission IDs that may not exist post-approval. On approval the `before_submission_update` trigger (in `scripts/migrate.js`) auto-creates an entity row and backfills `submission.entity_id`, but existing @mentions in other notes pointing at the old submission ID are not rewritten. **Orphaned references are a known limitation** (flagged in the 2026-04-17 pending-entity-linking plan line 37).

### What breaks if the scheme changes

- **UUIDs break everything.** Every negation, dedup, and `isPending` check assumes a numeric ID that's safe to negate. A UUID scheme requires a separate `_pending` / `_source` discriminator field and rewrites in 10+ components.
- **Positive-only IDs (e.g. status column on `entity` with IDs from a shared sequence) also break** the dedup in `useSearch.ts:44`. The invariant "negative means pending" is load-bearing for the search merge logic.
- **Any rewrite of submission IDs on approval** would invalidate references. The current scheme doesn't rewrite (the trigger backfills `entity_id` but preserves `submission.id`), so references in `notes_mentions` pointing at submission IDs remain valid pointers — to a submission row, not an entity. Consumers that try to `cache.byId.get()` with a submission ID silently miss.

### Why this matters for Phase 5.1

The migration plan's Phase 5.1 says "Replace pending-entity negative-ID hack." Phase 2 (Neon) changes nothing here since the schema is preserved. Phase 3 (TanStack Start) also leaves the IDs alone if the schema is preserved. The risk is **subtle:** if a reviewer in Phase 3 decides TanStack Start's server routes should normalize pending entities to UUIDs "to be clean," they break every client call site above. The clean-slate option (dedicated `status` column on `entity`, with pending entities occupying real `entity` rows from the start) is a larger refactor than migration and should be deferred exactly as the plan says.

### Surprises

- **There is no `useAddPendingEntity.ts` file.** The recon checklist asked for one, but the hook lives in `src/hooks/useSubmitEntity.ts` (line 47). The old `useAddPendingOrg` name still exists at line 100 as a deprecated wrapper.
- **`useSeedCacheFromLedger` can inject entries that collide with real entity IDs.** Line 113 dedupes by either negated ID match or name+type match — but name matching is `toLowerCase()` exact, so "OpenAI" and "Open AI" are treated as distinct. If the DB later has an entity named "OpenAI" and the ledger has "open ai" from a form draft, both will show.
- **Admin approval does not prune the ledger.** `useSubmissionLedger.ts:64-75` `pruneApproved` exists but is not called from any hook. The 7-day TTL is the only cleanup. Ledger entries for approved entities persist until they expire, producing duplicate search results (one negated pending + one positive approved) if the TanStack Query cache and ledger disagree.

---

## 3. Programmatic enrichment submissions

### Today (main): direct SQL, not `/submit`

Scripts run on a developer's machine with `DATABASE_URL` in `.env`, open a `pg.Pool` directly, and `INSERT INTO entity/submission/edge`. No HTTP, no contributor key, no admin key, no LLM review.

Evidence per script:

- `scripts/enrich-people.js`, `scripts/enrich-orgs.js`, `scripts/enrich-deep.js`, `scripts/enrich-deep-orgs.js` → `UPDATE entity SET ...` on existing rows. Pure field enrichment via Exa + Claude Sonnet.
- `scripts/enrich-v2.js` → `INSERT INTO entity` (status uninspected), `INSERT INTO edge`, `UPDATE entity`.
- `scripts/enrich-with-exa.js` → references the **old schema** (`people`, `organizations`, `person_organizations`). Stale; the old tables were dropped in the 3-table migration.
- `scripts/enrich-elections.js:420` → `INSERT INTO entity (..., status) VALUES (..., 'approved')` directly with `--insert-approved`, OR `INSERT INTO submission (..., status) VALUES (..., 'pending')` with `--insert`. **Bypasses `/submit` in both cases.** The `approved` path also skips the LLM review on `submission`, the `contributor_key_id` tracking, and the `_llm_review` JSONB field.
- `scripts/seed-time100.js`, `scripts/seed-academics-*.js`, `scripts/seed-journalists-organizers.js`, `scripts/seed-missing-notable.js`, `scripts/seed-tier1-remaining.js`, `scripts/seed-tier2.js` → all `INSERT INTO entity` directly. `status` is typically `'approved'` with `created_at = NOW()`. No submission row created.
- `scripts/seed.js` → references old tables (`people`, `organizations`). Stale.
- `scripts/add-party-affiliations.js` → `INSERT INTO edge` directly.

None of the scripts use contributor keys (`mak_<32hex>`). None use `X-Admin-Key`. None hit `api/admin.ts` at all. **`ADMIN_KEY` is not read anywhere in `scripts/`.**

### Admin auto-approve path

In `api/admin.ts:262-306`, `action === 'approve'` is the only approve path. It requires `X-Admin-Key` or `?key=...`. Scripts never call it. Programmatic approvals go through the raw SQL `status = 'approved'` write, which means:

- **The `after_submission_update` trigger that recalculates belief-score weighted aggregates doesn't fire** (no submission row for direct entity inserts). `belief_*_wavg / wvar / n` stay at NULL / 0 for seed-script entities.
- **No LLM review record.**
- **No `contributor_key_id` attribution.**
- **`submission_count` stays at 0** until a future contribute-form submission updates it.

### What breaks if staging isolation were required

- Every script reads `DATABASE_URL` from `.env`. A separate `DATABASE_URL_ENRICHMENT` or `DATABASE_URL_STAGING` would require touching every script (~12 files). Low per-file cost but high coordination cost.
- No script uses the API. Running against a fresh Neon staging branch means **either** setting `DATABASE_URL` to the staging URL in `.env` (easy but error-prone — the 2026-04-18 credential-leak post-mortem was partly caused by this exact pattern), **or** routing through the API with contributor keys (hard — requires deploying the staging API first).
- The direct-SQL path is load-bearing for speed: seed scripts insert hundreds of rows in a couple minutes. `/submit` is rate-limited at 10 anon/IP/hour + 20/contributor-key/day (`api/submit.ts:21-22, 191`).

### Post-PR-40 (`origin/worktree-wiggly-wibbling-wigderson`)

PR #40 adds `scripts/enrich/` with a formal API client at `scripts/enrich/lib/api.js`:

- **`scripts/enrich/submit.js`** is the opposite of the legacy pattern: **every write goes through `POST /submit` with `X-Contributor-Key` then `POST /admin action=approve` with `X-Admin-Key`** (`submit.js:70-82`).
- Requires `CONTRIBUTOR_KEY` (format `mak_<32hex>`, line 23-27 of `lib/api.js`) and `ADMIN_KEY` in `.env`. `CONTRIBUTOR_KEY` is format-validated.
- `buildSubmitPayload()` normalizes camelCase, derives plain-text `notes` from `notesHtml` every call. Allow-list of recognized fields.
- `approveSubmission()` posts to `/admin` → the same path the admin dashboard uses → triggers the `map-data.json` regeneration.
- Dry-run is the default. `--execute` required to POST. `--confirm` for destructive actions.
- Hardcoded API base: `https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com` (line 16), overridable via `MAPPING_AI_API_BASE`. **This will need to flip to the Cloudflare Workers URL in Phase 3.**

**PR #40 changes the answer to the staging-isolation question.** The new enrichment flow is staging-ready: point `DATABASE_URL` + `MAPPING_AI_API_BASE` at the staging stack and the scripts work. The legacy scripts (`enrich-*.js`, `seed-*.js`) are not touched by PR #40 and still need the per-script fix.

### Surprises

- **`scripts/seed.js` and `scripts/enrich-with-exa.js` reference the old `people`/`organizations`/`person_organizations` tables.** They will `UPDATE people SET ...` and get a Postgres "relation does not exist" error. Either the scripts are abandoned and not invoked, or whoever last ran them has an unmigrated DB. Either way they should be archived before Phase 2.
- **`scripts/enrich-elections.js --insert-approved` is the only non-admin path that writes `status = 'approved'` to `entity` and skips the belief-score trigger.** Results on the map will show entities with 0 submissions and no weighted belief scores, which is fine for display but subtly wrong for the insights page if anyone filters by `submission_count > 0`.
- **The migration plan's Phase 5.4 says "Isolated path for programmatic enrichment submissions" based on 1.3 findings.** The finding is: PR #40 already built the right architecture for this; it just hasn't been extended to the legacy scripts.

---

## 4. CI coverage reality check

### What runs where

**`.github/workflows/ci.yml`** (runs on `pull_request` to main and `push` to non-main). Two jobs:

- `quality`: `pnpm install --frozen-lockfile` → `pnpm run format:check` → `pnpm run lint` → `pnpm run typecheck` → `pnpm test` → `pnpm run build`.
- `sam-validate`: `sam validate --lint` (no Python, Node, or AWS creds).

**`.github/workflows/deploy.yml`** (push to main only). Includes a DB-schema smoke test (`SELECT 1 FROM entity/submission/edge LIMIT 0`) gated by `DATABASE_URL` secret, and a post-deploy HTTP smoke test against 6 pages. These run on deploy, not on PR CI.

**`lefthook.yml`** pre-commit: `tsc --noEmit`, `eslint --max-warnings 0 --no-warn-ignored`, `prettier --check` on staged files only.

### What each command actually covers

| Command                 | Coverage                                                                                                                                                                                                                                                                                          | Doesn't cover                                                                                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm run lint`         | `src/ api/ scripts/` (eslint.config.js flat config). Scripts section has an extensive ignore list: `enrich-*.js`, `seed-*.js`, all `analyze-*`, `check-*`, `cleanup-*`, `create-*`, `dedupe-*`, `export-edge-review.js`, `fill-gaps.js`, `verify-*.cjs`, 20+ entries at `eslint.config.js:19-53`. | **Everything in the ignore list.** That includes `enrich-elections.js` which holds the direct `INSERT INTO entity` paths. Also: `map.html` inline JS (no lint config for HTML).                                                            |
| `pnpm run format:check` | `src/**/*.{ts,tsx,js,json,css}`, `api/**/*.ts`.                                                                                                                                                                                                                                                   | **Not `scripts/`.** Not `map.html`. Not `*.md`.                                                                                                                                                                                            |
| `pnpm run typecheck`    | `tsc --noEmit` against everything `tsconfig.json` includes.                                                                                                                                                                                                                                       | The `.js` scripts (no types). Lambda handlers typecheck is fine because `api/*.ts` are in the project.                                                                                                                                     |
| `pnpm test`             | `vitest run` with `environment: jsdom`, `exclude: ['.aws-sam/**', 'node_modules/**']`. Six test files: `smoke.test.ts`, `lib/search.test.ts`, `components/CustomSelect.test.tsx`, `components/TagInput.test.tsx`, `api/cors.test.ts`, `api/export-map.test.ts`.                                   | **No integration tests.** No test for `api/submit.ts`, `api/admin.ts`, `api/search.ts`, `api/upload.ts`, `api/semantic-search.ts`. No test that exercises `pg` against a real DB. No test of `scripts/*`. No E2E against a running server. |
| `pnpm run build`        | Vite build of all 9 MPA entry points.                                                                                                                                                                                                                                                             | Doesn't exercise the server. Doesn't exercise Lambda bundling.                                                                                                                                                                             |
| `sam validate --lint`   | Validates `template.yaml` structure and CloudFormation best practices.                                                                                                                                                                                                                            | **Doesn't run `sam build`.** A template that validates can still fail to build (missing handler file, esbuild error). Also doesn't run the handlers.                                                                                       |

### Silently skipped

- **`scripts/seed-test-data.js` doesn't exist.** `package.json` declares `db:seed-test` → `node scripts/seed-test-data.js --reset`. Running the script fails immediately. Nothing in CI calls this, but any onboarding doc that references it is dead.
- **`scripts/ensure-map-data.js:25` calls `spawnSync('node', ['scripts/export-map-data.js'], ...)` but the file is `.ts`.** `npm run predev` silently fails when `map-data.json` is missing, and developers will see "generating from database..." followed by a failed exit. Not caught by any gate because the script exits 0 on no-DB-creds path and the spawn failure is at `result.status`, not thrown.
- **`pnpm run dev` is not exercised in CI.** The Express dev server at `dev-server.js` diverges from Lambda handlers. No test catches divergence.
- **No lint on `map.html`.** 5700+ lines of inline D3 + Canvas 2D. The `d3` global is whitelisted in eslint but the file is never read by eslint (not in `src/ api/ scripts/`). The 2026-04-09 "no-defer on D3" post-mortem would have been catchable with a grep pattern, but there is no lint rule for it.
- **No `sam build` in CI.** Only `sam validate`. Lambda bundling failures surface only at deploy time. Migration risk: Phase 3 removes SAM anyway, but until then a PR that breaks Lambda bundling (e.g. a TypeScript import issue in `api/`) ships green.

### What instruction files claim but doesn't exist

- `CLAUDE.md` Commands section (since migration) still looks current, but references `npm run dev` cadence language in memory files that hasn't been fully swept.
- `ONBOARDING.md:236` lists `npx vitest run`, `npx tsc --noEmit`, `npx vite build` — these still work via npx but the canonical form is `pnpm test`, `pnpm run typecheck`, `pnpm run build`.
- **`package.json` `db:seed-test` script points at a non-existent file.** Anyone running `pnpm run db:seed-test` gets a Node error. Easy fix but it's a surface gap.

### Gaps that could hide breakage during migration

- **No Lambda handler integration tests.** Phase 3 rewrites each handler into a TanStack Start server route. CI cannot confirm the new routes preserve request/response shape. Mitigation required: write handler tests before or during 3.6, not after. The `api/export-map.test.ts` pattern (pure function contract test) is the right template.
- **No `pg` integration test.** Schema drift between `scripts/migrate.js` and code that reads the schema (e.g. `api/export-map.ts toFrontendShape()`) is caught only at runtime. Phase 2's Neon dry-run will exercise this implicitly, but there's no automatic regression guard afterward.
- **No smoke test of the full submit→approve→map-regen pipeline.** The deploy workflow tests HTTP 200 on 6 pages but not that an approval actually regenerates `map-data.json`. Post-3.3 this is the highest-value integration test to add.
- **No CSP assertion test.** The 2026-04-19 post-mortem shows CSP + `script-src` can silently kill the analytics beacon. Phase 3.8 says "compare headers byte-for-byte"; without a CI gate this requires manual discipline every migration sub-step.

### Surprises

- **Scripts are almost entirely excluded from lint.** The ignore list at `eslint.config.js:19-53` covers 20+ patterns including `enrich-*.js` and `seed-*.js`. The comment at line 16-18 claims "production-critical scripts are linted" but `cache-thumbnails.js`, `export-map-data.ts`, `migrate.js`, `seed.js`, `backup-db.js` are the only ones. Every one-shot enrichment or seed script ships without lint.
- **Vite test config lives inside `vite.config.ts` (line 38-43), not `vitest.config.ts`.** Reading the config for test-only changes requires knowing this. Unremarkable but caught me briefly.
- **The CI `pull_request` trigger is safe for forks** (no secrets), but the deploy workflow's DB smoke test is gated only on `secrets.DATABASE_URL`. If that secret disappears mid-migration (e.g. during Neon cutover), the smoke test runs the verification block against `undefined` and crashes silently before the deploy step. The deploy wouldn't proceed, so this is fail-safe, but the error message would be unhelpful.

---

## Summary for Phase 2 and 3 decisions

Four items to carry forward:

1. **Thumbnail URL format (`mapping-ai.org` alias, tri-state `URL | '' | NULL`) survives R2 cutover untouched** — good for Phase 3.7. Two cleanups worth doing before 3.7: implement the `diffFields()` guard in `api/admin.ts` and reconcile the `.jpg`/`.png` extension mismatch in `reCacheExternalUrl` vs `cacheOrgLogo`.
2. **Pending-entity negative IDs are a contract between 10+ components and the `/search?status=pending` response shape.** Do not touch during migration. Phase 5.1 deferral is correct.
3. **Legacy enrichment scripts write direct SQL and bypass all auth, rate limiting, and LLM review.** PR #40 is the template for the isolated path promised in Phase 5.4. Legacy `enrich-*.js` / `seed-*.js` should be either archived or ported to PR #40's pattern, but not before Phase 2.1 so they remain usable for data prep on the Neon staging branch.
4. **CI coverage is lint + format + typecheck + ~6 unit tests + build.** No API integration tests, no DB tests, no handler tests, no CSP/header tests. Phase 3's risk profile is dominated by gaps CI won't catch. Budget for handler contract tests during 3.3 and 3.6.
