import { useEffect, useRef } from 'react'

// d3 loaded from CDN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

interface Recipient {
  name: string
  category: string
  total_usd: number
  funding_rounds: number
  unique_funders: number
}

interface Props {
  recipients: Recipient[]
  showTooltip: (evt: MouseEvent, html: string) => void
  hideTooltip: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  'Frontier Lab': '#e41a1c',
  'AI Safety/Alignment': '#377eb8',
  'Think Tank/Policy Org': '#4daf4a',
  'Government/Agency': '#984ea3',
  Academic: '#ff7f00',
  'VC/Capital/Philanthropy': '#a65628',
  'Labor/Civil Society': '#f781bf',
  'Ethics/Bias/Rights': '#999999',
  'Media/Journalism': '#66c2a5',
  'Infrastructure & Compute': '#fc8d62',
  'Deployers & Platforms': '#8da0cb',
  Unknown: '#cccccc',
}

function formatUSD(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export function FundingConcentration({ recipients, showTooltip, hideTooltip }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || recipients.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    // Filter to recipients with funding amounts, take top 15
    const topRecipients = recipients.filter((r) => r.total_usd > 0).slice(0, 15)

    const W = container.clientWidth || 660
    const barH = 24
    const gap = 6
    const padL = 180
    const padR = 100
    const padTop = 10
    const H = topRecipients.length * (barH + gap) + padTop + 20

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    const maxVal = topRecipients[0]?.total_usd || 1
    const xScale = d3
      .scaleLog()
      .domain([1e6, maxVal])
      .range([0, W - padL - padR])
      .clamp(true)

    topRecipients.forEach((r, i) => {
      const y = padTop + i * (barH + gap)
      const barWidth = r.total_usd > 1e6 ? xScale(r.total_usd) : 2

      // Label
      svg
        .append('text')
        .attr('x', padL - 8)
        .attr('y', y + barH / 2 + 1)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#555')
        .text(r.name.length > 24 ? r.name.slice(0, 22) + '...' : r.name)

      // Bar
      const bar = svg
        .append('rect')
        .attr('x', padL)
        .attr('y', y)
        .attr('width', barWidth)
        .attr('height', barH)
        .attr('rx', 3)
        .attr('fill', CATEGORY_COLORS[r.category] || '#999')
        .attr('opacity', 0.7)
        .style('cursor', 'pointer')
        .node()

      if (bar) {
        bar.addEventListener('mouseenter', (e: MouseEvent) => {
          showTooltip(
            e,
            `<strong>${r.name}</strong><br>
            Category: ${r.category}<br>
            Total: ${formatUSD(r.total_usd)}<br>
            Rounds: ${r.funding_rounds}<br>
            Funders: ${r.unique_funders}`,
          )
        })
        bar.addEventListener('mouseleave', () => hideTooltip())
      }

      // Amount label
      svg
        .append('text')
        .attr('x', padL + barWidth + 6)
        .attr('y', y + barH / 2 + 1)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#333')
        .text(formatUSD(r.total_usd))
    })

    // Category legend
    const categories = [...new Set(topRecipients.map((r) => r.category))]
    const legendY = H - 5
    let legendX = padL

    categories.slice(0, 5).forEach((cat) => {
      svg
        .append('rect')
        .attr('x', legendX)
        .attr('y', legendY - 8)
        .attr('width', 10)
        .attr('height', 10)
        .attr('rx', 2)
        .attr('fill', CATEGORY_COLORS[cat] || '#999')
        .attr('opacity', 0.7)

      const text = svg
        .append('text')
        .attr('x', legendX + 14)
        .attr('y', legendY)
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 8)
        .attr('fill', '#666')
        .text(cat.length > 12 ? cat.slice(0, 10) + '..' : cat)

      legendX += (text.node()?.getComputedTextLength() || 60) + 24
    })
  }, [recipients, showTooltip, hideTooltip])

  return <div ref={ref} />
}
