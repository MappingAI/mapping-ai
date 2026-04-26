import { useState, useEffect, useRef, useMemo } from 'react'
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

type ColorMode = 'cluster' | 'category' | 'stance' | 'timeline' | 'risk'

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
}

interface AgiData {
  points: AgiPoint[]
  sources: Record<string, AgiSource>
  clusters?: ClusterInfo[]
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

function DetailModal({ point, source, onClose }: { point: AgiPoint; source: AgiSource | null; onClose: () => void }) {
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

function ClusterMapView({
  data,
  colorMode,
  onSelect,
}: {
  data: AgiData
  colorMode: ColorMode
  onSelect: (p: AgiPoint) => void
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

    // Layout in a virtual coordinate space first, then fit to container
    const cxExtent = d3.extent(clusters, (c: ClusterInfo & { cx?: number }) => c.cx ?? 0) as [number, number]
    const cyExtent = d3.extent(clusters, (c: ClusterInfo & { cy?: number }) => c.cy ?? 0) as [number, number]

    // Map cluster centers to a working space with generous room
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
    clusters.forEach((c: ClusterInfo & { cx?: number; cy?: number }) => {
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

    // Compute actual bounds of all nodes
    const nodeMinX = d3.min(nodes, (d: { x: number }) => d.x) - 10
    const nodeMaxX = d3.max(nodes, (d: { x: number }) => d.x) + 10
    const nodeMinY = d3.min(nodes, (d: { y: number }) => d.y) - 10
    const nodeMaxY = d3.max(nodes, (d: { y: number }) => d.y) + 10

    // Add label margin (labels extend ~120px from cluster edges)
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

    // Cluster labels: find bounding box of each cluster's nodes, place label outside
    clusters.forEach((c: ClusterInfo & { cx?: number; cy?: number }) => {
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

    // Entity dots
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
      .attr('opacity', 0.85)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
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
            ? `<div style="color:${getPointColor(d, colorMode)};font-weight:500;font-size:10px;margin-bottom:2px;">${beliefValue}</div>`
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
  }, [data, colorMode, onSelect])

  return <div ref={ref} />
}

function ClusterView({ data, onSelect }: { data: AgiData; onSelect: (p: AgiPoint) => void }) {
  const clusters = data.clusters || []

  return (
    <div className="space-y-6">
      {clusters
        .sort((a, b) => b.count - a.count)
        .map((cluster) => {
          const entities = data.points.filter((p) => p.cluster_id === cluster.id)
          return (
            <div key={cluster.id}>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ background: CLUSTER_COLORS[cluster.id] || '#ccc' }}
                />
                <span className="font-mono text-[12px] font-medium text-[#1a1a1a]">{cluster.label}</span>
                <span className="font-mono text-[10px] text-[#999]">({cluster.count})</span>
              </div>
              <div className="font-mono text-[10px] text-[#666] mb-2 ml-5">{cluster.description}</div>
              <div className="ml-5 flex flex-wrap gap-1">
                {entities.map((p) => (
                  <button
                    key={p.entity_id}
                    onClick={() => onSelect(p)}
                    className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-[#e0e0e0] text-[#555] hover:bg-[#f0f0f0] hover:border-[#bbb] transition-colors truncate"
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

export function AgiDefinitionSpace() {
  const ref = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<AgiData | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<AgiPoint | null>(null)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [colorMode, setColorMode] = useState<ColorMode>('cluster')
  const [viewMode, setViewMode] = useState<'map' | 'clusters' | 'scatter'>('map')

  useEffect(() => {
    fetch('https://pub-b922bd462cf047f2afc0d8dd5a8dd34c.r2.dev/agi-definitions.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
  }, [])

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
    if (!ref.current || !data) return
    const container = ref.current
    container.innerHTML = ''

    const staleTip = document.getElementById('__agi-def-tip')
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

    // Tooltip div
    const tipId = '__agi-def-tip'
    let tipEl = document.getElementById(tipId) as HTMLDivElement | null
    if (!tipEl) {
      tipEl = document.createElement('div')
      tipEl.id = tipId
      tipEl.className =
        'fixed bg-white border border-[#bbb] rounded px-3 py-2 font-mono text-[11px] text-[#1a1a1a] pointer-events-none z-[9999] max-w-[320px] leading-[1.4]'
      tipEl.style.cssText = 'box-shadow: 0 2px 8px rgba(0,0,0,0.08); opacity: 0; left: 0; top: 0;'
      document.body.appendChild(tipEl)
    }

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
        if (colorMode !== 'category') {
          const scoreKey =
            colorMode === 'stance' ? 'stance_score' : colorMode === 'timeline' ? 'timeline_score' : 'risk_score'
          return d[scoreKey] == null ? 0.2 : 0.85
        }
        return hoveredCategory && d.category !== hoveredCategory ? 0.15 : 0.8
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
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
            ? `<div style="color:${getPointColor(d, colorMode)};font-weight:500;font-size:10px;margin-bottom:2px;">${beliefValue}</div>`
            : ''
          tipEl.innerHTML = `<div style="font-weight:500;margin-bottom:2px;">${escapeHtml(d.name)}</div>
            <div style="color:#666;font-size:10px;margin-bottom:2px;">${escapeHtml(d.category)}</div>
            ${beliefLine}
            <div style="font-size:10px;color:#444;font-style:italic;">${escapeHtml(d.definition.length > 120 ? d.definition.substring(0, 117) + '...' : d.definition)}</div>`
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
        setSelectedPoint(d)
      })
  }, [data, hoveredCategory, colorMode])

  if (!data) return <div className="font-mono text-[11px] text-[#999]">Loading definition space...</div>

  const beliefScale = colorMode !== 'category' ? BELIEF_SCALES[colorMode] : null
  const scoreKey = colorMode === 'stance' ? 'stance_score' : colorMode === 'timeline' ? 'timeline_score' : 'risk_score'
  const noDataCount = colorMode !== 'category' ? data.points.filter((p) => p[scoreKey] == null).length : 0

  return (
    <div>
      {/* View toggle */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex gap-1">
          {(['map', 'clusters', 'scatter'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`font-mono text-[10px] tracking-[0.08em] uppercase px-3 py-1.5 rounded transition-colors ${
                viewMode === v ? 'bg-[#1a1a1a] text-white' : 'bg-[#eee] text-[#555] hover:bg-[#ddd]'
              }`}
            >
              {v === 'map' ? 'Map' : v === 'clusters' ? 'List' : 'Scatter'}
            </button>
          ))}
        </div>
        {(viewMode === 'scatter' || viewMode === 'map') && (
          <>
            <span className="font-mono text-[10px] text-[#888]">Color by:</span>
            <div className="flex gap-1">
              {COLOR_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setColorMode(opt.value)}
                  className={`font-mono text-[10px] px-2 py-1 rounded transition-colors ${
                    colorMode === opt.value ? 'bg-[#555] text-white' : 'bg-[#f5f5f5] text-[#888] hover:bg-[#eee]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
        <span className="font-mono text-[10px] text-[#999]">{data.points.length} definitions</span>
      </div>

      {viewMode === 'map' ? (
        <ClusterMapView data={data} colorMode={colorMode} onSelect={setSelectedPoint} />
      ) : viewMode === 'clusters' ? (
        <ClusterView data={data} onSelect={setSelectedPoint} />
      ) : (
        <div ref={ref} />
      )}

      {/* Legend */}
      {viewMode === 'clusters' ? null : colorMode === 'cluster' ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {(data.clusters || []).map((c) => (
            <div key={c.id} className="flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ background: CLUSTER_COLORS[c.id] || '#ccc' }}
              />
              <span className="font-mono text-[9px] text-[#666]">
                {c.label} ({c.count})
              </span>
            </div>
          ))}
        </div>
      ) : colorMode === 'category' ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {categories.map((cat) => (
            <div
              key={cat}
              className="flex items-center gap-1 cursor-pointer"
              onMouseEnter={() => setHoveredCategory(cat)}
              onMouseLeave={() => setHoveredCategory(null)}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: CATEGORY_COLORS[cat] || '#888' }}
              />
              <span className="font-mono text-[9px] text-[#666]">
                {cat} ({data.points.filter((p) => p.category === cat).length})
              </span>
            </div>
          ))}
        </div>
      ) : beliefScale ? (
        <div className="mt-2">
          <div className="flex items-center gap-0.5">
            {beliefScale.labels.map((label, i) => (
              <div key={label} className="flex flex-col items-center" style={{ flex: 1 }}>
                <div
                  className="w-full h-3 rounded-sm"
                  style={{
                    background: beliefScale.colors[i],
                    borderRadius: i === 0 ? '3px 0 0 3px' : i === beliefScale.labels.length - 1 ? '0 3px 3px 0' : '0',
                  }}
                />
                <span className="font-mono text-[8px] text-[#888] mt-1 text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
          {noDataCount > 0 && (
            <div className="font-mono text-[9px] text-[#bbb] mt-1">
              {noDataCount} entities without {colorMode} data shown in gray
            </div>
          )}
        </div>
      ) : null}

      {selectedPoint && (
        <DetailModal
          point={selectedPoint}
          source={data.sources[selectedPoint.source_id] || null}
          onClose={() => setSelectedPoint(null)}
        />
      )}
    </div>
  )
}
