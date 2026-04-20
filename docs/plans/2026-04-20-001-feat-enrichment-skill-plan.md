---
title: 'feat: Mapping-AI enrichment skill + scripts + provenance columns'
type: feat
status: active
date: 2026-04-20
origin: docs/brainstorms/2026-04-20-enrichment-skill-requirements.md
---

# feat: Mapping-AI enrichment skill + scripts + provenance columns

## Overview

Build a Claude Code skill at `.claude/skills/enrich/` (following the Anthropic docx SKILL.md pattern) plus a small, focused set of supporting scripts under `scripts/enrich/` that lets an agent or human drive the full enrichment pipeline end-to-end: search → Exa research → Haiku belief classification → validated draft → `/submit` → `/admin` auto-approve. An additive schema migration adds `notes_sources`, `notes_confidence`, and `enrichment_version` to `submission` and `entity` so every enrichment lands in the DB with durable provenance (rendering those citations on the public map stays deferred to the keystone bundle).

The motivating workflow is the Stephen Clare + Carina Prunkl + IASR enrichment on 2026-04-19, which took ~30 manual steps and hit four separate schema-drift bugs. The goal is to compress that workflow to ≤5 tool calls and make the drift bugs structurally impossible.

## Problem Frame

See origin: `docs/brainstorms/2026-04-20-enrichment-skill-requirements.md` § Problem Frame.

Today's enrichment pipeline has three recurring failure modes: schema drift (sequence desync, `qa_approved` forgotten, `notes` vs `notes_html` divergence, redundant edge types), unsourced claims (no durable trail of where a belief rating came from), and surface sprawl (55+ one-off scripts with heavy overlap, each inventing its own INSERT SQL). This plan addresses all three at the skill + scripts + minimal-schema-addition level without building the larger keystone infrastructure (ephemeral preview environment, public citation UI, full schema registry) that would otherwise compete for the same window.

## Requirements Trace

Traced directly to requirement IDs in the origin document.

- **R1–R4 (Skill surface)** → Units 5 + 6
- **R5–R7 (Exa MCP integration + sources captured in submission)** → Units 1 + 3
- **R8–R10 (Supporting scripts + lib/)** → Units 2 + 3 + 4
- **R11–R13 (Write path via /submit + admin auto-approve, dry-run, validation)** → Units 1 + 4
- **R14–R15 (Schema additions + notes/notes_html sync)** → Unit 1 + Unit 2
- **R16–R18 (Read-before-write, transcript summary, destructive-op confirmation)** → Unit 5 (baked into SKILL.md) + Unit 4 (confirm flag in submit.js)

Success criteria from the origin doc:

- **SC1** (single-turn draft with sources + beliefs + edges) → Unit 3 + Unit 5
- **SC2** (Clare/Prunkl workflow ≤5 tool calls) → Unit 6 verification
- **SC3** (scripted re-enrichment loop over ~1,700 entities) → Unit 4 supports headless mode
- **SC4** (drift bugs can't recur) → Unit 2 centralizes enum + sequence + notes-sync logic
- **SC5** (works with or without Exa MCP) → Unit 3
- **SC6** (admin review sees sources + queries) → Unit 1 (schema) + Unit 5 (references/schema.md documents the shape)

## Scope Boundaries

**In scope:**

- `.claude/skills/enrich/SKILL.md` + `references/` directory
- `scripts/enrich/*.js` + `scripts/enrich/lib/` shared module
- Additive migration: three new columns on `submission` and `entity`
- `api/submit.js` extended to accept and persist the new columns
- `api/admin.js` approve path propagates the new columns to `entity`
- `api/export-map.js#toFrontendShape()` exposes the new fields in `map-detail.json` (same commit as schema per the CLAUDE.md field-mapping rule)

**Explicit non-goals (origin § Scope Boundaries):**

- Rendering source citations on the public map's entity detail panel (data written in v1, UI deferred)
- Ephemeral preview environment per batch
- Full schema registry with TS codegen + `/schema` endpoint
- Per-field provenance with a separate `entity_fact` table
- Entity versioning / time-travel
- Contributor trust tiers, circuit breakers, auto-approve rules, public API docs
- OpenAPI/RDF publication
- Migrating legacy `scripts/enrich-*.js` / `scripts/seed-*.js` to the new pattern
- CLI or MCP-server wrapper around the same lib

## Context & Research

### Relevant Code and Patterns

- **Origin requirements doc:** `docs/brainstorms/2026-04-20-enrichment-skill-requirements.md`
- **Ideation doc:** `docs/ideation/2026-04-20-contributor-enrichment-toolkit-ideation.md`
- **Anthropic docx skill reference:** `https://github.com/anthropics/skills/blob/main/skills/docx/SKILL.md` — canonical shape for rich-description + references/ + scripts/ skill layout.
- **Existing `/submit` contract:** `api/submit.js` — camelCase field extraction, belief-score enum maps, contributor-key validation (`mak_<32hex>`), anon IP rate limit, honeypot, Haiku review dispatch.
- **Existing `/admin` approve path:** `api/admin.js` § `action === 'approve'` (line 200) — accepts `submission_id` + optional `data` overrides, sets `status='approved'` which triggers the DB `before_submission_update` function that inserts the entity row, then calls `refreshMapData(client)` which regenerates `map-data.json` and invalidates CloudFront.
- **Existing additive-migration pattern:** `scripts/migrate.js:160` § "Schema migrations (safe ADD COLUMN for existing tables)" — `ALTER TABLE … ADD COLUMN IF NOT EXISTS …` idiom. Run via `npm run db:migrate`.
- **Existing column-to-frontend mapping:** `api/export-map.js#toFrontendShape()` — load-bearing mapping from DB snake_case to frontend field names; schema changes without updating this break the map silently (CLAUDE.md).
- **Existing thumbnail-cache pattern for external URLs:** `scripts/cache-thumbnails.js#reCacheExternalUrl` — downloads an external image URL to S3 under `thumbnails/<type>-<id>.<ext>`, reused by the new pipeline when an enrichment populates `thumbnailUrl` from a remote source.
- **Existing fuzzy-match helper:** `scripts/lib/org-matching.js` — the only pre-existing extracted shared module; the new `scripts/enrich/lib/match.js` should reuse or mirror its approach for person/resource name matching.
- **Existing contributor-key infrastructure:** `api/submit.js` § `CONTRIBUTOR_KEY_REGEX` (`mak_[a-f0-9]{32}$`), `scripts/generate-contributor-key.js`, `scripts/revoke-contributor-key.js`. Daily limit default is 20 per key; new work should mint a dedicated team enrichment key with a higher limit.
- **Existing belief-score enum mappings:** `api/submit.js:38` § `STANCE_SCORES`, `TIMELINE_SCORES`, `RISK_SCORES`. New `scripts/enrich/lib/schema.js` should import or re-export these so the scores stay synchronized across surfaces.
- **Existing live admin refresh function:** `api/admin.js#refreshMapData(client)` — regenerates `map-data.json` via shared module, uploads to S3, invalidates CloudFront. The skill relies on this existing behavior and does not reimplement it.
- **Existing Vitest setup:** `src/__tests__/` contains `smoke.test.ts`, `lib/search.test.ts`, `components/*.test.tsx`. No existing tests for `api/*.js` Lambdas; new tests for enrichment scripts will follow the `src/__tests__/lib/` pattern.

### Institutional Learnings

From `docs/solutions/` and `docs/post-mortems/` via the learnings search during brainstorming:

- **Credential-leak post-mortem (2026-04-18, `docs/post-mortems/2026-04-18-workshop-overwrite-and-credential-leak.md`)**: `scripts/migrate-to-rds-new-schema.js` hardcoded the RDS URL and leaked it via public GitHub. The new enrichment scripts must use `process.env.DATABASE_URL` / `ADMIN_KEY` / `CONTRIBUTOR_KEY` exclusively and never hardcode creds. Applies to every script in Units 2-4.
- **Workshop-overwrite post-mortem (same file)**: a subagent replaced a teammate's file instead of merging. The skill's edit path must fetch current entity state, compute a field-level diff, and only submit fields the caller has opted to change. Applies to Unit 5 (SKILL.md read-before-write paragraph).
- **D3 defer outage (2026-04-09, `docs/post-mortems/2026-04-09-d3-defer-map-outage.md`)**: no staging environment exists. Reinforces why the skill uses the existing `/submit` + `/admin` approval pipeline (which already auto-regenerates `map-data.json`) rather than direct SQL; the admin-approval trigger is the only safe re-regeneration path.
- **Enrichment-v2-design (unimplemented, `docs/enrichment-v2-design.md`)**: specs `notes_confidence`, `notes_sources`, `enrichment_version` columns plus 70%-accuracy verification sampling with auto-pause. This plan implements the column additions; the verification-sampling auto-pause is deferred to a future trust-tiers bundle.

### External References

- **Anthropic docx skill (`SKILL.md`):** https://github.com/anthropics/skills/blob/main/skills/docx/SKILL.md — the reference shape. Key observations: (1) the `description:` frontmatter is rich with trigger phrases and explicit negatives (`Do NOT use for …`), (2) the SKILL.md body stays short and task-oriented with a Quick Reference table near the top, (3) complex logic lives in `scripts/` utilities called out by the SKILL.md rather than inlined, (4) progressive disclosure via numbered task sections that each reference scripts or raw examples.
- **Anthropic "Complete Guide to Building Skills for Claude"** (user-provided reference): progressive disclosure, trigger-rich descriptions, concrete examples, no hardcoded credentials, preconditions checked at skill entry.

## Key Technical Decisions

- **Skill + scripts (not CLI, not MCP server).** The user explicitly chose this after exploring the alternatives. Claude Code already invokes skills natively; the Exa MCP plugin already covers research with its own auth. A new CLI or MCP server would duplicate existing infrastructure without materially better ergonomics.
- **Scripts live at `scripts/enrich/` (not inside `.claude/skills/enrich/scripts/`).** Two reasons: (a) they're reusable outside the skill (ad-hoc runs, scripted loops, future CI hooks), (b) they belong in first-class repo code tracked and reviewed by default, not buried under a skill directory. The docx skill puts scripts inside the skill, but that's because its scripts are doc-format-specific and of no use outside the skill; our scripts are general-purpose enrichment utilities.
- **Write path: `/submit` + `/admin` auto-approve, no direct SQL.** Preserves Haiku quality review, contributor-key rate-limit accounting, submission-table audit trail. Admin auto-approval makes latency comparable to direct writes while still triggering the existing `refreshMapData(client)` map regeneration.
- **Single-entry skill with operation hint in first tool call, not command-arg dispatch.** Claude Code routes skills by trigger phrases in the description; a single `/enrich` invocation with the agent selecting the operation in its first tool call is simpler than a multi-verb skill surface (resolves origin deferred Q#1).
- **Additive schema migration, not replacement.** Following `scripts/migrate.js`'s existing `ADD COLUMN IF NOT EXISTS` pattern. New columns: `submission.notes_sources JSONB`, `submission.notes_confidence SMALLINT`, `submission.enrichment_version TEXT`, plus identical columns on `entity` populated by the `after_submission_update` trigger.
- **`notes_sources` shape with per-claim fields.** Shape: `[{url, snippet, retrieved_at, retriever, field_name?, quote?, claim_date?, definition?}]`. The additional fields (added 2026-04-20 after feature brief on quote-level sourcing, definition-space viz, and sparklines) accommodate: `quote` = direct excerpt supporting the claim (distinct from `snippet` which is surrounding Exa context); `claim_date` = ISO date the speaker made the claim (distinct from `retrieved_at`); `definition` = free-text note on what the speaker meant (e.g., "economically valuable tasks" for an AGI timeline claim). Optional per entry — absence does not block a submission. Forward-compatible with the deferred per-field-provenance keystone (resolves origin deferred Q#2).
- **Exa MCP plugin detection at runtime.** `scripts/enrich/research.js` inspects the Claude Code session's tool registry at entry and uses Exa when the `mcp__plugin_exa_exa__web_search_exa` / `web_fetch_exa` pair is present; falls back to `WebSearch` + `WebFetch` otherwise. Detection is a capability probe, not a hard-coded name check — wildcard match on `mcp__*exa*web_search*` protects against plugin namespace shifts (resolves origin deferred Q#3).
- **Re-verification is a flag on `research.js`, not a separate script.** `research.js --mode=reverify --entity-id=…` fetches current entity state, re-runs Exa queries, and produces a diff-style draft rather than a greenfield one. Keeps the script count low (resolves origin deferred Q#4).
- **`scripts/enrich/lib/` re-exports from existing shared modules rather than re-implementing.** `lib/schema.js` re-exports `STANCE_SCORES` / `TIMELINE_SCORES` / `RISK_SCORES` from `api/submit.js`; `lib/match.js` re-exports or wraps `scripts/lib/org-matching.js`. Single source of truth (resolves origin deferred Q#5).
- **Destructive-op confirmation: `AskUserQuestion` when available, `--confirm` flag fallback.** For interactive Claude Code sessions the skill uses the platform's blocking question tool; for headless script runs (`scripts/enrich/submit.js --confirm`), an explicit flag is required for merges and deletes (resolves origin deferred Q#6).
- **`notes_html` is primary; `notes` derived via HTML-to-text on every write.** Centralized in `scripts/enrich/lib/api.js` so the two columns never drift again (R15).
- **Contributor key for the skill: a new, long-lived team key with elevated daily limit.** Minted via `scripts/generate-contributor-key.js` and stored as `CONTRIBUTOR_KEY` in `.env` alongside `ADMIN_KEY` and `DATABASE_URL`. The skill reads from env at invocation.

## Open Questions

### Resolved During Planning

- **Q1: Single-entry vs command-arg dispatch** → Single `/enrich` skill; agent picks operation in first tool call.
- **Q2: `notes_sources` shape** → Flat array with optional `field_name` per entry; forward-compatible with per-field provenance.
- **Q3: Exa MCP namespace stability** → Capability probe (`mcp__*exa*web_search*`), not hard-coded tool name.
- **Q4: Re-verification script shape** → `--mode=reverify` flag on `research.js`, not a separate script.
- **Q5: lib/ re-exports from existing modules** → Yes, explicitly. `lib/schema.js` pulls enums from `api/submit.js`; `lib/match.js` wraps `scripts/lib/org-matching.js`.
- **Q6: Destructive-op confirmation UX** → `AskUserQuestion` when available; `--confirm` flag for headless.

### Deferred to Implementation

- **Exact migration method:** whether to run the ADD COLUMN IF NOT EXISTS against prod via `npm run db:migrate` or via `sam deploy` triggering a one-shot Lambda — resolve during Unit 1 execution after reading `scripts/migrate.js`'s current runner pattern.
- **Haiku prompt exact wording for belief classification:** the brainstorm doc references `docs/enrichment-v2-design.md`'s prompt shape; the final prompt gets tuned during Unit 3 with a small accuracy pilot before going into the repo.
- **Exa query templates:** draft templates land in `.claude/skills/enrich/references/exa-queries.md` during Unit 5, but precise wording is settled after Unit 3's research-loop shape is stable.
- **Smoke-test entity selection for Unit 6:** picking a known AI-policy figure who is not already in the DB and not already enriched elsewhere — selection happens during Unit 6 execution once the pipeline is ready.
- **Whether `/admin` approve should accept the new source fields as `data` overrides:** needed if the reviewer wants to amend sources during approval; defer until we see the admin UI flow in practice.

## High-Level Technical Design

> _This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce._

### Pipeline shape (directional)

```text
agent or human invokes /enrich <seed> with operation hint
  │
  ▼
.claude/skills/enrich/SKILL.md — routes by operation
  │
  ▼
scripts/enrich/research.js                      ← searches DB first (lib/api.js#search)
  │                                                if duplicate found + no override → refuse
  ▼
[Exa MCP detected? ──yes──► mcp__plugin_exa_exa__web_search_exa (+ web_fetch_exa)
                   └──no───► WebSearch + WebFetch fallback]
  │
  ▼
Haiku classifier (lib/classify.js)              ← maps raw evidence to enum values
  │                                                (STANCE / TIMELINE / RISK / CATEGORY / EDGE_TYPE)
  ▼
draft submission object                          ← camelCase, matches /submit contract
  │                                                includes notesSources[], notesConfidence, enrichmentVersion
  ▼
scripts/enrich/validate.js                      ← schema-checks against lib/schema constants
  │                                                fails loudly on unknown enum / missing required field
  ▼
[--dry-run? ──yes──► return draft + payload, no write]
  │
  ▼
scripts/enrich/submit.js
  │   POST /submit { data: draft, X-Contributor-Key }    ← creates pending + Haiku quality review
  │   POST /admin { action: "approve", submission_id }    ← triggers entity creation + refreshMapData
  ▼
return { submission_id, entity_id, summary }    ← surfaced to caller transcript
```

### Skill layout (directional)

```text
.claude/skills/enrich/
├── SKILL.md                          # short body, rich frontmatter description
└── references/
    ├── schema.md                      # entity columns, enum values, edge types
    ├── belief-rubric.md               # how to classify stance/timeline/risk from evidence
    ├── exa-queries.md                 # query templates per entity type
    └── workflow.md                    # operation recipes: seed / enrich / edge / merge / verify

scripts/enrich/
├── research.js                        # Exa + WebSearch + Haiku → draft
├── validate.js                        # schema/enum validator
├── submit.js                          # /submit + /admin approve + dry-run
└── lib/
    ├── schema.js                      # enum constants (re-exported from api/submit.js)
    ├── db.js                          # optional direct DB reader for duplicate checks
    ├── api.js                         # /submit + /admin HTTP client with keys
    ├── classify.js                    # Haiku-powered belief/category/edge classification
    └── match.js                       # fuzzy name match (wraps scripts/lib/org-matching.js)
```

## Implementation Units

- [ ] **Unit 1: Additive schema migration + API contract extension (single atomic commit)**

**Goal:** Add `notes_sources`, `notes_confidence`, `enrichment_version` columns to `submission` and `entity`; extend `/submit` to accept them; extend `/admin` approve path to propagate them to `entity`; update `api/export-map.js#toFrontendShape()` to expose them in `map-detail.json`. Ship as one commit per the CLAUDE.md field-mapping rule.

**Requirements:** R11, R14

**Dependencies:** None (first unit).

**Files:**

- Modify: `scripts/migrate.js` (add three `ALTER TABLE … ADD COLUMN IF NOT EXISTS …` statements for each of `submission` and `entity` in the existing "Schema migrations" block near line 160)
- Modify: `api/submit.js` (accept `notesSources`, `notesConfidence`, `enrichmentVersion` from `data`; persist to submission row)
- Modify: `api/admin.js` (copy the three fields from submission to entity on approve; already-present trigger logic needs a small additive update)
- Modify: `api/export-map.js` (add the three fields to `DETAIL_FIELDS` set and `toFrontendShape()` so they appear in `map-detail.json`)
- Test: `src/__tests__/lib/enrichment-fields.test.ts` (validates camelCase → snake_case mapping and `toFrontendShape` output contains new fields when set)

**Approach:**

- Column definitions (directional, exact DDL during execution): `notes_sources JSONB`, `notes_confidence SMALLINT CHECK (notes_confidence BETWEEN 1 AND 5)`, `enrichment_version TEXT`
- `submission` columns populated by `/submit`; `entity` columns populated by the existing `before_submission_update` trigger on approval (trigger already copies `notes_html` etc. — extend the trigger to include the three new columns, in the same migration)
- `toFrontendShape()` must emit `notesSources`, `notesConfidence`, `enrichmentVersion` in `map-detail.json` so future UI work can render citations
- Deploy: `sam build && sam deploy --parameter-overrides …` to push the Lambda changes. Schema migration runs via `npm run db:migrate` against prod; since this is all additive with `IF NOT EXISTS`, re-runs are safe.

**Execution note:** Verify the existing `before_submission_update` trigger is edited in the same DB migration so the `entity` row gets the three new columns on approval. Without this, the submission rows carry sources but entity rows never get them.

**Patterns to follow:**

- `scripts/migrate.js:160` § "Schema migrations (safe ADD COLUMN for existing tables)" — the existing additive-migration idiom.
- `api/submit.js:38` § `STANCE_SCORES` — the existing enum-constant style for the new `notes_confidence` range check.
- `api/export-map.js` § `DETAIL_FIELDS` set — existing pattern for exposing lazy-loaded fields to the frontend.

**Test scenarios:**

- Happy path — `/submit` POST with `notesSources`, `notesConfidence`, `enrichmentVersion` in `data` persists to submission row (read back via `/search?status=pending` or a direct DB read in test harness).
- Happy path — `/admin` approve of a submission with the three fields set copies them onto the newly-created entity row.
- Happy path — `toFrontendShape()` on an entity with the three fields populated returns them under camelCase keys in `map-detail.json`.
- Edge case — `notes_confidence` outside the 1–5 range is rejected at the DB layer (CHECK constraint) or at the `/submit` validation layer with a clear error.
- Edge case — `notes_sources` with an empty array is accepted and round-trips as an empty array (not NULL).
- Edge case — absence of the three fields on a legacy submission (no-op) doesn't break existing flows; approval still works.
- Integration — running `npm run db:migrate` twice in a row is idempotent (no duplicate-column error thanks to `IF NOT EXISTS`).

**Verification:**

- `npm run db:migrate` runs cleanly.
- A `/submit` POST with the new fields + an `/admin` approve produces an entity with the three fields populated (verifiable via `/search` and a direct DB inspection).
- `map-detail.json` for that entity, when regenerated, contains the new fields.
- No existing test or build breaks.

---

- [ ] **Unit 2: `scripts/enrich/lib/` shared module**

**Goal:** Create the foundation module that every enrichment script and the skill consume. Centralizes enum constants, DB connection, `/submit` + `/admin` HTTP client, fuzzy match, and Haiku classifier dispatch.

**Requirements:** R8, R9, R10, R12, R15

**Dependencies:** Unit 1 (the `/submit` contract includes the new fields that `lib/api.js` will send).

**Files:**

- Create: `scripts/enrich/lib/schema.js` — re-exports enum constants from `api/submit.js`; exports edge-type canonical set with aliases; exports DB-column → frontend-field mapping helpers.
- Create: `scripts/enrich/lib/db.js` — optional direct DB reader (read-only, for duplicate checks and entity-state fetch) with safe sequence-reset helper if any future path needs it; always uses `process.env.DATABASE_URL`.
- Create: `scripts/enrich/lib/api.js` — `/submit` + `/admin` client with `X-Contributor-Key` header and `ADMIN_KEY` auth; `notes_html`-to-`notes` derivation happens here so the two columns never drift; dry-run mode returns payload without POST.
- Create: `scripts/enrich/lib/classify.js` — Haiku-powered belief/category/edge classification; imports prompt from `.claude/skills/enrich/references/belief-rubric.md` at runtime (read as string, sent to Anthropic SDK).
- Create: `scripts/enrich/lib/match.js` — wraps `scripts/lib/org-matching.js` and extends to person/resource fuzzy matching for duplicate detection.
- Create: `scripts/enrich/lib/index.js` — barrel export.
- Test: `src/__tests__/enrich/lib.test.ts` — exercises `api.js` dry-run payload shape, `schema.js` enum constants match `api/submit.js`, `match.js` fuzzy-match correctness on known duplicates (Mila 1053 vs 1113).

**Approach:**

- `lib/api.js` surfaces two methods: `submitDraft(draft, { dryRun })` and `approveSubmission(submissionId)`. Both use fetch + env vars. On non-dry-run, the combined call-and-approve is the canonical write primitive consumed by Unit 4.
- `lib/schema.js` is the single import point for all belief enums + edge types; if `api/submit.js` diverges, the shared file surfaces a type mismatch in tests.
- `lib/classify.js` accepts `{ entityName, entityType, evidenceText, sources }` and returns `{ regulatoryStance, evidenceSource, agiTimeline, aiRiskLevel, keyConcerns, confidence, reasoning }` — exact prompt tuned during Unit 3.

**Execution note:** Test-first for `lib/api.js` dry-run mode — it's the hinge point between research and prod writes, and the payload contract with `/submit` is non-negotiable.

**Patterns to follow:**

- `scripts/cache-thumbnails.js` — existing pattern for a focused, env-driven, idempotent script with default dry-run.
- `scripts/add-iasr-entities.js` (from the 2026-04-19 Clare/Prunkl workflow) — existing pattern for transactional, preflight-checked, dry-run-default scripts.
- `scripts/lib/org-matching.js` — existing shared-module idiom.

**Test scenarios:**

- Happy path — `lib/schema.js` exports enum arrays whose length and values match `api/submit.js` exports; test fails if they drift.
- Happy path — `lib/api.js#submitDraft(draft, { dryRun: true })` returns the JSON payload that would be POSTed to `/submit`, including the `notes` field derived from `notes_html`.
- Happy path — `lib/api.js#submitDraft` in live mode POSTs to `/submit` with `X-Contributor-Key` set from `process.env.CONTRIBUTOR_KEY`.
- Edge case — `lib/api.js` called without `CONTRIBUTOR_KEY` in env fails loudly with a clear error before any network call.
- Edge case — `notes_html` with inline HTML (tags, entities) produces reasonable plain-text `notes` (not raw HTML, not blank).
- Error path — `lib/api.js#submitDraft` handling of `/submit` 4xx response surfaces the server's error message to the caller.
- Integration — `lib/match.js` on the known Mila duplicate pair (IDs 1053, 1113 in prod) returns a high-confidence match score.

**Verification:**

- `npx vitest run src/__tests__/enrich/` passes.
- Running `node scripts/enrich/lib/api.js --help` (or equivalent probe) lists the dry-run interface.

---

- [ ] **Unit 3: `scripts/enrich/research.js`**

**Goal:** The research orchestrator. Takes a seed (name or entity_id) + operation hint, searches the DB for duplicates, runs Exa (or WebSearch fallback), classifies beliefs via Haiku, and returns a complete draft submission with sources, belief fields, adjacent-entity hints, and edge proposals.

**Requirements:** R3, R5, R6, R7, R9

**Dependencies:** Unit 2 (imports `lib/schema`, `lib/api`, `lib/classify`, `lib/match`).

**Files:**

- Create: `scripts/enrich/research.js`
- Test: `src/__tests__/enrich/research.test.ts`

**Approach:**

- **Exa MCP detection:** on entry, probe the Claude Code tool registry for any tool matching `mcp__*exa*web_search*` + `mcp__*exa*web_fetch*`. If found, research uses Exa. If not, falls back to `WebSearch` + `WebFetch`. Detection logic is wildcard-based so plugin namespace changes don't break the skill (resolves origin Q3).
- **Research loop:** for an entity type, fires 3–5 Exa (or WebSearch) queries from `.claude/skills/enrich/references/exa-queries.md` templates — e.g., for a person: `<name> AI safety researcher`, `<name> Twitter Bluesky`, `<name> published policy`. Fetches top results, dedupes by URL, concatenates snippets.
- **Classification:** feeds the snippet bundle to `lib/classify.js` which uses Haiku with the `belief-rubric.md` prompt to produce structured belief enums + confidence + reasoning, plus per-claim quotes / claim_dates / definitions (added 2026-04-20 for downstream features 1–3). The classifier output includes a `claims` array that the draft-builder attaches to `notesSources` with matching `field_name`.
- **Adjacent-entity extraction:** during classification, the prompt also asks Haiku to list any organizations or people mentioned in sources that are likely DB candidates. Returned as `adjacentHints: [{ name, type, evidence }]` for future use (does not create submissions in this plan — deferred to the suggestion-queue bundle).
- **Re-verification mode (`--mode=reverify --entity-id=…`):** fetches current entity state via `lib/db.js`, runs the research loop, returns a diff-style draft highlighting fields that changed since last verification (resolves origin Q4).
- **Sources assembled:** every URL consulted becomes an entry in `notesSources` with `{url, snippet, retrieved_at, retriever: 'exa' | 'web-search'}` plus optional `field_name` for classifications that drew primarily on one source.

**Patterns to follow:**

- Existing `scripts/enrich/` sibling (none yet) — establishes the pattern for future scripts.
- `scripts/cache-thumbnails.js` — env-driven, timeouted external fetch with fallback behavior.

**Test scenarios:**

- Happy path — given a seed name not in DB, research returns a draft with belief fields + ≥3 sources populated.
- Happy path — in re-verify mode on an existing entity, research returns a diff showing unchanged fields and any fields where new evidence shifted classification.
- Edge case — seed already in DB (fuzzy match via `lib/match`) causes research to return a "duplicate detected" result with the existing entity ID, not a new draft.
- Edge case — Exa MCP absent; research completes using WebSearch fallback and notes the retriever as `'web-search'` in `notesSources`.
- Edge case — Exa MCP present but a query fails (rate limit, 5xx); research retries then degrades to the WebSearch fallback for just the failing query.
- Error path — all research tools fail; research returns a draft with `notesSources: []` and `notesConfidence: 1`, explicit warning to caller.
- Error path — Haiku classifier returns an enum value outside the allowed set; `lib/classify` surfaces the exact mismatch and research refuses to return a malformed draft.
- Integration — research + `lib/api.js#submitDraft(draft, { dryRun: true })` together produce a complete `/submit` payload that passes Unit 4 validation.

**Verification:**

- Running `node scripts/enrich/research.js --name "Example Person" --dry-run` produces a draft JSON block with sources and belief fields visible.
- Vitest for research.test.ts passes with Exa-MCP-present and Exa-MCP-absent fixtures.

---

- [ ] **Unit 4: `scripts/enrich/validate.js` + `scripts/enrich/submit.js`**

**Goal:** Schema-validate a draft before it hits `/submit`; submit + auto-approve (or dry-run) with clear error surfaces; require explicit `--confirm` for destructive operations (merge, delete).

**Requirements:** R11, R12, R13, R18

**Dependencies:** Unit 2.

**Files:**

- Create: `scripts/enrich/validate.js` — CLI + library; imports `lib/schema` enum constants; fails loudly on unknown enum, missing required field, malformed URL.
- Create: `scripts/enrich/submit.js` — CLI + library; default is `--dry-run`; `--execute` required to POST; `--confirm` required for merge/delete operations.
- Test: `src/__tests__/enrich/validate-submit.test.ts`

**Approach:**

- `validate.js` takes a draft JSON on stdin or `--file`, checks each field against `lib/schema` expectations, returns exit 0 + empty stderr on success or exit 1 + structured error list on failure.
- `submit.js` wraps `lib/api.js#submitDraft` + `#approveSubmission` into the canonical two-call flow: POST to `/submit` with the team contributor key → receive `submissionId` → POST to `/admin` `{action: 'approve', submission_id}` → receive `entityId`. Surfaces both IDs in a transcript-friendly summary.
- Destructive operations (merge two entities, delete an entity) require `--confirm` on the CLI or `AskUserQuestion` confirmation inside the skill context; without confirmation the script exits early with a clear message.
- Headless mode (for the re-enrichment loop over ~1,700 entities described in SC3): `--execute --no-prompt` runs non-interactively; any validation failure aborts the batch at that entity with a failure marker rather than continuing silently.

**Execution note:** Test-first for `validate.js` — drift between `lib/schema` enums and `api/submit.js` enums is exactly the failure class this unit is supposed to prevent.

**Patterns to follow:**

- `scripts/add-iasr-entities.js` — existing transactional, preflight-checked, dry-run-default pattern.

**Test scenarios:**

- Happy path — valid draft passes validation and in `--execute` mode produces both a `submissionId` and `entityId`.
- Happy path — `--dry-run` (default) returns the `/submit` payload without any network call.
- Edge case — draft with unknown `regulatoryStance` enum value is rejected by validate.js with a message naming the field and listing valid values.
- Edge case — draft with `notesConfidence: 0` or `notesConfidence: 6` is rejected (1–5 range enforced by lib/schema).
- Edge case — draft missing required `name` is rejected with a clear error.
- Error path — `/submit` returns 429 (rate limit); submit.js surfaces the error and does not call `/admin`.
- Error path — `/submit` succeeds but `/admin` approve fails; submit.js reports the orphaned submission ID so a human can retry approval manually without re-submitting.
- Error path — destructive operation (merge) invoked without `--confirm` or `AskUserQuestion` assent exits immediately with a warning and does not hit the API.
- Integration — `research.js` output piped into `validate.js` then `submit.js --execute` end-to-end produces a reviewable entity on the live map.

**Verification:**

- `node scripts/enrich/submit.js --file draft.json` (dry-run) returns a `/submit` payload identical to a hand-crafted reference.
- `node scripts/enrich/submit.js --file draft.json --execute` on a test draft produces a submission + approved entity visible via `/search?status=all`.

---

- [ ] **Unit 5: `.claude/skills/enrich/SKILL.md` + `references/`**

**Goal:** The Claude Code skill itself. Rich-description frontmatter that triggers on the right phrases, concise body that routes the caller through the pipeline, and a `references/` directory that Claude reads on-demand for deeper guidance.

**Requirements:** R1, R2, R3, R4, R16, R17

**Dependencies:** Units 2, 3, 4 (the skill invokes the scripts).

**Files:**

- Create: `.claude/skills/enrich/SKILL.md`
- Create: `.claude/skills/enrich/references/schema.md` — entity columns, enum values, edge types, category taxonomies (Person categories: Executive, Researcher, Policymaker, Investor, Organizer, Journalist, Academic, Cultural figure; Organization categories per CLAUDE.md list; edge type canonical set with aliases).
- Create: `.claude/skills/enrich/references/belief-rubric.md` — the prompt used by `lib/classify.js` with examples per belief dimension.
- Create: `.claude/skills/enrich/references/exa-queries.md` — query templates per entity type (person: bio + policy stance + affiliations; organization: mission + funding + leadership; resource: authors + publisher + scope).
- Create: `.claude/skills/enrich/references/workflow.md` — step-by-step recipes for the five operations (seed / enrich existing / add edge / propose merge / re-verify).

**Approach:**

- **SKILL.md frontmatter** `description`: trigger-rich, modeled directly on the docx skill. Triggers include: "enrich X", "add person/org/resource", "seed new entity", "verify entity X", "propose merge", "add edge between X and Y", "research Y for the map". Negatives: "Do NOT use for: modifying the contribute form UI, changing the D3 map rendering, editing the admin review UI, database schema changes outside the enrichment scope."
- **SKILL.md body** (short, task-oriented):
  1. Preconditions check (env vars, Exa MCP detection).
  2. Quick Reference table (operation → script invocation).
  3. Five operation sections, each with a concrete script command sequence and a reference pointer to `references/workflow.md` for the detailed recipe.
  4. A short "Before any edit" paragraph encoding the read-before-write rule from the workshop-overwrite post-mortem.
  5. A "Summary block" template Claude fills in at the end of every run (what was searched, sources consulted, submission ID, entity ID).
- **`references/`**: progressive-disclosure files loaded by Claude when the SKILL.md body points to them. Each file is scoped tight — `schema.md` is reference, `belief-rubric.md` is the prompt text, `exa-queries.md` is the query templates, `workflow.md` is the step-by-step for each op.

**Patterns to follow:**

- Anthropic docx SKILL.md (`https://github.com/anthropics/skills/blob/main/skills/docx/SKILL.md`) — rich description, Quick Reference table near the top, task sections, scripts referenced by name.

**Test scenarios:**

- Happy path — a Claude Code session invokes `/enrich Ajeya Cotra` and the skill fires (verified by observing the tool call sequence: search DB → research.js → validate.js → submit.js).
- Happy path — SKILL.md's Quick Reference table correctly maps each of the five operations to its script invocation.
- Edge case — Exa MCP not installed: SKILL.md's preconditions section directs Claude to the WebSearch fallback path without user intervention.
- Edge case — an edit operation on an entity with no existing state: SKILL.md's read-before-write section prevents Claude from fabricating a diff and directs to the seed-new flow instead.
- Integration — a destructive operation (merge) triggers the `AskUserQuestion` confirmation path per Unit 4; the skill surfaces the prompt to the user in-transcript.
- Integration — at the end of a run, Claude produces the Summary block (search queries, sources, submission ID, entity ID) in the user transcript as specified.

**Verification:**

- Manual smoke test: invoke `/enrich <new entity name>` in a Claude Code session; verify triggers fire, correct scripts run, and Summary block appears.
- Linter (future work) checks SKILL.md frontmatter shape. For now, peer review against the docx SKILL.md reference.

---

- [ ] **Unit 6: End-to-end verification run**

**Goal:** Prove the pipeline works end-to-end by re-running an enrichment on a known new entity (not Clare/Prunkl — they're already in) and verifying everything lands correctly.

**Requirements:** SC1, SC2, SC4, SC5, SC6

**Dependencies:** Units 1–5.

**Files:**

- No code created. The verification is a scripted walk-through plus a short runbook at `docs/runbooks/enrichment-skill-smoke-test.md` capturing the exact commands and expected outputs.

**Approach:**

- Pick a known AI-policy figure who is not currently in the DB (candidate list produced during execution; examples: Markus Anderljung, Helen Toner — subject to `/search` confirmation at run time).
- Invoke `/enrich <name>` in a Claude Code session. Measure: ≤5 tool calls end-to-end; submission created with `notesSources` non-empty; entity auto-approved via `/admin`; `map-detail.json` after next regeneration carries the three new fields; live site map includes the new entity after CloudFront invalidation.
- Re-run in `--mode=reverify` against an existing entity (e.g., Stephen Clare, id=1849) and confirm the diff-style draft surfaces fields whose evidence has shifted.
- Run `node scripts/enrich/research.js` in Exa-MCP-absent mode (by temporarily disabling the Exa plugin) to confirm the WebSearch fallback produces a usable draft, even if lower quality.

**Patterns to follow:**

- The Clare/Prunkl/IASR walkthrough on 2026-04-19 — same shape, but driven end-to-end by the skill + scripts rather than by hand.

**Test scenarios:**

- Happy path — a greenfield enrichment completes in ≤5 tool calls and produces a live entity with visible `notesSources` in the submission record.
- Happy path — re-verify mode on an existing entity produces a diff-style draft noting changed vs unchanged fields.
- Edge case — Exa MCP disabled; WebSearch fallback produces a valid draft and records `retriever: 'web-search'` in sources.
- Edge case — a malformed draft (manually introduced during the test) is caught by validate.js before any write happens.
- Integration — after approval, `curl https://mapping-ai.org/map-data.json` shows the new entity within the CloudFront invalidation window.

**Verification:**

- The runbook at `docs/runbooks/enrichment-skill-smoke-test.md` captures the commands + timings + expected outputs.
- A new entity exists in prod, sourced through the skill, with the three new provenance fields populated.
- No existing test or deploy breaks.

## System-Wide Impact

- **Interaction graph:** the skill wraps the existing `/submit` + `/admin` pipeline; no existing callers change behavior. `api/admin.js#refreshMapData(client)` is the regen path — unchanged. The new columns flow through the existing trigger on approval.
- **Error propagation:** errors at the `/submit` layer are surfaced from `submit.js` to the caller transcript. `/admin` approve failures leave the submission pending (recoverable by manual approval). Validation failures in `validate.js` abort before any network call.
- **State lifecycle risks:** new columns are additive and nullable; legacy submissions/entities without them continue to work unchanged. The `before_submission_update` trigger update is the one touch-point that could silently affect legacy rows — verified by Unit 1's edge-case test ("absence of the three fields on a legacy submission doesn't break existing flows").
- **API surface parity:** `api/submit.js` accepts the new fields but they remain optional. External contributors using the existing `/contribute` form produce submissions without them and work as before. The `/admin` UI (admin.html) continues to function unchanged; it may later gain a "view sources" section but that's deferred to the UI bundle.
- **Integration coverage:** Unit 1's "Integration — running `npm run db:migrate` twice in a row is idempotent" is the key cross-layer test. Unit 6's end-to-end verification is the cross-cutting integration check.

## Risks & Dependencies

- **Risk: schema migration on prod.** Mitigation: `ALTER TABLE … ADD COLUMN IF NOT EXISTS …` is additive and idempotent; run during low-traffic window; take `npm run db:backup` before running (same pattern as the Clare/Prunkl workflow).
- **Risk: `before_submission_update` trigger update breaks existing approval path.** Mitigation: trigger change is additive (copy three more columns, nothing else changes); Unit 1's legacy-submission edge-case test directly covers this; rollback is a one-line `ALTER TRIGGER` revert.
- **Risk: Haiku classifier quality on edge enum cases.** Mitigation: Unit 6's verification run calibrates on a known entity; if accuracy is poor the classifier prompt lives in `references/belief-rubric.md` and tunes without code deploys.
- **Risk: Exa MCP plugin namespace shifts (different plugin name, future versions).** Mitigation: wildcard detection in `research.js`; if detection fails, the WebSearch fallback still works.
- **Risk: contributor-key rate limit (20/day default) is too low for the re-enrichment pass across ~1,700 entities.** Mitigation: mint a dedicated long-lived team key with elevated daily limit via `scripts/generate-contributor-key.js` + a one-line DB update; document in the runbook.
- **Dependency: `process.env.DATABASE_URL` / `ADMIN_KEY` / `CONTRIBUTOR_KEY` available in `.env`.** Already the project pattern; no new infra.
- **Dependency: Exa MCP plugin enabled in the user's Claude Code config.** Optional; fallback exists.

## Documentation / Operational Notes

- **Runbook:** `docs/runbooks/enrichment-skill-smoke-test.md` (created in Unit 6) captures the smoke-test commands and expected outputs.
- **CLAUDE.md update:** add a short "Enrichment skill" section under "Commands" noting `/enrich <name>` as the canonical path for adding entities going forward; point legacy `scripts/enrich-*.js` as superseded-but-left-in-place until proven.
- **CONTRIBUTOR.md update:** add a section for agent-driven enrichment describing the skill, the contributor-key env requirement, and the expected workflow.
- **Rollout:** Unit 1 ships with `sam build && sam deploy …` (Lambda changes) plus `npm run db:migrate` (schema). Units 2–5 are code-only. Unit 6 is validation. No feature flag needed — the new columns are additive and invisible until populated.
- **Monitoring:** after rollout, spot-check `/search?status=pending` + admin.html for a week to confirm new submissions carry `notes_sources`; look at Haiku `llm_review` JSONB quality distribution to confirm classification is sane.

## Sources & References

- **Origin document:** [`docs/brainstorms/2026-04-20-enrichment-skill-requirements.md`](../brainstorms/2026-04-20-enrichment-skill-requirements.md)
- **Ideation document:** [`docs/ideation/2026-04-20-contributor-enrichment-toolkit-ideation.md`](../ideation/2026-04-20-contributor-enrichment-toolkit-ideation.md)
- **Superseded keystones brainstorm:** [`docs/brainstorms/2026-04-20-contributor-enrichment-keystones-requirements.md`](../brainstorms/2026-04-20-contributor-enrichment-keystones-requirements.md) (future bundle)
- **Anthropic docx skill (canonical reference):** https://github.com/anthropics/skills/blob/main/skills/docx/SKILL.md
- **Anthropic Complete Guide to Building Skills for Claude:** https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf
- **Enrichment-v2 design (absorbed):** `docs/enrichment-v2-design.md`
- **Workshop-overwrite + credential-leak post-mortem:** `docs/post-mortems/2026-04-18-workshop-overwrite-and-credential-leak.md`
- **D3 defer outage post-mortem:** `docs/post-mortems/2026-04-09-d3-defer-map-outage.md`
- **Reference: `/submit` Lambda:** `api/submit.js`
- **Reference: `/admin` Lambda (approve flow):** `api/admin.js` lines 200–231
- **Reference: `export-map.js` field mapping:** `api/export-map.js#toFrontendShape()` and `DETAIL_FIELDS`
- **Reference: migration pattern:** `scripts/migrate.js:160`
- **Reference: thumbnail cache pattern:** `scripts/cache-thumbnails.js#reCacheExternalUrl`
- **Reference: Clare/Prunkl workflow (motivating example):** `scripts/add-iasr-entities.js` (leave in place for now; archive when new pipeline is proven)
