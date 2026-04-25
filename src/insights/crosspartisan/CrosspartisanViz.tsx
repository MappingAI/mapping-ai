import { useState, useEffect, useRef, useMemo } from 'react'
import policymakersData from './data/policymakers.json'
import claimsData from './data/claims.json'
import policyAreasData from './data/policy-areas.json'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

interface Policymaker {
  person_id: number
  name: string
  party: 'D' | 'R' | 'I' | null
  title: string | null
  primary_org: string | null
  aggregate_stance_score: number | null
  aggregate_timeline_score: number | null
  aggregate_risk_score: number | null
  ideology_score: number | null
}

const PARTY_COLOR: Record<string, string> = {
  D: '#1e6fd1',
  R: '#d6342c',
  I: '#9b6bcc',
}

const STANCE_LABELS = ['Accelerate', 'Light-touch', 'Targeted', 'Moderate', 'Restrictive', 'Precautionary']

interface TooltipShim {
  show: (evt: MouseEvent, html: string) => void
  hide: () => void
}

function makeTooltip(): TooltipShim {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  const ref: HTMLDivElement | null = w.__cpTooltip ?? null
  if (ref) return w.__cpTooltipApi
  const el = document.createElement('div')
  el.className =
    'fixed bg-white border border-[#bbb] rounded px-3 py-2 font-mono text-[11px] text-[#1a1a1a] pointer-events-none z-[9999] max-w-[280px] leading-[1.4]'
  el.style.cssText = 'box-shadow: 0 2px 8px rgba(0,0,0,0.08); opacity: 0; left: 0; top: 0;'
  document.body.appendChild(el)
  w.__cpTooltip = el
  const api: TooltipShim = {
    show: (evt, html) => {
      el.innerHTML = html
      el.style.left = evt.clientX + 12 + 'px'
      el.style.top = evt.clientY + 12 + 'px'
      el.style.opacity = '1'
    },
    hide: () => {
      el.style.opacity = '0'
    },
  }
  w.__cpTooltipApi = api
  return api
}

function tooltipHtml(p: Policymaker): string {
  const partyLabel = p.party === 'D' ? 'Democrat' : p.party === 'R' ? 'Republican' : 'Independent'
  const stance =
    p.aggregate_stance_score != null ? STANCE_LABELS[p.aggregate_stance_score - 1] || '—' : 'no stance recorded'
  return `
    <div style="font-weight:500; margin-bottom:2px;">${escapeHtml(p.name)}</div>
    <div style="color:#666; font-size:10px; margin-bottom:4px;">${escapeHtml(p.title || '')}</div>
    <div style="color:${PARTY_COLOR[p.party || ''] || '#666'}; font-weight:500;">${partyLabel}</div>
    <div style="color:#888; font-size:10px;">Aggregate stance: ${escapeHtml(String(stance))}</div>
  `
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/* ────────────────────────────────────────────
   Beeswarm: one swarm, x = aggregate stance, color = party
   ──────────────────────────────────────────── */
function BeeswarmStance({ data }: { data: Policymaker[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const container = ref.current
    container.innerHTML = ''

    const W = container.clientWidth || 700
    const H = 320
    const padL = 30,
      padR = 30,
      padT = 30,
      padB = 60

    const tip = makeTooltip()

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    const xScale = d3
      .scaleLinear()
      .domain([0.5, 6.5])
      .range([padL, W - padR])

    // Axis labels
    STANCE_LABELS.forEach((label, i) => {
      svg
        .append('text')
        .attr('x', xScale(i + 1))
        .attr('y', H - padB + 18)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#666')
        .text(label)
      svg
        .append('line')
        .attr('x1', xScale(i + 1))
        .attr('x2', xScale(i + 1))
        .attr('y1', H - padB)
        .attr('y2', H - padB + 4)
        .attr('stroke', '#bbb')
        .attr('stroke-width', 0.5)
    })
    svg
      .append('line')
      .attr('x1', padL)
      .attr('x2', W - padR)
      .attr('y1', H - padB)
      .attr('y2', H - padB)
      .attr('stroke', '#bbb')
      .attr('stroke-width', 0.5)

    const filtered = data.filter((p) => p.party && p.aggregate_stance_score != null)
    const nodes = filtered.map((p) => ({
      ...p,
      x: xScale(p.aggregate_stance_score!),
      y: H - padB - 10,
    }))

    const sim = d3
      .forceSimulation(nodes)
      .force('x', d3.forceX((d: { x: number }) => d.x).strength(1))
      .force('y', d3.forceY(H / 2 + 10).strength(0.06))
      .force('collide', d3.forceCollide(5.5))
      .stop()

    for (let i = 0; i < 200; i++) sim.tick()

    svg
      .selectAll('circle.node')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'node')
      .attr('cx', (d: { x: number }) => d.x)
      .attr('cy', (d: { y: number }) => d.y)
      .attr('r', 5)
      .attr('fill', (d: Policymaker) => PARTY_COLOR[d.party || ''] || '#888')
      .attr('opacity', 0.85)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', (evt: MouseEvent, d: Policymaker) => tip.show(evt, tooltipHtml(d)))
      .on('mousemove', (evt: MouseEvent, d: Policymaker) => tip.show(evt, tooltipHtml(d)))
      .on('mouseout', () => tip.hide())

    // Legend
    const legend = svg.append('g').attr('transform', `translate(${padL}, ${padT - 12})`)
    const legendItems = [
      { label: 'Democrat', key: 'D' },
      { label: 'Republican', key: 'R' },
      { label: 'Independent', key: 'I' },
    ]
    legendItems.forEach((item, i) => {
      const g = legend.append('g').attr('transform', `translate(${i * 100}, 0)`)
      g.append('circle').attr('r', 4).attr('cx', 4).attr('cy', 0).attr('fill', PARTY_COLOR[item.key])
      g.append('text')
        .attr('x', 12)
        .attr('y', 3)
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', '#555')
        .text(item.label)
    })
  }, [data])

  return <div ref={ref} />
}

