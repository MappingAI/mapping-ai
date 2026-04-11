# Entity Enrichment — Batch 42
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 6
Fields updated: 58

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1773 | Meia Chita-Tegmark | 9 | 4 |
| 1774 | Department for Science, Innovation and Technology | 10 | 5 |
| 1775 | Hamish Hobbs | 9 | 4 |
| 1776 | Dr Jess Whittlestone | 10 | 5 |
| 1777 | Tommy Shaffer Shane | 10 | 4 |
| 1778 | Nicole Alvarez | 9 | 4 |

Mixed batch: FLI co-founder, UK government department (DSIT), three CLTR AI policy staff, and one CAP policy analyst. Three CLTR members (Hobbs, Whittlestone, Shaffer Shane) share a catastrophic risk / moderate regulation profile. DSIT is light-touch. Alvarez at CAP is targeted regulation / serious risk.

---

## Changes

### [1773] Meia Chita-Tegmark — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | futureoflife.org, excollege.tufts.edu, engineering.tufts.edu, researchgate.net |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Precautionary |
| belief_ai_risk | NULL | Existential |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Organizer/advocate |
| enrichment_version | v2-auto | phase3-manual |

**Confidence:** 4/5 — Co-founder of Future of Life Institute (with Max Tegmark et al.). Cognitive scientist, PhD Psychology from Boston University. Postdoc at Tufts HRI Lab. FLI's existential risk focus and advocacy for EU AI Act foundation model provisions strongly imply precautionary stance. No direct statements on AGI timeline found.

### [1774] Department for Science, Innovation and Technology — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | gov.uk, techmonitor.ai, whitecase.com, regulations.ai |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Decision-maker |
| funding_model | NULL | Government-funded |
| enrichment_version | v2-auto | phase3-manual |

**Confidence:** 5/5 — UK government department, extremely well-documented. Pro-innovation AI White Paper (2023), five cross-sectoral principles, AI Opportunities Action Plan (Jan 2025), AI Growth Lab consultation (Oct 2025). Explicitly chose principles-based guidance over horizontal legislation. Houses UK AISI. Plans comprehensive AI bill for future session but refuses to "rush to regulate."

### [1775] Hamish Hobbs — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | longtermresilience.org, oecd.ai, governance.ai, linkedin.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Advisor/strategist |
| enrichment_version | v2-auto | phase3-manual |

**Confidence:** 4/5 — Director of AI Policy at CLTR. Former FHI Research Scholar, advised PM of Australia and UK Office for AI. OECD.AI expert, GovAI affiliate. Risk/stance inferred from CLTR's mission (extreme AI risk reduction) and prior roles at FHI and government advisory positions.

### [1776] Dr Jess Whittlestone — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | jesswhittlestone.com, longtermresilience.org, time.com, cetas.turing.ac.uk, cnas.org, governance.ai |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst, Advisor/strategist |
| other_categories | NULL | Researcher |
| enrichment_version | v2-auto | phase3-manual |

**Confidence:** 5/5 — Head of AI Policy at CLTR. TIME 100 Most Influential in AI 2023. PhD Behavioural Science (Warwick), Maths & Philosophy (Oxford). Former Deputy Director at Cambridge CSER. Extensive publications and government advisory work. Affiliated with CETaS, GovAI, CNAS. Risk inferred from CLTR focus on extreme risk; stance moderate given policy translation work.

### [1777] Tommy Shaffer Shane — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | longtermresilience.org, tommyshaffershane.com, cnas.org, linkedin.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst, Advisor/strategist |
| other_categories | NULL | Researcher |
| enrichment_version | v2-auto | phase3-manual |

**Confidence:** 4/5 — Interim Director of AI Policy at CLTR. Previously at DSIT leading £10m AI disinformation programme. PhD candidate at KCL on AI incidents. Authored reports explicitly arguing UK is under-prepared for AI security incidents and calling for preparedness frameworks. Evidence explicitly stated via published reports on catastrophic AI risk scenarios and loss of control.

### [1778] Nicole Alvarez — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | americanprogress.org, siegelendowment.org |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |

**Confidence:** 4/5 — Senior Policy Analyst at Center for American Progress. Previously at Future of Privacy Forum. Authored multiple reports opposing AI moratoriums and federal preemption of state AI laws. Argues state regulation provides essential safeguards. Covers AI in employment, healthcare, housing, elections. Stance explicitly stated in published CAP reports; "targeted" reflects advocacy for sector-specific state-level rules rather than broad federal preemption.

---

## Edges (pre-existing, not modified)

| ID | Type | Source | Target | Role |
| -: | ---- | ------ | ------ | ---- |
| 2244 | founder | Meia Chita-Tegmark | Future of Life Institute | — |
| 2246 | advisor | Centre for Long-Term Resilience | Department for Science, Innovation and Technology | — |
| 2251 | employer | Hamish Hobbs | Centre for Long-Term Resilience | Director of AI Policy |
| 2252 | employer | Dr Jess Whittlestone | Centre for Long-Term Resilience | Senior Adviser, AI Policy |
| 2253 | employer | Tommy Shaffer Shane | Centre for Long-Term Resilience | Senior Policy Manager |
| 2254 | employer | Nicole Alvarez | Center for American Progress | Senior Policy Analyst |
