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
            <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#888] mb-1">Policy Org Reach</div>
            <div className="font-serif text-[16px] font-medium">{detail.funder.name}</div>
            <div className="font-mono text-[10px] text-[#888] mt-1">{detail.funder.category}</div>
          </div>
          <button onClick={onClose} className="font-mono text-[18px] text-[#999] hover:text-[#333] px-2 -mr-2">
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

    const W = Math.max(container.clientWidth || 660, 540)
    const barH = 28
    const gap = 4
    const padL = 290
    const padR = 45
    const padTop = 35
    const legendH = 90
    const H = funderStats.length * (barH + gap) + padTop + legendH

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

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

      // Label - wrap long names to two lines
      // Special handling: "(formerly ...)" always goes on its own line
      const maxChars = 38
      const name = f.name
      const formerlyMatch = name.match(/^(.+?)(\s*\(formerly.+\))$/)

      if (formerlyMatch) {
        // Split at "(formerly" to put it on second line
        const lines = [formerlyMatch[1]!.trim(), formerlyMatch[2]!.trim()]
        const lineHeight = 10
        const startY = y + barH / 2 - lineHeight / 2

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
      } else if (name.length > maxChars) {
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
            <em style="font-size:9px;color:#888">Click for full list</em>`,
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

    // Legend - dynamically show all categories used in the data
    const usedCategories = [...new Set(funderStats.map((f) => f.category))]
    const shortLabels: Record<string, string> = {
      'VC/Capital/Philanthropy': 'VC/Philanthropy',
      'Think Tank/Policy Org': 'Think Tank',
      'AI Safety/Alignment': 'AI Safety',
      'Government/Agency': 'Government',
      'Deployers & Platforms': 'Deployers',
      'Infrastructure & Compute': 'Infrastructure',
    }

    const legendY = padTop + funderStats.length * (barH + gap) + 30
    const midpoint = Math.ceil(usedCategories.length / 2)
    const row1 = usedCategories.slice(0, midpoint)
    const row2 = usedCategories.slice(midpoint)
    const legendStartX = 20
    const itemWidth = 110

    svg
      .append('text')
      .attr('x', legendStartX)
      .attr('y', legendY)
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text('Funder type:')

    // Row 1
    row1.forEach((cat, i) => {
      const x = legendStartX + 70 + i * itemWidth
      svg
        .append('rect')
        .attr('x', x)
        .attr('y', legendY - 8)
        .attr('width', 10)
        .attr('height', 10)
        .attr('rx', 2)
        .attr('fill', FUNDER_CATEGORY_COLORS[cat] || '#ccc')
      svg
        .append('text')
        .attr('x', x + 14)
        .attr('y', legendY)
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#888')
        .text(shortLabels[cat] || cat)
    })

    // Row 2 (if needed)
    if (row2.length > 0) {
      const legendY2 = legendY + 16
      row2.forEach((cat, i) => {
        const x = legendStartX + 70 + i * itemWidth
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
    }

    // Power law annotation - position below legend rows
    const annotationY = legendY + (row2.length > 0 ? 40 : 20)
    svg
      .append('text')
      .attr('x', W / 2)
      .attr('y', annotationY)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 10)
      .attr('fill', '#666')
      .text(
        `Top 5 funders have connections to ${top5Share}%+ of policy orgs (${top5OrgReach} connections to ${totalOrgs} orgs)`,
      )
  }, [edges, showTooltip, hideTooltip])

  return (
    <>
      <div ref={ref} />
      {selectedFunder && <DetailCardModal detail={selectedFunder} onClose={() => setSelectedFunder(null)} />}
    </>
  )
}
