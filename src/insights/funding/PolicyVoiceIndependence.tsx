import { useEffect, useRef, useState } from 'react'

// d3 loaded from CDN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

interface FundingEdge {
  funder: string
  recipient: string
  funder_category: string
  recipient_category: string
}

interface Props {
  edges: FundingEdge[]
  showTooltip: (evt: MouseEvent, html: string) => void
  hideTooltip: () => void
}

interface RecipientStats {
  name: string
  category: string
  uniqueFunders: number
  funderCategories: string[]
  topFunder: string
  topFunderShare: number
  funders: Array<{ name: string; count: number }>
}

interface DetailCard {
  recipient: RecipientStats
  x: number
  y: number
}

function DetailCardModal({ detail, onClose }: { detail: DetailCard; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[10vh] px-4"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-[400px] w-full overflow-hidden">
        <div className="flex justify-between items-start p-4 pb-2 border-b border-[#eee]">
          <div>
            <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#888] mb-1">Funding Sources</div>
            <div className="font-serif text-[16px] font-medium">{detail.recipient.name}</div>
          </div>
          <button onClick={onClose} className="font-mono text-[18px] text-[#999] hover:text-[#333] px-2 -mr-2">
            ×
          </button>
        </div>
        <div className="p-4 space-y-2">
          {detail.recipient.funders.map((f, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="font-mono text-[11px] text-[#333]">{f.name}</span>
              <span className="font-mono text-[10px] text-[#888]">
                {f.count} {f.count === 1 ? 'grant' : 'grants'}
              </span>
            </div>
          ))}
        </div>
        <div className="p-3 pt-2 border-t border-[#eee] bg-[#faf9f7]">
          <div className="font-mono text-[9px] text-[#888]">
            {detail.recipient.uniqueFunders} unique funders · Top funder:{' '}
            {Math.round(detail.recipient.topFunderShare * 100)}% of grants
          </div>
        </div>
      </div>
    </div>
  )
}

