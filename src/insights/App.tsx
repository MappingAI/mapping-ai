import { useState, useEffect, useRef, useCallback } from 'react'
import { Navigation } from '../components/Navigation'

// D3 is loaded via CDN script tag in insights.html; we import types only so
// insights code gets full autocomplete without bundling d3 into the Vite output.
import type * as D3 from 'd3'
declare const d3: typeof D3

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
  regulatory_stance?: string
  threat_models?: string
  [key: string]: unknown
}

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

const STANCE_LABELS: Record<number, string> = {
  1: 'Accelerate',
  2: 'Light-touch',
  3: 'Targeted',
  4: 'Moderate',
  5: 'Restrictive',
  6: 'Precautionary',
}

const CAT_COLORS: Record<string, string> = {
  'Frontier Lab': '#E31A1C',
  'AI Safety/Alignment': '#A6CEE3',
  'Think Tank/Policy Org': '#1F78B4',
  'Government/Agency': '#CAB2D6',
  Academic: '#D4A017',
  'VC/Capital/Philanthropy': '#B2DF8A',
  'Labor/Civil Society': '#FDBF6F',
  'Media/Journalism': '#B15928',
  'Political Campaign/PAC': '#FB9A99',
  'Ethics/Bias/Rights': '#FF7F00',
  'AI Infrastructure & Compute': '#6366F1',
  'AI Deployers & Platforms': '#EC4899',
  Policymaker: '#6A3D9A',
  Executive: '#E31A1C',
  Researcher: '#A6CEE3',
  Investor: '#B2DF8A',
  Journalist: '#B15928',
  Organizer: '#FDBF6F',
  'Cultural figure': '#FF7F00',
}

const STANCE_COLORS: Record<number, string> = {
  1: '#f0c050',
  2: '#d9a840',
  3: '#c09030',
  4: '#a07828',
  5: '#806020',
  6: '#604818',
}

const TOC_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'the-field', label: 'The Field' },
  { id: 'the-spectrum', label: 'The Spectrum' },
  { id: 'the-money', label: 'The Money' },
  { id: 'the-network', label: 'The Network' },
  { id: 'the-gaps', label: 'The Gaps' },
  { id: 'method', label: 'Method' },
]

/* ────────────────────────────────────────────
   Tooltip helpers
   ──────────────────────────────────────────── */

function showTooltip(el: HTMLDivElement | null, evt: MouseEvent, html: string) {
  if (!el) return
  el.innerHTML = html
  el.style.opacity = '1'
  const r = el.getBoundingClientRect()
  let x = evt.pageX + 12
  let y = evt.pageY - 10
  if (x + r.width > window.innerWidth - 20) x = evt.pageX - r.width - 12
  if (y + r.height > window.innerHeight + window.scrollY - 20) y = evt.pageY - r.height - 10
  el.style.left = x + 'px'
  el.style.top = y + 'px'
}

function hideTooltip(el: HTMLDivElement | null) {
  if (!el) return
  el.style.opacity = '0'
}

/* ────────────────────────────────────────────
   Chart Components
   ──────────────────────────────────────────── */

function ChartOrgCategories({
  orgs,
  tooltipEl,
}: {
  orgs: Entity[]
  tooltipEl: HTMLDivElement | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current || orgs.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const counts: Record<string, number> = {}
    orgs.forEach((o) => {
      counts[o.category] = (counts[o.category] || 0) + 1
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])

    const W = container.clientWidth || 660
    const barH = 28,
      gap = 4,
      padL = 200,
      padR = 50,
      padT = 0,
      padB = 0
    const H = sorted.length * (barH + gap) + padT + padB

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H)

    const maxVal = sorted[0]?.[1] ?? 1
    const xScale = d3
      .scaleLinear()
      .domain([0, maxVal])
      .range([0, W - padL - padR])

    sorted.forEach(([cat, count]: [string, number], i: number) => {
      const y = padT + i * (barH + gap)
      const g = svg.append('g')

      g.append('text')
        .attr('x', padL - 10)
        .attr('y', y + barH / 2 + 1)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 11)
        .attr('fill', '#555')
        .text(cat)

      g.append('rect')
        .attr('x', padL)
        .attr('y', y)
        .attr('width', xScale(count))
        .attr('height', barH)
        .attr('rx', 3)
        .attr('fill', CAT_COLORS[cat] || '#6a7080')
        .attr('opacity', 0.8)
        .on('mousemove', (e: MouseEvent) =>
          showTooltip(
            tooltipEl,
            e,
            `<strong>${cat}</strong><br>${count} organizations (${Math.round((count / orgs.length) * 100)}%)`,
          ),
        )
        .on('mouseleave', () => hideTooltip(tooltipEl))

      g.append('text')
        .attr('x', padL + xScale(count) + 6)
        .attr('y', y + barH / 2 + 1)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 12)
        .attr('font-weight', 500)
        .attr('fill', '#1a1a1a')
        .text(count)
    })
  }, [orgs, tooltipEl])
  return <div ref={ref} />
}

