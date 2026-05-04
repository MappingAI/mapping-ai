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

interface FunderSegment {
  name: string
  category: string
  count: number
  share: number
  x0: number
  x1: number
}

interface RecipientData {
  name: string
  category: string
  totalGrants: number
  topFunderShare: number
  topFunderName: string
  uniqueFunderCategories: number
  funders: FunderSegment[]
}

interface DetailCard {
  recipient: RecipientData
}

const FUNDER_CATEGORY_COLORS: Record<string, string> = {
  'VC/Capital/Philanthropy': '#a65628',
  'Government/Agency': '#984ea3',
  'Deployers & Platforms': '#8da0cb',
  'Frontier Lab': '#e41a1c',
  'AI Safety/Alignment': '#377eb8',
  'Infrastructure & Compute': '#fc8d62',
  'Think Tank/Policy Org': '#4daf4a',
  'Ethics/Bias/Rights': '#e7298a',
  'Labor/Civil Society': '#66a61e',
  'Media/Journalism': '#e6ab02',
  Investor: '#ff7f00',
  Executive: '#66c2a5',
  Researcher: '#e78ac3',
  Organizer: '#7570b3',
  Academic: '#ffd92f',
  Unknown: '#cccccc',
}

function DetailCardModal({ detail, onClose }: { detail: DetailCard; onClose: () => void }) {
  const riskLevel =
    detail.recipient.topFunderShare > 0.6 ? 'High' : detail.recipient.topFunderShare > 0.4 ? 'Moderate' : 'Low'
  const riskColor =
    detail.recipient.topFunderShare > 0.6 ? '#ef4444' : detail.recipient.topFunderShare > 0.4 ? '#eab308' : '#22c55e'

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[10vh] px-4"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-[420px] w-full overflow-hidden">
        <div className="flex justify-between items-start p-4 pb-2 border-b border-[#eee]">
          <div>
            <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#888] mb-1">Funding Breakdown</div>
            <div className="font-serif text-[16px] font-medium">{detail.recipient.name}</div>
          </div>
          <button onClick={onClose} className="font-mono text-[18px] text-[#999] hover:text-[#333] px-2 -mr-2">
            ×
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-block px-2 py-0.5 rounded text-[10px] font-mono text-white"
              style={{ background: riskColor }}
            >
              {riskLevel} Concentration
            </span>
            <span className="font-mono text-[10px] text-[#888]">
              Top funder: {Math.round(detail.recipient.topFunderShare * 100)}%
            </span>
          </div>

          {detail.recipient.funders.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ background: FUNDER_CATEGORY_COLORS[f.category] || '#ccc' }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[11px] text-[#333] truncate">{f.name}</div>
                <div className="font-mono text-[9px] text-[#888]">{f.category}</div>
              </div>
              <div className="font-mono text-[10px] text-[#666] flex-shrink-0">{Math.round(f.share * 100)}%</div>
            </div>
          ))}
        </div>

        <div className="p-3 pt-2 border-t border-[#eee] bg-[#faf9f7]">
          <div className="font-mono text-[9px] text-[#888]">
            {detail.recipient.funders.length} unique funders · {detail.recipient.uniqueFunderCategories} funder
            categories · {detail.recipient.totalGrants} total grants
          </div>
        </div>
      </div>
    </div>
  )
}

