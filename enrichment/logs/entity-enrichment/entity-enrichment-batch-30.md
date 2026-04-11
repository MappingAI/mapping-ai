# Entity Enrichment — Batch 30
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 6
Fields updated: 67 (11 fields x 6 entities + 1 category fix on 1697)

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1696 | Mark Gray | 11 | 4/5 |
| 1697 | Mark D Gray | 12 | 4/5 |
| 1698 | Melissa Holyoak | 11 | 4/5 |
| 1699 | General Services Administration | 11 | 4/5 |
| 1700 | Rob Fergus | 11 | 4/5 |
| 1701 | Serkan Piantino | 11 | 4/5 |

**Duplicate note:** Entities 1696 (Mark Gray) and 1697 (Mark D Gray) are the same person: Mark D. Gray,
the FTC's CIO/CDO/Chief AI Officer. Both have edges to FTC (entity 199) with nearly identical roles
("Chief AI Officer" vs "Chief Artificial Intelligence Officer"). Both records enriched independently;
a merge/dedup pass should reconcile them and redirect all edges to a single canonical entity.

Entity 1697's category was corrected from "Executive" to "Policymaker" (he is a federal government
official, not a private-sector executive).

---

## Changes

### 1696 Mark Gray — person / Policymaker

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 529-char summary covering CIO/CDO/CAIO roles at FTC, Army background, AI use case inventory, Data and AI Governance Board |
| notes_v1 | null | null (no prior notes to back up) |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 4 |
| funding_model | null | Government |
| influence_type | null | Decision-maker, Implementer |
| belief_regulatory_stance | null | Targeted |
| belief_ai_risk | null | Manageable |
| belief_evidence_source | null | Inferred |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://tmf.cio.gov/mark-gray-2/
- https://theorg.com/org/federal-trade-commission/org-chart/mark-gray
- https://fedscoop.com/ftc-on-track-to-publish-its-first-ai-use-case-inventory-by-the-end-of-this-year-official-says/
- https://www.ftc.gov/system/files/ftc_gov/pdf/data-and-ai-governance-board-charter.pdf

**Confidence:** 4/5 — Identity and role well documented. Regulatory stance "Targeted" inferred from
FTC's enforcement approach (existing laws applied to AI, not broad new regulation). AI risk "Manageable"
inferred from his operational focus on responsible adoption rather than risk warnings.

---

### 1697 Mark D Gray — person / Policymaker

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 410-char summary noting duplicate status with entity 1696, same role at FTC |
| notes_v1 | null | null |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 4 |
| category | Executive | Policymaker |
| funding_model | null | Government |
| influence_type | null | Decision-maker, Implementer |
| belief_regulatory_stance | null | Targeted |
| belief_ai_risk | null | Manageable |
| belief_evidence_source | null | Inferred |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Duplicate status:** Same person as entity 1696 (Mark Gray). Both records kept active; flag for dedup
merge in a future cleanup pass. All edges should be redirected to a single canonical entity.

**Sources:**
- https://www.linkedin.com/in/mark-d-gray/
- https://tmf.cio.gov/mark-gray-2/
- https://fedscoop.com/ftc-on-track-to-publish-its-first-ai-use-case-inventory-by-the-end-of-this-year-official-says/
- https://www.ftc.gov/system/files/ftc_gov/pdf/data-and-ai-governance-board-charter.pdf

**Confidence:** 4/5 — Same person as 1696; enriched identically.

---

### 1698 Melissa Holyoak — person / Policymaker

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 555-char summary covering FTC Commissioner tenure (Sep 2024-Nov 2025), light-touch AI stance, companion bot study, departure to U.S. Attorney role in Utah |
| notes_v1 | null | null |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 4 |
| funding_model | null | Government |
| influence_type | null | Decision-maker |
| belief_regulatory_stance | null | Light-touch |
| belief_ai_risk | null | Manageable |
| belief_evidence_source | null | Explicitly stated |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.ftc.gov/about-ftc/commissioners-staff/melissa-holyoak
- https://www.law360.com/articles/2328267/ftc-s-holyoak-wants-predictable-regulatory-space-for-ai
- https://www.ftc.gov/system/files/ftc_gov/pdf/holyoak-remarks-2025-iapp-global-privacy-summit.pdf
- https://www.ebglaw.com/insights/publications/commissioner-holyoak-leaves-ftc-to-serve-as-interim-u-s-attorney-in-utah

