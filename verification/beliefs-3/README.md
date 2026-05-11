# Belief Field Verification — 3-Agent Implementation

Implementation of the adversarial verification pipeline using 3 agents per belief field.

**Design doc:** See `../multiagent-verification.md` for architecture, rationale, and field definitions.

## Usage

```bash
# Single entity
node beliefs-3/run.js --id=18

# Multiple entities
node beliefs-3/run.js --limit=10

# ID range (for parallel execution)
node beliefs-3/run.js --id-range=1-500
```

## Environment Variables

Required in `.env`:
```
ANTHROPIC_MULTIAGENT_VERIFICATION_KEY=sk-ant-...
EXA_MULTIAGENT_VERIFICATION_KEY=...
DATABASE_URL=postgres://...  # or STAGING_DATABASE_URL
```

## Output

- `results/corrections.jsonl` — One JSON object per field verified
- `results/run-stats.json` — Timing, cost summary, verdict counts

## Agent Flow

1. **Fetch**: Pull entity + existing claims/sources from database
2. **Prosecutor + Defender** (parallel): Each evaluates initial sources, searches Exa, builds attribution chain, submits argument via `submit_argument` tool
3. **Judge**: Reads debate transcript only, renders verdict via `submit_verdict` tool with extended thinking

## Tools

### Prosecutor/Defender Tools

| Tool | Description |
|------|-------------|
| `exa_search` | Search web for evidence |
| `submit_argument` | Submit final argument (terminates agent) |

### Judge Tool

| Tool | Description |
|------|-------------|
| `submit_verdict` | Submit verdict with reasoning (terminates agent) |

## Field Types

The pipeline handles different field types:

| Field | Type | Validation |
|-------|------|------------|
| `belief_regulatory_stance` | enum | Must match valid values |
| `belief_regulatory_stance_detail` | text | Free text, verify accuracy |
| `belief_agi_timeline` | enum | Must match valid values |
| `belief_ai_risk` | enum | Must match valid values |
| `belief_threat_models` | multi_enum | Up to 3 valid values |
| `belief_evidence_source` | enum | Based on claim types |

## Claim Dimension Mapping

Fields map to claim table dimensions:

| Field | Claim Dimension |
|-------|-----------------|
| `belief_regulatory_stance` | `regulatory_stance` |
| `belief_regulatory_stance_detail` | `regulatory_stance` (shared) |
| `belief_agi_timeline` | `agi_timeline` |
| `belief_ai_risk` | `ai_risk_level` |
| `belief_threat_models` | `threat_models` |
| `belief_evidence_source` | ALL claims for entity |

## Cost Tracking

The pipeline tracks costs per model:
- Sonnet: $3/1M input, $15/1M output
- Opus: $15/1M input, $75/1M output
- Exa: ~$0.008 per search

## Files

```
beliefs-3/
├── run.js              # Main pipeline
├── prompts/
│   ├── prosecutor.md   # Prosecutor system prompt
│   ├── defender.md     # Defender system prompt
│   └── judge.md        # Judge system prompt
├── results/
│   ├── corrections.jsonl
│   └── run-stats.json
├── test-suite-data.json    # Test entity data
├── claude-web-prompt.md    # Ground truth evaluation prompt
└── README.md               # This file
```

## Testing

See `../test-suite.md` for:
- 10 test entities with varied scenarios
- Ground truth verdicts
- Expected corrections and removals

```bash
# Run test suite entities
node beliefs-3/run.js --id=18,92,48,821,113,229,743,1169,326,1724
```
