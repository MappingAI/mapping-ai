# Methodology: Internal Reference

**Status:** living document. **Last updated:** 2026-06-08.

This document is the honest, comprehensive record of how Mapping AI's data was built, what went wrong along the way, and how our processes evolved in response. It is intended for the core team and trusted contributors, not for public distribution. For the public-facing version, see the `/methodology` page on the site.

---

## Origins and initial data seed

The project started from four CSV exports from an Airtable base on March 19, 2026, containing 113 people, 72 organizations, 15 readings, and 12 policy efforts. Most rows were extremely sparse: a name, a title, a role category, and little else. Airtable-specific columns like "Connector score" and "Contact owner" were never used.

On March 20, `scripts/seed.js` imported these CSVs into a Vercel Postgres (Neon) database. The very first data bug appeared immediately: a UTF-8 BOM prefix on the People CSV caused the "Name" column header to not match, resulting in zero rows seeded until the BOM was stripped in `readCSV()`. Form submissions at this point were JSON files committed to a `submissions/` directory on GitHub via the GitHub Contents API.

The database driver moved from `@vercel/postgres` to `pg` (node-postgres) on March 24, and the backend moved from Vercel to AWS Lambda + GitHub Pages on March 23. The `DATABASE_URL` still pointed at Neon during this period, which created the first of many environment-variable confusion issues that would compound later.

## First enrichment pipeline and the hallucination problem

The shift from a static CSV dataset to an AI-augmented pipeline happened on March 26-28, when `exa-js` and `@anthropic-ai/sdk` were added as dependencies. Seven scripts were introduced in a single 1,827-line commit (`ccf3aaf`):

- `enrich-with-exa.js` filled sparse fields via Exa web search, using keyword-based classification (`classifyStance()`) to map search results to enum values.
- `quality-pass.js` ran Claude Haiku quality reviews across all entities (~$0.70 for the full run).
- `discover-with-exa.js` found new resources via Exa search.
- `import-aisafety-csv.js` imported a second external dataset (the AI Safety Map).

Two days later, `enrich-deep.js` (682 lines) and `enrich-deep-orgs.js` (733 lines) were added with role-specific prompts using Exa search + Claude Sonnet. These scripts were designed to write directly to belief fields and notes on entity records, and they prompted the LLM to generate "SPECIFIC facts" without requiring source citations.

**This is where the hallucination problem started.** The enrichment v2 design doc (created April 7) diagnosed the root cause explicitly: the LLM was prompted to generate facts without source grounding, there was no verification step, no confidence scoring, and validation only checked enum values and string lengths. The canonical example was Joi Ito being incorrectly attributed with winning the 2018 Turing Award (that was Hinton, LeCun, and Bengio). Notes fields were the primary vector for hallucinated content, since they were free-text with no structural constraints.

Early lessons from this period that shaped all subsequent pipeline design: use Exa's `summary` mode instead of `highlights` for more coherent context; cache Wikipedia thumbnails via the REST API rather than calling it at runtime; keep Claude Haiku for classification speed over Sonnet accuracy when the task is well-constrained.

## Schema restructure: from 6 tables to 3

On March 30, Robby Hill restructured the entire database from 6 tables (`people`, `organizations`, `resources`, `submissions`, `relationships`, `person_organizations`) into 3 (`entity`, `submission`, `edge`). This was the right call architecturally, but the migration happened mid-enrichment, which meant that several enrichment scripts still referenced the old table names and column prefixes until they were updated over the following days. The new schema added `belief_` prefixes to all stance/timeline/risk fields and introduced weighted-average aggregate columns (`_wavg`, `_wvar`, `_n`) maintained by database triggers.

The `recalculate_entity_scores()` Postgres function computes weighted averages across all approved submissions for an entity, with weights of self=10, connector=2, external=1. This means a single self-report outweighs five external observations, which is intentional: the person themselves (or someone who can connect you to them) is the most reliable source on their beliefs. Weighted variance is computed as `SUM(w*x^2)/SUM(w) - (SUM(w*x)/SUM(w))^2`, which gives a crude disagreement score between submitters.

