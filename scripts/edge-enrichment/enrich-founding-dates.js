/**
 * Founding date enrichment — extract org founding years
 *
 * Unlike other edge enrichment scripts, this writes to the entity table
 * (founded_year column) rather than edge_evidence.
 *
 * Usage:
 *   PILOT_DB="postgresql://..." node scripts/edge-enrichment/enrich-founding-dates.js --limit=5
 *   PILOT_DB="postgresql://..." node scripts/edge-enrichment/enrich-founding-dates.js --limit=50 --resume
 *   PILOT_DB="postgresql://..." node scripts/edge-enrichment/enrich-founding-dates.js --all
 *   PILOT_DB="postgresql://..." node scripts/edge-enrichment/enrich-founding-dates.js --dry-run --limit=3
 *
 * Flags:
 *   --limit=N    Process N orgs then stop
 *   --all        Process all orgs missing founded_year (~700, ~$20)
 *   --resume     Skip already-processed orgs
 *   --dry-run    Search + extract but don't write to DB
 */
import 'dotenv/config'
import Exa from 'exa-js'
import Anthropic from '@anthropic-ai/sdk'
import pg from 'pg'
import { loadProgress, saveProgress } from './lib/progress.js'
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
  console.log('Usage: PILOT_DB="..." node scripts/edge-enrichment/enrich-founding-dates.js [--limit=N | --all] [--resume] [--dry-run]')
  process.exit(0)
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// Extraction prompt for founding dates
const EXTRACTION_PROMPT = `You are extracting founding/establishment date information from web search results.

TASK: Determine when an organization was founded, established, or incorporated.

RULES:
1. The founding year MUST come from the search results. Never fabricate or guess.
2. Look for phrases like "founded in", "established", "incorporated", "launched", "started in", "created in".
3. If only a decade is mentioned (e.g., "founded in the 2010s"), return null.
4. If data not found in results, return null.
5. source_url MUST be from the search results provided.

Return a JSON object (or null if no founding date found):
{
  "founded_year": <4-digit year as integer, e.g. 2015>,
  "founded_context": "<brief context: 'Founded by X and Y', 'Spun out from Z', etc.>",
  "source_url": "<URL from search results>",
  "source_title": "<title of source>",
  "citation": "<verbatim quote from source mentioning the founding date, 1-2 sentences>",
  "confidence": "<high|medium|low>"
}

Return ONLY the JSON object or null.`

/**
 * Get organizations missing founded_year
 */
async function getTargetOrgs(completedSet) {
  // Note: founded_year column may not exist yet in RDS
  // We'll query all orgs and filter client-side for now
  const query = `
    SELECT id, name, category, website
    FROM entity
    WHERE entity_type = 'organization'
      AND status = 'approved'
    ORDER BY id
  `
  const result = await rdsDb.query(query)

  let orgs = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    website: row.website,
  }))

  // Filter out already completed
  if (resumeMode) {
    orgs = orgs.filter((o) => !completedSet.has(String(o.id)))
  }

  // Apply limit
  if (limit) {
    orgs = orgs.slice(0, limit)
  }

  return orgs
}

/**
 * Search for founding date via Exa
 */
