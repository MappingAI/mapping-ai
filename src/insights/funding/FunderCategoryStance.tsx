import { useEffect, useRef } from 'react'

// d3 loaded from CDN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

interface Funder {
  name: string
  category: string
  investments: number
  mean_recipient_stance: number | null
}

interface Props {
  funders: Funder[]
  showTooltip: (evt: MouseEvent, html: string) => void
  hideTooltip: () => void
}

const STANCE_LABELS = ['Accelerate', 'Light-touch', 'Targeted', 'Moderate', 'Restrictive', 'Precautionary']

const CATEGORY_COLORS: Record<string, string> = {
  'VC/Capital/Philanthropy': '#a65628',
  'Government/Agency': '#984ea3',
  'Deployers & Platforms': '#8da0cb',
  'Frontier Lab': '#e41a1c',
  'AI Safety/Alignment': '#377eb8',
  'Infrastructure & Compute': '#fc8d62',
  Investor: '#ff7f00',
  Executive: '#66c2a5',
}

export function FunderCategoryStance({ funders, showTooltip, hideTooltip }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || funders.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    // Filter to funders with stance data
    const withStance = funders.filter((f) => f.mean_recipient_stance !== null && f.investments >= 3)

    // Group by category and calculate mean of mean_recipient_stance
    const byCategory = d3.group(withStance, (f: Funder) => f.category) as Map<string, Funder[]>
    const categoryStats = Array.from(byCategory.entries())
      .map(([category, items]) => {
        const stances = items.map((f) => f.mean_recipient_stance!).filter((s) => s !== null)
        return {
          category,
          mean: d3.mean(stances) || 0,
          std: d3.deviation(stances) || 0,
          count: items.length,
          totalInvestments: d3.sum(items, (f: Funder) => f.investments),
          funders: items.map((f) => f.name).slice(0, 5),
        }
      })
      .filter((c) => c.count >= 2 && c.category !== 'Unknown')
      .sort((a, b) => a.mean - b.mean)

    if (categoryStats.length === 0) return

    const W = container.clientWidth || 660
    const barH = 36
    const gap = 8
    const padL = 180
    const padR = 80
    const dataHeight = categoryStats.length * (barH + gap) + 20
    const axisAreaHeight = 80
    const H = dataHeight + axisAreaHeight

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    const xScale = d3
      .scaleLinear()
      .domain([1, 6])
      .range([padL, W - padR])

    // Axis line
    const axisY = dataHeight + 15
    svg
      .append('line')
      .attr('x1', padL)
      .attr('x2', W - padR)
      .attr('y1', axisY)
      .attr('y2', axisY)
      .attr('stroke', '#ccc')

    // Tick marks and labels
    STANCE_LABELS.forEach((label, i) => {
      const v = i + 1
      svg
        .append('line')
        .attr('x1', xScale(v))
        .attr('x2', xScale(v))
        .attr('y1', axisY)
        .attr('y2', axisY + 6)
        .attr('stroke', '#ccc')
      svg
        .append('text')
        .attr('transform', `translate(${xScale(v)}, ${axisY + 18}) rotate(-30)`)
        .attr('text-anchor', 'end')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#888')
        .text(label)
    })

    // Add vertical reference line at "Moderate" (4)
    svg
      .append('line')
      .attr('x1', xScale(4))
      .attr('x2', xScale(4))
      .attr('y1', 10)
      .attr('y2', dataHeight)
      .attr('stroke', '#ddd')
      .attr('stroke-dasharray', '4,4')

    // Categories
    categoryStats.forEach((c, i) => {
      const y = i * (barH + gap) + 20
      const color = CATEGORY_COLORS[c.category] || '#666'

      // Label
      const shortLabels: Record<string, string> = {
        'VC/Capital/Philanthropy': 'VC/Philanthropy',
        'Government/Agency': 'Government',
        'Deployers & Platforms': 'Deployers/Platforms',
        'Infrastructure & Compute': 'Infra/Compute',
        'AI Safety/Alignment': 'AI Safety',
      }
      const label = shortLabels[c.category] || c.category
      svg
        .append('text')
        .attr('x', padL - 8)
        .attr('y', y + barH / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 11)
        .attr('fill', '#333')
        .text(label)

      // Error bar (std dev)
      const errLeft = Math.max(1, c.mean - c.std)
      const errRight = Math.min(6, c.mean + c.std)
      svg
        .append('line')
        .attr('x1', xScale(errLeft))
        .attr('x2', xScale(errRight))
        .attr('y1', y + barH / 2)
        .attr('y2', y + barH / 2)
        .attr('stroke', color)
        .attr('stroke-width', 3)
        .attr('opacity', 0.3)

      // Dot
      const circle = svg
        .append('circle')
        .attr('cx', xScale(c.mean))
        .attr('cy', y + barH / 2)
        .attr('r', 10)
        .attr('fill', color)
        .style('cursor', 'pointer')
        .node()

      if (circle) {
        circle.addEventListener('mouseenter', (e: MouseEvent) => {
          showTooltip(
            e,
            `<strong>${c.category}</strong><br>
            Mean recipient stance: ${c.mean.toFixed(2)}<br>
            SD: ±${c.std.toFixed(2)}<br>
            ${c.count} funders, ${c.totalInvestments} investments<br>
            <em style="font-size:9px;color:#888">e.g. ${c.funders.slice(0, 3).join(', ')}</em>`,
          )
        })
        circle.addEventListener('mouseleave', () => hideTooltip())
      }

      // Value label
      svg
        .append('text')
        .attr('x', xScale(c.mean) + 14)
        .attr('y', y + barH / 2)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#666')
        .text(`${c.mean.toFixed(1)} (${c.count} funders)`)
    })
  }, [funders, showTooltip, hideTooltip])

  return <div ref={ref} />
}
