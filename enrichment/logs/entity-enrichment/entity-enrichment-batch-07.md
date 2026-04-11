# Entity Enrichment — Batch 07
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 44

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1209 | Polytechnique Montréal | 11 | 4 |
| 1148 | Senate Committee on Commerce, Science and Transportation | 11 | 5 |
| 1363 | Cornell University | 11 | 5 |
| 1210 | HEC Montréal | 11 | 4 |

---

## Changes

### 1209 Polytechnique Montréal — organization / Academic

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | French-language engineering school in Montreal and a founding partner of both IVADO and Mila — Quebec's premier AI research institutes. Its researchers work on AI applications in health, transportation, and cybersecurity, supported by $20M+ in grants from CFI and the Quebec government. |
| notes_v1 | NULL | NULL (was NULL) |
| notes_sources | NULL | ["https://www.polymtl.ca/...", "https://mila.quebec/en", "https://ivado.ca/en/"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Academic |
| other_categories | NULL | Think Tank/Policy Org |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.polymtl.ca/futur/en/es/research/spheres/modeling-and-artificial-intelligence
- https://mila.quebec/en
- https://ivado.ca/en/

**Confidence:** 4/5 — Well-documented founding partnership with IVADO and Mila; regulatory stance inferred from research-oriented academic context and Montreal AI ecosystem norms, not explicitly stated.

---

### 1148 Senate Committee on Commerce, Science and Transportation — organization / Government/Agency

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Key Senate committee with primary jurisdiction over AI legislation, chaired by Ted Cruz (R-TX) since 2025. Cruz unveiled the SANDBOX Act in September 2025 and a five-pillar AI policy framework explicitly advocating a light-touch, pro-innovation regulatory approach to maintain U.S. leadership over China. |
| notes_v1 | NULL | NULL (was NULL) |
| notes_sources | NULL | ["https://www.commerce.senate.gov/...", "https://www.uschamber.com/...", "https://www.congress.gov/..."] |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Federal government |
| other_categories | NULL | NULL |
| influence_type | NULL | Decision-maker |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.commerce.senate.gov/2025/9/sen-cruz-unveils-ai-policy-framework-to-strengthen-american-ai-leadership
- https://www.uschamber.com/technology/artificial-intelligence/u-s-chamber-applauds-sen-cruz-for-light-touch-approach-to-ai-regulation
- https://www.congress.gov/bill/119th-congress/senate-bill/2750/text

**Confidence:** 5/5 — Chairman Cruz explicitly used "light-touch" language in public statements, press releases, and the SANDBOX Act itself. Belief values directly reflect committee leadership's stated position.

---

### 1363 Cornell University — organization / Academic

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Major research university with broad AI activities spanning Cornell Tech (NYC), the AI Initiative, and the MacArthur-funded AI, Policy, and Practice (AIPP) initiative focused on AI's societal impacts. In 2025 NSF awarded Cornell a $20M AI Materials Institute, and a new Vice Provost for AI Strategy was named in January 2026. |
| notes_v1 | NULL | NULL (was NULL) |
| notes_sources | NULL | ["https://ai.cornell.edu/", "https://aipp.cis.cornell.edu/", "https://news.cornell.edu/...NSF", "https://news.cornell.edu/...VP"] |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Academic |
| other_categories | NULL | Think Tank/Policy Org |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://ai.cornell.edu/
- https://aipp.cis.cornell.edu/
- https://news.cornell.edu/stories/2025/07/national-science-foundation-announces-cornell-led-ai-materials-institute
- https://news.cornell.edu/stories/2026/01/thorsten-joachims-named-vice-provost-ai-strategy

**Confidence:** 5/5 — Cornell's AI activities are extensively documented. Moderate stance and Serious risk inferred from AIPP's societal-impact focus and cross-disciplinary policy research orientation; not an explicit institutional position statement.

---

### 1210 HEC Montréal — organization / Academic

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Montreal business school and founding partner of IVADO and Mila. Established a Chair in Organizational Ethics and AI Governance in 2024-25 and, with Tech3Lab and IVADO, launched a government-funded AI professional training program in January 2026. Faculty contribute to Mila and AI governance research. |
| notes_v1 | NULL | NULL (was NULL) |
| notes_sources | NULL | ["https://www.hec.ca/en/news/2026/...", "https://www.hec.ca/en/press_room/...", "https://ivado.ca/en/"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Academic |
| other_categories | NULL | Ethics/Bias/Rights |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.hec.ca/en/news/2026/research-and-knowledge-transfer-activities-continue-skyrocket-in-2024-2025
- https://www.hec.ca/en/press_room/releases/2026/tech3lab-ivado-launch-professional-training-program.html
- https://ivado.ca/en/

**Confidence:** 4/5 — Recent activities well-documented via HEC's own press releases. Stance inferred from AI governance/ethics focus; no explicit institutional policy position statement found.
