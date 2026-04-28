import { useMemo, useRef, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

interface Entity {
  id: number
  name: string
  entity_type: string
  category: string
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

function ConcentricRingViz({ data }: { data: PersonReachability }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const container = ref.current
    container.innerHTML = ''

    const W = 320
    const H = 320
    const centerX = W / 2
    const centerY = H / 2

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    // Ring radii
    const r1 = 60 // 1-hop ring
    const r2 = 110 // 2-hop ring
    const r3 = 150 // 3-hop ring

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

    // Draw 3-hop nodes (smallest, most faded) - sample if too many
    const hop3Sample = data.hop3.length > 40 ? data.hop3.slice(0, 40) : data.hop3
    hop3Sample.forEach((entity, i) => {
      const pos = positionInRing(i, hop3Sample.length, r3)
      svg
        .append('circle')
        .attr('cx', pos.x)
        .attr('cy', pos.y)
        .attr('r', 3)
        .attr('fill', CATEGORY_COLORS[entity.category] || '#ccc')
        .attr('opacity', 0.4)
    })

    // Draw 2-hop nodes (medium) - sample if too many
    const hop2Sample = data.hop2.length > 30 ? data.hop2.slice(0, 30) : data.hop2
    hop2Sample.forEach((entity, i) => {
      const pos = positionInRing(i, hop2Sample.length, r2)
      svg
        .append('circle')
        .attr('cx', pos.x)
        .attr('cy', pos.y)
        .attr('r', 4)
        .attr('fill', CATEGORY_COLORS[entity.category] || '#999')
        .attr('opacity', 0.6)
    })

    // Draw 1-hop nodes (largest, fully visible)
    data.hop1.forEach((entity, i) => {
      const pos = positionInRing(i, data.hop1.length, r1)
      svg
        .append('circle')
        .attr('cx', pos.x)
        .attr('cy', pos.y)
        .attr('r', 6)
        .attr('fill', CATEGORY_COLORS[entity.category] || '#666')
        .attr('opacity', 0.9)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
    })

    // Draw center node (the person)
    svg
      .append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', 12)
      .attr('fill', CATEGORY_COLORS[data.person.category] || '#1a1a1a')
      .attr('stroke', '#1a1a1a')
      .attr('stroke-width', 2)

    // Add count labels for each ring
    const labelY = H - 15
    svg
      .append('text')
      .attr('x', centerX)
      .attr('y', labelY)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text(`1-hop: ${data.hop1.length} · 2-hop: ${data.hop2.length} · 3-hop: ${data.hop3.length}`)
  }, [data])

  return <div ref={ref} className="w-[320px] h-[320px]" />
}

export function ReachabilityRings({ entities, edges, maxPeople = 6 }: ReachabilityRingsProps) {
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
    ;[...p.hop1, ...p.hop2, ...p.hop3].forEach((e) => {
      if (e.category) allCategories.add(e.category)
    })
  })

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[...allCategories].slice(0, 8).map((cat) => (
          <div key={cat} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[cat] || '#888' }} />
            <span className="font-mono text-[9px] text-[#666]">{cat.length > 18 ? cat.slice(0, 16) + '...' : cat}</span>
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
              <ConcentricRingViz data={data} />
            </div>

            {/* Stats */}
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#eee]">
              <div className="font-mono text-[10px] text-[#888]">
                Total reach: <span className="text-[#1a1a1a] font-medium">{data.totalReach}</span>
              </div>
              <a
                href={`/map?highlight=${data.person.id}`}
                className="font-mono text-[9px] text-[#2563eb] hover:underline"
              >
                View on map →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
