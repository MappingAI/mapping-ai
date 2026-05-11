# Belief Field Verification Pipeline

Multi-agent adversarial pipeline for verifying and correcting entity belief fields.

## Overview

This pipeline verifies belief fields (`belief_regulatory_stance`, `belief_agi_timeline`, `belief_ai_risk`, `belief_threat_models`) using an 8-agent adversarial debate architecture. It produces **actionable corrections** with full source attribution, not just verification tags.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VERIFICATION PIPELINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐                                                          │
│   │  Entity DB   │──▶ Get entity + existing claims                          │
│   └──────────────┘                                                          │
│          │                                                                   │
│          ▼                                                                   │
│   ┌──────────────┐                                                          │
│   │  Decomposer  │──▶ Generate search queries (Sonnet)                      │
│   └──────────────┘                                                          │
│          │                                                                   │
│          ▼                                                                   │
│   ┌──────────────────────────────────┐                                      │
│   │     Parallel Search (Exa)        │                                      │
│   │  Prosecutor        Defender      │                                      │
│   │  (find evidence    (find evidence│                                      │
│   │   AGAINST value)   FOR value)    │                                      │
│   └──────────────────────────────────┘                                      │
│          │                                                                   │
│          ▼                                                                   │
│   ┌──────────────────────────────────┐                                      │
│   │   Parallel Attribution (Sonnet)  │                                      │
│   │  Extract speaker, subject,       │                                      │
│   │  attribution_type from sources   │                                      │
│   └──────────────────────────────────┘                                      │
│          │                                                                   │
│          ▼                                                                   │
│   ┌──────────────────────────────────┐                                      │
│   │    Parallel Debate (Sonnet)      │                                      │
│   │  Prosecutor        Defender      │                                      │
│   │  argues WRONG      argues RIGHT  │                                      │
│   └──────────────────────────────────┘                                      │
│          │                                                                   │
│          ▼                                                                   │
│   ┌──────────────┐                                                          │
│   │    Judge     │──▶ Renders verdict (Opus)                                │
│   └──────────────┘                                                          │
│          │                                                                   │
│          ▼                                                                   │
│   ┌──────────────┐                                                          │
│   │  Validation  │──▶ Enum validation (programmatic, no LLM)                │
│   └──────────────┘                                                          │
│          │                                                                   │
│          ▼                                                                   │
│   ┌──────────────┐                                                          │
│   │   STAGING DB │──▶ belief_correction table                               │
│   └──────────────┘                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Design Principles

### 1. Information Asymmetry
- **Prosecutor** searches for evidence AGAINST the current value
- **Defender** searches for evidence FOR the current value
- **Judge** sees ONLY the debate transcript, not original data or search results

### 2. First-Person Evidence Requirement
- Corrections require at least one `first_person` statement (direct quote)
- Third-party characterizations alone are NOT sufficient for correction
- This prevents over-reliance on secondary sources

### 3. Programmatic Enum Validation
- Proposed values are validated against `belief-enums.js` (not by agents)
- Invalid values are normalized if possible, rejected if not
- Saves tokens by not asking agents to validate enums

### 4. Full Traceability
- Every correction links to its supporting source and claim
- Tracks which existing claims are superseded
- Debate arguments preserved for audit

## Database Schema

### belief_correction (STAGING_DB)

```sql
-- Identity
id                    SERIAL PRIMARY KEY
entity_id             INTEGER REFERENCES entity(id)
entity_type           VARCHAR(20)
entity_name           VARCHAR(200)
field                 VARCHAR(50)        -- e.g., 'belief_regulatory_stance'

-- The change
current_value         VARCHAR(200)       -- what's in entity now
proposed_value        VARCHAR(200)       -- enum-validated new value
verdict               VARCHAR(20)        -- confirm/correct/remove
confidence            VARCHAR(20)        -- high/medium/low

-- Source attribution (what we're adding)
source_url            TEXT
citation              TEXT
new_source_id         VARCHAR(50)        -- FK to source table
new_claim_id          VARCHAR(100)       -- FK to claim table

-- What we're replacing
superseded_claim_ids  TEXT[]             -- existing claim IDs being superseded

-- Debate record (truncated to ~1000 chars each)
prosecutor_argument   TEXT
defender_argument     TEXT
judge_reasoning       TEXT
evidence_assessment   JSONB

-- Status lifecycle
status                VARCHAR(20)        -- pending → applied → promoted
created_at            TIMESTAMPTZ
applied_at            TIMESTAMPTZ
promoted_at           TIMESTAMPTZ
```

## Data Flow

### Stage 1: Verification (run-belief-verification.js)

```
Entity (STAGING_DB)
    │
    ├── Query existing claims for this field
    │
    ├── Run 8-agent pipeline (7 Sonnet + 1 Opus)
    │
    └── Write to belief_correction table
        └── status = 'pending'
```

