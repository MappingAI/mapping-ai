# Enrichment Pipeline v2: Design Document

## Problem Statement

The current enrichment pipeline (`enrich-deep.js`, `enrich-deep-orgs.js`) produces hallucinations in the `notes` field. Example: Joi Ito is incorrectly attributed with winning the 2018 Turing Award (it was Hinton, LeCun, and Bengio).

**Root causes:**
1. LLM is prompted to generate "SPECIFIC facts" without requiring source citations
2. No verification step to check if generated facts appear in source material
3. No confidence scoring to filter display of uncertain information
4. Validation only checks enum values and string lengths, not factual accuracy

**Additional opportunity:** Edge data is severely underutilized (only 2 person-to-person edges in entire database). Enrichment can extract relationship data simultaneously.

---

## Current State

### Entity Schema (enrichment-relevant fields)
```sql
notes              TEXT     -- Plain text (hallucination-prone)
notes_html         TEXT     -- Rich text version
belief_*           TEXT     -- Stance/position enums
-- NO confidence field exists
-- NO source citation field exists
```

### Edge Schema
```sql
source_id          INT      -- Entity FK
target_id          INT      -- Entity FK
edge_type          TEXT     -- affiliated, employed_by, funder, etc.
role               TEXT     -- Context (e.g., "CEO", "Board Member")
evidence           TEXT     -- Source citation (mostly NULL currently)
is_primary         BOOLEAN  -- Primary affiliation flag
```

### Current Edge Distribution
- `affiliated`: 415 (generic, no context)
- `employed_by`: 152
- `subsidiary_of`: 31
- `funder`: 17
- **Person-to-person edges: only 2** (collaborator, former_colleague)

### Entities Without Edges
- Organizations: 219
- People: 6
- Resources: 119

---

## Proposed Solution

### 1. Schema Changes

```sql
-- Add to entity table
ALTER TABLE entity ADD COLUMN notes_confidence SMALLINT;  -- 1-5 scale
ALTER TABLE entity ADD COLUMN notes_sources TEXT;         -- JSON array of URLs
ALTER TABLE entity ADD COLUMN enrichment_version TEXT;    -- Track which script version

-- Optional: Add verification tracking
ALTER TABLE entity ADD COLUMN last_verified_at TIMESTAMPTZ;
ALTER TABLE entity ADD COLUMN verification_score SMALLINT;  -- 1-5 scale
```

### 2. Standardized Edge Types

Consolidate and expand edge types:

**Person → Organization:**
- `employed_by` - Current/past employment (use `role` for title)
- `founded` - Founder relationship
- `advises` - Advisory role
- `board_member` - Board position
- `invested_in` - Investment relationship (for investors)

**Person → Person:**
- `co_founded_with` - Co-founder relationship
- `collaborator` - Research/work collaboration
- `mentor_of` / `mentored_by` - Mentorship
- `former_colleague` - Past work together
- `critic_of` - Public disagreement/criticism
- `supporter_of` - Public endorsement/support

**Organization → Organization:**
- `subsidiary_of` - Parent-child org
- `funded_by` - Funding relationship
- `partner_of` - Formal partnership
- `spun_out_from` - Spinoff origin

**Resource → Entity:**
- `authored_by` - Author relationship
- `published_by` - Publisher relationship
- `about` - Resource discusses entity

### 3. Source-Grounded Prompt Design

**Key changes from current approach:**

```
CRITICAL: Every factual claim in your response MUST:
1. Be directly supported by text in the search results
2. Include a bracketed source reference [Source N]
3. NOT include any information you "know" but don't see in the sources

If the search results don't contain information about something, say "Not found in sources" rather than guessing.

FORBIDDEN (hallucination triggers):
- Specific award years unless explicitly stated in sources
- Dollar amounts unless explicitly stated
- Founding dates unless explicitly stated
- Publication titles unless explicitly stated
- Any claim starting with "is known for" or "is famous for" without a source
```

### 4. Confidence Scoring

The LLM will assign confidence based on:

```json
{
  "notes_confidence": 4,  // 1-5 scale
  "confidence_reasoning": {
    "sources_count": 8,           // How many sources discussed this entity
    "claims_verified": 5,         // Claims with direct source support
    "claims_inferred": 2,         // Claims inferred from context
    "contradictions_found": 0,    // Conflicting information
    "recency": "2024-2025"        // How recent are the sources
  }
}
```

**Confidence scale:**
- 5: Multiple recent sources, all claims directly verifiable
- 4: Good source coverage, most claims verifiable
- 3: Limited sources, some inference required
- 2: Sparse sources, significant inference
- 1: Minimal sources, low confidence

**Map display:** Only show `notes` for entities with `notes_confidence >= 3`

### 5. Edge Extraction

During enrichment, extract relationships mentioned in sources:

```json
{
  "extracted_edges": [
    {
      "target_name": "OpenAI",
      "target_type": "organization",
      "edge_type": "founded",
      "role": "Co-founder",
      "evidence": "Co-founded OpenAI in 2015 [Source 3]",
      "confidence": 5
    },
    {
      "target_name": "Dario Amodei",
      "target_type": "person",
      "edge_type": "former_colleague",
      "evidence": "Worked together at OpenAI before Amodei left to found Anthropic [Source 7]",
      "confidence": 4
    }
  ]
}
```

### 6. Self-Verification Sampling

Every 10 entities, run a verification pass:

1. Take 3 random claims from the generated notes
2. Run targeted Exa searches for each claim
3. Ask Claude: "Does the search result support, contradict, or not address this claim?"
4. Track verification rate across the run
5. If verification rate drops below 70%, pause and alert

---

## Implementation Plan

### Phase 1: Schema Migration
1. Add new columns to entity table
2. Backfill `enrichment_version = 'v1'` for existing notes
3. No data loss, additive only

### Phase 2: Build Enrichment Script v2
1. New file: `scripts/enrich-v2.js`
2. Source-grounded prompt with citation requirements
3. Confidence scoring output
4. Edge extraction output
5. Verification sampling loop

### Phase 3: Test on Sample
1. Select 10 diverse entities (mix of categories, with/without existing notes)
2. Run enrichment v2
3. Manual review of outputs
4. Compare to v1 outputs for same entities
5. Iterate on prompt if needed

### Phase 4: Edge Resolution
1. Match extracted edge targets to existing entities
2. Fuzzy matching for org names
3. Create missing orgs if confident
4. Insert edges with evidence

### Phase 5: Map Integration
1. Update `export-map-data.js` to include confidence
2. Update `map.html` to filter notes by confidence threshold
3. Add UI indicator for confidence level

### Phase 6: Full Run
1. Run on all entities with `enrichment_version != 'v2'`
2. Monitor verification sampling
3. Manual review of low-confidence results

---

## Output Schema (per entity)

```json
{
  "entity_id": 70,
  "name": "Joi Ito",

  "notes": "Former Director of MIT Media Lab (2011-2019) [Source 1]. Currently President of Chiba Institute of Technology [Source 2]. Early investor in Twitter, Kickstarter, and Flickr [Source 3]. Resigned from MIT in September 2019 following revelations about financial ties to Jeffrey Epstein [Source 1, 4]. Known for '9 Principles' philosophy emphasizing emergence over authority [Source 5].",

  "notes_confidence": 4,
  "notes_sources": [
    "https://en.wikipedia.org/wiki/Joi_Ito",
    "https://www.nytimes.com/2019/09/07/business/mit-media-lab-jeffrey-epstein-joichi-ito.html",
    "https://joi.ito.com/about"
  ],

  "extracted_edges": [
    {
      "target_name": "MIT Media Lab",
      "edge_type": "employed_by",
      "role": "Director (2011-2019)",
      "evidence": "Served as director from 2011 until resignation in 2019 [Source 1]",
      "confidence": 5
    },
    {
      "target_name": "Chiba Institute of Technology",
      "edge_type": "employed_by",
      "role": "President",
      "evidence": "Currently serves as President [Source 2]",
      "confidence": 5
    },
    {
      "target_name": "Twitter",
      "edge_type": "invested_in",
      "evidence": "Early investor [Source 3]",
      "confidence": 4
    }
  ],

  "verification": {
    "claims_checked": 5,
    "claims_verified": 5,
    "claims_contradicted": 0,
    "verification_score": 5
  },

  "enrichment_version": "v2",
  "enriched_at": "2026-04-07T..."
}
```

---

## Comparison: v1 vs v2

| Aspect | v1 (Current) | v2 (Proposed) |
|--------|--------------|---------------|
| Notes generation | "Write specific facts" | "Only cite from sources" |
| Hallucination risk | HIGH | LOW |
| Source citations | None | Required for every claim |
| Confidence scoring | None | 1-5 scale |
| Self-verification | None | Every 10 entities |
| Edge extraction | Separate scripts | Integrated |
| Map filtering | Show all notes | Show only confidence ≥3 |

---

## Risk Mitigation

1. **Backup before running**: `npm run db:backup`
2. **Test on 10 entities first**: Manual review before full run
3. **Keep v1 notes**: Store in `notes_v1` column, don't delete
4. **Verification sampling**: Auto-pause if accuracy drops
5. **Rollback capability**: Can restore from backup if needed

---

## Cost Estimate

Per entity:
- Exa searches: ~5 @ $0.01 = $0.05
- Claude Sonnet (enrichment): ~1500 tokens @ $3/$15 per 1M = ~$0.025
- Claude Sonnet (verification, 30% of entities): ~$0.008

**Total per entity: ~$0.08**

For 858 entities with notes: ~$70
For 1019 total entities: ~$82

---

## Next Steps

1. Review this design document
2. Approve schema changes
3. Build `enrich-v2.js` with test mode
4. Test on 10 sample entities
5. Review outputs, iterate if needed
6. Full run with monitoring
