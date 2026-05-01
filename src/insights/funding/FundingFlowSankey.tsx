import { useEffect, useRef, useState } from 'react'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'

// d3 loaded from CDN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

interface Flow {
  funder: string
  funder_category: string
  recipient_category: string
  count: number
  total_usd: number
}

interface FundingEdge {
  funder: string
  recipient: string
  amount_usd: number | null
  year: number | null
  citation: string | null
  source_url?: string | null
  source_title?: string | null
  funder_category: string
  recipient_category: string
}

interface Props {
  flows: Flow[]
  funders: Array<{ name: string; investments: number; category: string }>
  edges: FundingEdge[]
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

function formatUSD(amount: number | null): string {
  if (!amount) return '—'
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(0)}K`
  return `$${amount.toFixed(0)}`
}

interface SelectedFlow {
  funder: string
  recipientCategory: string
  edges: FundingEdge[]
}

function FlowDetailCard({ flow, onClose }: { flow: SelectedFlow; onClose: () => void }) {
  const sortedEdges = [...flow.edges].sort((a, b) => (b.amount_usd || 0) - (a.amount_usd || 0))

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[10vh] px-4"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-[600px] w-full max-h-[70vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-5 pb-3 border-b border-[#eee]">
          <div>
            <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#888] mb-1">Funding Flow</div>
            <div className="font-serif text-[18px] font-medium">{flow.funder}</div>
            <div className="font-mono text-[11px] text-[#666] mt-0.5">
              → {flow.recipientCategory} ({flow.edges.length} investments)
            </div>
          </div>
          <button onClick={onClose} className="font-mono text-[18px] text-[#999] hover:text-[#333] px-2 -mr-2">
            ×
          </button>
        </div>

        {/* Edge list */}
        <div className="overflow-y-auto flex-1 p-4">
          <div className="space-y-3">
            {sortedEdges.map((edge, i) => (
              <div key={i} className="bg-[#f8f7f5] rounded-md p-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="font-mono text-[12px] font-medium text-[#333] flex-1">
                    {edge.recipient}
                  </div>
                  <div className="font-mono text-[11px] text-[#666] shrink-0">
                    {edge.year && <span className="mr-2">{edge.year}</span>}
                    {formatUSD(edge.amount_usd)}
                  </div>
                </div>
                {(edge.citation || edge.source_url) && (
                  <div className="mt-2">
                    {edge.citation && (
                      <div className="font-mono text-[10px] text-[#888] leading-relaxed line-clamp-2 mb-1">
                        {edge.citation}
                      </div>
                    )}
                    {edge.source_url && (
                      <a
                        href={edge.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[9px] text-[#2563eb] hover:underline bg-[#f0f4ff] px-1.5 py-0.5 rounded mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {edge.source_title || (() => {
                          try {
                            return new URL(edge.source_url).hostname.replace('www.', '')
                          } catch {
                            return 'Source'
                          }
                        })()}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pt-3 border-t border-[#eee] bg-[#faf9f7]">
          <div className="font-mono text-[10px] text-[#888]">
            Total: {formatUSD(flow.edges.reduce((sum, e) => sum + (e.amount_usd || 0), 0))} across {flow.edges.length} investments
          </div>
        </div>
      </div>
    </div>
  )
}

export function FundingFlowSankey({ flows, funders, edges }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [selectedFlow, setSelectedFlow] = useState<SelectedFlow | null>(null)

  useEffect(() => {
    if (!ref.current || flows.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    // Get top 12 funders by investment count
    const topFunders = funders.slice(0, 12).map((f) => f.name)
    const topFunderSet = new Set(topFunders)

    // Filter flows to only include top funders
    const filteredFlows = flows.filter((f) => topFunderSet.has(f.funder))

    // Get all recipient categories that appear
    const recipientCategories = [...new Set(filteredFlows.map((f) => f.recipient_category))].filter(
      (c) => c !== 'Unknown',
    )

    // Build nodes
    const funderNodes = topFunders.map((name) => ({ id: `funder:${name}`, name, type: 'funder' }))
    const categoryNodes = recipientCategories.map((cat) => ({ id: `cat:${cat}`, name: cat, type: 'category' }))
    const nodes = [...funderNodes, ...categoryNodes]
    const nodeIdSet = new Set(nodes.map((n) => n.id))

    // Build links - use string IDs to match nodeId()
    const links = filteredFlows
      .filter((f) => f.recipient_category !== 'Unknown')
      .map((f) => ({
        source: `funder:${f.funder}`,
        target: `cat:${f.recipient_category}`,
        value: f.count,
        funder: f.funder,
        category: f.recipient_category,
      }))
      .filter((l) => l.value > 0 && nodeIdSet.has(l.source) && nodeIdSet.has(l.target))

    if (links.length === 0) return

    const W = container.clientWidth || 700
    const H = 580
    const margin = { top: 20, right: 200, bottom: 80, left: 200 }

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    // Sankey generator
    const sankeyGenerator = sankey<{ id: string; name: string; type: string }, { source: string; target: string; value: number }>()
      .nodeId((d) => d.id)
      .nodeWidth(15)
      .nodePadding(12)
      .extent([
        [margin.left, margin.top],
        [W - margin.right, H - margin.bottom],
      ])

    const { nodes: sankeyNodes, links: sankeyLinks } = sankeyGenerator({
      nodes: nodes.map((d) => ({ ...d })),
      links: links.map((d) => ({ ...d })),
    })

    // Draw links
    const linkGroup = svg.append('g').attr('fill', 'none').attr('stroke-opacity', 0.4)

    linkGroup
      .selectAll('path')
      .data(sankeyLinks)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d: { target: { name: string } }) => CATEGORY_COLORS[d.target.name] || '#999')
      .attr('stroke-width', (d: { width: number }) => Math.max(1, d.width))
      .style('cursor', 'pointer')
      .on('mouseenter', function (this: SVGPathElement, evt: MouseEvent, d: { source: { name: string }; target: { name: string }; value: number }) {
        d3.select(this).attr('stroke-opacity', 0.7)
        const tooltip = d3.select(container).select('.tooltip')
        tooltip
          .style('opacity', 1)
          .html(`<strong>${d.source.name}</strong> → ${d.target.name}<br>${d.value} investments<br><em style="font-size:9px;color:#888">Click for details</em>`)
          .style('left', evt.offsetX + 10 + 'px')
          .style('top', evt.offsetY - 10 + 'px')
      })
      .on('mouseleave', function (this: SVGPathElement) {
        d3.select(this).attr('stroke-opacity', 0.4)
        d3.select(container).select('.tooltip').style('opacity', 0)
      })
      .on('click', function (_evt: MouseEvent, d: { source: { name: string }; target: { name: string } }) {
        // Find edges matching this flow
        const flowEdges = edges.filter(
          (e) => e.funder === d.source.name && e.recipient_category === d.target.name
        )
        setSelectedFlow({
          funder: d.source.name,
          recipientCategory: d.target.name,
          edges: flowEdges,
        })
      })

    // Draw nodes
    const nodeGroup = svg.append('g')

    nodeGroup
      .selectAll('rect')
      .data(sankeyNodes)
      .join('rect')
      .attr('x', (d: { x0: number }) => d.x0)
      .attr('y', (d: { y0: number }) => d.y0)
      .attr('height', (d: { y1: number; y0: number }) => Math.max(1, d.y1 - d.y0))
      .attr('width', (d: { x1: number; x0: number }) => d.x1 - d.x0)
      .attr('fill', (d: { type: string; name: string }) =>
        d.type === 'category' ? CATEGORY_COLORS[d.name] || '#999' : '#555',
      )
      .attr('rx', 2)

    // Labels - with text wrapping for long names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sankeyNodes.forEach((d: any) => {
      const isLeft = d.type === 'funder'
      const x = isLeft ? (d.x0 ?? 0) - 8 : (d.x1 ?? 0) + 8
      const y = ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2
      const name = d.name

      // Wrap long names to multiple lines
      const maxChars = 22
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

        const lineHeight = 11
        const startY = y - ((lines.length - 1) * lineHeight) / 2

        lines.forEach((line, i) => {
          svg
            .append('text')
            .attr('x', x)
            .attr('y', startY + i * lineHeight)
            .attr('dy', '0.35em')
            .attr('text-anchor', isLeft ? 'end' : 'start')
            .attr('font-family', "'DM Mono', monospace")
            .attr('font-size', 10)
            .attr('fill', '#333')
            .text(line)
        })
      } else {
        svg
          .append('text')
          .attr('x', x)
          .attr('y', y)
          .attr('dy', '0.35em')
          .attr('text-anchor', isLeft ? 'end' : 'start')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 10)
          .attr('fill', '#333')
          .text(name)
      }
    })

    // Legend for recipient categories - two rows to fit all
    const shortLabels: Record<string, string> = {
      'AI Safety/Alignment': 'AI Safety',
      'Think Tank/Policy Org': 'Think Tank',
      'Government/Agency': 'Government',
      'Infrastructure & Compute': 'Infra/Compute',
      'Deployers & Platforms': 'Deployers',
      'VC/Capital/Philanthropy': 'VC/Philanthropy',
      'Ethics/Bias/Rights': 'Ethics/Rights',
      'Labor/Civil Society': 'Labor/Civil',
      'Media/Journalism': 'Media',
    }

    // Split categories into two rows
    const midpoint = Math.ceil(recipientCategories.length / 2)
    const row1 = recipientCategories.slice(0, midpoint)
    const row2 = recipientCategories.slice(midpoint)

    const legendStartX = 20
    const legendY1 = H - 38
    const legendY2 = H - 20

    svg
      .append('text')
      .attr('x', legendStartX)
      .attr('y', legendY1 - 12)
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text('Recipient category:')

    // Row 1
    let legendX = legendStartX
    row1.forEach((cat) => {
      svg
        .append('rect')
        .attr('x', legendX)
        .attr('y', legendY1 - 8)
        .attr('width', 10)
        .attr('height', 10)
        .attr('rx', 2)
        .attr('fill', CATEGORY_COLORS[cat] || '#999')

      const label = shortLabels[cat] || (cat.length > 14 ? cat.slice(0, 12) + '..' : cat)
      const text = svg
        .append('text')
        .attr('x', legendX + 14)
        .attr('y', legendY1)
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#888')
        .text(label)
        .node()

      legendX += (text?.getComputedTextLength() || 60) + 20
    })

    // Row 2
    legendX = legendStartX
    row2.forEach((cat) => {
      svg
        .append('rect')
        .attr('x', legendX)
        .attr('y', legendY2 - 8)
        .attr('width', 10)
        .attr('height', 10)
        .attr('rx', 2)
        .attr('fill', CATEGORY_COLORS[cat] || '#999')

      const label = shortLabels[cat] || (cat.length > 14 ? cat.slice(0, 12) + '..' : cat)
      const text = svg
        .append('text')
        .attr('x', legendX + 14)
        .attr('y', legendY2)
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#888')
        .text(label)
        .node()

      legendX += (text?.getComputedTextLength() || 60) + 20
    })

    // Tooltip div
    d3.select(container)
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', 'white')
      .style('border', '1px solid #ccc')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-family', "'DM Mono', monospace")
      .style('font-size', '11px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 10)
  }, [flows, funders, edges])

  return (
    <>
      <div ref={ref} style={{ position: 'relative' }} />
      {selectedFlow && <FlowDetailCard flow={selectedFlow} onClose={() => setSelectedFlow(null)} />}
    </>
  )
}