function ChartPeopleVsOrgs({ people, orgs }: { people: Entity[]; orgs: Entity[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current || people.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const pCats: Record<string, number> = {}
    const oCats: Record<string, number> = {}
    people.forEach((p) => {
      pCats[p.category] = (pCats[p.category] || 0) + 1
    })
    orgs.forEach((o) => {
      oCats[o.category] = (oCats[o.category] || 0) + 1
    })

    const pTotal = people.length,
      oTotal = orgs.length
    const allCats = [...new Set([...Object.keys(pCats), ...Object.keys(oCats)])]
    allCats.sort((a, b) => (oCats[b] || 0) / oTotal - (oCats[a] || 0) / oTotal)

    const W = container.clientWidth || 660
    const barH = 18,
      gap = 6,
      padL = 200,
      padR = 60,
      padT = 30,
      padB = 10
    const rowH = barH * 2 + 4 + gap
    const H = allCats.length * rowH + padT + padB

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H)

    // Legend
    svg
      .append('rect')
      .attr('x', padL)
      .attr('y', 6)
      .attr('width', 10)
      .attr('height', 10)
      .attr('rx', 2)
      .attr('fill', '#1a1a1a')
    svg
      .append('text')
      .attr('x', padL + 14)
      .attr('y', 15)
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 10)
      .attr('fill', '#555')
      .text('People (% of all people)')
    svg
      .append('rect')
      .attr('x', padL + 170)
      .attr('y', 6)
      .attr('width', 10)
      .attr('height', 10)
      .attr('rx', 2)
      .attr('fill', '#bbb')
    svg
      .append('text')
      .attr('x', padL + 184)
      .attr('y', 15)
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 10)
      .attr('fill', '#555')
      .text('Orgs (% of all orgs)')

    const maxPct = Math.max(
      ...allCats.map((c) => Math.max((pCats[c] || 0) / pTotal, (oCats[c] || 0) / oTotal)),
    )
    const xScale = d3
      .scaleLinear()
      .domain([0, maxPct])
      .range([0, W - padL - padR])

    allCats.forEach((cat, i) => {
      const y = padT + i * rowH
      const pPct = (pCats[cat] || 0) / pTotal
      const oPct = (oCats[cat] || 0) / oTotal

      svg
        .append('text')
        .attr('x', padL - 10)
        .attr('y', y + barH + 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#888')
        .text(cat)

      // People bar
      svg
        .append('rect')
        .attr('x', padL)
        .attr('y', y)
        .attr('width', Math.max(xScale(pPct), 0))
        .attr('height', barH)
        .attr('rx', 2)
        .attr('fill', '#1a1a1a')
        .attr('opacity', 0.85)
      if (pPct > 0) {
        svg
          .append('text')
          .attr('x', padL + xScale(pPct) + 5)
          .attr('y', y + barH / 2 + 1)
          .attr('dominant-baseline', 'middle')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 10)
          .attr('fill', '#555')
          .text(Math.round(pPct * 100) + '%')
      }

      // Org bar
      svg
        .append('rect')
        .attr('x', padL)
        .attr('y', y + barH + 4)
        .attr('width', Math.max(xScale(oPct), 0))
        .attr('height', barH)
        .attr('rx', 2)
        .attr('fill', '#bbb')
        .attr('opacity', 0.7)
      if (oPct > 0) {
        svg
          .append('text')
          .attr('x', padL + xScale(oPct) + 5)
          .attr('y', y + barH + 4 + barH / 2 + 1)
          .attr('dominant-baseline', 'middle')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 10)
          .attr('fill', '#888')
          .text(Math.round(oPct * 100) + '%')
      }
    })
  }, [people, orgs])
  return <div ref={ref} />
}

function ChartStanceBeeswarm({
  people,
  orgs,
  tooltipEl,
}: {
  people: Entity[]
  orgs: Entity[]
  tooltipEl: HTMLDivElement | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current || people.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const W = container.clientWidth || 660
    const H = 320
    const padL = 50,
      padR = 30,
      padT = 50,
      padB = 40

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H)

    const xScale = d3
      .scaleLinear()
      .domain([0.5, 6.5])
      .range([padL, W - padR])
    const midY = H / 2

    // Axis labels
    for (let s = 1; s <= 6; s++) {
      svg
        .append('line')
        .attr('x1', xScale(s))
        .attr('x2', xScale(s))
        .attr('y1', padT - 5)
        .attr('y2', H - padB + 5)
        .attr('stroke', '#e0ddd8')
        .attr('stroke-width', 0.5)
      svg
        .append('text')
        .attr('x', xScale(s))
        .attr('y', H - padB + 22)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#888')
        .text(STANCE_LABELS[s] ?? '')
    }

    // Divider line
    svg
      .append('line')
      .attr('x1', padL)
      .attr('x2', W - padR)
      .attr('y1', midY)
      .attr('y2', midY)
      .attr('stroke', '#bbb')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '4,3')

    // Labels
    svg
      .append('text')
      .attr('x', padL - 5)
      .attr('y', midY - 8)
      .attr('text-anchor', 'end')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 10)
      .attr('fill', '#555')
      .text('People')
    svg
      .append('text')
      .attr('x', padL - 5)
      .attr('y', midY + 15)
      .attr('text-anchor', 'end')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 10)
      .attr('fill', '#555')
      .text('Orgs')

    // Mean lines
    const pScores = people.filter((p) => p.stance_score != null).map((p) => p.stance_score!)
    const oScores = orgs.filter((o) => o.stance_score != null).map((o) => o.stance_score!)
    const pMean = pScores.length > 0 ? pScores.reduce((a, v) => a + v, 0) / pScores.length : 0
    const oMean = oScores.length > 0 ? oScores.reduce((a, v) => a + v, 0) / oScores.length : 0

    // People beeswarm (above line)
    const pNodes = people
      .filter((p) => p.stance_score != null)
      .map((p) => ({
        x: xScale(p.stance_score!),
        y: midY - 20,
        r: 3.5,
        data: p,
        type: 'person' as const,
      }))

    // Org beeswarm (below line)
    const oNodes = orgs
      .filter((o) => o.stance_score != null)
      .map((o) => ({
        x: xScale(o.stance_score!),
        y: midY + 20,
        r: 2.5,
        data: o,
        type: 'org' as const,
      }))

    // Simple collision resolution
    function beeswarm(
      nodes: { x: number; y: number; r: number; data: Entity; type: string }[],
      baseY: number,
      direction: number,
    ) {
      const groups: Record<number, typeof nodes> = {}
      nodes.forEach((n) => {
        const key = Math.round(n.data.stance_score || 0)
        if (!groups[key]) groups[key] = []
        groups[key].push(n)
      })
      Object.values(groups).forEach((group) => {
        const half = group.length / 2
        group.forEach((n, i) => {
          const offset = (i - half) * (n.r * 2 + 1.5)
          n.y = baseY + direction * (Math.abs(offset) + n.r + 5)
          n.x += (Math.random() - 0.5) * (n.r * 4)
        })
      })
    }
    beeswarm(pNodes, midY, -1)
    beeswarm(oNodes, midY, 1)

    // Mean markers (skip if no data)
    if (pScores.length > 0) {
      svg
        .append('line')
        .attr('x1', xScale(pMean))
        .attr('x2', xScale(pMean))
        .attr('y1', padT)
        .attr('y2', midY - 3)
        .attr('stroke', '#E31A1C')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3,2')
      svg
        .append('text')
        .attr('x', xScale(pMean))
        .attr('y', padT - 5)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#E31A1C')
        .text('Mean ' + pMean.toFixed(1))
    }

    if (oScores.length > 0) {
      svg
        .append('line')
        .attr('x1', xScale(oMean))
        .attr('x2', xScale(oMean))
        .attr('y1', midY + 3)
        .attr('y2', H - padB)
        .attr('stroke', '#1F78B4')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3,2')
      svg
        .append('text')
        .attr('x', xScale(oMean))
        .attr('y', H - padB + 10)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#1F78B4')
        .text('Mean ' + oMean.toFixed(1))
    }

    // Draw dots
    pNodes.forEach((n) => {
      svg
        .append('circle')
        .attr('cx', n.x)
        .attr('cy', n.y)
        .attr('r', n.r)
        .attr('fill', CAT_COLORS[n.data.category] || '#6a7080')
        .attr('opacity', 0.75)
        .style('cursor', 'pointer')
        .on('mousemove', (e: MouseEvent) =>
          showTooltip(
            tooltipEl,
            e,
            `<strong>${n.data.name}</strong><br>${n.data.category}<br>Stance: ${n.data.regulatory_stance} (${n.data.stance_score})`,
          ),
        )
        .on('mouseleave', () => hideTooltip(tooltipEl))
    })
    oNodes.forEach((n) => {
      svg
        .append('circle')
        .attr('cx', n.x)
        .attr('cy', n.y)
        .attr('r', n.r)
        .attr('fill', CAT_COLORS[n.data.category] || '#6a7080')
        .attr('opacity', 0.6)
        .style('cursor', 'pointer')
        .on('mousemove', (e: MouseEvent) =>
          showTooltip(
            tooltipEl,
            e,
            `<strong>${n.data.name}</strong><br>${n.data.category}<br>Stance: ${n.data.regulatory_stance} (${n.data.stance_score})`,
          ),
        )
        .on('mouseleave', () => hideTooltip(tooltipEl))
    })
  }, [people, orgs, tooltipEl])
  return <div ref={ref} />
}

