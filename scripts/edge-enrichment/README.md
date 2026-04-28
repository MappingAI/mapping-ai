# Edge & Entity Enrichment Pipeline

Scripts for discovering funding relationships, enriching edges with temporal data, and tracking org lifecycle data.

See the [Design Document](/research-data/EDGE-ENRICHMENT-DESIGN.md) for the full architecture.

## Prerequisites

```bash
# Required environment variables in .env
DATABASE_URL="postgresql://..."      # RDS (entities + edges) - read/write
PILOT_DB="postgresql://..."          # Neon claims-pilot branch - read/write
EXA_API_KEY="..."                    # Exa search API
ANTHROPIC_API_KEY="..."              # Claude API
```

**Budget recommendation:** $10-15 for full pilot testing across all scripts.

## Quick Start

```bash
# 1. Create the new tables in Neon
psql "$PILOT_DB" -f scripts/edge-enrichment/schema.sql

# 2. Pilot test: discover funding (3 entities)
node scripts/edge-enrichment/discover-funding.js --limit=3

# 3. Review discoveries
node scripts/edge-enrichment/review-discoveries.js

# 4. Promote approved discoveries to RDS
node scripts/edge-enrichment/promote-discoveries.js
```

## Scripts

| Script | Purpose | Cost (full run) |
|--------|---------|-----------------|
| `discover-funding.js` | Discover funding relationships (people + orgs) | ~$58 |
| `enrich-edges.js` | Add temporal data to existing edges | ~$62 |
| `enrich-org-lifecycle.js` | Add founding/end dates to orgs | ~$25 |
| `review-discoveries.js` | CLI for reviewing pending discoveries | Free |
| `promote-discoveries.js` | Promote approved → RDS + edge_evidence | Free |

### `discover-funding.js`

Discovers funding relationships for all entities (people AND orgs).

```bash
# Pilot (3 entities, ~$1)
node scripts/edge-enrichment/discover-funding.js --limit=3

# Pilot with dry-run (search + extract, don't write)
node scripts/edge-enrichment/discover-funding.js --limit=3 --dry-run

# Full run (~1,600 entities, ~$58)
node scripts/edge-enrichment/discover-funding.js --all

# Resume after interruption
node scripts/edge-enrichment/discover-funding.js --all --resume

# Only orgs or only people
node scripts/edge-enrichment/discover-funding.js --type=organization --limit=10
node scripts/edge-enrichment/discover-funding.js --type=person --limit=10
```

**Output:**
- Existing edges → `edge_evidence` (enrichment)
- New edges → `edge_discovery` (pending review)
- Unknown entities → `entity_suggestion` (pending review)

### `enrich-edges.js`

Enriches existing edges with temporal data (start_date, end_date, amount).

```bash
# Pilot (5 edges, ~$0.15)
node scripts/edge-enrichment/enrich-edges.js --limit=5

# All edges (~2,200, ~$62)
node scripts/edge-enrichment/enrich-edges.js --all

# Only specific edge type
node scripts/edge-enrichment/enrich-edges.js --type=employer --limit=10
node scripts/edge-enrichment/enrich-edges.js --type=funder --limit=10
```

**Output:** `edge_evidence` records with temporal data + source citations.

### `enrich-org-lifecycle.js`

Finds founding dates and end dates for organizations.

```bash
# Pilot (5 orgs, ~$0.20)
node scripts/edge-enrichment/enrich-org-lifecycle.js --limit=5

# All orgs (~700, ~$25)
node scripts/edge-enrichment/enrich-org-lifecycle.js --all
```

**Output:** `claim` records with `belief_dimension = 'founded_year'` or `'end_year'`.

### `review-discoveries.js`

Interactive CLI for reviewing pending discoveries.

```bash
# Review edge discoveries
node scripts/edge-enrichment/review-discoveries.js --edges

# Review entity suggestions
node scripts/edge-enrichment/review-discoveries.js --entities

# Review all pending
node scripts/edge-enrichment/review-discoveries.js
```

