# Edge & Entity Enrichment Pipeline: Design Document

**Author:** Research Team
**Date:** 2026-04-28
**Status:** Draft v5

---

## Executive Summary

This document describes the architecture for:
1. **Discovering new funding relationships** across all entities (people + orgs)
2. **Enriching ALL existing edges** with temporal data and source citations
3. **Enriching org entities** with lifecycle data (founding date, end date)
4. **Maintaining full source attribution** — every enrichment record MUST link to a source

**Core principles:**
- **No source = no claim.** If we can't find a source, we don't create a record. Empty results are expected and fine.
- **Reuse existing tables.** We extend Anushree's `claim` table for org lifecycle facts rather than creating a new table.
- **Source-first, not coverage-first.** We're not trying to fill every field. We're recording only what we can cite.

---

## Table Summary

| Table | Status | Purpose |
|-------|--------|---------|
| `source` | **REUSE** | URL deduplication. Shared by all enrichment. |
| `claim` | **REUSE + EXTEND** | Entity-level claims. Add dimensions for `founded_year`, `end_year`. |
| `edge_evidence` | **NEW** | Source attribution for existing edges. |
| `edge_discovery` | **NEW** | Discovered edges pending human review. |
| `entity_suggestion` | **NEW** | Suggested entities discovered during enrichment, pending review. |

**Total new tables: 3**

---

## Why Two Edge Tables?

We use separate tables for `edge_evidence` and `edge_discovery` because they serve different purposes with different lifecycles:

| Aspect | `edge_evidence` | `edge_discovery` |
|--------|-----------------|------------------|
| **Purpose** | Source attribution for **existing** edges | Staging area for **candidate** edges |
| **Key constraint** | `edge_id NOT NULL` — always links to real edge | `source_entity_id + target_entity_id NOT NULL` — edge doesn't exist yet |
| **Lifecycle** | Permanent record | Workflow: pending → approved → promoted |
| **After promotion** | Stays forever | Updated with `promoted_edge_id`, kept as audit trail |

**Why not consolidate?**
- Consolidated would require nullable FKs (`edge_id` null for discoveries, entity IDs null for enrichments)
- Separate tables allow clean NOT NULL constraints
- Different retention/archival policies
- Clearer queries without status filtering

---

## Promotion Workflow (Key Concept)

When an `edge_discovery` record is approved, data flows to **both** RDS and `edge_evidence`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROMOTION WORKFLOW                                   │
│                                                                              │
│  BEFORE PROMOTION:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  edge_discovery                                                      │    │
│  │                                                                      │    │
│  │  discovery_id: "128_341_funder_src-abc123"                          │    │
│  │  source_entity_id: 128 (Open Philanthropy)                          │    │
│  │  target_entity_id: 341 (MIRI)                                       │    │
│  │  edge_type: "funder"                                                │    │
│  │  amount_usd: 3750000                                                │    │
│  │  citation: "Open Philanthropy awarded $3.75M to MIRI..."            │    │
│  │  source_id: "src-abc123"                                            │    │
│  │  status: "approved"  ← Human approved this                          │    │
│  │  promoted_edge_id: NULL                                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    │ promote-discoveries.js                  │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  STEP 1: Create edge in RDS                                          │    │
│  │                                                                      │    │
│  │  INSERT INTO edge (source_id, target_id, edge_type, created_by)     │    │
│  │  VALUES (128, 341, 'funder', 'edge_discovery')                      │    │
│  │  RETURNING id;  → 2345                                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  STEP 2: Create edge_evidence in Neon                                │    │
│  │                                                                      │    │
│  │  INSERT INTO edge_evidence (                                         │    │
│  │    evidence_id: "2345_src-abc123",                                  │    │
│  │    edge_id: 2345,              ← Links to new RDS edge              │    │
│  │    source_id: "src-abc123",                                         │    │
│  │    amount_usd: 3750000,                                             │    │
│  │    citation: "Open Philanthropy awarded $3.75M to MIRI...",         │    │
│  │    confidence: "high"                                               │    │
│  │  )                                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  STEP 3: Update edge_discovery (audit trail)                         │    │
│  │                                                                      │    │
│  │  UPDATE edge_discovery SET                                           │    │
│  │    status = 'promoted',                                             │    │
│  │    promoted_edge_id = 2345,                                         │    │
│  │    promoted_at = NOW()                                              │    │
│  │  WHERE discovery_id = '128_341_funder_src-abc123'                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  AFTER PROMOTION:                                                            │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────┐    │
│  │   RDS edge        │  │  edge_evidence    │  │   edge_discovery      │    │
│  │                   │  │                   │  │                       │    │
│  │ id: 2345          │◄─│ edge_id: 2345     │  │ status: promoted      │    │
│  │ source_id: 128    │  │ amount: $3.75M    │  │ promoted_edge_id:2345 │    │
│  │ target_id: 341    │  │ citation: "..."   │  │ (audit trail)         │    │
│  │ edge_type: funder │  │ source_id: src-.. │  │                       │    │
│  └───────────────────┘  └───────────────────┘  └───────────────────────┘    │
│        ▲                        ▲                                            │
│        │                        │                                            │
│    The real edge            Source attribution                               │
│    (permanent)              (permanent)                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Summary:**
- `edge_discovery` → RDS `edge` (the relationship now exists)
- `edge_discovery` → `edge_evidence` (source attribution for that edge)
- `edge_discovery` stays as audit trail (who discovered it, when approved)

