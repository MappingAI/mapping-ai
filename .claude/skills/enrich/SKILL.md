---
name: enrich
description: "Use when someone wants to add data to the mapping-ai stakeholder graph or enrich an existing entity. Triggers include: 'enrich X', 'enrich this entity', 'enrich Helen Toner', 'add person X', 'add org Y', 'add resource Z', 'add Yann LeCun to the map', 'add <name> to the mapping-ai DB', 'seed new stakeholder', 'research X for the map', 'verify entity X', 're-verify X', 'propose merge between X and Y', 'add edge between X and Y'. Covers seeding new people, organizations, and resources; enriching existing entities with new evidence; proposing edges; re-verifying claims against fresh sources. Do NOT use for: modifying the contribute form UI (contribute.html / src/contribute/*), changing map.html D3 rendering, editing the admin review UI (admin.html), schema changes outside the enrichment fields (notes_sources / notes_confidence / enrichment_version), general programming tasks unrelated to the stakeholder graph."
---

# Enrich a mapping-ai entity

## Overview

Drives the full enrichment pipeline end-to-end from a seed (name or entity_id) plus an operation hint. Research via Exa MCP (or WebSearch fallback) → Haiku classification → validated draft → `/submit` → `/admin` auto-approve. Writes land with durable source provenance in `notes_sources`.

Five operations routed from this single entry point: **seed** a new person/org/resource, **enrich** an existing entity, **edge** propose (v1: documented, not auto-written), **merge** propose (v1: documented, not auto-written), **verify** re-run research on an existing row.

## Preconditions

Check at skill entry. If any required env var is missing, stop and tell the caller what to set.

| Variable            | Required | Purpose                                    |
| ------------------- | -------- | ------------------------------------------ |
| `DATABASE_URL`      | yes      | Duplicate detection + entity state fetch   |
| `CONTRIBUTOR_KEY`   | yes      | `mak_<32hex>` team key passed to `/submit` |
| `ADMIN_KEY`         | yes      | Auto-approval via `/admin`                 |
| `ANTHROPIC_API_KEY` | yes      | Haiku belief classifier                    |
| `EXA_API_KEY`       | optional | Skipped if Exa MCP tool is present         |

**Exa MCP detection (runtime):** probe the session's tool registry for any tool matching `mcp__*exa*web_search*` and `mcp__*exa*web_fetch*`. If both are present, use them as the primary retriever. If absent, fall back in order: `EXA_API_KEY` → built-in `WebSearch` + `WebFetch`. The skill does not handle Exa credentials itself — that's the plugin's job. Warn the caller only if neither Exa MCP, nor `EXA_API_KEY`, nor `WebSearch` is available.

**Exa toggle — ask the user before spending credits.** When Exa is available, `research.js` takes `--use-exa=auto|force|off` (default `auto`). Before running Exa-based research on a new entity, ASK the caller whether to use Exa for this run, unless they've already signalled it. Exa produces higher-quality sourcing but spends API credits; for quick tests, batch imports of expert-curated data, or re-verification of already-sourced entities, `--use-exa=off` (alias `--no-exa`) is often the right choice. Example phrasing: "Exa MCP is available. Use it (higher quality, spends credits) or skip it (`--no-exa`, degraded fallback)?"

**Batch import path.** When the user has already done the research and provides a CSV (expert-curated rows with source URLs filled in), skip Exa entirely and route through `scripts/enrich/batch-import.js --file rows.csv [--execute]`. This is the correct path for mapping-party submissions, CSV exports from a research spreadsheet, and any case where the contributor has gathered sources themselves. Dry-run is the default.

## Quick Reference

| Operation          | First step          | Canonical invocation                                                                                                                                       |
| ------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seed new person    | Search existing DB  | `node scripts/enrich/research.js --name "Helen Toner" --type person \| node scripts/enrich/validate.js --stdin && node scripts/enrich/submit.js --execute` |
| Seed new org       | Search existing DB  | `node scripts/enrich/research.js --name "Inria" --type organization \| node scripts/enrich/submit.js --execute`                                            |
| Seed new resource  | Search existing DB  | `node scripts/enrich/research.js --name "Situational Awareness" --type resource \| node scripts/enrich/submit.js --execute`                                |
| Enrich existing    | Fetch current state | `node scripts/enrich/research.js --entity-id 1849 --mode=enrich \| node scripts/enrich/submit.js --execute`                                                |
| Re-verify existing | Fetch current state | `node scripts/enrich/research.js --entity-id 1849 --mode=reverify \| node scripts/enrich/submit.js --execute`                                              |
| Add edge (v1)      | Document proposal   | See `references/workflow.md` § "Add edge" — not auto-submitted in v1                                                                                       |
| Propose merge (v1) | Document proposal   | See `references/workflow.md` § "Propose merge" — requires `--confirm`, not auto-executed in v1                                                             |

