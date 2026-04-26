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
}

interface AgiSource {
  url: string
  title: string | null
  type: string | null
}

interface AgiData {
  points: AgiPoint[]
  sources: Record<string, AgiSource>
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

export function AgiDefinitionSpace() {
  const ref = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<AgiData | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<AgiPoint | null>(null)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

  useEffect(() => {
    fetch('/agi-definitions.json')
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
      .attr('fill', (d: AgiPoint) => CATEGORY_COLORS[d.category] || '#888')
      .attr('opacity', (d: AgiPoint) => (hoveredCategory && d.category !== hoveredCategory ? 0.15 : 0.8))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', (evt: MouseEvent, d: AgiPoint) => {
        if (tipEl) {
          tipEl.innerHTML = `<div style="font-weight:500;margin-bottom:2px;">${escapeHtml(d.name)}</div>
            <div style="color:#666;font-size:10px;margin-bottom:4px;">${escapeHtml(d.category)}</div>
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
  }, [data, hoveredCategory])

  if (!data) return <div className="font-mono text-[11px] text-[#999]">Loading definition space...</div>

  return (
    <div>
      <div ref={ref} />
      {/* Category legend */}
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
