import { useMemo, useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

interface Entity {
  id: number
  name: string
  entity_type: string
  category: string
  title?: string
}

interface Edge {
  source_id: number
  target_id: number
}

interface ReachabilityRingsProps {
  entities: Entity[]
  edges: Edge[]
  maxPeople?: number
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
  Executive: '#e41a1c',
  Policymaker: '#984ea3',
  Investor: '#a65628',
  Journalist: '#17becf',
  Organizer: '#bcbd22',
  'Media/Journalism': '#17becf',
  'Deployers & Platforms': '#e41a1c',
  'Infrastructure & Compute': '#666',
  'Political Campaign/PAC': '#984ea3',
}

interface PersonReachability {
  person: Entity
  hop1: Entity[]
  hop2: Entity[]
  hop3: Entity[]
  score: number
  totalReach: number
}

// Tooltip singleton
let _tooltipEl: HTMLDivElement | null = null

function showTooltip(evt: MouseEvent, html: string) {
  if (!_tooltipEl) {
    const el = document.createElement('div')
    el.className =
      'fixed bg-white border border-[#bbb] rounded px-3 py-2 font-mono text-[11px] text-[#1a1a1a] pointer-events-none z-[9999] max-w-[280px] leading-[1.4]'
    el.style.cssText = 'box-shadow: 0 2px 8px rgba(0,0,0,0.08); opacity: 0; left: 0; top: 0;'
    document.body.appendChild(el)
    _tooltipEl = el
  }
  _tooltipEl.innerHTML = html
  _tooltipEl.style.left = evt.clientX + 12 + 'px'
  _tooltipEl.style.top = evt.clientY + 12 + 'px'
  _tooltipEl.style.opacity = '1'
}

function hideTooltip() {
  if (_tooltipEl) _tooltipEl.style.opacity = '0'
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function entityTooltipHtml(e: Entity, hopLevel?: number): string {
  const hopLabel = hopLevel
    ? `<div style="color:#888; font-size:9px; margin-top:2px;">${hopLevel}-hop connection</div>`
    : ''
  return `
    <div style="font-weight:500; margin-bottom:2px;">${escapeHtml(e.name)}</div>
    <div style="color:#666; font-size:10px;">${escapeHtml(e.title || '')}</div>
    <div style="color:${CATEGORY_COLORS[e.category] || '#888'}; font-size:10px; margin-top:2px;">${escapeHtml(e.category || '')}</div>
    <div style="color:#888; font-size:9px; text-transform:capitalize;">${e.entity_type}</div>
    ${hopLabel}
  `
}

// Entity detail modal
function EntityDetailModal({ entity, onClose }: { entity: Entity; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const mapUrl = `/map.html?entity=${entity.entity_type}/${entity.id}`

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[10vh]"
      style={{ background: 'rgba(0,0,0,0.2)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className="bg-white border border-[#ddd] rounded-lg shadow-xl overflow-y-auto w-[90vw] max-w-[400px]"
        style={{ maxHeight: '60vh' }}
      >
        <div className="sticky top-0 bg-white border-b border-[#eee] px-4 py-2.5 flex justify-between items-start z-10 rounded-t-lg">
          <div className="min-w-0 flex-1 pr-4">
            <div className="font-mono text-[13px] font-medium text-[#1a1a1a]">{entity.name}</div>
            {entity.title && <div className="font-mono text-[10px] text-[#888] mt-0.5">{entity.title}</div>}
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[16px] text-[#999] hover:text-[#333] px-2 py-0.5 -mr-2 flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="font-mono text-[9px] tracking-[0.05em] uppercase px-2 py-1 rounded"
              style={{
                background: `${CATEGORY_COLORS[entity.category] || '#888'}20`,
                color: CATEGORY_COLORS[entity.category] || '#888',
              }}
            >
              {entity.category}
            </span>
            <span className="font-mono text-[9px] text-[#888] capitalize">{entity.entity_type}</span>
          </div>

          <a href={mapUrl} className="inline-block font-mono text-[11px] text-[#2563eb] hover:underline">
            View on map →
          </a>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function computeReachability(
  personId: number,
  adj: Map<number, Set<number>>,
): { hop1: number[]; hop2: number[]; hop3: number[] } {
  const visited = new Set([personId])
  const hop1: number[] = []
  const hop2: number[] = []
  const hop3: number[] = []
  let frontier = new Set([personId])

  // Hop 1
  for (const nodeId of frontier) {
    const neighbors = adj.get(nodeId) || new Set()
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId)
        hop1.push(neighborId)
      }
    }
  }
  frontier = new Set(hop1)

  // Hop 2
  for (const nodeId of frontier) {
    const neighbors = adj.get(nodeId) || new Set()
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId)
        hop2.push(neighborId)
      }
    }
  }
  frontier = new Set(hop2)

  // Hop 3
  for (const nodeId of frontier) {
    const neighbors = adj.get(nodeId) || new Set()
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId)
        hop3.push(neighborId)
      }
    }
  }

  return { hop1, hop2, hop3 }
}

