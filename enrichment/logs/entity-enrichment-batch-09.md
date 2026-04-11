# Entity Enrichment — Batch 09
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 39

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 950 | Princeton CITP | 10 | 4 |
| 711 | Defending Our Values PAC | 9 | 4 |
| 712 | Jobs and Democracy PAC | 9 | 4 |
| 709 | Think Big | 9 | 4 |

---

## Changes

### 950 Princeton CITP — organization / Academic

| Field | Before | After |
| ----- | ------ | ----- |
| notes | "Center for Information Technology Policy; Narayanan AI Snake Oil" | Updated (original in `notes_v1`) |
| notes_v1 | "Center for Information Technology Policy; Narayanan AI Snake Oil" | Backed up (same value preserved) |
| notes_sources | NULL | 4 URLs added |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | Targeted | Targeted (unchanged) |
| belief_ai_risk | Mixed/nuanced | Mixed/nuanced (unchanged) |
| belief_evidence_source | Explicitly stated | Explicitly stated (unchanged) |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | University/academic (federal grants, philanthropic, institutional) |
| other_categories | NULL | Think Tank/Policy Org |
| influence_type | Researcher/analyst, Advisor/strategist, Narrator, Connector/convener | Researcher/analyst, Advisor/strategist, Narrator, Connector/convener (unchanged) |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:**
- https://citp.princeton.edu/
- https://citp.princeton.edu/programs/citp-tech-policy-clinic/princeton-university-ai-policy-precepts
- https://engineering.princeton.edu/news/2025/01/13/ai-snake-oil-conversation-princeton-ai-experts-arvind-narayanan-and-sayash-kapoor
- https://freedom-to-tinker.com/

**Confidence:** 4/5 — CITP is well-documented; AI Policy Precepts program and AI Snake Oil work are confirmed in primary sources. `belief_agi_timeline` set Unknown as CITP does not take an official institutional position on timelines.

---

### 711 Defending Our Values PAC — organization / Political Campaign/PAC

| Field | Before | After |
| ----- | ------ | ----- |
| notes | Updated (original in `notes_v1`) | Updated (original in `notes_v1`) |
| notes_v1 | NULL | Original notes backed up |
| notes_sources | NULL | 3 URLs added |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | Targeted | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | Inferred | Inferred (unchanged) |
| funding_model | Super PAC; Top donor: Public First Action, Inc. ($50,000)… | Political/PAC (funded through Public First Action; Anthropic primary donor) |
| influence_type | Electoral spending | Electoral spending, Organizer/advocate |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE |

**Stance note:** Changed `belief_regulatory_stance` from Targeted to Moderate — Public First Action explicitly calls for mandatory safety standards, transparency rules, and preserving state-level authority, which fits Moderate better than Targeted.

**Sources:**
- https://www.opensecrets.org/news/2026/03/anthropics-ai-safety-stance-clashes-with-pentagon-and-reshapes-spending-on-primaries/
- https://www.fec.gov/data/committee/C00928390/?tab=filings
- https://www.texastribune.org/2026/04/01/texas-congress-ai-super-pacs-artificial-intelligence-regulation-2026-midterms/

**Confidence:** 4/5 — FEC registration confirmed; Anthropic/Public First Action affiliation confirmed in multiple sources. Individual donor amounts in original funding_model were unreliable (FEC showed $50K raised vs. $277K spent), so updated to reflect the Anthropic/$20M Public First Action funding structure.

---

### 712 Jobs and Democracy PAC — organization / Political Campaign/PAC

| Field | Before | After |
| ----- | ------ | ----- |
| notes | Updated (original in `notes_v1`) | Updated (original in `notes_v1`) |
| notes_v1 | NULL | Original notes backed up |
| notes_sources | NULL | 4 URLs added |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | Targeted | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | Explicitly stated | Inferred |
| funding_model | Super PAC with major contributions from Alex Bores (~$468K)… | Political/PAC (funded through Public First Action; Anthropic primary donor) |
| influence_type | Electoral spending | Electoral spending, Organizer/advocate |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE |

**Stance note:** Changed `belief_regulatory_stance` from Targeted to Moderate for same reasoning as Defending Our Values PAC — both are arms of Public First Action. Changed `belief_evidence_source` from Explicitly stated to Inferred: the PAC itself doesn't publish policy statements; stance is inferred from Anthropic/Public First Action affiliation and candidate selection.

**Sources:**
- https://www.durhamdispatch.com/post/funded-by-anthropic-super-pac-begins-ad-campaign-to-support-rep-valerie-foushee
- https://www.fec.gov/data/committee/C00928374/?tab=filings
- https://elections.transformernews.ai/pacs/C00928374
- https://www.texastribune.org/2026/04/01/texas-congress-ai-super-pacs-artificial-intelligence-regulation-2026-midterms/

**Confidence:** 4/5 — Anthropic funding confirmed by multiple independent sources; spending figures confirmed by FEC/Transformer News.

---

### 709 Think Big — organization / Political Campaign/PAC

| Field | Before | After |
| ----- | ------ | ----- |
| notes | Updated (original in `notes_v1`) | Updated (original in `notes_v1`) |
| notes_v1 | (same as notes) | Original notes preserved |
| notes_sources | NULL | 4 URLs added |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | Light-touch | Light-touch (unchanged) |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | Explicitly stated | Inferred |
| funding_model | Super PAC funded by Leading the Future ($10M), Ron Conway ($500K), Joe Lonsdale ($250K)… | Political/PAC (sub-PAC of Leading the Future; funded by a16z/Brockman/Lonsdale/Conway) |
| influence_type | Electoral spending | Electoral spending, Organizer/advocate |
| enrichment_version | v1 | phase3-manual |
| qa_approved | TRUE | TRUE |

**Stance note:** Changed `belief_evidence_source` from Explicitly stated to Inferred — the PAC's stance (block state AI regulation, support national preemption) is drawn from Leading the Future's stated mission, not Think Big's own public statements. Added `belief_ai_risk` = Manageable: Leading the Future's rhetoric frames AI risks as manageable with industry self-governance, not serious societal threats.

**Sources:**
- https://www.notus.org/2026-election/ai-super-pacs-leading-the-future-public-first-alex-bores
- https://readsludge.com/2026/04/09/ai-super-pacs-are-unleashing-millions-to-tilt-primaries-in-their-favor/
- https://builtin.com/articles/super-pacs-ai-regulation-2026-midterms
- https://en.wikipedia.org/wiki/Leading_the_Future
