import type { Entity } from '../../types/entity'
import { StanceIndicator } from './StanceIndicator'

interface ResourceCardProps {
  resource: Entity
  onOpen: (id: number) => void
  onTopicClick?: (topic: string) => void
}

const PRIMARY_FORMAT_ICON: Record<string, string> = {
  Book: '📕',
  Podcast: '🎙',
  Essay: '📝',
  'Academic Paper': '📖',
  Video: '▶',
  Report: '📋',
  'News Article': '📰',
  'Interactive Map': '🗺',
  Index: '📚',
  Scenario: '🔮',
  Interview: '💬',
  Series: '🧵',
  'Policy Document': '🏛',
}

export function ResourceCard({ resource, onOpen, onTopicClick }: ResourceCardProps) {
  const primaryFormat = resource.format_tags?.[0] ?? resource.resource_type ?? null
  const icon = primaryFormat ? (PRIMARY_FORMAT_ICON[primaryFormat] ?? '📄') : '📄'

  return (
    <article
      className="flex gap-4 rounded border border-[#d9d5c4] bg-[#fffef9] p-4 transition-colors hover:border-[#a9a48d]"
      aria-labelledby={`resource-${resource.id}-title`}
    >
      <div
        className="flex h-14 w-14 flex-none items-center justify-center rounded bg-[#f1efe5] text-[22px]"
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <button
            id={`resource-${resource.id}-title`}
            type="button"
            onClick={() => onOpen(resource.id)}
            className="text-left font-serif text-[18px] font-semibold leading-tight hover:underline"
          >
            {resource.title ?? resource.name ?? 'Untitled resource'}
          </button>
          {resource.source && (
            <span
              className="font-mono text-[10px] uppercase tracking-widest text-[#8b7a3a]"
              title={`Imported from ${resource.source}`}
            >
              via {resource.source}
            </span>
          )}
        </div>
        <div className="mt-0.5 font-sans text-[12px] text-[#374151]">
          {resource.author && <span>{resource.author}</span>}
          {resource.author && resource.year && <span className="mx-1.5 text-[#9ca3af]">·</span>}
          {resource.year && <span>{resource.year}</span>}
        </div>
        {resource.key_argument && (
          <p className="mt-2 line-clamp-3 font-sans text-[13px] leading-snug text-[#374151]">{resource.key_argument}</p>
        )}
        {(resource.topic_tags?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {resource.topic_tags!.slice(0, 5).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onTopicClick?.(t)}
                className="rounded-full bg-[#ece9dc] px-2 py-0.5 text-[11px] text-[#3b3a2c] hover:bg-[#d9d5c4]"
              >
                {t}
              </button>
            ))}
            {(resource.format_tags?.length ?? 0) > 0 &&
              resource.format_tags!.map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-dashed border-[#b7b09a] px-2 py-0.5 text-[11px] text-[#3b3a2c]"
                >
                  {f}
                </span>
              ))}
          </div>
        )}
        <div className="mt-3">
          <StanceIndicator
            stance={resource.advocated_stance}
            timeline={resource.advocated_timeline}
            risk={resource.advocated_risk}
          />
        </div>
      </div>
    </article>
  )
}
