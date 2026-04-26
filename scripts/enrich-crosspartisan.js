/**
 * Crosspartisan policy-area claim enrichment
 *
 * For each policymaker, searches Exa for per-issue AI policy positions across
 * 6 specific policy areas, then Claude extracts sourced claims with verbatim
 * quotes. Writes to the same Neon source + claim tables as enrich-claims.js.
 *
 * This script produces the data for the horseshoe viz (crosspartisan convergence).
 * It runs independently of enrich-claims.js and can execute concurrently since
 * belief_dimension values don't overlap (policy areas vs general beliefs).
 *
 * Usage:
 *   PILOT_DB="postgresql://..." node scripts/enrich-crosspartisan.js --limit=20
 *   PILOT_DB="postgresql://..." node scripts/enrich-crosspartisan.js --all
 *   PILOT_DB="postgresql://..." node scripts/enrich-crosspartisan.js --id=82
 *   PILOT_DB="postgresql://..." node scripts/enrich-crosspartisan.js --limit=20 --resume
 *   PILOT_DB="postgresql://..." node scripts/enrich-crosspartisan.js --dry-run --limit=5
 *
 * Cost estimate (--all, 120 policymakers × 6 policy areas):
 *   ~$12 based on $0.10/entity from enrich-claims.js benchmarks
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

if (!limit && !allMode && !singleId) {
  console.log(
    'Usage: PILOT_DB="..." node scripts/enrich-crosspartisan.js [--limit=N | --all | --id=N] [--resume] [--dry-run]',
  )
  process.exit(0)
}

const PROGRESS_PATH = path.join(__dirname, '../data/crosspartisan-enrichment-progress.json')
const POLICY_AREAS_PATH = path.join(__dirname, '../src/insights/crosspartisan/data/policy-areas.json')
const POLICY_AREAS = JSON.parse(fs.readFileSync(POLICY_AREAS_PATH, 'utf-8')).policy_areas

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
      `Claude: ${this.claude_calls} calls ($${this.claude_cost.toFixed(3)}) | ` +
      `Total: $${total.toFixed(3)} ($${perEntity.toFixed(3)}/entity)`
    )
  },
}

const SEARCH_QUERIES = {
  state_preemption: (name) => `"${name}" AI federal preemption state regulation California SB 1047 position`,
  open_source_weights: (name) => `"${name}" open source AI open weights Llama frontier model restriction position`,
  compute_governance: (name) => `"${name}" AI compute threshold FLOPs reporting training run executive order`,
  export_controls_chips: (name) => `"${name}" AI chip export controls China BIS semiconductor position`,
  pre_deployment_testing: (name) => `"${name}" AI safety testing pre-deployment evaluation red team AISI NIST`,
  liability: (name) => `"${name}" AI developer liability product liability Section 230 harm`,
}

const EXTRACTION_PROMPT = `You are analyzing web search results about a US policymaker's positions on specific AI policy issues.

For each policy area below, determine if the search results contain evidence of this person's position. Only extract claims where you find DIRECT evidence.

POLICY AREAS:
${POLICY_AREAS.map(
  (a) => `- ${a.id}: "${a.label}"
  Support means: ${a.support_means}
  Oppose means: ${a.oppose_means}`,
).join('\n')}

STANCE SCALE (per policy area):
  -2 = Strongly oppose
  -1 = Oppose / skeptical
   0 = Mixed / conditional / neutral
   1 = Support / sympathetic
   2 = Strongly support

RULES:
1. Every claim MUST have a source_url from the search results. Never fabricate URLs.
2. Every claim MUST include a VERBATIM quote (1-2 sentences) as the citation.
3. Only create a claim if there is real evidence. Empty arrays are fine and expected.
4. date_stated: YYYY-MM-DD (first of month if only month/year available).
5. source_type: hearing, bill, tweet, op_ed, interview, press_release, floor_speech, letter, report, blog, video.
6. confidence: high = unambiguous direct statement on the specific mechanism. medium = clear position but indirect. low = inferred.

Return a JSON array of claim objects (may be empty):
{
  "policy_area": "<id from list above>",
  "stance_score": <integer -2 to 2>,
  "stance_label": "<short human label>",
  "definition_used": "<how they defined the key term, one sentence>",
  "citation": "<VERBATIM quote, ≤2 sentences>",
  "source_url": "<exact URL from search results>",
  "source_type": "<type>",
  "source_title": "<human-readable title>",
  "source_author": "<author or null>",
  "source_published": "<YYYY-MM-DD>",
  "date_stated": "<YYYY-MM-DD>",
  "claim_type": "<direct_statement|authored_position|inferred_from_action>",
  "confidence": "<high|medium|low>",
  "notes": "<context or null>"
}

Return ONLY the JSON array.`

function srcId(url) {
  return 'src-' + crypto.createHash('sha256').update(url).digest('hex').slice(0, 12)
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

async function getPolicymakers(resumeSet) {
  const r = await prodDb.query(`
    SELECT e.id, e.name, e.category, e.entity_type
    FROM entity e
    WHERE e.status = 'approved' AND e.entity_type = 'person' AND e.category = 'Policymaker'
    ORDER BY e.name
  `)

  // Get party affiliations from edges
  const partyR = await prodDb.query(`
    SELECT e.source_id as person_id, p.name as party_name
    FROM edge e
    JOIN entity p ON p.id = e.target_id
    WHERE p.name IN ('Democratic Party', 'Republican Party')
      AND e.edge_type = 'affiliated'
  `)
  const partyMap = new Map()
  for (const row of partyR.rows) {
    partyMap.set(row.person_id, row.party_name === 'Democratic Party' ? 'D' : 'R')
  }

  let entities = r.rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    party: partyMap.get(row.id) || null,
  }))

  if (singleId) {
    entities = entities.filter((e) => e.id === parseInt(singleId))
  }

  if (resumeMode) {
    entities = entities.filter((e) => !resumeSet.has(e.id))
  }

  if (limit) {
    entities = entities.slice(0, limit)
  }

  return entities
}

async function searchPolicyAreas(name) {
  const results = []
  for (const area of POLICY_AREAS) {
    const queryFn = SEARCH_QUERIES[area.id]
    if (!queryFn) continue
    try {
      const r = await exa.searchAndContents(queryFn(name), {
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
          area_id: area.id,
        })
      }
    } catch (err) {
      console.error(`    Exa error ${name} / ${area.id}: ${err.message}`)
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
        `[Source ${i + 1}] ${r.url}\n  Title: ${r.title}\n  Published: ${r.published}\n  Policy area: ${r.area_id}\n  Highlights: ${r.highlights}`,
    )
    .join('\n\n')

  const prompt = `Person: ${entity.name}\nParty: ${entity.party || 'Unknown'}\nCategory: ${entity.category}\n\nSEARCH RESULTS:\n${sourcesText}`

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
    return JSON.parse(jsonMatch[0]).filter((c) => c.source_url && c.citation && c.policy_area)
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
  const cid = `${entity.id}_${claim.policy_area}_${sid}`
  await client.query(
    `INSERT INTO claim (claim_id, entity_id, entity_name, entity_type, belief_dimension,
       stance, stance_score, stance_label, definition_used, citation,
       source_id, date_stated, claim_type, confidence, extracted_by, extraction_model, extraction_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::date, $13, $14, $15, $16, CURRENT_DATE)
     ON CONFLICT (claim_id) DO UPDATE SET
       citation = EXCLUDED.citation, stance_score = EXCLUDED.stance_score,
       confidence = EXCLUDED.confidence, extraction_date = CURRENT_DATE`,
    [
      cid,
      entity.id,
      entity.name,
      'person',
      claim.policy_area,
      claim.stance_label || null,
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

async function main() {
  console.log('CROSSPARTISAN POLICY CLAIMS ENRICHMENT')
  console.log('======================================')

  const progress = loadProgress()
  const resumeSet = new Set(progress.completed)
  const entities = await getPolicymakers(resumeSet)

  console.log(`Targets: ${entities.length} policymakers`)
  console.log(`Policy areas: ${POLICY_AREAS.length}`)
  if (resumeMode) console.log(`Resuming: ${resumeSet.size} already completed`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`)

  const client = dryRun ? null : await claimsDb.connect()
  let totalClaims = 0
  let processed = 0

  try {
    for (const entity of entities) {
      processed++
      console.log(`\n[${processed}/${entities.length}] ▸ ${entity.name} (${entity.party || '?'}, id=${entity.id})`)

      const results = await searchPolicyAreas(entity.name)
      console.log(`  Exa: ${results.length} results across ${POLICY_AREAS.length} areas`)

      if (results.length === 0) {
        console.log('  No results; skipping')
        progress.completed.push(entity.id)
        saveProgress(progress)
        continue
      }

      const claims = await extractClaims(entity, results)
      console.log(`  Claude: ${claims.length} claims extracted`)

      if (client) {
        for (const c of claims) {
          const sid = await registerSource(client, c)
          await writeClaim(client, entity, c, sid)
          totalClaims++
          console.log(`    ${c.policy_area}: ${c.stance_label || '?'} (${c.stance_score}) [${c.confidence}] ${sid}`)
        }
      }

      progress.completed.push(entity.id)
      saveProgress(progress)
      await delay(100)

      if (processed % 10 === 0) {
        console.log(`\n  --- Progress: ${processed}/${entities.length} | ${costs.summary()} ---`)
      }
    }
  } finally {
    if (client) client.release()
  }

  console.log('\n======================================')
  console.log(`Processed: ${processed} policymakers`)
  console.log(`Policy claims: ${totalClaims}`)

  if (!dryRun) {
    const r = await claimsDb.query(
      `SELECT belief_dimension, count(*) as n FROM claim
       WHERE belief_dimension IN ('state_preemption','open_source_weights','compute_governance','export_controls_chips','pre_deployment_testing','liability')
       GROUP BY belief_dimension ORDER BY n DESC`,
    )
    console.log('Claims by policy area:')
    for (const row of r.rows) console.log(`  ${row.belief_dimension}: ${row.n}`)
  }
  console.log(`\nCOST: ${costs.summary()}`)

  await claimsDb.end()
  await prodDb.end()
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
