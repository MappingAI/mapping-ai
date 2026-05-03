import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface AgiPoint {
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
}

interface AgiSource {
  url: string
  title: string | null
  type: string | null
}

interface ClusterInfo {
  id: string
  label: string
  description: string
  count: number
  cx?: number
  cy?: number
}

interface AgiData {
  points: AgiPoint[]
  sources: Record<string, AgiSource>
  clusters?: ClusterInfo[]
}

type ColorMode = 'cluster' | 'category' | 'stance' | 'timeline' | 'risk'
type SubView = 'map' | 'list' | 'scatter' | 'timeline' | 'trends'

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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function getPointColor(d: AgiPoint, colorMode: ColorMode): string {
  if (colorMode === 'cluster') return CLUSTER_COLORS[d.cluster_id || ''] || '#ccc'
  if (colorMode === 'category') return CATEGORY_COLORS[d.category] || '#888'
  const scoreKey = colorMode === 'stance' ? 'stance_score' : colorMode === 'timeline' ? 'timeline_score' : 'risk_score'
  const score = d[scoreKey]
  if (score == null) return '#ddd'
  const scale = BELIEF_SCALES[colorMode]
  if (!scale) return '#888'
  const idx = Math.max(0, Math.min(Math.round(score) - 1, scale.colors.length - 1))
  return scale.colors[idx] || '#888'
}

interface QuarterBucket {
  key: string
  label: string
  start: Date
  end: Date
}

function buildQuarters(points: AgiPoint[]): QuarterBucket[] {
  const dated = points.filter((p) => p.date)
  if (dated.length === 0) return []
  const dates = dated.map((p) => new Date(p.date!))
  const rawMin = new Date(Math.min(...dates.map((d) => d.getTime())))
  const minDate = rawMin.getFullYear() < 2020 ? new Date(2020, 0, 1) : rawMin
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
  const quarters: QuarterBucket[] = []
  let y = minDate.getFullYear()
  let q = Math.floor(minDate.getMonth() / 3)
  const endY = maxDate.getFullYear()
  const endQ = Math.floor(maxDate.getMonth() / 3)
  while (y < endY || (y === endY && q <= endQ)) {
    const start = new Date(y, q * 3, 1)
    const end = new Date(y, q * 3 + 3, 0)
    quarters.push({ key: `${y}Q${q + 1}`, label: `Q${q + 1} ${y}`, start, end })
    q++
    if (q > 3) {
      q = 0
      y++
    }
  }
  return quarters
}

function pointInQuarter(p: AgiPoint, qb: QuarterBucket): boolean {
  if (!p.date) return false
  const d = new Date(p.date)
  return d >= qb.start && d <= qb.end
}

function createTooltip(id: string): HTMLDivElement {
  let el = document.getElementById(id) as HTMLDivElement | null
  if (!el) {
    el = document.createElement('div')
    el.id = id
    Object.assign(el.style, {
      position: 'fixed',
      background: 'var(--bg-panel)',
      border: '1px solid var(--line)',
      borderRadius: '4px',
      padding: '8px 12px',
      fontFamily: 'var(--mono)',
      fontSize: '11px',
      color: 'var(--text-1)',
      pointerEvents: 'none',
      zIndex: '9999',
      maxWidth: '320px',
      lineHeight: '1.4',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      opacity: '0',
      left: '0',
      top: '0',
    })
    document.body.appendChild(el)
  }
  return el
}

function showTip(tipEl: HTMLDivElement, evt: MouseEvent, html: string) {
  tipEl.innerHTML = html
  tipEl.style.left = evt.clientX + 12 + 'px'
  tipEl.style.top = evt.clientY + 12 + 'px'
  tipEl.style.opacity = '1'
}

function moveTip(tipEl: HTMLDivElement, evt: MouseEvent) {
  tipEl.style.left = evt.clientX + 12 + 'px'
  tipEl.style.top = evt.clientY + 12 + 'px'
}

function hideTip(tipEl: HTMLDivElement) {
  tipEl.style.opacity = '0'
}

function buildTooltipHtml(d: AgiPoint, colorMode: ColorMode): string {
  const beliefValue =
    colorMode === 'cluster'
      ? d.cluster_label
      : colorMode === 'category'
        ? null
        : d[colorMode as 'stance' | 'timeline' | 'risk']
  const beliefLine = beliefValue
    ? `<div style="color:${getPointColor(d, colorMode)};font-weight:500;font-size:10px;margin-bottom:2px;">${escapeHtml(String(beliefValue))}</div>`
    : ''
  const defText = d.definition.length > 100 ? d.definition.substring(0, 97) + '...' : d.definition
  return `<div style="font-weight:500;margin-bottom:2px;">${escapeHtml(d.name)}</div>
    <div style="color:var(--text-3);font-size:10px;margin-bottom:2px;">${escapeHtml(d.category)}</div>
    ${beliefLine}
    <div style="font-size:10px;color:var(--text-2);font-style:italic;">${escapeHtml(defText)}</div>`
}

