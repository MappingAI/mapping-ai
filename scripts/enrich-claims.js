/**
 * Claims enrichment — production version
 *
 * Queries prod DB for entities with belief_evidence_source = 'Explicitly stated',
 * searches Exa for primary sources, extracts claims via Claude with verbatim
 * citations, and writes to the Neon claims-pilot branch.
 *
 * Usage:
 *   PILOT_DB="postgresql://..." node scripts/enrich-claims.js --limit=20
 *   PILOT_DB="postgresql://..." node scripts/enrich-claims.js --limit=20 --resume
 *   PILOT_DB="postgresql://..." node scripts/enrich-claims.js --all
 *   PILOT_DB="postgresql://..." node scripts/enrich-claims.js --id=8
 *   PILOT_DB="postgresql://..." node scripts/enrich-claims.js --dry-run --limit=5
 *
 * Flags:
 *   --limit=N    Process N entities then stop (for cost evaluation)
 *   --all        Process all 'Explicitly stated' entities (~741, ~$61)
 *   --id=N       Single entity by ID
 *   --resume     Skip entities already processed (tracked in progress file)
 *   --dry-run    Search + extract but don't write to DB
 *   --type=person|organization  Filter to one entity type
 */
import 'dotenv/config'
import Exa from 'exa-js'
import Anthropic from '@anthropic-ai/sdk'
import pg from 'pg'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const exa = new Exa(process.env.EXA_API_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const prodDb = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const claimsDb = new pg.Pool({ connectionString: process.env.PILOT_DB, ssl: { rejectUnauthorized: false } })

const args = process.argv.slice(2)
const limitArg = args.find((a) => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null
const allMode = args.includes('--all')
const resumeMode = args.includes('--resume')
const dryRun = args.includes('--dry-run')
const singleId = args.find((a) => a.startsWith('--id='))?.split('=')[1]
const typeFilter = args.find((a) => a.startsWith('--type='))?.split('=')[1]
const missingStance = args.includes('--missing-stance')

if (!limit && !allMode && !singleId) {
  console.log(
    'Usage: PILOT_DB="..." node scripts/enrich-claims.js [--limit=N | --all | --id=N] [--resume] [--dry-run] [--type=person|organization] [--missing-stance]',
  )
  process.exit(0)
}

const PROGRESS_PATH = path.join(__dirname, '../data/claims-enrichment-progress.json')

const costs = {
  exa_searches: 0,
  exa_cost: 0,
  claude_calls: 0,
  claude_input_tokens: 0,
  claude_output_tokens: 0,
  claude_cost: 0,
  trackExa() {
    this.exa_searches++
    this.exa_cost = this.exa_searches * 0.008
  },
  trackClaude(usage) {
    this.claude_calls++
    this.claude_input_tokens += usage.input_tokens || 0
    this.claude_output_tokens += usage.output_tokens || 0
    this.claude_cost = (this.claude_input_tokens / 1_000_000) * 3 + (this.claude_output_tokens / 1_000_000) * 15
  },
  summary() {
    const total = this.exa_cost + this.claude_cost
    const perEntity = total / Math.max(this.claude_calls, 1)
    return (
      `Exa: ${this.exa_searches} searches ($${this.exa_cost.toFixed(3)}) | ` +
      `Claude: ${this.claude_calls} calls, ${this.claude_input_tokens} in / ${this.claude_output_tokens} out ($${this.claude_cost.toFixed(3)}) | ` +
      `Total: $${total.toFixed(3)} ($${perEntity.toFixed(3)}/entity)`
    )
  },
}

const BELIEF_DIMENSIONS = [
  {
    id: 'regulatory_stance',
    label: 'Regulatory stance on AI',
    scale: 'Accelerate (1) → Light-touch (2) → Targeted (3) → Moderate (4) → Restrictive (5) → Precautionary (6)',
    person_query: (name) => `"${name}" AI regulation stance policy position statement interview`,
    org_query: (name) => `"${name}" AI regulation policy position advocacy`,
  },
  {
    id: 'agi_timeline',
    label: 'AGI timeline belief',
    scale: 'Already here → 2-3 years → 5-10 years → 10-25 years → 25+ years → Never/not meaningful',
    person_query: (name) => `"${name}" AGI timeline when artificial general intelligence prediction years`,
    org_query: (name) => `"${name}" AGI timeline artificial general intelligence prediction`,
  },
  {
    id: 'ai_risk_level',
    label: 'AI risk level assessment',
    scale: 'Overstated → Manageable → Serious → Catastrophic → Existential',
    person_query: (name) => `"${name}" AI risk existential catastrophic danger safety level assessment`,
    org_query: (name) => `"${name}" AI risk existential safety danger assessment`,
  },
  {
    id: 'agi_definition',
    label: 'How they define AGI',
    scale: 'N/A — captures the definition used, not a stance score',
    person_query: (name) => `"${name}" definition of AGI "artificial general intelligence" meaning what is`,
    org_query: (name) => `"${name}" definition AGI artificial general intelligence meaning`,
  },
]

const EXTRACTION_PROMPT = `You are extracting sourced claims about an entity's beliefs on AI from web search results.

For each belief dimension below, determine if the search results contain DIRECT evidence of this entity's position. Only extract claims where you find DIRECT evidence (a quote, a published position, a public statement).

BELIEF DIMENSIONS:
${BELIEF_DIMENSIONS.map((d) => `- ${d.id}: "${d.label}" (scale: ${d.scale})`).join('\n')}

RULES:
1. Every claim MUST have a source_url from the search results. Never fabricate URLs.
2. Every claim MUST have a citation — a VERBATIM quote (1-2 sentences) from the source.
3. Only create claims where you find direct evidence. Empty arrays are expected and fine.
4. For agi_definition claims: the citation should be how they define AGI. Set stance_score to null. Use definition_used for their definition in normalized form.
5. For other dimensions: set stance_score using the scale provided.
6. date_stated should be YYYY-MM-DD (first of month if only month/year known).
7. claim_type: direct_statement (quote from the entity), authored_position (org published a position), inferred_from_action (co-sponsored a bill, joined coalition), or resource_content (extracted from the resource itself).
8. confidence: high = direct unambiguous statement. medium = clear position but not on exact mechanism. low = inferred.
9. For source_type use: hearing, bill, tweet, op_ed, interview, press_release, floor_speech, letter, report, paper, blog, podcast, video.

Return a JSON array of claim objects (may be empty):
{
  "belief_dimension": "<dimension id>",
  "stance": "<text label from scale, or null for agi_definition>",
  "stance_score": <integer or null>,
  "stance_label": "<short label>",
  "definition_used": "<how they defined the key term, one sentence — especially important for AGI>",
  "citation": "<VERBATIM quote from source, 1-2 sentences>",
  "source_url": "<exact URL from search results>",
  "source_type": "<type>",
  "source_title": "<human-readable title>",
  "source_author": "<author if available, or null>",
  "source_published": "<YYYY-MM-DD>",
  "date_stated": "<YYYY-MM-DD when entity made this statement>",
  "claim_type": "<direct_statement|authored_position|inferred_from_action|resource_content>",
  "confidence": "<high|medium|low>",
  "notes": "<context or null>"
}

Return ONLY the JSON array.`

function srcId(url) {
  return 'src-' + crypto.createHash('sha256').update(url).digest('hex').slice(0, 12)
}

function makeClaimId(entityId, dimension, sourceId) {
  return `${entityId}_${dimension}_${sourceId}`
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'))
  } catch {
    return { completed: [] }
  }
}

function saveProgress(progress) {
  const dir = path.dirname(PROGRESS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2) + '\n')
}

