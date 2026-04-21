# Current architecture

**Status:** live in production. **Last updated:** 2026-04-21. **Migration in progress:** see [ADR-0001](adrs/0001-migrate-off-aws.md) and [`target.md`](target.md).

This document describes the stack that is actually running behind https://mapping-ai.org today. If a claim here is wrong, update this file before shipping code that depends on the new reality.

---

## Topology

```
              ┌──────────────────┐
  users ────► │ Cloudflare DNS   │ (CNAME flattening; no proxy)
              └────────┬─────────┘
                       │
              ┌────────▼─────────┐
              │ AWS CloudFront   │ (CDN, SSL termination, URL rewrite function)
              └────────┬─────────┘
                       │
           ┌───────────┴────────────┐
           ▼                        ▼
   ┌─────────────┐         ┌────────────────┐
   │ AWS S3      │         │ AWS API Gateway│
   │ (static)    │         │ (HTTP API)     │
   └─────────────┘         └───────┬────────┘
                                   │
                           ┌───────▼────────┐
                           │ 6 Lambdas      │ (Node.js 20)
                           │ (Node esbuild) │
                           └───────┬────────┘
                                   │
                           ┌───────▼────────┐
                           │ AWS RDS        │
                           │ Postgres 17    │
                           └────────────────┘
```

## Infrastructure

### DNS (Cloudflare, DNS-only mode)

- `mapping-ai.org`, `www.mapping-ai.org`, `aimapping.org`, `www.aimapping.org`
- CNAME flattening to CloudFront distribution domain
- Cloudflare Web Analytics beacon is injected at deploy time via `CF_ANALYTICS_TOKEN` secret

### CDN + static hosting (AWS CloudFront + S3)

- **S3 bucket:** `mapping-ai-website-561047280976` (region `eu-west-2`, private, OAC-only)
- **CloudFront distribution ID:** `E34ZXLC7CZX7XT` (price class PriceClass_100)
- **ACM certificate:** `us-east-1` ARN in `template.yaml`
- **URL rewrite function:** clean URLs (`/contribute` → `/contribute.html`) via CloudFront Function (cloudfront-js-2.0)
- **Security headers policy:** CSP, X-Frame-Options, HSTS, X-Content-Type-Options set on distribution

### Compute (AWS API Gateway HTTP API + Lambda)

- **Base URL:** `https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com`
- **Runtime:** Node.js 20, bundled by SAM's esbuild BuildMethod
- **Throttling:** default 100 req/s rate + 200 burst; `/semantic-search` capped at 1 req/s + 3 burst
- **CORS allowlist:** production domains + Cloudflare Pages preview (`mapping-ai.pages.dev`) + localhost variants (see `template.yaml`)

### Database (AWS RDS Postgres)

- **Host:** `mapping-ai-db.c9sccou2k3xe.eu-west-2.rds.amazonaws.com`
- **Version:** Postgres 17
- **Instance:** `db.t4g.micro` (free tier), 20GB gp3
- **Deletion protection:** enabled
- **Automated backups:** 1-day retention (free tier max), point-in-time recovery available
- **Schema:** 3 tables (`entity`, `submission`, `edge`). See `scripts/migrate.js` and `CLAUDE.md` for field-level detail.

### IaC (AWS SAM)

- `template.yaml` is the single source of truth for the API Gateway, 6 Lambda functions, S3 bucket, CloudFront distribution, security headers policy, and URL rewrite function
- `samconfig.toml` holds deploy config (region `eu-west-2`, stack `mapping-ai`)
- **Known risk:** `sam deploy` wipes any CloudFormation-managed resource setting not in the template. Always run `aws cloudformation detect-stack-drift` first. See `docs/solutions/integration-issues/sam-deploy-overwrites-manual-cloudfront-config-2026-04-16.md`.

### CI/CD (GitHub Actions)

- `.github/workflows/ci.yml`: lint, typecheck, vitest, vite build, SAM validate. Runs on every PR and non-main push.
- `.github/workflows/deploy.yml`: runs on push to main. Steps: `npm ci` → `npm run build:tiptap` → write `.env.production` with API base + password hash placeholders → `npx vite build` → `npx tsx scripts/export-map-data.ts` (regenerates `map-data.json` from RDS) → inject password hash + Cloudflare analytics token → AWS credentials → `aws s3 sync dist/` (with cache headers) → `aws cloudfront create-invalidation --paths /*` → post-deploy smoke test (curl 200 on 6 pages)

