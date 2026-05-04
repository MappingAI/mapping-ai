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

// Normalize categories to simplified display groups
const CATEGORY_NORMALIZE: Record<string, string> = {
  // People
  Researcher: 'Researcher',
  Policymaker: 'Policymaker',
  Executive: 'Executive',
  Investor: 'Investor',
  Organizer: 'Organizer',
  Journalist: 'Media/Cultural',
  'Cultural figure': 'Media/Cultural',
  // Orgs
  'Government/Agency': 'Government',
  'Political Campaign/PAC': 'Government',
  'Think Tank/Policy Org': 'Policy/Advocacy',
  'Ethics/Bias/Rights': 'Policy/Advocacy',
  'Labor/Civil Society': 'Policy/Advocacy',
  'Frontier Lab': 'AI Labs',
  'Deployers & Platforms': 'AI Labs',
  'AI Safety/Alignment': 'AI Safety',
  'VC/Capital/Philanthropy': 'Funders',
  'Infrastructure & Compute': 'Infrastructure',
  'Media/Journalism': 'Media',
}

function normalizeCategory(cat: string, entityType?: string): string {
  // Academic merges into Researcher for people, stays Academic for orgs
  if (cat === 'Academic') {
    return entityType === 'person' ? 'Researcher' : 'Academic'
  }
  return CATEGORY_NORMALIZE[cat] || cat
}

// Colors for normalized categories
const CATEGORY_COLORS: Record<string, string> = {
  // People
  Policymaker: '#984ea3',
  Executive: '#e41a1c',
  Researcher: '#ff7f00',
  Investor: '#a65628',
  Organizer: '#bcbd22',
  'Media/Cultural': '#17becf',
  // Orgs
  Government: '#984ea3',
  'Policy/Advocacy': '#4daf4a',
  'AI Labs': '#e41a1c',
  'AI Safety': '#377eb8',
  Funders: '#a65628',
  Infrastructure: '#666',
  Media: '#17becf',
  Academic: '#ff7f00', // same orange as Researcher
}

type EntityFilter = 'all' | 'people' | 'orgs'

interface PersonReachability {
  person: Entity
  hop1All: Entity[]
  hop2All: Entity[]
  hop3All: Entity[]
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

interface OverflowSelection {
  hopLevel: number
  entities: Entity[]
  centerPerson: Entity
}

function getMapSlug(entity: Entity): string {
  const typePrefix: Record<string, string> = { person: 'person', organization: 'org', resource: 'resource' }
  return `${typePrefix[entity.entity_type] || entity.entity_type}/${entity.id}`
}

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
  const typeIcon = e.entity_type === 'person' ? '●' : '■'
  const hopLabel = hopLevel
    ? `<div style="color:#888; font-size:9px; margin-top:2px;">${hopLevel}-hop connection</div>`
    : ''
  return `
    <div style="font-weight:500; margin-bottom:2px;">${typeIcon} ${escapeHtml(e.name)}</div>
    <div style="color:#666; font-size:10px;">${escapeHtml(e.title || '')}</div>
    <div style="color:${CATEGORY_COLORS[normalizeCategory(e.category, e.entity_type)] || '#888'}; font-size:10px; margin-top:2px;">${escapeHtml(e.category || '')}</div>
    <div style="color:#888; font-size:9px; text-transform:capitalize;">${e.entity_type}</div>
    ${hopLabel}
  `
}

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

