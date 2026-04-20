---
date: 2026-04-20
topic: contributor-enrichment-toolkit
focus: Skill/workflow/CLI/MCP for safe, agent-friendly entity seeding and enrichment using Exa search
---

# Ideation: Contributor Enrichment Toolkit

## Codebase Context

### Project shape

JS/TS Vite 8 + React 19 + Tailwind v4 frontend (multi-page); D3 inline `map.html`; Node 20 Lambdas in `api/`; Postgres 17 on RDS; CI deploys to S3/CloudFront. 3 DB tables: `entity`, `submission`, `edge`.

### Existing pipeline (Path 2 in CLAUDE.md)

`POST /submit` (camelCase `data`, `X-Contributor-Key` optional `mak_<32hex>`, anon rate limit 10/hr, per-key 20/day) → `submission` table pending → Haiku LLM quality review (non-blocking) → admin.html approve → trigger inserts entity row + recalculates weighted belief aggregates → `api/admin.js` auto-regenerates `map-data.json` → S3 → CloudFront invalidation.

### Existing infrastructure

- Contributor keys: `scripts/generate-contributor-key.js` + `scripts/revoke-contributor-key.js` + `api/submit.js` key validation (already wired, underutilized).
- Agent-facing docs: `docs/CONTRIBUTOR.md` ("ALWAYS search first").
- Design doc for v2 enrichment: `docs/enrichment-v2-design.md` — specs `notes_confidence`, `notes_sources`, `enrichment_version`, verification sampling with auto-pause. Unimplemented.
- 55+ one-off scripts in `scripts/`, heavy overlap across `seed-*`, `enrich-*`, `create-*-orgs`, `phase4-manual-affiliations`, `migrate-*`. Only `scripts/lib/org-matching.js` has been extracted. ~3,692 LOC in `enrich-*.js` variants alone.

### Pain points (from the motivating workflow: adding Stephen Clare + Carina Prunkl + updating IASR resource id=653)

1. **Schema drift**: `edge.id` serial sequence drifted, `INSERT ... RETURNING id` failed with `edge_pkey` duplicate until we called `setval(pg_get_serial_sequence('edge','id'), max(id))` by hand.
2. **Hidden gate**: `qa_approved BOOLEAN` exists on `entity`; `status = 'approved'` alone does not expose the row in `map-data.json` because `api/export-map.js` joins on `qa_approved = true`. Had to patch separately after initial insert.
3. **Column redundancy**: `notes` (plain) and `notes_html` (TipTap HTML) are independent columns; manual inserts touched only one and the map detail pane showed stale content until both were written.
4. **Edge-type vocabulary sprawl**: old edges use `author` (single-source) while new code uses `authored_by`; `affiliated` and `employed_by` both in active use with unclear semantics; duplicates ship silently.
5. **Field name mapping**: `api/export-map.js#toFrontendShape()` translates DB columns to frontend field names (e.g., `belief_regulatory_stance → regulatory_stance`, `resource_url → url`, `belief_*_wavg → *_score`). CLAUDE.md flags: "Any schema change must update this mapping or the map/plot will break silently."
6. **No staging**: prod RDS is the only database. 1-day backup retention, deletion protection on, no audit log yet (flagged in MEMORY.md as planned).
7. **Orchestration**: after the DB write, the contributor must regenerate `map-data.json`, `aws s3 cp` both skeleton + detail files, and `aws cloudfront create-invalidation` — three manual steps with prod-AWS credentials.

### Past learnings (from docs/solutions/ + docs/post-mortems/)

- `docs/enrichment-v2-design.md` (directly relevant, not implemented): source-grounded enrichment, additive schema migrations (`notes_confidence`, `notes_sources`, `enrichment_version`, `last_verified_at`, `verification_score`), confidence gating (`notes_confidence >= 3`), `notes_v1` preservation, 10-entity pilot pattern, verification sampling with auto-pause below 70% accuracy.
- **Credential-leak post-mortem (2026-04-18)**: `scripts/migrate-to-rds-new-schema.js` hardcoded the RDS URL, leaked via GitHub, forced password rotation. Any new tooling must use `process.env.DATABASE_URL` exclusively and treat one-off scripts as disposable.
- **Workshop overwrite post-mortem (2026-04-18)**: a subagent replaced a teammate's file instead of merging. Contributor tool must read-before-write and diff against current state before applying.
- **D3 defer outage (2026-04-09)**: no staging environment; every push is live. Reinforces the need for a real preview/staging layer.

### Likely leverage points

- The `submission` table can be upgraded in place into the provenance + audit ledger instead of adding a fourth table.
- `/submit` already normalizes enum values and computes belief scores; it's the right chokepoint for all writes.
- Contributor-key infrastructure exists and is the natural hook for trust tiers and scopes.
- `api/export-map.js` field mapping is already a central artifact — if it reads from a schema registry, the map/plot can never silently break on schema change.

---

## Ranked Ideas

### 1. Per-field provenance data model _(keystone)_