### Lambda deploy (separate from frontend CI/CD)

- **Not** triggered by push to main. Requires manual `sam build && sam deploy --parameter-overrides ...`
- See `docs/DEPLOYMENT.md` for the guarded procedure (drift check, dry-run, no `--no-confirm-changeset`)

## Frontend

- **Build:** Vite 8 MPA. Each HTML file in repo root is a Vite entry point with a `<div id="...-root">` and a `<script type="module" src="/src/<page>/main.tsx">`.
- **Framework:** React 19 + TypeScript (strict) + Tailwind CSS v4
- **Data fetching:** TanStack Query (React Query v5)
- **Forms:** React Hook Form
- **Rich text:** TipTap on React pages (`src/components/TipTapEditor.tsx`); legacy esbuild bundle `src/tiptap-notes.js` → `assets/js/tiptap-notes.js` still used by `map.html`
- **XSS sanitization:** DOMPurify
- **Fonts:** EB Garamond (serif) + DM Mono (mono) via Google Fonts
- **Visualization:** D3.js (force simulation on `map.html`, charts on `insights.html`). Canvas 2D for map rendering; SVG for the plot view and insights charts.
- **Testing:** Vitest + jsdom + React Testing Library
- **Client-side external APIs** (free, no key required): Google Favicons for org logos, Wikipedia REST API for people headshots, Photon/OpenStreetMap for city geocoding, Bluesky public API for handle search. Per the thumbnail rules, the frontend does not call these at render time; `scripts/cache-thumbnails.js` caches results to S3.

### Pages

All React-migrated except `map.html`, which remains inline HTML/CSS/JS. Attempted D3 extraction broke the map; reverted. Map works under Vite MPA passthrough.

| Page                  | Entry                         | Framework                     |
| --------------------- | ----------------------------- | ----------------------------- |
| `index.html`          | `src/home/main.tsx`           | React                         |
| `contribute.html`     | `src/contribute/main.tsx`     | React                         |
| `map.html`            | (inline, 5700+ lines)         | D3 + Canvas 2D, **not React** |
| `about.html`          | `src/about/main.tsx`          | React                         |
| `admin.html`          | `src/admin/main.tsx`          | React                         |
| `insights.html`       | `src/insights/main.tsx`       | React (with D3 charts)        |
| `theoryofchange.html` | `src/theoryofchange/main.tsx` | React                         |
| `workshop/index.html` | `src/workshop/main.tsx`       | React                         |

## Backend (API)

6 TypeScript Lambda handlers in `api/`, bundled per-function by SAM esbuild at `sam build` time.

| Handler                  | Route                  | Function name                |
| ------------------------ | ---------------------- | ---------------------------- |
| `api/submit.ts`          | `POST /submit`         | `mapping-ai-submit`          |
| `api/submissions.ts`     | `GET /submissions`     | `mapping-ai-submissions`     |
| `api/search.ts`          | `GET /search`          | `mapping-ai-search`          |
| `api/semantic-search.ts` | `GET /semantic-search` | `mapping-ai-semantic-search` |
| `api/admin.ts`           | `GET/POST /admin`      | `mapping-ai-admin`           |
| `api/upload.ts`          | `POST /upload`         | `mapping-ai-upload`          |

Shared modules (`api/cors.ts`, `api/export-map.ts`) are bundled into each function that imports them.

**External packages:** `@aws-sdk/client-s3` and `@aws-sdk/client-cloudfront` are excluded from bundles because Node 20 Lambda runtime provides them. Everything else, including `pg`, is bundled.

**Dev server:** `dev-server.js` (Express) serves the API locally on port 3000. Vite proxies `/api` → 3000. `npm run dev` runs both concurrently.

## Database schema

Three tables: `entity`, `submission`, `edge`. The schema was migrated from a prior per-type layout (separate `people` / `organizations` / `resources` tables). Do not reference the old names.

### `entity`

