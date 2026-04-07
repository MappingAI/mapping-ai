# API Cost Tracking System

## Purpose
Prevent cost underestimation by maintaining a rigorous log of estimates vs actuals
across all projects. This system applies to ANY paid API — LLM tokens, GPU compute,
satellite imagery, cloud storage, or anything else billed by usage.

## The Process (follow every time)

### Step 1: Look Up Pricing
- Check this file for known rates for the specific API/model
- If not found or potentially stale, fetch the pricing page (links in MEMORY.md)
- If pricing page is inaccessible, ASK the user before proceeding
- Note the billing unit (tokens, seconds, tiles, requests, GB, etc.)

### Step 2: Measure Your Data
- Don't guess input sizes. Measure actual data that will be sent:
  - For LLM APIs: tokenize a sample of actual inputs, compute mean/median/P90
  - For compute: measure actual runtime on a small batch
  - For storage: measure actual file sizes
- For outputs: run a diagnostic test (10-20 calls) to measure actual output sizes
  - Output sizes are consistently underestimated — prompts with chain-of-thought,
    JSON structure, or reasoning blocks produce 2-3x more output than expected

### Step 3: Calculate Estimate
```
cost = (units_per_call × num_calls) × rate_per_unit
```
- Use measured (not guessed) units_per_call
- Apply correction factor from historical actuals (see below)
- Present BOTH the raw calculation and the buffered estimate
- Always state assumptions explicitly

### Step 4: Diagnostic Test
- Run 10-20 actual API calls
- Log: estimate, actual cost, actual input units, actual output units, per-call rate
- Compare to Step 3 estimate
- Adjust full-run projection based on diagnostic results

### Step 5: Present to User
- Show: diagnostic results, per-call actual cost, projected full-run cost
- Include: raw estimate, buffered estimate (1.5-2x), and worst-case
- Get approval before proceeding with full run

### Step 6: Log Actuals (after run)
- Add entry to the Actuals Log below
- Compare to estimate, note % off and why
- Update correction factors if pattern changes

---

## Correction Factors (derived from actuals)
- LLM output tokens: estimate × 2.0 (thinking blocks, JSON, reasoning add up)
- LLM total cost: estimate × 1.5-2.0 (overhead, retries, tier pricing differences)
- New prompt format: add 50% buffer until measured
- Multi-turn conversations: multiply input cost linearly by turn count
- GPU compute: generally accurate (Modal charges by the second, predictable)

---

## Known API Rates (as of March 2026)

### LLM APIs (per million tokens)

#### OpenAI (https://developers.openai.com/api/docs/pricing)
| Model | Input (std) | Output (std) | Input (batch) | Output (batch) |
|-------|------------|-------------|--------------|---------------|
| GPT-5.4 | $2.50 | $15.00 | $1.25 | $7.50 |
| GPT-5.2 | $1.75 | $14.00 | $0.875 | $7.00 |
| GPT-4.1 | $2.00 | $8.00 | $1.00 | $4.00 |
| GPT-4.1-mini | $0.40 | $1.60 | $0.20 | $0.80 |
| GPT-4.1-nano | $0.10 | $0.40 | $0.05 | $0.20 |
| GPT-4o | $2.50 | $10.00 | $1.25 | $5.00 |
| GPT-4o-mini | $0.15 | $0.60 | $0.075 | $0.30 |

#### Anthropic (https://platform.claude.com/docs/en/about-claude/pricing)
| Model | Input (std) | Output (std) | Input (batch) | Output (batch) |
|-------|------------|-------------|--------------|---------------|
| Claude Opus 4.6 | $5.00 | $25.00 | $2.50 | $12.50 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $1.50 | $7.50 |
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.50 | $2.50 |

#### Google Gemini (https://ai.google.dev/gemini-api/docs/pricing)
| Model | Input (std) | Output (std) | Input (batch) | Output (batch) |
|-------|------------|-------------|--------------|---------------|
| Gemini 2.5 Pro | $1.25 | $10.00 | — | — |
| Gemini 2.5 Flash | $0.30 | $2.50 | $0.15 | $1.25 |
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 | $0.05 | $0.20 |

### Compute APIs

#### Modal (https://modal.com/pricing)
| GPU | $/hr |
|-----|------|
| A100-40GB | $2.10 |
| A100-80GB | $2.50 |
| H100 | $3.95 |
| L4 | $0.80 |
| T4 | $0.59 |
| CPU | $0.047/core/hr |

### Other APIs (add as encountered)
- AWS S3: https://aws.amazon.com/s3/pricing/ (not yet used, look up when needed)
- Planet: https://www.planet.com/products/ (not yet used, per-tile pricing)

---

## Actuals Log

#### Run 8: Claude Sonnet 4.6 value extraction — pilot (Mar 16)
- **Task**: Extract values from 328 conversations across 9 models
- **Estimate**: $2.11 (360 calls × $0.00585, but only 328 conversations had content)
- **Actual**: $0.97 (328 calls)
- **Tokens**: 284,732 input (avg 868/call), 7,695 output (avg 23/call)
- **Per call**: $0.00296
- **Ratio**: 0.46x (CHEAPER than estimate — output was only 23 tokens avg not 197)
- **Why off**: The extraction prompt in pipeline_v2 produces much shorter output (just comma-separated value labels) than the diagnostic test which used the full <thinking>/<answer> format
- **Quality**: 1,113 values from 328 conversations (3.4/conv avg). Top: user autonomy, epistemic humility, helpfulness


#### Run 9: Enrichment v2 Phase 1 — no-notes entities (Apr 7)
- **Task**: Enrich 97 entities without notes via Exa search + Claude Sonnet extraction
- **Estimate**: $9.70 (97 entities × $0.10/entity, assuming 3 Exa searches + 1 Claude call each)
- **Actual**: $9.86 (Exa: $3.06 for 306 searches, Anthropic: $6.80 for 555 calls)
- **Exa**: 306 searches @ $0.01 = $3.06
- **Anthropic**: 1,581,000 input tokens (avg 2,849/call), 138,000 output tokens (avg 249/call)
- **Per entity**: $0.102
- **Ratio**: 1.02x (on target)
- **Results**: 97 enriched, 387 edges created, 218 new AI-relevant entities, 235 non-AI entities skipped
- **Lesson**: Entity matching and AI-relevance filtering working well. Edge confidence scoring effective.

#### Run 10: (template for next run)
- **Task**:
- **Estimate**: $ (X calls × $Y/call, assuming Z input + W output tokens)
- **Actual**: $
- **Tokens**: input (avg /call), output (avg /call)
- **Per call**: $
- **Ratio**: actual/estimate =
- **Lesson**:
