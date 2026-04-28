import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
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
  relationship_type?: string
  role?: string
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

type EntityFilter = 'all' | 'people' | 'orgs'

interface PersonReachability {
  person: Entity
  // Full lists (unfiltered) - for center node card
  hop1All: Entity[]
  hop2All: Entity[]
  hop3All: Entity[]
  // Filtered lists - for display in rings
  hop1: Entity[]
  hop2: Entity[]
  hop3: Entity[]
  score: number
  totalReach: number
}

interface PathStep {
  entity: Entity
  relationshipType?: string
}

// Get map URL slug - map uses 'org' not 'organization'
function getMapSlug(entity: Entity): string {
  const typePrefix: Record<string, string> = { person: 'person', organization: 'org', resource: 'resource' }
  return `${typePrefix[entity.entity_type] || entity.entity_type}/${entity.id}`
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

// Find all paths from source to target (BFS, limited to maxPaths)
function findPaths(
  sourceId: number,
  targetId: number,
  adj: Map<number, Set<number>>,
  edgeMap: Map<string, Edge>,
  entityMap: Map<number, Entity>,
  maxHops: number,
  maxPaths: number = 5,
): PathStep[][] {
  const paths: PathStep[][] = []
  const queue: { nodeId: number; path: PathStep[] }[] = [{ nodeId: sourceId, path: [] }]

  while (queue.length > 0 && paths.length < maxPaths) {
    const { nodeId, path } = queue.shift()!

    if (path.length > maxHops) continue

    if (nodeId === targetId && path.length > 0) {
      paths.push(path)
      continue
    }

    const neighbors = adj.get(nodeId) || new Set()
    for (const neighborId of neighbors) {
      if (path.some((step) => step.entity.id === neighborId)) continue

      const entity = entityMap.get(neighborId)
      if (!entity) continue

      const edgeKey1 = `${nodeId}-${neighborId}`
      const edgeKey2 = `${neighborId}-${nodeId}`
      const edge = edgeMap.get(edgeKey1) || edgeMap.get(edgeKey2)

      const newPath = [...path, { entity, relationshipType: edge?.relationship_type || edge?.role }]

      if (neighborId === targetId) {
        paths.push(newPath)
        if (paths.length >= maxPaths) break
      } else if (newPath.length < maxHops) {
        queue.push({ nodeId: neighborId, path: newPath })
      }
    }
  }

  return paths
}

// Center person detail modal - shows full connection breakdown
function CenterPersonModal({ data, onClose }: { data: PersonReachability; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [expandedHop, setExpandedHop] = useState<number | null>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const mapUrl = `/map.html?entity=${getMapSlug(data.person)}`

  // Group entities by type for each hop
  const groupByType = (entities: Entity[]) => {
    const people = entities.filter((e) => e.entity_type === 'person')
    const orgs = entities.filter((e) => e.entity_type === 'organization')
    return { people, orgs }
  }

  const hop1Groups = groupByType(data.hop1All)
  const hop2Groups = groupByType(data.hop2All)
  const hop3Groups = groupByType(data.hop3All)

  const totalPeople = hop1Groups.people.length + hop2Groups.people.length + hop3Groups.people.length
  const totalOrgs = hop1Groups.orgs.length + hop2Groups.orgs.length + hop3Groups.orgs.length

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[5vh]"
      style={{ background: 'rgba(0,0,0,0.2)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className="bg-white border border-[#ddd] rounded-lg shadow-xl overflow-y-auto w-[90vw] max-w-[560px]"
        style={{ maxHeight: '85vh' }}
      >
        <div className="sticky top-0 bg-white border-b border-[#eee] px-4 py-2.5 flex justify-between items-start z-10 rounded-t-lg">
          <div className="min-w-0 flex-1 pr-4">
            <div className="font-mono text-[13px] font-medium text-[#1a1a1a]">{data.person.name}</div>
            {data.person.title && <div className="font-mono text-[10px] text-[#888] mt-0.5">{data.person.title}</div>}
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[16px] text-[#999] hover:text-[#333] px-2 py-0.5 -mr-2 flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3">
          {/* Category badge */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className="font-mono text-[9px] tracking-[0.05em] uppercase px-2 py-1 rounded"
              style={{
                background: `${CATEGORY_COLORS[data.person.category] || '#888'}20`,
                color: CATEGORY_COLORS[data.person.category] || '#888',
              }}
            >
              {data.person.category}
            </span>
          </div>

          {/* Summary stats */}
          <div className="bg-[#f8f8f8] rounded p-3 mb-4">
            <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#888] mb-2">
              Network reach summary
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="font-mono text-[18px] font-medium text-[#1a1a1a]">{data.hop1All.length}</div>
                <div className="font-mono text-[9px] text-[#888]">1-hop</div>
              </div>
              <div>
                <div className="font-mono text-[18px] font-medium text-[#1a1a1a]">{data.hop2All.length}</div>
                <div className="font-mono text-[9px] text-[#888]">2-hop</div>
              </div>
              <div>
                <div className="font-mono text-[18px] font-medium text-[#1a1a1a]">{data.hop3All.length}</div>
                <div className="font-mono text-[9px] text-[#888]">3-hop</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#e0e0e0] flex justify-center gap-6">
              <div className="font-mono text-[10px] text-[#666]">
                <span className="font-medium">{totalPeople}</span> people
              </div>
              <div className="font-mono text-[10px] text-[#666]">
                <span className="font-medium">{totalOrgs}</span> organizations
              </div>
            </div>
          </div>

          {/* Expandable hop sections */}
          {[
            { level: 1, entities: data.hop1All, groups: hop1Groups },
            { level: 2, entities: data.hop2All, groups: hop2Groups },
            { level: 3, entities: data.hop3All, groups: hop3Groups },
          ].map(({ level, entities, groups }) => (
            <div key={level} className="mb-3">
              <button
                onClick={() => setExpandedHop(expandedHop === level ? null : level)}
                className="w-full flex items-center justify-between py-2 px-3 bg-[#f5f5f5] hover:bg-[#eee] rounded transition-colors"
              >
                <span className="font-mono text-[11px] font-medium text-[#1a1a1a]">
                  {level}-hop connections ({entities.length})
                </span>
                <span className="font-mono text-[10px] text-[#888]">
                  {groups.people.length} people · {groups.orgs.length} orgs
                  <span className="ml-2">{expandedHop === level ? '▼' : '▶'}</span>
                </span>
              </button>

              {expandedHop === level && (
                <div className="mt-2 pl-3 border-l-2 border-[#e0e0e0] max-h-[200px] overflow-y-auto">
                  {entities.length === 0 ? (
                    <div className="font-mono text-[10px] text-[#999] py-2">No connections at this level</div>
                  ) : (
                    <div className="space-y-1 py-1">
                      {entities.map((e) => (
                        <div key={e.id} className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: CATEGORY_COLORS[e.category] || '#888' }}
                          />
                          <span className="font-mono text-[10px] text-[#1a1a1a]">{e.name}</span>
                          <span className="font-mono text-[8px] text-[#888] capitalize">{e.entity_type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <a href={mapUrl} className="inline-block font-mono text-[11px] text-[#2563eb] hover:underline mt-2">
            View on map →
          </a>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Entity detail modal with connection paths (for hop nodes)
function EntityDetailModal({
  entity,
  centerPerson,
  hopLevel,
  paths,
  onClose,
}: {
  entity: Entity
  centerPerson: Entity
  hopLevel: number
  paths: PathStep[][]
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const mapUrl = `/map.html?entity=${getMapSlug(entity)}`

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
        className="bg-white border border-[#ddd] rounded-lg shadow-xl overflow-y-auto w-[90vw] max-w-[480px]"
        style={{ maxHeight: '70vh' }}
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
          {/* Category and type badges */}
          <div className="flex items-center gap-2 mb-4">
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
            <span className="font-mono text-[9px] text-[#2563eb]">{hopLevel}-hop connection</span>
          </div>

          {/* Connection paths */}
          {paths.length > 0 && (
            <div className="mb-4">
              <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#888] mb-2">
                Connection path{paths.length > 1 ? 's' : ''} from {centerPerson.name}
              </div>
              <div className="space-y-2">
                {paths.slice(0, 5).map((path, pathIdx) => (
                  <div key={pathIdx} className="bg-[#f8f8f8] rounded p-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          background: `${CATEGORY_COLORS[centerPerson.category] || '#888'}20`,
                          color: CATEGORY_COLORS[centerPerson.category] || '#888',
                        }}
                      >
                        {centerPerson.name}
                      </span>

                      {path.map((step, stepIdx) => (
                        <span key={stepIdx} className="flex items-center gap-1">
                          <span className="font-mono text-[9px] text-[#888]">
                            {step.relationshipType ? `—[${step.relationshipType}]→` : '→'}
                          </span>
                          <span
                            className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{
                              background: `${CATEGORY_COLORS[step.entity.category] || '#888'}20`,
                              color: CATEGORY_COLORS[step.entity.category] || '#888',
                            }}
                          >
                            {step.entity.name}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {paths.length > 5 && (
                  <div className="font-mono text-[9px] text-[#888]">+{paths.length - 5} more paths</div>
                )}
              </div>
            </div>
          )}

          <a href={mapUrl} className="inline-block font-mono text-[11px] text-[#2563eb] hover:underline">
            View on map →
          </a>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Compute reachability - always traverse through ALL nodes, filter at the end
function computeReachability(
  personId: number,
  adj: Map<number, Set<number>>,
): { hop1: number[]; hop2: number[]; hop3: number[] } {
  const visited = new Set([personId])
  const hop1: number[] = []
  const hop2: number[] = []
  const hop3: number[] = []

  // Hop 1 - get ALL neighbors
  let frontier = new Set([personId])
  for (const nodeId of frontier) {
    const neighbors = adj.get(nodeId) || new Set()
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId)
        hop1.push(neighborId)
      }
    }
  }

  // Hop 2 - expand from ALL hop1 nodes
  frontier = new Set(hop1)
  for (const nodeId of frontier) {
    const neighbors = adj.get(nodeId) || new Set()
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId)
        hop2.push(neighborId)
      }
    }
  }

  // Hop 3 - expand from ALL hop2 nodes
  frontier = new Set(hop2)
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

// Filter entities by type
function filterEntities(entities: Entity[], filter: EntityFilter): Entity[] {
  if (filter === 'all') return entities
  if (filter === 'people') return entities.filter((e) => e.entity_type === 'person')
  if (filter === 'orgs') return entities.filter((e) => e.entity_type === 'organization')
  return entities
}

function ConcentricRingViz({
  data,
  onEntityClick,
}: {
  data: PersonReachability
  onEntityClick: (entity: Entity, hopLevel: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const container = ref.current
    container.innerHTML = ''

    // Hide tooltip when mouse leaves the container entirely
    const handleMouseLeave = () => hideTooltip()
    container.addEventListener('mouseleave', handleMouseLeave)

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

    const scale = W / 320
    const r1 = 60 * scale
    const r2 = 110 * scale
    const r3 = 150 * scale

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

    const positionInRing = (index: number, total: number, radius: number) => {
      const angle = (2 * Math.PI * index) / total - Math.PI / 2
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      }
    }

    const nodeSize1 = 6 * scale
    const nodeSize2 = 4 * scale
    const nodeSize3 = 3 * scale
    const centerSize = 12 * scale

    // Draw 3-hop nodes - sample if too many
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
        onEntityClick(entity, 3)
      })
    })

    // Draw 2-hop nodes
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
        onEntityClick(entity, 2)
      })
    })

    // Draw 1-hop nodes
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
        onEntityClick(entity, 1)
      })
    })

    // Draw center node with initials
    const centerGroup = svg.append('g').style('cursor', 'pointer')

    centerGroup
      .append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', centerSize)
      .attr('fill', CATEGORY_COLORS[data.person.category] || '#1a1a1a')
      .attr('stroke', '#1a1a1a')
      .attr('stroke-width', 2)

    const initials = data.person.name
      .split(' ')
      .map((word) => word[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase()

    centerGroup
      .append('text')
      .attr('x', centerX)
      .attr('y', centerY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', centerSize * 0.8)
      .attr('font-weight', '500')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text(initials)

    centerGroup.on('mouseover', (evt: MouseEvent) => {
      centerGroup.select('circle').attr('r', centerSize * 1.2)
      showTooltip(evt, entityTooltipHtml(data.person))
    })
    centerGroup.on('mouseout', () => {
      centerGroup.select('circle').attr('r', centerSize)
      hideTooltip()
    })
    centerGroup.on('click', () => {
      hideTooltip()
      onEntityClick(data.person, 0)
    })

    // Cleanup: hide tooltip and remove listener when component unmounts or re-renders
    return () => {
      hideTooltip()
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [data, onEntityClick])

  return <div ref={ref} className="w-full aspect-square max-w-[500px] mx-auto" />
}

export function ReachabilityRings({ entities, edges, maxPeople = 6 }: ReachabilityRingsProps) {
  const [selectedEntity, setSelectedEntity] = useState<{
    entity: Entity
    centerPerson: Entity
    hopLevel: number
    data?: PersonReachability
  } | null>(null)
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all')

  // Build entity map and adjacency list once
  const { entityMap, adj, edgeMap } = useMemo(() => {
    const entityMap = new Map(entities.map((e) => [e.id, e]))
    const adj = new Map<number, Set<number>>()
    const edgeMap = new Map<string, Edge>()

    edges.forEach((e) => {
      if (!adj.has(e.source_id)) adj.set(e.source_id, new Set())
      if (!adj.has(e.target_id)) adj.set(e.target_id, new Set())
      adj.get(e.source_id)!.add(e.target_id)
      adj.get(e.target_id)!.add(e.source_id)
      edgeMap.set(`${e.source_id}-${e.target_id}`, e)
    })

    return { entityMap, adj, edgeMap }
  }, [entities, edges])

  const topPeople = useMemo(() => {
    const people = entities.filter((e) => e.entity_type === 'person')

    const results: PersonReachability[] = people
      .map((person) => {
        // Compute reachability through ALL paths (no filter during traversal)
        const reach = computeReachability(person.id, adj)
        const hop1All = reach.hop1.map((id) => entityMap.get(id)).filter((e): e is Entity => !!e)
        const hop2All = reach.hop2.map((id) => entityMap.get(id)).filter((e): e is Entity => !!e)
        const hop3All = reach.hop3.map((id) => entityMap.get(id)).filter((e): e is Entity => !!e)

        // Apply filter for display
        const hop1 = filterEntities(hop1All, entityFilter)
        const hop2 = filterEntities(hop2All, entityFilter)
        const hop3 = filterEntities(hop3All, entityFilter)

        return {
          person,
          hop1All,
          hop2All,
          hop3All,
          hop1,
          hop2,
          hop3,
          // Score based on filtered view
          score: hop1.length * 3 + hop2.length * 2 + hop3.length,
          totalReach: hop1.length + hop2.length + hop3.length,
        }
      })
      .filter((r) => r.hop1All.length > 0) // Filter based on having ANY connections
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPeople)

    return results
  }, [entities, adj, entityMap, entityFilter, maxPeople])

  // Compute paths for selected entity
  const selectedPaths = useMemo(() => {
    if (!selectedEntity || selectedEntity.hopLevel === 0) return []
    return findPaths(
      selectedEntity.centerPerson.id,
      selectedEntity.entity.id,
      adj,
      edgeMap,
      entityMap,
      selectedEntity.hopLevel,
      5,
    )
  }, [selectedEntity, adj, edgeMap, entityMap])

  const handleEntityClick = useCallback(
    (centerPerson: Entity, data: PersonReachability) => (entity: Entity, hopLevel: number) => {
      setSelectedEntity({ entity, centerPerson, hopLevel, data })
    },
    [],
  )

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
      {/* Filter buttons */}
      <div className="flex items-center gap-2 mb-4">
        <span className="font-mono text-[10px] text-[#888]">Show:</span>
        {(['all', 'people', 'orgs'] as EntityFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setEntityFilter(f)}
            className={`font-mono text-[10px] px-2 py-1 rounded transition-colors ${
              entityFilter === f ? 'bg-[#555] text-white' : 'bg-[#f5f5f5] text-[#888] hover:bg-[#eee]'
            }`}
          >
            {f === 'all' ? 'All' : f === 'people' ? 'People' : 'Orgs'}
          </button>
        ))}
      </div>

      {/* Legend */}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <ConcentricRingViz data={data} onEntityClick={handleEntityClick(data.person, data)} />
            </div>

            {/* Hop counts - show "X of Y" when sampling */}
            <div className="text-center font-mono text-[10px] text-[#888] mt-2">
              1-hop: {data.hop1.length}
              {data.hop1.length !== data.hop1All.length && ` of ${data.hop1All.length}`}
              {' · '}2-hop: {data.hop2.length}
              {data.hop2.length !== data.hop2All.length && ` of ${data.hop2All.length}`}
              {' · '}3-hop: {data.hop3.length > 40 ? `40 of ${data.hop3.length}` : data.hop3.length}
              {data.hop3.length !== data.hop3All.length && data.hop3.length <= 40 && ` of ${data.hop3All.length}`}
            </div>

            {/* Stats */}
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#eee]">
              <div className="font-mono text-[10px] text-[#888]">
                Total reach: <span className="text-[#1a1a1a] font-medium">{data.totalReach}</span>
              </div>
              <a
                href={`/map.html?entity=${getMapSlug(data.person)}`}
                className="font-mono text-[9px] text-[#2563eb] hover:underline"
              >
                View on map →
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {selectedEntity && selectedEntity.hopLevel === 0 && selectedEntity.data && (
        <CenterPersonModal data={selectedEntity.data} onClose={() => setSelectedEntity(null)} />
      )}
      {selectedEntity && selectedEntity.hopLevel > 0 && (
        <EntityDetailModal
          entity={selectedEntity.entity}
          centerPerson={selectedEntity.centerPerson}
          hopLevel={selectedEntity.hopLevel}
          paths={selectedPaths}
          onClose={() => setSelectedEntity(null)}
        />
      )}
    </div>
  )
}
