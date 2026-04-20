import { useEffect } from 'react'
import type { Entity, Edge } from '../../types/entity'
import { StanceIndicator } from './StanceIndicator'

interface ResourceDetailProps {
  resource: Entity | null
  byId: Map<number, Entity>
  relationships: Edge[]
  tracksContainingResource?: Array<{ id: string; title: string }>
  onClose: () => void
  onOpenResource: (id: number) => void
}

/**
 * Right-side slide-over detail panel. Closed state renders nothing.
 * Shared data shape with map.html's showDetail (both read toFrontendShape
 * output), though the rendering is parallel — see the R7 tech-debt note in
 * the plan.
 */
export function ResourceDetail({
  resource,
  byId,
  relationships,
  tracksContainingResource = [],
  onClose,
  onOpenResource,
}: ResourceDetailProps) {
  // Esc closes the panel
  useEffect(() => {
    if (!resource) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [resource, onClose])

  if (!resource) return null

  const authoredBy: Entity[] = []
  const cites: Entity[] = []
  const mentionedIn: Entity[] = []

  for (const edge of relationships) {
    const isSource = edge.source_id === resource.id
    const isTarget = edge.target_id === resource.id
    if (!isSource && !isTarget) continue
    const otherId = isSource ? edge.target_id : edge.source_id
    const other = byId.get(otherId)
    if (!other) continue
    const et = edge.relationship_type ?? ''
    if (et === 'authored_by' || et === 'authored') authoredBy.push(other)
    else if (et === 'cites' || et === 'cited_by') cites.push(other)
    else mentionedIn.push(other)
  }

  return (
    <>
      {/* Scrim */}
      <div className="fixed inset-0 z-40 bg-[#1a1a1a]/20 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      {/* Panel */}
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[720px] overflow-y-auto border-l border-[#d9d5c4] bg-[#fffef9] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resource-detail-title"
      >
        <div className="flex items-center justify-between border-b border-[#d9d5c4] px-6 py-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
            {(resource.format_tags ?? []).join(' · ') || resource.resource_type || 'Resource'}
            {resource.year && <span className="mx-1.5 text-[#9ca3af]">·</span>}
            {resource.year}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail panel"
            className="rounded p-1 font-mono text-[11px] uppercase tracking-wider text-[#6b7280] hover:bg-[#f1efe5]"
          >
            Close (Esc)
          </button>
        </div>

        <div className="px-6 py-5">
          <h2 id="resource-detail-title" className="font-serif text-[30px] font-semibold leading-tight">
            {resource.title ?? resource.name ?? 'Untitled resource'}
          </h2>
          {resource.author && <div className="mt-1 font-sans text-[14px] text-[#374151]">by {resource.author}</div>}
          {resource.source && (
            <div className="mt-2 inline-block rounded bg-[#f1efe5] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#8b7a3a]">
              via {resource.source}
            </div>
          )}

          {(resource.advocated_stance || resource.advocated_timeline || resource.advocated_risk) && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Fact label="Advocated stance" value={resource.advocated_stance} />
              <Fact label="Advocated timeline" value={resource.advocated_timeline} />
              <Fact label="Advocated risk" value={resource.advocated_risk} />
            </div>
          )}

          <div className="mt-4">
            <StanceIndicator
              stance={resource.advocated_stance}
              timeline={resource.advocated_timeline}
              risk={resource.advocated_risk}
            />
          </div>

          {resource.key_argument && (
            <section className="mt-6">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">Key argument</div>
              <p className="mt-2 font-serif text-[16px] leading-relaxed text-[#1a1a1a]">{resource.key_argument}</p>
            </section>
          )}

          {(resource.topic_tags?.length || resource.format_tags?.length) && (
            <section className="mt-6">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">Tags</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(resource.topic_tags ?? []).map((t) => (
                  <span key={`topic-${t}`} className="rounded-full bg-[#ece9dc] px-2.5 py-1 text-[11px] text-[#3b3a2c]">
                    {t}
                  </span>
                ))}
                {(resource.format_tags ?? []).map((t) => (
                  <span
                    key={`fmt-${t}`}
                    className="rounded-full border border-dashed border-[#b7b09a] px-2.5 py-1 text-[11px] text-[#3b3a2c]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {authoredBy.length > 0 && <ConnectedList title="Authored by" entities={authoredBy} />}
          {cites.length > 0 && <ConnectedList title="Cites / cited by" entities={cites} />}
          {mentionedIn.length > 0 && <ConnectedList title="Connected to" entities={mentionedIn} />}
          {authoredBy.length === 0 && cites.length === 0 && mentionedIn.length === 0 && (
            <section className="mt-6 font-sans text-[12px] text-[#6b7280]">
              No known connections yet. Help by{' '}
              <a className="underline" href="/contribute">
                adding an author or citation
              </a>
              .
            </section>
          )}

          {tracksContainingResource.length > 0 && (
            <section className="mt-6">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">Appears in tracks</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tracksContainingResource.map((t) => (
                  <span key={t.id} className="rounded-full bg-[#1a1a1a] px-2.5 py-1 text-[11px] text-[#f8f7f2]">
                    {t.title}
                  </span>
                ))}
              </div>
            </section>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {resource.url && (
              <a
                href={resource.url}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded bg-[#1a1a1a] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[#f8f7f2] hover:bg-[#333]"
              >
                Read original →
              </a>
            )}
            <a
              href={`/map?entity=resource/${resource.id}`}
              className="font-mono text-[11px] uppercase tracking-wider text-[#6b7280] hover:text-[#1a1a1a] hover:underline"
            >
              Open in map graph
            </a>
          </div>
        </div>
      </aside>
    </>
  )

  function ConnectedList({ title, entities }: { title: string; entities: Entity[] }) {
    return (
      <section className="mt-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">{title}</div>
        <ul className="mt-2 space-y-1 font-sans text-[13px]">
          {entities.slice(0, 12).map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="hover:underline"
                onClick={() => {
                  if (e.entity_type === 'resource') {
                    onOpenResource(e.id)
                  } else {
                    window.location.href = `/map?entity=${e.entity_type}/${e.id}`
                  }
                }}
              >
                {e.name ?? e.title}
              </button>
              {e.category && <span className="ml-1.5 text-[#9ca3af]">· {e.category}</span>}
            </li>
          ))}
          {entities.length > 12 && <li className="text-[#9ca3af]">+{entities.length - 12} more</li>}
        </ul>
      </section>
    )
  }
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded border border-[#d9d5c4] bg-[#f8f7f2] p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">{label}</div>
      <div className="mt-1 font-serif text-[14px]">{value ?? 'unknown'}</div>
    </div>
  )
}
