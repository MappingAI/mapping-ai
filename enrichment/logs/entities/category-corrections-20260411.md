# Category Corrections — 2026-04-11
*Phase 3 close-out pass #4*

## TL;DR

Audited 16 category corrections that agents flagged across enrichment batches 30, 33, 34, 69–81. **13 were already applied in-batch** (agents acted on their own flags rather than just documenting). Only **2 corrections needed to be made** in this pass. One additional case (AMPTP) has no good fit in the current schema and was documented in `other_categories` pending a schema decision.

## Corrections applied this pass

| ID | Name | Before | After | Rationale |
|---:|------|--------|-------|-----------|
| 1725 | ASML | `VC/Capital/Philanthropy` | `Infrastructure & Compute` | Semiconductor equipment manufacturer (EUV lithography monopoly), not a financial entity. Redundant `other_categories='Infrastructure & Compute'` also cleared. |
| 1516 | PIT-UN (Public Interest Technology University Network) | `VC/Capital/Philanthropy` | `Academic` | University consortium convened by New America — its grantmaking role is secondary to its academic-network identity. |

## Documented but not reclassified

| ID | Name | Current | Issue | Action |
|---:|------|---------|-------|--------|
| 1528 | AMPTP (Alliance of Motion Picture and Television Producers) | `Labor/Civil Society` | Represents studio management in collective bargaining, not labor/workers | Added explanatory note to `other_categories`. No category in the current schema (per `canon.md`) fits a trade/industry association. |

**Schema follow-up:** consider adding a `Trade Association/Industry` category for orgs like AMPTP.

## Corrections that were already applied (13)

Agents in each batch acted on their flags at enrichment time. Verified in DB:

| ID | Name | Correction |
|---:|------|------------|
| 1542 | Radical AI | `AI Safety/Alignment` → `Deployers & Platforms` (batch 71) |
| 1720 | EliseAI | (some) → `Deployers & Platforms` (batch 33 flag) |
| 1565 | Clark Barrett | `Researcher` → `Academic` (batch 73) |
| 1585 | Jaime Sevilla | `Executive` → `Researcher` (batch 75) |
| 1586 | Tamay Besiroglu | `Executive` → `Researcher` (batch 75) |
| 1587 | Pablo Villalobos | `Executive` → `Researcher` (batch 75) |
| 1593 | Ruairi Donnelly | `Executive` → `Investor` (batch 75) |
| 1598 | Thore Graepel | `Organizer` → `Researcher` (batch 75) |
| 1599 | Gillian Hadfield | `Organizer` → `Academic` (batch 75) |
| 1635 | Esben Kran | `Executive` → `Researcher` (batch 78) |
| 1636 | Jonathan Claybrough | `Executive` → `Organizer` (batch 78) |
| 1674 | Vincent Conitzer | `Researcher` → `Academic` (batch 81) |
| 1697 | Mark D Gray | `Executive` → `Policymaker` (batch 30) |

## Phase 3 close-out status

- [x] Pass #1: Test deletions (5) + thin v1 expansions (12) — batch 86
- [x] Pass #2: URL cleanup — 2 real fixes, 35 false positives documented
- [x] Pass #3: Resource dedup — 11 merges, 0 orphans
- [x] Pass #4: Category corrections — 2 applied + 1 documented (this log)
- [ ] Pass #5: short_notes_high_confidence (8 flagged) + sample no_beliefs_high_confidence
