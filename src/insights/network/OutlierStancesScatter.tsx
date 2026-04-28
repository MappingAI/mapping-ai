import { useEffect, useRef, useMemo } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

interface Entity {
  id: number
  name: string
  entity_type: string
  category: string
  stance_score?: number | null
}

interface OutlierStancesScatterProps {
  entities: Entity[]
  onSelectEntity?: (entity: Entity) => void
}

const STANCE_LABELS = ['Accelerate', 'Light-touch', 'Targeted', 'Moderate', 'Restrictive', 'Precautionary']

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
  'Cultural figure': '#e377c2',
  'Deployers & Platforms': '#e41a1c',
  'Infrastructure & Compute': '#e41a1c',
  'Media/Journalism': '#17becf',
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function OutlierStancesScatter({ entities, onSelectEntity }: OutlierStancesScatterProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Compute category means
  const categoryMeans = useMemo(() => {
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
    return means
  }, [entities])

  // Compute outlier score (distance from category mean)
  const entitiesWithOutlierScore = useMemo(() => {
    return entities
      .filter((e) => e.stance_score != null && e.category && categoryMeans.has(e.category))
      .map((e) => ({
        ...e,
        categoryMean: categoryMeans.get(e.category)!,
        outlierScore: Math.abs(e.stance_score! - categoryMeans.get(e.category)!),
      }))
  }, [entities, categoryMeans])

  useEffect(() => {
    if (!ref.current || entitiesWithOutlierScore.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const W = container.clientWidth || 700
    const H = Math.min(500, W * 0.7)
    const pad = { top: 40, right: 30, bottom: 60, left: 70 }

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    const xScale = d3
      .scaleLinear()
      .domain([0.5, 6.5])
      .range([pad.left, W - pad.right])

    const yScale = d3
      .scaleLinear()
      .domain([0.5, 6.5])
      .range([H - pad.bottom, pad.top])

    // Diagonal line (category mean = individual stance)
    svg
      .append('line')
      .attr('x1', xScale(1))
      .attr('y1', yScale(1))
      .attr('x2', xScale(6))
      .attr('y2', yScale(6))
      .attr('stroke', '#ddd')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,4')

    // Diagonal label
    svg
      .append('text')
      .attr('x', xScale(5.2))
      .attr('y', yScale(5.5))
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#aaa')
      .attr('transform', `rotate(-45, ${xScale(5.2)}, ${yScale(5.5)})`)
      .text('Matches category avg')

    // X axis
    svg
      .append('g')
      .attr('transform', `translate(0, ${H - pad.bottom})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickValues([1, 2, 3, 4, 5, 6])
          .tickFormat((_: number, i: number) => STANCE_LABELS[i] || ''),
      )
      .call((g: any) => g.select('.domain').attr('stroke', '#ccc'))
      .call((g: any) => g.selectAll('.tick line').attr('stroke', '#ccc'))
      .call((g: any) =>
        g
          .selectAll('.tick text')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 9)
          .attr('fill', '#666')
          .attr('transform', 'rotate(-30)')
          .attr('text-anchor', 'end'),
      )

    // X axis label
    svg
      .append('text')
      .attr('x', W / 2)
      .attr('y', H - 8)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 10)
      .attr('fill', '#888')
      .text('Category average stance')

    // Y axis
    svg
      .append('g')
      .attr('transform', `translate(${pad.left}, 0)`)
      .call(
        d3
          .axisLeft(yScale)
          .tickValues([1, 2, 3, 4, 5, 6])
          .tickFormat((_: number, i: number) => STANCE_LABELS[i] || ''),
      )
      .call((g: any) => g.select('.domain').attr('stroke', '#ccc'))
      .call((g: any) => g.selectAll('.tick line').attr('stroke', '#ccc'))
      .call((g: any) =>
        g.selectAll('.tick text').attr('font-family', "'DM Mono', monospace").attr('font-size', 9).attr('fill', '#666'),
      )

    // Y axis label
    svg
      .append('text')
      .attr('transform', `rotate(-90)`)
      .attr('x', -H / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 10)
      .attr('fill', '#888')
      .text('Individual stance')

    // Tooltip
    const tipId = '__outlier-scatter-tip'
    let tipEl = document.getElementById(tipId) as HTMLDivElement | null
    if (!tipEl) {
      tipEl = document.createElement('div')
      tipEl.id = tipId
      tipEl.className =
        'fixed bg-white border border-[#bbb] rounded px-3 py-2 font-mono text-[11px] text-[#1a1a1a] pointer-events-none z-[9999] max-w-[280px] leading-[1.4]'
      tipEl.style.cssText = 'box-shadow: 0 2px 8px rgba(0,0,0,0.08); opacity: 0; left: 0; top: 0;'
      document.body.appendChild(tipEl)
    }

    // Add jitter for overlapping points
    const jitter = () => (Math.random() - 0.5) * 0.15

    // Points
    svg
      .selectAll('circle.entity')
      .data(entitiesWithOutlierScore)
      .enter()
      .append('circle')
      .attr('class', 'entity')
      .attr('cx', (d: (typeof entitiesWithOutlierScore)[0]) => xScale(d.categoryMean + jitter()))
      .attr('cy', (d: (typeof entitiesWithOutlierScore)[0]) => yScale(d.stance_score! + jitter()))
      .attr('r', (d: (typeof entitiesWithOutlierScore)[0]) => (d.outlierScore > 1.5 ? 6 : 4))
      .attr('fill', (d: (typeof entitiesWithOutlierScore)[0]) => CATEGORY_COLORS[d.category] || '#888')
      .attr('opacity', (d: (typeof entitiesWithOutlierScore)[0]) => (d.outlierScore > 1.5 ? 0.9 : 0.5))
      .attr('stroke', (d: (typeof entitiesWithOutlierScore)[0]) => (d.outlierScore > 2 ? '#1a1a1a' : 'none'))
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseover', (evt: MouseEvent, d: (typeof entitiesWithOutlierScore)[0]) => {
        if (tipEl) {
          const stanceLabel = STANCE_LABELS[Math.round(d.stance_score!) - 1] || ''
          const catMeanLabel = STANCE_LABELS[Math.round(d.categoryMean) - 1] || ''
          tipEl.innerHTML = `
            <div style="font-weight:500;margin-bottom:3px;">${escapeHtml(d.name)}</div>
            <div style="color:#666;font-size:10px;margin-bottom:4px;">${escapeHtml(d.category)}</div>
            <div style="font-size:10px;">
              <span style="color:${CATEGORY_COLORS[d.category] || '#888'}">●</span>
              Stance: <strong>${stanceLabel}</strong>
            </div>
            <div style="font-size:10px;color:#888;">
              Category avg: ${catMeanLabel} (${d.categoryMean.toFixed(1)})
            </div>
            ${d.outlierScore > 1.5 ? `<div style="font-size:10px;color:#c41;margin-top:3px;">⚡ Outlier (${d.outlierScore.toFixed(1)} from mean)</div>` : ''}
          `
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
      .on('click', (_: MouseEvent, d: (typeof entitiesWithOutlierScore)[0]) => {
        if (tipEl) tipEl.style.opacity = '0'
        if (onSelectEntity) onSelectEntity(d)
      })

    // Label top outliers
    const topOutliers = entitiesWithOutlierScore
      .filter((d) => d.outlierScore > 2)
      .sort((a, b) => b.outlierScore - a.outlierScore)
      .slice(0, 8)

    svg
      .selectAll('text.outlier-label')
      .data(topOutliers)
      .enter()
      .append('text')
      .attr('class', 'outlier-label')
      .attr('x', (d: (typeof topOutliers)[0]) => xScale(d.categoryMean) + 8)
      .attr('y', (d: (typeof topOutliers)[0]) => yScale(d.stance_score!) + 3)
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 8)
      .attr('fill', '#555')
      .text((d: (typeof topOutliers)[0]) => (d.name.length > 18 ? d.name.slice(0, 16) + '...' : d.name))
  }, [entitiesWithOutlierScore, onSelectEntity])

  // Legend
  const topCategories = useMemo(() => {
    const counts = new Map<string, number>()
    entitiesWithOutlierScore.forEach((e) => {
      counts.set(e.category, (counts.get(e.category) || 0) + 1)
    })
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cat]) => cat)
  }, [entitiesWithOutlierScore])

  return (
    <div>
      <div ref={ref} />
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {topCategories.map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: CATEGORY_COLORS[cat] || '#888' }}
            />
            <span className="font-mono text-[9px] text-[#666]">{cat}</span>
          </div>
        ))}
      </div>
      <div className="font-mono text-[9px] text-[#999] mt-2">
        Points far from the diagonal are outliers. Larger dots with borders = stronger outliers.
      </div>
    </div>
  )
}