## Scaling up: tiered seeding and the TIME100 pipeline

Between March 31 and April 7, the dataset grew from ~300 to ~750+ entities through purpose-built seeding scripts. The TIME100 AI seeder added 41 people and 38 orgs from the TIME 100 AI 2025 list with fuzzy duplicate detection and automatic edge creation. The election enrichment pipeline added 6 AI super PACs, 13 candidates, and 16 PAC-candidate edges with FEC spending amounts via Exa. A dedup pass consolidated 31 duplicate orgs (461 down to 430) and 16 notable missing figures were manually added.

On April 7, a single 106,422-line commit introduced the entire Phase 3/4 infrastructure: the enrichment v2 design doc, `enrich-v2.js` with source-grounded enrichment and confidence scoring, 20+ analysis and cleanup scripts, 6 tiered seed scripts, an org-matching library for fuzzy entity resolution, and a full Neon-to-RDS migration script. This commit also introduced `enrich-orgs.js` with category-specific prompts and the thumbnail caching pipeline (`cache-thumbnails.js`), which fetched org logos from Google Favicons and people photos from Wikipedia, uploading to S3 with 1-year cache headers.

The `qa_approved` gate was added at this point (`8a27678`) to prevent auto-enriched entities from appearing on the live map until manually reviewed. This was a direct response to hallucinated content showing up in production. The BEFORE trigger was updated to set `qa_approved = true` only when an admin approves a submission; entities created by enrichment scripts remained `false` until reviewed.

## Connor Mack's enrichment audit (April 10-15)

Connor Mack from UCSD joined as the first external data contributor, contributing 30 commits over 5 days working through a structured enrichment and quality control process. His contributions included:

- Python-based batch enrichment (`enrich_batch.py`) selecting unenriched entities by edge count, writing belief fields, and setting `qa_approved=FALSE` for human review.
- Reclassification of 591 affiliated edges into canonical types (95 auto-reclassified, 496 flagged for manual review).
- Tiered seeding from `seed_tier_b.py` through `seed_tier_g.py` with a reusable `seed_entity.py` utility.
- Backfill of 48 employer/founder/member edges extracted from person notes.
- Source URL backfill that gave 81.2% of edges (1,842/2,269) a `source_url` using three cheap strategies (target resource URL, target website, source website).

His QC report formalized 8 test data resources, 11 duplicates to merge, 378 missing titles, 517 missing primary_org, 26 missing resource URLs, 246 orphans, and 164 affiliated edges needing review. The staging-to-production migration merged his work: 1,695 entities (11 duplicates merged), 2,226 edges (67 duplicates removed), 1,676 entities with importance ratings (1-5).

## The thumbnail pipeline and Wikipedia 429 storms

On April 19, the map had been calling `en.wikipedia.org/api/rest_v1/page/summary/` for every person without a pre-cached thumbnail, and again on every image `onerror`. With real visitors, Wikipedia rate-limited aggressively, filling the browser console with 429 errors. All thumbnail fetching was moved to the `cache-thumbnails.js` batch script, and the script was enhanced to write `thumbnail_url = ''` for entities where caching failed, to prevent re-hammering Wikipedia on future runs.

## Claims/source table schema (April 26)

This was a fundamental architectural shift: instead of writing enrichment data directly to entity fields, a proper `claim` + `source` table schema was introduced on the Neon `claims-pilot` branch. Each claim records a belief dimension, stance text and score, verbatim citation, source URL, confidence level, and extraction metadata. The `source` table is keyed by URL hash with cached excerpts.

