import { useEffect, useRef } from 'react'

// d3 loaded from CDN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

interface FunderYear {
  funder: string
  funder_category: string
  year: number
  count: number
  total_usd: number
}

interface Props {
  funderByYear: FunderYear[]
  funders: Array<{ name: string; investments: number }>
  showTooltip: (evt: MouseEvent, html: string) => void
  hideTooltip: () => void
}

export function FunderTimingHeatmap({ funderByYear, funders, showTooltip, hideTooltip }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || funderByYear.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    // Get top 15 funders
    const topFunders = funders.slice(0, 15).map((f) => f.name)
    const topFunderSet = new Set(topFunders)

    // Filter to top funders and recent years
    const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
    const filtered = funderByYear.filter((f) => topFunderSet.has(f.funder) && years.includes(f.year))

    // Build lookup
    const dataMap = new Map<string, FunderYear>()
    filtered.forEach((f) => {
      dataMap.set(`${f.funder}|||${f.year}`, f)
    })

    const W = container.clientWidth || 660
    const cellW = 50
    const cellH = 24
    const padL = 200
    const padTop = 40
    const H = topFunders.length * cellH + padTop + 20

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    // Find max count for color scale
    const maxCount = d3.max(filtered, (d: FunderYear) => d.count) || 1
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, maxCount])

    // Year labels (column headers)
    years.forEach((year, j) => {
      svg
        .append('text')
        .attr('x', padL + j * cellW + cellW / 2)
        .attr('y', padTop - 10)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#666')
        .text(year)
    })

    // Funder labels (row labels)
    topFunders.forEach((funder, i) => {
      const y = padTop + i * cellH

      svg
        .append('text')
        .attr('x', padL - 8)
        .attr('y', y + cellH / 2 + 1)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#555')
        .text(funder.length > 28 ? funder.slice(0, 26) + '...' : funder)

      // Cells for each year
      years.forEach((year, j) => {
        const data = dataMap.get(`${funder}|||${year}`)
        const count = data?.count || 0

        const cell = svg
          .append('rect')
          .attr('x', padL + j * cellW)
          .attr('y', y)
          .attr('width', cellW - 2)
          .attr('height', cellH - 2)
          .attr('rx', 3)
          .attr('fill', count > 0 ? colorScale(count) : '#f5f5f5')
          .style('cursor', count > 0 ? 'pointer' : 'default')
          .node()

        if (cell && count > 0) {
          cell.addEventListener('mouseenter', (e: MouseEvent) => {
            showTooltip(
              e,
              `<strong>${funder}</strong><br>
              ${year}: ${count} investments`,
            )
          })
          cell.addEventListener('mouseleave', () => hideTooltip())
        }

        // Show count in cell if > 0
        if (count > 0) {
          svg
            .append('text')
            .attr('x', padL + j * cellW + cellW / 2 - 1)
            .attr('y', y + cellH / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-family', "'DM Mono', monospace")
            .attr('font-size', 9)
            .attr('fill', count > maxCount * 0.5 ? '#fff' : '#333')
            .attr('pointer-events', 'none')
            .text(count)
        }
      })
    })

    // Legend
    const legendX = padL
    const legendY = H - 10

    svg
      .append('text')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 8)
      .attr('fill', '#666')
      .text('Investments:')

    const legendSteps = [1, Math.round(maxCount / 3), Math.round((maxCount * 2) / 3), maxCount]
    legendSteps.forEach((val, i) => {
      svg
        .append('rect')
        .attr('x', legendX + 70 + i * 35)
        .attr('y', legendY - 10)
        .attr('width', 12)
        .attr('height', 12)
        .attr('rx', 2)
        .attr('fill', colorScale(val))

      svg
        .append('text')
        .attr('x', legendX + 70 + i * 35 + 16)
        .attr('y', legendY)
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 8)
        .attr('fill', '#666')
        .text(val)
    })
  }, [funderByYear, funders, showTooltip, hideTooltip])

  return <div ref={ref} />
}
