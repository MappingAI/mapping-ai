# Entity Enrichment — Batch 08
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 44

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1422 | Josh Hawley | 11 | 4 |
| 1583 | Good Ventures | 11 | 5 |
| 1300 | Stanford Law School | 11 | 4 |
| 954 | Creative Destruction Lab | 11 | 4 |

---

## Changes

### 1422 Josh Hawley — person / Policymaker

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Republican U.S. Senator (MO). Introduced the Decoupling America's AI Capabilities from China Act (2025) and the bipartisan GUARD Act banning AI chatbots for minors (2026). Opposes preempting state AI laws and advocates targeted consumer and child-safety regulation. |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Federal government |
| influence_type | NULL | Decision-maker, Organizer/advocate |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.hawley.senate.gov/hawley-introduces-legislation-to-decouple-american-ai-development-from-communist-china/
- https://www.axios.com/2026/03/25/hawley-ai-chatbots-congress-guard-act
- https://www.congress.gov/bill/119th-congress/senate-bill/321

**Confidence:** 4/5 — Multiple primary sources (Congress.gov, senator's own website, Axios). Regulatory stance "Targeted" well-evidenced by his specific child-safety and China-decoupling bills alongside opposition to blanket state preemption. Risk belief "Serious" inferred from GUARD Act framing; no explicit existential-risk statement found.

---

### 1583 Good Ventures — organization / VC/Capital/Philanthropy

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Philanthropic foundation co-founded by Dustin Moskovitz and Cari Tuna; primary funder of Open Philanthropy (rebranded Coefficient Giving, Nov 2025). Accounts for >50% of philanthropic AI safety funding globally; has distributed $5B+ in grants including $5.5M to launch CHAI at UC Berkeley. |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Existential |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Nonprofit/grants |
| influence_type | NULL | Funder/investor |
| other_categories | NULL | AI Safety/Alignment |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://en.wikipedia.org/wiki/Good_Ventures
- https://www.goodventures.org/our-portfolio/grants/london-initiative-for-safe-ai-general-support-2025/
- https://coefficientgiving.org/research/ai-safety-and-security-need-more-funders/

**Confidence:** 5/5 — Well-documented philanthropic entity with clear public record. AI risk stance "Existential" inferred from sustained large-scale funding of AI safety/existential risk organizations (CHAI, Open Philanthropy's navigating-transformative-AI portfolio). Regulatory stance "Light-touch" inferred from EA/longtermist philosophy — concern is catastrophic risk from advanced AI, not near-term regulation of current systems.

---

### 1300 Stanford Law School — organization / Academic

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Home of CodeX (Stanford Center for Legal Informatics) and the Stanford Law AI Initiative co-directed by Prof. Nathaniel Persily. Hosts AI governance courses, the Law Policy Lab practicum on federal AI use in criminal justice, and applied research projects such as ComplianceTwin (2025–2026). |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Academic |
| influence_type | NULL | Researcher/analyst, Advisor/strategist |
| other_categories | NULL | Think Tank/Policy Org |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://law.stanford.edu/codex-the-stanford-center-for-legal-informatics/
- https://law.stanford.edu/2026/04/05/turning-ai-governance-into-operational-infrastructure/
- https://taxprofblog.aals.org/2026/03/03/stanford-law-hires-ed-for-ai-initiative/

**Confidence:** 4/5 — Active public web presence with current 2025–2026 program details. Regulatory stance "Moderate" and risk "Serious" inferred from governance-focused research portfolio (compliance frameworks, criminal-justice AI oversight, democracy impact work) — not anti-AI but clearly in the mandatory-safeguards camp.

---

### 954 Creative Destruction Lab — organization / Academic

| Field | Before | After |
| ----- | ------ | ----- |
| notes | Toronto; Agrawal, Gans; AI startup program | Updated (original in `notes_v1`) |
| notes_v1 | Toronto; Agrawal, Gans; AI startup program | Toronto; Agrawal, Gans; AI startup program |
| notes_sources | NULL | 3 URLs |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | Light-touch | Light-touch (unchanged) |
| belief_ai_risk | Unknown | Unknown (unchanged) |
| belief_evidence_source | Inferred | Inferred (unchanged) |
| belief_agi_timeline | Unknown | Unknown (unchanged) |
| funding_model | NULL | Nonprofit/grants, Academic |
| influence_type | Connector/convener, Builder, Advisor/strategist | Connector/convener, Builder, Advisor/strategist (unchanged) |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE (unchanged) |

**Sources:**
- https://creativedestructionlab.com/about/
- https://www.utoronto.ca/news/u-t-founded-creative-destruction-lab-receives-25-million-canadian-government
- https://creativedestructionlab.com/locations/toronto/

**Confidence:** 4/5 — Well-documented accelerator with clear public record. Notes substantially expanded with founding year, full founder names, global scope, and equity impact figure. Funding model "Nonprofit/grants, Academic" reflects CDL's no-fee/no-equity structure and University of Toronto affiliation plus Canadian government grant.
