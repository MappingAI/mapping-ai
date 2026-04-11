# Entity Enrichment — Batch 02
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 48

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1309 | National Institute of Standards and Technology | 12 | 5 |
| 1192 | IBM | 12 | 5 |
| 949 | MIT Media Lab | 12 | 5 |
| 944 | Stanford Digital Economy Lab | 12 | 5 |

---

## Changes

### [1309] National Institute of Standards and Technology — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | 4 URLs |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Federal government |
| influence_type | NULL | Regulator, Researcher/analyst, Implementer |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:**
- https://www.nist.gov/itl/ai-risk-management-framework
- https://www.nist.gov/news-events/news-updates/tag/2810121
- https://www.hklaw.com/en/insights/publications/2025/07/americas-ai-action-plan-whats-in-whats-out-whats-next
- https://federalnewsnetwork.com/artificial-intelligence/2026/01/lawmakers-boost-funding-for-nist-after-proposed-cuts/

**Confidence:** 5/5 — NIST's mission, AI RMF, CAISI rename, and budget figures are all confirmed from primary NIST sources and direct government/news coverage.

---

### [1192] IBM — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | 4 URLs |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Private/corporate |
| influence_type | NULL | Builder, Decision-maker, Organizer/advocate |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.ibm.com/policy/ai-precision-regulation/
- https://www.ibm.com/think/topics/ai-governance
- https://www.klover.ai/ibm-ai-strategy-lead-enterprise-ai/
- https://venturebeat.com/ai/ibm-unveils-policy-lab-advocates-precision-regulation-of-ai

**Confidence:** 5/5 — IBM's "precision regulation" stance is documented in their own Policy Lab white paper; watsonx revenue figures confirmed from earnings reporting.

---

### [949] MIT Media Lab — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | Interdisciplinary research lab | Updated (original in `notes_v1`) |
| notes_v1 | Interdisciplinary research lab | Interdisciplinary research lab |
| notes_sources | NULL | 4 URLs |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | Targeted | Targeted (unchanged) |
| belief_ai_risk | Mixed/nuanced | Serious |
| belief_evidence_source | Explicitly stated | Explicitly stated (unchanged) |
| belief_agi_timeline | 10-25 years | 10-25 years (unchanged) |
| funding_model | NULL | Academic/corporate membership |
| influence_type | Researcher/analyst, Advisor/strategist, Narrator | Researcher/analyst, Narrator, Advisor/strategist |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:**
- https://www.media.mit.edu/posts/introducing-aha/
- https://aha.media.mit.edu/
- https://www.media.mit.edu/posts/openai-mit-research-collaboration-affective-use-and-emotional-wellbeing-in-ChatGPT/
- https://www.media.mit.edu/posts/member-faq/

**Confidence:** 5/5 — AHA program launch, OpenAI collaboration, and corporate membership funding model all confirmed directly from Media Lab's own site. `belief_ai_risk` updated from Mixed/nuanced to Serious based on AHA program's explicit focus on risks to human agency, cognition, and social wellbeing.

---

### [944] Stanford Digital Economy Lab — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | Brynjolfsson, Pentland, Toloui; economics of AI research | Updated (original in `notes_v1`) |
| notes_v1 | Brynjolfsson, Pentland, Toloui; economics of AI research | Brynjolfsson, Pentland, Toloui; economics of AI research |
| notes_sources | NULL | 4 URLs |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | Targeted | Targeted (unchanged) |
| belief_ai_risk | Serious | Serious (unchanged) |
| belief_evidence_source | Inferred | Explicitly stated |
| belief_agi_timeline | 5-10 years | 5-10 years (unchanged) |
| funding_model | NULL | Academic/grants |
| influence_type | Researcher/analyst, Advisor/strategist, Connector/convener | Researcher/analyst, Advisor/strategist, Connector/convener (unchanged) |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:**
- https://digitaleconomy.stanford.edu/
- https://secure.businesswire.com/news/home/20251211080126/en/Stanford-Digital-Economy-Lab-Releases-The-Digitalist-Papers-Volume-2-The-Economics-of-Transformative-AI
- https://digitaleconomy.stanford.edu/news/ai-and-labor-markets-what-we-know-and-dont-know/
- https://digitaleconomy.stanford.edu/wp-content/uploads/2025/08/Canaries_BrynjolfssonChandarChen.pdf

**Confidence:** 5/5 — Brynjolfsson's directorship, Dec 2025 Digitalist Papers publication, and "Canaries in the Coal Mine" employment effects paper are all directly sourced. `belief_evidence_source` upgraded from Inferred to Explicitly stated based on published research and public statements. `funding_model` set to Academic/grants (part of Stanford University, supplemented by research grants).
