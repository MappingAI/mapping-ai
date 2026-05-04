import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ClusterListView as SharedClusterListView, getPointColor, escapeHtml } from '../../components/AgiClusterMap'
import {
  MapBeliefsClusterView,
  type MapBeliefsClusterViewRef,
  type AgiPoint,
  type AgiData,
  type ColorMode,
  CLUSTER_COLORS,
  CATEGORY_COLORS,
  BELIEF_SCALES,
} from './MapBeliefsClusterView'

// Re-export types for parent component
export type { AgiPoint, AgiData, MapBeliefsClusterViewRef }
export { CLUSTER_COLORS, CATEGORY_COLORS, BELIEF_SCALES }

interface AgiSource {
  url: string
  title: string | null
  type: string | null
}

type SubView = 'map' | 'list' | 'scatter' | 'timeline' | 'trends'

interface QuarterBucket {
  key: string
  label: string
  start: Date
  end: Date
}

function buildQuarters(points: AgiPoint[]): QuarterBucket[] {
  const dated = points.filter((p) => p.date)
  if (dated.length === 0) return []
  const dates = dated.map((p) => new Date(p.date!))
  const rawMin = new Date(Math.min(...dates.map((d) => d.getTime())))
  const minDate = rawMin.getFullYear() < 2020 ? new Date(2020, 0, 1) : rawMin
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
  const quarters: QuarterBucket[] = []
  let y = minDate.getFullYear()
  let q = Math.floor(minDate.getMonth() / 3)
  const endY = maxDate.getFullYear()
  const endQ = Math.floor(maxDate.getMonth() / 3)
  while (y < endY || (y === endY && q <= endQ)) {
    const start = new Date(y, q * 3, 1)
    const end = new Date(y, q * 3 + 3, 0)
    quarters.push({ key: `${y}Q${q + 1}`, label: `Q${q + 1} ${y}`, start, end })
    q++
    if (q > 3) {
      q = 0
      y++
    }
  }
  return quarters
}

function pointInQuarter(p: AgiPoint, qb: QuarterBucket): boolean {
  if (!p.date) return false
  const d = new Date(p.date)
  return d >= qb.start && d <= qb.end
}

function createTooltip(id: string): HTMLDivElement {
  let el = document.getElementById(id) as HTMLDivElement | null
  if (!el) {
    el = document.createElement('div')
    el.id = id
    Object.assign(el.style, {
      position: 'fixed',
      background: 'var(--bg-panel)',
      border: '1px solid var(--line)',
      borderRadius: '4px',
      padding: '8px 12px',
      fontFamily: 'var(--mono)',
      fontSize: '11px',
      color: 'var(--text-1)',
      pointerEvents: 'none',
      zIndex: '9999',
      maxWidth: '320px',
      lineHeight: '1.4',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      opacity: '0',
      left: '0',
      top: '0',
    })
    document.body.appendChild(el)
  }
  return el
}

function showTip(tipEl: HTMLDivElement, evt: MouseEvent, html: string) {
  tipEl.innerHTML = html
  tipEl.style.left = evt.clientX + 12 + 'px'
  tipEl.style.top = evt.clientY + 12 + 'px'
  tipEl.style.opacity = '1'
}

function moveTip(tipEl: HTMLDivElement, evt: MouseEvent) {
  tipEl.style.left = evt.clientX + 12 + 'px'
  tipEl.style.top = evt.clientY + 12 + 'px'
}

function hideTip(tipEl: HTMLDivElement) {
  tipEl.style.opacity = '0'
}

function buildTooltipHtml(d: AgiPoint, colorMode: ColorMode): string {
  const beliefValue =
    colorMode === 'cluster'
      ? d.cluster_label
      : colorMode === 'category'
        ? null
        : d[colorMode as 'stance' | 'timeline' | 'risk']
  const beliefLine = beliefValue
    ? `<div style="color:${getPointColor(d, colorMode)};font-weight:500;font-size:10px;margin-bottom:2px;">${escapeHtml(String(beliefValue))}</div>`
    : ''
  const defText = d.definition.length > 100 ? d.definition.substring(0, 97) + '...' : d.definition
  return `<div style="font-weight:500;margin-bottom:2px;">${escapeHtml(d.name)}</div>
    <div style="color:var(--text-3);font-size:10px;margin-bottom:2px;">${escapeHtml(d.category)}</div>
    ${beliefLine}
    <div style="font-size:10px;color:var(--text-2);font-style:italic;">${escapeHtml(defText)}</div>`
}

