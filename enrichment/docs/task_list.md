# Task List

Execution tracker for the data enrichment project. Strategy and design rationale live in [plan.md](plan.md).

**Status:**
- Phase 0 Setup — Complete
- Phase 1 Audit — Complete
- Phase 2 Cleanup — Complete
- Phase 3 Entity Enrichment — Not started
- Phase 4 Edge Enrichment — Not started
- Phase 5 Seeding — Not started
- Phase 6 Importance Ratings — Not started

---

## Phase 0: Setup
> See plan.md Phase 0

- [x] Create `.env` with `DATABASE_URL`, (`ANTHROPIC_API_KEY`, `EXA_API_KEY` for later use)
- [x] Set up Python venv + install dependencies (`psycopg2`, `anthropic`, `exa-py`, `python-dotenv`)
- [x] Verify DB connectivity to `mapping_ai_staging`

## Phase 1: Audit & Baseline
> See plan.md Phase 1

- [x] Write `enrichment/scripts/audit.py`
- [x] Run audit and save output to `enrichment/logs/baseline-audit.md`
- [x] Review baseline numbers, flag anything unexpected
- [x] Manual check of phase 1 outputs


## Phase 2: Mechanical Cleanup
> See plan.md Phase 2

**Citation artifacts:**
- [x] Write `cleanup_citations.py` — regex for `[n]`, `[n,n]` patterns in notes (05ba014)
- [x] Dry run, review output (05ba014)
- [x] Run live, log entity count + IDs changed — 300 entities updated, 1,375 citations removed (05ba014)

**Edge type normalization:**
- [x] Write `normalize_edges.py` — 24 legacy types to 12 canonical (861a4c3)
- [x] Dry run, review mapping output (5f8d11b)
- [x] Run live, log edge counts per type migration (13c1c49)

**Belief field normalization:**
- [x] Write `normalize_beliefs.py` — non-standard to canonical values
- [x] Dry run, review distinct values found
- [x] Run live, log counts — 113 entities updated (2 belief_agi_timeline, 111 belief_evidence_source)

- [x] Manual check of phase 2 changes to the staging database (logged in phase2_diff.md)


## Phase 3: Entity Enrichment
> See plan.md Phase 3

**Scripted enrichment tooling:**
- [x] Write `enrich_entity.py` (thin wrapper — delegates to enrich_batch.py --ids)
- [x] Write `enrich_batch.py` (batch wrapper with progress tracking) — handles single entity via `--ids` too
- [ ] Test on 5 entities, review output quality

**Manual enrichment — high-edge entities:**
- [ ] Pull list of entities ordered by edge count (descending)
- [ ] Enrich top 20 highest-connected entities

**Manual enrichment — empty/thin notes (~710 entities):**
- [ ] Pull prioritized list (by edge count)
- [ ] Enrich first batch (50 entities)
- [ ] Enrich second batch (next 50)

**Orphan entities (254 with zero edges):**
- [ ] Review orphan list — triage into "enrich + connect" vs "possibly remove"
- [ ] Enrich + add edges for valuable orphans

## Phase 4: Edge Enrichment
> See plan.md Phase 4

**Source URLs and evidence (0% currently have sources):**
- [ ] Add `source_url` + `evidence` to edges for top-connected entities first

**Affiliated edge reclassification (591 edges):**
- [x] Sample affiliated edges, determine distribution — 59 party membership, 9 journalist-employer, 27 reversed org→person, 496 unresolved (see reclassify_affiliated.py report)
- [ ] Run `reclassify_affiliated.py --live --party-membership` — 59 person→PAC → member
- [ ] Run `reclassify_affiliated.py --live --journalist-employer` — 9 journalist→media → employer
- [ ] Run `reclassify_affiliated.py --live --org-to-person-flip` — 27 reversed edges
- [ ] Review remaining 496 `affiliated` edges, handle edge cases manually

**Edge directionality + correctness:**
- [x] Spot-check edges against canonical direction conventions — violations found:
  - `employer` (9): target not org — 8x person→person "worked for [person]", 1x person→resource
  - `founder` (5): source not person — org→org spin-off relationships, need manual reclassification
  - `founder` (20): target not org — 18x person→person co-founder, 2x person→resource
  - `advisor` (10): source not person — 8x org→person (reversed), 2x org→org (should be partner)
  - `member` (1): source not person — 1 edge
  - `critic` (6): source not person
  - `supporter` (3): source not person
- [ ] Run `fix_edge_directions.py` — auto-fixes reversed advisor (org→person) edges
- [ ] Manual review: founder person→person edges, employer person→person edges (see Discovered Work)

## Phase 5: Seeding
> See plan.md Phase 5

**Gap analysis:**
- [ ] Run gap analysis by `entity_type` and `category`
- [ ] Identify top coverage gaps

**Executive teams for major orgs:**
- [ ] Frontier labs (OpenAI, Anthropic, Google DeepMind, Meta AI, xAI) — CEO, CTO, Chief Scientist, Head of Policy
- [ ] Government agencies (NIST, OSTP, FTC, NSF, AISI) — Director, AI leads

**Seeding script:**
- [ ] Write `seed_entity.py`
- [ ] Seed first batch of new entities + edges

## Phase 6: Importance Ratings
> See plan.md Phase 6

- [ ] Coordinate `ALTER TABLE` with team
- [ ] Run `ALTER TABLE` on staging (add `importance` column)
- [ ] Write `importance.py` (AI-assisted scoring)
- [ ] Rate all person categories, cross-calibrate
- [ ] Rate all org categories, cross-calibrate
- [ ] Rate resources
- [ ] Final cross-category calibration pass

---

## Discovered Work

Items found during execution that don't fit neatly into a phase above.

- [ ] 18 person→person `founder` edges — co-founder relationships stored as person→person (e.g., Altman→Brockman [co-founder]). Should each point to the shared org. Requires finding/creating the org entity.
- [ ] 5 org→org `founder` edges — possible spin-offs (ENAIS→AI Safety Dublin) or bad data (GovAI→Yale, Element AI→Real Ventures). Real Ventures→Element AI should probably be `funder` flipped.
- [ ] 8 person→person `employer` edges — "worked for [person]" (e.g., Bruce Reed→Joe Biden [Deputy COS]). Target should be an org (White House, etc.) not the person.
- [ ] 8 reversed `advisor` edges where org→person — auto-fixable via fix_edge_directions.py
- [ ] 2 org→org `advisor` edges — should be `partner` or `collaborator`
