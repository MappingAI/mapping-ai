# Technical Reference - Mapping AI

This document covers architecture, local development, deployment, and the API for contributors working on the codebase.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
│  mapping-ai.org                                         │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Cloudflare (DNS)                                       │
│  - DNS resolution (CNAME flattening at root)            │
│  - DDoS protection                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  AWS CloudFront (CDN)                                   │
│  - Global edge caching                                  │
│  - SSL/TLS termination (ACM certificate)                │
│  - Hashed assets: immutable, 1-year cache               │
│  - HTML: no-cache (revalidate on every request)         │
│  - map-data.json: 60s cache + stale-while-revalidate    │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────────┐   ┌─────────────────────────────────┐
│  AWS S3           │   │  AWS API Gateway (HTTP API)     │
│  Vite build       │   │  POST /submit   → Lambda        │
│  output (dist/):  │   │  GET /submissions → Lambda      │
│  HTML, CSS, JS,   │   │  GET /search    → Lambda        │
│  map-data.json    │   │  GET/POST /admin → Lambda       │
│                   │   │  POST /upload   → Lambda        │
│  backups/         │   └────────────────┬────────────────┘
│  (DB snapshots)   │                    │ pg (node-postgres)
└───────────────────┘                    ▼
                        ┌─────────────────────────────────┐
                        │  AWS RDS Postgres 17             │
                        │  Tables: entity, submission,     │
                        │          edge                    │
                        └─────────────────────────────────┘