| Column                            | Type                | Notes                                                                                                                                      |
| --------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                              | SERIAL PK           |                                                                                                                                            |
| `entity_type`                     | VARCHAR(20)         | `person`, `organization`, or `resource`                                                                                                    |
| `name`                            | VARCHAR(200)        | Person/org name                                                                                                                            |
| `title`                           | VARCHAR(300)        | Job title (person)                                                                                                                         |
| `category`                        | VARCHAR(200)        | Role (person) or sector (org)                                                                                                              |
| `other_categories`                | TEXT                | Comma-separated secondary categories                                                                                                       |
| `primary_org`                     | VARCHAR(200)        | Person's primary org                                                                                                                       |
| `other_orgs`                      | VARCHAR(200)        | Person's other affiliations                                                                                                                |
| `website`                         | VARCHAR(200)        | Org website                                                                                                                                |
| `funding_model`                   | VARCHAR(200)        | Org funding model                                                                                                                          |
| `parent_org_id`                   | INTEGER FK → entity | Org parent                                                                                                                                 |
| `resource_title`                  | VARCHAR(300)        | Resource title                                                                                                                             |
| `resource_category`               | VARCHAR(200)        | Resource category                                                                                                                          |
| `resource_author`                 | VARCHAR(200)        | Resource author                                                                                                                            |
| `resource_type`                   | VARCHAR(100)        | Essay, Book, Report, etc.                                                                                                                  |
| `resource_url`                    | VARCHAR(500)        | Resource URL                                                                                                                               |
| `resource_year`                   | VARCHAR(10)         | Resource year                                                                                                                              |
| `resource_key_argument`           | TEXT                | Resource key argument                                                                                                                      |
| `location`                        | VARCHAR(200)        |                                                                                                                                            |
| `influence_type`                  | TEXT                | Comma-separated                                                                                                                            |
| `twitter`, `bluesky`              | VARCHAR(200)        | Social handles                                                                                                                             |
| `notes`                           | TEXT                | Plain-text notes                                                                                                                           |
| `notes_html`                      | TEXT                | Rich-text notes (TipTap HTML)                                                                                                              |
| `thumbnail_url`                   | VARCHAR(500)        | `https://mapping-ai.org/thumbnails/...` = cached; `''` = tried, no image; `NULL` = never tried. Populated by `scripts/cache-thumbnails.js` |
| `belief_regulatory_stance`        | VARCHAR(200)        | Display label (trigger-derived from wavg)                                                                                                  |
| `belief_regulatory_stance_detail` | TEXT                |                                                                                                                                            |
| `belief_evidence_source`          | VARCHAR(200)        |                                                                                                                                            |
| `belief_agi_timeline`             | VARCHAR(200)        | Display label                                                                                                                              |
| `belief_ai_risk`                  | VARCHAR(200)        | Display label                                                                                                                              |
| `belief_threat_models`            | TEXT                |                                                                                                                                            |
| `belief_*_wavg`                   | REAL                | Weighted average score (trigger-maintained)                                                                                                |
| `belief_*_wvar`                   | REAL                | Weighted variance (trigger-maintained)                                                                                                     |
| `belief_*_n`                      | INTEGER             | Count of scored submissions                                                                                                                |
| `submission_count`                | INTEGER             | Total approved submissions                                                                                                                 |
| `status`                          | VARCHAR(20)         | `approved`, `pending`, `internal`                                                                                                          |
| `search_vector`                   | tsvector            | Full-text search (GIN indexed, auto-updated by trigger)                                                                                    |

### `submission`

| Column                        | Type                | Notes                                              |
| ----------------------------- | ------------------- | -------------------------------------------------- |
| `id`                          | SERIAL PK           |                                                    |
| `entity_type`                 | VARCHAR(20)         | `person`, `organization`, or `resource`            |
| `entity_id`                   | INTEGER FK → entity | NULL for new entity submissions, set for edits     |
| `submitter_email`             | VARCHAR(200)        |                                                    |
| `submitter_relationship`      | VARCHAR(20)         | `self`, `connector`, `external`                    |
| (all entity fields)           |                     | Flat columns matching entity table                 |
| `belief_*_score`              | SMALLINT            | Numeric score (stance 1-7, timeline 1-5, risk 1-5) |
| `notes_html`                  | TEXT                | Rich text notes                                    |
| `notes_mentions`              | JSONB               | @mention data                                      |
| `status`                      | VARCHAR(20)         | `pending`, `approved`, `rejected`                  |
| `llm_review`                  | JSONB               | Claude Haiku quality rating (1-5), flags, notes    |
| `resolution_notes`            | TEXT                | Admin notes on review decision                     |
| `submitted_at`, `reviewed_at` | TIMESTAMPTZ         |                                                    |
| `reviewed_by`                 | VARCHAR(200)        |                                                    |

