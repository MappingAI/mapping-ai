# Belief Verification Test Suite

10 entities selected to cover varied and complex verification scenarios.

## Files

| File | Purpose |
|------|---------|
| `test-suite.md` | This file — summary of test entities and expected outcomes |
| `beliefs-3/test-suite-data.json` | Complete raw data (entity + claims + sources) for all 10 entities |
| `beliefs-3/claude-web-prompt.md` | Prompt for Claude web to establish ground truth verdicts |

## Ground Truth Evaluation

To establish "correct" verdicts before running the pipeline:

1. Open Claude web (claude.ai)
2. Paste contents of `beliefs-3/claude-web-prompt.md`
3. Attach `beliefs-3/test-suite-data.json`
4. Claude will evaluate each entity/field and provide ground truth verdicts
5. Compare against pipeline outputs

## Pipeline: 3-Agent Design (`beliefs-3/`)

**Architecture:**
- Prosecutor (Sonnet) — searches for evidence AGAINST current value
- Defender (Sonnet) — searches for evidence FOR current value
- Judge (Opus + extended thinking) — reads debate transcript only

**Fields verified (persons and organizations):**
- `belief_regulatory_stance` — enum value
- `belief_regulatory_stance_detail` — free text summary
- `belief_agi_timeline` — enum value
- `belief_ai_risk` — enum value
- `belief_threat_models` — multi-enum (up to 3)
- `belief_evidence_source` — enum (Explicitly stated / Inferred / Inferred from actions)

## Source Integration

Existing sources from the database are presented as **neutral "initial sources"** — formatted identically to Exa search results with no "database" labeling:

```json
INITIAL SOURCES:
[
  { "url": "https://...", "title": "...", "text": "...", "publishedDate": "..." }
]
```

Both agents:
- Receive the same initial sources
- Evaluate them on their merits (like any search result)
- Can search for additional sources via Exa
- Don't know which sources came from the database

This ensures existing evidence gets considered without anchoring bias.

---

## Test Entities

### 1. Sam Altman (ID: 18)

**Type:** person / Executive
**Existing claims:** 10
**Why include:** High-profile, lots of public statements, has claims in DB. Expect **confirm**.

| Field | Current Value |
|-------|---------------|
| `belief_regulatory_stance` | Targeted |
| `belief_regulatory_stance_detail` | Advocates for targeted regulation of AI systems above certain capability thresholds, including licensing or registration requirements for development and release of advanced AI models. Testified before Senate in May 2023 supporting safety requirements, external testing, and publication of evaluation results. Has called for establishment of a global regulatory body modeled after the International Atomic Energy Agency (IAEA) to manage AI risks, particularly around biosecurity threats. Recently negotiated Pentagon contract in March 2026 with specific safeguards against domestic surveillance and autonomous weapons, stating OpenAI would 'never do mass domestic surveillance, even if the government said it was legal, because it violates the constitution.' Initially signed 'opportunistic and sloppy' Pentagon deal but amended it after backlash to explicitly prohibit domestic surveillance of U.S. persons and require follow-on modifications for intelligence agency use. Acknowledges that while OpenAI can design safety guardrails, 'operational decisions' ultimately rest with government agencies like the Department of Defense. |
| `belief_evidence_source` | Explicitly stated |
| `belief_agi_timeline` | 2-3 years |
| `belief_ai_risk` | Serious |
| `belief_threat_models` | Power concentration, Misinformation, Weapons |

---

### 2. Yann LeCun (ID: 92)

**Type:** person / Researcher
**Existing claims:** 10
**Why include:** High-profile contrarian (Light-touch, Overstated risk). Controversial but verifiable views that differ from AI safety mainstream.

| Field | Current Value |
|-------|---------------|
| `belief_regulatory_stance` | Light-touch |
| `belief_regulatory_stance_detail` | Strong advocate for open-source AI development and minimal regulation that could impede research progress. Co-signed open letter to EU policymakers in 2024 criticizing fragmented regulatory decision-making and arguing that regulations should not impair open research, model training, and responsible product deployment. In September 2023 Senate Intelligence Committee testimony, supported voluntary commitments like the White House's AI commitments and collaborative industry standards rather than restrictive government oversight. Argues that open-source platforms are essential for preventing concentration of AI power and ensuring diverse, democratically-aligned AI systems. Called current AI systems 'not that smart' and argued against premature regulation of LLMs, stating in TIME interview that claims about needing to regulate LLMs because they're 'gonna be so dangerous' are 'just not true. |
| `belief_evidence_source` | Explicitly stated |
| `belief_agi_timeline` | 10-25 years |
| `belief_ai_risk` | Overstated |
| `belief_threat_models` | Power concentration, Misinformation |

