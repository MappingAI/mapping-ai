/**
 * Shared AGI Definition Cluster Map Component
 * Used by both insights page (AgiDefinitionSpace) and map page (DefinitionsView)
 */
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

// ============================================================================
// Types
// ============================================================================

export interface AgiPoint {
  entity_id: number
  name: string
  entity_type: string
  category: string
  definition: string
  citation: string
  source_id: string
  date: string | null
  confidence: string
  x: number
  y: number
  stance: string | null
  stance_score: number | null
  timeline: string | null
  timeline_score: number | null
  risk: string | null
  risk_score: number | null
  cluster_id: string | null
  cluster_label: string | null
  thumbnail_url?: string | null
}

export interface AgiSource {
  url: string
  title: string | null
  type: string | null
}

export interface ClusterInfo {
  id: string
  label: string
  description: string
  count: number
  cx?: number
  cy?: number
}

export interface AgiData {
  points: AgiPoint[]
  sources: Record<string, AgiSource>
  clusters?: ClusterInfo[]
}

export type ColorMode = 'cluster' | 'category' | 'stance' | 'timeline' | 'risk'

// ============================================================================
// Color Constants
// ============================================================================

export const CLUSTER_COLORS: Record<string, string> = {
  'human-level-cognitive-parity': '#4e79a7',
  'economic-automation': '#f28e2b',
  'autonomous-research-capability': '#e15759',
  'superintelligent-systems': '#76b7b2',
  'general-purpose-agents': '#59a14f',
  'transformative-societal-impact': '#edc948',
  'conceptual-critique': '#b07aa1',
  'augmentative-tools': '#ff9da7',
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Frontier Lab': '#e41a1c',
  'AI Safety/Alignment': '#377eb8',
  'Think Tank/Policy Org': '#4daf4a',
  'Government/Agency': '#984ea3',
  Academic: '#ff7f00',
  Researcher: '#ff7f00',
  'VC/Capital/Philanthropy': '#a65628',
  'Labor/Civil Society': '#f781bf',
  'Ethics/Bias/Rights': '#f781bf',
  Executive: '#666',
  Policymaker: '#984ea3',
  Investor: '#a65628',
  'Deployers & Platforms': '#e41a1c',
  'Infrastructure & Compute': '#e41a1c',
}

export const BELIEF_SCALES: Record<string, { labels: string[]; colors: string[] }> = {
  stance: {
    labels: ['Accelerate', 'Light-touch', 'Targeted', 'Moderate', 'Restrictive', 'Precautionary'],
    colors: ['#2166ac', '#67a9cf', '#d1e5f0', '#fddbc7', '#ef8a62', '#b2182b'],
  },
  timeline: {
    labels: ['Already here', '2-3 years', '5-10 years', '10-25 years', '25+ years'],
    colors: ['#d73027', '#fc8d59', '#fee08b', '#91cf60', '#1a9850'],
  },
  risk: {
    labels: ['Overstated', 'Manageable', 'Serious', 'Catastrophic', 'Existential'],
    colors: ['#4575b4', '#91bfdb', '#fee090', '#fc8d59', '#d73027'],
  },
}

