# Task List

Execution tracker for the data enrichment project. Strategy and design rationale live in [plan.md](plan.md).

**Status:**
- Phase 0 Setup — Complete
- Phase 1 Audit — Complete
- Phase 2 Cleanup — Complete
- Phase 3 Entity Enrichment — Complete
- Phase 4 Edge Enrichment — In progress (reclassify 61%, +48 backfilled edges, source_url 81.2%)
- Phase 5 Seeding — In progress (Tiers A–C done: mechanical cleanup, 6 canonical orgs seeded, 9 leadership persons seeded with 11 structural edges)
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

**Phase 5A: Gap analysis (complete):**
- [x] Write `scripts/gap_analysis.py` — category counts, exec coverage, orphans, watchlist
- [x] Run gap analysis — `logs/gap-analysis-20260412.md`
- [x] Draft prioritized seeding queue — `docs/seeding-queue.md`
- [x] Surfaced: 7 canonical orgs missing (Cohere, Inflection, CAISI, BIS, NSC, PCAST, State Dept AI); 5 orgs with zero leadership edges (AISI, DoD, OMB, CSIS, CAIP); 52 resources mis-categorized as non-canonical "AI Policy"; Nancy Pelosi missing from watchlist; FTC duplicate (199 v2 + 909 phase3-manual)

**Phase 5A.x: Tier A zero-token cleanup (complete):**
- [x] Resource category normalization — 57 rows updated: 52 "AI Policy"→"AI Governance", 2 "AI Safety, Philosophy/Ethics"→"AI Safety", 1 "AI Safety, Policy Proposal"→"AI Safety", 1 "Ethics"→"Philosophy/Ethics", 1 "Media"→"Industry Analysis" — `logs/normalize-resources-20260412.md`
- [x] Influence-type normalization — 91 rows updated; ~22 non-canonical token variants folded into the 9 canonical types (Electoral→Decision-maker, Researcher→Researcher/analyst, Technical leader→Builder, Convener→Connector/convener, Policy advocate→Organizer/advocate, Public intellectual/Thought leader/Educator→Narrator, etc.) — `logs/normalize-influence-types-20260412.md`
- [x] FTC duplicate merge — entity 199 → 909; 5 edges redirected, 12 notes_sources URLs appended, 199 deleted; 909 now has 17 edges — `logs/ftc-merge-20260412.md`
- [x] 3 zero-research leadership edges — Paul Christiano→AISI (employer/Head of AI Safety), Thomas Larsen→CAIP (employer/Director of Policy), Alan Davidson→Commerce (member/NTIA Admin) — `logs/seed-known-edges-20260412.md`
- [x] Deferred: CSIS (entity 349) — needs note rewrite, not mechanical fix. Documented in `seeding-queue.md` for Phase 5C.

**Phase 5B: Seeding script (complete):**
- [x] Write `seed_entity.py` — library that takes spec dicts; inserts entity + edges in one transaction, dry-run default, pre-flight duplicate + endpoint check
- [x] Seed 6 canonical orgs via `seed_tier_b.py` — `logs/tier-b-seeding-20260412.md`
  - [1787] Cohere (no founder edges — founders missing from DB, see Discovered Work)
  - [1788] Inflection AI (+2 founder edges: Suleyman, Hoffman)
  - [1789] Bureau of Industry and Security (BIS) (+parent_company → Commerce)
  - [1790] National Security Council (NSC) (+parent_company → White House)
  - [1791] PCAST (+parent_company → White House)
  - [1792] Bureau of Cyberspace and Digital Policy (CDP) (+parent_company → State Dept)