---

## Architecture Overview

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
│   │  claim   │   │  edge_     │  │  edge_     │  │                 │       │
│   │ (REUSE)  │   │  evidence  │  │  discovery │  │   (promotion    │       │
│   │          │   │  (NEW)     │  │  (NEW)     │  │    creates      │       │
│   │ Beliefs  │   │            │  │            │  │    both edge +  │       │
│   │ + org    │   │ Temporal   │  │ Candidate  │  │    evidence)    │       │
│   │ lifecycle│   │ data for   │  │ edges      │  │                 │       │
│   │          │   │ existing   │  │ pending    │  │                 │       │
│   │          │   │ edges      │  │ review     │──┼─────────────────┘       │
│   └──────────┘   └────────────┘  └────────────┘                            │
│                                                                              │
│   ALL TABLES REQUIRE source_id (NOT NULL) — no source = no record           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## What We're Enriching

### 1. Funding Discovery (People + Orgs)

**Input:** All entities (people AND orgs) — ~1,600 total
**Goal:** Find funding relationships that don't exist in the database
**Output:**
- If edge exists → `edge_evidence` (enrichment)
- If edge is new → `edge_discovery` (pending review)

**Who can be a funder?**
- Foundations and philanthropic orgs
- VC firms, investment funds
- Government agencies (grants, contracts)
- Corporations (strategic investments, sponsorships)
- Individuals (philanthropists, angels, wealthy donors)
- PACs, political orgs
- Crowdfunding platforms
- Universities (internal grants)

**Who can be a recipient?**
- Nonprofits, research orgs
- Startups, companies
- Think tanks, policy orgs
- Academic institutions
- Political campaigns
- Individual researchers (grants, fellowships)
- Individual creators (sponsorships, patronage)

The search should be broad — we're looking for any flow of money, not just traditional philanthropy.

### 2. Temporal Edge Enrichment (All Edge Types)

**Input:** All existing edges in RDS (~2,200)
**Goal:** Add start_date, end_date, amounts where findable
**Output:** `edge_evidence` records (only where we find sourced data)

| Edge Type | Count | What We're Looking For |
|-----------|-------|------------------------|
| employer | 722 | start_date, end_date |
| member | 345 | start_date, end_date |
| funder | 148 | amount_usd, dates |
| founder | 198 | founding_date |
| advisor | 82 | start_date, end_date |
| ... | ... | ... |

**Important:** No source = no record. We don't force output.

### 3. Org Lifecycle (Founding/End Dates)

**Input:** All org entities (~700)
**Goal:** Find founding dates and end dates
**Output:** `claim` records with `belief_dimension = 'founded_year'` or `'end_year'`

---

## Database Schema (Neon)

### `source` (Existing — SHARED)

```sql
CREATE TABLE source (
  source_id          TEXT PRIMARY KEY,      -- src-{sha256(url)[:12]}
  url                TEXT UNIQUE NOT NULL,
  title              TEXT,
  source_type        TEXT,
  date_published     DATE,
  author             TEXT,
  cached_excerpt     TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
```

### `claim` (Existing — EXTENDED with new dimensions)

```sql
-- Add new belief_dimension values: 'founded_year', 'end_year'
-- stance/stance_score are NULL for factual claims

CREATE TABLE claim (
  claim_id           TEXT PRIMARY KEY,
  entity_id          INTEGER NOT NULL,
  entity_name        TEXT,
  belief_dimension   TEXT NOT NULL,         -- 'founded_year', 'end_year', etc.
  stance             TEXT,                  -- NULL for factual claims
  stance_score       INTEGER,               -- NULL for factual claims
  stance_label       TEXT,                  -- "2015" for founded_year
  definition_used    TEXT,                  -- Full context
  citation           TEXT NOT NULL,         -- REQUIRED
  source_id          TEXT NOT NULL,         -- REQUIRED
  confidence         TEXT,
  extracted_by       TEXT,
  extraction_date    DATE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
```

