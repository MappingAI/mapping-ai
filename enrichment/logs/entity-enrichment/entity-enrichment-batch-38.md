# Entity Enrichment — Batch 38
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 6
Fields updated: 62

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1747 | Sid Black | 10 | 3 |
| 1748 | Gabriel Alfour | 11 | 3 |
| 1749 | Patrick Collison | 10 | 4 |
| 1750 | John Collison | 10 | 4 |
| 1751 | Arthur Breitman | 10 | 3 |
| 1754 | Jamie Bernardi | 11 | 4 |

---

## Changes

### [1747] Sid Black — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| belief_regulatory_stance | NULL | Mixed/unclear |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst, Builder |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — Co-founder of EleutherAI and Conjecture. AI risk belief inferred from founding an alignment-focused startup; no direct public statements found on regulatory stance.

---

### [1748] Gabriel Alfour — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| belief_regulatory_stance | NULL | Precautionary |
| belief_ai_risk | NULL | Existential |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst, Builder |
| other_categories | NULL | ["Executive"] |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — Co-founder/CTO of Conjecture, advisor to ControlAI. Has explicitly discussed AI existential risk on multiple podcasts. Previously CEO of Marigold (Tezos infrastructure).

---

### [1749] Patrick Collison — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Funder/investor, Decision-maker |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Well-known public figure. CEO of Stripe. Regulatory stance inferred from anti-overregulation advocacy (European tech open letters). AI risk stance inferred from pushing back on doom narratives.

---

### [1750] John Collison — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Funder/investor, Decision-maker |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Well-known public figure. President of Stripe. Shares brother's pro-innovation stance. AI views inferred from public interviews on AI agent commerce.

---

### [1751] Arthur Breitman — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| belief_regulatory_stance | NULL | Mixed/unclear |
| belief_ai_risk | NULL | Unknown |
| belief_evidence_source | NULL | Unknown |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Funder/investor |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — Co-founder of Tezos. AI involvement primarily as investor in Conjecture. Has AI/robotics background (Google/Waymo) but limited public statements on AI policy or risk.

---

### [1754] Jamie Bernardi — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated (original in `notes_v1`) |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Organizer/advocate, Researcher/analyst |
| other_categories | NULL | ["Researcher"] |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Co-founder of BlueDot Impact (AI Safety Fundamentals courses). Independent AI policy researcher at IAPS, GovAI, MIT AI Risk. Advocates societal adaptation over development restrictions; explicitly stated views in published research.

---

## Notes

- All 6 entities are connected to Conjecture (AI alignment startup): Sid Black and Gabriel Alfour as co-founders, Patrick Collison, John Collison, and Arthur Breitman as funders, and Jamie Bernardi via BlueDot Impact collaboration.
- The Tezos connection runs through both Arthur Breitman (Tezos co-founder, Conjecture investor) and Gabriel Alfour (former CEO of Marigold, a Tezos infrastructure firm, now Conjecture CTO).
- Patrick and John Collison are well-documented public figures; beliefs are inferred from public statements but not explicitly about AI risk per se.
- Arthur Breitman has the least public information on AI policy views; confidence is lower.
- No edges were modified.
