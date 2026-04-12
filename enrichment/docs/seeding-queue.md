# Seeding Queue — Phase 5

Prioritized seeding list derived from `logs/gap-analysis-20260412.md`. Items are ordered by strategic importance; tackle from the top.

Legend:
- **SEED** — entity does not exist, needs creation
- **EDGE** — entity exists but is missing leadership / staff edges
- **FIX** — existing entity needs a category/data fix (non-seeding, but blocks honest gap analysis)

Every SEED item should follow the ONBOARDING "Don't Add Randos" filter: 2 sentences on why they matter + ≥2 expected edges to existing entities.

---

## Tier 1 — Canonical orgs missing outright

These are bluechip orgs referenced across AI policy discourse that the DB has *no* representation for. High leverage: seeding each will anchor several person-level edges.

| # | Type | Name | Category | Rationale |
|---|------|------|----------|-----------|
| 1 | SEED | **Cohere** | Frontier Lab | Enterprise frontier lab (Aidan Gomez CEO, Nick Frosst co-founder). Already cited in discourse; Canadian but US-facing. |
| 2 | SEED | **Inflection AI** | Frontier Lab | Co-founded by Mustafa Suleyman (already in DB as Microsoft CEO). Pi assistant; Microsoft licensing deal 2024. |
| 3 | SEED | **CAISI** (Center for AI Standards and Innovation) | Government/Agency | NIST successor to US AISI post-2025 reorg; the US government's AI standards body going forward. |
| 4 | SEED | **BIS** (Bureau of Industry and Security) | Government/Agency | Commerce sub-agency running AI export controls (compute / chip / model weights). Critical policy actor. |
| 5 | SEED | **NSC** (National Security Council) | Government/Agency | White House body coordinating national-security AI policy; AI Directorate under Sullivan/Waltz era. |
| 6 | SEED | **PCAST** (President's Council of Advisors on S&T) | Government/Agency | Issued landmark 2024 report on "Generative AI". Anchor for AI advisory-body edges. |
| 7 | SEED | **State Department AI coordinator / role** | Government/Agency | Diplomatic AI lead (Seth Center / envoy for critical tech). International-governance anchor. |
| 8 | SEED | **Nancy Pelosi** | Policymaker | Named in watchlist check. Has made AI-governance statements; her influence on House tech policy is non-trivial. |

## Tier 2 — Existing orgs missing leadership edges

The org entity exists; we just need to add the right person entities and link them. Some persons may already be in the DB (check first).

| # | Type | Target org | ID | Leaders to link |
|---|------|------------|-----|-----------------|
| 9 | EDGE | US AI Safety Institute (NIST) | 205 | Elizabeth Kelly (director, 2024); Paul Christiano (head of safety, external advisor) |
| 10 | EDGE | Department of Defense | 1420 | Craig Martell (former CDAO); Radha Plumb (current CDAO); Doug Matty |
| 11 | EDGE | Office of Management and Budget | 1295 | Clare Martorana (Federal CIO); AI leads who shaped M-24-10 / M-25-22 memos |
| 12 | EDGE | Center for AI Policy (CAIP) | 443 | Jason Green-Lowe (executive director); Thomas Larsen (advisory) |
| 13 | FIX + EDGE | CSIS | 349 | Entity today is "CSIS AI Policy Podcast (Center for Strategic and International Studies)" with 0 edges and podcast-focused notes. Rewrite as the main think tank (name, category → Think Tank/Policy Org, website → csis.org, notes → think-tank-focused). Then add Greg Allen (Wadhwani AI Center director) and other CSIS AI leads. **Cannot do mechanically — needs note rewrite, so deferred from Tier A to this seeding pass.** |

## Tier 3 — Frontier lab leadership gaps (ONBOARDING "Executive Teams" checklist)

For frontier labs in the DB but missing key officers. Fill the 4-slot template: CEO / CTO / Chief Scientist / Head of Policy.

| # | Target org | Missing slots (per gap analysis) |
|---|------------|----------------------------------|
| 14 | OpenAI (140) | CTO (Mira Murati left; current = Kevin Weil?) |
| 15 | Anthropic (133) | CTO (Tom Brown / Sam McCandlish?); Head of Policy (Jack Clark already in DB — verify edge) |
| 16 | Google DeepMind (146) | Chief Scientist (Koray Kavukcuoglu?); Head of Policy |
| 17 | Meta AI (204) | CEO of AI division (Yann LeCun as Chief AI Scientist); Head of Policy |
| 18 | xAI (177) | CTO; Chief Scientist; Head of Policy |
| 19 | Amazon (729) | CTO; Chief Scientist; Head of Policy (Andy Jassy's AI deputies) |
| 20 | NVIDIA (728) | Head of Policy; broader executive team (currently only Jensen Huang linked) |

## Tier 4 — Federal agency AI leads (ONBOARDING checklist)

Agency exists; add the specific AI leads who testify / set policy.

| # | Target org | AI leads to add |
|---|------------|-----------------|
| 21 | NIST (1309) | Elham Tabassi (Chief AI Advisor); Reva Schwartz |
| 22 | OSTP (345) | Arati Prabhakar edge (she's in DB elsewhere); Jeff Alstott; Rob Reich |
| 23 | FTC (909 ← merge with 199) | Alvaro Bedoya (commissioner); Olivier Sylvain (former senior advisor on AI) |
| 24 | NSF (1185) | Michael Littman (Div. Director, IIS); Margaret Martonosi (CISE AD) |
| 25 | Commerce (914) | Gina Raimondo edges; Alan Davidson (NTIA) |

## Tier 5 — Resource category normalization (FIX, then SEED)

Gap analysis shows **52 resources categorized as non-canonical "AI Policy"** and zero under canonical "AI Governance". This is a normalization + re-categorization task, not seeding per se.

| # | Type | Action |
|---|------|--------|
| 26 | FIX | Write a normalize-pass: "AI Policy" → "AI Governance" for the 52 affected resources. Also reclassify the handful of comma-joined values ("AI Safety, Philosophy/Ethics" → pick one). |
| 27 | SEED | Add missing anchor resources the watchlist surfaced: AI 2027 scenario, Situational Awareness (Aschenbrenner), Core Views on AI Safety (Anthropic), Marc Andreessen's "Why AI Will Save the World", Constitutional AI paper, RLHF paper. |
| 28 | SEED | Fill "Industry Analysis" (0) and "Technical" (0) buckets with 3-5 canonical picks each. |

## Tier 6 — Person-category coverage backfill

Under-represented person categories per gap analysis:

- **Journalist (25)** — most underrepresented category; add 10-15 AI-beat reporters (e.g., Kevin Roose, Cade Metz, Will Knight, Karen Hao, Casey Newton, Melissa Heikkilä, Emily Dreyfuss, Dina Bass, Berber Jin)
- **Cultural figure (14)** — very thin; add Ted Chiang, Naomi Klein, Yuval Harari, Cory Doctorow, Ian McEwan, James Cameron on AI
- **Investor (36)** — thinner than expected; check if famous VC partners on AI (Reid Hoffman, Marc Andreessen) are tagged correctly

| # | Type | Target |
|---|------|--------|
| 29 | SEED | +10-15 AI-beat journalists |
| 30 | SEED | +5-8 cultural figures commenting on AI |
| 31 | EDGE | Verify Investor category tagging for Hoffman, Andreessen, Thiel, Khosla |

## Tier 7 — Deferred / opportunistic

These emerged during gap analysis but are lower priority:

- 303 orphan entities (zero edges) — many are already-enriched small sub-labs; triage for structural edges (parent_org, collaborator) before deleting any.
- 538 orgs with zero inbound `employer` edges — most are fine (small one-person shops, historical orgs, umbrella bodies). Address case-by-case as Tier 1-4 drives them.
- ~20 non-canonical `influence_type` variants (Advisor, Convener, Educator, Electoral, Funder, Investor, Policy advocate, …) — should be folded into the 9 canonical types via `normalize_influence_types.py` (does not yet exist).
- Dedup merge: FTC 199 (v2) ⇢ FTC 909 (phase3-manual). Same agency, 5 vs 12 edges.

---

## Execution notes

1. **Work top-down.** Tier 1 seeds create new anchor nodes; Tier 2-4 populate them and existing orgs with leadership.
2. **Use `seed_entity.py`** (to be written) with a consistent template: name, category, notes (50-500 chars), notes_sources (≥1 URL), enrichment_version='phase5-seed', then 2-3 structural edges.
3. **Check for existing entities before seeding** — every SEED item should be preceded by an `ILIKE '%name%'` search and a variant-name check (e.g., full name vs. abbreviation).
4. **Edge quality over entity count.** A new entity that doesn't link to ≥2 existing entities fails the ONBOARDING "Edge test". Pause and reconsider.
5. **Log each seeding batch** to `logs/seeding-NN-*.md` with a change table (entity ID, name, edges created, source URL).
