# Belief Field Verification — Single Opus Agent

Simplified approach using one Opus agent with extended thinking instead of 3 adversarial agents.

**Design doc:** See `../multiagent-verification.md` for comparison with 3-agent approach.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Single Opus Agent (extended thinking)                   │   │
│   │                                                          │   │
│   │  • exa_search tool (multiple queries at once)           │   │
│   │  • fetch_content tool (follow up on URLs)               │   │
│   │  • submit_verdicts tool (structured output)             │   │
│   │                                                          │   │
│   │  Searches for BOTH supporting AND contradicting          │   │
│   │  evidence, then renders verdicts for all fields          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Comparison with 3-Agent Design

| Aspect | 1-Agent | 3-Agent |
|--------|---------|---------|
| LLM calls per entity | 1 | 3 per field (18 for 6 fields) |
| Time per entity | ~2-4 min | ~9 min |
| Cost per entity | ~$0.50-1.00 | ~$3.50 |
| Confirmation bias risk | Higher | Lower (adversarial pressure) |
| Evidence coverage | Agent decides | Forced both sides |

### Tradeoffs

**Pros of 1-agent:**
- Much faster (1 call vs 18)
- Much cheaper (~70% savings)
- Simpler to debug
- Agent can see full picture

**Cons of 1-agent:**
- No adversarial pressure — may confirm too easily
- Single point of failure
- May not search thoroughly for contradicting evidence
- No debate transcript to review

## Usage

```bash
# Single entity
node beliefs-1-opus/run.js --id=18

# Multiple entities
node beliefs-1-opus/run.js --limit=10

# ID range
node beliefs-1-opus/run.js --id-range=1-500
```

## Environment Variables

Required in `.env`:
```
ANTHROPIC_MULTIAGENT_VERIFICATION_KEY=sk-ant-...
EXA_MULTIAGENT_VERIFICATION_KEY=...
DATABASE_URL=postgres://...
```

## Output

- `results/corrections.jsonl` — One JSON object per field verified
- `results/run-stats.json` — Timing, cost summary, verdict counts

## Tools

| Tool | Description |
|------|-------------|
| `exa_search` | Search with multiple queries at once (up to 5) |
| `fetch_content` | Fetch full page content from a URL |
| `submit_verdicts` | Submit all verdicts (terminates agent) |

## Key Differences from 3-Agent

1. **All fields at once**: Agent verifies all 6 fields in one conversation, not one field at a time
2. **Multi-query search**: Can search for supporting AND contradicting evidence in one tool call
3. **fetch_content tool**: Can follow up on promising URLs to get full page text
4. **Single extended thinking session**: 10,000 token thinking budget for the whole entity

## Files

```
beliefs-1-opus/
├── run.js              # Main pipeline
├── prompts/
│   └── verifier.md     # System prompt
├── results/
│   ├── corrections.jsonl
│   └── run-stats.json
└── README.md           # This file
```

## When to Use

Use 1-agent when:
- Running large batches where cost/time matters
- Fields have strong existing evidence
- Human review will catch false confirms

Use 3-agent when:
- Accuracy is critical
- Fields are contested or nuanced
- You need a debate transcript for audit