---

### 3. Elon Musk (ID: 48)

**Type:** person / Executive
**Existing claims:** 9
**Why include:** Mixed/unclear stance - tests whether pipeline can find evidence to **correct** to a specific value or **remove** as unverifiable.

| Field | Current Value |
|-------|---------------|
| `belief_regulatory_stance` | Mixed/unclear |
| `belief_regulatory_stance_detail` | Takes contradictory positions on AI regulation depending on context and competitive dynamics. Has called for AI regulation and pausing development when competitors were ahead, warning of catastrophic risks and advocating for government oversight. However, when his own xAI became competitive, shifted toward opposing restrictions. Federal government adopted xAI's Grok despite it violating the Trump Administration's own Executive Order 14319 requiring 'truth-seeking, accurate, and ideologically neutral' AI systems. Grok has been documented producing racist, antisemitic, and conspiratorial content, leading to California AG investigation and cease-and-desist orders over nonconsensual sexual deepfakes. |
| `belief_evidence_source` | Explicitly stated |
| `belief_agi_timeline` | 2-3 years |
| `belief_ai_risk` | Catastrophic |
| `belief_threat_models` | Power concentration, Democratic erosion, Loss of control |

---

### 4. Geoffrey Hinton (ID: 821)

**Type:** person / Academic
**Existing claims:** 11
**Why include:** "Godfather of AI" who publicly changed views. Tests whether pipeline catches evolved positions. Timeline (10-25 years) may be outdated given recent statements.

| Field | Current Value |
|-------|---------------|
| `belief_regulatory_stance` | Moderate |
| `belief_regulatory_stance_detail` | Advocates for government intervention requiring companies to spend resources on AI safety research (suggesting 10% of resources), supports international cooperation similar to nuclear weapons treaties, but opposes complete development moratoriums as unrealistic due to competition between countries and companies. |
| `belief_evidence_source` | Explicitly stated |
| `belief_agi_timeline` | 10-25 years |
| `belief_ai_risk` | Existential |
| `belief_threat_models` | Loss of control, Labor displacement, Existential risk |

---

### 5. Ed Markey (ID: 113)

**Type:** person / Policymaker
**Existing claims:** 17
**Why include:** Most claims in test suite (17). Clear Precautionary stance with legislative record. Strong **confirm** candidate.

| Field | Current Value |
|-------|---------------|
| `belief_regulatory_stance` | Precautionary |
| `belief_regulatory_stance_detail` | Co-authored the AI Civil Rights Act requiring companies to conduct independent audits to identify algorithmic discrimination, prohibiting discriminatory AI use, and giving individuals right to appeal AI decisions to humans. Also introduced the Eliminating BIAS Act mandating federal agencies establish civil rights offices to combat algorithmic bias. Strongly opposed Trump administration's proposed 10-year moratorium on state AI regulation, leading bipartisan Senate efforts that defeated it 99-1. Advocates for 'moral leadership' in AI, stating 'we cannot abandon our principles in reckless pursuit of technological superiority. |
| `belief_evidence_source` | Explicitly stated |
| `belief_agi_timeline` | 5-10 years |
| `belief_ai_risk` | Serious |
| `belief_threat_models` | Bias/discrimination, Labor displacement, Economic inequality |

---

### 6. Future of Life Institute (ID: 229)

**Type:** organization / Think Tank/Policy Org
**Existing claims:** 16
**Why include:** Organization with clear position (Precautionary/Existential). Tests org verification path. Well-documented public positions.

| Field | Current Value |
|-------|---------------|
| `belief_regulatory_stance` | Precautionary |
| `belief_regulatory_stance_detail` | Advocates for mandatory safety standards, pre-deployment licensing, and audits for advanced AI systems. Calls for moratoriums on uncontrollable AI development, export controls on frontier models, and strict liability frameworks. Supports tiered regulatory approach with increasingly stringent requirements based on AI capabilities. |
| `belief_evidence_source` | Explicitly stated |
| `belief_agi_timeline` | *(null)* |
| `belief_ai_risk` | Existential |
| `belief_threat_models` | Loss of control, Existential risk, Power concentration |

