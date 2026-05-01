---
date: 2026-04-30
topic: edge-interaction
focus: hover tooltips and click-through to edge details with source attribution
---

# Ideation: Edge Interaction Feature

## Codebase Context

**Project**: Mapping AI - D3.js stakeholder map with Canvas 2D rendering. Entities (people, orgs, resources) connected by edges (affiliations, funding, collaborations).

**Current State**:
- Nodes have hover tooltips and click → detail panel
- Edges have NO interaction - cannot hover, cannot click, no tooltips
- Edge data includes: source/target entities, edge_type, role, evidence text
- 3,151 edge_evidence records exist in Neon with full source attribution

**Technical Constraints**:
- Canvas 2D rendering uses quadtree for O(log N) node hit-testing
- Edge hit-testing needs point-to-line-segment distance calculation
- map.html is 5700+ lines of inline code
- Visual state model: `_vs` property (`normal`/`dimmed`/`highlighted`)

**Data Available** (Neon PILOT_DB):
```sql
edge_evidence: edge_id, source_id, start_date, end_date, amount_usd, role_title, citation
source: url, title, source_type, date_published, author, cached_excerpt
```

## Ranked Ideas

### 1. Edge Hover Tooltip
**Description:** When hovering near an edge on the canvas, show a floating tooltip with relationship type, role (if applicable), date range, and evidence excerpt.

**Rationale:** Foundation feature that makes edges discoverable. Users currently have zero insight into what an edge means. This is the minimal viable edge interaction.

**Downsides:** Requires line-segment hit-testing. Tooltip positioning near edges can feel less natural than near circular nodes.

**Confidence:** 90%
**Complexity:** Medium
**Status:** Explored (selected for brainstorm)

### 2. Edge Click → Detail Panel
**Description:** Clicking an edge opens the existing detail panel populated with edge-specific content: relationship type, both connected entities (clickable), all evidence records with source citations, amounts if funding, temporal span.

**Rationale:** Gateway feature. Without it, tooltips are dead-ends and all the edge evidence data (3,151 records) remains hidden. Every subsequent edge feature needs this container.

**Downsides:** API endpoint or bundled data needed. Adds rendering logic to map.html.

**Confidence:** 95%
**Complexity:** Medium
**Status:** Explored (selected for brainstorm)

### 3. Funding Amount → Edge Thickness
**Description:** For edges with `amount_usd` data, vary stroke width proportionally (log scale, 1-5px range).

**Rationale:** Funding magnitude matters in policy analysis. Purely visual encoding - no interaction needed.

**Downsides:** Only works for funding edges with amounts.

**Confidence:** 85%
**Complexity:** Low
**Status:** Unexplored (consider as follow-up)

### 4. Edge Type Filter Toggles
**Description:** Add toggles in controls sidebar for edge types: Funding, Affiliation, Board, Advisory. Dims/hides filtered types.

**Rationale:** Mirrors existing category filter pattern for nodes. Reduces visual density.

**Downsides:** Adds UI complexity to crowded sidebar.

**Confidence:** 80%
**Complexity:** Low
**Status:** Unexplored

### 5. Temporal Edge Filtering
**Description:** Slider or year buttons to filter edges by date range. Shows network evolution.

**Rationale:** Edge evidence has temporal data currently invisible. Policy networks change fast.

**Downsides:** Date coverage incomplete. Handling "no date" edges is tricky.

**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

### 6. Historical Edge Ghosting
**Description:** Edges with `end_date` in past render as dashed/faded lines.

**Rationale:** Preserves institutional memory - former relationships still matter.

**Downsides:** Requires `end_date` populated (currently sparse).

**Confidence:** 70%
**Complexity:** Low
**Status:** Unexplored

### 7. Evidence Preview in Tooltip
**Description:** Tooltip includes truncated citation excerpt from primary source.

**Rationale:** Builds trust immediately. Users see evidence without clicking.

**Downsides:** Tooltips may get long. Requires preloading excerpt data.

**Confidence:** 80%
**Complexity:** Low-Medium
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Edge type color coding | Clashes with node category colors |
| 2 | 2-hop network button | Scope creep beyond edge interaction |
| 3 | Edge timeline sparkline | High cost, limited value |
| 4 | Right-click context menu | Non-standard UX, poor touch support |
| 5 | Pinned highlight persistence | Not edge-specific |
| 6 | Edge source quality indicator | Premature; need basics first |
| 7 | Cross-reference view | Complex navigation model |
| 8 | Funding trace mode | Graph traversal complexity |
| 9 | Money flow animation | High implementation burden |
| 10 | Edge-first navigation mode | Paradigm shift too large |
| 11 | Bidirectional flow arrows | Data doesn't support |
| 12 | Ego network from edge | Scope creep |
| 13 | Edge submission attribution | Contributor data sparse |
| 14 | Edge annotation/flagging | Admin overhead |

## Session Log
- 2026-04-30: Initial ideation — 35 candidates generated across 4 frames, 7 survived. User selected #1 + #2 for brainstorm, #3 as follow-up.
- 2026-04-30: Brainstormed #1 + #2 → requirements doc created, document review applied, plan created.
