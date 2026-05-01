import { useEffect, useRef } from 'react'

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

interface Props {
  flows: Flow[]
  funders: Array<{ name: string; investments: number; category: string }>
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

export function FundingFlowSankey({ flows, funders }: Props) {
  const ref = useRef<HTMLDivElement>(null)

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
    const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]))

    // Build links
    const links = filteredFlows
      .filter((f) => f.recipient_category !== 'Unknown')
      .map((f) => ({
        source: nodeIndex.get(`funder:${f.funder}`) ?? 0,
        target: nodeIndex.get(`cat:${f.recipient_category}`) ?? 0,
        value: f.count,
        funder: f.funder,
        category: f.recipient_category,
      }))
      .filter((l) => l.value > 0)

    if (links.length === 0) return

    const W = container.clientWidth || 700
    const H = 500
    const margin = { top: 20, right: 180, bottom: 20, left: 180 }

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    // Sankey generator
    const sankey = d3
      .sankey()
      .nodeId((d: { id: string }) => d.id)
      .nodeWidth(15)
      .nodePadding(12)
      .extent([
        [margin.left, margin.top],
        [W - margin.right, H - margin.bottom],
      ])

    const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
      nodes: nodes.map((d) => ({ ...d })),
      links: links.map((d) => ({ ...d })),
    })

    // Draw links
    const linkGroup = svg.append('g').attr('fill', 'none').attr('stroke-opacity', 0.4)

    linkGroup
      .selectAll('path')
      .data(sankeyLinks)
      .join('path')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('stroke', (d: { target: { name: string } }) => CATEGORY_COLORS[d.target.name] || '#999')
      .attr('stroke-width', (d: { width: number }) => Math.max(1, d.width))
      .style('cursor', 'pointer')
      .on('mouseenter', function (this: SVGPathElement, evt: MouseEvent, d: { source: { name: string }; target: { name: string }; value: number }) {
        d3.select(this).attr('stroke-opacity', 0.7)
        const tooltip = d3.select(container).select('.tooltip')
        tooltip
          .style('opacity', 1)
          .html(`<strong>${d.source.name}</strong> → ${d.target.name}<br>${d.value} investments`)
          .style('left', evt.offsetX + 10 + 'px')
          .style('top', evt.offsetY - 10 + 'px')
      })
      .on('mouseleave', function (this: SVGPathElement) {
        d3.select(this).attr('stroke-opacity', 0.4)
        d3.select(container).select('.tooltip').style('opacity', 0)
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

    // Labels
    nodeGroup
      .selectAll('text')
      .data(sankeyNodes)
      .join('text')
      .attr('x', (d: { x0: number; x1: number; type: string }) => (d.type === 'funder' ? d.x0 - 6 : d.x1 + 6))
      .attr('y', (d: { y0: number; y1: number }) => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: { type: string }) => (d.type === 'funder' ? 'end' : 'start'))
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 10)
      .attr('fill', '#333')
      .text((d: { name: string }) => (d.name.length > 25 ? d.name.slice(0, 23) + '...' : d.name))

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
  }, [flows, funders])

  return <div ref={ref} style={{ position: 'relative' }} />
}