---

### 7. Reddit (ID: 743)

**Type:** organization / Media/Journalism
**Existing claims:** 1
**Why include:** Lesser-known org policy position. Tests org with sparse existing claims. Evidence is "Inferred" not explicit.

| Field | Current Value |
|-------|---------------|
| `belief_regulatory_stance` | Light-touch |
| `belief_regulatory_stance_detail` | Reddit has positioned itself as supporting content licensing standards (backing Really Simple Licensing initiative) while maintaining control over its data through selective AI partnerships and blocking unauthorized crawlers. The platform emphasizes human-first content policies while monetizing AI training data deals. |
| `belief_evidence_source` | Inferred |
| `belief_agi_timeline` | *(null)* |
| `belief_ai_risk` | Mixed/nuanced |
| `belief_threat_models` | Misinformation, Copyright/IP |

---

### 8. Trump administration (ID: 1169)

**Type:** organization / Government/Agency
**Existing claims:** 12
**Why include:** Politically charged entity. Tests controversial/contested verification. "Accelerate" stance with "Inferred" evidence - may need correction or better sourcing.

| Field | Current Value |
|-------|---------------|
| `belief_regulatory_stance` | Accelerate |
| `belief_regulatory_stance_detail` | *(null)* |
| `belief_evidence_source` | Inferred |
| `belief_agi_timeline` | *(null)* |
| `belief_ai_risk` | Manageable |
| `belief_threat_models` | *(null)* |

---

### 9. Roman Yampolskiy (ID: 326)

**Type:** person / Academic
**Existing claims:** 11
**Why include:** Extreme AI safety advocate. Tests verification of strong/clear positions. Has all belief fields populated including multi-value threat_models.

| Field | Current Value |
|-------|---------------|
| `belief_regulatory_stance` | Precautionary |
| `belief_regulatory_stance_detail` | Strongly advocates for extreme caution in AI development, arguing that superintelligent AI cannot be indefinitely controlled. Promotes narrow AI development over AGI and calls for potential moratoriums on superintelligence research until safety is better understood. |
| `belief_evidence_source` | Explicitly stated |
| `belief_agi_timeline` | 2-3 years |
| `belief_ai_risk` | Existential |
| `belief_threat_models` | Existential risk, Loss of control, Cybersecurity |

---

### 10. Timothée Lacroix (ID: 1724)

**Type:** person / Researcher
**Existing claims:** 0
**Why include:** No existing claims (lesser known Meta AI researcher). Tests **remove** verdict when no evidence found. All values are "Inferred" with no detail.

| Field | Current Value |
|-------|---------------|
| `belief_regulatory_stance` | Light-touch |
| `belief_regulatory_stance_detail` | *(null)* |
| `belief_evidence_source` | Inferred |
| `belief_agi_timeline` | *(null)* |
| `belief_ai_risk` | Manageable |
| `belief_threat_models` | *(null)* |

---

## Test Coverage Matrix

| Scenario | Entities |
|----------|----------|
| High evidence availability | Sam Altman, Yann LeCun, Geoffrey Hinton, Ed Markey |
| Mixed/contested values | Elon Musk, Geoffrey Hinton (views changed) |
| Organizations | FLI, Reddit, Trump administration |
| Extreme positions | Roman Yampolskiy (safety), Trump admin (accelerate) |
| Multi-value fields (threat_models) | Sam Altman, Elon Musk, Hinton, Markey, Yampolskiy |
| Low evidence / remove candidate | Timothée Lacroix, Reddit |
| Inferred evidence (not explicit) | Reddit, Trump admin, Timothée Lacroix |
| Many existing claims (15+) | Ed Markey (17), FLI (16) |
| No existing claims | Timothée Lacroix (0) |

## Quick Reference: Evidence Availability

