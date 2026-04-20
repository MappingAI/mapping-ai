---
date: 2026-04-20
topic: contributor-enrichment-keystones
status: superseded-by-enrichment-skill-2026-04-20
---

# Contributor Enrichment Keystones: Provenance, Preview, Schema Registry

> **Superseded 2026-04-20.** User redirected scope to a Claude Code skill + supporting scripts as the pragmatic first build. Full skill brainstorm lives at `docs/brainstorms/2026-04-20-enrichment-skill-requirements.md`. The three keystones (provenance, ephemeral preview, schema registry) remain valid as a future bundle when contribution volume justifies them, but are not in the current build scope.

Three architectural foundations that unblock the long-term enrichment vision. See `docs/ideation/2026-04-20-contributor-enrichment-toolkit-ideation.md` for the broader survivor set (shells, trust tiers, adjacent-entity queue) that depends on these keystones.

## Problem Frame

The mapping-ai project today accumulates entity data from Exa-enriched LLM work and human contributors, but the data carries no source trail, changes go straight to production, and every contributor path reinvents its own schema assumptions. Three failure modes result:

1. **Unsourced claims** — every assertion on the map is a "trust us" statement. There's no way for a viewer to check where a belief rating or affiliation came from, and no way for a reviewer to re-verify a claim six months later. This caps how credible the graph can become.
2. **Prod is the only environment** — contributors (especially agents working at enrichment scale) either submit through the form and hope, or bypass it with direct SQL against production. There is no safe playground. The D3 defer and SAM drift outages (April 2026) confirm this is load-bearing.
3. **Schema drift** — 55+ scripts, the `/submit` Lambda, the `export-map.js` field mapping, React forms, and future CLI/MCP tooling each carry their own copy of column names, enum values, and edge-type vocabulary. The Stephen Clare / Carina Prunkl workflow (2026-04-19) hit four drift bugs in a single afternoon: sequence desync on `edge_pkey`, `qa_approved` forgotten, `notes` vs `notes_html` divergence, and `author` vs `authored_by` edge-type redundancy.

The keystones address these three failures as a bundle because each one makes the next one cheaper. Without them, every downstream capability (shared lib, CLI, MCP, batch review UI, trust tiers, public API) inherits the same rot.

## Requirements

### Per-field provenance (R1–R6)

- **R1.** Every user-visible claim on an entity (category, title, primary org, location, social handles, belief stance/timeline/risk, notes, thumbnail) carries structured provenance: one or more sources (URL + snippet + retrieved_at + retriever identifier), a confidence rating (1–5), a verifier identifier, a verification timestamp, and the prompt/pipeline version that produced the claim.
- **R2.** On the public entity detail panel, each visible field shows its source(s) on click or hover (Wikipedia-style citations). If the field has no provenance yet, it shows an unobtrusive `[unsourced]` chip instead of a fabricated citation.
- **R3.** On the admin review panel, every submission surface shows full provenance alongside the proposed value: the retrieved_at timestamp, retriever identity (contributor key or agent session), raw source snippets, and the LLM classification reasoning if the claim came from a Haiku classifier.
- **R4.** Provenance is queryable: "show me every claim citing this URL", "show me claims older than six months", "show me fields with confidence < 3". Back-propagates into a future re-verification workflow.
- **R5.** Field-level writes are idempotent and reproducible: given the same sources + same classifier prompt version, a re-enrichment run produces an identical claim value.
- **R6.** Existing entities (~1,700 rows as of 2026-04-20) are re-enriched through the new pipeline as part of pre-public-launch work so the public map launches with a fully-sourced graph. Partial / interrupted re-enrichment runs must be resumable.

### Ephemeral preview environment (R7–R11)

- **R7.** When a contributor (human or agent) submits an enrichment, an ephemeral preview is generated automatically. The preview shows the map and entity detail panels _as they would appear if this submission were approved_, including newly-derived edges and recomputed weighted belief aggregates.
- **R8.** The preview is reachable via a shareable URL that stays live until the underlying submission is approved, rejected, or explicitly dismissed; no long-lived staging environment state persists beyond open submissions.
- **R9.** A submission groups all related writes from one contributor action (new entity + its affiliations + its mentions of new adjacent entities) into a single reviewable "batch" so the preview reflects the full proposed change, not a fragment.
- **R10.** Contributors see their own previews and can iterate (amend + regenerate) before marking a batch ready for human review.
- **R11.** The preview environment reuses production's schema + most recent `map-data.json` snapshot; it does not require a separately-maintained staging database.

