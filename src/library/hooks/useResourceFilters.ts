import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Entity } from '../../types/entity'

export type DisplayMode = 'grid' | 'list'
export type LibraryTab = 'library' | 'tracks'

export interface ResourceFilterState {
  topics: string[]
  formats: string[]
  stances: string[]
  timelines: string[]
  risks: string[]
  yearMin: number | null
  yearMax: number | null
  query: string
  displayMode: DisplayMode
  tab: LibraryTab
}

const DEFAULT_STATE: ResourceFilterState = {
  topics: [],
  formats: [],
  stances: [],
  timelines: [],
  risks: [],
  yearMin: null,
  yearMax: null,
  query: '',
  displayMode: 'grid',
  tab: 'library',
}

const STORAGE_KEY = 'libraryFilters'

// Fields we persist across reloads — tab + displayMode are user preferences;
// query intentionally is not persisted (users don't expect their last search
// to stick).
type PersistedFields = Pick<
  ResourceFilterState,
  'displayMode' | 'tab' | 'topics' | 'formats' | 'stances' | 'timelines' | 'risks' | 'yearMin' | 'yearMax'
>

function loadPersisted(): Partial<ResourceFilterState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<PersistedFields>
    return parsed ?? {}
  } catch {
    return {}
  }
}

function savePersisted(state: ResourceFilterState) {
  if (typeof window === 'undefined') return
  try {
    const toSave: PersistedFields = {
      displayMode: state.displayMode,
      tab: state.tab,
      topics: state.topics,
      formats: state.formats,
      stances: state.stances,
      timelines: state.timelines,
      risks: state.risks,
      yearMin: state.yearMin,
      yearMax: state.yearMax,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    /* storage full / private mode: ignore */
  }
}

function lc(s: string | null | undefined): string {
  return (s ?? '').toLowerCase()
}

function matchesResource(entity: Entity, state: ResourceFilterState): boolean {
  if (entity.entity_type !== 'resource') return false

  const eTopics = (entity.topic_tags ?? []).map(lc)
  const eFormats = (entity.format_tags ?? []).map(lc)

  // ANY-OF semantics per facet (OR within a facet, AND across facets).
  // Matches the user expectation for chip-based filtering.
  if (state.topics.length > 0 && !state.topics.some((t) => eTopics.includes(lc(t)))) return false
  if (state.formats.length > 0 && !state.formats.some((t) => eFormats.includes(lc(t)))) return false

  // Stance / timeline / risk — "Unknown" matches null; otherwise exact match.
  if (state.stances.length > 0) {
    const v = entity.advocated_stance
    const ok = state.stances.some((s) => (s === 'Unknown' ? v == null : v === s))
    if (!ok) return false
  }
  if (state.timelines.length > 0) {
    const v = entity.advocated_timeline
    const ok = state.timelines.some((s) => (s === 'Unknown' ? v == null : v === s))
    if (!ok) return false
  }
  if (state.risks.length > 0) {
    const v = entity.advocated_risk
    const ok = state.risks.some((s) => (s === 'Unknown' ? v == null : v === s))
    if (!ok) return false
  }

  if (state.yearMin != null || state.yearMax != null) {
    const yStr = entity.year ?? null
    const y = yStr ? parseInt(yStr, 10) : NaN
    if (!Number.isFinite(y)) return false
    if (state.yearMin != null && y < state.yearMin) return false
    if (state.yearMax != null && y > state.yearMax) return false
  }

  if (state.query) {
    const q = lc(state.query.trim())
    if (!q) return true
    // Search title, author, key_argument, topic tags, format tags, notes
    const haystack = [
      entity.title,
      entity.name,
      entity.author,
      entity.key_argument,
      entity.notes,
      ...(entity.topic_tags ?? []),
      ...(entity.format_tags ?? []),
    ]
      .map(lc)
      .join(' ')
    if (!haystack.includes(q)) return false
  }

  return true
}

export interface UseResourceFilters {
  state: ResourceFilterState
  setTab: (tab: LibraryTab) => void
  setDisplayMode: (mode: DisplayMode) => void
  toggleTopic: (topic: string) => void
  toggleFormat: (fmt: string) => void
  toggleStance: (s: string) => void
  toggleTimeline: (t: string) => void
  toggleRisk: (r: string) => void
  setYearRange: (min: number | null, max: number | null) => void
  setQuery: (q: string) => void
  reset: () => void
  filter: (resources: Entity[]) => Entity[]
  counts: {
    topics: Map<string, number>
    formats: Map<string, number>
    stances: Map<string, number>
    timelines: Map<string, number>
    risks: Map<string, number>
    stanceDataCoverage: number
    timelineDataCoverage: number
    riskDataCoverage: number
    total: number
  }
}

function toggleIn(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value]
}

