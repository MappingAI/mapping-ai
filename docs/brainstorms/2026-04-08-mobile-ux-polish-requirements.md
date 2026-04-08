---
date: 2026-04-08
topic: mobile-ux-polish
---

# Mobile UX Polish: Graph Scaling + Layout Fixes

## Problem Frame

The mobile entity directory shipped but has several polish issues: the mini-graph caps at 12 nodes (hiding connections), the pill layout overflows at 375px, there's no way to clear all filters at once, and the Roles section takes up vertical space most users don't need initially.

## Requirements

### Mini-graph scaling (tiered: graph + connection list)
- R1. **Show top ~8 connections in the graph.** Reduce node cap from 12 to 8 for cleaner layout. Prioritize connections by: primary affiliations first, then other relationships.
- R2. **Connection count label below graph.** Show "N connections" below the center label (tappable — scrolls to connection list in detail card).
- R3. **Full connection list in detail card.** The detail card's existing "affiliated" section already lists all connections. Ensure it shows ALL connections (not truncated), grouped by type (People / Organizations / Resources), each item tappable to navigate.

### Layout fixes
- R4. **Clear-all-filters button.** Subtle "×" or "Clear" link that appears when any filter is active (category, stance, connected, search). Clears all filters at once. Positioned near the active filter chips area.
- R5. **Tighter pill layout at 375px.** Reduce chip padding/font so All/People/Orgs/Connected/Explore all fit on one line without horizontal scroll at 375px.
- R6. **Collapsible Roles section.** The "Roles" pill group collapses by default, showing just the label "Roles ▸" that expands on tap. Sectors stay expanded. Saves ~40px of vertical space above the fold.
- R7. **Keep "⌁ Connected" filter as-is.** No label change needed.

## Success Criteria
- Mini-graph shows 8 clean nodes for any entity, even those with 100+ connections
- All connections accessible via the detail card list
- All type chips fit on one line at 375px without horizontal scroll
- One tap clears all active filters

## Scope Boundaries
- Not changing the desktop map experience
- Not adding zoom/pan to the mini-graph
- Not paginating the graph

## Key Decisions
- **8 nodes in graph, full list in detail**: Clean graph + no hidden data. The graph is a visual preview, the list is the complete data.
- **Roles collapsed by default**: Most users care about sectors (org categories). Person roles are secondary for browsing.
- **Clear-all as a link, not a button**: Lightweight, appears only when needed.

## Next Steps

-> Proceed directly to work (all items are well-defined UX fixes)
