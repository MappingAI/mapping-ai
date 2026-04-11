# Entity Enrichment — Batch 06
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 38

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 947 | MIT CSAIL | 10 | 4 |
| 1357 | Federation of American Scientists | 9 | 4 |
| 1360 | UK government's Frontier AI Taskforce | 9 | 5 |
| 1590 | Tom Davidson | 10 | 4 |

---

## Changes

### [947] MIT CSAIL — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | "Computer Science and Artificial Intelligence Laboratory; Daniela Rus director" | Updated (original in `notes_v1`) |
| notes_v1 | (same as notes) | "Computer Science and Artificial Intelligence Laboratory; Daniela Rus director" |
| notes_sources | NULL | ["https://internetpolicy.mit.edu/mit-csail-ai-action-plan-recommendations-2025/", ...] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | Targeted | Targeted (confirmed) |
| belief_ai_risk | Mixed/nuanced | Mixed/nuanced (confirmed) |
| belief_evidence_source | Explicitly stated | Explicitly stated (confirmed) |
| belief_agi_timeline | 10-25 years | 10-25 years (confirmed) |
| funding_model | NULL | Federal government, Industry partnerships |
| other_categories | NULL | AI Safety/Alignment |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE (confirmed) |

**Sources:**
- https://internetpolicy.mit.edu/mit-csail-ai-action-plan-recommendations-2025/
- https://www.csail.mit.edu/person/daniela-rus
- https://en.wikipedia.org/wiki/MIT_Computer_Science_and_Artificial_Intelligence_Laboratory

**Confidence:** 4/5 — CSAIL submitted formal policy recommendations to the White House AI Action Plan RFI in 2025; beliefs confirmed from prior enrichment and consistent with published positions. Funding model confirmed from CSAIL Alliances page (DARPA, NSF, DOE, industry consortia).

---

### [1357] Federation of American Scientists — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | DC-based science and technology policy nonprofit founded in 1945... |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://fas.org/publication/rfi-development-of-artificial-intelligence-ai-action-plan/", ...] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| funding_model | NULL | Nonprofit/grants |
| influence_type | NULL | Researcher/analyst, Organizer/advocate |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://fas.org/publication/rfi-development-of-artificial-intelligence-ai-action-plan/
- https://fas.org/accelerator/day-one-2025/
- https://www.macfound.org/grantee/federation-of-american-scientists-1487/

**Confidence:** 4/5 — FAS's regulatory stance (Moderate: mandatory safety evals + transparency) inferred from their 2025 AI Action Plan submission calling for responsible innovation alongside NIST AISI funding. Funded by foundations including MacArthur; confirmed nonprofit.

---

### [1360] UK government's Frontier AI Taskforce — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | UK government body established April 2023 with £100m mandate... |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://www.gov.uk/government/.../frontier-ai-taskforce-second-progress-report", ...] |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Precautionary |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Explicitly stated |
| funding_model | NULL | Federal government |
| influence_type | NULL | Researcher/analyst, Implementer |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.gov.uk/government/publications/frontier-ai-taskforce-second-progress-report/frontier-ai-taskforce-second-progress-report
- https://www.gov.uk/government/news/prime-minister-launches-new-ai-safety-institute
- https://en.wikipedia.org/wiki/AI_Safety_Institute_(United_Kingdom)

**Confidence:** 5/5 — Well-documented UK government body. Established April 2023 with explicit safety mandate; transitioned to AISI at Bletchley Park summit November 2023; renamed AI Security Institute February 2025. Notes clarify the transition to avoid confusion with the current AISI entity already in the DB. Beliefs (Precautionary/Catastrophic) directly from its founding mandate to evaluate existential/catastrophic frontier AI risks.

---

### [1590] Tom Davidson — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | AI safety researcher currently at Forethought (AI Safety Research Nonprofit)... |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://www.forethought.org/people/tom-davidson", ...] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Precautionary |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | 5-10 years |
| funding_model | NULL | Nonprofit/grants |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.forethought.org/people/tom-davidson
- https://www.openphilanthropy.org/about/team/tom-davidson
- https://80000hours.org/podcast/episodes/tom-davidson-how-quickly-ai-could-transform-the-world/

**Confidence:** 4/5 — Tom Davidson is a public researcher with multiple published reports and podcast appearances. Currently at Forethought (confirmed via forethought.org); previously Open Philanthropy and UK AI Security Institute. AGI timeline of 5-10 years inferred from his writings on near-term transformative AI and ~20% probability of human-level AI by 2100 with a distribution skewed toward nearer term. Risk belief (Catastrophic) explicitly stated via AI-enabled coup research (April 2025) and power concentration framing.

---
