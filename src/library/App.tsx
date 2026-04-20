import { useCallback, useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigation } from '../components/Navigation'
import { useEntityCache } from '../hooks/useEntityCache'
import { fetchMapData } from '../lib/api'
import { useQuery } from '@tanstack/react-query'
import type { Entity, Edge } from '../types/entity'
import { useResourceFilters } from './hooks/useResourceFilters'
import { FilterRail } from './components/FilterRail'
import { ResourceCard } from './components/ResourceCard'
import { ResourceList } from './components/ResourceList'
import { SisterMapsRow } from './components/SisterMapsRow'
import { ResourceDetail } from './components/ResourceDetail'
import { Tracks } from './components/Tracks'

const LIBRARY_STALE_TIME_MS = 10 * 60 * 1000

/** Parse selected resource id from the URL query string (`?entity=resource/<id>`). */
function readSelectedIdFromUrl(): number | null {
  if (typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get('entity')
  if (!raw) return null
  const [type, idStr] = raw.split('/')
  if (type !== 'resource' || !idStr) return null
  const n = Number.parseInt(idStr, 10)
  return Number.isFinite(n) ? n : null
}

function writeSelectedIdToUrl(id: number | null) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (id == null) {
    url.searchParams.delete('entity')
  } else {
    url.searchParams.set('entity', `resource/${id}`)
  }
  window.history.replaceState({}, '', url.toString())
}

/** Load relationships separately from useEntityCache (which drops them today). */
function useRelationships() {
  return useQuery({
    queryKey: ['map-data-relationships'],
    queryFn: async () => {
      const data = await fetchMapData()
      return data.relationships as Edge[]
    },
    staleTime: LIBRARY_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  })
}

