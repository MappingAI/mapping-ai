# Entity Enrichment — Batch 26
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 44 (11 per entity)

---
## Summary
| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 875 | DAIR | 11 | 5/5 |
| 876 | Thinking Machines Lab | 11 | 5/5 |
| 956 | Roosevelt Institute | 11 | 4/5 |
| 958 | Collective Intelligence Project | 11 | 4/5 |

---
## Changes

### 875 DAIR — organization / Ethics/Bias/Rights
| Field | Before | After |
| ----- | ------ | ----- |
| notes | Distributed AI Research Institute, founded by Timnit Gebru | Distributed AI Research Institute founded December 2021 by Timnit Gebru after her dismissal from Google. Documents AI harms on marginalized communities globally, with focus on Africa. Originated the TESCREAL critique arguing AGI ideology has eugenicist roots. Funded by Ford Foundation, MacArthur Foundation, Kapor Center, and Open Society Foundations. |
| notes_v1 | (same as notes — preserved) | unchanged |
| notes_sources | null | ["https://www.dair-institute.org/", "https://www.dair-institute.org/projects/tescreal/", "https://en.wikipedia.org/wiki/Distributed_Artificial_Intelligence_Research_Institute", "https://techcrunch.com/2021/12/02/google-timnit-gebru-ai-research-dair/"] |
| notes_confidence | null | 5 |
| belief_regulatory_stance | Targeted | **Restrictive** — DAIR explicitly advocates for strong external oversight and pauses on harmful AI deployments; "Targeted" was too mild given their documented opposition to unchecked AI development |
| belief_ai_risk | Serious | Serious (confirmed) |
| belief_evidence_source | Explicitly stated | Explicitly stated (confirmed) |
| belief_agi_timeline | Unknown | **Ill-defined** — Gebru and DAIR treat AGI as a harmful ideological construct (via TESCREAL critique) rather than a meaningful milestone |
| funding_model | null | Nonprofit/grants |
| influence_type | Researcher/analyst, Organizer/advocate, Narrator | Researcher/analyst, Organizer/advocate, Narrator (confirmed, removed Builder which was not present) |
| enrichment_version | v1 | phase3-manual |
| qa_approved | true | true |

**Sources:** https://www.dair-institute.org/ · https://www.dair-institute.org/projects/tescreal/ · https://en.wikipedia.org/wiki/Distributed_Artificial_Intelligence_Research_Institute · https://techcrunch.com/2021/12/02/google-timnit-gebru-ai-research-dair/

**Confidence:** 5/5 — DAIR has a clear public website, Wikipedia article, and Gebru's positions are extensively documented. TESCREAL paper is published and widely cited.

---

### 876 Thinking Machines Lab — organization / Frontier Lab
| Field | Before | After |
| ----- | ------ | ----- |
| notes | AI research company founded by Mira Murati | AI frontier lab founded February 2025 by former OpenAI CTO Mira Murati; raised $2B at $12B valuation led by a16z, with Nvidia, AMD, Cisco as investors. Chief scientist is John Schulman (ex-OpenAI). Focus on post-training efficiency and developer tools; released Tinker for model fine-tuning. Pursuing $5B raise at ~$50B valuation as of late 2025. |
| notes_v1 | (same as notes — preserved) | unchanged |
| notes_sources | null | ["https://en.wikipedia.org/wiki/Thinking_Machines_Lab", "https://builtin.com/articles/what-is-thinking-machines-lab", "https://www.cnbc.com/2025/07/15/openai-mira-murati-thinking-machines-lab.html", "https://www.cnbc.com/2026/03/10/nvidia-mira-murati-thinking-machines-lab-ai.html"] |
| notes_confidence | null | 5 |
| belief_regulatory_stance | Light-touch | **Moderate** — Murati has explicitly called for government regulators to be "very involved" and stated AI must be regulated; Light-touch understates her position |
| belief_ai_risk | Manageable | Manageable (confirmed — Murati frames risks as real but solvable with proactive safety + regulation) |
| belief_evidence_source | Explicitly stated | Explicitly stated (confirmed) |
| belief_agi_timeline | Unknown | **2-3 years** — John Schulman (chief scientist) is one of the leading AGI-timeline optimists; Murati has given near-term timelines in interviews |
| funding_model | null | VC-backed |
| influence_type | Builder, Researcher/analyst | Builder, Researcher/analyst (confirmed) |
| enrichment_version | v1 | phase3-manual |
| qa_approved | true | true |

