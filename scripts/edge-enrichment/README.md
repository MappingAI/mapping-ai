# Edge Enrichment Scripts

Scripts for enriching edge (relationship) data with temporal, financial, and source information.

Follows Anushree's enrichment patterns from `enrich-claims.js` — see `research-data/EDGE-ENRICHMENT-DESIGN.md` for the full design document.

## Prerequisites

Same as main enrichment scripts:

```bash
# Required env vars
DATABASE_URL="postgresql://..."  # RDS (entities + edges)
PILOT_DB="postgresql://..."      # Neon claims-pilot branch
EXA_API_KEY="..."
ANTHROPIC_API_KEY="..."
```

## Scripts

### `enrich-funder-edges.js`

Extracts funding amounts, dates, and sources for funder relationships.

```bash
# Pilot run (5 edges, ~$0.14)
PILOT_DB="..." node scripts/edge-enrichment/enrich-funder-edges.js --limit=5

# All funder edges (~148 edges, ~$4)
PILOT_DB="..." node scripts/edge-enrichment/enrich-funder-edges.js --all

# Resume after interruption
PILOT_DB="..." node scripts/edge-enrichment/enrich-funder-edges.js --all --resume

# Dry run (search + extract, don't write)
PILOT_DB="..." node scripts/edge-enrichment/enrich-funder-edges.js --dry-run --limit=3
```

**Output:** Writes to `edge_evidence` table in Neon with:
- `amount_usd`, `amount_note` (e.g., "$5M Series A")
- `start_date`, `end_date`
- `source_id` → linked to `source` table
- `citation`, `confidence`

### `enrich-employer-edges.js`

Extracts start/end dates for employment relationships.

```bash
# Pilot run
PILOT_DB="..." node scripts/edge-enrichment/enrich-employer-edges.js --limit=5

# All employer edges (~675 edges, ~$19)
PILOT_DB="..." node scripts/edge-enrichment/enrich-employer-edges.js --all
```

**Output:** Writes to `edge_evidence` table with:
- `start_date`, `end_date`
- `source_id`, `citation`, `confidence`

### `enrich-founding-dates.js`

Extracts founding years for organizations.

```bash
# Pilot run
PILOT_DB="..." node scripts/edge-enrichment/enrich-founding-dates.js --limit=5

# All orgs (~700, ~$20)
PILOT_DB="..." node scripts/edge-enrichment/enrich-founding-dates.js --all
```

**Output:**
- Updates `entity.founded_year` in RDS
- Writes provenance to `founding_evidence` table in Neon

**Note:** Requires migration first:
```sql
ALTER TABLE entity ADD COLUMN founded_year SMALLINT;
```

## Architecture

```
RDS (edges source of truth)          Neon (enrichment data)
┌────────────────────────┐           ┌────────────────────────┐
│  edge table            │           │  source table          │
│  - id                  │           │  (reused from claims)  │
│  - source_id           │──────────►│                        │
│  - target_id           │           ├────────────────────────┤
│  - edge_type           │           │  edge_evidence table   │
│  - role                │           │  - edge_id → RDS edge  │
│  - evidence (text)     │           │  - source_id → source  │
└────────────────────────┘           │  - start_date, end_date│
                                     │  - amount_usd          │
                                     │  - citation, confidence│
                                     └────────────────────────┘
```

## Progress Tracking

Each script tracks progress in `data/edge-enrichment/`:

```
data/edge-enrichment/
├── funder-edges-progress.json
├── employer-edges-progress.json
└── founding-dates-progress.json
```

Use `--resume` to skip already-processed edges after a crash.

## Cost Estimates

| Script | Edges | Exa cost | Claude cost | Total |
|--------|-------|----------|-------------|-------|
| funder | 148 | ~$2.40 | ~$1.80 | ~$4 |
| employer | 675 | ~$10.80 | ~$8.10 | ~$19 |
| founding | 700 | ~$11.20 | ~$8.40 | ~$20 |
| **Total** | **1,523** | **~$24** | **~$18** | **~$43** |

Always pilot with `--limit=5 --dry-run` first to verify.

## Shared Libraries

- `lib/progress.js` — Progress load/save, edge key generation
- `lib/costs.js` — Exa + Claude cost tracking
- `lib/source.js` — Source deduplication and registration (reuses Anushree's `source` table)
