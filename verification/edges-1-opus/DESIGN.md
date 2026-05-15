# edges-1-opus: Edge Verification Pipeline Design

**Created:** 2026-05-14
**Status:** Design approved
**Updated:** 2026-05-14

This document captures the design decisions for the edge verification pipeline, modeled after `beliefs-1-opus`.

---

## Overview

Verify and correct relationship edges between entities (person→org, org→org, person→person) using Claude Opus with Exa search.

**Goals:**
- Verify existing edges are accurate
- Correct edge fields (type, role, dates) when wrong
- Remove edges that lack evidence
- Add source citations to edges via `edge_evidence` table

**Non-goals:**
- Edge discovery (adding new relationships) - out of scope for v1

---

## Design Decisions

### Direction Convention
**Decision:** Keep current convention - active agent is source
- Person → Org: person is source (person works at org)
- Funder → Recipient: funder is source (funder funds recipient)
- Author → Resource: author is source

### Canonical Edge Types
**Decision:** Constrain corrections to canonical types only

**Person → Organization:**
- `employer` - Person works at org
- `founder` - Person founded org
- `board_member` - Person is on the board
- `advisor` - Person advises org
- `member` - Person is member of org
- `affiliated` - General affiliation (fallback)
- `critic` - Person publicly criticizes org
- `supporter` - Person publicly supports org

**Organization → Organization:**
- `funder` - Source funds target
- `parent_company` - Source owns/controls target
- `partner` - Formal partnership
- `collaborator` - Project collaboration
- `member` - Source is member of target (e.g., coalition)

**Person → Person:**
- `collaborator` - They work together
- `advisor` - Source advises target
- `funder` - Source funds target
- `critic` - Source criticizes target
- `supporter` - Source supports target

**Resource edges:**
- `author` - Person authored resource
- `publisher` - Org published resource

### Non-Canonical Types
**Decision:** Soft deprecation
- Legacy types (`trustee`, `alumni`, `formerly_affiliated`, `mentioned`, etc.) can be `confirm`ed as-is
- `correct` verdict must use a canonical type
- No new edges with non-canonical types
- Duplicates (`employed_by`, `employed`, `advises`, `authored_by`) should be corrected to canonical forms

### Fields to Verify
**Decision:** Verify type, role, and dates
- `edge_type` - Is relationship type correct? ✓
- `role` - Is role title accurate? ✓
- `start_date` - When did relationship start? ✓
- `end_date` - When did it end? ✓
- `is_primary` - **Skip** (too subjective)

### Source Requirements
**Decision:** Required for confirm/correct, not for remove
- `confirm` and `correct` verdicts must include source URL + citation
- `remove` verdicts only need reasoning (no source required)

### Batch Size
**Decision:** Cap at ~10 edges per Claude call
- High-edge entities split into multiple calls
- Each edge gets focused attention
- Easier to parse and debug output

### Unit of Work
**Decision:** All edges for one entity (both directions)
- Verify edges where `source_id = entity_id OR target_id = entity_id`
- One Exa search per entity, verify all edges in that context
- Cost effective: ~$0.50 per entity vs ~$4.00 if done edge-by-edge

