# Entity Enrichment — Batch 04
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 40 (10 per entity)

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1301 | Ted Budd | 10 | 4 |
| 1376 | Joe Biden | 10 | 5 |
| 1329 | Apple | 10 | 4 |
| 1417 | Department of Energy | 10 | 5 |

---

## Changes

### 1301 Ted Budd — person (Policymaker)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Republican Senator (NC) and Chair of the Senate Subcommittee on Science, Manufacturing, and Competitiveness. Actively shapes AI legislation through bipartisan bills on government data access, AI lab networks, and public health preparedness. Strongly opposes overregulation, favoring a light-touch, innovation-first federal framework. |
| notes_v1 | NULL | NULL (was empty) |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| funding_model | NULL | Federal government |
| influence_type | NULL | Decision-maker |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | false | true |

**Sources:**
- https://www.budd.senate.gov/2026/03/17/budd-kim-introduce-bipartisan-bill-opening-government-data-sets-to-better-train-american-ai-models/
- https://www.budd.senate.gov/2026/03/03/senator-budd-chairs-subcommittee-hearing-to-evaluate-innovative-deployment-of-ai-to-support-workforce-healthcare-and-industry/
- https://www.budd.senate.gov/2025/09/11/sen-budd-commerce-committee-colleagues-highlight-need-to-bolster-u-s-leadership-in-ai-innovation/

**Confidence:** 4/5 — Budd's positions are explicitly on record in press releases and hearing statements; docked one point because his public AI statements are narrowly focused on innovation/infrastructure and do not address risk in detail, leaving risk classification slightly inferential.

---

### 1376 Joe Biden — person (Executive)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | 46th U.S. President (2021-2025). Issued Executive Order 14110 in October 2023, the most comprehensive U.S. AI governance action to that point, requiring safety reporting from frontier AI developers and coordinating federal agency standards. Also released the Blueprint for an AI Bill of Rights in 2022. |
| notes_v1 | NULL | NULL (was empty) |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| funding_model | NULL | Federal government |
| influence_type | NULL | Decision-maker |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | false | true |

**Sources:**
- https://en.wikipedia.org/wiki/Executive_Order_14110
- https://www.csis.org/analysis/biden-administrations-executive-order-artificial-intelligence
- https://www.brookings.edu/articles/one-year-later-how-has-the-white-house-ai-executive-order-delivered-on-its-promises/

**Confidence:** 5/5 — EO 14110 and the Blueprint for an AI Bill of Rights are extensively documented primary-source actions. Regulatory stance and risk beliefs are unambiguously "Moderate" and "Serious" as stated in the order and public remarks.

---

### 1329 Apple — organization (Deployers & Platforms)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Consumer technology company deploying AI via Apple Intelligence across its device ecosystem. Pursues an on-device, privacy-first AI strategy using Private Cloud Compute for sensitive tasks. Partnered with OpenAI (ChatGPT integration) and Google (Gemini for Siri). Avoids public regulatory advocacy but leverages privacy standards as a competitive differentiator. |
| notes_v1 | NULL | NULL (was empty) |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| funding_model | NULL | Private/corporate |
| influence_type | NULL | Builder |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | false | true |

**Sources:**
- https://greyhoundresearch.com/apples-ai-strategy-privacy-over-publicity-at-wwdc-2025/
- https://enkiai.com/ai-market-intelligence/apple-ai-partnerships-2025-inside-the-ecosystem-strategy
- https://aiexpert.network/ai-at-apple/

**Confidence:** 4/5 — Apple's AI strategy and on-device privacy approach are well-documented. Regulatory stance is inferred from behavior (minimal lobbying, privacy-as-differentiator marketing) rather than explicit policy statements; docked one point accordingly.

---

### 1417 Department of Energy — organization (Government/Agency)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Federal agency overseeing U.S. energy systems and nuclear infrastructure. Plays a central AI role through its 17 National Laboratories, its membership in the TRAINS Taskforce for national security AI testing, and its initiative to co-locate AI data centers with federal energy infrastructure across 16 identified sites. |
| notes_v1 | NULL | NULL (was empty) |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| funding_model | NULL | Federal government |
| influence_type | NULL | Implementer |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | false | true |

**Sources:**
- https://www.energy.gov/articles/doe-announces-site-selection-ai-data-center-and-energy-infrastructure-development-federal
- https://www.energy.gov/articles/us-ai-safety-institute-establishes-new-us-government-taskforce-collaborate-research-and
- https://www.federalregister.gov/documents/2025/04/07/2025-05936/request-for-information-on-artificial-intelligence-infrastructure-on-doe-lands

**Confidence:** 5/5 — DOE's AI activities are directly documented via official DOE.gov announcements, Federal Register filings, and NIST press releases. Regulatory stance (Targeted) and Implementer role are clearly evidenced by sector-specific actions on energy and nuclear AI rather than broad AI rulemaking.
