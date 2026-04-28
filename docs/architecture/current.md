# Current architecture

**Status:** live in production. **Last updated:** 2026-04-28. **Migration from AWS:** completed for database and compute. TanStack Start frontend migration shelved. See [ADR-0001](adrs/0001-migrate-off-aws.md) and [`target.md`](target.md).

This document describes the stack that is actually running behind https://mapping-ai.org today. If a claim here is wrong, update this file before shipping code that depends on the new reality.

---

## Topology

```
              ┌──────────────────┐
  users ────► │ Cloudflare DNS   │ (proxied mode, orange cloud)
              └────────┬─────────┘
                       │
              ┌────────▼──────────────────┐
              │ Cloudflare Pages          │ (static assets + Pages Functions)
              │ - dist/ (Vite MPA build)  │
              │ - functions/api/* (API)   │
              │ - functions/data/* (R2)   │
              └────┬──────────────┬───────┘
                   │              │
           ┌───────▼──────┐  ┌───▼──────────┐
           │ Cloudflare R2│  │ Neon         │
           │ (claims,     │  │ Postgres 17  │
           │  AGI defs)   │  │ (+ branches) │
           └──────────────┘  └──────────────┘
```

## Infrastructure

### DNS (Cloudflare, proxied mode)

- `mapping-ai.org`, `www.mapping-ai.org` CNAME to `mapping-ai.pages.dev` (proxied)
- `aimapping.org`, `www.aimapping.org` also configured
- Cloudflare Web Analytics beacon injected at deploy time via `CF_ANALYTICS_TOKEN` secret

### Static hosting (Cloudflare Pages)

- **Pages project:** `mapping-ai` (connected to GitHub repo `MappingAI/mapping-ai`)
- **Build output:** `dist/` (Vite MPA build)
- **Auto-deploy:** push to `main` triggers production build; PR branches get preview deploys at `<hash>.mapping-ai.pages.dev`
- **Clean URLs:** Cloudflare Pages natively serves `/contribute` as `/contribute.html`
- **Config:** `wrangler.toml` (compatibility date `2024-09-23`, `nodejs_compat` flag)

### Data files (Cloudflare R2 + Pages Function)

- **R2 bucket:** `mapping-ai-data` (private, no public URL)
- **Pages Function:** `functions/data/[file].ts` proxies R2 objects at `/data/<filename>`
- **Binding:** `DATA_BUCKET` configured in `wrangler.toml`
- **Allowed files:** `claims-detail.json` (5,835 claims across 882 entities), `agi-definitions.json` (201 AGI definitions with Voyage AI embeddings + UMAP)
- **Cache:** `Cache-Control: public, max-age=300, s-maxage=3600` (5 min browser, 1 hour edge)
- **Upload:** `PILOT_DB="..." pnpm run db:export-claims:upload` generates from Neon claims-pilot branch and uploads via S3-compatible API

### Map data files (static assets)

- `map-data.json` and `map-detail.json` are generated at CI build time by `scripts/export-map-data.ts` and placed in `dist/`
- Served as static files at `/map-data.json` and `/map-detail.json`
- Admin approve/merge/delete triggers also write fresh copies to R2 via the admin Pages Function
- `map-data.json` is gitignored; generated from DB on every deploy

### Compute (Cloudflare Pages Functions)

- **Runtime:** Cloudflare Workers (V8 isolates, not Node.js)
- **DB driver:** `@neondatabase/serverless` (HTTP-based, compatible with Workers runtime)
- **API base:** `/api` (same-origin; no CORS needed for frontend calls)