function DetailModal({ point, source, onClose }: { point: AgiPoint; source: AgiSource | null; onClose: () => void }) {
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        background: 'rgba(0,0,0,0.2)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          overflowY: 'auto',
          width: '90vw',
          maxWidth: '520px',
          maxHeight: '75vh',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: 'var(--bg-panel)',
            borderBottom: '1px solid var(--line)',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            zIndex: 10,
            borderRadius: '8px 8px 0 0',
          }}
        >
          <div style={{ minWidth: 0, flex: 1, paddingRight: '16px' }}>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-1)',
              }}
            >
              {point.name}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>
              <span style={{ color: CATEGORY_COLORS[point.category] || 'var(--text-3)' }}>{point.category}</span>
              {point.entity_type === 'organization' ? ' · Organization' : ' · Person'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '16px',
              color: 'var(--text-3)',
              padding: '2px 8px',
              marginRight: '-8px',
              flexShrink: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '10px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: 'var(--text-3)',
                marginBottom: '4px',
              }}
            >
              How they define AGI
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '14px', color: 'var(--text-1)', lineHeight: 1.5 }}>
              {point.definition}
            </div>
          </div>
          {point.citation && (
            <div style={{ borderLeft: '2px solid var(--line)', paddingLeft: '12px' }}>
              <blockquote
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: '13px',
                  color: 'var(--text-2)',
                  lineHeight: 1.45,
                  fontStyle: 'italic',
                  margin: 0,
                }}
              >
                &ldquo;{point.citation}&rdquo;
              </blockquote>
              {source && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '10px',
                    color: 'var(--accent)',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                    marginTop: '4px',
                    textDecoration: 'none',
                  }}
                >
                  {source.title || source.url}
                </a>
              )}
              <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-3)', marginTop: '2px' }}>
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