async function getTargetEntities(resumeSet) {
  const selectCols = `id, entity_type, name, category, website, resource_url,
           belief_regulatory_stance, belief_agi_timeline, belief_ai_risk,
           belief_evidence_source, belief_regulatory_stance_detail`
  let query
  const params = []

  if (singleId) {
    query = `SELECT ${selectCols} FROM entity WHERE id = $1`
    params.push(parseInt(singleId))
  } else if (missingStance) {
    // Target entities missing any stance dimension (people + orgs only)
    query = `SELECT ${selectCols} FROM entity
      WHERE status = 'approved'
        AND entity_type IN ('person', 'organization')
        AND (belief_regulatory_stance IS NULL OR belief_agi_timeline IS NULL OR belief_ai_risk IS NULL)`
    if (typeFilter) {
      query += ` AND entity_type = $1`
      params.push(typeFilter)
    }
  } else {
    query = `SELECT ${selectCols} FROM entity
      WHERE status = 'approved' AND belief_evidence_source = 'Explicitly stated'`
    if (typeFilter) {
      query += ` AND entity_type = $1`
      params.push(typeFilter)
    }
  }

  query += ' ORDER BY entity_type, name'
  const r = await prodDb.query(query, params)

  let entities = r.rows.map((row) => ({
    id: row.id,
    type: row.entity_type,
    name: row.name,
    category: row.category,
    website: row.website || row.resource_url,
    beliefs: {
      regulatory_stance: row.belief_regulatory_stance,
      agi_timeline: row.belief_agi_timeline,
      ai_risk: row.belief_ai_risk,
      evidence_source: row.belief_evidence_source,
      detail: row.belief_regulatory_stance_detail,
    },
  }))

  if (resumeMode) {
    entities = entities.filter((e) => !resumeSet.has(e.id))
  }

  if (limit) {
    entities = entities.slice(0, limit)
  }

  return entities
}