async function searchFoundingDate(org) {
  const queries = [
    `"${org.name}" founded established year incorporated`,
    `"${org.name}" history founding when started`,
  ]

  const results = []
  for (const query of queries) {
    try {
      const r = await exa.searchAndContents(query, {
        numResults: 3,
        highlights: { numSentences: 4, highlightsPerUrl: 3 },
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
 * Extract founding date via Claude
 */
async function extractFoundingDate(org, searchResults) {
  if (searchResults.length === 0) return null

  const sourcesText = searchResults
    .map(
      (r, i) =>
        `[Source ${i + 1}] ${r.url}\n  Title: ${r.title}\n  Published: ${r.published}\n  Content: ${r.highlights}`
    )
    .join('\n\n')

  const prompt = `ORGANIZATION: ${org.name}
CATEGORY: ${org.category || 'Unknown'}
WEBSITE: ${org.website || 'None'}

SEARCH RESULTS:
${sourcesText}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: EXTRACTION_PROMPT + '\n\n' + prompt }],
    })
    costs.trackClaude(response.usage || {})

    const text = response.content[0]?.text || ''
    if (text.trim().toLowerCase() === 'null') return null

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const data = JSON.parse(jsonMatch[0])
    if (!data.founded_year || !data.source_url) return null

    // Validate year is reasonable
    const year = parseInt(data.founded_year)
    if (isNaN(year) || year < 1800 || year > new Date().getFullYear()) {
      return null
    }

    return { ...data, founded_year: year }
  } catch (err) {
    console.error(`    Claude error: ${err.message}`)
    return null
  }
}

/**
 * Write founding date to entity table and source to Neon
 */
async function writeFoundingDate(rdsClient, neonClient, org, data) {
  // Register source in Neon
  const sid = await registerSource(neonClient, {
    url: data.source_url,
    title: data.source_title,
    excerpt: data.citation,
  })

  // Update entity in RDS
  // Note: This requires founded_year column to exist
  // If it doesn't, this will fail - need to run migration first
  try {
    await rdsClient.query(
      `UPDATE entity SET founded_year = $1 WHERE id = $2`,
      [data.founded_year, org.id]
    )
  } catch (err) {
    if (err.message.includes('column "founded_year" does not exist')) {
      console.error('    ERROR: founded_year column does not exist. Run migration first:')
      console.error('    ALTER TABLE entity ADD COLUMN founded_year SMALLINT;')
      throw err
    }
    throw err
  }

  // Also store in a founding_evidence record (similar to edge_evidence)
  await neonClient.query(
    `INSERT INTO founding_evidence (
       org_id, founded_year, founded_context,
       source_id, citation, confidence,
       extracted_by, extraction_date
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
     ON CONFLICT (org_id) DO UPDATE SET
       founded_year = EXCLUDED.founded_year,
       founded_context = EXCLUDED.founded_context,
       source_id = EXCLUDED.source_id,
       citation = EXCLUDED.citation,
       confidence = EXCLUDED.confidence,
       extraction_date = CURRENT_DATE`,
    [
      org.id,
      data.founded_year,
      data.founded_context || null,
      sid,
      data.citation || null,
      data.confidence || 'medium',
      'exa+claude',
    ]
  )

  return sid
}

/**
 * Ensure founding_evidence table exists in Neon
 */
async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS founding_evidence (
      org_id           INTEGER PRIMARY KEY,
      founded_year     SMALLINT NOT NULL,
      founded_context  TEXT,
      source_id        TEXT NOT NULL REFERENCES source(source_id),
      citation         TEXT,
      confidence       TEXT,
      extracted_by     TEXT,
      extraction_date  DATE,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

async function main() {
  console.log('FOUNDING DATE ENRICHMENT')
  console.log('========================')

  const progress = loadProgress('founding-dates')
  const completedSet = new Set(progress.completed)

  const orgs = await getTargetOrgs(completedSet)

  console.log(`Targets: ${orgs.length} organizations`)
  if (resumeMode) console.log(`Resuming: ${completedSet.size} already completed`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log()

  const neonClient = dryRun ? null : await neonDb.connect()
  const rdsClient = dryRun ? null : await rdsDb.connect()

  if (neonClient) {
    await ensureSchema(neonClient)
  }

  let enriched = 0
  let noData = 0

  try {
    for (let i = 0; i < orgs.length; i++) {
      const org = orgs[i]
      console.log(`\n[${i + 1}/${orgs.length}] ${org.name}`)

      // 1. Search
      const results = await searchFoundingDate(org)
      console.log(`  Exa: ${results.length} results`)

      // 2. Extract
      const data = await extractFoundingDate(org, results)

      if (data) {
        console.log(`  Found: ${data.founded_year} (${data.confidence})`)
        if (data.founded_context) console.log(`    Context: ${data.founded_context}`)
        if (data.citation) console.log(`    Citation: ${data.citation.slice(0, 60)}...`)

        // 3. Write
        if (neonClient && rdsClient) {
          await writeFoundingDate(rdsClient, neonClient, org, data)
          console.log(`  ✓ Written to entity.founded_year`)
        }
        enriched++
      } else {
        console.log(`  No founding date found`)
        noData++
      }

      // 4. Save progress
      if (!dryRun) {
        progress.completed.push(String(org.id))
        saveProgress('founding-dates', progress)
      }
    }
  } finally {
    if (neonClient) neonClient.release()
    if (rdsClient) rdsClient.release()
    await rdsDb.end()
    await neonDb.end()
  }

  console.log('\n' + '='.repeat(50))
  console.log(`Enriched: ${enriched} | No data: ${noData}`)
  console.log(costs.summary())
}

main().catch(console.error)
