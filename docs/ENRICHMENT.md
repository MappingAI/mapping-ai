# Enrichment Pipeline Guide

How to seed entities, enrich them with sourced claims, and export data for the frontend.

## Prerequisites

```bash
pnpm install
cp .env.example .env   # then fill in credentials (see below)
```

**Required API keys** (get your own for each):

| Var                 | Service                                           | Sign up                       |
| ------------------- | ------------------------------------------------- | ----------------------------- |
| `ANTHROPIC_API_KEY` | Claude (claim extraction)                         | https://console.anthropic.com |
| `EXA_API_KEY`       | Exa (web search + content fetch)                  | https://exa.ai                |
| `VOYAGE_API_KEY`    | Voyage AI (embeddings, AGI definition space only) | https://voyageai.com          |

**Database URLs** (ask project owner):

| Var             | Points to                                          | Used by                                              |
| --------------- | -------------------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`  | AWS RDS (primary entities, edges, submissions)     | enrich-claims, enrich-crosspartisan, export-map-data |
| `PILOT_DB`      | Neon `claims-pilot` branch (claim + source tables) | All enrichment scripts that write claims             |
| `NEON_PROD_URL` | Neon production branch                             | Not used by enrichment scripts yet                   |

**R2 upload credentials** (for pushing exports to CDN):

| Var                     | Value                              |
| ----------------------- | ---------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | `ac57c6d87068ab259c6f54dba468de8d` |
| `R2_BUCKET_NAME`        | `mapping-ai-data`                  |
| `R2_ACCESS_KEY_ID`      | Ask project owner                  |
| `R2_SECRET_ACCESS_KEY`  | Ask project owner                  |

To get the `PILOT_DB` connection string yourself (requires neonctl auth):

```bash
neonctl connection-string --project-id calm-tree-46517731 --branch claims-pilot
```

## Database Schema

Enrichment scripts read entities from RDS (`DATABASE_URL`) and write claims + sources to Neon (`PILOT_DB`).

### `source` table (Neon)

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

### `claim` table (Neon)

One row per entity-dimension-source combination.

| Column             | Type             | Notes                                                                                                |
| ------------------ | ---------------- | ---------------------------------------------------------------------------------------------------- |
| `claim_id`         | text PK          | `{entity_id}_{dimension}_{source_id}`                                                                |
| `entity_id`        | integer NOT NULL | FK to entity in RDS                                                                                  |
| `entity_name`      | text NOT NULL    | Denormalized for query convenience                                                                   |
| `entity_type`      | text NOT NULL    | person, organization, resource                                                                       |
| `belief_dimension` | text NOT NULL    | See dimensions below                                                                                 |
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

### Belief dimensions

**General belief dimensions** (used by `enrich-claims.js`):

| Dimension           | Scale                                                                                                | Score range |
| ------------------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| `regulatory_stance` | Accelerate (1) / Light-touch (2) / Targeted (3) / Moderate (4) / Restrictive (5) / Precautionary (6) | 1-6         |
| `agi_timeline`      | Already here / 2-3 years / 5-10 years / 10-25 years / 25+ years / Never                              | 1-6         |
| `ai_risk_level`     | Overstated / Manageable / Serious / Catastrophic / Existential                                       | 1-5         |
| `agi_definition`    | Free text (no score)                                                                                 | null        |

**Policy-area dimensions** (used by `enrich-crosspartisan.js`):

| Dimension                | Topic                                         |
| ------------------------ | --------------------------------------------- |
| `state_preemption`       | State preemption vs federal AI regulation     |
| `open_source_weights`    | Open source / open weights model restrictions |
| `compute_governance`     | Compute governance and FLOPs thresholds       |
| `export_controls_chips`  | Export controls on AI chips                   |
| `pre_deployment_testing` | Pre-deployment testing requirements           |
| `liability`              | AI liability frameworks                       |

### Resource-specific columns on `entity` table (Neon)

`enrich-resources.js` writes these columns on the Neon copy of entity records:

| Column               | Type   | Notes                                                       |
| -------------------- | ------ | ----------------------------------------------------------- |
| `topic_tags`         | text[] | Array of validated topic tags (AI Safety, Regulation, etc.) |
| `format_tags`        | text[] | Array of format tags (Report, Blog, Podcast, etc.)          |
| `advocated_stance`   | text   | Regulatory stance the resource advocates                    |
| `advocated_timeline` | text   | AGI timeline the resource advocates                         |
| `advocated_risk`     | text   | AI risk level the resource advocates                        |

## Scripts

### Primary enrichment scripts (Exa + Claude)

These are the main scripts for populating the claims/source tables. All support `--resume` for safe restarts.

#### `enrich-claims.js` — General belief claims for people and orgs

Searches Exa for each entity across 4 belief dimensions, extracts sourced claims via Claude.

```bash
# Pilot run (5 entities, ~$0.50)
PILOT_DB="postgresql://..." node scripts/enrich-claims.js --limit=5

