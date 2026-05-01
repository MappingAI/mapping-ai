# Edge Enrichment: Post-Processing Roadmap

## Current State (April 30, 2026 - Post Final Entity QC)

### Edge Discoveries

| Status | Count | Description |
|--------|-------|-------------|
| `promoted` | 1,176 | ✅ Promoted to RDS production |
| `rejected` | 1,567 | ❌ Not AI-related, generic, or invalid |
| **Total** | **2,743** | After all processing |

### RDS Production

| Metric | Count |
|--------|-------|
| **Total approved entities** | **~1,891** |
| **Total edges** | **~3,297** |
| New entities (combined-v4) | 263 |
| New edges (from discovery) | 1,176 |

### Enrichment Quality (combined-v4)

| Metric | Count |
|--------|-------|
| Entities created | 279 |
| Duplicates merged (entity QC) | 7 |
| Duplicates merged (claims QC) | 1 |
| Duplicates merged (final QC) | 6 |
| Non-AI entities deleted | 2 |
| Final new entities | 263 |
| Quality issues fixed | 48+ field updates |
| Parent org assignments | 15 |
| Notes flagged for verification | 18 |

### Source Attribution (Claims)

| Metric | Count |
|--------|-------|
| Total claims | 1,752 |
| Combined-v4 claims created | 1,161 |
| Claims deleted (QC review) | 53 |
| Claims updated (stance/confidence) | 8 |
| Entities with admin-mixing notes | 3 |

### RDS Production Edges

| Metric | Count |
|--------|-------|
| Total edges | ~2,800 |
| Funding edges | ~550 |
| New funding edges (from discovery) | 431 |
| Edge evidence records | 2,224 |

### Multi-Source Edges

| Metric | Count |
|--------|-------|
| Edges with 2+ sources | 103 |
| Now tracked via `sources_count` column | ✅ |

### Edge Evidence (Temporal Data)

| Metric | Count |
|--------|-------|
| Total evidence records | 1,887 |
| With start_date | 1,221 (65%) |
| With end_date | 279 (15%) |

---

## Completed Steps ✅

### Step 0: Cleanup Orphan Edges ✅
- Fuzzy matched 53 edges (suffix stripping: "SoftBank Group" → "SoftBank")
- Deleted 992 tangential edges (neither entity in RDS)
- Deleted 1,133 orphaned entity suggestions
- Exported deleted data for recovery

### Step 0.5: Fix Wrong Matches ✅
- Fixed 13 DeepMind edges (was matched to "Ezra Klein" → now "Google DeepMind")
- Fixed 2 CEA edges (was matched to "Aether" → now unmatched)

### Step 0.6: AI Relevance Review ✅
- Exported 448 deduplicated edges for Claude review
- Claude identified ~93 non-AI-related edges
- Applied rejections (110 total rejected including self-referential)

### Step 0.7: Improved Enrichment Prompt ✅
- Updated `discover-funding.js` with AI-relevance requirements
- Added entity involvement check (searched entity must be funder OR recipient)
- Added server-side validation (AI keywords, no self-referential, entity involved)

### Step 0.8: Source Consolidation ✅
- Added `sources_count` and `updated_at` columns to edge_discovery
- Updated `discover-funding.js` to consolidate sources at discovery time (Option A)
- Ran consolidation script on existing data: 117 duplicate rows → 103 multi-source edges
- Script: `post-process/consolidate-duplicate-edges.js`

### Step 1.0: Promote Ready Edges ✅
- QC review: rejected 10 non-AI-related edges (mental health, RNA research, internal funding, etc.)
- Approved 337 edges that passed QC
- Promoted all 337 to RDS production
- Created 316 new funding edges + 21 already existed (evidence added)
- Script: `promote-discoveries.js`

### Step 1.1: Batch AI Relevance Review ✅
- Exported pending_entities edges in 4 batches (~530 each) for Claude.ai review
- Batch 1 (rows 1-1060): 190 rejections applied
- Batch 2 (rows 1061-2120): 238 rejections applied
- Batch 3 (rows 2121-3180): 219 rejections applied
- Batch 4 (rows 3181-3700): 222 rejections applied
- Also reviewed 187 promoted-from-merge edges: 28 rejections applied
- Scripts: `apply-pending-rejections-batch1.js` through `batch4.js`, `apply-promoted-merge-rejections.js`

