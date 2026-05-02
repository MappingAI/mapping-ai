import { useEffect, useRef } from 'react'

// d3 loaded from CDN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

interface Funder {
  name: string
  category: string
  investments: number
  mean_recipient_stance: number | null
}

interface Props {
  funders: Funder[]
  showTooltip: (evt: MouseEvent, html: string) => void
  hideTooltip: () => void
}

const STANCE_LABELS = ['Accelerate', 'Light-touch', 'Targeted', 'Moderate', 'Restrictive', 'Precautionary']

export function FunderStanceChart({ funders, showTooltip, hideTooltip }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || funders.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    // Filter to funders with stance data and enough investments
    const filteredFunders = funders
      .filter((f) => f.mean_recipient_stance !== null && f.investments >= 5)
      .sort((a, b) => (a.mean_recipient_stance || 0) - (b.mean_recipient_stance || 0))
      .slice(0, 15)

    if (filteredFunders.length === 0) return

    const W = container.clientWidth || 660
    const barH = 28
    const gap = 6
    const padL = 200
    const padR = 80
    const dataHeight = filteredFunders.length * (barH + gap) + 10
    const axisAreaHeight = 80
    const H = dataHeight + axisAreaHeight

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    const xScale = d3
      .scaleLinear()
      .domain([1, 6])
      .range([padL, W - padR])

    // Axis line
    const axisY = dataHeight + 15
    svg
      .append('line')
      .attr('x1', padL)
      .attr('x2', W - padR)
      .attr('y1', axisY)
      .attr('y2', axisY)
      .attr('stroke', '#ccc')

    // Tick marks and labels
    STANCE_LABELS.forEach((label, i) => {
      const v = i + 1
      svg
        .append('line')
        .attr('x1', xScale(v))
        .attr('x2', xScale(v))
        .attr('y1', axisY)
        .attr('y2', axisY + 6)
        .attr('stroke', '#ccc')
      svg
        .append('text')
        .attr('transform', `translate(${xScale(v)}, ${axisY + 18}) rotate(-30)`)
        .attr('text-anchor', 'end')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#888')
        .text(label)
    })

    // Funders
    filteredFunders.forEach((f, i) => {
      const y = i * (barH + gap) + 10
      const stance = f.mean_recipient_stance || 3

      // Label
      svg
        .append('text')
        .attr('x', padL - 8)
        .attr('y', y + barH / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#555')
        .text(f.name.length > 28 ? f.name.slice(0, 26) + '...' : f.name)

      // Dot
      const circle = svg
        .append('circle')
        .attr('cx', xScale(stance))
        .attr('cy', y + barH / 2)
        .attr('r', 8)
        .attr('fill', '#2563eb')
        .style('cursor', 'pointer')
        .node()

      if (circle) {
        circle.addEventListener('mouseenter', (e: MouseEvent) => {
          showTooltip(
            e,
            `<strong>${f.name}</strong><br>
            Mean recipient stance: ${stance.toFixed(2)}<br>
            Investments: ${f.investments}`,
          )
        })
        circle.addEventListener('mouseleave', () => hideTooltip())
      }

      // Value label
      svg
        .append('text')
        .attr('x', xScale(stance) + 12)
        .attr('y', y + barH / 2 - 10)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#666')
        .text(`${stance.toFixed(1)} (n=${f.investments})`)
    })
  }, [funders, showTooltip, hideTooltip])

  return <div ref={ref} />
}
