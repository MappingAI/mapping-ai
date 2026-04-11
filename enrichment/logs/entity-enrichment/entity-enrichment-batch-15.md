# Entity Enrichment — Batch 15
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 44 (11 per entity)

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1149 | House Bipartisan Task Force on Artificial Intelligence | 11 | 4 |
| 1132 | MIT Schwarzman College of Computing | 11 | 4 |
| 1130 | MIT Data to AI Lab | 11 | 4 |
| 1128 | Stanford Center for AI Safety | 11 | 4 |

---

## Changes

### 1149 House Bipartisan Task Force on Artificial Intelligence — organization (Government/Agency)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Bipartisan U.S. House task force created in Feb 2024 by Speaker Johnson and Leader Jeffries, co-chaired by Reps. Obernolte and Lieu. Released a 273-page final report in Dec 2024 with 66 findings and 89 recommendations across 15 policy areas. Sunset at end of 118th Congress; no successor body established in the 119th Congress as of early 2025." |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | ["https://obernolte.house.gov/AITFReport", "https://lieu.house.gov/media-center/press-releases/house-bipartisan-task-force-artificial-intelligence-delivers-report", "https://www.nelsonmullins.com/insights/blogs/ai-task-force/all/legislative-update-119th-congress-outlook-on-ai-policy-2025"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Government |
| influence_type | NULL | Decision-maker,Advisor/strategist |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | TRUE | TRUE (unchanged) |

**Sources:**
- https://obernolte.house.gov/AITFReport
- https://lieu.house.gov/media-center/press-releases/house-bipartisan-task-force-artificial-intelligence-delivers-report
- https://www.nelsonmullins.com/insights/blogs/ai-task-force/all/legislative-update-119th-congress-outlook-on-ai-policy-2025

**Confidence:** 4/5 — Well-documented public body with a published final report. Regulatory stance "Targeted" is drawn directly from the report's recommendation for sector-specific rules over broad horizontal regulation. Risk framing "Serious" reflects its 80+ recommendations addressing societal harms without invoking catastrophic/existential framing. Task force has formally sunset; flagged as inactive post-118th Congress.

---

### 1132 MIT Schwarzman College of Computing — organization (Academic)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "MIT's cross-disciplinary computing college founded in 2018 with a $1B endowment anchored by a $350M gift from Stephen Schwarzman. Led by founding dean Daniel Huttenlocher, it integrates AI research across all MIT departments. Hosts the MIT AI Policy Forum and publishes governance-focused policy briefs; advocates for technically-informed, sector-specific AI regulation." |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | ["https://en.wikipedia.org/wiki/MIT_Schwarzman_College_of_Computing", "https://computing.mit.edu/ai-policy-briefs/", "https://aipolicyforum.mit.edu/"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | University/Endowment |
| influence_type | NULL | Researcher/analyst,Advisor/strategist,Connector/convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://en.wikipedia.org/wiki/MIT_Schwarzman_College_of_Computing
- https://computing.mit.edu/ai-policy-briefs/
- https://aipolicyforum.mit.edu/

**Confidence:** 4/5 — Well-documented institution. Policy stance inferred from published briefs recommending sector-specific regulation and applying existing law before creating new horizontal frameworks; not an explicit lobbying position. The AI Policy Forum is a convening body, supporting Connector/convener influence type.

---

### 1130 MIT Data to AI Lab — organization (Academic)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "MIT research group within the Laboratory for Information and Decision Systems (LIDS), founded in 2015 by Principal Research Scientist Kalyan Veeramachaneni. Develops large-scale AI and ML systems that work alongside humans in applications spanning healthcare, finance, education, and energy. Notable for the Synthetic Data Vault open-source project, spun out commercially as DataCebo." |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | ["https://dai.lids.mit.edu/", "https://kalyan.lids.mit.edu/lab/", "https://lids.mit.edu/labs-and-groups/data-ai-group-dai"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | University/Grants |
| influence_type | NULL | Researcher/analyst,Builder |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://dai.lids.mit.edu/
- https://kalyan.lids.mit.edu/lab/
- https://lids.mit.edu/labs-and-groups/data-ai-group-dai

**Confidence:** 4/5 — Lab homepage and PI profile are authoritative. Belief fields inferred: no explicit policy advocacy found; applied/industry-focused research orientation and commercial spin-off suggest a pragmatic, light-touch stance. Risk rated Manageable given focus on beneficial human-AI collaboration rather than catastrophic risk framing.

---

### 1128 Stanford Center for AI Safety — organization (AI Safety/Alignment)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Stanford University research center founded in 2018 by Clark Barrett, David Dill, Mykel Kochenderfer, and Dorsa Sadigh, operating as an industrial affiliates program. Conducts research in formal verification, robust decision-making, and trustworthy AI; distinct from the independent nonprofit Center for AI Safety (safe.ai) run by Dan Hendrycks. Focus spans technical safety, fairness, accountability, and policy." |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | ["https://aisafety.stanford.edu/", "https://aisafety.stanford.edu/whitepaper.pdf", "https://engineering.stanford.edu/people/clark-barrett"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | University/Affiliates |
| influence_type | NULL | Researcher/analyst,Advisor/strategist |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | TRUE | TRUE (unchanged) |

**Sources:**
- https://aisafety.stanford.edu/
- https://aisafety.stanford.edu/whitepaper.pdf
- https://engineering.stanford.edu/people/clark-barrett

**Confidence:** 4/5 — Center homepage and founding whitepaper are authoritative. Key disambiguation: this is the Stanford university-based center (industrial affiliates model, CS department), not Dan Hendrycks's independent safe.ai nonprofit. Risk rated Catastrophic given the center's explicit focus on preventing catastrophic AI outcomes, though no public AGI timeline stated by the center itself.

---