| ID | Entity | Type | Claims | Key Fields |
|----|--------|------|--------|------------|
| 18 | Sam Altman | person | 10 | stance=Targeted, timeline=2-3y, risk=Serious |
| 92 | Yann LeCun | person | 10 | stance=Light-touch, timeline=10-25y, risk=Overstated |
| 48 | Elon Musk | person | 9 | stance=Mixed/unclear, timeline=2-3y, risk=Catastrophic |
| 821 | Geoffrey Hinton | person | 11 | stance=Moderate, timeline=10-25y, risk=Existential |
| 113 | Ed Markey | person | 17 | stance=Precautionary, timeline=5-10y, risk=Serious |
| 229 | Future of Life Institute | org | 16 | stance=Precautionary, risk=Existential |
| 743 | Reddit | org | 1 | stance=Light-touch, risk=Mixed/nuanced |
| 1169 | Trump administration | org | 12 | stance=Accelerate, risk=Manageable |
| 326 | Roman Yampolskiy | person | 11 | stance=Precautionary, timeline=2-3y, risk=Existential |
| 1724 | Timothée Lacroix | person | 0 | stance=Light-touch (inferred), risk=Manageable |

## Run Command

```bash
# 3-agent design (recommended)
node beliefs-3/run.js --id=18,92,48,821,113,229,743,1169,326,1724

# Or run a single entity
node beliefs-3/run.js --id=18
```

## Ground Truth Verdicts (Claude Web Evaluation)

Established via manual evaluation of all claims + sources by Claude. This is the "correct" output the pipeline should produce.

### Summary of Expected Changes

| Entity | Field | Current | Verdict | Proposed | Confidence |
|--------|-------|---------|---------|----------|------------|
| Sam Altman | regulatory_stance | Targeted | **correct** | Mixed/unclear | high |
| Sam Altman | agi_timeline | 2-3 years | confirm | — | high |
| Sam Altman | ai_risk | Serious | **correct** | Mixed/nuanced | high |
| Sam Altman | threat_models | Power concentration, Misinformation, Weapons | confirm | — | medium |
| Yann LeCun | regulatory_stance | Light-touch | confirm | — | high |
| Yann LeCun | agi_timeline | 10-25 years | confirm | — | high |
| Yann LeCun | ai_risk | Overstated | confirm | — | high |
| Yann LeCun | threat_models | Power concentration, Misinformation | confirm | — | medium |
| Elon Musk | regulatory_stance | Mixed/unclear | confirm | — | high |
| Elon Musk | agi_timeline | 2-3 years | confirm | — | high |
| Elon Musk | ai_risk | Catastrophic | **correct** | Existential | high |
| Elon Musk | threat_models | Power concentration, Democratic erosion, Loss of control | confirm | — | medium |
| Geoffrey Hinton | regulatory_stance | Moderate | **correct** | Restrictive | high |
| Geoffrey Hinton | agi_timeline | 10-25 years | **correct** | 5-10 years | high |
| Geoffrey Hinton | ai_risk | Existential | confirm | — | high |
| Geoffrey Hinton | threat_models | Loss of control, Labor displacement, Existential risk | confirm | — | medium |
| Ed Markey | regulatory_stance | Precautionary | **correct** | Restrictive | high |
| Ed Markey | agi_timeline | 5-10 years | **remove** | null | high |
| Ed Markey | ai_risk | Serious | confirm | — | high |
| Ed Markey | threat_models | Bias/discrimination... | **correct** | Labor displacement, Economic inequality, Democratic erosion | medium |
| FLI | regulatory_stance | Precautionary | **correct** | Restrictive | high |
| FLI | ai_risk | Existential | confirm | — | high |
| FLI | threat_models | Loss of control, Existential risk, Power concentration | **remove** | null | medium |
| Reddit | regulatory_stance | Light-touch | **remove** | null | high |
| Reddit | ai_risk | Mixed/nuanced | **remove** | null | high |
| Reddit | threat_models | Misinformation, Copyright/IP | **remove** | null | high |
| Trump admin | regulatory_stance | Accelerate | **correct** | Light-touch | high |
| Trump admin | ai_risk | Manageable | confirm | — | medium |
| Roman Yampolskiy | regulatory_stance | Precautionary | confirm | — | high |
| Roman Yampolskiy | agi_timeline | 2-3 years | confirm | — | high |
| Roman Yampolskiy | ai_risk | Existential | confirm | — | high |
| Roman Yampolskiy | threat_models | Existential risk, Loss of control, Cybersecurity | confirm | — | high |
| Timothée Lacroix | regulatory_stance | Light-touch | **remove** | null | high |
| Timothée Lacroix | ai_risk | Manageable | **remove** | null | high |

### Verdict Counts

| Verdict | Count |
|---------|-------|
| confirm | 20 |
| correct | 10 |
| remove | 8 |

### Key Findings

