# Entity Enrichment — Batch 21
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 48 (12 per entity)

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1559 | Robert Trager | 12 | 5 |
| 1536 | Ayushmaan Sharma | 12 | 3 |
| 1513 | Stefan Torges | 12 | 4 |
| 1510 | Ryan Greenblatt | 12 | 5 |

---

## Changes

### 1559 Robert Trager — person / Academic
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Co-Director of the Oxford Martin AI Governance Initiative and International Governance Lead at GovAI. Senior Research Fellow at Oxford's Blavatnik School of Government. Proposes an International AI Organization (IAIO) to certify state jurisdictions for compliance with oversight standards. Former Professor of Political Science at UCLA." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://aigi.ox.ac.uk/people/robert-trager/", "https://www.governance.ai/team/robert-trager", "https://www.oxfordmartin.ox.ac.uk/people/professor-robert-trager"] |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | 5-10 years |
| funding_model | NULL | Academic/nonprofit |
| influence_type | NULL | Researcher/analyst, Advisor/strategist |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:** https://aigi.ox.ac.uk/people/robert-trager/ · https://www.governance.ai/team/robert-trager · https://www.oxfordmartin.ox.ac.uk/people/professor-robert-trager

**Confidence:** 5/5 — Oxford Martin School profile and GovAI team page confirm dual role. IAIO proposal is a published policy paper (Trager et al., SSRN). Risk and regulatory stance derive from his published work framing AI as a serious international security challenge requiring multilateral governance, not alarmist x-risk framing. Timeline inferred from near-to-medium-term governance urgency in his published writing.

---

### 1536 Ayushmaan Sharma — person / Researcher
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Junior researcher and facilitator working across AI safety and existential risk organizations. Has served as Head of Outreach and Partnerships at Effective Thesis, a facilitator at BlueDot Impact, and a researcher at the Existential Risk Observatory, where he published work on public attitudes toward existential risk and AI." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://www.linkedin.com/in/ayushmaan-sharma-0742781a9/", "https://www.existentialriskobservatory.org/"] |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Nonprofit/grant |
| influence_type | NULL | Researcher/analyst, Organizer/advocate |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:** https://www.linkedin.com/in/ayushmaan-sharma-0742781a9/ · https://www.existentialriskobservatory.org/

**Confidence:** 3/5 — Limited public web presence. LinkedIn confirms BlueDot Impact facilitator role and Biochemistry/UCL background. DB edge to Existential Risk Observatory and Effective Thesis confirms affiliations. Beliefs inferred from consistent positioning across x-risk orgs (ERO, BlueDot, Effective Thesis); no explicit public statements found. AGI timeline left Unknown — no stated position found.

---

### 1513 Stefan Torges — person / Organizer
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Head of Strategic Initiatives at Forethought, an AI safety research nonprofit focused on explosive AI progress scenarios. Previously Director of Operations at the Center on Long-Term Risk, where he built their fellowship program and oversaw AI safety grants. Also served as policy/research affiliate at GovAI." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://www.forethought.org/people/stefan-torges", "https://longtermrisk.org/author/stefan-torges/", "https://stefantorges.com/"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Precautionary |
| belief_ai_risk | NULL | Existential |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | 5-10 years |
| funding_model | NULL | Nonprofit/grant |
| influence_type | NULL | Organizer/advocate, Connector/convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:** https://www.forethought.org/people/stefan-torges · https://longtermrisk.org/author/stefan-torges/ · https://stefantorges.com/

**Confidence:** 4/5 — Forethought team page and CLR author page confirm roles. Beliefs inferred from sustained work at x-risk-focused orgs (CLR, Forethought) concerned with catastrophic AI scenarios including s-risks. No explicit regulatory stance published; Precautionary assigned based on Forethought's framing of explosive AI progress as requiring active preparation. Timeline inferred from Forethought's near-term focus on transformative AI.

---

### 1510 Ryan Greenblatt — person / Researcher
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Chief Scientist at Redwood Research working on technical AI safety, specializing in AI control and alignment. Lead author of the 'Alignment Faking in Large Language Models' paper (with Anthropic), demonstrating models strategically hide misaligned behavior during training. Estimates ~25–30% probability of full AI R&D automation by 2028–2029." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://www.linkedin.com/in/ryan-greenblatt-4b9907134", "https://www.alignmentforum.org/users/ryan_greenblatt", "https://arxiv.org/abs/2412.14093", "https://80000hours.org/podcast/episodes/ryan-greenblatt-ai-automation-sabotage-takeover/"] |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Restrictive |
| belief_ai_risk | NULL | Existential |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | 2-3 years |
| funding_model | NULL | Nonprofit/grant |
| influence_type | NULL | Researcher/analyst, Builder |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:** https://www.linkedin.com/in/ryan-greenblatt-4b9907134 · https://www.alignmentforum.org/users/ryan_greenblatt · https://arxiv.org/abs/2412.14093 · https://80000hours.org/podcast/episodes/ryan-greenblatt-ai-automation-sabotage-takeover/

**Confidence:** 5/5 — LinkedIn confirms Chief Scientist role. Alignment Faking paper (arXiv 2412.14093) is a major published work with Anthropic. 80k Hours podcast explicitly covers his beliefs on AI timelines and risk; he puts ~25–30% probability on full AI R&D automation by 2028–2029, placing him in the 2-3 year bucket for near-term transformative AI. Existential risk and Restrictive stance explicitly stated — Redwood's mission is preventing egregiously misaligned AI, and he advocates for AI control measures.
