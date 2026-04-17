# Mapping AI Onboarding Guide

Mapping AI is a crowdsourced database and interactive map of the U.S. AI policy landscape. It tracks the people, organizations, and resources shaping AI governance -- who they are, where they stand on key issues, and how they connect to each other.

The project serves a working group of researchers, policy experts, and practitioners building a progressive AI policy agenda. Public submissions are welcome at [mapping-ai.org](https://mapping-ai.org). All submissions go through admin review before appearing on the map.

---

## How Is It Organized?

The system has two halves: a static frontend served from S3/CloudFront, and a serverless API backed by Lambda and RDS Postgres.

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
| files  | +--------+---------+
+--------+          |
                    v
            +------------------+
            | RDS Postgres 17  |
            | entity,          |
            | submission, edge |
            +------------------+
```

The map itself loads from a static `map-data.json` file on S3 -- not from the database at runtime. This makes the map instant for all users. New data appears after admin approval triggers a regeneration of `map-data.json`.

### Directory structure

```
mapping-ai/
  index.html            # Home page
  map.html              # D3.js interactive map
  contribute.html       # Submission forms
  admin.html            # Admin dashboard
  about.html            # Team info
  theoryofchange.html   # Theory of change
  api/
    submit.js           # POST /submit
    search.js           # GET /search
    submissions.js      # GET /submissions
    admin.js            # GET/POST /admin
    upload.js           # POST /upload
    export-map.js       # Shared map-data generator
  scripts/
    migrate.js          # DB schema management
    seed.js             # CSV data import
    export-map-data.js  # CLI map-data export
    backup-db.js        # DB backup to S3
  src/
    tiptap-notes.js     # TipTap source (esbuild)
  assets/
    css/                # Styles (index only)
    js/                 # Built bundles
    images/             # Logos
  template.yaml         # AWS SAM (IaC)
  .github/workflows/
    deploy.yml          # CI/CD pipeline
```

Each HTML page has its own inline `<style>` block -- there is no shared stylesheet across pages. `assets/css/styles.css` only applies to `index.html`.

### Key modules

| Module | Responsibility |
|--------|---------------|
| `api/` | Lambda handlers for submissions, search, admin, uploads |
| `api/export-map.js` | Generates `map-data.json` from DB; maps DB column names to frontend field names |
| `scripts/` | DB migration, seeding, export, and backup utilities |
| `src/tiptap-notes.js` | TipTap rich text editor with @mentions (bundled by esbuild) |
| `map.html` | D3.js force-directed graph with orbital clusters, plot view, semantic search |
| `contribute.html` | Rich forms with duplicate detection, org search, location autocomplete |
| `admin.html` | Pending queue, entity editing, submission merging |
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

```
git clone https://github.com/MappingAI/mapping-ai.git
cd mapping-ai
nvm use               # Node 20 (.nvmrc)
npm install
npx lefthook install  # one-time: wires up pre-commit hook
npm run dev           # Vite on http://localhost:5173
```

That's it — no `.env` needed for a first look. The map loads synthetic data from `fixtures/map-data.json` so a fresh clone renders the full UI without any credentials. If you want to hit the real API or run enrichment scripts, copy `.env.example` to `.env` and fill in only the variables for the features you're touching (the example file documents which one unlocks what).

Full contributor workflow — npm scripts, CI expectations, coding conventions, fixture-guard workflow — is in [CONTRIBUTING.md](CONTRIBUTING.md).

### Available scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm run build` | Production build into `dist/` |
| `npm run lint` / `lint:fix` | ESLint; `--fix` auto-resolves what it can |
| `npm run format` / `format:check` | Prettier `--write` / `--check` |
| `npm run type-check` | `tsc --noEmit` across `src/` |
| `npm test` / `test:watch` | Vitest single-pass / watch |
| `npm run db:migrate` | Create/update all tables, triggers, indexes |
| `npm run db:seed` | Import Airtable CSV data |
| `npm run db:export-map` | Generate `map-data.json` from approved entities |
| `npm run db:backup` / `db:backup:local` | Back up all tables to S3 / locally |

Backend deploy (Lambda functions):

```
source .env && sam build && sam deploy \
  --parameter-overrides "DatabaseUrl=$DATABASE_URL"
```

Frontend deploys automatically on push to `main` via GitHub Actions.

### Common change patterns

- **Add a new API endpoint**: Create a handler in `api/`, add a `AWS::Serverless::Function` resource in `template.yaml` with an `HttpApi` event, and add a matching route in `dev-server.js` for local testing.
- **Change the database schema**: Edit `scripts/migrate.js`, run `npm run db:migrate`. If you change entity columns, update the field mapping in `api/export-map.js` (`toFrontendShape()`) or the map will break silently.
- **Modify the map visualization**: Edit `map.html` directly -- all D3.js code is inline. The map reads from `map-data.json`, so check field names against `api/export-map.js`.
- **Update submission forms**: Edit `contribute.html`. Form fields use camelCase names in the `data` object sent to `POST /submit`.

### Key files to start with

| Area | File | Why |
|------|------|-----|
| Map visualization | `map.html` | All D3.js code, clusters, search, filters |
| Submission forms | `contribute.html` | Rich forms, duplicate detection, autocomplete |
| API entry point | `api/submit.js` | How submissions are validated and stored |
| Data pipeline | `api/export-map.js` | DB → frontend field mapping, the bridge between schema and UI |
| Admin workflow | `api/admin.js` | Approve/reject/merge logic, auto map refresh |
| DB schema | `scripts/migrate.js` | Table definitions, triggers, indexes |
| Infrastructure | `template.yaml` | All AWS resources (Lambda, API Gateway, S3, CloudFront) |
| CI/CD | `.github/workflows/deploy.yml` | Build → export → S3 sync → CDN invalidation |

### Tips

- The dev server (`dev-server.js`) uses the same unified `entity/submission/edge` schema as production. Run `node dev-server.js` to start on port 3000.
- Each HTML page has all its CSS inline. When you change styles on one page, it won't affect any other page.
- `map-data.json` is not tracked in git. It's generated during CI/CD from the database. Run `npm run db:export-map` to generate it locally.
- See [`TECH.md`](TECH.md) for the full API reference, schema details, and deployment instructions.
