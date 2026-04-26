import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import entitiesData from './data/entities.json'
import claimsData from './data/claims.json'
import policyAreasData from './data/policy-areas.json'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

interface CrosspartisanEntity {
  entity_id: number
  name: string
  entity_type: 'person' | 'organization'
  category: string
  party: 'D' | 'R' | 'I' | null
  title: string | null
  primary_org: string | null
  aggregate_stance_score: number | null
}

const PARTY_COLOR: Record<string, string> = {
  D: '#1e6fd1',
  R: '#d6342c',
  I: '#9b6bcc',
}

const ORG_COLOR = '#2d8659'

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

function entityTooltipHtml(e: CrosspartisanEntity): string {
  if (e.entity_type === 'organization') {
    const stance =
      e.aggregate_stance_score != null ? STANCE_LABELS[e.aggregate_stance_score - 1] || '—' : 'no stance recorded'
    return `
      <div style="font-weight:500; margin-bottom:2px;">${escapeHtml(e.name)}</div>
      <div style="color:#666; font-size:10px; margin-bottom:4px;">${escapeHtml(e.category || '')}</div>
      <div style="color:${ORG_COLOR}; font-weight:500;">Organization</div>
      <div style="color:#888; font-size:10px;">Aggregate stance: ${escapeHtml(String(stance))}</div>
    `
  }
  const partyLabel = e.party === 'D' ? 'Democrat' : e.party === 'R' ? 'Republican' : 'Independent'
  const stance =
    e.aggregate_stance_score != null ? STANCE_LABELS[e.aggregate_stance_score - 1] || '—' : 'no stance recorded'
  return `
    <div style="font-weight:500; margin-bottom:2px;">${escapeHtml(e.name)}</div>
    <div style="color:#666; font-size:10px; margin-bottom:4px;">${escapeHtml(e.title || '')}</div>
    <div style="color:${PARTY_COLOR[e.party || ''] || '#666'}; font-weight:500;">${partyLabel}</div>
    <div style="color:#888; font-size:10px;">Aggregate stance: ${escapeHtml(String(stance))}</div>
  `
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function dotColor(e: { entity_type: string; party: string | null }): string {
  if (e.entity_type === 'organization') return ORG_COLOR
  return PARTY_COLOR[e.party || ''] || '#888'
}

function emitEntitySelect(entityId: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tip = (window as any).__cpTooltip as HTMLDivElement | null
  if (tip) tip.style.opacity = '0'
  window.dispatchEvent(new CustomEvent('cp-entity-select', { detail: entityId }))
}

interface Source {
  source_id: string
  url: string
  title: string | null
  type: string | null
  published: string | null
  author: string | null
}

const AREA_LABELS: Record<string, string> = {
  state_preemption: 'State preemption',
  open_source_weights: 'Open-source weights',
  compute_governance: 'Compute governance',
  export_controls_chips: 'Export controls',
  pre_deployment_testing: 'Pre-deployment testing',
  liability: 'Liability',
}

function EntityDetailPanel({ entityId, onClose }: { entityId: number; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const entity = useMemo(
    () => (entitiesData.entities as CrosspartisanEntity[]).find((e) => e.entity_id === entityId),
    [entityId],
  )
  const claims = useMemo(() => (claimsData.claims as Claim[]).filter((c) => c.entity_id === entityId), [entityId])
  const sourceMap = useMemo(() => {
    const m = new Map<string, Source>()
    for (const s of claimsData.sources as Source[]) m.set(s.source_id, s)
    return m
  }, [])

  useEffect(() => {
    panelRef.current?.scrollTo(0, 0)
  }, [entityId])

  if (!entity) return null

  const byArea = new Map<string, Claim[]>()
  for (const c of claims) {
    const list = byArea.get(c.policy_area) || []
    list.push(c)
    byArea.set(c.policy_area, list)
  }

  const partyLabel =
    entity.entity_type === 'organization'
      ? entity.category
      : entity.party === 'D'
        ? 'Democrat'
        : entity.party === 'R'
          ? 'Republican'
          : entity.category

  const handleClose = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tip = (window as any).__cpTooltip as HTMLDivElement | null
    if (tip) tip.style.opacity = '0'
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[10vh]"
      style={{ background: 'rgba(0,0,0,0.2)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        ref={panelRef}
        className="bg-white border border-[#ddd] rounded-lg shadow-xl overflow-y-auto w-[90vw] max-w-[560px]"
        style={{ maxHeight: '75vh' }}
      >
        <div className="sticky top-0 bg-white border-b border-[#eee] px-4 py-2.5 flex justify-between items-start z-10 rounded-t-lg">
          <div className="min-w-0 flex-1 pr-4">
            <div className="font-mono text-[13px] font-medium text-[#1a1a1a]">{entity.name}</div>
            <div className="font-mono text-[10px] text-[#888] mt-0.5">
              <span style={{ color: dotColor(entity) }}>{partyLabel}</span>
              {entity.title && ` · ${entity.title}`}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="font-mono text-[16px] text-[#999] hover:text-[#333] px-2 py-0.5 -mr-2 flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3">
          {claims.length === 0 ? (
            <div className="font-mono text-[11px] text-[#999]">No crosspartisan claims for this entity.</div>
          ) : (
            <div className="space-y-4">
              {Array.from(byArea.entries()).map(([areaId, areaClaims]) => (
                <div key={areaId}>
                  <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#888] mb-1.5">
                    {AREA_LABELS[areaId] || areaId}
                  </div>
                  <div className="space-y-2.5">
                    {areaClaims.map((c) => {
                      const src = sourceMap.get(c.source_id)
                      return (
                        <div key={c.claim_id} className="border-l-2 border-[#ddd] pl-3">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span
                              className="font-mono text-[11px] font-medium"
                              style={{
                                color: c.stance >= 1 ? '#1e6fd1' : c.stance <= -1 ? '#d6342c' : '#888',
                              }}
                            >
                              {c.stance > 0 ? '+' : ''}
                              {c.stance} {c.stance_label}
                            </span>
                            <span
                              className="font-mono text-[8px] uppercase px-1 py-0.5 rounded"
                              style={{
                                background:
                                  c.confidence === 'high'
                                    ? '#e8f5e9'
                                    : c.confidence === 'medium'
                                      ? '#fff8e1'
                                      : '#fce4ec',
                                color:
                                  c.confidence === 'high'
                                    ? '#2e7d32'
                                    : c.confidence === 'medium'
                                      ? '#f57f17'
                                      : '#c62828',
                              }}
                            >
                              {c.confidence}
                            </span>
                          </div>
                          <blockquote className="font-serif text-[13px] text-[#444] leading-[1.45] italic mb-1">
                            &ldquo;{c.citation}&rdquo;
                          </blockquote>
                          {src && (
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[10px] text-[#2563eb] hover:underline block truncate"
                            >
                              {src.title || src.url}
                            </a>
                          )}
                          <div className="font-mono text-[9px] text-[#bbb] mt-0.5">
                            {[src?.type, c.date_stated, src?.author].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ────────────────────────────────────────────
   Beeswarm: one swarm, x = aggregate stance, color = party/org
   ──────────────────────────────────────────── */
function BeeswarmStance({ data }: { data: CrosspartisanEntity[] }) {
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

    const filtered = data.filter((e) => e.aggregate_stance_score != null)
    const nodes = filtered.map((e) => ({
      ...e,
      x: xScale(e.aggregate_stance_score!),
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
      .attr('fill', (d: CrosspartisanEntity) => dotColor(d))
      .attr('opacity', 0.85)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', (evt: MouseEvent, d: CrosspartisanEntity) => tip.show(evt, entityTooltipHtml(d)))
      .on('mousemove', (evt: MouseEvent, d: CrosspartisanEntity) => tip.show(evt, entityTooltipHtml(d)))
      .on('mouseout', () => tip.hide())
      .on('click', (_: MouseEvent, d: CrosspartisanEntity) => emitEntitySelect(d.entity_id))

    const legend = svg.append('g').attr('transform', `translate(${padL}, ${padT - 12})`)
    const legendItems = [
      { label: 'Democrat', color: PARTY_COLOR.D },
      { label: 'Republican', color: PARTY_COLOR.R },
      { label: 'Organization', color: ORG_COLOR },
    ]
    legendItems.forEach((item, i) => {
      const g = legend.append('g').attr('transform', `translate(${i * 100}, 0)`)
      g.append('circle').attr('r', 4).attr('cx', 4).attr('cy', 0).attr('fill', item.color)
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
   Horseshoe: U-shaped arc layout (policymakers only)
   ──────────────────────────────────────────── */
function HorseshoePlot({ data }: { data: CrosspartisanEntity[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const container = ref.current
    container.innerHTML = ''

    const W = container.clientWidth || 700
    const rOuter = Math.min(W * 0.38, 260)
    const rInner = rOuter * 0.45
    const cx = W / 2
    const cy = rOuter * 0.35
    const H = cy + rOuter + 35

    const tip = makeTooltip()

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    const filtered = data.filter((e) => e.entity_type === 'person' && e.party && e.aggregate_stance_score != null)

    const partyAngle = (p: CrosspartisanEntity): number => {
      const stance = p.aggregate_stance_score!
      const t = (stance - 1) / 5
      if (p.party === 'D') return Math.PI + t * 0.5 * Math.PI
      return 2 * Math.PI - t * 0.5 * Math.PI
    }

    const stanceRadius = (stance: number) => {
      const t = (stance - 1) / 5
      return rInner + (1 - t) * (rOuter - rInner)
    }

    for (let s = 1; s <= 6; s++) {
      const r = stanceRadius(s)
      const opacity = 0.15 + ((6 - s) / 5) * 0.35
      svg
        .append('path')
        .attr(
          'd',
          d3
            .arc()
            .innerRadius(r)
            .outerRadius(r + 1)
            .startAngle(-Math.PI / 2)
            .endAngle(Math.PI / 2)(),
        )
        .attr('transform', `translate(${cx},${cy})`)
        .attr('fill', `rgba(0,0,0,${opacity})`)
        .attr('stroke', 'none')
    }

    // Stance legend (vertical stack, top-left, matching ring opacity)
    const legendG = svg.append('g').attr('transform', `translate(12, 8)`)
    STANCE_LABELS.forEach((label, i) => {
      const opacity = 0.15 + ((5 - i) / 5) * 0.35
      legendG
        .append('line')
        .attr('x1', 0)
        .attr('x2', 14)
        .attr('y1', i * 14 + 5)
        .attr('y2', i * 14 + 5)
        .attr('stroke', `rgba(0,0,0,${opacity})`)
        .attr('stroke-width', 2)
      legendG
        .append('text')
        .attr('x', 18)
        .attr('y', i * 14 + 8)
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 8)
        .attr('fill', '#999')
        .text(label)
    })

    const nodes = filtered.map((p) => {
      const angle = partyAngle(p)
      const r = stanceRadius(p.aggregate_stance_score!)
      const x = cx + r * Math.cos(angle)
      const y = cy - r * Math.sin(angle)
      return { ...p, x, y, _origX: x, _origY: y }
    })

    const sim = d3
      .forceSimulation(nodes)
      .force('x', d3.forceX((d: { _origX: number }) => d._origX).strength(0.6))
      .force('y', d3.forceY((d: { _origY: number }) => d._origY).strength(0.6))
      .force('collide', d3.forceCollide(5))
      .stop()
    for (let i = 0; i < 150; i++) sim.tick()

    svg
      .selectAll('circle.node')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'node')
      .attr('cx', (d: { x: number }) => d.x)
      .attr('cy', (d: { y: number }) => d.y)
      .attr('r', 4.5)
      .attr('fill', (d: CrosspartisanEntity) => PARTY_COLOR[d.party || ''] || '#999')
      .attr('opacity', (d: CrosspartisanEntity) => (d.party ? 0.85 : 0.5))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', (evt: MouseEvent, d: CrosspartisanEntity) => tip.show(evt, entityTooltipHtml(d)))
      .on('mousemove', (evt: MouseEvent, d: CrosspartisanEntity) => tip.show(evt, entityTooltipHtml(d)))
      .on('mouseout', () => tip.hide())
      .on('click', (_: MouseEvent, d: CrosspartisanEntity) => emitEntitySelect(d.entity_id))

    svg
      .append('text')
      .attr('x', cx - rOuter * 0.65)
      .attr('y', cy - 8)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 11)
      .attr('font-weight', 500)
      .attr('fill', PARTY_COLOR.D)
      .text('Democrats')
    svg
      .append('text')
      .attr('x', cx + rOuter * 0.65)
      .attr('y', cy - 8)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'DM Mono', monospace")
      .attr('font-size', 11)
      .attr('font-weight', 500)
      .attr('fill', PARTY_COLOR.R)
      .text('Republicans')

    svg
      .append('text')
      .attr('x', cx)
      .attr('y', cy + rOuter + 22)
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
   Shows policymakers (colored by party) and orgs (green)
   ──────────────────────────────────────────── */

interface Claim {
  claim_id: string
  entity_id: number
  entity_name: string
  entity_type: string
  policy_area: string
  stance: number
  stance_label: string
  citation: string
  source_id: string
  date_stated: string
  confidence: string
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

function PerIssueBeeswarm({ entityFilter }: { entityFilter: 'all' | 'people' | 'orgs' }) {
  const claims = useMemo(() => claimsData.claims as Claim[], [])
  const policyAreas = useMemo(() => policyAreasData.policy_areas as PolicyArea[], [])
  const entityLookup = useMemo(() => {
    const m = new Map<number, CrosspartisanEntity>()
    for (const e of entitiesData.entities as CrosspartisanEntity[]) m.set(e.entity_id, e)
    return m
  }, [])

  const filteredClaims = useMemo(() => {
    if (entityFilter === 'all') return claims
    return claims.filter((c) =>
      entityFilter === 'people' ? c.entity_type === 'person' : c.entity_type === 'organization',
    )
  }, [claims, entityFilter])

  const areasWithClaims = useMemo(
    () => policyAreas.filter((a) => filteredClaims.some((c) => c.policy_area === a.id)),
    [policyAreas, filteredClaims],
  )

  return (
    <div className="space-y-1">
      <div className="flex gap-5 mb-4">
        {[
          { label: 'Democrat', color: PARTY_COLOR.D },
          { label: 'Republican', color: PARTY_COLOR.R },
          { label: 'Organization', color: ORG_COLOR },
        ]
          .filter(
            (item) =>
              entityFilter === 'all' ||
              (entityFilter === 'people' ? item.label !== 'Organization' : item.label === 'Organization'),
          )
          .map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: item.color, borderRadius: item.label === 'Organization' ? '2px' : '50%' }}
              />
              <span className="font-mono text-[10px] text-[#555]">{item.label}</span>
            </div>
          ))}
      </div>

      {areasWithClaims.map((area) => (
        <PerIssueRow
          key={area.id}
          area={area}
          claims={filteredClaims.filter((c) => c.policy_area === area.id)}
          entityLookup={entityLookup}
        />
      ))}
    </div>
  )
}

function PerIssueRow({
  area,
  claims: areaClaims,
  entityLookup,
}: {
  area: PolicyArea
  claims: Claim[]
  entityLookup: Map<number, CrosspartisanEntity>
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

    const byEntity = d3.group(areaClaims, (c: Claim) => c.entity_id) as Map<number, Claim[]>
    const dotData = Array.from(byEntity.entries()).map(([eid, entityClaims]) => {
      const avg = d3.mean(entityClaims, (c: Claim) => c.stance) as number
      const entity = entityLookup.get(eid)
      return {
        entity_id: eid,
        name: entityClaims[0]!.entity_name,
        lastName: lastName(entityClaims[0]!.entity_name),
        entity_type: entityClaims[0]!.entity_type,
        party: entity?.party || null,
        category: entity?.category || null,
        title: entity?.title || null,
        stance: avg,
        claimCount: entityClaims.length,
      }
    })

    const dotR = 4.5

    // Run simulation at y=0 first, then compute bounds to set viewBox
    const nodes = dotData.map((d) => ({
      ...d,
      x: xScale(d.stance),
      y: 0,
    }))

    const sim = d3
      .forceSimulation(nodes)
      .force('x', d3.forceX((d: { stance: number }) => xScale(d.stance)).strength(1))
      .force('y', d3.forceY(0).strength(0.15))
      .force('collide', d3.forceCollide(dotR + 1.5))
      .stop()
    for (let i = 0; i < 200; i++) sim.tick()

    const minY = nodes.length > 0 ? d3.min(nodes, (d: { y: number }) => d.y) - dotR - 2 : -30
    const maxY = nodes.length > 0 ? d3.max(nodes, (d: { y: number }) => d.y) + dotR + 2 : 30
    const pad = 8
    const totalH = maxY - minY + pad * 2
    const offsetY = -minY + pad

    // Shift all nodes so the top is at pad
    for (const n of nodes) n.y += offsetY
    const axisY = offsetY

    svg.attr('viewBox', `0 0 ${W} ${totalH}`).attr('width', W).attr('height', totalH)

    svg
      .append('line')
      .attr('x1', xScale(-2))
      .attr('x2', xScale(2))
      .attr('y1', axisY)
      .attr('y2', axisY)
      .attr('stroke', '#ddd')
      .attr('stroke-width', 1)
    ;[-2, -1, 0, 1, 2].forEach((v) => {
      svg
        .append('line')
        .attr('x1', xScale(v))
        .attr('x2', xScale(v))
        .attr('y1', axisY - 3)
        .attr('y2', axisY + 3)
        .attr('stroke', '#ccc')
    })

    svg
      .selectAll(null)
      .data(nodes)
      .enter()
      .append('circle')
      .attr('cx', (d: { x: number }) => d.x)
      .attr('cy', (d: { y: number }) => d.y)
      .attr('r', dotR)
      .attr('fill', (d: { entity_type: string; party: string | null }) => dotColor(d))
      .attr('opacity', 0.9)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on(
        'mouseover',
        (
          evt: MouseEvent,
          d: {
            name: string
            entity_type: string
            party: string | null
            category: string | null
            title: string | null
            stance: number
            claimCount: number
          },
        ) => {
          const typeLabel =
            d.entity_type === 'organization'
              ? d.category || 'Organization'
              : d.party === 'D'
                ? 'Democrat'
                : d.party === 'R'
                  ? 'Republican'
                  : 'Policymaker'
          tip.show(
            evt,
            `<div style="font-weight:500; margin-bottom:2px;">${escapeHtml(d.name)}</div>
            <div style="color:#666; font-size:10px; margin-bottom:4px;">${escapeHtml(d.entity_type === 'organization' ? d.category || '' : d.title || '')}</div>
            <div style="color:${dotColor(d)}; font-weight:500;">${typeLabel}</div>
            <div style="color:#888; font-size:10px;">Stance: ${d.stance > 0 ? '+' : ''}${d.stance.toFixed(1)} (${d.claimCount} claim${d.claimCount > 1 ? 's' : ''})</div>`,
          )
        },
      )
      .on('mouseout', () => tip.hide())
      .on('click', (_: MouseEvent, d: { entity_id: number }) => emitEntitySelect(d.entity_id))
  }, [areaClaims, entityLookup, area])

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
  const [entityFilter, setEntityFilter] = useState<'all' | 'people' | 'orgs'>('all')
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null)

  useEffect(() => {
    const handler = (e: Event) => setSelectedEntityId((e as CustomEvent).detail)
    window.addEventListener('cp-entity-select', handler)
    return () => window.removeEventListener('cp-entity-select', handler)
  }, [])

  const allEntities = useMemo<CrosspartisanEntity[]>(() => entitiesData.entities as CrosspartisanEntity[], [])

  const policymakers = useMemo(() => allEntities.filter((e) => e.entity_type === 'person'), [allEntities])
  const orgs = useMemo(() => allEntities.filter((e) => e.entity_type === 'organization'), [allEntities])
  const claimCount = (claimsData.claims as Claim[]).length

  const partyCounts = useMemo(() => {
    const c = { D: 0, R: 0 }
    policymakers
      .filter((p) => p.party && p.aggregate_stance_score != null)
      .forEach((p) => {
        if (p.party === 'D') c.D++
        else if (p.party === 'R') c.R++
      })
    return c
  }, [policymakers])

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

        {view === 'by-issue' && (
          <div className="flex gap-1 ml-2">
            {(['all', 'people', 'orgs'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setEntityFilter(f)}
                className={`font-mono text-[10px] px-2 py-1 rounded transition-colors ${
                  entityFilter === f ? 'bg-[#555] text-white' : 'bg-[#f5f5f5] text-[#888] hover:bg-[#eee]'
                }`}
              >
                {f === 'all' ? 'All' : f === 'people' ? 'People' : 'Orgs'}
              </button>
            ))}
          </div>
        )}

        <div className="font-mono text-[10px] text-[#888] self-center ml-2">
          {view === 'by-issue'
            ? `${claimCount} claims · ${policymakers.length} policymakers · ${orgs.length} orgs`
            : view === 'horseshoe'
              ? `${partyCounts.D + partyCounts.R} policymakers · ${partyCounts.D} D · ${partyCounts.R} R`
              : `${allEntities.filter((e) => e.aggregate_stance_score != null).length} entities with stance data`}
        </div>
      </div>
      {view === 'by-issue' ? (
        <PerIssueBeeswarm entityFilter={entityFilter} />
      ) : view === 'beeswarm' ? (
        <BeeswarmStance data={allEntities} />
      ) : (
        <HorseshoePlot data={allEntities} />
      )}
      {selectedEntityId != null && (
        <EntityDetailPanel entityId={selectedEntityId} onClose={() => setSelectedEntityId(null)} />
      )}
    </div>
  )
}