**Description:** Every field on `entity` carries `{value, sources: [{url, snippet, retrieved_at, retriever}], confidence: 1-5, verified_by, verified_at, prompt_version}`. Per-field, not per-entity. Implemented as a sibling `entity_fact` table keyed by `(entity_id, field_name)` or a JSONB `provenance` column on `entity` indexed by field. Enables: re-verification queries, source-reverse-lookups, confidence-gated display, field-level revert, reproducible re-enrichment via `prompt_version` bumps. Subsumes the planned audit log (MEMORY) and the v2-design confidence fields.
**Rationale:** This is the difference between a "stakeholder map" and a credible research tool at 10k+ entities. Every other long-term capability (time travel, re-enrichment migrations, trust tiers, public API) is dramatically easier with provenance per claim than without.
**Downsides:** Non-trivial migration. `toFrontendShape()` must learn to read provenance. Frontend needs a UI mode to show/hide source citations. ~2x write overhead on enrichment (acceptable — writes are infrequent vs reads).
**Confidence:** 90% · **Complexity:** High · **Status:** Explored (2026-04-20 brainstorm)

### 2. Staging + preview environment _(keystone)_

**Description:** Nightly Postgres clone of prod (same schema + data) on a separate RDS instance (or RDS Aurora serverless). Branch-scoped CloudFront previews pointing to a staging `/submit` and staging `map-data.json`. One-click promote path (reviewed diff → prod submission). Agents and humans enrich in staging freely, eyeball on preview URL, promote to prod when satisfied.
**Rationale:** The project has been burned by prod outages (D3 defer, SAM drift). There is no safe playground for agents at scale — the moment enrichment load increases, so does blast radius. Staging is the one architectural move that makes every other agentic feature low-risk.
**Downsides:** Ongoing AWS cost (second RDS instance, second CloudFront distribution, sync job). Needs a sync strategy that doesn't leak half-approved drafts back into prod. Agents and humans need clear mental model of which env they're touching.
**Confidence:** 85% · **Complexity:** Medium-High · **Status:** Explored (2026-04-20 brainstorm)

### 3. Schema registry + generated types _(keystone)_

**Description:** Single source of truth (YAML or TS file committed under `packages/schema/`) for: entity columns, enum values (categories, belief stances, timeline bins, risk levels, edge types), DB→frontend field mapping, validation rules, display labels. TypeScript types generate from it; Lambda validators import it; React forms import it; CLI/MCP import it. New `/schema` endpoint exposes a JSON version for external agents. Adding a column becomes: edit registry → run codegen → everything downstream updates.
**Rationale:** Kills the entire class of bugs that caused the Clare/Prunkl pain: `qa_approved` forgotten, `notes` vs `notes_html` drift, edge-type redundancy, `toFrontendShape()` drift, enum map divergence between `/submit` and `enrich-*.js`. End of "schema change breaks the plot silently."
**Downsides:** Refactor of every file that currently hardcodes enums (submit.js, export-map.js, contribute forms, enrich-\*.js). Initial migration cost is concentrated; payoff is amortized.
**Confidence:** 85% · **Complexity:** Medium · **Status:** Explored (2026-04-20 brainstorm)

### 4. One engine, four shells

**Description:** Shared `packages/core/` toolkit (TS) with primitives: `db` (pool + safe upsert w/ sequence reset), `exa` (cached research), `classify` (versioned belief rubric), `entity`, `edge`, `submission` (write-through via /submit). Four shells consume it: `mapctl` CLI (humans), `mapping-ai-mcp` MCP server (agents), `.claude/skills/enrich/` Claude Code skill, public REST API (external contributors). All four go through the same submission pipeline.
**Rationale:** Collapses 55 scripts into a typed library. Same behavior everywhere so humans, Claude agents, and external contributors can't produce divergent state. Makes "add a new surface" a small effort.
**Downsides:** Monorepo-ish structure adds build complexity. Four shells implies four maintenance surfaces, though each is thin.
**Confidence:** 80% · **Complexity:** Medium · **Status:** Unexplored

### 5. Reproducible enrichment pipeline

