# Entity Enrichment — Batch 37
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 6
Fields updated: 61

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1741 | Scott Aaronson | 10 | 4 |
| 1742 | Stuart J. Russell | 10 | 5 |
| 1743 | Pieter Abbeel | 10 | 4 |
| 1744 | Anca Dragan | 10 | 4 |
| 1745 | Open Philanthropy Project | 11 | 5 |
| 1746 | Rachel Freedman | 10 | 3 |

---

## Changes

### [1741] Scott Aaronson — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (see below) |
| notes_sources | NULL | scottaaronson.blog, axrp.net, theaiinsider.tech, thegradientpub.substack.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Prominent public intellectual with extensive blog output. Clear 'reform alignment' position; not a doomer but takes risk seriously. Favors targeted technical measures (watermarking) over broad regulation. Spent 2022-2024 at OpenAI, now leads Open Philanthropy-backed alignment group at UT Austin.

---

### [1742] Stuart J. Russell — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (see below) |
| notes_sources | NULL | time.com, danfaggella.com, humancompatible.ai, 80000hours.org |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Restrictive |
| belief_ai_risk | NULL | Existential |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | 10-25 years |
| influence_type | NULL | Researcher/analyst, Advisor/strategist |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 5/5 — One of the most vocal AI safety advocates in academia. Author of the standard AI textbook and 'Human Compatible.' TIME100 AI 2025. Testified before U.S. Senate on AI regulation. Founded CHAI and IASEAI. Views on risk and regulation are extensively documented.

---

### [1743] Pieter Abbeel — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (see below) |
| notes_sources | NULL | en.wikipedia.org, amazon.science, fourweekmba.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Mixed/unclear |
| belief_ai_risk | NULL | Unknown |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst, Builder |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Well-documented career (Berkeley prof, Covariant founder, Amazon AGI lead). Belief fields are Unknown/Inferred because Abbeel is primarily a capabilities researcher/entrepreneur and has not taken strong public stances on AI risk or regulation.

---

### [1744] Anca Dragan — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (see below) |
| notes_sources | NULL | eecs.berkeley.edu, deepmind.google, profile.lessie.ai |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst, Builder |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Well-documented role as Sr. Director of AI Safety and Alignment at Google DeepMind. Publicly discusses safety philosophy (DeepMind podcast, ICML invited talk). Emphasizes practical safety measures and views present-day and catastrophic risk mitigation as complementary.

---

### [1745] Open Philanthropy Project — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (see below) |
| notes_sources | NULL | openphilanthropy.org, coefficientgiving.org, insidephilanthropy.com |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Philanthropic |
| influence_type | NULL | Funder/investor |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 5/5 — Extremely well-documented organization. $4B+ in total grants, $50M to AI safety in 2024, $40M RFP in 2025. Pioneer funder of AI safety since 2015.

**DUPLICATE NOTE:** Entity 1745 ("Open Philanthropy Project") is very likely a duplicate of entity 128 ("Coefficient Giving (formerly Open Philanthropy)"). Open Philanthropy was renamed to Coefficient Giving in November 2025. Entity 128 already has enriched notes. Edge 2190 (funder of CHAI) is attached to entity 1745. Recommend merging 1745 into 128 in a future cleanup pass — reassign edge 2190 to entity 128 and delete 1745.

---

### [1746] Rachel Freedman — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (see below) |
| notes_sources | NULL | rachelfreedman.github.io, humancompatible.ai, foresight.org |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Mixed/unclear |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — Early-career PhD student at CHAI under Stuart Russell. Publications well-documented, but limited public statements on policy/risk views. Beliefs inferred from CHAI affiliation and research focus on alignment/reward learning.

---

## Edges (pre-existing, not modified)

| Edge ID | Type | Source | Target | Role |
| ------: | ---- | ------ | ------ | ---- |
| 2185 | collaborator | Alignment Research Center (ARC) | Scott Aaronson | External research collaborator |
| 2186 | founder | Stuart J. Russell | Center for Human-Compatible AI (CHAI) | Director |
| 2188 | employer | Pieter Abbeel | Center for Human-Compatible AI (CHAI) | faculty member |
| 2189 | employer | Anca Dragan | Center for Human-Compatible AI (CHAI) | faculty member |
| 2190 | funder | Open Philanthropy Project | Center for Human-Compatible AI (CHAI) | — |
| 2193 | employer | Rachel Freedman | Center for Human-Compatible AI (CHAI) | AI PhD student |

## Issues

1. **Duplicate: Open Philanthropy Project (1745) vs Coefficient Giving (128).** Entity 128 already exists as "Coefficient Giving (formerly Open Philanthropy)" with enrichment_version='v2'. Entity 1745 holds edge 2190 (funder of CHAI). Recommend merging in a future cleanup pass.
2. **Edge 2188/2189 type 'employer' for Abbeel/Dragan -> CHAI.** These use 'employer' but CHAI is a research center within Berkeley, not a separate employer. 'member' with role 'faculty member' may be more accurate. Noted but not modified per instructions.