### Avoiding Duplicate Work
**Decision:** Track reviewed edges in `edge_correction` table
- Before processing, check: `SELECT edge_id FROM edge_correction WHERE edge_id = ? AND status != 'error'`
- Skip edges already reviewed (don't include in Claude prompt)
- Each edge reviewed once, even though it connects two entities

### Verdicts
**Decision:** Three verdicts (same as beliefs-1-opus)
- `confirm` - Edge is correct as-is
- `correct` - Edge exists but needs field corrections
- `remove` - Edge should not exist (no evidence found)
- No `add` verdict - not doing edge discovery

### Source Handling
**Decision:** Same pattern as beliefs-1-opus
- Source URL + citation are part of the correction, not separate verdicts
- Write to `source` table (reuse, not new)
- Write to `edge_evidence` table (reuse, not new)
- Only new table is `edge_correction`

### Database Branches
**Decision:** Write to verification-staging branch, not production
- `edge_correction` table on staging
- `source` table writes go to staging
- `edge_evidence` table writes go to staging
- Migration script promotes to production after review

### Priority Entities
**Decision:** Use same 153 entities from `verification/mapping-priority.csv`
- Consistent with beliefs verification run
- Allows comparing verification results across beliefs and edges

### Migration Strategy
**Decision:** Phased migration (same as beliefs)
1. Phase 1: Migrate new sources to `source` table
2. Phase 2: Migrate new entries to `edge_evidence` table
3. Phase 3: Apply edge updates/deletions to `edge` table

---

## Database Schema

### `edge_correction` table (NEW)

```sql
CREATE TABLE edge_correction (
  id SERIAL PRIMARY KEY,

  -- Edge identification
  edge_id INTEGER NOT NULL,           -- FK to edge table
  source_entity_id INTEGER NOT NULL,  -- FK to entity (edge source)
  source_entity_name TEXT,            -- Denormalized for readability
  source_entity_type TEXT,            -- person/organization
  target_entity_id INTEGER NOT NULL,  -- FK to entity (edge target)
  target_entity_name TEXT,            -- Denormalized for readability
  target_entity_type TEXT,            -- person/organization

  -- Current values (from edge table)
  current_edge_type TEXT,
  current_role TEXT,
  current_start_date TEXT,
  current_end_date TEXT,

  -- Proposed values (if verdict = 'correct')
  proposed_edge_type TEXT,            -- Must be canonical type
  proposed_role TEXT,
  proposed_start_date TEXT,
  proposed_end_date TEXT,

  -- Evidence (written to edge_evidence table)
  source_url TEXT,                    -- URL of supporting source
  citation TEXT,                      -- Verbatim quote from source
  evidence_confidence TEXT,           -- high/medium/low

  -- Verification metadata
  verdict TEXT NOT NULL,              -- confirm/correct/remove
  confidence TEXT,                    -- high/medium/low (overall confidence)
  reasoning TEXT,                     -- Claude's reasoning
  search_results JSONB,               -- Exa search results used

  -- Pipeline tracking
  pipeline TEXT DEFAULT 'edges-1-opus',
  reviewed_entity_id INTEGER,         -- Which entity triggered this review
  status TEXT DEFAULT 'pending',      -- pending/applied/rejected/error
  applied_at TIMESTAMPTZ,
  applied_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate reviews
  UNIQUE(edge_id, pipeline)
);

-- Index for checking if edge already reviewed
CREATE INDEX idx_edge_correction_edge_id ON edge_correction(edge_id);

-- Index for finding corrections by entity
CREATE INDEX idx_edge_correction_entities ON edge_correction(source_entity_id, target_entity_id);
```

### `source` table (REUSE)

Already exists - stores source URLs. Same sources can back beliefs OR edges.

```sql
-- Already exists, no changes needed
-- source_id = src-<sha256(url)[:12]>
-- Fields: source_id, url, title, source_type, date_published, author, publisher, cached_excerpt, created_at, last_verified_at
```

### `edge_evidence` table (REUSE)

Already exists - links edges to sources with citations.

```sql
-- Already exists, no changes needed
-- Fields: evidence_id, edge_id, source_id, citation, start_date, end_date, amount_usd, amount_note, role_title, confidence, extracted_by, extraction_model, extraction_date, created_at
```

---

## Edge Fields to Verify

| Field | Type | Verification Task | In Scope |
|-------|------|-------------------|----------|
| `edge_type` | TEXT | Is relationship type correct? | ✓ |
| `role` | TEXT | Is role title accurate? (CEO, Board Member, etc.) | ✓ |
| `start_date` | VARCHAR | When did relationship start? (YYYY or YYYY-MM) | ✓ |
| `end_date` | VARCHAR | When did it end? (null = ongoing) | ✓ |
| `is_primary` | BOOLEAN | Is this the primary affiliation? | ✗ (skip) |

---

## Edge Types Reference (Canonical)

### Person → Organization
| Type | Meaning | Display (forward) | Display (reverse) |
|------|---------|-------------------|-------------------|
| `employer` | Person works at org | "Works at" | "Employs" |
| `founder` | Person founded org | "Founded" | "Founded by" |
| `board_member` | Person is on the board | "Board member of" | "Has board member" |
| `advisor` | Person advises org | "Advises" | "Advised by" |
| `member` | Person is member of org | "Member of" | "Has member" |
| `affiliated` | General affiliation | "Affiliated with" | "Affiliated with" |
| `critic` | Person publicly criticizes org | "Criticizes" | "Criticized by" |
| `supporter` | Person publicly supports org | "Supports" | "Supported by" |

### Organization → Organization
| Type | Meaning | Display (forward) | Display (reverse) |
|------|---------|-------------------|-------------------|
| `funder` | Source funds target | "Funds" | "Funded by" |
| `parent_company` | Source owns target | "Parent of" | "Subsidiary of" |
| `partner` | Formal partnership | "Partner with" | "Partner with" |
| `collaborator` | Project collaboration | "Collaborates with" | "Collaborates with" |
| `member` | Source is member of target | "Member of" | "Has member" |

### Person → Person
| Type | Meaning | Display (forward) | Display (reverse) |
|------|---------|-------------------|-------------------|
| `collaborator` | They work together | "Collaborates with" | "Collaborates with" |
| `advisor` | Source advises target | "Advises" | "Advised by" |
| `funder` | Source funds target | "Funds" | "Funded by" |
| `critic` | Source criticizes target | "Criticizes" | "Criticized by" |
| `supporter` | Source supports target | "Supports" | "Supported by" |

### Resource Edges
| Type | Meaning | Display (forward) | Display (reverse) |
|------|---------|-------------------|-------------------|
| `author` | Person authored resource | "Authored" | "Authored by" |
| `publisher` | Org published resource | "Published" | "Published by" |

### Legacy Types (deprecated, can confirm but not create new)
- `employed_by`, `employed` → use `employer`
- `advises` → use `advisor`
- `authored_by` → use `author`
- `trustee` → can confirm, or correct to `board_member`
- `alumni`, `formerly_affiliated`, `former_colleague` → can confirm as-is
- `mentioned` → can confirm as-is

---

## Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. LOAD ENTITY                                                  │
│    - Get entity by ID                                           │
│    - Load all edges where source_id = entity OR target_id = entity │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. FILTER ALREADY REVIEWED                                      │
│    - Check edge_correction table for each edge_id               │
│    - Skip edges already reviewed (status != 'error')            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. EXA SEARCH                                                   │
│    - Search for entity name + "works at" / "founded" / etc.     │
│    - Search for entity + connected org/person names             │
│    - Cache results (reuse across edges)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. CLAUDE ANALYSIS                                              │
│    - Present all edges + search results                         │
│    - For each edge, determine:                                  │
│      - Does relationship exist? (confirm/remove)                │
│      - Are fields correct? (correct if not)                     │
│      - What's the best supporting evidence?                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. WRITE CORRECTIONS                                            │
│    - Insert into edge_correction table                          │
│    - Insert into source table (if new URL)                      │
│    - Insert into edge_evidence table (link edge → source)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. MIGRATE (separate script, after human review)                │
│    - Apply corrections to production edge table                 │
│    - Update edge fields (type, role, dates)                     │
│    - Remove edges with verdict = 'remove'                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
verification/edges-1-opus/
├── DESIGN.md           # This file
├── README.md           # Usage documentation
├── run.js              # Main pipeline script
├── prompts/
│   └── verify-edges.md # Claude prompt for edge verification
├── results/
│   ├── corrections.jsonl     # Row-by-row verdict append
│   ├── cost-ledger.jsonl     # Per-entity cost tracking
│   ├── progress.json         # Resume support (completed IDs)
│   ├── run-stats.json        # Final summary stats
│   └── entities/             # Per-entity full results
│       └── {id}.json
└── migrations/
    └── create-edge-correction-table.sql
```

## Implementation Patterns (from beliefs-1-opus)

### Database Branch
- Uses `STAGING_DATABASE_URL` by default
- Production only with explicit `--allow-production` flag
- Check at startup: exits if no staging URL and no production flag

### Row-by-Row Persistence
**Critical**: Write to DB and JSONL after each entity completes, not at the end.

```javascript
// After each entity completes:
async function saveResults(outcome) {
  // 1. Append to corrections.jsonl
  for (const r of results) {
    fs.appendFileSync(jsonlPath, JSON.stringify(r) + '\n')
  }

  // 2. Write to DB immediately
  if (options.writeDb) {
    await writeSourceAndEvidence(r)      // source + edge_evidence tables
    await insertCorrectionToDB(r)        // edge_correction table
  }

  // 3. Append to cost ledger
  fs.appendFileSync(costLedgerPath, JSON.stringify({
    id: entity.id,
    cost_usd: entityCost.total_usd,
    // ...
  }) + '\n')

  // 4. Save per-entity JSON
  fs.writeFileSync(`entities/${entity.id}.json`, JSON.stringify(result))

  // 5. Update progress.json
  progress.completed.push(entity.id)
  fs.writeFileSync(progressPath, JSON.stringify(progress))
}
```

### Parallel Execution
- `runWithConcurrency(items, concurrency, fn)` helper
- `--parallel=N` flag (default: 1)
- Each entity saved immediately on completion (thread-safe via atomic file appends)

### Resume Support
- `--resume` flag to continue interrupted runs
- `progress.json` tracks completed entity IDs
- Cost ledger used for deduplication (skip entities already in ledger)

### Cost Tracking
- Per-entity: `costs.resetEntity()` before, `costs.getEntityCost()` after
- Cumulative: `costs.getSummary()` for totals
- Pricing: Opus ($15/$75 per M tokens), Exa ($0.008/call)

---

## Usage (Planned)

```bash
# Single entity (DB writes disabled by default)
node verification/edges-1-opus/run.js --id=123

# Single entity with DB writes
node verification/edges-1-opus/run.js --id=123 --write-db

# Batch from priority list (parallel)
node verification/edges-1-opus/run.js --csv=mapping-priority.csv --parallel=5 --write-db

# Resume interrupted run
node verification/edges-1-opus/run.js --csv=mapping-priority.csv --parallel=5 --write-db --resume

# Limit to first N entities
node verification/edges-1-opus/run.js --limit=10 --write-db

# Cost ceiling (abort when reached)
node verification/edges-1-opus/run.js --csv=mapping-priority.csv --max-cost=100 --write-db
```

### Flags
| Flag | Description |
|------|-------------|
| `--id=N` | Process single entity by ID |
| `--csv=FILE` | Process entities from CSV (must have `id` column) |
| `--limit=N` | Process first N entities only |
| `--parallel=N` | Run N entities concurrently (default: 1) |
| `--write-db` | Enable database writes (default: disabled) |
| `--resume` | Resume from progress.json, skip completed entities |
| `--max-cost=N` | Abort when cumulative cost reaches $N |
| `--allow-production` | Use production DB (requires explicit flag) |

---

## Cost Estimate

Based on beliefs-1-opus costs:
- Exa search: ~$0.01 per entity
- Claude Opus: ~$0.40-0.60 per entity (varies with edge count, ~10 edges/call)
- **Total: ~$0.50-0.70 per entity**

For 153 priority entities: ~$75-100
For 1,000 entities: ~$500-700

Note: High-edge entities (50+ edges) may cost more due to multiple Claude calls.

---

## Current Edge Statistics

From production database (2026-05-14):
- **Total edges:** 3,169
- **Edges with evidence:** 3,019 (in edge_evidence table)
- **Edges without evidence:** ~150

**By type:**
- funder: 1,175
- employer: 677
- member: 326
- collaborator: 244
- partner: 208
- founder: 158
- parent_company: 113
- advisor: 81
- author: 67
- publisher: 45
- critic: 23
- supporter: 20
- affiliated: 13
- (others): ~20

---

## Resolved Questions

1. **Priority list:** ✓ Use same 153 entities from `verification/mapping-priority.csv`

2. **Symmetric edges:** ✓ Each edge reviewed once. When Entity A and B are both in priority list, edge is only verified once (first entity to process it). Skip already-reviewed edges silently.

3. **Funding amounts:** Out of scope for v1 (focus on edge existence, type, role, dates)

4. **Role normalization:** ✓ Claude can correct role titles but no strict normalization enforced

## Open Questions

1. **Search query strategy:** What Exa queries work best for edge verification? Need to experiment.

---

## Next Steps

1. [x] Review and approve this design
2. [ ] Create `edge_correction` table on staging
3. [ ] Build `run.js` pipeline
4. [ ] Create verification prompt (`prompts/verify-edges.md`)
5. [ ] Test on 5-10 entities
6. [ ] Run on 153 priority entities
7. [ ] Build phased migration script
