import { useSearch } from '../hooks/useSearch'
import type { FuzzySearchResult } from '../types/api'

const TYPE_LABELS: Record<string, string> = {
  person: 'person',
  organization: 'organization',
  resource: 'resource',
}

interface DuplicateDetectionProps {
  query: string
  entityType: 'person' | 'organization' | 'resource'
  onViewExisting: (entity: FuzzySearchResult) => void
  onUpdateExisting: (entity: FuzzySearchResult) => void
}

/**
 * Watches a name field and shows existing entity matches for duplicate prevention.
 * Renders up to 5 matches when query has 2+ characters.
 *
 * Uses onMouseDown (not onClick) on action buttons to avoid blur-vs-click race
 * conditions with the name input field.
 */
export function DuplicateDetection({ query, entityType, onViewExisting, onUpdateExisting }: DuplicateDetectionProps) {
  const { allResults, isLoadingPending } = useSearch(query, entityType, {
    enabled: query.length >= 2,
  })

  const matches = allResults.slice(0, 5)

  if (query.length < 2 || matches.length === 0) {
    return null
  }

  return (
    <div className="mt-2 border border-amber-300 rounded bg-amber-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-100 border-b border-amber-200">
        <svg className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2.5a1 1 0 110 2 1 1 0 010-2zM6.75 7h2.5v4.5h-2.5V7z" />
        </svg>
        <span className="text-[12px] font-mono font-semibold text-amber-800">
          This {TYPE_LABELS[entityType] ?? entityType} may already exist
        </span>
        {isLoadingPending && <span className="text-[10px] font-mono text-amber-600 ml-auto">checking...</span>}
      </div>

      {/* Match list */}
      <div className="divide-y divide-amber-200">
        {matches.map((match) => (
          <div key={match.id} className="flex items-start justify-between gap-3 px-3 py-2">
            {/* Entity info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-mono font-medium text-[#1a1a1a] truncate">{match.name}</span>
                {match.isPending && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded flex-shrink-0">
                    pending
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                {match.category && <span className="text-[11px] font-mono text-[#666]">{match.category}</span>}
                {match.title && (
                  <span className="text-[11px] font-mono text-[#888] truncate max-w-[180px]">{match.title}</span>
                )}
                {match.primary_org && (
                  <span className="text-[11px] font-mono text-[#888] truncate max-w-[180px]">{match.primary_org}</span>
                )}
                {match.location && (
                  <span className="text-[11px] font-mono text-[#999] truncate max-w-[140px]">{match.location}</span>
                )}
              </div>
            </div>

            {/* Action buttons — onMouseDown to avoid blur-vs-click race */}
            <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onViewExisting(match)
                }}
                className="text-[11px] font-mono px-2 py-1 rounded border border-[#ddd] text-[#555] bg-white hover:bg-[#f5f5f5] hover:border-[#999] transition-colors cursor-pointer"
              >
                View existing
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onUpdateExisting(match)
                }}
                className="text-[11px] font-mono px-2 py-1 rounded border border-[#2563eb] text-[#2563eb] bg-white hover:bg-[#eff6ff] transition-colors cursor-pointer"
              >
                Add info to this entry
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
