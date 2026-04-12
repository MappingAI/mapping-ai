# Task List

Execution tracker for the data enrichment project. Strategy and design rationale live in [plan.md](plan.md).

**Status:**
- Phase 0 Setup — Complete
- Phase 1 Audit — Complete
- Phase 2 Cleanup — Complete
- Phase 3 Entity Enrichment — Complete
- Phase 4 Edge Enrichment — In progress (reclassify 61%, +48 backfilled edges, source_url 81.2%)
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
- [ ] Test on 5 entities, review output quality — **deferred**; manual Claude Code enrichment used instead (see batches 01-86)

**Manual enrichment — persons & organizations:**
- [x] Pull prioritized list by edge count descending — see `enrichment/docs/enrichment-queue.md`
- [x] Enrich top entities (3+ edges) — batches 01-27 (4 per agent)
- [x] Scale to 6-per-agent for 2+ edge tier — batches 28-43
- [x] Scale to 12-per-agent × 4 parallel agents for truly-empty entities — batches 44-81
- [x] Final totals: 293 orgs + 373 persons with `enrichment_version='phase3-manual'`

**Manual enrichment — resources:**
- [x] Enrich 92 empty resources (books, papers, bills, EOs, transcripts) — batches 82-85 (23 per agent)
- [x] 1-2 sentence descriptions; no belief fields (resources don't hold beliefs)

**Phase 3 close-out passes:**
- [x] Pass #1: Delete 5 test entities + expand 12 thin v1 stubs — batch 86
- [x] Pass #2: Dead URL cleanup — 2 real fixes, 35 audit flags confirmed as bot blocks — `logs/audit-url-cleanup-20260411.md`
- [x] Pass #3: Resource dedup — 11 merges across 6 canonical clusters, 1 edge redirected, 0 orphans — `logs/resource-dedup-20260411.md`
- [x] Pass #4: Category corrections — 2 applied (ASML, PIT-UN), 13 already in-batch, 1 held for schema (AMPTP) — `logs/category-corrections-20260411.md`
- [x] Pass #5: Audit finish — short-notes flags resolved; no-beliefs sample documented (6 policymaker backfills flagged for Phase 4) — `logs/audit-finish-20260411.md`

**NIST dedup:** consolidated 4 duplicate entities (911, 1309, 1416, 1468) into canonical 1309 with 10 edges merged.

**Orphan entities:** not explicitly triaged in Phase 3 — enrichment scope was coverage-first (notes ≥50 chars for all 1,651 entities). Orphan review deferred to Phase 4/5.

## Phase 4: Edge Enrichment
> See plan.md Phase 4

**Affiliated edge reclassification (591 edges):**
- [x] Sample affiliated edges, determine distribution — 59 party membership, 9 journalist-employer, 27 reversed org→person, 496 unresolved (see reclassify_affiliated.py report)
- [x] Rounds 1-3: 361 reclassified via deterministic rules (commits through 38e9e94)
- [ ] Review remaining 230 `affiliated` edges, handle edge cases manually (requires web search per edge)

**Backfill missing edges from notes (Phase 4A):**
- [x] Write `backfill_employer_edges.py` — regex extraction of employment/founder/member patterns from person notes, with guards for past roles and duplicate-stub entities — `logs/backfill-employer-edges-20260412.md`
- [x] Live run: **48 edges added** (23 employer + 17 founder + 8 member) across 46 persons
- [x] Flag delta: 271 → 249 `influence_without_edge` (−22)
- [ ] Consider org-side backfill (120 flagged orgs still need member/employer edges pointing to them)

**Edge directionality + correctness:**
- [x] Spot-check edges against canonical direction conventions — violations found:
  - `employer` (9): target not org — 8x person→person "worked for [person]", 1x person→resource
  - `founder` (5): source not person — org→org spin-off relationships, need manual reclassification
  - `founder` (20): target not org — 18x person→person co-founder, 2x person→resource
  - `advisor` (10): source not person — 8x org→person (reversed), 2x org→org (should be partner)
  - `member` (1): source not person — 1 edge
  - `critic` (6): source not person
  - `supporter` (3): source not person
- [x] Phase 4B.1: Flipped 7 reversed `advisor` org→person edges via `fix_edge_directions.py --live` — `logs/phase4b1-4e-20260412.md`
- [ ] Manual review: founder person→person edges, employer person→person edges, 3 org→org advisor edges, 6 `critic` org→person, 3 `supporter` org→org (see Discovered Work)

**Phase 4E close-outs (completed 2026-04-12):**
- [x] Citation artifact cleanup — 16 entities, 63 markers stripped (fixed `cleanup_citations.py` regex bug)
- [x] Dead URL removal — 4 URLs (federalregister 500, whitehouse 404, darioamodei 404, helionenergy DNS)
- [x] Belief backfill for 6 policymakers (Tom Cotton, Andy Kim, Ben Horowitz, Donald Trump, John Kennedy, Katie Britt)

**Source URLs and evidence:**
- [x] Phase 4C.1: Zero-API backfill via `backfill_source_urls.py --live` — filled **1,842 / 2,269 edges (81.2%)** using target_resource_url → target_website → source_website fallbacks — `logs/source-url-backfill-20260412.md`
- [ ] Phase 4C.2: Fill 427 remaining unfilled edges (mostly collaborator 175, employer 63, founder 50 — require org-website seeding or evidence pass)
- [ ] Phase 4C.3 (stretch): Upgrade generic org-homepage URLs to specific evidence pages for high-degree entities

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
- [ ] **AMPTP category schema gap** — current category list in `canon.md` has no fit for trade/industry associations (studio-management bargaining groups). Currently bucketed as `Labor/Civil Society` with a note in `other_categories`. Consider adding `Trade Association/Industry`.
- [ ] **Policymaker belief backfill (~6 entities)** — Tom Cotton (1099), Andy Kim (1100), Ben Horowitz (1102), Donald Trump (1103), John Kennedy (1105), Katie Britt (1119) have clear public positions documented in their notes but belief fields are NULL/Unknown. Audit surfaced these — fix in early Phase 4 alongside belief enrichment pass.