/* ────────────────────────────────────────────
   Horseshoe: U-shaped arc layout
   - Angular position: party (D on left curve, R on right curve)
     with within-party spread driven by stance for now
     (will become DW-NOMINATE when ideology_score populates)
   - Radial: stance score (precautionary near top of U, accelerate at base)
   ──────────────────────────────────────────── */
function HorseshoePlot({ data }: { data: Policymaker[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const container = ref.current
    container.innerHTML = ''

    const W = container.clientWidth || 700
    const H = 520
    const cx = W / 2
    const cy = 100
    const rOuter = Math.min(W * 0.38, 280)
    const rInner = rOuter * 0.5

    const tip = makeTooltip()

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    // Filter to partisans with a stance
    const filtered = data.filter((p) => p.party && p.aggregate_stance_score != null)

    // Angular layout: D on left half of arc (180° to 270°), R on right (270° to 360°)
    // I goes at the dead center bottom (270°)
    // Within party, stance offsets you slightly (more accelerationist = closer to extreme of arc)
    const partyAngle = (p: Policymaker): number => {
      const stance = p.aggregate_stance_score!
      // Normalize stance 1..6 to a within-party offset
      // Accelerate(1) → outer of party arc (further from center), Precautionary(6) → inner (closer to center bottom)
      // We map party_stance to the arc-position within party
      // For D (left half): angle goes from PI (180°, accelerate) to 1.5*PI - 0.05 (just before bottom, precautionary)
      // For R (right half): angle goes from 1.5*PI + 0.05 (just after bottom, precautionary) to 2*PI (360°, accelerate)
      // For I: 1.5*PI exactly
      if (p.party === 'I') return 1.5 * Math.PI
      // map stance 1 (Accelerate) → 0, stance 6 (Precautionary) → 1
      const t = (stance - 1) / 5
      if (p.party === 'D') {
        // 1.0π (left, accelerate) to 1.5π (bottom, precautionary)
        return Math.PI + t * 0.5 * Math.PI
      }
      // R: 2.0π (right, accelerate) to 1.5π (bottom, precautionary)
      // So accelerate at angle = 2π, precautionary at angle = 1.5π
      return 2 * Math.PI - t * 0.5 * Math.PI
    }

    // Draw guide rings (stance levels 1..6)
    const stanceRadius = (stance: number) => {
      const t = (stance - 1) / 5
      return rInner + (1 - t) * (rOuter - rInner)
    }

    for (let s = 1; s <= 6; s++) {
      const r = stanceRadius(s)
      svg
        .append('path')
        .attr(
          'd',
          d3
            .arc()
            .innerRadius(r)
            .outerRadius(r + 0.5)
            .startAngle(-Math.PI / 2)
            .endAngle(Math.PI / 2)(),
        )
        .attr('transform', `translate(${cx},${cy})`)
        .attr('fill', '#ddd')
        .attr('stroke', 'none')

      // Label at the right end of each ring arc (angle = 0, which is right side)
      svg
        .append('text')
        .attr('x', cx + r + 6)
        .attr('y', cy + 4)
        .attr('text-anchor', 'start')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 8)
        .attr('fill', '#bbb')
        .text(STANCE_LABELS[s - 1])
    }

    // Place nodes
    const nodes = filtered.map((p) => {
      const angle = partyAngle(p)
      const r = stanceRadius(p.aggregate_stance_score!)
      // Convert math angle (0=east, π/2=north) to screen angle
      // We want: angle π = left, 1.5π = bottom, 2π = right
      // Screen: x = cx + r*cos(angle), y = cy + r*sin(angle)
      // But "down" in screen is +y. Math angle 1.5π = (cos=0, sin=-1) which is up.
      // We want bottom of horseshoe to be DOWN. So use sin(angle - π) so that 1.5π-π = 0.5π → sin = 1 → +y (down). Hmm let's just adjust.
      // Easier: use angle directly with x = cx + r*cos(angle), y = cy - r*sin(angle), so up is positive sin.
      // Then we want the horseshoe opening to face up.
      // Map: D party arc angle goes π..1.5π. cos(π)=-1, sin(π)=0 → (-r, 0): left mid.
      //      cos(1.5π)=0, sin(1.5π)=-1 → (0, +r): below center (since y=cy-r*sin = cy-r*(-1) = cy+r).
      // So D's accelerate is left mid, precautionary is at bottom. R's accelerate is right mid (cos(2π)=1, sin(2π)=0).
      // The U opens upward.
      const x = cx + r * Math.cos(angle)
      const y = cy - r * Math.sin(angle)
      return { ...p, x, y, _origX: x, _origY: y }
    })

    // Light collision adjustment so nodes don't fully overlap
    const sim = d3
      .forceSimulation(nodes)
      .force('x', d3.forceX((d: { _origX: number }) => d._origX).strength(0.6))
      .force('y', d3.forceY((d: { _origY: number }) => d._origY).strength(0.6))
      .force('collide', d3.forceCollide(5))
      .stop()
    for (let i = 0; i < 120; i++) sim.tick()

    svg
      .selectAll('circle.node')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'node')
      .attr('cx', (d: { x: number }) => d.x)
      .attr('cy', (d: { y: number }) => d.y)
      .attr('r', 4.5)
      .attr('fill', (d: Policymaker) => PARTY_COLOR[d.party || ''] || '#888')
      .attr('opacity', 0.85)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', (evt: MouseEvent, d: Policymaker) => tip.show(evt, tooltipHtml(d)))
      .on('mousemove', (evt: MouseEvent, d: Policymaker) => tip.show(evt, tooltipHtml(d)))
      .on('mouseout', () => tip.hide())

    // Party labels inside the arc, near the tips
    svg
      .append('text')
      .attr('x', cx - rOuter * 0.65)
      .attr('y', cy - 12)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 11)
      .attr('font-weight', 500)
      .attr('fill', PARTY_COLOR.D)
      .text('Democrats')
    svg
      .append('text')
      .attr('x', cx + rOuter * 0.65)
      .attr('y', cy - 12)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 11)
      .attr('font-weight', 500)
      .attr('fill', PARTY_COLOR.R)
      .text('Republicans')

    svg
      .append('text')
      .attr('x', cx)
      .attr('y', cy + rOuter + 30)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 9)
      .attr('fill', '#999')
      .text('↑ Precautionary extremes converge here ↑')
  }, [data])

  return <div ref={ref} />
}