**Sources:** https://en.wikipedia.org/wiki/Thinking_Machines_Lab · https://builtin.com/articles/what-is-thinking-machines-lab · https://www.cnbc.com/2025/07/15/openai-mira-murati-thinking-machines-lab.html · https://www.cnbc.com/2026/03/10/nvidia-mira-murati-thinking-machines-lab-ai.html

**Confidence:** 5/5 — Well-documented public company with Wikipedia article, CNBC coverage, and multiple funding announcements. Funding details confirmed across multiple sources.

---

### 956 Roosevelt Institute — organization / Think Tank/Policy Org
| Field | Before | After |
| ----- | ------ | ----- |
| notes | Progressive economic policy; Stiglitz Chief Economist | Progressive economic policy think tank with Nobel laureate Joseph Stiglitz as Chief Economist. AI work focuses on antitrust frameworks for emerging AI markets, worker rights in AI deployment, and democratic governance of automation. Argues labor voice must be central to technology policy; affiliated scholar Ganesh Sitaraman covers industrial policy. |
| notes_v1 | (same as notes — preserved) | unchanged |
| notes_sources | null | ["https://rooseveltinstitute.org/publications/promoting-innovation/", "https://rooseveltinstitute.org/publications/good-labor-policy-is-good-technology-policy/", "https://rooseveltinstitute.org/blog/democratically-deploying-ai/"] |
| notes_confidence | null | 4 |
| belief_regulatory_stance | Targeted | Targeted (confirmed — sector-specific antitrust + labor rules, not broad R&D restrictions) |
| belief_ai_risk | Serious | Serious (confirmed — labor displacement, power concentration) |
| belief_evidence_source | Explicitly stated | Explicitly stated (confirmed) |
| belief_agi_timeline | Unknown | Unknown (confirmed — Roosevelt focuses on near-term economic/labor harms, not AGI timelines) |
| funding_model | null | Nonprofit/grants |
| influence_type | Researcher/analyst, Advisor/strategist, Organizer/advocate | Researcher/analyst, Advisor/strategist, Organizer/advocate (confirmed) |
| enrichment_version | v1 | phase3-manual |
| qa_approved | true | true |

**Sources:** https://rooseveltinstitute.org/publications/promoting-innovation/ · https://rooseveltinstitute.org/publications/good-labor-policy-is-good-technology-policy/ · https://rooseveltinstitute.org/blog/democratically-deploying-ai/

**Confidence:** 4/5 — Clear public AI work documented on their website. Deducted 1 point because their explicit AI positions are spread across multiple briefs rather than a single consolidated statement.

---

### 958 Collective Intelligence Project — organization / Think Tank/Policy Org
| Field | Before | After |
| ----- | ------ | ----- |
| notes | Siddarth, Huang; democratic AI governance | Nonprofit incubator for participatory AI governance models, co-founded by Divya Siddarth and Saffron Huang. Runs 'alignment assemblies' and community models to embed public input into AI development. Partnered with Anthropic, OpenAI, UK Frontier AI Task Force, and Taiwan's Digital Ministry. Obtained independent 501(c)3 status in 2024. |
| notes_v1 | (same as notes — preserved) | unchanged |
| notes_sources | null | ["https://www.cip.org/research", "https://time.com/7012847/saffron-huang-divya-siddarth/", "https://2024.cip.org/"] |
| notes_confidence | null | 4 |
| belief_regulatory_stance | Targeted | Targeted (confirmed — sector-specific participatory governance, not broad prohibition) |
| belief_ai_risk | Serious | Serious (confirmed — frames AI governance failures as serious democratic and societal risk) |
| belief_evidence_source | Explicitly stated | Explicitly stated (confirmed) |
| belief_agi_timeline | Unknown | Unknown (confirmed — CIP does not take explicit timeline positions) |
| funding_model | null | Nonprofit/grants |
| influence_type | Researcher/analyst, Builder, Organizer/advocate, Connector/convener | Researcher/analyst, Builder, Organizer/advocate, Connector/convener (confirmed) |
| enrichment_version | v1 | phase3-manual |
| qa_approved | true | true |

**Sources:** https://www.cip.org/research · https://time.com/7012847/saffron-huang-divya-siddarth/ · https://2024.cip.org/

**Confidence:** 4/5 — Strong documentation from their own website and TIME coverage. Deducted 1 point as specific funding sources were not publicly listed (fiscal sponsorship history known, current funders not disclosed).
