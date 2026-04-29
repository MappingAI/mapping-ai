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
  primary_org?: string
  stance_score?: number | null
  timeline_score?: number | null
  risk_score?: number | null
}

type AxisKey = 'stance' | 'timeline' | 'risk'

interface AxisOutlierChartProps {
  entities: Entity[]
  mode: '1d' | '2d'
}

const AXIS_CONFIG: Record<AxisKey, { scoreKey: keyof Entity; labels: string[]; title: string; shortTitle: string }> = {
  stance: {
    scoreKey: 'stance_score',
    labels: ['Accelerate', 'Light-touch', 'Targeted', 'Moderate', 'Restrictive', 'Precautionary'],
    title: 'Regulatory Stance',
    shortTitle: 'Stance',
  },
  timeline: {
    scoreKey: 'timeline_score',
    labels: ['Already here', '2-3 years', '5-10 years', '10-25 years', '25+ years'],
    title: 'AGI Timeline',
    shortTitle: 'Timeline',
  },
  risk: {
    scoreKey: 'risk_score',
    labels: ['Overstated', 'Manageable', 'Serious', 'Catastrophic', 'Existential'],
    title: 'AI Risk Level',
    shortTitle: 'Risk',
  },
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
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

// Map axis keys to map.html axis values
const AXIS_TO_MAP_PARAM: Record<AxisKey, string> = {
  stance: 'regulatory_stance',
  timeline: 'agi_timeline',
  risk: 'ai_risk_level',
}

function getMapUrl(entity: Entity, axisX: AxisKey, axisY?: AxisKey): string {
  const typePrefix = entity.entity_type === 'person' ? 'person' : 'org'
  const xParam = AXIS_TO_MAP_PARAM[axisX]
  if (axisY) {
    const yParam = AXIS_TO_MAP_PARAM[axisY]
    return `/map.html?view=plot&axisMode=2d&axisX=${xParam}&axisY=${yParam}&entity=${typePrefix}/${entity.id}`
  }
  return `/map.html?view=plot&axisMode=1d&axisX=${xParam}&entity=${typePrefix}/${entity.id}`
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

// Entity detail card modal
function OutlierDetailCard({
  entity,
  axisX,
  axisY,
  outlierReason,
  onClose,
}: {
  entity: Entity
  axisX: AxisKey
  axisY?: AxisKey
  outlierReason: string
  onClose: () => void
}) {
  const configX = AXIS_CONFIG[axisX]
  const configY = axisY ? AXIS_CONFIG[axisY] : null
  const scoreX = entity[configX.scoreKey] as number
  const labelX = configX.labels[Math.round(scoreX) - 1] || 'Unknown'
  const scoreY = configY ? (entity[configY.scoreKey] as number) : null
  const labelY = scoreY != null && configY ? configY.labels[Math.round(scoreY) - 1] || 'Unknown' : null
  const mapUrl = getMapUrl(entity, axisX, axisY)
  const isPerson = entity.entity_type === 'person'

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.2)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white border border-[#ddd] rounded-lg shadow-xl w-[90vw] max-w-[400px]">
        <div className="border-b border-[#eee] px-4 py-3 flex justify-between items-start">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2">
              <span className="text-[14px]">{isPerson ? '●' : '■'}</span>
              <span className="font-mono text-[13px] font-medium text-[#1a1a1a]">{entity.name}</span>
            </div>
            {entity.title && <div className="font-mono text-[10px] text-[#888] mt-0.5 ml-5">{entity.title}</div>}
            {entity.primary_org && (
              <div className="font-mono text-[10px] text-[#666] mt-0.5 ml-5">{entity.primary_org}</div>
            )}
          </div>
          <button onClick={onClose} className="font-mono text-[16px] text-[#999] hover:text-[#333] px-2 -mr-2">
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

          <div className="bg-[#f8f8f8] rounded p-3 mb-3">
            <div className="space-y-2">
              <div>
                <div className="font-mono text-[9px] text-[#888]">{configX.title}</div>
                <div className="font-mono text-[13px] font-medium text-[#1a1a1a]">{labelX}</div>
              </div>
              {configY && labelY && (
                <div>
                  <div className="font-mono text-[9px] text-[#888]">{configY.title}</div>
                  <div className="font-mono text-[13px] font-medium text-[#1a1a1a]">{labelY}</div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#fff8e6] border border-[#f0d890] rounded p-3 mb-3">
            <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#b8860b] mb-1">Why outlier?</div>
            <div className="font-mono text-[11px] text-[#1a1a1a]">{outlierReason}</div>
          </div>

          <a
            href={mapUrl}
            className="inline-block font-mono text-[11px] text-[#2563eb] hover:underline"
            onClick={onClose}
          >
            View on map →
          </a>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function AxisOutlierChart({ entities, mode }: AxisOutlierChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [axisX, setAxisX] = useState<AxisKey>('stance')
  const [axisY, setAxisY] = useState<AxisKey>('timeline')
  const [selectedEntity, setSelectedEntity] = useState<{
    entity: Entity
    outlierReason: string
  } | null>(null)

  const configX = AXIS_CONFIG[axisX]
  const configY = mode === '2d' ? AXIS_CONFIG[axisY] : null

  // Filter entities with valid scores
  const validEntities = useMemo(() => {
    return entities.filter((e) => {
      if (e[configX.scoreKey] == null) return false
      if (mode === '2d' && configY && e[configY.scoreKey] == null) return false
      return true
    })
  }, [entities, configX.scoreKey, mode, configY])

  // Compute position counts and outliers using 50% of median threshold
  const { positionCounts, outlierPositions, totalCount, outlierThreshold } = useMemo(() => {
    const counts: Record<string, number> = {}

    validEntities.forEach((e) => {
      const scoreX = Math.round(e[configX.scoreKey] as number)
      if (mode === '2d' && configY) {
        const scoreY = Math.round(e[configY.scoreKey] as number)
        const key = `${scoreX}-${scoreY}`
        counts[key] = (counts[key] || 0) + 1
      } else {
        counts[String(scoreX)] = (counts[String(scoreX)] || 0) + 1
      }
    })

    // Calculate median and threshold (50% of median)
    const countValues = Object.values(counts).sort((a, b) => a - b)
    const median = countValues.length > 0 ? (countValues[Math.floor(countValues.length / 2)] ?? 0) : 0
    const threshold = Math.floor(median * 0.5)

    const outliers = new Set<string>()
    Object.entries(counts).forEach(([key, count]) => {
      if (count < threshold) {
        outliers.add(key)
      }
    })

    return { positionCounts: counts, outlierPositions: outliers, totalCount: validEntities.length, outlierThreshold: threshold }
  }, [validEntities, configX.scoreKey, mode, configY])

  // Count outlier entities
  const outlierCount = useMemo(() => {
    return validEntities.filter((e) => {
      const scoreX = Math.round(e[configX.scoreKey] as number)
      if (mode === '2d' && configY) {
        const scoreY = Math.round(e[configY.scoreKey] as number)
        return outlierPositions.has(`${scoreX}-${scoreY}`)
      }
      return outlierPositions.has(String(scoreX))
    }).length
  }, [validEntities, configX.scoreKey, mode, configY, outlierPositions])

  useEffect(() => {
    if (!ref.current || validEntities.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const handleMouseLeave = () => hideTooltip()
    container.addEventListener('mouseleave', handleMouseLeave)

    const W = container.clientWidth || 600
    const H = mode === '2d' ? 550 : 420
    const margin =
      mode === '2d'
        ? { top: 60, right: 120, bottom: 80, left: 90 }
        : { top: 40, right: 110, bottom: 70, left: 40 }
    const plotW = W - margin.left - margin.right
    const plotH = H - margin.top - margin.bottom

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H)

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`)

    const labelsX = configX.labels
    const labelsY = configY?.labels || []

    const xScale = d3
      .scaleLinear()
      .domain([0.5, labelsX.length + 0.5])
      .range([0, plotW])

    const yScale = mode === '2d' && configY
      ? d3
          .scaleLinear()
          .domain([0.5, labelsY.length + 0.5])
          .range([plotH, 0])
      : () => plotH / 2

    // Draw X axis
    const xAxisG = g.append('g').attr('transform', `translate(0, ${plotH})`)
    xAxisG.append('line').attr('x1', 0).attr('x2', plotW).attr('stroke', '#ccc')

    labelsX.forEach((label, i) => {
      const x = xScale(i + 1)
      xAxisG
        .append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', 0)
        .attr('y2', 6)
        .attr('stroke', '#ccc')

      xAxisG
        .append('text')
        .attr('x', x)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#666')
        .text(label)

      if (mode === '1d') {
        const count = positionCounts[String(i + 1)] || 0
        const isOutlier = outlierPositions.has(String(i + 1))
        xAxisG
          .append('text')
          .attr('x', x)
          .attr('y', 32)
          .attr('text-anchor', 'middle')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 8)
          .attr('fill', isOutlier ? '#b8860b' : '#999')
          .attr('font-weight', isOutlier ? '600' : '400')
          .text(`n=${count}`)
      }
    })

    // X axis label
    xAxisG
      .append('text')
      .attr('x', plotW / 2)
      .attr('y', mode === '2d' ? 45 : 44)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 10)
      .attr('fill', '#888')
      .text(configX.title)

    // Draw Y axis for 2D
    if (mode === '2d' && configY) {
      const yAxisG = g.append('g')
      yAxisG.append('line').attr('y1', 0).attr('y2', plotH).attr('stroke', '#ccc')

      labelsY.forEach((label, i) => {
        const y = yScale(i + 1)
        yAxisG
          .append('line')
          .attr('x1', -6)
          .attr('x2', 0)
          .attr('y1', y)
          .attr('y2', y)
          .attr('stroke', '#ccc')

        yAxisG
          .append('text')
          .attr('x', -10)
          .attr('y', y)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 9)
          .attr('fill', '#666')
          .text(label.length > 12 ? label.slice(0, 10) + '...' : label)
      })

      // Y axis label
      yAxisG
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -plotH / 2)
        .attr('y', -60)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#888')
        .text(configY.title)
    }

    // Prepare node data
    const nodeRadius = mode === '2d' ? 6 : 5
    const nodeData = validEntities.map((e, i) => {
      const scoreX = Math.round(e[configX.scoreKey] as number)
      const scoreY = mode === '2d' && configY ? Math.round(e[configY.scoreKey] as number) : 0
      const posKey = mode === '2d' ? `${scoreX}-${scoreY}` : String(scoreX)
      const isOutlier = outlierPositions.has(posKey)
      const posCount = positionCounts[posKey] || 0

      return {
        entity: e,
        scoreX,
        scoreY,
        isOutlier,
        posCount,
        posKey,
        targetX: xScale(scoreX),
        targetY: mode === '2d' ? yScale(scoreY) : plotH / 2,
        x: xScale(scoreX) + (Math.random() - 0.5) * 20,
        y: mode === '2d' ? yScale(scoreY) + (Math.random() - 0.5) * 20 : plotH / 2 + (Math.random() - 0.5) * plotH * 0.8,
        radius: nodeRadius,
        index: i,
      }
    })

    // Run simulation
    const simulation = d3
      .forceSimulation(nodeData)
      .force('x', d3.forceX((d: (typeof nodeData)[0]) => d.targetX).strength(mode === '2d' ? 0.5 : 0.8))
      .force('y', d3.forceY((d: (typeof nodeData)[0]) => d.targetY).strength(mode === '2d' ? 0.5 : 0.05))
      .force('collide', d3.forceCollide(nodeRadius + 1).strength(0.8))
      .stop()

    for (let i = 0; i < 120; i++) simulation.tick()

    // Draw non-outlier nodes (dimmed)
    nodeData
      .filter((d) => !d.isOutlier)
      .forEach((d) => {
        const isPerson = d.entity.entity_type === 'person'
        const color = CATEGORY_COLORS[d.entity.category] || '#888'

        if (isPerson) {
          g.append('circle')
            .attr('cx', d.x)
            .attr('cy', d.y)
            .attr('r', d.radius)
            .attr('fill', color)
            .attr('opacity', 0.15)
        } else {
          const size = d.radius * 1.6
          g.append('rect')
            .attr('x', d.x - size / 2)
            .attr('y', d.y - size / 2)
            .attr('width', size)
            .attr('height', size)
            .attr('rx', 1)
            .attr('fill', color)
            .attr('opacity', 0.15)
        }
      })

    // Draw outlier nodes (interactive with black outline)
    const outlierNodes = nodeData.filter((d) => d.isOutlier)

    outlierNodes.forEach((d) => {
      const isPerson = d.entity.entity_type === 'person'
      const color = CATEGORY_COLORS[d.entity.category] || '#888'
      const percentage = ((d.posCount / totalCount) * 100).toFixed(1)

      const labelX = configX.labels[d.scoreX - 1] || ''
      const labelY = mode === '2d' && configY ? configY.labels[d.scoreY - 1] || '' : ''

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let node: any

      if (isPerson) {
        node = g
          .append('circle')
          .attr('cx', d.x)
          .attr('cy', d.y)
          .attr('r', d.radius)
          .attr('fill', color)
          .attr('stroke', '#1a1a1a')
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.9)
          .style('cursor', 'pointer')
      } else {
        const size = d.radius * 1.6
        node = g
          .append('rect')
          .attr('x', d.x - size / 2)
          .attr('y', d.y - size / 2)
          .attr('width', size)
          .attr('height', size)
          .attr('rx', 1)
          .attr('fill', color)
          .attr('stroke', '#1a1a1a')
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.9)
          .style('cursor', 'pointer')
      }

      const outlierReason =
        mode === '2d'
          ? `Only ${d.posCount} of ${totalCount} entities (${percentage}%) are ${labelX} + ${labelY}`
          : `Only ${d.posCount} of ${totalCount} entities (${percentage}%) hold this view`

      node.on('mouseenter', (evt: MouseEvent) => {
        node.attr('opacity', 1)
        if (isPerson) {
          node.attr('r', d.radius * 1.3)
        } else {
          const newSize = d.radius * 1.6 * 1.3
          node
            .attr('width', newSize)
            .attr('height', newSize)
            .attr('x', d.x - newSize / 2)
            .attr('y', d.y - newSize / 2)
        }
        showTooltip(
          evt,
          `
          <div style="font-weight:500; margin-bottom:3px;">${isPerson ? '●' : '■'} ${escapeHtml(d.entity.name)}</div>
          <div style="color:${color}; font-size:10px; margin-bottom:4px;">${escapeHtml(d.entity.category)}</div>
          <div style="font-size:10px;">${labelX}${labelY ? ` · ${labelY}` : ''}</div>
          <div style="font-size:9px; color:#b8860b; margin-top:3px;">
            ${d.posCount} of ${totalCount} (${percentage}%)
          </div>
          <div style="font-size:9px; color:#888; margin-top:2px;">Click for details</div>
        `,
        )
      })

      node.on('mouseleave', () => {
        node.attr('opacity', 0.9)
        if (isPerson) {
          node.attr('r', d.radius)
        } else {
          const size = d.radius * 1.6
          node
            .attr('width', size)
            .attr('height', size)
            .attr('x', d.x - size / 2)
            .attr('y', d.y - size / 2)
        }
        hideTooltip()
      })

      node.on('click', () => {
        hideTooltip()
        setSelectedEntity({ entity: d.entity, outlierReason })
      })
    })

    // Add annotations for top outliers (most isolated positions) - name next to node
    const annotationCandidates = outlierNodes
      .filter((d) => d.posCount <= 5) // Only annotate very rare positions
      .sort((a, b) => a.posCount - b.posCount)
      .slice(0, mode === '2d' ? 5 : 3) // Limit annotations

    annotationCandidates.forEach((d) => {
      // Truncate long names more aggressively
      const maxLen = 14
      const name = d.entity.name.length > maxLen ? d.entity.name.slice(0, maxLen - 1) + '…' : d.entity.name

      // Position label on left side if node is in right 60% of chart
      const onRightHalf = d.x > plotW * 0.6
      const labelX = onRightHalf ? d.x - d.radius - 6 : d.x + d.radius + 6
      const anchor = onRightHalf ? 'end' : 'start'

      // Add background rect for readability (rendered first, behind text)
      const textNode = g.append('text')
        .attr('x', labelX)
        .attr('y', d.y + 3)
        .attr('text-anchor', anchor)
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('font-weight', '500')
        .attr('fill', '#b8860b')
        .style('pointer-events', 'none')
        .text(name)

      // Get text bounding box and add background
      const bbox = textNode.node()?.getBBox()
      if (bbox) {
        g.insert('rect', 'text')
          .attr('x', bbox.x - 2)
          .attr('y', bbox.y - 1)
          .attr('width', bbox.width + 4)
          .attr('height', bbox.height + 2)
          .attr('fill', 'rgba(255, 255, 255, 0.85)')
          .attr('rx', 2)
          .style('pointer-events', 'none')
      }
    })

    return () => {
      hideTooltip()
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [validEntities, configX, configY, mode, positionCounts, outlierPositions, totalCount])

  const axisOptions: AxisKey[] = ['stance', 'timeline', 'risk']

  return (
    <div>
      {/* Axis selectors */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-[#888]">{mode === '2d' ? 'X:' : 'Axis:'}</span>
          {axisOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setAxisX(opt)}
              className={`font-mono text-[10px] px-2 py-1 rounded transition-colors ${
                axisX === opt ? 'bg-[#555] text-white' : 'bg-[#f5f5f5] text-[#888] hover:bg-[#eee]'
              }`}
            >
              {AXIS_CONFIG[opt].shortTitle}
            </button>
          ))}
        </div>

        {mode === '2d' && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-[#888]">Y:</span>
            {axisOptions
              .filter((opt) => opt !== axisX)
              .map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAxisY(opt)}
                  className={`font-mono text-[10px] px-2 py-1 rounded transition-colors ${
                    axisY === opt ? 'bg-[#555] text-white' : 'bg-[#f5f5f5] text-[#888] hover:bg-[#eee]'
                  }`}
                >
                  {AXIS_CONFIG[opt].shortTitle}
                </button>
              ))}
          </div>
        )}

        <div className="font-mono text-[9px] text-[#888] ml-auto">
          <span className="text-[#b8860b] font-medium">{outlierCount} outliers</span> · {validEntities.length} total
        </div>
      </div>

      {/* Chart */}
      <div ref={ref} />

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#888] border-2 border-[#1a1a1a]" />
          <span className="font-mono text-[9px] text-[#666]">Outlier (clickable)</span>
        </div>
        <div className="font-mono text-[9px] text-[#999]">
          Positions with &lt;{outlierThreshold} entities (50% of median)
        </div>
      </div>

      {/* Detail modal */}
      {selectedEntity && (
        <OutlierDetailCard
          entity={selectedEntity.entity}
          axisX={axisX}
          axisY={mode === '2d' ? axisY : undefined}
          outlierReason={selectedEntity.outlierReason}
          onClose={() => setSelectedEntity(null)}
        />
      )}
    </div>
  )
}
