# Repository Architecture

Full file structure for the mapping-ai repo.

```
mapping-ai/
│
├── index.html                  # Home / background page
├── map.html                    # Interactive D3.js stakeholder map (network + plot views)
├── contribute.html             # Rich submission forms (person, org, resource)
├── admin.html                  # Internal admin dashboard, pending queue, entity editing
├── about.html                  # Team and project info
├── theoryofchange.html         # Theory of change page (not linked in nav)
├── dev-server.js               # Express local dev server with API endpoints (port 3000)
├── test-handlers.mjs           # Lambda handler tests
├── favicon.ico                 # Site favicon (also in assets/favicon/)
│
├── CLAUDE.md                   # Claude Code project instructions
├── README.md                   # Project readme
├── ONBOARDING.md               # Developer onboarding guide
├── TASKS.md                    # Task tracking
├── TECH.md                     # Technical documentation
├── DATA-PLAN.md                # Data enrichment planning
│
├── package.json                # Dependencies: pg, @tiptap/*, esbuild, exa-js
├── package-lock.json
├── template.yaml               # AWS SAM IaC (Lambdas, API Gateway, S3, CloudFront)
├── samconfig.toml              # SAM deploy config
├── .env.example                # Environment variable template
├── .gitignore
│
├── agi-timeline.png            # Reference image
├── search-ui-v0.png            # Search UI mockup v0
├── search-ui-v1.png            # Search UI mockup v1
│
├── api/                        # Lambda function handlers
│   ├── admin.js                #   GET/POST /admin — stats, pending, approve/reject/merge/update/delete
│   ├── submit.js               #   POST /submit — form submissions + LLM review
│   ├── submissions.js          #   GET /submissions — approved entities + edges
│   ├── search.js               #   GET /search — full-text search
│   ├── upload.js               #   POST /upload — thumbnail image upload to S3
│   ├── export-map.js           #   Shared module: generates map-data.json (DB → frontend field mapping)
│   ├── semantic-search.js      #   Semantic search utilities
│   └── cors.js                 #   CORS middleware
│
├── src/
│   └── tiptap-notes.js         # TipTap source — rich text editor with @mentions (esbuild input)
│
├── assets/
│   ├── css/
│   │   └── styles.css          # Styles for index.html
│   ├── js/
│   │   ├── script.js           # Form submission handler (index page)
│   │   └── tiptap-notes.js     # Built TipTap bundle (esbuild output — do not edit directly)
│   ├── images/
│   │   ├── mapping-ai-logo.svg # Primary logo
│   │   ├── mapping-ai-logo-*.svg  # Logo variants
│   │   ├── logo_v1.png
│   │   ├── mapping-ai.jpeg
│   │   ├── mapping-ai-cropped.jpeg
│   │   ├── og-image.png        # OpenGraph social preview
│   │   ├── thumbnail.html      # Thumbnail generation template
│   │   └── vectorized 6.svg
│   └── favicon/
│       ├── favicon.ico
│       ├── favicon.svg
│       ├── favicon-96x96.png
│       ├── apple-touch-icon.png
│       ├── web-app-manifest-*.png
│       └── site.webmanifest
│
├── scripts/                    # Database, enrichment, and utility scripts
│   ├── lib/
│   │   └── org-matching.js     #   Shared org-matching utilities
│   │
│   │── migrate.js              # DB migration: create/update tables, triggers, indexes
│   ├── seed.js                 # Import Airtable CSV data
│   ├── export.js               # Export all tables to CSV
│   ├── export-map-data.js      # Generate map-data.json from approved entries
│   ├── backup-db.js            # Backup all tables to S3 as JSON + SQL
│   │
│   │ # Enrichment scripts (Exa API + Claude Haiku)
│   ├── enrich-people.js        # General-purpose people enrichment
│   ├── enrich-orgs.js          # Organization enrichment
│   ├── enrich-elections.js     # Political candidates + PACs enrichment (4-step)
│   ├── enrich-deep.js          # Deep enrichment for people
│   ├── enrich-deep-orgs.js     # Deep enrichment for orgs
│   ├── enrich-v2.js            # V2 enrichment pipeline
│   ├── enrich-with-exa.js      # Exa-based enrichment
│   ├── discover-with-exa.js    # Entity discovery via Exa
│   │
│   │ # Seeding scripts (batch entity creation)
│   ├── seed-time100.js         # Seed TIME100 AI list entities
│   ├── seed-academics-expanded.js
│   ├── seed-academics-investors.js
│   ├── seed-journalists-organizers.js
│   ├── seed-missing-notable.js
│   ├── seed-tier1-remaining.js
│   ├── seed-tier2.js
│   ├── import-aisafety-csv.js  # Import AI safety CSV data
│   │
│   │ # Org cleanup and edge management
│   ├── cleanup-orgs.js         # Org deduplication and cleanup
│   ├── dedupe-orgs.js          # Org deduplication
│   ├── create-missing-orgs.js  # Create org entities from references
│   ├── create-frequent-orgs.js # Create frequently-referenced orgs
│   ├── create-primary-org-edges.js  # Generate affiliation edges from primary_org
│   ├── extract-other-orgs-edges.js  # Generate edges from other_orgs field
│   ├── setup-hierarchy.js      # Set up parent org relationships
│   ├── add-party-affiliations.js    # Political party affiliation edges
│   │
│   │ # Analysis and review
│   ├── analyze-for-cleanup.js  # Identify entities needing cleanup
│   ├── analyze-edge-distribution.js # Edge distribution analysis
│   ├── analyze-no-edges.js     # Find entities with no edges
│   ├── analyze-other-orgs.js   # Analyze other_orgs field usage
│   ├── check-no-edges.js       # Quick check for edgeless entities
│   ├── check-party-edges.js    # Verify party affiliation edges
│   ├── deep-quality-review.js  # In-depth quality review of entity data
│   ├── quality-pass.js         # Quality pass over entities
│   ├── review-map-data.js      # Review generated map data
│   ├── diagnose-map-issues.js  # Diagnose map rendering issues
│   ├── fill-gaps.js            # Fill missing data fields
│   ├── compute-positions.js    # Pre-compute entity positions
│   │
│   │ # Export and utility
│   ├── export-edge-review.js   # Export edges for manual review
│   ├── export-excel.js         # Export to Excel
│   ├── export-sample-for-review.js  # Export sample for review
│   ├── export-thumbnail.js     # Export thumbnails
│   ├── quick-export.js         # Quick data export
│   ├── cache-thumbnails.js     # Cache thumbnail images
│   ├── generate-contributor-key.js  # Generate contributor API keys
│   ├── revoke-contributor-key.js    # Revoke contributor API keys
│   │
│   │ # Staging and migration
│   ├── setup-staging.js        # Set up staging database
│   ├── verify-staging.js       # Verify staging data
│   ├── deep-verify-staging.js  # Deep staging verification
│   ├── migrate-to-rds-new-schema.js # One-time migration to new schema
│   ├── phase4-manual-affiliations.js # Phase 4 manual affiliation setup
│   │
│   │ # Load testing
│   ├── load-test.sh            # Shell-based load test
│   └── load-test.yml           # Artillery load test config
│
├── data/                       # Source data, backups, and review files
│   ├── People-Grid view.csv    # Airtable export — people
│   ├── Organizations-Grid view.csv  # Airtable export — orgs
│   ├── Policy Efforts-Grid view.csv # Airtable export — policy efforts
│   ├── Readings-Grid view.csv  # Airtable export — readings
│   ├── migration-backup.json   # Pre-migration backup
│   ├── db-backup-staging-test.json  # Staging test backup
│   ├── enrichment-checkpoint-final.xlsx    # People enrichment checkpoint
│   ├── enrichment-orgs-checkpoint-final.xlsx # Org enrichment checkpoint
│   ├── enrichment-people-progress.json     # People enrichment progress tracker
│   ├── enrichment-orgs-progress.json       # Org enrichment progress tracker
│   ├── enrichment-progress.json            # General enrichment progress
│   ├── all-orgs-for-nesting.txt            # Org hierarchy reference
│   ├── org-nesting-analysis.md             # Org hierarchy analysis
│   ├── export-for-review.md                # Exported data for review
│   ├── sample-for-claude-review.md         # Sample data for LLM review
│   ├── sample-review.md                    # Review results
│   ├── people-edge-review.md               # People edge review
│   ├── phase3-edge-review.md               # Phase 3 edge review
│   └── phase4-affiliation-review.md        # Phase 4 affiliation review
│
├── docs/                       # Project documentation and planning
│   ├── CONTRIBUTOR.md          # Contributor guide
│   ├── api-cost-tracking.md    # API cost tracking notes
│   ├── enrichment-v2-design.md # Enrichment v2 design doc
│   ├── brainstorms/            # Feature brainstorm docs (dated)
│   │   ├── 2026-04-03-inline-org-creation-requirements.md
│   │   ├── 2026-04-07-graph-context-search-requirements.md
│   │   ├── 2026-04-07-mobile-directory-requirements.md
│   │   └── 2026-04-08-mobile-ux-polish-requirements.md
│   ├── ideation/               # Feature ideation docs (dated)
│   │   ├── 2026-03-31-launch-critical-ideation.md
│   │   ├── 2026-04-07-mobile-experience-ideation.md
│   │   ├── 2026-04-07-search-robustness-ideation.md
│   │   ├── 2026-04-07-search-ux-comprehensive-ideation.md
│   │   └── 2026-04-08-performance-optimization-ideation.md
│   ├── plans/                  # Implementation plans (dated)
│   │   ├── 2026-04-01-001-feat-security-performance-hardening-plan.md
│   │   ├── 2026-04-07-001-feat-graph-context-search-plan.md
│   │   ├── 2026-04-07-001-feat-mobile-entity-directory-plan.md
│   │   ├── 2026-04-08-001-feat-prelaunch-password-gate-plan.md
│   │   └── 2026-04-08-002-fix-contribute-form-ux-bugs-plan.md
│   └── solutions/              # Solution write-ups
│       ├── best-practices/
│       │   └── mobile-entity-directory-replacing-d3-map-2026-04-08.md
│       └── ui-bugs/
│           └── inline-org-panel-rich-field-parity.md
│
├── enrichment/                 # Data enrichment workstream
│   ├── ONBOARDING.md           # Enrichment-specific onboarding
│   ├── docs/
│   │   ├── notes.md            # Working notes
│   │   ├── architecture.md     # This file
│   │   └── latex/              # LaTeX documents (placeholder)
│   └── scripts/                # Enrichment scripts (placeholder)
│
├── archive/                    # Archived / superseded files
│   ├── AI Policy Landscape Mapping.md  # Original project description
│   └── index-old.html          # Previous index page
│
├── .claude/                    # Claude Code configuration
│   └── settings.local.json     # Local Claude Code settings
│
└── .github/
    └── workflows/
        └── deploy.yml          # CI/CD: build → export → S3 sync → CloudFront invalidate
```

## Directory Purposes

| Directory | Purpose |
|-----------|---------|
| `api/` | Lambda function handlers deployed via AWS SAM. Each file is one API endpoint except `export-map.js` (shared module) and `cors.js` (middleware). |
| `src/` | Source files that get built/bundled. Currently just TipTap editor source. |
| `assets/` | Static frontend assets served via S3/CloudFront. `js/tiptap-notes.js` is a build artifact. |
| `scripts/` | Node.js scripts run locally or in CI. Covers DB migration, seeding, enrichment, analysis, export, and load testing. |
| `data/` | Source CSVs (Airtable exports), enrichment progress trackers, backups, and review files. |
| `docs/` | Project documentation: contributor guide, feature brainstorms, ideation, implementation plans, and solution write-ups. Dated filename convention: `YYYY-MM-DD-description.md`. |
| `enrichment/` | Data enrichment workstream — onboarding, documentation, and scripts. |
| `archive/` | Superseded files kept for reference. |

## Key Generated Files (not in git)

- `map-data.json` — Static map data generated from DB during deploy (`scripts/export-map-data.js`)
- `backup-*.json` / `backup-*.sql` — Database backups
- `node_modules/` — npm dependencies