export function FundingFragility({ edges, showTooltip, hideTooltip }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [selectedRecipient, setSelectedRecipient] = useState<DetailCard | null>(null)

  useEffect(() => {
    if (!ref.current || edges.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    // Filter to policy/advocacy orgs only (exclude AI Safety/Alignment research orgs)
    const policyCategories = ['Think Tank/Policy Org', 'Ethics/Bias/Rights']
    const policyEdges = edges.filter((e) => policyCategories.includes(e.recipient_category))

    // Aggregate by recipient
    const byRecipient = d3.group(policyEdges, (e: FundingEdge) => e.recipient) as Map<string, FundingEdge[]>
    const recipientData: RecipientData[] = Array.from(byRecipient.entries())
      .map(([name, items]) => {
        const funderRollup = d3.rollup(
          items,
          (v: FundingEdge[]) => ({
            count: v.length,
            category: v[0]!.funder_category,
          }),
          (e: FundingEdge) => e.funder,
        ) as Map<string, { count: number; category: string }>

        const totalGrants = items.length
        const funders = Array.from(funderRollup.entries())
          .map(([funderName, data]) => ({
            name: funderName,
            category: data.category,
            count: data.count,
            share: data.count / totalGrants,
            x0: 0,
            x1: 0,
          }))
          .sort((a, b) => {
            // Show known categories before Unknown
            if (a.category === 'Unknown' && b.category !== 'Unknown') return 1
            if (a.category !== 'Unknown' && b.category === 'Unknown') return -1
            // Then sort by count
            return b.count - a.count
          })

        // Calculate x positions for stacked bar
        let cumulative = 0
        funders.forEach((f) => {
          f.x0 = cumulative
          cumulative += f.share
          f.x1 = cumulative
        })

        const uniqueFunderCategories = new Set(funders.map((f) => f.category)).size

        return {
          name,
          category: items[0]!.recipient_category,
          totalGrants,
          topFunderShare: funders[0]?.share || 0,
          topFunderName: funders[0]?.name || 'Unknown',
          uniqueFunderCategories,
          funders,
        }
      })
      .filter((r) => r.funders.length >= 2) // Only show orgs with 2+ funders

    // Select most compelling from each concentration tier: 1 high, 4 med, 4 low
    const high = recipientData
      .filter((r) => r.topFunderShare > 0.6)
      .sort((a, b) => b.topFunderShare - a.topFunderShare) // Highest concentration first
      .slice(0, 1) // Only 1 high-concentration policy org exists
    const moderate = recipientData
      .filter((r) => r.topFunderShare > 0.4 && r.topFunderShare <= 0.6)
      .sort((a, b) => b.totalGrants - a.totalGrants) // Most grants = most representative
      .slice(0, 4)
    const low = recipientData
      .filter((r) => r.topFunderShare <= 0.4)
      .sort((a, b) => b.funders.length - a.funders.length) // Most funders = most diversified
      .slice(0, 4)

    // Combine and sort by concentration (high to low) for display
    const selectedRecipients = [...high, ...moderate, ...low].sort(
      (a, b) => b.topFunderShare - a.topFunderShare,
    )

    if (selectedRecipients.length === 0) return

    const W = container.clientWidth || 660
    const barH = 22
    const gap = 5
    const padL = 220
    const padR = 15
    const padTop = 45
    const legendH = 90
    const H = selectedRecipients.length * (barH + gap) + padTop + legendH

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    const xScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([padL, W - padR])

    // Header
    svg
      .append('text')
      .attr('x', padL - 8)
      .attr('y', 18)
      .attr('text-anchor', 'end')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text('Policy Organization')

    svg
      .append('text')
      .attr('x', W - padR)
      .attr('y', 18)
      .attr('text-anchor', 'end')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text('Funder Share →')

    // Axis ticks
    ;[0, 0.25, 0.5, 0.75, 1].forEach((v) => {
      svg
        .append('line')
        .attr('x1', xScale(v))
        .attr('x2', xScale(v))
        .attr('y1', 28)
        .attr('y2', padTop + selectedRecipients.length * (barH + gap) - 5)
        .attr('stroke', v === 0.5 ? '#ddd' : '#f0f0f0')
        .attr('stroke-dasharray', v === 0.5 ? '4,4' : 'none')

      if (v > 0) {
        svg
          .append('text')
          .attr('x', xScale(v))
          .attr('y', 36)
          .attr('text-anchor', 'middle')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 8)
          .attr('fill', '#aaa')
          .text(`${v * 100}%`)
      }
    })

    // Risk indicator colors
    const getRiskColor = (share: number) => {
      if (share > 0.6) return '#ef4444'
      if (share > 0.4) return '#eab308'
      return '#22c55e'
    }

    selectedRecipients.forEach((r, i) => {
      const y = padTop + i * (barH + gap)

      // Risk indicator
      svg
        .append('circle')
        .attr('cx', 8)
        .attr('cy', y + barH / 2)
        .attr('r', 4)
        .attr('fill', getRiskColor(r.topFunderShare))

      // Label - wrap long names to two lines
      const maxChars = 28
      const name = r.name
      if (name.length > maxChars) {
        const words = name.split(' ')
        const lines: string[] = []
        let currentLine = ''

        words.forEach((word: string) => {
          if ((currentLine + ' ' + word).trim().length <= maxChars) {
            currentLine = (currentLine + ' ' + word).trim()
          } else {
            if (currentLine) lines.push(currentLine)
            currentLine = word
          }
        })
        if (currentLine) lines.push(currentLine)

        // Limit to 2 lines
        if (lines.length > 2) {
          lines[1] = lines[1]!.slice(0, maxChars - 3) + '...'
          lines.length = 2
        }

        const lineHeight = 10
        const startY = y + barH / 2 - ((lines.length - 1) * lineHeight) / 2

        lines.forEach((line, j) => {
          svg
            .append('text')
            .attr('x', padL - 8)
            .attr('y', startY + j * lineHeight)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .attr('font-family', "'DM Mono', monospace")
            .attr('font-size', 10)
            .attr('fill', '#333')
            .text(line)
        })
      } else {
        svg
          .append('text')
          .attr('x', padL - 8)
          .attr('y', y + barH / 2)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 10)
          .attr('fill', '#333')
          .text(name)
      }

      // Stacked bar segments
      r.funders.forEach((f) => {
        const segmentColor = FUNDER_CATEGORY_COLORS[f.category] || '#ccc'
        const rect = svg
          .append('rect')
          .attr('x', xScale(f.x0))
          .attr('y', y + 2)
          .attr('width', Math.max(1, xScale(f.x1) - xScale(f.x0) - 1))
          .attr('height', barH - 4)
          .attr('fill', segmentColor)
          .attr('opacity', 0.85)
          .style('cursor', 'pointer')
          .node()

        if (rect) {
          rect.addEventListener('mouseenter', (e: MouseEvent) => {
            showTooltip(
              e,
              `<strong>${f.name}</strong><br>
              ${f.category}<br>
              ${Math.round(f.share * 100)}% of funding (${f.count} grants)`,
            )
          })
          rect.addEventListener('mouseleave', () => hideTooltip())
          rect.addEventListener('click', () => {
            hideTooltip()
            setSelectedRecipient({ recipient: r })
          })
        }
      })
    })

    // Legend
    const legendY = padTop + selectedRecipients.length * (barH + gap) + 28

    // Risk legend
    svg
      .append('text')
      .attr('x', 8)
      .attr('y', legendY)
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text('Concentration:')
    ;[
      { color: '#ef4444', label: 'High (>60%)' },
      { color: '#eab308', label: 'Moderate' },
      { color: '#22c55e', label: 'Low (<40%)' },
    ].forEach((item, i) => {
      const x = 90 + i * 95
      svg
        .append('circle')
        .attr('cx', x)
        .attr('cy', legendY - 3)
        .attr('r', 4)
        .attr('fill', item.color)
      svg
        .append('text')
        .attr('x', x + 8)
        .attr('y', legendY)
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#888')
        .text(item.label)
    })

    // Funder category legend - dynamically show all categories used
    const usedCategories = [...new Set(selectedRecipients.flatMap((r) => r.funders.map((f) => f.category)))]
    const shortLabels: Record<string, string> = {
      'VC/Capital/Philanthropy': 'VC/Philanthropy',
      'Think Tank/Policy Org': 'Think Tank',
      'AI Safety/Alignment': 'AI Safety',
      'Government/Agency': 'Government',
      'Deployers & Platforms': 'Deployers',
      'Infrastructure & Compute': 'Infrastructure',
    }

    const legendY2 = legendY + 18
    const midpoint = Math.ceil(usedCategories.length / 2)
    const row1 = usedCategories.slice(0, midpoint)
    const row2 = usedCategories.slice(midpoint)
    const legendStartX = 8
    const itemWidth = 105

    svg
      .append('text')
      .attr('x', legendStartX)
      .attr('y', legendY2)
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text('Funder type:')

    // Row 1
    row1.forEach((cat, i) => {
      const x = legendStartX + 72 + i * itemWidth
      svg
        .append('rect')
        .attr('x', x)
        .attr('y', legendY2 - 8)
        .attr('width', 10)
        .attr('height', 10)
        .attr('rx', 2)
        .attr('fill', FUNDER_CATEGORY_COLORS[cat] || '#ccc')
      svg
        .append('text')
        .attr('x', x + 14)
        .attr('y', legendY2)
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#888')
        .text(shortLabels[cat] || cat)
    })

    // Row 2 (if needed)
    if (row2.length > 0) {
      const legendY3 = legendY2 + 16
      row2.forEach((cat, i) => {
        const x = legendStartX + 72 + i * itemWidth
        svg
          .append('rect')
          .attr('x', x)
          .attr('y', legendY3 - 8)
          .attr('width', 10)
          .attr('height', 10)
          .attr('rx', 2)
          .attr('fill', FUNDER_CATEGORY_COLORS[cat] || '#ccc')
        svg
          .append('text')
          .attr('x', x + 14)
          .attr('y', legendY3)
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 9)
          .attr('fill', '#888')
          .text(shortLabels[cat] || cat)
      })
    }
  }, [edges, showTooltip, hideTooltip])

  return (
    <>
      <div ref={ref} />
      {selectedRecipient && <DetailCardModal detail={selectedRecipient} onClose={() => setSelectedRecipient(null)} />}
    </>
  )
}