| Handler                            | Route                      | Notes                                             |
| ---------------------------------- | -------------------------- | ------------------------------------------------- |
| `functions/api/submit.ts`          | `POST /api/submit`         | Entity submissions, rate limiting, honeypot       |
| `functions/api/submissions.ts`     | `GET /api/submissions`     | Approved entities by type + edges                 |
| `functions/api/search.ts`          | `GET /api/search`          | Full-text tsvector + ILIKE search                 |
| `functions/api/semantic-search.ts` | `GET /api/semantic-search` | Disabled (no ANTHROPIC_API_KEY set)               |
| `functions/api/admin.ts`           | `GET/POST /api/admin`      | Approve/reject/merge/delete, requires X-Admin-Key |
| `functions/api/upload.ts`          | `POST /api/upload`         | Thumbnail upload to R2, requires X-Admin-Key      |

Shared modules: `functions/api/_shared/db.ts` (Neon connection), `functions/api/_shared/cors.ts` (CORS headers), `functions/api/_shared/env.ts` (Env type).

**Dev server:** `dev-server.js` (Express) serves the API locally on port 3000 using the `pg` driver. Vite proxies `/api` to port 3000. `pnpm run dev` runs both concurrently.

### Database (Neon Postgres 17)

- **Project:** `calm-tree-46517731` (region `aws-us-east-1`)
- **Production branch:** `production` (primary database for the live site)
- **Claims-pilot branch:** `claims-pilot` (claim + source tables for enrichment pipeline; see [ENRICHMENT.md](../ENRICHMENT.md))
- **Cutover date:** 2026-04-28 (migrated from AWS RDS via pg_dump/pg_restore)
- **Schema:** 4 tables on production (`entity`, `submission`, `edge`, `contributor_keys`). Claims-pilot branch adds `claim` and `source` tables.
- **Per-PR branches:** GitHub Actions workflow creates a Neon branch on PR open (backend-relevant PRs only) and deletes on PR close

Connection string (get via CLI):

```bash
neonctl connection-string production --project-id calm-tree-46517731
```

### CI/CD (GitHub Actions + Cloudflare Pages)

- `.github/workflows/ci.yml`: lint, typecheck, vitest, vite build, SAM validate (legacy, to be removed). Runs on every PR.
- `.github/workflows/deploy.yml`: runs on push to main. Generates `map-data.json` from Neon, builds with Vite, syncs to S3 (legacy, parallel to Cloudflare Pages auto-deploy). Cloudflare Pages auto-deploys from GitHub on push to main.
- `.github/workflows/neon-preview-branch.yml`: creates/deletes Neon branches for PRs touching backend files.

### Legacy AWS infrastructure (warm for rollback)

The following AWS resources remain active but are no longer serving production traffic. They will be retired after 1+ week of stable operation on Cloudflare/Neon.

- **RDS:** `mapping-ai-db.c9sccou2k3xe.eu-west-2.rds.amazonaws.com` (Postgres 17, deletion protection on, snapshot `pre-neon-cutover-2026-04-28`)
- **Lambda:** 6 functions via SAM (`template.yaml`), still pointed at RDS
- **S3:** `mapping-ai-website-561047280976` (static assets + thumbnails)
- **CloudFront:** distribution `E34ZXLC7CZX7XT` (no longer receiving DNS traffic)
- **API Gateway:** `https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com` (no longer called by frontend)

## Frontend

- **Build:** Vite 8 MPA. Each HTML file in repo root is a Vite entry point with a `<div id="...-root">` and a `<script type="module" src="/src/<page>/main.tsx">`.
- **Framework:** React 19 + TypeScript (strict) + Tailwind CSS v4
- **Data fetching:** TanStack Query (React Query v5)
- **Forms:** React Hook Form
- **Rich text:** TipTap on React pages (`src/components/TipTapEditor.tsx`); legacy esbuild bundle `src/tiptap-notes.js` still used by `map.html`
- **XSS sanitization:** DOMPurify
- **Fonts:** EB Garamond (serif) + DM Mono (mono) via Google Fonts
- **Visualization:** D3.js (force simulation on `map.html`, charts on `insights.html`). Canvas 2D for map rendering; SVG for plot view and insights charts.
- **Testing:** Vitest + jsdom + React Testing Library
- **Client-side external APIs** (free, no key): Google Favicons for org logos, Wikipedia REST API for people headshots, Photon/OpenStreetMap for city geocoding, Bluesky public API for handle search. Frontend does not call these at render time; `scripts/cache-thumbnails.js` caches results.

