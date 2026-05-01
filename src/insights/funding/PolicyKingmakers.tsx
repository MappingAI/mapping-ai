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

interface FunderStats {
  name: string
  category: string
  orgCount: number
  grantCount: number
  recipientCategories: string[]
  recipients: string[]
}

interface DetailCard {
  funder: FunderStats
}

const FUNDER_CATEGORY_COLORS: Record<string, string> = {
  'VC/Capital/Philanthropy': '#a65628',
  'Government/Agency': '#984ea3',
  'Deployers & Platforms': '#8da0cb',
  'Frontier Lab': '#e41a1c',
  'AI Safety/Alignment': '#377eb8',
  'Infrastructure & Compute': '#fc8d62',
  'Think Tank/Policy Org': '#4daf4a',
  Investor: '#ff7f00',
  Executive: '#66c2a5',
  Researcher: '#e78ac3',
  Academic: '#ffd92f',
  Unknown: '#cccccc',
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
      <div className="bg-white rounded-lg shadow-xl max-w-[420px] w-full overflow-hidden">
        <div className="flex justify-between items-start p-4 pb-2 border-b border-[#eee]">
          <div>
            <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#888] mb-1">
              Policy Org Reach
            </div>
            <div className="font-serif text-[16px] font-medium">{detail.funder.name}</div>
            <div className="font-mono text-[10px] text-[#888] mt-1">{detail.funder.category}</div>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[18px] text-[#999] hover:text-[#333] px-2 -mr-2"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          <div className="font-mono text-[10px] text-[#888] mb-2">
            Funds {detail.funder.orgCount} policy organizations ({detail.funder.grantCount} grants)
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {detail.funder.recipients.map((r, i) => (
              <div key={i} className="font-mono text-[11px] text-[#333]">
                {r}
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 pt-2 border-t border-[#eee] bg-[#faf9f7]">
          <div className="font-mono text-[9px] text-[#888]">
            Recipient categories: {detail.funder.recipientCategories.join(', ')}
          </div>
        </div>
      </div>
    </div>
  )
}

export function PolicyKingmakers({ edges, showTooltip, hideTooltip }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [selectedFunder, setSelectedFunder] = useState<DetailCard | null>(null)

  useEffect(() => {
    if (!ref.current || edges.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    // Filter to policy-relevant recipient categories
    const policyCategories = ['Think Tank/Policy Org', 'AI Safety/Alignment', 'Ethics/Bias/Rights']
    const policyEdges = edges.filter((e) => policyCategories.includes(e.recipient_category))

    // Aggregate by funder
    const byFunder = d3.group(policyEdges, (e: FundingEdge) => e.funder) as Map<string, FundingEdge[]>
    const funderStats: FunderStats[] = Array.from(byFunder.entries())
      .map(([name, items]) => {
        const uniqueRecipients = [...new Set(items.map((e) => e.recipient))]
        const recipientCategories = [...new Set(items.map((e) => e.recipient_category))]
        return {
          name,
          category: items[0]!.funder_category,
          orgCount: uniqueRecipients.length,
          grantCount: items.length,
          recipientCategories,
          recipients: uniqueRecipients,
        }
      })
      .filter((f) => f.orgCount >= 2) // Only funders backing 2+ orgs
      .sort((a, b) => b.orgCount - a.orgCount)
      .slice(0, 15)

    if (funderStats.length === 0) return

    // Calculate cumulative share for power law annotation
    const totalOrgs = new Set(policyEdges.map((e) => e.recipient)).size
    const top5OrgReach = funderStats.slice(0, 5).reduce((sum, f) => sum + f.orgCount, 0)
    const top5Share = Math.round((top5OrgReach / (totalOrgs * 1.0)) * 100)

    const W = container.clientWidth || 660
    const barH = 24
    const gap = 5
    const padL = 240
    const padR = 50
    const padTop = 35
    const annotationH = 35
    const H = funderStats.length * (barH + gap) + padTop + annotationH

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H)

    const maxOrgs = funderStats[0]?.orgCount || 1
    const xScale = d3
      .scaleLinear()
      .domain([0, maxOrgs])
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
      .text('Funder')

    svg
      .append('text')
      .attr('x', W - padR)
      .attr('y', 18)
      .attr('text-anchor', 'end')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text('Policy Orgs Funded →')

    funderStats.forEach((f, i) => {
      const y = padTop + i * (barH + gap)
      const barColor = FUNDER_CATEGORY_COLORS[f.category] || '#888'

      // Category indicator
      svg
        .append('rect')
        .attr('x', 4)
        .attr('y', y + 4)
        .attr('width', 4)
        .attr('height', barH - 8)
        .attr('rx', 2)
        .attr('fill', barColor)

      // Label
      const displayName = f.name.length > 34 ? f.name.slice(0, 32) + '...' : f.name
      svg
        .append('text')
        .attr('x', padL - 8)
        .attr('y', y + barH / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#333')
        .text(displayName)

      // Bar
      const barWidth = xScale(f.orgCount) - padL
      const rect = svg
        .append('rect')
        .attr('x', padL)
        .attr('y', y + 4)
        .attr('width', barWidth)
        .attr('height', barH - 8)
        .attr('rx', 3)
        .attr('fill', barColor)
        .attr('opacity', 0.7)
        .style('cursor', 'pointer')
        .node()

      if (rect) {
        rect.addEventListener('mouseenter', (e: MouseEvent) => {
          showTooltip(
            e,
            `<strong>${f.name}</strong><br>
            ${f.category}<br>
            ${f.orgCount} policy orgs · ${f.grantCount} grants<br>
            <em style="font-size:9px;color:#888">Click for full list</em>`
          )
        })
        rect.addEventListener('mouseleave', () => hideTooltip())
        rect.addEventListener('click', () => {
          hideTooltip()
          setSelectedFunder({ funder: f })
        })
      }

      // Count label
      svg
        .append('text')
        .attr('x', xScale(f.orgCount) + 6)
        .attr('y', y + barH / 2)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#666')
        .text(f.orgCount)
    })

    // Power law annotation
    const annotationY = padTop + funderStats.length * (barH + gap) + 12
    svg
      .append('text')
      .attr('x', W / 2)
      .attr('y', annotationY)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 10)
      .attr('fill', '#666')
      .text(`Top 5 funders have connections to ${top5Share}%+ of policy orgs (${top5OrgReach} connections to ${totalOrgs} orgs)`)
  }, [edges, showTooltip, hideTooltip])

  return (
    <>
      <div ref={ref} />
      {selectedFunder && (
        <DetailCardModal detail={selectedFunder} onClose={() => setSelectedFunder(null)} />
      )}
    </>
  )
}
