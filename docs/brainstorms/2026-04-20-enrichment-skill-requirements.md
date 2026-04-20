---
date: 2026-04-20
topic: enrichment-skill
---

# Mapping-AI Enrichment Skill

A Claude Code skill plus supporting scripts that lets an agent (or a human using Claude Code) seed new entities, enrich existing ones, add edges, and propose related nodes in the mapping-ai DB. Exa MCP is the primary research primitive; the skill works with or without it.

Follows the Anthropic docx skill pattern: rich trigger-description frontmatter, concise SKILL.md, progressive disclosure via `references/`, focused utilities in `scripts/`.

Supersedes (for the current build) `docs/brainstorms/2026-04-20-contributor-enrichment-keystones-requirements.md` — the three keystones (provenance, ephemeral preview, schema registry) remain a valid future bundle when contribution volume justifies them.

## Problem Frame

The Stephen Clare / Carina Prunkl / IASR workflow on 2026-04-19 took roughly thirty manual steps: spawning three Exa search subagents, mapping beliefs to enum values by hand, writing SQL inserts, hitting schema-drift bugs (`edge_pkey` sequence desync, `qa_approved` forgotten, `notes` vs `notes_html` divergence, `author` vs `authored_by` edge-type redundancy), regenerating `map-data.json`, uploading to S3, and invalidating CloudFront. Every future entity added to the map faces the same tax.

The right primitive for this work is not a new CLI or MCP server — those are heavier, and the Exa MCP plugin already covers the research surface. The right primitive is a **Claude Code skill** that an agent invokes on a seed ("enrich Stephen Clare", "add Inria as an org", "propose merge between Mila-1053 and Mila-1113") and that drives the full pipeline end-to-end against a few well-tested scripts. One entry point, one set of guardrails, one place to patch.

## Requirements

### Skill surface

- **R1.** The skill lives at `.claude/skills/enrich/SKILL.md` and follows the Anthropic docx pattern: rich description with triggers + negatives, short task-oriented body, references directory for rubrics + schema details, scripts directory for utilities. The description field lists concrete trigger phrases ("enrich X", "add person/org/resource", "propose merge", "verify entity", "add edge between") and explicit negatives (Do NOT use for: contribute form UI changes, map rendering changes, admin review flow).
- **R2.** The skill covers five operations from a single entry point: (a) seed a new entity (person / org / resource), (b) enrich an existing entity, (c) add or clarify edges between entities, (d) propose a merge of two suspected duplicates, (e) re-verify an existing entity's claims. The agent or human passes a seed name/ID plus an operation hint; the skill routes.
- **R3.** The skill always searches the existing DB before creating anything. Search hits are presented to the caller with enough context to disambiguate (name + category + primary org + existing confidence/status), and the skill refuses to create a duplicate without explicit override.
- **R4.** At the end of any operation, the skill produces a structured draft for the caller to review: the proposed submission payload (camelCase fields matching `/submit` contract), the edge proposals, adjacent-entity suggestions surfaced during research, and a source-citation list. The caller confirms before the skill submits.

### Exa MCP integration

- **R5.** When the Exa MCP plugin is enabled in the user's Claude Code config (tools `mcp__plugin_exa_exa__web_search_exa` and `mcp__plugin_exa_exa__web_fetch_exa` present), the skill uses it as the primary research source. Exa plugin authentication (API key, OAuth) is the plugin's responsibility; the skill does not handle Exa credentials.
- **R6.** When Exa MCP is absent, the skill falls back gracefully to Claude Code's built-in `WebSearch` and `WebFetch` tools, noting in the draft that research quality may be lower. The skill never fails because Exa is missing.
- **R7.** All research queries, retrieved URLs, and source snippets used for classification land in the submission's `notesSources` JSONB field (a new field, added as part of this skill's schema additions; see R14) so the origin of every claim is durable and auditable.

### Supporting scripts

- **R8.** The skill calls a small set of focused scripts committed under `scripts/enrich/` (not `.claude/skills/enrich/scripts/`) so they're reusable outside the skill context and show up as first-class maintained code. Each script is executable, idempotent where possible, supports a `--dry-run` default, and uses `process.env.DATABASE_URL` / `process.env.ADMIN_KEY` / `process.env.CONTRIBUTOR_KEY` exclusively (no hardcoded creds, per the 2026-04-18 credential-leak post-mortem).
- **R9.** Minimum script set: `research.js` (orchestrates Exa/WebSearch + Claude Haiku classification into a draft submission), `submit.js` (POSTs to `/submit` and then `/admin` approve), `validate.js` (schema-checks a draft against the current enum set and edge vocabulary before submit), `cache-thumbnail.js` (migrates an external image URL to S3/CloudFront, reuses existing `scripts/cache-thumbnails.js` logic). Additional scripts added only when a new operation justifies one.
- **R10.** A shared `scripts/enrich/lib/` module exposes: the current enum set (belief stances, timelines, risk levels, categories, edge types) as exported constants; a typed DB client with safe edge-sequence reset baked in; a `/submit`+`/admin` client with contributor-key auth; fuzzy entity-match helpers for duplicate detection. The 55+ legacy scripts under `scripts/` stay where they are for now but any new enrichment work routes through `scripts/enrich/`.