### Pages

All React-migrated except `map.html`, which remains inline HTML/CSS/JS.

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

## Database schema

### Production branch tables

Four tables on the Neon production branch: `entity`, `submission`, `edge`, `contributor_keys`.

#### `entity`

| Column                            | Type                | Notes                                                                                          |
| --------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                              | SERIAL PK           |                                                                                                |
| `entity_type`                     | VARCHAR(20)         | `person`, `organization`, or `resource`                                                        |
| `name`                            | VARCHAR(200)        | Person/org name                                                                                |
| `title`                           | VARCHAR(300)        | Job title (person)                                                                             |
| `category`                        | VARCHAR(200)        | Role (person) or sector (org)                                                                  |
| `other_categories`                | TEXT                | Comma-separated secondary categories                                                           |
| `primary_org`                     | VARCHAR(200)        | Person's primary org                                                                           |
| `other_orgs`                      | VARCHAR(200)        | Person's other affiliations                                                                    |
| `website`                         | VARCHAR(200)        | Org website                                                                                    |
| `funding_model`                   | VARCHAR(200)        | Org funding model                                                                              |
| `parent_org_id`                   | INTEGER FK → entity | Org parent                                                                                     |
| `resource_title`                  | VARCHAR(300)        | Resource title                                                                                 |
| `resource_category`               | VARCHAR(200)        | Resource category                                                                              |
| `resource_author`                 | VARCHAR(200)        | Resource author                                                                                |
| `resource_type`                   | VARCHAR(100)        | Essay, Book, Report, etc.                                                                      |
| `resource_url`                    | VARCHAR(500)        | Resource URL                                                                                   |
| `resource_year`                   | VARCHAR(10)         | Resource year                                                                                  |
| `resource_key_argument`           | TEXT                | Resource key argument                                                                          |
| `location`                        | VARCHAR(200)        |                                                                                                |
| `influence_type`                  | TEXT                | Comma-separated                                                                                |
| `twitter`, `bluesky`              | VARCHAR(200)        | Social handles                                                                                 |
| `notes`                           | TEXT                | Plain-text notes                                                                               |
| `notes_html`                      | TEXT                | Rich-text notes (TipTap HTML)                                                                  |
| `thumbnail_url`                   | VARCHAR(500)        | `https://mapping-ai.org/thumbnails/...` = cached; `''` = tried, no image; `NULL` = never tried |
| `belief_regulatory_stance`        | VARCHAR(200)        | Display label (trigger-derived from wavg)                                                      |
| `belief_regulatory_stance_detail` | TEXT                |                                                                                                |
| `belief_evidence_source`          | VARCHAR(200)        |                                                                                                |
| `belief_agi_timeline`             | VARCHAR(200)        | Display label                                                                                  |
| `belief_ai_risk`                  | VARCHAR(200)        | Display label                                                                                  |
| `belief_threat_models`            | TEXT                |                                                                                                |
| `belief_*_wavg`                   | REAL                | Weighted average score (trigger-maintained)                                                    |
| `belief_*_wvar`                   | REAL                | Weighted variance (trigger-maintained)                                                         |
| `belief_*_n`                      | INTEGER             | Count of scored submissions                                                                    |
| `submission_count`                | INTEGER             | Total approved submissions                                                                     |
| `status`                          | VARCHAR(20)         | `approved`, `pending`, `internal`                                                              |
| `search_vector`                   | tsvector            | Full-text search (GIN indexed, auto-updated by trigger)                                        |

#### `submission`

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
| `llm_review`                  | JSONB               | Quality rating (currently disabled)                |
| `resolution_notes`            | TEXT                | Admin notes on review decision                     |
| `submitted_at`, `reviewed_at` | TIMESTAMPTZ         |                                                    |
| `reviewed_by`                 | VARCHAR(200)        |                                                    |

