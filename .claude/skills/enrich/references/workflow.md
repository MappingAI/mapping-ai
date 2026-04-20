# Operation recipes

Step-by-step playbooks for the five operations the `enrich` skill covers. Each recipe terminates with the Summary block from `SKILL.md`.

## 1. Seed new entity (person / organization / resource)

Use when adding a stakeholder, org, or artifact that isn't already in the DB.

1. **Duplicate check.**
   - `research.js` calls `lib/db.js#searchEntitiesByName(name, entityType)` before any external retrieval.
   - If the top match has similarity ≥ `SIM_HIGH`, stop and surface the existing entity ID to the caller with a "duplicate detected" result. The caller chooses to abort, switch to `--mode=enrich`, or force-proceed with an override.
   - If similarity is between `SIM_LOW` and `SIM_HIGH`, surface the candidates but continue — duplicate detection is advisory at that level.

2. **Research.**
   - `node scripts/enrich/research.js --name "Helen Toner" --type person`
   - Runs 3–5 queries per `exa-queries.md`, feeds snippets to Haiku, returns a draft.
   - Populates `notesSources` with retrieved URLs + classifier-extracted per-claim quotes.

3. **Validate.**
   - `node scripts/enrich/validate.js --stdin` against the draft JSON.
   - Errors block submission. Warnings (e.g., `agiTimeline` claim without a `definition`) surface but don't block.

4. **Dry-run preview.**
   - `node scripts/enrich/submit.js --stdin` (default is `--dry-run`).
   - Returns the `/submit` payload. Review it. For interactive sessions, use `AskUserQuestion` to confirm.

5. **Execute.**
   - `node scripts/enrich/submit.js --stdin --execute`.
   - POSTs to `/submit` → captures `submissionId` → POSTs to `/admin` `{action: 'approve', submission_id}` → captures `entityId`.
   - Admin approval auto-regenerates `map-data.json` and invalidates CloudFront.

6. **Summary block.** Emit the template in the caller transcript.

### Example

```bash
node scripts/enrich/research.js --name "Helen Toner" --type person \
  | node scripts/enrich/validate.js --stdin \
  && node scripts/enrich/submit.js --stdin --execute
```

Or as one pipeline with the submit's own validation gate:

```bash
node scripts/enrich/research.js --name "Yann LeCun" --type person \
  | node scripts/enrich/submit.js --stdin --execute
```

## 2. Enrich existing entity

Use when an entity exists but is missing belief fields, has stale evidence, or needs additional sources.

1. **Fetch current state.**
   - `research.js --mode=enrich --entity-id=1849` calls `lib/db.js#getEntityById(1849)` first.
   - Never skip this step — the read-before-write rule in SKILL.md blocks blind overwrites.

2. **Research.**
   - Same query loop as seed, but the classifier receives the current entity state alongside the new evidence and produces a **diff-shaped draft**: only fields where new evidence contradicts or strengthens the existing classification.

3. **Review the diff.**
   - `--dry-run` output shows `{ changed: {...}, unchanged: [...], new_sources: [...] }`.
   - The caller decides which fields to keep. For interactive sessions, ask per field via `AskUserQuestion`.

4. **Submit.**
   - `submit.js --execute` POSTs a submission with only the fields the caller confirmed. Untouched fields are left NULL in the submission; `/admin` approve merges into the existing entity without clearing them.

5. **Summary block.**

## 3. Re-verify existing entity

Use for periodic re-enrichment (e.g., the planned re-enrichment pass across ~1,700 entities, or a monthly sweep of high-profile stakeholders).

1. **Fetch current state** (same as Enrich).
2. **Research** with `--mode=reverify`. Queries are tuned to surface sources **published after the last `enrichment_version` run** — see `exa-queries.md` § "Re-verify mode".
3. **Diff.** Emphasise changes in `claim_date` and `definition` — trajectory sparklines depend on accumulating dated claims over time, not replacing them.
4. **Append, don't replace.** In re-verify mode the new `notesSources` are **added** to the existing array, preserving older dated claims. The classifier may still update `regulatoryStance` / `agiTimeline` / `aiRiskLevel` when the new evidence is decisive.
5. **Submit.**
6. **Summary block.**