export function PolicyVoiceIndependence({ edges, showTooltip, hideTooltip }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [selectedRecipient, setSelectedRecipient] = useState<DetailCard | null>(null)

  useEffect(() => {
    if (!ref.current || edges.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    // Filter to policy-relevant recipient categories
    const policyCategories = ['Think Tank/Policy Org', 'AI Safety/Alignment', 'Ethics/Bias/Rights']
    const policyEdges = edges.filter((e) => policyCategories.includes(e.recipient_category))

    // Aggregate by recipient
    const byRecipient = d3.group(policyEdges, (e: FundingEdge) => e.recipient) as Map<string, FundingEdge[]>
    const recipientStats: RecipientStats[] = Array.from(byRecipient.entries())
      .map(([name, items]) => {
        const funderRollup = d3.rollup(
          items,
          (v: FundingEdge[]) => v.length,
          (e: FundingEdge) => e.funder,
        ) as Map<string, number>
        const funders = Array.from(funderRollup.entries())
          .map(([funderName, count]) => ({ name: funderName, count }))
          .sort((a, b) => b.count - a.count)

        const funderCategories = [...new Set(items.map((e) => e.funder_category))]
        const topFunder = funders[0]
        const totalGrants = items.length

        return {
          name,
          category: items[0]!.recipient_category,
          uniqueFunders: funders.length,
          funderCategories,
          topFunder: topFunder?.name || 'Unknown',
          topFunderShare: topFunder ? topFunder.count / totalGrants : 0,
          funders,
        }
      })
      .filter((r) => r.funders.length >= 1)
      .sort((a, b) => b.uniqueFunders - a.uniqueFunders)
      .slice(0, 20)

    if (recipientStats.length === 0) return

    const W = container.clientWidth || 660
    const barH = 28
    const gap = 4
    const padL = 220
    const padR = 60
    const padTop = 40
    const H = recipientStats.length * (barH + gap) + padTop + 20

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    const maxFunders = d3.max(recipientStats, (r: RecipientStats) => r.uniqueFunders) || 1
    const xScale = d3
      .scaleLinear()
      .domain([0, maxFunders])
      .range([padL, W - padR])

    // Header labels
    svg
      .append('text')
      .attr('x', padL - 8)
      .attr('y', 20)
      .attr('text-anchor', 'end')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text('Policy Organization')

    svg
      .append('text')
      .attr('x', W - padR)
      .attr('y', 20)
      .attr('text-anchor', 'end')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text('Unique Funders')

    // Category colors
    const catColors: Record<string, string> = {
      'Think Tank/Policy Org': '#4daf4a',
      'AI Safety/Alignment': '#377eb8',
      'Ethics/Bias/Rights': '#999999',
    }

    recipientStats.forEach((r, i) => {
      const y = padTop + i * (barH + gap)
      const barColor = catColors[r.category] || '#666'

      // Independence indicator (inverse of top funder share)
      const independence = 1 - r.topFunderShare
      const indColor = independence > 0.7 ? '#22c55e' : independence > 0.4 ? '#eab308' : '#ef4444'

      // Label
      svg
        .append('text')
        .attr('x', padL - 8)
        .attr('y', y + barH / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#333')
        .text(r.name.length > 30 ? r.name.slice(0, 28) + '...' : r.name)

      // Category dot
      svg
        .append('circle')
        .attr('cx', padL - 10 - r.name.slice(0, 30).length * 5.5)
        .attr('cy', y + barH / 2)
        .attr('r', 4)
        .attr('fill', barColor)

      // Bar
      const barWidth = xScale(r.uniqueFunders) - padL
      const rect = svg
        .append('rect')
        .attr('x', padL)
        .attr('y', y + 4)
        .attr('width', barWidth)
        .attr('height', barH - 8)
        .attr('rx', 3)
        .attr('fill', barColor)
        .attr('opacity', 0.6)
        .style('cursor', 'pointer')
        .node()

      if (rect) {
        rect.addEventListener('mouseenter', (e: MouseEvent) => {
          showTooltip(
            e,
            `<strong>${r.name}</strong><br>
            ${r.uniqueFunders} unique funders<br>
            Top funder: ${r.topFunder} (${Math.round(r.topFunderShare * 100)}%)<br>
            <em style="font-size:9px;color:#888">Click for full list</em>`,
          )
        })
        rect.addEventListener('mouseleave', () => hideTooltip())
        rect.addEventListener('click', (e: MouseEvent) => {
          hideTooltip()
          setSelectedRecipient({ recipient: r, x: e.clientX, y: e.clientY })
        })
      }

      // Independence indicator circle
      svg
        .append('circle')
        .attr('cx', xScale(r.uniqueFunders) + 8)
        .attr('cy', y + barH / 2)
        .attr('r', 5)
        .attr('fill', indColor)
        .attr('opacity', 0.8)

      // Count label
      svg
        .append('text')
        .attr('x', xScale(r.uniqueFunders) + 18)
        .attr('y', y + barH / 2)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#666')
        .text(r.uniqueFunders)
    })

    // Legend
    const legendY = H - 15
    svg.append('circle').attr('cx', padL).attr('cy', legendY).attr('r', 5).attr('fill', '#22c55e')
    svg
      .append('text')
      .attr('x', padL + 10)
      .attr('y', legendY)
      .attr('dominant-baseline', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text('Diverse (no single funder >30%)')

    svg
      .append('circle')
      .attr('cx', padL + 180)
      .attr('cy', legendY)
      .attr('r', 5)
      .attr('fill', '#eab308')
    svg
      .append('text')
      .attr('x', padL + 190)
      .attr('y', legendY)
      .attr('dominant-baseline', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text('Moderate')

    svg
      .append('circle')
      .attr('cx', padL + 280)
      .attr('cy', legendY)
      .attr('r', 5)
      .attr('fill', '#ef4444')
    svg
      .append('text')
      .attr('x', padL + 290)
      .attr('y', legendY)
      .attr('dominant-baseline', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text('Concentrated (>60%)')
  }, [edges, showTooltip, hideTooltip])

  return (
    <>
      <div ref={ref} />
      {selectedRecipient && <DetailCardModal detail={selectedRecipient} onClose={() => setSelectedRecipient(null)} />}
    </>
  )
}