#### `edge`

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

#### `contributor_keys`

| Column        | Type        | Notes                        |
| ------------- | ----------- | ---------------------------- |
| `id`          | SERIAL PK   |                              |
| `key_hash`    | VARCHAR(64) | SHA-256 of `mak_<32hex>` key |
| `name`        | VARCHAR     | Key holder name              |
| `email`       | VARCHAR     | Key holder email             |
| `daily_limit` | INTEGER     | Default 250                  |
| `created_at`  | TIMESTAMPTZ |                              |
| `revoked_at`  | TIMESTAMPTZ | NULL = active                |

### Claims-pilot branch tables

The `claims-pilot` Neon branch extends the production schema with two additional tables for the enrichment pipeline. These will be merged into production when the enrichment workflow is finalized. Full documentation in [ENRICHMENT.md](../ENRICHMENT.md).

#### `source`

Every piece of evidence. Deduplicated by URL via `source_id = sha256(url)[:12]`.

| Column               | Type                 | Notes                                                                                                                          |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `source_id`          | text PK              | `src-` + first 12 hex chars of SHA-256 of URL                                                                                  |
| `url`                | text UNIQUE NOT NULL | Canonical source URL                                                                                                           |
| `title`              | text                 | Human-readable title                                                                                                           |
| `source_type`        | text                 | hearing, bill, tweet, op_ed, interview, press_release, floor_speech, letter, report, paper, blog, podcast, video, crowdsourced |
| `date_published`     | date                 | Publication date                                                                                                               |
| `author`             | text                 | Author name                                                                                                                    |
| `publisher`          | text                 | Publisher/outlet                                                                                                               |
| `cached_excerpt`     | text                 | Verbatim excerpt cached at extraction time                                                                                     |
| `resource_entity_id` | integer              | FK to entity if this source is a resource entity                                                                               |
| `created_at`         | timestamptz          | Auto-set                                                                                                                       |
| `last_verified_at`   | timestamptz          | When URL was last checked                                                                                                      |

#### `claim`

One row per entity-dimension-source combination. 5,835 claims as of 2026-04-28.

| Column             | Type             | Notes                                                                                                |
| ------------------ | ---------------- | ---------------------------------------------------------------------------------------------------- |
| `claim_id`         | text PK          | `{entity_id}_{dimension}_{source_id}`                                                                |
| `entity_id`        | integer NOT NULL | FK to entity                                                                                         |
| `entity_name`      | text NOT NULL    | Denormalized for query convenience                                                                   |
| `entity_type`      | text NOT NULL    | person, organization, resource                                                                       |
| `belief_dimension` | text NOT NULL    | regulatory_stance, agi_timeline, ai_risk_level, agi_definition, or policy-area dimensions            |
| `stance`           | text             | Text label from the scale                                                                            |
| `stance_score`     | smallint         | Ordinal score (null for agi_definition)                                                              |
| `stance_label`     | text             | Short display label                                                                                  |
| `definition_used`  | text             | For agi_definition: their definition in normalized form                                              |
| `citation`         | text NOT NULL    | Verbatim quote from source (1-2 sentences)                                                           |
| `source_id`        | text NOT NULL    | FK to source table                                                                                   |
| `date_stated`      | date             | When the entity made this statement                                                                  |
| `claim_type`       | text             | direct_statement, authored_position, inferred_from_action, resource_content, crowdsourced_submission |
| `confidence`       | text             | high, medium, low, unverified                                                                        |
| `supersedes`       | text             | claim_id this replaces (for evolving positions)                                                      |
| `extracted_by`     | text             | exa+claude, db_fallback, manual                                                                      |
| `extraction_model` | text             | claude-sonnet-4-6                                                                                    |
| `extraction_date`  | date             | When extraction ran                                                                                  |
| `created_at`       | timestamptz      | Auto-set                                                                                             |

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
pnpm run db:migrate        # Create/update all tables, triggers, indexes
pnpm run db:seed           # Import Airtable CSV data
pnpm run db:export-map     # Generate map-data.json from approved entries
pnpm run db:backup:local   # Backup to local files only
```

## API reference

Production base URL: `https://mapping-ai.org/api` (same-origin)