function ChartThreatModels({
  people,
  tooltipEl,
}: {
  people: Entity[]
  tooltipEl: HTMLDivElement | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current || people.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const ROLES = [
      'Researcher',
      'Organizer',
      'Policymaker',
      'Executive',
      'Academic',
      'Journalist',
      'Investor',
    ]
    const THREATS = [
      'Loss of control',
      'Power concentration',
      'Existential risk',
      'Labor displacement',
      'Democratic erosion',
      'Misinformation',
      'National security',
      'Cybersecurity',
      'Economic inequality',
      'Bias/discrimination',
    ]

    const W = container.clientWidth || 660
    const cellH = 28,
      cellW = (W - 140) / THREATS.length
    const padL = 140,
      padT = 80,
      padB = 10
    const H = ROLES.length * cellH + padT + padB

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H)

    // Compute data
    const matrix: Record<string, Record<string, number>> = {}
    ROLES.forEach((role) => {
      matrix[role] = {}
      const rolePeople = people.filter((p) => p.category === role)
      THREATS.forEach((threat) => {
        const count = rolePeople.filter((p) => p.threat_models?.includes(threat)).length
        matrix[role]![threat] = rolePeople.length > 0 ? count / rolePeople.length : 0
      })
    })

    // Column headers (rotated)
    THREATS.forEach((threat, j) => {
      svg
        .append('text')
        .attr('transform', `translate(${padL + j * cellW + cellW / 2}, ${padT - 8}) rotate(-45)`)
        .attr('text-anchor', 'start')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#888')
        .text(threat)
    })

    // Rows
    ROLES.forEach((role, i) => {
      const y = padT + i * cellH
      const n = people.filter((p) => p.category === role).length

      svg
        .append('text')
        .attr('x', padL - 8)
        .attr('y', y + cellH / 2 + 1)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#555')
        .text(role + ' (' + n + ')')

      THREATS.forEach((threat, j) => {
        const pct = matrix[role]?.[threat] ?? 0
        const x = padL + j * cellW

        svg
          .append('rect')
          .attr('x', x + 2)
          .attr('y', y + 2)
          .attr('width', cellW - 4)
          .attr('height', cellH - 4)
          .attr('rx', 3)
          .attr('fill', d3.interpolateBlues(pct * 0.9 + 0.05))
          .attr('opacity', pct > 0 ? 0.9 : 0.15)
          .on('mousemove', (e: MouseEvent) =>
            showTooltip(
              tooltipEl,
              e,
              `<strong>${role}</strong> + ${threat}<br>${Math.round(pct * 100)}% of ${role.toLowerCase()}s`,
            ),
          )
          .on('mouseleave', () => hideTooltip(tooltipEl))

        if (pct >= 0.3) {
          svg
            .append('text')
            .attr('x', x + cellW / 2)
            .attr('y', y + cellH / 2 + 1)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-family', "'DM Mono', monospace")
            .attr('font-size', 9)
            .attr('fill', pct > 0.6 ? '#fff' : '#333')
            .text(Math.round(pct * 100) + '%')
        }
      })
    })
  }, [people, tooltipEl])
  return <div ref={ref} />
}

function ChartFundingStance({
  orgs,
  tooltipEl,
}: {
  orgs: Entity[]
  tooltipEl: HTMLDivElement | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current || orgs.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const groups: Record<string, number[]> = {}
    orgs.forEach((o) => {
      let fm = o.funding_model || 'Unknown'
      if (fm.startsWith('Super PAC')) fm = 'Super PAC'
      if (fm.length > 30) fm = 'Super PAC'
      if (!groups[fm]) groups[fm] = []
      if (o.stance_score != null) groups[fm]!.push(o.stance_score)
    })

    const data = Object.entries(groups)
      .filter(([, v]) => v.length >= 3)
      .map(([fm, scores]) => ({
        label: fm,
        mean: scores.reduce((a, v) => a + v, 0) / scores.length,
        n: scores.length,
        scores: scores,
      }))
      .sort((a, b) => a.mean - b.mean)

    const W = container.clientWidth || 660
    const barH = 32,
      gap = 8,
      padL = 170,
      padR = 60,
      padT = 10,
      padB = 30
    const H = data.length * (barH + gap) + padT + padB

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H)

    const xScale = d3
      .scaleLinear()
      .domain([1, 6])
      .range([padL, W - padR])

    // Background grid
    for (let s = 1; s <= 6; s++) {
      svg
        .append('line')
        .attr('x1', xScale(s))
        .attr('x2', xScale(s))
        .attr('y1', padT)
        .attr('y2', H - padB)
        .attr('stroke', '#e8e6e2')
        .attr('stroke-width', 0.5)
      svg
        .append('text')
        .attr('x', xScale(s))
        .attr('y', H - padB + 16)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#aaa')
        .text(STANCE_LABELS[s] ?? '')
    }

    data.forEach((d, i) => {
      const y = padT + i * (barH + gap)

      svg
        .append('text')
        .attr('x', padL - 10)
        .attr('y', y + barH / 2 + 1)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 11)
        .attr('fill', '#555')
        .text(d.label)

      svg
        .append('text')
        .attr('x', padL - 10)
        .attr('y', y + barH / 2 + 12)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 9)
        .attr('fill', '#aaa')
        .text('n=' + d.n)

      const barColor = STANCE_COLORS[Math.round(d.mean)] || '#6a7080'
      svg
        .append('line')
        .attr('x1', xScale(1))
        .attr('x2', xScale(d.mean))
        .attr('y1', y + barH / 2)
        .attr('y2', y + barH / 2)
        .attr('stroke', barColor)
        .attr('stroke-width', 3)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.5)

      svg
        .append('circle')
        .attr('cx', xScale(d.mean))
        .attr('cy', y + barH / 2)
        .attr('r', 7)
        .attr('fill', barColor)
        .on('mousemove', (e: MouseEvent) =>
          showTooltip(
            tooltipEl,
            e,
            `<strong>${d.label}</strong><br>Mean stance: ${d.mean.toFixed(2)}<br>${d.n} organizations`,
          ),
        )
        .on('mouseleave', () => hideTooltip(tooltipEl))

      svg
        .append('text')
        .attr('x', xScale(d.mean) + 12)
        .attr('y', y + barH / 2 + 1)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 12)
        .attr('font-weight', 500)
        .attr('fill', '#1a1a1a')
        .text(d.mean.toFixed(1))
    })
  }, [orgs, tooltipEl])
  return <div ref={ref} />
}

