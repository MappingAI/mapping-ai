# Entity Enrichment — Batch 27
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 44 (11 fields × 4 entities)

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 910 | NTIA | 11 | 4/5 |
| 905 | ACLU | 11 | 4/5 |
| 911 | NIST | 11 | 4/5 |
| 197 | From AI to ZI | 11 | 5/5 |

**Duplicate note:** Entity 911 (NIST, enrichment_version=v1) is a likely duplicate of entity 1309
(National Institute of Standards and Technology, enrichment_version=phase3-manual, enriched in batch 02).
They share overlapping edges (e.g., Elham Tabassi → NIST id=911; Paul Christiano, Arati Prabhakar,
Hickenlooper, Senate Commerce Committee → id=1309). Both records have been enriched independently;
a merge/dedup pass should reconcile them and redirect all edges to a single canonical entity.

---

## Changes

### 910 NTIA — organization / Government/Agency

| Field | Before | After |
| ----- | ------ | ----- |
| notes | "National Telecommunications and Information Administration" (58 chars) | 495-char factual summary covering AI Accountability Report (2024), Trump AI Action Plan shift, BEAD funding leverage |
| notes_v1 | (same as old notes) | backed up |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 4 |
| funding_model | null | Government |
| influence_type | Decision-maker, Advisor/strategist, Implementer | (unchanged — already correct) |
| belief_regulatory_stance | Moderate | Moderate (confirmed) |
| belief_ai_risk | Serious | Serious (confirmed) |
| belief_evidence_source | Explicitly stated | Explicitly stated (confirmed) |
| belief_agi_timeline | Unknown | Unknown (confirmed) |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:**
- https://www.ntia.gov/issues/artificial-intelligence/ai-accountability-policy-report
- https://fedscoop.com/ntia-calls-for-independent-audits-of-ai-systems-in-new-accountability-report/
- https://www.ntia.gov/blog/2026/ntia-seeks-feedback-new-direction-innovation-fund-focuses-ai-ran
- https://www.whitehouse.gov/presidential-actions/2025/12/eliminating-state-law-obstruction-of-national-artificial-intelligence-policy/

**Confidence:** 4/5 — NTIA's AI role is well documented; belief fields already set correctly in v1.
Slight uncertainty on regulatory stance: under Biden, NTIA was more "Moderate" leaning toward
accountability requirements; under Trump it has shifted toward "Light-touch" / innovation promotion,
but the agency itself hasn't changed its stance publicly. "Moderate" retained as institutional baseline.

---

### 905 ACLU — organization / Ethics/Bias/Rights

| Field | Before | After |
| ----- | ------ | ----- |
| notes | "American Civil Liberties Union - Speech, Privacy & Technology Project" (69 chars) | 489-char summary covering Speech/Privacy/Technology Project, facial recognition opposition, AI Civil Rights Act support, funding model |
| notes_v1 | (same as old notes) | backed up |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 4 |
| funding_model | null | Membership/donations |
| influence_type | Organizer/advocate, Researcher/analyst | (unchanged — correct) |
| belief_regulatory_stance | Targeted | Targeted (confirmed — sector-specific civil rights rules, not blanket R&D restrictions) |
| belief_ai_risk | Serious | Serious (confirmed) |
| belief_evidence_source | Explicitly stated | Explicitly stated (confirmed) |
| belief_agi_timeline | Unknown | Unknown (confirmed) |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:**
- https://www.aclu.org/issues/privacy-technology/surveillance-technologies/face-recognition-technology
- https://www.aclu.org/news/racial-justice/your-questions-answered-where-we-are-on-ai-regulation-and-where-we-go-from-here
- https://www.aclu.org/press-releases/aclu-statement-on-house-ai-task-force-report
- https://www.aclu.org/about/about-membership/financial-info

**Confidence:** 4/5 — ACLU's AI positions are extensively documented on their own site. All belief
fields confirmed by explicit public statements and legislative positions.

---

### 911 NIST — organization / Government/Agency

| Field | Before | After |
| ----- | ------ | ----- |
| notes | "National Institute of Standards and Technology - AI Risk Management Framework" (77 chars) | 472-char summary covering AI RMF 1.0, AISI→CAISI rename, AI Action Plan directives, AI Agent Standards Initiative, RMF revision |
| notes_v1 | (same as old notes) | backed up |
| notes_sources | null | 5 URLs |
| notes_confidence | null | 4 |
| funding_model | null | Government |
| influence_type | Decision-maker, Advisor/strategist, Researcher/analyst | (unchanged — correct) |
| belief_regulatory_stance | Light-touch | Light-touch (confirmed — voluntary frameworks, not mandatory regulation) |
| belief_ai_risk | Serious | Serious (confirmed) |
| belief_evidence_source | Explicitly stated | Explicitly stated (confirmed) |
| belief_agi_timeline | Unknown | Unknown (confirmed) |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE |

**Duplicate status:** Likely duplicate of entity 1309 (National Institute of Standards and Technology).
Entity 1309 was enriched in batch 02 (phase3-manual) and has fuller edges. Both records kept active;
flag for dedup merge in a future cleanup pass.

**Sources:**
- https://www.nist.gov/itl/ai-risk-management-framework
- https://www.nist.gov/caisi
- https://www.nist.gov/news-events/news/2025/09/caisi-works-openai-and-anthropic-promote-secure-ai-innovation
- https://www.pillsburylaw.com/en/news-and-insights/nist-ai-agent-standards.html
- https://blog.freshfields.us/post/102kxpx/the-us-government-releases-ai-action-plan-and-executive-orders-on-infrastructure

**Confidence:** 4/5 — NIST's AI RMF and CAISI transition are well documented from primary sources.

---

### 197 From AI to ZI — organization / AI Safety/Alignment

| Field | Before | After |
| ----- | ------ | ----- |
| notes | 280-char summary (v2) — accurate but informal phrasing | 364-char tightened version covering Substack format, Open Philanthropy grant dates, topic coverage, current dormancy |
| notes_v1 | backed up previous v2 notes | backed up |
| notes_sources | 11 URLs (comprehensive) | narrowed to 5 primary Substack sources |
| notes_confidence | 5 | 5 (unchanged) |
| funding_model | Philanthropic | Philanthropic (unchanged) |
| influence_type | Researcher/analyst, Narrator | (unchanged) |
| belief_regulatory_stance | Precautionary | Precautionary (unchanged) |
| belief_ai_risk | Existential | Existential (unchanged) |
| belief_evidence_source | Explicitly stated | Explicitly stated (unchanged) |
| belief_agi_timeline | 10-25 years | 10-25 years (unchanged) |
| enrichment_version | v2 | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:**
- https://aizi.substack.com/about
- https://aizi.substack.com/p/the-future-of-from-ai-to-zi
- https://aizi.substack.com/p/introducing-from-ai-to-zi
- https://aizi.substack.com/p/whats-left-for-agi-besides-scale
- https://aizi.substack.com/p/51946f63-afdc-4626-b762-1828ccd55f1e

**Confidence:** 5/5 — Primary Substack sources confirm all details directly. Belief fields already
well-established in v2; no changes needed.
