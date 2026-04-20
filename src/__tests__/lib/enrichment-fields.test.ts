/**
 * Ensures api/export-map.js#toFrontendShape preserves the new provenance fields
 * (notes_sources, notes_confidence, enrichment_version) on entity rows and that
 * they end up in the detail split rather than the skeleton.
 *
 * Covers Unit 1 of docs/plans/2026-04-20-001-feat-enrichment-skill-plan.md.
 */
import { describe, it, expect } from 'vitest'
// @ts-expect-error — api/ is plain JS with no type declarations
import { splitMapData } from '../../../api/export-map.js'

// Build a minimal entity row shaped like what pg returns from SELECT * FROM entity.
function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 42,
    entity_type: 'person',
    name: 'Test Person',
    category: 'Researcher',
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
    notes_sources: null,
    notes_confidence: null,
    enrichment_version: null,
    ...overrides,
  }
}

// splitMapData expects { _meta, people, organizations, resources, relationships, person_organizations }
function wrap(row: Record<string, unknown>) {
  return {
    _meta: { generated_at: new Date().toISOString() },
    people: [row],
    organizations: [],
    resources: [],
    relationships: [],
    person_organizations: [],
  }
}

describe('enrichment provenance fields', () => {
  it('absent provenance round-trips as null without breaking legacy entities', async () => {
    // For a legacy entity with null provenance, splitMapData's DETAIL_FIELDS guard
    // keeps null values on the skeleton (since `v != null` filter skips them),
    // which means detail for that id is empty. The important guarantee is that
    // splitMapData doesn't crash and the skeleton still renders.
    const input = wrap(makeRow())
    const { skeleton, detail } = splitMapData(input)
    expect(skeleton.people[0].id).toBe(42)
    // Null provenance stays on skeleton (DETAIL_FIELDS only moves non-null values)
    expect(skeleton.people[0].notes_sources).toBeNull()
    expect(skeleton.people[0].notes_confidence).toBeNull()
    expect(skeleton.people[0].enrichment_version).toBeNull()
    // Detail entry may still exist from other DETAIL_FIELDS (e.g. status) but
    // provenance fields specifically must be absent when null at the source row.
    expect(detail[42]?.notes_sources).toBeUndefined()
    expect(detail[42]?.notes_confidence).toBeUndefined()
    expect(detail[42]?.enrichment_version).toBeUndefined()
  })

  it('populated provenance moves to detail, not skeleton', async () => {
    const sources = [
      {
        url: 'https://example.org/source-1',
        snippet: 'Evidence snippet',
        retrieved_at: '2026-04-20T04:00:00Z',
        retriever: 'exa',
      },
    ]
    const input = wrap(
      makeRow({
        notes_sources: sources,
        notes_confidence: 4,
        enrichment_version: 'enrichment-skill-v1',
      }),
    )
    const { skeleton, detail } = splitMapData(input)

    // Skeleton: render-critical fields only — provenance is in DETAIL_FIELDS so
    // it should be absent from skeleton.people[0].
    expect(skeleton.people[0].notes_sources).toBeUndefined()
    expect(skeleton.people[0].notes_confidence).toBeUndefined()
    expect(skeleton.people[0].enrichment_version).toBeUndefined()

    // Detail: lazy-loaded payload keyed by id — provenance fields present.
    expect(detail[42]).toBeDefined()
    expect(detail[42].notes_sources).toEqual(sources)
    expect(detail[42].notes_confidence).toBe(4)
    expect(detail[42].enrichment_version).toBe('enrichment-skill-v1')
  })

  it('empty sources array is preserved (not coerced to null)', async () => {
    const input = wrap(makeRow({ notes_sources: [], notes_confidence: 1 }))
    const { detail } = splitMapData(input)
    // Empty array is treated as "present" by the DETAIL_FIELDS guard (it's non-null)
    expect(detail[42]).toBeDefined()
    expect(detail[42].notes_sources).toEqual([])
    expect(detail[42].notes_confidence).toBe(1)
  })
})
