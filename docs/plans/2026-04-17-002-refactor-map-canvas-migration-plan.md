---
title: 'refactor: Migrate network view from SVG to Canvas 2D rendering'
type: refactor
status: active
date: 2026-04-17
last_updated: 2026-04-19
---

> **Post-implementation refresh (2026-04-19):** References in this plan to `resolveEntityImage()` as an active fallback chain (at `map.html:1462-1500`, and in Units describing "keep resolveEntityImage unchanged — it handles the fallback chain") are now outdated. After commit `13dc655`, `resolveEntityImage()` is a one-line pass-through: `return entity.thumbnail_url || null`. The org `tryFallback` chain and `fetchWikiImage` live calls are removed. The canvas `createSprite` path is unchanged in its own logic — it still pre-rasterizes to an offscreen canvas — but the URL it receives now comes exclusively from the DB via the cache-thumbnails pipeline. See [`docs/solutions/integration-issues/thumbnail-pipeline-dead-cloudfront-and-external-fallbacks-2026-04-19.md`](../solutions/integration-issues/thumbnail-pipeline-dead-cloudfront-and-external-fallbacks-2026-04-19.md).

# refactor: Migrate network view from SVG to Canvas 2D rendering

## Overview

Replace the SVG retained-mode rendering of ~1,571 nodes + ~2,143 edges in the D3.js network view (`map.html`) with Canvas 2D immediate-mode rendering. The SVG approach creates 10,000+ DOM elements and re-rasterizes the entire subtree on every pan/zoom transform, capping interactive frame rate at ~53fps and causing visible jank. Canvas draws to a single composited bitmap — pan/zoom becomes a `ctx.setTransform()` call with no DOM cost.

Prior optimizations (rAF-chunked pre-tick, lazy defs, Map lookups) cut initial load from 17s → 4.4s but cannot fix the fundamental SVG re-raster bottleneck during interaction.

## Problem Frame

Users report the network map "lags the whole browser" during pan/zoom. Profiling confirms the bottleneck is SVG re-rasterization of thousands of DOM elements on every transform change. Canvas eliminates this class of cost entirely — the bitmap is already rasterized, and pan/zoom only changes the transform matrix applied before drawing.

## Requirements Trace

- R1. Pan/zoom must be 60fps on modern hardware (currently ~53fps SVG)
- R2. All existing interactions must be preserved: click → detail panel + zoom, hover → tooltip, drag → simulation reheat, search highlighting, dim unconnected, one-hop display
- R3. Node images (people headshots, org logos) must render correctly with circle clipping
- R4. Cluster labels must remain crisp text at all zoom levels
- R5. Dark/light theme switching must continue to work
- R6. Plot view (2D scatter/beeswarm) remains SVG — not touched by this migration
- R7. No visible regression in node/edge appearance (colors, opacity, dashed rings, resource icons)

## Scope Boundaries

