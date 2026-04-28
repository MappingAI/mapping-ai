#!/usr/bin/env node
/**
 * Enrich organizations with founding/end dates
 * Writes to Anushree's claim table with belief_dimension = 'founded_year' | 'end_year'
 *
 * Usage:
 *   node scripts/edge-enrichment/enrich-org-lifecycle.js --limit=5
 *   node scripts/edge-enrichment/enrich-org-lifecycle.js --all
 */
import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import Exa from 'exa-js'
import crypto from 'crypto'
import { getConnections, closeConnections } from './lib/db.js'
import { registerSource } from './lib/source.js'
import { loadProgress, saveProgress } from './lib/progress.js'
import { costs } from './lib/costs.js'

const SCRIPT_NAME = 'enrich-org-lifecycle'

const args = process.argv.slice(2)
const flags = {
  limit: parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1]) || null,
  all: args.includes('--all'),
  resume: args.includes('--resume'),
  dryRun: args.includes('--dry-run'),
}

if (!flags.all && !flags.limit) {
  console.log('Usage: node enrich-org-lifecycle.js --limit=N or --all')
  process.exit(1)
}

const anthropic = new Anthropic()
const exa = new Exa(process.env.EXA_API_KEY)

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

const EXTRACTION_PROMPT = `You are extracting lifecycle information about an organization.

For the organization provided, extract:
- founded_year: The year the organization was founded (YYYY)
- end_year: The year the organization ceased operations (YYYY), or null if still active
- citation: A verbatim quote from the source supporting these facts
- source_url: The URL where you found this information
- confidence: "high" (explicit statement), "medium" (implied), "low" (uncertain)

IMPORTANT:
- Only extract years that are explicitly stated or very clearly implied
- If the organization is still active, end_year should be null
- The citation must be a VERBATIM quote from the text
- If no founding date is found, return null for founded_year

Return JSON:
{
  "founded_year": 2015,
  "end_year": null,
  "citation": "exact quote from source...",
  "source_url": "https://...",
  "confidence": "high"
}

If nothing found, return:
null`

async function searchOrgLifecycle(orgName) {
  const query = `"${orgName}" founded OR established OR "since" year OR incorporated`

  try {
    const result = await exa.searchAndContents(query, {
      numResults: 5,
      type: 'auto',
      text: { maxCharacters: 2000 },
      useAutoprompt: false,
    })
    costs.trackExa()
    return result.results || []
  } catch (err) {
    console.error(`  Exa error: ${err.message}`)
    return []
  }
}

