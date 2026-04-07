---
title: "feat: Graph-Context Search for Relational Queries"
type: feat
status: active
date: 2026-04-07
origin: docs/brainstorms/2026-04-07-graph-context-search-requirements.md
deepened: 2026-04-07
---

# feat: Graph-Context Search for Relational Queries

## Overview

Enable relational queries by enriching LLM search context with edge/affiliation data. Users can ask questions like "people who've worked at frontier labs AND think tanks AND government", "how is Anthropic connected to the White House", or "funders of AI safety research". Results display as a filtered subgraph with optional 1-hop neighbor toggle.

## Problem Frame

The map's core value is its relationship graph (862 edges, 421 person-org affiliations), but the current LLM search only sees entity attributes (name, category, primary_org, stance). It cannot answer questions that require relationship data. Users asking "who bridges safety orgs and frontier labs" or "how is X connected to Y" get no useful results.

(see origin: `docs/brainstorms/2026-04-07-graph-context-search-requirements.md`)

## Requirements Trace

- R1. Support multi-affiliation intersection queries (people at [sector A] AND [sector B] AND [sector C])
- R2. Support connection/path queries (how is [entity A] connected to [entity B]) — v1: direct connections only
- R3. Support relationship-type queries (funders of X, critics of Y)
- R4. Support neighborhood queries (tell me about [entity])
- R5. Return entity names for map highlighting/filtering
- R6. Return overall summary (1-2 sentences)
- R7. Return per-entity match reasons
- R8. Return empty with explanation when no matches (no auto-relaxation)
- R9. Display results as filtered subgraph (show ONLY matching entities + edges between them)
- R10. Provide toggle for 1-hop neighbors (dimmed)
- R11. Provide clear "back to full map" escape hatch
- R12. Complex queries complete in <10 seconds

## Scope Boundaries

- **Out of scope:** Historical/temporal queries (no timestamp data)
- **Out of scope:** Saved searches or alerts
- **Out of scope:** API access / programmatic queries
- **Out of scope:** Result export
- **v1 simplification:** Path queries (R2) show direct connections only; multi-hop path-finding deferred

## Context & Research

### Relevant Code and Patterns

**Backend (`api/semantic-search.js`):**
- Fetches `map-data.json` from CDN (5-min cache)
- Builds ~20KB entity context string
- Calls Claude Haiku with structured prompt
- Returns `{ names: [], explanation: "" }`
- Validates returned names against entity list (hallucination guard)

**Data structures (`api/export-map.js`):**

Both `person_organizations` and `relationships` are derived from the same `edge` table:
- `person_organizations`: Filtered view of `edge` table where `edge_type='affiliated'` and one endpoint is person, other is org. Format: `{ person_id, organization_id, role, is_primary }` — 421 entries
- `relationships`: Full edge table export. Format: `{ source_id, target_id, relationship_type, role, evidence }` — 862 entries
- `organizations`: includes `category` (sector classification like "Frontier Lab", "Think Tank/Policy Org")

**Example `map-data.json` structure (relevant fields):**
```javascript
{
  organizations: [
    { id: 123, name: "OpenAI", category: "Frontier Lab", ... },
    { id: 456, name: "RAND", category: "Think Tank/Policy Org", ... }
  ],
  people: [
    { id: 789, name: "Heidy Khlaaf", category: "Researcher", primary_org: "Trail of Bits", ... }
  ],
  person_organizations: [
    { person_id: 789, organization_id: 123, role: "Advisor", is_primary: false },
    { person_id: 789, organization_id: 456, role: "Consultant", is_primary: false }
  ],
  relationships: [
    { source_id: 789, target_id: 123, relationship_type: "affiliated", role: "Advisor" },
    { source_id: 100, target_id: 123, relationship_type: "funder", evidence: "..." }
  ]
}
```

**Frontend (`map.html`):**
- `highlightSearchSubgraph(matchedNames, showConnections)` — dims non-matches, highlights matches + connected edges
- `searchModeMatches` array — stores current search result names
- `executeAISearch(query)` — calls `/semantic-search` API, updates UI
- D3 force simulation with orbital cluster layout

### Key Data Observations

