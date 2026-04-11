# Entity Enrichment — Batch 43
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 6
Fields updated: 62

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1779 | Megan Shahi | 10 | 4 |
| 1780 | Adam Conner | 10 | 4 |
| 1062 | Civic Signals | 11 | 3 |
| 1120 | Billy Perrigo | 10 | 4 |
| 1123 | Marc Benioff | 10 | 4 |
| 1131 | DAF-MIT AI Accelerator | 11 | 4 |

Mixed batch: two CAP tech policy staffers, a civic tech org, a journalist, a tech CEO, and a defense-academic AI partnership.

---

## Changes

### [1779] Megan Shahi — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | americanprogress.org, siegelendowment.org, mccourt.georgetown.edu |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Advisor/strategist, Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Director of Technology Policy at CAP. Extensive background: Meta, Instagram, X (platform policy), U.S. Treasury, White House DPC. Siegel Research Fellow. Georgetown TPP visiting fellow (spring 2026). Stance inferred from CAP's progressive regulatory platform and her work on NIST AI risk frameworks.

---

### [1780] Adam Conner — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | americanprogress.org, techpolicy.press, theunpopulist.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Advisor/strategist, Narrator |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — VP of Technology Policy at CAP. Former Facebook Privacy & Public Policy (7 years, first D.C. employee). Has explicitly argued against federal preemption of state AI laws, criticized Trump admin rollback of AI safety guardrails, and warned about AI-enabled disinformation. Well-documented public positions.

---

### [1062] Civic Signals — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | mediaengagement.org, publicinfrastructure.org, newpublic.org, newpublic.substack.com |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Philanthropic |
| influence_type | NULL | Researcher/analyst, Organizer/advocate |
| enrichment_version | v2-insufficient | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 3/5 — Co-founded by Eli Pariser and Talia Stroud. Originally a project of National Conference on Citizenship + Center for Media Engagement. Rebranded as New_Public in 2021. Developed 14-signal framework for healthy digital public spaces. Beliefs inferred from mission (digital public infrastructure advocacy). Jennifer Pahlka affiliated via existing edge.

---

### [1120] Billy Perrigo — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | time.com, billyperrigo.com, orwellfoundation.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Narrator |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — TIME correspondent (London), leading AI/tech investigative reporter. Broke OpenAI Kenyan workers story; reported OpenAI lobbying to weaken EU AI Act. Orwell Prize finalist. Stance inferred from consistent reporting focus on accountability, labor exploitation, and corporate power — as a journalist, he doesn't advocate positions directly but his investigative focus signals concern about AI harms.

---

### [1123] Marc Benioff — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | cnbc.com, fortune.com, salesforce.com, qz.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Decision-maker, Narrator |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — CEO of Salesforce, owner of TIME. Explicitly called for AI regulation at Davos 2026, called AI models "suicide coaches," demanded Section 230 reform. "Moderate" rather than "Targeted" because he frames it broadly as values vs. growth and wants systemic accountability, not just sector-specific rules. Simultaneously deploying enterprise AI (Agentforce).

---

### [1131] DAF-MIT AI Accelerator — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | aia.mit.edu, aiaccelerator.af.mil, af.mil |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Mixed/unclear |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Government |
| influence_type | NULL | Builder, Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Joint DAF-MIT partnership since 2019, renewed 2024 for five more years. 20+ projects, 150+ researchers. Focus on rapid prototyping and ethical AI for defense. "Mixed/unclear" stance because as a government-academic hybrid, they emphasize both responsible/ethical AI and operational deployment speed. "Manageable" risk because their framing centers on practical risk mitigation rather than existential concern.

---

## Notes

- No edges were created, modified, or deleted.
- Existing edges confirmed: Shahi → CAP (employer), Conner → CAP (employer), Perrigo → TIME (employer), Benioff → TIME (affiliated, as owner), MIT → DAF-MIT AI Accelerator (partner), Jennifer Pahlka → Civic Signals (employer).
- Civic Signals was already qa_approved=TRUE with enrichment_version='v2-insufficient'; updated with substantive content.
- Billy Perrigo's regulatory stance is "Targeted" — inferred from investigative focus on accountability and labor rights, not direct advocacy. As a journalist, this is necessarily inferential.
