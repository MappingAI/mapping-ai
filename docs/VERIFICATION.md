# Belief Verification Pipeline

**Last updated:** 2026-05-14

This document describes the belief field verification system used to validate entity belief data against external sources.

## Overview

The verification pipeline checks belief fields (regulatory_stance, agi_timeline, ai_risk, threat_models, evidence_source) against external sources to:
1. Confirm values that are accurate
2. Correct values that are wrong
3. Remove values that lack evidence

## Pipeline Variants

### beliefs-1-opus (Current Production)

Single-agent approach using Claude Opus with extended thinking.

**Location:** `verification/beliefs-1-opus/`

**Process:**
1. For each entity + belief field, search for evidence using Exa
2. Claude Opus analyzes evidence and renders verdict
3. Results written to `belief_correction` table in staging
4. After review, corrections promoted to production

**Usage:**
```bash
# Single entity
node verification/beliefs-1-opus/run.js --entity-id=123

# Batch from CSV
node verification/beliefs-1-opus/run.js --csv=priority-list.csv --parallel=5
```

**Cost:** ~$0.42-0.45 per belief field, ~$2.50-2.70 per entity

### beliefs-3 (Experimental)

Three-agent adversarial design with prosecutor, defender, and judge.

**Location:** `verification/beliefs-3/`

More thorough but higher cost. Used for high-stakes entities.

## Database Schema

### `belief_correction` table (staging)

Stores verification results before promotion to production.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `entity_id` | INTEGER | FK to entity |
| `entity_name` | TEXT | Denormalized name |
| `entity_type` | TEXT | person/organization |
| `field` | TEXT | belief field name |
| `current_value` | TEXT | Value before correction |
| `proposed_value` | TEXT | Corrected value (if verdict=correct) |
| `verdict` | TEXT | confirm/correct/remove |
| `confidence` | TEXT | high/medium/low |
| `reasoning` | TEXT | Judge's reasoning |
| `sources` | JSONB | Evidence sources |
| `pipeline` | TEXT | e.g., "1-opus" |
| `status` | TEXT | pending/applied |
| `applied_at` | TIMESTAMPTZ | When promoted to production |
| `applied_by` | TEXT | Script that applied it |
| `created_at` | TIMESTAMPTZ | When created |

### `field_verification` column (entity table)

JSONB column on `entity` table storing per-field verification status.

**Format:**
```json
{
  "name": { "status": "verified" },
  "category": { "status": "unverified" },
  "belief_regulatory_stance": {
    "status": "verified",
    "confidence": "high",
    "verified_at": "2026-05-14T...",
    "source_url": "https://..."
  }
}
```

**Status values:**
- `verified` - Confirmed against external sources
- `unverified` - Not yet checked
- `intentionally_null` - Entity has no official position (see below)
- `removed` - Value removed during verification
- `inferred` - Derived from indirect evidence

### Dual-track pattern: intentionally_null

When an organization explicitly does not take official positions:
- Entity belief field = NULL (UI shows no stance)
- `field_verification` = `intentionally_null` with inferred values preserved

```json
{
  "belief_regulatory_stance": {
    "status": "intentionally_null",
    "reason": "Organization does not take official positions",
    "inferred_value": "Targeted",
    "inferred_detail": "Publications suggest support for evaluation-based regulation...",
    "inference_confidence": "medium"
  }
}
```

## Verdict Types

| Verdict | Action | Result |
|---------|--------|--------|
| `confirm` | None | Current value validated |
| `correct` | Update field | Replace with proposed_value |
| `remove` | Set to NULL | No evidence supports current value |

## Migration Process

1. Run verification pipeline → results to `belief_correction` table
2. Review corrections in staging
3. Run `migrate-to-production.js` in phases:
   - Phase 1: Migrate new sources
   - Phase 2: Migrate new claims
   - Phase 3: Update entity belief fields

```bash
# Dry run
node verification/scripts/migrate-to-production.js --dry-run

# Apply by phase
node verification/scripts/migrate-to-production.js --phase=sources
node verification/scripts/migrate-to-production.js --phase=claims
node verification/scripts/migrate-to-production.js --phase=entities
```

## Frontend Integration

### Verification badges

Map nodes display verification status:
- Green dot: >75% fields verified
- Yellow dot: 25-75% verified
- Red dot: <25% verified

Detail panel shows per-field badges (verified/unverified).

### Data Quality legend

Controls sidebar includes "Data Quality" legend for filtering by verification status.

## Valid Enum Values

See [`verification/full-schema-reference.md`](../verification/full-schema-reference.md) for the canonical list of valid enum values for all belief fields.

## Scripts

| Script | Purpose |
|--------|---------|
| `verification/beliefs-1-opus/run.js` | Main verification pipeline |
| `verification/scripts/migrate-to-production.js` | Promote corrections to production |
| `verification/scripts/promote-corrections.js` | Alternative promotion script |
| `scripts/sync-verification.js` | Sync field_verification and re-export map data |

## Cost Tracking

Verification runs log costs to `verification/results/cost-ledger.jsonl`:
```json
{"entity_id": 123, "field": "regulatory_stance", "input_tokens": 5000, "output_tokens": 1500, "cost_usd": 0.42}
```
