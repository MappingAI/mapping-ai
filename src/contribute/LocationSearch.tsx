import { useCallback } from 'react'
import { TagInput, type Tag, type TagSearchResult } from '../components/TagInput'

interface PhotonFeature {
  properties: {
    city?: string
    name?: string
    state?: string
    country?: string
  }
}

interface LocationSearchProps {
  tags: Tag[]
  onTagsChange: (tags: Tag[]) => void
  showRemote?: boolean
  remoteChecked?: boolean
  onRemoteChange?: (checked: boolean) => void
  className?: string
}

/**
 * Multi-city tag input using Photon/OpenStreetMap geocoding API.
 * Wraps TagInput with a Photon search function that returns
 * "City, State, Country" formatted results.
 *
 * For org forms, includes a "Remote" checkbox/link option.
 */
export function LocationSearch({
  tags,
  onTagsChange,
  showRemote = false,
  remoteChecked = false,
  onRemoteChange,
  className = '',
}: LocationSearchProps) {
  const searchLocations = useCallback(
    async (query: string): Promise<TagSearchResult[]> => {
      const q = query.trim()
      if (q.length < 2) return []

      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&layer=city&layer=state`,
        )
        if (!res.ok) return []

        const data = await res.json()
        const features: PhotonFeature[] = data.features || []

        // Format as "City, State, Country" and deduplicate
        const seen = new Set<string>()
        const results: TagSearchResult[] = []

        for (const f of features) {
          const p = f.properties
          const label = [p.city || p.name, p.state, p.country]
            .filter(Boolean)
            .join(', ')

          if (!label || seen.has(label)) continue
          seen.add(label)

          results.push({
            id: label,
            label,
          })
        }

        return results
      } catch {
        return []
      }
    },
    [],
  )

  return (
    <div className={className}>
      <TagInput
        tags={tags}
        onTagsChange={onTagsChange}
        searchFn={searchLocations}
        placeholder="Search cities..."
        debounceMs={150}
      />
      {showRemote && (
        <span className="inline-block mt-1.5 text-[12px] font-mono text-[#888]">
          or{' '}
          <button
            type="button"
            onClick={() => onRemoteChange?.(!remoteChecked)}
            className={`bg-transparent border-none cursor-pointer p-0 font-mono text-[12px] underline transition-colors ${
              remoteChecked ? 'text-[#1a1a1a] font-semibold' : 'text-[#2563eb]'
            }`}
          >
            {remoteChecked ? 'remove Remote' : 'add Remote'}
          </button>
          {remoteChecked && (
            <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 text-[12px] font-mono bg-[#f0f0f0] rounded">
              Remote
              <button
                type="button"
                onClick={() => onRemoteChange?.(false)}
                className="text-[#888] hover:text-[#1a1a1a] bg-transparent border-none cursor-pointer text-[14px] leading-none p-0"
                aria-label="Remove Remote"
              >
                &times;
              </button>
            </span>
          )}
        </span>
      )}
    </div>
  )
}