### `edge_evidence` (NEW)

For enriching **existing** edges with temporal data and source attribution.

```sql
CREATE TABLE edge_evidence (
  evidence_id      TEXT PRIMARY KEY,        -- {edge_id}_{source_id}

  -- Link to existing RDS edge (REQUIRED)
  edge_id          INTEGER NOT NULL,

  -- Link to source (REQUIRED)
  source_id        TEXT NOT NULL REFERENCES source(source_id),

  -- Temporal data
  start_date       DATE,
  end_date         DATE,

  -- Financial data (for funder edges)
  amount_usd       NUMERIC(15,2),
  amount_note      TEXT,

  -- Role clarification
  role_title       TEXT,

  -- Citation (REQUIRED)
  citation         TEXT NOT NULL,
  confidence       TEXT,

  -- Extraction metadata
  extracted_by     TEXT,
  extraction_model TEXT,
  extraction_date  DATE,

  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_edge_evidence_edge_id ON edge_evidence(edge_id);
```

### `entity_suggestion` (NEW)

For entities discovered during enrichment that don't yet exist in RDS. Goes through human review before entity creation.

```sql
CREATE TABLE entity_suggestion (
  suggestion_id      TEXT PRIMARY KEY,       -- suggestion-{sha256(name)[:12]}

  -- What we extracted
  extracted_name     TEXT NOT NULL,          -- "METR", "ARC Evals", etc.
  entity_type        TEXT,                   -- 'organization' or 'person' (inferred)

  -- Context for reviewer
  context            TEXT,                   -- "Mentioned as funding recipient from Anthropic"
  source_url         TEXT,                   -- Where we found this entity
  source_id          TEXT REFERENCES source(source_id),
  citation           TEXT,                   -- The quote mentioning this entity

  -- Aggregation
  times_seen         INTEGER DEFAULT 1,      -- Increment each time we see this name
  seen_as_funder     BOOLEAN DEFAULT FALSE,  -- Have we seen this as a funder?
  seen_as_recipient  BOOLEAN DEFAULT FALSE,  -- Have we seen this as a recipient?

  -- Duplicate detection (populated at creation time)
  potential_duplicates JSONB,                -- [{entity_id: 123, name: "...", similarity: 0.72}, ...]

  -- Review workflow
  status             TEXT DEFAULT 'pending', -- pending | approved | rejected | duplicate
  duplicate_of_id    INTEGER,                -- If duplicate, the existing entity_id
  duplicate_check_done BOOLEAN DEFAULT FALSE,-- Reviewer confirmed not a duplicate
  reviewed_by        TEXT,
  reviewed_at        TIMESTAMPTZ,
  review_notes       TEXT,

  -- After approval
  created_entity_id  INTEGER,                -- The new entity_id after creation
  created_at_rds     TIMESTAMPTZ,            -- When entity was created in RDS

  -- Extraction metadata
  first_seen_at      TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at       TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(extracted_name)
);

CREATE INDEX idx_entity_suggestion_status ON entity_suggestion(status);
CREATE INDEX idx_entity_suggestion_times_seen ON entity_suggestion(times_seen DESC);
```

**Duplicate Prevention (CRITICAL):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DUPLICATE PREVENTION PIPELINE                             │
│                                                                              │
│  LAYER 1: Before creating entity_suggestion                                 │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Run full entity resolution (exact → normalized → alias → fuzzy)            │
│  If ANY match (even weak fuzzy 0.6-0.8):                                    │
│    → Store as potential_duplicate_of in suggestion                          │
│    → Do NOT skip — still create suggestion for human review                 │
│                                                                              │
│  LAYER 2: Merge duplicate suggestions                                       │
│  ─────────────────────────────────────────────────────────────────────────── │
│  UNIQUE(extracted_name) — same name always maps to same suggestion          │
│  ON CONFLICT → increment times_seen, update last_seen_at                    │
│                                                                              │
│  LAYER 3: Review UI shows potential duplicates                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│  When reviewing "METR", show:                                               │
│    - Potential match: "Model Evaluation & Threat Research" (0.65 sim)      │
│    - Potential match: "MIRI" (0.71 sim)                                    │
│  Reviewer must explicitly confirm: "Not a duplicate" OR select duplicate   │
│                                                                              │
│  LAYER 4: Final check before RDS insertion                                  │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Even after approval, before INSERT INTO entity:                            │
│    1. Re-run fuzzy match against current RDS entities                       │
│    2. If sim > 0.8 found → BLOCK insertion, alert reviewer                 │
│    3. This catches entities created between suggestion and approval         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Additional fields for duplicate tracking:**

