# Crosspartisan convergence: data schema

Data for the "where do policymakers across the aisle agree on specific AI policies" insight.

## Files

All three files live in `data/`.

- `policymakers.json` — snapshot of the 72 US policymakers already tagged with a party-affiliation edge in prod. Read-only snapshot from `map-data.json`; the DB is not modified.
- `policy-areas.json` — canonical list of 6 AI policy areas with narrow definitions, stance scales, and convergence hypotheses.
- `claims.json` — flat table of belief claims. One row per `(person, policy_area, source)`. Current file contains two `EXAMPLE_*` stubs showing the format; real entries go here.

## Stance scale

Integer, `-2` to `+2`, with `null` for "no known public position":

| value | meaning                       |
| ----- | ----------------------------- |
| -2    | Strongly oppose               |
| -1    | Oppose / skeptical            |
| 0     | Mixed / conditional / neutral |
| 1     | Support / sympathetic         |
| 2     | Strongly support              |
| null  | No known public position      |

Support/oppose is defined per policy area in `policy-areas.json` so the axis is consistent. Sparse data is fine — absence of a claim is itself a finding.

## Claim record fields

Required unless marked optional.

| field             | type    | notes                                                                                                                                                          |
| ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claim_id`        | string  | Slug unique per claim. Convention: `{lastname}_{policyarea}_{YYYY-MM}` (append `-N` on collision).                                                             |
| `person_id`       | integer | Must match an `person_id` in `policymakers.json`.                                                                                                              |
| `person_name`     | string  | Denormalized for review readability.                                                                                                                           |
| `policy_area`     | string  | Must match an `id` in `policy-areas.json`.                                                                                                                     |
| `stance`          | integer | -2 to +2 per scale above.                                                                                                                                      |
| `stance_label`    | string  | Short human-readable label (e.g. `"strongly oppose preemption"`).                                                                                              |
| `definition_used` | string  | How the policymaker defined the key term _in this claim_. One sentence. This is the crosspartisan-definition-drift column.                                     |
| `quote`           | string  | Verbatim excerpt, ≤2 sentences. Use ellipsis for trims.                                                                                                        |
| `source_url`      | string  | Canonical URL. Prefer primary source (congress.gov, official press release, hearing transcript) over news aggregators.                                         |
| `source_type`     | enum    | `hearing` \| `bill` \| `tweet` \| `op_ed` \| `interview` \| `press_release` \| `floor_speech` \| `letter` \| `report`                                          |
| `source_title`    | string  | Human-readable source title.                                                                                                                                   |
| `date_stated`     | date    | `YYYY-MM-DD`. Use the earliest confirmed date if the quote was restated; note in `notes`.                                                                      |
| `confidence`      | enum    | `high` \| `medium` \| `low`. `high` = unambiguous direct statement on the specific mechanism. `low` = inferred from adjacent statements or voting record only. |
| `extracted_by`    | enum    | `manual` \| `exa+claude` \| `voting_record`.                                                                                                                   |
| `notes`           | string? | Optional caveats: did the claim come with conditions, was it restated, are there competing statements.                                                         |

## Policymakers file extension: `ideology_score`

Each record in `policymakers.json` has two optional fields reserved for the horseshoe viz:

- `ideology_score` — float, ideally normalized `-1` (most liberal) to `+1` (most conservative). Prefer [DW-NOMINATE 1st dimension](https://voteview.com) scores for US federal legislators, published per Congress by Voteview.
- `ideology_source` — string, e.g. `"DW-NOMINATE dim1, 118th Congress"`.

Both default to `null`. When populated, the viz can place policymakers on a continuous ideology axis rather than a two-bucket party axis. This is what makes the horseshoe detectable: you need within-party spread to see whether ideological extremes curve toward each other.

State officials, appointees, and non-legislators will not have DW-NOMINATE scores. Leaving those entries at `null` is fine; the viz falls back to party clusters for them.

## Workflow to populate claims (manual or enrichment-script-assisted)

1. Pick a `(person, policy_area)` pair with no claim yet.
2. Find 1-3 primary-source statements (hearing transcripts, bill text, press releases, op-eds). Avoid aggregators.
3. Extract a verbatim quote (≤2 sentences), the definition of the key term used, the date, and the source URL.
4. Assign stance on `-2..+2` per the policy-area scale.
5. Assign confidence. Use `high` only when the quote directly addresses the specific mechanism, not the adjacent topic.
6. Append the claim to `claims.json` with a fresh `claim_id`.
7. If the policymaker has said different things at different times on the same issue, add **multiple claims** rather than averaging. The viz aggregates; that's its job.

## Viz consumers

Two viz prototypes will read these files (planned, not yet built):

- **Per-issue beeswarm**, one swarm per policy area, x-axis = stance, color = party. Convergence = D and R dots overlapping on the same x.
- **Horseshoe plot**, requires `ideology_score` populated. Policymakers placed on a curved arc (ideology bent into a U). When extremes agree on a given policy, they approach each other vertically on the arc.

A definition-drift table per key term ("AGI", "frontier model", "open source") may be derived from the `definition_used` column.
