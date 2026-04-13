# Backfill Employer/Founder/Member Edges — 2026-04-12
*Phase 4A — structural edge backfill from person notes*

## TL;DR

Added **48 new edges** by parsing person notes for explicit employment/founder/membership patterns and matching mentioned org names against existing entities. Edge count: **2,221 → 2,269**. Cleared **22 of 271** `influence_without_edge` audit flags. All edges tagged `created_by='phase4-backfill'` and confidence=3 for easy filtering/reversal.

## Approach

The 2026-04-12 audit flagged 271 entities with `influence_without_edge` — they have an influence_type like "Researcher/analyst" but no edge of the expected type. Inspection showed most of these entities' notes already describe the missing relationship in prose ("Professor at UC Berkeley", "Co-founder of Anthropic", etc.). Rather than research each entity manually, a regex-based script extracts relationships from notes and matches org names against the entity table.

### Rules applied

| Rule | Pattern | → Edge type | Matches |
|------|---------|-------------|--------:|
| R1 | `(Co-)?[Ff]ounder (of|and ...) ORG` | `founder` | 8 |
| R2 | `(Co-)?[Ff]ounded ORG` | `founder` | 9 |
| R3 | `(Full/Associate/Assistant)? Professor at ORG` | `employer` | 11 |
| R4 | `(CEO/CTO/Chief X Officer) (of/at) ORG` | `employer` | 5 |
| R5 | Chief X Officer (comma variant) | `employer` | 0 |
| R6 | `(Executive/Founding/Research) Director (of/at) ORG` | `employer` | 7 |
| R7 | `(Senior/Research/Policy) Fellow at ORG` | `member` | 6 |
| R8 | `Board Member of ORG` | `member` | 2 |

### Safety guards

- Skip if the match is preceded within 50 chars by `[Ff]ormer(ly)?`, `[Pp]reviously`, `ex-`, `until \d{4}`, `(former)`, `fmr.` — avoids past roles.
- Skip if a `from YYYY to YYYY` range follows within 50 chars — catches "Director of DARPA from 2012 to 2017" style past roles.
- Skip if notes contain `DUPLICATE` or `see entity N` markers — avoids dup-stub entities (e.g. entity 1354 Rob Long → dup of 1353 Robert Long).
- Skip if any `employer/member/founder/advisor` edge already exists between the pair (avoids duplicates and blocks accidental double-counting).
- Do NOT shrink an extracted org name to a prefix unless the trailing word is in a SAFE_DROP list (`AI`, `Lab`, `Institute`) — guards against mis-matching "Google X" as "Google" (caught Sebastian Thrun→Google, correctly rejected).