### Write path

- **R11.** The skill writes via `POST /submit` with a team contributor key, then `POST /admin` with `action: 'approve'` to auto-approve. This path preserves the Haiku LLM quality review, the contributor-key rate-limit accounting, and the submission-table audit trail; admin approval then triggers the existing `api/admin.js` auto-regen of `map-data.json` + CloudFront invalidation. No direct SQL in the skill path.
- **R12.** The skill never writes when validation (R9) fails. When schema mismatches appear (unknown enum value, missing required field, malformed URL), the skill shows the caller the exact validation error and the valid choices from the registry.
- **R13.** A `--dry-run` mode on every write operation returns the draft + the `/submit` payload that would be sent, without POSTing. This is how the skill surfaces previews to the caller before a real submission.

### Schema additions (minimum viable)

- **R14.** Additive migration: add `notes_sources JSONB` (array of `{url, snippet, retrieved_at, retriever}`), `notes_confidence SMALLINT` (1–5), and `enrichment_version TEXT` to the `submission` table. `api/submit.js` accepts and persists these; `api/admin.js` approval copies them into a parallel set of columns on `entity` (same names). `api/export-map.js#toFrontendShape()` exposes them through to `map-detail.json` so future UI work can render citations. No UI work is in scope for this skill — the data is written but not displayed in v1.
- **R15.** The skill and its scripts treat `notes_html` as primary and derive the plain-text `notes` column from it on every write (so the two columns never drift again). The `qa_approved = true` flag is set by the admin approval path as it already is; the skill does not touch it directly.

### Safety + agent discipline

- **R16.** The skill's SKILL.md contains an explicit "read before write" paragraph grounded in the 2026-04-18 workshop-overwrite post-mortem: any operation that edits an existing entity must first fetch the current state, compute a field-level diff, and only submit fields the caller has opted to change. The skill refuses to blind-overwrite.
- **R17.** Every skill run produces a short summary block in the caller's transcript: what was searched, what sources were consulted, what was submitted, the submission ID, and the resulting entity ID(s). This is the audit signal for humans reviewing the agent's work.
- **R18.** The skill refuses to run destructive operations (merge, delete) without a human `y/n` confirmation in the transcript, even when invoked by an autonomous agent.

## Success Criteria

- **SC1.** An agent (or human via Claude Code) can invoke the skill with a seed name and get a fully-drafted submission with sources, belief classifications, and edge proposals in a single turn — no manual SQL, no manual enum mapping, no manual map regen.
- **SC2.** Re-running the Stephen Clare / Carina Prunkl / IASR workflow via the skill takes ≤ 5 tool calls end-to-end (research, draft, review, submit, confirm) instead of the ~30 manual steps the original workflow took.
- **SC3.** A re-enrichment pass across all ~1,700 existing entities is runnable as a scripted loop (`for id in ...; do skill invoke enrich --id=$id; done` or equivalent) with Exa + Claude spend tracked in the submission records.
- **SC4.** Schema-drift bugs from the Clare/Prunkl workflow (sequence desync, `qa_approved` forgotten, `notes` / `notes_html` divergence, redundant edge types) cannot recur because each is fixed once inside `scripts/enrich/lib/`.
- **SC5.** The skill works identically with or without Exa MCP enabled; the same skill invocation produces a submission in both modes, with the draft noting which research source was used.
- **SC6.** A reviewer inspecting an approved submission in `admin.html` sees every source URL that produced each claim, confidence scores, and the Exa/WebSearch query used.

## Scope Boundaries

**In scope for this build:**

- `.claude/skills/enrich/SKILL.md` + `references/` + caller-facing recipes
- `scripts/enrich/*.js` with `lib/` shared module
- Additive `submission` + `entity` schema columns for source-grounding metadata (R14)
- `/submit` and `/admin` Lambdas extended to accept and forward the new fields
- `api/export-map.js#toFrontendShape()` update to expose the new fields in `map-detail.json`
- Exa MCP optional integration with WebSearch fallback

**Explicit non-goals (future work):**

- Rendering source citations on the public map's entity detail panel (data is written in v1, UI layer deferred)
- Ephemeral preview environment / per-batch preview URLs (stays in the keystones bundle for future)
- Schema registry with codegen (stays in the keystones bundle)
- Per-field provenance with a separate `entity_fact` table (stays in the keystones bundle; v1 uses field-level JSONB in submission/entity instead)
- Entity versioning / time-travel UI
- Contributor trust tiers, circuit breakers, auto-pause, contributor dashboard
- Public REST API documentation + OpenAPI spec
- Migrating legacy `scripts/enrich-*.js` / `scripts/seed-*.js` into the new pattern — leave in place until new shape stabilizes
- CLI / MCP server wrapping the same lib — the skill is the v1 surface; wrappers can come later if external consumers appear

