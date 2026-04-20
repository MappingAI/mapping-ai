import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResourceFilters } from '../../library/hooks/useResourceFilters'
import type { Entity } from '../../types/entity'

const makeResource = (overrides: Partial<Entity>): Entity => ({
  id: 0,
  entity_type: 'resource',
  name: '',
  category: null,
  other_categories: null,
  title: null,
  primary_org: null,
  other_orgs: null,
  website: null,
  funding_model: null,
  parent_org_id: null,
  location: null,
  influence_type: null,
  twitter: null,
  bluesky: null,
  notes: null,
  notes_html: null,
  thumbnail_url: null,
  submission_count: null,
  status: 'approved',
  regulatory_stance: null,
  regulatory_stance_detail: null,
  evidence_source: null,
  agi_timeline: null,
  ai_risk_level: null,
  threat_models: null,
  stance_score: null,
  timeline_score: null,
  risk_score: null,
  topic_tags: [],
  format_tags: [],
  advocated_stance: null,
  advocated_timeline: null,
  advocated_risk: null,
  source: null,
  source_url: null,
  ...overrides,
})

const RESOURCES: Entity[] = [
  makeResource({
    id: 1,
    title: 'AI 2027',
    author: 'Kokotajlo',
    topic_tags: ['AGI Timeline', 'Forecasting'],
    format_tags: ['Essay'],
    advocated_stance: 'Precautionary',
    advocated_timeline: '2-3 years',
    advocated_risk: 'Existential',
    year: '2025',
    key_argument: 'Scenario forecast arguing AGI by 2027.',
  }),
  makeResource({
    id: 2,
    title: 'Superintelligence',
    author: 'Bostrom',
    topic_tags: ['Alignment', 'Existential Risk'],
    format_tags: ['Book'],
    advocated_stance: null,
    advocated_risk: 'Existential',
    year: '2014',
    key_argument: 'Canonical treatment of the alignment problem.',
  }),
  makeResource({
    id: 3,
    title: 'Why I Am Not A Doomer',
    author: 'Hoffman',
    topic_tags: ['Accelerationism'],
    format_tags: ['Essay'],
    advocated_stance: 'Accelerate',
    year: '2023',
    key_argument: 'Doomer framings are bad policy.',
  }),
]

describe('useResourceFilters', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts with default state and returns all resources', () => {
    const { result } = renderHook(() => useResourceFilters(RESOURCES))
    expect(result.current.filter(RESOURCES)).toHaveLength(3)
    expect(result.current.state.displayMode).toBe('grid')
    expect(result.current.state.tab).toBe('library')
  })

  it('filters by topic (ANY-OF)', () => {
    const { result } = renderHook(() => useResourceFilters(RESOURCES))
    act(() => result.current.toggleTopic('Alignment'))
    expect(result.current.filter(RESOURCES)).toHaveLength(1)
    expect(result.current.filter(RESOURCES)[0]?.id).toBe(2)

    act(() => result.current.toggleTopic('AGI Timeline'))
    // OR within topics → now matches both resource 1 and 2
    expect(result.current.filter(RESOURCES)).toHaveLength(2)
  })

  it('intersects across facets', () => {
    const { result } = renderHook(() => useResourceFilters(RESOURCES))
    act(() => {
      result.current.toggleTopic('AGI Timeline')
      result.current.toggleFormat('Essay')
    })
    expect(result.current.filter(RESOURCES)).toHaveLength(1)
    expect(result.current.filter(RESOURCES)[0]?.id).toBe(1)
  })

  it('stance filter including "Unknown" matches null stance', () => {
    const { result } = renderHook(() => useResourceFilters(RESOURCES))
    act(() => result.current.toggleStance('Unknown'))
    expect(result.current.filter(RESOURCES).map((r) => r.id)).toEqual([2])
  })

  it('free-text query searches title, author, key_argument, and tags', () => {
    const { result } = renderHook(() => useResourceFilters(RESOURCES))
    act(() => result.current.setQuery('alignment'))
    // Matches Superintelligence (topic_tags contains "Alignment" AND
    // key_argument mentions "alignment") and nothing else.
    expect(result.current.filter(RESOURCES).map((r) => r.id)).toEqual([2])

    act(() => result.current.setQuery('doomer'))
    expect(result.current.filter(RESOURCES).map((r) => r.id)).toEqual([3])
  })

  it('year range filter includes boundaries', () => {
    const { result } = renderHook(() => useResourceFilters(RESOURCES))
    act(() => result.current.setYearRange(2023, 2025))
    expect(
      result.current
        .filter(RESOURCES)
        .map((r) => r.id)
        .sort(),
    ).toEqual([1, 3])
  })

  it('reset clears filters but preserves tab/displayMode', () => {
    const { result } = renderHook(() => useResourceFilters(RESOURCES))
    act(() => {
      result.current.setDisplayMode('list')
      result.current.setTab('tracks')
      result.current.toggleTopic('AI Safety')
      result.current.reset()
    })
    expect(result.current.state.topics).toEqual([])
    expect(result.current.state.displayMode).toBe('list')
    expect(result.current.state.tab).toBe('tracks')
  })

  it('persists displayMode and filter selections to localStorage', () => {
    const { result, unmount } = renderHook(() => useResourceFilters(RESOURCES))
    act(() => {
      result.current.setDisplayMode('list')
      result.current.toggleTopic('Alignment')
    })
    unmount()
    const remounted = renderHook(() => useResourceFilters(RESOURCES))
    expect(remounted.result.current.state.displayMode).toBe('list')
    expect(remounted.result.current.state.topics).toEqual(['Alignment'])
  })

  it('counts tag and stance occurrences and reports data coverage', () => {
    const { result } = renderHook(() => useResourceFilters(RESOURCES))
    expect(result.current.counts.topics.get('Alignment')).toBe(1)
    expect(result.current.counts.formats.get('Essay')).toBe(2)
    // 2 of 3 resources have advocated_stance set
    expect(result.current.counts.stanceDataCoverage).toBeCloseTo(2 / 3)
    // Only 1 of 3 has advocated_timeline
    expect(result.current.counts.timelineDataCoverage).toBeCloseTo(1 / 3)
  })
})