### Stage 2: Apply Corrections (write-corrections.js)

```
belief_correction (status = 'pending')
    │
    ├── Create source record (STAGING_DB)
    │
    ├── Create claim record (STAGING_DB)
    │
    ├── Update belief_correction with source_id, claim_id
    │
    ├── Update entity belief field (STAGING_DB)
    │
    └── Set status = 'applied'
```

### Stage 3: Promote to Production (TODO)

```
belief_correction (status = 'applied')
    │
    ├── Copy source record → PILOT_DB
    │
    ├── Copy claim record → PILOT_DB
    │
    ├── Update entity belief field → PRODUCTION
    │
    └── Set status = 'promoted'
```

## Usage

### Run verification on entities

```bash
# Single entity
node run-belief-verification.js --id=11

# Multiple entities
node run-belief-verification.js --limit=10

# All entities with beliefs
node run-belief-verification.js --all --resume
```

### Review corrections

```bash
# Dry run - see what would be applied
node write-corrections.js --dry-run --confidence=medium

# Interactive review
node write-corrections.js --review --confidence=medium

# Apply high-confidence corrections only
node write-corrections.js --confidence=high
```

## Cost Estimate

Per belief field verified:
- 7 Sonnet calls: ~$0.40
- 1 Opus call: ~$0.20
- 2 Exa searches: ~$0.02
- **Total: ~$0.62 per field**

For an entity with 4 belief fields: ~$2.50

## Valid Enum Values

All proposed values must match exactly (from `belief-enums.js`):

### belief_regulatory_stance
`Accelerate`, `Light-touch`, `Targeted`, `Moderate`, `Precautionary`, `Restrictive`, `Nationalize`, `Mixed/unclear`, `Other`

### belief_agi_timeline
`Already here`, `2-3 years`, `5-10 years`, `10-25 years`, `25+ years or never`, `Ill-defined`, `Unknown`, `Mixed/unclear`

### belief_ai_risk
`Overstated`, `Manageable`, `Serious`, `Catastrophic`, `Existential`, `Mixed/nuanced`, `Unknown`

### belief_threat_models (pick up to 3)
`Labor displacement`, `Economic inequality`, `Power concentration`, `Democratic erosion`, `Cybersecurity`, `Misinformation`, `Environmental`, `Weapons`, `Loss of control`, `Copyright/IP`, `Existential risk`

## Verdicts

| Verdict | Meaning | Action |
|---------|---------|--------|
| `confirm` | Current value is correct | Add new source as supporting evidence |
| `correct` | Current value is wrong | Update entity, add new source/claim |
| `remove` | No supporting evidence | Set field to NULL |

## Timing & Cost Tracking

After each run, stats are written to `results/run-stats.json`:

```json
{
  "run_started_at": "2026-05-11T01:30:00.000Z",
  "run_ended_at": "2026-05-11T01:32:45.000Z",
  "total_duration_ms": 165000,
  "entities_processed": 5,
  "fields_verified": 15,
  "avg_ms_per_entity": 33000,
  "claude_calls": 120,
  "claude_input_tokens": 450000,
  "claude_output_tokens": 75000,
  "sonnet_cost_usd": 2.475,
  "opus_cost_usd": 1.125,
  "exa_searches": 30,
  "exa_cost_usd": 0.24,
  "total_cost_usd": 3.84,
  "verdicts": {
    "confirm": 10,
    "correct": 3,
    "remove": 2
  }
}
```

**Checkpoints**: The pipeline writes to the database after each field and tracks completed entity IDs in `belief-verification-progress.json`. Use `--resume` to continue after interruption.

## Files

```
verification/
├── run-belief-verification.js   # Main pipeline (8 agents)
├── write-corrections.js         # Apply corrections to DB
├── beliefs/
│   └── README.md                # This file
├── agents/prompts/beliefs/
│   ├── decomposer.md            # Search query generation
│   ├── attribution.md           # Extract speaker/subject/type
│   ├── prosecutor.md            # Argue value is WRONG
│   ├── defender.md              # Argue value is CORRECT
│   └── judge.md                 # Render verdict (Opus)
├── lib/
│   ├── belief-enums.js          # Valid values + validation
│   └── exa-search.js            # Exa API wrapper
└── results/
    ├── corrections.jsonl        # JSONL backup of corrections
    ├── run-stats.json           # Timing & cost stats from last run
    └── belief-verification-progress.json  # Checkpoint for resume
```

## Environment Variables

```bash
# Required
STAGING_DATABASE_URL=postgresql://...     # Staging DB for corrections
ANTHROPIC_MULTIAGENT_VERIFICATION_KEY=... # Claude API key
EXA_MULTIAGENT_VERIFICATION_KEY=...       # Exa search API key

# Optional
PILOT_DB=postgresql://...                 # For promotion to claims-pilot
DATABASE_URL=postgresql://...             # Fallback if STAGING not set
```
