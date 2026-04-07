---
date: 2026-04-07
topic: graph-context-search
---

# Graph-Context Search

## Problem Frame

Users of the AI policy stakeholder map need to ask relational questions like "people who've worked at frontier labs AND think tanks AND government" or "how is Anthropic connected to the White House." The current LLM search only sees entity attributes (name, primary_org, stance) — it can't answer questions that require relationship/affiliation data.

The map's core value is its relationship graph (862 edges, 421 person-org affiliations), but search completely ignores this data.

## Requirements

**Query Capabilities**

- R1. Support multi-affiliation intersection queries: "people at [sector A] AND [sector B] AND [sector C]" returns entities with affiliations across all specified sectors
- R2. Support connection/path queries: "how is [entity A] connected to [entity B]" returns the relationship chain between two entities
- R3. Support relationship-type queries: "funders of [X]", "critics of [Y]", "collaborators with [Z]" filters by edge_type
- R4. Support neighborhood queries: "tell me about [entity]" returns the entity plus all its direct connections with context

**Response Format**

- R5. Return entity names (for map highlighting/filtering)
- R6. Return an overall summary (1-2 sentences describing the result set)
- R7. Return per-entity match reasons explaining WHY each result matched (e.g., "affiliated with: OpenAI [Frontier Lab], RAND [Think Tank]")

**Edge Cases**

- R8. When no entities match all criteria in an intersection query, return empty with an explanation suggesting relaxation (do NOT auto-relax)

**Visualization**

- R9. Search results display as a filtered subgraph: show ONLY matching entities and edges between them
- R10. Provide toggle to optionally show 1-hop neighbors (dimmed) for additional context
- R11. Provide clear "back to full map" escape hatch

**Performance**

- R12. Complex queries complete in <10 seconds

## Success Criteria

- A user can ask "people who've worked at frontier labs, think tanks, and government" and get correct results (verified: Heidy Khlaaf is one such person)
- A user can ask "how is Anthropic connected to Congress" and see a relationship path
- A user can ask "funders of AI safety" and get entities with funder edges to AI Safety orgs
- The filtered subgraph clearly shows how search results relate to each other
- Match reasons help users understand why each result appeared

## Scope Boundaries

- **Out of scope:** Historical/temporal queries (no timestamp data exists)
- **Out of scope:** Saved searches or alerts
- **Out of scope:** API access / programmatic queries
- **Out of scope:** Result export
- **v1 simplification:** Path queries (R2) may show direct connections only; multi-hop path-finding can be deferred if complex

## Key Decisions

- **Filtered subgraph over highlighting:** Search results should feel like a focused exploration, not noise on a busy map. Users can toggle back to full context.
- **1-hop neighbors as optional toggle:** Default is clean (results only), but users who want context can enable 1-hop view.
- **No auto-relaxation:** When criteria produce zero results, explain rather than guess. Users control their search intent.
- **Enrich LLM context with affiliations:** Send sector affiliations per person (~24KB additional context) so the LLM can reason about multi-affiliation queries.

## Dependencies / Assumptions

- map-data.json already contains `edges` and `person_organizations` arrays with relationship data
- Claude Haiku can handle ~45-50KB context (entities + enriched affiliations) within acceptable latency
- Current `api/semantic-search.js` can be extended to build enriched context

## Outstanding Questions

### Deferred to Planning

- [Affects R2][Technical] How should path-finding work for indirect connections? Breadth-first traversal server-side, or let LLM infer paths?
- [Affects R9][Technical] Should filtered subgraph re-run D3 force simulation, or use fixed positions from full map?
- [Affects R7][Technical] How detailed should per-entity match reasons be? Just the matching affiliations, or full reasoning?

## Next Steps

-> `/ce:plan` for structured implementation planning