```

Frontend is a Vite 8 MPA built with React 19, TypeScript, and Tailwind CSS v4. The one exception is `map.html` (inline D3.js, not React). Backend is serverless via AWS Lambda (Node.js 20), deployed with AWS SAM. Database is AWS RDS Postgres 17 (eu-west-2, db.t4g.micro). All infrastructure defined in `template.yaml`.

---

## Tech Stack

| Layer                       | Technology                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| DNS                         | Cloudflare (DNS-only mode, CNAME flattening)                                                                                |
| CDN                         | AWS CloudFront                                                                                                              |
| Frontend hosting            | AWS S3                                                                                                                      |
| Frontend                    | Vite 8 MPA + React 19 + TypeScript + Tailwind CSS v4                                                                        |
| Map page                    | D3.js force-directed graph + orbital clusters + plot view (map.html, inline, not React)                                     |
| Build                       | Vite (React pages), esbuild (legacy TipTap bundle for map.html)                                                             |
| Data fetching               | TanStack Query (React Query v5)                                                                                             |
| Forms                       | React Hook Form                                                                                                             |
| Rich text                   | TipTap (ProseMirror-based) with @mentions (`src/components/TipTapEditor.tsx` for React, `src/tiptap-notes.js` for map.html) |
| XSS sanitization            | DOMPurify                                                                                                                   |
| Visualization               | D3.js (map.html inline + insights page charts)                                                                              |
| Fonts                       | EB Garamond (serif) + DM Mono (mono) via Google Fonts                                                                       |
| Backend                     | AWS Lambda (Node.js 20) + API Gateway (HTTP API)                                                                            |
| Infrastructure-as-code      | AWS SAM (`template.yaml`)                                                                                                   |
| Database                    | AWS RDS Postgres 17 (eu-west-2)                                                                                             |
| DB client                   | `pg` (node-postgres v8)                                                                                                     |
| Testing                     | Vitest + jsdom + React Testing Library                                                                                      |
| CI/CD                       | GitHub Actions (auto-deploy on push to main)                                                                                |
| Data enrichment             | Exa API (web search), Anthropic API (Claude Haiku for submission quality review)                                            |
| External APIs (client-side) | Google Favicons (org logos), Wikipedia (people headshots), Photon/OpenStreetMap (geocoding), Bluesky (handle search)        |

---

## Repository Structure

The frontend is a **Vite multi-page app (MPA)**. Each `.html` file in the repo root is a Vite entry point with a React root div and a `<script type="module" src="/src/.../main.tsx">` tag. Vite builds all pages into `dist/`. The only exception is `map.html` (inline D3.js, not React).

```
mapping-ai/
├── index.html              # Home page (React entry → src/home/)
├── contribute.html         # Submission forms (React entry → src/contribute/)
├── map.html                # D3.js stakeholder map - INLINE, not React
├── about.html              # Team info (React entry → src/about/)
├── admin.html              # Admin dashboard (React entry → src/admin/)
├── insights.html           # Data insights with D3 charts (React entry → src/insights/)
├── theoryofchange.html     # Theory of change (React entry → src/theoryofchange/)
├── workshop/index.html     # Workshop page (React entry → src/workshop/)
├── src/
│   ├── contribute/         # ContributeForm, PersonForm, OrgForm, ResourceForm,
│   │                        OrgCreationPanel, OrgSearch, LocationSearch, BlueskySearch
│   ├── admin/              # Admin dashboard (React)
│   ├── insights/           # Insights page with D3 charts
│   ├── about/              # About page
│   ├── home/               # Homepage
│   ├── theoryofchange/     # Theory of change
│   ├── workshop/           # Workshop/mapping party
│   ├── map/                # React map wrapper (MapPage, components, hooks)
│   ├── components/         # Shared: Navigation, TipTapEditor, CustomSelect, TagInput, etc.
│   ├── hooks/              # Shared: useEntityCache, useSearch, useAutoSave, etc.
│   ├── lib/                # API client (api.ts), search utilities (search.ts)
│   ├── types/              # TypeScript type definitions (api.ts, entity.ts)
│   ├── contexts/           # React contexts (DropdownContext)
│   ├── styles/             # Global CSS with Tailwind (global.css)
│   ├── __tests__/          # Vitest tests (components/, lib/)
│   └── tiptap-notes.js     # Legacy TipTap source for map.html (bundled by esbuild)
├── api/
│   ├── submit.js           # Lambda: POST /submit - submissions + entity insert + LLM review
│   ├── submissions.js      # Lambda: GET /submissions - returns entities + edges
│   ├── search.js           # Lambda: GET /search - full-text search
│   ├── admin.js            # Lambda: GET/POST /admin - stats, pending, approve/reject/merge/update/delete, auto map refresh
│   ├── upload.js           # Lambda: POST /upload - thumbnail image upload to S3
│   └── export-map.js       # Shared module: generates map-data.json from DB
├── scripts/
│   ├── migrate.js          # Create/update all 3 tables + triggers + indexes
│   ├── seed.js             # Import Airtable CSV data
│   ├── export.js           # Export all tables to CSV
│   ├── export-map-data.js  # Generate map-data.json from approved entries
│   └── backup-db.js        # Backup all tables to S3 as JSON + SQL
├── assets/
│   ├── css/                # Legacy styles (used by map.html only)
│   ├── images/             # Logo and images
│   └── js/
│       └── tiptap-notes.js # Built TipTap bundle for map.html (generated by esbuild)
├── dist/                   # Vite build output (not tracked in git)
├── vite.config.ts          # Vite MPA config with React, Tailwind, proxy, Vitest
├── tsconfig.json           # TypeScript config (strict, paths: @/* → src/*)
├── data/                   # Airtable CSV source exports
├── template.yaml           # AWS SAM (5 Lambdas + API Gateway + S3 + CloudFront)
├── samconfig.toml          # SAM deploy config (non-sensitive)
├── package.json            # React 19, TanStack Query, React Hook Form, TipTap, Tailwind, Vite 8, Vitest
└── .github/
    └── workflows/
        └── deploy.yml      # CI/CD: Vite build → export → S3 sync → CloudFront invalidate
```

> **Note:** React pages use Tailwind CSS for styling via `src/styles/global.css`. The legacy `assets/css/` and inline `<style>` blocks only apply to `map.html`.

---

## Local Development

### Prerequisites

- Node.js 20+

### Run locally

```bash
git clone https://github.com/MappingAI/mapping-ai.git
cd mapping-ai
npm ci
brew install lefthook    # pre-commit hooks for linting/formatting
lefthook install
```

Create a `.env` file with database credentials (shared via Doppler or ask the team):

```bash
# .env
DATABASE_URL=postgresql://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