/* ────────────────────────────────────────────
   Per-issue beeswarm: stacked beeswarms, one per policy area
   ──────────────────────────────────────────── */

interface Claim {
  claim_id: string
  person_id: number
  person_name: string
  policy_area: string
  stance: number
  stance_label: string
  quote: string
  source_url: string
  source_title: string
  date_stated: string
  confidence: string
  notes: string | null
}

interface PolicyArea {
  id: string
  label: string
}

const AREA_ENDPOINTS: Record<string, { oppose: string; support: string }> = {
  state_preemption: { oppose: '← States regulate', support: 'Federal preempts →' },
  open_source_weights: { oppose: '← Keep open', support: 'Restrict weights →' },
  compute_governance: { oppose: '← No thresholds', support: 'Require reporting →' },
  export_controls_chips: { oppose: '← Loosen controls', support: 'Tighten controls →' },
  pre_deployment_testing: { oppose: '← Voluntary', support: 'Mandatory evals →' },
  liability: { oppose: '← Safe harbor', support: 'Strict liability →' },
}

function lastName(name: string): string {
  const parts = name.split(' ')
  return parts[parts.length - 1] || name
}

function PerIssueBeeswarm() {
  const claims = useMemo(() => claimsData.claims as Claim[], [])
  const policyAreas = useMemo(() => policyAreasData.policy_areas as PolicyArea[], [])
  const policymakerLookup = useMemo(() => {
    const m = new Map<number, Policymaker>()
    for (const p of policymakersData.policymakers as Policymaker[]) m.set(p.person_id, p)
    return m
  }, [])

  const areasWithClaims = useMemo(
    () => policyAreas.filter((a) => claims.some((c) => c.policy_area === a.id)),
    [policyAreas, claims],
  )

  return (
    <div className="space-y-1">
      {/* Legend */}
      <div className="flex gap-5 mb-4">
        {[
          { label: 'Democrat', color: PARTY_COLOR.D },
          { label: 'Republican', color: PARTY_COLOR.R },
          { label: 'Independent', color: PARTY_COLOR.I },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
            <span className="font-mono text-[10px] text-[#555]">{item.label}</span>
          </div>
        ))}
      </div>

      {areasWithClaims.map((area) => (
        <PerIssueRow
          key={area.id}
          area={area}
          claims={claims.filter((c) => c.policy_area === area.id)}
          policymakerLookup={policymakerLookup}
        />
      ))}
    </div>
  )
}