async function extractLifecycleData(orgName, searchResults) {
  if (!searchResults.length) return null

  const context = searchResults
    .map((r, i) => `--- Source ${i + 1}: ${r.url} ---\n${r.text || r.highlight || ''}`)
    .join('\n\n')

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Organization: "${orgName}"\n\nSearch results:\n${context}\n\n${EXTRACTION_PROMPT}`,
        },
      ],
    })

    costs.trackClaude(response.usage)

    const text = response.content[0].text.trim()
    if (text === 'null') return null

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.citation && parsed.source_url && (parsed.founded_year || parsed.end_year)) {
        return parsed
      }
    }
    return null
  } catch (err) {
    console.error(`  Claude error: ${err.message}`)
    return null
  }
}

function claimId(entityId, dimension, sourceId) {
  const hash = crypto.createHash('sha256').update(`${entityId}_${dimension}_${sourceId}`).digest('hex').slice(0, 12)
  return `claim-${hash}`
}

async function processOrg(org, neon, dryRun) {
  console.log(`\nProcessing: ${org.name}`)

  const searchResults = await searchOrgLifecycle(org.name)
  console.log(`  Found ${searchResults.length} search results`)

  if (searchResults.length === 0) {
    return { founded: false, ended: false }
  }

  const extraction = await extractLifecycleData(org.name, searchResults)

  if (!extraction) {
    console.log(`  No lifecycle data found`)
    return { founded: false, ended: false }
  }

  if (dryRun) {
    console.log(`  [DRY-RUN] Would save:`, extraction)
    return { founded: !!extraction.founded_year, ended: !!extraction.end_year }
  }

  // Register source
  const sid = await registerSource(neon, {
    url: extraction.source_url,
    type: 'web',
    excerpt: extraction.citation,
  })

  const result = { founded: false, ended: false }

  // Write founded_year claim
  if (extraction.founded_year) {
    const cid = claimId(org.id, 'founded_year', sid)
    await neon.query(
      `INSERT INTO claim (
        claim_id, entity_id, entity_name, belief_dimension,
        stance_label, citation, source_id, confidence,
        extracted_by, extraction_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE)
      ON CONFLICT (claim_id) DO UPDATE SET
        stance_label = EXCLUDED.stance_label,
        citation = EXCLUDED.citation`,
      [
        cid,
        org.id,
        org.name,
        'founded_year',
        String(extraction.founded_year),
        extraction.citation,
        sid,
        extraction.confidence,
        SCRIPT_NAME,
      ]
    )
    console.log(`  ✓ Founded: ${extraction.founded_year}`)
    result.founded = true
  }

  // Write end_year claim if org is defunct
  if (extraction.end_year) {
    const cid = claimId(org.id, 'end_year', sid)
    await neon.query(
      `INSERT INTO claim (
        claim_id, entity_id, entity_name, belief_dimension,
        stance_label, citation, source_id, confidence,
        extracted_by, extraction_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE)
      ON CONFLICT (claim_id) DO UPDATE SET
        stance_label = EXCLUDED.stance_label,
        citation = EXCLUDED.citation`,
      [
        cid,
        org.id,
        org.name,
        'end_year',
        String(extraction.end_year),
        extraction.citation,
        sid,
        extraction.confidence,
        SCRIPT_NAME,
      ]
    )
    console.log(`  ✓ Ended: ${extraction.end_year}`)
    result.ended = true
  }

  return result
}

async function main() {
  const startTime = Date.now()
  console.log('=== Org Lifecycle Enrichment ===')
  console.log(`Options: limit=${flags.limit || 'all'}, dryRun=${flags.dryRun}`)

  const { rds, neon } = await getConnections()
  console.log('Connected to databases')

  const progress = flags.resume ? loadProgress(SCRIPT_NAME) : { completed: [] }
  console.log(`Progress: ${progress.completed.length} orgs already processed`)

  // Get orgs
  let query = `
    SELECT id, name
    FROM entity
    WHERE status = 'approved'
      AND entity_type = 'organization'
    ORDER BY id
  `
  const params = []

  if (flags.limit) {
    query += ` LIMIT $1`
    params.push(flags.limit)
  }

  const orgs = (await rds.query(query, params)).rows

  const toProcess = orgs.filter((o) => !progress.completed.includes(o.id))
  console.log(`Processing ${toProcess.length} orgs (${orgs.length - toProcess.length} skipped)`)

  let foundedCount = 0
  let endedCount = 0

  for (let i = 0; i < toProcess.length; i++) {
    const org = toProcess[i]

    try {
      const result = await processOrg(org, neon, flags.dryRun)
      if (result.founded) foundedCount++
      if (result.ended) endedCount++

      if (!flags.dryRun) {
        progress.completed.push(org.id)
        saveProgress(SCRIPT_NAME, progress)
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}`)
    }

    if ((i + 1) % 10 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${toProcess.length} ---`)
      console.log(costs.summary())
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('\n=== Summary ===')
  console.log(`Orgs processed: ${toProcess.length}`)
  console.log(`Founded dates found: ${foundedCount}`)
  console.log(`End dates found: ${endedCount}`)
  console.log(`Time: ${elapsed}s (${(elapsed / Math.max(toProcess.length, 1)).toFixed(2)}s/org)`)
  console.log(costs.summary())

  await closeConnections()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
