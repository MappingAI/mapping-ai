---
date: 2026-04-30
status: ready
requirements: docs/brainstorms/2026-04-30-edge-interaction-requirements.md
---

# Edge Interaction Implementation Plan

## Overview

Add hover tooltips and click-to-detail for edges in the map, surfacing the 3,151 edge evidence records from Neon.

## Phase 0: Data Infrastructure (Do First)

This phase ensures you have real data to test against before writing UI code.

### 0.1 Add Edge IDs to Map Export

**File**: `api/export-map.ts`

1. Update `MapRelationship` interface (line ~183):

```typescript
export interface MapRelationship {
  id: number // ← Add this
  source_type: string
  target_type: string
  source_id: number
  target_id: number
  relationship_type: string | null
  role: string | null
  evidence: string | null
}
```

2. Update relationship mapping (line ~243):

```typescript
const relationships: MapRelationship[] = edgeRows.map((e) => ({
  id: e.id, // ← Add this
  source_type: e.source_type,
  // ... rest unchanged
}))
```

### 0.2 Create Edge Evidence Export Script

**File**: `scripts/export-edge-evidence.js` (new)

```javascript
/**
 * Export edge evidence from Neon to JSON.
 *
 * Usage:
 *   node scripts/export-edge-evidence.js           # writes to public/edge-evidence.json
 *   node scripts/export-edge-evidence.js --upload  # also uploads to R2
 */
import 'dotenv/config'
import pg from 'pg'
import fs from 'fs'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const pilot = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  // Get all edge evidence with source info
  const { rows } = await pilot.query(`
    SELECT
      ee.edge_id,
      ee.citation,
      ee.start_date,
      ee.end_date,
      ee.amount_usd,
      ee.role_title,
      s.url AS source_url,
      s.title AS source_title,
      s.source_type,
      s.date_published
    FROM edge_evidence ee
    JOIN source s ON ee.source_id = s.source_id
    ORDER BY ee.edge_id
  `)

  // Group by edge_id
  const edges = {}
  for (const row of rows) {
    if (!edges[row.edge_id]) edges[row.edge_id] = { evidence: [] }
    edges[row.edge_id].evidence.push({
      citation: row.citation,
      source_url: row.source_url,
      source_title: row.source_title,
      source_type: row.source_type,
      date_published: row.date_published?.toISOString().split('T')[0] || null,
      start_date: row.start_date?.toISOString().split('T')[0] || null,
      end_date: row.end_date?.toISOString().split('T')[0] || null,
      amount_usd: row.amount_usd ? Number(row.amount_usd) : null,
      role_title: row.role_title,
    })
  }

  const output = {
    _meta: { generated_at: new Date().toISOString() },
    edges,
  }

  const json = JSON.stringify(output)
  const edgeCount = Object.keys(edges).length
  const evidenceCount = rows.length

  console.log(
    `Exported ${edgeCount} edges with ${evidenceCount} evidence records (${(json.length / 1024).toFixed(0)} KB)`,
  )

  // Write to public/ for local dev
  fs.writeFileSync('public/edge-evidence.json', json)
  console.log('Written to public/edge-evidence.json')

  // Optional R2 upload
  if (process.argv.includes('--upload')) {
    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID || 'ac57c6d87068ab259c6f54dba468de8d'}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    })
    await r2.send(
      new PutObjectCommand({
        Bucket: 'mapping-ai-data',
        Key: 'edge-evidence.json',
        Body: json,
        ContentType: 'application/json',
        CacheControl: 'public, max-age=300, s-maxage=3600',
      }),
    )
    console.log('Uploaded to R2')
  }

  await pilot.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

### 0.3 Generate Local Test Data

Run these commands to set up local data:

```bash
# 1. Regenerate map-data.json with edge IDs
npm run db:export-map

# 2. Copy to public/ for local dev
cp map-data.json public/