function ChartPacSpending({
  edges,
  entityMap,
  tooltipEl,
}: {
  edges: Edge[]
  entityMap: Record<number, Entity>
  tooltipEl: HTMLDivElement | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const container = ref.current
    container.innerHTML = ''

    const pacEdges = edges.filter((e) => e.relationship_type === 'funder' && e.role?.includes('$'))
    if (pacEdges.length === 0) {
      container.innerHTML =
        '<p style="font-family:\'DM Mono\', monospace;font-size:12px;color:#888;">No PAC spending data available.</p>'
      return
    }

    const spendData = pacEdges
      .map((e) => {
        const src = entityMap[e.source_id]
        const tgt = entityMap[e.target_id]
        const amountMatch = e.role ? /\$([\d,.]+[KMB]?)/i.exec(e.role) : null
        let amount = 0
        if (amountMatch) {
          const raw = amountMatch[1]!.replace(/,/g, '')
          if (raw.endsWith('K')) amount = parseFloat(raw) * 1000
          else if (raw.endsWith('M')) amount = parseFloat(raw) * 1000000
          else if (raw.endsWith('B')) amount = parseFloat(raw) * 1000000000
          else amount = parseFloat(raw)
        }
        return {
          pac: src ? src.name : 'Unknown',
          candidate: tgt ? tgt.name : 'Unknown',
          amount,
          role: e.role || '',
        }
      })
      .filter((d) => d.amount > 0)
      .sort((a, b) => b.amount - a.amount)

    if (spendData.length === 0) {
      container.innerHTML =
        '<p style="font-family:\'DM Mono\', monospace;font-size:12px;color:#888;">No PAC spending data available.</p>'
      return
    }

    const W = container.clientWidth || 660
    const barH = 24,
      gap = 4,
      padL = 200,
      padR = 80,
      padT = 10,
      padB = 10
    const H = spendData.length * (barH + gap) + padT + padB

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H)

    const maxAmount = d3.max(spendData, (d: (typeof spendData)[0]) => d.amount) ?? 0
    const xScale = d3
      .scaleLinear()
      .domain([0, maxAmount])
      .range([0, W - padL - padR])

    spendData.forEach((d, i) => {
      const y = padT + i * (barH + gap)

      svg
        .append('text')
        .attr('x', padL - 8)
        .attr('y', y + barH / 2 + 1)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#555')
        .text(d.pac + ' \u2192 ' + d.candidate)

      svg
        .append('rect')
        .attr('x', padL)
        .attr('y', y)
        .attr('width', xScale(d.amount))
        .attr('height', barH)
        .attr('rx', 3)
        .attr('fill', '#FB9A99')
        .attr('opacity', 0.8)
        .on('mousemove', (e: MouseEvent) =>
          showTooltip(tooltipEl, e, `<strong>${d.pac}</strong> \u2192 ${d.candidate}<br>${d.role}`),
        )
        .on('mouseleave', () => hideTooltip(tooltipEl))

      svg
        .append('text')
        .attr('x', padL + xScale(d.amount) + 6)
        .attr('y', y + barH / 2 + 1)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 11)
        .attr('fill', '#1a1a1a')
        .text(
          '$' +
            (d.amount >= 1000000
              ? (d.amount / 1000000).toFixed(1) + 'M'
              : (d.amount / 1000).toFixed(0) + 'K'),
        )
    })
  }, [edges, entityMap, tooltipEl])
  return <div ref={ref} />
}

function ChartNetworkHubs({
  edges,
  entityMap,
  tooltipEl,
}: {
  edges: Edge[]
  entityMap: Record<number, Entity>
  tooltipEl: HTMLDivElement | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current || edges.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const edgeCounts: Record<number, number> = {}
    edges.forEach((e) => {
      edgeCounts[e.source_id] = (edgeCounts[e.source_id] || 0) + 1
      edgeCounts[e.target_id] = (edgeCounts[e.target_id] || 0) + 1
    })

    const top15 = Object.entries(edgeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([id, count]) => {
        const e = entityMap[parseInt(id)]
        return {
          name: e ? e.name : 'Unknown',
          category: e ? e.category : '',
          type: e ? e.entity_type : '',
          count,
        }
      })

    const W = container.clientWidth || 660
    const barH = 26,
      gap = 4,
      padL = 260,
      padR = 50,
      padT = 0,
      padB = 0
    const H = top15.length * (barH + gap) + padT + padB

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H)

    const maxCount = top15[0]?.count ?? 1
    const xScale = d3
      .scaleLinear()
      .domain([0, maxCount])
      .range([0, W - padL - padR])

    top15.forEach((d, i) => {
      const y = padT + i * (barH + gap)

      const typeLabel = d.type === 'person' ? 'P' : d.type === 'organization' ? 'O' : 'R'
      svg
        .append('circle')
        .attr('cx', padL - 248)
        .attr('cy', y + barH / 2)
        .attr('r', 8)
        .attr('fill', CAT_COLORS[d.category] || '#6a7080')
        .attr('opacity', 0.7)
      svg
        .append('text')
        .attr('x', padL - 248)
        .attr('y', y + barH / 2 + 1)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 8)
        .attr('fill', '#fff')
        .attr('font-weight', 500)
        .text(typeLabel)

      svg
        .append('text')
        .attr('x', padL - 232)
        .attr('y', y + barH / 2 + 1)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 11)
        .attr('fill', '#555')
        .text(d.name.length > 35 ? d.name.substring(0, 33) + '...' : d.name)

      svg
        .append('rect')
        .attr('x', padL)
        .attr('y', y + 2)
        .attr('width', xScale(d.count))
        .attr('height', barH - 4)
        .attr('rx', 3)
        .attr('fill', CAT_COLORS[d.category] || '#6a7080')
        .attr('opacity', 0.7)

      svg
        .append('text')
        .attr('x', padL + xScale(d.count) + 6)
        .attr('y', y + barH / 2 + 1)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 12)
        .attr('font-weight', 500)
        .attr('fill', '#1a1a1a')
        .text(d.count)
    })
  }, [edges, entityMap, tooltipEl])
  return <div ref={ref} />
}