// Use shared ClusterListView component for consistent visualization
function ListView({
  data,
  onSelect,
  searchQuery,
  hiddenClusters,
  hiddenCategories,
}: {
  data: AgiData
  onSelect: (p: AgiPoint) => void
  searchQuery?: string
  hiddenClusters?: Set<string>
  hiddenCategories?: Set<string>
}) {
  // Filter data based on hidden clusters/categories
  const filteredData = useMemo(() => {
    if (!hiddenClusters?.size && !hiddenCategories?.size) return data

    // Filter points
    const filteredPoints = data.points.filter((p) => {
      if (hiddenClusters?.has(p.cluster_id || '')) return false
      if (hiddenCategories?.has(p.category)) return false
      return true
    })

    // Filter clusters to only show those with visible points
    const visibleClusterIds = new Set(filteredPoints.map((p) => p.cluster_id))
    const filteredClusters = (data.clusters || []).filter((c) => visibleClusterIds.has(c.id))

    return {
      ...data,
      points: filteredPoints,
      clusters: filteredClusters,
    }
  }, [data, hiddenClusters, hiddenCategories])

  return (
    <SharedClusterListView
      data={filteredData as Parameters<typeof SharedClusterListView>[0]['data']}
      onSelect={onSelect as Parameters<typeof SharedClusterListView>[0]['onSelect']}
      searchQuery={searchQuery}
    />
  )
}