### `edge`

| Column       | Type                | Notes                                                       |
| ------------ | ------------------- | ----------------------------------------------------------- |
| `id`         | SERIAL PK           |                                                             |
| `source_id`  | INTEGER FK → entity | ON DELETE CASCADE                                           |
| `target_id`  | INTEGER FK → entity | ON DELETE CASCADE                                           |
| `edge_type`  | VARCHAR(50)         | affiliated, collaborator, funder, critic, authored_by, etc. |
| `role`       | VARCHAR(200)        | Role at org (for affiliation edges)                         |
| `is_primary` | BOOLEAN             | Primary org affiliation                                     |
| `evidence`   | TEXT                |                                                             |
| `created_by` | VARCHAR(50)         | `system`, `admin`, etc.                                     |
| UNIQUE       |                     | `(source_id, target_id, edge_type)`                         |

### Triggers

1. **`before_submission_update`**: when a new-entity submission is approved (`entity_id IS NULL` and status transitions to `approved`), auto-creates the entity row and backfills `entity_id`.
2. **`after_submission_update`**: recalculates weighted belief scores on the entity when submission status changes. Weights: self=10, connector=2, external=1.
3. **`update_entity_search`**: updates `search_vector` on entity INSERT/UPDATE.

### Field-name mapping (DB → frontend)

`api/export-map.ts` maps DB column names to the field names the frontend reads from `map-data.json`.

| DB column                  | Frontend field                                   | Notes                                     |
| -------------------------- | ------------------------------------------------ | ----------------------------------------- |
| `belief_regulatory_stance` | `regulatory_stance`                              |                                           |
| `belief_agi_timeline`      | `agi_timeline`                                   |                                           |
| `belief_ai_risk`           | `ai_risk_level`                                  |                                           |
| `belief_evidence_source`   | `evidence_source`                                |                                           |
| `belief_threat_models`     | `threat_models`                                  |                                           |
| `resource_title`           | `title`                                          | Resources only                            |
| `resource_category`        | `category`                                       | Resources only                            |
| `resource_author`          | `author`                                         | Resources only                            |
| `resource_url`             | `url`                                            | Resources only                            |
| `resource_year`            | `year`                                           | Resources only                            |
| `resource_key_argument`    | `key_argument`                                   | Resources only                            |
| `belief_*_wavg`            | `stance_score` / `timeline_score` / `risk_score` | Falls back to text label → numeric lookup |

Any schema change must update this mapping or the map/plot view breaks silently.

### Database scripts

```bash
npm run db:migrate        # Create/update all tables, triggers, indexes
npm run db:seed           # Import Airtable CSV data
npm run db:export-map     # Generate map-data.json from approved entries
npm run db:backup         # Backup all tables to S3 (JSON + SQL)
npm run db:backup:local   # Backup to local files only
```

## API reference

Production base URL: `https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com`

For contributor-facing field reference, submission payload schemas, and examples, see `docs/CONTRIBUTOR.md`. The below covers the internal and admin surface.

### `POST /submit`

Submit a new or updated entry for review.

Request body (JSON):

```json
{
  "type": "person",
  "timestamp": "2026-03-24T00:00:00.000Z",
  "_hp": "",
  "data": {
    "name": "Jane Doe",
    "submitterEmail": "jane@example.com",
    "submitterRelationship": "self",
    "category": "Academic",
    "regulatoryStance": "Moderate",
    "influenceType": "Researcher/analyst, Advisor/strategist",
    "entityId": 123
  }
}
```

- `type`: `"person"` | `"organization"` | `"resource"`
- `_hp`: honeypot; must be empty (bots fill it)
- `data`: camelCase field names. `entityId` present = edit submission, absent = new entity
- Stance/timeline/risk text labels are converted to numeric scores server-side

Responses: 200 (accepted), 400 (validation error), 405 (wrong method), 500 (server error).

Side effects: LLM review via Claude Haiku (non-blocking), quality rating stored in `submission.llm_review`.

### `GET /submissions`

Returns approved entities grouped by type, plus edges.

