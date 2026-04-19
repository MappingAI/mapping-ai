---
title: 'Mobile entity directory: replacing D3 force map with card-based directory'
date: 2026-04-08
last_updated: 2026-04-19
category: best-practices
module: 'map.html / mobile directory'
problem_type: best_practice
component: frontend_stimulus
symptoms:
  - 'D3 force-directed map nodes too small to tap on mobile (<768px)'
  - 'Cluster labels illegible at 9px on small screens'
  - 'Controls sidebar and detail panel obscured entire viewport'
  - 'No deep linking or sharing for individual entities'
  - "Mobile banner said 'Best viewed on desktop' as only solution"
root_cause: wrong_api
resolution_type: code_fix
severity: high
tags:
  - mobile
  - d3-js
  - responsive-design
  - card-directory
  - deep-links
  - xss-prevention
  - memory-leak
  - clipboard-api
  - force-graph
  - shared-functions
---

# Mobile entity directory: replacing D3 force map with card-based directory

## Problem

The D3.js force-directed stakeholder map at mapping-ai.org was unusable on mobile devices. With Phase 2 outreach launching (2026-04-07), most link recipients would open on phones and see a broken map with a dismissive "Best viewed on desktop" banner — a dead end for the core product experience.

## Symptoms

- D3 force graph nodes too small for touch targets (needed 44px minimum, nodes were ~8px)
- Cluster labels rendered at 9px — illegible on mobile
- Bottom control bar cramped: filter chips, search, view toggles all competing for horizontal space
- Detail panel at `width: 100%` on mobile obscured the map entirely
- No way to deep-link to a specific entity or share via messaging apps
- Mobile banner ("Best viewed on desktop") was the only mobile accommodation

## What Didn't Work

- **Name-based URL slugs** (`?entity=person/sam-altman`): Had collision edge cases — entity names aren't guaranteed unique across data rebuilds. Switched to ID-based deep links (`?entity=person/123`).
- **Conditional D3 script loading** via `document.write`: Broke Chrome DevTools mobile emulation entirely. Reverted to always loading D3 but skipping initialization on mobile.
- **Mini graph without simulation cleanup**: Each card tap created a new D3 simulation, but previous ones kept ticking on detached DOM elements. Required explicit `_miniGraphSim.stop()` before re-render.
- **Drag handle without listener cleanup**: `initSplitDragHandle()` added `mousemove`/`touchmove` to `window` without removing previous ones. After viewing N entities, N copies of each handler accumulated.
- **CSS `[style*="display: none"]` selector**: Browser-dependent style serialization (space vs no space) caused inconsistent filtering. Replaced with `el.style.display !== 'none'` JS check.
- **innerHTML without escaping**: Entity names from user submissions injected directly. Added `escHtml()` utility.
- **Favicon requests for unknown domains**: Google Favicon API 404'd for most obscure org websites, flooding the console. Restricted to verified `ORG_DOMAINS` entries only.
- **Resource entities showing "null"**: Resources have `name: null` with display name in `title` field (mapped from `resource_title` in export). Required `name || title` fallback everywhere.
- **Spectrum filter vs card data mismatch**: Spectrum bars used fuzzy first-word matching to canonicalize belief values, but card `data-*` attributes stored raw values. Clicking a spectrum segment didn't match the cards. Fixed by canonicalizing card data attributes at render time.

## Solution

~1,400 lines added to `map.html`. Conditional rendering at `window.innerWidth < 768` skips D3 entirely and renders a native mobile directory.

### Architecture: shared functions over duplication

The key architectural decision was extracting shared functions used by both mobile and desktop, rather than building parallel implementations:

```javascript
// Shared image resolver — single source of truth
function resolveEntityImage(entity, onSuccess) {
  // Returns entity.thumbnail_url (cached in S3 by scripts/cache-thumbnails.js)
  // or null. No live Wikipedia / Google Favicon / /logos/ fallbacks since
  // 2026-04-19 — all external resolution moved to the cache script.
  // Called by: desktop map nodes, mobile mini-graph nodes, detail panel
}

// Shared connection builder — one dedup-safe traversal
function buildConnections(entity) {
  // Traverses: inferredLinks, relationships, person_organizations
  // Returns: [{entity, entityType, name, type, rel}]
  // Used by: desktop detail panel, mobile mini-graph, connection count badges
}

// Shared share handler — clipboard + native share
function shareEntity(entity) {
  // navigator.share (mobile) + clipboard with execCommand fallback
}

// XSS prevention for all innerHTML
function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
```

### Mobile directory components