function ScatterView({
  data,
  colorMode,
  hoveredCategory,
  onSelect,
  hiddenClusters,
  hiddenCategories,
  hiddenBeliefValues,
}: {
  data: AgiData
  colorMode: ColorMode
  hoveredCategory: string | null
  onSelect: (p: AgiPoint) => void
  hiddenClusters?: Set<string>
  hiddenCategories?: Set<string>
  hiddenBeliefValues?: Set<string>
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Filter data based on hidden clusters/categories/belief values
  const filteredData = useMemo(() => {
    if (!hiddenClusters?.size && !hiddenCategories?.size && !hiddenBeliefValues?.size) return data
    return {
      ...data,
      points: data.points.filter((p) => {
        if (hiddenClusters?.has(p.cluster_id || '')) return false
        if (hiddenCategories?.has(p.category)) return false
        // Check belief dimension filtering
        if (hiddenBeliefValues && hiddenBeliefValues.size > 0) {
          if (colorMode === 'stance' && p.stance_score != null) {
            if (hiddenBeliefValues.has(`stance:${p.stance_score}`)) return false
          } else if (colorMode === 'timeline' && p.timeline_score != null) {
            if (hiddenBeliefValues.has(`timeline:${p.timeline_score}`)) return false
          } else if (colorMode === 'risk' && p.risk_score != null) {
            if (hiddenBeliefValues.has(`risk:${p.risk_score}`)) return false
          }
        }
        return true
      }),
    }
  }, [data, hiddenClusters, hiddenCategories, hiddenBeliefValues, colorMode])

  useEffect(() => {
    if (!ref.current || !filteredData || filteredData.points.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const staleTip = document.getElementById('__defview-scatter-tip')
    if (staleTip) staleTip.style.opacity = '0'

    const W = container.clientWidth || 700
    const maxH = window.innerHeight - 220
    const H = Math.min(Math.max(400, W * 0.65), maxH)
    const pad = 40

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    const xExtent = d3.extent(filteredData.points, (d: AgiPoint) => d.x) as [number, number]
    const yExtent = d3.extent(filteredData.points, (d: AgiPoint) => d.y) as [number, number]

    const xScale = d3
      .scaleLinear()
      .domain([xExtent[0] - 0.5, xExtent[1] + 0.5])
      .range([pad, W - pad])
    const yScale = d3
      .scaleLinear()
      .domain([yExtent[0] - 0.5, yExtent[1] + 0.5])
      .range([H - pad, pad])

    const tipEl = createTooltip('__defview-scatter-tip')

    svg
      .selectAll('circle')
      .data(filteredData.points)
      .enter()
      .append('circle')
      .attr('cx', (d: AgiPoint) => xScale(d.x))
      .attr('cy', (d: AgiPoint) => yScale(d.y))
      .attr('r', 5)
      .attr('fill', (d: AgiPoint) => getPointColor(d, colorMode))
      .attr('opacity', 0.8)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', (evt: MouseEvent, d: AgiPoint) => showTip(tipEl, evt, buildTooltipHtml(d, colorMode)))
      .on('mousemove', (evt: MouseEvent) => moveTip(tipEl, evt))
      .on('mouseout', () => hideTip(tipEl))
      .on('click', (_: MouseEvent, d: AgiPoint) => {
        hideTip(tipEl)
        onSelect(d)
      })

    return () => {
      const tip = document.getElementById('__defview-scatter-tip')
      if (tip) tip.remove()
    }
  }, [filteredData, colorMode, onSelect])

  useEffect(() => {
    if (!ref.current) return
    d3.select(ref.current)
      .selectAll('circle')
      .attr('opacity', (d: AgiPoint) => {
        if (colorMode === 'category' || colorMode === 'cluster') {
          return hoveredCategory && d.category !== hoveredCategory ? 0.15 : 0.8
        }
        const scoreKey =
          colorMode === 'stance' ? 'stance_score' : colorMode === 'timeline' ? 'timeline_score' : 'risk_score'
        return d[scoreKey] == null ? 0.2 : 0.85
      })
  }, [hoveredCategory, colorMode])

  return <div ref={ref} />
}

function MiniSparkline({
  series,
  colorStart,
  colorEnd,
  sparkW,
  sparkH,
}: {
  series: number[]
  colorStart: string
  colorEnd: string
  sparkW: number
  sparkH: number
}) {
  const validPairs = series.map((v, i) => [i, v] as [number, number]).filter(([, v]) => !isNaN(v))
  if (validPairs.length < 2) {
    return (
      <svg viewBox={`0 0 ${sparkW} ${sparkH}`} style={{ minWidth: 0, flex: '1 1 60px', height: sparkH }}>
        <text
          x={sparkW / 2}
          y={sparkH / 2 + 3}
          textAnchor="middle"
          fontFamily="'DM Mono', monospace"
          fontSize={7}
          fill="var(--text-3)"
        >
          n/a
        </text>
      </svg>
    )
  }
  const vals = validPairs.map(([, v]) => v)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = maxV - minV || 1
  const xScale = d3
    .scaleLinear()
    .domain([0, series.length - 1])
    .range([2, sparkW - 2])
  const yScale = d3
    .scaleLinear()
    .domain([minV - range * 0.1, maxV + range * 0.1])
    .range([sparkH - 2, 2])
  const gradId = `bgrad-${Math.random().toString(36).slice(2, 8)}`
  const line = d3
    .line()
    .defined((d: [number, number]) => !isNaN(d[1]))
    .x((d: [number, number]) => xScale(d[0]))
    .y((d: [number, number]) => yScale(d[1]))
    .curve(d3.curveMonotoneX)
  const pathD = line(series.map((v, i) => [i, v] as [number, number])) || ''

  return (
    <svg width={sparkW} height={sparkH} style={{ minWidth: 0, flex: '0 1 auto' }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colorStart} />
          <stop offset="100%" stopColor={colorEnd} />
        </linearGradient>
      </defs>
      <path d={pathD} fill="none" stroke={`url(#${gradId})`} strokeWidth={1.5} />
    </svg>
  )
}

function TrendsView({ data }: { data: AgiData }) {
  const quarters = useMemo(() => buildQuarters(data.points), [data.points])
  const clusters = useMemo(() => [...(data.clusters || [])].sort((a, b) => b.count - a.count), [data.clusters])

  const beliefDims = useMemo(
    () =>
      [
        { key: 'stance_score' as const, label: 'Stance', colors: BELIEF_SCALES.stance!.colors },
        { key: 'timeline_score' as const, label: 'Timeline', colors: BELIEF_SCALES.timeline!.colors },
        { key: 'risk_score' as const, label: 'Risk', colors: BELIEF_SCALES.risk!.colors },
      ] as const,
    [],
  )

  const clusterTimeSeries = useMemo(() => {
    const series: Record<string, number[]> = {}
    clusters.forEach((c) => {
      series[c.id] = quarters.map(
        (q) => data.points.filter((p) => p.cluster_id === c.id && pointInQuarter(p, q)).length,
      )
    })
    return series
  }, [data.points, clusters, quarters])

  const clusterBeliefSeries = useMemo(() => {
    const result: Record<string, Record<string, number[]>> = {}
    clusters.forEach((c) => {
      result[c.id] = {}
      beliefDims.forEach((dim) => {
        result[c.id]![dim.key] = quarters.map((q) => {
          const inQ = data.points.filter((p) => p.cluster_id === c.id && pointInQuarter(p, q) && p[dim.key] != null)
          if (inQ.length === 0) return NaN
          return d3.mean(inQ, (p: AgiPoint) => p[dim.key]) as number
        })
      })
    })
    return result
  }, [data.points, clusters, quarters, beliefDims])

  const countSparkW = 120
  const countSparkH = 30
  const beliefSparkW = 80
  const beliefSparkH = 24

  if (quarters.length === 0) {
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)' }}>
        No dated definitions available for timeline analysis.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {beliefDims.map((dim) => {
          const scaleKey = dim.key.replace('_score', '')
          const scale = BELIEF_SCALES[scaleKey]
          const startLabel = scale?.labels[0] || ''
          const endLabel = scale?.labels[scale.labels.length - 1] || ''
          return (
            <div key={dim.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '9px',
                  color: 'var(--text-1)',
                  minWidth: '55px',
                  flexShrink: 0,
                }}
              >
                {dim.label}
              </span>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '8px',
                  color: 'var(--text-3)',
                  whiteSpace: 'nowrap',
                  width: '75px',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {startLabel}
              </span>
              <div
                style={{
                  width: '80px',
                  minWidth: '80px',
                  height: '6px',
                  borderRadius: '3px',
                  flexShrink: 0,
                  background: `linear-gradient(to right, ${dim.colors[0]}, ${dim.colors[dim.colors.length - 1]})`,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '9px',
                  color: 'var(--text-3)',
                  whiteSpace: 'nowrap',
                }}
              >
                {endLabel}
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {clusters.map((c) => {
          const countSeries = clusterTimeSeries[c.id] || []
          const maxVal = Math.max(...countSeries, 1)
          const xScale = d3
            .scaleLinear()
            .domain([0, countSeries.length - 1])
            .range([0, countSparkW])
          const yScale = d3
            .scaleLinear()
            .domain([0, maxVal])
            .range([countSparkH - 2, 2])
          const line = d3
            .line()
            .x((_: number, i: number) => xScale(i))
            .y((d: number) => yScale(d))
            .curve(d3.curveMonotoneX)
          const pathD = line(countSeries) || ''
          const beliefs = clusterBeliefSeries[c.id]

          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  flexShrink: 0,
                  background: CLUSTER_COLORS[c.id] || '#ccc',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '10px',
                  color: 'var(--text-2)',
                  width: '160px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                  flexShrink: 0,
                }}
              >
                {c.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 0', minWidth: 0 }}>
                <svg
                  viewBox={`0 0 ${countSparkW} ${countSparkH}`}
                  style={{ flex: '1 1 0', height: countSparkH, minWidth: 0 }}
                >
                  <path d={pathD} fill="none" stroke={CLUSTER_COLORS[c.id] || '#ccc'} strokeWidth={1.5} />
                </svg>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '9px',
                    color: 'var(--text-3)',
                    flexShrink: 0,
                    width: '28px',
                    textAlign: 'right' as const,
                  }}
                >
                  {countSeries.reduce((a, b) => a + b, 0)}
                </span>
              </div>
              {beliefs &&
                beliefDims.map((dim) => {
                  const dimSeries = beliefs[dim.key] || []
                  return (
                    <div
                      key={dim.key}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 0', minWidth: 0 }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '8px',
                          color: 'var(--text-3)',
                          flexShrink: 0,
                        }}
                      >
                        {dim.label}
                      </span>
                      <MiniSparkline
                        series={dimSeries}
                        colorStart={dim.colors[0] ?? '#888'}
                        colorEnd={dim.colors[dim.colors.length - 1] ?? '#888'}
                        sparkW={beliefSparkW}
                        sparkH={beliefSparkH}
                      />
                    </div>
                  )
                })}
            </div>
          )
        })}
      </div>

      <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-3)' }}>
        Each sparkline shows the cluster's mean score per quarter. Gaps indicate quarters with no scored definitions.
      </div>
    </div>
  )
}

