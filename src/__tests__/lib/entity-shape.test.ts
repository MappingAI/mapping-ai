import { describe, it, expect } from 'vitest'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- api/export-map.js is plain JS shared between Lambda and scripts
import { toFrontendShape, splitMapData } from '../../../api/export-map.js'
import { TOPIC_CORE, FORMAT_TAGS, normalizeTag, findCanonicalTag } from '../../lib/resourceTaxonomy'

// Minimal row shape that mirrors what `SELECT * FROM entity` returns for a
// resource. Not exhaustive — only the fields the shape function reads.
const makeResourceRow = (overrides: Record<string, unknown> = {}) => ({
  id: 101,
  entity_type: 'resource',
  name: null,
  title: null,
  category: null,
  other_categories: null,
  primary_org: null,
  other_orgs: null,
  website: null,
  funding_model: null,
  parent_org_id: null,
  resource_title: 'AI 2027',
  resource_category: null,
  resource_author: 'Daniel Kokotajlo',
  resource_type: 'Essay',
  resource_url: 'https://ai-2027.com',
  resource_year: '2025',
  resource_key_argument: 'Short scenario forecast.',
  location: null,
  influence_type: null,
  twitter: null,
  bluesky: null,
  notes: null,
  notes_html: null,
  thumbnail_url: null,
  submission_count: 0,
  status: 'approved',
  belief_regulatory_stance: null,
  belief_regulatory_stance_detail: null,
  belief_evidence_source: null,
  belief_agi_timeline: null,
  belief_ai_risk: null,
  belief_threat_models: null,
  belief_regulatory_stance_wavg: null,
  belief_agi_timeline_wavg: null,
  belief_ai_risk_wavg: null,
  topic_tags: null,
  format_tags: null,
  advocated_stance: null,
  advocated_timeline: null,
  advocated_risk: null,
  source: null,
  source_url: null,
  ...overrides,
})

describe('toFrontendShape — Resources Rethink Phase 1 fields', () => {
  it('emits all 7 new fields with correct shapes when populated', () => {
    const out = toFrontendShape(
      makeResourceRow({
        topic_tags: ['AGI Timeline', 'Forecasting', 'Existential Risk'],
        format_tags: ['Essay', 'Scenario'],
        advocated_stance: 'Precautionary',
        advocated_timeline: '2-3 years',
        advocated_risk: 'Existential',
        source: 'CAIDP',
        source_url: 'https://caidp.example.com/ai-2027',
      }),
    )
    expect(out.topic_tags).toEqual(['AGI Timeline', 'Forecasting', 'Existential Risk'])
    expect(out.format_tags).toEqual(['Essay', 'Scenario'])
    expect(out.advocated_stance).toBe('Precautionary')
    expect(out.advocated_timeline).toBe('2-3 years')
    expect(out.advocated_risk).toBe('Existential')
    expect(out.source).toBe('CAIDP')
    expect(out.source_url).toBe('https://caidp.example.com/ai-2027')
  })

  it('emits empty arrays and nulls when the row has nothing', () => {
    const out = toFrontendShape(makeResourceRow({ resource_type: null }))
    expect(out.topic_tags).toEqual([])
    expect(out.format_tags).toEqual([])
    expect(out.advocated_stance).toBeNull()
    expect(out.advocated_timeline).toBeNull()
    expect(out.advocated_risk).toBeNull()
    expect(out.source).toBeNull()
    expect(out.source_url).toBeNull()
  })

  it('falls back to resource_category + other_categories (CSV) when topic_tags is empty', () => {
    const out = toFrontendShape(
      makeResourceRow({
        resource_category: 'AI Safety',
        other_categories: 'Policy, Governance',
      }),
    )
    expect(out.topic_tags.sort()).toEqual(['AI Safety', 'Governance', 'Policy'].sort())
  })

  it('falls back to other_categories (JSON array) when topic_tags is empty', () => {
    const out = toFrontendShape(
      makeResourceRow({
        resource_category: null,
        other_categories: '["Alignment","Compute"]',
      }),
    )
    expect(out.topic_tags.sort()).toEqual(['Alignment', 'Compute'])
  })

  it('falls back to resource_type as single-element format_tags when format_tags is empty', () => {
    const out = toFrontendShape(makeResourceRow({ resource_type: 'Substack/Newsletter' }))
    expect(out.format_tags).toEqual(['Substack/Newsletter'])
  })

  it('emits empty arrays for people and orgs (not null) for schema consistency', () => {
    const personOut = toFrontendShape({
      ...makeResourceRow(),
      id: 1,
      entity_type: 'person',
      name: 'Dario Amodei',
      resource_title: null,
      resource_type: null,
    })
    expect(personOut.topic_tags).toEqual([])
    expect(personOut.format_tags).toEqual([])
  })
})

describe('splitMapData — key_argument skeleton promotion for resources', () => {
  it('keeps key_argument in the skeleton for resources, strips it for people/orgs', () => {
    const resource = toFrontendShape(makeResourceRow({}))
    const person = toFrontendShape({
      ...makeResourceRow(),
      id: 1,
      entity_type: 'person',
      name: 'Dario Amodei',
      resource_key_argument: null,
    })
    // Give person a key_argument directly on the shape to simulate an old row
    ;(person as { key_argument?: string }).key_argument = 'should be stripped'

    const { skeleton, detail } = splitMapData({
      _meta: {},
      people: [person],
      organizations: [],
      resources: [resource],
      relationships: [],
      person_organizations: [],
    })

    expect(skeleton.resources[0].key_argument).toBe('Short scenario forecast.')
    expect(detail[101]?.key_argument).toBeUndefined()

    expect(skeleton.people[0].key_argument).toBeUndefined()
    expect(detail[1]?.key_argument).toBe('should be stripped')
  })
})

describe('resourceTaxonomy', () => {
  it('TOPIC_CORE and FORMAT_TAGS are non-empty curated lists', () => {
    expect(TOPIC_CORE.length).toBeGreaterThanOrEqual(15)
    expect(FORMAT_TAGS).toContain('Book')
    expect(FORMAT_TAGS).toContain('Podcast')
    expect(FORMAT_TAGS).toContain('Interactive Map')
  })

  describe('normalizeTag', () => {
    it('trims and collapses whitespace', () => {
      expect(normalizeTag('  AI  Safety ')).toBe('AI Safety')
    })
    it('strips surrounding quotes', () => {
      expect(normalizeTag('"AI Safety"')).toBe('AI Safety')
    })
    it('returns null for empty / whitespace-only', () => {
      expect(normalizeTag('')).toBeNull()
      expect(normalizeTag('   ')).toBeNull()
    })
    it('returns null for non-strings', () => {
      // @ts-expect-error -- testing runtime guard
      expect(normalizeTag(null)).toBeNull()
      // @ts-expect-error -- testing runtime guard
      expect(normalizeTag(42)).toBeNull()
    })
    it('returns null for absurdly long input', () => {
      expect(normalizeTag('x'.repeat(200))).toBeNull()
    })
  })

  describe('findCanonicalTag', () => {
    it('returns the canonical spelling for case-insensitive matches', () => {
      expect(findCanonicalTag('ai safety', TOPIC_CORE)).toBe('AI Safety')
      expect(findCanonicalTag('  COMPUTE ', TOPIC_CORE)).toBe('Compute')
    })
    it('returns null when no match exists', () => {
      expect(findCanonicalTag('mechanistic-interp', TOPIC_CORE)).toBeNull()
    })
    it('returns null for unusable input', () => {
      expect(findCanonicalTag('', TOPIC_CORE)).toBeNull()
    })
  })
})
