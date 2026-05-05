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

  it('handles dots and periods in names', () => {
    expect(slugify('Dr. Jane Smith')).toBe('dr-jane-smith')
    expect(slugify('A.I. Safety Lab')).toBe('a-i-safety-lab')
  })

  it('handles parentheses and brackets', () => {
    expect(slugify('Center for AI (CFAI)')).toBe('center-for-ai-cfai')
    expect(slugify('Lab [US Division]')).toBe('lab-us-division')
  })

  it('handles slashes and backslashes', () => {
    expect(slugify('Ethics/Bias/Rights')).toBe('ethics-bias-rights')
  })

  it('handles numbers and mixed alphanumeric', () => {
    expect(slugify('GPT-4o Turbo')).toBe('gpt-4o-turbo')
    expect(slugify('2026 AI Policy Report')).toBe('2026-ai-policy-report')
  })

  it('handles emoji-only input', () => {
    expect(slugify('🤖🧠')).toBe('')
  })

  it('handles very long names', () => {
    const longName = 'A'.repeat(300)
    const slug = slugify(longName)
    expect(slug).toBe('a'.repeat(300))
  })

  it('handles names with multiple consecutive spaces', () => {
    expect(slugify('John    Smith')).toBe('john-smith')
  })

  it('handles tab and newline characters', () => {
    expect(slugify('John\tSmith\nJr')).toBe('john-smith-jr')
  })

  it('handles curly quotes and typographic characters', () => {
    expect(slugify('“Open” AI')).toBe('open-ai')
  })

  it('handles ampersand in org names', () => {
    expect(slugify('VC/Capital & Philanthropy')).toBe('vc-capital-philanthropy')
  })

  it('handles names with commas', () => {
    expect(slugify('Smith, John Jr.')).toBe('smith-john-jr')
  })

  it('handles names with at-signs and hashes', () => {
    expect(slugify('@username #policy')).toBe('username-policy')
  })

  it('produces stable output (idempotent on valid slugs)', () => {
    const slug = slugify('Dario Amodei')
    expect(slugify(slug)).toBe(slug)
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

  it('handles emoji-only names with fallback', () => {
    expect(generateEntitySlug('🤖🧠', 'organization', new Set(), 15)).toBe('entity-15')
  })

  it('generates timestamp-based fallback when no id provided', () => {
    const slug = generateEntitySlug(null, 'person', new Set())
    expect(slug).toMatch(/^entity-person-\d+$/)
  })

  it('handles resource type entity slugs', () => {
    expect(generateEntitySlug('AI Executive Order 2025', 'resource', new Set())).toBe('ai-executive-order-2025')
  })

  it('produces unique slugs for same-name entities', () => {
    const existing = new Set<string>()
    const slug1 = generateEntitySlug('John Smith', 'person', existing)
    existing.add(slug1)
    const slug2 = generateEntitySlug('John Smith', 'person', existing)
    existing.add(slug2)
    const slug3 = generateEntitySlug('John Smith', 'person', existing)

    expect(slug1).toBe('john-smith')
    expect(slug2).toBe('john-smith-2')
    expect(slug3).toBe('john-smith-3')
    expect(new Set([slug1, slug2, slug3]).size).toBe(3)
  })
})

describe('deep link URL construction', () => {
  const typePrefix: Record<string, string> = { person: 'person', organization: 'org', resource: 'resource' }

  function getEntitySlug(d: { entityType: string; slug?: string | null; id: number }) {
    const prefix = typePrefix[d.entityType] || d.entityType
    return prefix + '/' + (d.slug || d.id)
  }

  function getDeepLinkUrl(d: { entityType: string; slug?: string | null; id: number }) {
    return 'https://mapping-ai.org/map/' + getEntitySlug(d)
  }

  it('uses slug when available', () => {
    const url = getDeepLinkUrl({ entityType: 'person', slug: 'dario-amodei', id: 42 })
    expect(url).toBe('https://mapping-ai.org/map/person/dario-amodei')
  })

  it('falls back to numeric id when slug is null', () => {
    const url = getDeepLinkUrl({ entityType: 'person', slug: null, id: 42 })
    expect(url).toBe('https://mapping-ai.org/map/person/42')
  })

  it('uses "org" prefix for organizations', () => {
    const url = getDeepLinkUrl({ entityType: 'organization', slug: 'anthropic', id: 10 })
    expect(url).toBe('https://mapping-ai.org/map/org/anthropic')
  })

  it('uses "resource" prefix for resources', () => {
    const url = getDeepLinkUrl({ entityType: 'resource', slug: 'ai-executive-order-2025', id: 99 })
    expect(url).toBe('https://mapping-ai.org/map/resource/ai-executive-order-2025')
  })
})

describe('deep link URL resolution', () => {
  function resolveSlugPath(pathname: string): { type: string; slug: string } | null {
    const pathMatch = pathname.match(/^\/map\/(person|org|resource)\/([^/]+)\/?$/)
    if (!pathMatch) return null
    try {
      return { type: pathMatch[1]!, slug: decodeURIComponent(pathMatch[2]!) }
    } catch {
      return null
    }
  }

  it('parses person slug URL', () => {
    expect(resolveSlugPath('/map/person/dario-amodei')).toEqual({ type: 'person', slug: 'dario-amodei' })
  })

  it('parses org slug URL', () => {
    expect(resolveSlugPath('/map/org/anthropic')).toEqual({ type: 'org', slug: 'anthropic' })
  })

  it('parses resource slug URL', () => {
    expect(resolveSlugPath('/map/resource/ai-executive-order-2025')).toEqual({
      type: 'resource',
      slug: 'ai-executive-order-2025',
    })
  })

  it('handles trailing slash', () => {
    expect(resolveSlugPath('/map/person/dario-amodei/')).toEqual({ type: 'person', slug: 'dario-amodei' })
  })

  it('handles numeric id fallback', () => {
    expect(resolveSlugPath('/map/person/42')).toEqual({ type: 'person', slug: '42' })
  })

  it('returns null for bare /map path', () => {
    expect(resolveSlugPath('/map')).toBeNull()
  })

  it('returns null for invalid entity type', () => {
    expect(resolveSlugPath('/map/invalid/slug')).toBeNull()
  })

  it('returns null for too-deep paths', () => {
    expect(resolveSlugPath('/map/person/dario-amodei/extra')).toBeNull()
  })

  it('decodes percent-encoded slugs', () => {
    expect(resolveSlugPath('/map/org/o%27brien-associates')).toEqual({
      type: 'org',
      slug: "o'brien-associates",
    })
  })

  it('handles slugs with numbers', () => {
    expect(resolveSlugPath('/map/person/john-smith-2')).toEqual({ type: 'person', slug: 'john-smith-2' })
  })
})
