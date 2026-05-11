# Mapping AI — Belief Field Adversarial Verification Pipeline

**Purpose:** Verify and correct belief fields across all entities using an adversarial multi-agent architecture.

**Scope:** Belief fields only. Output is actionable corrections — not tags.

**Status:** Active — 3-agent design implemented in `beliefs-3/`

---

## Quick Start

```bash
# Single entity
node beliefs-3/run.js --id=18

# Multiple entities
node beliefs-3/run.js --limit=10

# ID range (for parallel execution)
node beliefs-3/run.js --id-range=1-500
```

**Output:** `beliefs-3/results/corrections.jsonl` + `beliefs-3/results/run-stats.json`

---

## Why adversarial?

The previous `verify-all.js` pipeline used substring-match quote verification against existing source URLs. This has a structural flaw: it anchors on the database's own sources rather than independently searching for contradicting evidence. A single agent evaluating its own search results has no pressure to surface contradictions — it finds the first plausible source and stops.

Research is unambiguous: adversarial multi-agent debate consistently outperforms single-agent judgment even on constrained tasks (MARCH, DebateCV, PROClaim). Prosecutor/defender forces both sides of the evidence to be represented before the judge sees anything.

---

## Architecture: 3-Agent Design

**3 LLM calls per belief field per entity.**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   ┌─────────────────────┐     ┌─────────────────────┐          │
│   │  Prosecutor         │     │  Defender           │          │
│   │  (Sonnet)           │     │  (Sonnet)           │          │
│   │                     │     │                     │          │
│   │  • Exa search tool  │     │  • Exa search tool  │          │
│   │  • Evaluate initial │     │  • Evaluate initial │          │
│   │    sources          │     │    sources          │          │
│   │  • Build attribution│     │  • Build attribution│          │
│   │  • Construct arg    │     │  • Construct arg    │          │
│   └──────────┬──────────┘     └──────────┬──────────┘          │
│              │                           │                      │
│              │    Debate Transcript      │                      │
│              └───────────┬───────────────┘                      │
│                          │                                      │
│                          ▼                                      │
│              ┌─────────────────────┐                            │
│              │  Judge              │                            │
│              │  (Opus + extended   │                            │
│              │   thinking)         │                            │
│              │                     │                            │
│              │  • Sees transcript  │                            │
│              │    ONLY             │                            │
│              │  • submit_verdict   │                            │
│              │    tool             │                            │
│              └──────────┬──────────┘                            │
│                         │                                       │
│                         ▼                                       │
│              ┌─────────────────────┐                            │
│              │  Verdict            │                            │
│              │  confirm/correct/   │                            │
│              │  remove             │                            │
│              └─────────────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

| Step | Agent | Model | Role |
|---|---|---|---|
| 1 | Prosecutor | Sonnet | Searches for evidence AGAINST current value; builds attribution chain |
| 2 | Defender | Sonnet | Searches for evidence FOR current value; builds attribution chain |
| 3 | Judge | Opus + extended thinking | Reads debate transcript ONLY; renders verdict |

**Key differences from previous 8-agent design:**
- Agents call Exa search directly via tool use (no separate decomposer/search agents)
- Attribution chain built inside each agent (no separate attribution agents)
- Judge uses extended thinking (8000 token budget) for deeper reasoning
- Structured output via tool calls (no text parsing)

---

## Fields Verified

**For persons and organizations:**

| Field | Type | Description |
|-------|------|-------------|
| `belief_regulatory_stance` | enum | Categorical position on AI regulation |
| `belief_regulatory_stance_detail` | text | Free text summary of regulatory position |
| `belief_agi_timeline` | enum | When they expect AGI |
| `belief_ai_risk` | enum | Level of concern about AI risks |
| `belief_threat_models` | multi-enum | Specific threats (up to 3) |
| `belief_evidence_source` | enum | How the belief was determined |

**Valid enum values:**

| Field | Values |
|-------|--------|
| `belief_regulatory_stance` | Accelerate, Light-touch, Targeted, Moderate, Precautionary, Restrictive, Nationalize, Mixed/unclear, Other |
| `belief_agi_timeline` | Already here, 2-3 years, 5-10 years, 10-25 years, 25+ years or never, Ill-defined, Unknown, Mixed/unclear |
| `belief_ai_risk` | Overstated, Manageable, Serious, Catastrophic, Existential, Mixed/nuanced, Unknown |
| `belief_threat_models` | Labor displacement, Economic inequality, Power concentration, Democratic erosion, Cybersecurity, Misinformation, Environmental, Weapons, Loss of control, Copyright/IP, Existential risk |
| `belief_evidence_source` | Explicitly stated, Inferred, Inferred from actions |