### Admin review UI tied to preview (R12–R14)

- **R12.** Admin reviewers see a queue of ready-for-review previews. Each queue item exposes a keyboard-navigable diff (`j/k` for next/prev submission, `a/r` for approve/reject, per-field `y/n` for field-level accept) with source citations, LLM reasoning, and the preview URL inline.
- **R13.** Every promotion from preview to prod is human-reviewed (no auto-approval in v1 of this bundle; trust tiers are an explicit follow-on). A single click approves a batch; rejection requires a short reason captured in the submission record.
- **R14.** After approval, the submission replays against production through the existing `/submit` + trigger pipeline; `map-data.json` regeneration and CloudFront invalidation remain automated as they are today via `api/admin.js`.

### Schema registry + generated types (R15–R18)

- **R15.** A single committed registry artifact (YAML or TS) is the source of truth for: entity and edge columns; enum values (person/org categories, belief stances, AGI timelines, AI risk levels, edge types, submission statuses); DB-column → frontend-field mapping; validation rules; and display labels.
- **R16.** TypeScript types generate from the registry. `/submit`, `/admin`, `api/export-map.js#toFrontendShape()`, React forms (`PersonForm`, `OrganizationForm`, `ResourceForm`), and all future CLI/MCP code import the generated types and fail at build/type-check time on drift.
- **R17.** A `GET /schema` endpoint returns the live registry as JSON so external agents (including Claude Code tool-use) can self-introspect the current data model without carrying stale assumptions across sessions. OpenAPI and semantic-web publication are explicit non-goals for this bundle.
- **R18.** Schema changes land in a single commit that updates the registry, regenerates types, and updates all consumers. No partial migrations.

## Success Criteria

- **SC1.** A reviewer inspecting any entity on the public map can reach the original source for every field in ≤2 clicks.
- **SC2.** An agent session can run `GET /schema` once, stay correct for the whole session, and never produce a write that fails validation because of a stale schema assumption.
- **SC3.** A contributor (or agent) submitting an enrichment gets a shareable preview URL reflecting their proposed change in < 60 seconds. The preview includes the map re-rendered with the proposed edges.
- **SC4.** A human admin can review and approve/reject 20+ submissions in 5 minutes via the keyboard-driven review UI, without opening additional tools.
- **SC5.** The full ~1,700-entity re-enrichment pass completes before public launch with tracked Exa + Claude spend, ≥70% reviewer-sampled accuracy, and no entity left with `[unsourced]` claims on its primary fields.
- **SC6.** Introducing a new entity column or enum value requires editing exactly one file; all consumers update automatically via codegen.

## Scope Boundaries

**In scope for this bundle:**

- Per-field provenance data model, write path, read path, public citation UI, admin provenance surfaces
- Ephemeral preview infrastructure (AWS + routing + lifecycle)
- Admin review UI redesign (batch diff + keyboard nav + per-field accept)
- Schema registry file, type generation, `/schema` endpoint, and migration of all current consumers
- Pre-launch mass re-enrichment of ~1,700 existing entities

**Explicit non-goals (separate brainstorms):**

- Shared `scripts/lib/` toolkit + `mapctl` CLI + `mapping-ai-mcp` MCP server + Claude Code `/enrich` skill — downstream consumers of these keystones; deserve their own brainstorm.
- Adjacent-entity suggestion queue (surfaces Inria, Oxford IEAI, Mila duplicates) — compounding-feedback feature that depends on provenance.
- Entity versioning / time-travel UI + field-level revert — depends on provenance but is its own product surface.
- Contributor trust tiers, circuit breakers, auto-approval, quality-gated auto-pause — layered on top of the human-review v1 primitive.
- Contributor dashboard + public REST API docs at `/docs/api/` + OpenAPI publication — downstream of schema registry.
- Semantic-web / RDF / Schema.org federation with Wikidata.
- Auto-derived edges from `@mentions` in `notes_html` — acceptable only when review-gated; folded into the future adjacent-entity queue brainstorm.