| Parameter | Values                               | Default    |
| --------- | ------------------------------------ | ---------- |
| `type`    | `person`, `organization`, `resource` | all        |
| `status`  | `approved`, `pending`, `rejected`    | `approved` |

Response: `{ "people": [...], "organizations": [...], "resources": [...], "edges": [...] }`

### `GET /search`

Full-text search across entities (tsvector plus ILIKE fallback).

| Parameter | Values                               | Notes                 |
| --------- | ------------------------------------ | --------------------- |
| `q`       | search string                        | Required, min 2 chars |
| `type`    | `person`, `organization`, `resource` | Optional filter       |
| `status`  | `pending`, `all`                     | Optional              |

### `GET /semantic-search`

LLM-powered semantic matching via Claude Haiku. Rate-limited at 1 req/s + 3 burst at the API Gateway layer. Uses the separate `ANTHROPIC_SEMANTIC_SEARCH_KEY` so costs are tracked independently from submission review.

### `GET /admin`

Authentication: `X-Admin-Key` header or `?key=` query param.

| Query                                       | Returns                                           |
| ------------------------------------------- | ------------------------------------------------- |
| `action=stats`                              | Counts by entity_type, pending submissions, edges |
| `action=pending`                            | New entity submissions (entity_id IS NULL)        |
| `action=pending_merges`                     | Edit submissions for existing entities            |
| `action=all&type=entity&entity_type=person` | Browse entities with filters                      |

### `POST /admin`

| Action              | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `approve`           | Approve new entity submission (optional field overrides in `data`) |
| `reject`            | Reject new entity submission                                       |
| `merge`             | Merge edit submission into existing entity                         |
| `reject_submission` | Reject edit without touching entity                                |
| `update_entity`     | Direct admin edit                                                  |
| `delete`            | Delete entity (cascades edges + submissions)                       |

Side effects: `approve`, `merge`, `delete` auto-regenerate `map-data.json` → upload to S3 → invalidate CloudFront.

### `POST /upload`

Upload thumbnail image (JPG/PNG/WebP, max 2MB). Requires `X-Admin-Key`.

## Data flow

### Path 1: Static map data (fast read path)

Push to `main` → GitHub Actions → regenerate `map-data.json` from RDS → upload to S3 → invalidate CloudFront → users fetch `map-data.json` from CloudFront (no DB call at read time).

`contribute.html` also loads `map-data.json` for instant client-side search and autocomplete.

### Path 2: Live API (writes + search)

Form submit → `POST /submit` → `submission` table (status `pending`) + non-blocking Claude Haiku review.

Client-side autocomplete falls back to `GET /search` (full-text search) if `map-data.json` hasn't loaded yet.

Admin approve → `POST /admin { action: 'approve' }` → DB trigger creates `entity` row + recalculates belief scores → Lambda regenerates `map-data.json` → uploads to S3 → invalidates CloudFront. Map reflects changes within ~60 seconds.

### Path 3: Thumbnails

`scripts/cache-thumbnails.js` (run manually or on demand):

- Tries Google Favicon (orgs) or Wikipedia API (people), or re-downloads an existing external URL
- Uploads to `s3://mapping-ai-website-561047280976/thumbnails/<type>-<id>.{png,jpg}`
- Writes `https://mapping-ai.org/thumbnails/...` into `entity.thumbnail_url`
- On skip or fail: writes `thumbnail_url = ''` so the script excludes the entity on re-runs and the frontend skips live fallback

Rules:

- `entity.thumbnail_url` is the single source of truth. Values: cached URL, `''` (tried, no image), or `NULL` (never tried)
- Never hardcode a CloudFront subdomain (e.g. `d3fo5mm9fktie3.cloudfront.net`). Use `mapping-ai.org` (stable alias; the distribution underneath can be replaced)
- `api/admin.ts` `update_entity` must not blind-overwrite `thumbnail_url` to null when the admin form didn't change it
- Frontend never calls Wikipedia or Google Favicon at render time. If coverage is too low, run the cache script and redeploy `map-data.json`.

See `docs/solutions/integration-issues/thumbnail-pipeline-dead-cloudfront-and-external-fallbacks-2026-04-19.md`.

## Spam protection