- Organizations have `category` field (e.g., "Frontier Lab", "Think Tank/Policy Org", "Government/Agency")
- People connect to orgs via `person_organizations` array (not just `primary_org` field)
- Edges have `edge_type`: affiliated, collaborator, funder, critic, authored_by, etc.

### Context Size Estimation

Current entity context: ~55KB (335 people + 479 orgs + 161 resources)
Affiliation context: ~21KB (421 person-org edges formatted as per-person summaries)
Relationship context: ~12-15KB (limited to funder, critic, collaborator edges)
**Total estimated: ~88KB** — well within Haiku's 200K token (~800KB) limit but requires monitoring

## Key Technical Decisions

- **Enrich context with sector affiliations:** Build a person-to-sectors lookup from `person_organizations` + `organizations`. Pass this to LLM so it can reason about multi-affiliation queries. Total context ~88KB (entity list + affiliations + relationships), well within Haiku's 800KB limit. Add CloudWatch monitoring for context size.

- **Structured response format:** Change LLM prompt to return `{ names: [], summary: "", match_reasons: { [name]: "reason" } }`. This enables R6 and R7.

- **Filtered subgraph over highlighting:** Default to showing ONLY matching entities (hide all non-matches via CSS `opacity: 0`), with edges between matches visible. This creates a focused exploration experience per R9. **Important:** In search mode, disable node-click highlighting to avoid visual collision — users can only click to view details, not to highlight connections. "Back to full map" restores normal interaction.

- **1-hop toggle as explicit user control:** Add a toggle button in search results UI. When enabled, show 1-hop neighbors with `.one-hop` CSS class (dimmed styling). Default: off.

- **Direct connections only for path queries (v1):** For "how is X connected to Y", the LLM reasons over the relationship context to find entities with edges to both X and Y. "Direct connection" means: entity A has an edge to X AND an edge to Y in the `relationships` array. No server-side BFS — let LLM infer from context. Defer multi-hop traversal.

- **Server-side affiliation lookup:** Build the person-sectors map on Lambda (not client) to keep response payload small and avoid exposing full graph structure.

## Open Questions

### Resolved During Planning

- **Path-finding approach:** Direct connections only for v1. Simpler, faster, meets most use cases.
- **D3 simulation for filtered view:** Keep existing node positions (no re-run simulation). Just hide non-matching nodes via CSS opacity. Simpler and avoids jarring layout shifts.
- **Match reason detail level:** Show the key affiliations that matched (e.g., "affiliated with: OpenAI [Frontier Lab], RAND [Think Tank]"). Keep it concise.

### Deferred to Implementation

- Exact wording for the "no results" explanation message
- Visual design for the 1-hop toggle button
- Whether to show match reasons inline or in a tooltip

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification.*

