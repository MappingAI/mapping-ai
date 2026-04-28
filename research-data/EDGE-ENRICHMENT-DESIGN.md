# Edge Enrichment Pipeline: Design Document

**Author:** Research Team
**Date:** 2026-04-27
**Status:** Draft

---

## Current Architecture

Understanding where data lives is critical before designing edge enrichment.

```
┌─────────────────────────────────────────────────────────────┐
│                     RDS (AWS Postgres)                       │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐                 │
│  │  entity  │  │ submission │  │   edge   │                 │
│  │ (1,574)  │  │            │  │ (2,151)  │                 │
│  └──────────┘  └────────────┘  └──────────┘                 │
│       PRIMARY SOURCE OF TRUTH FOR ENTITIES + EDGES          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ entity_id references
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Neon (claims-pilot branch)                   │
│  ┌──────────┐  ┌──────────┐                                 │
│  │  source  │◄─│  claim   │  ← Anushree's source attribution│
│  │ (2,809)  │  │ (4,784)  │    for BELIEF CLAIMS only       │
│  └──────────┘  └──────────┘                                 │
│       SOURCED BELIEF CLAIMS (stance, timeline, risk, AGI)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ export scripts
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  R2 (Cloudflare CDN)                         │
│  claims-detail.json, agi-definitions.json                   │
│       STATIC FILE STORAGE (not a database)                  │
└─────────────────────────────────────────────────────────────┘
```

### Current Edge Schema (RDS)

```sql
CREATE TABLE edge (
  id          SERIAL PRIMARY KEY,
  source_id   INTEGER REFERENCES entity(id) ON DELETE CASCADE,
  target_id   INTEGER REFERENCES entity(id) ON DELETE CASCADE,
  edge_type   VARCHAR(50),   -- funder, employer, founder, etc.
  role        VARCHAR(200),  -- "CEO", "Board Member", etc.
  is_primary  BOOLEAN,
  evidence    TEXT,          -- FREE TEXT, no structure!
  created_by  VARCHAR(50),
  UNIQUE(source_id, target_id, edge_type)
);
```

**No source attribution for edges today.** The `evidence` field is unstructured text:
- `"Open Phil has funded MIRI historically"`
- `"supporting ($1.40M) — source: elections.transformernews.ai"`
- `null` (most edges)

### Anushree's Source Attribution Model (Neon)

For belief claims, Anushree built a proper source attribution system:

```sql
-- source table (deduplicated by URL hash)
source_id          TEXT PK      -- src-{sha256(url)[:12]}
url                TEXT UNIQUE
title              TEXT
source_type        TEXT         -- interview, report, hearing, etc.
date_published     DATE
author             TEXT

-- claim table (one per entity-dimension-source)
claim_id           TEXT PK      -- {entity_id}_{dimension}_{source_id}
entity_id          INTEGER      -- FK to RDS entity
source_id          TEXT         -- FK to source table
citation           TEXT         -- VERBATIM quote
confidence         TEXT         -- high/medium/low
```

**Key insight:** This model works well. We should copy it for edges.

---

## Problem Statement

The current edge data has structural gaps that block several high-priority research questions:

| Research Question | Blocked By |
|-------------------|------------|
| Funding overlap (safety orgs ↔ accelerationist orgs) | No structured funding amounts or dates |
| Structural conflicts of interest | No source attribution on funder edges |
| Revolving door / sequential positions | No start/end dates on employer edges |
| Cohort effects (2020-2022 EA funding peak) | No founding dates on orgs |
| Temporal shifts in the field | No temporal data anywhere |

### Current Edge Schema

```
source_type, target_type, source_id, target_id, relationship_type, role, evidence
```

**Missing fields:**
- `start_date` / `end_date` — when the relationship began/ended
- `amount_usd` — for funder edges
- `source_url` — citation for the edge data
- `is_current` — computed from dates, but useful for filtering

### Current Data Quality

| Metric | Value |
|--------|-------|
| Total edges | 2,151 |
| Edges with evidence text | 1,472 (68%) |
| Funder edges | 148 |
| Employer edges | 675 |
| Edges with structured dates | 0 |
| Edges with structured amounts | 0 |