`enrich-claims.js` used Exa for 4 belief dimensions per entity, extracting claims via Claude with verbatim citations. Cost was ~$0.08/entity. `enrich-crosspartisan.js` ran across 271 entities (141 policymakers + 130 policy-relevant orgs) across 6 policy areas, producing 628 sourced claims. These powered the horseshoe and beeswarm visualizations.

**Important detail that's not public:** these claims tables still live on the `claims-pilot` Neon branch and have never been merged to production. The production `entity` table still has belief fields written directly by older enrichment scripts and admin merges. The claims data is served to the frontend from R2, but the production database schema doesn't include the claims/source tables. This is a known gap.

## Edge enrichment pipeline (April 27-30)

Sophia built the full edge enrichment pipeline with entity resolution:

- `discover-funding.js`: Funding relationship discovery ($58 for a full run).
- `enrich-edges.js`: Temporal data (start/end dates, dollar amounts) for existing edges ($62 full run).
- `enrich-org-lifecycle.js`: Org founding/end dates ($25 full run).
- `review-discoveries.js` + `promote-discoveries.js`: Human-in-the-loop review workflow.

This introduced 4 additional tables on the claims-pilot branch: `edge_evidence`, `edge_discovery`, `entity_suggestion`, `entity_alias`. The post-processing pipeline ran 4 steps: orphan cleanup, duplicate merge, generic entity rejection (filtering names like "Investors" or "Tech Companies"), and abbreviation expansion.

Batch rejection scripts in `scripts/edge-enrichment/archive/batch-rejections/` record the manual review: 4 batches of rejections, promoted merge rejections, and review rejections. This was labor-intensive, and the rejection rate was high enough that it's worth calling out: the discovery pipeline surfaced a lot of noise.

## The data quality review and launch-day incident (May 3-7)

A formal data quality review process was documented on May 3. The method: export data as JSON batches, review with Claude on the web platform using a structured prompt that flags hallucinated entities, bad resolutions (duplicates), misclassified types, non-AI-related entities, and generic placeholder names. Issues were triaged by severity (P0-critical, P1-serious, P2-backlog).

The review found:

- **P0-critical (20):** Duplicates (Senate Commerce Committee with 4 entries), hallucinated entities ("NoHarm" with notes containing "no evidence found"), test entries ("Submit Test XYZ"), wrong data (Metaplanet being a Japanese Bitcoin firm misclassified as AI).
- **P1-serious (25):** Misclassified types (blog posts and newsletters listed as organizations), defunct orgs shown as active (FHI closed April 2024, GPI closed 2025).
- **P2-backlog (40+):** Scope questions and minor cleanup.

**The launch-day incident (May 4-5) was our worst operational failure.** When `map-data.json` was regenerated from Neon for launch, it overwrote the previous version that had been generated from RDS. Neon was missing ~240 entities and ~1,000 edges that only existed in RDS, causing entities like Hoover Institution to disappear from the live map. The submit endpoint returned 500 errors because 5 columns were missing from Neon's submission table (the migration had errored partway through and nobody re-ran it). Separately, 5,835 sourced claims on the claims-pilot branch had never been merged to production, so sparklines stopped appearing.

The root cause was that the RDS-to-Neon migration was incomplete in three ways: entity/edge data gaps from enrichment scripts continuing to write to RDS, a schema gap from a partially-failed migration, and claims data never merged. Multiple `DATABASE_URL` values across `.env`, Cloudflare Workers, and GitHub Actions had created two divergent databases. The fix required syncing 240 entities, deduplicating 193 entity pairs and 115 edge pairs, adding 5 missing columns, and re-exporting everything.

## Verification pipeline evolution (May 10-24)

The verification pipeline went through rapid architectural iteration in a single week:

**May 10:** First multi-agent verification pipeline with 6 phases: enum validation/repair (561 fixes applied to staging), decompose records into atomic claims, Exa search for evidence with attribution chains, adversarial debate (prosecutor/defender/judge agents), correction proposals, and write-back to staging. Used separate API keys for billing isolation.

