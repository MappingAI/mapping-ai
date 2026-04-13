# Task List

Execution tracker for the data enrichment project. Strategy and design rationale live in [plan.md](plan.md).

**Status:**
- Phase 0 Setup — Complete
- Phase 1 Audit — Complete
- Phase 2 Cleanup — Complete
- Phase 3 Entity Enrichment — Complete
- Phase 4 Edge Enrichment — In progress (reclassify 61%, +48 backfilled edges, source_url 81.2%)
- Phase 5 Seeding — In progress (Tiers A–G done: cleanup, 9 orgs, 47 persons, 5 anchor resources; +73 structural edges)
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

**Phase 5D: Tier D — founder backfill + CSIS fix (complete):**
- [x] Rewrote CSIS entity 349 — renamed to "Center for Strategic and International Studies (CSIS)", category → Think Tank/Policy Org, website → csis.org, notes rewritten to describe the think tank (mentions Wadhwani AI Center and podcast as sub-units)
- [x] Seeded 5 persons via `seed_tier_d.py` — `logs/tier-d-seeding-20260412.md`
  - [1807] Aidan Gomez (Executive) → Cohere founder + CEO + author of Attention Is All You Need
  - [1808] Nick Frosst (Executive) → Cohere founder + employer
  - [1809] Ivan Zhang (Executive) → Cohere founder + employer
  - [1810] Karén Simonyan (Researcher) → Inflection founder + Microsoft current employer
  - [1811] Gregory C. Allen (Researcher) → CSIS employer (Wadhwani AI Center Director)
- [x] Coverage improvements: Cohere 0→6 leadership edges, Inflection 2→3, CSIS 0→1

**Phase 5D tail — resolved in Tiers F/G (see below).**
- [x] ~~Revisit CAISI~~ — confirmed rebrand from USAISI to CAISI (June 2025) under Lutnick; Elizabeth Kelly departed; no public successor director post-Kelly. Entity 205 website already /caisi. Left in place; flagged in Discovered Work for notes rewrite.
- [x] ~~BIS / NSC / PCAST / CDP AI-specific leads~~ — BIS (Kessler) and PCAST (Kratsios, Sacks) already in DB; NSC AI senior director seat unfilled publicly; CDP Ambassador (Cassady) still a nominee, skipped.
- [x] ~~Frontier-lab CTO/Head of Policy gaps~~ — seeded via Tier F: Swami Sivasubramanian, Peter DeSantis, Ned Finkle, Koray Kavukcuoglu, James Manyika, Joel Kaplan, Jacob Andreou, Joelle Pineau, Sean White, Kevin Weil, Igor Babuschkin.
- [x] ~~Tier-C deferred persons~~ — partially resolved: Kevin Weil + Koray Kavukcuoglu seeded in Tier F. Others skipped (Doug Matty *was* seeded historically; Olivier Sylvain confirmed departed FTC — no successor; Rob Reich/Martonosi/Alstott have no current confirmed AI-specific roles).

**Phase 5E: Tier E — Anchor resources (complete):**
- [x] ~~Resource category normalization~~ — done in Tier A
- [x] Pre-flight revealed Situational Awareness [544], AI 2027 [618], Why AI Will Save the World [546], EO 14110 [650] already in DB — skipped re-seeding
- [x] Seeded 5 canonical missing anchor resources via `seed_tier_e.py` — `logs/tier-e-seeding-20260412.md`
  - [1802] Core Views on AI Safety (Anthropic, 2023) — +publisher edge
  - [1803] Constitutional AI paper (Bai et al., 2022) — +publisher + author edges (Kaplan, Amodei)
  - [1804] Attention Is All You Need (Vaswani et al., 2017) — +publisher → Google
  - [1805] InstructGPT/RLHF paper (Ouyang et al., 2022) — +publisher + author edges (Leike, Schulman, Christiano)
  - [1806] Scaling Laws paper (Kaplan, McCandlish et al., 2020) — +publisher + author edges (Kaplan, McCandlish, Amodei)
- [x] "Technical" resource bucket now populated (was 0)
- [ ] "Industry Analysis" bucket still thin (1 resource); Chip War-style reports could go here opportunistically

