# Entity Enrichment — Batch 46
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 12
Fields updated: 128

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1160 | California Department of Technology | 11 | 4 |
| 1161 | California Department of Human Resources | 11 | 3 |
| 1164 | NYS Office of Information Technology Services | 11 | 4 |
| 1165 | Ohio Department of Job and Family Services | 11 | 4 |
| 1166 | Matt Damschroder | 10 | 3 |
| 1167 | Ron DeSantis | 10 | 4 |
| 1168 | Spencer Cox | 10 | 4 |
| 1169 | Trump administration | 10 | 5 |
| 1170 | LinkedIn | 11 | 4 |
| 1171 | Darden School of Business | 11 | 4 |
| 1172 | UVA Information Technology Services | 11 | 3 |
| 1173 | Jules White | 10 | 4 |

Mixed batch: four state government agencies (CA, NY, OH), three policymakers (two Republican governors + state agency director), the Trump administration, LinkedIn as an AI deployer, two UVA academic entities, and a Vanderbilt AI/prompt engineering professor.

---

## Changes

### [1160] California Department of Technology — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | gov.ca.gov, innovation.ca.gov, cset.georgetown.edu |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Government-funded |
| influence_type | NULL | Implementer, Decision-maker |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — California's central IT agency. Well-documented AI initiatives: launched Poppy GenAI assistant for state employees, 20+ departments testing. Leads implementation of Newsom's AI executive orders. Stance inferred from state's approach — proactive on targeted sector-specific AI regulation (18 AI laws in 2024, SB 53 in 2025) while promoting innovation.

---

### [1161] California Department of Human Resources — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | innovation.ca.gov, calhr.ca.gov, calcivilrights.ca.gov |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Government-funded |
| influence_type | NULL | Implementer |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — CalHR's AI role is primarily workforce training (GenAI Certificate with ODI) and employment classification (Chief Data/AI Officer positions). Regulatory stance inferred from California's broader approach. Lower confidence because CalHR itself doesn't set AI policy — it implements workforce aspects.

---

### [1164] NYS Office of Information Technology Services — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | its.ny.gov, osc.ny.gov, governor.ny.gov, digitalgovernmenthub.org |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Government-funded |
| influence_type | NULL | Implementer, Decision-maker |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Authored NY's official AI acceptable use policy (Jan 2024), requires NIST RMF risk assessments, human oversight for automated decisions. Appointed a Chief AI Officer. Rated Moderate (not just Targeted) because the policy mandates safety evals and transparency across all state agencies. Comptroller audit found implementation gaps.

---

### [1165] Ohio Department of Job and Family Services — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | govtech.com, spectrumnews1.com, ohiotechnews.com, innovateohio.gov |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Government-funded |
| influence_type | NULL | Implementer |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Award-winning AI deployer (2025 Merrill Baumgardner Award). Four concrete AI tools deployed in unemployment services. Stance rated Light-touch because Ohio's approach emphasizes rapid deployment for service improvement rather than regulation. Well-documented through award coverage.

---

### [1166] Matt Damschroder — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | ohiotechnews.com, spectrumnews1.com, impactohio.org, legistorm.com |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Decision-maker, Implementer |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — Director of ODJFS under DeWine. Led AI deployment that won national award. Advocates "responsible AI" focused on user experience. Stance inferred from deployment-first approach and Republican administration context. Limited direct public statements on AI policy beyond operational use.

---

### [1167] Ron DeSantis — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | flgov.com, foxbusiness.com, thehill.com, floridaphoenix.com, fulr.org |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Decision-maker |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Florida Governor with explicitly stated AI positions. Proposed AI Bill of Rights (data privacy, parental controls, consumer protections, likeness rights). Pushed back against Trump's Dec 2025 federal preemption EO. Targeted rather than Moderate because focus is on specific consumer/child/data protections, not broad mandatory safety evaluations.

---

### [1168] Spencer Cox — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | nextgov.com, sltrib.com, kuer.org, statescoop.com, deseret.com, time.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Decision-maker |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Utah Governor, nationally recognized for "pro-human AI" stance. Explicitly stated positions on AI risks to children, healthcare, deepfakes. $10M workforce readiness initiative. Created Office of AI Policy (2023). Rated Serious on risk (not just Manageable) because Cox frames AI as requiring active protection of human values and safety, going beyond the typical Republican light-touch approach.

---

### [1169] Trump administration — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | whitehouse.gov, caidp.org, sidley.com, dwt.com, paulhastings.com, time.com |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Accelerate |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Decision-maker |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 5/5 — Exhaustively documented. Revoked Biden AI EO on day 1. Three major AI executive orders. OSTP 90-point AI Action Plan explicitly frames AI as competitive advantage requiring deregulation. Dec 2025 EO actively seeks to preempt state AI regulation. Accelerate is the clear stance — the administration views regulation as an obstacle to American AI dominance.

---

### [1170] LinkedIn — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | business.linkedin.com, techcrunch.com, hrdive.com, cnbc.com, herohunt.ai |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Corporate (Microsoft subsidiary) |
| influence_type | NULL | Builder, Implementer |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Major AI deployer in hiring/workforce space. Well-documented products (Hiring Assistant, AI-Assisted Candidate Discovery). Sept 2024 ToS change allowing member data for GenAI training (default ON, opt-out) signals Light-touch stance. Regulatory views inferred from Microsoft parent and deployment-first approach.

---

### [1171] Darden School of Business — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | news.virginia.edu, darden.virginia.edu, prnewswire.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | University (private gift-funded institute) |
| influence_type | NULL | Researcher/analyst, Connector/convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Home to LaCross Institute for Ethical AI in Business ($62M, one of largest AI gifts to any business school). Institute name emphasizes "ethical" AI. Moderate stance inferred from academic context focused on responsible/ethical AI in business. Well-documented through UVA press coverage.

---

### [1172] UVA Information Technology Services — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | virginia.service-now.com, uvapolicy.virginia.edu |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | University |
| influence_type | NULL | Implementer |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — UVA's central IT org. Provides UVA Copilot (enterprise GenAI, secure environment, no data retention). Enforces data protection tiers, banned DeepSeek on university devices. Moderate stance from structured approval/data governance approach. Lower confidence because ITS is an operational unit, not a policy-setting entity.

---

### [1173] Jules White — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | coursera.org, isis.vanderbilt.edu, news.vanderbilt.edu, engineering.vanderbilt.edu |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Mixed/unclear |
| belief_ai_risk | NULL | Unknown |
| belief_evidence_source | NULL | Unknown |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst, Narrator |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Well-known Vanderbilt CS professor. Senior Advisor to Chancellor on GenAI. Created massively popular Coursera prompt engineering course (~470K enrollees). Director of two Vanderbilt AI centers. High confidence on factual details but Unknown on beliefs — White is primarily an educator/technologist with no clear public policy positions found.

---

## Edges

No edge changes. Existing edges verified:
- 1160 → State of California (parent_company)
- 1161 → State of California (parent_company, role=CalHR)
- 1164 → State of New York (parent_company)
- 1165 → State of Ohio (parent_company)
- 1166 → State of Ohio (employer, role=director of DJFS)
- 1167 ← Republican Party (critic, role=Governor)
- 1168 ← Republican Party (critic, role=Governor)
- 1169 ← Republican Party (critic)
- 1170 → Microsoft (parent_company)
- 1171 → University of Virginia (parent_company)
- 1172 → University of Virginia (parent_company)
- 1173 → Vanderbilt University (employer, role=Professor of Computer Science)
