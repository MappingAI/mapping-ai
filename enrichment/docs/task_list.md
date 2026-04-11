# Task List

Execution tracker for the data enrichment project. Strategy and design rationale live in [plan.md](plan.md).

**Status:**
- Phase 0 Setup — Complete
- Phase 1 Audit — Complete
- Phase 2 Cleanup — In progress
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

## Phase 2: Mechanical Cleanup
> See plan.md Phase 2

**Citation artifacts:**
- [ ] Write `cleanup_citations.py` — regex for `[n]`, `[n,n]` patterns in notes
- [ ] Dry run, review output
- [ ] Run live, log entity count + IDs changed

**Edge type normalization:**
- [x] Write `normalize_edges.py` — 24 legacy types to 12 canonical (861a4c3)
- [x] Dry run, review mapping output (5f8d11b)
- [x] Run live, log edge counts per type migration (13c1c49)

**Belief field normalization:**
- [x] Write `normalize_beliefs.py` — non-standard to canonical values
- [x] Dry run, review distinct values found
- [x] Run live, log counts — 113 entities updated (2 belief_agi_timeline, 111 belief_evidence_source)

## Phase 3: Entity Enrichment
> See plan.md Phase 3

**Scripted enrichment tooling:**
- [ ] Write `enrich_entity.py` (Exa search + Claude verification + structured output)
- [ ] Write `enrich_batch.py` (batch wrapper with progress tracking)
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

**Affiliated edge reclassification (585 edges):**
- [ ] Sample 20 `affiliated` edges, determine distribution of true types
- [ ] Reclassify Senators → Committees batch (`affiliated` → `member`)
- [ ] Reclassify People → Think tanks batch
- [ ] Reclassify People → Orgs employment batch
- [ ] Review remaining `affiliated` edges, handle edge cases

**Edge directionality + correctness:**
- [ ] Spot-check edges against canonical direction conventions
- [ ] Fix any reversed or mispointed edges

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

*(empty — items will be added as they emerge)*
