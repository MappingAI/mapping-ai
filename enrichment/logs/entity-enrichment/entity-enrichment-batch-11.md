# Entity Enrichment — Batch 11
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 42

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1364 | Shane Legg | 10 | 4 |
| 1362 | MIT Computer Science & Artificial Intelligence Laboratory | 11 | 4 |
| 1361 | MIT Jameel Clinic | 10 | 5 |
| 1347 | Helion Energy | 10 | 5 |

---

## Changes

### 1364 Shane Legg — person (Executive)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Existential |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | 2-3 years |
| funding_model | NULL | Private/corporate |
| influence_type | NULL | Researcher/analyst, Decision-maker |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | TRUE | TRUE |

**Notes written:** Co-founder and Chief AGI Scientist at Google DeepMind, leading its Technical AGI Safety team. Has predicted a 50% chance of human-level AGI by 2028 since 2009, reaffirmed publicly in 2025. Advocates for deliberative, human-auditable AI safety mechanisms to address alignment and misuse risks.

**Sources:**
- https://deepmind.google/blog/taking-a-responsible-path-to-agi/
- https://www.dwarkesh.com/p/shane-legg
- https://www.nextbigfuture.com/2025/12/google-ai-lead-shane-legg-defines-levels-of-agi-and-superintelligence-and-how-to-test-for-it.html

**Confidence:** 4/5 — Multiple corroborating sources for AGI timeline prediction and risk views; regulatory stance inferred from safety research focus rather than explicit policy statements.

**Note on belief_agi_timeline:** Legg's 2025 public statements predict AGI ~2027-2028 from date of statement, placing it in the "2-3 years" bucket relative to late 2025.

---

### 1362 MIT Computer Science & Artificial Intelligence Laboratory — organization (Academic)

**DUPLICATE FLAG:** Entity 947 (MIT CSAIL) was already enriched in a prior batch and covers the same organization. Entity 1362 uses the full legal name. Both have distinct edges (1362 is connected via Regina Barzilay as member; 947 has additional edges). Enriched 1362 normally as instructed — flag for potential deduplication review.

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | 5-10 years |
| funding_model | NULL | Academic |
| other_categories | NULL | AI Safety/Alignment |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | TRUE | TRUE |

**Notes written:** MIT's largest AI research lab, directed by Daniela Rus, covering robotics, systems, and machine learning. In 2025 submitted AI Action Plan recommendations to the White House advocating federal investment in basic research, AI hardware co-design, and ASI-level capabilities. Published the 2025 AI Agent Index assessing transparency of deployed AI systems.

**Sources:**
- https://internetpolicy.mit.edu/mit-csail-ai-action-plan-recommendations-2025/
- https://www.csail.mit.edu/research
- https://dailysecurityreview.com/cyber-security/mit-csails-2025-ai-agent-index-puts-system-transparency-under-the-microscope/

**Confidence:** 4/5 — Strong sourcing from CSAIL's own White House submission; belief fields inferred from institutional stance (pro-federal investment, pro-transparency) rather than explicit AI risk framing.

---

### 1361 MIT Jameel Clinic — organization (Academic)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| funding_model | NULL | Academic |
| other_categories | NULL | Ethics/Bias/Rights |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | TRUE | TRUE |

**Notes written:** Abdul Latif Jameel Clinic for Machine Learning in Health, founded 2018 as a joint MIT–Community Jameel initiative. Conducts translational AI research across clinical AI, drug discovery, and epidemiology. Developed clinical AI tools MIRAI and SYBIL, and discovered antibiotics halicin and abaucin using AI-driven methods.

**Sources:**
- https://jclinic.mit.edu/
- https://en.wikipedia.org/wiki/MIT_Jameel_Clinic
- https://news.mit.edu/2026/mit-scientists-investigate-memorization-risk-clinical-ai-0105

**Confidence:** 5/5 — Well-documented institution with clear mission, named tools, and verifiable research outputs. Belief fields inferred from research focus on safety/equity of clinical AI (memorization risks, equitable access).

---

### 1347 Helion Energy — organization (Infrastructure & Compute)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Unknown |
| belief_evidence_source | NULL | Inferred |
| funding_model | NULL | Private/corporate |
| other_categories | NULL | VC/Capital/Philanthropy |
| influence_type | NULL | Builder |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | TRUE | TRUE |

**Notes written:** Private nuclear fusion company building the Orion plant in Chelan County, WA, targeting power delivery to Microsoft data centers by 2028 under the world's first fusion power purchase agreement. Backed by Sam Altman ($350M+) and SoftBank; raised $425M Series F in Jan 2025 at a $5.4B valuation. Directly tied to AI compute energy demands.

**Sources:**
- https://www.helionenergy.com/articles/helion-secures-land-and-begins-building-site-of-worlds-first-fusion-power-plant/
- https://techcrunch.com/2025/01/28/helion-raises-425m-to-help-build-a-fusion-reactor-for-microsoft/
- https://www.helionenergy.com/articles/announcing-helions-425m-series-f/

**Confidence:** 5/5 — Extensively documented company with public filings, funding announcements, and construction news. Belief fields largely inapplicable (energy company, not an AI policy actor); regulatory stance inferred as Light-touch from private venture orientation.
