# Mapping AI

A collaborative stakeholder mapping project for the U.S. AI policy landscape.

## Project Overview

Multi-page website with an interactive D3.js stakeholder map, crowdsourced data collection via rich forms, and a relational database linking people, organizations, and resources. Bidirectional links between entities enable network visualization.

**Live site:** https://mapping-ai.org

## Tech Stack

All infrastructure is on AWS. No Vercel or Neon.

- **Frontend**: Vite 8 MPA + React 19 + TypeScript + Tailwind CSS v4 (migrated from inline HTML/CSS/JS)
- **map.html**: Only remaining inline page — D3.js force-directed graph with orbital cluster layout (not React)
- **Data fetching**: TanStack Query (React Query v5)
- **Forms**: React Hook Form
- **Rich text**: TipTap (ProseMirror-based) for Notes fields with @mentions (`src/components/TipTapEditor.tsx`); legacy esbuild bundle still used by map.html (`src/tiptap-notes.js`)
- **XSS sanitization**: DOMPurify
- **DNS**: Cloudflare (CNAME flattening → CloudFront distribution)
- **CDN**: AWS CloudFront (caches static files globally, SSL termination)
- **Static hosting**: AWS S3 (`mapping-ai-website-561047280976` bucket, private, accessed only via CloudFront OAC)
- **Visualization**: D3.js force-directed graph with orbital cluster layout (`map.html`); D3 also used in insights page charts
- **API**: AWS API Gateway HTTP API + 5 Lambda functions (Node.js 20)
- **Database**: AWS RDS PostgreSQL 17 (`mapping-ai-db.c9sccou2k3xe.eu-west-2.rds.amazonaws.com`, db.t4g.micro free tier, 20GB gp3, deletion protection enabled)
- **Infrastructure-as-code**: AWS SAM (`template.yaml`) — defines Lambda functions, API Gateway, S3 bucket, CloudFront distribution
- **CI/CD**: GitHub Actions (auto-deploy on push to `main`)
- **Data enrichment**: Exa API (web search), Anthropic API (Claude Haiku for quality classification)
- **External APIs (client-side)**: Google Favicons (org logos), Wikipedia (people headshots), Photon/OpenStreetMap (city geocoding), Bluesky (handle search)

## Data Flow

There are two data paths:

### Path 1: Static map data (read-only, fast)
```
GitHub push to main
    → GitHub Actions workflow:
        1. npm ci
        2. npm run build:tiptap (esbuild bundles TipTap for map.html)
        3. npx vite build (builds React pages → dist/)
        4. node scripts/export-map-data.js (queries RDS → generates map-data.json)
        5. aws s3 sync dist/ (uploads built HTML/CSS/JS/map-data.json to S3)
        6. aws cloudfront create-invalidation (purges CDN cache)
    → Users load map.html → fetches map-data.json from CloudFront (no DB call)
    → contribute.html also loads map-data.json for instant client-side search/autocomplete
```

### Path 2: Live API (form submissions, search)
```
User submits form on contribute.html
    → POST to API Gateway (https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com/submit)
    → Lambda function (api/submit.js) → INSERT into submission table (status='pending')
    → Claude Haiku LLM review (non-blocking, rates quality 1-5)

User searches in form autocomplete (if cache not loaded yet)
    → GET /search?q=... → Lambda (api/search.js) → full-text search on RDS → results

Admin approves submission (via admin.html)
    → POST /admin { action: 'approve' } → Lambda (api/admin.js)
    → DB trigger creates entity row from submission, recalculates belief scores
    → Auto-regenerates map-data.json → uploads to S3 → invalidates CloudFront cache
    → Map reflects changes within ~60 seconds
```

**Key insight:** The map loads from a static JSON file on S3/CloudFront, NOT from the database. This makes the map load instantly for all users worldwide. New submissions appear on the map automatically after admin approval (no deploy needed). For manual data refresh:
```bash
node scripts/export-map-data.js                           # regenerate from DB
aws s3 cp map-data.json s3://mapping-ai-website-561047280976/  # upload to S3
aws cloudfront create-invalidation --distribution-id E34ZXLC7CZX7XT --paths "/map-data.json"
```

## Project Structure