- [x] Skipped with reasoning: CAISI (uncertain post-Trump-admin status), Nancy Pelosi (doesn't pass ONBOARDING "don't add randos" bar for AI-specific policy)

**Phase 5C: Tier C — Leadership persons for existing orgs (complete):**
- [x] Extended `seed_entity.py` to handle person-specific fields (title, primary_org, influence_type, beliefs, twitter, location, etc.)
- [x] Seeded 9 leadership persons via `seed_tier_c.py` — `logs/tier-c-seeding-20260412.md`
  - [1793] Elizabeth Kelly (Policymaker) → AISI employer
  - [1794] Craig Martell (Policymaker) → DoD employer (historical, 2022-2024)
  - [1795] Radha Plumb (Policymaker) → DoD employer (current CDAO)
  - [1796] Clare Martorana (Policymaker) → OMB employer (Federal CIO)
  - [1797] Jason Green-Lowe (Organizer) → CAIP founder + employer
  - [1798] Sam McCandlish (Researcher) → Anthropic founder + employer (Chief Scientist)
  - [1799] Alvaro Bedoya (Policymaker) → FTC member (Commissioner)
  - [1800] Michael Littman (Academic) → NSF employer (IIS Div Director)
  - [1801] Reva Schwartz (Researcher) → NIST employer (AI RMF lead)
- [x] Coverage improvements: AISI 0→2 leadership edges, DoD 0→2, OMB 0→1, CAIP 0→3
- [x] Deferred from Tier C (insufficient confidence): Kevin Weil, Koray Kavukcuoglu, Doug Matty, Olivier Sylvain, Rob Reich, Margaret Martonosi, Jeff Alstott — flagged in Discovered Work

**Phase 5D: Remaining leadership + org backfill:**
- [ ] Fix CSIS (349) — needs note rewrite to describe the think tank, not just the podcast; then add Greg Allen (Wadhwani AI Center director)
- [ ] Revisit CAISI — confirm current status before attempting a seed
- [ ] Seed Cohere founders: Aidan Gomez, Nick Frosst, Ivan Zhang; then link founder edges to Cohere [1787]
- [ ] Seed Karén Simonyan; link founder edge to Inflection AI [1788]
- [ ] BIS / NSC / PCAST / CDP AI-specific leads (Tier C-level follow-up)
- [ ] Frontier-lab CTO/Head of Policy gaps (OpenAI CTO, xAI, Amazon AI deputies, NVIDIA policy — requires current-status check)
- [ ] Tier-C deferred persons (see Discovered Work): Kevin Weil, Koray Kavukcuoglu, etc.

**Phase 5E: Resources (mostly deferred until seeding stabilizes):**
- [x] ~~Resource category normalization~~ — done in Tier A
- [ ] Seed anchor resources (AI 2027, Situational Awareness, Core Views on AI Safety, Andreessen "Why AI Will Save the World", Constitutional AI paper, RLHF paper)
- [ ] Fill "Industry Analysis" (1) + "Technical" (0) resource buckets

**Phase 5F: Person-category coverage (token-heavy, defer until budget allocated):**
- [ ] +10-15 AI-beat journalists (category is thinnest at 25)
- [ ] +5-8 cultural figures (category is thinnest at 14)
- [ ] Verify Investor tagging for Hoffman, Andreessen, Thiel, Khosla

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
- [x] ~~**FTC duplicate merge**~~ — Done in Phase 5A Tier A (199 merged into 909)
- [ ] **CSIS entity rewrite** — entity 349 "CSIS AI Policy Podcast (Center for Strategic and International Studies)" has 0 edges and podcast-focused notes. Deferred to Phase 5C seeding pass (requires note rewrite, not mechanical fix).
- [x] ~~**Non-canonical `influence_type` normalization**~~ — Done in Phase 5A Tier A (91 rows normalized, all canonical)
- [x] ~~**Resource category normalization**~~ — Done in Phase 5A Tier A (57 rows normalized, all canonical)
- [ ] **Mark Gray duplicate** — entities 1696 "Mark Gray" and 1697 "Mark D Gray" both claim FTC Chief AI Officer role (surfaced during FTC merge). Likely same person; merge needed.
- [ ] **Cohere founders missing** — Aidan Gomez, Nick Frosst, Ivan Zhang not in DB. Seed them to anchor Cohere (1787) with founder edges. Aidan Gomez is particularly notable as a co-author of "Attention Is All You Need".
- [ ] **Karén Simonyan missing** — co-founder of Inflection AI (along with Suleyman and Hoffman, both now in DB). Former DeepMind Principal Scientist. Seed to complete Inflection founding team.
- [ ] **Tier C deferred persons (insufficient confidence)** — each needs current-status check before seeding:
  - Kevin Weil (OpenAI CPO vs CTO — ambiguous post-Mira-Murati)
  - Koray Kavukcuoglu (DeepMind/Google role has changed multiple times)
  - Doug Matty (DoD role unclear)
  - Olivier Sylvain (was FTC senior AI advisor; may have departed)
  - Rob Reich (Stanford — unclear if formally at OSTP or just adjacent)
  - Margaret Martonosi (NSF CISE AD — term likely completed)
  - Jeff Alstott (was OSTP Senior Policy Advisor on AI — current status?)