function TimelineView({ data }: { data: AgiData }) {
  const ref = useRef<HTMLDivElement>(null)
  const [tooltipState, setTooltipState] = useState<{ x: number; y: number; html: string } | null>(null)

  const quarters = useMemo(() => buildQuarters(data.points), [data.points])
  const clusters = useMemo(() => [...(data.clusters || [])].sort((a, b) => b.count - a.count), [data.clusters])

  const stackedData = useMemo(() => {
    if (quarters.length === 0) return null
    const rows = quarters.map((q) => {
      const row: Record<string, number> = { quarter: 0 }
      clusters.forEach((c) => {
        row[c.id] = data.points.filter((p) => p.cluster_id === c.id && pointInQuarter(p, q)).length
      })
      return row
    })
    const keys = clusters.map((c) => c.id)
    const stack = d3.stack().keys(keys).order(d3.stackOrderNone).offset(d3.stackOffsetNone)
    return { layers: stack(rows), keys, rows }
  }, [data.points, clusters, quarters])

  const summaryText = useMemo(() => {
    if (!stackedData || quarters.length < 2) return null
    let bestGrowth = ''
    let bestGrowthRate = 0
    const clusterMap = new Map(clusters.map((c) => [c.id, c.label]))
    stackedData.keys.forEach((key: string) => {
      const vals = stackedData.rows.map((r) => r[key] || 0)
      const firstHalf = vals.slice(0, Math.floor(vals.length / 2)).reduce((a, b) => a + b, 0)
      const secondHalf = vals.slice(Math.floor(vals.length / 2)).reduce((a, b) => a + b, 0)
      if (firstHalf > 0) {
        const rate = (secondHalf - firstHalf) / firstHalf
        if (rate > bestGrowthRate) {
          bestGrowthRate = rate
          bestGrowth = clusterMap.get(key) || key
        }
      }
    })
    if (bestGrowth && bestGrowthRate > 0.1) {
      return `${bestGrowth} definitions grew ${Math.round(bestGrowthRate * 100)}% from the first half to the second half of the time range.`
    }
    return null
  }, [stackedData, clusters, quarters])

  useEffect(() => {
    if (!ref.current || !stackedData || quarters.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const W = container.clientWidth || 700
    const H = 300
    const pad = { top: 10, right: 60, bottom: 40, left: 40 }

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%')
      .attr('height', H)

    const xScale = d3
      .scaleLinear()
      .domain([0, quarters.length - 1])
      .range([pad.left, W - pad.right])
    const yMax = d3.max(stackedData.layers[stackedData.layers.length - 1], (d: [number, number]) => d[1]) || 1
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .range([H - pad.bottom, pad.top])

    const area = d3
      .area()
      .x((_: unknown, i: number) => xScale(i))
      .y0((d: [number, number]) => yScale(d[0]))
      .y1((d: [number, number]) => yScale(d[1]))
      .curve(d3.curveMonotoneX)

    svg
      .selectAll('path.layer')
      .data(stackedData.layers)
      .enter()
      .append('path')
      .attr('class', 'layer')
      .attr('d', (d: [number, number][]) => area(d))
      .attr('fill', (_: unknown, i: number) => CLUSTER_COLORS[stackedData.keys[i] ?? ''] || '#ccc')
      .attr('opacity', 0.8)

    svg
      .append('rect')
      .attr('x', pad.left)
      .attr('y', pad.top)
      .attr('width', W - pad.left - pad.right)
      .attr('height', H - pad.top - pad.bottom)
      .attr('fill', 'transparent')
      .on('mousemove', (evt: MouseEvent) => {
        const [mx] = d3.pointer(evt)
        const idx = Math.round(xScale.invert(mx))
        const clampedIdx = Math.max(0, Math.min(quarters.length - 1, idx))
        const q = quarters[clampedIdx]
        if (!q) return
        const parts = stackedData.keys
          .map((key: string, ki: number) => {
            const val = stackedData.rows[clampedIdx]?.[key] || 0
            if (val === 0) return null
            const clusterLabel = clusters[ki]?.label || key
            return `<div style="color:${CLUSTER_COLORS[key] || 'var(--text-3)'}">${escapeHtml(clusterLabel)}: ${val}</div>`
          })
          .filter(Boolean)
          .join('')
        const html = `<div style="font-weight:500;margin-bottom:3px;">${escapeHtml(q.label)}</div>${parts}`
        setTooltipState({ x: evt.clientX + 12, y: evt.clientY + 12, html })
      })
      .on('mouseleave', () => setTooltipState(null))

    const yearIndices: number[] = []
    quarters.forEach((q, i) => {
      if (q.start.getMonth() === 0 || i === 0) yearIndices.push(i)
    })

    yearIndices.forEach((i) => {
      svg
        .append('text')
        .attr('x', xScale(i))
        .attr('y', H - pad.bottom + 16)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', 'var(--text-3)')
        .text(String(quarters[i]?.start.getFullYear() || ''))
    })

    const yTicks = yScale.ticks(4)
    yTicks.forEach((t: number) => {
      svg
        .append('text')
        .attr('x', pad.left - 6)
        .attr('y', yScale(t))
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', 'var(--text-3)')
        .text(t)
      svg
        .append('line')
        .attr('x1', pad.left)
        .attr('x2', W - pad.right)
        .attr('y1', yScale(t))
        .attr('y2', yScale(t))
        .attr('stroke', 'var(--line)')
    })
  }, [stackedData, quarters, clusters])

  if (quarters.length === 0) {
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)' }}>
        No dated definitions available for trend analysis.
      </div>
    )
  }

  return (
    <div>
      <div ref={ref} />
      {tooltipState && (
        <div
          style={{
            position: 'fixed',
            background: 'var(--bg-panel)',
            border: '1px solid var(--line)',
            borderRadius: '4px',
            padding: '8px 12px',
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            color: 'var(--text-1)',
            pointerEvents: 'none',
            zIndex: 9999,
            maxWidth: '320px',
            lineHeight: 1.4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            left: tooltipState.x,
            top: tooltipState.y,
          }}
          dangerouslySetInnerHTML={{ __html: tooltipState.html }}
        />
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: '12px' }}>
        {clusters.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: CLUSTER_COLORS[c.id] || '#ccc',
              }}
            />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-2)' }}>{c.label}</span>
          </div>
        ))}
      </div>
      {summaryText && (
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            color: 'var(--text-2)',
            marginTop: '12px',
            background: 'var(--bg-page)',
            borderRadius: '4px',
            padding: '8px 12px',
          }}
        >
          {summaryText}
        </div>
      )}
    </div>
  )
}