**Corrections needed (10):**
- **Sam Altman**: regulatory_stance and ai_risk both show contradictory first-person evidence → Mixed/unclear and Mixed/nuanced
- **Elon Musk**: ai_risk explicitly "existential" in multiple first-person sources, not just "Catastrophic"
- **Geoffrey Hinton**: Updated views — now more restrictive on regulation, shorter timeline on AGI
- **Ed Markey**: regulatory_stance is Restrictive (mandatory prohibitions), not Precautionary; threat_models uses invalid enum value
- **FLI**: Restrictive (calling for prohibition), not just Precautionary
- **Trump admin**: Light-touch (minimal federal framework), not Accelerate

**Removals needed (8):**
- **Ed Markey agi_timeline**: Only evidence is unverified crowdsourced submission
- **FLI threat_models**: Zero claims for threat_models dimension
- **Reddit**: Zero claims for regulatory_stance, ai_risk, or threat_models — all purely inferred
- **Trump admin**: No threat_models value in DB (already null)
- **Timothée Lacroix**: Zero claims for any field

**Schema issue found:**
- Ed Markey's `threat_models` contains "Bias/discrimination" which is not a valid enum value

---

## Detailed Ground Truth Evaluations

### Sam Altman (ID: 18)

#### belief_regulatory_stance
- **Current:** Targeted
- **Verdict:** correct → **Mixed/unclear**
- **Confidence:** high
- **Rationale:** Contradictory first-person evidence. In 2024 Harvard interview advocates IAEA-style targeted regulation, but May 2025 Senate testimony called government approval "disastrous". Two strong sources pulling opposite directions.
- **Key evidence:** `18_regulatory_stance_src-8fbe3546e544` — *"requiring government approval to release powerful artificial intelligence software would be 'disastrous'"* contradicts `18_regulatory_stance_src-9c8620a0b152`

#### belief_agi_timeline
- **Current:** 2-3 years
- **Verdict:** confirm
- **Confidence:** high
- **Rationale:** Feb 2026 "couple of years away from superintelligence" and 2028 intellectual capacity claim both consistent.
- **Key evidence:** `18_agi_timeline_src-09b26d32f9d1` — *"by the end of 2028, more of the world's intellectual capacity could reside inside of data centers"*

#### belief_ai_risk
- **Current:** Serious
- **Verdict:** correct → **Mixed/nuanced**
- **Confidence:** high
- **Rationale:** Claims show three distinct stances: Serious (Bloomberg 2025), Existential (OpenAI charter), Catastrophic (April 2026 warning). All first-person.
- **Key evidence:** `18_ai_risk_level_src-572c60c54905` — *"we are going to operate as if these risks are existential"* contradicts Serious label

#### belief_threat_models
- **Current:** Power concentration, Misinformation, Weapons
- **Verdict:** confirm
- **Confidence:** medium
- **Rationale:** Biosecurity, weapons, surveillance concerns documented. Reasonable inference.

---

### Yann LeCun (ID: 92)

#### belief_regulatory_stance
- **Current:** Light-touch
- **Verdict:** confirm
- **Confidence:** high
- **Rationale:** Multiple consistent first-person sources — 1925 airline analogy, EU open letter, Senate testimony. No contradicting evidence.
- **Key evidence:** `92_regulatory_stance_src-7cdb637d586d` — *"Regulating leading-edge AI models today would be like regulating the jet airline industry in 1925"*

#### belief_agi_timeline
- **Current:** 10-25 years
- **Verdict:** confirm
- **Confidence:** high
- **Rationale:** Podcasts cite 5-20 year range with heavy uncertainty. 10-25 years defensible given his skepticism.
- **Key evidence:** `92_agi_timeline_src-b17adfd1fa86` — *"The most optimistic view is that we'll have something that is close to human intelligence...within five to 10 years"*

#### belief_ai_risk
- **Current:** Overstated
- **Verdict:** confirm
- **Confidence:** high
- **Rationale:** Three unambiguous first-person sources: "Complete B.S.", "preposterous", fallacy argument.
- **Key evidence:** `92_ai_risk_level_src-99cb5cdabd7d` — *"that's complete B.S."*

#### belief_threat_models
- **Current:** Power concentration, Misinformation
- **Verdict:** confirm
- **Confidence:** medium
- **Rationale:** Open-source advocacy to prevent power concentration well-documented.

---

### Elon Musk (ID: 48)