export const COLOR_MODE_OPTIONS: { value: ColorMode; label: string }[] = [
  { value: 'cluster', label: 'Definition cluster' },
  { value: 'category', label: 'Entity category' },
  { value: 'stance', label: 'Regulatory stance' },
  { value: 'timeline', label: 'AGI timeline' },
  { value: 'risk', label: 'AI risk level' },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function getPointColor(d: AgiPoint, colorMode: ColorMode): string {
  if (colorMode === 'cluster') return CLUSTER_COLORS[d.cluster_id || ''] || '#ccc'
  if (colorMode === 'category') return CATEGORY_COLORS[d.category] || '#888'
  const scoreKey = colorMode === 'stance' ? 'stance_score' : colorMode === 'timeline' ? 'timeline_score' : 'risk_score'
  const score = d[scoreKey]
  if (score == null) return '#ddd'
  const scale = BELIEF_SCALES[colorMode]
  if (!scale) return '#888'
  return scale.colors[Math.min(score - 1, scale.colors.length - 1)] || '#888'
}

// ============================================================================
// Detail Modal Component
// ============================================================================

export function DetailModal({
  point,
  source,
  onClose,
}: {
  point: AgiPoint
  source: AgiSource | null
  onClose: () => void
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[10vh]"
      style={{ background: 'rgba(0,0,0,0.2)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-white border border-[#ddd] rounded-lg shadow-xl overflow-y-auto w-[90vw] max-w-[520px]"
        style={{ maxHeight: '75vh' }}
      >
        <div className="sticky top-0 bg-white border-b border-[#eee] px-4 py-2.5 flex justify-between items-start z-10 rounded-t-lg">
          <div className="min-w-0 flex-1 pr-4">
            <div className="font-mono text-[13px] font-medium text-[#1a1a1a]">{point.name}</div>
            <div className="font-mono text-[10px] text-[#888] mt-0.5">
              <span style={{ color: CATEGORY_COLORS[point.category] || '#888' }}>{point.category}</span>
              {point.entity_type === 'organization' ? ' · Organization' : ' · Person'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[16px] text-[#999] hover:text-[#333] px-2 py-0.5 -mr-2 flex-shrink-0"
          >
            ×
          </button>
        </div>
        <div className="px-4 py-3 space-y-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#888] mb-1">
              How they define AGI
            </div>
            <div className="font-serif text-[14px] text-[#1a1a1a] leading-[1.5]">{point.definition}</div>
          </div>
          {point.citation && (
            <div className="border-l-2 border-[#ddd] pl-3">
              <blockquote className="font-serif text-[13px] text-[#444] leading-[1.45] italic">
                &ldquo;{point.citation}&rdquo;
              </blockquote>
              {source && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-[#2563eb] hover:underline block truncate mt-1"
                >
                  {source.title || source.url}
                </a>
              )}
              <div className="font-mono text-[9px] text-[#bbb] mt-0.5">
                {[source?.type, point.date, point.confidence].filter(Boolean).join(' · ')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ============================================================================
// Cluster Map View Component (D3 visualization)
// ============================================================================

export function ClusterMapView({
  data,
  colorMode,
  hoveredCategory,
  onSelect,
  searchQuery,
}: {
  data: AgiData
  colorMode: ColorMode
  hoveredCategory?: string | null
  onSelect: (p: AgiPoint) => void
  searchQuery?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !data.clusters) return
    const container = ref.current
    container.innerHTML = ''

    // Hide any stale tooltip from previous render
    const staleTip = document.getElementById('__agi-cluster-map-tip')
    if (staleTip) staleTip.style.opacity = '0'

    const W = container.clientWidth || 700
    const clusters = data.clusters || []

    // Layout in a virtual coordinate space
    const workW = 900
    const workH = 700
    const workPad = 140

    // Get UMAP coordinates for clusters
    const cxExtent = d3.extent(clusters, (c: ClusterInfo) => c.cx ?? 0) as [number, number]
    const cyExtent = d3.extent(clusters, (c: ClusterInfo) => c.cy ?? 0) as [number, number]

    // Scale UMAP coordinates to working space
    const xScale = d3
      .scaleLinear()
      .domain([cxExtent[0] - 0.5, cxExtent[1] + 0.5])
      .range([workPad, workW - workPad])
    const yScale = d3
      .scaleLinear()
      .domain([cyExtent[0] - 0.5, cyExtent[1] + 0.5])
      .range([workH - workPad, workPad])

    // Compute cluster radius based on node count
    function clusterRadius(count: number) {
      const nodeR = 5
      const spacing = nodeR * 2.8
      const rings = Math.ceil((-3 + Math.sqrt(9 + 12 * (count - 1))) / 6) || 1
      return rings * spacing + nodeR
    }

    // Create cluster simulation nodes for force layout
    interface ClusterNode {
      id: string
      label: string
      count: number
      x: number
      y: number
      targetX: number
      targetY: number
      radius: number
    }
    const clusterNodes: ClusterNode[] = clusters.map((c: ClusterInfo) => ({
      id: c.id,
      label: c.label,
      count: c.count,
      x: xScale(c.cx ?? 0),
      y: yScale(c.cy ?? 0),
      targetX: xScale(c.cx ?? 0),
      targetY: yScale(c.cy ?? 0),
      radius: clusterRadius(c.count),
    }))

    // Run force simulation to spread clusters apart while respecting UMAP positions
    const simulation = d3
      .forceSimulation(clusterNodes)
      .force('x', d3.forceX((d: ClusterNode) => d.targetX).strength(0.3))
      .force('y', d3.forceY((d: ClusterNode) => d.targetY).strength(0.3))
      .force('collide', d3.forceCollide((d: ClusterNode) => d.radius + 35).strength(0.8))
      .stop()

    // Run simulation synchronously
    for (let i = 0; i < 150; i++) simulation.tick()

    // Pack nodes within each cluster using hexagonal grid
    function hexPack(count: number, cx: number, cy: number) {
      const positions: { x: number; y: number }[] = []
      const nodeR = 5
      const spacing = nodeR * 2.8

      // Center node
      positions.push({ x: cx, y: cy })
      let placed = 1

      // Spiral outward in rings
      let ring = 0
      while (placed < count) {
        ring++
        const nodesInRing = ring * 6
        for (let i = 0; i < nodesInRing && placed < count; i++) {
          const angle = (i / nodesInRing) * 2 * Math.PI - Math.PI / 2
          const r = ring * spacing
          positions.push({
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle),
          })
          placed++
        }
      }
      return positions
    }

    // Create entity nodes with positions
    const nodes: Array<AgiPoint & { x: number; y: number }> = []
    clusterNodes.forEach((cluster) => {
      const clusterPoints = data.points.filter((p) => p.cluster_id === cluster.id)
      const positions = hexPack(clusterPoints.length, cluster.x, cluster.y)

      clusterPoints.forEach((p, i) => {
        const pos = positions[i] || { x: cluster.x, y: cluster.y }
        nodes.push({ ...p, x: pos.x, y: pos.y })
      })
    })

    // Compute actual bounds from nodes
    const nodeMinX = d3.min(nodes, (d: { x: number }) => d.x) || 0
    const nodeMaxX = d3.max(nodes, (d: { x: number }) => d.x) || workW
    const nodeMinY = d3.min(nodes, (d: { y: number }) => d.y) || 0
    const nodeMaxY = d3.max(nodes, (d: { y: number }) => d.y) || workH

    // Add generous margins for labels
    const marginLeft = 80
    const marginRight = 160
    const marginTop = 60
    const marginBottom = 60

    const vbX = nodeMinX - marginLeft
    const vbY = nodeMinY - marginTop
    const vbW = nodeMaxX - nodeMinX + marginLeft + marginRight
    const vbH = nodeMaxY - nodeMinY + marginTop + marginBottom
    const H = W * (vbH / vbW)

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`)
      .attr('width', W)
      .attr('height', H)
      .style('overflow', 'visible')

    // Tooltip
    const tipId = '__agi-cluster-map-tip'
    let tipEl = document.getElementById(tipId) as HTMLDivElement | null
    if (!tipEl) {
      tipEl = document.createElement('div')
      tipEl.id = tipId
      tipEl.className =
        'fixed bg-white border border-[#bbb] rounded px-3 py-2 font-mono text-[11px] text-[#1a1a1a] pointer-events-none z-[9999] max-w-[320px] leading-[1.4]'
      tipEl.style.cssText = 'box-shadow: 0 2px 8px rgba(0,0,0,0.08); opacity: 0; left: 0; top: 0;'
      document.body.appendChild(tipEl)
    }

    // Label positioning with collision avoidance
    const charWidth = 6
    const labelHeight = 14

    interface PlacedLabel {
      x: number
      y: number
      width: number
      height: number
      anchor: string
    }
    const placedLabels: PlacedLabel[] = []

    // Sort clusters by size (largest first)
    const sortedClusters = [...clusterNodes].sort((a, b) => b.count - a.count)

    // Preferred label directions for specific clusters
    const preferredDirections: Record<string, number> = {
      'general-purpose-agents': 2, // top
    }

    sortedClusters.forEach((cluster) => {
      const clusterEntityNodes = nodes.filter((n) => n.cluster_id === cluster.id)
      if (clusterEntityNodes.length === 0) return

      const cx = cluster.x
      const cy = cluster.y
      const maxR = cluster.radius

      const labelText = clusters.find((c: ClusterInfo) => c.id === cluster.id)?.label || ''
      const labelW = labelText.length * charWidth

      const directions = [
        { dx: 1, dy: 0, anchor: 'start' },
        { dx: 0.7, dy: -0.7, anchor: 'start' },
        { dx: 0, dy: -1, anchor: 'middle' },
        { dx: -0.7, dy: -0.7, anchor: 'end' },
        { dx: -1, dy: 0, anchor: 'end' },
        { dx: -0.7, dy: 0.7, anchor: 'end' },
        { dx: 0, dy: 1, anchor: 'middle' },
        { dx: 0.7, dy: 0.7, anchor: 'start' },
      ]

      const labelOffset = maxR + 20
      const otherNodes = nodes.filter((n) => n.cluster_id !== cluster.id)

      const preferredIdx = preferredDirections[cluster.id]
      let bestDir = preferredIdx !== undefined ? directions[preferredIdx]! : directions[0]!
      let bestScore = -Infinity

      for (let dirIdx = 0; dirIdx < directions.length; dirIdx++) {
        const dir = directions[dirIdx]!
        const lx = cx + dir.dx * labelOffset
        const ly = cy + dir.dy * labelOffset

        let boxLeft: number, boxRight: number
        if (dir.anchor === 'start') {
          boxLeft = lx
          boxRight = lx + labelW
        } else if (dir.anchor === 'end') {
          boxLeft = lx - labelW
          boxRight = lx
        } else {
          boxLeft = lx - labelW / 2
          boxRight = lx + labelW / 2
        }
        const boxTop = ly - labelHeight / 2
        const boxBottom = ly + labelHeight / 2

        const inBounds =
          boxLeft >= vbX + 5 && boxRight <= vbX + vbW - 5 && boxTop >= vbY + 5 && boxBottom <= vbY + vbH - 5

        if (!inBounds) continue

        let minDistToNodes = Infinity
        for (const n of otherNodes) {
          const checkPoints = [
            { x: boxLeft, y: boxTop },
            { x: boxRight, y: boxTop },
            { x: boxLeft, y: boxBottom },
            { x: boxRight, y: boxBottom },
            { x: lx, y: ly },
          ]
          for (const cp of checkPoints) {
            const dist = Math.sqrt((n.x - cp.x) ** 2 + (n.y - cp.y) ** 2)
            minDistToNodes = Math.min(minDistToNodes, dist)
          }
        }

        let labelCollision = false
        for (const placed of placedLabels) {
          let placedLeft: number, placedRight: number
          if (placed.anchor === 'start') {
            placedLeft = placed.x
            placedRight = placed.x + placed.width
          } else if (placed.anchor === 'end') {
            placedLeft = placed.x - placed.width
            placedRight = placed.x
          } else {
            placedLeft = placed.x - placed.width / 2
            placedRight = placed.x + placed.width / 2
          }
          const placedTop = placed.y - placed.height / 2
          const placedBottom = placed.y + placed.height / 2

          const pad = 8
          if (
            boxLeft < placedRight + pad &&
            boxRight > placedLeft - pad &&
            boxTop < placedBottom + pad &&
            boxBottom > placedTop - pad
          ) {
            labelCollision = true
            break
          }
        }

        const tooCloseToNodes = minDistToNodes < 20
        const preferredBonus = preferredIdx !== undefined && dirIdx === preferredIdx ? 500 : 0
        const score = labelCollision
          ? -2000 + minDistToNodes + preferredBonus
          : tooCloseToNodes
            ? -1000 + minDistToNodes + preferredBonus
            : minDistToNodes + preferredBonus
        if (score > bestScore) {
          bestScore = score
          bestDir = dir
        }
      }

      const labelX = cx + bestDir.dx * labelOffset
      const labelY = cy + bestDir.dy * labelOffset

      placedLabels.push({
        x: labelX,
        y: labelY,
        width: labelW,
        height: labelHeight,
        anchor: bestDir.anchor,
      })

      svg
        .append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', bestDir.anchor)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', CLUSTER_COLORS[cluster.id] || '#888')
        .attr('font-weight', 500)
        .attr('opacity', 0.85)
        .text(labelText)
    })

    // Check if node matches search query
    const matchesSearch = (d: AgiPoint) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        d.name.toLowerCase().includes(q) ||
        d.definition.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        (d.cluster_label && d.cluster_label.toLowerCase().includes(q))
      )
    }

    // Entity dots
    svg
      .selectAll('circle.entity')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'entity')
      .attr('cx', (d: { x: number }) => d.x)
      .attr('cy', (d: { y: number }) => d.y)
      .attr('r', (d: AgiPoint) => (searchQuery && matchesSearch(d) ? 7 : 5))
      .attr('fill', (d: AgiPoint) => getPointColor(d, colorMode))
      .attr('opacity', (d: AgiPoint) => {
        if (searchQuery) {
          return matchesSearch(d) ? 1 : 0.15
        }
        if (colorMode === 'category' && hoveredCategory && d.category !== hoveredCategory) {
          return 0.15
        }
        return 0.85
      })
      .attr('stroke', (d: AgiPoint) => (searchQuery && matchesSearch(d) ? '#1a1a1a' : '#fff'))
      .attr('stroke-width', (d: AgiPoint) => (searchQuery && matchesSearch(d) ? 2 : 1))
      .style('cursor', 'pointer')
      .on('mouseover', (evt: MouseEvent, d: AgiPoint) => {
        if (tipEl) {
          const beliefValue =
            colorMode === 'cluster'
              ? d.cluster_label
              : colorMode === 'category'
                ? null
                : d[colorMode as 'stance' | 'timeline' | 'risk']
          const beliefLine = beliefValue
            ? `<div style="color:${getPointColor(d, colorMode)};font-weight:500;font-size:10px;margin-bottom:2px;">${escapeHtml(String(beliefValue))}</div>`
            : ''
          tipEl.innerHTML = `<div style="font-weight:500;margin-bottom:2px;">${escapeHtml(d.name)}</div>
            <div style="color:#666;font-size:10px;margin-bottom:2px;">${escapeHtml(d.category)}</div>
            ${beliefLine}
            <div style="font-size:10px;color:#444;font-style:italic;">${escapeHtml(d.definition.length > 100 ? d.definition.substring(0, 97) + '...' : d.definition)}</div>`
          tipEl.style.left = evt.clientX + 12 + 'px'
          tipEl.style.top = evt.clientY + 12 + 'px'
          tipEl.style.opacity = '1'
        }
      })
      .on('mousemove', (evt: MouseEvent) => {
        if (tipEl) {
          tipEl.style.left = evt.clientX + 12 + 'px'
          tipEl.style.top = evt.clientY + 12 + 'px'
        }
      })
      .on('mouseout', () => {
        if (tipEl) tipEl.style.opacity = '0'
      })
      .on('click', (_: MouseEvent, d: AgiPoint) => {
        if (tipEl) tipEl.style.opacity = '0'
        onSelect(d)
      })
  }, [data, colorMode, hoveredCategory, onSelect, searchQuery])

  return <div ref={ref} />
}

// ============================================================================
// Cluster List View Component
// ============================================================================

export function ClusterListView({
  data,
  onSelect,
  searchQuery,
}: {
  data: AgiData
  onSelect: (p: AgiPoint) => void
  searchQuery?: string
}) {
  const clusters = data.clusters || []

  const matchesSearch = (p: AgiPoint) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) || p.definition.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    )
  }

  return (
    <div className="space-y-6">
      {clusters
        .sort((a, b) => b.count - a.count)
        .map((cluster) => {
          const entities = data.points.filter((p) => p.cluster_id === cluster.id)
          const filteredEntities = searchQuery ? entities.filter(matchesSearch) : entities

          if (searchQuery && filteredEntities.length === 0) return null

          return (
            <div key={cluster.id}>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ background: CLUSTER_COLORS[cluster.id] || '#ccc' }}
                />
                <span className="font-mono text-[12px] font-medium text-[#1a1a1a]">{cluster.label}</span>
                <span className="font-mono text-[10px] text-[#999]">
                  ({searchQuery ? `${filteredEntities.length}/${cluster.count}` : cluster.count})
                </span>
              </div>
              <div className="font-mono text-[10px] text-[#666] mb-2 ml-5">{cluster.description}</div>
              <div className="ml-5 flex flex-wrap gap-1">
                {(searchQuery ? filteredEntities : entities).map((p) => (
                  <button
                    key={p.entity_id}
                    onClick={() => onSelect(p)}
                    className={`font-mono text-[9px] px-1.5 py-0.5 rounded border transition-colors truncate ${
                      searchQuery && matchesSearch(p)
                        ? 'border-[#2563eb] bg-[#eff6ff] text-[#1e40af] hover:bg-[#dbeafe]'
                        : 'border-[#e0e0e0] text-[#555] hover:bg-[#f0f0f0] hover:border-[#bbb]'
                    }`}
                    style={{ maxWidth: '180px' }}
                    title={p.definition}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
    </div>
  )
}
