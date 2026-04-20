---
title: Canvas sprite nodes ignoring dimming state and re-fetching on every render
date: '2026-04-20'
category: ui-bugs
module: map-canvas-rendering
problem_type: ui_bug
component: frontend_stimulus
severity: high
root_cause: logic_error
resolution_type: code_fix
symptoms:
  - 'Clicking a node did not dim thumbnailed nodes; only non-thumbnailed nodes dimmed correctly'
  - 'Every view switch re-fetched all 739 thumbnails, causing ~30s lag'
  - 'Edge highlighting showed neighbor-to-neighbor connections instead of direct-only'
tags:
  - canvas-2d
  - d3-force
  - sprite-rendering
  - opacity-dimming
  - image-cache
  - performance
  - map-html
---

# Canvas sprite nodes ignoring dimming state and re-fetching on every render

## Problem

After merging the Canvas 2D migration (PR #22), clicking a node to highlight its connections failed to dim 739 thumbnailed nodes (they stayed at 75% opacity instead of 15%). Separately, every `render()` call re-fetched all 739 thumbnail images from S3 because sprite references were lost on each re-render, causing ~30s lag on view switches.

## Symptoms

- Clicking a node: nodes without thumbnails dimmed correctly, but thumbnailed nodes stayed nearly full brightness
- User report: "everything without a thumbnail is properly dimmed though"
- Every view switch (All/Orgs/People/Resources), filter toggle, or resize triggered 739 simultaneous HTTP requests
- The Canvas 2D performance gains (60fps pan/zoom, -99.99% DOM elements) were completely negated by the sprite re-fetching
- Edge highlighting showed connections between neighbors (2nd-degree), not just direct connections from the clicked node

## What Didn't Work

- **Assuming the PR author had unpushed fixes.** Initial investigation checked the fork remote branches and reflog, thinking edge highlighting fixes existed locally but weren't pushed. The bugs were in the merged rendering code, not missing commits.
- **Pushing a fix directly to main without a PR.** Violated the project's PR requirement in CLAUDE.md and required a revert/re-revert cycle. Wasted time and added noise to the commit history.
- **Testing on Cloudflare Pages preview with `crossOrigin = 'anonymous'`.** The attribute triggered CORS preflight requests that the S3/CloudFront setup rejected from preview domains (`*.mapping-ai.pages.dev`), making all thumbnail loads fail silently. Preview testing was impossible until the attribute was removed.

## Solution

### Bug 1: Sprite alpha clamping (PR #25, 2 lines)

The sprite rendering path in `_drawFrame()` had:

```javascript
// BEFORE: Math.max clamped dimmed sprites to 75% opacity
ctx.globalAlpha = d._vs === 'highlighted' || isHover ? 1 : Math.max(alpha, 0.75)
// Ring was hardcoded at 0.8 regardless of state
ctx.globalAlpha = d._vs === 'highlighted' ? 1 : 0.8
```

```javascript
// AFTER: sprites respect the same alpha as non-thumbnailed nodes
ctx.globalAlpha = alpha
// Ring respects visual state
ctx.globalAlpha = d._vs === 'highlighted' || isHover ? 1 : alpha
```

### Bug 2: Sprite cache miss on re-render (PR #26)

Three changes:

1. **Persistent sprite cache** (`_spriteCache` Map keyed by `entityType-id`). Survives across `render()` calls so `getVisibleNodes()` creating fresh objects via `{ ...d }` spread no longer loses loaded sprites.

2. **Batched loading** (20 concurrent). Instead of 739 simultaneous requests, images load in controlled batches with one canvas redraw per batch (37 redraws instead of 739).

3. **High-resolution sprites**. Rasterized at source image resolution (up to 128px) instead of node display radius. Removes radius from cache key so view switches (All r=14 vs Orgs r=18) share the same sprite.

### Bug 3: Edge highlighting logic (earlier commit on main)

```javascript
// BEFORE: highlighted edges between ANY two connected nodes
l._vs = connectedNames.has(srcName) && connectedNames.has(tgtName) ? 'highlighted' : 'dimmed'

// AFTER: only highlight edges touching the clicked node
l._vs = srcName === clickedName || tgtName === clickedName ? 'highlighted' : 'dimmed'
```

## Why This Works

**Sprite alpha:** The `Math.max(alpha, 0.75)` floor was added because sprites looked washed out at low alpha, but it prevented dimmed sprites from ever going below 75%. Removing the floor lets sprites use the same 0.15 alpha that `_nodeAlpha()` returns for dimmed state, matching non-thumbnailed nodes.

**Sprite cache:** `getVisibleNodes()` creates fresh objects via object spread on every call. The `_sprite` property was set asynchronously by the image load callback on the old object reference, which was discarded on the next render. The persistent `_spriteCache` Map decouples sprite storage from node object identity. Keying by `entityType-id` (without radius) means the same 128px sprite works at any node size.

**Edge highlighting:** The original filter checked that both endpoints were in `connectedNames` (clicked node + all neighbors). An edge between two neighbors (neither being the clicked node) matched. Checking that at least one endpoint IS the clicked node gives the correct star-graph result.

## Prevention

- **Audit alpha/opacity floors against all visual states.** Any `Math.max` or `Math.min` on a visual property must be tested against every state: highlighted, dimmed, normal, hover. A floor that helps the default case can silently break interactive states.
- **When creating fresh objects via spread, audit async-attached properties.** If a callback sets data on an object, and that object gets replaced each render cycle, use an external cache keyed by stable identifiers.
- **Batch async image loads at 100+ scale.** Browser connection limits (~6 per origin) turn unbatched loads into serial queues that look like application hangs.
- **Test thumbnail loading on Cloudflare Pages preview.** The `crossOrigin = 'anonymous'` attribute requires CORS headers from the image host. Same-origin works on production but fails on preview domains.
- **Always create PRs for changes to main.** Direct pushes bypass review and create messy revert chains when issues are found. CLAUDE.md documents this requirement.

## Related Issues

- [Canvas migration plan](../../plans/2026-04-17-002-refactor-map-canvas-migration-plan.md): Units 4 (sprites) and 6 (highlight/dim porting) had implementation bugs fixed here.
- [Thumbnail pipeline fix](../integration-issues/thumbnail-pipeline-dead-cloudfront-and-external-fallbacks-2026-04-19.md): Upstream fix that established `entity.thumbnail_url` as the single image source. The sprite cache builds on this contract.
- [D3 defer outage](../../post-mortems/2026-04-09-d3-defer-map-outage.md): Established that map.html code must stay inline. Canvas rendering bugs must be fixed within this constraint.
- [Graph-context search plan](../../plans/2026-04-07-001-feat-graph-context-search-plan.md): Defines correct edge highlighting behavior that the edge logic bug violated.
