# Mapping AI — Multi-Agent Data Verification Pipeline

**Purpose:** Design specification for a multi-agent verification system to detect and repair hallucinated data (field values, citations, and source URLs) in the Mapping AI database of entities, edges, and sources.

**Status:** Architecture design — ready for implementation

---

## Overview

The pipeline has six phases. The core design principle is **information asymmetry**: verification agents must never see each other's priors. Single-agent verification always suffers from self-confirmation bias — an agent that generated or initially saw a claim will tend to find evidence supporting it. Breaking that cycle is what makes the adversarial structure work.

The pipeline distinguishes two fundamentally different verification problems:

1. **Factual claims** — checkable against primary sources like websites, LinkedIn, org pages. Examples: role, org membership, founding date, URL validity.
2. **Belief attribution claims** — requires finding a direct statement or writing *by* the person or org, not *about* them. Examples: `belief_regulatory_stance`, `belief_agi_timeline`, `belief_ai_risk`, `belief_threat_models`.

This distinction, not the structured/freeform split, is the correct routing signal. A `belief_regulatory_stance` field looks structured (it's a SELECT) but requires first-person attribution — it must always go on the full adversarial path. The routing in Phase 1 reflects this.

**`notes_html` is the highest-risk field** in the schema: unbounded, multi-claim, and where enrichment models speculate most freely. The pipeline inverts the current flow — after verification, claims become the source of truth and notes are regenerated from verified claims only.

---

## Pipeline diagram

![Mapping AI verification pipeline overview](./mapping_ai_verification_pipeline.svg)

---

## Model assignments

| Agent | Model | Rationale |
|---|---|---|
| Enum validator | No LLM — pure code | Finite valid values; deterministic check |
| URL freshness triage | Haiku 4.5 | Simple staleness check against `last_verified_at` |
| Enum repair agent | Sonnet 4.5 | Needs contextual reasoning to map invalid values |
| Decomposer + router | Sonnet 4.5 | Structured extraction; tags `factual` vs `belief_attribution` |
| Search + attribution agent | Sonnet 4.5 | Exa searches + produces structured attribution chain per claim |
| Prosecutor agent | Sonnet 4.5 | Adversarial reasoning; runs in parallel |
| Defender agent | Sonnet 4.5 | Symmetric with prosecutor |
| Judge agent | Opus 4.5 | Final adjudication; isolated context; only Opus call |
| Correction proposal agent | Sonnet 4.5 | Crystallises prosecutor evidence; applies Stage 4 action rules |
| Notes regeneration agent | Sonnet 4.5 | Rewrites `notes_html` from verified claims only |
| Triage router | Haiku 4.5 | Aggregation logic — nearly mechanical |
| Write-back agent | Haiku 4.5 | Writes to `field_verification`, `confidence`, `last_verified_at` |

**Total: 3 distinct models** — Haiku 4.5, Sonnet 4.5, Opus 4.5.

**Key principle:** Opus fires exactly once per record (the judge), on the most condensed input (the debate transcript). Prosecutor and defender being Sonnet is intentional — you don't want the most capable model building pathologically convincing one-sided arguments.

---

## Phase 0 — Pre-pass

*No LLM for most of this phase.*

### Enum validator (code — no LLM)

Reads every `SELECT_1`, `SELECT_MULTIPLE`, and `SELECT_UP_TO_3` field and checks:

1. **Invalid values** — is the current value in the allowed enum list?
2. **Over-limit values** — does the count exceed the field's maximum?

Examples caught immediately:
- `belief_regulatory_stance: "Pro-innovation"` — not in allowed list
- `belief_threat_models` with 5 entries — `SELECT_UP_TO_3` allows maximum 3
- `category: "Targeted regulation"` — correct value is `"Targeted"`

### URL freshness triage (Haiku 4.5)

Flags any `source_url` where `last_verified_at` is null or older than the configured threshold. These become priority targets in Phase 2.

### Enum repair agent (Sonnet 4.5)

**Invalid value:** Maps to nearest valid enum entry.
- High-confidence remaps (e.g. `"Targeted regulation"` → `"Targeted"`) → auto-applied
- Ambiguous remaps (e.g. `"Pragmatic"` on `belief_regulatory_stance`) → human queue

**Over-limit:** Ranks all current values by evidence strength (direct quote > inferred from action > crowdsourced). Keeps top N; logs dropped values in repair audit record.

> **Org belief fields:** Individual employee views do not equal organizational positions. If only employee statements support an org's `belief_regulatory_stance`, the repair agent should downgrade to `Mixed/unclear` rather than preserve the inferred value.

---

## Phase 1 — Decompose and route

**Agent:** Decomposer + router (Sonnet 4.5)

Decomposes the record into atomic claims and tags each with:
- A `verification_type`: `"factual"` or `"belief_attribution"`
- A `search_query` targeting primary sources
- A path: fast or full adversarial

### `verification_type` rules

- `"factual"` — checkable against primary sources (org pages, LinkedIn, Crunchbase, official records). Skip trivially verifiable fields like name.
- `"belief_attribution"` — requires a direct statement or writing *by* the entity. **Always use for all `belief_*` fields.**

### Search query targeting rules

- `"factual"` queries → entity's own website, LinkedIn, org About page, Crunchbase profile
- `"belief_attribution"` queries → the entity's own writing: op-eds, congressional testimony *by* the person, interviews *where* the person is the interviewee, academic papers *authored by* the person, official org position statements
- **Deprioritize:** news articles paraphrasing someone's views, podcast summaries written by third parties, Wikipedia

### Routing logic

| Condition | Path |
|---|---|
| `factual` claim + source URL present | Fast path — URL validator only |
| `belief_attribution` claim (all `belief_*` fields) | Always full adversarial path |
| `notes_html` content | Always full path |
| Edge `evidence` and `citation` fields | Always full path |
| `belief_evidence_source: "Explicitly stated"` | Full path — requires direct quote verified |
| `belief_evidence_source: "Inferred"` | Full path — lighter grounding, but still adversarial |
| `claim_type: crowdsourced_submission` | Always full path, highest priority |
| `resource_url` on a Resource entity | Fast path — URL validator only |

Edge claims are treated as their own mini-records: `edge_type`, `role`, `start_date`, `end_date`, and `source_url` each decomposed and routed.

---

## Phase 2 — Search, fetch, and attribution chain

*Two agents run in parallel. Information asymmetry is the key mechanism.*

### URL validator (Haiku 4.5)

For fast-path claims: HTTP fetch, 404 check, content relevance check. A URL that resolves but contains no text supporting the attributed claim is a hallucination.

**Two distinct URL failure modes:**
1. Fabricated URL — does not exist or 404s
2. Real URL, no supporting content — page exists but claim isn't there

Updates `last_verified_at` on the source record.

### Search + attribution agent (Sonnet 4.5)

Receives atomic claims with `verification_type` and `search_query` — **no candidate URLs, no existing sources.** Runs 1–2 Exa searches per claim using the provided query.

For each source found, produces a structured **attribution chain** per claim (see Appendix A). This is the evidence corpus fed into Phase 3.

**Attribution type hierarchy (strongest to weakest):**
1. `first_person` — entity speaking/writing about their own views
2. `authored_position` — org's official published position
3. `third_party_characterization` — journalist or analyst describing someone's views

Signal interpretation:
- Independent search surfaces the same URL as the record → strong corroboration
- Independent search finds contradictory first-person sources → red flag, feeds prosecutor
- Independent search finds only third-party characterizations for a belief field → flag; not sufficient for auto-correction
- Independent search finds nothing → flag for prosecutor to challenge

---

## Phase 3 — Adversarial debate

*Full path only. Fast path records skip to Phase 4.*

The prosecutor and defender both receive the structured attribution chain from Phase 2 — not raw search results. They work from the same evidence corpus and run in parallel without seeing each other's output.

### Prosecutor agent (Sonnet 4.5)

Looks for:
- `attribution_type: "third_party_characterization"` on belief fields — treats these as inherently weak evidence
- Date inconsistencies in factual claims
- Org misattributions (person attributed to wrong org)
- Org-level belief claims where only employee statements exist (not org's own position)
- Inferred stances that don't follow logically from cited actions
- URL content mismatches from Phase 2

### Defender agent (Sonnet 4.5)

Looks for:
- First-person sources corroborating the claim
- Valid inference chains from actions to attributed stances
- Additional sources not in the candidate URL list

### Judge agent (Opus 4.5)

**Critical constraint:** Receives only the assembled debate transcript. System prompt explicitly states: *"you have access to the debate transcript only; you have not seen the original record."* This is more reliable than just withholding the data.

Returns per claim:
- Verdict: `SUPPORTED` / `UNCERTAIN` / `REFUTED`
- Confidence: `high` / `medium` / `low`
- Rationale: stored in debate log

Verdict-to-confidence mapping:
- `high`: multiple first-person sources agree
- `medium`: one first-person source, or multiple third-party sources agree
- `low`: only third-party characterizations, or sources conflict
- `unsupported`: no relevant sources found → verdict UNCERTAIN
- `contradicted`: sources directly contradict DB value → verdict REFUTED

---

## Phase 4 — Correction and notes regeneration

### Correction proposal agent (Sonnet 4.5)

Applies the following action rules per field (see Appendix B for full JSON schema):

| Action | Condition |
|---|---|
| `confirm` | Evidence supports current DB value |
| `correct` | Strong evidence DB value is wrong. Requires ≥1 first-person source OR ≥2 agreeing third-party sources. For belief fields: **first-person only.** |
| `flag_for_human` | Conflicting evidence, or only weak third-party sources |
| `remove` | Field value is fabricated with no supporting evidence. Better to show nothing than show wrong data. |

**Hard rules:**
- Never propose a correction based on training data alone. Every correction must cite a `source_url` from search results.
- For belief fields, `correct` requires `attribution_type: "first_person"`. Third-party characterizations support `flag_for_human` only — never auto-correction.
- `correct` actions re-enter the pipeline at Phase 1 as candidate replacement records. The replacement must survive the same adversarial process before it auto-writes. If it also fails, the field goes blank and routes to human queue with the full history.
- **Loop termination:** maximum one re-entry. No infinite correction loops.

### Notes regeneration agent (Sonnet 4.5)

After verification, claims become the source of truth. Notes are rewritten from verified claims only.

**Mode 1 — Clean regeneration** (most claims SUPPORTED): Rewrites `notes_html` using SUPPORTED claims only. Auto-writes.

**Mode 2 — Significant loss** (>30% of claims REFUTED, or any load-bearing claim like primary org or role fails): Routes to human queue with diff showing original vs. proposed regeneration.

**Minimum threshold:** Only regenerate if ≥3–4 atomic claims survived as SUPPORTED. Below that, blank the field, set `field_verification.notes_html` to `unverified`, route to human queue.

> **Frontend requirement:** Regenerated notes must be visually flagged in the UI as verified and reconstructed — not displayed as original contributor text.

---

## Phase 5 — Triage and write-back

### Triage router (Haiku 4.5)

| Condition | Action |
|---|---|
| All claims `confirm` / SUPPORTED | Auto-approve → write-back |
| Any claim `flag_for_human` or UNCERTAIN | Human review queue with structured diff |
| Any claim `correct` action, correction loop exhausted | Human queue with full verdict history |
| Core identity claim REFUTED (`remove` action) | Auto-quarantine entire record |

**Display logic:**

| Verdict | What the user sees |
|---|---|
| All fields verified, high confidence | Normal card/node |
| 1+ uncertain fields | "Some fields unverified" indicator |
| Refuted field, loop exhausted | Field blank or hidden; entity kept |
| Core identity refuted | Entity hidden from map |

A person card with a blank `belief_agi_timeline` is more honest than one with a hallucinated value. Entities are not removed when individual fields fail.

### Write-back agent (Haiku 4.5)

1. **`field_verification` JSONB** — per-field `verified` / `unverified` / `inferred` with `checked_at` timestamp
2. **`confidence`** on claim and edge evidence rows — `high` / `medium` / `low`
3. **`last_verified_at`** on every source checked in Phase 2
4. **`notes_html`** — replaced with regenerated version (Mode 1) or blanked (below threshold)
5. **Repair audit log** — dropped enum values, correction loop history, regeneration diffs

---

## Key design decisions

**Verification type over field type.** The routing signal is `factual` vs `belief_attribution`, not structured vs freeform. A SELECT belief field still requires first-person evidence — it goes on the full path.

**Attribution chain as evidence corpus.** The search agent produces structured attribution objects (speaker, subject, attribution type, direct quote flag) rather than raw search results. Prosecutor and defender work from this — not from text.

**First-person requirement for belief auto-correction.** Third-party characterizations of someone's views can support `flag_for_human` but never `correct`. This is the most important constraint for belief fields.

**Correction re-enters the pipeline.** Replacements are held to the same evidentiary standard as originals. A correction that can't survive the adversarial phase doesn't get written.

**Claims become source of truth for notes.** The current flow is notes → claims extracted. After this pipeline: claims verified → notes regenerated. `notes_html` is a display artifact, not authoritative.

**Information asymmetry at every stage.** Search agent never sees candidate URLs. Judge never sees the original record. These constraints are enforced via system prompt, not just by withholding data — explicit "you do not have access to X" instructions are more reliable.

---

## Appendix A — Attribution chain JSON schema (Phase 2 output)

Produced by the search + attribution agent per claim. Fed directly into Phase 3 as the evidence corpus.

```json
{
  "claim_id": "...",
  "entity": "Dario Amodei",
  "field": "belief_regulatory_stance",
  "current_db_value": "Moderate",
  "verification_type": "belief_attribution",
  "search_query": "Dario Amodei AI regulation testimony op-ed written by",
  "sources": [
    {
      "source_url": "...",
      "statements": [
        {
          "quote_or_paraphrase": "exact quote or close paraphrase",
          "is_direct_quote": true,
          "speaker": "Dario Amodei",
          "subject": "Dario Amodei",
          "attribution_type": "first_person",
          "supports_claim": true,
          "contradicts_claim": false,
          "notes": "From Senate testimony, Amodei speaking about his own views"
        },
        {
          "quote_or_paraphrase": "Amodei's approach has been described as...",
          "is_direct_quote": false,
          "speaker": "journalist (NYT)",
          "subject": "Dario Amodei",
          "attribution_type": "third_party_characterization",
          "supports_claim": true,
          "contradicts_claim": false,
          "notes": "Reporter's interpretation, not Amodei's own words"
        }
      ]
    }
  ]
}
```

**Critical attribution rules:**
1. If someone interviews Person X and X describes Person Y's views — the speaker is X, the subject is Y. Do NOT attribute Y's described views to X.
2. Journalist characterizations → `third_party_characterization` — weaker evidence.
3. Org official statement → speaker is the org, subject is the org. Do NOT attribute org positions to individual employees unless they personally stated it.
4. `first_person` (the entity speaking about their own views) is the strongest evidence.
5. In panel discussions or multi-speaker interviews, carefully track which speaker said what.

---

## Appendix B — Correction proposal JSON schema (Phase 4 output)

Produced by the correction proposal agent per field.

```json
{
  "field": "belief_regulatory_stance",
  "action": "correct",
  "current_value": "Moderate",
  "proposed_value": "Light-touch",
  "confidence": "high",
  "evidence_summary": "In 2024 Senate testimony, Amodei advocated for...",
  "source_urls": ["..."],
  "attribution_type": "first_person",
  "reasoning": "DB says Moderate but direct testimony shows Light-touch..."
}
```

**Action values:**
- `confirm` — evidence supports current DB value
- `correct` — strong evidence DB value is wrong; ≥1 first-person source or ≥2 agreeing third-party sources; belief fields: first-person only
- `flag_for_human` — conflicting evidence or only weak third-party sources
- `remove` — value is fabricated with no supporting evidence

---

## Research foundations

| Paper | Key contribution |
|---|---|
| MARCH (Alibaba/CUHK, arxiv 2603.24579) | Three-agent Solver/Proposer/Checker with deliberate information asymmetry |
| DebateCV (arxiv 2507.19090) | Debate-driven claim verification; isolated judge context |
| PROClaim (arxiv 2603.28488) | Courtroom-inspired prosecutor/defense/panel structure |
| Tool-MAD (2026) | Five-step pipeline: decomposition, check-worthiness, query generation, retrieval, verification |
| NABAOS / Tool Receipts (arxiv 2603.10060) | URL fabrication detection via independent re-fetching; ~78% catch rate |
| AtomEval (arxiv 2604.07967) | Atomic claim decomposition for fine-grained verification |
| EdinburghNLP/awesome-hallucination-detection | Curated paper list, actively maintained through 2025 |

---

*Last updated: May 2026*