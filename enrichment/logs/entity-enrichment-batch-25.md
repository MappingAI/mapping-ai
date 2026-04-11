# Entity Enrichment — Batch 25
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 46 (12 per entity for 1394/1389/1054; 10 for 948 which had prior v1 data)

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1394 | Thomas Larsen | 12 | 4 |
| 1389 | Harvard Faculty of Arts and Sciences | 12 | 4 |
| 1054 | Signal | 12 | 5 |
| 948 | MIT GOV/LAB | 10 | 4 |

---

## Changes

### 1394 Thomas Larsen — person / Researcher
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Researcher at the AI Futures Project focused on dangerous capability evaluations, AI safety measurement, and compute governance. Co-authored the AI 2027 scenario forecast with Daniel Kokotajlo and Eli Lifland. Previously founded the Center for AI Policy; also a MATS mentor." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://www.aifutures.org/about", "https://ai-2027.com/about", "https://www.matsprogram.org/mentor/larsen"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Restrictive |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | 2-3 years |
| funding_model | NULL | Nonprofit |
| influence_type | NULL | Researcher/analyst, Advisor/strategist |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:** https://www.aifutures.org/about · https://ai-2027.com/about · https://www.matsprogram.org/mentor/larsen

**Confidence:** 4/5 — AI Futures Project about page and MATS mentor profile confirm current role and research focus. AI 2027 scenario forecast is publicly attributed to Larsen. Regulatory stance (Restrictive) and risk level (Catastrophic) inferred from his work at the Center for AI Policy (which explicitly advocates for legislation to reduce catastrophic AI risk) and his co-authorship of AI 2027, a scenario describing near-term transformative and dangerous AI. Timeline (2-3 years) inferred from the AI 2027 framing; not a single explicit quote found, hence 4 not 5.

---

### 1389 Harvard Faculty of Arts and Sciences — organization / Academic
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "The primary academic division of Harvard University housing most arts, humanities, and sciences departments. Home to the Kempner Institute for the Study of Natural and Artificial Intelligence (launched 2022), a university-wide initiative with strong FAS ties bridging neuroscience and AI. FAS Research Computing supports the Kempner AI cluster." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://kempnerinstitute.harvard.edu/", "https://research.fas.harvard.edu/resource/kempner-institute-study-natural-and-artificial-intelligence-affiliate-faculty-program", "https://en.wikipedia.org/wiki/Kempner_Institute_for_the_Study_of_Natural_and_Artificial_Intelligence"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Mixed/nuanced |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Academic/endowment |
| influence_type | NULL | Researcher/analyst, Connector/convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:** https://kempnerinstitute.harvard.edu/ · https://research.fas.harvard.edu/resource/kempner-institute-study-natural-and-artificial-intelligence-affiliate-faculty-program · https://en.wikipedia.org/wiki/Kempner_Institute_for_the_Study_of_Natural_and_Artificial_Intelligence

**Confidence:** 4/5 — FAS is a well-documented institutional entity and its relationship to the Kempner Institute is confirmed via the FAS Office of Research Administration affiliate faculty program page. Beliefs are assigned at the FAS division level (not individual faculty), inferred from the Kempner Institute's research orientation (foundational AI science, not advocacy). No explicit FAS-level AI policy stance; Moderate/Mixed/nuanced reflects a large research institution that studies AI rather than takes public positions on regulation.

---

### 1054 Signal — organization / Ethics/Bias/Rights
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Nonprofit developer of the Signal encrypted-messaging app. President Meredith Whittaker argues AI is fundamentally a surveillance technology that expands harmful data-collection business models. Signal has publicly warned that agentic AI poses an existential threat to secure messaging, and opposes mandatory message-scanning laws such as the EU Chat Control proposal." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://techcrunch.com/2023/09/25/signals-meredith-whittaker-ai-is-fundamentally-a-surveillance-technology/", "https://fortune.com/2025/11/27/ai-agents-are-an-existential-threat-to-secure-messaging-signals-president-whittaker-says/", "https://signal.org/blog/pdfs/germany-chat-control.pdf"] |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Restrictive |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Nonprofit/donations |
| influence_type | NULL | Organizer/advocate, Narrator, Builder |
| enrichment_version | v2-insufficient | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:** https://techcrunch.com/2023/09/25/signals-meredith-whittaker-ai-is-fundamentally-a-surveillance-technology/ · https://fortune.com/2025/11/27/ai-agents-are-an-existential-threat-to-secure-messaging-signals-president-whittaker-says/ · https://signal.org/blog/pdfs/germany-chat-control.pdf

**Confidence:** 5/5 — Positions are explicitly stated and well-documented through multiple interviews and blog posts from Signal's president Meredith Whittaker (also in the DB as a connected entity). "AI is fundamentally a surveillance technology" is a verbatim public quote. Chat Control opposition is documented in Signal's own published PDF. Regulatory stance Restrictive is appropriate — Signal advocates for strong privacy/data laws (GDPR enforcement, ban on surveillance advertising) and opposes AI-driven surveillance. Risk level Serious reflects harm to democracy and power concentration, not x-risk framing.

---

### 948 MIT GOV/LAB — organization / Academic
| Field | Before | After |
| ----- | ------ | ----- |
| notes | "MIT Governance Lab; Lily Tsai founder" | "MIT political science lab founded by Lily Tsai in 2014. Develops and tests innovations in citizen engagement and government accountability. Active AI work includes research on generative AI and democracy, a deliberation.io online platform, and a mini-syllabus on AI/ML and governance. Interested in the impact of AI on trust between citizens and governments." |
| notes_v1 | "MIT Governance Lab; Lily Tsai founder" | (unchanged — already backed up) |
| notes_sources | NULL | ["https://mitgovlab.org/", "https://mitgovlab.org/news/mit-gov-lab-digest-13-the-latest-on-generative-ai-democracy/", "https://mitgovlab.org/research/generative-ai-for-pro-democracy-platforms/"] |
| notes_confidence | NULL | 4 |
| funding_model | NULL | Academic/grants |
| other_categories | NULL | Think Tank/Policy Org |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE |

*belief_* fields left unchanged (already set in v1: Targeted / Mixed/nuanced / Explicitly stated / Unknown)*

**Sources:** https://mitgovlab.org/ · https://mitgovlab.org/news/mit-gov-lab-digest-13-the-latest-on-generative-ai-democracy/ · https://mitgovlab.org/research/generative-ai-for-pro-democracy-platforms/

**Confidence:** 4/5 — MIT GOV/LAB website confirms founding year, Lily Tsai's role, and active AI/democracy research program including deliberation.io and generative AI digests. notes_v1 preserved from v1 enrichment as instructed. Belief fields from v1 (Targeted / Mixed/nuanced) are consistent with the lab's evidence-based, governance-experiment approach; left untouched. other_categories = Think Tank/Policy Org added as the lab straddles academic research and applied policy.
