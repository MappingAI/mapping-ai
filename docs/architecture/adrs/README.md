# Architecture decision records

One file per significant decision. Dated. Immutable once merged.

## Format

```markdown
# ADR-NNNN: short title

**Status:** Proposed | Accepted | Superseded by ADR-NNNN
**Date:** YYYY-MM-DD
**Authors:** names

## Context

What's the situation that prompted this decision? What constraints, pain points, or opportunities are at play?

## Decision

What we're doing. One or two sentences if possible.

## Alternatives considered

Options that were on the table, and why each was rejected.

## Consequences

What changes. What stays. What's at risk. What compensating controls we're putting in place.

## References

Links to related docs, external sources, discussion transcripts.
```

## Rules

1. Number sequentially starting at 0001. Never renumber.
2. Once merged, never edit except to fix typos or add a "Superseded by ADR-NNNN" marker to the Status line. Reversals happen via a new ADR, not by editing an old one.
3. Keep them short. If you need 10 pages of context, the decision is probably not ready to write down.
4. Reference ADRs from `current.md`, `target.md`, CLAUDE.md, and PR descriptions so they stay discoverable.

## Index

- [ADR-0001: Migrate off AWS to Cloudflare + Neon + TanStack Start](0001-migrate-off-aws.md) (2026-04-21)
