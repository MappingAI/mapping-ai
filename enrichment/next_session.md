# Next Session Handoff

**Last updated:** 2026-04-11
**Branch:** `connor/data-processing`
**Last commit:** `38e9e94` — "phase 4 reclassify round 3"

---

## Phase 3 (Entity Enrichment) — DONE

All 594 entities enriched across batches 1–71. Phase 3 is complete.

---

## Phase 4 (Edge Enrichment) — IN PROGRESS

### Workstream 1: Reclassify `affiliated` edges — 61% done

Started with 591 `affiliated`/`affiliated_with` edges. Applied 3 rounds of
deterministic rules (no web search):

| Round | Rules | Edges |
| ----- | ----- | ----: |
| 1 | Initial auto-reclassifier (`--all`) | 95 |
| 2 | `role_relationship` + `structural_default` | 222 |
| 3 | `target_specific` + expanded educational regex | 44 |
| **Total** | | **361 / 591 (61%)** |

**230 remain** (223 `affiliated` + 7 `affiliated_with`). Breakdown by pattern:

| source_cat | target_cat | count | Notes |
| ---------- | ---------- | ----: | ----- |
| Academic | Academic | 23 | Role = home institution; need to distinguish visiting/board/collaborator |
| Policymaker | Government/Agency | 17 | Oversight/former-Sec roles; edge validity unclear |
| Policymaker | Think Tank/Policy Org | 15 | Role = elected title; ~48 policymaker→non-gov total |
| AI Safety/Alignment | Academic | 11 | Research affiliations; member vs collaborator |
| Policymaker | Academic | 9 | Alumni vs advisory board; need research |
| Policymaker | AI Safety/Alignment | 8 | Senators on safety orgs — need web search |
| Academic | VC/Capital/Philanthropy | 7 | Board seats? Investors? |
| Investor | Frontier Lab | 7 | LP/board/advisor? |
| ... | ... | ... | ... |

**Decision:** The ~48 policymaker → non-gov edges are *not to be deleted* per explicit
user instruction — leave for later manual review. The other ~182 genuinely ambiguous edges
need research (web search per edge), which burns tokens fast. Recommended approach: either
accept the 230 as `affiliated` permanently for now, or do a targeted web-search sweep
in a dedicated session focused on the highest-value subsets (e.g. the 23 Academic→Academic
cases might be batch-resolvable by entity notes alone).

**Key script:** `scripts/reclassify_affiliated.py`
- `--dry-run --all` to see what rules would now catch
- `--live --target-specific --role-relationship` to apply the deterministic rules to any new affiliated edges added in the future

---

### Workstream 2: Add `source_url` to all 2,221 edges — NOT STARTED

Currently **0 / 2,221 edges** have a `source_url`. This is the biggest data quality gap
from an auditability standpoint. Options:

1. **Script approach** (`enrich_edge.py`): For each edge, look up the entity notes (which
   have sources embedded) + do an Exa search → extract a URL → write to edge. This burns
   API tokens but is automatable.
2. **Manual approach**: For Phase 3 enriched entities, source URLs are in the batch logs
   (`logs/entity-enrichment/entity-enrichment-batch-*.md` → `## Sources` section). A
   parsing script could back-fill edge source_urls from these logs without any API calls.
   This is the **cheapest first pass**.

Recommended starting point: write a script that cross-references each entity's logged
sources (from batch logs) with its edges, and populates `source_url` where there's a
clear 1-to-1 match (e.g. the entity's own website → their `employer` edge). Won't cover
everything but zero-cost and recovers significant coverage.

---

### Workstream 3: Fix 440 audit flags — NOT STARTED

From `logs/audit-report-20260411-v3.md` (run on 758 enriched entities):

| Flag type | Count | Description |
| --------- | ----: | ----------- |
| `influence_without_edge` | 294 | Entity has `influence_type` set but no matching edge type |
| `role_without_edge` | 146 | Entity has `notes_confidence` but no edges at all |

The 294 `influence_without_edge` flags are the most tractable. Many are **sub-orgs with
no member edges** (e.g. "Stanford SAIL has influence_type=Researcher/analyst but no
employer/member edges" — just needs a `member` edge from Stanford University, which
already exists). A batch script could resolve the most obvious ones by inferring missing
edges from entity category + parent org patterns.

Full flag lists are in the audit report. Re-run `scripts/audit.py` to get fresh numbers
since edge reclassification may have resolved some `influence_without_edge` flags.

---

### Workstream 4: Edge directionality — NOT STARTED

Canonical convention: edges go **from actor → to target**. Some edges were seeded reversed.
This needs a directional audit — lower priority than workstreams 1–3.

---

## Recommended Next Steps (in priority order)

1. **Re-run `audit.py`** — get fresh flag count after Phase 4.1 edge reclassification.
   Some `influence_without_edge` flags will have been resolved (e.g. now-member edges).
   ```
   python scripts/audit.py > logs/audit-report-20260412.md
   ```

2. **Workstream 3 (audit flags)** — Start with `influence_without_edge`. Many are
   sub-org/lab entities that just need a `member` or `collaborator` edge added to their
   parent institution. Can be done by script without web search.

3. **Workstream 2 (source_url)** — Write a cheap zero-API pass: parse entity notes
   (which contain embedded source URLs from batch logs) → back-fill `source_url` on
   employer/founder/collaborator edges where entity + target org match.

4. **Workstream 1 tail (230 remaining affiliated)** — Only if doing a dedicated manual
   review session with web search enabled. Start with the 23 Academic→Academic cases
   (resolvable from entity notes alone, no web search needed).

---

## DB State Snapshot (2026-04-11)

| Metric | Value |
| ------ | ----- |
| Total entities | ~1,800 |
| Enriched entities (Phase 3) | 758 |
| Total edges | 2,221 |
| Edges with source_url | 0 |
| Remaining affiliated/affiliated_with | 230 |
| Audit flags | 440 (stale — re-run audit.py) |

Edge type distribution:
```
employer: 632    member: 283    collaborator: 268    affiliated: 223
founder:  208    partner: 161   funder:       141    parent_company: 124
advisor:   85    author:   30   critic:        23    supporter: 19
publisher: 16    affiliated_with: 7  mentioned: 1
```

---

## Key Files

| File | Purpose |
| ---- | ------- |
| `scripts/reclassify_affiliated.py` | Phase 4.1 — affiliated edge reclassification |
| `scripts/audit.py` | Run anytime to check data quality state |
| `logs/reclassify-phase4-round3-20260411.md` | Latest reclassification log |
| `logs/audit-report-20260411-v3.md` | Latest audit flag report |
| `docs/enrichment-queue.md` | Manual enrichment queue (Phase 3, now complete) |
| `docs/plan.md` | Full phase spec |
| `docs/canon.md` | Canonical field values (edge types, categories, beliefs) |