The frontend is a Vite multi-page app (MPA). Each `.html` file in the repo root is a Vite entry point with a `<div id="...-root">` and a `<script type="module" src="/src/.../main.tsx">` tag. Vite builds all pages into `dist/`. The one exception is `map.html`, which is fully inline (D3.js, not React).

```
mapping-ai/
├── index.html              # Home page (React entry → src/home/)
├── contribute.html         # Submission forms (React entry → src/contribute/)
├── map.html                # D3.js stakeholder map — INLINE, not React
├── about.html              # Team info (React entry → src/about/)
├── admin.html              # Admin dashboard (React entry → src/admin/)
├── insights.html           # Data insights with D3 charts (React entry → src/insights/)
├── theoryofchange.html     # Theory of change (React entry → src/theoryofchange/)
├── workshop/index.html     # Workshop/mapping party (React entry → src/workshop/)
├── src/
│   ├── contribute/         # ContributeForm, PersonForm, OrgForm, ResourceForm,
│   │                        OrgCreationPanel, OrgSearch, LocationSearch, BlueskySearch
│   ├── admin/              # Admin dashboard (React)
│   ├── insights/           # Insights page with D3 charts
│   ├── about/              # About page
│   ├── home/               # Homepage
│   ├── theoryofchange/     # Theory of change page
│   ├── workshop/           # Workshop/mapping party page
│   ├── map/                # React map wrapper (MapPage, components, hooks)
│   ├── components/         # Shared: Navigation, TipTapEditor, CustomSelect,
│   │                        DuplicateDetection, TagInput, PasswordGate, etc.
│   ├── hooks/              # Shared: useEntityCache, useSearch, useAutoSave,
│   │                        useSubmitEntity, usePasswordGate, useSubmissionLedger
│   ├── lib/                # API client (api.ts), search utilities (search.ts)
│   ├── types/              # TypeScript type definitions (api.ts, entity.ts)
│   ├── contexts/           # React contexts (DropdownContext)
│   ├── styles/             # Global CSS with Tailwind (global.css)
│   ├── __tests__/          # Vitest tests (components/, lib/)
│   └── tiptap-notes.js     # Legacy TipTap source for map.html (bundled by esbuild)
├── api/
│   ├── submit.js           # Lambda: POST /submit — submissions + LLM review
│   ├── submissions.js      # Lambda: GET /submissions — returns entities + edges
│   ├── search.js           # Lambda: GET /search — full-text search
│   ├── admin.js            # Lambda: GET/POST /admin — stats, pending, approve/reject/merge/update/delete, auto map refresh
│   ├── upload.js           # Lambda: POST /upload — thumbnail image upload to S3
│   └── export-map.js       # Shared module: generates map-data.json from DB (maps DB columns → frontend field names)
├── scripts/
│   ├── migrate.js          # Create/update all 3 tables + triggers + indexes
│   ├── seed.js             # Import Airtable CSV data
│   ├── export.js           # Export all tables to CSV
│   ├── export-map-data.js  # Generate map-data.json from approved entries
│   ├── backup-db.js        # Backup all tables to S3 as JSON + SQL
│   ├── enrich-elections.js  # Enrich political candidates + PACs via Exa API
│   ├── enrich-people.js    # General-purpose people enrichment via Exa API
│   └── seed-time100.js     # Seed TIME100 AI list entities
├── assets/
│   ├── css/                # Legacy styles (used by map.html)
│   ├── images/             # Logo and images
│   └── js/
│       └── tiptap-notes.js # Built TipTap bundle for map.html (generated by esbuild)
├── data/                   # Airtable CSV source exports
├── dist/                   # Vite build output (not tracked in git)
├── vite.config.ts          # Vite MPA config with React, Tailwind, proxy, Vitest
├── tsconfig.json           # TypeScript config (strict, paths: @/* → src/*)
├── template.yaml           # AWS SAM (5 Lambdas + API Gateway + S3 + CloudFront)
├── samconfig.toml          # SAM deploy config
├── .github/workflows/
│   └── deploy.yml          # CI/CD: Vite build → export → S3 sync → CloudFront invalidate
└── package.json            # React 19, TanStack Query, React Hook Form, TipTap, Tailwind, Vite 8, Vitest
```

## Database Schema (3 tables)