For contributor-facing field reference, submission payload schemas, and examples, see `docs/CONTRIBUTOR.md`.

### `POST /api/submit`

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

### `GET /api/submissions`

Returns approved entities grouped by type, plus edges.

| Parameter | Values                               | Default    |
| --------- | ------------------------------------ | ---------- |
| `type`    | `person`, `organization`, `resource` | all        |
| `status`  | `approved`, `pending`, `rejected`    | `approved` |

Response: `{ "people": [...], "organizations": [...], "resources": [...], "edges": [...] }`

### `GET /api/search`

Full-text search across entities (tsvector plus ILIKE fallback).

| Parameter | Values                               | Notes                 |
| --------- | ------------------------------------ | --------------------- |
| `q`       | search string                        | Required, min 2 chars |
| `type`    | `person`, `organization`, `resource` | Optional filter       |
| `status`  | `pending`, `all`                     | Optional              |

### `GET /api/semantic-search`

Currently disabled (no `ANTHROPIC_API_KEY` configured). Returns `503 "AI search not configured"`. The map UI handles this gracefully with a "LLM search unavailable" message.

### `GET /api/admin`

Authentication: `X-Admin-Key` header or `?key=` query param.

| Query                                       | Returns                                           |
| ------------------------------------------- | ------------------------------------------------- |
| `action=stats`                              | Counts by entity_type, pending submissions, edges |
| `action=pending`                            | New entity submissions (entity_id IS NULL)        |
| `action=pending_merges`                     | Edit submissions for existing entities            |
| `action=all&type=entity&entity_type=person` | Browse entities with filters                      |

### `POST /api/admin`

| Action              | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `approve`           | Approve new entity submission (optional field overrides in `data`) |
| `reject`            | Reject new entity submission                                       |
| `merge`             | Merge edit submission into existing entity                         |
| `reject_submission` | Reject edit without touching entity                                |
| `update_entity`     | Direct admin edit                                                  |
| `delete`            | Delete entity (cascades edges + submissions)                       |

Side effects: `approve`, `merge`, `delete` auto-regenerate `map-data.json` and upload to R2.

### `POST /api/upload`

Upload thumbnail image (JPG/PNG/WebP, max 2MB). Requires `X-Admin-Key`. Writes to R2.

## Data flow

### Path 1: Static map data (fast read path)

Push to `main` → Cloudflare Pages auto-build → regenerate `map-data.json` from Neon → place in `dist/` → users fetch `/map-data.json` (no DB call at read time).

`contribute.html` also loads `map-data.json` for instant client-side search and autocomplete.

### Path 2: Live API (writes + search)

Form submit → `POST /api/submit` → `submission` table (status `pending`).

Client-side autocomplete falls back to `GET /api/search` (full-text search) if `map-data.json` hasn't loaded yet.

Admin approve → `POST /api/admin { action: 'approve' }` → DB trigger creates `entity` row + recalculates belief scores → Pages Function regenerates `map-data.json` → uploads to R2. Map reflects changes within ~60 seconds.

### Path 3: Thumbnails

`scripts/cache-thumbnails.js` (run manually):

- Tries Google Favicon (orgs) or Wikipedia API (people)
- Uploads to S3 (legacy; migration to R2 pending)
- Writes `https://mapping-ai.org/thumbnails/...` into `entity.thumbnail_url`
- On skip or fail: writes `thumbnail_url = ''` so the script skips the entity on re-runs

Rules:

- `entity.thumbnail_url` is the single source of truth. Values: cached URL, `''` (tried, no image), or `NULL` (never tried)
- Frontend never calls Wikipedia or Google Favicon at render time

