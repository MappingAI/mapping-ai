# Mapping AI

A collaborative stakeholder mapping project for the U.S. AI policy landscape.

## Project Overview

Multi-page website with an interactive D3.js stakeholder map, crowdsourced data collection via rich forms, and a relational database linking people, organizations, and resources. Bidirectional links between entities enable network visualization.

**Live site:** https://mapping-ai.org

## Tech Stack

All infrastructure is on AWS. No Vercel or Neon.

- **DNS**: Cloudflare (CNAME flattening → CloudFront distribution)
- **CDN**: AWS CloudFront (caches static files globally, SSL termination)
- **Static hosting**: AWS S3 (`mapping-ai-website-561047280976` bucket, private, accessed only via CloudFront OAC)
- **Frontend**: Static HTML/CSS/JS (no framework)
- **Visualization**: D3.js force-directed graph with orbital cluster layout (`map.html`)
- **Rich text**: TipTap (ProseMirror-based) for Notes fields with @mentions (`src/tiptap-notes.js`, bundled via esbuild)
- **API**: AWS API Gateway HTTP API + 3 Lambda functions (Node.js 20)
- **Database**: AWS RDS PostgreSQL 17 (`mapping-ai-db.c9sccou2k3xe.eu-west-2.rds.amazonaws.com`, db.t4g.micro free tier, 20GB gp3)
- **Infrastructure-as-code**: AWS SAM (`template.yaml`) — defines Lambda functions, API Gateway, S3 bucket, CloudFront distribution
- **CI/CD**: GitHub Actions (auto-deploy on push to `main`)
- **Data enrichment**: Exa API (web search), Anthropic API (Claude Haiku for quality classification)
- **External APIs (client-side)**: Google Favicons (org logos), Wikipedia (people headshots), Photon/OpenStreetMap (city geocoding), Bluesky (handle search)

### Why S3 + CloudFront?

S3 stores the static website files (HTML, CSS, JS, map-data.json). CloudFront is the CDN that serves them globally with HTTPS, caching, and the custom domain (`mapping-ai.org`). Users never hit S3 directly — CloudFront sits in front via Origin Access Control (OAC). This is the standard AWS pattern for static site hosting.

### Why RDS separate from Lambda?

Lambda functions handle API requests (form submissions, search queries). They connect to RDS PostgreSQL over the network (public endpoint with security group). RDS stores the persistent relational data (people, orgs, resources, relationships). Lambda is stateless; RDS is the source of truth.

## Data Flow

There are two data paths:

### Path 1: Static map data (read-only, fast)
```
GitHub push to main
    → GitHub Actions workflow:
        1. npm ci
        2. npm run build:tiptap (esbuild bundles TipTap)
        3. node scripts/export-map-data.js (queries RDS → generates map-data.json)
        4. aws s3 sync (uploads HTML/CSS/JS/map-data.json to S3)
        5. aws cloudfront create-invalidation (purges CDN cache)
    → Users load map.html → fetches map-data.json from CloudFront (no DB call)
    → contribute.html also loads map-data.json for instant client-side search/autocomplete
```

### Path 2: Live API (form submissions, search)
```
User submits form on contribute.html
    → POST to API Gateway (https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com/submit)
    → Lambda function (api/submit.js) → INSERT into RDS PostgreSQL (status='pending')

User searches in form autocomplete (if cache not loaded yet)
    → GET /search?q=... → Lambda (api/search.js) → full-text search on RDS → results

Admin approves submission
    → Manual SQL: UPDATE people SET status='approved' WHERE id=X
    → Next deploy regenerates map-data.json with new approved entries
```

**Key insight:** The map loads from a static JSON file on S3/CloudFront, NOT from the database. This makes the map load instantly for all users worldwide. The tradeoff: new submissions only appear on the map after the next deploy regenerates map-data.json. For manual data refresh without a deploy:
```bash
node scripts/export-map-data.js                           # regenerate from DB
aws s3 cp map-data.json s3://mapping-ai-website-561047280976/  # upload to S3
aws cloudfront create-invalidation --distribution-id E34ZXLC7CZX7XT --paths "/map-data.json"
```

## Project Structure