**Partial data in unstructured fields:**
- Some `role` fields contain "(former)" hints
- Some `evidence` fields contain amounts like "$1.40M"
- No source URLs anywhere

---

## Proposed Solution

### 1. Schema Design: Two Options

#### Option A: Extend RDS Edge Table (Simpler)

Add columns directly to the existing `edge` table in RDS:

```sql
-- Edge temporal + funding enrichment (RDS)
ALTER TABLE edge ADD COLUMN start_date DATE;
ALTER TABLE edge ADD COLUMN end_date DATE;
ALTER TABLE edge ADD COLUMN is_current BOOLEAN GENERATED ALWAYS AS (end_date IS NULL OR end_date > CURRENT_DATE) STORED;
ALTER TABLE edge ADD COLUMN amount_usd NUMERIC(15,2);
ALTER TABLE edge ADD COLUMN amount_note TEXT;  -- "per year", "total grant", "Series A", etc.
ALTER TABLE edge ADD COLUMN source_url TEXT;
ALTER TABLE edge ADD COLUMN source_title TEXT;
ALTER TABLE edge ADD COLUMN source_date DATE;
ALTER TABLE edge ADD COLUMN enrichment_date DATE;
ALTER TABLE edge ADD COLUMN enrichment_confidence TEXT;  -- high/medium/low

-- Org founding date (RDS)
ALTER TABLE entity ADD COLUMN founded_year SMALLINT;
ALTER TABLE entity ADD COLUMN founded_source_url TEXT;
```

**Pros:**
- Edges stay in one place (RDS)
- Simpler queries, no joins across DBs
- Works with existing export pipeline

**Cons:**
- Multiple sources per edge not supported (one source_url per edge)
- Doesn't reuse Anushree's source table

#### Option B: Create Edge Evidence Table in Neon (Follows Anushree's Pattern)

Create a parallel `edge_evidence` table in Neon that references the existing `source` table:

```sql
-- In Neon (claims-pilot branch)
CREATE TABLE edge_evidence (
  evidence_id      TEXT PRIMARY KEY,  -- {edge_id}_{source_id}
  edge_id          INTEGER NOT NULL,  -- FK to RDS edge.id
  source_id        TEXT NOT NULL REFERENCES source(source_id),

  -- Temporal data
  start_date       DATE,
  end_date         DATE,

  -- Funding data (for funder edges)
  amount_usd       NUMERIC(15,2),
  amount_note      TEXT,

  -- Extraction metadata
  citation         TEXT,              -- Verbatim quote supporting this data
  confidence       TEXT,              -- high/medium/low
  extracted_by     TEXT,              -- exa+claude
  extraction_date  DATE,

  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up evidence by edge
CREATE INDEX idx_edge_evidence_edge_id ON edge_evidence(edge_id);
```

**Pros:**
- Multiple sources per edge supported
- Reuses existing `source` table (deduplicated URLs)
- Consistent with Anushree's claim model
- Better provenance tracking

**Cons:**
- Edge data split across RDS + Neon
- Need to join across DBs for full edge view
- More complex export pipeline

#### Recommendation: Option B (Neon)

Follow Anushree's pattern. Benefits:
1. Reuses the existing `source` table — no duplicate URL storage
2. Multiple pieces of evidence per edge (e.g., two sources confirm funding)
3. Same confidence/citation model as claims
4. Export pipeline already handles RDS → Neon → R2 flow

### 2. New Scripts (Separate from Anushree's)

Place all new scripts in `scripts/edge-enrichment/` to avoid touching existing enrichment scripts.

```
scripts/edge-enrichment/
├── enrich-funder-edges.js      # Amounts, dates, sources for funder edges
├── enrich-employer-edges.js    # Start/end dates for employer edges
├── enrich-founding-dates.js    # Founding dates (writes to entity table)
├── enrich-parent-company.js    # Acquisition dates, amounts
├── lib/
│   ├── db.js                   # DB connections (RDS + Neon)
│   ├── progress.js             # Progress tracking (load/save JSON)
│   ├── costs.js                # Cost tracking (Exa + Claude)
│   ├── source.js               # Source registration (reuse Anushree's source table)
│   └── prompts.js              # Claude extraction prompts
└── README.md
```