#### belief_regulatory_stance
- **Current:** Mixed/unclear
- **Verdict:** confirm
- **Confidence:** high
- **Rationale:** Perfect illustration of Mixed/unclear — Bloomberg "few referees" vs xAI lawsuit "hampers innovation". Both first-person.
- **Key evidence:** `48_regulatory_stance_src-2460feef4912` + `48_regulatory_stance_src-c22278429be3` in contradiction

#### belief_agi_timeline
- **Current:** 2-3 years
- **Verdict:** confirm
- **Confidence:** high
- **Rationale:** Three sources 2025-2026 all point to 2026-2027.
- **Key evidence:** `48_agi_timeline_src-788215458ae6` — *"I think we'll hit AGI next year in 26"*

#### belief_ai_risk
- **Current:** Catastrophic
- **Verdict:** correct → **Existential**
- **Confidence:** high
- **Rationale:** Two sources explicitly use "existential" and cite 10-20% extinction probability. Crosses into Existential territory.
- **Key evidence:** `48_ai_risk_level_src-78a773cca017` — *"AI is a fundamental existential risk for humanity"* + `48_ai_risk_level_src-708608d00363` — *"10% or 20%"* extinction chance

#### belief_threat_models
- **Current:** Power concentration, Democratic erosion, Loss of control
- **Verdict:** confirm
- **Confidence:** medium

---

### Geoffrey Hinton (ID: 821)

#### belief_regulatory_stance
- **Current:** Moderate
- **Verdict:** correct → **Restrictive**
- **Confidence:** high
- **Rationale:** All three claims point to Restrictive — "car with no steering wheel", "lobbying for less regulation", "dangerous". Conflicts with every first-person source.
- **Key evidence:** `821_regulatory_stance_src-d3d4ac3cb119` — *"They want a very fast car with no steering wheel"* + `821_regulatory_stance_src-96bb3efdb21c` — *"they're lobbying to get less AI regulation"*

#### belief_agi_timeline
- **Current:** 10-25 years
- **Verdict:** correct → **5-10 years**
- **Confidence:** high
- **Rationale:** Updated view to 5-20 years, "might even be 5 years", "good chance in 10 years or less". Recent evidence puts central estimate in 5-10 years.
- **Key evidence:** `821_agi_timeline_src-209708683633` — *"I now predict 5 to 20 years but without much confidence"*

#### belief_ai_risk
- **Current:** Existential
- **Verdict:** confirm
- **Confidence:** high
- **Rationale:** Direct statement of >50% existential risk probability.
- **Key evidence:** `821_ai_risk_level_src-ce3256be6a09` — *">50% existential threat"*

#### belief_threat_models
- **Current:** Loss of control, Labor displacement, Existential risk
- **Verdict:** confirm
- **Confidence:** medium

---

### Ed Markey (ID: 113)

#### belief_regulatory_stance
- **Current:** Precautionary
- **Verdict:** correct → **Restrictive**
- **Confidence:** high
- **Rationale:** Mandatory audits, prohibitions, "strict guardrails". Legislation mandates specific constraints, not just precautionary standards.
- **Key evidence:** `113_regulatory_stance_src-55524ed6dcbc` — *"AI revolution unleashed without safeguards"* + AI Civil Rights Act mandatory prohibitions

#### belief_agi_timeline
- **Current:** 5-10 years
- **Verdict:** **remove** → null
- **Confidence:** high
- **Rationale:** Only source is crowdsourced submission, confidence=unverified, no external URL. No real evidence.
- **Key evidence for removal:** `113_agi_timeline_src-crowdsourced-db` is `claim_type: crowdsourced_submission` with `confidence: unverified`

#### belief_ai_risk
- **Current:** Serious
- **Verdict:** confirm
- **Confidence:** high
- **Rationale:** Four high-confidence claims consistent with Serious — significant but addressable harms.
- **Key evidence:** `113_ai_risk_level_src-55524ed6dcbc` — *"real danger...without the safeguards"*

#### belief_threat_models
- **Current:** Bias/discrimination, Labor displacement, Economic inequality
- **Verdict:** correct → **Labor displacement, Economic inequality, Democratic erosion**
- **Confidence:** medium
- **Rationale:** "Bias/discrimination" is NOT a valid enum value. Democratic erosion better supported by state preemption opposition.

---

### Future of Life Institute (ID: 229)

