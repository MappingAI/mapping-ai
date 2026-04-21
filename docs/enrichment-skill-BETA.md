# Enrichment Skill (BETA)

> ⚠️ **Beta.** This skill landed in [PR #40](https://github.com/MappingAI/mapping-ai/pull/40) on 2026-04-20 and has **not been merged or deployed to production**. Unit tests pass (99/99) and dry-run works end-to-end against the Texas-legislators CSV, but the schema migration + Lambda changes it depends on are still on the PR branch. You can test the pipeline locally in dry-run mode today. To actually write to prod, the PR needs to be merged and deployed first.

A Claude Code skill at `.claude/skills/enrich/` that compresses the ~30-step manual enrichment workflow (research → classify → validate → submit → approve → regen map) into ≤5 tool calls. Follows the [Anthropic docx SKILL.md pattern](https://github.com/anthropics/skills/blob/main/skills/docx/SKILL.md).

## What this skill does

Given a seed (name or `entity_id`), it:

1. Searches the existing DB for duplicates.
2. Runs 3–5 Exa queries (or a WebSearch fallback) if you haven't already done the research.
3. Feeds the evidence to Claude Haiku for belief classification (regulatory stance, AGI timeline, AI risk level) with per-claim quotes + dates + definitions.
4. Validates the draft against the live enum schema.
5. Submits via `/submit` + auto-approves via `/admin` (same pipeline the contribute form uses).

Or, if you already have expert-curated data, bypass Exa + Haiku entirely and use the **batch-import** path for CSVs.

## Quick start (3 commands, dry-run only — no prod writes)

```bash
# 1. Check out the branch
gh pr checkout 40
# (or: git fetch origin worktree-wiggly-wibbling-wigderson && git checkout worktree-wiggly-wibbling-wigderson)

# 2. Install deps
npm install

# 3a. Dry-run a single-entity enrichment (needs ANTHROPIC_API_KEY in .env)
node scripts/enrich/research.js --name "Helen Toner" --type person --no-exa --out /tmp/draft.json
node scripts/enrich/validate.js --file /tmp/draft.json
node scripts/enrich/submit.js --file /tmp/draft.json     # dry-run is the default

# 3b. OR dry-run a batch CSV (no API keys needed)
node scripts/enrich/batch-import.js --file docs/enrichment-sample.csv
```

The batch-import output shows one line per row:

```
[DRY-RUN] Processing 3 row(s) from docs/enrichment-sample.csv

~ new Example Person       [dry-run OK, payload size 1842B, 2 sources]
~ #42 Existing Entity     [dry-run OK, payload size 2104B, 3 sources]
```

## To actually write to prod

Gated on the PR being merged + the maintainer deploying. In `.env` you need:

| Variable            | Used by                 | Get it from                                                          |
| ------------------- | ----------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`      | Duplicate detection     | Team secrets                                                         |
| `CONTRIBUTOR_KEY`   | `/submit` auth          | Team secrets (or mint one via `scripts/generate-contributor-key.js`) |
| `ADMIN_KEY`         | `/admin` auto-approve   | Team secrets                                                         |
| `ANTHROPIC_API_KEY` | Haiku classifier        | your own account                                                     |
| `EXA_API_KEY`       | Optional — Exa research | your own account (or use `--no-exa` to skip)                         |

Once the PR is merged and `sam deploy` has run, add `--execute` to any of the commands above.

## What's tested vs not tested

### Tested ✓

- 99 unit tests pass (`npx vitest run`) including regex parity between `scripts/enrich/lib/schema.js` and `api/submit.js` enum sets.
- Batch-import dry-run against a 22-row CSV of Texas AI-policy legislators (3 edits + 19 new entities). 0 validation errors, 0 warnings.
- Per-claim fields (`quote`, `claim_date`, `definition`, `field_name`) round-trip through the classifier → `notes_sources` pipeline.
- Typecheck + lint + format all clean.

### NOT tested (do not trust blindly)

- **No live `/submit` or `/admin` call against prod yet.** The schema migration adds three nullable columns and extends one trigger; they are additive with `IF NOT EXISTS`, so the risk is low, but nothing has been written to prod through this code yet.
- **Haiku classification quality** on real entities has not been calibrated. Expect the first 10 enrichments through the live path to need human review of the belief fields; use `--no-exa` + the batch-import path until you trust the classifier.
- **Exa MCP runtime detection** inside a Claude Code session is documented in `.claude/skills/enrich/SKILL.md` but hasn't been exercised end-to-end with the actual Exa plugin tool names.
- **Auto-approve loops**: batch-import with `--execute` submits and approves one row at a time. If the script dies mid-batch, already-submitted rows stay in prod and you need to identify and clean up by hand (no transaction bracket across rows).

## How to give feedback

- **Bugs**: comment on [PR #40](https://github.com/MappingAI/mapping-ai/pull/40). Paste the full command you ran + the stderr.
- **Schema / data-model concerns**: comment on the related brainstorm `docs/brainstorms/2026-04-20-enrichment-skill-requirements.md` or the plan `docs/plans/2026-04-20-001-feat-enrichment-skill-plan.md`.
- **Feature requests** (quote-level sourcing UI, AGI definition-space viz, trajectory sparklines): separate — these are downstream of this PR and live in the 4/18 feature brief.

## Slack-ready share blurb

> 🧪 Beta: new enrichment skill for the mapping-ai pipeline. PR: https://github.com/MappingAI/mapping-ai/pull/40
>
> To try it locally (dry-run, no prod writes):
>
> ```
> gh pr checkout 40
> npm install
> node scripts/enrich/batch-import.js --file docs/enrichment-sample.csv
> ```
>
> Compresses the manual "research → classify → submit → approve" loop into 3 commands (or 1 skill invocation in Claude Code). Quickstart: `docs/enrichment-skill-BETA.md`.
>
> Won't write to prod until the PR is merged + deployed — safe to explore.