// Overflow list modal - shows all entities that didn't fit in the ring
function OverflowListModal({
  data,
  onClose,
  onEntityClick,
}: {
  data: OverflowSelection
  onClose: () => void
  onEntityClick: (entity: Entity) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const people = data.entities.filter((e) => e.entity_type === 'person')
  const orgs = data.entities.filter((e) => e.entity_type === 'organization')

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
        style={{ maxHeight: '70vh' }}
      >
        <div className="sticky top-0 bg-white border-b border-[#eee] px-4 py-2.5 flex justify-between items-start z-10 rounded-t-lg">
          <div>
            <div className="font-mono text-[13px] font-medium text-[#1a1a1a]">{data.hopLevel}-hop connections</div>
            <div className="font-mono text-[10px] text-[#888]">
              from {data.centerPerson.name} · {data.entities.length} total
            </div>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[16px] text-[#999] hover:text-[#333] px-2 py-0.5 -mr-2 flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="font-mono text-[9px] text-[#888] mb-2">
            {people.length} people · {orgs.length} organizations
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {data.entities.map((e) => (
              <button
                key={e.id}
                onClick={() => onEntityClick(e)}
                className="w-full flex items-center gap-2 p-2 hover:bg-[#f5f5f5] rounded text-left transition-colors"
              >
                {/* Shape indicator */}
                {e.entity_type === 'person' ? (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: CATEGORY_COLORS[normalizeCategory(e.category, e.entity_type)] || '#888' }}
                  />
                ) : (
                  <div
                    className="w-3 h-3  flex-shrink-0"
                    style={{ background: CATEGORY_COLORS[normalizeCategory(e.category, e.entity_type)] || '#888' }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[11px] text-[#1a1a1a] truncate">{e.name}</div>
                  <div className="font-mono text-[9px] text-[#888] capitalize">{e.entity_type}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Center person detail modal
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
          <div className="flex items-center gap-2 mb-4">
            <span
              className="font-mono text-[9px] tracking-[0.05em] uppercase px-2 py-1 rounded"
              style={{
                background: `${CATEGORY_COLORS[normalizeCategory(data.person.category, 'person')] || '#888'}20`,
                color: CATEGORY_COLORS[normalizeCategory(data.person.category, 'person')] || '#888',
              }}
            >
              {data.person.category}
            </span>
          </div>

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
              <div className="font-mono text-[10px] text-[#666] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#888]" />
                <span className="font-medium">{totalPeople}</span> people
              </div>
              <div className="font-mono text-[10px] text-[#666] flex items-center gap-1">
                <span className="w-2 h-2  bg-[#888]" />
                <span className="font-medium">{totalOrgs}</span> organizations
              </div>
            </div>
          </div>

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
                  {groups.people.length} ● · {groups.orgs.length} ■
                  <span className="ml-2">{expandedHop === level ? '▼' : '▶'}</span>
                </span>
              </button>

              {expandedHop === level && (
                <div className="mt-2 pl-3 border-l-2 border-[#e0e0e0] max-h-[200px] overflow-y-auto">
                  {entities.length === 0 ? (
                    <div className="font-mono text-[10px] text-[#999] py-2">No connections</div>
                  ) : (
                    <div className="space-y-1 py-1">
                      {entities.map((e) => (
                        <div key={e.id} className="flex items-center gap-2">
                          {e.entity_type === 'person' ? (
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{
                                background: CATEGORY_COLORS[normalizeCategory(e.category, e.entity_type)] || '#888',
                              }}
                            />
                          ) : (
                            <div
                              className="w-2 h-2  flex-shrink-0"
                              style={{
                                background: CATEGORY_COLORS[normalizeCategory(e.category, e.entity_type)] || '#888',
                              }}
                            />
                          )}
                          <span className="font-mono text-[10px] text-[#1a1a1a]">{e.name}</span>
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

// Entity detail modal with connection paths
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
            <div className="font-mono text-[13px] font-medium text-[#1a1a1a]">
              {entity.entity_type === 'person' ? '●' : '■'} {entity.name}
            </div>
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
          <div className="flex items-center gap-2 mb-4">
            <span
              className="font-mono text-[9px] tracking-[0.05em] uppercase px-2 py-1 rounded"
              style={{
                background: `${CATEGORY_COLORS[normalizeCategory(entity.category, entity.entity_type)] || '#888'}20`,
                color: CATEGORY_COLORS[normalizeCategory(entity.category, entity.entity_type)] || '#888',
              }}
            >
              {entity.category}
            </span>
            <span className="font-mono text-[9px] text-[#888] capitalize">{entity.entity_type}</span>
            <span className="font-mono text-[9px] text-[#2563eb]">{hopLevel}-hop</span>
          </div>

          {paths.length > 0 && (
            <div className="mb-4">
              <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#888] mb-2">
                Path{paths.length > 1 ? 's' : ''} from {centerPerson.name}
              </div>
              <div className="space-y-2">
                {paths.slice(0, 5).map((path, pathIdx) => (
                  <div key={pathIdx} className="bg-[#f8f8f8] rounded p-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          background: `${CATEGORY_COLORS[normalizeCategory(centerPerson.category, centerPerson.entity_type)] || '#888'}20`,
                          color:
                            CATEGORY_COLORS[normalizeCategory(centerPerson.category, centerPerson.entity_type)] ||
                            '#888',
                        }}
                      >
                        ● {centerPerson.name}
                      </span>

                      {path.map((step, stepIdx) => (
                        <span key={stepIdx} className="flex items-center gap-1">
                          <span className="font-mono text-[9px] text-[#888]">
                            {step.relationshipType ? `—[${step.relationshipType}]→` : '→'}
                          </span>
                          <span
                            className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{
                              background: `${CATEGORY_COLORS[normalizeCategory(step.entity.category, step.entity.entity_type)] || '#888'}20`,
                              color:
                                CATEGORY_COLORS[normalizeCategory(step.entity.category, step.entity.entity_type)] ||
                                '#888',
                            }}
                          >
                            {step.entity.entity_type === 'person' ? '●' : '■'} {step.entity.name}
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

function computeReachability(
  personId: number,
  adj: Map<number, Set<number>>,
): { hop1: number[]; hop2: number[]; hop3: number[] } {
  const visited = new Set([personId])
  const hop1: number[] = []
  const hop2: number[] = []
  const hop3: number[] = []

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

function filterEntities(entities: Entity[], filter: EntityFilter): Entity[] {
  if (filter === 'all') return entities
  if (filter === 'people') return entities.filter((e) => e.entity_type === 'person')
  if (filter === 'orgs') return entities.filter((e) => e.entity_type === 'organization')
  return entities
}

// Max nodes to show per ring
const MAX_HOP1 = 20
const MAX_HOP2 = 30
const MAX_HOP3 = 40

function ConcentricRingViz({
  data,
  onEntityClick,
  onOverflowClick,
}: {
  data: PersonReachability
  onEntityClick: (entity: Entity, hopLevel: number) => void
  onOverflowClick: (hopLevel: number, entities: Entity[]) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const container = ref.current
    container.innerHTML = ''

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

    // Draw ring guides
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

    // Helper to draw entity node (circle for person, rect for org)
    const drawEntityNode = (entity: Entity, x: number, y: number, size: number, opacity: number, hopLevel: number) => {
      const color = CATEGORY_COLORS[normalizeCategory(entity.category, entity.entity_type)] || '#888'
      const isPerson = entity.entity_type === 'person'

      let node
      if (isPerson) {
        node = svg
          .append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', size)
          .attr('fill', color)
          .attr('opacity', opacity)
          .attr('stroke', '#fff')
          .attr('stroke-width', size > 4 ? 1 : 0)
          .style('cursor', 'pointer')
      } else {
        // Rectangle for org
        const rectSize = size * 1.6
        node = svg
          .append('rect')
          .attr('x', x - rectSize / 2)
          .attr('y', y - rectSize / 2)
          .attr('width', rectSize)
          .attr('height', rectSize)
          .attr('rx', 2)
          .attr('fill', color)
          .attr('opacity', opacity)
          .attr('stroke', '#fff')
          .attr('stroke-width', size > 4 ? 1 : 0)
          .style('cursor', 'pointer')
      }

      node.on('mouseover', (evt: MouseEvent) => {
        node.attr('opacity', 1)
        if (isPerson) {
          node.attr('r', size * 1.3)
        } else {
          const newSize = size * 1.6 * 1.3
          node
            .attr('width', newSize)
            .attr('height', newSize)
            .attr('x', x - newSize / 2)
            .attr('y', y - newSize / 2)
        }
        showTooltip(evt, entityTooltipHtml(entity, hopLevel))
      })
      node.on('mouseout', () => {
        node.attr('opacity', opacity)
        if (isPerson) {
          node.attr('r', size)
        } else {
          const rectSize = size * 1.6
          node
            .attr('width', rectSize)
            .attr('height', rectSize)
            .attr('x', x - rectSize / 2)
            .attr('y', y - rectSize / 2)
        }
        hideTooltip()
      })
      node.on('click', () => {
        hideTooltip()
        onEntityClick(entity, hopLevel)
      })
    }

    // Draw "+N" overflow indicator
    const drawOverflowIndicator = (
      count: number,
      total: number,
      radius: number,
      hopLevel: number,
      allEntities: Entity[],
    ) => {
      const overflow = total - count
      if (overflow <= 0) return

      // Position at the end of the ring
      const pos = positionInRing(count, count + 1, radius)

      const g = svg.append('g').style('cursor', 'pointer')

      g.append('circle')
        .attr('cx', pos.x)
        .attr('cy', pos.y)
        .attr('r', 12 * scale)
        .attr('fill', '#f0f0f0')
        .attr('stroke', '#ccc')
        .attr('stroke-width', 1)

      g.append('text')
        .attr('x', pos.x)
        .attr('y', pos.y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 8 * scale)
        .attr('font-weight', '500')
        .attr('fill', '#666')
        .text(`+${overflow}`)

      g.on('mouseover', (evt: MouseEvent) => {
        g.select('circle').attr('fill', '#e0e0e0')
        showTooltip(
          evt,
          `<div style="font-weight:500;">+${overflow} more</div><div style="color:#888; font-size:10px;">Click to see all ${hopLevel}-hop connections</div>`,
        )
      })
      g.on('mouseout', () => {
        g.select('circle').attr('fill', '#f0f0f0')
        hideTooltip()
      })
      g.on('click', () => {
        hideTooltip()
        onOverflowClick(hopLevel, allEntities)
      })
    }

    const nodeSize1 = 6 * scale
    const nodeSize2 = 4 * scale
    const nodeSize3 = 3 * scale
    const centerSize = 12 * scale

    // Draw 3-hop nodes
    const hop3Sample = data.hop3.slice(0, MAX_HOP3)
    const hop3Total = hop3Sample.length + (data.hop3.length > MAX_HOP3 ? 1 : 0)
    hop3Sample.forEach((entity, i) => {
      const pos = positionInRing(i, hop3Total, r3)
      drawEntityNode(entity, pos.x, pos.y, nodeSize3, 0.4, 3)
    })
    drawOverflowIndicator(MAX_HOP3, data.hop3.length, r3, 3, data.hop3)

    // Draw 2-hop nodes
    const hop2Sample = data.hop2.slice(0, MAX_HOP2)
    const hop2Total = hop2Sample.length + (data.hop2.length > MAX_HOP2 ? 1 : 0)
    hop2Sample.forEach((entity, i) => {
      const pos = positionInRing(i, hop2Total, r2)
      drawEntityNode(entity, pos.x, pos.y, nodeSize2, 0.6, 2)
    })
    drawOverflowIndicator(MAX_HOP2, data.hop2.length, r2, 2, data.hop2)

    // Draw 1-hop nodes
    const hop1Sample = data.hop1.slice(0, MAX_HOP1)
    const hop1Total = hop1Sample.length + (data.hop1.length > MAX_HOP1 ? 1 : 0)
    hop1Sample.forEach((entity, i) => {
      const pos = positionInRing(i, hop1Total, r1)
      drawEntityNode(entity, pos.x, pos.y, nodeSize1, 0.9, 1)
    })
    drawOverflowIndicator(MAX_HOP1, data.hop1.length, r1, 1, data.hop1)

    // Draw center node with initials
    const centerGroup = svg.append('g').style('cursor', 'pointer')

    centerGroup
      .append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', centerSize)
      .attr('fill', CATEGORY_COLORS[normalizeCategory(data.person.category, 'person')] || '#1a1a1a')
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

    return () => {
      hideTooltip()
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [data, onEntityClick, onOverflowClick])

  return <div ref={ref} className="w-full aspect-square max-w-[500px] mx-auto" />
}

export function ReachabilityRings({ entities, edges, maxPeople = 6 }: ReachabilityRingsProps) {
  const [selectedEntity, setSelectedEntity] = useState<{
    entity: Entity
    centerPerson: Entity
    hopLevel: number
    data?: PersonReachability
  } | null>(null)
  const [overflowSelection, setOverflowSelection] = useState<OverflowSelection | null>(null)
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all')
  const chartContainerRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    if (!chartContainerRef.current) return

    const container = chartContainerRef.current

    const scale = 2
    const padding = 40
    const titleHeight = 50
    const legendHeight = 70
    const sourceHeight = 50
    const cardWidth = 360
    const cardHeight = 400
    const gap = 24
    const maxCols = 2

    // Get cards to calculate dimensions
    const cards = Array.from(container.querySelectorAll('.bg-white'))
    const totalRows = Math.ceil(cards.length / maxCols)
    const contentWidth = maxCols * cardWidth + (maxCols - 1) * gap
    const contentHeight = totalRows * cardHeight + (totalRows - 1) * gap

    const canvasWidth = contentWidth + padding * 2
    const canvasHeight = titleHeight + legendHeight + contentHeight + sourceHeight + padding * 2

    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth * scale
    canvas.height = canvasHeight * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Tan/grey background matching insights page
    ctx.fillStyle = '#f8f7f5'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.scale(scale, scale)

    // Add title
    ctx.fillStyle = '#1a1a1a'
    ctx.font = "600 16px 'DM Mono', ui-monospace, monospace"
    ctx.fillText('NETWORK REACHABILITY BY PERSON', padding, padding + 16)

    // Add subtitle/caption
    ctx.fillStyle = '#888'
    ctx.font = "11px 'DM Mono', ui-monospace, monospace"
    ctx.fillText(
      'Concentric rings show 1-hop, 2-hop, and 3-hop connections. Nodes colored by category.',
      padding,
      padding + 36,
    )

    // Draw full color legend
    const legendY = padding + titleHeight
    ctx.fillStyle = '#fafafa'
    ctx.beginPath()
    ctx.roundRect(padding, legendY, contentWidth, legendHeight - 10, 6)
    ctx.fill()

    // People legend row
    let legendX = padding + 12
    const legendRowY1 = legendY + 18

    // PEOPLE label
    ctx.fillStyle = '#666'
    ctx.beginPath()
    ctx.arc(legendX + 4, legendRowY1, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#888'
    ctx.font = "8px 'DM Mono', ui-monospace, monospace"
    ctx.fillText('PEOPLE', legendX + 14, legendRowY1 + 3)
    legendX += 70

    // Person categories
    const personCats = [
      { name: 'Policymaker', color: '#984ea3' },
      { name: 'Executive', color: '#e41a1c' },
      { name: 'Researcher', color: '#ff7f00' },
      { name: 'Investor', color: '#a65628' },
      { name: 'Organizer', color: '#bcbd22' },
      { name: 'Media/Cultural', color: '#17becf' },
    ]
    personCats.forEach((cat) => {
      ctx.fillStyle = cat.color
      ctx.beginPath()
      ctx.arc(legendX + 4, legendRowY1, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#666'
      ctx.font = "9px 'DM Mono', ui-monospace, monospace"
      ctx.fillText(cat.name, legendX + 12, legendRowY1 + 3)
      legendX += ctx.measureText(cat.name).width + 24
    })

    // Orgs legend row
    legendX = padding + 12
    const legendRowY2 = legendY + 42

    // ORGS label
    ctx.fillStyle = '#666'
    ctx.fillRect(legendX, legendRowY2 - 4, 8, 8)
    ctx.fillStyle = '#888'
    ctx.font = "8px 'DM Mono', ui-monospace, monospace"
    ctx.fillText('ORGS', legendX + 14, legendRowY2 + 3)
    legendX += 55

    // Org categories
    const orgCats = [
      { name: 'Government', color: '#984ea3' },
      { name: 'Policy/Advocacy', color: '#4daf4a' },
      { name: 'AI Labs', color: '#e41a1c' },
      { name: 'Media', color: '#17becf' },
      { name: 'Funders', color: '#a65628' },
      { name: 'Infrastructure', color: '#666' },
      { name: 'Academic', color: '#ff7f00' },
      { name: 'AI Safety', color: '#377eb8' },
    ]
    orgCats.forEach((cat) => {
      ctx.fillStyle = cat.color
      ctx.fillRect(legendX, legendRowY2 - 4, 8, 8)
      ctx.fillStyle = '#666'
      ctx.font = "9px 'DM Mono', ui-monospace, monospace"
      ctx.fillText(cat.name, legendX + 12, legendRowY2 + 3)
      legendX += ctx.measureText(cat.name).width + 24
    })

    const contentY = padding + titleHeight + legendHeight

    // Draw cards
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as Element
      if (!card) continue
      const col = i % maxCols
      const row = Math.floor(i / maxCols)

      const xOffset = padding + col * (cardWidth + gap)
      const yOffset = contentY + row * (cardHeight + gap)

      // Draw card background
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#e0e0e0'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(xOffset, yOffset, cardWidth, cardHeight, 8)
      ctx.fill()
      ctx.stroke()

      // Get card data
      const nameEl = card.querySelector('.text-\\[12px\\].font-medium')
      const categoryEl = card.querySelector('.text-\\[8px\\].uppercase')
      const statsEl = card.querySelector('.text-center.text-\\[10px\\]')
      const totalEl = card.querySelector('.text-\\[10px\\] .font-medium')
      const svg = card.querySelector('svg')

      // Draw name
      if (nameEl) {
        ctx.fillStyle = '#1a1a1a'
        ctx.font = "500 13px 'DM Mono', ui-monospace, monospace"
        ctx.fillText(nameEl.textContent || '', xOffset + 16, yOffset + 26)
      }

      // Draw category badge
      if (categoryEl) {
        const catText = categoryEl.textContent || ''
        const catColor = (categoryEl as HTMLElement).style.color || '#888'
        const catBg = (categoryEl as HTMLElement).style.background || `${catColor}20`
        ctx.fillStyle = catBg
        const textWidth = ctx.measureText(catText.toUpperCase()).width
        ctx.beginPath()
        ctx.roundRect(xOffset + 16, yOffset + 36, textWidth + 12, 18, 4)
        ctx.fill()
        ctx.fillStyle = catColor
        ctx.font = "8px 'DM Mono', ui-monospace, monospace"
        ctx.fillText(catText.toUpperCase(), xOffset + 22, yOffset + 48)
      }

      // Draw SVG (concentric rings)
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg)
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svgBlob)

        await new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => {
            const svgSize = 280
            const svgX = xOffset + (cardWidth - svgSize) / 2
            ctx.drawImage(img, svgX, yOffset + 60, svgSize, svgSize)
            URL.revokeObjectURL(url)
            resolve()
          }
          img.onerror = () => {
            URL.revokeObjectURL(url)
            resolve()
          }
          img.src = url
        })
      }

      // Draw hop stats
      if (statsEl) {
        ctx.fillStyle = '#888'
        ctx.font = "10px 'DM Mono', ui-monospace, monospace"
        ctx.textAlign = 'center'
        ctx.fillText(statsEl.textContent || '', xOffset + cardWidth / 2, yOffset + 355)
        ctx.textAlign = 'left'
      }

      // Draw total
      if (totalEl) {
        ctx.fillStyle = '#888'
        ctx.font = "10px 'DM Mono', ui-monospace, monospace"
        ctx.fillText(`Total: ${totalEl.textContent}`, xOffset + 16, yOffset + 380)
      }
    }

    // Add source text at bottom
    const finalY = contentY + contentHeight + 25
    ctx.fillStyle = '#888'
    ctx.font = "10px 'DM Mono', ui-monospace, monospace"
    ctx.fillText(
      `Source: Network analysis of ${entities.length} entities. Score = (1-hop × 3) + (2-hop × 2) + (3-hop × 1).`,
      padding,
      finalY,
    )

    // Download
    const link = document.createElement('a')
    link.download = `network-reachability-${new Date().toISOString().slice(0, 10)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

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
        const reach = computeReachability(person.id, adj)
        const hop1All = reach.hop1.map((id) => entityMap.get(id)).filter((e): e is Entity => !!e)
        const hop2All = reach.hop2.map((id) => entityMap.get(id)).filter((e): e is Entity => !!e)
        const hop3All = reach.hop3.map((id) => entityMap.get(id)).filter((e): e is Entity => !!e)

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
          score: hop1.length * 3 + hop2.length * 2 + hop3.length,
          totalReach: hop1.length + hop2.length + hop3.length,
        }
      })
      .filter((r) => r.hop1All.length > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPeople)

    return results
  }, [entities, adj, entityMap, entityFilter, maxPeople])

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

  const handleOverflowClick = useCallback(
    (centerPerson: Entity) => (hopLevel: number, entities: Entity[]) => {
      setOverflowSelection({ hopLevel, entities, centerPerson })
    },
    [],
  )

  const handleOverflowEntityClick = useCallback(
    (entity: Entity) => {
      if (!overflowSelection) return
      setOverflowSelection(null)
      // Find the data for this center person
      const data = topPeople.find((p) => p.person.id === overflowSelection.centerPerson.id)
      if (data) {
        setSelectedEntity({
          entity,
          centerPerson: overflowSelection.centerPerson,
          hopLevel: overflowSelection.hopLevel,
          data,
        })
      }
    },
    [overflowSelection, topPeople],
  )

  // Collect normalized categories that appear in the data
  const personCategories = new Set<string>()
  const orgCategories = new Set<string>()
  topPeople.forEach((p) => {
    ;[p.person, ...p.hop1, ...p.hop2, ...p.hop3].forEach((e) => {
      if (e.category) {
        const normalized = normalizeCategory(e.category, e.entity_type)
        if (e.entity_type === 'person') personCategories.add(normalized)
        else orgCategories.add(normalized)
      }
    })
  })

  if (topPeople.length === 0) {
    return <div className="font-mono text-[11px] text-[#999]">No network data available.</div>
  }

  return (
    <div>
      {/* Filter row with download button */}
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[9px] text-[#888]">Show:</span>
        {(['all', 'people', 'orgs'] as EntityFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setEntityFilter(f)}
            className={`font-mono text-[9px] px-2 py-0.5 rounded transition-colors ${
              entityFilter === f ? 'bg-[#555] text-white' : 'bg-[#f0f0f0] text-[#666] hover:bg-[#e5e5e5]'
            }`}
          >
            {f === 'all' ? 'All' : f === 'people' ? 'People' : 'Orgs'}
          </button>
        ))}

        <button
          onClick={handleDownload}
          className="font-mono text-[10px] px-2 py-1 rounded bg-[#f5f5f5] text-[#666] hover:bg-[#eee] ml-auto flex items-center gap-1"
          title="Download chart as PNG"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          PNG
        </button>
      </div>

      <div ref={chartContainerRef}>
        {/* Color legend - organized by entity type */}
        <div className="bg-[#fafafa] rounded p-3 mb-4 space-y-2">
          {/* Person categories */}
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1 min-w-[70px]">
              <div className="w-2 h-2 rounded-full bg-[#666]" />
              <span className="font-mono text-[8px] text-[#888] uppercase tracking-wide">People</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {[...personCategories].map((cat) => (
                <div key={cat} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] || '#888' }} />
                  <span className="font-mono text-[8px] text-[#666]">{cat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Org categories */}
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1 min-w-[70px]">
              <div className="w-2 h-2 bg-[#666]" />
              <span className="font-mono text-[8px] text-[#888] uppercase tracking-wide">Orgs</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {[...orgCategories].map((cat) => (
                <div key={cat} className="flex items-center gap-1">
                  <div className="w-2 h-2" style={{ background: CATEGORY_COLORS[cat] || '#888' }} />
                  <span className="font-mono text-[8px] text-[#666]">{cat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {topPeople.map((data) => (
            <div key={data.person.id} className="bg-white border border-[#e0e0e0] rounded-lg p-4">
              <div className="mb-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[12px] font-medium text-[#1a1a1a]">{data.person.name}</span>
                </div>
                <span
                  className="font-mono text-[8px] tracking-[0.05em] uppercase px-1.5 py-0.5 rounded inline-block mt-1"
                  style={{
                    background: `${CATEGORY_COLORS[normalizeCategory(data.person.category, 'person')] || '#888'}20`,
                    color: CATEGORY_COLORS[normalizeCategory(data.person.category, 'person')] || '#888',
                  }}
                >
                  {data.person.category}
                </span>
              </div>

              <div className="flex justify-center">
                <ConcentricRingViz
                  data={data}
                  onEntityClick={handleEntityClick(data.person, data)}
                  onOverflowClick={handleOverflowClick(data.person)}
                />
              </div>

              <div className="text-center font-mono text-[10px] text-[#888] mt-2">
                1-hop: {data.hop1.length} · 2-hop: {data.hop2.length} · 3-hop: {data.hop3.length}
              </div>

              <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#eee]">
                <div className="font-mono text-[10px] text-[#888]">
                  Total: <span className="text-[#1a1a1a] font-medium">{data.totalReach}</span>
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
      {overflowSelection && (
        <OverflowListModal
          data={overflowSelection}
          onClose={() => setOverflowSelection(null)}
          onEntityClick={handleOverflowEntityClick}
        />
      )}
    </div>
  )
}
