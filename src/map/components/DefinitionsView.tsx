import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

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
type SubView = 'map' | 'list' | 'scatter' | 'timeline' | 'trends' | 'beliefs'

const COLOR_MODE_OPTIONS: { value: ColorMode; label: string }[] = [
  { value: 'cluster', label: 'Definition cluster' },
  { value: 'category', label: 'Entity category' },
  { value: 'stance', label: 'Regulatory stance' },
  { value: 'timeline', label: 'AGI timeline' },
  { value: 'risk', label: 'AI risk level' },
]

const CLUSTER_COLORS: Record<string, string> = {
  'human-level-cognitive-parity': '#4e79a7',
  'economic-automation': '#f28e2b',
  'autonomous-research-capability': '#e15759',
  'superintelligent-systems': '#76b7b2',
  'general-purpose-agents': '#59a14f',
  'transformative-societal-impact': '#edc948',
  'conceptual-critique': '#b07aa1',
  'augmentative-tools': '#ff9da7',
}

const BELIEF_SCALES: Record<string, { labels: string[]; colors: string[] }> = {
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

const CATEGORY_COLORS: Record<string, string> = {
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
  return scale.colors[Math.min(score - 1, scale.colors.length - 1)] || '#888'
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
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
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

  useEffect(() => {
    if (!ref.current || !data.clusters) return
    const container = ref.current
    container.innerHTML = ''

    const staleTip = document.getElementById('__defview-map-tip')
    if (staleTip) staleTip.style.opacity = '0'

    const W = container.clientWidth || 700
    const clusters = data.clusters || []

    const cxExtent = d3.extent(clusters, (c: ClusterInfo) => c.cx ?? 0) as [number, number]
    const cyExtent = d3.extent(clusters, (c: ClusterInfo) => c.cy ?? 0) as [number, number]

    const workW = 800
    const workPad = 120
    const xScale = d3
      .scaleLinear()
      .domain([cxExtent[0] - 1, cxExtent[1] + 1])
      .range([workPad, workW - workPad])
    const workH = 600
    const yScale = d3
      .scaleLinear()
      .domain([cyExtent[0] - 1, cyExtent[1] + 1])
      .range([workH - workPad, workPad])

    const clusterCenters = new Map<string, { x: number; y: number; count: number }>()
    clusters.forEach((c: ClusterInfo) => {
      clusterCenters.set(c.id, { x: xScale(c.cx ?? 0), y: yScale(c.cy ?? 0), count: c.count })
    })

    const nodes = data.points
      .filter((p) => p.cluster_id && clusterCenters.has(p.cluster_id))
      .map((p) => {
        const center = clusterCenters.get(p.cluster_id!)!
        const angle = Math.random() * 2 * Math.PI
        const r = Math.random() * 30 + 10
        return { ...p, x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r }
      })

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
      .force('collide', d3.forceCollide(6))
      .force('charge', d3.forceManyBody().strength(-2))
      .stop()
    for (let i = 0; i < 200; i++) sim.tick()

    if (nodes.length === 0) return

    const nodeMinX = d3.min(nodes, (d: { x: number }) => d.x) - 10
    const nodeMaxX = d3.max(nodes, (d: { x: number }) => d.x) + 10
    const nodeMinY = d3.min(nodes, (d: { y: number }) => d.y) - 10
    const nodeMaxY = d3.max(nodes, (d: { y: number }) => d.y) + 10

    const labelMargin = 130
    const vbX = nodeMinX - labelMargin
    const vbY = nodeMinY - 30
    const vbW = nodeMaxX - nodeMinX + labelMargin * 2
    const vbH = nodeMaxY - nodeMinY + 60
    const H = W * (vbH / vbW)

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`)
      .attr('width', W)
      .attr('height', H)
      .style('overflow', 'visible')

    const tipEl = createTooltip('__defview-map-tip')

    clusters.forEach((c: ClusterInfo) => {
      const center = clusterCenters.get(c.id)
      if (!center) return
      const clusterNodes = nodes.filter((n: AgiPoint) => n.cluster_id === c.id)
      if (clusterNodes.length === 0) return

      const maxR =
        d3.max(clusterNodes, (n: { x: number; y: number }) =>
          Math.sqrt((n.x - center.x) ** 2 + (n.y - center.y) ** 2),
        ) || 20
      const midX = (nodeMinX + nodeMaxX) / 2
      const midY = (nodeMinY + nodeMaxY) / 2
      const dx = center.x - midX
      const dy = center.y - midY
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const labelOffset = maxR + 18
      const labelX = center.x + (dx / dist) * labelOffset
      const labelY = center.y + (dy / dist) * labelOffset

      svg
        .append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', dx < 0 ? 'end' : dx > 0 ? 'start' : 'middle')
        .attr('dominant-baseline', dy < 0 ? 'auto' : 'hanging')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', CLUSTER_COLORS[c.id] || '#888')
        .attr('font-weight', 500)
        .attr('opacity', 0.8)
        .text(c.label)
    })

    svg
      .selectAll('circle.entity')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'entity')
      .attr('cx', (d: { x: number }) => d.x)
      .attr('cy', (d: { y: number }) => d.y)
      .attr('r', 5)
      .attr('fill', (d: AgiPoint) => getPointColor(d, colorMode))
      .attr('opacity', (d: AgiPoint) =>
        colorMode === 'category' && hoveredCategory && d.category !== hoveredCategory ? 0.15 : 0.85,
      )
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
  }, [data, colorMode, hoveredCategory, onSelect])

  return <div ref={ref} />
}

function ListView({ data, onSelect }: { data: AgiData; onSelect: (p: AgiPoint) => void }) {
  const clusters = data.clusters || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {clusters
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
    if (!ref.current || !data) return
    const container = ref.current
    container.innerHTML = ''

    const staleTip = document.getElementById('__defview-scatter-tip')
    if (staleTip) staleTip.style.opacity = '0'

    const W = container.clientWidth || 700
    const H = Math.max(400, W * 0.65)
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
      .attr('opacity', (d: AgiPoint) => {
        if (colorMode === 'category' || colorMode === 'cluster') {
          return hoveredCategory && d.category !== hoveredCategory ? 0.15 : 0.8
        }
        const scoreKey =
          colorMode === 'stance' ? 'stance_score' : colorMode === 'timeline' ? 'timeline_score' : 'risk_score'
        return d[scoreKey] == null ? 0.2 : 0.85
      })
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
  }, [data, hoveredCategory, colorMode, onSelect])

  return <div ref={ref} />
}

function TimelineView({ data }: { data: AgiData }) {
  const quarters = useMemo(() => buildQuarters(data.points), [data.points])
  const clusters = useMemo(() => (data.clusters || []).sort((a, b) => b.count - a.count), [data.clusters])

  const clusterTimeSeries = useMemo(() => {
    const series: Record<string, number[]> = {}
    clusters.forEach((c) => {
      series[c.id] = quarters.map(
        (q) => data.points.filter((p) => p.cluster_id === c.id && pointInQuarter(p, q)).length,
      )
    })
    return series
  }, [data.points, clusters, quarters])

  const totalSeries = useMemo(
    () => quarters.map((q) => data.points.filter((p) => pointInQuarter(p, q)).length),
    [data.points, quarters],
  )

  const sparkW = 120
  const sparkH = 30

  if (quarters.length === 0) {
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)' }}>
        No dated definitions available for timeline analysis.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {clusters.map((c) => {
          const series = clusterTimeSeries[c.id] || []
          const maxVal = Math.max(...series, 1)
          const xScale = d3
            .scaleLinear()
            .domain([0, series.length - 1])
            .range([0, sparkW])
          const yScale = d3
            .scaleLinear()
            .domain([0, maxVal])
            .range([sparkH - 2, 2])
          const line = d3
            .line()
            .x((_: number, i: number) => xScale(i))
            .y((d: number) => yScale(d))
            .curve(d3.curveMonotoneX)
          const pathD = line(series) || ''

          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                  width: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                  flexShrink: 0,
                }}
              >
                {c.label}
              </span>
              <svg width={sparkW} height={sparkH} style={{ flexShrink: 0 }}>
                <path d={pathD} fill="none" stroke={CLUSTER_COLORS[c.id] || '#ccc'} strokeWidth={1.5} />
              </svg>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-3)' }}>
                {series.reduce((a, b) => a + b, 0)} total
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: 'var(--text-3)',
            marginBottom: '8px',
          }}
        >
          All definitions over time
        </div>
        <svg width="100%" viewBox={`0 0 ${Math.max(quarters.length * 20, 200)} 80`} style={{ display: 'block' }}>
          {(() => {
            const w = Math.max(quarters.length * 20, 200)
            const h = 80
            const pad = { top: 4, bottom: 20, left: 4, right: 4 }
            const maxVal = Math.max(...totalSeries, 1)
            const xScale = d3
              .scaleLinear()
              .domain([0, totalSeries.length - 1])
              .range([pad.left, w - pad.right])
            const yScale = d3
              .scaleLinear()
              .domain([0, maxVal])
              .range([h - pad.bottom, pad.top])
            const line = d3
              .line()
              .x((_: number, i: number) => xScale(i))
              .y((d: number) => yScale(d))
              .curve(d3.curveMonotoneX)
            const area = d3
              .area()
              .x((_: number, i: number) => xScale(i))
              .y0(h - pad.bottom)
              .y1((d: number) => yScale(d))
              .curve(d3.curveMonotoneX)
            const pathD = line(totalSeries) || ''
            const areaD = area(totalSeries) || ''

            const tickIndices = quarters
              .map((_, i) => i)
              .filter(
                (i) => i === 0 || i === quarters.length - 1 || i % Math.max(1, Math.floor(quarters.length / 5)) === 0,
              )

            return (
              <>
                <path d={areaD} fill="var(--text-1)" opacity={0.06} />
                <path d={pathD} fill="none" stroke="var(--text-1)" strokeWidth={1.5} opacity={0.5} />
                {totalSeries.map((val, i) => (
                  <circle key={i} cx={xScale(i)} cy={yScale(val)} r={2.5} fill="var(--text-1)" opacity={0.4} />
                ))}
                {tickIndices.map((i) => (
                  <text
                    key={i}
                    x={xScale(i)}
                    y={h - 4}
                    textAnchor="middle"
                    fontFamily="'DM Mono', monospace"
                    fontSize={8}
                    fill="var(--text-3)"
                  >
                    {quarters[i]?.label || ''}
                  </text>
                ))}
              </>
            )
          })()}
        </svg>
      </div>
    </div>
  )
}

function TrendsView({ data }: { data: AgiData }) {
  const ref = useRef<HTMLDivElement>(null)
  const [tooltipState, setTooltipState] = useState<{ x: number; y: number; html: string } | null>(null)

  const quarters = useMemo(() => buildQuarters(data.points), [data.points])
  const clusters = useMemo(() => (data.clusters || []).sort((a, b) => b.count - a.count), [data.clusters])

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
    const pad = { top: 10, right: 10, bottom: 40, left: 40 }

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

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

    const tickIndices = quarters
      .map((_, i) => i)
      .filter((i) => i === 0 || i === quarters.length - 1 || i % Math.max(1, Math.floor(quarters.length / 4)) === 0)

    tickIndices.forEach((i) => {
      svg
        .append('text')
        .attr('x', xScale(i))
        .attr('y', H - pad.bottom + 16)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', 'var(--text-3)')
        .text(quarters[i]?.label || '')
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

function BeliefsView({ data }: { data: AgiData }) {
  const quarters = useMemo(() => buildQuarters(data.points), [data.points])
  const clusters = useMemo(() => (data.clusters || []).sort((a, b) => b.count - a.count), [data.clusters])

  const beliefDims = useMemo(
    () =>
      [
        { key: 'stance_score' as const, label: 'Stance', colors: BELIEF_SCALES.stance!.colors },
        { key: 'timeline_score' as const, label: 'Timeline', colors: BELIEF_SCALES.timeline!.colors },
        { key: 'risk_score' as const, label: 'Risk', colors: BELIEF_SCALES.risk!.colors },
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

  const sparkW = 80
  const sparkH = 24

  if (quarters.length === 0) {
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)' }}>
        No dated definitions available for belief drift analysis.
      </div>
    )
  }

  function renderSparkline(series: number[], colorStart: string, colorEnd: string) {
    const validPairs = series.map((v, i) => [i, v] as [number, number]).filter(([, v]) => !isNaN(v))
    if (validPairs.length < 2) {
      return (
        <svg width={sparkW} height={sparkH} style={{ flexShrink: 0 }}>
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
      <svg width={sparkW} height={sparkH} style={{ flexShrink: 0 }}>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
        {beliefDims.map((dim) => (
          <div key={dim.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div
              style={{
                width: '32px',
                height: '8px',
                borderRadius: '2px',
                background: `linear-gradient(to right, ${dim.colors[0]}, ${dim.colors[dim.colors.length - 1]})`,
              }}
            />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-3)' }}>{dim.label}</span>
          </div>
        ))}
      </div>

      {clusters.map((c) => {
        const series = clusterBeliefSeries[c.id]
        if (!series) return null
        return (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '180px', flexShrink: 0 }}>
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
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {c.label}
              </span>
            </div>
            {beliefDims.map((dim) => {
              const dimSeries = series[dim.key] || []
              return (
                <div key={dim.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '8px',
                      color: 'var(--text-3)',
                      width: '36px',
                      textAlign: 'right' as const,
                      flexShrink: 0,
                    }}
                  >
                    {dim.label}
                  </span>
                  {renderSparkline(dimSeries, dim.colors[0] ?? '#888', dim.colors[dim.colors.length - 1] ?? '#888')}
                </div>
              )
            })}
          </div>
        )
      })}

      <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-3)', marginTop: '8px' }}>
        Each sparkline shows the cluster's mean score per quarter. Gaps indicate quarters with no scored definitions.
      </div>
    </div>
  )
}

function Legend({
  data,
  colorMode,
  setHoveredCategory,
  categories,
}: {
  data: AgiData
  colorMode: ColorMode
  setHoveredCategory: (cat: string | null) => void
  categories: string[]
}) {
  const scoreKey = colorMode === 'stance' ? 'stance_score' : colorMode === 'timeline' ? 'timeline_score' : 'risk_score'
  const noDataCount = colorMode !== 'category' ? data.points.filter((p) => p[scoreKey] == null).length : 0
  const beliefScale = colorMode !== 'category' ? BELIEF_SCALES[colorMode] : null

  if (colorMode === 'cluster') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: '8px' }}>
        {(data.clusters || []).map((c) => (
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
              {c.label} ({c.count})
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
              {cat} ({data.points.filter((p) => p.category === cat).length})
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (beliefScale) {
    return (
      <div style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {beliefScale.labels.map((label, i) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div
                style={{
                  width: '100%',
                  height: '12px',
                  background: beliefScale.colors[i],
                  borderRadius: i === 0 ? '3px 0 0 3px' : i === beliefScale.labels.length - 1 ? '0 3px 3px 0' : '0',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '8px',
                  color: 'var(--text-3)',
                  marginTop: '4px',
                  textAlign: 'center' as const,
                  lineHeight: 1.1,
                }}
              >
                {label}
              </span>
            </div>
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

export function DefinitionsView() {
  const [data, setData] = useState<AgiData | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<AgiPoint | null>(null)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [colorMode, setColorMode] = useState<ColorMode>('cluster')
  const [viewMode, setViewMode] = useState<SubView>('map')

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

  if (!data) {
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)', padding: '16px' }}>
        Loading definition space...
      </div>
    )
  }

  const showColorSwitcher = viewMode === 'map' || viewMode === 'scatter'

  const btnBase: React.CSSProperties = {
    fontFamily: 'var(--mono)',
    fontSize: '10px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '6px 12px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  }
  const btnActive: React.CSSProperties = { ...btnBase, background: 'var(--text-1)', color: 'var(--bg-panel)' }
  const btnInactive: React.CSSProperties = { ...btnBase, background: 'var(--bg-page)', color: 'var(--text-2)' }

  const subViews: { key: SubView; label: string }[] = [
    { key: 'map', label: 'Map' },
    { key: 'list', label: 'List' },
    { key: 'scatter', label: 'Scatter' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'trends', label: 'Trends' },
    { key: 'beliefs', label: 'Beliefs' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 40px' }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-2)',
          marginBottom: '12px',
        }}
      >
        AGI Definition Space ({data.points.length} entities)
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {subViews.map((v) => (
            <button key={v.key} onClick={() => setViewMode(v.key)} style={viewMode === v.key ? btnActive : btnInactive}>
              {v.label}
            </button>
          ))}
        </div>
        {showColorSwitcher && (
          <>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-3)', marginLeft: '8px' }}>
              Color by:
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {COLOR_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setColorMode(opt.value)}
                  style={
                    colorMode === opt.value
                      ? {
                          ...btnBase,
                          fontSize: '10px',
                          padding: '4px 8px',
                          background: 'var(--text-2)',
                          color: 'var(--bg-panel)',
                        }
                      : {
                          ...btnBase,
                          fontSize: '10px',
                          padding: '4px 8px',
                          background: 'var(--bg-page)',
                          color: 'var(--text-3)',
                        }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
        <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-3)', marginLeft: '8px' }}>
          {data.points.length} definitions
        </span>
      </div>

      {viewMode === 'map' && (
        <ClusterMapView data={data} colorMode={colorMode} hoveredCategory={hoveredCategory} onSelect={handleSelect} />
      )}
      {viewMode === 'list' && <ListView data={data} onSelect={handleSelect} />}
      {viewMode === 'scatter' && (
        <ScatterView data={data} colorMode={colorMode} hoveredCategory={hoveredCategory} onSelect={handleSelect} />
      )}
      {viewMode === 'timeline' && <TimelineView data={data} />}
      {viewMode === 'trends' && <TrendsView data={data} />}
      {viewMode === 'beliefs' && <BeliefsView data={data} />}

      {(viewMode === 'map' || viewMode === 'scatter') && (
        <Legend data={data} colorMode={colorMode} setHoveredCategory={setHoveredCategory} categories={categories} />
      )}

      {selectedPoint && (
        <DetailModal
          point={selectedPoint}
          source={data.sources[selectedPoint.source_id] || null}
          onClose={() => setSelectedPoint(null)}
        />
      )}

      <div
        style={{
          marginTop: '12px',
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
          marginTop: '8px',
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