# 3. Generate edge-evidence.json from PILOT_DB
node scripts/export-edge-evidence.js

# 4. Start local dev server and verify
npm run dev
# Visit http://localhost:5173/map and check DevTools:
#   - Network tab: edge-evidence.json should load
#   - Console: Object.keys(window.__edgeEvidence?.edges || {}).length
```

**Checkpoint**: Before proceeding to Phase 1, verify:

- [ ] `public/map-data.json` has `relationships[0].id` property
- [ ] `public/edge-evidence.json` exists with `edges` object
- [ ] Dev server serves both files at `/map-data.json` and `/edge-evidence.json`

---

## Phase 1: Edge Hit-Testing

Add the ability to detect when mouse/touch is near an edge.

### 1.1 Add Point-to-Segment Distance Function

**File**: `map.html` (add near other geometry helpers, around line 5140)

```javascript
/**
 * Calculate perpendicular distance from point (px, py) to line segment (x1,y1)-(x2,y2)
 * Returns distance, clamped to segment endpoints.
 */
function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSq = dx * dx + dy * dy

  if (lengthSq === 0) {
    // Segment is a point
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2)
  }

  // Project point onto line, clamped to [0, 1]
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq))
  const projX = x1 + t * dx
  const projY = y1 + t * dy

  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2)
}
```

### 1.2 Add Edge Detection Function

**File**: `map.html` (add after `_findNodeAt` function, around line 5175)

```javascript
let _hoveredEdge = null

function _findEdgeAt(mx, my) {
  const x = (mx - currentZoom.x) / currentZoom.k
  const y = (my - currentZoom.y) / currentZoom.k

  // Touch devices get larger hit threshold
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const baseThreshold = isTouchDevice ? 20 : 8
  const threshold = baseThreshold / currentZoom.k

  let closest = null
  let closestDist = Infinity

  for (const l of _canvasLinks) {
    if (l._vs === 'hidden') continue
    const dist = pointToSegmentDistance(x, y, l.source.x, l.source.y, l.target.x, l.target.y)
    if (dist < threshold && dist < closestDist) {
      closest = l
      closestDist = dist
    }
  }
  return closest
}
```

### 1.3 Update Canvas Links Structure

**File**: `map.html` (around line 5615-5621)

Update the relationship edge push to include ID and role:

```javascript
// Find the existing code that pushes relationship edges:
;(allData.relationships || []).forEach((rel) => {
  if (rel.relationship_type === 'subsidiary') return
  const src = nodeById[`${rel.source_type}-${rel.source_id}`]
  const tgt = nodeById[`${rel.target_type}-${rel.target_id}`]
  if (src && tgt)
    _canvasLinks.push({
      source: src,
      target: tgt,
      relType: rel.relationship_type,
      edgeId: rel.id, // ← Add this
      role: rel.role, // ← Add this
      _vs: 'normal',
    })
})