### Script Template (Following Anushree's Patterns)

Each script follows this structure:

```javascript
// enrich-funder-edges.js
import 'dotenv/config'
import Exa from 'exa-js'
import Anthropic from '@anthropic-ai/sdk'
import pg from 'pg'
import crypto from 'crypto'
import { loadProgress, saveProgress } from './lib/progress.js'
import { costs } from './lib/costs.js'
import { srcId, registerSource } from './lib/source.js'

// CLI args: --limit, --all, --edge-id, --resume, --dry-run
const args = process.argv.slice(2)
const limit = args.find(a => a.startsWith('--limit='))?.split('=')[1]
const resumeMode = args.includes('--resume')
const dryRun = args.includes('--dry-run')
// ...

// Edge-specific search queries
const FUNDER_QUERIES = [
  (src, tgt) => `"${src}" "${tgt}" funding grant investment amount million dollars`,
  (src, tgt) => `"${src}" donated "${tgt}" grant funding`,
]

// Claude extraction prompt
const EXTRACTION_PROMPT = `You are extracting funding data from search results.

RULES:
1. Every field MUST come from the search results. Never fabricate data.
2. Amounts in USD. Convert if necessary, note original currency.
3. Dates as YYYY-MM-DD. Use first of month/year if partial.
4. If data not found, return null. Empty results are expected and fine.

Return JSON: { amount_usd, amount_note, start_date, end_date, source_url, confidence }`

async function main() {
  const progress = loadProgress('funder-edges')
  const edges = await getTargetEdges(progress)

  for (const edge of edges) {
    // 1. Exa search
    const results = await searchEdge(edge)
    costs.trackExa()
    await delay(150)

    // 2. Claude extraction
    const data = await extractFundingData(edge, results)
    costs.trackClaude(data.usage)

    // 3. Write to Neon (edge_evidence table)
    if (!dryRun && data) {
      await writeEdgeEvidence(edge, data)
    }

    // 4. Save progress
    progress.completed.push(edgeKey(edge))
    saveProgress('funder-edges', progress)
  }

  console.log(costs.summary())
}
```

---

## Anushree's Enrichment Best Practices (Import These)

Based on `enrich-claims.js`, `enrich-resources.js`, and `enrich-crosspartisan.js`:

### Pipeline Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. EXA SEARCH  │ ──► │  2. CLAUDE      │ ──► │  3. DB WRITE    │
│  (gather sources)│     │  (extract data) │     │  (upsert)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
    4 searches/entity     1 call/entity          source + claim
    $0.008 each           ~$0.02 each            tables (Neon)
```

### Key Patterns

#### 1. Exa First, Claude Second

```javascript
// Step 1: Gather sources via Exa (dimension-specific queries)
const results = await exa.searchAndContents(queryFn(entity.name), {
  numResults: 4,
  highlights: { numSentences: 5, highlightsPerUrl: 3 },
  startPublishedDate: '2023-01-01',  // Filter to recent sources
})

// Step 2: Send ALL results to Claude in one call
const claims = await extractClaims(entity, results)
```

**Why:** Exa is cheap ($0.008/search). Claude is expensive (~$0.02/call). Batch sources into one Claude call.

#### 2. Dimension-Specific Search Queries

```javascript
const BELIEF_DIMENSIONS = [
  {
    id: 'regulatory_stance',
    person_query: (name) => `"${name}" AI regulation stance policy position statement interview`,
    org_query: (name) => `"${name}" AI regulation policy position advocacy`,
  },
  // ...
]
```

**Why:** Different query templates for people vs orgs. Quoted name for exact match.

#### 3. Source Deduplication via URL Hash

```javascript
function srcId(url) {
  return 'src-' + crypto.createHash('sha256').update(url).digest('hex').slice(0, 12)
}
```

**Why:** Same URL → same source_id. Prevents duplicates, enables reuse.

#### 4. Progress Tracking for Resume

```javascript
const PROGRESS_PATH = path.join(__dirname, '../data/claims-enrichment-progress.json')

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'))
  } catch {
    return { completed: [] }
  }
}

