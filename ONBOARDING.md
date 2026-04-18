# Mapping AI Onboarding Guide

Mapping AI is a crowdsourced database and interactive map of the U.S. AI policy landscape. It tracks the people, organizations, and resources shaping AI governance -- who they are, where they stand on key issues, and how they connect to each other.

The project serves a working group of researchers, policy experts, and practitioners building a progressive AI policy agenda. Public submissions are welcome at [mapping-ai.org](https://mapping-ai.org). All submissions go through admin review before appearing on the map.

---

## How Is It Organized?

The system has two halves: a React frontend built with Vite and served from S3/CloudFront, and a serverless API backed by Lambda and RDS Postgres.

```
+------------------+
|  Browser         |
|  mapping-ai.org  |
+--------+---------+
         |
         v
+------------------+
|  Cloudflare DNS  |
+--------+---------+
         |
         v
+------------------+
|  CloudFront CDN  |
+--------+---------+
         |
    +----+----+
    v         v
+--------+ +------------------+
| S3     | | API Gateway      |
| Static | | 5 Lambda routes  |
| (dist/)| +--------+---------+
+--------+          |
                    v
            +------------------+
            | RDS Postgres 17  |
            | entity,          |
            | submission, edge |
            +------------------+
```

The frontend is a **Vite 8 multi-page app (MPA)** using React 19, TypeScript, and Tailwind CSS v4. Each `.html` file in the repo root is a Vite entry point containing a `<div id="...-root">` and a `<script type="module" src="/src/.../main.tsx">` tag. Vite builds all pages into `dist/`.

**The one exception is `map.html`** -- the D3.js interactive map is fully inline HTML/CSS/JS (not React). Do not try to convert it without understanding the D3 force simulation. Never add `defer` or `async` to its D3 script tag.

The map loads from a static `map-data.json` file on S3 -- not from the database at runtime. This makes the map instant for all users. New data appears after admin approval triggers a regeneration of `map-data.json`.

### Directory structure

```
mapping-ai/
  index.html              # Home page (React entry → src/home/)
  contribute.html         # Submission forms (React entry → src/contribute/)
  map.html                # D3.js interactive map - INLINE, not React
  about.html              # Team info (React entry → src/about/)
  admin.html              # Admin dashboard (React entry → src/admin/)
  insights.html           # Data insights with D3 charts (React entry → src/insights/)
  theoryofchange.html     # Theory of change (React entry → src/theoryofchange/)
  workshop/index.html     # Workshop page (React entry → src/workshop/)
  src/
    contribute/           # ContributeForm, PersonForm, OrgForm, ResourceForm
    admin/                # Admin dashboard components
    insights/             # Insights page with D3 charts
    about/                # About page
    home/                 # Homepage
    theoryofchange/       # Theory of change page
    workshop/             # Workshop/mapping party page
    map/                  # React map wrapper (MapPage, components, hooks)
    components/           # Shared: Navigation, TipTapEditor, CustomSelect, etc.
    hooks/                # Shared: useEntityCache, useSearch, useAutoSave, etc.
    lib/                  # API client, search utilities
    types/                # TypeScript type definitions
    contexts/             # React contexts (DropdownContext)
    styles/               # Global CSS with Tailwind (global.css)
    __tests__/            # Vitest tests
  api/
    submit.js             # POST /submit
    search.js             # GET /search
    submissions.js        # GET /submissions
    admin.js              # GET/POST /admin
    upload.js             # POST /upload
    export-map.js         # Shared map-data generator
  scripts/
    migrate.js            # DB schema management
    seed.js               # CSV data import
    export-map-data.js    # CLI map-data export
    backup-db.js          # DB backup to S3
  assets/
    css/                  # Legacy styles (used by map.html)
    js/                   # Legacy TipTap bundle (used by map.html)
    images/               # Logos
  vite.config.ts          # Vite MPA config with React, Tailwind, proxy, Vitest
  tsconfig.json           # TypeScript config (strict, paths: @/* → src/*)
  template.yaml           # AWS SAM (IaC)
  .github/workflows/
    deploy.yml            # CI/CD pipeline
```

React pages use Tailwind CSS for styling via `src/styles/global.css`. The legacy `assets/css/` and inline `<style>` blocks only apply to `map.html`.

### Key modules

| Module | Responsibility |
|--------|---------------|
| `src/contribute/` | React contribute forms (PersonForm, OrgForm, ResourceForm) with TipTap, org search, location search |
| `src/admin/` | React admin dashboard (pending queue, entity editing, merging) |
| `src/insights/` | React insights page with D3 charts |
| `src/components/` | Shared React components (Navigation, TipTapEditor, CustomSelect, TagInput, etc.) |
| `src/hooks/` | Shared hooks (useEntityCache, useSearch, useAutoSave, useSubmitEntity, etc.) |
| `src/lib/api.ts` | Typed API client for all Lambda endpoints |
| `src/types/` | TypeScript type definitions for entities, API responses |
| `api/` | Lambda handlers for submissions, search, admin, uploads |
| `api/export-map.js` | Generates `map-data.json` from DB; maps DB column names to frontend field names |
| `scripts/` | DB migration, seeding, export, and backup utilities |
| `map.html` | D3.js force-directed graph with orbital clusters, plot view, semantic search (inline, not React) |
| `template.yaml` | AWS SAM definition for all infrastructure |

### External dependencies

| Dependency | Purpose | Configured via |
|-----------|---------|---------------|
| AWS RDS Postgres 17 | Primary data store | `DATABASE_URL` |
| AWS S3 | Static hosting + DB backups | `S3_BUCKET_NAME` |
| AWS CloudFront | CDN + SSL termination | `CLOUDFRONT_DISTRIBUTION_ID` |
| AWS Lambda + API Gateway | Serverless API (5 functions) | `template.yaml` |
| Cloudflare | DNS (CNAME flattening) | External config |
| Anthropic API | Claude Haiku submission quality review | `ANTHROPIC_API_KEY` |
| Exa API | Web search for data enrichment | `EXA_API_KEY` |
| Google Favicons API | Org logos on map (client-side) | None |
| Wikipedia API | People headshots on map (client-side) | None |
| Photon/OpenStreetMap | City geocoding in forms (client-side) | None |
| Bluesky API | Handle search in forms (client-side) | None |

---

## Key Concepts and Abstractions

| Concept | What it means in this codebase |
|---------|-------------------------------|
| Entity | The unified database record for a person, organization, or resource. Discriminated by `entity_type`. |
| Submission | A pending contribution from a user. Can create a new entity (`entity_id` NULL) or propose edits to an existing one. |
| Edge | A typed relationship between two entities (affiliation, collaboration, funding, criticism, authorship). |
| Belief fields | Stance on regulatory policy, AGI timeline, and AI risk level. Stored as text labels on `entity`, with weighted averages computed from submissions. |
| Weighted belief scores | `belief_*_wavg` columns on `entity`, auto-maintained by DB triggers. Weights: self=10, connector=2, external=1. |
| Field name mapping | DB columns (`belief_regulatory_stance`) map to different frontend names (`regulatory_stance`). The `toFrontendShape()` function in `api/export-map.js` handles this. Any schema change must update this mapping. |
| `map-data.json` | Static JSON snapshot of all approved entities and edges. Generated from DB, uploaded to S3, served by CloudFront. The map never hits the database directly. |
| Source type | How a submission relates to the entity: `self` (the person themselves), `connector` (close relation), or `external` (third party). Determines belief score weight. |
| LLM review | Claude Haiku rates each submission 1-5 for quality, flags spam/duplicates. Non-blocking, stored in `submission.llm_review` as JSONB. |
| Orbital cluster layout | The D3.js map groups nodes into clusters by category (org sector or person role) arranged in orbits around a center point. |
| Plot view | Scatter or beeswarm chart plotting entities on two belief axes (stance, timeline, risk) using numeric scores. |
| Category normalization | Frontend merges variant category names (e.g., "AI Safety/Alignment" becomes "AI Safety") for consistent clustering. |
| Honeypot (`_hp`) | Hidden form field for spam detection. If filled, the server returns 200 but discards the submission. |

---

## Primary Flows

### Flow 1: Public submission

A user fills out a form on `contribute.html` to add a person, org, or resource.

```
contribute.html
  client-side validation,
  duplicate detection,
  localStorage auto-save
  |
  v
POST /submit (api/submit.js)
  validates input, honeypot check
  |
  v
INSERT into submission table
  status = 'pending',
  belief text → numeric scores
  |
  v
Claude Haiku LLM review
  (async, non-blocking)
  rates quality 1-5,
  stores in submission.llm_review
  |
  v
Response: 200 OK
```

The submission sits in the pending queue until an admin reviews it.

### Flow 2: Admin approval → map update

An admin reviews pending submissions on `admin.html`.

1. Admin loads `admin.html`, authenticates with `X-Admin-Key` header
2. `GET /admin?action=pending` returns pending submissions
3. Admin clicks Approve → `POST /admin { action: 'approve', id: ... }`
4. DB trigger `before_submission_update` fires: creates an `entity` row from the submission, backfills `entity_id`
5. DB trigger `after_submission_update` fires: recalculates weighted belief scores on the entity
6. Lambda regenerates `map-data.json` via `api/export-map.js`, uploads to S3, invalidates CloudFront
7. Map reflects the change within ~60 seconds

### Flow 3: Map loads static data

1. User opens `map.html`
2. Browser fetches `map-data.json` from CloudFront (cached globally)
3. D3.js renders force-directed graph with orbital clusters
4. No database call -- the map is entirely client-side after the initial JSON fetch

---

## Where Do I Start?

### Setup

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

### Get map data

The map and contribute form search need `map-data.json` to work. On a fresh clone it doesn't exist. Either download from production or generate from the database:

```bash
# Option A: Download from production (no DB credentials needed)
curl -o map-data.json https://mapping-ai.org/map-data.json
curl -o map-detail.json https://mapping-ai.org/map-detail.json

# Option B: Generate from database (needs DATABASE_URL in .env)
node scripts/export-map-data.js
```

### Running locally

Open two terminals:

```bash
# Terminal 1
npx vite dev              # http://localhost:5173

# Terminal 2
node dev-server.js        # API proxy on localhost:3000
```

Visit `localhost:5173`. Everything works from there: map, contribute form, search, admin, insights. Vite proxies `/api` requests to `localhost:3000` automatically.

### Database access

With `DATABASE_URL` in your `.env`, you can read/write directly to the staging database:

```bash
# Generate fresh map data from the database
node scripts/export-map-data.js

# Run database migrations (create/update tables)
npm run db:migrate

# Backup all tables
npm run db:backup:local
```

The Express dev server (`node dev-server.js`) connects to the same database for API calls (form submissions, search, admin actions).

### Available scripts

| Command | What it does |
|---------|-------------|
| `npx vite dev` | Vite dev server with HMR (port 5173, proxies /api to :3000) |
| `npx vite build` | Production build (outputs to dist/) |
| `npx tsc --noEmit` | TypeScript type check |
| `npx vitest run` | Run tests (Vitest + jsdom + React Testing Library) |
| `node dev-server.js` | Local Express API server (port 3000) |
| `npm run build:tiptap` | Legacy TipTap bundle for map.html (esbuild) |
| `npm run db:migrate` | Create/update all tables, triggers, indexes |
| `npm run db:seed` | Import Airtable CSV data |
| `npm run db:export-map` | Generate `map-data.json` from approved entities |
| `npm run db:backup` | Backup all tables to S3 |
| `npm run db:backup:local` | Backup to local files only |

Backend deploy (Lambda functions):

```bash
source .env && sam build && sam deploy \
  --parameter-overrides "DatabaseUrl=$DATABASE_URL"
```

Frontend deploys automatically on push to `main` via GitHub Actions (Vite build + S3 sync + CloudFront invalidation).

### Common change patterns

- **Add a new React page**: Create `src/yourpage/App.tsx` and `src/yourpage/main.tsx`, add a root `.html` entry point with a `<div id="yourpage-root">` and `<script type="module" src="/src/yourpage/main.tsx">`, then add the entry to `vite.config.ts` `build.rollupOptions.input`.
- **Add a shared component**: Put it in `src/components/`. Import with `@/components/YourComponent` (path alias configured in tsconfig.json).
- **Update submission forms**: Edit React components in `src/contribute/`. Forms use React Hook Form. The submit handler sends camelCase `data` to `POST /submit`.
- **Add a new API endpoint**: Create a handler in `api/`, add a `AWS::Serverless::Function` resource in `template.yaml` with an `HttpApi` event, and add a matching route in `dev-server.js` for local testing.
- **Change the database schema**: Edit `scripts/migrate.js`, run `npm run db:migrate`. If you change entity columns, update the field mapping in `api/export-map.js` (`toFrontendShape()`) or the map will break silently.
- **Modify the map visualization**: Edit `map.html` directly -- all D3.js code is inline. Do NOT convert to React. The map reads from `map-data.json`, so check field names against `api/export-map.js`. Never add `defer` or `async` to the D3 script tag.

### Key files to start with

| Area | File | Why |
|------|------|-----|
| Contribute forms | `src/contribute/` | PersonForm, OrgForm, ResourceForm with validation |
| Shared components | `src/components/` | TipTapEditor, CustomSelect, Navigation, TagInput |
| Shared hooks | `src/hooks/` | useEntityCache, useSearch, useAutoSave |
| API client | `src/lib/api.ts` | Typed API client for all Lambda endpoints |
| Type definitions | `src/types/` | Entity, submission, and API response types |
| Map visualization | `map.html` | Inline D3.js -- clusters, search, filters (not React) |
| Lambda handlers | `api/submit.js` | How submissions are validated and stored |
| Data pipeline | `api/export-map.js` | DB → frontend field mapping |
| Admin workflow | `api/admin.js` | Approve/reject/merge logic, auto map refresh |
| DB schema | `scripts/migrate.js` | Table definitions, triggers, indexes |
| Build config | `vite.config.ts` | MPA entry points, proxy, test config |
| CI/CD | `.github/workflows/deploy.yml` | Vite build → export → S3 sync → CDN invalidation |

### Tips

- Run `npx tsc --noEmit` before pushing to catch type errors early.
- The Vite dev server has hot module replacement -- changes to React components appear instantly.
- `map-data.json` is not tracked in git. It's generated during CI/CD from the database. Run `npm run db:export-map` to generate it locally.
- TypeScript path aliases: `@/components/Foo` resolves to `src/components/Foo`. Configured in `tsconfig.json`.
- `map.html` is the only page that is NOT React. It has inline CSS and JS. Do not try to refactor it into React without understanding the D3 force simulation.
- See [`TECH.md`](TECH.md) for the full API reference, schema details, and deployment instructions.
