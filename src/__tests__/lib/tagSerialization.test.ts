import { describe, it, expect } from 'vitest'
import { tagsToStringArray, stringArrayToTags, buildTagSearch } from '../../lib/tagSerialization'
import { TOPIC_CORE } from '../../lib/resourceTaxonomy'

describe('tagsToStringArray', () => {
  it('returns [] for null or undefined', () => {
    expect(tagsToStringArray(null)).toEqual([])
    expect(tagsToStringArray(undefined)).toEqual([])
    expect(tagsToStringArray([])).toEqual([])
  })

  it('extracts label, trims whitespace, collapses runs', () => {
    expect(
      tagsToStringArray([
        { id: 1, label: '  AI Safety  ' },
        { id: 2, label: 'Compute' },
      ]),
    ).toEqual(['AI Safety', 'Compute'])
  })

  it('drops empty-label tags', () => {
    expect(
      tagsToStringArray([
        { id: 1, label: 'Alignment' },
        { id: 2, label: '' },
        { id: 3, label: '   ' },
      ]),
    ).toEqual(['Alignment'])
  })

  it('dedupes case-insensitively, keeping first-seen casing', () => {
    expect(
      tagsToStringArray([
        { id: 1, label: 'AI Safety' },
        { id: 2, label: 'ai safety' },
        { id: 3, label: 'AI Safety ' },
      ]),
    ).toEqual(['AI Safety'])
  })

  it('strips surrounding quotes', () => {
    expect(tagsToStringArray([{ id: 1, label: '"Policy"' }])).toEqual(['Policy'])
  })
})

describe('stringArrayToTags', () => {
  it('round-trips through tagsToStringArray', () => {
    const input = ['AI Safety', 'Compute', 'Governance']
    const tags = stringArrayToTags(input)
    expect(tagsToStringArray(tags)).toEqual(input)
  })

  it('returns [] for null/undefined', () => {
    expect(stringArrayToTags(null)).toEqual([])
    expect(stringArrayToTags(undefined)).toEqual([])
  })
})

describe('buildTagSearch', () => {
  const search = buildTagSearch({
    canonical: TOPIC_CORE,
    emergent: ['mechanistic-interp', 'situational-awareness'],
    alreadySelected: [],
  })

  it('returns [] for empty query', () => {
    expect(search('')).toEqual([])
    expect(search('   ')).toEqual([])
  })

  it('matches canonical tags case-insensitively', () => {
    const results = search('ai')
    expect(results.some((r) => r.label === 'AI Safety')).toBe(true)
    expect(results.find((r) => r.label === 'AI Safety')?.detail).toBe('core')
  })

  it('matches emergent tags and labels them', () => {
    const results = search('mechan')
    expect(results.some((r) => r.label === 'mechanistic-interp')).toBe(true)
    expect(results.find((r) => r.label === 'mechanistic-interp')?.detail).toBe('emergent')
  })

  it('offers a "+ new tag" entry for novel normalized input', () => {
    const results = search('compute-governance')
    const newEntry = results.find((r) => r.id === 'new:compute-governance')
    expect(newEntry).toBeDefined()
    expect(newEntry?.detail).toBe('+ new tag')
  })

  it('does NOT offer a "+ new tag" if the query matches canonical (regardless of casing)', () => {
    const results = search('AI SAFETY')
    expect(results.find((r) => r.id === 'new:AI SAFETY')).toBeUndefined()
    // Canonical spelling still present for selection
    expect(results.some((r) => r.label === 'AI Safety')).toBe(true)
  })

  it('does NOT offer a "+ new tag" if the query matches an existing emergent tag', () => {
    const results = search('Mechanistic-Interp')
    expect(results.find((r) => r.id?.toString().startsWith('new:'))).toBeUndefined()
  })

  it('respects alreadySelected — filters them out of results and the "new tag" path', () => {
    const s2 = buildTagSearch({
      canonical: TOPIC_CORE,
      emergent: [],
      alreadySelected: ['Compute'],
    })
    const results = s2('compute')
    expect(results.some((r) => r.label === 'Compute')).toBe(false)
    expect(results.find((r) => r.id === 'new:compute')).toBeUndefined()
  })
})
