# Architecture docs

Canonical source for the mapping-ai stack. Three files, three jobs:

- **[`current.md`](current.md)**: what's actually running in production **right now**. Updated only when a migration cuts over. If you want to know what a deploy does or what AWS resources exist, read this.
- **[`target.md`](target.md)**: where we're heading. Updated when a direction changes. Sections are tagged with implementation status (shipped / in-progress / planned) so nothing is ambiguous.
- **[`adrs/`](adrs/)**: architecture decision records. One file per significant decision, dated, immutable once written. Captures the "why" behind a choice so future contributors don't re-relitigate settled questions.

## When to read which

| Question                                    | File                                     |
| ------------------------------------------- | ---------------------------------------- |
| What database are we using?                 | `current.md`                             |
| Why aren't we on AWS anymore?               | `adrs/0001-migrate-off-aws.md`           |
| What does the final architecture look like? | `target.md`                              |
| Why is the map page inline HTML?            | `current.md` (known-limitations section) |
| What does "Phase 2" mean?                   | `adrs/0001-migrate-off-aws.md`           |

## Invariants

1. `current.md` flips atomically when a migration cuts over. There is no "migrating to X" status inside it; that lives in ADRs and `target.md`.
2. ADRs are immutable. To reverse a decision, write a new ADR that supersedes the old one. Never edit a merged ADR except to fix typos.
3. Instruction files (`CLAUDE.md`, `README.md`, `ONBOARDING.md`) must not assert architecture directly. They link here. This keeps Claude Code sessions and human readers from inheriting stale infrastructure claims.

## Working artifacts

During an active migration, phase-specific working docs may live here (e.g. [`phase-0-audit.md`](phase-0-audit.md)). They can be archived or deleted once the migration they describe is complete.