# Dry run (search + extract, don't write to DB)
PILOT_DB="postgresql://..." node scripts/enrich-claims.js --dry-run --limit=5

# Resume after interruption
PILOT_DB="postgresql://..." node scripts/enrich-claims.js --limit=50 --resume

# Single entity
PILOT_DB="postgresql://..." node scripts/enrich-claims.js --id=8

# Only people or only orgs
PILOT_DB="postgresql://..." node scripts/enrich-claims.js --limit=20 --type=person
PILOT_DB="postgresql://..." node scripts/enrich-claims.js --limit=20 --type=organization

# Entities missing any stance dimension (fills gaps)
PILOT_DB="postgresql://..." node scripts/enrich-claims.js --missing-stance --limit=20

# All entities with 'Explicitly stated' evidence (~741 entities, ~$61)
PILOT_DB="postgresql://..." node scripts/enrich-claims.js --all
```

**What it does:**

1. Queries RDS for approved entities with `belief_evidence_source = 'Explicitly stated'`
2. For each entity, runs 4 Exa searches (one per belief dimension) with dimension-specific queries
3. Sends all search results to Claude with the extraction prompt
4. Claude returns a JSON array of claims, each with a verbatim citation and source URL
5. Writes sources to `source` table, claims to `claim` table (upsert on conflict)
6. Falls back to unsourced claims from the entity's existing DB belief fields for uncovered dimensions
7. Saves progress to `data/claims-enrichment-progress.json`

**Cost:** ~$0.08/entity (4 Exa searches at $0.008 each + 1 Claude call). Running `--all` on ~741 entities costs ~$61.

#### `enrich-resources.js` — Resource metadata + claims

Fetches resource content via Exa, extracts topic tags, format tags, key argument, and any belief claims.

```bash
# Pilot run
PILOT_DB="postgresql://..." node scripts/enrich-resources.js --limit=5

# Metadata only (skip claim extraction)
PILOT_DB="postgresql://..." node scripts/enrich-resources.js --limit=20 --no-claims

# Resume
PILOT_DB="postgresql://..." node scripts/enrich-resources.js --limit=50 --resume

# Single resource
PILOT_DB="postgresql://..." node scripts/enrich-resources.js --id=553

# All resources
PILOT_DB="postgresql://..." node scripts/enrich-resources.js --all
```

**What it does:**

1. Queries Neon (`PILOT_DB`) for approved resource entities with a `resource_url`
2. Fetches content via `exa.getContents()` (falls back to `exa.searchAndContents()`)
3. Claude extracts: key_argument, topic_tags, format_tags, advocated beliefs, and claims
4. Writes entity metadata updates and claims to Neon
5. Saves progress to `data/resource-enrichment-progress.json`

**Valid topic tags:** AI Safety, AI Governance, AI Ethics, AI Capabilities, AI Risk, Alignment, Interpretability, Regulation, Legislation, Export Controls, Compute Governance, Open Source AI, National Security, Labor & Economy, Existential Risk, Biosecurity, Cybersecurity, Geopolitics, China, EU Policy, US Policy, Responsible Scaling, Evaluation & Testing, Frontier Models, Foundation Models, RLHF, Constitutional AI, Agent Safety, Deepfakes, Misinformation, Bias & Fairness, Privacy, Copyright & IP, Liability, Transparency, Forecasting, Philosophy of Mind, Consciousness, AGI, Superintelligence.

**Valid format tags:** Newsletter, Blog, Podcast, YouTube Channel, Video Series, Research Paper, Policy Brief, White Paper, Legislative Text, Testimony, Report, Book, Essay, Op-Ed, Interview, Database, Tool, Directory, Community, Course, Educational, News Coverage, Explainer, Scenario, Open Letter, Framework.

#### `enrich-crosspartisan.js` — Policy-area claims for policymakers

Per-issue enrichment across 6 policy areas for the crosspartisan convergence viz.

```bash
# Pilot run
PILOT_DB="postgresql://..." node scripts/enrich-crosspartisan.js --limit=5

# Resume
PILOT_DB="postgresql://..." node scripts/enrich-crosspartisan.js --limit=50 --resume

# Single policymaker
PILOT_DB="postgresql://..." node scripts/enrich-crosspartisan.js --id=82