The RDS schema uses a **unified `entity` table** (migrated from the old schema that had separate `people`, `organizations`, `resources` tables). Do not assume the old per-type table names — they no longer exist.

### `entity`
id, entity_type (person|organization|resource), name, category, other_categories (TEXT, comma-separated secondary categories), title, primary_org, other_orgs, website, funding_model, parent_org_id (FK → entity), resource_title, resource_category, resource_author, resource_type, resource_url, resource_year, resource_key_argument, location, influence_type, twitter, bluesky, notes, notes_html (TEXT, rich text from TipTap), thumbnail_url, belief_regulatory_stance + detail, belief_evidence_source, belief_agi_timeline, belief_ai_risk, belief_threat_models, belief_*_wavg/wvar/n (trigger-maintained weighted aggregates), submission_count, search_vector (tsvector), status (approved|pending|internal)

### `submission`
entity_type, entity_id (nullable — NULL for new entity submissions, set for edit submissions), submitter_email, submitter_relationship (self|connector|external), (all entity fields as flat columns), belief_*_score (SMALLINT — numeric scores for trigger aggregation), notes_html, notes_mentions (JSONB), llm_review (JSONB: quality 1-5, flags, notes from Claude Haiku), status (pending|approved|rejected), resolution_notes, reviewed_at, reviewed_by

### `edge` (relationships + org affiliations)
source_id + target_id (both FK → entity, ON DELETE CASCADE), edge_type (affiliated/collaborator/funder/critic/authored_by/etc.), role, is_primary, evidence, created_by, UNIQUE(source_id, target_id, edge_type)

### Triggers
- **before_submission_update**: When new-entity submission approved (entity_id IS NULL), auto-creates entity row and backfills entity_id
- **after_submission_update**: Recalculates weighted belief scores on entity. Weights: self=10, connector=2, external=1
- **update_entity_search**: Updates tsvector on entity INSERT/UPDATE

### Field name mapping (DB → Frontend)

The export layer (`api/export-map.js` → `toFrontendShape()`) maps DB column names to frontend field names. This is critical — the frontend reads different names than the DB stores:

- `belief_regulatory_stance` → `regulatory_stance`
- `belief_agi_timeline` → `agi_timeline`
- `belief_ai_risk` → `ai_risk_level`
- `resource_title` → `title` (resources only)
- `resource_url` → `url` (resources only)
- `belief_*_wavg` → `stance_score` / `timeline_score` / `risk_score` (with text-label fallback)

Any schema change must update this mapping or the map/plot will break silently.

**Full-text search:** tsvector column with GIN index on `entity`. Auto-updated via triggers on INSERT/UPDATE.

## Commands

```bash
# Local development
npx vite dev                    # Vite dev server (port 5173, proxies /api → localhost:3000)
node dev-server.js              # Express API server (port 3000) — run alongside Vite for API access
npx vite build                  # Production build (outputs to dist/)

# Type checking and tests
npx tsc --noEmit                # TypeScript type check (no output)
npx vitest run                  # Run tests (Vitest + jsdom + React Testing Library)

# Build (legacy TipTap bundle for map.html)
npm run build:tiptap            # esbuild: src/tiptap-notes.js → assets/js/tiptap-notes.js

# Database
npm run db:migrate              # Create/update all tables, triggers, indexes
npm run db:seed                 # Import Airtable CSV data
npm run db:export-map           # Generate map-data.json from approved entries
npm run db:backup               # Backup all tables to S3 (JSON + SQL)
npm run db:backup:local         # Backup to local files only

# Deploy backend (Lambda functions)
sam build && sam deploy --parameter-overrides DatabaseUrl=$DATABASE_URL AdminKey=$ADMIN_KEY AnthropicApiKey=$ANTHROPIC_API_KEY

# Deploy frontend (automatic on push to main)
git push origin main            # Triggers: Vite build → export → S3 sync → CloudFront invalidate

# Manual S3 upload + cache invalidation
aws s3 cp map-data.json s3://mapping-ai-website-561047280976/map-data.json
aws cloudfront create-invalidation --distribution-id E34ZXLC7CZX7XT --paths "/*"
```

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `.env` + Lambda + GitHub Secrets | RDS PostgreSQL connection string |
| `AWS_ACCESS_KEY_ID` | `.env` + GitHub Secrets | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | `.env` + GitHub Secrets | AWS credentials |
| `S3_BUCKET_NAME` | GitHub Secrets | `mapping-ai-website-561047280976` |
| `CLOUDFRONT_DISTRIBUTION_ID` | GitHub Secrets | `E34ZXLC7CZX7XT` |
| `EXA_API_KEY` | `.env` | Exa API key for data enrichment |
| `ANTHROPIC_API_KEY` | `.env` + Lambda (via SAM parameter) | Claude Haiku for LLM review + semantic search |
| `ADMIN_KEY` | `.env` + Lambda (via SAM parameter) | Admin authentication (passed via --parameter-overrides, never committed) |

