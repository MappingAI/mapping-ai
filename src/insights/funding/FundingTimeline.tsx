import { useEffect, useRef, useState } from 'react'

// d3 loaded from CDN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

interface YearData {
  year: number
  count: number
  total_usd: number
  by_recipient_category: Record<string, { count: number; total_usd: number }>
}

interface Props {
  byYear: YearData[]
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
  'Infrastructure & Compute': '#fc8d62',
  'Deployers & Platforms': '#8da0cb',
  Other: '#999999',
}

const MAIN_CATEGORIES = [
  'Frontier Lab',
  'AI Safety/Alignment',
  'Academic',
  'Government/Agency',
  'Think Tank/Policy Org',
  'VC/Capital/Philanthropy',
  'Infrastructure & Compute',
]

export function FundingTimeline({ byYear, showTooltip, hideTooltip }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [metric, setMetric] = useState<'count' | 'amount'>('count')

  useEffect(() => {
    if (!ref.current || byYear.length === 0) return
    const container = ref.current
    const svgContainer = container.querySelector('.chart-area')
    if (!svgContainer) return
    svgContainer.innerHTML = ''

    // Filter to recent years
    const filteredYears = byYear.filter((y) => y.year >= 2015 && y.year <= 2026)

    // Prepare stacked data
    const stackData = filteredYears.map((y) => {
      const row: Record<string, number> = { year: y.year }
      MAIN_CATEGORIES.forEach((cat) => {
        const val = y.by_recipient_category[cat]
        row[cat] = metric === 'count' ? val?.count || 0 : val?.total_usd || 0
      })
      // Sum remaining as "Other"
      let other = 0
      Object.entries(y.by_recipient_category).forEach(([cat, val]) => {
        if (!MAIN_CATEGORIES.includes(cat)) {
          other += metric === 'count' ? val.count : val.total_usd
        }
      })
      row['Other'] = other
      return row
    })

    const categories = [...MAIN_CATEGORIES, 'Other']

    const W = (svgContainer as HTMLElement).clientWidth || 660
    const H = 320
    const margin = { top: 20, right: 20, bottom: 50, left: 60 }

    const svg = d3
      .select(svgContainer)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H)

    const xScale = d3
      .scaleLinear()
      .domain([2015, 2026])
      .range([margin.left, W - margin.right])

    const stack = d3.stack().keys(categories)
    const series = stack(stackData)

    const yMax = d3.max(series, (s: Array<[number, number]>) => d3.max(s, (d: [number, number]) => d[1])) || 1
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([H - margin.bottom, margin.top])

    const area = d3
      .area()
      .x((d: { data: { year: number } }) => xScale(d.data.year))
      .y0((d: [number, number]) => yScale(d[0]))
      .y1((d: [number, number]) => yScale(d[1]))
      .curve(d3.curveMonotoneX)

    // Draw areas
    svg
      .selectAll('path.area')
      .data(series)
      .join('path')
      .attr('class', 'area')
      .attr('fill', (d: { key: string }) => CATEGORY_COLORS[d.key] || '#999')
      .attr('opacity', 0.7)
      .attr('d', area)
      .style('cursor', 'pointer')
      .on('mouseenter', function (this: SVGPathElement, evt: MouseEvent, d: { key: string }) {
        d3.select(this).attr('opacity', 0.9)
        const yearData = filteredYears.find(
          (y) => Math.abs(xScale(y.year) - evt.offsetX) < 20
        )
        if (yearData) {
          const catData = yearData.by_recipient_category[d.key]
          const val = metric === 'count'
            ? `${catData?.count || 0} investments`
            : `$${((catData?.total_usd || 0) / 1e9).toFixed(1)}B`
          showTooltip(evt, `<strong>${d.key}</strong><br>${yearData.year}: ${val}`)
        }
      })
      .on('mousemove', function (this: SVGPathElement, evt: MouseEvent, d: { key: string }) {
        const yearData = filteredYears.find(
          (y) => Math.abs(xScale(y.year) - evt.offsetX) < 20
        )
        if (yearData) {
          const catData = yearData.by_recipient_category[d.key]
          const val = metric === 'count'
            ? `${catData?.count || 0} investments`
            : `$${((catData?.total_usd || 0) / 1e9).toFixed(1)}B`
          showTooltip(evt, `<strong>${d.key}</strong><br>${yearData.year}: ${val}`)
        }
      })
      .on('mouseleave', function (this: SVGPathElement) {
        d3.select(this).attr('opacity', 0.7)
        hideTooltip()
      })

    // X axis
    svg
      .append('g')
      .attr('transform', `translate(0,${H - margin.bottom})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(6)
          .tickFormat((d: number) => String(d)),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call((g: any) => g.select('.domain').attr('stroke', '#ccc'))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call((g: any) => g.selectAll('.tick line').attr('stroke', '#ccc'))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call((g: any) =>
        g
          .selectAll('.tick text')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 10)
          .attr('fill', '#666'),
      )

    // Y axis
    const formatY = metric === 'count' ? (d: number) => d : (d: number) => `$${(d / 1e9).toFixed(0)}B`
    svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(formatY))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call((g: any) => g.select('.domain').attr('stroke', '#ccc'))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call((g: any) => g.selectAll('.tick line').attr('stroke', '#ccc'))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call((g: any) =>
        g
          .selectAll('.tick text')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 10)
          .attr('fill', '#666'),
      )

    // Y axis label
    svg
      .append('text')
      .attr('transform', `translate(${margin.left - 45},${H / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 10)
      .attr('fill', '#666')
      .text(metric === 'count' ? 'Funding events' : 'Total USD')

    // Legend
    const legendY = H - 12
    let legendX = margin.left

    categories.slice(0, 6).forEach((cat) => {
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
        .text(cat.length > 10 ? cat.slice(0, 8) + '..' : cat)

      legendX += (text.node()?.getComputedTextLength() || 50) + 20
    })
  }, [byYear, metric, showTooltip, hideTooltip])

  return (
    <div ref={ref}>
      <div className="flex gap-2 mb-3">
        <button
          className={`px-3 py-1 text-xs font-mono rounded ${
            metric === 'count' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
          onClick={() => setMetric('count')}
        >
          By Count
        </button>
        <button
          className={`px-3 py-1 text-xs font-mono rounded ${
            metric === 'amount' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
          onClick={() => setMetric('amount')}
        >
          By Amount
        </button>
      </div>
      <div className="chart-area" />
    </div>
  )
}