Get map data (the map and contribute form search need this to show anything):

```bash
# Option A: Download from production (no DB needed)
curl -o map-data.json https://mapping-ai.org/map-data.json
curl -o map-detail.json https://mapping-ai.org/map-detail.json

# Option B: Generate from database (needs DATABASE_URL in .env)
node scripts/export-map-data.js
```

Start local dev (two terminals):

```bash
# Terminal 1
npx vite dev                      # http://localhost:5173

# Terminal 2
node dev-server.js                # API proxy on localhost:3000
```

Visit `localhost:5173`. Everything works from there: map, contribute form, search, admin, insights. Vite proxies `/api` requests to `localhost:3000` automatically.

### Type checking and tests

```bash
npx tsc --noEmit                  # TypeScript type check (no output)
npx vitest run                    # Run tests (Vitest + jsdom + React Testing Library)
npx vitest                        # Watch mode
```

### Build for production

```bash
npx vite build                    # Outputs to dist/
npm run build:tiptap              # Legacy TipTap bundle for map.html (esbuild)
```

### Run Lambda locally (optional)

```bash
sam build
sam local start-api --parameter-overrides DatabaseUrl=$DATABASE_URL
```

---

## Environment Variables

| Variable                     | Where set                        | Description                            |
| ---------------------------- | -------------------------------- | -------------------------------------- |
| `DATABASE_URL`               | `.env` + Lambda + GitHub Secrets | RDS PostgreSQL connection string       |
| `AWS_ACCESS_KEY_ID`          | `.env` + GitHub Secrets          | AWS credentials                        |
| `AWS_SECRET_ACCESS_KEY`      | `.env` + GitHub Secrets          | AWS credentials                        |
| `EXA_API_KEY`                | `.env`                           | Exa API key for data enrichment        |
| `ANTHROPIC_API_KEY`          | Lambda env var                   | Claude Haiku for submission LLM review |
| `ADMIN_KEY`                  | Lambda env var                   | Admin authentication key               |
| `S3_BUCKET_NAME`             | GitHub Secrets                   | `mapping-ai-website-561047280976`      |
| `CLOUDFRONT_DISTRIBUTION_ID` | GitHub Secrets                   | `E34ZXLC7CZX7XT`                       |

**Never commit `.env`.** It is in `.gitignore`.

---

## Database

### Provider

AWS RDS Postgres 17 (eu-west-2, db.t4g.micro free tier, 20GB gp3). Deletion protection enabled. Automated backups: 1-day retention (free tier max).

### Schema (3 tables)

The schema uses a **unified `entity` table** (migrated from the old schema that had separate `people`, `organizations`, `resources` tables). Do not reference old table names.

#### `entity`