```
mapping-ai/
├── index.html              # Background / home page
├── theoryofchange.html     # Theory of change
├── contribute.html         # Rich submission forms (person, org, resource)
│                            with TipTap notes, @mentions, duplicate detection,
│                            org search, location search, custom dropdowns
├── map.html                # Interactive D3.js stakeholder map
│                            with orbital clusters, semantic search, resources view,
│                            regulatory stance pips, submission count rings,
│                            collapsible contribute sidebar
├── about.html              # Team and project info
├── assets/
│   ├── css/styles.css      # Styles for index.html
│   ├── images/             # Logo and images
│   └── js/
│       ├── script.js       # Form submission handler (index page)
│       └── tiptap-notes.js # Built TipTap bundle (generated by esbuild)
├── src/
│   └── tiptap-notes.js     # TipTap source — rich text editor with @mentions,
│                            relationship type picker, link popovers
├── api/
│   ├── submit.js           # Lambda: POST /submit — submissions table + entity insert
│   ├── submissions.js      # Lambda: GET /submissions — returns entities + relationships
│   └── search.js           # Lambda: GET /search — full-text search (tsvector + ILIKE)
├── scripts/
│   ├── migrate.js          # Create/update all 6 tables + FTS triggers + indexes
│   ├── seed.js             # Import Airtable CSV data (people + orgs)
│   ├── export.js           # Export all tables to CSV
│   └── export-map-data.js  # Generate map-data.json from approved DB entries
├── data/
│   ├── People-Grid view.csv       # Airtable export — people
│   ├── Organizations-Grid view.csv # Airtable export — orgs
│   ├── Readings-Grid view.csv     # Airtable export — resources
│   └── Policy Efforts-Grid view.csv # Airtable export — policy efforts
├── template.yaml           # AWS SAM (3 Lambdas + API Gateway + S3 + CloudFront)
├── samconfig.toml          # SAM deploy config
├── .github/workflows/
│   └── deploy.yml          # CI/CD: build → export → S3 sync → CloudFront invalidate
└── package.json            # Dependencies: pg, @tiptap/*, esbuild, exa-js
```

## Database Schema (6 tables)

### `people`
Name, category (role: Executive/Researcher/Policymaker/etc.), title, primary_org, other_orgs, location, regulatory_stance, regulatory_stance_detail, evidence_source, agi_timeline, ai_risk_level, threat_models, threat_models_detail, influence_type, twitter, bluesky, notes, submission_count, disagreement_score, consensus_stance/risk/timeline, search_vector (tsvector), status

### `organizations`
Name, category (sector: Frontier Lab/AI Safety/Think Tank/etc.), website, location, funding_model, parent_org_id (FK → organizations), regulatory_stance + detail, evidence_source, agi_timeline, ai_risk_level, threat_models + detail, influence_type, twitter, bluesky, notes, submission_count, last_verified, disagreement_score, consensus_*, search_vector, status

### `resources`
Title, author, resource_type (Essay/Book/Report/Podcast/Video/etc.), url, year, category, key_argument, notes, submission_count, search_vector, status

### `relationships` (polymorphic)
source_type + source_id → target_type + target_id, relationship_type (affiliated/collaborator/funder/critic/authored_by/etc.), evidence, created_by

### `person_organizations` (junction)
person_id → organization_id, role, is_primary

### `submissions` (versioned)
entity_type, entity_id (nullable), data (JSONB), notes_html, notes_mentions (JSONB with relationship types), submitter_email, submitter_relationship, status

**Full-text search:** tsvector columns with GIN indexes on people, orgs, resources. Auto-updated via triggers on INSERT/UPDATE.

## Commands

```bash
# Local development
node dev-server.js              # Express server with API endpoints (port 3000)
npx serve .                     # Static file server (no API)

# Build
npm run build:tiptap            # esbuild: src/tiptap-notes.js → assets/js/tiptap-notes.js

# Database
npm run db:migrate              # Create/update all tables, triggers, indexes
npm run db:seed                 # Import Airtable CSV data
npm run db:export-map           # Generate map-data.json from approved entries

# Deploy backend (Lambda functions)
sam build && sam deploy --parameter-overrides DatabaseUrl=$DATABASE_URL

# Deploy frontend (automatic on push to main)
git push origin main            # Triggers: build → export → S3 sync → CloudFront invalidate

# Manual S3 upload + cache invalidation
aws s3 cp map-data.json s3://mapping-ai-website-561047280976/map-data.json
aws cloudfront create-invalidation --distribution-id E34ZXLC7CZX7XT --paths "/*"
```

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `.env` + Lambda + GitHub Secrets | Neon Postgres connection string |
| `AWS_ACCESS_KEY_ID` | `.env` + GitHub Secrets | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | `.env` + GitHub Secrets | AWS credentials |
| `S3_BUCKET_NAME` | GitHub Secrets | `mapping-ai-website-561047280976` |
| `CLOUDFRONT_DISTRIBUTION_ID` | GitHub Secrets | `E34ZXLC7CZX7XT` |
| `EXA_API_KEY` | `.env` | Exa API key for data enrichment |