```
┌─────────────────────────────────────────────────────────────────────┐
│                         QUERY FLOW                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User query: "people at frontier labs AND think tanks AND government"│
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────┐                  │
│  │           semantic-search.js Lambda            │                  │
│  │                                                │                  │
│  │  1. Fetch map-data.json (cached)              │                  │
│  │  2. Build person→sectors lookup:              │                  │
│  │     person_organizations + org.category       │                  │
│  │  3. Build enriched context:                   │                  │
│  │     - Entity list (~20KB)                     │                  │
│  │     - Affiliations per person (~24KB)         │                  │
│  │  4. Call Claude Haiku with new prompt         │                  │
│  │  5. Return { names, summary, match_reasons }  │                  │
│  └───────────────────────────────────────────────┘                  │
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────┐                  │
│  │              map.html Frontend                 │                  │
│  │                                                │                  │
│  │  1. Display summary in results header         │                  │
│  │  2. Show match reasons per entity (tooltip)   │                  │
│  │  3. Call showFilteredSubgraph(names):         │                  │
│  │     - Hide all non-matching nodes             │                  │
│  │     - Show edges between matches only         │                  │
│  │  4. Show 1-hop toggle button                  │                  │
│  │  5. Toggle adds .one-hop class to neighbors   │                  │
│  └───────────────────────────────────────────────┘                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Units

- [ ] **Unit 1: Build person-to-sectors lookup in Lambda**

**Goal:** Create a data structure mapping each person to their affiliated organization sectors, enabling multi-affiliation queries.

**Requirements:** R1 (prerequisite)

**Dependencies:** None

**Files:**
- Modify: `api/semantic-search.js`

**Approach:**
- After fetching `map-data.json`, build a Map: `personId → Set<sector>`
- Iterate `person_organizations`, lookup org by ID, add org's `category` to person's sectors
- Also include `primary_org` category as fallback

**Patterns to follow:**
- Existing `getMapData()` caching pattern in `api/semantic-search.js`

**Test scenarios:**
- Happy path: Person with 3 affiliations gets all 3 sectors in lookup
- Edge case: Person with no `person_organizations` entries falls back to `primary_org`
- Edge case: Person with duplicate sector affiliations (2 orgs same sector) dedupes to single sector

**Verification:**
- Console log shows correct sector mapping for known multi-affiliation people (e.g., Heidy Khlaaf)

---

- [ ] **Unit 2: Enrich LLM context with affiliation data**

**Goal:** Add person affiliations to the context string sent to Claude Haiku so it can answer multi-affiliation queries.

**Requirements:** R1, R3

**Dependencies:** Unit 1

**Files:**
- Modify: `api/semantic-search.js`

**Approach:**
- After building person-sectors lookup, format each person line as:
  `- {name} ({category}, {primary_org}) [affiliations: Sector1, Sector2, ...]`
- Keep total context under 50KB (current ~20KB + ~24KB affiliations = ~44KB)

**Patterns to follow:**
- Existing entity context building pattern (lines 70-88 in `api/semantic-search.js`)

**Test scenarios:**
- Happy path: Context string includes affiliations for multi-affiliated person
- Edge case: Person with no affiliations shows empty brackets or omits affiliation section
- Integration: Total context size stays under 50KB

**Verification:**
- API returns correct matches for "people at frontier labs AND think tanks" query

---

- [ ] **Unit 3: Update LLM prompt for new response format**

**Goal:** Modify the Claude Haiku prompt to return summary and match reasons alongside names.

**Requirements:** R5, R6, R7, R8

**Dependencies:** Unit 2

**Files:**
- Modify: `api/semantic-search.js`

**Approach:**
- Update prompt to request JSON: `{ names: [], summary: "", match_reasons: {} }`
- Add instructions for multi-affiliation queries using the new affiliation context
- Add instruction for "no matches" case: return empty names with summary explaining why nothing matched AND suggesting a relaxed query (e.g., "No people matched all three sectors. Try: people at frontier labs AND think tanks")
- Update response parsing to handle new structure
- Add validation: ensure `match_reasons` keys are a subset of `names` array (filter out hallucinated keys)
- Add 8-second timeout to Haiku API call via AbortController

**Patterns to follow:**
- Existing JSON parsing with markdown code block handling (lines 169-184)

**Test scenarios:**
- Happy path: Query "people at frontier labs AND think tanks" returns names, summary, and reasons
- Happy path: Summary accurately describes the result set in 1-2 sentences
- Happy path: Match reasons include the affiliations that caused the match
- Error path: Query with no matches returns empty names with helpful relaxation suggestion
- Error path: LLM returns malformed JSON — graceful fallback to `{ names: [], summary: "Search error", match_reasons: {} }`
- Error path: API timeout after 8 seconds — return "Search timed out" error
- Edge case: `match_reasons` contains hallucinated entity names — filtered out before returning

**Verification:**
- API response includes `summary` and `match_reasons` fields
- "people at frontier labs AND think tanks AND government" returns Heidy Khlaaf with correct reason

---

- [ ] **Unit 4: Add relationship-type query support**

**Goal:** Enable queries like "funders of AI safety" or "critics of frontier labs" by including edge types in LLM context.

**Requirements:** R3

**Dependencies:** Unit 2

**Files:**
- Modify: `api/semantic-search.js`

**Approach:**
- Filter `relationships` array to include only these edge_types: `funder`, `critic`, `collaborator`, `authored_by` (drop less-frequent types to control context size)
- Build org-relationships summary: for each org, list entities with edges grouped by type
- Cap at ~15KB for relationship context; if exceeded, sample top-K orgs by edge count
- Add to context under "RELATIONSHIPS" section
- Update prompt to explain how to use relationship data

**Patterns to follow:**
- Existing entity context grouping pattern

**Test scenarios:**
- Happy path: "funders of MIRI" returns entities with funder edge to MIRI
- Happy path: "critics of OpenAI" returns entities with critic edge
- Edge case: Org with no funders returns empty for "funders of X"
- Edge case: Relationship context exceeds 15KB — verify truncation works

**Verification:**
- Query "funders of AI safety orgs" returns plausible results with correct match reasons

---

- [ ] **Unit 5: Add direct connection support for path queries**

**Goal:** Enable "how is X connected to Y" queries by finding entities directly connected to both.

**Requirements:** R2

**Dependencies:** Unit 4

**Files:**
- Modify: `api/semantic-search.js`

**Approach:**
- Detect path query patterns in prompt instructions
- When both X and Y are identified, include both plus any entity directly connected to both
- Match reasons should explain the connection path

**Patterns to follow:**
- Existing query type detection in prompt (lines 117-146)

**Test scenarios:**
- Happy path: "how is Anthropic connected to Congress" returns Anthropic, relevant Congress members, and bridging entities
- Edge case: No direct connection exists — return both entities with explanation that no direct path found
- Edge case: X or Y not found in database — explain which entity wasn't found

**Verification:**
- Path query returns sensible bridging entities with clear connection explanation

---

- [ ] **Unit 6: Update frontend to display summary and match reasons**

**Goal:** Show the LLM-generated summary in the search results header and match reasons per entity.

**Requirements:** R6, R7

**Dependencies:** Unit 3

**Files:**
- Modify: `map.html`

**Approach:**
- Add summary display area in search results section
- Store `match_reasons` from API response
- Show reason on hover/click for each result entity (tooltip or inline)

**Patterns to follow:**
- Existing search results display in `map.html`
- Detail panel tooltip patterns

**Test scenarios:**
- Happy path: Summary appears above result list after AI search
- Happy path: Hovering/clicking result shows match reason
- Edge case: No summary returned — hide summary area gracefully
- Edge case: No match reason for specific entity — show generic "matched query" text

**Verification:**
- Summary visible in UI after search
- Match reasons accessible for each result

---

- [ ] **Unit 7: Implement filtered subgraph view**

**Goal:** Show ONLY matching entities and edges between them, hiding all non-matches completely.

**Requirements:** R9, R11

**Dependencies:** Unit 6

**Files:**
- Modify: `map.html`

**Approach:**
- Create `showFilteredSubgraph(matchedNames)` function
- Set non-matching nodes to `opacity: 0` (NOT `display: none` — preserve D3 simulation stability)
- Show only edges where BOTH endpoints are in matchedNames
- Add "Show full map" button to clear filter and restore all nodes
- **Important:** Disable node-click highlighting while in filtered view. Clicking a node opens detail panel but does NOT trigger connection highlighting (avoids visual collision with existing dimming UX). Restore normal behavior when "Show full map" clicked.

**Patterns to follow:**
- Existing `highlightSearchSubgraph()` function (lines 3910-3964)
- Existing `clearSearchModeHighlighting()` function

**Test scenarios:**
- Happy path: Search results show only matched entities
- Happy path: Edges between matches are visible; edges to non-matches are hidden
- Happy path: "Show full map" button restores all nodes and edges
- Happy path: Node click in filtered view opens detail panel, does NOT highlight connections
- Edge case: Single match shows the node with no edges (if no connections to other matches)
- Integration: Zoom/pan still works on filtered view
- Integration: D3 force simulation continues running (hidden nodes don't cause layout jank)

**Verification:**
- Visual confirmation that non-matched entities are fully hidden
- Back to full map button works
- Node click behavior differs in filtered vs normal mode

---

- [ ] **Unit 8: Implement 1-hop neighbor toggle**

**Goal:** Add toggle to optionally show 1-hop neighbors of matched entities (dimmed) for additional context.

**Requirements:** R10

**Dependencies:** Unit 7

**Files:**
- Modify: `map.html`

**Approach:**
- Add toggle button in search results UI: "Show connections" or similar
- When enabled, find all entities 1-hop from any match
- Show these with `.one-hop` CSS class (50% opacity, different styling)
- Show edges from matches to 1-hop neighbors (also dimmed)

**Patterns to follow:**
- Existing filter toggle patterns in map.html
- Existing `.dimmed` / `.highlighted` CSS class patterns

**Test scenarios:**
- Happy path: Toggle off — only matches visible
- Happy path: Toggle on — matches + their 1-hop neighbors visible (neighbors dimmed)
- Happy path: Toggle on — edges to 1-hop neighbors visible but styled differently
- Edge case: Match with no connections — toggle has no effect
- Edge case: 1-hop neighbor is also a match — should be highlighted, not dimmed

**Verification:**
- Toggle visually changes displayed entities
- 1-hop neighbors clearly distinguishable from primary matches

---

- [ ] **Unit 9: Add CSS for filtered subgraph and 1-hop styling**

**Goal:** Define visual styles for filtered view and 1-hop neighbors.

**Requirements:** R9, R10

**Dependencies:** Unit 7, Unit 8

**Files:**
- Modify: `map.html` (inline styles section)

**Approach:**
- `.filtered-hidden` class for completely hidden nodes
- `.one-hop` class for 1-hop neighbors: reduced opacity, different border style
- `.one-hop-edge` class for edges to 1-hop neighbors: dotted or lighter color
- Ensure transitions are smooth

**Patterns to follow:**
- Existing `.dimmed` and `.highlighted` CSS classes in map.html

**Test scenarios:**
- Happy path: Filtered hidden nodes are not visible
- Happy path: 1-hop nodes are visually distinct from matches
- Happy path: Transitions are smooth (no jarring visibility changes)

**Verification:**
- Visual inspection confirms clear distinction between match tiers

---

- [ ] **Unit 10: Integration testing and performance verification**

**Goal:** Verify all query types work end-to-end and meet <10s latency requirement.

**Requirements:** R12, all

**Dependencies:** All previous units

**Files:**
- Test: `api/semantic-search.js` (manual API testing)
- Test: `map.html` (browser testing)

**Approach:**
- Test matrix of query types:
  - Multi-affiliation: "people at frontier labs AND think tanks AND government"
  - Path: "how is Anthropic connected to Congress"
  - Relationship: "funders of AI safety"
  - Neighborhood: "tell me about Dario Amodei"
- Measure response times
- Verify correct results (spot-check known entities)

**Test scenarios:**
- Integration: Multi-affiliation query returns Heidy Khlaaf
- Integration: Relationship query returns plausible funders
- Integration: Path query returns sensible connections
- Performance: All queries complete in <10 seconds
- Edge case: Very broad query ("everyone") handles gracefully (returns top 100, explains limit)

**Verification:**
- All query types return sensible results
- Latency under 10 seconds for complex queries
- UI displays results correctly with summary, reasons, and filtered view

## System-Wide Impact

- **API surface parity:** Only `/semantic-search` endpoint affected; other APIs unchanged
- **Error propagation:** Lambda errors return 500 with user-friendly message; frontend shows "search unavailable" gracefully
- **State lifecycle risks:** `searchModeMatches` array already manages search state; no new state concerns
- **Integration coverage:** End-to-end testing required (API → frontend → D3 visualization)
- **Unchanged invariants:** Keyword search, plot view, and node click highlighting remain unchanged

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Context size exceeds 100KB soft limit | Add CloudWatch metric to log context size per request; truncate relationship context first if needed |
| LLM latency spikes above 10s | Add 8-second timeout to Haiku API call; return graceful error on timeout |
| Match reasons inconsistent quality | Validate match_reasons keys against names array; fallback to generic "matched query" |
| Hidden nodes affect D3 simulation | Use CSS opacity:0 not display:none; simulation forces continue calculating |
| Filtered view conflicts with node-click highlighting | Disable node-click highlighting in search mode; document mode transition |
| Haiku model changes affect output format | Schema validation on response; fallback to current behavior on parse failure |

## Documentation / Operational Notes

- Update CLAUDE.md API documentation to include new response fields (`summary`, `match_reasons`)
- No deployment changes needed (same Lambda, same endpoint)
- CloudWatch logs will show enriched context size for monitoring
- Add CloudWatch alarm if context size exceeds 100KB or latency exceeds 8s

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-07-graph-context-search-requirements.md](docs/brainstorms/2026-04-07-graph-context-search-requirements.md)
- Related code: `api/semantic-search.js`, `api/export-map.js`, `map.html:highlightSearchSubgraph`
- Data: `map-data.json` structure with `person_organizations`, `relationships`, `edges` arrays
