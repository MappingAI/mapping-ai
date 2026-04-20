/**
 * Tests for scripts/enrich/research.js — Unit 3 of the enrichment skill plan.
 *
 * Covers:
 *   - Happy path: returns a draft with sources + belief enums populated.
 *   - Re-verify mode: diff-shaped draft against the existing entity row.
 *   - Duplicate detection: high-similarity DB hit produces skipReason.
 *   - Retriever fallback: no Exa hook + no EXA_API_KEY → web-search warning.
 *   - Haiku classifier error: re-raised with context.
 *   - Integration: research output survives buildSubmitPayload without throws.
 *
 * No live network. Exa fetch, searchAPI, classifyEntity, searchEntitiesByName,
 * and getEntityById are all mocked via vi.mock on the lib barrel / global
 * fetch.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the enrichment lib barrel BEFORE importing research.js so research's
// import * pulls the mocked versions. Each test overrides individual mocks
// via the returned handles.
vi.mock('../../../scripts/enrich/lib/index.js', async () => {
  const actual = (await vi.importActual('../../../scripts/enrich/lib/index.js')) as Record<string, unknown>
  return {
    ...actual,
    classifyEntity: vi.fn(),
    searchEntitiesByName: vi.fn(),
    getEntityById: vi.fn(),
    searchAPI: vi.fn(),
  }
})

// @ts-expect-error — JS import, no types
import * as lib from '../../../scripts/enrich/lib/index.js'
// @ts-expect-error — JS import, no types
import { research, resolveRetriever, QUERY_TEMPLATES } from '../../../scripts/enrich/research.js'
// @ts-expect-error — JS import, no types
import { buildSubmitPayload } from '../../../scripts/enrich/lib/api.js'

type Fn = ReturnType<typeof vi.fn>

function mockHaikuOk(reasoning = 'Reasoning about Example Org and Partner Lab.') {
  ;(lib.classifyEntity as unknown as Fn).mockResolvedValue({
    category: 'Researcher',
    otherCategories: null,
    regulatoryStance: 'Moderate',
    agiTimeline: '5-10 years',
    aiRiskLevel: 'Serious',
    evidenceSource: 'Explicitly stated',
    threatModels: 'Loss of control, Power concentration',
    confidence: 4,
    reasoning,
    enrichmentVersion: 'enrichment-skill-v1-2026-04-20',
    enumWarnings: null,
  })
}

function mockExaFetchOk() {
  const exaBody = {
    results: [
      {
        url: 'https://example.com/profile',
        title: 'Profile of Example Person',
        snippet: 'Example Person leads policy work at Partner Lab on AI governance.',
      },
      {
        url: 'https://example.com/bio',
        title: 'Bio',
        snippet: 'Affiliated with Example Org on frontier policy.',
      },
    ],
  }
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => exaBody,
    text: async () => JSON.stringify(exaBody),
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  delete (globalThis as unknown as { __ENRICH_TOOLS__?: unknown }).__ENRICH_TOOLS__
  process.env = { ...ORIGINAL_ENV, EXA_API_KEY: 'test-exa-key', ANTHROPIC_API_KEY: 'test-ak' }
  // Default stubs: no duplicates, no adjacent hits.
  ;(lib.searchEntitiesByName as unknown as Fn).mockResolvedValue([])
  ;(lib.searchAPI as unknown as Fn).mockResolvedValue({ people: [], organizations: [], resources: [] })
})

afterEach(() => {
  vi.unstubAllGlobals()
  process.env = { ...ORIGINAL_ENV }
})

describe('resolveRetriever precedence', () => {
  it('prefers the global __ENRICH_TOOLS__ hook when present', () => {
    ;(globalThis as unknown as { __ENRICH_TOOLS__: unknown }).__ENRICH_TOOLS__ = {
      exaSearch: async () => [],
    }
    expect(resolveRetriever().retriever).toBe('mcp')
  })

  it('falls back to EXA_API_KEY when no hook is installed', () => {
    delete (globalThis as unknown as { __ENRICH_TOOLS__?: unknown }).__ENRICH_TOOLS__
    process.env.EXA_API_KEY = 'k'
    expect(resolveRetriever().retriever).toBe('exa')
  })

  it('falls back to web-search when neither is available', () => {
    delete (globalThis as unknown as { __ENRICH_TOOLS__?: unknown }).__ENRICH_TOOLS__
    delete process.env.EXA_API_KEY
    expect(resolveRetriever().retriever).toBe('web-search')
  })
})

describe('QUERY_TEMPLATES', () => {
  it('has 3 queries per entity type', () => {
    expect(QUERY_TEMPLATES.person('X').length).toBeGreaterThanOrEqual(3)
    expect(QUERY_TEMPLATES.organization('Y').length).toBeGreaterThanOrEqual(3)
    expect(QUERY_TEMPLATES.resource('Z').length).toBeGreaterThanOrEqual(3)
  })
})

describe('research — happy path', () => {
  it('returns a draft with populated belief enums and non-empty notesSources', async () => {
    mockExaFetchOk()
    mockHaikuOk()

    const result = await research({ name: 'Stephen Clare', entityType: 'person' })

    expect(result.draft.skipReason).toBeUndefined()
    expect(result.draft.regulatoryStance).toBe('Moderate')
    expect(result.draft.agiTimeline).toBe('5-10 years')
    expect(result.draft.aiRiskLevel).toBe('Serious')
    expect(Array.isArray(result.sources)).toBe(true)
    expect(result.sources.length).toBeGreaterThan(0)
    expect(result.draft.notesSources.length).toBe(result.sources.length)
    for (const src of result.draft.notesSources) {
      expect(src.url).toMatch(/^https?:\/\//)
      expect(src.retriever).toBe('exa')
      expect(typeof src.retrieved_at).toBe('string')
    }
    expect(lib.classifyEntity).toHaveBeenCalledTimes(1)
  })

  it('passes the seed name and entity type to the classifier', async () => {
    mockExaFetchOk()
    mockHaikuOk()
    await research({ name: 'Stephen Clare', entityType: 'person' })
    const calls = (lib.classifyEntity as unknown as Fn).mock.calls
    const callArgs = calls[0]?.[0] as { name: string; entityType: string; evidenceText: string }
    expect(callArgs.name).toBe('Stephen Clare')
    expect(callArgs.entityType).toBe('person')
    expect(typeof callArgs.evidenceText).toBe('string')
    expect(callArgs.evidenceText.length).toBeGreaterThan(0)
  })
})

describe('research — duplicate detection', () => {
  it('returns skipReason=duplicate when a high-similarity DB hit exists', async () => {
    ;(lib.searchEntitiesByName as unknown as Fn).mockResolvedValue([
      { id: 1849, entity_type: 'person', name: 'Stephen Clare', category: 'Researcher' },
    ])
    // Exa + classifier should never be called on the duplicate short-circuit.
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await research({ name: 'Stephen Clare', entityType: 'person' })

    expect(result.draft.skipReason).toBe('duplicate')
    expect(result.duplicates.length).toBeGreaterThan(0)
    expect(result.duplicates[0].entity.id).toBe(1849)
    expect(result.duplicates[0].similarity).toBeGreaterThanOrEqual(0.85)
    expect(lib.classifyEntity).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('proceeds when overrideDuplicate=true despite a high-similarity hit', async () => {
    ;(lib.searchEntitiesByName as unknown as Fn).mockResolvedValue([
      { id: 1849, entity_type: 'person', name: 'Stephen Clare', category: 'Researcher' },
    ])
    mockExaFetchOk()
    mockHaikuOk()
    const result = await research({
      name: 'Stephen Clare',
      entityType: 'person',
      overrideDuplicate: true,
    })
    expect(result.draft.skipReason).toBeUndefined()
    expect(result.draft.regulatoryStance).toBe('Moderate')
  })
})

describe('research — web-search fallback', () => {
  it('warns in the draft when both Exa hook and EXA_API_KEY are missing', async () => {
    delete (globalThis as unknown as { __ENRICH_TOOLS__?: unknown }).__ENRICH_TOOLS__
    delete process.env.EXA_API_KEY
    // Even though web-search fallback builds sources from synthetic DDG URLs,
    // no network call is actually made (the retriever returns a stub entry).
    // Stub fetch anyway to fail loudly if anything calls it.
    const fetchMock = vi.fn(async () => {
      throw new Error('fetch should not be called in web-search fallback')
    })
    vi.stubGlobal('fetch', fetchMock)
    mockHaikuOk()

    const result = await research({ name: 'Obscure Person', entityType: 'person' })

    const degraded = result.warnings.find((w: { type: string }) => w.type === 'retriever_degraded')
    expect(degraded).toBeDefined()
    for (const src of result.sources) {
      expect(src.retriever).toBe('web-search')
      expect(src.url).toContain('duckduckgo.com')
    }
  })
})

describe('research — re-verify mode', () => {
  it('pulls current entity state and returns a diff-shaped draft', async () => {
    ;(lib.getEntityById as unknown as Fn).mockResolvedValue({
      id: 1849,
      name: 'Stephen Clare',
      category: 'Researcher',
      belief_regulatory_stance: 'Light-touch',
      belief_agi_timeline: '10-25 years',
      belief_ai_risk: 'Serious',
    })
    mockExaFetchOk()
    mockHaikuOk()

    const result = await research({
      name: 'Stephen Clare',
      entityType: 'person',
      mode: 'reverify',
      entityId: 1849,
    })

    expect(lib.getEntityById).toHaveBeenCalledWith(1849)
    expect(result.draft.entityId).toBe(1849)
    expect(result.draft.diff).toBeDefined()
    // regulatoryStance moved Light-touch → Moderate per mockHaikuOk
    expect(result.draft.diff.regulatoryStance).toEqual({ before: 'Light-touch', after: 'Moderate' })
    // agiTimeline moved 10-25 years → 5-10 years
    expect(result.draft.diff.agiTimeline).toEqual({ before: '10-25 years', after: '5-10 years' })
    // aiRiskLevel unchanged, should NOT appear in the diff
    expect(result.draft.diff.aiRiskLevel).toBeUndefined()
  })

  it('throws a clear error when entityId is missing in reverify mode', async () => {
    await expect(research({ name: 'Anyone', entityType: 'person', mode: 'reverify' })).rejects.toThrow(/entity-id/)
  })

  it('throws when the reverify entity id is not found', async () => {
    ;(lib.getEntityById as unknown as Fn).mockResolvedValue(null)
    await expect(research({ name: 'Anyone', entityType: 'person', mode: 'reverify', entityId: 99999 })).rejects.toThrow(
      /no entity found/,
    )
  })
})

describe('research — classifier error surfacing', () => {
  it('re-raises Haiku parse errors with context', async () => {
    mockExaFetchOk()
    ;(lib.classifyEntity as unknown as Fn).mockRejectedValue(new Error('Haiku classifier returned unparsable JSON'))

    await expect(research({ name: 'Test Person', entityType: 'person' })).rejects.toThrow(
      /Classifier failed for person "Test Person": Haiku classifier returned unparsable JSON/,
    )
  })
})

describe('research — adjacent hints', () => {
  it('extracts proper-noun candidates from reasoning and filters out DB hits', async () => {
    mockExaFetchOk()
    mockHaikuOk('The evidence mentions Partner Lab and Example Org as collaborators.')
    // Partner Lab has no DB hit (empty default); Example Org already exists.
    ;(lib.searchEntitiesByName as unknown as Fn).mockImplementation(async (name: string) => {
      if (name === 'Example Org') {
        return [{ id: 42, entity_type: 'organization', name: 'Example Org' }]
      }
      return []
    })

    const result = await research({ name: 'Stephen Clare', entityType: 'person' })

    const hintNames = result.adjacentHints.map((h: { name: string }) => h.name)
    expect(hintNames).toContain('Partner Lab')
    expect(hintNames).not.toContain('Example Org')
    expect(result.adjacentHints.length).toBeLessThanOrEqual(5)
  })
})

describe('research — integration with buildSubmitPayload', () => {
  it('produces a draft that buildSubmitPayload accepts without throwing', async () => {
    mockExaFetchOk()
    mockHaikuOk()
    const { draft } = await research({ name: 'Test Person', entityType: 'person' })
    const payload = buildSubmitPayload(draft)
    expect(payload.type).toBe('person')
    expect(payload.data.name).toBe('Test Person')
    expect(payload.data.regulatoryStance).toBe('Moderate')
    // notesSources is serialised to a JSON string by buildSubmitPayload
    expect(typeof payload.data.notesSources).toBe('string')
    const parsed = JSON.parse(payload.data.notesSources as string)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBeGreaterThan(0)
  })
})
