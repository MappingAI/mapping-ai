# Edge Type Normalization — DRY RUN
*2026-04-11 00:48 UTC*

## Current Distribution

| Type | Count | Status |
| ---- | ----: | ------ |
| affiliated | 585 | SKIP (manual review) |
| employed_by | 518 | → employer (conditional flip) |
| collaborator | 239 | canonical |
| partner_of | 155 | → partner |
| founded | 118 | → founder |
| subsidiary_of | 116 | → parent_company (flip) |
| funded_by | 79 | → funder (flip) |
| person_organization | 72 | → employer |
| co_founded_with | 71 | → founder (conditional flip) (role=Co-founder) |
| invested_in | 45 | → funder |
| board_member | 36 | → member (conditional flip) (role=Board Member) |
| authored_by | 30 | → author (flip) |
| former_colleague | 26 | → collaborator |
| advises | 26 | → advisor |
| critic_of | 22 | → critic |
| supporter_of | 19 | → supporter |
| funder | 17 | canonical |
| published_by | 16 | → publisher (flip) |
| mentored_by | 15 | → advisor (flip) (role=Mentor) |
| spun_out_from | 12 | → parent_company (flip) |
| affiliated_with | 7 | SKIP (manual review) |
| mentioned | 1 | SKIP (manual review) |
| mentor_of | 1 | → advisor (role=Mentor) |
| critic | 1 | canonical |

**Total edges:** 2227

## Simple Migrations (consistent direction)

| Legacy | Count | → Canonical | Flip | Role | Null Roles |
| ------ | ----: | ----------- | ---- | ---- | ---------: |
| founded | 118 | founder | no | — | — |
| invested_in | 45 | funder | no | — | — |
| partner_of | 155 | partner | no | — | — |
| advises | 26 | advisor | no | — | — |
| critic_of | 22 | critic | no | — | — |
| supporter_of | 19 | supporter | no | — | — |
| former_colleague | 26 | collaborator | no | — | — |
| mentor_of | 1 | advisor | no | Mentor | 1 |
| person_organization | 72 | employer | no | — | — |
| funded_by | 79 | funder | YES | — | — |
| subsidiary_of | 116 | parent_company | YES | — | — |
| spun_out_from | 12 | parent_company | YES | — | — |
| mentored_by | 15 | advisor | YES | Mentor | 0 |
| authored_by | 30 | author | YES | — | — |
| published_by | 16 | publisher | YES | — | — |

## Conditional Migrations (mixed direction — flip only org→person)

### `employed_by` → `employer` (518 edges)

| Direction | Count | Action |
| --------- | ----: | ------ |
| person -> organization | 277 | keep (already correct) |
| organization -> person | 231 | FLIP to person→org |
| person -> person | 9 | keep (log as data quality note) |
| person -> resource | 1 | keep (log as data quality note) |

### `board_member` → `member` (36 edges)
Role backfill: `Board Member` (5 null roles)

| Direction | Count | Action |
| --------- | ----: | ------ |
| organization -> person | 24 | FLIP to person→org |
| person -> organization | 11 | keep (already correct) |
| organization -> organization | 1 | keep (log as data quality note) |

### `co_founded_with` → `founder` (71 edges)
Role backfill: `Co-founder` (12 null roles)

| Direction | Count | Action |
| --------- | ----: | ------ |
| organization -> person | 34 | FLIP to person→org |
| person -> organization | 19 | keep (already correct) |
| person -> person | 18 | keep (log as data quality note) |

**Total to migrate:** 1377 / 2227

## Skipped (manual review needed)

- `affiliated`: 585 edges
- `affiliated_with`: 7 edges
- `mentioned`: 1 edges

---
*Dry run — no changes applied. Run with `--live` to execute.*