## Spam protection

- **Honeypot field** (`_hp`): hidden form field. If non-empty, server returns 200 silently without writing to DB.
- **Field length limits** enforced server-side (200 chars for short fields, 1000 chars for long fields).
- **Status gate**: all submissions land in `status = 'pending'`. Nothing appears on the public map until admin approves.
- **Rate limits**: contributor keys limited to 250 submissions/day; anonymous IP rate limit of 10/hour (in-isolate).

## Security practices

- **No secrets in tracked files.** `DATABASE_URL` set as Cloudflare Pages secret via `wrangler pages secret put`. Never in committed files.
- **`.env` is gitignored.** Holds `DATABASE_URL`, API keys for local dev and scripts.
- **Admin auth**: `X-Admin-Key` header on `/api/admin` and `/api/upload`.
- **Submitter emails** stored in DB but stripped from all public API responses.

## Package management

- **pnpm** (migrated from npm 2026-04-21; `packageManager` field in `package.json` pins the version)
- Lockfile: `pnpm-lock.yaml`
- CI uses `pnpm install --frozen-lockfile` for reproducibility

## Environment variables

| Variable                | Where it lives                         | Purpose                             |
| ----------------------- | -------------------------------------- | ----------------------------------- |
| `DATABASE_URL`          | Cloudflare Pages secrets + `.env`      | Neon Postgres production connection |
| `ADMIN_KEY`             | Cloudflare Pages secrets + `.env`      | Admin endpoint auth                 |
| `ANTHROPIC_API_KEY`     | `.env` (scripts only)                  | Claude for enrichment scripts       |
| `EXA_API_KEY`           | `.env` (scripts only)                  | Exa web search for enrichment       |
| `VOYAGE_API_KEY`        | `.env` (scripts only)                  | Voyage AI embeddings                |
| `R2_ACCESS_KEY_ID`      | `.env` (scripts only)                  | R2 upload for claims export         |
| `R2_SECRET_ACCESS_KEY`  | `.env` (scripts only)                  | R2 upload for claims export         |
| `CLOUDFLARE_ACCOUNT_ID` | `.env` / `wrangler.toml`               | R2 endpoint                         |
| `CF_ANALYTICS_TOKEN`    | GitHub Secrets                         | Cloudflare Web Analytics beacon     |
| `NEON_PROD_URL`         | `.env` (scripts only)                  | Neon production (alias)             |
| `PILOT_DB`              | Inline when running enrichment scripts | Neon claims-pilot branch            |

## Known limitations

- **`map.html` is inline** (5700+ lines of D3 + Canvas 2D). React extraction attempted and reverted.
- **Legacy TipTap bundle:** `src/tiptap-notes.js` (esbuild) duplicates the React `TipTapEditor` component. Will be removed when `map.html` becomes a React component.
- **D3 script tag cannot be deferred/async** in `map.html`: the inline script depends on `d3` being available synchronously during HTML parsing.
- **Category normalization** handles known variants but may miss new ones as data grows.
- **Thumbnails still on S3**: `scripts/cache-thumbnails.js` writes to S3. Migration to R2 pending.
- **Legacy AWS deploy workflow** (`deploy.yml`) still runs on push to main (S3 sync + CloudFront invalidation). Harmless but wasteful; to be removed after stability period.
- **Claims/source tables on separate branch**: The `claim` and `source` tables are on the `claims-pilot` Neon branch, not production. They need to be merged to production when the enrichment pipeline is finalized.

## Links

- `wrangler.toml`: Cloudflare Pages config
- `functions/api/`: Pages Functions (API handlers)
- `functions/data/`: R2 data proxy
- `.github/workflows/deploy.yml`: deploy pipeline (legacy AWS + Cloudflare Pages auto-deploy)
- `docs/DEPLOYMENT.md`: deploy process
- `docs/ENRICHMENT.md`: enrichment pipeline guide
- `docs/post-mortems/`: incidents