function ConcentricRingViz({
  data,
  onEntityClick,
}: {
  data: PersonReachability
  onEntityClick: (entity: Entity) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const container = ref.current
    container.innerHTML = ''

    // Responsive sizing - use container width
    const containerWidth = container.clientWidth || 320
    const W = Math.max(280, Math.min(containerWidth, 500))
    const H = W
    const centerX = W / 2
    const centerY = W / 2

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%')
      .attr('height', '100%')
      .style('max-width', '500px')
      .style('display', 'block')
      .style('margin', '0 auto')

    // Scale radii based on size
    const scale = W / 320
    const r1 = 60 * scale // 1-hop ring
    const r2 = 110 * scale // 2-hop ring
    const r3 = 150 * scale // 3-hop ring

    // Draw ring guides (faint circles)
    ;[r1, r2, r3].forEach((r, i) => {
      svg
        .append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', r)
        .attr('fill', 'none')
        .attr('stroke', '#eee')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', i === 0 ? 'none' : '3,3')
    })

    // Helper to position nodes in a ring
    const positionInRing = (index: number, total: number, radius: number) => {
      const angle = (2 * Math.PI * index) / total - Math.PI / 2
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      }
    }

    // Node sizes scaled
    const nodeSize1 = 6 * scale
    const nodeSize2 = 4 * scale
    const nodeSize3 = 3 * scale
    const centerSize = 12 * scale

    // Draw 3-hop nodes (smallest, most faded) - sample if too many
    const hop3Sample = data.hop3.length > 40 ? data.hop3.slice(0, 40) : data.hop3
    hop3Sample.forEach((entity, i) => {
      const pos = positionInRing(i, hop3Sample.length, r3)
      const circle = svg
        .append('circle')
        .attr('cx', pos.x)
        .attr('cy', pos.y)
        .attr('r', nodeSize3)
        .attr('fill', CATEGORY_COLORS[entity.category] || '#ccc')
        .attr('opacity', 0.4)
        .style('cursor', 'pointer')
      circle.on('mouseover', (evt: MouseEvent) => {
        circle.attr('opacity', 1).attr('r', nodeSize3 * 1.5)
        showTooltip(evt, entityTooltipHtml(entity, 3))
      })
      circle.on('mouseout', () => {
        circle.attr('opacity', 0.4).attr('r', nodeSize3)
        hideTooltip()
      })
      circle.on('click', () => {
        hideTooltip()
        onEntityClick(entity)
      })
    })

    // Draw 2-hop nodes (medium) - sample if too many
    const hop2Sample = data.hop2.length > 30 ? data.hop2.slice(0, 30) : data.hop2
    hop2Sample.forEach((entity, i) => {
      const pos = positionInRing(i, hop2Sample.length, r2)
      const circle = svg
        .append('circle')
        .attr('cx', pos.x)
        .attr('cy', pos.y)
        .attr('r', nodeSize2)
        .attr('fill', CATEGORY_COLORS[entity.category] || '#999')
        .attr('opacity', 0.6)
        .style('cursor', 'pointer')
      circle.on('mouseover', (evt: MouseEvent) => {
        circle.attr('opacity', 1).attr('r', nodeSize2 * 1.5)
        showTooltip(evt, entityTooltipHtml(entity, 2))
      })
      circle.on('mouseout', () => {
        circle.attr('opacity', 0.6).attr('r', nodeSize2)
        hideTooltip()
      })
      circle.on('click', () => {
        hideTooltip()
        onEntityClick(entity)
      })
    })

    // Draw 1-hop nodes (largest, fully visible)
    data.hop1.forEach((entity, i) => {
      const pos = positionInRing(i, data.hop1.length, r1)
      const circle = svg
        .append('circle')
        .attr('cx', pos.x)
        .attr('cy', pos.y)
        .attr('r', nodeSize1)
        .attr('fill', CATEGORY_COLORS[entity.category] || '#666')
        .attr('opacity', 0.9)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
      circle.on('mouseover', (evt: MouseEvent) => {
        circle.attr('opacity', 1).attr('r', nodeSize1 * 1.3)
        showTooltip(evt, entityTooltipHtml(entity, 1))
      })
      circle.on('mouseout', () => {
        circle.attr('opacity', 0.9).attr('r', nodeSize1)
        hideTooltip()
      })
      circle.on('click', () => {
        hideTooltip()
        onEntityClick(entity)
      })
    })

    // Draw center node (the person)
    const centerCircle = svg
      .append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', centerSize)
      .attr('fill', CATEGORY_COLORS[data.person.category] || '#1a1a1a')
      .attr('stroke', '#1a1a1a')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
    centerCircle.on('mouseover', (evt: MouseEvent) => {
      centerCircle.attr('r', centerSize * 1.2)
      showTooltip(evt, entityTooltipHtml(data.person))
    })
    centerCircle.on('mouseout', () => {
      centerCircle.attr('r', centerSize)
      hideTooltip()
    })
    centerCircle.on('click', () => {
      hideTooltip()
      onEntityClick(data.person)
    })
  }, [data, onEntityClick])

  return <div ref={ref} className="w-full aspect-square max-w-[500px] mx-auto" />
}