**Confidence:** 4/5 — Regulatory stance explicitly stated in speeches: "promote AI growth and innovation,
not hamper it with misguided enforcement actions or excessive regulation." AI risk inferred as Manageable
from her framing of AI issues as consumer protection matters handled by existing law.

---

### 1699 General Services Administration — organization / Government/Agency

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 571-char summary covering USAi platform, FedRAMP 20x, proposed GSAR 552.239-7001 AI contract clause, cross-agency AI collaboration role |
| notes_v1 | null | null |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 4 |
| funding_model | null | Government |
| influence_type | null | Decision-maker, Implementer |
| belief_regulatory_stance | null | Targeted |
| belief_ai_risk | null | Manageable |
| belief_evidence_source | null | Inferred |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.gsa.gov/technology/government-it-initiatives/artificial-intelligence
- https://www.gsa.gov/about-us/newsroom/news-releases/gsa-launches-usai-to-advance-white-house-americas-ai-action-plan-08142025
- https://www.gsa.gov/blog/2025/12/31/ai-in-action-how-gsa-is-transforming-federal-services
- https://www.hklaw.com/en/insights/publications/2026/03/gsas-proposed-ai-clause-a-deep-dive

**Confidence:** 4/5 — GSA's AI initiatives are well documented on their own site. Regulatory stance
"Targeted" reflects their approach: sector-specific procurement safeguards and standards, not broad
regulation. AI risk "Manageable" inferred from their proactive adoption posture with reasonable guardrails.

---

### 1700 Rob Fergus — person / Executive

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 598-char summary covering FAIR co-founding with LeCun, NYU CILVR Lab, DeepMind stint (2020-2025), return to lead FAIR May 2025, open-source AI strategy |
| notes_v1 | null | null |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 4 |
| funding_model | null | Corporate |
| influence_type | null | Researcher/analyst, Builder |
| belief_regulatory_stance | null | Light-touch |
| belief_ai_risk | null | Manageable |
| belief_evidence_source | null | Inferred |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://en.wikipedia.org/wiki/Rob_Fergus
- https://techcrunch.com/2025/05/08/meta-taps-former-google-deepmind-director-to-lead-its-ai-research-lab/
- https://www.bloomberg.com/news/articles/2025-05-08/meta-taps-new-head-of-ai-lab-after-staffer-s-return-from-google
- https://www.linkedin.com/in/rob-fergus-057808364/

**Confidence:** 4/5 — Career facts well documented. Belief fields inferred from Meta's institutional
position (open-source releases, opposition to heavy-handed regulation). No direct public policy
statements found from Fergus personally.

---

### 1701 Serkan Piantino — person / Executive

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 546-char summary covering FAIR co-founding (2013), Big Sur open-source GPU server, Facebook NYC office, departure to found Spell (2017), Reddit acquisition (2022), current VP Product at Reddit |
| notes_v1 | null | null |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 4 |
| funding_model | null | Corporate |
| influence_type | null | Builder, Researcher/analyst |
| belief_regulatory_stance | null | Light-touch |
| belief_ai_risk | null | Manageable |
| belief_evidence_source | null | Inferred |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://en.wikipedia.org/wiki/Serkan_Piantino
- https://wellfound.com/p/mrserkan
- https://www.crunchbase.com/person/serkan-piantino
- https://www.linkedin.com/in/spiantino

**Confidence:** 4/5 — Career facts well documented via Wikipedia and professional profiles. Belief fields
inferred from his track record of open-source contributions and work at Meta/Reddit, both companies with
light-touch regulatory preferences. No direct public policy statements found.
