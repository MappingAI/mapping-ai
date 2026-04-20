# Belief classification rubric

This file is loaded at runtime by `scripts/enrich/lib/classify.js` and concatenated into the Haiku prompt. Edit here when calibration is off; no code deploy required.

## Task

Classify a U.S. AI-policy stakeholder's stated positions across five dimensions: regulatory stance, AGI timeline, AI risk level, evidence source, threat models. Attribute each classification to a direct quote from a source with a date where possible.

## Output contract

Return strict JSON matching this shape. No markdown fences. No commentary outside the JSON.

```json
{
  "category": "one of the entity-type categories",
  "otherCategories": "comma-separated string of secondary categories, or empty",
  "regulatoryStance": "one of the stance enum values",
  "agiTimeline": "one of the timeline enum values",
  "aiRiskLevel": "one of the risk enum values",
  "evidenceSource": "Explicitly stated | Inferred | Unknown",
  "threatModels": "short sentence naming the concerns the speaker emphasises",
  "confidence": 1-5,
  "reasoning": "one short paragraph explaining which evidence supports each classification",
  "claims": [
    {
      "field_name": "regulatoryStance | agiTimeline | aiRiskLevel | evidenceSource | threatModels | category",
      "quote": "direct quoted text",
      "url": "source URL",
      "claim_date": "YYYY-MM-DD or null",
      "definition": "free text for AGI claims or null"
    }
  ]
}
```

If evidence is too thin to classify confidently, prefer `Mixed/unclear`, `Ill-defined`, `Mixed/nuanced`, or `Unknown` values over guessing. Set `confidence: 1` or `2` in those cases.

## Regulatory stance rubric

Map the speaker's position on U.S. AI regulation. Weigh explicit policy statements over tone.