| Column                            | Type                | Notes                                                   |
| --------------------------------- | ------------------- | ------------------------------------------------------- |
| `id`                              | SERIAL PK           |                                                         |
| `entity_type`                     | VARCHAR(20)         | `person`, `organization`, or `resource`                 |
| `name`                            | VARCHAR(200)        | Person/org name                                         |
| `title`                           | VARCHAR(300)        | Job title (person)                                      |
| `category`                        | VARCHAR(200)        | Role (person) or sector (org)                           |
| `primary_org`                     | VARCHAR(200)        | Person's primary org                                    |
| `other_orgs`                      | VARCHAR(200)        | Person's other affiliations                             |
| `website`                         | VARCHAR(200)        | Org website                                             |
| `funding_model`                   | VARCHAR(200)        | Org funding model                                       |
| `parent_org_id`                   | INTEGER FK → entity | Org parent                                              |
| `resource_title`                  | VARCHAR(300)        | Resource title                                          |
| `resource_category`               | VARCHAR(200)        | Resource category                                       |
| `resource_author`                 | VARCHAR(200)        | Resource author                                         |
| `resource_type`                   | VARCHAR(100)        | Essay, Book, Report, etc.                               |
| `resource_url`                    | VARCHAR(500)        | Resource URL                                            |
| `resource_year`                   | VARCHAR(10)         | Resource year                                           |
| `resource_key_argument`           | TEXT                | Resource key argument                                   |
| `location`                        | VARCHAR(200)        |                                                         |
| `influence_type`                  | TEXT                | Comma-separated                                         |
| `twitter`, `bluesky`              | VARCHAR(200)        | Social handles                                          |
| `notes`                           | TEXT                |                                                         |
| `thumbnail_url`                   | VARCHAR(500)        |                                                         |
| `belief_regulatory_stance`        | VARCHAR(200)        | Display label (trigger-derived from wavg)               |
| `belief_regulatory_stance_detail` | TEXT                |                                                         |
| `belief_evidence_source`          | VARCHAR(200)        |                                                         |
| `belief_agi_timeline`             | VARCHAR(200)        | Display label                                           |
| `belief_ai_risk`                  | VARCHAR(200)        | Display label                                           |
| `belief_threat_models`            | TEXT                |                                                         |
| `belief_*_wavg`                   | REAL                | Weighted average score (trigger-maintained)             |
| `belief_*_wvar`                   | REAL                | Weighted variance (trigger-maintained)                  |
| `belief_*_n`                      | INTEGER             | Count of scored submissions                             |
| `submission_count`                | INTEGER             | Total approved submissions                              |
| `status`                          | VARCHAR(20)         | `approved`, `pending`, `internal`                       |
| `search_vector`                   | tsvector            | Full-text search (GIN indexed, auto-updated by trigger) |

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
| `llm_review`                  | JSONB               | Claude Haiku quality rating (1-5), flags, notes    |
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

#### Triggers

1. **`before_submission_update`** - When a new-entity submission is approved (entity_id IS NULL + status→approved), auto-creates the entity row and backfills entity_id
2. **`after_submission_update`** - Recalculates weighted belief scores on the entity when submission status changes. Weights: self=10, connector=2, external=1
3. **`update_entity_search`** - Updates tsvector on entity INSERT/UPDATE

### Database scripts

```bash
npm run db:migrate        # Create/update all tables, triggers, indexes
npm run db:seed           # Import Airtable CSV data
npm run db:export-map     # Generate map-data.json from approved entries
npm run db:backup         # Backup all tables to S3 (JSON + SQL)
npm run db:backup:local   # Backup to local files only
```

### Field name mapping (DB → Frontend)

The export layer (`api/export-map.js`) maps DB column names to what the frontend expects:

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

---

## Deployment

### Backend (Lambda functions)

```bash
source .env && sam build && sam deploy --parameter-overrides "DatabaseUrl=$DATABASE_URL"
```

> **Security:** Never put `DatabaseUrl` in `samconfig.toml` or any tracked file.

### Frontend (auto on push to main)

On every push to `main`, `.github/workflows/deploy.yml`:

1. `npm ci`
2. `npm run build:tiptap` (esbuild bundles legacy TipTap for map.html)
3. `npx vite build` (builds all React pages into `dist/`)
4. DB schema smoke test (verifies entity/submission/edge tables exist)
5. `node scripts/export-map-data.js` (queries RDS → generates map-data.json, copied into `dist/`)
6. `aws s3 sync dist/` (uploads built HTML/CSS/JS/map-data.json to S3 with cache headers)
7. `aws cloudfront create-invalidation` (purges CDN cache)
8. Post-deploy smoke test (verifies /, /contribute, /map, /about, /insights, /admin all return 200)

**Cache headers:**

- HTML files: `no-cache` (always revalidate)
- Hashed assets (JS/CSS): `immutable, max-age=31536000` (1 year)
- `map-data.json`: `max-age=60, stale-while-revalidate=300`

