# Entity Enrichment — Batch 50
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 12
Fields updated: 130

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1220 | Duy Nguyen | 10 | 3 |
| 1222 | Craig Newmark Philanthropies | 11 | 4 |
| 1223 | Jeff Dean | 10 | 4 |
| 1224 | Greg Corrado | 10 | 4 |
| 1225 | Alphabet Inc. | 12 | 5 |
| 1226 | Yossi Matias | 10 | 4 |
| 1227 | People + AI Research | 12 | 5 |
| 1228 | Gordon M. Goldstein | 10 | 3 |
| 1229 | Børge Brende | 10 | 4 |
| 1230 | Maria Basso | 10 | 3 |
| 1231 | Francisco Betti | 10 | 3 |
| 1232 | Cathy Li | 10 | 4 |

Batch clusters: Google/Alphabet AI cluster (1223-1227), WEF leadership cluster (1229-1232), NYT applied AI (1220), cybersecurity philanthropy (1222), tech policy advisory (1228).

---

## Changes

### [1220] Duy Nguyen — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | nytco.com, editorandpublisher.com, ire.org, semafor.com |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Mixed/unclear |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Technical leader |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — Senior ML engineer at NYT on AI Initiatives team. Built Echo internal tool. No public policy statements found; stance inferred from institutional context (NYT's careful, editorial-first AI adoption approach). Applied ML practitioner, not a policy voice.

---

### [1222] Craig Newmark Philanthropies — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | securityandtechnology.org, cltc.berkeley.edu, insidephilanthropy.com, cyberpeaceinstitute.org, globalcyberalliance.org |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Philanthropic |
| influence_type | NULL | Funder/donor |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — $100M+ committed to Cyber Civil Defense. Funds IST UnDisruptable27 ($3.2M), UC Berkeley cybersecurity, Global Cyber Alliance. Stance inferred from heavy cybersecurity investment pattern — treats AI-adjacent cyber threats as serious. No explicit AI-specific regulatory statements but clear targeted-risk orientation.

---

### [1223] Jeff Dean — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | en.wikipedia.org, time.com, fortune.com, dwarkesh.com, cnbc.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Technical leader, Investor |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Chief Scientist at Google DeepMind, co-founded Google Brain. TIME100 AI 2025. Takes balanced middle-ground on safety: acknowledges risks, supports safeguards via Google Responsible AI framework, but rejects extreme precautionary approaches. Signed amicus brief supporting Anthropic. Active AI angel investor. Stance inferred from interviews and public statements.

---

### [1224] Greg Corrado — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | en.wikipedia.org, research.google, linkedin.com, computerhistory.org |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Technical leader |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Distinguished Scientist at Google, co-founded Google Brain. Led Health AI division. Explicitly advocates governance beyond "safety filters" toward protocols for authority, responsibility, and trust in multi-agent systems. Targeted stance reflects his nuanced, evolution-oriented governance view rather than blanket regulation or laissez-faire.

---

### [1225] Alphabet Inc. — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | ai.google, aljazeera.com, cnbc.com, publicpolicy.google, digital.nemko.com |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | 5-10 years |
| funding_model | NULL | Revenue-funded |
| influence_type | NULL | Market leader, Lobbyist |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 5/5 — Extensively documented. Published AI Principles (2018), removed weapons/surveillance pledges (Feb 2025). Supports multi-stakeholder governance but lobbied for 10-year ban on state AI regulation. Explicitly stated positions via public policy pages, annual Responsible AI reports, and leadership statements. AGI timeline based on Google DeepMind's public research trajectory and Hassabis statements.

---

### [1226] Yossi Matias — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | bigtechnology.com, en.wikipedia.org, research.google, emergingtechbrew.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Technical leader |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — VP Engineering & Research at Google, Head of Google Research. Frames AI as "amplifier of human ingenuity." Argues AI creates more research jobs (cites AlphaFold). Stance inferred from optimistic framing and alignment with Google's institutional position. No explicit regulatory statements found.

---

### [1227] People + AI Research — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | pair.withgoogle.com, blog.google, ai.googleblog.com, design.google |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Corporate-funded |
| other_categories | NULL | Think Tank/Research |
| influence_type | NULL | Research output |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 5/5 — Well-documented Google Research team (est. 2017). Part of Responsible AI and Human-Centered Technology team. Publishes PAIR Guidebook, open-source LIT tool, Explorables. Research focus on explainability, fairness, interpretability signals targeted risk approach. Treats AI risks as serious enough to warrant systematic tools and frameworks for understanding ML behavior.

---

### [1228] Gordon M. Goldstein — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | cfr.org, crunchbase.com, carnegiecouncil.org, globalfreedomofexpression.columbia.edu |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Advisor/strategist, Thought leader |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — CFR Adjunct Senior Fellow focusing on global technology and U.S. foreign policy. Directs roundtable on technology, innovation, and American primacy. Former Silver Lake MD (tech investing) and UN adviser. No direct AI regulation quotes found; stance inferred from CFR institutional positioning (tends toward structured, targeted governance) and his focus on tech's national security implications.

---

### [1229] Børge Brende — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | weforum.org, imd.org, cnn.com, un.org |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Convener, Thought leader |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — President & CEO of WEF. Launched AI Governance Alliance and GRIP platform (July 2025). Emphasizes multi-stakeholder, agile governance. Calls for "co-creation over competition, collaboration over fragmentation." Former Norwegian Foreign Minister. Moderate stance reflects WEF's institutional bridging role between industry and government.

---

### [1230] Maria Basso — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | weforum.org, promfgmedia.com, linkedin.com, reports.weforum.org |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — Head of AI Applications and Impact at WEF CAIE (appointed Jan 2025). 6+ years at WEF. Engineering background (Politecnico di Torino, UIUC). Former McKinsey analyst. Focuses on real-world AI adoption and organizational transformation. Stance inferred from WEF institutional positioning and her applied/deployment focus.

---

### [1231] Francisco Betti — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | manufacturingleadershipcouncil.com, weforum.org, linkedin.com |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — Head of Global Industries Team and Executive Committee member at WEF. Previously led Centre for Advanced Manufacturing. Advocates AI deployment at scale in manufacturing. Former PwC management consultant. Stance inferred from WEF institutional positioning and manufacturing-sector focus on "responsible transformation."

---

### [1232] Cathy Li — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | weforum.org, theinnovator.news, businessworld.in |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Convener, Thought leader |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Head of Centre for AI Excellence, Executive Committee member at WEF. Oversees AI Governance Alliance (AIGA). Argues AI leadership depends on deployment effectiveness, not infrastructure volume. Warns organizations misunderstand AI's transformative potential. Champions responsible, transparent, inclusive AI. More quoted and publicly visible than other WEF AI staff.