- NOT migrating the 2D plot view (`render2D`) — it's a separate code path branched at line 3411
- NOT changing the force simulation configuration — only changing how results are painted
- NOT changing the data model, API, or map-data.json format
- NOT touching tooltip/detail panel HTML — they're already pure DOM, not SVG-dependent
- Cluster labels will be drawn on canvas (they're few and simple) rather than maintaining a separate SVG overlay layer

## Context & Research

### Relevant Code and Patterns

- `map.html:3380` — `render()` function, the main target
- `map.html:3395-3401` — d3.zoom setup on SVG, must move to canvas
- `map.html:3545-3563` — cluster background circles (SVG → canvas arcs)
- `map.html:3565-3588` — connection lines (SVG `<line>` → canvas lineTo)
- `map.html:3636-3665` — node groups with click/hover/drag handlers (SVG `<g>` → quadtree hit-testing)
- `map.html:3670-3720` — image loading + SVG clipPath/pattern → offscreen canvas sprites
- `map.html:3722-3808` — node shapes, initials, resource icons, submission rings (all → canvas draw calls)
- `map.html:3810-3859` — cluster labels (SVG text → canvas fillText)
- `map.html:3861-3868` — `ticked()` — currently updates SVG transforms, becomes `drawFrame()` call
- `map.html:4861-4898` — `highlightNodes()` — SVG `.classed()` → per-node state
- `map.html:4902-4928` — `dimUnconnected()` — SVG `.classed()` → per-node state
- `map.html:4930-4941` — `clearSelection()` — SVG `.classed()` → state reset
- `map.html:5020-5061` — `reapplySearchHighlighting()` — SVG `.classed()` → per-node state
- `map.html:5303-5357` — `highlightSearchSubgraph()` — SVG `.classed()` → per-node state
- `map.html:5363-5440` — `showFilteredSubgraph()` — calls render(), applies classes
- `map.html:1462-1500` — `resolveEntityImage()` — image resolution chain (unchanged, but callback changes)
- `map.html:321-426` — CSS for `.dimmed`, `.highlighted`, `.one-hop`, `.filtered-hidden` visual states

### Visual State Model (Current SVG → Canvas Mapping)

| CSS Class          | SVG Effect                                   | Canvas Equivalent                           |
| ------------------ | -------------------------------------------- | ------------------------------------------- |
| `.dimmed`          | opacity: 0.15                                | node.\_alpha = 0.15                         |
| `.highlighted`     | opacity: 1, ring stroke-width 3, stroke #fff | node.\_alpha = 1.0, draw ring wider + white |
| `.one-hop`         | opacity: 0.4, stroke-dasharray               | node.\_alpha = 0.4, dashed stroke           |
| `.filtered-hidden` | opacity: 0, pointer-events none              | skip drawing entirely                       |
| (normal person)    | opacity: 0.7                                 | node.\_alpha = 0.7                          |
| (normal org)       | opacity: 0.9                                 | node.\_alpha = 0.9                          |
| (normal resource)  | opacity: 0.15 (bg), 1.0 (icon)               | resource-specific alpha                     |
| (hover)            | node-bg full opacity, ring stroke-width 3    | draw with hover style in drawFrame          |

### Edge Visual States

| State          | SVG Effect                              | Canvas Equivalent                   |
| -------------- | --------------------------------------- | ----------------------------------- |
| normal         | stroke-opacity: 0.25, stroke-width: 0.5 | link.\_alpha = 0.25                 |
| `.dimmed`      | opacity: 0.03                           | link.\_alpha = 0.03                 |
| `.highlighted` | opacity: 0.6, stroke-width: 1.5         | link.\_alpha = 0.6, lineWidth = 1.5 |
| `.one-hop`     | opacity: 0.25, stroke-dasharray: 4,3    | link.\_alpha = 0.25, setLineDash    |

## Key Technical Decisions

- **Pure canvas (no SVG overlay)**: Cluster labels (8-12 elements) will be drawn on canvas. Maintaining a synchronized SVG overlay layer adds complexity for minimal benefit. Canvas text rendering is sufficient for short label strings. Labels will appear slightly softer at extreme zoom but this is acceptable.

- **Quadtree hit-testing**: d3.quadtree rebuilt after each simulation tick/settle. O(log N) point-in-radius lookup for hover, click, drag subject. Resources use square bounds check instead of radius.

- **Pre-rasterized image sprites**: Each node's image is drawn once onto a small offscreen canvas (circle-clipped), then blitted in drawFrame via `ctx.drawImage()`. This avoids per-frame clip/draw overhead. Sprites are created asynchronously as images load.

- **Per-node state model**: Each node gets `_visualState` property: `'normal' | 'dimmed' | 'highlighted' | 'one-hop' | 'hidden'`. Each link gets the same. drawFrame reads these to determine alpha/style. All existing highlight functions modify state + call `requestRedraw()`.

- **requestRedraw pattern**: Instead of immediate drawing, state changes call `requestRedraw()` which schedules a single `requestAnimationFrame(drawFrame)`. This batches multiple state changes into one frame.

- **Theme support**: Canvas colors read from CSS custom properties (`--text-3`, `--bg-page`, etc.) via `getComputedStyle()` at render time, cached in a `themeColors` object. Theme toggle handler invalidates cache + redraws.

## Open Questions

### Resolved During Planning

- **CORS for images?** S3/CloudFront logos are same-origin (served from same CDN). Wikipedia images support `crossOrigin = 'anonymous'`. Google favicon API supports CORS. All sources should work for canvas `drawImage()`.

- **Keep SVG overlay for labels?** No — cluster labels are 8-12 short strings. Canvas fillText is simpler than maintaining a synchronized SVG layer.

- **How to handle text crispness at high zoom?** At extreme zoom levels (>5x), redraw text at native resolution by accounting for the zoom scale in font size. This is only needed for cluster labels, which are few.

### Deferred to Implementation

- **Exact devicePixelRatio handling**: May need to multiply canvas dimensions by `window.devicePixelRatio` and scale context for retina crispness. Test on retina display during implementation.

- **Touch event handling for mobile**: Current SVG drag uses d3.drag which handles touch. Canvas d3.drag should work the same way but needs testing on mobile.

## High-Level Technical Design

> _This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce._

```
render() flow (canvas version):
  1. Create <canvas>, set width/height, get 2d context
  2. Set up d3.zoom on canvas → on('zoom', event => { currentZoom = event.transform; requestRedraw(); })
  3. Build nodes, links, simulation (UNCHANGED from current code)
  4. Run simulation (rAF-chunked pre-tick, UNCHANGED)
  5. ticked() → update quadtree + requestRedraw()
  6. Build image sprites asynchronously (resolveEntityImage → offscreen canvas → node._sprite)
  7. Wire canvas events: mousemove → quadtree.find → hover/tooltip, click → detail/dim, drag → simulation

drawFrame():
  ctx.save()
  ctx.clearRect(0, 0, width, height)
  ctx.translate(transform.x, transform.y)
  ctx.scale(transform.k, transform.k)

  // Layer 1: Cluster backgrounds (filled circles, very low alpha)
  for each cluster: ctx.arc(...), ctx.fill()

  // Layer 2: Edges
  for each link where link._visualState !== 'hidden':
    ctx.globalAlpha = alphaForState(link._visualState)
    ctx.moveTo(source.x, source.y)
    ctx.lineTo(target.x, target.y)
    ctx.stroke()

  // Layer 3: Nodes
  for each node where node._visualState !== 'hidden':
    ctx.globalAlpha = alphaForState(node._visualState)
    if resource: draw rounded rect + icon path
    else if node._sprite: ctx.drawImage(node._sprite, ...)
    else: draw circle + initials text
    if submission ring: draw dashed circle
    if hovered/highlighted: draw ring overlay

  // Layer 4: Cluster labels
  for each cluster: fillText with bg rect

  ctx.restore()
```

## Implementation Units

- [ ] **Unit 1: Canvas infrastructure + zoom**

  **Goal:** Replace SVG element with canvas, wire d3.zoom to canvas, implement drawFrame skeleton and requestRedraw pattern.

  **Requirements:** R1, R5

  **Dependencies:** None

  **Files:**
  - Modify: `map.html` (render function: lines 3380-3410)

  **Approach:**
  - In `render()`, replace `d3.select('#map-container').append('svg')` with creating a `<canvas>` element
  - Handle devicePixelRatio for retina: set canvas width/height to container \* dpr, scale context by dpr, set CSS width/height to container size
  - Wire d3.zoom to canvas element (not SVG) — zoom handler stores transform + calls requestRedraw()
  - Implement `requestRedraw()` that deduplicates via rAF
  - Implement empty `drawFrame()` skeleton that clears canvas, applies transform, restores
  - Zoom controls (zoom-in, zoom-out, zoom-reset) call zoomBehavior on canvas selection
  - Cache CSS custom property colors into `themeColors` object for canvas use
  - Wire theme toggle to invalidate color cache + redraw

  **Patterns to follow:**
  - Existing d3.zoom setup at line 3395-3409

  **Test scenarios:**
  - Happy path: Canvas element appears in map-container at correct dimensions
  - Happy path: Pan/zoom gestures update the transform and trigger redraw
  - Happy path: Zoom buttons (in/out/reset) work correctly
  - Edge case: Window resize recalculates canvas dimensions + redraws
  - Edge case: Retina display renders at 2x pixel density

  **Verification:**
  - Canvas element visible in DOM, fills container
  - Pan/zoom gestures respond smoothly
  - Zoom controls function correctly

- [ ] **Unit 2: Draw edges + cluster backgrounds**

  **Goal:** Render connection lines and cluster background circles on canvas.

  **Requirements:** R1, R7

  **Dependencies:** Unit 1

  **Files:**
  - Modify: `map.html` (drawFrame function, link/cluster data setup in render)

  **Approach:**
  - In drawFrame, draw cluster backgrounds first (low-alpha filled circles using cluster center + radius)
  - Draw edges as canvas lines: batch by visual state for efficiency (group normal, dimmed, highlighted, one-hop into separate path batches to minimize state changes)
  - Edge colors from `themeColors` (reads `--text-3` CSS variable)
  - Per-link `_visualState` property determines alpha and style
  - Use `ctx.setLineDash()` for one-hop dashed edges
  - Remove all SVG `<line class="connection-line">` creation code
  - Remove SVG `.cluster-bg` circle creation code

  **Patterns to follow:**
  - Current link setup at lines 3565-3603 (data unchanged, rendering changes)

  **Test scenarios:**
  - Happy path: All edges render between correct node positions
  - Happy path: Edge opacity matches current SVG appearance
  - Happy path: Cluster backgrounds visible at correct positions with correct colors
  - Edge case: View with no edges (people-only or orgs-only) renders without errors
  - Edge case: One-hop edges render with dashed pattern

  **Verification:**
  - Visual comparison of edge rendering matches current SVG appearance
  - Cluster backgrounds visible behind nodes

- [ ] **Unit 3: Draw nodes (shapes, initials, resource icons)**

  **Goal:** Render all node types on canvas: people circles, org circles, resource rounded rects with SVG-path icons, initials text, submission count rings.

  **Requirements:** R1, R7

  **Dependencies:** Unit 1

  **Files:**
  - Modify: `map.html` (drawFrame function, node rendering section)

  **Approach:**
  - For each node, read `_visualState` to determine alpha; skip if 'hidden'
  - People/org nodes: `ctx.arc()` for circle, fill with cluster color
  - Org nodes: add brighter stroke
  - Resource nodes: `ctx.roundRect()` or manual rounded rect path, low-alpha fill + stroke
  - Initials text: `ctx.fillText()` centered, white, mono font, sized by radius
  - Resource icons: parse RESOURCE_TYPE_ICONS SVG path data, draw with `ctx.stroke()` using Path2D objects (pre-parsed once, scaled per node)
  - Submission rings: dashed circle/rect around nodes with submissionCount >= 5
  - Hover state: if `hoveredNode === d`, draw with full bg opacity + thicker ring
  - Highlighted state: white ring, full opacity
  - Remove all SVG nodeGroup creation code (lines 3636-3808)

  **Patterns to follow:**
  - Current node shape code at lines 3722-3808
  - RESOURCE_TYPE_ICONS SVG path strings

  **Test scenarios:**
  - Happy path: People nodes render as colored circles with initials
  - Happy path: Org nodes render with stroke border
  - Happy path: Resource nodes render as rounded rects with type icons
  - Happy path: Submission rings appear on entities with 5+ submissions
  - Happy path: Node sizes match current radii
  - Edge case: Very small nodes (radius < 6) skip initials text

  **Verification:**
  - Visual comparison matches current SVG node appearance
  - All three entity types distinguishable

- [ ] **Unit 4: Pre-rasterized image sprites**

  **Goal:** Load entity images (headshots, logos) into offscreen canvas sprites, draw them circle-clipped in drawFrame.

  **Requirements:** R3, R7

  **Dependencies:** Unit 3

  **Files:**
  - Modify: `map.html` (image loading section in render, drawFrame node rendering)

  **Approach:**
  - Keep `resolveEntityImage()` unchanged — it handles the fallback chain
  - Change the callback: instead of creating SVG clipPath/pattern, create an offscreen canvas
    - Size: `(radius * 2) × (radius * 2)` pixels (multiplied by dpr for retina)
    - Draw circle clip path on offscreen context
    - Fill with background color, then drawImage of loaded image
    - Store as `node._sprite` (the offscreen canvas element)
  - In drawFrame, check `node._sprite`: if present, `ctx.drawImage(node._sprite, x - r, y - r, r*2, r*2)`; else draw initials fallback
  - Draw ring circle over sprite (colored stroke, or white when highlighted)
  - Set `crossOrigin = 'anonymous'` on Image elements for Wikipedia/external sources
  - Sprites created async — drawFrame always has a fallback (initials) until sprite loads
  - When sprite loads, call `requestRedraw()` to update display

  **Patterns to follow:**
  - Current resolveEntityImage at line 1462
  - Current applyImage callback at line 3678

  **Test scenarios:**
  - Happy path: Org logos load and display circle-clipped
  - Happy path: People headshots load from Wikipedia and display correctly
  - Happy path: Nodes show initials while image is loading, then swap to image
  - Edge case: CORS error falls back to initials gracefully
  - Edge case: Image load failure doesn't break other nodes

  **Verification:**
  - Images render inside circular clip on canvas
  - No CORS console errors for known image sources
  - Initials visible for nodes without images

- [ ] **Unit 5: Quadtree hit-testing + interactions**

  **Goal:** Wire click, hover, and drag interactions on canvas using d3.quadtree for spatial lookup.

  **Requirements:** R2

  **Dependencies:** Units 1, 3

  **Files:**
  - Modify: `map.html` (render function event wiring, add quadtree)

  **Approach:**
  - Build `d3.quadtree` from nodes after simulation settles; rebuild on each ticked() call
  - Quadtree uses `.x()` and `.y()` accessors
  - **Hover**: canvas `mousemove` → invert mouse coords through zoom transform → `quadtree.find(x, y, maxRadius)` → if hit node differs from hoveredNode, update hoveredNode + call showTooltip/hideTooltip + requestRedraw
  - **Click**: canvas `click` → quadtree.find → if node hit: showDetail, set selectedNode, dimUnconnected, zoom-to-node; if no hit: close detail panel, clearSelection
  - **Drag**: `d3.drag()` on canvas selection with `.subject()` using quadtree.find; drag start/drag/end handlers same as current (fx/fy, simulation reheat)
  - **Touch**: d3.drag handles touch events natively
  - Resource nodes: check square bounds instead of radius for hit-testing (compare |dx| and |dy| against node.radius)
  - Cursor: set `canvas.style.cursor = 'pointer'` when hovering over a node, default otherwise

  **Patterns to follow:**
  - Current click/hover/drag handlers at lines 3640-3665

  **Test scenarios:**
  - Happy path: Hovering a node shows tooltip with name and category
  - Happy path: Clicking a node opens detail panel and zooms to it
  - Happy path: Dragging a node reheats simulation and moves the node
  - Happy path: Clicking empty space closes detail panel
  - Edge case: Clicking very close to two overlapping nodes selects the nearest one
  - Edge case: Resource nodes (square shape) are hittable within their bounding box
  - Integration: Click → showDetail populates detail panel HTML correctly

  **Verification:**
  - All three interaction types (hover/click/drag) work correctly
  - Tooltip follows mouse on hover
  - Detail panel opens/closes on click

- [ ] **Unit 6: Port highlight/dim/search to per-node state**

  **Goal:** Convert all SVG `.classed()` highlight functions to modify per-node `_visualState` properties and trigger canvas redraw.

  **Requirements:** R2

  **Dependencies:** Units 1-5

  **Files:**
  - Modify: `map.html` (highlightNodes, dimUnconnected, clearSelection, reapplySearchHighlighting, highlightSearchSubgraph, showFilteredSubgraph, clearSearchModeHighlighting)

  **Approach:**
  - Define visual state enum: `'normal' | 'dimmed' | 'highlighted' | 'one-hop' | 'hidden'`
  - Helper function `setNodeState(node, state)` and `setLinkState(link, state)` — sets `_visualState` property
  - Helper function `alphaForNodeState(node)` — returns the correct globalAlpha for the node's type + state combination
  - `highlightNodes(names)`: iterate nodes array (not d3.selectAll), set \_visualState per logic, iterate renderedLinks for edges, call requestRedraw
  - `dimUnconnected(node)`: same pattern — build connectedNames set, iterate nodes/links, set states, requestRedraw
  - `clearSelection()`: reset all node/link \_visualState to 'normal', requestRedraw
  - `reapplySearchHighlighting()`: same logic but reads window.\_searchMatchSet/\_searchOneHopSet, sets states on nodes/links, requestRedraw. Remove the `setTimeout` — canvas doesn't need DOM settling time
  - `highlightSearchSubgraph(matchedNames)`: iterate nodes/links directly, set states, requestRedraw. Remove the retry logic (nodes are always in the array, no DOM race)
  - `showFilteredSubgraph()`: still calls render() to rebuild visible nodes, but post-render styling uses node state instead of d3 classes
  - `clearSearchModeHighlighting()`: reset state, call render()
  - Cluster background/label dimming: store a `_clusterDimmed` flag, read in drawFrame to adjust cluster alpha
  - Remove CSS rules for `.dimmed`, `.highlighted`, `.one-hop`, `.filtered-hidden` on `.node` and `.connection-line` (they no longer have SVG elements)

  **Patterns to follow:**
  - Current highlightNodes at line 4861
  - Current dimUnconnected at line 4902
  - Current reapplySearchHighlighting at line 5020

  **Test scenarios:**
  - Happy path: Clicking a node dims unconnected nodes and edges
  - Happy path: Clicking background restores all nodes to normal
  - Happy path: Search highlights matching nodes, dims others
  - Happy path: One-hop connections display at intermediate opacity with dashed edges
  - Happy path: Search filter mode shows only matched + 1-hop entities
  - Happy path: Clear search restores all entities
  - Edge case: Search mode click does NOT dim (preserves search highlighting)
  - Integration: Search → click node → clear search → all states reset correctly

  **Verification:**
  - All highlight/dim behaviors match current SVG appearance
  - State transitions are smooth (no flicker)
  - Search mode interactions work end-to-end

- [ ] **Unit 7: Cleanup + benchmark**

  **Goal:** Remove dead SVG code, verify no regressions, benchmark with measure-mapperf.sh.

  **Requirements:** R1, R2, R7

  **Dependencies:** Units 1-6

  **Files:**
  - Modify: `map.html` (remove dead SVG CSS, dead SVG code paths)
  - Run: `scripts/measure-mapperf.sh`

  **Approach:**
  - Remove unused CSS rules that targeted SVG `.node`, `.connection-line` elements
  - Keep CSS rules used by the 2D plot view (render2D still uses SVG)
  - Remove any remaining SVG `<defs>`, clipPath, pattern code from render()
  - Run measure-mapperf.sh with label "after-canvas" and compare to baseline
  - Target metrics: pan_zoom_fps > 58, time_to_settled_ms < 3000, long_task_max_ms < 300
  - Browser-test manually: cold load, pan/zoom, click/hover/drag, search, theme toggle, all sub-views

  **Test scenarios:**
  - Happy path: measure-mapperf.sh shows FPS improvement
  - Happy path: All network sub-views (All/Orgs/People/Resources) render correctly
  - Happy path: Plot view (2D scatter/beeswarm) still works (unchanged SVG)
  - Happy path: Dark/light theme toggle works
  - Edge case: Very high zoom level (>10x) renders without artifacts
  - Edge case: Very low zoom level (0.1x) renders without artifacts

  **Verification:**
  - Pan/zoom FPS at or near 60fps
  - No console errors
  - All interactions functional
  - Plot view unaffected

## System-Wide Impact

- **Interaction graph:** showTooltip/moveTooltip/hideTooltip and showDetail/buildConnections are pure HTML DOM — unaffected. The detail panel click-to-navigate (`highlightAndZoomTo`) needs to find nodes by data (already from nodes array, not DOM).
- **Error propagation:** Image CORS errors should fail silently to initials fallback, same as current SVG behavior.
- **State lifecycle risks:** The `requestRedraw()` dedup pattern prevents double-draws but must ensure at least one draw happens after every state change. The quadtree must stay in sync with node positions — rebuild after each simulation tick batch.
- **API surface parity:** The 2D plot view (render2D) remains SVG. The `currentView === '2d'` branch at line 3411 must continue working. The canvas element should not break plot view initialization.
- **Unchanged invariants:** Force simulation configuration, node data model, map-data.json format, API endpoints, all other HTML pages.

## Risks & Dependencies

| Risk                                                   | Mitigation                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| CORS blocks canvas drawImage for some image sources    | Set crossOrigin='anonymous', test each source. Fallback to initials is always safe.               |
| Canvas text looks softer than SVG at extreme zoom      | Cluster labels are few; can scale font size by zoom factor for high-zoom crispness.               |
| Quadtree miss rate for overlapping nodes               | Use nearest-neighbor with reasonable search radius (30px). Overlapping is rare in settled layout. |
| Regression in 2D plot view                             | Plot branches early in render() and returns. Canvas creation must not interfere.                  |
| Mobile touch interactions break                        | d3.drag handles touch natively. Test on mobile Safari.                                            |
| Initials text rendering differs between SVG and canvas | Use same font-family/size, test visually.                                                         |

## Sources & References

- Performance baselines: `perf-artifacts/2026-04-17T20-36-05__baseline-local.json` (pre-optimization), `perf-artifacts/2026-04-17T20-50-59__after-3-changes-chunked.json` (post-optimization, pre-canvas)
- Benchmark script: `scripts/measure-mapperf.sh`
- D3 Canvas examples: d3.js uses canvas extensively in its own examples for force-directed graphs