## API Endpoints

**Production:** `https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/submit` | POST | Form submission (camelCase `data` object → submission table + LLM review) |
| `/submissions` | GET | Query approved entities with edges |
| `/search` | GET | Full-text search (`?q=...&type=...&status=pending\|all`) |
| `/admin` | GET | Stats, pending queue, all entities (requires admin key) |
| `/admin` | POST | Approve, reject, merge, update, delete entities (auto-refreshes map on approve/merge/delete) |
| `/upload` | POST | Thumbnail image upload to S3 (requires admin key) |

## Form Features (src/contribute/)

- **Relationship pills**: Compact pill toggle at top of each form ("I am this person" / "I can connect you" / "Someone I know of") — click to select, click again to deselect
- **Clear form**: Inline link on pill row — resets all fields, custom selects, tags, TipTap editors
- **Primary + secondary categories**: Primary via dropdown ("Primary Role" / "Primary Category"), additional via tag dropdown with click-to-add and × remove
- **Duplicate detection**: Client-side search on Name/Title fields with existing entry card sidebar
- **Org search**: Primary org, affiliated orgs, parent org — all search existing DB (approved + pending with badge) with edit/add links. Focus preload (top 5), 1-char search.
- **Author search**: Resource form searches existing people for author field
- **TipTap notes**: Rich text (bold/italic/lists/links) with @mentions. Info tooltip explains what to include (policy positions, relationships, funding, career) with @mention example showing bidirectional linking. @mention dropdown shows type badge (Person/Org/Resource), name with ellipsis for long names, detail text.
- **Custom dropdowns**: Styled selects with category/stance colors, search, arrow key nav, click-to-deselect (clicking selected option clears it)
- **Example submissions**: Collapsible `<details>` with interactive @mentions — hover shows entity card fetched from search API
- **Location search**: Multi-city tag input via Photon geocoding API, Remote option for orgs
- **Social search**: Bluesky handle search (free public API)
- **Auto-save**: localStorage draft every 500ms, restored on page load, per-form clear
- **Inline org creation panel**: Slide-in side panel (460px, 100vw mobile) for creating new orgs without leaving the person/resource form. Triggered from "Add 'X' as new org..." dropdown or "Can't find it?" links. Features: name pre-fill from search, category dropdown, website, location search with multi-city tags (Photon/OSM), expandable section with funding model, regulatory stance, Twitter/X, Bluesky live search, TipTap rich text notes with @mentions and info tooltip. Auto-submits via `/submit` API, shows success overlay, auto-closes and links org back to triggering field.
- **Request body**: camelCase field names in `data` object, `_hp` honeypot field

## Map Features (map.html)