## Key Decisions

- **Public provenance = Wikipedia-style citations on detail panels, not admin-only or confidence-badge-only.** Makes the graph a credible research tool, not a trust-us visualization. Public-facing citations also shape contributor incentives (visible sources reward rigorous enrichment).
- **Staging = ephemeral preview per batch, not an always-on parallel environment.** Matches the Vercel/Cloudflare Pages preview-deployment pattern, avoids staging-drift from always-on environments, and scales per-contribution without ongoing AWS cost.
- **Promote = always human-reviewed via keyboard-driven batch UI.** Keeps the v1 primitive simple and safe. Trust tiers and auto-approval are a separate, layered decision once volume justifies it.
- **Schema registry = internal types + `/schema` JSON endpoint; no OpenAPI / RDF in v1.** Focus the scope on the project's own tooling. Public programmatic API (OpenAPI) and federation (RDF) are valuable but speculative; defer until a concrete external consumer exists.
- **Legacy data = mass re-enrichment pass before public launch, not lazy upgrade or synthetic stubs.** The user chose the highest-effort, highest-credibility option. Launches with every existing claim sourced.

## Dependencies / Assumptions

- Existing `/submit` Lambda and contributor-key system (`mak_<32hex>`, daily rate limits, Haiku quality review) remain the canonical write path. All new work extends rather than replaces them.
- The AWS account can support the preview infrastructure (additional CloudFront distributions, Lambda concurrency, and short-lived routing); budget impact is expected to be modest since previews are ephemeral.
- `docs/enrichment-v2-design.md` unimplemented specs (notes_confidence, notes_sources, enrichment_version) are absorbed and superseded by R1–R6 of this bundle rather than implemented separately.
- Credential-leak post-mortem (2026-04-18) discipline holds: `process.env.DATABASE_URL` only, no hardcoded credentials in any script or generated file.
- Workshop-overwrite post-mortem (2026-04-18) discipline holds: every write path reads current state first and never blind-overwrites a field an agent didn't author.

## Outstanding Questions

### Resolve Before Planning

_(none — all blocking product decisions resolved in this brainstorm)_

### Deferred to Planning

- `[Affects R1][Technical]` Per-field provenance shape: sibling `entity_fact` table keyed by `(entity_id, field_name)` vs. `provenance` JSONB column on `entity` vs. dual-write hybrid. Affects read performance of the map skeleton and query ergonomics for R4.
- `[Affects R7][Technical][Needs research]` Preview environment mechanism: CloudFront-function-based routing with dynamic `map-data.json` composition, vs. short-lived isolated S3 prefix + CloudFront distribution per preview, vs. a single preview Lambda that composes the map JSON on-demand. Cost, complexity, and cold-start profiles differ significantly.
- `[Affects R7]` Batch grouping heuristic: auto-group all submissions from one contributor key within a time window, vs. require explicit "start batch / end batch" markers, vs. treat every `/submit` call as its own batch.
- `[Affects R15][Technical]` Registry format: single hand-edited YAML, vs. TS-as-source-of-truth with JSON emit for `/schema`, vs. Postgres introspection at build time as ground truth. Affects how painful schema edits feel.
- `[Affects R6][Needs research]` Re-enrichment cost and quality bounds: ~$100–200 estimate from enrichment-v2-design assumes Exa pricing circa 2025 and Haiku pricing circa 2025; re-validate at current rates and against the current entity categories, and confirm the 70% sampled-accuracy gate from enrichment-v2-design still holds.
- `[Affects R12]` Admin UI host: extend current `admin.html` (React) vs. spin up a dedicated reviewer route. Affects keyboard nav / focus management complexity.
- `[Affects R14]` Preview lifecycle edge cases: what happens to an open preview URL when the underlying entity is merged or deleted in prod? When the contributor submits a second batch that overlaps with an open batch?
- `[Affects R2]` `[unsourced]` chip UX treatment: subtle inline, tooltip on hover, or a "sources: 0" counter — pick during design review.

## Next Steps

→ `/ce:plan` for structured implementation planning of the keystone bundle.