### Step 1.2: Entity Review ✅
- Exported ~900 unique unmatched entities for Claude.ai review
- Categorized into CREATE (~235), MAP (~75), REJECT (~590)
- Applied REJECT entities: 378 edges rejected (generic aggregates, PACs, non-AI)
- Applied MAP entities: 106 edges updated, 51 duplicates merged
- Scripts: `reject-generic-entities.js`, `map-entity-aliases.js`

### Step 1.3: Cleanup Remaining Generics ✅
- Caught remaining PACs and generic entities: 21 more rejections
- Final state: 788 pending_entities edges, ~570 unique entities to create

---

## Key Decision: Breaking the Endless Loop

**The Problem:** Edge discovery → find unmatched entities → create entities → discover more edges → repeat forever

**The Decision:** We will NOT run edge discovery on newly created entities. Here's why:

1. **Scope boundary:** The ~570 new entities are "first-hop" connections from our core entities. Going another hop would explode scope exponentially.

2. **Diminishing returns:** Core stakeholders already have rich data. Adding obscure entities with 1-2 connections adds noise, not value.

3. **Quality over quantity:** Better to have 2,000 well-enriched entities than 10,000 skeleton entities.

**Boundary rule for new entities:**
- Must have 2+ edges to existing entities, OR
- Must be directly AI-relevant and submitted by a user, OR
- Must be a high-profile AI stakeholder (frontier labs, major funders, key researchers)

### Step 1.4: Final Entity Review ✅
- Exported 570 remaining unmatched entities for Claude.ai review
- Claude.ai categorization: 310 CREATE, 57 REJECT, 7 MAP
- Applied 57 REJECT entities: 39 edges rejected (PACs, generic aggregates, non-AI)
- Applied 7 MAP entities: 4 edges mapped, 3 duplicates deleted
- Notable: Self-referential graph errors found (University of Cambridge → University of Cambridge)
- Scripts: `apply-final-entity-rejections.js`, `map-entity-aliases.js` (updated)

### Step 1.5: Entity Overlap Check ✅
- Exported 516 CREATE entities + 1,635 existing RDS entities for Claude.ai overlap review
- Claude.ai found:
  - 20 exact duplicates (CREATE entities already exist in RDS)
  - 17 alias/variant mappings (CREATE → canonical RDS names)
  - 3 internal CREATE duplicates (merge before creating)
  - 11 internal RDS duplicates (7 confirmed, 4 investigate)
- Applied overlap mappings: 104 edges updated, 1 duplicate deleted
- 88 edges now ready to promote (both entity IDs set)
- Scripts: `export-entities-for-overlap.js`, `apply-overlap-mappings.js`
- Documented internal RDS duplicates: `docs/internal-rds-duplicates.md`

### Step 1.6: Promote Overlap-Linked Edges ✅
- Updated 88 edges from `pending_entities` to `approved` status
- Promoted all 88 to RDS production
- Created 72 new funding edges + 16 added evidence to existing edges
- Deleted 2 self-referential edges (University of Cambridge → University of Cambridge, etc.)
- Script: `promote-discoveries.js`

### Step 1.7: Clean Up Internal RDS Duplicates ✅
- Merged 7 confirmed duplicate entity pairs:
  - DAIR ↔ DAIR Institute
  - International Association for Safe and Ethical AI ↔ International Association for Safe & Ethical AI (IASEAI)
  - MIT CSAIL ↔ MIT Computer Science & Artificial Intelligence Laboratory
  - Survival and Flourishing Fund ↔ Survival & Flourishing Fund
  - Mila ↔ Mila - Quebec Artificial Intelligence Institute
  - Long-Term Future Fund ↔ LTFF
  - ML Alignment & Theory Scholars (MATS) ↔ SERI-MATS
- Updated 15 edges to point to canonical entity, deleted 12 duplicate edges
- Script: `merge-rds-duplicates.js`

