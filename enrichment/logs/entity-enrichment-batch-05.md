# Entity Enrichment — Batch 05
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 44

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 904 | Electronic Frontier Foundation | 11 | 4 |
| 914 | Department of Commerce | 11 | 4 |
| 952 | Harvard Berkman Klein Center | 11 | 4 |
| 912 | Department of Justice | 11 | 4 |

---

## Changes

### [904] Electronic Frontier Foundation — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | Digital rights nonprofit founded 1990 | Updated (original in `notes_v1`) |
| notes_v1 | Digital rights nonprofit founded 1990 | Digital rights nonprofit founded 1990 (unchanged — was already brief) |
| notes_sources | NULL | ["https://www.eff.org/issues/ai", "https://www.eff.org/deeplinks/2026/02/smart-ai-policy-means-understanding-its-real-harms-and-benefits", "https://www.eff.org/deeplinks/2026/03/government-must-not-force-companies-participate-ai-powered-surveillance"] |
| notes_confidence | NULL | 4 |
| belief_ai_risk | Mixed/nuanced | Serious |
| funding_model | NULL | Nonprofit/grants |
| other_categories | NULL | Labor/Civil Society |
| belief_agi_timeline | Unknown | Unknown (unchanged) |
| belief_regulatory_stance | Targeted | Targeted (unchanged) |
| influence_type | Organizer/advocate, Researcher/analyst, Narrator | Organizer/advocate, Researcher/analyst, Narrator (unchanged) |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:**
- https://www.eff.org/issues/ai
- https://www.eff.org/deeplinks/2026/02/smart-ai-policy-means-understanding-its-real-harms-and-benefits
- https://www.eff.org/deeplinks/2026/03/government-must-not-force-companies-participate-ai-powered-surveillance

**Confidence:** 4/5 — EFF's AI positions are explicitly stated via their published deeplinks and issues pages; belief_ai_risk updated from Mixed/nuanced to Serious based on their documented opposition to high-stakes AI decisions affecting civil liberties.

---

### [914] Department of Commerce — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | Includes BIS export controls on AI chips | Updated (original in `notes_v1`) |
| notes_sources | NULL | ["https://www.commerce.gov/ai", "https://www.insidegovernmentcontracts.com/2025/08/july-2025-ai-developments-under-the-trump-administration/", "https://www.theregreview.org/2025/09/25/flatley-the-united-states-regulates-artificial-intelligence-with-export-controls/"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | Mixed/unclear | Light-touch |
| belief_ai_risk | Unknown | Manageable |
| belief_evidence_source | Explicitly stated | Inferred |
| funding_model | NULL | Federal government |
| other_categories | NULL | Infrastructure & Compute |
| influence_type | Decision-maker, Implementer | Decision-maker, Implementer, Regulator |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:**
- https://www.commerce.gov/ai
- https://www.insidegovernmentcontracts.com/2025/08/july-2025-ai-developments-under-the-trump-administration/
- https://www.theregreview.org/2025/09/25/flatley-the-united-states-regulates-artificial-intelligence-with-export-controls/

**Confidence:** 4/5 — Regulatory stance set to Light-touch inferred from Trump administration's AI Action Plan direction (promoting exports, removing DEI/climate references from NIST RMF, minimizing regulatory burden). Beliefs inferred rather than explicitly stated as these are administration-level postures.

---

### [952] Harvard Berkman Klein Center — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | Berkman Klein Center for Internet & Society | Updated (original in `notes_v1`) |
| notes_sources | NULL | ["https://cyber.harvard.edu/topics/ethics-and-governance-ai", "https://cyber.harvard.edu/projects/artificial-intelligence-initiative", "https://cyber.harvard.edu/about/support"] |
| notes_confidence | NULL | 4 |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Academic |
| other_categories | NULL | Think Tank/Policy Org |
| belief_regulatory_stance | Targeted | Targeted (unchanged) |
| belief_ai_risk | Serious | Serious (unchanged) |
| belief_evidence_source | Explicitly stated | Explicitly stated (unchanged) |
| influence_type | Researcher/analyst, Connector/convener, Advisor/strategist | Researcher/analyst, Connector/convener, Advisor/strategist (unchanged) |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:**
- https://cyber.harvard.edu/topics/ethics-and-governance-ai
- https://cyber.harvard.edu/projects/artificial-intelligence-initiative
- https://cyber.harvard.edu/about/support

**Confidence:** 4/5 — Research focus and funding model well-documented on BKC's own site. Funding is mixed (Harvard institutional + foundation grants); set to Academic as primary classification. No AGI timeline publicly stated.

---

### [912] Department of Justice — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | DOJ Antitrust Division - AI competition enforcement | Updated (original in `notes_v1`) |
| notes_sources | NULL | ["https://www.justice.gov/ag/media/1422986/dl?inline=", "https://www.cbsnews.com/news/doj-creates-task-force-to-challenge-state-ai-regulations/", "https://www.morganlewis.com/pubs/2026/04/ai-enforcement-accelerates-as-federal-policy-stalls-and-states-step-in"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | Mixed/unclear | Light-touch |
| belief_ai_risk | Unknown | Manageable |
| belief_evidence_source | Explicitly stated | Inferred |
| funding_model | NULL | Federal government |
| other_categories | NULL | Government/Agency |
| influence_type | Decision-maker, Implementer | Decision-maker, Implementer (unchanged) |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:**
- https://www.justice.gov/ag/media/1422986/dl?inline=
- https://www.cbsnews.com/news/doj-creates-task-force-to-challenge-state-ai-regulations/
- https://www.morganlewis.com/pubs/2026/04/ai-enforcement-accelerates-as-federal-policy-stalls-and-states-step-in

**Confidence:** 4/5 — DOJ's AI Litigation Task Force (est. Jan 2026) is well-documented. Regulatory stance set to Light-touch (inferred from task force mission: challenging state regulations, not imposing new federal AI rules). Risk view set to Manageable (inferred from enforcement-not-moratorium posture under Trump AG Bondi).
