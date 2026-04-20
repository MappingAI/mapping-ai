# Schema reference

Canonical enum values, edge types, and the `notes_sources` JSONB shape. Kept in sync with `scripts/enrich/lib/schema.js`. If this file drifts from the code, the code wins and this file should be updated.

## Entity types

`person` | `organization` | `resource`

## Required fields per type

| Type         | Required                |
| ------------ | ----------------------- |
| person       | `name`, `category`      |
| organization | `name`, `category`      |
| resource     | `title`, `resourceType` |

## Person categories (primary role)

`Executive` · `Researcher` · `Policymaker` · `Investor` · `Organizer` · `Journalist` · `Academic` · `Cultural figure`

## Organization categories (sector)

`Frontier Lab` · `AI Safety/Alignment` · `Think Tank/Policy Org` · `Government/Agency` · `Academic` · `VC/Capital/Philanthropy` · `Labor/Civil Society` · `Ethics/Bias/Rights` · `Media/Journalism` · `Political Campaign/PAC` · `AI Infrastructure & Compute` · `AI Deployers & Platforms`

## Resource types

`Essay` · `Book` · `Report` · `Podcast` · `Video` · `Website` · `Academic Paper` · `News Article` · `Substack/Newsletter`

## Belief enums

### Regulatory stance (`regulatoryStance`)

| Value         | Score |
| ------------- | ----- |
| Accelerate    | 1     |
| Light-touch   | 2     |
| Targeted      | 3     |
| Moderate      | 4     |
| Restrictive   | 5     |
| Precautionary | 6     |
| Nationalize   | 7     |
| Mixed/unclear | null  |
| Other         | null  |

### AGI timeline (`agiTimeline`)

| Value              | Score |
| ------------------ | ----- |
| Already here       | 1     |
| 2-3 years          | 2     |
| 5-10 years         | 3     |
| 10-25 years        | 4     |
| 25+ years or never | 5     |
| Ill-defined        | null  |
| Unknown            | null  |

### AI risk level (`aiRiskLevel`)

| Value         | Score |
| ------------- | ----- |
| Overstated    | 1     |
| Manageable    | 2     |
| Serious       | 3     |
| Catastrophic  | 4     |
| Existential   | 5     |
| Mixed/nuanced | null  |
| Unknown       | null  |

### Evidence source (`evidenceSource`)

`Explicitly stated` · `Inferred` · `Unknown`

## Key concerns (free-selection, not a single-pick enum)

`Labor displacement` · `Economic inequality` · `Power concentration` · `Democratic erosion` · `Cybersecurity` · `Misinformation` · `Environmental` · `Weapons` · `Loss of control` · `Copyright/IP` · `Existential risk`

## Submitter relationship

| Value     | Weight |
| --------- | ------ |
| self      | 10     |
| connector | 2      |
| external  | 1      |

The skill always submits as `external` unless the caller explicitly states otherwise. `self` and `connector` are reserved for human contributors speaking about themselves or someone they know directly.

## Edge types (canonical set + aliases)

Canonical values — use these when writing new edges:

| Edge type          | Direction       | Meaning                                                                 |
| ------------------ | --------------- | ----------------------------------------------------------------------- |
| `affiliated`       | symmetric       | person ↔ org or person ↔ person, professional tie with unspecified role |
| `employed_by`      | source → target | person → org, explicit employment                                       |
| `authored_by`      | source → target | resource → person, author attribution                                   |
| `funder`           | source → target | org → person/org/resource                                               |
| `critic`           | source → target | person/org → person/org/resource                                        |
| `collaborator`     | symmetric       | person ↔ person, joint work                                             |
| `former_colleague` | symmetric       | person ↔ person, past shared org                                        |
| `subsidiary_of`    | source → target | org → org, parent/child                                                 |
| `publisher`        | source → target | org → resource                                                          |

Legacy aliases resolved on read:

| Alias         | Canonical     |
| ------------- | ------------- |
| `author`      | `authored_by` |
| `affiliation` | `affiliated`  |
| `employed`    | `employed_by` |

Any other unknown value passes through unchanged so legacy rows aren't broken.

## `notes_sources` JSONB shape

Array of source entries. Each entry:

```json
{
  "url": "https://example.com/article",
  "snippet": "surrounding context from Exa or the retriever",
  "retrieved_at": "2026-04-20T14:00:00Z",
  "retriever": "mcp | exa | web-search | classifier",
  "field_name": "regulatoryStance | agiTimeline | aiRiskLevel | evidenceSource | threatModels | category",
  "quote": "direct excerpt that supports the claim (exact wording, not paraphrase)",
  "claim_date": "2025-11-14",
  "definition": "free-text note on what the speaker meant"
}
```

- `url` and `retrieved_at` are **required** on every entry.
- `field_name`, `quote`, `claim_date`, `definition` are optional but **strongly preferred** — downstream features depend on them.
- `snippet` is the surrounding Exa context (useful for disambiguation); `quote` is the exact excerpt supporting the classification. They can differ.
- `claim_date` is ISO `YYYY-MM-DD`. It's the date the speaker made the claim, not `retrieved_at`.
- `definition` is used mainly on `agiTimeline` entries. Examples: `"economically valuable tasks"`, `"self-improvement / ASI-level"`, `"Turing test"`, `"human-level cognition"`.

### Example — person (regulatory stance + timeline claim)

```json
[
  {
    "url": "https://cset.georgetown.edu/publication/abc",
    "snippet": "Toner argued for a targeted approach to frontier model evaluations…",
    "retrieved_at": "2026-04-20T14:00:00Z",
    "retriever": "mcp",
    "field_name": "regulatoryStance",
    "quote": "We should target the frontier, not the whole ecosystem.",
    "claim_date": "2024-03-12"
  },
  {
    "url": "https://www.80000hours.org/podcast/episodes/helen-toner",
    "snippet": "On timelines, Toner said she expects transformative systems in the 2030s…",
    "retrieved_at": "2026-04-20T14:00:00Z",
    "retriever": "mcp",
    "field_name": "agiTimeline",
    "quote": "I'd put serious weight on 10 to 15 years for the kinds of systems we're discussing.",
    "claim_date": "2023-09-04",
    "definition": "transformative AI — broadly capable autonomous systems, not necessarily full AGI"
  }
]
```

### Example — organization

```json
[
  {
    "url": "https://www.anthropic.com/research/responsible-scaling-policy",
    "snippet": "Anthropic's RSP commits to safety evaluations at defined capability thresholds…",
    "retrieved_at": "2026-04-20T14:00:00Z",
    "retriever": "exa",
    "field_name": "regulatoryStance",
    "quote": "We will pause training when we cross a defined capability threshold until safeguards are met.",
    "claim_date": "2023-09-19"
  }
]
```

### Example — resource

```json
[
  {
    "url": "https://situational-awareness.ai/",
    "snippet": "Aschenbrenner outlines a path from GPT-4 to AGI within the decade…",
    "retrieved_at": "2026-04-20T14:00:00Z",
    "retriever": "mcp",
    "field_name": "category",
    "quote": "Situational awareness: the decade ahead",
    "claim_date": "2024-06-04"
  }
]
```

## Notes_confidence (1–5)

| Score | Meaning                                                       |
| ----- | ------------------------------------------------------------- |
| 5     | Multiple primary sources directly stating this; unambiguous   |
| 4     | One primary source plus corroborating secondary coverage      |
| 3     | Single primary source, or strong inference from public record |
| 2     | Weak inference from indirect evidence                         |
| 1     | No evidence; speculative, flagged for human review            |

## Enrichment version

Opaque string tag on every enrichment run. Current default: `enrichment-skill-v1-2026-04-20`. Consumers bump this (in `scripts/enrich/lib/schema.js#CURRENT_ENRICHMENT_VERSION`) when the Haiku prompt or classifier logic materially changes.

## Field name mapping (DB ↔ frontend)

The `api/export-map.js#toFrontendShape()` layer maps DB columns to frontend field names. Relevant mappings for enrichment:

| DB column                  | Frontend field                             |
| -------------------------- | ------------------------------------------ |
| `belief_regulatory_stance` | `regulatory_stance`                        |
| `belief_agi_timeline`      | `agi_timeline`                             |
| `belief_ai_risk`           | `ai_risk_level`                            |
| `belief_evidence_source`   | `evidence_source`                          |
| `notes_sources`            | `notesSources` (map-detail.json only)      |
| `notes_confidence`         | `notesConfidence` (map-detail.json only)   |
| `enrichment_version`       | `enrichmentVersion` (map-detail.json only) |

When adding a new field, update both the migration and `toFrontendShape()` in the same commit.
