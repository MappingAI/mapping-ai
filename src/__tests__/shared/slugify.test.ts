import { describe, it, expect } from 'vitest'
import { slugify, generateEntitySlug } from '../../shared/slugify'

describe('slugify', () => {
  it('converts a simple name to kebab-case', () => {
    expect(slugify('Dario Amodei')).toBe('dario-amodei')
  })

  it('strips accented characters via NFD normalization', () => {
    expect(slugify('François Chollet')).toBe('francois-chollet')
    expect(slugify('José García')).toBe('jose-garcia')
  })

  it('collapses consecutive special characters to a single hyphen', () => {
    expect(slugify("O'Brien & Associates")).toBe('o-brien-associates')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello')
  })

  it('returns empty string for CJK-only input', () => {
    expect(slugify('人工智能')).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('')
  })

  it('handles mixed CJK and Latin', () => {
    expect(slugify('AI 人工智能 Lab')).toBe('ai-lab')
  })
})

describe('generateEntitySlug', () => {
  it('returns the slugified name when no collision', () => {
    expect(generateEntitySlug('Dario Amodei', 'person', new Set())).toBe('dario-amodei')
  })

  it('appends -2 on first collision', () => {
    const existing = new Set(['dario-amodei'])
    expect(generateEntitySlug('Dario Amodei', 'person', existing)).toBe('dario-amodei-2')
  })

  it('increments suffix for multiple collisions', () => {
    const existing = new Set(['john-smith', 'john-smith-2', 'john-smith-3'])
    expect(generateEntitySlug('John Smith', 'person', existing)).toBe('john-smith-4')
  })

  it('falls back to entity-{id} when name is null', () => {
    expect(generateEntitySlug(null, 'person', new Set(), 42)).toBe('entity-42')
  })

  it('falls back to entity-{id} when name is undefined', () => {
    expect(generateEntitySlug(undefined, 'person', new Set(), 99)).toBe('entity-99')
  })

  it('falls back to entity-{id} when name slugifies to empty string', () => {
    expect(generateEntitySlug('人工智能', 'person', new Set(), 7)).toBe('entity-7')
  })

  it('handles collision on fallback slug', () => {
    const existing = new Set(['entity-42'])
    expect(generateEntitySlug(null, 'person', existing, 42)).toBe('entity-42-2')
  })
})
