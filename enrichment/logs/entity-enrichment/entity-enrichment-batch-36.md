# Entity Enrichment — Batch 36
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 6
Fields updated: 66

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1735 | Center for Data Science | 11 | 4 |
| 1736 | The Department of Linguistics | 11 | 3 |
| 1737 | Jacob Hilton | 11 | 4 |
| 1738 | Kyle Scott | 11 | 4 |
| 1739 | Harshita Khera | 11 | 2 |
| 1740 | Ben Hoskin | 11 | 3 |

---

## Changes

### [1735] Center for Data Science — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (NYU CDS, est. 2013, Center for Responsible AI, AI@NYU) |
| notes_sources | NULL | cds.nyu.edu, airesponsibly.net |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | University |
| influence_type | NULL | Research |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | TRUE | TRUE |

### [1736] The Department of Linguistics — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (NYU Linguistics, Sam Bowman joint appt, computational linguistics/NLP ties) |
| notes_sources | NULL | as.nyu.edu, cds.nyu.edu |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Mixed/unclear |
| belief_ai_risk | NULL | Unknown |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | University |
| influence_type | NULL | Research |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | TRUE | TRUE |

### [1737] Jacob Hilton — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (ARC president, ex-OpenAI, InstructGPT co-lead, RLHF pioneer, whistleblower advocate) |
| notes_sources | NULL | alignment.org, jacobh.co.uk, aiimpacts.org |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | NULL |
| influence_type | NULL | Research |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

### [1738] Kyle Scott — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (METR Ops Lead, ARC Treasurer, ex-FHI/CEA/80K/BERI, EA ops veteran) |
| notes_sources | NULL | alignment.org, metr.org, linkedin.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Precautionary |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | NULL |
| influence_type | NULL | Operations |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

### [1739] Harshita Khera — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (ARC Secretary, limited public profile) |
| notes_sources | NULL | alignment.org |
| notes_confidence | NULL | 2 |
| belief_regulatory_stance | NULL | Mixed/unclear |
| belief_ai_risk | NULL | Unknown |
| belief_evidence_source | NULL | Unknown |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | NULL |
| influence_type | NULL | Operations |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

### [1740] Ben Hoskin — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (ARC board member, CFA, co-founder VARA ~$1B AUM, impact finance) |
| notes_sources | NULL | alignment.org, linkedin.com, sec.gov |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Mixed/unclear |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | NULL |
| influence_type | NULL | Funding |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

---

## Notes

- All 6 entities are connected to ARC (Alignment Research Center) or NYU Alignment Research Group via edges.
- 1735 and 1736 are NYU academic units — CDS and Linguistics — both linked to ARG.
- 1737-1740 are all ARC-affiliated: Hilton (President), Scott (Treasurer), Khera (Secretary), Hoskin (Board Member).
- Hilton is the best-documented: explicitly stated risk views (~5-10% x-risk by 2100), ex-OpenAI, whistleblower advocacy.
- Kyle Scott is now at METR but retains ARC Treasurer role. Category "Organizer" is accurate given ops career.
- Harshita Khera has very limited public presence — confidence 2.
- Ben Hoskin bridges AI safety governance and impact-oriented finance via VARA.
- No edges modified.