```bash
node scripts/enrich/research.js --entity-id 1849 --mode=reverify \
  | node scripts/enrich/submit.js --stdin --execute
```

## 4. Add edge (v1: documented, not auto-submitted)

Edge creation is **out of scope for v1** of this skill — the skill documents what an edge proposal should look like and defers to the admin UI or a follow-up PR for the write. Reason: the edge vocabulary is still consolidating, and autowriting edges from inferred evidence is the highest-risk surface.

### Proposal shape

When the caller asks to "add an edge between X and Y", produce a structured proposal in the summary block:

```
Proposed edge:
  source: <entity_id or name> (<type>)
  target: <entity_id or name> (<type>)
  edge_type: <canonical value from schema.md>
  role: <free text; optional>
  is_primary: <true | false; optional, defaults false>
  evidence: <URL + quote supporting the relationship>
```

Skip if a duplicate edge already exists (check `lib/db.js` before proposing). The canonical edge types live in `schema.md`.

### v2 plan (not this bundle)

A future `scripts/enrich/edge.js` will accept the proposal shape above and POST via `/submit` with a new `type: 'edge'` hint once the admin UI supports edge review. For now, the skill surfaces the proposal and the human adds the edge via admin.html or direct DB.

## 5. Propose merge (v1: documented, requires --confirm)

Merge is destructive — it collapses two entity rows into one and re-homes every edge. The skill refuses to execute a merge without explicit confirmation.

### Protocol

1. Identify the two entity IDs. `findMatches` on a shared name or a deliberate caller-supplied pair.
2. Produce a merge proposal in the summary block:

```
Proposed merge:
  keep: <entity_id to retain> (<name>, <type>, <submissions count>)
  drop: <entity_id to merge in>
  reason: <free text>
  edges_moved: <count>
  conflicts: <list of fields where the two rows disagree and which value to keep>
```

3. In interactive sessions: `AskUserQuestion` with a yes/no question citing the two entity names. Abort on no.
4. In headless scripts: require `--confirm` on `submit.js`. Without it the script exits non-zero with a clear message.

### v1 behavior

v1 writes the proposal to the transcript **only**. It does not write to any `merge_proposal` table (none exists yet) and does not actually merge entities. The human reviewer applies the merge via admin.html or direct DB work.

### v2 plan

A future bundle adds a `merge_proposal` table plus an `/admin` action. At that point `submit.js --action=merge --confirm` becomes the canonical path.

## Common failure modes

| Failure                                                   | Cause                               | Remedy                                                                                                                                            |
| --------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/submit` returns 429                                     | Contributor key rate limit exceeded | Wait, or request elevated daily limit via `scripts/generate-contributor-key.js`                                                                   |
| `/submit` OK, `/admin` 500                                | Orphaned submission                 | `submit.js` surfaces `submissionId` with `needsManualApproval: true`. Reviewer approves via admin.html. Do NOT re-run `/submit` — it'd duplicate. |
| Haiku returns off-enum value                              | Prompt drift or novel input         | `validate.js` blocks the submission; `classify.js` surfaces `enumWarnings`. Fix the enum or tune `belief-rubric.md`.                              |
| Exa MCP absent, `EXA_API_KEY` unset                       | Fallback to WebSearch               | Draft carries `retriever: 'web-search'`; classifier confidence auto-caps at 3. Install the Exa MCP plugin for better evidence.                    |
| Duplicate detection hit                                   | Entity already exists               | Switch to `--mode=enrich --entity-id=<matched>` or abort.                                                                                         |
| `notesSources` missing `claim_date` on AGI timeline claim | Source had no date                  | Leave it null. Do not fabricate. Warning surfaces but does not block.                                                                             |

## Summary block template (repeated from SKILL.md)

```
Enrichment summary
- Operation: seed|enrich|reverify|edge|merge
- Seed: <name or entity_id>
- Retriever: mcp|exa|web-search
- Queries run: <N>
- Sources consulted: <N unique URLs>
- Classifier confidence: <1-5>
- Submission ID: <id>  (or "dry-run" / "none")
- Entity ID: <id>      (or "pending" / "n/a")
- Warnings: <list or "none">
```
