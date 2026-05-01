import { useMemo } from 'react'

interface Entity {
  id: number
  name: string
  entity_type: string
  category: string
  stance_score?: number | null
  primary_org?: string
  title?: string
}

interface OutlierSpotlightsProps {
  entities: Entity[]
  maxSpotlights?: number
}

const STANCE_LABELS = ['Accelerate', 'Light-touch', 'Targeted', 'Moderate', 'Restrictive', 'Precautionary']

const STANCE_COLORS: Record<string, string> = {
  Accelerate: '#2166ac',
  'Light-touch': '#67a9cf',
  Targeted: '#d1e5f0',
  Moderate: '#fddbc7',
  Restrictive: '#ef8a62',
  Precautionary: '#b2182b',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Frontier Lab': '#e41a1c',
  'AI Safety/Alignment': '#377eb8',
  'Think Tank/Policy Org': '#4daf4a',
  'Government/Agency': '#984ea3',
  Academic: '#ff7f00',
  Researcher: '#ff7f00',
  'VC/Capital/Philanthropy': '#a65628',
  Executive: '#666',
  Policymaker: '#984ea3',
}

interface OutlierEntity extends Entity {
  categoryMean: number
  outlierScore: number
  direction: 'more-restrictive' | 'more-permissive'
}

export function OutlierSpotlights({ entities, maxSpotlights = 5 }: OutlierSpotlightsProps) {
  const outliers = useMemo(() => {
    // Compute category means
    const byCategory = new Map<string, number[]>()
    entities.forEach((e) => {
      if (e.stance_score != null && e.category) {
        if (!byCategory.has(e.category)) byCategory.set(e.category, [])
        byCategory.get(e.category)!.push(e.stance_score)
      }
    })
    const means = new Map<string, number>()
    byCategory.forEach((scores, cat) => {
      means.set(cat, scores.reduce((a, b) => a + b, 0) / scores.length)
    })

    // Find outliers
    const withScores: OutlierEntity[] = entities
      .filter((e) => e.stance_score != null && e.category && means.has(e.category))
      .map((e) => {
        const categoryMean = means.get(e.category)!
        const diff = e.stance_score! - categoryMean
        return {
          ...e,
          categoryMean,
          outlierScore: Math.abs(diff),
          direction: diff > 0 ? ('more-restrictive' as const) : ('more-permissive' as const),
        }
      })
      .filter((e) => e.outlierScore > 1.5)
      .sort((a, b) => b.outlierScore - a.outlierScore)

    // Get a mix: some more restrictive, some more permissive
    const restrictive = withScores
      .filter((e) => e.direction === 'more-restrictive')
      .slice(0, Math.ceil(maxSpotlights / 2))
    const permissive = withScores
      .filter((e) => e.direction === 'more-permissive')
      .slice(0, Math.floor(maxSpotlights / 2))

    return [...restrictive, ...permissive].slice(0, maxSpotlights)
  }, [entities, maxSpotlights])

  if (outliers.length === 0) {
    return <div className="font-mono text-[11px] text-[#999]">No significant outliers found.</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {outliers.map((entity) => {
        const stanceLabel = STANCE_LABELS[Math.round(entity.stance_score!) - 1] || 'Unknown'
        const catMeanLabel = STANCE_LABELS[Math.round(entity.categoryMean) - 1] || 'Unknown'
        const stanceColor = STANCE_COLORS[stanceLabel] || '#888'
        const catColor = CATEGORY_COLORS[entity.category] || '#888'

        return (
          <div
            key={entity.id}
            className="bg-white border border-[#e0e0e0] rounded-lg p-4 hover:border-[#bbb] transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[12px] font-medium text-[#1a1a1a] truncate">{entity.name}</div>
                {entity.title && <div className="font-mono text-[9px] text-[#888] truncate mt-0.5">{entity.title}</div>}
              </div>
              <span
                className="flex-shrink-0 font-mono text-[8px] tracking-[0.05em] uppercase px-1.5 py-0.5 rounded"
                style={{ background: `${catColor}15`, color: catColor }}
              >
                {entity.category}
              </span>
            </div>

            {/* Stance comparison */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-[#888] w-16">Their stance</span>
                <span
                  className="font-mono text-[10px] font-medium px-2 py-0.5 rounded"
                  style={{ background: `${stanceColor}20`, color: stanceColor }}
                >
                  {stanceLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-[#888] w-16">Category avg</span>
                <span className="font-mono text-[10px] text-[#666]">{catMeanLabel}</span>
              </div>
            </div>

            {/* Outlier indicator */}
            <div className="mt-3 pt-3 border-t border-[#eee]">
              <div className="flex items-center gap-1.5">
                <span className="text-[14px]">{entity.direction === 'more-restrictive' ? '🔒' : '🚀'}</span>
                <span className="font-mono text-[9px] text-[#666]">
                  {entity.direction === 'more-restrictive' ? 'More restrictive' : 'More permissive'} than{' '}
                  {entity.category} average
                </span>
              </div>
              <div className="font-mono text-[8px] text-[#999] mt-1">
                {entity.outlierScore.toFixed(1)} points from category mean
              </div>
            </div>

            {/* Link to map */}
            <a
              href={`/map?highlight=${entity.id}`}
              className="block font-mono text-[9px] text-[#2563eb] hover:underline mt-3"
            >
              View on map →
            </a>
          </div>
        )
      })}
    </div>
  )
}