**GitHub Secrets required:**

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID`
- `DATABASE_URL` - RDS connection string
- `SITE_PASSWORD` - password gate hash (remove after public launch)
- `CF_ANALYTICS_TOKEN` - Cloudflare Web Analytics token

### Manual S3 upload + cache invalidation

```bash
node scripts/export-map-data.js
aws s3 cp map-data.json s3://mapping-ai-website-561047280976/map-data.json
aws cloudfront create-invalidation --distribution-id E34ZXLC7CZX7XT --paths "/map-data.json"
```

---

## API Reference

**Production base URL:** `https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com`

### `POST /submit`

Submit a new or updated entry for review.

**Request body (JSON):**

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
- `_hp`: honeypot field - must be empty (bots fill this in)
- `data`: camelCase field names. `entityId` present = edit submission, absent = new entity
- Stance/timeline/risk text labels are converted to numeric scores server-side

**Responses:** 200 (accepted), 400 (validation error), 405 (wrong method), 500 (server error)

**Side effects:** LLM review via Claude Haiku (non-blocking, quality 1-5 rating stored in submission.llm_review)

### `GET /submissions`

Returns approved entities grouped by type.

| Parameter | Values                               | Default    |
| --------- | ------------------------------------ | ---------- |
| `type`    | `person`, `organization`, `resource` | all        |
| `status`  | `approved`, `pending`, `rejected`    | `approved` |

**Response:** `{ "people": [...], "organizations": [...], "resources": [...], "edges": [...] }`

### `GET /search`

Full-text search across entities (tsvector + ILIKE fallback).

| Parameter | Values                               | Notes                 |
| --------- | ------------------------------------ | --------------------- |
| `q`       | search string                        | Required, min 2 chars |
| `type`    | `person`, `organization`, `resource` | Optional filter       |
| `status`  | `pending`, `all`                     | Optional              |

### `GET /admin`

| Parameter                                   | Returns                                           |
| ------------------------------------------- | ------------------------------------------------- |
| `action=stats`                              | Counts by entity_type, pending submissions, edges |
| `action=pending`                            | New entity submissions (entity_id IS NULL)        |
| `action=pending_merges`                     | Edit submissions for existing entities            |
| `action=all&type=entity&entity_type=person` | Browse entities with filters                      |

**Authentication:** `X-Admin-Key` header or `?key=` query param

### `POST /admin`

| Action              | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `approve`           | Approve new entity submission (optional field overrides in `data`) |
| `reject`            | Reject new entity submission                                       |
| `merge`             | Merge edit submission into existing entity                         |
| `reject_submission` | Reject edit without touching entity                                |
| `update_entity`     | Direct admin edit                                                  |
| `delete`            | Delete entity (cascades edges + submissions)                       |

**Side effects:** Approve/merge/delete auto-regenerate map-data.json → S3 → CloudFront invalidation

### `POST /upload`

Upload thumbnail image (JPG/PNG/WebP, max 2MB). Requires admin key.

---

## Spam Protection

- **Honeypot field** (`_hp`): hidden form field - if non-empty, server returns 200 silently without writing to DB
- **LLM review**: Claude Haiku rates submission quality 1-5, flags spam/duplicates/offensive
- **Field length limits**: enforced server-side (200 chars short fields, 1000 chars long fields)
- All submissions land in `status = 'pending'` - require admin approval

---

## Security Practices

- **No secrets in tracked files.** `DATABASE_URL` passed to Lambda via `--parameter-overrides` and stored in GitHub Secrets. Never in `samconfig.toml`.
- **`.env` is gitignored.** Contains DB URL, AWS keys, API keys.
- **Admin auth**: X-Admin-Key header on /admin and /upload endpoints.
- **Deletion protection** enabled on RDS instance.
- **DB backups**: `npm run db:backup` dumps to S3 (`backups/` prefix). RDS automated snapshots: 1-day retention (free tier limit).
- **Submitter emails** stored in DB but stripped from all public API responses.

---

## Commit Conventions

| Prefix      | Use for                               |
| ----------- | ------------------------------------- |
| `feat:`     | New feature                           |
| `fix:`      | Bug fix                               |
| `refactor:` | Code restructure, no behavior change  |
| `docs:`     | Documentation only                    |
| `style:`    | CSS / visual changes, no logic change |
| `chore:`    | Maintenance, dependencies, config     |
