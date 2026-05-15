# Notes Verification Pipeline — Design Document

## Overview

Verify the `notes` field on entities by:
1. Identifying factual claims in the unstructured text
2. Searching for primary sources that support each claim
3. Removing unsupported claims
4. Regenerating notes from verified claims only
5. Storing source citations for transparency

**Key constraint:** No new information is added. We only verify, correct, confirm, or remove existing claims.

---

## Architecture

Single Opus agent per entity (no separate decomposition agent):

```
┌─────────────────────────────────────────────────────────────────┐
│ Single Opus Agent                                               │
│                                                                 │
│ Input:                                                          │
│   - entity_id, entity_name, entity_type                         │
│   - notes (plain text only)                                     │
│                                                                 │
│ Tools:                                                          │
│   - exa_search: search for sources (multiple queries)           │
│   - fetch_content: get full page content from URL               │
│   - submit_verified_notes: terminating tool with structured out │
│                                                                 │
│ Internal process:                                               │
│   1. Parse notes into discrete factual claims                   │
│   2. For each claim: search for primary source                  │
│   3. Classify: SUPPORTED (with source) or UNSUPPORTED           │
│   4. Reconstruct notes from supported claims only               │
│                                                                 │
│ Output (via submit_verified_notes):                             │
│   - verified_notes: fresh text from verified claims             │
│   - sources[]: per-claim {claim, url, citation}                 │
│   - removed_claims[]: {claim, reason}                           │
│   - confidence: overall confidence in verification              │
└─────────────────────────────────────────────────────────────────┘
```

**Note:** We do NOT pass `notes_html`, `notes_sources`, or `notes_confidence` to Opus.
- `notes_html` — rarely populated (60/1736 entities)
- `notes_sources` — inconsistent format, unverified hints from original author
- `notes_confidence` — author's self-assessment, not verification output

Opus searches fresh and finds proper sources independently.

### Why Single Agent (vs. Decompose → Verify → Rewrite)

1. **Simpler** — no coordination between agents
2. **Context** — Opus sees full picture when rewriting
3. **Cost similar** — decomposition with Haiku would be ~$0.001, negligible
4. **Quality** — Opus can make better judgment calls on what constitutes a "claim"

---

## Database Schema

### Tables to Write

| Table | Purpose | New? | Environment |
|-------|---------|------|-------------|
| `note_correction` | Stores verification results per entity | **NEW** | Staging only |
| `note_claim` | Per-claim evidence linking | **NEW** | **Both staging + production** |
| `source` | Stores source URLs (shared with beliefs/edges) | Existing | Both |

**Why `note_claim` in production?** Frontend needs to show "this claim is supported by this source" — same pattern as `claim` (beliefs) and `edge_evidence` (edges).

### Table Linkages

```
entity (id=123)
    │
    ├── entity.notes          ← original text (input)
    ├── entity.notes_sources  ← updated to JSON array of URLs (output)
    │
    ▼
note_correction (entity_id=123, pipeline='notes-1-opus')
    │                         ← one per entity per pipeline run
    │                         ← stores verified_notes, removed_claims
    │
    ▼
note_claim (entity_id=123, correction_id=N, source_id='src-xxx')
    │                         ← many per entity
    │                         ← stores claim_text, verdict, citation
    │
    ▼
source (source_id='src-xxx')  ← URL and metadata (shared table)
```

### Query: Get all claims and sources for an entity

```sql
SELECT
  nc.claim_text,
  nc.claim_type,
  nc.verdict,
  nc.confidence,
  nc.citation,
  s.url,
  s.title
FROM note_claim nc
LEFT JOIN source s ON nc.source_id = s.source_id
WHERE nc.entity_id = 123
ORDER BY nc.id;
```

`note_claim.entity_id` is stored directly (not just via correction_id) for efficient querying.

### note_correction Table

```sql
CREATE TABLE IF NOT EXISTS note_correction (
  id SERIAL PRIMARY KEY,

  -- Entity reference
  entity_id INTEGER NOT NULL,
  entity_name TEXT,
  entity_type TEXT,  -- person/organization/resource

  -- Original content
  original_notes TEXT,
  original_notes_length INTEGER,
  original_claim_count INTEGER,

  -- Verified content
  verified_notes TEXT,
  verified_notes_length INTEGER,
  verified_claim_count INTEGER,

  -- Removed content
  removed_claims JSONB,  -- [{claim, reason}]
  removed_claim_count INTEGER,

  -- Metadata
  confidence TEXT,  -- high/medium/low
  reasoning TEXT,

  -- Pipeline tracking
  pipeline TEXT DEFAULT 'notes-1-opus',
  status TEXT DEFAULT 'pending',  -- pending/applied/rejected
  applied_at TIMESTAMPTZ,
  applied_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(entity_id, pipeline)
);
```

### note_claim Table

