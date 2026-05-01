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

interface CategoryCount {
  category: string
  count: number
}

interface OrgData {
  name: string
  recipientCategory: string
  uniqueFunders: number
  uniqueCategories: number
  categoryCounts: CategoryCount[]
  funders: Array<{ name: string; category: string }>
  isDiverse: boolean
  isSingleCategory: boolean
}

interface DetailCard {
  org: OrgData
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
              Funder Diversity
            </div>
            <div className="font-serif text-[16px] font-medium">{detail.org.name}</div>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[18px] text-[#999] hover:text-[#333] px-2 -mr-2"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono text-white ${
                detail.org.isDiverse ? 'bg-[#22c55e]' : detail.org.isSingleCategory ? 'bg-[#ef4444]' : 'bg-[#eab308]'
              }`}
            >
              {detail.org.isDiverse ? 'Diverse' : detail.org.isSingleCategory ? 'Single Category' : 'Limited'}
            </span>
            <span className="font-mono text-[10px] text-[#888]">
              {detail.org.uniqueCategories} funder categories
            </span>
          </div>

          <div className="space-y-3">
            {detail.org.categoryCounts.map((cc, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ background: FUNDER_CATEGORY_COLORS[cc.category] || '#ccc' }}
                  />
                  <span className="font-mono text-[10px] text-[#888]">
                    {cc.category} ({cc.count} {cc.count === 1 ? 'funder' : 'funders'})
                  </span>
                </div>
                <div className="pl-5 space-y-0.5">
                  {detail.org.funders
                    .filter((f) => f.category === cc.category)
                    .map((f, j) => (
                      <div key={j} className="font-mono text-[11px] text-[#333]">
                        {f.name}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 pt-2 border-t border-[#eee] bg-[#faf9f7]">
          <div className="font-mono text-[9px] text-[#888]">
            {detail.org.uniqueFunders} unique funders across {detail.org.uniqueCategories} categories
          </div>
        </div>
      </div>
    </div>
  )
}

export function FunderDiversity({ edges, showTooltip, hideTooltip }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [selectedOrg, setSelectedOrg] = useState<DetailCard | null>(null)

  useEffect(() => {
    if (!ref.current || edges.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    // Filter to policy-relevant recipient categories
    const policyCategories = ['Think Tank/Policy Org', 'AI Safety/Alignment', 'Ethics/Bias/Rights']
    const policyEdges = edges.filter((e) => policyCategories.includes(e.recipient_category))

    // Aggregate by recipient
    const byRecipient = d3.group(policyEdges, (e: FundingEdge) => e.recipient) as Map<string, FundingEdge[]>
    const orgData: OrgData[] = Array.from(byRecipient.entries())
      .map(([name, items]) => {
        const funders = [...new Map(items.map((e) => [e.funder, { name: e.funder, category: e.funder_category }])).values()]
        const categoryCounts = Array.from(
          d3.rollup(funders, (v: Array<{ name: string; category: string }>) => v.length, (f: { name: string; category: string }) => f.category) as Map<string, number>
        )
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)

        const uniqueCategories = categoryCounts.length
        const isDiverse = uniqueCategories >= 3
        const isSingleCategory = funders.length >= 2 && uniqueCategories === 1

        return {
          name,
          recipientCategory: items[0]!.recipient_category,
          uniqueFunders: funders.length,
          uniqueCategories,
          categoryCounts,
          funders,
          isDiverse,
          isSingleCategory,
        }
      })
      .filter((o) => o.uniqueFunders >= 2) // Only orgs with 2+ funders

    // Separate into diverse and single-category
    const diverseOrgs = orgData.filter((o) => o.isDiverse).sort((a, b) => b.uniqueCategories - a.uniqueCategories)
    const singleCategoryOrgs = orgData.filter((o) => o.isSingleCategory).sort((a, b) => b.uniqueFunders - a.uniqueFunders)

    const maxToShow = 8
    const displayDiverse = diverseOrgs.slice(0, maxToShow)
    const displaySingle = singleCategoryOrgs.slice(0, maxToShow)

    if (displayDiverse.length === 0 && displaySingle.length === 0) return

    const W = container.clientWidth || 660
    const colW = (W - 40) / 2
    const rowH = 32
    const padTop = 45
    const maxRows = Math.max(displayDiverse.length, displaySingle.length)
    const legendH = 55
    const H = maxRows * rowH + padTop + legendH

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H)

    // Column headers
    svg
      .append('text')
      .attr('x', 10)
      .attr('y', 18)
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 10)
      .attr('fill', '#22c55e')
      .attr('font-weight', 'bold')
      .text(`Diverse Funding (3+ categories)`)

    svg
      .append('text')
      .attr('x', 10)
      .attr('y', 32)
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text(`${diverseOrgs.length} organizations`)

    svg
      .append('text')
      .attr('x', colW + 30)
      .attr('y', 18)
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 10)
      .attr('fill', '#ef4444')
      .attr('font-weight', 'bold')
      .text(`Single-Category Funding`)

    svg
      .append('text')
      .attr('x', colW + 30)
      .attr('y', 32)
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text(`${singleCategoryOrgs.length} organizations (all funders same type)`)

    // Divider line
    svg
      .append('line')
      .attr('x1', colW + 15)
      .attr('x2', colW + 15)
      .attr('y1', padTop - 5)
      .attr('y2', H - 30)
      .attr('stroke', '#eee')
      .attr('stroke-width', 1)

    // Draw diverse orgs
    displayDiverse.forEach((o, i) => {
      const y = padTop + i * rowH
      const displayName = o.name.length > 28 ? o.name.slice(0, 26) + '...' : o.name

      // Category dots
      const dotSpacing = 12
      o.categoryCounts.slice(0, 5).forEach((cc, j) => {
        svg
          .append('circle')
          .attr('cx', 14 + j * dotSpacing)
          .attr('cy', y + rowH / 2)
          .attr('r', 4)
          .attr('fill', FUNDER_CATEGORY_COLORS[cc.category] || '#ccc')
      })

      // Org name
      const text = svg
        .append('text')
        .attr('x', 20 + o.categoryCounts.slice(0, 5).length * dotSpacing)
        .attr('y', y + rowH / 2)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#333')
        .style('cursor', 'pointer')
        .text(displayName)
        .node()

      if (text) {
        text.addEventListener('mouseenter', (e: MouseEvent) => {
          showTooltip(
            e,
            `<strong>${o.name}</strong><br>
            ${o.uniqueFunders} funders across ${o.uniqueCategories} categories<br>
            <em style="font-size:9px;color:#888">Click for breakdown</em>`
          )
        })
        text.addEventListener('mouseleave', () => hideTooltip())
        text.addEventListener('click', () => {
          hideTooltip()
          setSelectedOrg({ org: o })
        })
      }

      // Count badge
      svg
        .append('text')
        .attr('x', colW - 5)
        .attr('y', y + rowH / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#888')
        .text(`${o.uniqueCategories} types`)
    })

    // Draw single-category orgs
    displaySingle.forEach((o, i) => {
      const y = padTop + i * rowH
      const displayName = o.name.length > 28 ? o.name.slice(0, 26) + '...' : o.name
      const dominantCategory = o.categoryCounts[0]?.category || 'Unknown'

      // Category indicator
      svg
        .append('rect')
        .attr('x', colW + 24)
        .attr('y', y + rowH / 2 - 6)
        .attr('width', 12)
        .attr('height', 12)
        .attr('rx', 2)
        .attr('fill', FUNDER_CATEGORY_COLORS[dominantCategory] || '#ccc')

      // Org name
      const text = svg
        .append('text')
        .attr('x', colW + 42)
        .attr('y', y + rowH / 2)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#333')
        .style('cursor', 'pointer')
        .text(displayName)
        .node()

      if (text) {
        text.addEventListener('mouseenter', (e: MouseEvent) => {
          const shortCat: Record<string, string> = {
            'VC/Capital/Philanthropy': 'VC/Philanthropy',
          }
          showTooltip(
            e,
            `<strong>${o.name}</strong><br>
            All ${o.uniqueFunders} funders are ${shortCat[dominantCategory] || dominantCategory}<br>
            <em style="font-size:9px;color:#888">Click for list</em>`
          )
        })
        text.addEventListener('mouseleave', () => hideTooltip())
        text.addEventListener('click', () => {
          hideTooltip()
          setSelectedOrg({ org: o })
        })
      }

      // Funder count
      svg
        .append('text')
        .attr('x', W - 10)
        .attr('y', y + rowH / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#888')
        .text(`${o.uniqueFunders} funders`)
    })

    // Legend - show all funder categories used
    const usedCategories = [
      ...new Set(orgData.flatMap((o) => o.funders.map((f) => f.category))),
    ]
    const shortLabels: Record<string, string> = {
      'VC/Capital/Philanthropy': 'VC/Philanthropy',
      'Think Tank/Policy Org': 'Think Tank',
      'AI Safety/Alignment': 'AI Safety',
      'Government/Agency': 'Government',
      'Deployers & Platforms': 'Deployers',
      'Infrastructure & Compute': 'Infrastructure',
    }

    const legendY = maxRows * rowH + padTop + 12
    const midpoint = Math.ceil(usedCategories.length / 2)
    const row1 = usedCategories.slice(0, midpoint)
    const row2 = usedCategories.slice(midpoint)
    const legendStartX = 10
    const itemWidth = 105

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
      const x = legendStartX + 72 + i * itemWidth
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
    }

    // Summary annotation
    const annotationY = H - 8
    svg
      .append('text')
      .attr('x', W / 2)
      .attr('y', annotationY)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#888')
      .text(
        `${diverseOrgs.length} orgs with diverse funding vs ${singleCategoryOrgs.length} funded by single funder type`
      )
  }, [edges, showTooltip, hideTooltip])

  return (
    <>
      <div ref={ref} />
      {selectedOrg && <DetailCardModal detail={selectedOrg} onClose={() => setSelectedOrg(null)} />}
    </>
  )
}