function _Legend({
  data,
  colorMode,
  setHoveredCategory,
  categories,
}: {
  data: AgiData
  colorMode: ColorMode
  setHoveredCategory: (cat: string | null) => void
  categories: string[]
}) {
  if (colorMode === 'cluster') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: '8px' }}>
        {(data.clusters || []).map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: CLUSTER_COLORS[c.id] || '#ccc',
              }}
            />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-2)' }}>
              {c.label} ({c.count})
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (colorMode === 'category') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: '8px' }}>
        {categories.map((cat) => (
          <div
            key={cat}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            onMouseEnter={() => setHoveredCategory(cat)}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: CATEGORY_COLORS[cat] || '#888',
              }}
            />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-2)' }}>
              {cat} ({data.points.filter((p) => p.category === cat).length})
            </span>
          </div>
        ))}
      </div>
    )
  }

  const scoreKey = colorMode === 'stance' ? 'stance_score' : colorMode === 'timeline' ? 'timeline_score' : 'risk_score'
  const noDataCount = data.points.filter((p) => p[scoreKey] == null).length
  const beliefScale = BELIEF_SCALES[colorMode]

  if (beliefScale) {
    return (
      <div style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {beliefScale.labels.map((label, i) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div
                style={{
                  width: '100%',
                  height: '12px',
                  background: beliefScale.colors[i],
                  borderRadius: i === 0 ? '3px 0 0 3px' : i === beliefScale.labels.length - 1 ? '0 3px 3px 0' : '0',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '8px',
                  color: 'var(--text-3)',
                  marginTop: '4px',
                  textAlign: 'center' as const,
                  lineHeight: 1.1,
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
        {noDataCount > 0 && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-3)', marginTop: '4px' }}>
            {noDataCount} entities without {colorMode} data shown in gray
          </div>
        )}
      </div>
    )
  }

  return null
}

export interface DefinitionsViewProps {
  subView: string
  colorMode: string
  onSelect?: (point: AgiPoint, source: AgiSource | null) => void
  searchQuery?: string
  highlightedEntityId?: number | null
  selectedEntityId?: number | null
  hiddenClusters?: Set<string>
  hiddenCategories?: Set<string>
  hiddenBeliefValues?: Set<string>
  onDataLoaded?: (data: AgiData) => void
  mapRef?: React.RefObject<MapBeliefsClusterViewRef | null>
}

export function DefinitionsView({
  subView,
  colorMode,
  onSelect,
  searchQuery,
  highlightedEntityId,
  selectedEntityId,
  hiddenClusters,
  hiddenCategories,
  hiddenBeliefValues,
  onDataLoaded,
  mapRef,
}: DefinitionsViewProps) {
  const viewMode = subView as SubView
  const cm = colorMode as ColorMode
  const [data, setData] = useState<AgiData | null>(null)
  const [hoveredCategory, _setHoveredCategory] = useState<string | null>(null)

  useEffect(() => {
    // Fetch both AGI definitions and map data to merge thumbnail URLs
    Promise.all([
      fetch('/data/agi-definitions.json').then((r) => (r.ok ? r.json() : null)),
      fetch('/data/map-data.json').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([agiData, mapData]) => {
        if (agiData && mapData) {
          // Build thumbnail lookup from map data entities (people + orgs arrays)
          const thumbnailMap = new Map<number, string>()
          const allEntities = [...(mapData.people || []), ...(mapData.orgs || [])]
          allEntities.forEach((entity: { id: number; thumbnail_url?: string }) => {
            if (entity.thumbnail_url) {
              thumbnailMap.set(entity.id, entity.thumbnail_url)
            }
          })
          // Merge thumbnails into AGI definition points
          agiData.points = agiData.points.map((p: AgiPoint) => ({
            ...p,
            thumbnail_url: thumbnailMap.get(p.entity_id) || null,
          }))
        }
        setData(agiData)
        if (agiData && onDataLoaded) onDataLoaded(agiData)
      })
      .catch(() => {})

    return () => {
      ;['__defview-map-tip', '__defview-scatter-tip', '__beliefs-cluster-tip'].forEach((id) => {
        const el = document.getElementById(id)
        if (el) el.remove()
      })
    }
  }, [onDataLoaded])

  const handleSelect = useCallback(
    (p: AgiPoint) => {
      if (onSelect && data) {
        onSelect(p, data.sources[p.source_id] || null)
      }
    },
    [onSelect, data],
  )

  const _categories = useMemo(() => {
    if (!data) return []
    const counts = new Map<string, number>()
    data.points.forEach((p) => counts.set(p.category, (counts.get(p.category) || 0) + 1))
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cat]) => cat)
  }, [data])

  if (!data) {
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)', padding: '16px' }}>
        Loading definition space...
      </div>
    )
  }

  return (
    <div className="beliefs-container" style={{ padding: '12px 24px', overflow: 'hidden' }}>
      {viewMode === 'map' && (
        <MapBeliefsClusterView
          ref={mapRef}
          data={data}
          colorMode={cm}
          hoveredCategory={hoveredCategory}
          onSelect={handleSelect}
          searchQuery={searchQuery}
          highlightedEntityId={highlightedEntityId}
          selectedEntityId={selectedEntityId}
          hiddenClusters={hiddenClusters}
          hiddenCategories={hiddenCategories}
          hiddenBeliefValues={hiddenBeliefValues}
        />
      )}
      {viewMode === 'list' && (
        <ListView
          data={data}
          onSelect={handleSelect}
          searchQuery={searchQuery}
          hiddenClusters={hiddenClusters}
          hiddenCategories={hiddenCategories}
        />
      )}
      {viewMode === 'scatter' && (
        <ScatterView
          data={data}
          colorMode={cm}
          hoveredCategory={hoveredCategory}
          onSelect={handleSelect}
          hiddenClusters={hiddenClusters}
          hiddenCategories={hiddenCategories}
          hiddenBeliefValues={hiddenBeliefValues}
        />
      )}
      {viewMode === 'timeline' && <TimelineView data={data} />}
      {viewMode === 'trends' && <TrendsView data={data} />}

      <a
        href="/insights#agi-definitions"
        style={{
          display: 'inline-block',
          marginTop: '12px',
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          color: 'var(--accent)',
          letterSpacing: '0.04em',
          textDecoration: 'none',
        }}
      >
        See full analysis on Insights →
      </a>
    </div>
  )
}