#### belief_regulatory_stance
- **Current:** Precautionary
- **Verdict:** correct → **Restrictive**
- **Confidence:** high
- **Rationale:** Four Restrictive claims — 2023 pause letter, 2025 superintelligence prohibition, $8M campaign. Calling for prohibition, not just precautionary standards.
- **Key evidence:** `229_regulatory_stance_src-92eb12bc7a74` — October 2025 Statement on Superintelligence calling for prohibition

#### belief_ai_risk
- **Current:** Existential
- **Verdict:** confirm
- **Confidence:** high
- **Rationale:** One high-confidence claim from FLI's official position page directly states existential threat.
- **Key evidence:** futureoflife.org/our-position-on-ai/ — *"this represents an existential threat to humanity, either through terminal disempowerment or literal extinction"*

#### belief_threat_models
- **Current:** Loss of control, Existential risk, Power concentration
- **Verdict:** **remove** → null
- **Confidence:** medium
- **Rationale:** Zero claims for threat_models dimension. Value appears to be inferred from general positions, not sourced.
- **Key evidence for removal:** No claims exist for `belief_dimension: threat_models` for entity 229

---

### Reddit (ID: 743)

#### belief_regulatory_stance
- **Current:** Light-touch
- **Verdict:** **remove** → null
- **Confidence:** high
- **Rationale:** Zero claims for regulatory stance. Purely inferred with no evidentiary support.
- **Key evidence for removal:** No claims exist for `belief_dimension: regulatory_stance` for entity 743

#### belief_ai_risk
- **Current:** Mixed/nuanced
- **Verdict:** **remove** → null
- **Confidence:** high
- **Rationale:** Zero claims for ai_risk dimension. Purely inferred.
- **Key evidence for removal:** No claims exist for `belief_dimension: ai_risk_level` for entity 743

#### belief_threat_models
- **Current:** Misinformation, Copyright/IP
- **Verdict:** **remove** → null
- **Confidence:** high
- **Rationale:** Zero claims for threat_models dimension. Purely inferred from business actions.
- **Key evidence for removal:** No claims exist for `belief_dimension: threat_models` for entity 743

---

### Trump administration (ID: 1169)

#### belief_regulatory_stance
- **Current:** Accelerate
- **Verdict:** correct → **Light-touch**
- **Confidence:** high
- **Rationale:** All five claims support Light-touch — "removing barriers", "one federal standard". Not opposing all regulation, proposing minimal federal framework with state preemption.
- **Key evidence:** `1169_regulatory_stance_src-d52675cdb4dc` — *"removal of outdated or unnecessary barriers"*

#### belief_ai_risk
- **Current:** Manageable
- **Verdict:** confirm
- **Confidence:** medium
- **Rationale:** Three medium-confidence claims all indicate Manageable — administration frames safety as secondary to progress, removes "burdensome requirements". Third-party characterizations but consistent.
- **Key evidence:** zdnet.com — *"The administration has framed safety as antithetical to progress in AI"*

---

### Roman Yampolskiy (ID: 326)

#### belief_regulatory_stance
- **Current:** Precautionary
- **Verdict:** confirm
- **Confidence:** high
- **Rationale:** Direct statement endorsing "pointless government red tape" as deliberate slowdown.
- **Key evidence:** `326_regulatory_stance_src-62a996a9d4f7` — *"If you insist on pointless government red tape...I strongly encourage it"*

#### belief_agi_timeline
- **Current:** 2-3 years
- **Verdict:** confirm
- **Confidence:** high
- **Key evidence:** `326_agi_timeline_src-394cb5c497c0` — *"AGI by 2027"*

#### belief_ai_risk
- **Current:** Existential
- **Verdict:** confirm
- **Confidence:** high
- **Key evidence:** `326_ai_risk_level_src-44e4917e01af` — *"99.9% chance of AI leading to human extinction"*

#### belief_threat_models
- **Current:** Existential risk, Loss of control, Cybersecurity
- **Verdict:** confirm
- **Confidence:** high

---

### Timothée Lacroix (ID: 1724)

#### belief_regulatory_stance
- **Current:** Light-touch
- **Verdict:** **remove** → null
- **Confidence:** high
- **Rationale:** Zero claims. No evidence whatsoever.

#### belief_ai_risk
- **Current:** Manageable
- **Verdict:** **remove** → null
- **Confidence:** high
- **Rationale:** Zero claims. No evidence whatsoever.