function ChartGeography({ entities }: { entities: Entity[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current || entities.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const locs: Record<string, number> = {}
    entities.forEach((e) => {
      if (e.location && e.location !== 'Unknown') {
        let loc = e.location
        if (loc.includes(',')) loc = loc.split(',')[0]!.trim()
        if (loc === 'Washington' || loc.includes('D.C.') || loc.includes('DC'))
          loc = 'Washington DC'
        if (loc === 'Berkeley' || loc === 'Oakland') loc = 'SF Bay Area'
        if (
          loc === 'San Francisco' ||
          loc === 'Menlo Park' ||
          loc === 'Stanford' ||
          loc === 'Palo Alto' ||
          loc === 'Mountain View'
        )
          loc = 'SF Bay Area'
        if (loc === 'Cambridge' || loc === 'Boston' || loc === 'Somerville')
          loc = 'Boston/Cambridge'
        locs[loc] = (locs[loc] || 0) + 1
      }
    })

    const sorted = Object.entries(locs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)

    const W = container.clientWidth || 660
    const barH = 26,
      gap = 4,
      padL = 160,
      padR = 50,
      padT = 0,
      padB = 0
    const H = sorted.length * (barH + gap) + padT + padB

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H)

    const maxVal = sorted[0]?.[1] ?? 1
    const xScale = d3
      .scaleLinear()
      .domain([0, maxVal])
      .range([0, W - padL - padR])

    const intlCities = [
      'London',
      'Oxford',
      'Beijing',
      'Paris',
      'Berlin',
      'Toronto',
      'Geneva',
      'Zurich',
      'Tokyo',
      'Singapore',
    ]

    sorted.forEach(([loc, count]: [string, number], i: number) => {
      const y = padT + i * (barH + gap)
      const isUS = !intlCities.includes(loc)
      const barFill = isUS ? '#2563eb' : '#bbb'

      svg
        .append('text')
        .attr('x', padL - 10)
        .attr('y', y + barH / 2 + 1)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 11)
        .attr('fill', '#555')
        .text(loc)

      svg
        .append('rect')
        .attr('x', padL)
        .attr('y', y)
        .attr('width', xScale(count))
        .attr('height', barH)
        .attr('rx', 3)
        .attr('fill', barFill)
        .attr('opacity', 0.65)

      svg
        .append('text')
        .attr('x', padL + xScale(count) + 6)
        .attr('y', y + barH / 2 + 1)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 12)
        .attr('font-weight', 500)
        .attr('fill', '#1a1a1a')
        .text(count)
    })
  }, [entities])
  return <div ref={ref} />
}

function ChartThreatFrequency({
  entities,
  tooltipEl,
}: {
  entities: Entity[]
  tooltipEl: HTMLDivElement | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current || entities.length === 0) return
    const container = ref.current
    container.innerHTML = ''

    const THREATS_CLEAN = [
      'Loss of control',
      'Power concentration',
      'Existential risk',
      'National security',
      'Misinformation',
      'Democratic erosion',
      'Cybersecurity',
      'Labor displacement',
      'Economic inequality',
      'Weapons proliferation',
      'Bias/discrimination',
      'Privacy',
      'Environmental',
      'Copyright/IP',
    ]

    const counts: Record<string, number> = {}
    let totalWithThreats = 0
    entities.forEach((e) => {
      const tm = e.threat_models
      if (tm) {
        totalWithThreats++
        THREATS_CLEAN.forEach((t) => {
          if (tm.includes(t)) {
            counts[t] = (counts[t] || 0) + 1
          }
        })
      }
    })

    const sorted = THREATS_CLEAN.filter((t) => counts[t])
      .map((t) => ({ label: t, count: counts[t] || 0 }))
      .sort((a, b) => b.count - a.count)

    if (sorted.length === 0) return

    const W = container.clientWidth || 660
    const barH = 24,
      gap = 3,
      padL = 180,
      padR = 50,
      padT = 0,
      padB = 0
    const H = sorted.length * (barH + gap) + padT + padB

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H)

    const maxVal = sorted[0]?.count ?? 1
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

    sorted.forEach((d, i) => {
      const y = padT + i * (barH + gap)
      const isTechnical = technicalThreats.includes(d.label)
      const fill = isTechnical ? '#1F78B4' : '#FF7F00'

      svg
        .append('text')
        .attr('x', padL - 10)
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
        .attr('fill', fill)
        .attr('opacity', 0.6)
        .on('mousemove', (e: MouseEvent) =>
          showTooltip(
            tooltipEl,
            e,
            `<strong>${d.label}</strong><br>${d.count} entities (${Math.round((d.count / totalWithThreats) * 100)}%)`,
          ),
        )
        .on('mouseleave', () => hideTooltip(tooltipEl))

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
  }, [entities, tooltipEl])
  return <div ref={ref} />
}

/* ────────────────────────────────────────────
   Reusable Layout Components
   ──────────────────────────────────────────── */