**May 10-11:** Within 24 hours, the architecture was iterated three times: focused belief field verification, then adversarial multi-agent pipeline, then a different multi-agent adversarial pipeline.

**May 11:** Pivoted to a single Opus agent with extended thinking (simplified from multi-agent). This produced better results. Multi-query Exa search (up to 5 queries at once), `fetch_content` tool for URL follow-up. Tested on Sam Altman: 5/6 fields matched ground truth.

**May 11-12:** Pipeline infrastructure: shared Exa cache, pipeline tracking, cost ledger with ceiling, resume support, dedup, parallel-safe JSONL output, per-step token tracking, per-entity traces.

**May 11:** A sequence of fixes enforcing field constraints. The verification agent was outputting enum values that didn't match the form's allowed values. Fixed by grounding enums from `PersonForm.tsx` and the full schema reference.

**May 14:** Parallel execution and edges-1-opus verification pipeline.

**May 15:** Notes-1-opus verification pipeline.

Safety fixes during this period: pre-run backup before edge verification, parallel mode safety, ON CONFLICT guard, and parallel cost ceiling for notes pipeline.

**The honest assessment:** the adversarial multi-agent architecture (prosecutor/defender/judge) was more theoretically sound, but the single Opus agent with extended thinking was simpler, cheaper, and produced comparable quality. We kept the 3-agent design in the `beliefs-3/` directory but operationally ran the 1-opus pipelines. The multi-agent approach added latency and cost without enough marginal accuracy to justify it for our entity count.

**May 24:** Built the `/verify` page for systematic human review: priority-sorted entity queue, structured correction forms reusing contribute components, error taxonomy classification (HALLUCINATED, MISCLASSIFIED, etc.), three-step claim verification (source accessible, quote found, conclusion supported), and an append-only DB schema (`verification_review` + `verification_correction`) that stores corrections without modifying production data.

## The scoring system

Belief scores (regulatory stance, AGI timeline, AI risk level) are computed at two levels, with the first taking precedence when available:

**Trigger-maintained weighted averages:** Stored on the entity table as `belief_*_wavg`. Computed by the `recalculate_entity_scores()` Postgres function every time a submission status changes. Weights: self=10, connector=2, external=1. These only exist for entities that have at least one approved submission with belief scores.

**Text-label lookup fallback:** When an entity has no approved submissions (common for auto-enriched data), the export pipeline falls back to ordinal score maps that convert text labels to numbers. The score maps:

- Stance: Accelerate=1, Light-touch=2, Targeted=3, Moderate=4, Restrictive=5, Precautionary=6, Nationalize=7 (with variant aliases like "Light-touch regulation").
- Timeline: Already here=1, 2-3 years=2, 5-10 years=3, 10-25 years=4, 25+ years or never=5.
- Risk: Overstated=1, Manageable=2, Serious=3, Catastrophic=4, Existential=5.

A string-variant matching bug on March 26 caused all scores to return null for the Plot view because RDS had stored values like "Targeted regulation" and "Within 2-3 years" that the initial lookup missed. This was fixed by adding variant aliases to the score maps.

**The in-practice reality:** most entities' scores still come from the text-label fallback, because most entities were created by enrichment scripts that wrote directly to entity belief fields, not through the submission flow. The weighted-average system works well for entities that have received crowdsourced submissions, but that's a minority of the dataset.

## AGI definitions and embedding space

The AGI Definitions visualization extracts agi_definition claims from the Neon claims-pilot branch, deduplicates to the highest-confidence claim per entity (tie-breaking on latest date), and runs a 6-step pipeline:

1. Query agi_definition claims + entity metadata from Neon.
2. Deduplicate: one claim per entity (highest confidence, then latest date).
3. Embed definitions with Voyage AI `voyage-3` model (rate-limited: 3 RPM free tier, batches of 64 with 22-second delays).
4. Project to 2D with UMAP (`umap-js` library).
5. Classify each definition into one of 8 fixed clusters via Claude Haiku.
6. Write `agi-definitions.json`.