# All policymakers (~120 entities, ~$12)
PILOT_DB="postgresql://..." node scripts/enrich-crosspartisan.js --all
```

**What it does:**

1. Queries RDS for approved policymakers (category = 'Policymaker')
2. For each policymaker, runs 6 Exa searches (one per policy area)
3. Claude extracts sourced claims with verbatim quotes per policy area
4. Writes to the same `claim` + `source` tables as enrich-claims.js (dimensions don't overlap)
5. Saves progress to `data/crosspartisan-enrichment-progress.json`

### Legacy enrichment scripts

These predate the claims/source table schema. They write directly to the entity's `belief_*` and `notes` fields on RDS, without source citations.

| Script                | Target          | Notes                                                                                                                                           |
| --------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `enrich-deep.js`      | People          | Role-specific prompts (policymaker, executive, researcher, etc.). Writes regulatory_stance, agi_timeline, ai_risk_level, influence_type, notes. |
| `enrich-deep-orgs.js` | Orgs            | Category-specific prompts. Same fields plus website, funding_model.                                                                             |
| `enrich-people.js`    | People          | Entity/submission/edge schema version. Writes belief\_\* weighted aggregates.                                                                   |
| `enrich-orgs.js`      | Orgs            | Same as above for orgs.                                                                                                                         |
| `enrich-v2.js`        | All             | Source-grounded with confidence scoring. Creates edges for confidence >= 3.                                                                     |
| `enrich-elections.js` | Candidates/PACs | Election-focused. Generates candidate positions and PAC-candidate edges.                                                                        |
| `enrich-with-exa.js`  | All             | Earlier Exa integration, less structured output.                                                                                                |

**For new enrichment work, use `enrich-claims.js` and `enrich-resources.js`.** They write to the proper claims/source schema with full provenance.

### Seeding scripts

Create entity records for categories of people/orgs. All support `--execute` (dry run by default).

```bash
node scripts/seed-academics-expanded.js --execute    # 40+ academics
node scripts/seed-tier1-remaining.js --execute       # Ethics, Government, Cultural figures
node scripts/seed-tier2.js --execute                 # International, more academics, media
node scripts/seed-time100.js --execute               # Time 100 AI list
node scripts/seed-journalists-organizers.js --execute # AI reporters, organizers
node scripts/seed-missing-notable.js --execute       # Gap fills
```

### Export scripts

After enrichment, export data for the frontend:

```bash
# Map data (entities + edges + positions) → map-data.json + map-detail.json
pnpm run db:export-map

# Claims data → R2 bucket (claims-detail.json)
PILOT_DB="postgresql://..." pnpm run db:export-claims:upload

# Claims data → local file only (for inspection)
PILOT_DB="postgresql://..." pnpm run db:export-claims
```

### Discovery

```bash
# Find new people/orgs/resources not in the DB
node scripts/discover-with-exa.js --resources
node scripts/discover-with-exa.js --people
```

## Common workflows

### Add a new batch of entities and enrich them

```bash
# 1. Seed (or add manually via /contribute form)
node scripts/seed-academics-expanded.js --execute

# 2. Approve in admin UI (or directly in DB)

# 3. Run claims enrichment on new entities
PILOT_DB="..." node scripts/enrich-claims.js --missing-stance --limit=50 --resume

# 4. Export to frontend
pnpm run db:export-map
PILOT_DB="..." pnpm run db:export-claims:upload
```

### Enrich resources

```bash
# 1. Extract metadata + claims
PILOT_DB="..." node scripts/enrich-resources.js --limit=20 --resume

# 2. Re-export claims to R2
PILOT_DB="..." pnpm run db:export-claims:upload
```

### Resume after a crash or interruption

All enrichment scripts track progress in `data/*-progress.json`. Use `--resume` to skip already-processed entities:

```bash
PILOT_DB="..." node scripts/enrich-claims.js --limit=100 --resume
```

To reset progress and start over, delete the progress file:

```bash
rm data/claims-enrichment-progress.json
```

### Cost-check before a big run

Use `--dry-run` with a small `--limit` to verify the pipeline works and see per-entity costs before committing to `--all`:

```bash
PILOT_DB="..." node scripts/enrich-claims.js --dry-run --limit=3
# Check the COST line at the end, multiply by total entity count
```

## Claude prompt design

All enrichment scripts share these prompt principles:

1. **Verbatim citations required.** Every claim must include a direct quote or close paraphrase from the source. No synthesized or hallucinated claims.
2. **Source URLs must come from search results.** Claude never fabricates URLs.
3. **Confidence scoring.** Each claim is tagged high/medium/low based on source directness.
4. **Structured JSON output.** Claude returns a JSON array/object that the script parses and validates.
5. **Dimension-specific queries.** Exa searches are tailored per belief dimension (e.g., regulatory stance queries mention "regulation stance policy position").
6. **Entity-type-aware.** Person queries differ from org queries (e.g., "testimony" vs "advocacy").

The full prompt templates are in the script files themselves. Key sections:

- `EXTRACTION_PROMPT` in `enrich-claims.js` (line ~100)
- `EXTRACTION_PROMPT` in `enrich-resources.js` (line ~120)
- Policy area definitions in `enrich-crosspartisan.js`

## Troubleshooting

**"No database URL found"**: Set `DATABASE_URL` in `.env` or pass `PILOT_DB` inline.

**Exa rate limits**: Scripts include 150ms delays between searches. If you hit limits, increase the delay or reduce `--limit`.

**Claude errors**: Check your `ANTHROPIC_API_KEY`. The scripts use `claude-sonnet-4-6` by default.

**Progress file stale**: If entities were deleted or the DB was reset, delete the progress file and re-run with `--resume` off.

**"relation 'claim' does not exist"**: You're pointing at the wrong Neon branch. Use the `claims-pilot` branch connection string for `PILOT_DB`.
