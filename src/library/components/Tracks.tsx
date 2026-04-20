import { useMemo, useState } from 'react'
import type { Entity } from '../../types/entity'
import { useTrack, useTrackIndex, type TrackItem } from '../hooks/useTracks'

interface TracksProps {
  byTitle: Map<string, Entity>
  onOpenResource: (id: number) => void
}

/**
 * Curated reading tracks. Items reference resources by `title_hint` which
 * we resolve against the cache at render time (loose coupling so DB
 * renumbering doesn't break a track). Items that don't resolve are shown
 * with a "pending" treatment instead of being silently dropped.
 */
export function Tracks({ byTitle, onOpenResource }: TracksProps) {
  const indexQuery = useTrackIndex()
  const [openTrackId, setOpenTrackId] = useState<string | null>(null)
  const activeId = openTrackId ?? indexQuery.data?.[0]?.id ?? null
  const trackQuery = useTrack(activeId)

  if (indexQuery.isPending) {
    return <TracksSkeleton />
  }
  if (indexQuery.error) {
    return (
      <div className="rounded border border-[#d9d5c4] bg-[#fffef9] p-6">
        <div className="font-mono text-[11px] uppercase tracking-wider text-[#a43a2b]">
          Couldn’t load reading tracks
        </div>
        <p className="mt-2 font-sans text-[13px] text-[#374151]">
          The track index file didn’t load. Refresh and try again, or let us know via{' '}
          <a href="/about" className="underline">
            About → get in touch
          </a>
          .
        </p>
      </div>
    )
  }

  const summaries = indexQuery.data ?? []

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
      <nav className="lg:sticky lg:top-20 lg:h-fit">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">Reading tracks</div>
        <ul className="mt-3 space-y-1 border-l border-[#1a1a1a] pl-3 font-sans text-[13px]">
          {summaries.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setOpenTrackId(t.id)}
                className={`block text-left hover:underline ${activeId === t.id ? 'font-semibold' : 'text-[#374151]'}`}
              >
                {t.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <section>
        {trackQuery.isPending && <TracksSkeleton />}
        {trackQuery.data && (
          <article>
            <header className="mb-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
                Track for {trackQuery.data.audience}
              </div>
              <h2 className="mt-1 font-serif text-[28px] font-semibold leading-tight">{trackQuery.data.title}</h2>
              <p className="mt-1 max-w-2xl font-sans text-[14px] text-[#374151]">{trackQuery.data.subtitle}</p>
            </header>
            <ol className="divide-y divide-[#d9d5c4] border-y border-[#d9d5c4]">
              {trackQuery.data.items.map((item, i) => (
                <TrackItemRow
                  key={`${item.title_hint}-${i}`}
                  index={i + 1}
                  item={item}
                  byTitle={byTitle}
                  onOpenResource={onOpenResource}
                />
              ))}
            </ol>
          </article>
        )}
      </section>
    </div>
  )
}

function TrackItemRow({
  index,
  item,
  byTitle,
  onOpenResource,
}: {
  index: number
  item: TrackItem
  byTitle: Map<string, Entity>
  onOpenResource: (id: number) => void
}) {
  const resource = useMemo(() => {
    const match = byTitle.get(item.title_hint.toLowerCase())
    return match ?? null
  }, [byTitle, item.title_hint])

  const title = resource?.title ?? item.title_hint
  const author = resource?.author ?? null
  const year = resource?.year ?? null
  const primaryFormat = resource?.format_tags?.[0] ?? resource?.resource_type ?? null
  const unresolved = resource == null

  return (
    <li className="flex gap-4 py-4">
      <div className="flex h-8 w-8 flex-none items-center justify-center font-serif text-[18px] text-[#6b7280]">
        {index}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {resource ? (
            <button
              type="button"
              onClick={() => onOpenResource(resource.id)}
              className="text-left font-serif text-[16px] font-semibold leading-tight hover:underline"
            >
              {title}
            </button>
          ) : (
            <span className="font-serif text-[16px] font-semibold leading-tight text-[#9ca3af]">{title}</span>
          )}
          {primaryFormat && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">{primaryFormat}</span>
          )}
          {unresolved && (
            <span className="rounded bg-[#f1efe5] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#8b7a3a]">
              awaiting entry
            </span>
          )}
        </div>
        {(author || year) && (
          <div className="font-sans text-[11px] text-[#6b7280]">
            {author}
            {author && year && <span className="mx-1.5">·</span>}
            {year}
          </div>
        )}
        <p className="mt-1 font-serif text-[13px] italic leading-snug text-[#374151]">&ldquo;{item.blurb}&rdquo;</p>
      </div>
    </li>
  )
}

function TracksSkeleton() {
  return (
    <div className="rounded border border-[#d9d5c4] bg-[#fffef9] p-6 font-mono text-[11px] uppercase tracking-wider text-[#6b7280]">
      Loading tracks…
    </div>
  )
}