The 8 clusters were hand-designed based on a review of how stakeholders in the dataset actually define AGI:

- Human-Level Cognitive Parity (matching human performance across cognitive tasks)
- Economic Work Automation (performing most economically valuable work)
- Autonomous Research (independent scientific research)
- Superintelligent Systems (surpassing human intelligence, recursive self-improvement)
- General-Purpose Agents (flexible, adaptable AI for diverse tasks)
- Transformative Impact (reshaping society/economy/power)
- Conceptual Critique (questioning/rejecting the AGI framing)
- Augmentative Tools (enhancing human capabilities rather than replacing)

Classification is done by sending each definition to Haiku with a system prompt listing all 8 categories with descriptions. The first run covered 240 entities; a rerun on May 3 covered 372. The UMAP projection uses default parameters, and cluster assignments are purely semantic (no spatial clustering on the 2D projection).

**Honest note on this feature:** the AGI definitions come from the claims pipeline, which means they inherit whatever quality issues exist in that data. Some definitions are verbatim quotes from public statements, others are paraphrased by the enrichment LLM, and a few may be hallucinated. The embedding space looks clean because UMAP tends to produce visually coherent projections even from noisy data.

## External APIs

| Service                                              | Purpose                                                                         | Cost model                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------- |
| Anthropic Claude (Haiku 4.5, Sonnet 4, Opus 4.5/4.6) | Submission quality review, semantic search, enrichment extraction, verification | Per-token                                |
| Exa (`exa-js`)                                       | Web search for enrichment evidence, entity discovery, claim sourcing            | Per-query                                |
| Voyage AI (`voyage-3`)                               | Text embedding for AGI definitions                                              | Per-token (free tier: 3 RPM)             |
| Photon/Komoot geocoding                              | Location search in contribute forms                                             | Free, no key                             |
| Bluesky AT Protocol                                  | Handle autocomplete in contribute forms                                         | Free, no key                             |
| Wikipedia REST API                                   | Thumbnail caching for entity images                                             | Free, no key (rate-limited aggressively) |
| Google Favicons                                      | Org logo fallbacks in thumbnail pipeline                                        | Free, no key                             |

API cost tracking follows the process in `docs/api-cost-tracking.md`: measure actual data before estimating, run 10-20 diagnostic calls, present buffered estimate (1.5-2x) before full runs, and log actuals vs. estimates after.

## Database structure

The production database has 6 tables across two Neon branches.

**Production branch (4 core + 2 auxiliary):**

- `entity`: unified people/organizations/resources with belief fields, weighted-average aggregates, search vector, qa_approved gate, field_verification JSONB.
- `submission`: mirrors entity fields as flat columns, plus submitter identity, relationship type, ordinal scores, LLM review JSONB (column exists but auto-review is not actively used; proved not useful enough to justify the latency), and review status.
- `edge`: source_id/target_id/edge_type with role, is_primary, evidence. Unique constraint on (source_id, target_id, edge_type).
- `contributor_keys`: API key auth for trusted batch submitters (SHA-256 hash, daily rate limit).
- `field_feedback`: per-field confirm/flag voting with voter dedup via SHA-256(IP+clientId+salt).
- `field_notes`: per-field correction notes with TipTap HTML and @mentions.

**Claims-pilot branch (6 additional):**

- `source`: URL-based sources with cached excerpts.
- `claim`: per-entity belief claims with citations, confidence, and extraction metadata.
- `edge_evidence`: source attribution for edges with dates and dollar amounts.
- `entity_suggestion`: discovered entities pending review with duplicate detection.
- `edge_discovery`: candidate edges with multi-stage status lifecycle.
- `entity_alias`: known abbreviations mapped to canonical names.