1. **Category pills** (Sectors + Roles, collapsible) with belief spectrum bars
2. **Searchable card list** grouped by category, with autocomplete dropdown and boosted name scoring
3. **Mini D3 force graph** (lazy-loaded on card tap) with thumbnails, initials fallback, and max 8 nodes
4. **Draggable split view**: graph top, detail card bottom, with drag handle
5. **Deep links** via `?entity=type/id` with share button
6. **Breadcrumb navigation** for graph traversal (max 5, cleared on close)
7. **Connection count badges** + "Explore" random entry point
8. **Collapsible hero** with chevron indicators at all levels

### Memory leak prevention pattern

```javascript
// Track simulation for cleanup
let _miniGraphSim = null;
function renderMiniGraph(entity, container) {
  if (_miniGraphSim) { _miniGraphSim.stop(); _miniGraphSim = null; }
  // ... create new simulation
  const sim = _miniGraphSim = d3.forceSimulation(nodes)...
}

// Track drag listeners for cleanup
let _dragHandlers = null;
function initSplitDragHandle() {
  if (_dragHandlers) {
    window.removeEventListener('mousemove', _dragHandlers.onMove);
    window.removeEventListener('touchmove', _dragHandlers.onMove);
    // ... remove all previous
  }
  // ... add new handlers
  _dragHandlers = { onMove, onEnd };
}
```

### D3 lazy-loading with error handling

```javascript
function ensureD3() {
  return new Promise((resolve, reject) => {
    if (d3Loaded || typeof d3 !== 'undefined') {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://d3js.org/d3.v7.min.js'
    script.onload = () => {
      d3Loaded = true
      resolve()
    }
    script.onerror = () => {
      reject(new Error('D3 failed to load'))
    }
    document.head.appendChild(script)
  })
}

// Caller handles failure gracefully
ensureD3()
  .then(() => renderMiniGraph(d, container))
  .catch(() => {
    container.innerHTML = '...unavailable fallback...'
  })
```

## Why This Works

The D3 force simulation is fundamentally the wrong UI for mobile consumption — it requires mouse-precision interaction (hover, click tiny nodes, scroll-zoom) on devices designed for thumb-swipe navigation. Rather than patching the D3 experience with touch handlers, the mobile directory replaces the interaction model entirely with cards, pills, and lists — patterns that mobile browsers are optimized for.

The mini force graph is scoped to a single entity's connections (max 8 nodes), making it legible on small screens. It's lazy-loaded per interaction rather than upfront, so initial page load stays fast.

Shared functions ensure mobile and desktop stay in sync — a fix to `buildConnections` benefits both, and new entity types or data sources only need to be added once.

## Prevention

- **Always use shared functions** (`resolveEntityImage`, `buildConnections`, `escHtml`, `shareEntity`) instead of inline reimplementations. Duplicated logic was the #1 source of mobile/desktop inconsistencies during development.
- **Always escape user-provided content** before innerHTML insertion. Entity names, titles, and notes originate from user submissions and can contain HTML.
- **Always stop/cleanup D3 simulations** and remove event listeners before re-creating. Store references at module scope and call `.stop()` / `removeEventListener` explicitly.
- **Use ID-based identifiers** for deep links, never name-based slugs. Names aren't unique and require fragile normalization.
- **Test mobile on real devices**, not just DevTools emulation. DevTools doesn't faithfully reproduce `document.write`, `navigator.share`, or touch event timing.
- **Pre-compute expensive lookups** (connection count maps, slug maps) once during initialization. Mobile devices have less CPU headroom.
- **Use `name || title`** everywhere entity display names are needed. Resources use `title` as their canonical name.
- **Never call Wikipedia, Google Favicon, or any external image host from the client at render time.** All image resolution happens server-side in `scripts/cache-thumbnails.js`. The frontend reads `entity.thumbnail_url` only. See [`thumbnail-pipeline-dead-cloudfront-and-external-fallbacks-2026-04-19.md`](../integration-issues/thumbnail-pipeline-dead-cloudfront-and-external-fallbacks-2026-04-19.md) for why live fallback chains broke prod.
- **Use relative sizing** in D3 mini-graphs (percentages of container dimensions, not fixed pixel values) so graphs render correctly across phone sizes.

## Related Issues

- [Mobile directory requirements](../../brainstorms/2026-04-07-mobile-directory-requirements.md) — 14 requirements (R1-R14) defined during brainstorm
- [Mobile experience ideation](../../ideation/2026-04-07-mobile-experience-ideation.md) — 6 survivors from 48 raw ideas, 20 rejections documented
- [Implementation plan](../../plans/2026-04-07-001-feat-mobile-entity-directory-plan.md) — 7 implementation units with file-level detail
- [UX polish requirements](../../brainstorms/2026-04-08-mobile-ux-polish-requirements.md) — follow-up: graph scaling, clear filters, compact layout
- [Frontend lessons (auto memory)](../../) — D3 over Cytoscape decision, client-side search patterns (auto memory [claude])
