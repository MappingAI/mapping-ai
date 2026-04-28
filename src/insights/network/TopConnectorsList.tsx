import { useMemo } from 'react'

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

interface TopConnectorsListProps {
  entities: Entity[]
  edges: Edge[]
  maxItems?: number
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

interface RankedEntity extends Entity {
  degree: number
  categoriesBridged: string[]
}

export function TopConnectorsList({ entities, edges, maxItems = 15 }: TopConnectorsListProps) {
  const rankedEntities = useMemo(() => {
    const entityMap = new Map(entities.map((e) => [e.id, e]))

    // Compute degree for each entity
    const degrees = new Map<number, Set<number>>()
    edges.forEach((e) => {
      if (!degrees.has(e.source_id)) degrees.set(e.source_id, new Set())
      if (!degrees.has(e.target_id)) degrees.set(e.target_id, new Set())
      degrees.get(e.source_id)!.add(e.target_id)
      degrees.get(e.target_id)!.add(e.source_id)
    })

    // Compute categories bridged
    const results: RankedEntity[] = entities
      .filter((e) => degrees.has(e.id))
      .map((e) => {
        const connectedIds = degrees.get(e.id)!
        const cats = new Set<string>()
        connectedIds.forEach((connId) => {
          const connEntity = entityMap.get(connId)
          if (connEntity?.category) cats.add(connEntity.category)
        })

        return {
          ...e,
          degree: connectedIds.size,
          categoriesBridged: [...cats],
        }
      })
      .sort((a, b) => b.degree - a.degree)
      .slice(0, maxItems)

    return results
  }, [entities, edges, maxItems])

  if (rankedEntities.length === 0) {
    return <div className="font-mono text-[11px] text-[#999]">No network data available.</div>
  }

  const maxDegree = rankedEntities[0]?.degree || 1

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[2rem_1fr_4rem_6rem] gap-2 px-2 py-1.5 border-b border-[#e0e0e0]">
        <span className="font-mono text-[8px] text-[#888] uppercase tracking-[0.05em]">#</span>
        <span className="font-mono text-[8px] text-[#888] uppercase tracking-[0.05em]">Entity</span>
        <span className="font-mono text-[8px] text-[#888] uppercase tracking-[0.05em] text-right">Conn.</span>
        <span className="font-mono text-[8px] text-[#888] uppercase tracking-[0.05em] text-right">Categories</span>
      </div>

      {/* Rows */}
      {rankedEntities.map((entity, i) => (
        <div
          key={entity.id}
          className="grid grid-cols-[2rem_1fr_4rem_6rem] gap-2 px-2 py-1.5 hover:bg-[#f8f7f5] rounded transition-colors items-center"
        >
          <span className="font-mono text-[11px] text-[#888]">{i + 1}</span>
          <div className="min-w-0">
            <a
              href={`/map?highlight=${entity.id}`}
              className="font-mono text-[11px] text-[#1a1a1a] hover:text-[#2563eb] truncate block"
            >
              {entity.name}
            </a>
            <span
              className="font-mono text-[8px] truncate block"
              style={{ color: CATEGORY_COLORS[entity.category] || '#888' }}
            >
              {entity.category}
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono text-[11px] font-medium text-[#1a1a1a]">{entity.degree}</span>
            {/* Mini bar */}
            <div className="h-1 bg-[#eee] rounded-full mt-0.5 overflow-hidden">
              <div
                className="h-full bg-[#2563eb] rounded-full"
                style={{ width: `${(entity.degree / maxDegree) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-[10px] text-[#666]">{entity.categoriesBridged.length}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
