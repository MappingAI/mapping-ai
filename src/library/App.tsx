import { useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigation } from '../components/Navigation'
import { useEntityCache } from '../hooks/useEntityCache'
import { useResourceFilters } from './hooks/useResourceFilters'
import type { Entity } from '../types/entity'

/**
 * Library page — faceted search + reading tracks.
 *
 * Unit 4 ships the shell, data layer, and filter-state hook. The FilterRail
 * + Grid + List + Detail are built out in Units 5 and 6.
 *
 * Staleness override: the default Infinity staleTime is fine for the Map
 * (which is read-rarely per session) but wrong for a research library that
 * readers may keep open — finite staleTime + refetchOnWindowFocus narrows
 * the admin-edit-to-open-tab-user window.
 */

const LIBRARY_STALE_TIME_MS = 10 * 60 * 1000 // 10 min

function LibraryShell() {
  const { cache, isLoading, error } = useEntityCache({
    staleTime: LIBRARY_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  })

  const resources = useMemo<Entity[]>(() => {
    if (!cache) return []
    return cache.entities.filter((e) => e.entity_type === 'resource')
  }, [cache])

  const filters = useResourceFilters(resources)
  const filtered = useMemo(() => filters.filter(resources), [filters, resources])

  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-[1280px] px-6 pt-20 pb-16 font-[EB_Garamond,Georgia,serif] text-[#1a1a1a]">
        <header className="mb-8 border-b border-[#d9d5c4] pb-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">Library</div>
          <h1 className="mt-1 text-[40px] font-semibold leading-[1.05]">Reading the AI policy landscape</h1>
          <p className="mt-3 max-w-2xl text-[15px] text-[#374151]">
            A faceted catalogue of books, essays, papers, podcasts, reports, and sister ecosystem maps. Filter by topic,
            format, advocated stance, or year — or follow a curated reading track.
          </p>
          <nav className="mt-5 flex gap-2 font-mono text-[11px] uppercase tracking-wider">
            <button
              type="button"
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
            <p className="mt-2 text-[13px] text-[#374151]">
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
          <section>
            {filters.state.tab === 'library' ? (
              <LibraryPlaceholder count={filtered.length} total={resources.length} />
            ) : (
              <TracksPlaceholder />
            )}
          </section>
        )}
      </main>
    </>
  )
}

function LibraryPlaceholder({ count, total }: { count: number; total: number }) {
  return (
    <div className="rounded border border-[#d9d5c4] bg-[#fffef9] p-6">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
        Showing {count} of {total} resources
      </div>
      <p className="mt-2 text-[13px] text-[#374151]">
        The library grid and dense list views are built out in the next step. The data layer is wired, filter state
        persists across reloads, and the view is ready to render.
      </p>
    </div>
  )
}

function TracksPlaceholder() {
  return (
    <div className="rounded border border-[#d9d5c4] bg-[#fffef9] p-6">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">Reading tracks</div>
      <p className="mt-2 text-[13px] text-[#374151]">
        Curated reading sequences land in the following unit. Expect three tracks at launch: “New to AI policy”, “The
        regulation debate”, and “Alignment foundations”.
      </p>
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