```sql
CREATE TABLE IF NOT EXISTS note_claim (
  id SERIAL PRIMARY KEY,

  -- Links
  entity_id INTEGER NOT NULL,
  source_id TEXT,  -- FK to source.source_id
  correction_id INTEGER,  -- FK to note_correction.id

  -- Claim content
  claim_text TEXT NOT NULL,
  claim_type TEXT,  -- biographical/affiliation/financial/date/relationship/achievement

  -- Evidence
  citation TEXT,

  -- Verification
  verdict TEXT,  -- supported/unsupported/corrected
  confidence TEXT,  -- high/medium/low

  -- Pipeline tracking
  extracted_by TEXT DEFAULT 'notes-1-opus',
  extraction_model TEXT,
  extraction_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_note_claim_entity_id ON note_claim(entity_id);
CREATE INDEX idx_note_claim_correction_id ON note_claim(correction_id);
CREATE INDEX idx_note_claim_source_id ON note_claim(source_id);
```

### source Table (existing, shared)

Already exists from beliefs-1-opus and edges-1-opus. We reuse it:

```sql
-- source_id is hash of URL
-- Upsert pattern: INSERT ... ON CONFLICT DO NOTHING
INSERT INTO source (source_id, url, source_type)
VALUES ($1, $2, 'web')
ON CONFLICT (source_id) DO NOTHING;
```

---

## Input/Output: Entity Fields

### Input (passed to Opus)

| Column | Type | Description |
|--------|------|-------------|
| `notes` | TEXT | Plain text biographical/descriptive content |

That's it. We do NOT pass:
- `notes_html` — rarely populated (60/1736 entities)
- `notes_confidence` — author's self-assessment, not verification input
- `notes_sources` — unverified hints in inconsistent formats

### Output (updated on entity after verification)

| Column | Updated to |
|--------|-----------|
| `notes` | `verified_notes` from pipeline |
| `notes_confidence` | Our verification confidence (1-5) |
| `notes_sources` | JSON array of verified source URLs |

### notes_sources Format After Verification

**Before:** Inconsistent (JSON arrays, semicolons, plain text, NULL)

**After:** Standardized JSON array of URLs
```json
["https://ethereum.org/about", "https://en.wikipedia.org/wiki/Vitalik_Buterin", "https://futureoflife.org/..."]
```

These URLs correspond to sources in the `source` table, linked through `note_claim`.

---

## Output: submit_verified_notes Tool

```json
{
  "verified_notes": "string — reconstructed notes from verified claims only",
  "sources": [
    {
      "claim": "co-founded Ethereum in 2015",
      "url": "https://ethereum.org/about",
      "citation": "Ethereum was proposed in 2013 by programmer Vitalik Buterin and development began in 2014, with the network going live on 30 July 2015."
    }
  ],
  "removed_claims": [
    {
      "claim": "donated approximately $500M to FLI",
      "reason": "Amount unverifiable — sources show donation but not specific amount"
    }
  ],
  "confidence": "high|medium|low",
  "reasoning": "Brief explanation of overall verification quality"
}
```

---

## Prompt Design

### Core Constraints

1. **No new information** — only verify what's already in the notes
2. **Source required** — every claim in verified_notes MUST have a source entry
3. **Write fresh** — reconstruct notes from verified claims, don't edit original
4. **Transparency** — document what was removed and why

### Claim Types to Identify

| Type | Example | Verification approach |
|------|---------|----------------------|
| Biographical | "Russian-Canadian programmer" | Wikipedia, official bios |
| Affiliation | "co-founder of Ethereum" | Company sites, LinkedIn, news |
| Financial | "donated $500M" | Press releases, SEC filings, news |
| Date/Timeline | "in 2015", "by 2024" | Primary sources with dates |
| Relationship | "alongside Joseph Lubin" | Multiple sources confirming |
| Achievement | "largest donor" | Official announcements |
| Position/Opinion | "publicly distanced himself" | First-person statements |

### Adversarial Mindset

From beliefs-1-opus and edges-1-opus, key principles:

1. **Default skepticism** — assume claims are wrong until proven
2. **Primary sources preferred** — official statements, company websites, press releases are strongest; Wikipedia and news articles are acceptable for biographical facts
3. **Specific > vague** — "$25M" needs a source; "large donation" is vague
4. **Recency matters** — 2025 source beats 2020 source for current facts
5. **Single source skepticism** — one article repeating a claim isn't verification

### Common Traps

1. **Echo chamber effect** — many sites copy each other; try to find the original source when possible
2. **Amount inflation** — financial figures often get exaggerated in retellings
3. **Date drift** — "around 2015" vs "in 2015" vs "2015-07-30"
4. **Title inflation** — "advisor" vs "board member" vs "consultant"
5. **Relationship overstatement** — "worked with" vs "co-founded with"

---

## Cost Tracking

Same pattern as edges-1-opus:

