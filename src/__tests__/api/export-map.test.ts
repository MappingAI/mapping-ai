// Unit tests for api/export-map.ts — the shared DB → frontend mapping that
// CLAUDE.md flags as a silent-breakage vector. These lock in the field-name
// contract so a DB column rename without a toFrontendShape update fails CI
// instead of producing a broken map weeks later.

import { describe, expect, it } from 'vitest'
import { toFrontendShape, splitMapData } from '../../../api/export-map.ts'
import type { GeneratedMapData } from '../../../api/export-map.ts'

function baseEntityRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    entity_type: 'person' as const,
    name: 'Test Person',
    title: 'Researcher',
    category: 'Academic',
    other_categories: null,
    primary_org: 'Org X',
    other_orgs: null,
    website: null,
    funding_model: null,
    parent_org_id: null,
    resource_title: null,
    resource_category: null,
    resource_author: null,
    resource_type: null,
    resource_url: null,
    resource_year: null,
    resource_key_argument: null,
    location: 'Boston',
    influence_type: null,
    twitter: null,
    bluesky: null,
    notes: null,
    notes_html: null,
    thumbnail_url: null,
    belief_regulatory_stance: null,
    belief_regulatory_stance_detail: null,
    belief_evidence_source: null,
    belief_agi_timeline: null,
    belief_ai_risk: null,
    belief_threat_models: null,
    belief_regulatory_stance_wavg: null,
    belief_regulatory_stance_wvar: null,
    belief_regulatory_stance_n: 0,
    belief_agi_timeline_wavg: null,
    belief_agi_timeline_wvar: null,
    belief_agi_timeline_n: 0,
    belief_ai_risk_wavg: null,
    belief_ai_risk_wvar: null,
    belief_ai_risk_n: 0,
    submission_count: 1,
    status: 'approved' as const,
    qa_approved: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('toFrontendShape', () => {
  it('maps belief_* DB columns to frontend field names', () => {
    const shaped = toFrontendShape(
      baseEntityRow({
        belief_regulatory_stance: 'Targeted',
        belief_agi_timeline: '5-10 years',
        belief_ai_risk: 'Serious',
      }),
    )
    expect(shaped.regulatory_stance).toBe('Targeted')
    expect(shaped.agi_timeline).toBe('5-10 years')
    expect(shaped.ai_risk_level).toBe('Serious')
  })

  it('derives ordinal scores from text labels when wavg is null', () => {
    const shaped = toFrontendShape(
      baseEntityRow({
        belief_regulatory_stance: 'Targeted',
        belief_agi_timeline: '5-10 years',
        belief_ai_risk: 'Serious',
      }),
    )
    expect(shaped.stance_score).toBe(3)
    expect(shaped.timeline_score).toBe(3)
    expect(shaped.risk_score).toBe(3)
  })

  it('prefers wavg over text-label fallback when available', () => {
    const shaped = toFrontendShape(
      baseEntityRow({
        belief_regulatory_stance: 'Targeted', // ordinal = 3
        belief_regulatory_stance_wavg: 2.5,
      }),
    )
    expect(shaped.stance_score).toBe(2.5)
  })

  it('returns null score when both wavg and label are null', () => {
    const shaped = toFrontendShape(baseEntityRow())
    expect(shaped.stance_score).toBeNull()
    expect(shaped.timeline_score).toBeNull()
    expect(shaped.risk_score).toBeNull()
  })

  it('resources map resource_title → title and resource_url → url', () => {
    const shaped = toFrontendShape(
      baseEntityRow({
        entity_type: 'resource',
        resource_title: 'Some Paper',
        resource_url: 'https://example.com/paper',
        resource_author: 'Author X',
        resource_year: '2024',
      }),
    )
    expect(shaped.title).toBe('Some Paper')
    expect(shaped.url).toBe('https://example.com/paper')
    expect(shaped.author).toBe('Author X')
    expect(shaped.year).toBe('2024')
  })

  it('resource falls back to name when resource_title is missing', () => {
    const shaped = toFrontendShape(
      baseEntityRow({
        entity_type: 'resource',
        name: 'Fallback Name',
        resource_title: null,
      }),
    )
    expect(shaped.title).toBe('Fallback Name')
  })
})

describe('splitMapData', () => {
  function mapData(): GeneratedMapData {
    return {
      _meta: { generated_at: '2026-01-01T00:00:00Z' },
      people: [
        {
          id: 1,
          entity_type: 'person',
          name: 'Alice',
          notes: 'some heavy notes',
          regulatory_stance_detail: 'long detail',
          stance_score: 3,
        },
      ],
      organizations: [],
      resources: [],
      relationships: [],
      person_organizations: [],
    }
  }

  it('moves detail fields to detail[id], keeps skeleton lean', () => {
    const { skeleton, detail } = splitMapData(mapData())
    expect(skeleton.people[0]).not.toHaveProperty('notes')
    expect(skeleton.people[0]).not.toHaveProperty('regulatory_stance_detail')
    expect(skeleton.people[0]?.stance_score).toBe(3)
    expect(detail[1]).toEqual({
      notes: 'some heavy notes',
      regulatory_stance_detail: 'long detail',
    })
  })

  it('does not emit a detail entry when no detail fields are present', () => {
    const data = mapData()
    data.people[0] = {
      id: 2,
      entity_type: 'person',
      name: 'Bob',
      stance_score: 4,
    }
    const { detail } = splitMapData(data)
    expect(detail).not.toHaveProperty('2')
  })
})