function ClusterMapView({
  data,
  colorMode,
  hoveredCategory,
  onSelect,
}: {
  data: AgiData
  colorMode: ColorMode
  hoveredCategory: string | null
  onSelect: (p: AgiPoint) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const simRef = useRef<ReturnType<typeof d3.forceSimulation> | null>(null)
  const colorModeRef = useRef(colorMode)
  colorModeRef.current = colorMode

  // Layout effect: runs only when data changes. Color updates are separate.
  useEffect(() => {
    if (!ref.current || !data.clusters || data.clusters.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    if (simRef.current) {
      simRef.current.stop()
      simRef.current = null
    }

    const staleTip = document.getElementById('__defview-map-tip')
    if (staleTip) staleTip.style.opacity = '0'

    const _W = container.clientWidth || 700
    const clusters = data.clusters

    const cxExtent = d3.extent(clusters, (c: ClusterInfo) => c.cx ?? 0) as [number, number]
    const cyExtent = d3.extent(clusters, (c: ClusterInfo) => c.cy ?? 0) as [number, number]

    // Larger work area with more padding for cluster separation
    const workW = 1400
    const workPad = 220
    const xScale = d3
      .scaleLinear()
      .domain([cxExtent[0] - 1, cxExtent[1] + 1])
      .range([workPad, workW - workPad])
    const workH = 1000
    const yScale = d3
      .scaleLinear()
      .domain([cyExtent[0] - 1, cyExtent[1] + 1])
      .range([workH - workPad, workPad])

    // Initial positions from UMAP centroids
    const centers = clusters.map((c: ClusterInfo) => ({
      id: c.id as string,
      x: xScale(c.cx ?? 0),
      y: yScale(c.cy ?? 0),
      count: c.count as number,
      radius: Math.sqrt(c.count) * 10 + 25,
    }))

    // Push overlapping cluster centers apart (iterative repulsion)
    const GAP = 80
    for (let iter = 0; iter < 100; iter++) {
      let moved = false
      for (let i = 0; i < centers.length; i++) {
        for (let j = i + 1; j < centers.length; j++) {
          const a = centers[i]!
          const b = centers[j]!
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const minDist = a.radius + b.radius + GAP
          if (dist < minDist && dist > 0) {
            const push = (minDist - dist) / 2
            const nx = dx / dist
            const ny = dy / dist
            a.x -= nx * push
            a.y -= ny * push
            b.x += nx * push
            b.y += ny * push
            moved = true
          }
        }
      }
      if (!moved) break
    }

    const clusterCenters = new Map<string, { x: number; y: number; count: number }>()
    centers.forEach((c) => {
      clusterCenters.set(c.id, { x: c.x, y: c.y, count: c.count })
    })

    const nodes = data.points
      .filter((p) => p.cluster_id && clusterCenters.has(p.cluster_id))
      .map((p) => {
        const center = clusterCenters.get(p.cluster_id!)!
        const angle = Math.random() * 2 * Math.PI
        const r = Math.random() * 30 + 10
        return { ...p, x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r }
      })

    if (nodes.length === 0) return

    // Build radius lookup for background bubbles and labels
    const clusterRadii = new Map<string, number>()
    centers.forEach((c) => clusterRadii.set(c.id, c.radius))

    // Stable viewBox based on cluster centers (doesn't change during animation)
    const labelMargin = 220
    const allCx = [...clusterCenters.values()].map((c) => c.x)
    const allCy = [...clusterCenters.values()].map((c) => c.y)
    const maxRadius = Math.max(...centers.map((c) => c.radius))
    const vbX = Math.min(...allCx) - maxRadius - labelMargin
    const vbY = Math.min(...allCy) - maxRadius - 30
    const vbW = Math.max(...allCx) - Math.min(...allCx) + maxRadius * 2 + labelMargin * 2
    const vbH = Math.max(...allCy) - Math.min(...allCy) + maxRadius * 2 + 60
    const availH = (container.closest('#react-view-container')?.clientHeight || window.innerHeight - 48) - 80
    const H = Math.max(availH, 400)

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`)
      .attr('width', '100%')
      .attr('height', H)
      .attr('preserveAspectRatio', 'xMidYMid meet')

    const tipEl = createTooltip('__defview-map-tip')

    // Background bubbles for each cluster (like network view)
    const bgGroup = svg.append('g').attr('class', 'cluster-backgrounds')
    const midX = (Math.min(...allCx) + Math.max(...allCx)) / 2
    const midY = (Math.min(...allCy) + Math.max(...allCy)) / 2

    clusters.forEach((c: ClusterInfo) => {
      const center = clusterCenters.get(c.id)
      if (!center) return
      const r = clusterRadii.get(c.id) || 40
      bgGroup
        .append('circle')
        .attr('cx', center.x)
        .attr('cy', center.y)
        .attr('r', r)
        .attr('fill', CLUSTER_COLORS[c.id] || '#888')
        .attr('opacity', 0.06)
    })

    // Labels rendered immediately (positioned from stable cluster centers)
    const labelGroup = svg.append('g').attr('class', 'cluster-labels')
    clusters.forEach((c: ClusterInfo) => {
      const center = clusterCenters.get(c.id)
      if (!center) return
      const r = clusterRadii.get(c.id) || 40
      const dx = center.x - midX
      const dy = center.y - midY
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const labelOffset = r + 14
      const labelX = center.x + (dx / dist) * labelOffset
      const labelY = center.y + (dy / dist) * labelOffset

      labelGroup
        .append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', dx < 0 ? 'end' : dx > 0 ? 'start' : 'middle')
        .attr('dominant-baseline', dy < 0 ? 'auto' : 'hanging')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 13)
        .attr('fill', CLUSTER_COLORS[c.id] || '#888')
        .attr('font-weight', 500)
        .attr('opacity', 0.8)
        .text(c.label)
    })

    // Entity circles
    const circles = svg
      .selectAll('circle.entity')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'entity')
      .attr('cx', (d: { x: number }) => d.x)
      .attr('cy', (d: { y: number }) => d.y)
      .attr('r', 8)
      .attr('fill', (d: AgiPoint) => getPointColor(d, colorModeRef.current))
      .attr('opacity', 0.85)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseover', (evt: MouseEvent, d: AgiPoint) => showTip(tipEl, evt, buildTooltipHtml(d, colorModeRef.current)))
      .on('mousemove', (evt: MouseEvent) => moveTip(tipEl, evt))
      .on('mouseout', () => hideTip(tipEl))
      .on('click', (_: MouseEvent, d: AgiPoint) => {
        hideTip(tipEl)
        onSelect(d)
      })

    // Animated simulation
    const sim = d3
      .forceSimulation(nodes)
      .force(
        'x',
        d3
          .forceX((d: AgiPoint & { cluster_id: string }) => clusterCenters.get(d.cluster_id)?.x ?? workW / 2)
          .strength(0.3),
      )
      .force(
        'y',
        d3
          .forceY((d: AgiPoint & { cluster_id: string }) => clusterCenters.get(d.cluster_id)?.y ?? workH / 2)
          .strength(0.3),
      )
      .force('collide', d3.forceCollide(10))
      .force('charge', d3.forceManyBody().strength(-2))
      .alpha(0.4)
      .alphaDecay(0.025)
      .on('tick', () => {
        circles.attr('cx', (d: { x: number }) => d.x).attr('cy', (d: { y: number }) => d.y)
      })

    simRef.current = sim

    return () => {
      if (simRef.current) {
        simRef.current.stop()
        simRef.current = null
      }
      const tip = document.getElementById('__defview-map-tip')
      if (tip) tip.remove()
    }
  }, [data, onSelect])

  // Color-only update (no re-simulation)
  useEffect(() => {
    if (!ref.current) return
    d3.select(ref.current)
      .selectAll('circle.entity')
      .attr('fill', (d: AgiPoint) => getPointColor(d, colorMode))
  }, [colorMode])

  // Hover dimming
  useEffect(() => {
    if (!ref.current) return
    d3.select(ref.current)
      .selectAll('circle.entity')
      .attr('opacity', (d: AgiPoint) =>
        colorMode === 'category' && hoveredCategory && d.category !== hoveredCategory ? 0.15 : 0.85,
      )
  }, [hoveredCategory, colorMode])

  return <div ref={ref} />
}

function ListView({ data, onSelect }: { data: AgiData; onSelect: (p: AgiPoint) => void }) {
  const clusters = data.clusters || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {[...clusters]
        .sort((a, b) => b.count - a.count)
        .map((cluster) => {
          const entities = data.points.filter((p) => p.cluster_id === cluster.id)
          return (
            <div key={cluster.id}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    flexShrink: 0,
                    background: CLUSTER_COLORS[cluster.id] || '#ccc',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text-1)',
                  }}
                >
                  {cluster.label}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-3)' }}>
                  ({cluster.count})
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '10px',
                  color: 'var(--text-2)',
                  marginBottom: '8px',
                  marginLeft: '20px',
                }}
              >
                {cluster.description}
              </div>
              <div style={{ marginLeft: '20px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {entities.map((p) => (
                  <button
                    key={p.entity_id}
                    onClick={() => onSelect(p)}
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '9px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--line)',
                      color: 'var(--text-2)',
                      background: 'none',
                      cursor: 'pointer',
                      maxWidth: '180px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                    }}
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

function ScatterView({
  data,
  colorMode,
  hoveredCategory,
  onSelect,
}: {
  data: AgiData
  colorMode: ColorMode
  hoveredCategory: string | null
  onSelect: (p: AgiPoint) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !data || data.points.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const staleTip = document.getElementById('__defview-scatter-tip')
    if (staleTip) staleTip.style.opacity = '0'

    const W = container.clientWidth || 700
    const maxH = window.innerHeight - 220
    const H = Math.min(Math.max(400, W * 0.65), maxH)
    const pad = 40

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    const xExtent = d3.extent(data.points, (d: AgiPoint) => d.x) as [number, number]
    const yExtent = d3.extent(data.points, (d: AgiPoint) => d.y) as [number, number]

    const xScale = d3
      .scaleLinear()
      .domain([xExtent[0] - 0.5, xExtent[1] + 0.5])
      .range([pad, W - pad])
    const yScale = d3
      .scaleLinear()
      .domain([yExtent[0] - 0.5, yExtent[1] + 0.5])
      .range([H - pad, pad])

    const tipEl = createTooltip('__defview-scatter-tip')

    svg
      .selectAll('circle')
      .data(data.points)
      .enter()
      .append('circle')
      .attr('cx', (d: AgiPoint) => xScale(d.x))
      .attr('cy', (d: AgiPoint) => yScale(d.y))
      .attr('r', 5)
      .attr('fill', (d: AgiPoint) => getPointColor(d, colorMode))
      .attr('opacity', 0.8)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', (evt: MouseEvent, d: AgiPoint) => showTip(tipEl, evt, buildTooltipHtml(d, colorMode)))
      .on('mousemove', (evt: MouseEvent) => moveTip(tipEl, evt))
      .on('mouseout', () => hideTip(tipEl))
      .on('click', (_: MouseEvent, d: AgiPoint) => {
        hideTip(tipEl)
        onSelect(d)
      })

    return () => {
      const tip = document.getElementById('__defview-scatter-tip')
      if (tip) tip.remove()
    }
  }, [data, colorMode, onSelect])

  useEffect(() => {
    if (!ref.current) return
    d3.select(ref.current)
      .selectAll('circle')
      .attr('opacity', (d: AgiPoint) => {
        if (colorMode === 'category' || colorMode === 'cluster') {
          return hoveredCategory && d.category !== hoveredCategory ? 0.15 : 0.8
        }
        const scoreKey =
          colorMode === 'stance' ? 'stance_score' : colorMode === 'timeline' ? 'timeline_score' : 'risk_score'
        return d[scoreKey] == null ? 0.2 : 0.85
      })
  }, [hoveredCategory, colorMode])

  return <div ref={ref} />
}

function MiniSparkline({
  series,
  colorStart,
  colorEnd,
  sparkW,
  sparkH,
}: {
  series: number[]
  colorStart: string
  colorEnd: string
  sparkW: number
  sparkH: number
}) {
  const validPairs = series.map((v, i) => [i, v] as [number, number]).filter(([, v]) => !isNaN(v))
  if (validPairs.length < 2) {
    return (
      <svg viewBox={`0 0 ${sparkW} ${sparkH}`} style={{ minWidth: 0, flex: '1 1 60px', height: sparkH }}>
        <text
          x={sparkW / 2}
          y={sparkH / 2 + 3}
          textAnchor="middle"
          fontFamily="'DM Mono', monospace"
          fontSize={7}
          fill="var(--text-3)"
        >
          n/a
        </text>
      </svg>
    )
  }
  const vals = validPairs.map(([, v]) => v)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = maxV - minV || 1
  const xScale = d3
    .scaleLinear()
    .domain([0, series.length - 1])
    .range([2, sparkW - 2])
  const yScale = d3
    .scaleLinear()
    .domain([minV - range * 0.1, maxV + range * 0.1])
    .range([sparkH - 2, 2])
  const gradId = `bgrad-${Math.random().toString(36).slice(2, 8)}`
  const line = d3
    .line()
    .defined((d: [number, number]) => !isNaN(d[1]))
    .x((d: [number, number]) => xScale(d[0]))
    .y((d: [number, number]) => yScale(d[1]))
    .curve(d3.curveMonotoneX)
  const pathD = line(series.map((v, i) => [i, v] as [number, number])) || ''

  return (
    <svg width={sparkW} height={sparkH} style={{ minWidth: 0, flex: '0 1 auto' }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colorStart} />
          <stop offset="100%" stopColor={colorEnd} />
        </linearGradient>
      </defs>
      <path d={pathD} fill="none" stroke={`url(#${gradId})`} strokeWidth={1.5} />
    </svg>
  )
}

function AggregateBeliefChart({
  quarters,
  points,
  dim,
}: {
  quarters: QuarterBucket[]
  points: AgiPoint[]
  dim: { key: 'stance_score' | 'timeline_score' | 'risk_score'; label: string; colors: string[] }
}) {
  const ref = useRef<HTMLDivElement>(null)
  const scaleKey = dim.key.replace('_score', '')
  const scale = BELIEF_SCALES[scaleKey]

  useEffect(() => {
    if (!ref.current || quarters.length < 2) return
    const container = ref.current
    container.innerHTML = ''

    const W = container.clientWidth || 500
    const H = 120
    const pad = { top: 8, right: 12, bottom: 28, left: 40 }

    const series = quarters.map((q) => {
      const inQ = points.filter((p) => pointInQuarter(p, q) && p[dim.key] != null)
      if (inQ.length === 0) return null
      return d3.mean(inQ, (p: AgiPoint) => p[dim.key]) as number
    })

    const validPairs = series.map((v, i) => [i, v] as [number, number | null]).filter(([, v]) => v != null) as [
      number,
      number,
    ][]
    if (validPairs.length < 2) return

    const svg = d3.select(container).append('svg').attr('width', W).attr('height', H)

    const xScale = d3
      .scaleLinear()
      .domain([0, quarters.length - 1])
      .range([pad.left, W - pad.right])

    const scoreMin = scale ? 1 : (d3.min(validPairs, (d: [number, number]) => d[1]) as number) - 0.3
    const scoreMax = scale ? scale.labels.length : (d3.max(validPairs, (d: [number, number]) => d[1]) as number) + 0.3
    const yScale = d3
      .scaleLinear()
      .domain([scoreMin, scoreMax])
      .range([H - pad.bottom, pad.top])

    // Color scale: map score to gradient color
    const colorScale = d3
      .scaleLinear()
      .domain(dim.colors.map((_, i) => scoreMin + ((scoreMax - scoreMin) * i) / (dim.colors.length - 1)))
      .range(dim.colors)
      .clamp(true)

    // Y-axis labels
    if (scale) {
      scale.labels.forEach((label, i) => {
        const y = yScale(i + 1)
        svg
          .append('text')
          .attr('x', pad.left - 4)
          .attr('y', y)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 7)
          .attr('fill', dim.colors[i] || 'var(--text-3)')
          .text(label)
        svg
          .append('line')
          .attr('x1', pad.left)
          .attr('x2', W - pad.right)
          .attr('y1', y)
          .attr('y2', y)
          .attr('stroke', 'var(--line)')
          .attr('stroke-dasharray', '2,3')
          .attr('opacity', 0.5)
      })
    }

    // X-axis year labels
    quarters.forEach((q, i) => {
      if (q.start.getMonth() === 0 || i === 0) {
        svg
          .append('text')
          .attr('x', xScale(i))
          .attr('y', H - pad.bottom + 14)
          .attr('text-anchor', 'middle')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 8)
          .attr('fill', 'var(--text-3)')
          .text(String(q.start.getFullYear()))
      }
    })

    // Draw gradient line segments
    const line = d3
      .line()
      .defined((d: [number, number | null]) => d[1] != null)
      .x((d: [number, number]) => xScale(d[0]))
      .y((d: [number, number]) => yScale(d[1]))
      .curve(d3.curveMonotoneX)

    const indexedSeries = series.map((v, i) => [i, v] as [number, number | null])

    // Draw colored segments between each pair of valid points
    for (let k = 0; k < validPairs.length - 1; k++) {
      const [i0, v0] = validPairs[k]!
      const [i1, v1] = validPairs[k + 1]!
      const steps = 10
      const segPoints: [number, number][] = []
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const ix = i0 + (i1 - i0) * t
        const vx = v0 + (v1 - v0) * t
        segPoints.push([ix, vx])
      }
      for (let s = 0; s < segPoints.length - 1; s++) {
        const p1 = segPoints[s]!
        const p2 = segPoints[s + 1]!
        const midVal = (p1[1] + p2[1]) / 2
        svg
          .append('line')
          .attr('x1', xScale(p1[0]))
          .attr('y1', yScale(p1[1]))
          .attr('x2', xScale(p2[0]))
          .attr('y2', yScale(p2[1]))
          .attr('stroke', colorScale(midVal))
          .attr('stroke-width', 2.5)
          .attr('stroke-linecap', 'round')
      }
    }

    // Dots at data points
    validPairs.forEach(([i, v]) => {
      svg
        .append('circle')
        .attr('cx', xScale(i))
        .attr('cy', yScale(v))
        .attr('r', 3)
        .attr('fill', colorScale(v))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
    })

    // Thin ghost line for context
    svg
      .append('path')
      .datum(indexedSeries)
      .attr('d', line as never)
      .attr('fill', 'none')
      .attr('stroke', 'var(--text-3)')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.3)
  }, [quarters, points, dim])

  return <div ref={ref} />
}

