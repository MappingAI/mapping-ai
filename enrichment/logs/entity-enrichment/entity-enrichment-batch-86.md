# Entity Enrichment — Batch 86
*2026-04-11*
Mode: manual (claude-code) — Phase 3 close-out pass #1
Entities processed: 17 (12 expansions + 5 deletions)
Fields updated: 72 (12 × 6 fields)

---

## Summary

**Expansions (12 entities):** v1-era seed notes (30–49 chars) topped up to full phase3-manual descriptions (293–410 chars).

**Deletions (5 entities):** Test/placeholder records with no edges pointing to them.

**Also verified:** 4 evidence_vs_confidence flags from the 2026-04-11 audit (IDs 1537, 1669, 1690, 1748) are already resolved — all show `notes_confidence=4` with `belief_evidence_source='Explicitly stated'`, which is a consistent match. Audit ran against older values (conf=3).

---

## Expansions

| ID | Name | Prior notes (chars) | New notes (chars) | Confidence |
| -: | ---- | ------------------: | ----------------: | ---------: |
| 540 | Public AI | 0 (NULL, v2-insufficient) | 378 | 4 |
| 819 | Stanford CRFM | 40 | 349 | 5 |
| 907 | Center for Democracy & Technology | 47 | 384 | 5 |
| 913 | CISA | 48 | 410 | 5 |
| 945 | Stanford SIEPR | 47 | 340 | 4 |
| 946 | MIT Shaping the Future of Work | 48 | 340 | 5 |
| 953 | UW Tech Policy Lab | 47 | 373 | 4 |
| 955 | EconTAI | 49 | 293 | 4 |
| 957 | Windfall Trust | 46 | 324 | 3 |
| 959 | Plurality Institute | 43 | 359 | 4 |
| 960 | RadicalxChange | 32 | 349 | 5 |
| 961 | Taiwan Ministry of Digital Affairs | 27 | 358 | 5 |

All 12 received the full phase3-manual field set: `notes` (expanded), `notes_v1` (prior seed preserved), `notes_sources`, `notes_confidence`, `enrichment_version='phase3-manual'`, `qa_approved=TRUE`.

---

## Deletions

| ID | Name | Type | Notes | Edges |
| -: | ---- | ---- | ----- | ----: |
| 5 | Test Person | person | "This is a test submission" | 0 |
| 9 | ant | person | NULL | 0 |
| 122 | Test LLM Review Person | person | NULL | 0 |
| 123 | Test Person with Pending Organization | person | NULL | 0 |
| 446 | Test Organization for Pending Feature | organization | NULL | 0 |

All deletions verified edge-free before removal. No cascading cleanup needed.

---

## Post-cleanup DB state

| type | total | enriched (≥50 chars) | thin | phase3-manual |
| ---- | ----: | -------------------: | ---: | ------------: |
| organization | 790 | 790 | 0 | 293 |
| person | 710 | 710 | 0 | 373 |
| resource | 162 | 162 | 0 | 92 |
| **TOTAL** | **1662** | **1662** | **0** | **758** |

**Zero thin entities remain across all types.** Every entity in the database now has substantive notes (≥50 chars). This completes the content-coverage portion of Phase 3.

---

## Still outstanding (Phase 3 close-out)

- Resource dedup (~25 duplicates across ~8 clusters — Biden EO, Trump preemption EO, Gradual Disempowerment, etc.)
- Dead URL replacements (~10-15 genuine 404/timeout/DNS; excluding 403/429/999 crawler blocks)
- Category corrections (ASML, AMPTP, Radical AI, EliseAI, PIT-UN, etc.)
- Short-notes-high-confidence resources (8 flagged in audit — expand or lower conf)
- Sample audit of `no_beliefs_high_confidence` flags (105 — likely mostly false positives for resources)