/**
 * Filter + display state for the Library page. Persisted to localStorage.
 *
 * The `counts` object summarises the unfiltered resource set so the
 * FilterRail can show chip counts and hide filter groups where <10% of
 * resources have data (R17 / P1 decision to hide empty facets until
 * enrichment ships).
 */
export function useResourceFilters(allResources: readonly Entity[] | null): UseResourceFilters {
  const [state, setState] = useState<ResourceFilterState>(() => ({
    ...DEFAULT_STATE,
    ...loadPersisted(),
  }))

  useEffect(() => {
    savePersisted(state)
  }, [state])

  const setTab = useCallback((tab: LibraryTab) => setState((s) => ({ ...s, tab })), [])
  const setDisplayMode = useCallback((displayMode: DisplayMode) => setState((s) => ({ ...s, displayMode })), [])
  const toggleTopic = useCallback((topic: string) => setState((s) => ({ ...s, topics: toggleIn(s.topics, topic) })), [])
  const toggleFormat = useCallback((fmt: string) => setState((s) => ({ ...s, formats: toggleIn(s.formats, fmt) })), [])
  const toggleStance = useCallback((v: string) => setState((s) => ({ ...s, stances: toggleIn(s.stances, v) })), [])
  const toggleTimeline = useCallback(
    (v: string) => setState((s) => ({ ...s, timelines: toggleIn(s.timelines, v) })),
    [],
  )
  const toggleRisk = useCallback((v: string) => setState((s) => ({ ...s, risks: toggleIn(s.risks, v) })), [])
  const setYearRange = useCallback(
    (yearMin: number | null, yearMax: number | null) => setState((s) => ({ ...s, yearMin, yearMax })),
    [],
  )
  const setQuery = useCallback((query: string) => setState((s) => ({ ...s, query })), [])
  const reset = useCallback(
    () =>
      setState((s) => ({
        ...DEFAULT_STATE,
        // Preserve user preferences that aren't "filters" in the spirit of reset
        tab: s.tab,
        displayMode: s.displayMode,
      })),
    [],
  )

  const counts = useMemo(() => {
    const res = allResources ?? []
    const topics = new Map<string, number>()
    const formats = new Map<string, number>()
    const stances = new Map<string, number>()
    const timelines = new Map<string, number>()
    const risks = new Map<string, number>()
    let stanceCount = 0
    let timelineCount = 0
    let riskCount = 0
    for (const r of res) {
      for (const t of r.topic_tags ?? []) topics.set(t, (topics.get(t) ?? 0) + 1)
      for (const t of r.format_tags ?? []) formats.set(t, (formats.get(t) ?? 0) + 1)
      if (r.advocated_stance) {
        stances.set(r.advocated_stance, (stances.get(r.advocated_stance) ?? 0) + 1)
        stanceCount += 1
      }
      if (r.advocated_timeline) {
        timelines.set(r.advocated_timeline, (timelines.get(r.advocated_timeline) ?? 0) + 1)
        timelineCount += 1
      }
      if (r.advocated_risk) {
        risks.set(r.advocated_risk, (risks.get(r.advocated_risk) ?? 0) + 1)
        riskCount += 1
      }
    }
    const total = res.length || 1
    return {
      topics,
      formats,
      stances,
      timelines,
      risks,
      stanceDataCoverage: stanceCount / total,
      timelineDataCoverage: timelineCount / total,
      riskDataCoverage: riskCount / total,
      total: res.length,
    }
  }, [allResources])

  const filter = useCallback((resources: Entity[]) => resources.filter((r) => matchesResource(r, state)), [state])

  return {
    state,
    setTab,
    setDisplayMode,
    toggleTopic,
    toggleFormat,
    toggleStance,
    toggleTimeline,
    toggleRisk,
    setYearRange,
    setQuery,
    reset,
    filter,
    counts,
  }
}