Edges written with:
- `is_primary = FALSE` (conservative — we don't claim the new edge is their main affiliation)
- `confidence = 3`
- `evidence = "Backfilled from notes: ...<snippet>"`
- `created_by = "phase4-backfill"`

## Results

**48 edges inserted:**

| Edge type | Count |
| --------- | ----: |
| `employer` | 23 |
| `founder`  | 17 |
| `member`   |  8 |

**Total edges:** 2,221 → **2,269** (+48)
**`influence_without_edge` flags:** 271 → **249** (−22)

The flag delta (22) is smaller than the edge count (48) because:
- Many persons had multiple influence types flagged; one new edge may only clear one of several flags on that person
- Some persons received `founder` edges but their flag required `employer/member` (Builder/Founder cleared, Researcher/analyst still pending)

Both outcomes are expected — the 48 new edges are real structural additions regardless of audit flag mechanics.

## Sample edges added

### Founder (17)

| Person | → Org | Role |
|--------|-------|------|
| Toby Ord (841) | Giving What We Can | Founder |
| Joe Lonsdale (857) | Palantir | Co-founder |
| Ajay Agrawal (965) | Creative Destruction Lab | Founder |
| Kevin Kelly (1015) | Wired | Co-founder |
| Ben Mann (1349) | Anthropic | Co-founder |
| Kathleen Finlinson (1355) | Eleos AI | Founder |
| Brian Long (1460) | Adaptive Security | Co-founder |
| Nate Thomas (1508) | Constellation | Founder |
| Jonas Vollmer (1592) | Center on Long-Term Risk | Founder |
| Jesse Clifton (1594) | Center on Long-Term Risk | Co-founder |
| Esben Kran (1635) | Apart Research | Founder |
| Andrea Miotti (1660) | ControlAI | Founder |
| Peter Wildeford (1683) | Rethink Priorities | Founder |
| Miles Tidmarsh (1728) | Modeling Cooperation | Founder |
| Sam Bowman (1733) | NYU Alignment Research Group | Founder |
| Patrick Collison (1749) | Stripe | Co-founder |
| Jamie Bernardi (1754) | BlueDot Impact | Co-founder |

### Employer (23) — selection

| Person | → Org | Role |
|--------|-------|------|
| Marc Benioff (1123) | Salesforce | CEO |
| Greg Corrado (1224) | Google | Research Director |
| Trevor Darrell (1311) | UC Berkeley | Professor of EECS |
| Mark Chen (1344) | OpenAI | Chief Research Officer |
| Robert Long (1353) | Eleos AI | Executive Director |
| Mustafa Suleyman (1365) | Microsoft | CEO |
| John M. Jumper (1366) | Google DeepMind | Director |
| Justin Johnson (1385) | University of Michigan | Assistant Professor of CS |
| Claire Cardie (1449) | Cornell University | Professor of Engineering |
| Jeff Hancock (1450) | Stanford University | Professor of Communication |
| Matt Salganik (1452) | Princeton University | Professor of Sociology |
| Zico Kolter (1500) | Carnegie Mellon University | Professor of CS, Head of ML Dept |
| Vincent Conitzer (1674) | Carnegie Mellon University | Professor of CS |
| John Bargh (1711) | Yale University | Professor of Psychology |
| Stuart J. Russell (1742) | UC Berkeley | Professor of Computer Science |
| Pieter Abbeel (1743) | UC Berkeley | Professor |
| Anca Dragan (1744) | Google DeepMind | Director of AI Safety and Alignment |
| Patrick Collison (1749) | Stripe | CEO |
| ... | ... | ... |

### Member (8) — fellows and board seats

| Person | → Org | Role |
|--------|-------|------|
| Molly Kinder (1373) | Brookings Institution | Senior Fellow |
| Romeo Dean (1396) | Constellation | Fellow |
| Nicholas Emery-Xu (1561) | Forethought | Fellow |
| Fazl Barez (1615) | RAND Corporation | Policy Fellow |
| William MacAskill (1658) | Forethought | Research Fellow |
| Adam Gleave (1663) | Safe AI Forum | Board member |
| Nora Ammann (1681) | Foresight Institute | Fellow |
| Peter Wildeford (1683) | Metaculus | Board member |

## False positives caught during tuning

Three passes refined the filter before going live:

| Case | Issue | Fix |
|------|-------|-----|
| Sebastian Thrun → Google (founder) | Notes say "Founded Google X" — he founded Google X (Alphabet sub-project), not Google itself. Regex over-shrinking. | Disabled prefix-shrinking except for safe suffixes (AI, Lab, Institute). |
| Rob Long (1354) → Eleos AI | 1354 is a DUPLICATE entity of 1353. Notes explicitly say "DUPLICATE of entity 1353 ... see entity 1353 for full enrichment." | Added `DUPLICATE`/`see entity N` marker → skip notes. |
| Robert Trager → UCLA, Jerry McNerney → Stanford HAI | Notes say "Former Professor at UCLA" / "Previously a Fellow at Stanford HAI" | Added PAST_MARKERS check in 50-char lookback. |
| Arati Prabhakar → DARPA (Director) | Past directorship "from 2012 to 2017" | Added YEAR_RANGE lookahead filter. |

## Why the flag delta is modest

Of the 271 flagged entities, most flags couldn't be cleared by this script because:

1. **Most flagged entities are organizations (120 of 271).** This script only adds edges for persons. Orgs flagged as "Researcher/analyst" need researchers linked to them — typically handled via the person-side backfill (some of these 48 new person→org edges clear org-side flags too, but org-side flags are mostly about sub-labs without named staff).
2. **Many flagged persons have their affiliation described in a non-pattern-matching way.** E.g., "works at X as Y" where Y is domain-specific jargon, or where the org isn't yet in the DB.
3. **Audit flag persistence when multiple influence types.** A person with influence types "Researcher/analyst, Builder, Advisor/strategist" needs edges matching each. A single new edge may clear only one.

## Phase 4 close-out status

- [x] Phase 4A.1: Backfill employer/founder/member edges from notes (this log)
- [ ] Phase 4A.2: Remaining 249 `influence_without_edge` — will need per-entity review or dedicated org-side backfill (researchers at Stanford CRFM etc.)
- [ ] Phase 4B: Edge directionality fixes (auto-fixable 8 reversed advisor edges via fix_edge_directions.py)
- [ ] Phase 4C: Source URLs on edges — the biggest data-quality gap
- [ ] Phase 4D: Affiliated reclassification tail (230 remaining)
- [ ] Phase 4E: Small close-outs (belief backfill for 6 policymakers, 16 citation artifacts)

## Script

`scripts/backfill_employer_edges.py` — supports `--dry-run` / `--live` / `--flagged-only` / `--ids` / `--rule` / `--output`. Reusable for future enrichment passes whenever new entities are added.