```sql
-- Add to entity_suggestion:
  potential_duplicate_ids  INTEGER[],        -- Array of entity IDs that might be duplicates
  potential_duplicate_sims REAL[],           -- Similarity scores for each
  duplicate_check_done     BOOLEAN DEFAULT FALSE,  -- Reviewer confirmed not a duplicate
```

**Review workflow for entity_suggestion:**
1. Reviewer sees: name, context, how many times seen, source URL
2. **Reviewer sees potential duplicates** with similarity scores
3. Reviewer must either:
   - Select "This IS a duplicate of [entity]" → sets `duplicate_of_id`
   - Confirm "I checked, NOT a duplicate" → sets `duplicate_check_done = TRUE`
4. Actions:
   - **Approve** → Only allowed if `duplicate_check_done = TRUE`. Create entity in RDS, set `created_entity_id`
   - **Duplicate** → Link to existing entity via `duplicate_of_id`. Update edge_discovery to use existing entity.
   - **Reject** → Mark as rejected (not AI-relevant)

**After approval (manual follow-up, not automated):**

Newly created entities only have `name`, `entity_type`, and `status = 'approved'`. They have no belief data yet.

To enrich them with Anushree's scripts:

```bash
# Use --missing-stance flag (targets entities with NULL belief fields)
PILOT_DB="..." node scripts/enrich-claims.js --missing-stance --limit=50

# Default mode WON'T work — it looks for belief_evidence_source = 'Explicitly stated'
# which newly created entities don't have
```

This is a **manual step** done after batch-approving entity suggestions, not automated as part of the edge enrichment pipeline.

### `edge_discovery` (NEW)

For **discovered** edges pending human review. Can reference either real entity IDs or pending entity suggestions.

```sql
CREATE TABLE edge_discovery (
  discovery_id       TEXT PRIMARY KEY,

  -- The discovered relationship
  -- At least one of (source_entity_id, source_suggestion_id) must be set
  -- At least one of (target_entity_id, target_suggestion_id) must be set
  source_entity_id     INTEGER,              -- FK to RDS entity.id (if resolved)
  target_entity_id     INTEGER,              -- FK to RDS entity.id (if resolved)
  source_suggestion_id TEXT,                 -- FK to entity_suggestion (if pending)
  target_suggestion_id TEXT,                 -- FK to entity_suggestion (if pending)
  edge_type            TEXT NOT NULL,

  -- Denormalized for review UI
  source_entity_name TEXT NOT NULL,          -- Always store the name
  target_entity_name TEXT NOT NULL,          -- Always store the name

  -- Link to source (REQUIRED)
  source_id          TEXT NOT NULL REFERENCES source(source_id),

  -- Extracted data (copied to edge_evidence on promotion)
  start_date         DATE,
  end_date           DATE,
  amount_usd         NUMERIC(15,2),
  amount_note        TEXT,

  -- Citation (REQUIRED)
  citation           TEXT NOT NULL,
  confidence         TEXT,

  -- Review workflow
  status             TEXT DEFAULT 'pending_entities',
  -- pending_entities = waiting for entity_suggestion approval
  -- pending_review = entities resolved, waiting for edge review
  -- approved = edge approved, ready to promote
  -- rejected = edge rejected
  -- promoted = edge created in RDS

  reviewed_by        TEXT,
  reviewed_at        TIMESTAMPTZ,
  review_notes       TEXT,

  -- After promotion (audit trail)
  promoted_edge_id   INTEGER,
  promoted_at        TIMESTAMPTZ,

  -- Extraction metadata
  extracted_by       TEXT,
  extraction_model   TEXT,
  extraction_date    DATE,

  created_at         TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent exact duplicates
  UNIQUE(source_entity_name, target_entity_name, edge_type, source_id)
);

CREATE INDEX idx_edge_discovery_status ON edge_discovery(status);
CREATE INDEX idx_edge_discovery_suggestions ON edge_discovery(source_suggestion_id, target_suggestion_id);
```

**Status transitions:**
```
pending_entities → pending_review → approved → promoted
                                 ↘ rejected
```

**When entity_suggestion is resolved:**

