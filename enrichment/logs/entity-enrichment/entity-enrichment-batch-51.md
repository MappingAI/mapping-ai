# Entity Enrichment — Batch 51
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 9
Fields updated: 108

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1233 | Peter Lee | 12 | 4 |
| 1235 | Ashok Elluswamy | 12 | 4 |
| 1238 | Pentagon | 12 | 4 |
| 1239 | In-Q-Tel | 12 | 4 |
| 1240 | Cognizant | 12 | 4 |
| 1241 | U.S. Army | 12 | 4 |
| 1242 | Workera | 12 | 4 |
| 1243 | AI Fund | 12 | 4 |
| 1244 | LandingAI | 12 | 4 |

Batch clusters: Microsoft Research (1233), Tesla AI (1235), U.S. military/defense (1238, 1241), intelligence community VC (1239), enterprise AI services (1240), Andrew Ng ecosystem (1242-1244).

---

## Changes

### 1233 — Peter Lee (person / Executive)
- **notes**: President of Microsoft Science (formerly President of Microsoft Research). Oversees AI research strategy and scientific discovery initiatives. Champions responsible AI and AI as collaborative partner in scientific discovery. Spoke at EmTech AI 2025.
- **notes_sources**: Microsoft Research website; EmTech AI 2025 (MIT Technology Review); Microsoft 2026 AI trends blog; Aspen Ideas speaker profile
- **notes_confidence**: 4
- **belief_regulatory_stance**: Targeted
- **belief_ai_risk**: Manageable
- **belief_evidence_source**: Inferred
- **belief_agi_timeline**: Unknown
- **influence_type**: Decision-maker, Researcher/analyst
- **enrichment_version**: phase3-manual
- **qa_approved**: TRUE

### 1235 — Ashok Elluswamy (person / Executive)
- **notes**: VP of AI at Tesla leading Autopilot/FSD and Optimus programs. Champions end-to-end neural network approach. Predicts AGI by ~2035. Told teams 2026 would be "most demanding year."
- **notes_sources**: Teslarati; NotATeslaApp; Business Insider; NextBigFuture; Gulf News
- **notes_confidence**: 4
- **belief_regulatory_stance**: Light-touch
- **belief_ai_risk**: Manageable
- **belief_evidence_source**: Inferred
- **belief_agi_timeline**: 10-25 years
- **influence_type**: Builder, Decision-maker
- **enrichment_version**: phase3-manual
- **qa_approved**: TRUE

### 1238 — Pentagon (organization / Government/Agency)
- **notes**: POTENTIAL DUPLICATE of entity 1420 (Department of Defense), which is already enriched at phase3-manual. "Pentagon" is colloquial for DoD. Recommend merging edges into 1420 and deprecating. Minimal enrichment added for reference.
- **notes_sources**: DefenseScoop; Breaking Defense; Military.com; DoD AI Strategy (Jan 2026)
- **notes_confidence**: 4
- **belief_regulatory_stance**: Accelerate
- **belief_ai_risk**: Manageable
- **belief_evidence_source**: Explicitly stated
- **belief_agi_timeline**: Unknown
- **influence_type**: Decision-maker, Implementer
- **funding_model**: Government-funded
- **enrichment_version**: phase3-manual
- **qa_approved**: TRUE
- **⚠ DUPLICATE NOTE**: Entity 1420 (Department of Defense) covers the same real-world entity. Edge 1013 (Palantir → Pentagon partner) should eventually be repointed to 1420.

### 1239 — In-Q-Tel (organization / VC/Capital/Philanthropy)
- **notes**: Independent nonprofit VC firm investing in tech for CIA and intelligence community. Founded 1999. 800th investment in April 2025. Total investment >$1.8B. Early Palantir investor. 32 companies in 2025 NatSec 100.
- **notes_sources**: In-Q-Tel website; Washington Times; Fortune; DHS S&T page; Dakota
- **notes_confidence**: 4
- **belief_regulatory_stance**: Targeted
- **belief_ai_risk**: Serious
- **belief_evidence_source**: Inferred
- **belief_agi_timeline**: Unknown
- **influence_type**: Funder/investor
- **funding_model**: Government-funded
- **other_categories**: Government/Agency
- **enrichment_version**: phase3-manual
- **qa_approved**: TRUE

### 1240 — Cognizant (organization / Deployers & Platforms)
- **notes**: Major IT services company (NYSE: CTSH) with significant AI practice. Launched Cognizant AI Factory (Mar 2026, Dell/NVIDIA). Acquired 3Cloud (Nov 2025). Recognized as leader in Everest Group AI PEAK Matrix 2025.
- **notes_sources**: Cognizant investor relations; AI Factory press release; Everest Group; Cognizant blog
- **notes_confidence**: 4
- **belief_regulatory_stance**: Light-touch
- **belief_ai_risk**: Manageable
- **belief_evidence_source**: Inferred
- **belief_agi_timeline**: Unknown
- **influence_type**: Builder, Implementer
- **funding_model**: For-profit
- **enrichment_version**: phase3-manual
- **qa_approved**: TRUE