function PerIssueRow({
  area,
  claims: areaClaims,
  policymakerLookup,
}: {
  area: PolicyArea
  claims: Claim[]
  policymakerLookup: Map<number, Policymaker>
}) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = (svgRef.current.parentElement?.clientWidth || 700) - 2
    const padL = 16
    const padR = 16

    const tip = makeTooltip()

    const xScale = d3
      .scaleLinear()
      .domain([-2.6, 2.6])
      .range([padL, W - padR])

    const byPerson = d3.group(areaClaims, (c: Claim) => c.person_id) as Map<number, Claim[]>
    const dotData = Array.from(byPerson.entries()).map(([pid, personClaims]) => {
      const avg = d3.mean(personClaims, (c: Claim) => c.stance) as number
      const pm = policymakerLookup.get(pid)
      return {
        person_id: pid,
        name: personClaims[0]!.person_name,
        lastName: lastName(personClaims[0]!.person_name),
        party: pm?.party || null,
        title: pm?.title || null,
        stance: avg,
        claimCount: personClaims.length,
      }
    })

    const labelH = 16
    const dotR = 5
    const labelZoneH = Math.max(30, dotData.length * labelH + 6)
    const axisY = labelZoneH + 6
    const totalH = axisY + 16

    const sorted = [...dotData].sort((a, b) => a.stance - b.stance || (a.party || '').localeCompare(b.party || ''))

    svg.attr('viewBox', `0 0 ${W} ${totalH}`).attr('width', W).attr('height', totalH)

    // Axis line
    svg
      .append('line')
      .attr('x1', xScale(-2))
      .attr('x2', xScale(2))
      .attr('y1', axisY)
      .attr('y2', axisY)
      .attr('stroke', '#ddd')
      .attr('stroke-width', 1)

    // Tick marks
    ;[-2, -1, 0, 1, 2].forEach((v) => {
      svg
        .append('line')
        .attr('x1', xScale(v))
        .attr('x2', xScale(v))
        .attr('y1', axisY - 3)
        .attr('y2', axisY + 3)
        .attr('stroke', '#ccc')
    })

    // Dots on the axis
    svg
      .selectAll(null)
      .data(sorted)
      .enter()
      .append('circle')
      .attr('cx', (d: { stance: number }) => xScale(d.stance))
      .attr('cy', axisY)
      .attr('r', dotR)
      .attr('fill', (d: { party: string | null }) => PARTY_COLOR[d.party || ''] || '#888')
      .attr('opacity', 0.9)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on(
        'mouseover',
        (
          evt: MouseEvent,
          d: { name: string; party: string | null; title: string | null; stance: number; claimCount: number },
        ) => {
          const partyLabel = d.party === 'D' ? 'Democrat' : d.party === 'R' ? 'Republican' : 'Independent'
          tip.show(
            evt,
            `<div style="font-weight:500; margin-bottom:2px;">${escapeHtml(d.name)}</div>
            <div style="color:#666; font-size:10px; margin-bottom:4px;">${escapeHtml(d.title || '')}</div>
            <div style="color:${PARTY_COLOR[d.party || ''] || '#666'}; font-weight:500;">${partyLabel}</div>
            <div style="color:#888; font-size:10px;">Stance: ${d.stance > 0 ? '+' : ''}${d.stance.toFixed(1)} (${d.claimCount} claim${d.claimCount > 1 ? 's' : ''})</div>`,
          )
        },
      )
      .on('mouseout', () => tip.hide())

    // Labels stacked vertically above the axis, each with a leader line down to its dot
    sorted.forEach((d, i) => {
      const dotX = xScale(d.stance)
      const labelY = 4 + i * labelH + labelH * 0.7

      // Leader line
      svg
        .append('line')
        .attr('x1', dotX)
        .attr('x2', dotX)
        .attr('y1', labelY + 3)
        .attr('y2', axisY - dotR - 1)
        .attr('stroke', PARTY_COLOR[d.party || ''] || '#ccc')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.3)

      // Name label
      svg
        .append('text')
        .attr('x', dotX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 10)
        .attr('fill', PARTY_COLOR[d.party || ''] || '#666')
        .attr('font-weight', 500)
        .text(d.lastName)
    })
  }, [areaClaims, policymakerLookup, area])

  const endpoints = AREA_ENDPOINTS[area.id]

  return (
    <div className="pb-3 mb-3 border-b border-[#eee] last:border-0">
      <div className="flex justify-between items-baseline mb-0.5">
        <div className="font-mono text-[11px] font-medium text-[#1a1a1a]">{area.label}</div>
        <div className="font-mono text-[9px] text-[#aaa]">
          {areaClaims.length} claim{areaClaims.length !== 1 ? 's' : ''}
        </div>
      </div>
      {endpoints && (
        <div className="flex justify-between font-mono text-[8px] text-[#999] mb-1">
          <span>{endpoints.oppose}</span>
          <span>{endpoints.support}</span>
        </div>
      )}
      <svg ref={svgRef} className="w-full block" />
    </div>
  )
}

