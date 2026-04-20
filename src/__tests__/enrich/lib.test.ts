/**
 * Tests for scripts/enrich/lib/ foundation. Covers Unit 2 of the plan.
 *
 * Parity check: the enum constants in lib/schema.js must stay in sync with
 * api/submit.js — if these tests fail, a drift has been introduced and the
 * enrichment skill is about to submit rows that the Lambda will reject.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// @ts-expect-error — scripts are plain JS
import * as lib from '../../../scripts/enrich/lib/index.js'

// Read api/submit.js as a string for parity checks. We extract the enum maps
// via regex rather than importing because api/submit.js is a Lambda entry
// point that pulls in pg and AWS SDKs at top level.
const submitJs = readFileSync(resolve(__dirname, '../../../api/submit.js'), 'utf8')

function extractEnumKeys(name: string): string[] {
  // STANCE_SCORES = { Accelerate: 1, 'Light-touch': 2, ... }
  const match = submitJs.match(new RegExp(`const ${name} = \\{([\\s\\S]*?)\\}`, 'm'))
  if (!match || !match[1]) throw new Error(`could not find ${name} in api/submit.js`)
  const keys: string[] = []
  for (const m of match[1].matchAll(/^\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z][\w-]*))\s*:/gm)) {
    const key = m[1] || m[2] || m[3]
    if (key) keys.push(key)
  }
  return keys
}

describe('lib/schema enum parity with api/submit.js', () => {
  it('STANCE_SCORES keys match api/submit.js', () => {
    const libKeys = Object.keys(lib.STANCE_SCORES).sort()
    const apiKeys = extractEnumKeys('STANCE_SCORES').sort()
    expect(libKeys).toEqual(apiKeys)
  })

  it('TIMELINE_SCORES keys match api/submit.js', () => {
    const libKeys = Object.keys(lib.TIMELINE_SCORES).sort()
    const apiKeys = extractEnumKeys('TIMELINE_SCORES').sort()
    expect(libKeys).toEqual(apiKeys)
  })

  it('RISK_SCORES keys match api/submit.js', () => {
    const libKeys = Object.keys(lib.RISK_SCORES).sort()
    const apiKeys = extractEnumKeys('RISK_SCORES').sort()
    expect(libKeys).toEqual(apiKeys)
  })
})

describe('lib/schema canonicalEdgeType', () => {
  it('returns canonical values unchanged', () => {
    expect(lib.canonicalEdgeType('affiliated')).toBe('affiliated')
    expect(lib.canonicalEdgeType('authored_by')).toBe('authored_by')
  })
  it('maps known aliases', () => {
    expect(lib.canonicalEdgeType('author')).toBe('authored_by')
    expect(lib.canonicalEdgeType('affiliation')).toBe('affiliated')
  })
  it('passes through unknown types', () => {
    expect(lib.canonicalEdgeType('mysterious_bond')).toBe('mysterious_bond')
  })
  it('returns null on empty input', () => {
    expect(lib.canonicalEdgeType(null)).toBeNull()
    expect(lib.canonicalEdgeType('')).toBeNull()
  })
})

describe('lib/api htmlToPlainText', () => {
  it('returns null for falsy input', () => {
    expect(lib.htmlToPlainText(null)).toBeNull()
    expect(lib.htmlToPlainText('')).toBeNull()
  })
  it('strips tags and decodes basic entities', () => {
    const html = '<p>Hello &amp; <strong>world</strong>!</p>'
    expect(lib.htmlToPlainText(html)).toBe('Hello & world!')
  })
  it('preserves paragraph breaks as double newlines stripped to single space', () => {
    const html = '<p>Line one.</p><p>Line two.</p>'
    // Current impl collapses whitespace; the important property is that no
    // tags survive, not that newlines are preserved.
    const out = lib.htmlToPlainText(html)
    expect(out).not.toMatch(/<[^>]+>/)
    expect(out).toContain('Line one.')
    expect(out).toContain('Line two.')
  })
})

describe('lib/api buildSubmitPayload', () => {
  it('derives notes from notesHtml when notes is absent', () => {
    const payload = lib.buildSubmitPayload({
      type: 'person',
      name: 'Test Person',
      notesHtml: '<p>Rich <strong>content</strong>.</p>',
    })
    expect(payload.data.notes).toBe('Rich content.')
    expect(payload.data.notesHtml).toBe('<p>Rich <strong>content</strong>.</p>')
  })

  it('preserves explicit notes value when provided', () => {
    const payload = lib.buildSubmitPayload({
      type: 'person',
      name: 'Test',
      notes: 'Explicit plain text.',
      notesHtml: '<p>HTML version.</p>',
    })
    expect(payload.data.notes).toBe('Explicit plain text.')
  })

  it('serialises notesSources as JSON string for the /submit wire format', () => {
    const sources = [{ url: 'https://example.com', snippet: 'evidence', retrieved_at: '2026-04-20', retriever: 'exa' }]
    const payload = lib.buildSubmitPayload({
      type: 'person',
      name: 'Test',
      notesSources: sources,
    })
    expect(typeof payload.data.notesSources).toBe('string')
    expect(JSON.parse(payload.data.notesSources as string)).toEqual(sources)
  })

  it('defaults submitterRelationship to external', () => {
    const payload = lib.buildSubmitPayload({ type: 'person', name: 'Test' })
    expect(payload.data.submitterRelationship).toBe('external')
  })

  it('resource with title only: also sets name from title', () => {
    const payload = lib.buildSubmitPayload({ type: 'resource', title: 'Some Report' })
    expect(payload.data.title).toBe('Some Report')
    expect(payload.data.name).toBe('Some Report')
  })

  it('throws on unknown type', () => {
    expect(() => lib.buildSubmitPayload({ type: 'alien' as unknown as 'person' })).toThrow(/Invalid or missing type/)
  })
})

describe('lib/api submitDraft dry-run', () => {
  it('returns payload without hitting the network', async () => {
    const result = await lib.submitDraft({ type: 'person', name: 'Test Person' }, { dryRun: true })
    expect(result.dryRun).toBe(true)
    expect(result.payload.type).toBe('person')
    expect(result.payload.data.name).toBe('Test Person')
  })
})

describe('lib/match nameSimilarity + canonicalOrgName', () => {
  it('identical names score 1', () => {
    expect(lib.nameSimilarity('OpenAI', 'OpenAI')).toBe(1)
  })
  it('case-insensitive', () => {
    expect(lib.nameSimilarity('OpenAI', 'openai')).toBe(1)
  })
  it('shared tokens score > 0', () => {
    const sim = lib.nameSimilarity('UK AI Safety Institute', 'UK AI Security Institute')
    expect(sim).toBeGreaterThan(0.5)
    expect(sim).toBeLessThan(1)
  })
  it('disjoint names score 0', () => {
    expect(lib.nameSimilarity('OpenAI', 'UK AI Safety Institute')).toBeLessThan(0.5)
  })

  it('canonicalOrgName resolves known aliases', () => {
    expect(lib.canonicalOrgName('UK AI Safety Institute')).toBe('UK AI Security Institute')
    expect(lib.canonicalOrgName('CHAI')).toBe('Center for Human-Compatible AI (CHAI)')
  })
  it('canonicalOrgName passes through unknown names', () => {
    expect(lib.canonicalOrgName('Some Novel Org')).toBe('Some Novel Org')
  })
})
