# Phase 0 audit: instruction surface findings

**Working artifact.** Produced 2026-04-21 as the first step of the migration described in [ADR-0001](adrs/0001-migrate-off-aws.md). Archive once Phase 0 is complete and all REWRITE items have been resolved.

## Scope

Every file in the repo that provides instructions to Claude Code, to coding agents, or to human contributors. Assessed for architectural assertions that will contradict the target stack after migration.

Memory files referenced in this audit live in Claude Code's per-user memory store at `~/.claude/projects/<project-slug>/memory/`, not in this repo. They are not visible to readers of the GitHub repo but ARE loaded into every Claude Code session as context, so updates to them are part of Phase 0 even though no repo commit can show them.

## Summary

- 12 instruction files audited (CLAUDE.md, TECH.md, ONBOARDING.md, README.md, docs/DEPLOYMENT.md, docs/CONTRIBUTOR.md, docs/api-cost-tracking.md, docs/enrichment-v2-design.md, workshop/DATABASE-ORIENTATION.md, .claude/docs/architectural_patterns.md, .github/workflows/deploy.yml, .github/workflows/ci.yml)
- 19 memory files audited (MEMORY.md + 18 entry files)
- **~87 architectural assertions flagged for REWRITE** in instruction files
- **~12 items worth PRESERVE WITH FRAMING** (historical post-mortems + stack-specific lessons)
- **~18 non-issues (KEEP)**: writing style, safety, workflow
- **3 memory files marked for DELETE** (directly contradict target, or badly stale)

## Dispositions

### Instruction files (repo-level)

