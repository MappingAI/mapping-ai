# Entity Enrichment — Batch 20
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 44 (11 per entity)

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1597 | Founders Pledge | 11 | 4 |
| 1594 | Jesse Clifton | 11 | 4 |
| 1592 | Jonas Vollmer | 11 | 4 |
| 1584 | Princeton AI Lab | 11 | 4 |

---

## Changes

### 1597 Founders Pledge — organization / Think Tank/Policy Org
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "EA-aligned nonprofit where entrepreneurs pledge to donate a share of exit proceeds. Publishes cause-area research including advanced AI, recommending funders prioritize catastrophic-risk reduction and international coordination. Has moved over $323M in grants; funds organizations like FAR AI, CEIP, and the Effective Institutions Project." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://www.founderspledge.com/research/research-and-recommendations-advanced-artificial-intelligence", "https://impact.founderspledge.com/2024/reducing-global-risks"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Donor-pledged philanthropy |
| other_categories | NULL | AI Safety/Alignment |
| influence_type | NULL | Funder/investor, Researcher/analyst |

**Sources:** https://www.founderspledge.com/research/research-and-recommendations-advanced-artificial-intelligence, https://impact.founderspledge.com/2024/reducing-global-risks

**Confidence:** 4/5 — Founders Pledge publishes detailed public research on AI; their risk framing (catastrophic, coordination-focused) and funding activity are explicitly stated. Timeline withheld from public writing.

---

### 1594 Jesse Clifton — person / Organizer
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "AI safety researcher focused on cooperative AI, game theory, and conflict prevention in multi-agent systems. Co-founded Center on Long-Term Risk and served as its Executive Director; now Grantmaking Officer at Macroscopic Ventures and board trustee of the Cooperative AI Foundation. PhD student in statistics at NC State." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://longtermrisk.org/author/jesse-clifton/", "https://www.cooperativeai.com/foundation", "https://macroscopic.org/about"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Existential |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | NULL |
| other_categories | NULL | Researcher |
| influence_type | NULL | Researcher/analyst, Funder/investor, Organizer/advocate |

**Sources:** https://longtermrisk.org/author/jesse-clifton/, https://www.cooperativeai.com/foundation, https://macroscopic.org/about

**Confidence:** 4/5 — Well-documented via CLR publications, CAIF website, and Macroscopic site. Risk beliefs (existential, conflict-focused) explicitly stated in research agenda; regulatory stance inferred as targeted/technical interventions from published agenda. Timeline not stated publicly.

---

### 1592 Jonas Vollmer — person / Executive
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "EA-aligned executive and co-founder of Center on Long-Term Risk. Held senior roles at EA Funds and Centre for Effective Altruism before joining Macroscopic Ventures as CFO and AI Futures Project as COO. Focuses on scenario forecasting and strategic grantmaking to improve the trajectory of advanced AI development." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://macroscopic.org/about", "https://www.aifutures.org/about", "https://longtermrisk.org/team/"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | 2-3 years |
| funding_model | NULL | NULL |
| other_categories | NULL | Organizer |
| influence_type | NULL | Decision-maker, Funder/investor, Organizer/advocate |

**Sources:** https://macroscopic.org/about, https://www.aifutures.org/about, https://longtermrisk.org/team/

**Confidence:** 4/5 — Career history well-documented via EA Forum, CLR, and organizational websites. AGI timeline set to 2-3 years based on his active work on the AI 2027 scenario forecast and stated motivation of wanting to make AGI go well imminently; beliefs otherwise inferred from affiliations. Note: current LinkedIn lists Polaris Research Institute as a newer affiliation — may warrant future check.

---

### 1584 Princeton AI Lab — organization / Academic
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Princeton Laboratory for Artificial Intelligence, launched fall 2024 under inaugural director Tom Griffiths and associate director Olga Russakovsky. Supports interdisciplinary AI research across campus including safety, ethics, natural and artificial minds, and AI for scientific discovery. Distinct from Princeton CITP." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://ai.princeton.edu/ai-lab", "https://psych.princeton.edu/news-events/news/2024/tom-griffiths-named-inaugural-director-princeton-laboratory-artificial"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | University |
| other_categories | NULL | NULL |
| influence_type | NULL | Researcher/analyst, Advisor/strategist |

**Sources:** https://ai.princeton.edu/ai-lab, https://psych.princeton.edu/news-events/news/2024/tom-griffiths-named-inaugural-director-princeton-laboratory-artificial

**Confidence:** 4/5 — Lab launched fall 2024 with clear public documentation on leadership and research scope. Beliefs inferred from research agenda (safety, ethics, societal impact) and faculty policy engagement. Org is distinct from Princeton CITP (already enriched separately) — CITP focuses on internet policy; AI Lab focuses on foundational and applied AI research.