// After each entity:
progress.completed.push(entity.id)
saveProgress(progress)
```

**Why:** Enrichment is expensive. Crashes happen. `--resume` skips already-done work.

#### 5. Cost Tracking

```javascript
const costs = {
  exa_searches: 0,
  exa_cost: 0,
  claude_calls: 0,
  claude_input_tokens: 0,
  claude_output_tokens: 0,
  trackExa() { this.exa_searches++; this.exa_cost = this.exa_searches * 0.008 },
  trackClaude(usage) { /* ... */ },
  summary() { return `Exa: ${this.exa_searches} ($${this.exa_cost}) | Claude: ... | Total: $X.XX` }
}
```

**Why:** Know costs before running `--all`. Pilot with `--limit=5` first.

#### 6. CLI Flags

```bash
--limit=N      # Process N entities then stop
--all          # Process everything
--id=N         # Single entity for testing
--resume       # Skip already-processed
--dry-run      # Search + extract, don't write to DB
--type=X       # Filter to person/organization
```

**Why:** Flexible batching. Test on small batches. Resume after crashes.

#### 7. Upsert Pattern (Idempotent)

```sql
INSERT INTO claim (...)
VALUES (...)
ON CONFLICT (claim_id) DO UPDATE SET
  citation = EXCLUDED.citation,
  confidence = EXCLUDED.confidence,
  extraction_date = CURRENT_DATE
```

**Why:** Re-running enrichment updates existing data rather than failing.

#### 8. Fallback for Uncovered Dimensions

```javascript
async function writeUnsourcedFallback(client, entity) {
  const UNSOURCED_SRC_ID = 'src-crowdsourced-db'
  // If no sourced claim found, create claim from existing DB data
  // with confidence = 'unverified'
}
```

**Why:** Don't lose existing data. Mark as unverified until sourced.

#### 9. Rate Limiting

```javascript
await delay(150)  // 150ms between Exa calls
```

**Why:** Avoid rate limits. Be a good API citizen.

#### 10. Structured Claude Prompt

```javascript
const EXTRACTION_PROMPT = `You are extracting sourced claims...

RULES:
1. Every claim MUST have a source_url from the search results. Never fabricate URLs.
2. Every claim MUST have a citation — a VERBATIM quote (1-2 sentences) from the source.
3. Only create claims where you find direct evidence. Empty arrays are expected and fine.
...

Return ONLY the JSON array.`
```

**Why:** Strict rules prevent hallucination. "Empty arrays are fine" prevents forced output.

---

### 3. Enrichment Strategy by Edge Type

#### Funder Edges (148 total)

**Goal:** Extract amount, date range, source URL

**Exa search pattern:**
```
"${source_name}" "${target_name}" funding grant investment donated amount million
```

**Claude extraction:**
```json
{
  "amount_usd": 5000000,
  "amount_note": "2023 grant",
  "start_date": "2023-01-01",
  "end_date": null,
  "source_url": "https://...",
  "source_title": "Open Phil grants database",
  "confidence": "high"
}
```

**Priority:** HIGH — Directly answers funding overlap questions

#### Employer Edges (675 total)

**Goal:** Extract start/end dates

**Exa search pattern:**
```
"${person_name}" "${org_name}" joined hired appointed years worked
```

**Claude extraction:**
```json
{
  "start_date": "2019-03-01",
  "end_date": "2023-09-15",
  "role_updated": "CEO (2019-2023)",
  "source_url": "https://...",
  "confidence": "medium"
}
```

**Priority:** HIGH — Enables revolving door analysis

#### Founder Edges (187 total)

**Goal:** Extract founding year (written to entity, not edge)

**Exa search pattern:**
```
"${org_name}" founded established year incorporated
```

**Claude extraction:**
```json
{
  "founded_year": 2015,
  "founded_context": "Co-founded by Sam Altman and others",
  "source_url": "https://...",
  "confidence": "high"
}
```

**Priority:** HIGH — Unlocks cohort analysis

#### Parent Company Edges (110 total)

**Goal:** Extract acquisition date and amount

**Exa search pattern:**
```
"${parent_name}" acquired "${subsidiary_name}" acquisition deal year
```

**Priority:** MEDIUM

---

## Implementation Details

### Progress Tracking (Following Anushree's Pattern)

Each script tracks progress separately, using edge natural keys (not IDs which may change):

```
data/edge-enrichment/
├── funder-progress.json
├── employer-progress.json
├── founding-dates-progress.json
└── parent-company-progress.json
```

Format (matches Anushree's `claims-enrichment-progress.json`):
```json
{
  "completed": [
    "128_341_funder",
    "211_177_funder"
  ]
}
```

**Edge natural key:** `{source_id}_{target_id}_{edge_type}` — stable even if edge.id changes.

```javascript
function edgeKey(edge) {
  return `${edge.source_id}_${edge.target_id}_${edge.edge_type}`
}

