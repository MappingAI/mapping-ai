---
date: 2026-04-30
status: ready-for-planning
---

# Edge Interaction Feature

## Problem

Users exploring the stakeholder map can click nodes to see entity details, but edges (the relationships between entities) have no interaction. When users see a line connecting two entities, they cannot:
- Hover to see what type of relationship it represents
- Click to see evidence, citations, funding amounts, or date ranges
- Verify claims about relationships with source attribution

This hides the 3,151 edge evidence records painstakingly curated in Neon.

## Solution

Add hover tooltips and click-to-detail interactions for edges, mirroring the existing node interaction patterns.

## User Stories

1. **As a policy researcher**, I want to hover over an edge to quickly see what type of relationship it represents (funding, board membership, affiliation), so I can understand the network structure at a glance.

2. **As a fact-checker**, I want to click an edge to see its source citations, so I can verify relationship claims.

3. **As a funding analyst**, I want to see funding amounts and date ranges for funding edges, so I can understand financial relationships in the AI ecosystem.

## Scope

### In Scope
- Edge hover tooltips showing: type, role, date range (when available)
- Edge click opening detail panel with: relationship type, both entities (clickable), all evidence records with citations
- New `edge-evidence.json` preload file for evidence data
- Add edge IDs to `map-data.json` relationships export
- Canvas hit-testing for edges (point-to-line-segment distance)

### Out of Scope
- Edge thickness based on funding amounts (follow-up feature)
- Edge type color coding
- Edge filtering/toggling in controls
- Temporal edge visualization (scrubber, ghosting)
- Edge annotation or flagging

## Behavior

### Hover Tooltip

**Trigger**: Mouse within ~8px of an edge line segment (in canvas coordinates, adjusted for zoom), and NOT hovering a node (nodes take hover precedence). Tooltip remains visible when cursor moves to tooltip itself.

**Content**:
```
[Relationship Type]: [Source Name] → [Target Name]
[Role] ([StartDate]–[EndDate])
```

Examples:
- `Funding: Open Philanthropy → MIRI` (no role/dates available)
- `Board Member: Sam Altman → OpenAI (2019–present)` (role with dates)
- `Affiliated: Anthropic → Dario Amodei` (no role/dates available)

**Positioning**: Same as node tooltips - near cursor, offset 12px right and 8px up. If tooltip would overflow viewport, flip to opposite side (left/down).

**When no evidence data**: Still show tooltip with type and endpoints; omit role/dates if unavailable. If role exists without dates, show role only. If start_date but no end_date, show "(start–present)".

### Edge Click → Detail Panel

**Trigger**: Click within ~8px of an edge line segment, but only when no node is under the cursor (nodes take click priority)

**Panel Content**:
```
┌─────────────────────────────────────┐
│ [Type] Relationship           [×]  │
├─────────────────────────────────────┤
│ [Source Entity] → [Target Entity]  │
│    (both names clickable)           │
├─────────────────────────────────────┤
│ Evidence & Sources                  │
│                                     │
│ ▸ "Citation text excerpt..."       │
│   Source: [Title] · [Date]          │
│   [URL link]                        │
│                                     │
│ ▸ "Another citation..."            │
│   ...                               │
├─────────────────────────────────────┤
│ Details                             │
│ Amount: $50,000,000                 │
│ Period: Jan 2020 – Present          │
│ Role: Series B Lead                 │
└─────────────────────────────────────┘
```

**When no evidence**: Show "No citations available for this relationship" in the Evidence section

**Loading state**: While `edge-evidence.json` is loading, show panel with entity names and relationship type, with "Loading evidence..." in Evidence section. Replace with actual content when fetch completes.

**Visual behavior**:
- Opens same detail panel used for nodes (replaces existing content if panel already open)
- Does NOT dim unconnected nodes (keep it simple)
- Selected edge receives visual highlight (thicker stroke, accent color)
- Clicking entity names in panel navigates to that entity's detail view

## Data Architecture

### Edge IDs in Map Export

Update `api/export-map.ts` to include edge IDs:

```typescript
// Current
relationships: MapRelationship[] = edgeRows.map((e) => ({
  source_type: e.source_type,
  // ...
}))

// New: add id field
relationships: MapRelationship[] = edgeRows.map((e) => ({
  id: e.id,  // ← Add this
  source_type: e.source_type,
  // ...
}))
```

### Edge Evidence Export

Create new export script that generates `edge-evidence.json` from Neon's `edge_evidence` and `source` tables:

```json
{
  "_meta": { "generated_at": "2026-04-30T..." },
  "edges": {
    "1730": {
      "evidence": [
        {
          "citation": "Funding organizations include the Open Philanthropy...",
          "source_url": "https://cset.georgetown.edu/...",
          "source_title": "CSET About Us",
          "source_type": "official",
          "date_published": "2023-06-15",
          "start_date": "2019-01",
          "end_date": null,
          "amount_usd": 55000000,
          "role_title": "Core Funder"
        }
      ]
    }
  }
}
```

### Canvas Link Structure

**Two edge types exist in the map:**

1. **Relationship edges** (from `allData.relationships`) - have edge IDs, can look up evidence
2. **Inferred edges** (from `person_organizations` via name matching) - NO edge ID, no evidence lookup

Update `_canvasLinks` to include edge ID for evidence lookup:

```javascript
// Relationship edges (have ID, can show evidence)
_canvasLinks.push({
  source: src,
  target: tgt,
  relType: rel.relationship_type,
  edgeId: rel.id,
  role: rel.role,
  _vs: 'normal'
})

// Inferred edges (no ID, show "Inferred relationship" in panel)
_canvasLinks.push({
  source: p,
  target: o,
  relType: 'affiliated',
  edgeId: null,  // No evidence lookup possible
  _vs: 'normal'
})
```

When `edgeId` is null, tooltip shows "Affiliated (inferred)" and detail panel shows "This relationship was inferred from employment data. No source citations available."

## Technical Notes

### Edge Hit-Testing

Unlike nodes (which use quadtree for O(log N) lookup), edges need point-to-line-segment distance calculation:

```javascript
function _findEdgeAt(mx, my) {
  const x = (mx - currentZoom.x) / currentZoom.k
  const y = (my - currentZoom.y) / currentZoom.k
  const threshold = 8 / currentZoom.k  // 8px in screen space

  for (const l of _canvasLinks) {
    if (l._vs === 'hidden') continue
    const dist = pointToSegmentDistance(x, y, l.source.x, l.source.y, l.target.x, l.target.y)
    if (dist < threshold) return l
  }
  return null
}
```

This is O(N) per check, but with ~2000 edges and only checking on mousemove (throttled), it's acceptable.

### Lazy Loading Evidence

Follow the `claims-detail.json` pattern:

```javascript
// In initialization
fetch('/edge-evidence.json')
  .then(r => r.json())
  .then(data => { window.__edgeEvidence = data })
  .catch(() => { window.__edgeEvidence = { edges: {} } })

// In edge detail panel render
const evidence = window.__edgeEvidence?.edges?.[edgeId]?.evidence || []
```

### Detail Panel Reuse

The edge detail panel should reuse the existing panel container (`#detail-panel`) but render different content. Add a `showEdgeDetail(edge)` function alongside `showDetail(node, allNodes)`.

### Multi-Evidence Aggregation

When an edge has multiple evidence records with different amounts, dates, or roles:
- **Amount**: Show sum of all amounts (e.g., "Total: $65,000,000 across 3 grants")
- **Period**: Show earliest start_date to latest end_date
- **Role**: Show the most recent evidence record's role_title
- Each citation is listed separately in the Evidence section with its individual amount/date

### Touch Interaction

On touch devices (detected via `'ontouchstart' in window`):
- Skip hover tooltips entirely (no cursor to hover)
- Tap edge opens detail panel directly
- Increase hit threshold to 20px for comfortable finger targets
- Same node-over-edge priority applies

## Success Criteria

1. **Hovering near an edge** shows a tooltip with relationship type and endpoints within 100ms
2. **Clicking an edge** opens the detail panel with evidence citations (if available)
3. **Edge evidence loads** without blocking initial map render
4. **Edges without evidence** still show tooltip; detail panel shows "No citations available"
5. **Entity links in edge panel** navigate to that entity's detail view
6. **Evidence citations include clickable URLs** where source_url is available
7. **Touch users can tap edges** to open detail panel (20px hit threshold)

## Non-Goals

- This feature does not change how edges are rendered visually (no thickness/color changes)
- This feature does not add edge filtering to controls
- This feature does not modify the node interaction behavior

## Dependencies

**Prerequisite**: Edge evidence tables (`edge_evidence`, `source`) currently live in Neon's claims-pilot branch. These must be merged to production before this feature can ship.

- Edge IDs must be added to `map-data.json` before edge evidence can be looked up
- `edge-evidence.json` export script must be created
- Export strategy: Fetch edge IDs from generated `map-data.json`, then query Neon's `edge_evidence` table filtering to only those IDs (avoids cross-database joins)

## Follow-Up Features

After this ships, consider:
1. **Funding amount → edge thickness** (visual encoding, no new interaction)
2. **Edge type filters** (toggle affiliations, funding, etc.)
3. **Temporal filtering** (show network as of a specific year)
