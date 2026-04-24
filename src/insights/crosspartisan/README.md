# Crosspartisan convergence insight

**Question:** On which specific AI policy mechanisms do US policymakers from opposite parties converge, and where do they define the key terms differently enough that apparent agreement dissolves on inspection?

**Target audience:** policymakers, staffers, reporters. Shareable as static graphics in a written report and as interactive D3 widgets on `insights.html`.

**Status:** scaffold only. Schema, policymaker snapshot, and policy-area definitions are in place. Claims data is empty apart from example stubs. Viz components are not yet wired up.

## Contents

```
crosspartisan/
├── README.md             # this file
├── schema.md             # claim-record schema, stance scale, workflow
└── data/
    ├── policymakers.json # 72 policymakers with party edges (44 D, 28 R), read-only snapshot
    ├── policy-areas.json # 6 canonical AI policy areas with narrow definitions
    └── claims.json       # empty + 2 EXAMPLE_ stubs; replace with real claims
```

## v1 scope

- 72 US policymakers (those already tagged with a party-affiliation edge in the DB).
- 6 AI policy areas: state preemption, open-weight model restrictions, compute governance, chip export controls, pre-deployment testing, developer liability.
- Statements from 2023-01-01 onward, primary sources preferred.
- Sparse coverage is fine. Blank cells are data.

Out of scope for v1: orgs (covered in sibling scoping note — political ideology for think tanks is harder to pin without PAC/lobbying filings); Independents (e.g. Bernie Sanders); policymakers without a tagged party edge.

## Planned viz (not yet built)

1. **Per-issue beeswarm, colored by party.** Six stacked swarms (one per policy area), x-axis = stance -2..+2. Convergence shows as D and R dots overlapping on the same x-value. Primary static-report asset.
2. **Horseshoe plot.** Requires the optional `ideology_score` field to be populated (DW-NOMINATE dim-1 for federal legislators). Policymakers plotted on a curved arc of ideology; when ideological extremes agree on a policy, they approach each other vertically. This is the viral-thread artifact if the pattern emerges.
3. **Definition-drift table.** Per key term ("AGI", "frontier model", "open source"), side-by-side excerpts of how D and R policymakers define it. Derived from the `definition_used` column.

## How the DB is not touched

`policymakers.json` is a read-only snapshot extracted from the local `map-data.json` export. No script in this directory writes to the database. Claims live only in these JSON files. If and when the workflow matures, we can decide whether to promote this into its own table (see `db_audit_log.md` memory re: parallel proposal for mutation-tracking tables).

## Next steps (future PRs)

- Populate 5-10 real claims per policymaker across the 6 policy areas (manual + Exa/Claude-assisted extraction).
- Populate `ideology_score` for federal legislators from Voteview DW-NOMINATE.
- Build beeswarm component in `src/insights/crosspartisan/Beeswarm.tsx`.
- Build horseshoe component once enough `ideology_score` values are filled in.
- Wire both into `insights.html` via a new section in `src/insights/App.tsx`.