### Step 1.8: Entity Enrichment (combined-v4) ✅
- Created 279 skeleton entities from unmatched edge_discovery names
- Ran `enrich-combined.js` to fill all RDS columns (notes, beliefs, categories, etc.)
- Cost: ~$85 (Exa + Claude)
- Script: `enrich-combined.js`

### Step 1.9: Claude.ai Quality Review ✅
- Exported 279 enriched entities to `docs/combined-v4-entities-full-review.json`
- Claude.ai reviewed for hallucinations, wrong categories, stance mismatches, duplicates
- Found 52 issues across 279 entities (quality: acceptable)
- Key issue types:
  - 7 duplicates (entities already exist in RDS under same name)
  - 10 wrong secondary categories (using influence_type values instead of categories)
  - 7 stance mismatches (over-inferred from single actions)
  - 12 hallucinations/unverified claims (specific $ figures, wrong attributions)
  - 5 name errors (.ai domain suffixes in names)
  - 4 importance inflation

### Step 1.10: Apply Review Fixes ✅
- Deleted 7 duplicate entities, remapped their edges to existing RDS entities:
  - Daron Acemoglu (#2085 → #52)
  - DAF-MIT AI Accelerator (#2119 → #1131)
  - Institute for Law & AI (#2064 → #429)
  - Lightcone Infrastructure (#2101 → #302)
  - London Initiative for Safe AI (#2092 → #203)
  - Tarbell Center for AI Journalism (#2278 → #136)
  - MARS Programme (#2114 → #194)
- Applied 31 field updates (categories, stances, importance, names)
- Fixed critical Lightspeed (#2102) hallucinations:
  - Removed false Greg Colbourn/PauseAI claim (he's not a Lightspeed partner)
  - Corrected SSI round: $2B@$32B → $1B@$5B (Sept 2024)
- Script: `apply-claude-review-fixes.js`
- **Remaining entities: 272** (279 - 7 duplicates)

### Step 1.11: Promote Edges to RDS ✅
- Updated 657 edges from `pending_entities` → `approved` status
- Promoted 657 edges to RDS production (268 new + 389 added evidence to existing)
- Total promoted edges: 1,176
- Total RDS edges: 3,306
- Script: `promote-discoveries.js`

### Step 1.12: Approve New Entities ✅
- Changed 272 combined-v4 entities from `pending` → `approved`
- Total approved entities: 1,900
- Script: inline SQL update

### Step 1.13: Notes Flagged for Manual Verification ⏳
18 notes contain unverified claims (specific $ figures, dates, names):
- Hugging Face Series C lead investor (Lux vs a16z)
- Intel $135M Element AI (may be total round)
- Ineffable $1.1B seed at $5.1B (verify record claim)
- Knight Foundation $27M (may be total initiative)
- Neel Nanda $250K Manifund (unusually large)
- NY State $300M Stony Brook (single source)
- And 12 others documented in `apply-claude-review-fixes.js`

### Step 1.14: Source Attribution (Claims Enrichment) ✅
- Ran `enrich-claims.js` on 272 combined-v4 entities
- **Results:** 272 entities processed, 1 error (UKRI - re-run successful)
- **Total claims created:** 1,161 (668 initial + UKRI retry)
- **Total cost:** $26.69
- Log: `docs/claims-enrichment-full-run.log`
- Script: `run-claims-enrichment-combined-v4.js`

### Step 1.15: Claims QC Review ✅
- Exported claims in 6 batches for Claude.ai review:
  - `docs/claims-review-batch-1.json` (50 entities, 208 claims)
  - `docs/claims-review-batch-2.json` (50 entities, 234 claims)
  - `docs/claims-review-batch-3.json` (50 entities, 208 claims)
  - `docs/claims-review-batch-4.json` (50 entities, 215 claims)
  - `docs/claims-review-batch-5.json` (50 entities, 209 claims) - includes UKRI
  - `docs/claims-review-batch-6.json` (22 entities, 86 claims)

**Batches 1-3 Review Complete (150 entities, 650 claims):**
- **14 issues found** across 150 entities (9.3% issue rate)
- **3 Critical:**
  - Accel (#2033): Wrong entity - claims are about Accel Partners VC, not Accel AI Institute (Berkeley)
  - Jim Mitre (#2224): Wrong entity - claims are about MITRE Corp, not individual Jim Mitre
  - Public First (#2261): Mixed entity - some claims about Public First (research firm), others about Public First Action (political advocacy)
- **6 High:**
  - Land Berlin (#2227): Wrong attributions - EU/national AI strategy claims attributed to state government
  - Innovate UK (#2217): Wrong claims - attributed national R&D strategies that are central government policy
  - Infosys Foundation (#2213): Missing evidence - regulatory_stance claims have no cited sources
  - Leverhulme Trust (#2230): Wrong focus - claims about AI research recipients, not the trust's own position
  - OSTP (#2253): Admin mixing - conflated Obama-era and Biden-era positions as single stance
- **5 Medium:**
  - Citation/confidence miscalibrations: third-party analyst reports marked "high" confidence, opposition politicians' blogs attributed to governments

**Batches 4-6 Review Complete (122 entities, 249 sourced claims):**
- **19 issues found** across 14 entities (11.5% issue rate)
- **2 Critical:**
  - Schmidt Fund (#2288): Duplicate of Schmidt Sciences (#2240) - same org, identical source IDs
  - Sierra (#2248): Ambiguous name - only source is sierraclub.org (environmental nonprofit), not AI company sierra.ai
- **8 High:**
  - Samsung SAIT (#2233) + Samsung Austin (#2234): Corporate AI ethics claims belong to Samsung Electronics (#2235)
  - UKRI (#2302): Gov.uk DSIT documents attributed to UKRI (UKRI only mentioned as partner)
  - Utah AG (#2266): Jeff Jackson quotes are NC AG, not Utah AG
  - QIA (#2204): Investment appetite ≠ regulatory stance (category error)
  - Truth Terminal (#2295): AI chatbot can't hold policy beliefs - claims are creator Andy Ayrey's views
  - CSU Sacramento (#2226): genai.calstate.edu is 23-campus system, not Sacramento specifically
  - FAIR (#2300): Superintelligence lab article attributed to FAIR (different Meta unit)
- **9 Medium:**
  - Truth Terminal: "Light-tooth" typo → "Light-touch"
  - Hoover Institution (#2263): Risk evaluation = Targeted, not Light-touch
  - Waymo (#2318): AV-specific lobbying ≠ general Accelerate stance
  - MacArthur Research Network (#2217): macfound.org = Foundation, not Research Network
  - Safeguarded AI (#2227): atlascomputing.org third-party summary, not ARIA
  - DFC (#2298): Biden/Trump admin stances merged without date-scoping
  - The Alignment Project (#2286): UK AISI programme, not independent entity
  - FAIR (#2300): forwardfuture.ai third-party blog for LeCun quotes
  - UKRI (#2302): AISI evaluations doc attributed to UKRI

**Combined Review Summary (All 6 Batches):**
- Total entities reviewed: 272
- Total claims reviewed: ~900
- Total issues found: 33 (14 batches 1-3 + 19 batches 4-6)
- Issue rate: ~12%
- Critical: 5, High: 14, Medium: 14

### Step 1.16: Apply Claims QC Fixes ✅
- Script: `apply-claims-review-fixes.js`
- **Entity-level fixes:**
  - Merged Schmidt Fund (#2288) → Schmidt Sciences (#2240): 1 edge remapped, 5 claims deleted
  - Renamed Sierra (#2248) → Sierra Club (disambiguation: sierraclub.org source)
  - Renamed Truth Terminal (#2295) → Andy Ayrey (AI chatbot → human creator)
- **Claims deleted (53 total):**
  - 26 claims from wrong entities: Jim Mitre (3), Land Berlin (6), Innovate UK (5), Infosys Foundation (7), Leverhulme Trust (5)
  - 22 specific wrong attributions: Samsung SAIT/Austin, UKRI, Utah AG, QIA, CSU Sacramento, FAIR
  - 5 claims from merged entity (Schmidt Fund)
- **Claims updated (4):**
  - Fixed "Light-tooth" → "Light-touch" typo
  - Hoover Institution: Light-touch → Targeted
  - Waymo: Accelerate → Targeted (AV-specific lobbying)
- **Confidence downgrades (4):**
  - Safeguarded AI: 3 claims → low (third-party atlascomputing.org)
  - FAIR: 1 claim → low (third-party forwardfuture.ai)
- **Entity notes added (3):**
  - OSTP (#2173): Admin-mixing context note
  - DFC (#2298): Admin-mixing context note
  - Public First (#2201): Disambiguation note (vs Public First Action)
- **Final state:**
  - Total claims: 1,752 (includes claims from earlier enrichment runs)
  - Approved entities: 1,899 (down 1 from merge)
  - Combined-v4 entities: 271 (down 1 from merge)

### Step 1.17: Auto-Fix Field Value Issues ✅
- **Identified issues via form validation check:**
  - 251 entities with invalid `belief_evidence_source` ("Inferred from actions/associations")
  - 60 entities with invalid categories (person categories wrong)
  - 58 entities with invalid `belief_threat_models` ("Privacy", "Weapons proliferation")
  - 23 claims with invalid confidence value ("unverified")
  - 83 entities potentially needing parent_org assignment
  - 16 potential duplicates with existing entities
- **Auto-fixes applied:**
  - 251 evidence source: "Inferred from actions/associations" → "Inferred from actions"
  - 1 person category: "Researcher/analyst" → "Researcher"
  - 10 person category: "VC/Capital/Philanthropy" → "Investor"
  - 16 threat model: "Weapons proliferation" → "Weapons"
  - 42 threat model: removed invalid "Privacy"
  - 23 claims: confidence "unverified" → "low"
- **Note:** Category values "Deployers & Platforms" and "Infrastructure & Compute" are CORRECT (no "AI " prefix). Reverted any erroneous prefix additions.

### Step 1.18: Final Entity QC Review ✅
- Exported `docs/combined-v4-full-review.json` (862KB) for Claude.ai review
- **Claude.ai reviewed all 271 combined-v4 entities and identified:**
  - 5 merges with existing entities
  - 1 internal duplicate
  - 17 parent org assignments
  - 25+ field fixes
  - 2 deletions (no AI relevance)
- **Script:** `apply-final-entity-fixes.js`
- **Results:**
  - 6 entities merged (Johns Hopkins APL, LASR Labs, NIH, OSTP, TU Berlin, Mellon Foundation)
  - 2 entities deleted (NC General Assembly, Utah AG's Office)
  - 9 edges remapped to existing entities
  - 7 parent orgs assigned (Samsung family, Sony family, corporate VC arms, UK FAIR → UKRI)
  - 17 fields fixed (category, stance, importance, names)
- **Critical fix:** Sierra Club (#2248) → Sierra (AI startup sierra.ai)
- **Final entity count:** 263 combined-v4 entities

### Step 1.19: Additional Parent Org Assignments ✅
- Applied 8 additional parent relationships based on entity name analysis:
  - Mozilla Ventures → Mozilla Foundation
  - Mozilla Technology Fund → Mozilla Foundation
  - Public Interest Tech Lab → Harvard University
  - MIT Lincoln Laboratory → MIT
  - Schwartz Reisman Institute → University of Toronto
  - Wharton Mack Institute → University of Pennsylvania
  - University of Cambridge Enterprise Fund → University of Cambridge
  - Vanderbilt University Institute → Vanderbilt University
- **Total parent assignments:** 15 (7 from Claude.ai + 8 additional)

### Step 1.20: Threat Model Truncation ✅
- 48 entities had >3 threat model values (max allowed: 3)
- Exported `docs/threat-models-truncation-review.json` for Claude.ai review
- Claude.ai selected best 3 values for each entity based on notes/evidence
- **Script:** `apply-threat-model-truncations.js`
- **Results:** 46 entities updated, 2 skipped (already merged)

### Step 1.21: Entity Naming Review ✅
- Exported `docs/entity-naming-review-full.json` (263 entities) for Claude.ai review
- Claude.ai identified 51 names to standardize + 7 parent org assignments
- **Script:** `apply-entity-naming-fixes.js`
- **Results:**
  - 51 names standardized (removed "The" prefix, legal suffixes, redundant parentheticals)
  - 6 parent orgs assigned (Hoover→Stanford, MIT labs→MIT, NYU CMEP→NYU, etc.)
  - 1 skipped (UC Investments - "University of California" not in DB)
  - 6 entities need new parent orgs created (KAUST, HSBC, TDK Corp, etc.)
- **Flagged for manual review:**
  - Samsung (#2232) vs Samsung Electronics (#2235) - potential duplicate

---

## Remaining Roadmap (Final Steps)

### Phase 2: Create Skeleton Entities in RDS

**Step 2.1: Export approved CREATE entities**
- ~310 entities approved in final entity review
- Export with name, type (person/org), category (if inferrable)
- Script: `export-create-entities.js` (to be created)

**Step 2.2: Batch create entities in RDS**
- Script: `create-skeleton-entities.js` (to be created)
- Skeleton entities: name + type only, no enriched data
- Sets status='pending' for future human review
- Assigns RDS entity IDs

**Step 2.3: Run entity matching on pending_entities edges**
- Script: `match-pending-entities.js` (to be created)
- Links edge_discovery source/target names to new RDS entity IDs
- Updates status: `pending_entities` → `pending_review`

---

### Phase 3: Final Edge Promotion

**Step 3.1: Promote matched edges to RDS production**
- Script: `promote-discoveries.js`
- ~746 edges ready after entity matching
- Creates new funding edges with source attribution

**Step 3.2: Apply edge evidence to existing edges**
- 1,887 temporal data records (start_date, end_date)
- Updates existing edges with temporal data

**Step 3.3: Regenerate map-data.json**
- `pnpm run db:export-map`
- Reflects new entities and edges on the map

---

### Phase 4: Full Entity Enrichment Pipeline

**Required for all new skeleton entities (~481 to create)**

The enrichment pipeline uses multiple scripts that target different fields. All scripts are on the main branch.

#### Database Architecture

| Database | Table | Purpose |
|----------|-------|---------|
| **RDS** | `entity` | Primary entity data (name, type, category, notes, beliefs, thumbnail) |
| **RDS** | `edge` | Relationships between entities |
| **Neon** | `source` | Evidence/citations deduplicated by URL (source_id = sha256(url)[:12]) |
| **Neon** | `claim` | Entity-dimension-source claims with verbatim citations |

#### Step 4.1: Notes Enrichment (enrich-v2.js)

**Anti-hallucination design with confidence scoring**

```bash
node scripts/enrich-v2.js --id=<entity_id>    # Single entity
node scripts/enrich-v2.js --people            # All people
node scripts/enrich-v2.js --orgs              # All orgs
```

**Updates RDS entity table:**
| Field | Description |
|-------|-------------|
| `notes` | 2-4 sentences of sourced facts (max 3000 chars) |
| `notes_confidence` | 1-5 confidence score |
| `notes_sources` | JSON array of source URLs |
| `enrichment_version` | 'v2' or 'v2-insufficient' |

**Key rules:**
- Only include facts from Exa search results
- If sources insufficient → returns `INSUFFICIENT_DATA`
- Creates edges only if confidence >= 3 with exact source quote
- Cost: ~$0.08/entity

#### Step 4.2: Deep Enrichment (enrich-deep.js / enrich-deep-orgs.js)

**Fills belief stances and detailed fields**

```bash
node scripts/enrich-deep.js --id=<entity_id>       # Single person
node scripts/enrich-deep-orgs.js --id=<entity_id>  # Single org
```

**Updates RDS entity table:**
| Field | Description |
|-------|-------------|
| `title` | Job title (people) |
| `location` | City, State/Country |
| `belief_regulatory_stance` | Accelerate/Light-touch/Targeted/Moderate/Restrictive/Precautionary |
| `belief_regulatory_stance_detail` | 1-3 sentence explanation with evidence |
| `belief_evidence_source` | Explicitly stated / Inferred from actions / Inferred from associations |
| `belief_agi_timeline` | Already here / 2-3 years / 5-10 years / 10-25 years / 25+ years / Never |
| `belief_ai_risk` | Overstated / Manageable / Serious / Catastrophic / Existential |
| `belief_threat_models` | Specific concerns (max 3) |
| `influence_type` | Decision-maker / Researcher / Funder / Builder / Organizer / etc. |
| `twitter` | Verified @handle |
| `other_orgs` | Additional affiliations |

**Cost:** ~$0.15/entity

#### Step 4.3: Source Attribution / Claims (enrich-claims.js) ← Anushree's work

**Creates sourced claims with verbatim citations for belief dimensions**

```bash
PILOT_DB="postgresql://..." node scripts/enrich-claims.js --id=<entity_id>
PILOT_DB="postgresql://..." node scripts/enrich-claims.js --limit=20
```

**Writes to Neon:**
- `source` table: Evidence URLs with metadata
- `claim` table: One row per entity-dimension-source with:
  - `belief_dimension`: regulatory_stance / agi_timeline / ai_risk_level / agi_definition
  - `stance`: Text label from scale
  - `stance_score`: Ordinal score
  - `citation`: Verbatim quote from source
  - `claim_type`: direct_statement / authored_position / inferred_from_action
  - `confidence`: high / medium / low / unverified

**Cost:** ~$0.08/entity (4 Exa searches + 1 Claude call)

#### Step 4.4: Thumbnails (resolve-thumbnails.js)

```bash
node scripts/resolve-thumbnails.js --id=<entity_id>
```

**Updates:** `thumbnail_url` field

**Cost:** ~$0.01/entity

#### Step 4.5: Additional Scripts (as needed)

| Script | Purpose | When to use |
|--------|---------|-------------|
| `enrich-crosspartisan.js` | Policy-area claims for policymakers | 6 specific policy dimensions |
| `enrich-resources.js` | Resource metadata + claims | For resource entities only |
| `enrich-elections.js` | Election candidates/PACs | Election-related entities |

#### Enrichment Order (Recommended)

```
1. enrich-v2.js        → Notes + confidence + sources
2. enrich-deep.js      → Belief stances + influence type (people)
   enrich-deep-orgs.js → Belief stances + funding model (orgs)
3. enrich-claims.js    → Source attribution for beliefs
4. resolve-thumbnails  → Profile images
```

#### Entity Column Coverage (Current)

| Field | % Filled | Script |
|-------|----------|--------|
| entity_type | 100% | skeleton creation |
| name | 100% | skeleton creation |
| notes | 100% | enrich-v2.js |
| enrichment_version | 100% | enrich-v2.js |
| importance | 100% | manual/rules |
| category | 94% | skeleton creation / inferred |
| thumbnail_url | 91% | resolve-thumbnails.js |
| influence_type | 84% | enrich-deep.js |
| belief_ai_risk | 79% | enrich-deep.js |
| belief_evidence_source | 79% | enrich-deep.js |
| belief_agi_timeline | 77% | enrich-deep.js |
| belief_regulatory_stance | 77% | enrich-deep.js |
| notes_sources | 69% | enrich-v2.js |
| notes_confidence | 64% | enrich-v2.js |

**Estimated total cost for 481 new entities:** ~$75-150

---

### ⚠️ Boundary Rule: No Second-Pass Discovery

Per the "Breaking the Endless Loop" decision above:
- We will NOT run `discover-funding.js` on the newly created entities
- These are "first-hop" connections; another hop would explode scope
- Future edge discovery only for user-submitted entities or high-profile stakeholders

---

### Phase 5: Final Steps

**Step 5.1: Regenerate map-data.json**
```bash
pnpm run db:export-map
```

**Step 5.2: Verify on map**
- Check new entities appear correctly
- Verify edges are displayed
- Test search finds new entities

---

## Decision Points

### Decision 1: Entity Suggestion Classification Approach

| Approach | Cost | Accuracy | Time |
|----------|------|----------|------|
| A. Rules-only | $0 | ~80% | 10 min |
| B. Exa verification | ~$15 | ~90% | 1 hour |
| C. Claude batch review | ~$5 | ~95% | 30 min |
| D. Manual review | $0 | 100% | 4+ hours |

**Recommendation:** Option C for high-value (seen 2+ times), Option A for single-occurrence

### Decision 2: New Entity Creation Threshold

Should we create ALL approved suggestions, or only high-confidence ones?

| Threshold | Entities Created | Risk |
|-----------|-----------------|------|
| All approved | ~1,500 | More noise in RDS |
| Seen 2+ times | ~400 | Miss real single-occurrence entities |
| With funding amount | ~800 | Good balance |

**Recommendation:** Create entities with funding amounts first, review rest later

### Decision 3: Enrichment Priority

Which new entities to enrich first?

| Priority | Criteria | Count |
|----------|----------|-------|
| P0 | AI labs, safety orgs | ~50 |
| P1 | VCs, foundations | ~200 |
| P2 | Other tech companies | ~300 |
| P3 | Everything else | ~500+ |

---

## Cost Estimates

| Phase | Estimated Cost |
|-------|---------------|
| Phase 1 (Promote) | $0 |
| Phase 2 (Entity classification) | $5-20 |
| Phase 3 (Entity creation) | $0 |
| Phase 4 (Enrichment) | $25-50 |
| Phase 5 (Second-pass) | $20-40 |
| **Total** | **$50-110** |

---

## Scripts Reference

| Script | Purpose | Status |
|--------|---------|--------|
| `post-process/post-process-0-cleanup-orphans.js` | Delete tangential edges | ✅ Done |
| `post-process/post-process-1-merge-duplicates.js` | Merge known duplicates | ⏳ Ready |
| `post-process/post-process-2-reject-generic.js` | Reject generic names | ⏳ Ready |
| `post-process/post-process-4-smart-filter.js` | AI relevance filter | ⏳ Ready |
| `post-process/apply-review-rejections.js` | Apply Claude review | ✅ Done |
| `post-process/apply-pending-rejections-batch1-4.js` | Apply batch edge rejections | ✅ Done |
| `post-process/apply-final-entity-rejections.js` | Apply final entity rejections | ✅ Done |
| `post-process/apply-overlap-mappings.js` | Apply overlap mappings to RDS | ✅ Done |
| `post-process/export-entities-for-overlap.js` | Export entities for overlap check | ✅ Done |
| `post-process/reject-generic-entities.js` | Reject generic entity edges | ✅ Done |
| `post-process/map-entity-aliases.js` | Map entity aliases to canonical | ✅ Done |
| `post-process/consolidate-duplicate-edges.js` | Consolidate multi-source edges | ✅ Done |
| `post-process/promote-discoveries.js` | Promote edges to RDS | ⏳ Ready |
| `post-process/export-pending-review.js` | Export for review | ✅ Done |
| `discover-funding.js` | Discover funding relationships | ✅ Updated (w/ source consolidation) |
| `enrich-edges.js` | Add temporal data | ⏳ Ready |
| `enrich-org-lifecycle.js` | Add founding dates | ⏳ Ready |

---

## Quick Start: Next Actions

```bash
# 1. Create ~310 skeleton entities in RDS (script to be created)
node scripts/edge-enrichment/post-process/create-skeleton-entities.js --dry-run
node scripts/edge-enrichment/post-process/create-skeleton-entities.js --apply

# 2. Run entity matching on pending_entities edges
node scripts/edge-enrichment/post-process/match-pending-entities.js --dry-run
node scripts/edge-enrichment/post-process/match-pending-entities.js --apply

# 3. Promote matched edges to RDS
node scripts/edge-enrichment/post-process/promote-discoveries.js --dry-run
node scripts/edge-enrichment/post-process/promote-discoveries.js --apply

# 4. Export remaining suggestions for review
node scripts/edge-enrichment/post-process/export-entity-suggestions.js
```

---

## Appendix: Enrichment Run Summary (April 28, 2026)

**Total Cost:** $84.43 (Exa: $30.91, Anthropic: $53.51)

### Original Counts (Before Post-Processing)

| Metric | Count |
|--------|-------|
| Edge discoveries | 3,907 |
| Entity suggestions | 3,014 |
| Edge evidence | 1,887 |
| Lifecycle claims | 645 |

### After Post-Processing (Current)

| Metric | Count |
|--------|-------|
| Edge discoveries | 2,915 |
| Entity suggestions | 1,881 |
| Rejected edges | 110 |
| Deleted (tangential) | 992 |