function TrendsView({ data }: { data: AgiData }) {
  const quarters = useMemo(() => buildQuarters(data.points), [data.points])
  const clusters = useMemo(() => [...(data.clusters || [])].sort((a, b) => b.count - a.count), [data.clusters])

  const beliefDims = useMemo(
    () =>
      [
        { key: 'stance_score' as const, label: 'Regulatory Stance', colors: BELIEF_SCALES.stance!.colors },
        { key: 'timeline_score' as const, label: 'AGI Timeline', colors: BELIEF_SCALES.timeline!.colors },
        { key: 'risk_score' as const, label: 'AI Risk Level', colors: BELIEF_SCALES.risk!.colors },
      ] as const,
    [],
  )

  const clusterBeliefSeries = useMemo(() => {
    const result: Record<string, Record<string, number[]>> = {}
    clusters.forEach((c) => {
      result[c.id] = {}
      beliefDims.forEach((dim) => {
        result[c.id]![dim.key] = quarters.map((q) => {
          const inQ = data.points.filter((p) => p.cluster_id === c.id && pointInQuarter(p, q) && p[dim.key] != null)
          if (inQ.length === 0) return NaN
          return d3.mean(inQ, (p: AgiPoint) => p[dim.key]) as number
        })
      })
    })
    return result
  }, [data.points, clusters, quarters, beliefDims])

  const beliefSparkW = 80
  const beliefSparkH = 24

  if (quarters.length === 0) {
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)' }}>
        No dated definitions available for trend analysis.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Aggregate belief curves */}
      {beliefDims.map((dim) => (
        <div key={dim.key}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--text-1)',
              letterSpacing: '0.04em',
              marginBottom: '4px',
            }}
          >
            {dim.label}
          </div>
          <AggregateBeliefChart quarters={quarters} points={data.points} dim={dim} />
        </div>
      ))}

      {/* Per-cluster breakdown */}
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: '9px',
          fontWeight: 500,
          color: 'var(--text-2)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginTop: '8px',
        }}
      >
        By definition cluster
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {clusters.map((c) => {
          const beliefs = clusterBeliefSeries[c.id]
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  flexShrink: 0,
                  background: CLUSTER_COLORS[c.id] || '#ccc',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '10px',
                  color: 'var(--text-2)',
                  width: '160px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                  flexShrink: 0,
                }}
              >
                {c.label}
              </span>
              {beliefs &&
                beliefDims.map((dim) => {
                  const dimSeries = beliefs[dim.key] || []
                  return (
                    <div
                      key={dim.key}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 0', minWidth: 0 }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '8px',
                          color: 'var(--text-3)',
                          flexShrink: 0,
                        }}
                      >
                        {dim.label.split(' ').pop()}
                      </span>
                      <MiniSparkline
                        series={dimSeries}
                        colorStart={dim.colors[0] ?? '#888'}
                        colorEnd={dim.colors[dim.colors.length - 1] ?? '#888'}
                        sparkW={beliefSparkW}
                        sparkH={beliefSparkH}
                      />
                    </div>
                  )
                })}
            </div>
          )
        })}
      </div>

      <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-3)' }}>
        Aggregate curves show the mean score across all entities per quarter. Per-cluster sparklines show each
        cluster&apos;s mean. Gaps indicate quarters with no scored definitions.
      </div>
    </div>
  )
}