function LibraryShell() {
  const { cache, isLoading, error } = useEntityCache({
    staleTime: LIBRARY_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  })
  const relsQuery = useRelationships()

  const resources = useMemo<Entity[]>(() => {
    if (!cache) return []
    return cache.entities.filter((e) => e.entity_type === 'resource')
  }, [cache])

  const filters = useResourceFilters(resources)
  const filtered = useMemo(() => filters.filter(resources), [filters, resources])

  // Detail selection via URL query string so deep-links work.
  const [selectedId, setSelectedId] = useState<number | null>(() => readSelectedIdFromUrl())
  useEffect(() => {
    writeSelectedIdToUrl(selectedId)
  }, [selectedId])
  useEffect(() => {
    const onPop = () => setSelectedId(readSelectedIdFromUrl())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openResource = useCallback((id: number) => setSelectedId(id), [])
  const closeDetail = useCallback(() => setSelectedId(null), [])
  const selected = selectedId != null ? (cache?.byId.get(selectedId) ?? null) : null

  const byTitle = useMemo(() => {
    const m = new Map<string, Entity>()
    for (const r of resources) {
      const t = r.title ?? r.name
      if (t) m.set(t.toLowerCase(), r)
    }
    return m
  }, [resources])

  const scrollToSisterMaps = useCallback(() => {
    document.getElementById('library-sister-maps')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-[1280px] px-6 pt-20 pb-16 font-[EB_Garamond,Georgia,serif] text-[#1a1a1a]">
        <header className="mb-8 border-b border-[#d9d5c4] pb-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">Library</div>
          <h1 className="mt-1 text-[40px] font-semibold leading-[1.05] max-sm:text-[28px]">
            Reading the AI policy landscape
          </h1>
          <p className="mt-3 max-w-2xl font-sans text-[15px] text-[#374151]">
            A faceted catalogue of books, essays, papers, podcasts, reports, and sister ecosystem maps. Filter by topic,
            format, advocated stance, or year — or follow a curated reading track.
          </p>
          <nav className="mt-5 flex gap-2 font-mono text-[11px] uppercase tracking-wider" role="tablist">
            <button
              type="button"
              role="tab"
              onClick={() => filters.setTab('library')}
              aria-selected={filters.state.tab === 'library'}
              className={`px-3 py-1.5 rounded border ${
                filters.state.tab === 'library'
                  ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                  : 'bg-transparent text-[#1a1a1a] border-[#d9d5c4] hover:border-[#999]'
              }`}
            >
              Library
            </button>
            <button
              type="button"
              role="tab"
              onClick={() => filters.setTab('tracks')}
              aria-selected={filters.state.tab === 'tracks'}
              className={`px-3 py-1.5 rounded border ${
                filters.state.tab === 'tracks'
                  ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                  : 'bg-transparent text-[#1a1a1a] border-[#d9d5c4] hover:border-[#999]'
              }`}
            >
              Reading Tracks
            </button>
          </nav>
        </header>

        {isLoading && (
          <div className="py-16 text-center font-mono text-[12px] uppercase tracking-wider text-[#6b7280]">
            Loading library…
          </div>
        )}

        {error && (
          <div className="rounded border border-[#d9d5c4] bg-[#fffef9] p-6">
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#a43a2b]">
              Failed to load resources
            </div>
            <p className="mt-2 font-sans text-[13px] text-[#374151]">
              The library couldn’t reach the data feed. Refresh the page, or try again in a minute. If this keeps
              happening,{' '}
              <a className="underline" href="/about">
                let us know
              </a>
              .
            </p>
            <pre className="mt-2 font-mono text-[11px] text-[#6b7280]">{error.message}</pre>
          </div>
        )}

        {!isLoading && !error && cache && (
          <>
            {filters.state.tab === 'library' ? (
              <LibraryBody
                filters={filters}
                filtered={filtered}
                total={resources.length}
                onOpen={openResource}
                onOpenSisterMaps={scrollToSisterMaps}
              />
            ) : (
              <Tracks byTitle={byTitle} onOpenResource={openResource} />
            )}
          </>
        )}

        <ResourceDetail
          resource={selected}
          byId={cache?.byId ?? new Map()}
          relationships={relsQuery.data ?? []}
          onClose={closeDetail}
          onOpenResource={openResource}
        />
      </main>
    </>
  )
}

interface LibraryBodyProps {
  filters: ReturnType<typeof useResourceFilters>
  filtered: Entity[]
  total: number
  onOpen: (id: number) => void
  onOpenSisterMaps: () => void
}

function LibraryBody({ filters, filtered, total, onOpen, onOpenSisterMaps }: LibraryBodyProps) {
  const { state, counts } = filters
  const activeFilterCount =
    state.topics.length +
    state.formats.length +
    state.stances.length +
    state.timelines.length +
    state.risks.length +
    (state.yearMin != null || state.yearMax != null ? 1 : 0) +
    (state.query ? 1 : 0)

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
      <FilterRail filters={filters} onOpenSisterMaps={onOpenSisterMaps} />

      <section>
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">Showing</div>
            <div className="font-serif text-[22px] font-semibold">
              {filtered.length} of {total} resources
              {activeFilterCount > 0 && (
                <span className="ml-2 font-sans text-[13px] font-normal text-[#6b7280]">
                  with {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} applied
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider">
            <button
              type="button"
              onClick={() => filters.setDisplayMode('grid')}
              aria-pressed={state.displayMode === 'grid'}
              className={`rounded px-2 py-1 ${
                state.displayMode === 'grid' ? 'bg-[#1a1a1a] text-[#f8f7f2]' : 'bg-[#ece9dc] text-[#3b3a2c]'
              }`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => filters.setDisplayMode('list')}
              aria-pressed={state.displayMode === 'list'}
              className={`rounded px-2 py-1 ${
                state.displayMode === 'list' ? 'bg-[#1a1a1a] text-[#f8f7f2]' : 'bg-[#ece9dc] text-[#3b3a2c]'
              }`}
            >
              List
            </button>
          </div>
        </header>

        <div id="library-sister-maps">
          <SisterMapsRow resources={filtered} onOpen={onOpen} />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded border border-dashed border-[#d9d5c4] bg-[#fffef9] p-8 text-center">
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#6b7280]">No resources match</div>
            <p className="mt-2 font-sans text-[13px] text-[#374151]">
              Try removing a filter, widening the year range, or searching for a different term.
            </p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={filters.reset}
                className="mt-3 rounded bg-[#1a1a1a] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[#f8f7f2]"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : state.displayMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
            {filtered.map((r) => (
              <ResourceCard key={r.id} resource={r} onOpen={onOpen} onTopicClick={filters.toggleTopic} />
            ))}
          </div>
        ) : (
          <ResourceList resources={filtered} onOpen={onOpen} />
        )}

        {counts.stanceDataCoverage < 0.1 && counts.timelineDataCoverage < 0.1 && counts.riskDataCoverage < 0.1 && (
          <div className="mt-8 rounded border border-dashed border-[#d9d5c4] bg-[#f1efe5] p-4 font-sans text-[12px] text-[#6b7280]">
            Advocated-stance / timeline / risk data is still being populated. Phase 2 adds an automated enrichment pass
            so these filters stop being empty.
          </div>
        )}
      </section>
    </div>
  )
}

export function App() {
  const queryClient = useMemo(() => new QueryClient(), [])
  return (
    <QueryClientProvider client={queryClient}>
      <LibraryShell />
    </QueryClientProvider>
  )
}