---

## Existing Evidence Integration

Existing sources from the database are formatted **identically to Exa search results** and presented as "initial sources" — with no "database" labeling. This prevents bias:

```
INITIAL SOURCES:
The following sources have been provided as a starting point. You may use these and/or search for additional sources.

[
  { "url": "https://...", "title": "...", "text": "...", "publishedDate": "..." },
  ...
]
```

Both prosecutor and defender:
- Receive the same initial sources
- Evaluate them on their merits (like any other search result)
- Can search for additional sources via Exa
- Don't know which sources came from the database vs fresh search

This ensures existing evidence gets considered without anchoring bias.

---

## Verdict Rules

| Verdict | Condition | Action |
|---------|-----------|--------|
| `confirm` | First-person evidence supports current value | Keep value, add source as supporting evidence |
| `correct` | First-person evidence contradicts current value | Update to proposed_value |
| `remove` | No first-person evidence on either side | Set field to NULL |

**Hard rule:** `correct` requires at least one `first_person` statement contradicting the current value. Third-party characterizations alone are never sufficient for correction.

---

## Attribution Types

| Type | Definition | Strength |
|------|------------|----------|
| `first_person` | Entity speaking/writing about their own views | Strongest |
| `authored_position` | Org's official published position | Strong |
| `third_party_characterization` | Journalist/analyst describing views | Weak |
| `inferred_from_action` | Inferred from behavior | Weakest |

**Critical rules:**
- If a journalist characterizes someone's stance: `third_party_characterization`, not `first_person`
- If an interviewer describes the interviewee's views: speaker is the interviewer — do not attribute to the interviewee
- Org official statements: do not attribute to individual employees unless they personally stated it
- In multi-speaker panels, track which speaker said what

---

## Confidence Levels

| Confidence | Criteria |
|---|---|
| `high` | Multiple first-person sources agree |
| `medium` | One first-person source OR multiple third-party |
| `low` | Only third-party OR sources conflict |

---

## Output Format

One JSONL record per belief field per entity:

```json
{
  "entity_id": 142,
  "entity_name": "Jane Smith",
  "entity_type": "person",
  "field": "belief_regulatory_stance",
  "current_value": "Accelerate",
  "verdict": "correct",
  "proposed_value": "Moderate",
  "confidence": "high",
  "winning_side": "prosecution",
  "attribution_type": "first_person",
  "source_url": "https://...",
  "citation": "We need thoughtful guardrails...",
  "reasoning": "Current value contradicted by direct Senate testimony...",
  "prosecutor_argument": "...",
  "defender_argument": "...",
  "prosecutor_attribution_chain": [...],
  "defender_attribution_chain": [...]
}
```

---

## Cost Estimate

Per belief field:
- 2 Sonnet calls (prosecutor + defender): ~$0.10
- 1 Opus call with extended thinking: ~$0.30
- 2-6 Exa searches: ~$0.02-0.05
- **Total: ~$0.42-0.45 per field**

For an entity with 6 belief fields: ~$2.50-2.70

---

## Test Suite

See `test-suite.md` for:
- 10 test entities with varied scenarios
- Ground truth verdicts established via Claude web evaluation
- Expected corrections and removals

**Test entities:** Sam Altman, Yann LeCun, Elon Musk, Geoffrey Hinton, Ed Markey, Future of Life Institute, Reddit, Trump administration, Roman Yampolskiy, Timothée Lacroix

---

## File Structure

```
verification/
├── multiagent-verification.md    # This file — design doc
├── test-suite.md                 # Test entities and ground truth
├── beliefs-3/
│   ├── run.js                    # Main 3-agent pipeline
│   ├── README.md                 # Implementation details
│   ├── prompts/
│   │   ├── prosecutor.md         # Prosecutor system prompt
│   │   ├── defender.md           # Defender system prompt
│   │   └── judge.md              # Judge system prompt
│   ├── results/
│   │   ├── corrections.jsonl     # Pipeline output
│   │   └── run-stats.json        # Timing and cost summary
│   ├── test-suite-data.json      # Complete test entity data
│   └── claude-web-prompt.md      # Prompt for ground truth evaluation
└── beliefs/                      # Old 8-agent design (archived)
```

---

## Research Foundations

| Paper | Relevance |
|---|---|
| MARCH (arxiv 2603.24579) | Information asymmetry between search agents |
| DebateCV (arxiv 2507.19090) | Isolated judge context; debate transcript as sole input |
| PROClaim (arxiv 2603.28488) | Prosecutor/defender structure for claim verification |

---

*Last updated: May 2026*