function ChartContainer({
  title,
  source,
  children,
}: {
  title: string
  source: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-[#f8f7f5] rounded-lg p-6 my-8 overflow-hidden fade-in [&_svg]:w-full [&_svg]:block">
      <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-[#555] mb-4">
        {title}
      </div>
      {children}
      <div className="font-mono text-[9px] text-[#888] tracking-[0.04em] mt-3 text-right">
        {source}
      </div>
    </div>
  )
}

function Finding({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#faf8f4] border-l-[3px] border-[#2563eb] p-4 pr-5 rounded-r-md my-6 fade-in">
      <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#2563eb] mb-1.5">
        Finding
      </div>
      <p className="text-[15px] !mb-0 text-[#555]">{children}</p>
    </div>
  )
}

function SectionLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div
      id={id}
      className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-[#555] mb-3 fade-in"
    >
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
    <nav
      className="hidden min-[1200px]:block fixed top-1/2 -translate-y-1/2 w-[130px]"
      style={{ left: 'calc(50% - 360px - 3rem - 130px)' }}
    >
      {TOC_ITEMS.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`block font-mono text-[11px] tracking-[0.07em] uppercase no-underline py-[0.45rem] pl-[0.65rem] border-l transition-colors duration-150 leading-[1.4] hover:text-[#555] hover:no-underline ${
            activeId === item.id
              ? 'text-[#1a1a1a] border-[#1a1a1a]'
              : 'text-[#888] border-transparent'
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
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Fetch data + detail (for threat_models, notes, etc.)
  useEffect(() => {
    Promise.all([
      fetch('/map-data.json').then((r) => r.json()),
      fetch('/map-detail.json')
        .then((r) => r.json())
        .catch(() => ({})),
    ])
      .then(([mapData, detail]: [MapData, Record<string, Partial<Entity>>]) => {
        // Merge detail fields into entities
        const all = [
          ...(mapData.people || []),
          ...(mapData.organizations || []),
          ...(mapData.resources || []),
        ]
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
  }, [data]) // re-observe after data loads and charts render

  // TOC scroll tracking — use ref to avoid re-render on every scroll
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
    window.addEventListener('scroll', updateTOC)
    updateTOC()
    return () => window.removeEventListener('scroll', updateTOC)
  }, [updateTOC])

  // Derived data
  const people = data?.people || []
  const orgs = data?.organizations || []
  const resources = data?.resources || []
  const edges = data?.relationships || data?.edges || []
  const all = [...people, ...orgs, ...resources]

  const entityMap: Record<number, Entity> = {}
  all.forEach((e) => {
    entityMap[e.id] = e
  })

  const dataDate = data?._meta?.generated_at
    ? new Date(data._meta.generated_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'March 2026'

  return (
    <>
      {/* Inline styles for fade-in animation and beeswarm dots */}
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
        .bee-dot {
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .bee-dot:hover { opacity: 1 !important; }
      `}</style>

      <Navigation />
      <TableOfContents activeId={activeSection} />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed bg-white border border-[#bbb] rounded px-3 py-2 font-mono text-[11px] text-[#1a1a1a] pointer-events-none opacity-0 transition-opacity duration-150 z-50 max-w-[240px] leading-[1.4]"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      />

      {/* Article */}
      <article
        className="max-w-[720px] mx-auto font-serif text-[#1a1a1a] text-[17px] leading-[1.75]"
        style={{ padding: 'calc(3rem + 48px) 1.5rem 4rem' }}
      >
        {/* Header */}
        <div className="font-mono text-[11px] tracking-[0.12em] uppercase text-[#555] mb-3">
          Mapping AI Research Blog
        </div>
        <h1
          className="font-serif text-[32px] font-normal italic leading-[1.25] mb-4"
          style={{ marginTop: 'calc(11px * 1.75 + 0.75rem)' }}
        >
          Who Governs AI?
        </h1>
        <p className="font-serif text-[18px] text-[#555] leading-[1.6] mb-8">
          We mapped <span className="font-mono">{all.length || 654}</span> entities across U.S. AI
          policy. Here's what the data reveals about who holds influence, what they believe, where
          the money flows, and whose voices are absent.
        </p>

        {/* Stat row */}
        <div id="overview" className="flex gap-4 my-6 flex-wrap max-[600px]:flex-col">
          <div className="flex-1 min-w-[140px] bg-[#f8f7f5] rounded-md p-4 text-center">
            <div className="font-mono text-[28px] font-medium text-[#1a1a1a] leading-[1.2]">
              {people.length || 131}
            </div>
            <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#888] mt-1">
              People
            </div>
          </div>
          <div className="flex-1 min-w-[140px] bg-[#f8f7f5] rounded-md p-4 text-center">
            <div className="font-mono text-[28px] font-medium text-[#1a1a1a] leading-[1.2]">
              {orgs.length || 362}
            </div>
            <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#888] mt-1">
              Organizations
            </div>
          </div>
          <div className="flex-1 min-w-[140px] bg-[#f8f7f5] rounded-md p-4 text-center">
            <div className="font-mono text-[28px] font-medium text-[#1a1a1a] leading-[1.2]">
              {resources.length || 161}
            </div>
            <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#888] mt-1">
              Resources
            </div>
          </div>
          <div className="flex-1 min-w-[140px] bg-[#f8f7f5] rounded-md p-4 text-center">
            <div className="font-mono text-[28px] font-medium text-[#1a1a1a] leading-[1.2]">
              {edges.length || 176}
            </div>
            <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#888] mt-1">
              Relationships
            </div>
          </div>
        </div>

        <hr className="border-none border-t-[0.5px] border-[#bbb] my-10" />

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION 1: THE FIELD                        */}
        {/* ═══════════════════════════════════════════ */}
        <SectionLabel id="the-field">I. The Field</SectionLabel>

        <Para>
          Thirty-nine percent of all organizations in our database belong to a single category: AI
          Safety and Alignment. That's 140 out of 362 organizations, more than Think Tanks (54),
          Academic institutions (53), and VC/Philanthropy (47) combined. The U.S. AI governance
          field is, by organizational headcount, an AI safety field first and everything else
          second.
        </Para>

        <Para>
          This concentration has a specific origin story. The effective altruism and longtermism
          funding boom of 2020-2022 seeded dozens of organizations focused on existential risk from
          advanced AI. Many of these are small research shops, fellowship programs, or advocacy
          groups. They share funders, share personnel, and share a threat model centered on "loss of
          control" over superintelligent systems. The result is an organizational ecology where one
          theory of the problem crowds out the rest through sheer institutional mass.
        </Para>

        <ChartContainer
          title="Organization count by category"
          source={`Source: Mapping AI database, ${dataDate}`}
        >
          <ChartOrgCategories orgs={orgs} tooltipEl={tooltipRef.current} />
        </ChartContainer>

        <Para>
          Compare this to the people we've mapped. Among the {people.length || 131} individuals, the
          largest group is Policymakers (60), followed by Executives (21) and Academics (19). The
          individuals doing the governing look nothing like the organizational infrastructure around
          them. The people are mostly in government and industry; the organizations are mostly in
          safety and alignment research.
        </Para>

        <ChartContainer
          title="People vs. organizations: category composition"
          source="Source: Mapping AI database"
        >
          <ChartPeopleVsOrgs people={people} orgs={orgs} />
        </ChartContainer>

        <Finding>
          The organizational infrastructure of U.S. AI governance is dominated by AI
          Safety/Alignment groups (39% of all orgs), but the individuals who actually make policy
          decisions are overwhelmingly Policymakers and Executives. There's a structural mismatch
          between who builds the institutions and who wields the power.
        </Finding>

        <hr className="border-none border-t-[0.5px] border-[#bbb] my-10" />

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION 2: THE SPECTRUM                     */}
        {/* ═══════════════════════════════════════════ */}
        <SectionLabel id="the-spectrum">II. The Spectrum</SectionLabel>

        <Para>
          Ask the people in U.S. AI governance what regulation should look like, and you'll get a
          surprisingly moderate answer. The average regulatory stance score among the 124
          individuals with data is 3.4 on a 1-to-6 scale, where 1 means "accelerate" and 6 means
          "precautionary." The single most common position is "targeted regulation" (score 3), held
          by 59 people, nearly half the sample. The regulatory debate among individuals is mostly a
          debate among centrists arguing over specifics.
        </Para>

        <Para>
          Organizations tell a different story. Their distribution is bimodal, with one peak at
          "targeted" (score 3-4) and a second, larger peak at "precautionary" (score 6), where 129
          organizations cluster. The mean organizational stance is 4.7, a full 1.3 points more
          cautious than the individual mean. Organizations in this space are substantially more
          pro-regulation than the people who run them and work in them.
        </Para>

        <ChartContainer
          title="Regulatory stance: people vs. organizations"
          source="Scale: 1 = Accelerate, 2 = Light-touch, 3 = Targeted, 4 = Moderate, 5 = Restrictive, 6 = Precautionary"
        >
          <ChartStanceBeeswarm people={people} orgs={orgs} tooltipEl={tooltipRef.current} />
        </ChartContainer>

        <Para>
          Why the gap? Partly because the organizational landscape is tilted toward safety groups,
          which naturally advocate for precaution. Partly because organizations calcify a position
          in their mission statements and charters in ways individuals don't. And partly because the
          people in our database skew toward power holders (policymakers, executives) who face real
          trade-offs between regulation and other goals, while many organizations exist specifically
          to push for more oversight.
        </Para>

        <Para>
          The risk perception data shows a similar split. Among people, 65% rate AI risk as
          "serious" (a moderate middle-ground position), with only 16% calling it "existential."
          Among organizations, "existential" and "catastrophic" together account for nearly half.
          The modal individual thinks AI is a serious problem that targeted regulation can address.
          The modal safety organization thinks it's an existential threat requiring precautionary
          measures.
        </Para>

        <Para>
          Threat model priorities fracture along professional lines, and this may be the most
          policy-relevant finding in the dataset. Researchers prioritize "loss of control" (78%) and
          "existential risk" (56%). Organizers and labor advocates prioritize "labor displacement"
          (89%) and "democratic erosion" (67%). Policymakers split the difference, with "power
          concentration" (67%) and "misinformation" (47%) at the top. These aren't minor variations
          in emphasis. They represent fundamentally different theories of harm, and they produce
          fundamentally different policy prescriptions.
        </Para>

        <ChartContainer
          title="Top threat models by professional role"
          source="Source: Mapping AI database. Percentage = share of people in that role who selected each threat model."
        >
          <ChartThreatModels people={people} tooltipEl={tooltipRef.current} />
        </ChartContainer>

        <Finding>
          Researchers and safety organizations focus on abstract, technical risks (loss of control,
          existential risk). Organizers focus on concrete, near-term harms (labor displacement,
          democratic erosion). These two camps are building policy infrastructure to solve different
          problems, and they rarely cite each other's concerns.
        </Finding>

        <hr className="border-none border-t-[0.5px] border-[#bbb] my-10" />

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION 3: THE MONEY                        */}
        {/* ═══════════════════════════════════════════ */}
        <SectionLabel id="the-money">III. The Money</SectionLabel>

        <Para>
          If you know how an AI governance organization is funded, you can predict its regulatory
          stance with striking accuracy.
        </Para>

        <Para>
          Philanthropically funded organizations, which make up 64% of all orgs in our database (232
          out of 362), have a mean stance score of 4.9, solidly in the "restrictive" range.
          Venture-backed organizations average 3.0, squarely at "targeted." Super PACs average 2.5,
          between "light-touch" and "targeted." Government-funded bodies sit at 3.6. The correlation
          between funding source and policy position is tight enough to raise structural questions
          about intellectual independence.
        </Para>

        <ChartContainer
          title="Mean regulatory stance score by funding model"
          source="Scale: 1 = Accelerate ... 6 = Precautionary. Only categories with 3+ organizations shown."
        >
          <ChartFundingStance orgs={orgs} tooltipEl={tooltipRef.current} />
        </ChartContainer>

        <Para>
          This doesn't mean funders are dictating positions. Philanthropy flows toward
          safety-oriented organizations because safety-oriented donors (Open Philanthropy, Survival
          and Flourishing Fund, the EA Long-Term Future Fund) seek them out. Venture capital flows
          toward innovation-friendly organizations because VCs want less regulation of their
          portfolio companies. The self-selection is real. But the end result is the same: funding
          source is a reliable proxy for regulatory position, and the field's most common funding
          model (philanthropy) is also its most regulation-friendly.
        </Para>

        <Para>
          The political spending data adds another dimension. Our database tracks several AI-focused
          Super PACs, including American Mission (backed by a16z, Greg Brockman, Ron Conway, and Joe
          Lonsdale with $125 million in funding), Think Big, and Jobs and Democracy PAC. These PACs
          have spent millions supporting specific candidates in the 2026 cycle, creating direct
          financial links between AI industry figures and the policymakers who will regulate them.
        </Para>

        <ChartContainer
          title="PAC spending on candidates in the database"
          source="Source: Mapping AI database, FEC filings"
        >
          <ChartPacSpending edges={edges} entityMap={entityMap} tooltipEl={tooltipRef.current} />
        </ChartContainer>

        <Finding>
          Funding model predicts regulatory stance almost perfectly. Philanthropic orgs average
          4.9/6 (restrictive), venture-backed orgs average 3.0 (targeted), and Super PACs average
          2.5 (light-touch). The structural incentives are baked in: safety donors fund safety orgs,
          industry donors fund industry-friendly orgs, and the policy landscape reflects who wrote
          the checks.
        </Finding>

        <hr className="border-none border-t-[0.5px] border-[#bbb] my-10" />

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION 4: THE NETWORK                      */}
        {/* ═══════════════════════════════════════════ */}
        <SectionLabel id="the-network">IV. The Network</SectionLabel>

        <Para>
          The most connected node in our entire database is the Senate AI Working Group, with 24
          tracked relationships. Second is the White House Office of Science and Technology Policy
          (OSTP) with 12. Government bodies are the connective tissue of U.S. AI governance. They're
          the venues where industry, academia, civil society, and safety organizations actually
          meet.
        </Para>

        <Para>
          After government hubs, think tanks and policy organizations serve as the secondary
          connective layer: the Institute for AI Policy and Strategy (10 connections), the
          Forecasting Research Institute (7), the Future of Life Institute (6). Among individuals,
          the most connected are Dario Amodei and Dan Hendrycks (4 connections each), followed by a
          cluster of policymakers like Alex Bores and researchers like Yoshua Bengio.
        </Para>

        <ChartContainer
          title="Most connected entities (by tracked relationship count)"
          source="Source: Mapping AI edge database. Counts include all edge types (affiliated, funder, authored_by, etc.)"
        >
          <ChartNetworkHubs edges={edges} entityMap={entityMap} tooltipEl={tooltipRef.current} />
        </ChartContainer>

        <Para>
          The revolving door patterns are visible even in a dataset this size. Gina Raimondo went
          from Commerce Secretary to the Council on Foreign Relations. Sriram Krishnan went from
          General Partner at a16z to White House AI advisor. Brian Deese moved from the Obama White
          House to BlackRock to MIT. Arati Prabhakar cycled through DARPA, NIST, and OSTP across
          multiple administrations. These career arcs trace the well-worn path between government,
          industry, and the think tank world. The pattern suggests that "AI governance" as a
          professional field is small enough that a few dozen individuals can hold positions across
          multiple institutional categories over a career.
        </Para>

        <Para>
          The network is strikingly centralized. Most entities in the database have zero or one
          tracked connection. The median is zero. A handful of hubs, mostly government convening
          bodies, concentrate the connectivity. This means the governance network is fragile: remove
          a few key convening institutions and the field fragments into disconnected clusters.
        </Para>

        <Finding>
          Government convening bodies (the Senate AI Working Group, OSTP) are the highest-traffic
          hubs. Remove them and the governance network fragments. The "revolving door" between
          government, industry, and think tanks is compact enough that dozens of individuals recur
          across multiple institutional categories.
        </Finding>

        <hr className="border-none border-t-[0.5px] border-[#bbb] my-10" />

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION 5: THE GAPS                         */}
        {/* ═══════════════════════════════════════════ */}
        <SectionLabel id="the-gaps">V. The Gaps</SectionLabel>

        <Para>
          Five metro areas contain over a third of all entities in our database: San Francisco (55),
          Washington D.C. (49), London (37), Berkeley (34), and Cambridge (21). Add New York (18)
          and Oxford (11) and you account for nearly half the field. U.S. AI governance is
          geographically concentrated in a handful of coastal and university cities. The Midwest,
          the South, rural America, and the Global South are almost entirely absent.
        </Para>

        <ChartContainer
          title="Geographic concentration of AI governance entities"
          source="Source: Mapping AI database. Bars show top 12 metro areas by entity count."
        >
          <ChartGeography entities={[...people, ...orgs]} />
        </ChartContainer>

        <Para>
          The expertise gap is just as stark. The categories in our database cluster around computer
          science, law, policy, and philosophy. Of the {people.length || 131} people mapped, 60 are
          policymakers and 21 are executives. Only 9 are organizers. Only 1 is a cultural figure.
          Labor economists, public health researchers, environmental scientists, supply chain
          experts, civil rights lawyers outside the major advocacy orgs, educators, social workers:
          these fields are deeply affected by AI deployment, and they're nearly invisible in the
          governance infrastructure.
        </Para>

        <Para>
          The threat model data underscores the point. "Environmental" concerns appear in only 24 of
          493 entities with threat model data (5%). "Copyright/IP" shows up in 14 (3%). "Labor
          displacement," while ranked higher at 127 mentions, still trails "loss of control" (300)
          and "existential risk" (229) by a wide margin. The governance field's theory of harm is
          dominated by abstract, long-horizon risks. The concrete, present-tense harms that affect
          workers, artists, patients, and communities today receive a fraction of the institutional
          attention.
        </Para>

        <ChartContainer
          title="Threat model frequency across all entities"
          source="Source: Mapping AI database. Count = number of entities selecting each threat model."
        >
          <ChartThreatFrequency entities={[...people, ...orgs]} tooltipEl={tooltipRef.current} />
        </ChartContainer>

        <Para>
          Two entities in our entire database are categorized under "Ethics/Bias/Rights." Two. In a
          field with 140 AI Safety organizations. The absence is its own finding. The organizations
          that dominate U.S. AI governance are overwhelmingly focused on the risk that future AI
          systems might be too powerful, and comparatively uninterested in the harm that current AI
          systems are already doing.
        </Para>

        <Finding>
          U.S. AI governance is geographically concentrated in five metro areas, professionally
          dominated by CS/law/policy backgrounds, and institutionally focused on abstract
          long-horizon risks. Concrete present-tense harms (labor displacement, environmental
          impact, civil rights) and the communities experiencing them are underrepresented by an
          order of magnitude.
        </Finding>

        <hr className="border-none border-t-[0.5px] border-[#bbb] my-10" />

        {/* ═══════════════════════════════════════════ */}
        {/* SECTION 6: METHOD                           */}
        {/* ═══════════════════════════════════════════ */}
        <SectionLabel id="method">Method & Limitations</SectionLabel>

        <Para>
          This analysis draws from the Mapping AI database, a collaboratively maintained dataset of
          people, organizations, and resources involved in U.S. AI governance. Entity data includes
          regulatory stance (scored 1-6), AGI timeline estimates, AI risk level assessments, threat
          model selections, funding models, locations, and organizational affiliations. Belief
          scores are weighted averages of crowdsourced submissions, with weights reflecting the
          submitter's relationship to the entity (self-reported: 10x, connector: 2x, external: 1x).
        </Para>

        <Para>
          The database is not a census. It overrepresents entities that are publicly visible,
          English-language, and connected to existing networks of AI safety and policy research. The
          140 AI Safety/Alignment organizations reflect both a genuine concentration in the field
          and a sampling bias: the project's contributors are more likely to know about and submit
          safety-focused entities. These findings should be read as observations about the mapped
          landscape, not definitive claims about the field as a whole. We welcome{' '}
          <a href="/contribute" className="text-[#2563eb] no-underline hover:underline">
            contributions
          </a>{' '}
          to expand coverage.
        </Para>

        <Para>
          All charts on this page are generated live from the current database export. As new
          entities and relationships are added, the analysis updates automatically. Last data
          export: <span className="font-mono">{dataDate}</span>.
        </Para>

        {/* Footer */}
        <div className="flex justify-center items-center gap-2 mt-12 pt-6 border-t border-[#bbb]/50">
          <span className="font-mono text-[10.5px] text-[#888] tracking-[0.06em]">
            <a href="/" className="text-[#888] no-underline hover:underline">
              Mapping AI
            </a>
          </span>
          <span className="font-mono text-[10.5px] text-[#888]">&middot;</span>
          <span className="font-mono text-[10.5px] text-[#888] tracking-[0.06em]">
            <a href="/map" className="text-[#888] no-underline hover:underline">
              Explore the Map
            </a>
          </span>
          <span className="font-mono text-[10.5px] text-[#888]">&middot;</span>
          <span className="font-mono text-[10.5px] text-[#888] tracking-[0.06em]">
            <a href="/contribute" className="text-[#888] no-underline hover:underline">
              Contribute Data
            </a>
          </span>
        </div>
      </article>
    </>
  )
}