function TimelineView({ data }: { data: AgiData }) {
  const ref = useRef<HTMLDivElement>(null)
  const [tooltipState, setTooltipState] = useState<{ x: number; y: number; html: string } | null>(null)

  const quarters = useMemo(() => buildQuarters(data.points), [data.points])
  const clusters = useMemo(() => [...(data.clusters || [])].sort((a, b) => b.count - a.count), [data.clusters])

  const stackedData = useMemo(() => {
    if (quarters.length === 0) return null
    const rows = quarters.map((q) => {
      const row: Record<string, number> = { quarter: 0 }
      clusters.forEach((c) => {
        row[c.id] = data.points.filter((p) => p.cluster_id === c.id && pointInQuarter(p, q)).length
      })
      return row
    })
    const keys = clusters.map((c) => c.id)
    const stack = d3.stack().keys(keys).order(d3.stackOrderNone).offset(d3.stackOffsetNone)
    return { layers: stack(rows), keys, rows }
  }, [data.points, clusters, quarters])

  const summaryText = useMemo(() => {
    if (!stackedData || quarters.length < 2) return null
    let bestGrowth = ''
    let bestGrowthRate = 0
    const clusterMap = new Map(clusters.map((c) => [c.id, c.label]))
    stackedData.keys.forEach((key: string) => {
      const vals = stackedData.rows.map((r) => r[key] || 0)
      const firstHalf = vals.slice(0, Math.floor(vals.length / 2)).reduce((a, b) => a + b, 0)
      const secondHalf = vals.slice(Math.floor(vals.length / 2)).reduce((a, b) => a + b, 0)
      if (firstHalf > 0) {
        const rate = (secondHalf - firstHalf) / firstHalf
        if (rate > bestGrowthRate) {
          bestGrowthRate = rate
          bestGrowth = clusterMap.get(key) || key
        }
      }
    })
    if (bestGrowth && bestGrowthRate > 0.1) {
      return `${bestGrowth} definitions grew ${Math.round(bestGrowthRate * 100)}% from the first half to the second half of the time range.`
    }
    return null
  }, [stackedData, clusters, quarters])

  useEffect(() => {
    if (!ref.current || !stackedData || quarters.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const W = container.clientWidth || 700
    const H = 300
    const pad = { top: 10, right: 60, bottom: 40, left: 40 }

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%')
      .attr('height', H)

    const xScale = d3
      .scaleLinear()
      .domain([0, quarters.length - 1])
      .range([pad.left, W - pad.right])
    const yMax = d3.max(stackedData.layers[stackedData.layers.length - 1], (d: [number, number]) => d[1]) || 1
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .range([H - pad.bottom, pad.top])

    const area = d3
      .area()
      .x((_: unknown, i: number) => xScale(i))
      .y0((d: [number, number]) => yScale(d[0]))
      .y1((d: [number, number]) => yScale(d[1]))
      .curve(d3.curveMonotoneX)

    svg
      .selectAll('path.layer')
      .data(stackedData.layers)
      .enter()
      .append('path')
      .attr('class', 'layer')
      .attr('d', (d: [number, number][]) => area(d))
      .attr('fill', (_: unknown, i: number) => CLUSTER_COLORS[stackedData.keys[i] ?? ''] || '#ccc')
      .attr('opacity', 0.8)

    svg
      .append('rect')
      .attr('x', pad.left)
      .attr('y', pad.top)
      .attr('width', W - pad.left - pad.right)
      .attr('height', H - pad.top - pad.bottom)
      .attr('fill', 'transparent')
      .on('mousemove', (evt: MouseEvent) => {
        const [mx] = d3.pointer(evt)
        const idx = Math.round(xScale.invert(mx))
        const clampedIdx = Math.max(0, Math.min(quarters.length - 1, idx))
        const q = quarters[clampedIdx]
        if (!q) return
        const parts = stackedData.keys
          .map((key: string, ki: number) => {
            const val = stackedData.rows[clampedIdx]?.[key] || 0
            if (val === 0) return null
            const clusterLabel = clusters[ki]?.label || key
            return `<div style="color:${CLUSTER_COLORS[key] || 'var(--text-3)'}">${escapeHtml(clusterLabel)}: ${val}</div>`
          })
          .filter(Boolean)
          .join('')
        const html = `<div style="font-weight:500;margin-bottom:3px;">${escapeHtml(q.label)}</div>${parts}`
        setTooltipState({ x: evt.clientX + 12, y: evt.clientY + 12, html })
      })
      .on('mouseleave', () => setTooltipState(null))

    const yearIndices: number[] = []
    quarters.forEach((q, i) => {
      if (q.start.getMonth() === 0 || i === 0) yearIndices.push(i)
    })

    yearIndices.forEach((i) => {
      svg
        .append('text')
        .attr('x', xScale(i))
        .attr('y', H - pad.bottom + 16)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', 'var(--text-3)')
        .text(String(quarters[i]?.start.getFullYear() || ''))
    })

    const yTicks = yScale.ticks(4)
    yTicks.forEach((t: number) => {
      svg
        .append('text')
        .attr('x', pad.left - 6)
        .attr('y', yScale(t))
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', 'var(--text-3)')
        .text(t)
      svg
        .append('line')
        .attr('x1', pad.left)
        .attr('x2', W - pad.right)
        .attr('y1', yScale(t))
        .attr('y2', yScale(t))
        .attr('stroke', 'var(--line)')
    })
  }, [stackedData, quarters, clusters])

  if (quarters.length === 0) {
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)' }}>
        No dated definitions available for trend analysis.
      </div>
    )
  }

  return (
    <div>
      <div ref={ref} />
      {tooltipState && (
        <div
          style={{
            position: 'fixed',
            background: 'var(--bg-panel)',
            border: '1px solid var(--line)',
            borderRadius: '4px',
            padding: '8px 12px',
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            color: 'var(--text-1)',
            pointerEvents: 'none',
            zIndex: 9999,
            maxWidth: '320px',
            lineHeight: 1.4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            left: tooltipState.x,
            top: tooltipState.y,
          }}
          dangerouslySetInnerHTML={{ __html: tooltipState.html }}
        />
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: '12px' }}>
        {clusters.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: CLUSTER_COLORS[c.id] || '#ccc',
              }}
            />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-2)' }}>{c.label}</span>
          </div>
        ))}
      </div>
      {summaryText && (
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            color: 'var(--text-2)',
            marginTop: '12px',
            background: 'var(--bg-page)',
            borderRadius: '4px',
            padding: '8px 12px',
          }}
        >
          {summaryText}
        </div>
      )}
    </div>
  )
}

