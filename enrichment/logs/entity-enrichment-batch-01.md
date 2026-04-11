# Entity Enrichment — Batch 01
*2026-04-11*
Mode: manual (claude-code)
Entities processed: 3
Fields updated: 22

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 452 | Stanford HAI | notes, other_categories, influence_type, notes_sources, notes_confidence, qa_approved | 4 |
| 909 | Federal Trade Commission | notes, funding_model, belief_regulatory_stance, belief_ai_risk, belief_evidence_source, notes_sources, notes_confidence, qa_approved | 4 |
| 533 | UK AI Security Institute | notes, belief_regulatory_stance, belief_evidence_source, notes_sources, notes_confidence, qa_approved | 4 |

---

## Changes

### [452] Stanford HAI — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | Human-Centered AI Institute, publishes annual AI Index | Updated (original in `notes_v1`) |
| other_categories | NULL | Think Tank/Policy Org |
| influence_type | Researcher/analyst | Researcher/analyst,Policy advocate |
| notes_sources | NULL | ["https://hai.stanford.edu/about", "https://hai.stanford.edu/ai-index"] |
| notes_confidence | NULL | 4 |
| qa_approved | NULL | true |

**Edge fix:** Deleted edge 823 (Stanford HAI → Stanford University `parent_company`) — backwards; correct direction already exists in edge 293.

**Sources:**
- https://hai.stanford.edu/about
- https://hai.stanford.edu/ai-index

**Confidence:** 4/5 — Facts verified from official HAI site. Policy stance inferred from published positions and institute mission.

---

### [909] Federal Trade Commission — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | FTC - AI enforcement and consumer protection | Updated (original in `notes_v1`) |
| funding_model | NULL | Federal government |
| belief_regulatory_stance | Mixed/unclear | Targeted |
| belief_ai_risk | Unknown | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| notes_confidence | NULL | 4 |
| qa_approved | NULL | true |

**Sources:**
- https://www.ftc.gov/industry/technology/artificial-intelligence
- https://insideaipolicy.com/ai-daily-news/ftc-chair-ferguson-dismisses-need-rulemaking-ai-space

**Confidence:** 4/5 — Notes verified from FTC official site and reporting. Regulatory stance and risk beliefs derived from Chair Ferguson's public statements and March 2026 Policy Statement.

---

### [533] UK AI Security Institute — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | From AISafety.com map. UK government organization... (193 chars) | Updated (original in `notes_v1`) |
| belief_regulatory_stance | Restrictive | Precautionary |
| belief_evidence_source | Inferred | Explicitly stated |
| notes_confidence | NULL | 4 |
| qa_approved | NULL | true |

**Sources:**
- https://www.aisi.gov.uk/about
- https://www.aisi.gov.uk/blog/our-2025-year-in-review

**Confidence:** 4/5 — Facts verified from official AISI site. Renamed from AI Safety Institute in Feb 2025; belief fields updated to reflect explicitly stated mission on catastrophic risks.

---