/* ────────────────────────────────────────────
   Top-level component with tab toggle
   ──────────────────────────────────────────── */
export function CrosspartisanViz() {
  const [view, setView] = useState<'by-issue' | 'horseshoe' | 'beeswarm'>('by-issue')

  const data = useMemo<Policymaker[]>(
    () => (policymakersData.policymakers as Policymaker[]).filter((p) => p.party && p.aggregate_stance_score != null),
    [],
  )

  const claimCount = (claimsData.claims as Claim[]).length

  const counts = useMemo(() => {
    const c = { D: 0, R: 0, I: 0 }
    data.forEach((p) => {
      if (p.party === 'D' || p.party === 'R' || p.party === 'I') c[p.party]++
    })
    return c
  }, [data])

  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap">
        {(['by-issue', 'horseshoe', 'beeswarm'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`font-mono text-[10px] tracking-[0.08em] uppercase px-3 py-1.5 rounded transition-colors ${
              view === v ? 'bg-[#1a1a1a] text-white' : 'bg-[#eee] text-[#555] hover:bg-[#ddd]'
            }`}
          >
            {v === 'by-issue' ? 'By Issue' : v}
          </button>
        ))}
        <div className="font-mono text-[10px] text-[#888] self-center ml-2">
          {view === 'by-issue'
            ? `${claimCount} claims across 6 issues`
            : `${data.length} policymakers · ${counts.D} D · ${counts.R} R · ${counts.I} I`}
        </div>
      </div>
      {view === 'by-issue' ? (
        <PerIssueBeeswarm />
      ) : view === 'beeswarm' ? (
        <BeeswarmStance data={data} />
      ) : (
        <HorseshoePlot data={data} />
      )}
    </div>
  )
}