### `promote-discoveries.js`

Promotes approved discoveries to RDS.

```bash
# Promote all approved
node scripts/edge-enrichment/promote-discoveries.js

# Dry-run (show what would be promoted)
node scripts/edge-enrichment/promote-discoveries.js --dry-run
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RDS (AWS Postgres)                                 │
│                         PRIMARY SOURCE OF TRUTH                              │
│                                                                              │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│   │    entity    │     │  submission  │     │     edge     │                │
│   │   (~1,600)   │     │              │     │  (~2,200+)   │                │
│   └──────────────┘     └──────────────┘     └──────────────┘                │
│         ▲                                           ▲                        │
│         │                                           │                        │
└─────────┼───────────────────────────────────────────┼────────────────────────┘
          │ entity_id                                 │ edge_id
          │                                           │
┌─────────┼───────────────────────────────────────────┼────────────────────────┐
│         ▼                                           ▼                        │
│                        Neon (claims-pilot branch)                            │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                         source (SHARED)                               │  │
│   │  source_id | url | title | source_type | date_published              │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│         ▲              ▲              ▲              ▲                       │
│         │              │              │              │                       │
│   ┌─────┴────┐   ┌─────┴──────┐  ┌────┴───────┐  ┌──┴──────────────┐       │
│   │  claim   │   │  edge_     │  │  edge_     │  │  entity_        │       │
│   │ (REUSE)  │   │  evidence  │  │  discovery │  │  suggestion     │       │
│   │          │   │  (NEW)     │  │  (NEW)     │  │  (NEW)          │       │
│   │ Beliefs  │   │            │  │            │  │                 │       │
│   │ + org    │   │ Temporal   │  │ Candidate  │  │ Discovered      │       │
│   │ lifecycle│   │ data for   │  │ edges      │  │ entities        │       │
│   │          │   │ existing   │  │ pending    │  │ pending         │       │
│   │          │   │ edges      │  │ review     │  │ review          │       │
│   └──────────┘   └────────────┘  └────────────┘  └─────────────────┘       │
│                                                                              │
│   ALL TABLES REQUIRE source_id (NOT NULL) — no source = no record           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### New Tables (run `schema.sql` to create)

**`edge_evidence`** — Source attribution for existing edges

```sql
CREATE TABLE edge_evidence (
  evidence_id      TEXT PRIMARY KEY,        -- {edge_id}_{source_id}
  edge_id          INTEGER NOT NULL,        -- FK to RDS edge
  source_id        TEXT NOT NULL REFERENCES source(source_id),
  start_date       DATE,
  end_date         DATE,
  amount_usd       NUMERIC(15,2),
  amount_note      TEXT,
  role_title       TEXT,
  citation         TEXT NOT NULL,
  confidence       TEXT,
  extracted_by     TEXT,
  extraction_model TEXT,
  extraction_date  DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

**`edge_discovery`** — Candidate edges pending review

```sql
CREATE TABLE edge_discovery (
  discovery_id       TEXT PRIMARY KEY,
  source_entity_id     INTEGER,            -- FK to RDS entity (if resolved)
  target_entity_id     INTEGER,            -- FK to RDS entity (if resolved)
  source_suggestion_id TEXT,               -- FK to entity_suggestion (if pending)
  target_suggestion_id TEXT,               -- FK to entity_suggestion (if pending)
  edge_type            TEXT NOT NULL,
  source_entity_name TEXT NOT NULL,
  target_entity_name TEXT NOT NULL,
  source_id          TEXT NOT NULL REFERENCES source(source_id),
  start_date         DATE,
  end_date           DATE,
  amount_usd         NUMERIC(15,2),
  amount_note        TEXT,
  citation           TEXT NOT NULL,
  confidence         TEXT,
  status             TEXT DEFAULT 'pending_entities',
  -- pending_entities | pending_review | approved | rejected | promoted
  reviewed_by        TEXT,
  reviewed_at        TIMESTAMPTZ,
  review_notes       TEXT,
  promoted_edge_id   INTEGER,
  promoted_at        TIMESTAMPTZ,
  extracted_by       TEXT,
  extraction_model   TEXT,
  extraction_date    DATE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_entity_name, target_entity_name, edge_type, source_id)
);
```

**`entity_suggestion`** — Discovered entities pending review

```sql
CREATE TABLE entity_suggestion (
  suggestion_id      TEXT PRIMARY KEY,       -- suggestion-{sha256(name)[:12]}
  extracted_name     TEXT NOT NULL UNIQUE,
  entity_type        TEXT,                   -- 'organization' or 'person'
  context            TEXT,
  source_url         TEXT,
  source_id          TEXT REFERENCES source(source_id),
  citation           TEXT,
  times_seen         INTEGER DEFAULT 1,
  seen_as_funder     BOOLEAN DEFAULT FALSE,
  seen_as_recipient  BOOLEAN DEFAULT FALSE,
  potential_duplicates JSONB,                -- [{entity_id, name, similarity}, ...]
  status             TEXT DEFAULT 'pending', -- pending | approved | rejected | duplicate
  duplicate_of_id    INTEGER,
  duplicate_check_done BOOLEAN DEFAULT FALSE,
  reviewed_by        TEXT,
  reviewed_at        TIMESTAMPTZ,
  review_notes       TEXT,
  created_entity_id  INTEGER,
  created_at_rds     TIMESTAMPTZ,
  first_seen_at      TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at       TIMESTAMPTZ DEFAULT NOW()
);
```

## Promotion Workflow

When an `edge_discovery` is approved, it flows to both RDS and `edge_evidence`:

```
edge_discovery (approved)
         │
         ├──► RDS edge table (creates the relationship)
         │
         ├──► edge_evidence (source attribution)
         │
         └──► edge_discovery (updated: status='promoted', promoted_edge_id=...)
```

## Cost Tracking

Each script reports costs at completion:

```
Exa: 15 searches ($0.120) | Claude: 15 calls, 12500 in / 3200 out ($0.086) | Total: $0.206 ($0.014/edge)
```

## Progress Tracking

Scripts save progress to `data/edge-enrichment/`:

```
data/edge-enrichment/
├── discover-funding-progress.json
├── enrich-edges-progress.json
└── enrich-org-lifecycle-progress.json
```

Use `--resume` to skip already-processed items after a crash.

## Shared Libraries

- `lib/db.js` — Database connections (RDS + Neon)
- `lib/entity-resolution.js` — Entity name → ID resolution
- `lib/progress.js` — Progress load/save, edge key generation
- `lib/costs.js` — Exa + Claude cost tracking
- `lib/source.js` — Source deduplication and registration

## Entity Resolution Pipeline

```
Input: "Open Philanthropy" (extracted by Claude)

Step 1: EXACT MATCH (case-insensitive)
Step 2: NORMALIZED MATCH (strip "Inc", "LLC", etc.)
Step 3: ALIAS LOOKUP (known abbreviations)
Step 4: FUZZY MATCH (pg_trgm, threshold 0.85)
Step 5: NO MATCH → create entity_suggestion
```

## Known Risks & Mitigations

See the [Design Document](/research-data/EDGE-ENRICHMENT-DESIGN.md#known-risks--mitigations) for full details.

Key mitigations:
- **No source = no record** — Schema enforces `source_id NOT NULL`
- **Duplicate prevention** — 4-layer pipeline (fuzzy match, merge suggestions, review UI, final check)
- **Human review** — All discoveries must be approved before becoming real edges
- **Idempotent operations** — Safe to re-run scripts, `ON CONFLICT DO NOTHING`
