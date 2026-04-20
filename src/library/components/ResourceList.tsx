import type { Entity } from '../../types/entity'
import { StanceIndicator } from './StanceIndicator'

interface ResourceListProps {
  resources: Entity[]
  onOpen: (id: number) => void
}

export function ResourceList({ resources, onOpen }: ResourceListProps) {
  return (
    <div className="overflow-x-auto rounded border border-[#d9d5c4] bg-white">
      <table className="w-full border-collapse text-left">
        <thead className="bg-[#f1efe5] font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
          <tr>
            <th className="px-4 py-2">#</th>
            <th className="px-3 py-2">Title / author / argument</th>
            <th className="px-3 py-2">Tags</th>
            <th className="px-3 py-2">Stance</th>
            <th className="px-3 py-2">Year</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((r, i) => (
            <tr key={r.id} className="border-t border-[#d9d5c4] align-top hover:bg-[#f8f7f2]">
              <td className="px-4 py-3 font-mono text-[10px] text-[#9ca3af]">{String(i + 1).padStart(3, '0')}</td>
              <td className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onOpen(r.id)}
                  className="text-left font-serif text-[14px] font-semibold leading-tight hover:underline"
                >
                  {r.title ?? r.name ?? 'Untitled resource'}
                </button>
                <div className="mt-0.5 font-sans text-[11px] text-[#6b7280]">
                  {r.author}
                  {r.author && r.source && <span className="mx-1.5 text-[#9ca3af]">·</span>}
                  {r.source && <span className="text-[#8b7a3a]">via {r.source}</span>}
                </div>
                {r.key_argument && (
                  <p className="mt-1 line-clamp-2 font-sans text-[12px] text-[#374151]">{r.key_argument}</p>
                )}
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                  {(r.topic_tags ?? []).slice(0, 3).map((t) => (
                    <span key={t} className="rounded-full bg-[#ece9dc] px-2 py-0.5 text-[10px] text-[#3b3a2c]">
                      {t}
                    </span>
                  ))}
                  {(r.format_tags ?? []).slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-dashed border-[#b7b09a] px-2 py-0.5 text-[10px] text-[#3b3a2c]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-3 py-3 w-[170px]">
                <StanceIndicator
                  stance={r.advocated_stance}
                  timeline={r.advocated_timeline}
                  risk={r.advocated_risk}
                  compact
                />
              </td>
              <td className="px-3 py-3 font-mono text-[11px] text-[#6b7280]">{r.year ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