- **Honeypot field** (`_hp`): hidden form field. If non-empty, server returns 200 silently without writing to DB.
- **LLM review**: Claude Haiku rates submission quality 1-5 (non-blocking), flags spam/duplicates/offensive content. Stored in `submission.llm_review` (JSONB).
- **Field length limits** enforced server-side (200 chars for short fields, 1000 chars for long fields).
- **Status gate**: all submissions land in `status = 'pending'`. Nothing appears on the public map until admin approves.
- **Rate limits**: default 100 req/s + 200 burst at API Gateway; `/semantic-search` capped at 1 req/s + 3 burst; contributor keys limited to 250 submissions/day.

## Security practices

- **No secrets in tracked files.** `DATABASE_URL` passed to Lambda via `--parameter-overrides` and stored in GitHub Secrets. Never in `samconfig.toml`.
- **`.env` is gitignored.** Holds `DATABASE_URL`, AWS keys, API keys.
- **Admin auth**: `X-Admin-Key` header on `/admin` and `/upload`. `X-Contributor-Key` header on `/submit` for the contributor-API path.
- **Deletion protection** enabled on the RDS instance.
- **DB backups**: `npm run db:backup` dumps to S3 (`backups/` prefix). RDS automated snapshots have 1-day retention (free tier limit). Run before risky admin work.
- **Submitter emails** stored in DB but stripped from all public API responses.
- **CSP + security headers** configured in `template.yaml` on the CloudFront response headers policy: `default-src 'self'`, `strict-origin-when-cross-origin` referrer, HSTS 1-year, X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff.
- **CORS allowlist** restricts API access to production domains + Cloudflare Pages preview + localhost variants (see `template.yaml`).

## Package management

- **npm** (planned migration to pnpm, see [ADR-0001](adrs/0001-migrate-off-aws.md))
- `package.json` lockfile: `package-lock.json`

## Environment variables

| Variable                                      | Where it lives                       | Purpose                                 |
| --------------------------------------------- | ------------------------------------ | --------------------------------------- |
| `DATABASE_URL`                                | `.env` + Lambda env + GitHub Secrets | RDS Postgres connection                 |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | `.env` + GitHub Secrets              | AWS SDK auth                            |
| `S3_BUCKET_NAME`                              | GitHub Secrets                       | `mapping-ai-website-561047280976`       |
| `CLOUDFRONT_DISTRIBUTION_ID`                  | GitHub Secrets                       | `E34ZXLC7CZX7XT`                        |
| `ANTHROPIC_API_KEY`                           | `.env` + Lambda (SAM parameter)      | Claude Haiku (submission review)        |
| `ANTHROPIC_SEMANTIC_SEARCH_KEY`               | Lambda (SAM parameter)               | Claude for semantic search endpoint     |
| `ADMIN_KEY`                                   | `.env` + Lambda (SAM parameter)      | Admin endpoint auth                     |
| `EXA_API_KEY`                                 | `.env` (scripts only)                | Data enrichment via Exa                 |
| `SITE_PASSWORD`                               | GitHub Secrets                       | Pre-launch password gate hash injection |
| `CF_ANALYTICS_TOKEN`                          | GitHub Secrets                       | Cloudflare Web Analytics beacon         |

## Known limitations

- **`map.html` is inline** (5700+ lines of D3 + Canvas 2D). React extraction attempted and reverted. Will be revisited during the TanStack Start migration (see [target.md](target.md) and [ADR-0001](adrs/0001-migrate-off-aws.md)).
- **Legacy TipTap bundle:** `src/tiptap-notes.js` (esbuild) duplicates the React `TipTapEditor` component. Will be removed when `map.html` becomes a React component.
- **SAM drift risk:** any manual change to AWS Console state on a CloudFormation-managed resource will be wiped by the next `sam deploy`. Caused prod outage 2026-04-16.
- **D3 script tag cannot be deferred/async** in `map.html`: the inline 4000+ line script depends on `d3` being available synchronously during HTML parsing. Caused prod outage 2026-04-09.
- **Category normalization** handles known variants but may miss new ones as data grows.
- **Admin key** default is in `template.yaml` and should rotate before adding collaborators.

## Links

- `template.yaml`: IaC source of truth
- `.github/workflows/deploy.yml`: deploy pipeline
- `docs/DEPLOYMENT.md`: guarded backend deploy procedure
- `docs/post-mortems/`: incidents tied to this architecture
- `docs/solutions/integration-issues/`: known gotchas