Read `references/workflow.md` for per-operation recipes. Read `references/schema.md` for enum values. Read `references/exa-queries.md` for query templates. Read `references/belief-rubric.md` to understand what Haiku does with the evidence.

## Operation routing

When the caller invokes the skill, ask (or infer from the request) which of the five operations applies, then follow the recipe in `references/workflow.md`. Pass the operation hint as a flag on `research.js` (`--mode=enrich`, `--mode=reverify`). A name-only invocation defaults to `seed` once duplicate detection confirms the entity isn't already present.

## Before any edit (read-before-write)

Enrichment and re-verify operations MUST fetch the current entity state before proposing changes. The 2026-04-18 workshop-overwrite post-mortem shipped because an agent replaced a teammate's work instead of merging it.

The protocol:

1. `lib/db.js#getEntityById(id)` or `/search?q=...&status=all` → fetch the live row.
2. Run research.
3. Compute a field-level diff. Only submit fields that changed and where the new evidence is stronger than what's already there.
4. Never null-out a field the caller didn't explicitly request to clear.
5. When in doubt, preview with `--dry-run` and ask the user which fields to keep.

`research.js --mode=enrich` and `--mode=reverify` already do this. If you hand-craft a payload outside those modes, replicate the diff logic or route through `submit.js` with an explicit `edit` flag.

## Capture quote, claim_date, definition

Every `notesSources` entry should include `quote`, `claim_date`, and (for AGI timeline claims) `definition` whenever the evidence supports it. These fields are load-bearing for three downstream features tracked in the product backlog:

- Quote-level sourcing UI on the entity detail card (needs `quote` + `url` + `claim_date`)
- AGI definition-space visualization (needs `definition` on timeline claims)
- Belief-trajectory sparklines (needs ≥2 dated claims per dimension — `claim_date` on each)

The classifier prompt in `references/belief-rubric.md` already asks Haiku to extract these. Agents hand-crafting a draft should do the same. `claim_date` is the date the speaker made the claim, not `retrieved_at` (when the page was fetched). When the source is an interview with an unclear date, leave `claim_date: null` rather than guessing.

## Destructive operations

Merge and delete are destructive. The skill refuses to run them without explicit confirmation:

- Interactive sessions: use `AskUserQuestion` to confirm with the user.
- Headless scripts: pass `--confirm` on the CLI. `submit.js` aborts early if a merge or delete draft arrives without it.

`Propose merge` is reserved in v1 — the skill documents the shape and accepts the draft, but doesn't write to a `merge_proposal` table yet. See `references/workflow.md` § "Propose merge".

## Summary block

Every skill run ends with a short transcript summary so the human reviewer has an audit trail. Template:

```
Enrichment summary
- Operation: seed|enrich|reverify|edge|merge
- Seed: <name or entity_id>
- Retriever: mcp|exa|web-search
- Queries run: <N> (see <query list> or reference file)
- Sources consulted: <N unique URLs>
- Classifier confidence: <1-5>
- Submission ID: <id>  (or "dry-run" / "none")
- Entity ID: <id>      (or "pending" / "n/a")
- Warnings: <list or "none">
```

Emit this block even on dry-runs and on failures (substitute appropriate placeholders). It's what lets a teammate retrace the agent's steps without reading the full transcript.

## Files

```
.claude/skills/enrich/
├── SKILL.md                 this file
└── references/
    ├── schema.md            entity columns, enum values, edge vocabulary
    ├── belief-rubric.md     Haiku classification prompt + rubric per dimension
    ├── exa-queries.md       query templates per entity type
    └── workflow.md          step-by-step recipes for the five operations

scripts/enrich/
├── research.js              Exa/WebSearch + Haiku → draft
├── validate.js              schema/enum validator
├── submit.js                /submit + /admin approve + dry-run
└── lib/                     shared enums, DB client, HTTP client, classifier, fuzzy match
```