function loadProgress(name) {
  const path = `data/edge-enrichment/${name}-progress.json`
  try {
    return JSON.parse(fs.readFileSync(path, 'utf-8'))
  } catch {
    return { completed: [] }
  }
}
```

### Cost Estimate

| Edge Type | Count | Exa/edge | Claude/edge | Est. Total |
|-----------|-------|----------|-------------|------------|
| Funder | 148 | $0.008 | $0.02 | ~$4.15 |
| Employer | 675 | $0.008 | $0.02 | ~$18.90 |
| Founder | 187 | $0.008 | $0.02 | ~$5.25 |
| Parent | 110 | $0.008 | $0.02 | ~$3.10 |
| **Total** | **1,120** | | | **~$31.40** |

### CLI Interface

Consistent with Anushree's scripts:

```bash
# Pilot run
PILOT_DB="..." node scripts/edge-enrichment/enrich-funder-edges.js --limit=5

# Dry run (search + extract, don't write)
PILOT_DB="..." node scripts/edge-enrichment/enrich-funder-edges.js --dry-run --limit=10

# Resume after interruption
PILOT_DB="..." node scripts/edge-enrichment/enrich-funder-edges.js --limit=50 --resume

# Single edge by ID
PILOT_DB="..." node scripts/edge-enrichment/enrich-funder-edges.js --edge-id=123

# All edges of this type
PILOT_DB="..." node scripts/edge-enrichment/enrich-funder-edges.js --all
```

### Extraction Prompt Template

```
You are extracting structured data about a relationship between two entities from web search results.

RELATIONSHIP:
- Source: ${source_name} (${source_type})
- Target: ${target_name} (${target_type})
- Type: ${relationship_type}
- Current evidence: "${evidence}"

TASK: Extract temporal and financial data about this relationship.

RULES:
1. Only extract data explicitly stated in the search results
2. Every field must have a source_url from the results
3. Dates should be YYYY-MM-DD (use first of month/year if partial)
4. Amounts in USD (convert if necessary, note original currency)
5. If data not found, return null for that field
6. confidence: high = explicit statement, medium = inferred from context, low = ambiguous

