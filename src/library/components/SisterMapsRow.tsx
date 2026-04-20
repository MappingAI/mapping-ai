import type { Entity } from '../../types/entity'

interface SisterMapsRowProps {
  resources: Entity[]
  onOpen: (id: number) => void
}

/**
 * Pinned highlight row for sister ecosystem maps — resources with a
 * non-null `source` attribution. Renders above the main grid so newcomers
 * see the sister-map offering without searching.
 */
export function SisterMapsRow({ resources, onOpen }: SisterMapsRowProps) {
  const sisterMaps = resources.filter((r) => r.source != null)
  if (sisterMaps.length === 0) return null

  return (
    <section className="mb-6 rounded-lg border border-[#d9d5c4] bg-[#f1efe5] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="font-serif text-[16px] font-semibold">Other AI ecosystem maps</h2>
          <p className="font-sans text-[12px] text-[#6b7280]">
            Sister projects worth following. Each also appears in the library below with our own topic tags layered on
            top of the source data.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sisterMaps.map((r) => (
          <article
            key={r.id}
            className="rounded-md border border-[#d9d5c4] bg-[#fffef9] p-3 transition-transform hover:translate-y-[-1px]"
          >
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
              {r.format_tags?.[0] ?? 'Map'}
            </div>
            <button
              type="button"
              onClick={() => onOpen(r.id)}
              className="mt-1 block text-left font-serif text-[15px] font-semibold leading-tight hover:underline"
            >
              {r.title ?? r.name}
            </button>
            <div className="mt-0.5 font-sans text-[11px] text-[#6b7280]">{r.author ?? '—'}</div>
          </article>
        ))}
      </div>
    </section>
  )
}
