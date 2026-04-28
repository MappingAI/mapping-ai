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
  relationship_type: string
}

interface BridgeBuilderCardsProps {
  entities: Entity[]
  edges: Edge[]
  maxCards?: number
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
  Journalist: '#17becf',
  Organizer: '#bcbd22',
  'Media/Journalism': '#17becf',
  'Deployers & Platforms': '#e41a1c',
}

interface CentralEntity extends Entity {
  degree: number
  connections: Entity[]
  categoriesBridged: string[]
  betweenness: number
}

function MiniEgoNetwork({ entity, connections }: { entity: CentralEntity; connections: Entity[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || connections.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const W = 180
    const H = 140
    const centerX = W / 2
    const centerY = H / 2

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    // Limit to top 8 connections for readability
    const topConnections = connections.slice(0, 8)

    // Position connections in a circle around center
    const angleStep = (2 * Math.PI) / topConnections.length
    const radius = 50

    const nodes = [
      { id: entity.id, x: centerX, y: centerY, isCenter: true, entity },
      ...topConnections.map((c, i) => ({
        id: c.id,
        x: centerX + Math.cos(angleStep * i - Math.PI / 2) * radius,
        y: centerY + Math.sin(angleStep * i - Math.PI / 2) * radius,
        isCenter: false,
        entity: c,
      })),
    ]

    // Draw edges
    nodes.slice(1).forEach((node) => {
      svg
        .append('line')
        .attr('x1', centerX)
        .attr('y1', centerY)
        .attr('x2', node.x)
        .attr('y2', node.y)
        .attr('stroke', '#ddd')
        .attr('stroke-width', 1)
    })

    // Draw nodes
    nodes.forEach((node) => {
      svg
        .append('circle')
        .attr('cx', node.x)
        .attr('cy', node.y)
        .attr('r', node.isCenter ? 10 : 6)
        .attr('fill', CATEGORY_COLORS[node.entity.category] || '#888')
        .attr('stroke', node.isCenter ? '#1a1a1a' : '#fff')
        .attr('stroke-width', node.isCenter ? 2 : 1)
        .attr('opacity', node.isCenter ? 1 : 0.8)
    })

    // Add overflow indicator if more connections exist
    if (connections.length > 8) {
      svg
        .append('text')
        .attr('x', W - 5)
        .attr('y', H - 5)
        .attr('text-anchor', 'end')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 8)
        .attr('fill', '#999')
        .text(`+${connections.length - 8} more`)
    }
  }, [entity, connections])

  return <div ref={ref} className="w-[180px] h-[140px]" />
}

export function BridgeBuilderCards({ entities, edges, maxCards = 5 }: BridgeBuilderCardsProps) {
  const centralEntities = useMemo(() => {
    const entityMap = new Map(entities.map((e) => [e.id, e]))

    // Compute degree for each entity
    const degrees = new Map<number, Set<number>>()
    edges.forEach((e) => {
      if (!degrees.has(e.source_id)) degrees.set(e.source_id, new Set())
      if (!degrees.has(e.target_id)) degrees.set(e.target_id, new Set())
      degrees.get(e.source_id)!.add(e.target_id)
      degrees.get(e.target_id)!.add(e.source_id)
    })

    // Compute categories bridged for each entity
    const categoriesBridged = new Map<number, Set<string>>()
    degrees.forEach((connectedIds, entityId) => {
      const cats = new Set<string>()
      connectedIds.forEach((connId) => {
        const connEntity = entityMap.get(connId)
        if (connEntity?.category) cats.add(connEntity.category)
      })
      categoriesBridged.set(entityId, cats)
    })

    // Simple betweenness approximation: entities connecting many different categories
    // are more likely to be bridges
    const results: CentralEntity[] = entities
      .filter((e) => degrees.has(e.id))
      .map((e) => {
        const connectedIds = degrees.get(e.id)!
        const connections = [...connectedIds]
          .map((id) => entityMap.get(id))
          .filter((ent): ent is Entity => ent != null)
          .sort((a, b) => (degrees.get(b.id)?.size || 0) - (degrees.get(a.id)?.size || 0))

        const cats = categoriesBridged.get(e.id)!
        // Betweenness proxy: degree * category diversity
        const betweenness = connectedIds.size * cats.size

        return {
          ...e,
          degree: connectedIds.size,
          connections,
          categoriesBridged: [...cats],
          betweenness,
        }
      })
      .sort((a, b) => b.betweenness - a.betweenness)
      .slice(0, maxCards)

    return results
  }, [entities, edges, maxCards])

  if (centralEntities.length === 0) {
    return <div className="font-mono text-[11px] text-[#999]">No network data available.</div>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
      {centralEntities.map((entity, rank) => (
        <div
          key={entity.id}
          className="bg-white border border-[#e0e0e0] rounded-lg p-4 hover:border-[#bbb] transition-colors"
        >
          {/* Rank badge */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[18px] font-medium text-[#2563eb]">#{rank + 1}</span>
              <div>
                <div className="font-mono text-[12px] font-medium text-[#1a1a1a]">{entity.name}</div>
                <span
                  className="font-mono text-[8px] tracking-[0.05em] uppercase px-1.5 py-0.5 rounded inline-block mt-0.5"
                  style={{
                    background: `${CATEGORY_COLORS[entity.category] || '#888'}15`,
                    color: CATEGORY_COLORS[entity.category] || '#888',
                  }}
                >
                  {entity.category}
                </span>
              </div>
            </div>
          </div>

          {/* Mini ego network */}
          <div className="flex justify-center my-3">
            <MiniEgoNetwork entity={entity} connections={entity.connections} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#eee]">
            <div>
              <div className="font-mono text-[18px] font-medium text-[#1a1a1a]">{entity.degree}</div>
              <div className="font-mono text-[8px] text-[#888] uppercase tracking-[0.05em]">Connections</div>
            </div>
            <div>
              <div className="font-mono text-[18px] font-medium text-[#1a1a1a]">{entity.categoriesBridged.length}</div>
              <div className="font-mono text-[8px] text-[#888] uppercase tracking-[0.05em]">Categories bridged</div>
            </div>
          </div>

          {/* Categories list */}
          <div className="mt-3">
            <div className="font-mono text-[8px] text-[#888] uppercase tracking-[0.05em] mb-1">Bridges to</div>
            <div className="flex flex-wrap gap-1">
              {entity.categoriesBridged.slice(0, 6).map((cat) => (
                <span
                  key={cat}
                  className="font-mono text-[8px] px-1.5 py-0.5 rounded"
                  style={{
                    background: `${CATEGORY_COLORS[cat] || '#888'}15`,
                    color: CATEGORY_COLORS[cat] || '#888',
                  }}
                >
                  {cat.length > 15 ? cat.slice(0, 13) + '...' : cat}
                </span>
              ))}
              {entity.categoriesBridged.length > 6 && (
                <span className="font-mono text-[8px] text-[#999]">+{entity.categoriesBridged.length - 6}</span>
              )}
            </div>
          </div>

          {/* Link */}
          <a
            href={`/map?highlight=${entity.id}`}
            className="block font-mono text-[9px] text-[#2563eb] hover:underline mt-3"
          >
            View on map →
          </a>
        </div>
      ))}
    </div>
  )
}