**Description:** Job queue (small Postgres table, no new infra) with idempotency keys; cached Exa results (keyed by query + date bucket, stored in new `exa_cache` table); versioned belief-classifier prompts; every run writes full trail to per-field provenance (#1). Re-enrichment becomes `mapctl enrich --prompt-version=v3 --where 'confidence < 3 or last_verified_at < 2025-01-01'` — a one-line replayable operation instead of a scripted migration.
**Rationale:** Makes Exa spend predictable and enrichment deterministic across contributors. Two agents researching the same entity converge to the same draft.
**Downsides:** Cache invalidation nuance (when is a source "stale"?). Prompt versioning discipline required.
**Confidence:** 75% · **Complexity:** Medium · **Status:** Unexplored

### 6. Adjacent-entity suggestion queue + merge proposals

**Description:** New `entity_suggestion` table auto-populated by every enrichment: `{suggested_name, entity_type_hint, mentioning_entity_id, evidence_snippet, source_url, suggested_by, score}`. Also used for merge candidates (Mila 1053/1113 surfaced automatically) and @mention-derived edge proposals. Contributors clear the queue from an admin UI section or `mapctl queue`.
**Rationale:** Converts every enrichment into backlog for the next contributor. The Clare case surfaced Inria + Oxford IEAI + Mila dupes as side-effects — today those are lost signal; tomorrow they become the next three tasks.
**Downsides:** Queue could bloat with low-confidence suggestions. Needs scoring + decay logic.
**Confidence:** 75% · **Complexity:** Medium · **Status:** Unexplored

### 7. Entity versioning with time travel

**Description:** Every entity update writes a row to `entity_version` with the before/after snapshot and mutation metadata. Frontend shows a "history" tab with diffs. Admin can revert individual fields or whole entities. Pairs naturally with per-field provenance (#1).
**Rationale:** Closes the "no audit log" gap and makes bad edits fully reversible. A prerequisite for agent auto-approval: if an agent writes something wrong, one-click revert.
**Downsides:** Storage grows with edit rate (tolerable at 10k entities). UI work for the history view.
**Confidence:** 75% · **Complexity:** Medium · **Status:** Unexplored

### 8. Admin v2: batch diff review + progressive trust + circuit breakers

**Description:** Redesigned `admin.html`: keyboard-navigable side-by-side diff view (submission vs current entity vs peer submissions), per-field batch accept/reject, source URL hover previews, LLM classification reasoning inline. Contributor keys earn auto-approval for low-risk fields (thumbnail, location, social) on sustained >90% approval rate; sustained <60% or Haiku quality mean <3.0 auto-pauses the key. Review rate target: 20+ submissions/minute.
**Rationale:** Review is the throughput bottleneck at 1000-agent scale. Scaling it is a UI + policy problem, not a backend problem.
**Downsides:** Significant frontend work. Policy tuning (trust tier thresholds) takes iteration.
**Confidence:** 75% · **Complexity:** High · **Status:** Unexplored

### 9. Contributor dashboard + public REST API

**Description:** Per-key dashboard: submissions, approval rate, trust tier, Exa+Claude spend, leaderboard. Documented REST API at `/docs/api/` with schema, rate limits, authentication guide, example payloads (curl, Python, TS). Contributor-key self-service: sign up, rotate key, view history. Makes the project genuinely crowdsourceable beyond the core team and mapping parties.
**Rationale:** The `workshop/` mode already exists; a dashboard + public docs turn a one-off event into an ongoing contribution model. Also a prerequisite for trust tiers to feel fair.
**Downsides:** Abuse surface (needs proper auth hardening). Ongoing docs maintenance.
**Confidence:** 70% · **Complexity:** Medium · **Status:** Unexplored

---

## Rejection Summary

| #   | Idea                                                | Reason Rejected                                                                                   |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | Browser-agent contribute form driver (Playwright)   | Form is a lossy transport; direct API + per-field provenance is strictly better at every timeline |
| 2   | Separate audit-log table (as proposed in MEMORY)    | Per-field provenance (#1) + entity versioning (#7) fully subsume it without adding a 4th table    |
| 3   | Auto-derive edges from @mentions without review     | Error rate makes review-gated proposals (fold into #6) strictly better                            |
| 4   | Dossier-as-Markdown workflow                        | MCP + provenance + diff view is a better artifact than a parallel markdown file                   |
| 5   | Consolidate 55 scripts into one `mapctl` subcommand | Subsumed by #4 (one engine, four shells)                                                          |
| 6   | Standalone Exa call cache                           | Absorbed into #5 (reproducible pipeline)                                                          |
| 7   | Standalone belief classifier cache                  | Same — lives inside #5                                                                            |
| 8   | Draft namespace + idempotency queue                 | Absorbed into #5                                                                                  |
| 9   | Dry-run /submit endpoint                            | Valuable short-term but subsumed by #2 (real staging env) at long-term scale                      |
| 10  | Kill manual map regen via trigger                   | Already partly done in admin.js on approve; becomes a small sub-task under #4/#8                  |
| 11  | Scoped contributor keys                             | Merged into progressive trust (#8)                                                                |
| 12  | Merge proposals as separate system                  | Folded into #6 (suggestion queue)                                                                 |
| 13  | Edge-first mode (mine relationships from notes)     | Becomes a subcommand of `mapctl` under #4                                                         |

## Keystone order

The dependency order is: **#3 (schema registry) → #1 (per-field provenance) → #2 (staging env)**. With these three in place, #4–#9 become straightforward implementations of well-defined contracts.

## Session Log

- 2026-04-20: Initial ideation — 33 raw ideas generated across 4 frames (user/operator pain, inversion/automation, leverage/compounding, agent-at-scale), merged + deduped to ~14 unique, 6 short-term survivors.
- 2026-04-20: User re-scoped to long-term optimal (timeline not a constraint). Re-evaluated. Survivor set expanded to 9 across 4 architectural layers. Keystones identified (#3 → #1 → #2). Handing off to `ce:brainstorm` on the three keystones as a bundle.