```javascript
// After entity_suggestion is approved OR marked as duplicate:

async function linkSuggestionToEntity(suggestionId, entityId) {
  // Update all edge_discovery records that reference this suggestion
  await neonClient.query(`
    UPDATE edge_discovery
    SET source_entity_id = $2,
        source_suggestion_id = NULL,
        status = CASE
          WHEN target_entity_id IS NOT NULL THEN 'pending_review'
          ELSE status
        END
    WHERE source_suggestion_id = $1
  `, [suggestionId, entityId])

  await neonClient.query(`
    UPDATE edge_discovery
    SET target_entity_id = $2,
        target_suggestion_id = NULL,
        status = CASE
          WHEN source_entity_id IS NOT NULL THEN 'pending_review'
          ELSE status
        END
    WHERE target_suggestion_id = $1
  `, [suggestionId, entityId])
}

// If approved: entityId = newly created entity
// If duplicate: entityId = duplicate_of_id (existing entity)
```

---

## Data Flows

### Flow 1: Funding Discovery

```
For each entity (person or org):
  1. Exa search for funding relationships
  2. Claude extracts: funder, recipient, amount, date, citation
  3. If nothing found → skip (this is fine)
  4. For each relationship found:
     a. Register source URL in source table
     b. Check if edge exists in RDS
        - EXISTS → write to edge_evidence
        - NOT EXISTS → write to edge_discovery (pending)
  5. Human reviews edge_discovery records
  6. Approved discoveries get promoted (see workflow above)
```

### Flow 2: Temporal Edge Enrichment

```
For each existing edge in RDS:
  1. Exa search for temporal data (query varies by edge type)
  2. Claude extracts: start_date, end_date, amount (if relevant), citation
  3. If nothing found → skip (this is fine)
  4. If data found:
     a. Register source URL
     b. Write to edge_evidence
```

### Flow 3: Org Lifecycle

```
For each org entity:
  1. Exa search for founding/end dates
  2. Claude extracts: founded_year, end_year, citation
  3. If nothing found → skip (this is fine)
  4. If data found:
     a. Register source URL
     b. Write to claim table with belief_dimension = 'founded_year'
```

---

## Anti-Hallucination Safeguards

1. **Schema enforcement:** `source_id NOT NULL`, `citation NOT NULL`
2. **Prompt rules:** "If nothing found, return empty. This is expected and fine."
3. **Post-extraction validation:** Verify URLs came from search results
4. **Human review:** Discoveries must be approved before becoming real edges

---

## Cost Estimate

| Phase | Items | Total Cost |
|-------|-------|------------|
| Funding Discovery | ~1,600 entities | ~$58 |
| Edge Enrichment | ~2,200 edges | ~$62 |
| Org Lifecycle | ~700 orgs | ~$25 |
| **Total** | | **~$145** |

---

## Scripts

```
scripts/edge-enrichment/
├── discover-funding.js           # Discover funding (people + orgs)
├── enrich-edges.js               # Temporal enrichment for existing edges
├── enrich-org-lifecycle.js       # Founding/end dates → claim table
├── promote-discoveries.js        # Promote approved → RDS + edge_evidence
├── review-discoveries.js         # CLI for reviewing pending discoveries
└── lib/
    ├── db.js
    ├── progress.js
    ├── costs.js
    └── source.js
```

---

## Known Risks & Mitigations

### 1. Entity Resolution (CRITICAL)

**Risk:** Claude extracts "Open Philanthropy funded MIRI" but we need entity IDs (128, 341). How do we map names to IDs?

**Key principle:** We do NOT auto-create entities. If we can't resolve a name, we skip the relationship and log it for manual review. Entity creation is a separate workflow with its own review process.

**Resolution Strategy (in order):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ENTITY RESOLUTION PIPELINE                              │
│                                                                              │
│  Input: "Open Philanthropy" (extracted by Claude)                           │
│                                                                              │
│  Step 1: EXACT MATCH (case-insensitive)                                     │
│  ────────────────────────────────────────                                   │
│  SELECT id, name FROM entity                                                │
│  WHERE LOWER(name) = LOWER('Open Philanthropy')                             │
│  → Match? Return entity_id                                                  │
│                                                                              │
│  Step 2: NORMALIZED MATCH (strip suffixes)                                  │
│  ────────────────────────────────────────                                   │
│  Normalize: "Open Philanthropy, Inc." → "open philanthropy"                 │
│             "OpenAI, L.L.C." → "openai"                                     │
│  Strip: Inc, LLC, Corp, Foundation, Institute, Ltd, Co, LP, PBC            │
│  SELECT id, name FROM entity                                                │
│  WHERE normalize(name) = normalize('Open Philanthropy')                     │
│  → Match? Return entity_id                                                  │
│                                                                              │
│  Step 3: ALIAS LOOKUP                                                       │
│  ────────────────────────────────────────                                   │
│  Check known aliases:                                                       │
│    "Open Phil" → "Open Philanthropy" → entity_id 128                       │
│    "GiveWell" → "GiveWell" → entity_id 234                                 │
│    "MIRI" → "Machine Intelligence Research Institute" → entity_id 341      │
│  → Match? Return entity_id                                                  │
│                                                                              │
│  Step 4: FUZZY MATCH (with high threshold)                                  │
│  ────────────────────────────────────────                                   │
│  Use trigram similarity (pg_trgm) or Levenshtein                           │
│  SELECT id, name, similarity(name, 'Open Philanthropy') as sim             │
│  FROM entity                                                                │
│  WHERE similarity(name, 'Open Philanthropy') > 0.7                         │
│  ORDER BY sim DESC LIMIT 1                                                  │
│  → Match with sim > 0.8? Return entity_id                                  │
│  → Match with 0.7 < sim < 0.8? Log as "uncertain", skip                    │
│                                                                              │
│  Step 5: NO MATCH                                                           │
│  ────────────────────────────────────────                                   │
│  → Log to unresolved_entities table/file                                   │
│  → Skip this relationship                                                   │
│  → Continue processing                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Alias Table (in Neon or as JSON file):**

