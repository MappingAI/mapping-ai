/**
 * Tests for scripts/enrich/validate.js + submit.js — Unit 4 of the plan.
 *
 * Covers:
 *   - Happy path: valid draft → no errors; submit dry-run returns payload.
 *   - Edge: unknown enum / missing name / out-of-range confidence → error.
 *   - Edge: agiTimeline claim missing definition or quote → WARNING.
 *   - Error: /submit 429 → submit surfaces error, never calls /admin.
 *   - Error: /submit OK but /admin fails → orphaned submissionId returned.
 *   - Error: destructive action without --confirm → throws.
 *   - Integration: research({...}).draft → validate → submit dry-run →
 *     buildSubmitPayload accepts the payload.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the lib barrel BEFORE importing submit.js so we can stub
// classifyEntity etc. for the integration test, and keep live fetch calls
// out of submit()'s path.
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

// @ts-expect-error — scripts are plain JS
import { validate } from '../../../scripts/enrich/validate.js'
// @ts-expect-error — scripts are plain JS
import { submit } from '../../../scripts/enrich/submit.js'
// @ts-expect-error — scripts are plain JS
import * as lib from '../../../scripts/enrich/lib/index.js'
// @ts-expect-error — scripts are plain JS
import { buildSubmitPayload } from '../../../scripts/enrich/lib/api.js'
// @ts-expect-error — scripts are plain JS
import { research } from '../../../scripts/enrich/research.js'

type Fn = ReturnType<typeof vi.fn>

const ORIGINAL_ENV = { ...process.env }

function baseDraft(overrides: Record<string, unknown> = {}) {
  return {
    type: 'person',
    name: 'Test Person',
    category: 'Researcher',
    regulatoryStance: 'Moderate',
    agiTimeline: '5-10 years',
    aiRiskLevel: 'Serious',
    evidenceSource: 'Explicitly stated',
    submitterRelationship: 'external',
    notesConfidence: 4,
    notesHtml: '<p>Notes body.</p>',
    notesSources: [
      {
        url: 'https://example.com/a',
        snippet: 'Evidence A.',
        retrieved_at: '2026-04-20T00:00:00.000Z',
        retriever: 'exa',
      },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env = {
    ...ORIGINAL_ENV,
    CONTRIBUTOR_KEY: 'mak_0123456789abcdef0123456789abcdef',
    ADMIN_KEY: 'test-admin-key',
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
  process.env = { ...ORIGINAL_ENV }
})

// ---------------------------------------------------------------------------
// validate.js
// ---------------------------------------------------------------------------

describe('validate — happy path', () => {
  it('returns valid=true and no errors for a complete draft', () => {
    const result = validate(baseDraft())
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('tolerates nullable enums', () => {
    const draft = baseDraft({ regulatoryStance: null, agiTimeline: null })
    const result = validate(draft)
    expect(result.valid).toBe(true)
  })
})

describe('validate — enum errors', () => {
  it('rejects unknown regulatoryStance with field name + allowed values', () => {
    const result = validate(baseDraft({ regulatoryStance: 'Ultralight' }))
    expect(result.valid).toBe(false)
    const err = result.errors.find((e: { field: string }) => e.field === 'regulatoryStance')
    expect(err).toBeDefined()
    expect(err.allowed).toContain('Moderate')
    expect(err.value).toBe('Ultralight')
  })

  it('rejects unknown agiTimeline', () => {
    const result = validate(baseDraft({ agiTimeline: 'Tomorrow' }))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e: { field: string }) => e.field === 'agiTimeline')).toBe(true)
  })

  it('rejects unknown category for the entity type', () => {
    const result = validate(baseDraft({ category: 'Frontier Lab' })) // org-only category on a person
    expect(result.valid).toBe(false)
    expect(result.errors.some((e: { field: string }) => e.field === 'category')).toBe(true)
  })
})

describe('validate — confidence + name', () => {
  it('rejects notesConfidence: 0', () => {
    const result = validate(baseDraft({ notesConfidence: 0 }))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e: { field: string }) => e.field === 'notesConfidence')).toBe(true)
  })

  it('rejects notesConfidence: 6', () => {
    const result = validate(baseDraft({ notesConfidence: 6 }))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e: { field: string }) => e.field === 'notesConfidence')).toBe(true)
  })

  it('accepts notesConfidence in [1,5]', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const result = validate(baseDraft({ notesConfidence: n }))
      expect(result.valid).toBe(true)
    }
  })

  it('rejects missing name on a person draft', () => {
    const result = validate(baseDraft({ name: '' }))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e: { field: string }) => e.field === 'name')).toBe(true)
  })

  it('accepts a resource with title but no name', () => {
    const result = validate({
      type: 'resource',
      title: 'Some Report',
      category: 'Report',
    })
    expect(result.valid).toBe(true)
  })

  it('rejects a resource with neither title nor name', () => {
    const result = validate({ type: 'resource' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e: { field: string }) => e.field === 'title')).toBe(true)
  })
})

describe('validate — notesSources shape', () => {
  it('rejects notesSources entry missing url', () => {
    const result = validate(
      baseDraft({
        notesSources: [{ retrieved_at: '2026-04-20T00:00:00.000Z', retriever: 'exa' }],
      }),
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e: { field: string }) => e.field.startsWith('notesSources[0].url'))).toBe(true)
  })

  it('rejects notesSources entry missing retrieved_at', () => {
    const result = validate(
      baseDraft({
        notesSources: [{ url: 'https://example.com', retriever: 'exa' }],
      }),
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e: { field: string }) => e.field.startsWith('notesSources[0].retrieved_at'))).toBe(true)
  })

  it('rejects notesSources that is not an array', () => {
    const result = validate(baseDraft({ notesSources: 'not-an-array' }))
    expect(result.valid).toBe(false)
  })
})

describe('validate — per-claim warnings (not errors)', () => {
  it('agiTimeline classification with no definition on any claim → WARNING, still valid', () => {
    const result = validate(
      baseDraft({
        notesSources: [
          {
            url: 'https://example.com/a',
            retrieved_at: '2026-04-20T00:00:00.000Z',
            retriever: 'exa',
            field_name: 'agiTimeline',
            quote: 'Example said AGI is 5-10 years away.',
            // definition: missing on purpose
          },
        ],
      }),
    )
    expect(result.valid).toBe(true)
    expect(result.warnings.some((w: { field: string }) => w.field === 'notesSources[0].definition')).toBe(true)
  })

  it('agiTimeline classification with no quote on any claim → WARNING, still valid', () => {
    const result = validate(
      baseDraft({
        notesSources: [
          {
            url: 'https://example.com/a',
            retrieved_at: '2026-04-20T00:00:00.000Z',
            retriever: 'exa',
            field_name: 'agiTimeline',
            definition: 'economically valuable tasks',
            // quote: missing on purpose
          },
        ],
      }),
    )
    expect(result.valid).toBe(true)
    expect(result.warnings.some((w: { field: string }) => w.field === 'notesSources[0].quote')).toBe(true)
  })

  it('aiRiskLevel claim with no quote → WARNING, still valid', () => {
    const result = validate(
      baseDraft({
        notesSources: [
          {
            url: 'https://example.com/a',
            retrieved_at: '2026-04-20T00:00:00.000Z',
            retriever: 'exa',
            field_name: 'aiRiskLevel',
          },
        ],
      }),
    )
    expect(result.valid).toBe(true)
    expect(result.warnings.some((w: { field: string }) => w.field === 'notesSources[0].quote')).toBe(true)
  })

  it('regulatoryStance claim with no quote → WARNING, still valid', () => {
    const result = validate(
      baseDraft({
        notesSources: [
          {
            url: 'https://example.com/a',
            retrieved_at: '2026-04-20T00:00:00.000Z',
            retriever: 'exa',
            field_name: 'regulatoryStance',
          },
        ],
      }),
    )
    expect(result.valid).toBe(true)
    expect(result.warnings.some((w: { field: string }) => w.field === 'notesSources[0].quote')).toBe(true)
  })
})

describe('validate — top-level shape', () => {
  it('rejects non-object draft', () => {
    const result = validate(null as unknown as object)
    expect(result.valid).toBe(false)
  })

  it('rejects unknown type', () => {
    const result = validate(baseDraft({ type: 'alien' }))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e: { field: string }) => e.field === 'type')).toBe(true)
  })

  it('short-circuits on skipReason with a non-valid result', () => {
    const result = validate({ type: 'person', name: 'x', skipReason: 'duplicate' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e: { field: string }) => e.field === 'skipReason')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// submit.js
// ---------------------------------------------------------------------------

describe('submit — dry run (default)', () => {
  it('returns payload without hitting the network', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await submit(baseDraft())

    expect(result.dryRun).toBe(true)
    expect(result.payload.type).toBe('person')
    expect(result.payload.data.name).toBe('Test Person')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('submit — validation failure blocks writes', () => {
  it('throws with structured errors when draft is invalid', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(submit(baseDraft({ regulatoryStance: 'Ultralight' }))).rejects.toMatchObject({
      message: /Draft failed validation/,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('submit — /submit error surfaces cleanly', () => {
  it('429 rate-limit: error is raised, /admin is never called', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/submit')) {
        return {
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: async () => ({ error: 'rate limit exceeded' }),
        }
      }
      throw new Error('unexpected call to ' + url)
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(submit(baseDraft(), { execute: true })).rejects.toThrow(/429/)

    const urls = fetchMock.mock.calls.map((c: [string]) => c[0])
    expect(urls.some((u: string) => u.endsWith('/submit'))).toBe(true)
    expect(urls.some((u: string) => u.endsWith('/admin'))).toBe(false)
  })
})

describe('submit — orphaned submission on /admin failure', () => {
  it('returns submissionId + approved:false when /admin fails after /submit succeeds', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/submit')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ success: true, submissionId: 424242 }),
        }
      }
      if (url.endsWith('/admin')) {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ error: 'boom' }),
        }
      }
      throw new Error('unexpected call to ' + url)
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await submit(baseDraft(), { execute: true })

    expect(result.submissionId).toBe(424242)
    expect(result.approved).toBe(false)
    expect(result.needsManualApproval).toBe(true)
    expect(result.error).toMatch(/admin/i)

    // /submit must not have been retried after /admin failed.
    const submitCalls = fetchMock.mock.calls.filter((c: [string]) => c[0].endsWith('/submit'))
    expect(submitCalls.length).toBe(1)
  })
})

describe('submit — destructive actions require --confirm', () => {
  it('throws when draft.action=merge and confirm is false', async () => {
    const draft = baseDraft({ action: 'merge' })
    await expect(submit(draft)).rejects.toThrow(/--confirm/)
  })

  it('throws when draft.action=delete and confirm is false', async () => {
    const draft = baseDraft({ action: 'delete' })
    await expect(submit(draft)).rejects.toThrow(/--confirm/)
  })

  it('allows merge when confirm is true (dry-run path)', async () => {
    const draft = baseDraft({ action: 'merge' })
    const result = await submit(draft, { confirm: true })
    expect(result.dryRun).toBe(true)
  })
})

describe('submit — happy path live write', () => {
  it('calls /submit + /admin and returns submissionId + approved:true', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/submit')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, submissionId: 4242 }),
        }
      }
      if (url.endsWith('/admin')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, action: 'approved' }),
        }
      }
      throw new Error('unexpected call to ' + url)
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await submit(baseDraft(), { execute: true })
    expect(result.submissionId).toBe(4242)
    expect(result.approved).toBe(true)
    // entityId is surfaced as null — /admin does not echo it yet.
    expect(result.entityId).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Integration: research → validate → submit dry-run → buildSubmitPayload
// ---------------------------------------------------------------------------

describe('integration — research draft flows through validate + submit', () => {
  it('produces a valid /submit payload end to end', async () => {
    ;(lib.classifyEntity as unknown as Fn).mockResolvedValue({
      category: 'Researcher',
      otherCategories: null,
      regulatoryStance: 'Moderate',
      agiTimeline: '5-10 years',
      aiRiskLevel: 'Serious',
      evidenceSource: 'Explicitly stated',
      threatModels: 'Loss of control',
      confidence: 4,
      reasoning: 'Evidence-backed reasoning.',
      enrichmentVersion: 'enrichment-skill-v1-2026-04-20',
      enumWarnings: null,
      claims: [],
    })
    ;(lib.searchEntitiesByName as unknown as Fn).mockResolvedValue([])
    ;(lib.searchAPI as unknown as Fn).mockResolvedValue({ people: [], organizations: [], resources: [] })
    process.env.EXA_API_KEY = 'test-exa-key'

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        results: [
          {
            url: 'https://example.com/a',
            title: 'A',
            snippet: 'snippet a',
          },
        ],
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { draft } = await research({ name: 'Integration Person', entityType: 'person' })

    const validation = validate(draft)
    expect(validation.valid).toBe(true)

    const submitResult = await submit(draft)
    expect(submitResult.dryRun).toBe(true)

    // Handwritten payload build must agree with submit's.
    const manual = buildSubmitPayload(draft)
    expect(submitResult.payload.type).toBe(manual.type)
    expect(submitResult.payload.data.name).toBe('Integration Person')
    expect(submitResult.payload.data.regulatoryStance).toBe('Moderate')
  })
})