### 1241 — U.S. Army (organization / Government/Agency)
- **notes**: Actively integrating AI across operations. Established 49B AI/ML Officer career field (Dec 2025). Directed to field unmanned systems across every division by end 2026. Deploying AI-enabled edge tools.
- **notes_sources**: Army.mil; Federal News Network; Military.com; DefenseScoop; RAND
- **notes_confidence**: 4
- **belief_regulatory_stance**: Accelerate
- **belief_ai_risk**: Manageable
- **belief_evidence_source**: Explicitly stated
- **belief_agi_timeline**: Unknown
- **influence_type**: Decision-maker, Implementer
- **funding_model**: Government-funded
- **enrichment_version**: phase3-manual
- **qa_approved**: TRUE

### 1242 — Workera (organization / Deployers & Platforms)
- **notes**: AI-powered skills intelligence platform. Founded by Kian Katanforoosh (mentored by Andrew Ng). $44.5M raised. Clients: U.S. Air Force, Marine Corps, Booz Allen, Siemens Energy, BCG, Accenture, Eli Lilly. AI agent "Sage" launched 2024-2025.
- **notes_sources**: Workera.ai; TechCrunch; Workera blog; Newsweek; Tracxn
- **notes_confidence**: 4
- **belief_regulatory_stance**: Mixed/unclear
- **belief_ai_risk**: Unknown
- **belief_evidence_source**: Unknown
- **belief_agi_timeline**: Unknown
- **influence_type**: Builder
- **funding_model**: Venture-backed
- **enrichment_version**: phase3-manual
- **qa_approved**: TRUE

### 1243 — AI Fund (organization / VC/Capital/Philanthropy)
- **notes**: Andrew Ng's venture studio (2018). Closed oversubscribed $190M Fund II in 2025. ~35 portfolio companies including LandingAI and Workera. LPs: Sequoia, NEA, HP, Mitsui, Mitsubishi.
- **notes_sources**: AI Fund website; Yahoo Finance; Crunchbase News; Andrew Ng X post
- **notes_confidence**: 4
- **belief_regulatory_stance**: Light-touch
- **belief_ai_risk**: Manageable
- **belief_evidence_source**: Inferred
- **belief_agi_timeline**: Unknown
- **influence_type**: Funder/investor, Builder
- **funding_model**: Venture-backed
- **enrichment_version**: phase3-manual
- **qa_approved**: TRUE

### 1244 — LandingAI (organization / Deployers & Platforms)
- **notes**: Computer vision company founded by Andrew Ng. LandingLens low-code platform for visual inspection. VisionAgent released 2025. Focus: manufacturing, automotive, electronics, medical devices. Ng is Executive Chairman.
- **notes_sources**: LandingAI website; NVIDIA blog; Analytics Vidhya; IEEE Spectrum; BestAITools
- **notes_confidence**: 4
- **belief_regulatory_stance**: Light-touch
- **belief_ai_risk**: Manageable
- **belief_evidence_source**: Inferred
- **belief_agi_timeline**: Unknown
- **influence_type**: Builder
- **funding_model**: Venture-backed
- **enrichment_version**: phase3-manual
- **qa_approved**: TRUE

---

## Duplicate Finding

**Pentagon (1238) ↔ Department of Defense (1420)**
- Entity 1420 "Department of Defense" is already fully enriched (phase3-manual, qa_approved=TRUE).
- Entity 1238 "Pentagon" is a colloquial name for the same organization.
- Existing edge 1013 (Palantir → Pentagon, type=partner) should be repointed to entity 1420.
- Existing edge 1016 (Palantir → U.S. Army, type=partner) is separate and valid.
- **Recommendation**: Merge 1238's edges into 1420, then mark 1238 as deprecated or remove it.
- **No edges were modified in this batch** per instructions.

---

## Edges (pre-existing, not modified)

| Edge ID | Type | Source | Target | Role |
| ------: | ---- | ------ | ------ | ---- |
| 1000 | employer | Peter Lee | Microsoft Research | President, Microsoft Research |
| 1006 | employer | Ashok Elluswamy | Tesla | VP of AI and head of the Optimus program |
| 1013 | partner | Palantir | Pentagon | — |
| 1014 | funder | In-Q-Tel | Palantir | — |
| 1015 | partner | Palantir | Cognizant | — |
| 1016 | partner | Palantir | U.S. Army | — |
| 1019 | affiliated | DeepLearning.AI | Workera | — |
| 1020 | affiliated | DeepLearning.AI | AI Fund | — |
| 1021 | affiliated | DeepLearning.AI | LandingAI | — |

---

## Notes
- All 9 entities were truly empty (v2-auto, no notes, no beliefs, qa_approved=FALSE).
- Andrew Ng ecosystem cluster (1242, 1243, 1244) shares affiliated edges with DeepLearning.AI; edges 1019-1021 may warrant reclassification from "affiliated" to "parent_company" or "partner" in a future edge cleanup pass.
- Peter Lee's role has been updated to "President, Microsoft Science" but his employer edge still points to "Microsoft Research" — the edge role field already captures his specific title.