```sql
CREATE TABLE entity_alias (
  alias        TEXT PRIMARY KEY,      -- The alias/abbreviation
  canonical    TEXT NOT NULL,         -- The canonical name
  entity_id    INTEGER NOT NULL,      -- FK to RDS entity.id
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with known aliases
INSERT INTO entity_alias (alias, canonical, entity_id) VALUES
  ('Open Phil', 'Open Philanthropy', 128),
  ('MIRI', 'Machine Intelligence Research Institute', 341),
  ('FHI', 'Future of Humanity Institute', 156),
  ('GovAI', 'Centre for the Governance of AI', 189),
  ('80k', '80,000 Hours', 201),
  ('CEA', 'Centre for Effective Altruism', 145),
  ('DeepMind', 'Google DeepMind', 67),
  ('Anthropic AI', 'Anthropic', 42);
```

**Unresolved Entities Log:**

```sql
CREATE TABLE unresolved_entity (
  id               SERIAL PRIMARY KEY,
  extracted_name   TEXT NOT NULL,           -- What Claude extracted
  context          TEXT,                    -- The full extraction context
  source_url       TEXT,                    -- Where it was found
  entity_role      TEXT,                    -- 'funder' or 'recipient'
  times_seen       INTEGER DEFAULT 1,       -- How many times we've seen this
  status           TEXT DEFAULT 'pending',  -- pending | resolved | ignored
  resolved_to      INTEGER,                 -- entity_id if manually resolved
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(extracted_name)
);

-- On conflict, increment times_seen
INSERT INTO unresolved_entity (extracted_name, context, source_url, entity_role)
VALUES ($1, $2, $3, $4)
ON CONFLICT (extracted_name) DO UPDATE SET
  times_seen = unresolved_entity.times_seen + 1;
```

**After Enrichment Run:**

1. Review `unresolved_entity` table sorted by `times_seen DESC`
2. For frequently-seen names:
   - Create entity in RDS (via normal submission flow or admin)
   - Add to `entity_alias` if it's a known abbreviation
   - Mark as `resolved` with `resolved_to = new_entity_id`
3. Re-run enrichment with `--retry-unresolved` flag to pick up newly created entities

**Implementation in Code:**

