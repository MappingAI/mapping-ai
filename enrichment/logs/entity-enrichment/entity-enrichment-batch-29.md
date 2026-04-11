# Entity Enrichment — Batch 29
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 6
Fields updated: 66 (11 fields x 6 entities)

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1688 | Gigafund | 11 | 3/5 |
| 1689 | 100 Plus Capital | 11 | 3/5 |
| 1690 | Connor Axiotes | 11 | 3/5 |
| 1692 | Joey Skaf | 11 | 3/5 |
| 1694 | Robert Huben | 11 | 3/5 |
| 1695 | Dawn Drescher | 11 | 3/5 |

All 6 entities are 1-edge entities with limited public prominence. Confidence capped at 3 accordingly;
belief fields largely inferred from affiliations and public writing rather than explicit policy statements.

---

## Changes

### 1688 Gigafund — organization / VC/Capital/Philanthropy

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 396-char summary: Austin TX VC founded by Luke Nosek and Stephen Oskoui (2017), concentrated multi-decade strategy, SpaceX/Neuralink/Boring Company, Foresight Institute funder |
| notes_v1 | null | null (no prior notes) |
| notes_sources | null | 3 URLs |
| notes_confidence | null | 3 |
| funding_model | null | Venture capital |
| influence_type | null | Funder/investor |
| belief_regulatory_stance | null | Accelerate |
| belief_ai_risk | null | Unknown |
| belief_evidence_source | null | Inferred |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.gigafund.com/
- https://www.crunchbase.com/organization/gigafund
- https://foresight.org/bio-nano-grants/

**Confidence:** 3/5 — 1-edge entity (funder -> Foresight Institute). Founders' Thiel/PayPal pedigree
suggests pro-acceleration stance but no direct AI policy statements found. Belief fields mostly Unknown.

---

### 1689 100 Plus Capital — organization / VC/Capital/Philanthropy

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 381-char summary: longevity-focused VC founded by Sonia Arrison (2007), Menlo Park, ~15 portfolio companies in HealthTech/Life Sciences, Foresight Institute board/funder connection |
| notes_v1 | null | null (no prior notes) |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 3 |
| funding_model | null | Venture capital |
| influence_type | null | Funder/investor |
| belief_regulatory_stance | null | Unknown |
| belief_ai_risk | null | Unknown |
| belief_evidence_source | null | Unknown |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://100pluscap.com/
- https://100pluscap.com/team/
- https://foresight.org/bio-nano-grants/
- https://soniaarrison.com/about-the-author/

**Confidence:** 3/5 — 1-edge entity (funder -> Foresight Institute). Longevity-focused VC with no
public AI policy positions. All belief fields Unknown.

---

### 1690 Connor Axiotes — person / Executive

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 443-char summary: UK AI policy/comms expert, ASI Director of Comms, ex-Conjecture, authored 'Tipping Point' paper, exec producer 'Making God' AGI documentary, Leaf Courses affiliate, Control AI campaign |
| notes_v1 | null | null (no prior notes) |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 3 |
| funding_model | null | null (individual) |
| influence_type | null | Narrator, Organizer/advocate |
| belief_regulatory_stance | null | Moderate |
| belief_ai_risk | null | Catastrophic |
| belief_evidence_source | null | Explicitly stated |
| belief_agi_timeline | null | 5-10 years |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.adamsmith.org/research/tipping-point-on-the-edge-of-superintelligence-1
- https://connoraxiotes.substack.com/p/making-god-begins-shooting
- https://leaf.courses/dilemmas-and-dangers-in-ai
- https://www.linkedin.com/in/connor-axiotes-979718143/

**Confidence:** 3/5 — 1-edge entity (affiliated -> Leaf). Belief fields from published writing and
Substack: advocates mandatory safety evals + third-party auditing (Moderate), treats AGI risks as
potentially catastrophic, Substack content implies near-term AGI expectations.

---

### 1692 Joey Skaf — person / Organizer

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 400-char summary: Cambridge-based AI safety researcher/organizer, former Meridian Cambridge CEO, MARS and LASR participant, NeurIPS 2025 paper on steganographic CoT in LLMs |
| notes_v1 | null | null (no prior notes) |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 3 |
| funding_model | null | null (individual) |
| influence_type | null | Organizer/advocate, Researcher/analyst |
| belief_regulatory_stance | null | Moderate |
| belief_ai_risk | null | Serious |
| belief_evidence_source | null | Inferred |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.meridiancambridge.org/
- https://www.researchgate.net/publication/392370966
- https://caish.org/mars
- https://www.linkedin.com/in/joey-skaf-145688167/

**Confidence:** 3/5 — 1-edge entity (affiliated -> MARS). Beliefs inferred from organizational
affiliations (Meridian, MARS, LASR) and research focus on safety monitoring. No explicit policy
statements found.

---

### 1694 Robert Huben — person / Researcher

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 418-char summary: AI safety researcher, math PhD (UNL 2021), ex-defense contractor, founded 'From AI to ZI' Substack, Open Philanthropy grant (2022-2023), published on sparse autoencoders and attention-only transformers, NeurIPS 2023 workshops |
| notes_v1 | null | null (no prior notes) |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 3 |
| funding_model | null | Philanthropic |
| influence_type | null | Researcher/analyst, Narrator |
| belief_regulatory_stance | null | Precautionary |
| belief_ai_risk | null | Existential |
| belief_evidence_source | null | Inferred |
| belief_agi_timeline | null | 10-25 years |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://aizi.substack.com/
- https://aizi.substack.com/p/the-future-of-from-ai-to-zi
- https://aizi.substack.com/p/introducing-from-ai-to-zi
- https://www.linkedin.com/in/robert-huben-b349761b0/

**Confidence:** 3/5 — 1-edge entity (founder -> From AI to ZI). Beliefs inferred from blog content
covering existential risk, treacherous turns, deceptive alignment. Timeline inferred from 'What's left
for AGI besides scale?' post which discusses remaining technical hurdles.

---

### 1695 Dawn Drescher — person / Researcher

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 434-char summary: GiveWiki cofounder, Switzerland-based, crowdsourced AI safety charity evaluator (~220 donors, ~88 projects), regranted up to $600K, building AI mental health tool on Gemini, EA community active on suffering-focused ethics, s-risks, AI rights advocacy |
| notes_v1 | null | null (no prior notes) |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 3 |
| funding_model | null | Philanthropic |
| influence_type | null | Funder/investor, Connector/convener |
| belief_regulatory_stance | null | Moderate |
| belief_ai_risk | null | Serious |
| belief_evidence_source | null | Inferred |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://forum.effectivealtruism.org/users/dawn-drescher
- https://impactmarkets.substack.com/p/ai-safety-impact-markets
- https://forum.effectivealtruism.org/posts/zxxew56gnYhYEupsc/regrant-up-to-usd600-000-to-ai-safety-projects-with-givewiki
- https://impactmarkets.substack.com/p/the-givewikis-top-picks-in-ai-safety

**Confidence:** 3/5 — 1-edge entity (affiliated -> GiveWiki). Beliefs inferred from EA Forum posts
and GiveWiki focus. Advocates for AI rights and legal recourse over coercive control (Moderate stance).
Concern about s-risks and AI suffering suggests Serious risk view but not Existential framing.