**Phase 5F: Tier F — Current-admin gov leads + frontier-lab executives (complete):**
- [x] Seeded 17 persons via `seed_tier_f.py` — `logs/tier-f-seeding-20260412.md`
  - Gov (6): Cameron Stanley [1812] → DoD CDAO current; Doug Matty [1813] → DoD CDAO historical; Andrew Ferguson [1814] → FTC Chair; Mark Meador [1815] → FTC Commissioner; Greg Hager [1816] → NSF CISE AD; Tarun Chhabra [1817] → Anthropic (Biden NSC crossover)
  - Labs (11): Swami Sivasubramanian [1818] → Amazon; Peter DeSantis [1819] → Amazon AGI; Ned Finkle [1820] → NVIDIA; Koray Kavukcuoglu [1821] → DeepMind+Google; James Manyika [1822] → Google; Joel Kaplan [1823] → Meta; Jacob Andreou [1824] → Microsoft; Joelle Pineau [1825] → Cohere; Sean White [1826] → Inflection; Kevin Weil [1827] → OpenAI; Igor Babuschkin [1828] → xAI
- [x] Research verified via WebSearch/WebFetch; all current-admin appointees confirmed as of early 2026

**Phase 5G: Tier G — Journalists + cultural figures + media orgs (complete):**
- [x] Seeded 19 entities via `seed_tier_g.py` — `logs/tier-g-seeding-20260412.md`
  - Media orgs (3): Reuters [1829], Semafor [1830], Forbes [1831]
  - Journalists (12): Kylie Robison [1832], Hayden Field [1833], Deepa Seetharaman [1834], Berber Jin [1835], Alex Heath [1836], Nilay Patel [1837], Reed Albergotti [1838], Shirin Ghaffary [1839], Anna Tong [1840], Ben Thompson [1841], Sigal Samuel [1842], Garrison Lovely [1843]
  - Cultural figures (4): Molly Crabapple [1844], Douglas Rushkoff [1845], Jaron Lanier [1846], Sherry Turkle [1847]
- [x] Naomi Klein already in DB [941] — skipped; Tim Urban, Nick Bostrom, Audrey Tang, Rana Ayyub, James Bridle dropped per agent research

**Phase 5F/G tail — remaining:**
- [ ] Verify Investor tagging for Hoffman, Andreessen, Thiel, Khosla (category audit, not new seeds)
- [ ] Update entity 205 (AISI) notes to reflect June 2025 → CAISI rebrand
- [ ] Fill Industry Analysis resource bucket (still thin at 1)

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
- [ ] **New York Times duplicate** — [862] "The New York Times" (6 edges, AI-initiatives-focused notes) and [1059] "New York Times" (12 edges, generic notes). Surfaced during Phase 5F pre-check. Merge candidate: keep [862], redirect edges from [1059], append URLs.
- [ ] **Commerce duplicate** — [914] "Department of Commerce" and [1032] "U.S. Department of Commerce". Surfaced during Phase 5F pre-check. Merge candidate.
- [x] ~~**Cohere founders missing**~~ — Done in Tier D. Aidan Gomez [1807], Nick Frosst [1808], Ivan Zhang [1809] all seeded.
- [x] ~~**Karén Simonyan missing**~~ — Done in Tier D. Seeded as [1810] with founder→Inflection + employer→Microsoft.
- [x] ~~**Tier C deferred persons**~~ — resolved in Tiers F/G:
  - Kevin Weil [1827] → OpenAI (VP Science)
  - Koray Kavukcuoglu [1821] → DeepMind CTO + Google Chief AI Architect
  - Doug Matty [1813] → DoD (historical Apr–Dec 2025)
  - Olivier Sylvain — confirmed departed FTC; no successor in AI senior-advisor seat publicly named. Skipped.
  - Rob Reich, Margaret Martonosi (term ended; Greg Hager [1816] now NSF CISE AD), Jeff Alstott — skipped; no current confirmed AI-specific roles.
- [ ] **Entity 205 (AISI/CAISI) notes update** — website already says `/caisi`, but notes still describe it as AISI. Rebrand to CAISI happened June 2025 under Lutnick; director Elizabeth Kelly departed at the same time; no public successor.
