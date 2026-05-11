# Belief Verification Ground Truth Evaluation

## Task

You are helping establish "ground truth" verdicts for a belief verification pipeline. For each entity and belief field below, determine:

1. **Is the current value correct?** Based on the evidence provided (claims + sources), is the entity's belief field accurately captured?

2. **What verdict should the pipeline produce?**
   - `confirm` — current value is correct, evidence supports it
   - `correct` — current value is wrong, propose a different valid value
   - `remove` — no evidence supports any value, field should be null

3. **What confidence level?**
   - `high` — multiple first-person sources agree
   - `medium` — one first-person source OR multiple third-party
   - `low` — only third-party sources OR conflicting evidence

4. **What is the strongest supporting evidence?** Cite the specific claim_id, source_url, and key quote.

## Important Rules

- **First-person evidence required for corrections**: A `correct` verdict requires at least one first-person statement (the entity speaking about their own views). Third-party characterizations alone are NOT sufficient for correction.

- **Attribution types matter**:
  - `first_person` — entity speaking/writing about their own views (strongest)
  - `authored_position` — org's official published position (strong)
  - `third_party_characterization` — journalist/analyst describing views (weak)
  - `inferred_from_action` — inferred from behavior (weakest)

- **Valid enum values** (corrections must use these exactly):

  **belief_regulatory_stance**: `Accelerate`, `Light-touch`, `Targeted`, `Moderate`, `Precautionary`, `Restrictive`, `Nationalize`, `Mixed/unclear`, `Other`

  **belief_agi_timeline**: `Already here`, `2-3 years`, `5-10 years`, `10-25 years`, `25+ years or never`, `Ill-defined`, `Unknown`, `Mixed/unclear`

  **belief_ai_risk**: `Overstated`, `Manageable`, `Serious`, `Catastrophic`, `Existential`, `Mixed/nuanced`, `Unknown`

  **belief_threat_models**: `Labor displacement`, `Economic inequality`, `Power concentration`, `Democratic erosion`, `Cybersecurity`, `Misinformation`, `Environmental`, `Weapons`, `Loss of control`, `Copyright/IP`, `Existential risk`

  **belief_evidence_source**: `Explicitly stated`, `Inferred`, `Inferred from actions`

  **belief_regulatory_stance_detail**: Free-form text (no enum — verify accuracy of the summary)

## Fields to Verify

**For persons and organizations** (only verify fields with non-null values):

### Enum Fields
- `belief_regulatory_stance` — categorical position on AI regulation
- `belief_agi_timeline` — when they expect AGI
- `belief_ai_risk` — level of concern about AI risks
- `belief_threat_models` — specific threats they're concerned about (up to 3)
- `belief_evidence_source` — how the belief was determined

### Text Fields
- `belief_regulatory_stance_detail` — free text summary of their regulatory position

### Evidence Source Classification
For `belief_evidence_source`, verify based on the claims:
- **Explicitly stated**: Entity directly stated their views (first-person quotes, testimony, op-eds)
- **Inferred**: Third-party characterizations or analysis only
- **Inferred from actions**: Deduced from behavior/decisions without explicit statements

---

## Output Format

For each entity, provide verdicts in this format:

```
### [Entity Name] (ID: X)

#### belief_regulatory_stance
- Current value: [value]
- Verdict: [confirm/correct/remove]
- Proposed value: [if correct, the new value; otherwise null]
- Confidence: [high/medium/low]
- Rationale: [1-2 sentences explaining why]
- Strongest evidence: [claim_id] — "[key quote]" (source: [url])

#### belief_agi_timeline
...

#### belief_ai_risk
...

#### belief_threat_models
...
```

---

## Test Entities

Please evaluate the following 10 entities. The complete data (entity fields + all claims + all sources) is provided in the attached JSON.

1. **Sam Altman** (ID: 18) — person / Executive
2. **Yann LeCun** (ID: 92) — person / Researcher
3. **Elon Musk** (ID: 48) — person / Executive
4. **Geoffrey Hinton** (ID: 821) — person / Academic
5. **Ed Markey** (ID: 113) — person / Policymaker
6. **Future of Life Institute** (ID: 229) — organization / Think Tank
7. **Reddit** (ID: 743) — organization / Media
8. **Trump administration** (ID: 1169) — organization / Government
9. **Roman Yampolskiy** (ID: 326) — person / Academic
10. **Timothée Lacroix** (ID: 1724) — person / Researcher

---

## Instructions for Use

1. Copy this entire prompt into Claude web
2. Attach or paste the `test-suite-data.json` file containing the complete entity + claims + sources data
3. Ask Claude to evaluate each entity and provide ground truth verdicts

The verdicts you generate will be compared against the automated pipeline's outputs to validate accuracy.
