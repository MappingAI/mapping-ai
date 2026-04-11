# Entity Enrichment — Batch 13
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 44 (11 per entity)

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1314 | University of Utah | 11 | 4 |
| 1302 | Dick Durbin | 11 | 5 |
| 1295 | Office of Management and Budget | 11 | 5 |
| 1285 | University of Pennsylvania | 11 | 4 |

---

## Changes

### 1314 University of Utah — organization (Academic)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "University of Utah hosts the One-U Responsible AI Initiative, a $100M transdisciplinary program led by the Scientific Computing and Imaging (SCI) Institute. A $50M AI supercomputer partnership with NVIDIA and HPE is slated to come online in summer 2026. Research focuses on healthcare, societal wellness, and public services." |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | ["https://rai.utah.edu/about/", "https://attheu.utah.edu/...", "https://utahnewsdispatch.com/..."] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Academic/grants/philanthropy |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://rai.utah.edu/about/
- https://attheu.utah.edu/facultystaff/responsible-ai-initiative-seeks-to-solve-societal-problems/
- https://utahnewsdispatch.com/2026/04/07/university-of-utahs-ai-supercomputer-set-to-come-online-this-summer/

**Confidence:** 4/5 — Well-documented $100M initiative with clear public sources. Belief fields inferred from initiative framing (responsible AI, societal focus) rather than explicit policy statements.

---

### 1302 Dick Durbin — person (Policymaker)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Democratic Senator from Illinois (1997–2027) and former Senate Judiciary Committee chair. Co-introduced the bipartisan AI LEAD Act to enable products-liability suits against AI developers, and the TEST AI Act to strengthen federal AI testing capacity. Consistently advocated for mandatory AI oversight." |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | ["https://www.durbin.senate.gov/.../durbin-hawley-introduce-bill-allowing-victims-to-sue-ai-companies", "https://www.durbin.senate.gov/.../durbin-lujan-introduce-bipartisan-legislation-to-improve-ai-testing..."] |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Federal government |
| influence_type | NULL | Decision-maker |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.durbin.senate.gov/newsroom/press-releases/durbin-hawley-introduce-bill-allowing-victims-to-sue-ai-companies
- https://www.durbin.senate.gov/newsroom/press-releases/durbin-lujan-introduce-bipartisan-legislation-to-improve-ai-testing-safeguarding-americans-against-risks

**Confidence:** 5/5 — Primary sources from Senator's official website; legislation text and press releases are directly attributable. Retiring end of term 2027 per updated sources (not January 2025 as prompt suggested).

---

### 1295 Office of Management and Budget — organization (Government/Agency)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Executive Office of the President body that sets federal AI policy for agencies. Biden-era M-24-10 was rescinded and replaced by M-25-21 (April 2025), which mandates Chief AI Officers, AI governance boards, and risk management for high-impact AI while emphasizing innovation over restriction." |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | ["https://www.whitehouse.gov/wp-content/uploads/2025/02/M-25-21-...", "https://www.mintz.com/...omb-issues-new-guidance...", "https://digitalgovernmenthub.org/..."] |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Federal government |
| influence_type | NULL | Decision-maker, Implementer |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.whitehouse.gov/wp-content/uploads/2025/02/M-25-21-Accelerating-Federal-Use-of-AI-through-Innovation-Governance-and-Public-Trust.pdf
- https://www.mintz.com/insights-center/viewpoints/54731/2025-04-11-omb-issues-new-guidance-federal-governments-use-ai-and
- https://digitalgovernmenthub.org/examples/omb-m-25-21-accelerating-federal-use-of-ai-through-innovation-governance-and-public-trust/

**Confidence:** 5/5 — M-25-21 is a primary source document. Regulatory stance coded as Light-touch to reflect Trump-era shift: removed prior risk tiers, emphasized removing bureaucratic restrictions, though some governance structure (Chief AI Officers, boards) remains.

---

### 1285 University of Pennsylvania — organization (Academic)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Ivy League research university with major AI research infrastructure. The ASSET Center (Penn Engineering) focuses on AI safety, explainability, and trustworthiness, with NSF funding. The Warren Center for Network and Data Sciences drives interdisciplinary data science research. Penn AI was launched in 2025 to coordinate responsible AI across the university." |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | ["https://asset.seas.upenn.edu/", "https://warrencenter.upenn.edu/", "https://research.upenn.edu/research-at-penn/centers-institutes/penn-ai/"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Academic/grants/federal |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://asset.seas.upenn.edu/
- https://warrencenter.upenn.edu/
- https://research.upenn.edu/research-at-penn/centers-institutes/penn-ai/

**Confidence:** 4/5 — Multiple official Penn sources. Belief fields inferred from safety-focused research framing (ASSET center's explainability/trustworthiness mission). No explicit public policy statements from the institution as a whole.