- **D3.js force simulation** with orbital cluster layout, semantic ordering
- **Two-level view system**: Top-level "Network" (with sub-tabs: All/Orgs/People/Resources) and "Plot" (scatter/beeswarm). SVG icons on buttons. Sub-view persisted to localStorage.
- **Plot view**: 2D scatter or 1D beeswarm plotting people + orgs on any two of {regulatory_stance, agi_timeline, ai_risk_level}; uses `stance_score` / `timeline_score` / `risk_score` from map-data.json; entities with null scores excluded with count shown
- **AI Belief panel**: Opacity-based legend showing belief dimension values (stance, timeline, risk). Replaces the former cluster-by-dimension dropdown. Category coloring is default; belief dimensions shown via opacity encoding.
- **Category normalization**: Merges variants ("AI Safety/Alignment" → "AI Safety")
- **Multi-category support**: Entities can have a primary category + `other_categories`. Filtering by any category shows entities where it's primary OR secondary. Detail panel shows primary as solid badge, secondary as dashed badges.
- **Resources**: Rounded squares with SVG type icons, clustered near related entities in All view
- **Edges**: From edge table (affiliations + relationships); clicking any node (directly, from search, or from detail panel links) highlights connected edges and dims unconnected nodes/edges with smooth opacity transition
- **Node selection dimming**: In "all" view, clicking a node grays out all unconnected nodes and edges. Background click clears selection. Uses `.dimmed`/`.highlighted` CSS classes with 0.3s transitions.
- **Submission count**: Subtle gold dashed ring for ≥5 submissions
- **Source type filter**: Self/connector/external
- **Cluster labels**: Positioned on outer edge, radiating away from center
- **Search**: Semantic expansion (SEMANTIC_MAP), 40+ term groups; autocomplete filtered to current view; click-to-zoom on match
- **Filters**: Dimension-aware chips (rebuild per view + dimension), stance legend; select/deselect all toggle
- **Images**: Google Favicons (orgs), Wikipedia photos (people), async preload
- **Collapsible controls sidebar**: Chevron button collapses sidebar with slide animation; "> Controls" button re-expands. Auto-collapses when contribute panel opens, auto-re-expands on close.
- **Collapsible contribute sidebar**: iframe with "Open full page" option, map resizes
- **View persistence**: localStorage saves view mode (network/plot) and sub-view
- **Dark/light theme**: CSS variables, localStorage persistence
- **Zoom**: 0.1x–20x range, controls bottom-right; click node to zoom (k=3)
- **Entity count**: Inside controls sidebar (below "About this map"), not floating overlay

## Person Categories (roles)
Executive, Researcher, Policymaker, Investor, Organizer, Journalist, Academic, Cultural figure

## Organization Categories (sectors)
Frontier Lab, AI Safety/Alignment, Think Tank/Policy Org, Government/Agency, Academic, VC/Capital/Philanthropy, Labor/Civil Society, Ethics/Bias/Rights, Media/Journalism, Political Campaign/PAC, AI Infrastructure & Compute, AI Deployers & Platforms

## Version Control & Deployment Practices

See `docs/DEPLOYMENT.md` for the full deployment and review process.

- Conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `docs:`
- `map-data.json` and `map-detail.json` are NOT tracked in git (generated during deploy from DB)
- `backup-*.json` and `backup-*.sql` are gitignored
- Test/seed data scripts gitignored
- **Push to `main` auto-deploys frontend** — test in a browser first, not just with scripts
- **All changes to `main` must go through a PR** — no direct pushes except P0 hotfixes
- **Backend (Lambda/API Gateway) requires separate `sam deploy`** — merging api/*.js or template.yaml to main does NOT deploy them
- **Never add `defer` or `async` to the D3 script tag** — inline map code depends on it synchronously (see `docs/post-mortems/2026-04-09-d3-defer-map-outage.md`)
- **Browser-test map.html before pushing any HTML/JS changes** — automated checks cannot catch rendering failures
- **MANDATORY: Verify site loads immediately after any push to main** — check /, /contribute, /map, /insights, /admin all return 200. The deploy workflow includes an automated smoke test, but always verify manually too. A broken prod site with no one checking is the worst outcome.
- **For preview branches**: after pushing, wait for Cloudflare Pages build, then test the pages you changed on the preview URL before reporting the work as done

## DB Safety

- **Deletion protection** enabled on RDS instance
- **Automated backups**: 1-day retention (free tier max), point-in-time recovery available
- **Manual backups**: `npm run db:backup` dumps all tables to `s3://mapping-ai-website-561047280976/backups/` as timestamped JSON + SQL files. Run before any risky admin work.
- **Planned**: Audit log table to track all DB mutations (approve/reject/merge/edit/delete) with revert capability

## Known Technical Debt

- **map.html inline**: The D3.js map page is fully inline HTML/CSS/JS (not React). All other pages are React/TypeScript/Tailwind.
- **Legacy TipTap bundle**: `src/tiptap-notes.js` is an esbuild bundle used only by map.html. React pages use `src/components/TipTapEditor.tsx` instead.
- **Category mapping fragile**: Normalization function handles known variants but may miss new ones
- **Admin key hardcoded**: Default key in template.yaml, should rotate before adding collaborators
