/**
 * Employer edge enrichment — extract start/end dates
 *
 * Follows Anushree's enrichment patterns.
 *
 * Usage:
 *   PILOT_DB="postgresql://..." node scripts/edge-enrichment/enrich-employer-edges.js --limit=5
 *   PILOT_DB="postgresql://..." node scripts/edge-enrichment/enrich-employer-edges.js --limit=50 --resume
 *   PILOT_DB="postgresql://..." node scripts/edge-enrichment/enrich-employer-edges.js --all
 *   PILOT_DB="postgresql://..." node scripts/edge-enrichment/enrich-employer-edges.js --dry-run --limit=3
 *
 * Flags:
 *   --limit=N    Process N edges then stop
 *   --all        Process all employer edges (~675, ~$19)
 *   --resume     Skip already-processed edges
 *   --dry-run    Search + extract but don't write to DB
 */
import 'dotenv/config'
import Exa from 'exa-js'
import Anthropic from '@anthropic-ai/sdk'
import pg from 'pg'
import { loadProgress, saveProgress, edgeKey } from './lib/progress.js'
import { costs } from './lib/costs.js'
import { srcId, registerSource } from './lib/source.js'

// Clients
const exa = new Exa(process.env.EXA_API_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const rdsDb = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const neonDb = new pg.Pool({ connectionString: process.env.PILOT_DB, ssl: { rejectUnauthorized: false } })

// CLI args
const args = process.argv.slice(2)
const limitArg = args.find((a) => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null
const allMode = args.includes('--all')
const resumeMode = args.includes('--resume')
const dryRun = args.includes('--dry-run')

if (!limit && !allMode) {
  console.log('Usage: PILOT_DB="..." node scripts/edge-enrichment/enrich-employer-edges.js [--limit=N | --all] [--resume] [--dry-run]')
  process.exit(0)
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// Extraction prompt for employment dates
const EXTRACTION_PROMPT = `You are extracting employment/position tenure data from web search results.

TASK: Extract when a person started and/or ended a position at an organization.

RULES:
1. Every field MUST come from the search results. Never fabricate data.
2. Dates as YYYY-MM-DD. Use first of month if only month/year known. Use YYYY-01-01 if only year.
3. If currently employed, end_date should be null.
4. If data not found in results, return null for that field.
5. source_url MUST be from the search results provided.
6. Look for phrases like "joined in", "appointed", "since", "left", "resigned", "departed", "former".

Return a JSON object (or null if no tenure data found):
{
  "start_date": "<YYYY-MM-DD or null>",
  "end_date": "<YYYY-MM-DD or null if current>",
  "role_title": "<job title if found, or null>",
  "is_current": <true|false|null>,
  "source_url": "<URL from search results>",
  "source_title": "<title of source>",
  "source_date": "<YYYY-MM-DD publication date or null>",
  "citation": "<verbatim quote from source supporting the dates, 1-2 sentences>",
  "confidence": "<high|medium|low>"
}

Return ONLY the JSON object or null.`

/**
 * Get employer edges from RDS with entity names resolved
 */
async function getTargetEdges(completedSet) {
  const query = `
    SELECT
      e.id as edge_id,
      e.source_id,
      e.target_id,
      e.edge_type,
      e.role,
      e.evidence,
      src.name as source_name,
      src.entity_type as source_type,
      tgt.name as target_name,
      tgt.entity_type as target_type
    FROM edge e
    JOIN entity src ON e.source_id = src.id
    JOIN entity tgt ON e.target_id = tgt.id
    WHERE e.edge_type = 'employer'
      AND src.status = 'approved'
      AND tgt.status = 'approved'
    ORDER BY e.id
  `
  const result = await rdsDb.query(query)

  let edges = result.rows.map((row) => ({
    edge_id: row.edge_id,
    source_id: row.source_id,
    target_id: row.target_id,
    edge_type: row.edge_type,
    role: row.role,
    evidence: row.evidence,
    source_name: row.source_name,
    source_entity_type: row.source_type,
    target_name: row.target_name,
    target_entity_type: row.target_type,
  }))

  // Filter out already completed
  if (resumeMode) {
    edges = edges.filter((e) => !completedSet.has(edgeKey(e)))
  }

  // Apply limit
  if (limit) {
    edges = edges.slice(0, limit)
  }

  return edges
}

/**
 * Search for employment tenure info via Exa
 */
async function searchTenureData(edge) {
  // Person is source, org is target for employer edges
  const personName = edge.source_name
  const orgName = edge.target_name
  const role = edge.role || ''

  const queries = [
    `"${personName}" "${orgName}" joined appointed hired year`,
    `"${personName}" "${orgName}" ${role} since tenure`,
  ]

  const results = []
  for (const query of queries) {
    try {
      const r = await exa.searchAndContents(query, {
        numResults: 3,
        highlights: { numSentences: 4, highlightsPerUrl: 3 },
        startPublishedDate: '2010-01-01',
      })
      costs.trackExa()

      for (const result of r.results || []) {
        results.push({
          url: result.url,
          title: result.title || '',
          published: result.publishedDate || '',
          highlights: (result.highlights || []).join(' … '),
        })
      }
    } catch (err) {
      console.error(`    Exa error: ${err.message}`)
    }
    await delay(150)
  }

  return results
}

/**
 * Extract tenure data via Claude
 */
async function extractTenureData(edge, searchResults) {
  if (searchResults.length === 0) return null

  const sourcesText = searchResults
    .map(
      (r, i) =>
        `[Source ${i + 1}] ${r.url}\n  Title: ${r.title}\n  Published: ${r.published}\n  Content: ${r.highlights}`
    )
    .join('\n\n')

  const prompt = `PERSON: ${edge.source_name}
ORGANIZATION: ${edge.target_name}
CURRENT ROLE INFO: ${edge.role || 'None'}

SEARCH RESULTS:
${sourcesText}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: EXTRACTION_PROMPT + '\n\n' + prompt }],
    })
    costs.trackClaude(response.usage || {})

    const text = response.content[0]?.text || ''
    if (text.trim().toLowerCase() === 'null') return null

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const data = JSON.parse(jsonMatch[0])
    if (!data.source_url) return null

    return data
  } catch (err) {
    console.error(`    Claude error: ${err.message}`)
    return null
  }
}

/**
 * Write edge evidence to Neon
 */
async function writeEdgeEvidence(client, edge, data) {
  // First register the source
  const sid = await registerSource(client, {
    url: data.source_url,
    title: data.source_title,
    date: data.source_date,
    excerpt: data.citation,
  })

  // Create evidence record
  const evidenceId = `${edge.edge_id}_${sid}`

  await client.query(
    `INSERT INTO edge_evidence (
       evidence_id, edge_id, source_id,
       start_date, end_date,
       amount_usd, amount_note,
       citation, confidence,
       extracted_by, extraction_date
     )
     VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, $9, $10, CURRENT_DATE)
     ON CONFLICT (evidence_id) DO UPDATE SET
       start_date = EXCLUDED.start_date,
       end_date = EXCLUDED.end_date,
       citation = EXCLUDED.citation,
       confidence = EXCLUDED.confidence,
       extraction_date = CURRENT_DATE`,
    [
      evidenceId,
      edge.edge_id,
      sid,
      data.start_date || null,
      data.end_date || null,
      null, // amount_usd not used for employer edges
      data.role_title || null, // reuse amount_note for role
      data.citation || null,
      data.confidence || 'medium',
      'exa+claude',
    ]
  )

  return evidenceId
}

/**
 * Ensure edge_evidence table exists in Neon
 */
async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS edge_evidence (
      evidence_id      TEXT PRIMARY KEY,
      edge_id          INTEGER NOT NULL,
      source_id        TEXT NOT NULL REFERENCES source(source_id),

      start_date       DATE,
      end_date         DATE,

      amount_usd       NUMERIC(15,2),
      amount_note      TEXT,

      citation         TEXT,
      confidence       TEXT,

      extracted_by     TEXT,
      extraction_date  DATE,

      created_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_edge_evidence_edge_id ON edge_evidence(edge_id)
  `)
}

async function main() {
  console.log('EMPLOYER EDGE ENRICHMENT')
  console.log('========================')

  const progress = loadProgress('employer-edges')
  const completedSet = new Set(progress.completed)

  const edges = await getTargetEdges(completedSet)

  console.log(`Targets: ${edges.length} employer edges`)
  if (resumeMode) console.log(`Resuming: ${completedSet.size} already completed`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log()

  const client = dryRun ? null : await neonDb.connect()

  if (client) {
    await ensureSchema(client)
  }

  let enriched = 0
  let noData = 0

  try {
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i]
      console.log(`\n[${i + 1}/${edges.length}] ${edge.source_name} @ ${edge.target_name}`)
      if (edge.role) {
        console.log(`  Role: ${edge.role}`)
      }

      // 1. Search
      const results = await searchTenureData(edge)
      console.log(`  Exa: ${results.length} results`)

      // 2. Extract
      const data = await extractTenureData(edge, results)

      if (data) {
        const dateInfo = []
        if (data.start_date) dateInfo.push(`start: ${data.start_date}`)
        if (data.end_date) dateInfo.push(`end: ${data.end_date}`)
        if (data.is_current) dateInfo.push('(current)')
        console.log(`  Found: ${dateInfo.join(', ') || 'partial data'} (${data.confidence})`)
        if (data.citation) console.log(`    Citation: ${data.citation.slice(0, 60)}...`)

        // 3. Write
        if (client) {
          const evidenceId = await writeEdgeEvidence(client, edge, data)
          console.log(`  ✓ Written: ${evidenceId}`)
        }
        enriched++
      } else {
        console.log(`  No tenure data found`)
        noData++
      }

      // 4. Save progress
      if (!dryRun) {
        progress.completed.push(edgeKey(edge))
        saveProgress('employer-edges', progress)
      }
    }
  } finally {
    if (client) client.release()
    await rdsDb.end()
    await neonDb.end()
  }

  console.log('\n' + '='.repeat(50))
  console.log(`Enriched: ${enriched} | No data: ${noData}`)
  console.log(costs.summary())
}

main().catch(console.error)