## API Endpoints

**Production:** `https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/submit` | POST | Insert form submission (→ submissions table + entity table) |
| `/submissions` | GET | Query approved entities with relationships and person_orgs |
| `/search` | GET | Full-text search (`?q=...&type=person\|organization\|resource`) |

## Form Features (contribute.html)

- **Duplicate detection**: Client-side search on Name/Title fields with existing entry card sidebar
- **Org search**: Primary org, affiliated orgs, parent org — all search existing DB with edit/add links
- **Author search**: Resource form searches existing people for author field
- **TipTap notes**: Rich text (bold/italic/lists/links) with @mentions and relationship type picker (affiliated/collaborator/critic/funder/etc.)
- **Custom dropdowns**: Styled selects with category/stance colors, search, arrow key navigation
- **Location search**: Multi-city tag input via Photon geocoding API, Remote option for orgs
- **Social search**: Bluesky handle search (free public API), Twitter handle search (DB cache)
- **Auto-save**: localStorage draft every 500ms, restored on page load
- **Email validation**: Visual check on blur
- **See Map button**: Fixed pill linking to map page (hidden when in iframe)

## Map Features (map.html)

- **D3.js force simulation** with orbital cluster layout, semantic ordering
- **4 views**: Orgs (sector clusters), People (role clusters), Resources (type clusters), All (org sectors + people mapped to their org's sector)
- **Category normalization**: Merges variants ("AI Safety/Alignment" → "AI Safety")
- **Resources**: Rounded squares with SVG type icons, clustered near related entities in All view
- **Explicit edges**: From relationships + person_organizations tables (not just keyword-inferred)
- **Regulatory stance**: Color pips on nodes + colored badge in detail panel
- **Submission count**: Subtle gold dashed ring for ≥5 submissions
- **Disagreement score**: Badge in detail panel for entities with conflicting submissions
- **Cluster labels**: Positioned on outer edge, radiating away from center
- **Search**: Semantic expansion (SEMANTIC_MAP), 40+ term groups
- **Filters**: Category chips (rebuild per view), stance legend, "select all" reset
- **Images**: Google Favicons (orgs), Wikipedia photos (people), async preload with fallback to initials
- **Collapsible contribute sidebar**: iframe with "Open full page" option, map resizes
- **View persistence**: localStorage saves last view tab
- **Dark/light theme**: CSS variables, localStorage persistence
- **Zoom**: 0.1x–20x range, controls bottom-right

## Person Categories (roles)
Executive, Researcher, Policymaker, Investor, Organizer, Journalist, Academic, Cultural figure

## Organization Categories (sectors)
Frontier Lab, AI Safety/Alignment, Think Tank/Policy Org, Government/Agency, Academic, VC/Capital/Philanthropy, Labor/Civil Society, Ethics/Bias/Rights, Media/Journalism, Political Campaign/PAC

## Version Control Practices

- Conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `docs:`
- Commits authored by human decision-maker — no AI co-authorship
- `map-data.json` is NOT tracked in git (generated during deploy from DB)
- Test/seed data scripts gitignored
- Push to `main` triggers deploy — test locally first

## Known Technical Debt

- **No admin UI**: Submission review requires manual SQL (`UPDATE people SET status='approved' WHERE id=X`)
- **Inline CSS**: Each HTML page has its own `<style>` block (not shared stylesheet)
- **map-data.json staleness**: Map data only refreshes on deploy, not on form submission
- **No real-time updates**: Submissions don't appear on map until next deploy
- **Category mapping fragile**: Normalization function handles known variants but may miss new ones
