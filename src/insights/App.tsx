import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Navigation } from '../components/Navigation'
import { CrosspartisanViz } from './crosspartisan/CrosspartisanViz'

// d3 is loaded from a CDN <script> tag (see index.html) rather than imported as a module,
// so we don't have compile-time types for it. Treating it as `unknown` forces casts at
// every call site; the pragmatic boundary is to type it as the minimum surface we use.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface Entity {
  id: number
  name: string
  entity_type: string
  category: string
  location?: string
  funding_model?: string
  stance_score?: number | null
  timeline_score?: number | null
  risk_score?: number | null
  threat_models?: string
}

type ScoreKey = 'stance_score' | 'timeline_score' | 'risk_score'

interface Edge {
  source_id: number
  target_id: number
  relationship_type: string
  role?: string
}

interface MapData {
  people: Entity[]
  organizations: Entity[]
  resources: Entity[]
  edges?: Edge[]
  relationships?: Edge[]
  _meta?: { generated_at: string }
}

/* ────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────── */

const STANCE_LABELS = ['Accelerate', 'Light-touch', 'Targeted', 'Moderate', 'Restrictive', 'Precautionary']
const TIMELINE_LABELS = ['Already here', '2-3 years', '5-10 years', '10-25 years', '25+ years']
const RISK_LABELS = ['Overstated', 'Manageable', 'Serious', 'Catastrophic', 'Existential']

const TOC_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'belief-space', label: 'Beliefs' },
  { id: 'threat-models', label: 'Threat Models' },
  { id: 'network', label: 'Connectivity' },
  { id: 'crosspartisan', label: 'Crosspartisan' },
]

/* ────────────────────────────────────────────
   Tooltip - global ref approach
   ──────────────────────────────────────────── */

let tooltipRef: HTMLDivElement | null = null

function setTooltipRef(el: HTMLDivElement | null) {
  tooltipRef = el
}

function showTooltip(evt: MouseEvent, html: string) {
  if (!tooltipRef) return

  // Use clientX/clientY for fixed positioning (viewport-relative)
  const x = evt.clientX + 12
  const y = evt.clientY + 12

  tooltipRef.innerHTML = html
  tooltipRef.style.left = x + 'px'
  tooltipRef.style.top = y + 'px'
  tooltipRef.style.opacity = '1'
}

function hideTooltip() {
  if (!tooltipRef) return
  tooltipRef.style.opacity = '0'
}

/* ────────────────────────────────────────────
   Data Cleanup Utilities
   ──────────────────────────────────────────── */

function normalizeFundingModel(fm: string): string {
  if (!fm) return 'Unknown'
  const lower = fm.toLowerCase()
  if (lower.includes('philanthrop') || lower.includes('foundation') || lower.includes('grant')) return 'Philanthropic'
  if (lower.includes('venture') || lower.includes('vc') || lower === 'for-profit') return 'Venture/For-profit'
  if (lower.includes('government') || lower.includes('public') || lower.includes('federal')) return 'Government'
  if (lower.includes('member') || lower.includes('dues')) return 'Membership'
  if (lower.includes('university') || lower.includes('academic') || lower.includes('endowment')) return 'Academic'
  if (lower.includes('self') || lower.includes('bootstrap')) return 'Self-funded'
  if (lower.includes('pac') || lower.includes('super pac')) return 'Super PAC'
  return fm.length > 25 ? fm.slice(0, 22) + '...' : fm
}

/* ────────────────────────────────────────────
   Chart Components
   ──────────────────────────────────────────── */

function ChartAxisDistributions({ entities }: { entities: Entity[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || entities.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const W = container.clientWidth || 700
    const rowH = 22,
      gap = 3,
      sectionGap = 30
    const padL = 110,
      padR = 50,
      titleH = 18

    const axes: Array<{ name: string; labels: string[]; key: ScoreKey }> = [
      { name: 'Regulatory Stance', labels: STANCE_LABELS, key: 'stance_score' },
      { name: 'AGI Timeline', labels: TIMELINE_LABELS, key: 'timeline_score' },
      { name: 'AI Risk Level', labels: RISK_LABELS, key: 'risk_score' },
    ]

    let totalH = 0
    axes.forEach((ax) => {
      totalH += titleH + ax.labels.length * (rowH + gap) + sectionGap
    })
    totalH += 10

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${totalH}`)
      .attr('width', W)
      .attr('height', totalH)

    const maxCount = d3.max(
      axes.flatMap((ax) =>
        ax.labels.map((_: string, i: number) => entities.filter((e) => Math.round(e[ax.key] ?? 0) === i + 1).length),
      ),
    )
    const xScale = d3
      .scaleLinear()
      .domain([0, maxCount])
      .range([0, W - padL - padR])

    let yOffset = 0
    axes.forEach((ax) => {
      svg
        .append('text')
        .attr('x', 0)
        .attr('y', yOffset + 12)
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('font-weight', 500)
        .attr('fill', '#555')
        .text(ax.name)
      yOffset += titleH

      ax.labels.forEach((label: string, i: number) => {
        const count = entities.filter((e) => Math.round(e[ax.key] ?? 0) === i + 1).length
        const y = yOffset

        svg
          .append('text')
          .attr('x', padL - 8)
          .attr('y', y + rowH / 2 + 1)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 10)
          .attr('fill', '#666')
          .text(label)

        svg
          .append('rect')
          .attr('x', padL)
          .attr('y', y)
          .attr('width', xScale(count))
          .attr('height', rowH)
          .attr('rx', 3)
          .attr('fill', '#2563eb')
          .attr('opacity', 0.6)

        svg
          .append('text')
          .attr('x', padL + xScale(count) + 6)
          .attr('y', y + rowH / 2 + 1)
          .attr('dominant-baseline', 'middle')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 11)
          .attr('fill', '#1a1a1a')
          .text(count)

        yOffset += rowH + gap
      })
      yOffset += sectionGap - gap
    })
  }, [entities])

  return <div ref={ref} />
}

function ChartFundingStance({ orgs }: { orgs: Entity[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || orgs.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const orgsWithFunding = orgs
      .filter((o) => o.funding_model && o.stance_score != null)
      .map((o) => ({ ...o, funding_normalized: normalizeFundingModel(o.funding_model!) }))

    const byFunding = d3.group(orgsWithFunding, (d: Entity & { funding_normalized: string }) => d.funding_normalized)

    const stats = (Array.from(byFunding.entries()) as [string, Entity[]][])
      .filter(([, items]) => items.length >= 5)
      .map(([funding, items]) => ({
        funding,
        count: items.length,
        mean: d3.mean(items, (o: Entity) => o.stance_score),
        std: d3.deviation(items, (o: Entity) => o.stance_score) || 0,
      }))
      .sort((a: { mean: number }, b: { mean: number }) => a.mean - b.mean)

    const W = container.clientWidth || 660
    const barH = 28,
      gap = 6,
      padL = 180,
      padR = 80
    const dataHeight = stats.length * (barH + gap) + 10
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

    stats.forEach((s: { funding: string; count: number; mean: number; std: number }, i: number) => {
      const y = i * (barH + gap) + 10

      svg
        .append('text')
        .attr('x', padL - 8)
        .attr('y', y + barH / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#555')
        .text(s.funding)

      // Error bar (std dev)
      const errLeft = Math.max(1, s.mean - s.std)
      const errRight = Math.min(6, s.mean + s.std)
      svg
        .append('line')
        .attr('x1', xScale(errLeft))
        .attr('x2', xScale(errRight))
        .attr('y1', y + barH / 2)
        .attr('y2', y + barH / 2)
        .attr('stroke', '#2563eb')
        .attr('stroke-width', 2)
        .attr('opacity', 0.3)

      // Mean dot
      const circle = svg
        .append('circle')
        .attr('cx', xScale(s.mean))
        .attr('cy', y + barH / 2)
        .attr('r', 8)
        .attr('fill', '#2563eb')
        .style('cursor', 'pointer')
        .node()

      if (circle) {
        circle.addEventListener('mouseenter', (e: MouseEvent) => {
          showTooltip(
            e,
            `<strong>${s.funding}</strong><br>Mean: ${s.mean.toFixed(2)}<br>SD: ${s.std.toFixed(2)}<br>n=${s.count}`,
          )
        })
        circle.addEventListener('mouseleave', () => hideTooltip())
      }

      // Label
      svg
        .append('text')
        .attr('x', xScale(s.mean) + 12)
        .attr('y', y + barH / 2 - 10)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#666')
        .text(`${s.mean.toFixed(1)} (n=${s.count})`)
    })
  }, [orgs])

  return <div ref={ref} />
}

function ChartThreatFrequency({ entities }: { entities: Entity[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || entities.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const THREATS = [
      'Loss of control',
      'Existential risk',
      'Power concentration',
      'Labor displacement',
      'Economic inequality',
      'Democratic erosion',
      'Misinformation',
      'National security',
      'Bias/discrimination',
      'Privacy',
      'Cybersecurity',
      'Weapons proliferation',
      'Environmental',
      'Copyright/IP',
    ]

    const entitiesWithThreats = entities.filter((e) => e.threat_models)
    const counts: Record<string, number> = {}
    entitiesWithThreats.forEach((e) => {
      THREATS.forEach((t) => {
        if (e.threat_models?.includes(t)) counts[t] = (counts[t] || 0) + 1
      })
    })

    const sorted = THREATS.filter((t) => counts[t])
      .map((t) => ({ label: t, count: counts[t] || 0 }))
      .sort((a, b) => b.count - a.count)
    if (sorted.length === 0) return

    const W = container.clientWidth || 660
    const barH = 22,
      gap = 4,
      padL = 160,
      padR = 50,
      padTop = 45
    const H = sorted.length * (barH + gap) + padTop

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    const maxVal = sorted[0]?.count || 1
    const xScale = d3
      .scaleLinear()
      .domain([0, maxVal])
      .range([0, W - padL - padR])

    const technicalThreats = [
      'Loss of control',
      'Existential risk',
      'Weapons proliferation',
      'Cybersecurity',
      'National security',
    ]

    // Legend
    svg
      .append('rect')
      .attr('x', padL)
      .attr('y', 8)
      .attr('width', 12)
      .attr('height', 12)
      .attr('rx', 2)
      .attr('fill', '#1F78B4')
    svg
      .append('text')
      .attr('x', padL + 16)
      .attr('y', 17)
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#555')
      .text('Technical/x-risk')
    svg
      .append('rect')
      .attr('x', padL + 110)
      .attr('y', 8)
      .attr('width', 12)
      .attr('height', 12)
      .attr('rx', 2)
      .attr('fill', '#FF7F00')
    svg
      .append('text')
      .attr('x', padL + 126)
      .attr('y', 17)
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#555')
      .text('Societal/near-term')

    sorted.forEach((d, i) => {
      const y = padTop + i * (barH + gap)
      const isTechnical = technicalThreats.includes(d.label)

      svg
        .append('text')
        .attr('x', padL - 8)
        .attr('y', y + barH / 2 + 1)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#555')
        .text(d.label)

      svg
        .append('rect')
        .attr('x', padL)
        .attr('y', y)
        .attr('width', xScale(d.count))
        .attr('height', barH)
        .attr('rx', 3)
        .attr('fill', isTechnical ? '#1F78B4' : '#FF7F00')
        .attr('opacity', 0.65)
        .on('mousemove', (e: MouseEvent) =>
          showTooltip(
            e,
            `<strong>${d.label}</strong><br>${d.count} entities (${Math.round((d.count / entitiesWithThreats.length) * 100)}%)`,
          ),
        )
        .on('mouseleave', () => hideTooltip())

      svg
        .append('text')
        .attr('x', padL + xScale(d.count) + 6)
        .attr('y', y + barH / 2 + 1)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 11)
        .attr('fill', '#1a1a1a')
        .text(d.count)
    })
  }, [entities])

  return <div ref={ref} />
}

function ChartThreatCooccurrence({ entities }: { entities: Entity[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || entities.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const THREATS = [
      'Loss of control',
      'Existential risk',
      'Power concentration',
      'Labor displacement',
      'Economic inequality',
      'Democratic erosion',
      'Misinformation',
      'Bias/discrimination',
    ]

    const entitiesWithThreats = entities.filter((e) => e.threat_models)

    // Jaccard similarity
    const jaccard = (a: string, b: string) => {
      const setA = new Set(entitiesWithThreats.filter((e) => e.threat_models?.includes(a)).map((e) => e.id))
      const setB = new Set(entitiesWithThreats.filter((e) => e.threat_models?.includes(b)).map((e) => e.id))
      const intersection = [...setA].filter((x) => setB.has(x)).length
      const union = new Set([...setA, ...setB]).size
      return union === 0 ? 0 : intersection / union
    }

    const matrix = THREATS.map((a) => THREATS.map((b) => (a === b ? 1 : jaccard(a, b))))

    const cellSize = 52
    const labelPadLeft = 160
    const labelPadTop = 130
    const W = THREATS.length * cellSize + labelPadLeft
    const H = THREATS.length * cellSize + labelPadTop

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    const maxVal = d3.max(matrix.flat().filter((v: number) => v < 1))
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxVal])

    // Row labels
    THREATS.forEach((t, i) => {
      svg
        .append('text')
        .attr('x', labelPadLeft - 8)
        .attr('y', labelPadTop + i * cellSize + cellSize / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#555')
        .text(t)
    })

    // Column labels (rotated)
    THREATS.forEach((t, i) => {
      svg
        .append('text')
        .attr('transform', `translate(${labelPadLeft + i * cellSize + cellSize / 2}, ${labelPadTop - 10}) rotate(-50)`)
        .attr('text-anchor', 'start')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#555')
        .text(t)
    })

    // Upper triangle only
    matrix.forEach((row: number[], i: number) => {
      row.forEach((val: number, j: number) => {
        if (j <= i) return

        svg
          .append('rect')
          .attr('x', labelPadLeft + j * cellSize)
          .attr('y', labelPadTop + i * cellSize)
          .attr('width', cellSize - 2)
          .attr('height', cellSize - 2)
          .attr('fill', colorScale(val))
          .attr('rx', 3)
          .on('mousemove', (e: MouseEvent) =>
            showTooltip(e, `${THREATS[i]} + ${THREATS[j]}<br>Jaccard: <strong>${val.toFixed(2)}</strong>`),
          )
          .on('mouseleave', () => hideTooltip())

        svg
          .append('text')
          .attr('x', labelPadLeft + j * cellSize + cellSize / 2 - 1)
          .attr('y', labelPadTop + i * cellSize + cellSize / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 10)
          .attr('fill', val > 0.25 ? '#fff' : '#333')
          .text(val.toFixed(2))
      })
    })
  }, [entities])

  return <div ref={ref} />
}

function ChartCategoryMatrix({ edges, entities }: { edges: Edge[]; entities: Entity[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || edges.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const entityMap = new Map(entities.map((e) => [e.id, e]))
    const allCategories = [...new Set(entities.map((e) => e.category).filter(Boolean))]

    // Count total edges per category
    const catEdgeTotals: Record<string, number> = {}
    allCategories.forEach((c) => (catEdgeTotals[c] = 0))
    edges.forEach((e) => {
      const src = entityMap.get(e.source_id)
      const tgt = entityMap.get(e.target_id)
      if (src?.category) catEdgeTotals[src.category] = (catEdgeTotals[src.category] || 0) + 1
      if (tgt?.category) catEdgeTotals[tgt.category] = (catEdgeTotals[tgt.category] || 0) + 1
    })

    // Top 12 most connected
    const categories = Object.entries(catEdgeTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([cat]) => cat)
      .sort()

    const catIndex = new Map(categories.map((c, i) => [c, i]))

    // Build matrix
    const matrix = categories.map(() => categories.map(() => 0))
    edges.forEach((e) => {
      const src = entityMap.get(e.source_id)
      const tgt = entityMap.get(e.target_id)
      if (src?.category && tgt?.category) {
        const i = catIndex.get(src.category)
        const j = catIndex.get(tgt.category)
        if (i !== undefined && j !== undefined) {
          matrix[i]![j]!++
          if (i !== j) matrix[j]![i]!++
        }
      }
    })

    const shortLabels: Record<string, string> = {
      'AI Safety/Alignment': 'AI Safety',
      'Think Tank/Policy Org': 'Think Tank',
      'Government/Agency': 'Government',
      'VC/Capital/Philanthropy': 'VC/Capital',
      'Labor/Civil Society': 'Labor/Civil',
      'Ethics/Bias/Rights': 'Ethics/Rights',
      'Media/Journalism': 'Media',
      'Political Campaign/PAC': 'Political',
      'AI Infrastructure & Compute': 'AI Infra',
      'AI Deployers & Platforms': 'AI Platforms',
    }

    const cellSize = 45
    const labelPadLeft = 110
    const labelPadTop = 90
    const W = categories.length * cellSize + labelPadLeft
    const H = categories.length * cellSize + labelPadTop

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    const maxVal = d3.max(matrix.flat().filter((v: number) => v > 0))
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, Math.log10(maxVal + 1)])

    // Row labels
    categories.forEach((cat, i) => {
      const label = shortLabels[cat] || cat
      svg
        .append('text')
        .attr('x', labelPadLeft - 8)
        .attr('y', labelPadTop + i * cellSize + cellSize / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#555')
        .text(label.length > 14 ? label.slice(0, 12) + '...' : label)
    })

    // Column labels
    categories.forEach((cat, j) => {
      const label = shortLabels[cat] || cat
      svg
        .append('text')
        .attr('transform', `translate(${labelPadLeft + j * cellSize + cellSize / 2}, ${labelPadTop - 10}) rotate(-50)`)
        .attr('text-anchor', 'start')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#555')
        .text(label.length > 12 ? label.slice(0, 10) + '...' : label)
    })

    // Cells
    matrix.forEach((row: number[], i: number) => {
      row.forEach((val: number, j: number) => {
        svg
          .append('rect')
          .attr('x', labelPadLeft + j * cellSize)
          .attr('y', labelPadTop + i * cellSize)
          .attr('width', cellSize - 2)
          .attr('height', cellSize - 2)
          .attr('fill', val === 0 ? '#f5f5f5' : colorScale(Math.log10(val + 1)))
          .attr('rx', 3)
          .on('mousemove', (e: MouseEvent) =>
            showTooltip(e, `${categories[i]} ↔ ${categories[j]}<br><strong>${val} edges</strong>`),
          )
          .on('mouseleave', () => hideTooltip())
      })
    })
  }, [edges, entities])

  return <div ref={ref} />
}

/* ────────────────────────────────────────────
   Reusable Layout Components
   ──────────────────────────────────────────── */

function ChartContainer({ title, source, children }: { title: string; source: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#f8f7f5] rounded-lg p-6 my-8 overflow-hidden fade-in [&_svg]:w-full [&_svg]:block">
      <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-[#555] mb-4">{title}</div>
      {children}
      <div className="font-mono text-[9px] text-[#888] tracking-[0.04em] mt-3 text-right">{source}</div>
    </div>
  )
}

function Finding({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#faf8f4] border-l-[3px] border-[#2563eb] p-4 pr-5 rounded-r-md my-6 fade-in">
      <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#2563eb] mb-1.5">Finding</div>
      <p className="text-[15px] !mb-0 text-[#555]">{children}</p>
    </div>
  )
}

function SectionLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div id={id} className="font-mono text-[12px] font-medium tracking-[0.1em] uppercase text-[#888] mb-2 fade-in">
      {children}
    </div>
  )
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="mb-[1.1rem] text-[16.5px] fade-in">{children}</p>
}

/* ────────────────────────────────────────────
   TOC Sidebar
   ──────────────────────────────────────────── */

function TableOfContents({ activeId }: { activeId: string }) {
  return (
    <nav className="hidden min-[1100px]:block fixed top-1/2 -translate-y-1/2 w-[160px] left-8">
      {TOC_ITEMS.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`block font-mono text-[10px] tracking-[0.04em] no-underline py-[0.35rem] pl-3 border-l-2 transition-colors duration-150 leading-[1.4] hover:text-[#555] hover:no-underline ${
            activeId === item.id ? 'text-[#2563eb] border-[#2563eb]' : 'text-[#888] border-transparent'
          }`}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}

/* ────────────────────────────────────────────
   Main App Component
   ──────────────────────────────────────────── */

export function App() {
  const [data, setData] = useState<MapData | null>(null)
  const [activeSection, setActiveSection] = useState('overview')
  const activeSectionRef = useRef('overview')

  // Fetch data
  useEffect(() => {
    Promise.all([
      fetch('/map-data.json').then((r) => r.json()),
      fetch('/map-detail.json')
        .then((r) => r.json())
        .catch(() => ({})),
    ])
      .then(([mapData, detail]: [MapData, Record<string, Partial<Entity>>]) => {
        const all = [...(mapData.people || []), ...(mapData.organizations || []), ...(mapData.resources || [])]
        for (const entity of all) {
          const d = detail[String(entity.id)]
          if (d) Object.assign(entity, d)
        }
        setData(mapData)
      })
      .catch((err) => console.error('Failed to load data:', err))
  }, [])

  // Fade-in observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible')
        })
      },
      { threshold: 0.1 },
    )
    const elements = document.querySelectorAll('.fade-in')
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [data])

  // TOC scroll tracking
  const updateTOC = useCallback(() => {
    const scrollY = window.scrollY + 120
    let active = TOC_ITEMS[0]!.id
    TOC_ITEMS.forEach((item) => {
      const el = document.getElementById(item.id)
      if (el && el.offsetTop <= scrollY) active = item.id
    })
    if (active !== activeSectionRef.current) {
      activeSectionRef.current = active
      setActiveSection(active)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', updateTOC, { passive: true })
    updateTOC()
    return () => window.removeEventListener('scroll', updateTOC)
  }, [updateTOC])

  // Derived data - memoized to prevent chart re-renders on scroll
  const people = useMemo(() => data?.people || [], [data])
  const orgs = useMemo(() => data?.organizations || [], [data])
  const resources = useMemo(() => data?.resources || [], [data])
  const edges = useMemo(() => data?.relationships || data?.edges || [], [data])
  const allEntities = useMemo(() => [...people, ...orgs], [people, orgs])
  const allWithResources = useMemo(() => [...allEntities, ...resources], [allEntities, resources])

  const dataDate = useMemo(
    () =>
      data?._meta?.generated_at
        ? new Date(data._meta.generated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'April 2026',
    [data],
  )

  // Compute findings text
  const { maxStance, minStance } = useMemo(() => {
    const stanceCounts = STANCE_LABELS.map(
      (_, i) => allEntities.filter((e) => Math.round(e.stance_score || 0) === i + 1).length,
    )
    const maxIdx = stanceCounts.indexOf(Math.max(...stanceCounts))
    const minIdx = stanceCounts.indexOf(Math.min(...stanceCounts.filter((c) => c > 0)))
    return {
      maxStance: STANCE_LABELS[maxIdx] || 'Unknown',
      minStance: STANCE_LABELS[minIdx] || 'Unknown',
    }
  }, [allEntities])

  return (
    <>
      <style>{`
        .fade-in {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .fade-in.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <Navigation />
      <TableOfContents activeId={activeSection} />

      {/* Tooltip */}
      <div
        ref={setTooltipRef}
        className="fixed bg-white border border-[#bbb] rounded px-3 py-2 font-mono text-[11px] text-[#1a1a1a] pointer-events-none z-[9999] max-w-[280px] leading-[1.4]"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', opacity: 0, left: 0, top: 0 }}
      />

      {/* Article */}
      <article
        className="max-w-[760px] mx-auto font-serif text-[#1a1a1a] text-[17px] leading-[1.75]"
        style={{ padding: 'calc(3rem + 48px) 1.5rem 4rem' }}
      >
        {/* Header */}
        <div className="font-mono text-[11px] tracking-[0.12em] uppercase text-[#555] mb-3">Mapping AI Research</div>
        <h1 className="font-serif text-[32px] font-normal italic leading-[1.25] mb-4">
          Structure of the AI Governance Ecosystem
        </h1>
        <p className="font-serif text-[18px] text-[#555] leading-[1.6] mb-8">
          We mapped <span className="font-mono">{allWithResources.length || '—'}</span> entities in U.S. AI policy.
          Rather than claiming what percentage believes what, we focus on <em>structure</em>: how the ecosystem is
          organized, who connects to whom, and where the gaps lie.
        </p>

        {/* Stat row */}
        <div id="overview" className="flex gap-4 my-6 flex-wrap max-[600px]:flex-col">
          <div className="flex-1 min-w-[120px] bg-[#f8f7f5] rounded-md p-4 text-center">
            <div className="font-mono text-[26px] font-medium text-[#1a1a1a] leading-[1.2]">{people.length || '—'}</div>
            <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[#888] mt-1">People</div>
          </div>
          <div className="flex-1 min-w-[120px] bg-[#f8f7f5] rounded-md p-4 text-center">
            <div className="font-mono text-[26px] font-medium text-[#1a1a1a] leading-[1.2]">{orgs.length || '—'}</div>
            <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[#888] mt-1">Organizations</div>
          </div>
          <div className="flex-1 min-w-[120px] bg-[#f8f7f5] rounded-md p-4 text-center">
            <div className="font-mono text-[26px] font-medium text-[#1a1a1a] leading-[1.2]">
              {resources.length || '—'}
            </div>
            <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[#888] mt-1">Resources</div>
          </div>
          <div className="flex-1 min-w-[120px] bg-[#f8f7f5] rounded-md p-4 text-center">
            <div className="font-mono text-[26px] font-medium text-[#1a1a1a] leading-[1.2]">{edges.length || '—'}</div>
            <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[#888] mt-1">Relationships</div>
          </div>
        </div>

        <Para>
          This page presents structural analyses of the Mapping AI database. Our guiding principle: avoid selection bias
          by focusing on in-group comparisons rather than extrapolating to the broader population. We're interested in
          relational patterns—who clusters with whom, what beliefs travel together, which communities are bridged or
          siloed.
        </Para>

        <hr className="border-none border-t-[0.5px] border-[#bbb] my-10" />

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION 1: BELIEF SPACE                     */}
        {/* ═══════════════════════════════════════════ */}

        <SectionLabel id="belief-space">Insight 1</SectionLabel>
        <h2 className="font-serif text-[24px] font-normal leading-[1.3] mb-4 mt-0">The Belief Space</h2>

        <Para>
          We track three belief dimensions for people and organizations: <strong>regulatory stance</strong> (accelerate
          → precautionary), <strong>AGI timeline</strong> (already here → 25+ years), and <strong>AI risk level</strong>{' '}
          (overstated → existential). These form a three-dimensional "belief space" where entities can be positioned.
        </Para>

        <ChartContainer
          title="Belief axis distributions (people + orgs with data)"
          source="Horizontal bars show count at each level. Entities without data excluded."
        >
          <ChartAxisDistributions entities={allEntities} />
        </ChartContainer>

        <Para>
          The distributions reveal which positions are crowded and which are sparse. A heavily populated region suggests
          mainstream consensus; empty regions may indicate underrepresented perspectives or simply positions few people
          hold.
        </Para>

        <Finding>
          The belief space is unevenly populated. "{maxStance}" is the most common regulatory stance, while "{minStance}
          " is least represented. This concentration suggests either consensus or sampling bias—distinguishing between
          them requires external validation.
        </Finding>

        <h3 className="font-serif text-[18px] font-normal mt-8 mb-3">Funding model → ideology</h3>

        <Para>
          Does knowing how an organization is funded predict its regulatory stance? This isn't necessarily
          causal—funders may seek out aligned orgs, not shape them—but the correlation is structurally important.
        </Para>

        <ChartContainer
          title="Mean regulatory stance by funding model"
          source="Scale: 1 = Accelerate, 6 = Precautionary. Only funding models with 5+ orgs shown."
        >
          <ChartFundingStance orgs={orgs} />
        </ChartContainer>

        <Finding>
          Funding source is predictive of regulatory stance. Philanthropically-funded organizations skew more
          restrictive, while venture-backed organizations favor lighter regulation. This structural pattern holds
          regardless of whether funders actively influence grantees or simply select for aligned orgs.
        </Finding>

        <hr className="border-none border-t-[0.5px] border-[#bbb] my-10" />

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION 2: THREAT MODELS                    */}
        {/* ═══════════════════════════════════════════ */}

        <SectionLabel id="threat-models">Insight 2</SectionLabel>
        <h2 className="font-serif text-[24px] font-normal leading-[1.3] mb-4 mt-0">Threat Models & Key Concerns</h2>

        <Para>
          Entities identify which AI-related concerns they prioritize: loss of control, labor displacement, existential
          risk, democratic erosion, and more. These "threat models" reveal what problems different communities are
          trying to solve.
        </Para>

        <ChartContainer
          title="Most frequently cited concerns"
          source="Count of entities selecting each concern. Entities can select multiple."
        >
          <ChartThreatFrequency entities={allEntities} />
        </ChartContainer>

        <h3 className="font-serif text-[18px] font-normal mt-8 mb-3">Concern co-occurrence</h3>

        <Para>
          Which concerns travel together? If someone cites "loss of control," are they likely to also cite "existential
          risk"? The co-occurrence matrix reveals concern clusters—sets of worries that form coherent worldviews.
        </Para>

        <ChartContainer
          title="Threat model co-occurrence (Jaccard similarity)"
          source="Higher values = concerns frequently appear together. Upper triangle shown to avoid redundancy."
        >
          <ChartThreatCooccurrence entities={allEntities} />
        </ChartContainer>

        <Finding>
          Technical/x-risk concerns (loss of control, existential risk) cluster together, as do societal/near-term
          concerns (labor displacement, economic inequality). These two worldviews represent distinct communities with
          different policy priorities—and they rarely cite each other's concerns.
        </Finding>

        <hr className="border-none border-t-[0.5px] border-[#bbb] my-10" />

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION 3: CONNECTIVITY                     */}
        {/* ═══════════════════════════════════════════ */}

        <SectionLabel id="network">Insight 3</SectionLabel>
        <h2 className="font-serif text-[24px] font-normal leading-[1.3] mb-4 mt-0">Connectivity</h2>

        <Para>
          The database tracks <span className="font-mono">{edges.length || '—'}</span> relationships between entities:
          affiliations, collaborations, funding, citations, and more. How connected is each stakeholder category to
          others? A category with high external connectivity serves as a hub or bridge; one with low connectivity may be
          siloed.
        </Para>

        <ChartContainer
          title="Cross-category edge counts (who connects to whom)"
          source="Cell color = log₁₀(edges) between categories. Logarithmic scale shows relative connectivity."
        >
          <ChartCategoryMatrix edges={edges} entities={allWithResources} />
        </ChartContainer>

        <Finding>
          Government and Think Tank categories have the most cross-category connections, serving as the primary hubs of
          the governance network. Categories like Media/Journalism are more internally focused with fewer bridges to
          other communities.
        </Finding>

        <hr className="border-none border-t-[0.5px] border-[#bbb] my-10" />

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION 4: CROSSPARTISAN CONVERGENCE        */}
        {/* ═══════════════════════════════════════════ */}

        <SectionLabel id="crosspartisan">Insight 4</SectionLabel>
        <h2 className="font-serif text-[24px] font-normal leading-[1.3] mb-4 mt-0">
          Crosspartisan Convergence on AI Policy
        </h2>

        <Para>
          On which AI policy mechanisms do US policymakers from opposite parties converge, and where do they define key
          terms differently enough that apparent agreement dissolves on inspection? This visualization is a{' '}
          <strong>preview built on aggregate stance scores already in the map</strong>; the per-issue claims dataset
          (state preemption, open-weight restrictions, compute governance, chip exports, pre-deployment testing,
          liability) is being populated separately. Once it lands, each issue gets its own beeswarm and the horseshoe
          can be sharpened with DW-NOMINATE ideology scores.
        </Para>

        <ChartContainer
          title="Crosspartisan AI policy stance, by party"
          source="Source: aggregate regulatory_stance from Mapping AI database. Toggle horseshoe / beeswarm. Excludes 12 non-US officials and US career civil servants."
        >
          <CrosspartisanViz />
        </ChartContainer>

        <Para>
          The <strong>horseshoe</strong> view bends the partisan spectrum into a U: Democrats curve down the left side
          and Republicans down the right. The further toward the bottom, the more precautionary the stance.
          Crosspartisan convergence shows up as Democrats and Republicans approaching each other near the floor of the
          U. The <strong>beeswarm</strong> view shows the same data on a flat axis for direct comparison.
        </Para>

        <Finding>
          This is preview data using a single aggregate score per policymaker. The real story emerges when we plot per-
          issue stances side-by-side: a policymaker may be precautionary on open-weight restrictions but accelerationist
          on compute governance. Definitional drift, captured per claim, is where convergence often dissolves on
          inspection.
        </Finding>

        <hr className="border-none border-t-[0.5px] border-[#bbb] my-10" />

        {/* Footer */}
        <div className="flex justify-center items-center gap-2 mt-12 pt-6 border-t border-[#bbb]/50">
          <span className="font-mono text-[10px] text-[#888] tracking-[0.04em]">Data as of {dataDate}</span>
          <span className="font-mono text-[10px] text-[#888]">·</span>
          <a
            href="/map"
            className="font-mono text-[10px] text-[#2563eb] no-underline hover:underline tracking-[0.04em]"
          >
            Explore the map →
          </a>
        </div>
      </article>
    </>
  )
}