Triggers: `update_entity_search()` auto-computes tsvector on entity changes; `before_submission_update()` creates entities when submissions are approved; `after_submission_update()` recalculates weighted scores.

## Submission processing pipeline

1. **Client:** User fills out PersonForm/OrganizationForm/ResourceForm. Auto-save to localStorage every 500ms. Duplicate detection via client-side search as user types. Relationship pill (self/connector/external) determines submission weight. Hidden `_hp` honeypot field for bot detection.

2. **POST /api/submit:** Honeypot check (bots get a fake 200). Validation. Field length limits (100KB). Optional contributor key auth. Anonymous rate limiting (10/hour/IP, in-memory per Cloudflare isolate). Score mapping from text labels to ordinals. INSERT into submission with `status='pending'`. **Note:** The code has an async LLM quality review path via Claude Haiku 4.5 (stores result in `llm_review` JSONB), but it's effectively not used; the review wasn't useful enough to justify the added latency and cost. The column and code remain but are dead weight.

3. **Admin review (/admin):** Approve (triggers entity creation via DB trigger, generates slug, refreshes map data on R2), reject, merge (cherry-pick fields from edit submissions), or direct entity update/delete.

4. **Map data regeneration:** On admin action, queries all `status='approved' AND qa_approved=true` entities, computes source types, maps to frontend schema, pre-computes D3 force simulation positions (normalized to [0,1]), splits into skeleton + detail, uploads to R2 with `max-age=60`.

## Visualization design decisions

**Why D3.js:** D3 was chosen from day one for its modular force simulation with custom forces (the `forceCluster` function was present in the first commit). The force layout, zoom/pan, scales for scatter plots, and drag behaviors compose well. No alternative libraries were seriously considered. On mobile (<768px), D3 is skipped entirely in favor of a card-based directory, because D3 nodes were ~8px versus the 44px minimum for touch targets.

**SVG to Canvas migration:** As the entity count grew to ~1,500 nodes + 3,600 edges, SVG created 10,000+ DOM elements that re-rasterized on every pan/zoom transform, capping frame rate at ~53fps. The Canvas migration (`af59edf`, April 17) moved to a single `<canvas>` with `d3.quadtree` for O(log N) hit-testing, pre-rasterized image sprites via offscreen canvas, and a per-node `_visualState` model replacing SVG CSS transitions. Results: 53fps to 60fps, 10,000+ DOM elements to 1, heap from ~33MB to 28MB. The Plot view stayed SVG until May 2.

**Orbital cluster layout:** Categories are placed at equal angles around a circle, but the ordering is determined by a greedy nearest-neighbor algorithm that counts inter-category connections and places the most-connected categories adjacent. Frontier Lab and AI Safety end up near each other because researchers move between them; Think Tank/Policy Org sits near Government/Agency because of lobbying relationships. The orbit radius is dynamic, scaling with category count and wider for belief dimensions than for categories.

**Belief encoding:** The cluster-by dropdown was replaced on April 3 with an opacity-based AI Belief panel. Instead of switching between 4 different color schemes (which confused users), beliefs are shown as an opacity overlay on the always-present category coloring. Opacity is evenly spaced from 1/n to 1.0 across the ordered values of each dimension.

**Color palette:** Iterated from hand-picked earth tones to RColorBrewer Set3 to RColorBrewer Paired (current), all within a single day on March 31. Paired provides more contrast between categories. Belief dimension gradients use warm gold-to-brown (stance), blue (timeline), and red (risk) sequential palettes.

**Performance timeline:** Pre-canvas optimizations included debounced resize, split map-data.json into skeleton + lazy-loaded detail (392KB to 142KB gzipped, 63.9% reduction), and D3 damping tuning. Post-canvas: hot path optimization (pre-compute colors and text widths), persistent sprite cache surviving across render() calls, parallel HTTP/2 sprite loading sorted by viewport distance, and simulation calming (alphaDecay 0.04 to 0.07, velocityDecay 0.6 to 0.78).