export function ReachabilityRings({ entities, edges, maxPeople = 6 }: ReachabilityRingsProps) {
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)

  const topPeople = useMemo(() => {
    // Filter to people only
    const people = entities.filter((e) => e.entity_type === 'person')
    const entityMap = new Map(entities.map((e) => [e.id, e]))

    // Build adjacency list
    const adj = new Map<number, Set<number>>()
    edges.forEach((e) => {
      if (!adj.has(e.source_id)) adj.set(e.source_id, new Set())
      if (!adj.has(e.target_id)) adj.set(e.target_id, new Set())
      adj.get(e.source_id)!.add(e.target_id)
      adj.get(e.target_id)!.add(e.source_id)
    })

    // Compute reachability for each person
    const results: PersonReachability[] = people
      .map((person) => {
        const reach = computeReachability(person.id, adj)
        const hop1Entities = reach.hop1.map((id) => entityMap.get(id)).filter((e): e is Entity => !!e)
        const hop2Entities = reach.hop2.map((id) => entityMap.get(id)).filter((e): e is Entity => !!e)
        const hop3Entities = reach.hop3.map((id) => entityMap.get(id)).filter((e): e is Entity => !!e)

        return {
          person,
          hop1: hop1Entities,
          hop2: hop2Entities,
          hop3: hop3Entities,
          score: reach.hop1.length * 3 + reach.hop2.length * 2 + reach.hop3.length,
          totalReach: reach.hop1.length + reach.hop2.length + reach.hop3.length,
        }
      })
      .filter((r) => r.hop1.length > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPeople)

    return results
  }, [entities, edges, maxPeople])

  if (topPeople.length === 0) {
    return <div className="font-mono text-[11px] text-[#999]">No network data available.</div>
  }

  // Get unique categories for legend
  const allCategories = new Set<string>()
  topPeople.forEach((p) => {
    if (p.person.category) allCategories.add(p.person.category)
    ;[...p.hop1, ...p.hop2, ...p.hop3].forEach((e) => {
      if (e.category) allCategories.add(e.category)
    })
  })

  return (
    <div>
      {/* Legend - full names, wrapping */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
        {[...allCategories].map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: CATEGORY_COLORS[cat] || '#888' }}
            />
            <span className="font-mono text-[9px] text-[#666] whitespace-nowrap">{cat}</span>
          </div>
        ))}
      </div>

      {/* Grid of ring visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {topPeople.map((data, rank) => (
          <div key={data.person.id} className="bg-white border border-[#e0e0e0] rounded-lg p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[16px] font-medium text-[#2563eb]">#{rank + 1}</span>
              <div>
                <div className="font-mono text-[12px] font-medium text-[#1a1a1a]">{data.person.name}</div>
                <span
                  className="font-mono text-[8px] tracking-[0.05em] uppercase px-1.5 py-0.5 rounded"
                  style={{
                    background: `${CATEGORY_COLORS[data.person.category] || '#888'}20`,
                    color: CATEGORY_COLORS[data.person.category] || '#888',
                  }}
                >
                  {data.person.category}
                </span>
              </div>
            </div>

            {/* Ring visualization */}
            <div className="flex justify-center">
              <ConcentricRingViz data={data} onEntityClick={setSelectedEntity} />
            </div>

            {/* Hop counts - moved below viz */}
            <div className="text-center font-mono text-[10px] text-[#888] mt-2">
              1-hop: {data.hop1.length} · 2-hop: {data.hop2.length} · 3-hop: {data.hop3.length}
            </div>

            {/* Stats */}
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#eee]">
              <div className="font-mono text-[10px] text-[#888]">
                Total reach: <span className="text-[#1a1a1a] font-medium">{data.totalReach}</span>
              </div>
              <a
                href={`/map.html?entity=person/${data.person.id}`}
                className="font-mono text-[9px] text-[#2563eb] hover:underline"
              >
                View on map →
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Entity detail modal */}
      {selectedEntity && <EntityDetailModal entity={selectedEntity} onClose={() => setSelectedEntity(null)} />}
    </div>
  )
}