async function searchEntity(entity) {
  const results = []
  for (const dim of BELIEF_DIMENSIONS) {
    const queryFn = entity.type === 'organization' ? dim.org_query : dim.person_query
    try {
      const r = await exa.searchAndContents(queryFn(entity.name), {
        numResults: 4,
        highlights: { numSentences: 5, highlightsPerUrl: 3 },
        startPublishedDate: '2023-01-01',
      })
      costs.trackExa()
      for (const result of r.results || []) {
        results.push({
          url: result.url,
          title: result.title || '',
          published: result.publishedDate || '',
          highlights: (result.highlights || []).join(' … '),
          dimension: dim.id,
        })
      }
    } catch (err) {
      console.error(`    Exa error for ${entity.name} / ${dim.id}: ${err.message}`)
    }
    await delay(150)
  }
  return results
}

async function extractClaims(entity, searchResults) {
  if (searchResults.length === 0) return []

  const sourcesText = searchResults
    .map(
      (r, i) =>
        `[Source ${i + 1}] ${r.url}\n  Title: ${r.title}\n  Published: ${r.published}\n  Dimension: ${r.dimension}\n  Highlights: ${r.highlights}`,
    )
    .join('\n\n')

  const prompt = `Entity: ${entity.name}\nType: ${entity.type}\nCategory: ${entity.category || 'N/A'}\n\nSEARCH RESULTS:\n${sourcesText}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: EXTRACTION_PROMPT + '\n\n' + prompt }],
    })
    costs.trackClaude(response.usage || {})
    const text = response.content[0]?.text || '[]'
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    return JSON.parse(jsonMatch[0]).filter((c) => c.source_url && c.citation && c.belief_dimension)
  } catch (err) {
    console.error(`    Claude error: ${err.message}`)
    return []
  }
}

async function registerSource(client, claim) {
  const sid = srcId(claim.source_url)
  await client.query(
    `INSERT INTO source (source_id, url, title, source_type, date_published, author, cached_excerpt)
     VALUES ($1, $2, $3, $4, $5::date, $6, $7)
     ON CONFLICT (source_id) DO NOTHING`,
    [
      sid,
      claim.source_url,
      claim.source_title || null,
      claim.source_type || null,
      claim.source_published || null,
      claim.source_author || null,
      claim.citation,
    ],
  )
  return sid
}

async function writeClaim(client, entity, claim, sid) {
  const cid = makeClaimId(entity.id, claim.belief_dimension, sid)
  await client.query(
    `INSERT INTO claim (claim_id, entity_id, entity_name, entity_type, belief_dimension,
       stance, stance_score, stance_label, definition_used, citation,
       source_id, date_stated, claim_type, confidence, extracted_by, extraction_model, extraction_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::date, $13, $14, $15, $16, CURRENT_DATE)
     ON CONFLICT (claim_id) DO UPDATE SET
       citation = EXCLUDED.citation, stance = EXCLUDED.stance, stance_score = EXCLUDED.stance_score,
       confidence = EXCLUDED.confidence, extraction_date = CURRENT_DATE`,
    [
      cid,
      entity.id,
      entity.name,
      entity.type,
      claim.belief_dimension,
      claim.stance || null,
      claim.stance_score ?? null,
      claim.stance_label || null,
      claim.definition_used || null,
      claim.citation,
      sid,
      claim.date_stated || null,
      claim.claim_type || 'direct_statement',
      claim.confidence || 'medium',
      'exa+claude',
      'claude-sonnet-4-20250514',
    ],
  )
}

async function writeUnsourcedFallback(client, entity) {
  const UNSOURCED_SRC_ID = 'src-crowdsourced-db'
  await client.query(
    `INSERT INTO source (source_id, url, title, source_type)
     VALUES ($1, $2, $3, $4) ON CONFLICT (source_id) DO NOTHING`,
    [UNSOURCED_SRC_ID, 'https://mapping-ai.org/contribute', 'Mapping AI crowdsourced submission', 'crowdsourced'],
  )

  const existing = await client.query(`SELECT belief_dimension FROM claim WHERE entity_id = $1`, [entity.id])
  const coveredDims = new Set(existing.rows.map((r) => r.belief_dimension))

  const b = entity.beliefs
  const fallbacks = [
    { dim: 'regulatory_stance', value: b.regulatory_stance, detail: b.detail },
    { dim: 'agi_timeline', value: b.agi_timeline, detail: null },
    { dim: 'ai_risk_level', value: b.ai_risk, detail: null },
  ]
  let count = 0
  for (const fb of fallbacks) {
    if (fb.value && !coveredDims.has(fb.dim)) {
      const cid = makeClaimId(entity.id, fb.dim, UNSOURCED_SRC_ID)
      await client.query(
        `INSERT INTO claim (claim_id, entity_id, entity_name, entity_type, belief_dimension,
           stance, stance_label, citation, source_id, claim_type, confidence, extracted_by, extraction_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_DATE)
         ON CONFLICT (claim_id) DO NOTHING`,
        [
          cid,
          entity.id,
          entity.name,
          entity.type,
          fb.dim,
          fb.value,
          fb.value,
          fb.detail || `Submitted as "${fb.value}" via crowdsourced form (evidence: ${b.evidence_source || 'unknown'})`,
          UNSOURCED_SRC_ID,
          'crowdsourced_submission',
          b.evidence_source === 'Explicitly stated' ? 'unverified' : 'low',
          'db_fallback',
        ],
      )
      count++
      console.log(`    ${fb.dim}: ${fb.value} [unsourced fallback]`)
    }
  }
  return count
}

async function main() {
  console.log('CLAIMS ENRICHMENT')
  console.log('=================')

  const progress = loadProgress()
  const resumeSet = new Set(progress.completed)
  const entities = await getTargetEntities(resumeSet)

  const targetLabel = missingStance ? 'missing stance dimensions' : "belief_evidence_source = 'Explicitly stated'"
  console.log(`Targets: ${entities.length} entities (${targetLabel})`)
  if (typeFilter) console.log(`Type filter: ${typeFilter}`)
  if (resumeMode) console.log(`Resuming: ${resumeSet.size} already completed`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log()

  const client = dryRun ? null : await claimsDb.connect()
  let totalSourced = 0
  let totalFallback = 0
  let processed = 0

  try {
    for (const entity of entities) {
      processed++
      console.log(`\n[${processed}/${entities.length}] ▸ ${entity.name} (${entity.type}, id=${entity.id})`)

      if (entity.type === 'resource' && entity.website) {
        if (client) {
          const sid = srcId(entity.website)
          await client.query(
            `INSERT INTO source (source_id, url, title, source_type, resource_entity_id)
             VALUES ($1, $2, $3, 'report', $4)
             ON CONFLICT (source_id) DO UPDATE SET resource_entity_id = $4`,
            [sid, entity.website, entity.name, entity.id],
          )
          console.log(`  Registered resource URL as source [${sid}]`)
        }
        progress.completed.push(entity.id)
        saveProgress(progress)
        continue
      }

      const results = await searchEntity(entity)
      console.log(`  Exa: ${results.length} results across ${BELIEF_DIMENSIONS.length} dimensions`)

      let claims = []
      if (results.length > 0) {
        claims = await extractClaims(entity, results)
        console.log(`  Claude: ${claims.length} claims extracted`)

        if (client) {
          for (const c of claims) {
            const sid = await registerSource(client, c)
            await writeClaim(client, entity, c, sid)
            totalSourced++
            const dimLabel = c.belief_dimension === 'agi_definition' ? 'AGI def' : c.belief_dimension
            console.log(
              `    ${dimLabel}: ${c.stance_label || c.definition_used?.slice(0, 40) || '?'} [${c.confidence}] ${sid}`,
            )
          }
        }
        await delay(100)
      } else {
        console.log('  Exa: 0 results')
      }

      if (client) {
        totalFallback += await writeUnsourcedFallback(client, entity)
      }

      progress.completed.push(entity.id)
      saveProgress(progress)

      if (processed % 10 === 0) {
        console.log(`\n  --- Progress: ${processed}/${entities.length} | ${costs.summary()} ---`)
      }
    }
  } finally {
    if (client) client.release()
  }

  console.log('\n=================')
  console.log(`Processed: ${processed} entities`)
  console.log(`Sourced claims: ${totalSourced}`)
  console.log(`Unsourced fallbacks: ${totalFallback}`)

  if (!dryRun) {
    const r1 = await claimsDb.query('SELECT count(*) FROM source')
    const r2 = await claimsDb.query('SELECT count(*) FROM claim')
    const r3 = await claimsDb.query(`SELECT count(*) FROM claim WHERE extracted_by = 'exa+claude'`)
    const r4 = await claimsDb.query(`SELECT count(*) FROM claim WHERE extracted_by = 'db_fallback'`)
    console.log(
      `DB totals: ${r1.rows[0].count} sources, ${r2.rows[0].count} claims (${r3.rows[0].count} sourced, ${r4.rows[0].count} fallback)`,
    )
  }
  console.log(`\nCOST: ${costs.summary()}`)

  await claimsDb.end()
  await prodDb.end()
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