```javascript
const costs = {
  opus: { input_tokens: 0, output_tokens: 0 },
  exa: { searches: 0, fetches: 0 },

  trackClaude(usage) { ... },
  trackExaSearch() { this.exa.searches++ },
  trackExaFetch() { this.exa.fetches++ },

  getEntityCost() {
    const opusCost = (this.opus.input_tokens * 15 + this.opus.output_tokens * 75) / 1_000_000
    const exaCost = (this.exa.searches + this.exa.fetches) * 0.01
    return { opus_usd: opusCost, exa_usd: exaCost, total_usd: opusCost + exaCost }
  }
}
```

### Estimated Costs

| Entity size | Claims | Searches | Est. cost |
|-------------|--------|----------|-----------|
| Small notes (~500 chars) | 5-10 | 10-15 | ~$0.50 |
| Medium notes (~1000 chars) | 10-20 | 15-25 | ~$1.00 |
| Large notes (~1500 chars) | 15-25 | 20-35 | ~$1.50 |

---

## Parallel Execution

Same pattern as edges-1-opus:

```javascript
async function runWithConcurrency(items, concurrency, fn) {
  const results = []
  let index = 0

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++
      const item = items[currentIndex]
      results[currentIndex] = await fn(item, currentIndex)
    }
  }

  await Promise.all(
    Array(Math.min(concurrency, items.length))
      .fill(null)
      .map(() => worker())
  )

  return results
}
```

Usage:
```bash
node notes-1-opus/run.js --csv=mapping-priority.csv --parallel=5 --write-db
```

---

## Progress Tracking

```json
// results/progress.json
{
  "completed": [133, 140, 181],
  "started_at": "2026-05-15T...",
  "last_entity_id": 181
}
```

Resume support:
```bash
node notes-1-opus/run.js --csv=... --parallel=5 --write-db --resume
```

---

## Output Files

```
notes-1-opus/
├── DESIGN.md                 # This document
├── run.js                    # Main pipeline (TODO)
├── prompts/
│   └── verify-notes.md       # System prompt (TODO)
├── migrations/
│   ├── create-note-correction-table.sql  # Staging only
│   └── create-note-claim-table.sql       # Both environments
└── results/
    ├── corrections.jsonl     # Per-entity results (append)
    ├── cost-ledger.jsonl     # Per-entity costs
    ├── progress.json         # Resume tracking
    ├── run-stats.json        # Final summary
    └── entities/
        └── {id}.json         # Detailed per-entity output
```

---

## Migration to Production

After review, corrections are applied:

```sql
-- Update entity notes
UPDATE entity
SET
  notes = nc.verified_notes,
  notes_confidence = CASE nc.confidence
    WHEN 'high' THEN 5
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 2
  END,
  notes_sources = (
    SELECT jsonb_agg(DISTINCT s.url)
    FROM note_claim ncl
    JOIN source s ON ncl.source_id = s.source_id
    WHERE ncl.entity_id = nc.entity_id AND ncl.verdict = 'supported'
  )::text
FROM note_correction nc
WHERE entity.id = nc.entity_id
  AND nc.status = 'pending'
  AND nc.pipeline = 'notes-1-opus';

-- Mark as applied
UPDATE note_correction
SET status = 'applied', applied_at = NOW(), applied_by = 'migration-script'
WHERE status = 'pending' AND pipeline = 'notes-1-opus';
```

---

## Resolved Decisions

1. **Batching** — No batching for v1. Most entities have <25 claims. Revisit if we hit entities with massive notes.

2. **Existing notes_sources** — Ignore. Don't pass to Opus. Search fresh and find proper sources independently.

3. **Overlap with edges** — Verify independently. Notes verification is about the text content; edges pipeline handles relationship data.

4. **Prefer primary sources** — official statements, company websites, press releases when available.

5. **Separate note_claim table** — Yes, keep separate from beliefs `claim` table for clean separation.

## Open Questions

1. **Confidence scoring** — How to aggregate per-claim confidence into overall confidence?
   - **Proposal:** high = 80%+ claims supported, medium = 50-80%, low = <50%

2. **Claim count threshold** — At what point is a notes field "too long" to verify in one call? (40+ claims?)

---

## Migration Commands

```bash
# 1. Create note_correction table (STAGING ONLY)
psql $STAGING_DATABASE_URL -f verification/notes-1-opus/migrations/create-note-correction-table.sql

# 2. Create note_claim table (BOTH environments)
psql $STAGING_DATABASE_URL -f verification/notes-1-opus/migrations/create-note-claim-table.sql
psql $DATABASE_URL -f verification/notes-1-opus/migrations/create-note-claim-table.sql
```

---

## Next Steps

1. [x] Create migration SQL files
2. [x] Run migrations (staging + production)
3. [x] Write system prompt (prompts/verify-notes.md)
4. [x] Implement run.js
5. [ ] Test on 2-3 entities
6. [ ] Run on priority list with --parallel=5