**The D3 defer outage (April 9):** Adding `defer` to the D3 CDN script tag caused the map to render as a blank page for ~50 minutes. The inline `<script>` block calls `d3.select()` during HTML parsing, before the deferred D3 library loaded. This is why we have a permanent rule: never add `defer` or `async` to the D3 script tag while `map.html` uses inline code.

## Known issues and honest assessments

**Hallucination residue:** The early enrichment pipeline (enrich-deep.js, March 28) wrote unsourced LLM-generated facts to ~300+ entities before the qa_approved gate existed. While subsequent QC passes and verification pipelines have caught many issues, the notes fields on early-enriched entities may still contain hallucinated content that hasn't been manually reviewed. The verification pipeline (beliefs-1-opus, edges-1-opus, notes-1-opus) has been run across most entities, but coverage is not 100%.

**Claims-pilot branch gap:** 5,835 sourced claims and 8,254 sources live on the claims-pilot Neon branch, not the production branch. The frontend reads claims data from R2 (served from the claims-pilot export), but the production database schema has no claims or source tables. This means admin actions (approve/reject/merge) don't interact with the claims system at all.

**Scoring system limitations:** Most entity scores come from the text-label fallback rather than weighted submission averages, because most entities were enrichment-created rather than submission-created. The weighted system works as designed for the ~200 entities with crowdsourced submissions; the other ~1,500 have scores derived from LLM-assigned labels.

**Entity count accuracy:** The site has referenced various counts at various times (1,695 after Connor's audit, ~1,700+ in later phases). The actual number of entities visible on the map depends on how many pass the `qa_approved AND status='approved'` filter, which changes as the admin processes submissions and reviews enrichment output.

**Model version churn in scripts:** Scripts reference `claude-3-haiku`, `claude-haiku-4-5`, `claude-sonnet-4`, `claude-sonnet-4-6`, and `claude-opus-4-5`/`4-6` depending on when they were written. Some have been updated, others still reference older model IDs.

**RDS ghost:** Despite the April 28 Neon cutover, some scripts still reference the RDS connection string, S3 buckets, and CloudFront URLs. The legacy AWS infrastructure is warm for rollback but creates confusion when running older scripts.

## Roadmap

### Active workstreams (as of June 2026)

**Verification:**

- Building a crowdsourced verification website (dev branch: `manual-verification.mapping-ai.pages.dev/verify`, key `dev-verify-key-2026`).
- Improving the automated verification harness: prompt engineering, pipeline scripts, coverage expansion.

**Features:**

- LLM-powered search or chatbot for the map (existing branch, not yet merged).
- Loading speed improvements, particularly for the Research Insights page.
- General bug discovery and triage.

**Product (Sophia and Anushree):**

- This methodology page (internal design decision log + external public-facing page).
- Codebase cleanup and updated documentation (detailed `DATABASE.md`).
- Merge the contribution flow with a more general-audience user experience (combining `/contribute` with a `/user` flow).

**Outreach and sustainability:**

- Rehoming outreach to potential sponsors (Alor reaching out to Cas, Andrew, others).
- Funding sheet with small grants tracking.

### Medium-term

- Merge claims-pilot tables to production branch and integrate with admin flow.
- Build audit log table to track all DB mutations (approve/reject/merge/edit/delete) with revert capability.
- Migrate `map.html` inline code to React component (Phase 3 of the architecture plan).
- Eliminate the TipTap legacy esbuild bundle once map is fully React.
- Add automated entity/edge count smoke tests to the deploy pipeline.
- Surface temporal edge data (start/end dates, dollar amounts) in the visualization.
- Retire legacy AWS infrastructure (RDS, Lambda, S3, CloudFront).

### Longer-term

- Per-claim provenance tracking in the production schema.
- Automatic re-enrichment pipeline that refreshes stale data on a schedule.
- Open API for programmatic access to the dataset.
