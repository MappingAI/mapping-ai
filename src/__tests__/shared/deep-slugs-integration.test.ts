import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { toFrontendShape } from '../../../api/export-map'
import type { DbEntityRow } from '../../shared/db-types'

const ROOT = resolve(__dirname, '../../..')
function readProjectFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8')
}
import type { Entity } from '../../types/entity'

function baseEntityRow(overrides: Record<string, unknown> = {}): DbEntityRow & Record<string, unknown> {
  return {
    id: 1,
    entity_type: 'person',
    name: 'Test Person',
    title: 'Test Title',
    category: 'Researcher',
    other_categories: null,
    primary_org: null,
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
    topic_tags: null,
    format_tags: null,
    advocated_stance: null,
    advocated_timeline: null,
    advocated_risk: null,
    location: null,
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
    slug: null,
    submission_count: 1,
    status: 'approved' as const,
    qa_approved: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as DbEntityRow & Record<string, unknown>
}

describe('slug field in data pipeline', () => {
  it('includes slug in frontend entity shape', () => {
    const shaped = toFrontendShape(baseEntityRow({ slug: 'test-person' }))
    expect(shaped.slug).toBe('test-person')
  })

  it('passes null slug through correctly', () => {
    const shaped = toFrontendShape(baseEntityRow({ slug: null }))
    expect(shaped.slug).toBeNull()
  })

  it('does not strip slug as sensitive field', () => {
    const shaped = toFrontendShape(baseEntityRow({ slug: 'dario-amodei' }))
    expect(shaped).toHaveProperty('slug')
    expect(shaped.slug).toBe('dario-amodei')
  })

  it('slug does not affect any other field mapping', () => {
    const withSlug = toFrontendShape(baseEntityRow({ slug: 'test', belief_regulatory_stance: 'Moderate' }))
    const withoutSlug = toFrontendShape(baseEntityRow({ slug: null, belief_regulatory_stance: 'Moderate' }))

    expect(withSlug.regulatory_stance).toBe('Moderate')
    expect(withoutSlug.regulatory_stance).toBe('Moderate')
    expect(withSlug.name).toBe(withoutSlug.name)
    expect(withSlug.category).toBe(withoutSlug.category)
    expect(withSlug.id).toBe(withoutSlug.id)
  })
})

describe('Entity type includes slug field', () => {
  it('Entity interface includes slug as string | null', () => {
    const entity: Entity = {
      id: 1,
      entity_type: 'person',
      name: 'Test',
      slug: 'test',
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
    }
    expect(entity.slug).toBe('test')
  })

  it('Entity with null slug is valid', () => {
    const entity: Entity = {
      id: 1,
      entity_type: 'person',
      name: 'Test',
      slug: null,
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
    }
    expect(entity.slug).toBeNull()
  })
})

describe('data source verification', () => {
  it('engine.js fetches from /data/ path (R2 in prod, proxy in dev)', async () => {
    const engineSource = readProjectFile('src/map/engine.js')

    expect(engineSource).toContain("fetch('/data/map-data.json')")
    expect(engineSource).toContain("fetch('/data/map-detail.json')")
    expect(engineSource).toContain("fetch('/data/claims-detail.json')")
    expect(engineSource).toContain("fetch('/data/edge-evidence.json')")

    expect(engineSource).not.toContain('s3.amazonaws.com')
    // cloudfront.net exists as a logo CDN fallback, not for data fetching
    expect(engineSource).not.toMatch(/fetch\([^)]*cloudfront/)
  })

  it('vite dev server proxies /data/ to mapping-ai.org', async () => {
    const viteConfig = readProjectFile('vite.config.ts')

    expect(viteConfig).toContain("'/data'")
    expect(viteConfig).toContain('https://mapping-ai.org')
  })
})

describe('_redirects file for Cloudflare Pages', () => {
  it('has rewrite rules for all entity types', async () => {
    const redirects = readProjectFile('public/_redirects')

    expect(redirects).toContain('/map/person/* /map 200')
    expect(redirects).toContain('/map/org/* /map 200')
    expect(redirects).toContain('/map/resource/* /map 200')
    expect(redirects).toContain('/map/edge/* /map 200')
    expect(redirects).toContain('/map/belief/* /map 200')
  })
})

describe('vite dev server slug rewrite middleware', () => {
  it('vite config includes mapSlugRewrite plugin for all slug types', async () => {
    const viteConfig = readProjectFile('vite.config.ts')

    expect(viteConfig).toContain('mapSlugRewrite')
    expect(viteConfig).toContain('edge|belief')
    expect(viteConfig).toContain("req.url = '/map.html'")
  })
})

describe('engine.js slug integration', () => {
  it('engine has slug-based deep link resolution for entities, edges, and beliefs', async () => {
    const engine = readProjectFile('src/map/engine.js')

    expect(engine).toContain('slugMap')
    expect(engine).toContain('idMap')
    expect(engine).toContain('_edgeId')
    expect(engine).toContain('d.slug')
    expect(engine).toContain('_edgeId')
    expect(engine).toContain('_beliefSlug')
    expect(engine).toContain('getEdgeDeepLinkUrl')
  })

  it('engine has download button handler', async () => {
    const engine = readProjectFile('src/map/engine.js')

    expect(engine).toContain('download-map')
    expect(engine).toContain('downloadBlob')
    expect(engine).toContain('buildDownloadFilename')
    expect(engine).toContain('canvas.toBlob')
  })

  it('engine has crossOrigin on all image loads', async () => {
    const engine = readProjectFile('src/map/engine.js')

    const imageBlocks = engine.split('new Image()')
    for (let i = 1; i < imageBlocks.length; i++) {
      const afterNew = imageBlocks[i]!.slice(0, 200)
      expect(afterNew).toContain("img.crossOrigin = 'anonymous'")
    }
  })

  it('engine exports navigateToEntity on window.__mapEngine', async () => {
    const engine = readProjectFile('src/map/engine.js')

    expect(engine).toContain('navigateToEntity')
    expect(engine).toContain('window.__mapEngine')
  })

  it('engine has switchToNetworkView for cross-view navigation', async () => {
    const engine = readProjectFile('src/map/engine.js')

    expect(engine).toContain('switchToNetworkView')
    expect(engine).toContain("viewMode === 'plot'")
  })

  it('engine has formerly_affiliated edge type', async () => {
    const engine = readProjectFile('src/map/engine.js')

    expect(engine).toContain('formerly_affiliated')
  })
})

describe('main features preserved', () => {
  it('map App.tsx has download button element', async () => {
    const app = readProjectFile('src/map/App.tsx')

    expect(app).toContain('download-map')
    expect(app).toContain('Download as PNG')
  })

  it('map App.tsx preserves beliefs view', async () => {
    const app = readProjectFile('src/map/App.tsx')

    expect(app).toContain('DefinitionsView')
    expect(app).toContain('Beliefs')
    expect(app).toContain('beliefsMapRef')
  })

  it('map App.tsx preserves onboarding overlay', async () => {
    const app = readProjectFile('src/map/App.tsx')

    expect(app).toContain('onboarding-overlay')
    expect(app).toContain('Welcome to the AI Policy Map')
    expect(app).toContain('Got it')
  })

  it('map App.tsx preserves mobile banner', async () => {
    const app = readProjectFile('src/map/App.tsx')

    expect(app).toContain('mobile-banner')
    expect(app).toContain('Browse the directory below')
  })

  it('map App.tsx preserves contribute panel', async () => {
    const app = readProjectFile('src/map/App.tsx')

    expect(app).toContain('contribute-panel')
    expect(app).toContain('Add to map')
  })

  it('map App.tsx preserves adjacent tools', async () => {
    const app = readProjectFile('src/map/App.tsx')

    expect(app).toContain('Adjacent tools')
    expect(app).toContain('AI Safety Field Map')
  })

  it('map App.tsx preserves data disclaimer', async () => {
    const app = readProjectFile('src/map/App.tsx')

    expect(app).toContain('Data is sourced from public records')
    expect(app).toContain('info@mapping-ai.org')
  })

  it('insights page has AGI Definitions as first section', async () => {
    const insights = readProjectFile('src/insights/App.tsx')

    const agiDefPos =
      insights.indexOf("id='agi-definitions'") !== -1
        ? insights.indexOf("id='agi-definitions'")
        : insights.indexOf('id="agi-definitions"') !== -1
          ? insights.indexOf('id="agi-definitions"')
          : insights.indexOf('id="agi-definitions"')
    const beliefPos =
      insights.indexOf("id='belief-space'") !== -1
        ? insights.indexOf("id='belief-space'")
        : insights.indexOf('id="belief-space"') !== -1
          ? insights.indexOf('id="belief-space"')
          : insights.indexOf('id="belief-space"')

    expect(agiDefPos).toBeGreaterThan(-1)
    expect(beliefPos).toBeGreaterThan(-1)
    expect(agiDefPos).toBeLessThan(beliefPos)
  })

  it('insights page does not have broken SVG download', async () => {
    const insights = readProjectFile('src/insights/App.tsx')

    expect(insights).not.toContain('downloadChartAsSvg')
  })
})

describe('DB migration is additive-only', () => {
  it('uses ADD COLUMN IF NOT EXISTS for slug', async () => {
    const migrate = readProjectFile('scripts/migrate.js')

    expect(migrate).toContain('ALTER TABLE entity ADD COLUMN IF NOT EXISTS slug VARCHAR(250)')
    expect(migrate).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_slug')
    expect(migrate).not.toContain('DROP COLUMN')
    expect(migrate).not.toContain('ALTER COLUMN slug')
  })
})
