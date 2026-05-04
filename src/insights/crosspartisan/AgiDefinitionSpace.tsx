import { useState, useEffect, useRef, useMemo } from 'react'
import {
  AgiPoint,
  AgiData,
  ColorMode,
  ClusterMapView,
  ClusterListView,
  DetailModal,
  CLUSTER_COLORS,
  CATEGORY_COLORS,
  BELIEF_SCALES,
  COLOR_MODE_OPTIONS,
  escapeHtml,
  getPointColor,
} from '../../components/AgiClusterMap'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

export function AgiDefinitionSpace() {
  const ref = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<AgiData | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<AgiPoint | null>(null)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [colorMode, setColorMode] = useState<ColorMode>('cluster')
  const [viewMode, setViewMode] = useState<'map' | 'clusters' | 'scatter'>('map')

  useEffect(() => {
    fetch('/data/agi-definitions.json')
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

  // Scatter view D3 rendering (uses raw UMAP coordinates)
  useEffect(() => {
    if (!ref.current || !data || viewMode !== 'scatter') return
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
  }, [data, hoveredCategory, colorMode, viewMode])

  if (!data) return <div className="font-mono text-[11px] text-[#999]">Loading definition space...</div>

  const beliefScale = colorMode !== 'category' ? BELIEF_SCALES[colorMode] : null
  const scoreKey = colorMode === 'stance' ? 'stance_score' : colorMode === 'timeline' ? 'timeline_score' : 'risk_score'
  const noDataCount = colorMode !== 'category' ? data.points.filter((p) => p[scoreKey] == null).length : 0

  return (
    <div>
      {/* Header with count */}
      <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-[#555] mb-3">
        AGI Definition Space ({data.points.length} definitions)
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
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
      </div>

      {/* Color by options */}
      {(viewMode === 'scatter' || viewMode === 'map') && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
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
        </div>
      )}

      {viewMode === 'map' ? (
        <ClusterMapView
          data={data}
          colorMode={colorMode}
          hoveredCategory={hoveredCategory}
          onSelect={setSelectedPoint}
        />
      ) : viewMode === 'clusters' ? (
        <ClusterListView data={data} onSelect={setSelectedPoint} />
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