| Stance          | What pushes classification toward it                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Accelerate`    | "Regulation is the wrong tool", "We need to move faster", explicit opposition to licensing, export controls, or safety testing requirements. |
| `Light-touch`   | Prefers voluntary standards, industry self-governance, opposes mandatory pre-deployment testing.                                             |
| `Targeted`      | Supports regulating specific capabilities (frontier models, biothreat-relevant systems) without broad rules.                                 |
| `Moderate`      | Supports EU-AI-Act-style tiered approaches; comfortable with NIST frameworks becoming binding.                                               |
| `Restrictive`   | Calls for pre-deployment licensing, capability-based compute thresholds, mandatory third-party audits.                                       |
| `Precautionary` | Argues training of frontier systems should pause, slow, or require extraordinary safety evidence.                                            |
| `Nationalize`   | Advocates government takeover of frontier labs, Manhattan-Project-style compute control, sovereign-wealth-fund ownership.                    |
| `Mixed/unclear` | Statements contradict across contexts, or the person has shifted materially without clear public new position.                               |
| `Other`         | Position is coherent but doesn't fit the ordinal scale (e.g., purely anti-corporate framing without an enforcement mechanism).               |

## AGI timeline rubric

Map the speaker's stated expectation of transformative / AGI / human-level AI arrival. **Always try to capture `definition`** — what the speaker meant — because different people mean different things by "AGI" and the definition-space visualization depends on it.

| Timeline             | What pushes classification toward it                                                   |
| -------------------- | -------------------------------------------------------------------------------------- |
| `Already here`       | Claims current systems (GPT-4, Claude, Gemini) are AGI or are functionally equivalent. |
| `2-3 years`          | Explicit near-term prediction (2026–2028 from a 2025/26 vantage).                      |
| `5-10 years`         | Predicts transformative systems within the decade.                                     |
| `10-25 years`        | 2035–2050 range; "sometime this generation".                                           |
| `25+ years or never` | Deeply skeptical that AGI is coming, or places it beyond 2050.                         |
| `Ill-defined`        | Speaker explicitly argues the term is incoherent and declines to give a timeline.      |
| `Unknown`            | No public statement found.                                                             |

Common definitions to capture in the `definition` field (free text, not a fixed enum):

- `"economically valuable tasks"` — the OpenAI/DeepMind operationalization
- `"self-improvement / ASI-level"` — recursively improving systems
- `"Turing test"` — indistinguishable conversational agent
- `"human-level cognition"` — matches a median human across most tasks
- `"transformative AI"` — 80000 Hours / Open Phil framing, broader than AGI
- `"100% remote-worker replacement"` — capability threshold definition

If the speaker uses multiple definitions across sources, produce a separate `claims` entry per definition with the respective `claim_date` and `url`. Downstream sparkline and definition-space features rely on this granularity.

## AI risk level rubric

| Level           | What pushes classification toward it                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `Overstated`    | Explicitly argues current risk discourse is exaggerated or distracting from real harms.                      |
| `Manageable`    | Acknowledges risks but treats them as tractable with ordinary engineering and policy.                        |
| `Serious`       | Treats catastrophic misuse or accident as plausible, warranting aggressive mitigation.                       |
| `Catastrophic`  | Believes harms at the scale of major historical disasters are likely absent intervention.                    |
| `Existential`   | Believes extinction-level or permanent-disempowerment outcomes are a meaningful possibility.                 |
| `Mixed/nuanced` | Different magnitudes across threat models (e.g., dismisses misuse risk but takes loss-of-control seriously). |
| `Unknown`       | No public statement found.                                                                                   |

## Evidence source

| Value               | Meaning                                                                            |
| ------------------- | ---------------------------------------------------------------------------------- |
| `Explicitly stated` | Found a direct quote from the speaker stating the position.                        |
| `Inferred`          | Position was reconstructed from affiliations, votes, funding, or indirect signals. |
| `Unknown`           | No reliable evidence found.                                                        |

`Inferred` requires the classification to note which inference supports the call in `reasoning`. Never invent inferences where the record is silent — return `Unknown` instead.

## Extracting `claim_date`

Prefer **publication date of the source** (when the speaker said it publicly) over `retrieved_at` (when Exa fetched the page). Priority order:

1. Date the speaker made the statement (interview date, speech date, published-on metadata of the article/podcast).
2. Date the source was published, if the speaker's statement is embedded in it.
3. `null` if neither is discoverable.

Do not guess a date from context. A missing `claim_date` is fine; a fabricated one is worse than useless for the trajectory-sparkline feature.

## Extracting `quote`

Quote the exact wording from the source. Do not paraphrase in the `quote` field — paraphrases belong in `snippet` or `reasoning`. If the source is in a non-English language, quote the original and add an English gloss in `reasoning`. If the source is a podcast with no transcript, omit the `claims` entry rather than approximate.

## Confidence scoring

| Score | When                                                                                                                   |
| ----- | ---------------------------------------------------------------------------------------------------------------------- |
| 5     | Two or more primary sources (speaker's own writing, on-record interview, official filing) directly state the position. |
| 4     | One primary source plus corroborating secondary coverage.                                                              |
| 3     | One primary source, or strong circumstantial evidence from the public record.                                          |
| 2     | Weak inference from affiliations or a single secondary source.                                                         |
| 1     | No evidence; speculative, flagged for human review.                                                                    |

A classifier response with `confidence: 1` should still return valid enum values (use `Unknown` / `Ill-defined` / `Mixed` when forced).

## Category inference

For a **person**: pick the single best-fit primary role from the Person categories in `schema.md`. Secondary roles go in `otherCategories` as a comma-separated string. A PhD researcher who founded a think tank is `Researcher` primary, `Organizer` secondary.

For an **organization**: pick the single best-fit sector. Secondary sectors go in `otherCategories`. A lab that also does policy advocacy is `Frontier Lab` primary, `Think Tank/Policy Org` secondary.

For a **resource**: pick the resource type (`Essay`, `Book`, etc.). Category isn't used on resources.

## Threat models

Free sentence naming the concerns the speaker emphasises. Use phrases from the `KEY_CONCERNS` set in `schema.md` where they fit (`Loss of control`, `Power concentration`, `Misinformation`, etc.), but you may combine or paraphrase. Example: `"Loss of control over self-improving systems; secondary concern about power concentration in a handful of frontier labs."`