## Key Decisions

- **Skill + scripts is the right primitive, not CLI or MCP server.** CLI duplicates what Claude Code already does; MCP server duplicates what the Exa MCP plugin already provides for research. A skill plus focused scripts is a leaner, more Claude-Code-native fit, especially since the Anthropic docx skill precedent shows this pattern handles arbitrarily complex task families.
- **Exa MCP plugin is the primary research source, not a project-owned Exa wrapper.** The Exa plugin handles auth (user provides key at install), rate limits, and search quality. Owning our own Exa client would duplicate infrastructure the user already relies on elsewhere.
- **Skill works with or without Exa enabled.** Fallback to built-in WebSearch/WebFetch preserves the skill's value for users who haven't installed the Exa plugin, at some quality cost.
- **Write via `/submit` + auto-approve, not direct SQL.** Preserves submission-table audit trail, Haiku quality review, and rate-limit accounting; requires no new auth primitive (contributor key + admin key already exist). Admin auto-approval makes this feel as immediate as direct writes.
- **One script per operation, shared `lib/` module for enums + DB client + submit client.** Follows the docx pattern (focused utilities, shared helpers) and avoids the 55-script sprawl by keeping the new enrichment surface to a handful of scripts.
- **Additive schema migration for source-grounding metadata, no UI in v1.** The data columns (`notes_sources`, `notes_confidence`, `enrichment_version`) ship now so enrichment work starts producing durable provenance immediately; rendering the citations on the map is deferred until v2.
- **No new MCP server; no new CLI.** Those are revisited only if the skill proves insufficient.

## Dependencies / Assumptions

- Existing `/submit` Lambda and contributor-key infrastructure (`mak_<32hex>` keys, daily rate limits, Haiku quality review) remain stable and available.
- `api/admin.js` approval flow already auto-regens `map-data.json` + invalidates CloudFront; that stays untouched.
- `scripts/cache-thumbnails.js` external-URL migration pattern already handles thumbnail downloads to S3; the enrich skill reuses that path.
- `process.env.DATABASE_URL` / `ADMIN_KEY` / `CONTRIBUTOR_KEY` are available in `.env` at the project root per the existing pattern; the skill and its scripts never hardcode creds.
- The Anthropic Exa plugin (`plugin:compound-engineering:exa` or similar) exposes `mcp__plugin_exa_exa__web_search_exa` and `mcp__plugin_exa_exa__web_fetch_exa` tools when enabled. If the plugin's tool namespace changes, the skill's detection logic needs a one-line update.
- The skill follows the `Complete Guide to Building Skills for Claude` (Anthropic, 2025) and the docx SKILL.md example: rich description, progressive disclosure, references in a subdirectory, scripts for edge cases.

## Outstanding Questions

### Resolve Before Planning

_(none — scope is well-defined and the Anthropic docx pattern is the reference shape)_

### Deferred to Planning

- `[Affects R2][Design]` Single-entry vs command-arg dispatch: `/enrich <seed>` with operation auto-detected from seed shape, vs. `/enrich <operation> <seed>` with explicit subcommand. Affects SKILL.md instruction clarity for the LLM.
- `[Affects R14][Technical]` `notes_sources` array shape: flat `[{url, snippet, retrieved_at, retriever}]` on submission, vs. keyed by field (`{field_name: [sources]}`) for future per-field provenance compatibility. Keyed shape is forward-compatible with the deferred per-field-provenance keystone.
- `[Affects R5][Technical][Needs research]` Exa MCP plugin namespace stability: are the tool names `mcp__plugin_exa_exa__web_search_exa` stable, or do they depend on the plugin's version / install path? Skill detection logic needs to handle both the `compound-engineering:exa` and future plugin locations.
- `[Affects R9][Technical]` Re-verification script shape: should re-verification (re-running Exa on an existing entity and proposing a diff) be a separate script or a flag on `research.js`? Affects SKILL.md instruction flow.
- `[Affects R10][Technical]` How aggressively should `scripts/enrich/lib/` pull from the existing `scripts/lib/org-matching.js` and `api/submit.js` shared logic to avoid re-implementing fuzzy matching and enum-score mappings?
- `[Affects R18][UX]` Destructive-operation confirmation UX: in-skill prompt via AskUserQuestion, a confirmation phrase the agent must echo, or a `--confirm` flag on the script. Claude Code integration shape matters.

## Next Steps

→ `/ce:plan` for structured implementation planning of the enrichment skill + scripts + schema migration.