Return JSON:
{
  "start_date": "YYYY-MM-DD" | null,
  "end_date": "YYYY-MM-DD" | null,
  "amount_usd": number | null,
  "amount_note": "context about the amount" | null,
  "source_url": "URL from search results",
  "source_title": "human-readable title",
  "confidence": "high" | "medium" | "low",
  "extraction_notes": "any relevant context"
}
```

---

## Validation & QA

### Spot-check Protocol

After each batch of 20 edges:
1. Randomly sample 3 enriched edges
2. Manually verify source URL contains the claimed data
3. Check date/amount accuracy
4. Track accuracy rate

**Threshold:** If accuracy < 80%, pause and review prompt.

### Known Edge Cases

| Case | Handling |
|------|----------|
| Multiple funding rounds | Create separate edges or use amount_note |
| Date ranges like "2019-present" | end_date = null, is_current = true |
| Amounts in other currencies | Convert to USD, note original in amount_note |
| Conflicting sources | Use most recent/authoritative, note in extraction_notes |
| Person held role at org twice | May need two edges (edge_id unique constraint) |

---

## Rollout Plan

### Phase 1: Schema + Infrastructure
1. Add new columns to edge table (migration script)
2. Add founded_year to entity table
3. Create `scripts/edge-enrichment/` directory structure
4. Build shared libs (db, search, extract)

### Phase 2: Funder Edges (Pilot)
1. Build `enrich-funder-edges.js`
2. Run on 10 edges, manual QA
3. Iterate on prompt if needed
4. Run on all 148 funder edges

### Phase 3: Employer Edges
1. Build `enrich-employer-edges.js`
2. Run on 20 edges, manual QA
3. Run on all 675 employer edges

### Phase 4: Founder/Org Dates
1. Build `enrich-founder-edges.js` (writes to entity.founded_year)
2. Run on all 187 founder edges
3. Backfill orgs without founder edges via direct search

### Phase 5: Analysis Scripts
1. Build `scripts/analysis/funding-overlap.js` — answers funding overlap question
2. Build `scripts/analysis/revolving-door.js` — answers sequential positions question
3. Build `scripts/analysis/cohort-analysis.js` — answers cohort effects question

---

## Dependencies

| Dependency | Current State | Needed By |
|------------|---------------|-----------|
| DATABASE_URL (RDS) | Already in .env | All scripts |
| PILOT_DB (Neon) | Already in .env | All scripts |
| EXA_API_KEY | Already in .env | All scripts |
| ANTHROPIC_API_KEY | Already in .env | All scripts |
| Edge table migration | Not done | Phase 1 |
| Entity founded_year column | Not done | Phase 4 |

---

## Open Questions

1. **Option A vs Option B?** Add columns to RDS edge table, or create `edge_evidence` table in Neon?
   - **Recommendation: Option B (Neon)** — follows Anushree's pattern, reuses `source` table, supports multiple sources per edge

2. **Edge ID stability?** If edges are recreated during seeding, RDS edge IDs may change. How to handle?
   - Recommendation: Use `(source_id, target_id, edge_type)` as natural key for progress tracking, not `edge.id`

3. **Multiple enrichment sources?** If we find conflicting data from different sources, which wins?
   - With Option B: Store all sources in `edge_evidence`, let frontend show most recent or highest confidence
   - With Option A: Most recent authoritative source wins; log alternatives in `amount_note`

4. **Incremental vs. full refresh?** Re-enrich edges periodically or one-time?
   - Recommendation: Track `extraction_date`, re-run annually or when source becomes stale

5. **Export format?** How does enriched edge data get to the frontend?
   - Recommendation: Create `edges-detail.json` parallel to `claims-detail.json`, upload to R2

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Funder edges with amount_usd | ≥70% of 148 |
| Funder edges with source_url | ≥90% of 148 |
| Employer edges with start_date | ≥60% of 675 |
| Employer edges with end_date (where applicable) | ≥50% of historical roles |
| Orgs with founded_year | ≥80% of 717 |
| Extraction accuracy (spot-check) | ≥85% |

---

## Appendix: Sample Enriched Edges

### Funder Edge (Before)
```json
{
  "source_id": 128,
  "target_id": 341,
  "relationship_type": "funder",
  "role": null,
  "evidence": "Open Phil has funded MIRI historically"
}
```

### Funder Edge (After)
```json
{
  "source_id": 128,
  "target_id": 341,
  "relationship_type": "funder",
  "role": null,
  "evidence": "Open Phil has funded MIRI historically",
  "start_date": "2015-06-01",
  "end_date": null,
  "is_current": true,
  "amount_usd": 3750000,
  "amount_note": "Cumulative grants 2015-2023",
  "source_url": "https://www.openphilanthropy.org/grants/machine-intelligence-research-institute-general-support",
  "source_title": "Open Philanthropy — MIRI General Support",
  "enrichment_date": "2026-04-27",
  "enrichment_confidence": "high"
}
```

### Employer Edge (Before)
```json
{
  "source_id": 61,
  "target_id": 128,
  "relationship_type": "employer",
  "role": "Co-CEO (former)",
  "evidence": null
}
```

### Employer Edge (After)
```json
{
  "source_id": 61,
  "target_id": 128,
  "relationship_type": "employer",
  "role": "Co-CEO",
  "evidence": null,
  "start_date": "2021-03-01",
  "end_date": "2024-01-15",
  "is_current": false,
  "source_url": "https://...",
  "source_title": "...",
  "enrichment_date": "2026-04-27",
  "enrichment_confidence": "high"
}
```