| File                                     | Treatment                 | Rationale                                                                                                                                                     |
| ---------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TECH.md`                                | Full lift to `current.md` | 100% current-stack architecture; nothing else in it. `current.md` replaces it; `TECH.md` becomes a pointer or gets deleted.                                   |
| `CLAUDE.md`                              | Targeted edits            | Architecture sections (~lines 13-100, ~137-330) lift to `current.md`. Style/safety/workflow/DB-safety sections stay. Point to `docs/architecture/` for infra. |
| `ONBOARDING.md`                          | Targeted edits            | Stack topology + setup commands lift. Product overview + form feature catalogue stays.                                                                        |
| `docs/DEPLOYMENT.md`                     | Targeted edits            | Deploy process lifts to `current.md`. PR requirements + branch protection + incident response stays.                                                          |
| `README.md`                              | Minor edits               | Tech stack bullet list + `npm ci` commands update or point to `current.md`.                                                                                   |
| `docs/CONTRIBUTOR.md`                    | Minor edits               | API base URL + endpoint list; rest stays.                                                                                                                     |
| `workshop/DATABASE-ORIENTATION.md`       | Minor edits               | External dependencies table updates; DB-level content stays.                                                                                                  |
| `docs/api-cost-tracking.md`              | KEEP                      | Pricing reference, not architecture. Needs periodic refresh on its own cadence.                                                                               |
| `docs/enrichment-v2-design.md`           | KEEP                      | Data-flow design, stack-neutral.                                                                                                                              |
| `.claude/docs/architectural_patterns.md` | KEEP with one factual fix | Line 40 incorrectly says submit writes to GitHub; fix to "database". Rest is frontend patterns, stack-agnostic.                                               |
| `.github/workflows/deploy.yml`           | Full rewrite in Phase 3   | Current AWS-specific flow; replaced when cutover happens. No change in Phase 0.                                                                               |
| `.github/workflows/ci.yml`               | Minor edits               | `sam validate` job is current-only; `quality` job (lint/typecheck/test/build) stays.                                                                          |

### Memory files

**DELETE (Phase 0):**

- `aws_migration.md`: directly contradicts target (asserts "No Vercel/Neon", "migrate Neon → Aurora"). The reversal is captured in [ADR-0001](adrs/0001-migrate-off-aws.md). Deleting.
- `project_arch.md`: snapshot from 2026-03-26 claiming "Neon, already migrated". Project has since migrated Neon → RDS → planned back to Neon. Stale twice over. Current-state info now lives in `current.md`.
- `react_migration_status.md`: snapshot from 2026-04-15. React migration is complete per git history (`feat/react-contribute` merged). Historical and no longer current.

**DELETE (outdated, launch-specific):**

- `launch_timeline.md`: three-phase rollout (April 3 / 7 / 9). All phases shipped. Historical.

**KEEP (stack-agnostic):**

- `feedback_writing_style.md`
- `feedback_no_claude_coauthor.md`
- `feedback_no_secrets.md`
- `feedback_never_push_main_directly.md`
- `feedback_test_after_push.md` (URLs to smoke-test stay valid even after migration)
- `feedback_test_thoroughly.md` (minor future touch-up: replace `sam build` / `sam deploy` with equivalent wrangler gates after Phase 3)
- `user_context.md`
- `db_audit_log.md` (planned feature, still valid design target)
- `meeting_feedback.md` (historical product decisions; fine as historical record)
- `credentials.md` (describes current credential layout; update after Phase 2 Neon migration lands)

**KEEP during migration window, delete at cutover:**

- `feedback_sam_deploy_danger.md`: load-bearing today. Obsolete after Phase 3 cutover. Add delete-at-cutover marker.
- `feedback_no_defer_d3.md`: specific to inline `map.html`. Obsolete after Phase 3 map rewrite. Add delete-at-cutover marker.

**REWRITE:**

- `backend_lessons.md`: mixes valid schema notes (some still correct) with stale Neon/RDS claims and `sam deploy` workflow. Either trim to just schema/process notes or delete (since `current.md` covers the architecture side already).
- `data_pipeline.md`: `scripts/` pipeline description is still useful; RDS endpoint claim is current but duplicates `current.md`. Trim to pipeline-only, drop infra.

### Instruction files (global, user-level)

Not audited in depth since they live outside this repo (`~/.claude/CLAUDE.md`). Verified they contain writing-style and workflow guidance only (no project-specific architecture claims). No action needed.

### Post-mortems and solutions (`docs/post-mortems/`, `docs/solutions/`)

**PRESERVE WITH FRAMING.** These are historical incident records and debugging notes. They accurately describe what happened on the stack that existed at the time. Action: add a one-line header at the top of each:

```markdown
**Historical context:** this document describes behavior on the AWS stack (RDS + Lambda + CloudFront + S3 + SAM). See `docs/architecture/current.md` for today's live stack and [ADR-0001](../architecture/adrs/0001-migrate-off-aws.md) for migration status.
```

Affected files (11):

- `docs/post-mortems/2026-04-09-d3-defer-map-outage.md`
- `docs/post-mortems/2026-04-18-workshop-overwrite-and-credential-leak.md`
- `docs/solutions/integration-issues/sam-deploy-overwrites-manual-cloudfront-config-2026-04-16.md`
- `docs/solutions/integration-issues/thumbnail-pipeline-dead-cloudfront-and-external-fallbacks-2026-04-19.md`
- `docs/solutions/integration-issues/vite-react-typescript-migration-from-inline-html-2026-04-15.md`
- `docs/solutions/best-practices/mobile-entity-directory-replacing-d3-map-2026-04-08.md`
- `docs/solutions/ui-bugs/canvas-sprite-dimming-and-cache-invalidation.md`
- `docs/solutions/ui-bugs/inline-org-panel-rich-field-parity.md`
- (3 more under `docs/solutions/*`)

### Plans, brainstorms, ideation (`docs/plans/`, `docs/brainstorms/`, `docs/ideation/`)

KEEP as-is. Dated working artifacts. Not instruction documents.

### Archive (`archive/`)

KEEP as-is. Already in archive directory.

## Cross-cutting identifiers to consolidate in `current.md`

All references to these now live in `current.md` as single source of truth:

- S3 bucket name: `mapping-ai-website-561047280976`
- CloudFront distribution ID: `E34ZXLC7CZX7XT`
- RDS endpoint: `mapping-ai-db.c9sccou2k3xe.eu-west-2.rds.amazonaws.com`
- API Gateway URL: `j8jamvdf6i.execute-api.eu-west-2.amazonaws.com`
- AWS region: `eu-west-2`
- Stack name: `mapping-ai`
- Lambda function names: `mapping-ai-submit`, `-search`, `-semantic-search`, `-admin`, `-upload`, `-submissions`

Any file outside `current.md` that mentions these should be rewritten to point at `current.md` instead of restating them. Prevents drift at cutover.

## What happens next (Phase 0 remaining work)

Tracked as separate tasks in the session:

1. Apply CLAUDE.md edits (lift architecture out; keep style/safety/workflow)
2. Apply TECH.md treatment (pointer or deletion, since `current.md` now covers it)
3. Apply ONBOARDING.md + README.md + DEPLOYMENT.md targeted edits
4. Delete marked memory files + rewrite `backend_lessons.md` and `data_pipeline.md`
5. Add historical framing headers to post-mortems
6. Update `MEMORY.md` index to remove deleted entries
7. Run local verification gates (typecheck, lint, build, dev server) to confirm no code path references deleted docs