// Also update inferred links (around line 5610-5614):
inferredLinks.forEach((l) => {
  const p = nodesByName.get(l.personName)
  const o = nodesByName.get(l.orgName)
  if (p && o)
    _canvasLinks.push({
      source: p,
      target: o,
      relType: 'affiliated',
      edgeId: null, // ← No ID for inferred links
      role: null,
      _vs: 'normal',
    })
})
```

---

## Phase 2: Edge Hover Tooltip

### 2.1 Update Tooltip HTML

The existing tooltip already has `tooltip-name` and `tooltip-sub` elements. We can reuse them.

### 2.2 Add Edge Tooltip Functions

**File**: `map.html` (add near existing `showTooltip` function, around line 6373)

```javascript
function showEdgeTooltip(event, edge) {
  if (isTouchDevice) return // Skip tooltips on touch

  const type = edge.relType || 'Related'
  const sourceName = edge.source.name || 'Unknown'
  const targetName = edge.target.name || 'Unknown'

  // Build tooltip content
  let nameText = `${type}: ${sourceName} → ${targetName}`
  let subText = ''

  // Add role and dates if available
  const evidence = window.__edgeEvidence?.edges?.[edge.edgeId]?.evidence?.[0]
  if (evidence) {
    if (evidence.role_title) {
      subText = evidence.role_title
    }
    if (evidence.start_date) {
      const endPart = evidence.end_date || 'present'
      subText += subText ? ` (${evidence.start_date}–${endPart})` : `(${evidence.start_date}–${endPart})`
    }
  } else if (edge.role) {
    subText = edge.role
  }

  // Handle inferred edges
  if (edge.edgeId === null) {
    subText = '(inferred from employment data)'
  }

  document.getElementById('tooltip-name').textContent = nameText
  document.getElementById('tooltip-sub').textContent = subText
  tooltip.classList.add('visible')
  moveTooltip(event)
}
```

### 2.3 Update Mousemove Handler

**File**: `map.html` (modify existing `canvasSel.on('mousemove.hover'` around line 5831)

```javascript
canvasSel.on('mousemove.hover', function (event) {
  const [mx, my] = d3.pointer(event, canvas)

  // Check node first (nodes take precedence)
  const node = _findNodeAt(mx, my)
  if (node !== _hoveredNode) {
    _hoveredNode = node
    if (node) {
      _hoveredEdge = null // Clear edge hover when hovering node
      canvas.style.cursor = 'pointer'
      showTooltip(event, node)
    }
  }

  // Check edge only if not hovering a node
  if (!_hoveredNode) {
    const edge = _findEdgeAt(mx, my)
    if (edge !== _hoveredEdge) {
      _hoveredEdge = edge
      if (edge) {
        canvas.style.cursor = 'pointer'
        showEdgeTooltip(event, edge)
      } else {
        canvas.style.cursor = 'default'
        hideTooltip()
      }
      _requestRedraw() // Redraw for edge highlight
    } else if (edge) {
      moveTooltip(event)
    }
  }

  if (_hoveredNode) {
    moveTooltip(event)
  } else if (!_hoveredEdge) {
    canvas.style.cursor = 'default'
    hideTooltip()
  }
})
```

---

## Phase 3: Edge Click → Detail Panel

### 3.1 Load Edge Evidence Data

**File**: `map.html` (add in initialization, near other data fetches around line 4110)

```javascript
// Lazy-load edge evidence data
fetch('/edge-evidence.json')
  .then((r) => r.json())
  .then((data) => {
    window.__edgeEvidence = data
    console.log(`Edge evidence loaded: ${Object.keys(data.edges || {}).length} edges`)
  })
  .catch(() => {
    window.__edgeEvidence = { edges: {} }
    console.warn('Edge evidence not available')
  })
```

### 3.2 Add showEdgeDetail Function

**File**: `map.html` (add after `showDetail` function, around line 6850)

```javascript
function showEdgeDetail(edge) {
  // Password gate check (same as showDetail)
  if (document.body.classList.contains('locked')) {
    const pwOverlay = document.getElementById('password-overlay')
    if (pwOverlay) {
      pwOverlay.style.display = 'flex'
      document.getElementById('gate-password').focus()
    }
    return
  }

  const panel = document.getElementById('detail-panel')
  const content = document.getElementById('detail-content')

  const type = edge.relType || 'Relationship'
  const sourceName = edge.source.name || 'Unknown'
  const targetName = edge.target.name || 'Unknown'

  // Get evidence data
  const evidenceData = window.__edgeEvidence?.edges?.[edge.edgeId]?.evidence || []
  const isLoading = !window.__edgeEvidence
  const isInferred = edge.edgeId === null

  // Build entity links
  const sourceLink = `<a href="#" onclick="event.preventDefault();showDetail(findEntityById('${edge.source.entityType}', ${edge.source.id}), renderedNodes)">${escHtml(sourceName)}</a>`
  const targetLink = `<a href="#" onclick="event.preventDefault();showDetail(findEntityById('${edge.target.entityType}', ${edge.target.id}), renderedNodes)">${escHtml(targetName)}</a>`

  // Build evidence section
  let evidenceHtml = ''
  if (isLoading) {
    evidenceHtml = '<div class="detail-field"><span style="color:var(--text-3)">Loading evidence...</span></div>'
  } else if (isInferred) {
    evidenceHtml =
      '<div class="detail-field"><span style="color:var(--text-3)">This relationship was inferred from employment data. No source citations available.</span></div>'
  } else if (evidenceData.length === 0) {
    evidenceHtml =
      '<div class="detail-field"><span style="color:var(--text-3)">No citations available for this relationship.</span></div>'
  } else {
    evidenceHtml = evidenceData
      .map((ev) => {
        let html = `<div class="detail-field" style="margin-bottom:12px;">`
        html += `<div style="font-style:italic;color:var(--text-2);">"${escHtml(ev.citation?.substring(0, 200) || '')}${ev.citation?.length > 200 ? '...' : ''}"</div>`
        if (ev.source_title || ev.source_url) {
          html += `<div style="font-size:12px;margin-top:4px;">`
          html += `Source: ${ev.source_title ? escHtml(ev.source_title) : 'Link'}`
          if (ev.date_published) html += ` · ${ev.date_published}`
          if (ev.source_url) html += ` <a href="${escHtml(ev.source_url)}" target="_blank" rel="noopener">↗</a>`
          html += `</div>`
        }
        if (ev.amount_usd) {
          html += `<div style="font-size:12px;color:var(--text-2);">Amount: $${ev.amount_usd.toLocaleString()}</div>`
        }
        if (ev.start_date || ev.end_date) {
          const period = ev.start_date ? `${ev.start_date}–${ev.end_date || 'present'}` : `Until ${ev.end_date}`
          html += `<div style="font-size:12px;color:var(--text-2);">Period: ${period}</div>`
        }
        if (ev.role_title) {
          html += `<div style="font-size:12px;color:var(--text-2);">Role: ${escHtml(ev.role_title)}</div>`
        }
        html += `</div>`
        return html
      })
      .join('')
  }

  // Aggregate totals for multi-evidence edges
  let totalsHtml = ''
  if (evidenceData.length > 1) {
    const totalAmount = evidenceData.reduce((sum, e) => sum + (e.amount_usd || 0), 0)
    if (totalAmount > 0) {
      totalsHtml = `<div class="detail-field"><label>Total Amount</label><span>$${totalAmount.toLocaleString()} across ${evidenceData.length} records</span></div>`
    }
  }

  content.innerHTML = `
    <div class="detail-header">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;font-weight:600;">${escHtml(type)} Relationship</span>
      </div>
      <button onclick="document.getElementById('detail-panel').classList.remove('open')" style="font-size:18px;">×</button>
    </div>
    <div class="detail-body">
      <div class="detail-field">
        <label>Connected Entities</label>
        <span>${sourceLink} → ${targetLink}</span>
      </div>
      ${totalsHtml}
      <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px;">
        <label style="font-weight:600;display:block;margin-bottom:8px;">Evidence & Sources</label>
        ${evidenceHtml}
      </div>
    </div>
  `

  panel.classList.add('open')
}

// Helper to find entity by type and id
function findEntityById(type, id) {
  const arr = type === 'person' ? allData.people : type === 'organization' ? allData.organizations : allData.resources
  return arr?.find((e) => e.id === id)
}
```

### 3.3 Update Click Handler

**File**: `map.html` (modify existing `canvasSel.on('click.detail'` around line 5853)

```javascript
canvasSel.on('click.detail', function (event) {
  const [mx, my] = d3.pointer(event, canvas)

  // Check node first (nodes take priority)
  const node = _findNodeAt(mx, my)
  if (node) {
    showDetail(node, nodes)
    selectedNode = node
    _selectedEdge = null
    if (viewMode !== 'search' && currentView === 'all') dimUnconnected(node)
    const k = 3
    const t = d3.zoomIdentity.translate(width / 2 - k * node.x, height / 2 - k * node.y).scale(k)
    canvasSel.transition().duration(500).call(zoomBehavior.transform, t)
    return
  }

  // Check edge if no node clicked
  const edge = _findEdgeAt(mx, my)
  if (edge) {
    showEdgeDetail(edge)
    _selectedEdge = edge
    selectedNode = null
    // Highlight the selected edge
    for (const l of _canvasLinks) {
      l._vs = l === edge ? 'highlighted' : 'normal'
    }
    _requestRedraw()
    return
  }

  // Background click - clear selection
  document.getElementById('detail-panel').classList.remove('open')
  clearSelection()
  _selectedEdge = null
})
```

### 3.4 Add Selected Edge State

**File**: `map.html` (add with other state variables, around line 5070)

```javascript
let _selectedEdge = null
```

### 3.5 Update clearSelection

**File**: `map.html` (find `clearSelection` function and update)

```javascript
function clearSelection() {
  selectedNode = null
  _selectedEdge = null
  for (const d of _canvasNodes) d._vs = 'normal'
  for (const l of _canvasLinks) l._vs = 'normal'
  _clusterDimmed = false
  _requestRedraw()
}
```

---

## Phase 4: Edge Selection Visual

### 4.1 Update Edge Rendering for Selection

**File**: `map.html` (in `_drawFrame`, around line 5214)

Update the edge drawing to show selection state:

```javascript
// In the edge batching/rendering code:
for (const [state, links] of Object.entries(batches)) {
  if (links.length === 0) continue

  // Different styles for different states
  if (state === 'highlighted') {
    ctx.globalAlpha = 0.9
    ctx.strokeStyle = '#D4AF37' // Gold accent for selected edge
    ctx.lineWidth = 3
  } else if (state === 'dimmed') {
    ctx.globalAlpha = 0.02
    ctx.strokeStyle = tc.text3
    ctx.lineWidth = 0.5
  } else {
    ctx.globalAlpha = 0.25
    ctx.strokeStyle = tc.text3
    ctx.lineWidth = 0.5
  }

  ctx.setLineDash(state === 'one-hop' ? [4, 3] : [])
  ctx.beginPath()
  for (const l of links) {
    // ... existing drawing code
  }
  ctx.stroke()
}
```

---

## Testing Checklist

### Data Layer

- [ ] `map-data.json` includes `relationships[].id`
- [ ] `edge-evidence.json` loads and has evidence for multiple edges
- [ ] Console shows edge count on load

### Hover Tooltip

- [ ] Hovering edge shows tooltip with type and endpoints
- [ ] Hovering node near edge shows node tooltip (priority)
- [ ] Tooltip shows role/dates when evidence exists
- [ ] Tooltip shows "(inferred)" for inferred edges
- [ ] Tooltip disappears when moving away
- [ ] Tooltip stays visible when hovering tooltip itself

### Click → Detail Panel

- [ ] Clicking edge opens detail panel
- [ ] Panel shows source → target with clickable links
- [ ] Panel shows "Loading evidence..." while fetching
- [ ] Panel shows evidence citations with URLs
- [ ] Panel shows amounts/dates for funding edges
- [ ] Panel shows "No citations" for edges without evidence
- [ ] Panel shows "Inferred relationship" for inferred edges
- [ ] Clicking entity link navigates to that entity's panel
- [ ] Selected edge turns gold

### Visual

- [ ] Selected edge has thicker gold stroke
- [ ] Other edges stay normal when edge selected
- [ ] Background click clears selection

### Touch

- [ ] Tap on edge opens panel directly (no tooltip)
- [ ] 20px hit threshold makes edges easier to tap