```javascript
// lib/entity-resolution.js

const STRIP_SUFFIXES = [
  ', Inc.', ', Inc', ' Inc.', ' Inc',
  ', LLC', ' LLC', ', L.L.C.', ' L.L.C.',
  ', Corp.', ', Corp', ' Corp.', ' Corp',
  ', Ltd.', ', Ltd', ' Ltd.', ' Ltd',
  ', Co.', ', Co', ' Co.', ' Co',
  ', LP', ' LP', ', L.P.', ' L.P.',
  ', PBC', ' PBC',
  ' Foundation', ' Institute', ' Organization',
  ' Association', ' Initiative', ' Project',
]

function normalize(name) {
  let n = name.trim()
  for (const suffix of STRIP_SUFFIXES) {
    if (n.toLowerCase().endsWith(suffix.toLowerCase())) {
      n = n.slice(0, -suffix.length).trim()
    }
  }
  return n.toLowerCase()
}

async function resolveEntity(extractedName, rdsClient, neonClient) {
  const normalized = normalize(extractedName)

  // Step 1: Exact match
  const exact = await rdsClient.query(
    `SELECT id, name FROM entity
     WHERE LOWER(name) = $1 AND entity_type IN ('person', 'organization')`,
    [extractedName.toLowerCase()]
  )
  if (exact.rows.length === 1) {
    return { id: exact.rows[0].id, confidence: 'exact' }
  }

  // Step 2: Normalized match
  const normMatch = await rdsClient.query(
    `SELECT id, name FROM entity
     WHERE entity_type IN ('person', 'organization')`,
  )
  for (const row of normMatch.rows) {
    if (normalize(row.name) === normalized) {
      return { id: row.id, confidence: 'normalized' }
    }
  }

  // Step 3: Alias lookup
  const alias = await neonClient.query(
    `SELECT entity_id FROM entity_alias WHERE LOWER(alias) = $1`,
    [extractedName.toLowerCase()]
  )
  if (alias.rows.length === 1) {
    return { id: alias.rows[0].entity_id, confidence: 'alias' }
  }

  // Step 4: Fuzzy match (requires pg_trgm extension)
  const fuzzy = await rdsClient.query(
    `SELECT id, name, similarity(name, $1) as sim
     FROM entity
     WHERE entity_type IN ('person', 'organization')
       AND similarity(name, $1) > 0.6
     ORDER BY sim DESC
     LIMIT 1`,
    [extractedName]
  )
  if (fuzzy.rows.length === 1) {
    const sim = fuzzy.rows[0].sim
    if (sim > 0.85) {
      return { id: fuzzy.rows[0].id, confidence: 'fuzzy_high' }
    } else {
      // Log as uncertain but don't use
      console.log(`  Uncertain fuzzy match: "${extractedName}" → "${fuzzy.rows[0].name}" (${sim.toFixed(2)})`)
    }
  }

  // Step 5: No match
  return null
}

async function logUnresolved(neonClient, extractedName, context, sourceUrl, role) {
  await neonClient.query(
    `INSERT INTO unresolved_entity (extracted_name, context, source_url, entity_role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (extracted_name) DO UPDATE SET
       times_seen = unresolved_entity.times_seen + 1`,
    [extractedName, context, sourceUrl, role]
  )
}
```

**Metrics to Track:**

After each run, report:
- Entities processed: X
- Relationships extracted: Y
- Resolved (exact): N1
- Resolved (normalized): N2
- Resolved (alias): N3
- Resolved (fuzzy): N4
- **Unresolved: N5** ← Key metric to minimize
- Resolution rate: (N1+N2+N3+N4) / Y

### 2. Duplicate Discovery Detection

**Risk:** Process entity A, find "A funded B". Later process entity B, find same relationship. Creates duplicates.

**Mitigation:**
- UNIQUE constraint on `(source_entity_id, target_entity_id, edge_type, source_id)` prevents exact duplicates
- Before inserting, check if discovery already exists (either direction)
- Use `ON CONFLICT DO NOTHING` for idempotency

```sql
-- Check both directions
SELECT * FROM edge_discovery
WHERE (source_entity_id = $1 AND target_entity_id = $2)
   OR (source_entity_id = $2 AND target_entity_id = $1)
AND edge_type = 'funder';
```

### 3. Funding Direction Ambiguity

**Risk:** "OpenAI received funding from Microsoft" vs "Microsoft funded OpenAI" — same relationship, different phrasing.

**Mitigation:**
- Explicit prompt instruction: "Always identify the FUNDER (who gave money) and RECIPIENT (who received money)"
- Validate: funder should typically be a foundation, VC, government, wealthy individual
- If unclear, set `confidence = 'low'` and flag for review

### 4. Multiple Funding Rounds

**Risk:** Open Phil funded MIRI in 2015, 2018, and 2023. Three grants, one edge.

**Mitigation:**
- Schema allows multiple `edge_evidence` records per edge (different source_ids)
- Each grant gets its own evidence record with its own amount/date/citation
- Add `grant_id` or `funding_round` field if needed for disambiguation

```sql
-- Multiple evidence records for same edge is OK
edge_evidence:
  evidence_id: "142_src-abc" (2015 grant)
  evidence_id: "142_src-def" (2018 grant)
  evidence_id: "142_src-ghi" (2023 grant)
```

### 5. Date Precision

**Risk:** Source says "founded in 2015" — no month/day.

**Mitigation:**
- Allow partial dates: store `2015-01-01` with `date_precision = 'year'`
- Add `date_precision` field: `'day'`, `'month'`, `'year'`
- Or use separate `year` / `date` fields (claim table already has `stance_label` for year)

### 6. Edge Direction Check

**Risk:** Checking if edge exists, but it's stored A→B and we're checking B→A.

**Mitigation:**
- For funder edges, direction matters: funder→recipient
- Check both directions when looking for existing edge
- Normalize direction in extraction: always funder as source_entity_id

### 7. Conflicting Evidence

**Risk:** Source 1 says "Founded 2015", Source 2 says "Founded 2016".

**Mitigation:**
- Store ALL evidence (multiple claim records, multiple edge_evidence records)
- Track `confidence` level for each
- Frontend/analysis can use highest-confidence or most-recent
- Don't try to resolve conflicts automatically — surface them for review

### 8. Source URL Reliability

**Risk:** Exa returns URL that's now 404, paywalled, or changed content.

**Mitigation:**
- Store `cached_excerpt` in source table (already there)
- Consider archiving URLs via Wayback Machine API (future enhancement)
- For spot-checks, verify URL is still accessible

### 9. API Failures & Retries

**Risk:** Exa or Claude API fails mid-run.

**Mitigation:**
- Wrap API calls in retry logic (3 attempts, exponential backoff)
- Progress tracking saves after each entity (already designed)
- `--resume` flag skips completed entities
- Log failures for manual retry

```javascript
async function withRetry(fn, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === maxAttempts - 1) throw err
      await delay(1000 * Math.pow(2, i)) // Exponential backoff
    }
  }
}
```

### 10. Progress Tracking Granularity

**Risk:** Entity A has 5 funding relationships. Crash after processing 3. On resume, skip A entirely → lose 2 relationships.

**Mitigation:**
- Track at relationship level, not entity level
- Progress key: `{entity_id}_{funder_id}_{recipient_id}` or similar
- Or: accept some re-processing (upsert pattern makes it idempotent)

### 11. Entity Name Matching

**Risk:** Claude extracts "OpenAI" but DB has "OpenAI, Inc." or "OpenAI LP".

**Mitigation:**
- Normalize names before matching (lowercase, strip Inc/LLC/etc.)
- Use fuzzy matching with threshold
- Build alias table for known variations (future enhancement)
- Log unmatched names for manual entity creation

### 12. Promotion Transaction Integrity

**Risk:** Promotion has 3 steps. Step 2 fails → RDS has edge but Neon has no evidence.

**Mitigation:**
- Check if edge already exists before inserting (idempotent)
- Check if evidence already exists before inserting (idempotent)
- Use `ON CONFLICT DO NOTHING` or `DO UPDATE`
- If partial failure, re-running promotion fixes it

```javascript
// Idempotent promotion
const existingEdge = await rds.query(
  'SELECT id FROM edge WHERE source_id=$1 AND target_id=$2 AND edge_type=$3',
  [discovery.source_entity_id, discovery.target_entity_id, discovery.edge_type]
)
const edgeId = existingEdge.rows[0]?.id || (await createEdge(...))
```

### 13. RDS Edge ID Stability

**Risk:** `edge_evidence.edge_id` references RDS edge. What if edges get deleted/recreated?

**Mitigation:**
- Edge IDs are stable (no bulk recreation planned)
- If edge is deleted, evidence becomes orphaned (acceptable — can clean up)
- Could add `(source_entity_id, target_entity_id, edge_type)` as secondary key for recovery

### 14. Self-Funding

**Risk:** Can an entity fund itself? (Internal grants, retained earnings)

**Mitigation:**
- Allow it — some orgs do have internal funding mechanisms
- Add validation: if `source_entity_id == target_entity_id`, set `confidence = 'low'` and flag

### 15. Resource Entities

**Risk:** Resources (papers, reports) might be mentioned as funders/recipients.

**Mitigation:**
- Filter to `entity_type IN ('person', 'organization')` when searching
- If Claude extracts a resource as funder/recipient, entity resolution will fail → skipped

---

## Pilot Checklist

Before running full enrichment, verify on a 10-entity sample:

- [ ] Entity resolution works (names → IDs)
- [ ] Duplicate detection works (same relationship from both sides)
- [ ] Direction is correct (funder vs recipient)
- [ ] Citations are verbatim quotes from source URLs
- [ ] Source URLs are accessible and contain the cited information
- [ ] Multiple funding rounds create separate evidence records
- [ ] Progress tracking allows clean resume
- [ ] Cost tracking matches estimates

---

## Summary

| Question | Answer |
|----------|--------|
| How many new tables? | **3** (`edge_evidence`, `edge_discovery`, `entity_suggestion`) |
| What about org lifecycle? | **Reuse `claim` table** with new dimensions |
| What happens on promotion? | Discovery → RDS edge + edge_evidence |
| What if no source found? | **No record created** (source-first principle) |
| What if entity doesn't exist? | Create `entity_suggestion` for human review |
| How to prevent duplicate entities? | 4-layer protection: fuzzy match at creation, merge suggestions, review UI shows potential dupes, final check before insert |
| After new entity created? | **Manual step:** Run `enrich-claims.js --missing-stance` to populate belief claims |
