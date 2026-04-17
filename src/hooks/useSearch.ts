import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useEntityCache } from './useEntityCache'
import { searchEntities as searchAPI } from '../lib/api'
import { fuzzySearch } from '../lib/search'
import type { FuzzySearchResult } from '../types/api'

/**
 * Combined search: instant local fuzzy search + debounced pending API search.
 *
 * - Local results appear immediately (useMemo against entity cache)
 * - Pending results fetched async from /search API (only when query is 2+ chars)
 * - Results merged and deduplicated by entity ID
 */
export function useSearch(
  query: string,
  type?: 'person' | 'organization' | 'resource',
  options?: { enabled?: boolean; debounceMs?: number },
) {
  const { cache } = useEntityCache()
  const enabled = options?.enabled ?? true

  // Local fuzzy search — synchronous, instant
  const localResults = useMemo<FuzzySearchResult[]>(() => {
    if (!cache || !query || !enabled) return []
    return fuzzySearch(cache.entities, query, type)
  }, [cache, query, type, enabled])

  // Pending entity search — async, debounced via TanStack Query's staleTime
  const pendingQuery = useQuery({
    queryKey: ['search-pending', query, type],
    queryFn: () => searchAPI(query, type, 'pending'),
    enabled: enabled && !!query && query.length >= 2,
    staleTime: 5_000,
  })

  // Merge local + pending, deduplicate by ID
  const pendingResults = pendingQuery.data ?? []
  const allResults = useMemo<FuzzySearchResult[]>(() => {
    const seenIds = new Set(localResults.map((r) => r.id))
    // Also track absolute values so negative local IDs (-73) dedup against
    // positive API IDs (73) for the same pending entity
    for (const r of localResults) {
      if (r.id < 0) seenIds.add(-r.id)
    }
    const merged = [...localResults]

    for (const pending of pendingResults) {
      if (!seenIds.has(pending.id) && !seenIds.has(-pending.id)) {
        merged.push({
          ...pending,
          score: 50,
          isPending: true,
        })
        seenIds.add(pending.id)
      }
    }

    return merged
  }, [localResults, pendingResults])

  return {
    localResults,
    pendingResults: pendingResults.map((r) => ({
      ...r,
      score: 50,
      isPending: true as const,
    })),
    allResults,
    isLoadingPending: pendingQuery.isPending && pendingQuery.fetchStatus !== 'idle',
  }
}
