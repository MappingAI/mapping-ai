# Entity Enrichment — Batch 12
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 40

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1346 | Greg Brockman | 10 | 4 |
| 1334 | Mark Nitzberg | 10 | 4 |
| 1330 | Aaron Courville | 10 | 4 |
| 1321 | ServiceNow | 10 | 4 |

---

## Changes

### 1346 Greg Brockman — person / Executive

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Accelerate |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | 2-3 years |
| funding_model | NULL | Private/corporate |
| influence_type | NULL | Builder, Decision-maker |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Notes written:** "Co-founder and President of OpenAI. Took a sabbatical Aug–Nov 2024, then returned. In 2025 led OpenAI's Stargate infrastructure buildout and co-founded the $100M 'Leading the Future' super PAC opposing state-level AI regulation."

**Belief rationale:** Regulatory stance "Accelerate" inferred from his personal $100M+ investment in the "Leading the Future" PAC opposing state-level AI regulation. AI risk "Manageable" inferred — he acknowledges risks ("safe AGI to build") but acts to minimize regulatory friction. Timeline "2-3 years" inferred from OpenAI's public AGI-imminent messaging and his statements that "AGI is possible and will change everything."

**Sources:**
- https://fortune.com/2025/11/05/openai-greg-brockman-ai-infrastructure-data-center-master-builder/
- https://fortune.com/2025/08/26/openai-president-greg-brockman-andreessen-horowitz-super-pac-ai-pro-innovation/
- https://en.wikipedia.org/wiki/Greg_Brockman

**Confidence:** 4/5 — Strong public record; belief fields inferred from actions rather than explicit statements.

---

### 1334 Mark Nitzberg — person / Executive

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Nonprofit/grants, Academic |
| influence_type | NULL | Decision-maker, Connector/convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Notes written:** "Executive Director of the Center for Human-Compatible AI (CHAI) at UC Berkeley since 2016, and Interim Executive Director of IASEAI. Also head of strategic outreach for Berkeley AI Research (BAIR). Former CEO of The Blindsight Corporation (acquired by Amazon A9)."

**Belief rationale:** CHAI is Stuart Russell's lab focused on value alignment and human-compatible AI — squarely in the "serious risk, moderate/targeted regulation" camp. Regulatory stance "Moderate" inferred from CHAI's mission. Risk "Serious" inferred from institutional focus on alignment. No public AGI timeline statements found.

**Sources:**
- https://humancompatible.ai/people
- https://brie.berkeley.edu/people/mark-j-nitzberg
- https://aiforgood.itu.int/speaker/mark-nitzberg/

**Confidence:** 4/5 — Role and affiliations well documented; belief fields inferred from institutional context.

---

### 1330 Aaron Courville — person / Researcher

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Academic, Nonprofit/grants |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Notes written:** "Full Professor at Université de Montréal and founding core member of Mila. Co-authored the seminal Deep Learning textbook with Bengio and Goodfellow. Holds a CIFAR AI Chair. Incoming scientific director of IVADO as of 2025."

**Belief rationale:** Courville has explicitly stated optimism about AI ("I'm very optimistic about what AI can offer") while acknowledging ethical concerns — consistent with "Manageable" risk and "Targeted" (sector-specific, not sweeping) regulatory stance. Unlike colleague Bengio, he has not publicly called for moratoria. No AGI timeline statements found.

**Sources:**
- https://mila.quebec/en/directory/aaron-courville
- https://cifar.ca/bios/aaron-courville/
- https://nouvelles.umontreal.ca/en/article/2025/05/21/i-m-a-researcher.-this-is-what-i-do

**Confidence:** 4/5 — Career facts well sourced; regulatory stance inferred from public statements and contrast with more cautious Mila peers.

---

### 1321 ServiceNow — organization / Deployers & Platforms

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Private/corporate |
| influence_type | NULL | Implementer, Builder |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Notes written:** "Public enterprise software company (NYSE: NOW) specializing in workflow automation. Heavily invested in AI via 'Now Assist' and autonomous AI agents; targeting $1B AI ACV by 2026. Advocates responsible AI governance and compliance with EU AI Act and NIST AI RMF."

**Belief rationale:** ServiceNow has published detailed Responsible AI whitepapers, mapped their AI SDLC to EU AI Act and NIST AI RMF, and actively markets AI governance tooling to enterprise clients. This is "Moderate" — mandatory standards and transparency, not laissez-faire and not restrictive. Risk "Manageable" — they build guardrails and human-in-the-loop systems into their autonomous agents, treating risk as an engineering problem.

**Sources:**
- https://www.servicenow.com/workflow/it-transformation/whats-next-ai-2026.html
- https://www.servicenow.com/content/dam/servicenow-assets/public/en-us/doc-type/resource-center/white-paper/wp-sn-responsible-genai.pdf
- https://www.ciodive.com/news/servicenow-earnings-ai-governance-control-tower/804438/

**Confidence:** 4/5 — Regulatory stance and risk posture explicitly documented in published whitepapers and product strategy.
