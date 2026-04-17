import { describe, it, expect } from 'vitest'
import { fuzzySearch } from '../../lib/search'
import type { Entity } from '../../types/entity'

const makeEntity = (overrides: Partial<Entity>): Entity => ({
  id: 1,
  entity_type: 'person',
  name: 'Test Person',
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
  ...overrides,
})

const testEntities: Entity[] = [
  makeEntity({
    id: 1,
    name: 'Dario Amodei',
    entity_type: 'person',
    title: 'CEO',
    primary_org: 'Anthropic',
  }),
  makeEntity({
    id: 2,
    name: 'Sam Altman',
    entity_type: 'person',
    title: 'CEO',
    primary_org: 'OpenAI',
  }),
  makeEntity({ id: 3, name: 'Anthropic', entity_type: 'organization', category: 'Frontier Lab' }),
  makeEntity({ id: 4, name: 'OpenAI', entity_type: 'organization', category: 'Frontier Lab' }),
  makeEntity({
    id: 5,
    name: 'On the Dangers of Stochastic Parrots',
    entity_type: 'resource',
    title: 'Stochastic Parrots',
  }),
]

describe('fuzzySearch', () => {
  it('returns empty for empty query', () => {
    expect(fuzzySearch(testEntities, '')).toEqual([])
  })

  it('finds exact name matches with highest score', () => {
    const results = fuzzySearch(testEntities, 'dario amodei')
    expect(results[0]?.id).toBe(1)
    expect(results[0]?.score).toBe(100)
  })

  it('finds startsWith matches', () => {
    const results = fuzzySearch(testEntities, 'dar')
    expect(results[0]?.id).toBe(1)
    expect(results[0]?.score).toBe(80)
  })

  it('finds includes matches', () => {
    const results = fuzzySearch(testEntities, 'amodei')
    expect(results[0]?.id).toBe(1)
    expect(results[0]?.score).toBe(60)
  })

  it('filters by entity type', () => {
    const results = fuzzySearch(testEntities, 'anthropic', 'organization')
    expect(results).toHaveLength(1)
    expect(results[0]?.entity_type).toBe('organization')
  })

  it('searches secondary fields (title, primary_org)', () => {
    const results = fuzzySearch(testEntities, 'ceo', 'person')
    expect(results).toHaveLength(2)
  })

  it('respects limit parameter', () => {
    const results = fuzzySearch(testEntities, 'a', undefined, 2)
    expect(results.length).toBeLessThanOrEqual(2)
  })

  it('returns results sorted by score descending', () => {
    const results = fuzzySearch(testEntities, 'openai')
    const scores = results.map((r) => r.score)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })

  it('searches resource title field', () => {
    const results = fuzzySearch(testEntities, 'stochastic', 'resource')
    expect(results).toHaveLength(1)
    expect(results[0]?.id).toBe(5)
  })
})
