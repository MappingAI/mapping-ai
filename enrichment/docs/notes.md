# Enrichment Docs — Notes

- Editing root `CLAUDE.md` to reduce bloat — moving detailed structural/architecture info out of the main instructions file (this is gitignored so won't generate merge conflicts)
- Adding `architecture.md` to document the full file structure separately, so `CLAUDE.md` stays focused on conventions and workflow
- Created `task_list.md` as the living execution tracker. `plan.md` = strategy/design (stable), `task_list.md` = checklist of concrete work items that get annotated when completed
- Added `canon.md` to document the class labels

## Working conventions

### When to write a committed script vs. run SQL inline

Established after Phase 5 tail, 2026-04-12. Phase 5's last three ops (CAISI rebrand, investor audit, delete entity 547) were each ~150–200 line scripts wrapping 2–5 lines of actual SQL. The dry-run/argparse/markdown-log scaffolding was ~90% of the code and dominated token cost without adding real value for one-shot, single-entity changes.

- **Committed script + `logs/*.md`** — multi-entity seeds, edge-touching ops, bulk updates, anything reusable. The audit trail earns its keep. (See `seed_tier_d.py`, `seed_entity.py`.)
- **psycopg2 heredoc inline + hand-written log** — single-entity UPDATEs, small DELETEs, factual backfills, one-off fixes. Dump a before/after snapshot into `logs/<short-name>-YYYYMMDD.md` by hand; skip the argparse/dry-run wrapper.
- **Heuristic:** if the SQL fits in one screen and touches ≤3 rows, don't bother with a script. If it touches edges, multiple entities, or is something we'd want to re-run, write the script.