const CLUSTER_LABELS: Record<string, string> = {
  'human-level-cognitive-parity': 'Human-Level Cognitive Parity',
  'economic-automation': 'Economic Work Automation',
  'autonomous-research-capability': 'Autonomous Research',
  'superintelligent-systems': 'Superintelligent Systems',
  'general-purpose-agents': 'General-Purpose Agents',
  'transformative-societal-impact': 'Transformative Impact',
  'conceptual-critique': 'Conceptual Critique',
  'augmentative-tools': 'Augmentative Tools',
}

export function Legend({
  data,
  colorMode,
  setHoveredCategory,
  categories,
}: {
  data: AgiData | null
  colorMode: ColorMode
  setHoveredCategory: (cat: string | null) => void
  categories: string[]
}) {
  if (colorMode === 'cluster') {
    const clusterItems = data?.clusters?.length
      ? data.clusters
      : Object.entries(CLUSTER_COLORS).map(([id]) => ({ id, label: CLUSTER_LABELS[id] || id, count: 0 }))
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: '8px' }}>
        {clusterItems.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: CLUSTER_COLORS[c.id] || '#ccc',
              }}
            />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-2)' }}>
              {c.label}
              {c.count > 0 ? ` (${c.count})` : ''}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (colorMode === 'category') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: '8px' }}>
        {categories.map((cat) => (
          <div
            key={cat}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            onMouseEnter={() => setHoveredCategory(cat)}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: CATEGORY_COLORS[cat] || '#888',
              }}
            />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-2)' }}>
              {cat}
              {data ? ` (${data.points.filter((p) => p.category === cat).length})` : ''}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const scoreKey = colorMode === 'stance' ? 'stance_score' : colorMode === 'timeline' ? 'timeline_score' : 'risk_score'
  const noDataCount = data ? data.points.filter((p) => p[scoreKey] == null).length : 0
  const beliefScale = BELIEF_SCALES[colorMode]

  if (beliefScale) {
    const n = beliefScale.labels.length
    return (
      <div style={{ marginTop: '8px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${n}, 1fr)`,
            gap: '1px',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          {beliefScale.colors.map((color, i) => (
            <div key={i} style={{ height: '12px', background: color }} />
          ))}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${n}, 1fr)`,
            marginTop: '4px',
          }}
        >
          {beliefScale.labels.map((label) => (
            <span
              key={label}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '8px',
                color: 'var(--text-3)',
                textAlign: 'center',
                lineHeight: 1.1,
              }}
            >
              {label}
            </span>
          ))}
        </div>
        {noDataCount > 0 && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-3)', marginTop: '4px' }}>
            {noDataCount} entities without {colorMode} data shown in gray
          </div>
        )}
      </div>
    )
  }

  return null
}

export interface DefinitionsDataPayload {
  data: AgiData
  categories: string[]
}

export function DefinitionsView({
  subView,
  colorMode,
  onDataLoaded,
  hoveredCategory,
}: {
  subView: string
  colorMode: string
  onDataLoaded?: (payload: DefinitionsDataPayload) => void
  hoveredCategory: string | null
}) {
  const viewMode = subView as SubView
  const cm = colorMode as ColorMode
  const [data, setData] = useState<AgiData | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<AgiPoint | null>(null)

  useEffect(() => {
    fetch('/data/agi-definitions.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})

    return () => {
      ;['__defview-map-tip', '__defview-scatter-tip'].forEach((id) => {
        const el = document.getElementById(id)
        if (el) el.remove()
      })
    }
  }, [])

  const handleSelect = useCallback((p: AgiPoint) => setSelectedPoint(p), [])

  const categories = useMemo(() => {
    if (!data) return []
    const counts = new Map<string, number>()
    data.points.forEach((p) => counts.set(p.category, (counts.get(p.category) || 0) + 1))
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cat]) => cat)
  }, [data])

  useEffect(() => {
    if (data && onDataLoaded) {
      onDataLoaded({ data, categories })
    }
  }, [data, categories, onDataLoaded])

  if (!data) {
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)', padding: '16px' }}>
        Loading definition space...
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 16px' }}>
      {viewMode === 'map' && (
        <ClusterMapView data={data} colorMode={cm} hoveredCategory={hoveredCategory} onSelect={handleSelect} />
      )}
      {viewMode === 'list' && <ListView data={data} onSelect={handleSelect} />}
      {viewMode === 'scatter' && (
        <ScatterView data={data} colorMode={cm} hoveredCategory={hoveredCategory} onSelect={handleSelect} />
      )}
      {viewMode === 'timeline' && <TimelineView data={data} />}
      {viewMode === 'trends' && <TrendsView data={data} />}

      {selectedPoint && (
        <DetailModal
          point={selectedPoint}
          source={data.sources[selectedPoint.source_id] || null}
          onClose={() => setSelectedPoint(null)}
        />
      )}

      <div
        style={{
          marginTop: '8px',
          fontFamily: 'var(--mono)',
          fontSize: '9px',
          color: 'var(--text-3)',
          letterSpacing: '0.04em',
        }}
      >
        Source: AGI definition claims from enrichment pipeline. Embeddings: Voyage AI voyage-3. Projection: UMAP.
      </div>

      <a
        href="/insights#agi-definitions"
        style={{
          display: 'inline-block',
          marginTop: '4px',
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          color: 'var(--accent)',
          letterSpacing: '0.04em',
          textDecoration: 'none',
        }}
      >
        See full analysis on Insights →
      </a>
    </div>
  )
}
