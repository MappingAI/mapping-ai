#!/usr/bin/env node

/**
 * Notes Verification Pipeline — Single Opus Agent
 *
 * Verifies entity notes by:
 * 1. Identifying factual claims in unstructured text
 * 2. Searching for primary sources supporting each claim
 * 3. Reconstructing notes from verified claims only
 *
 * Usage:
 *   node verification/notes-1-opus/run.js --id=123
 *   node verification/notes-1-opus/run.js --csv=verification/mapping-priority.csv --parallel=5 --write-db
 *   node verification/notes-1-opus/run.js --csv=verification/mapping-priority.csv --parallel=5 --write-db --resume
 */

import Anthropic from '@anthropic-ai/sdk'
import Exa from 'exa-js'
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment
dotenv.config({ path: path.join(__dirname, '../../.env') })

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_MULTIAGENT_VERIFICATION_KEY,
  timeout: 300000,
  maxRetries: 2,
})

const exa = new Exa(process.env.EXA_MULTIAGENT_VERIFICATION_KEY)

// Database connection
if (!process.env.STAGING_DATABASE_URL && !process.argv.includes('--allow-production')) {
  console.error('ERROR: STAGING_DATABASE_URL not set. Set it or pass --allow-production.')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
})

// ── Load Prompt ──

const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'prompts/verify-notes.md'), 'utf-8')

// ── Results Directory ──

const RESULTS_DIR = path.join(__dirname, 'results')
const ENTITIES_DIR = path.join(RESULTS_DIR, 'entities')
fs.mkdirSync(ENTITIES_DIR, { recursive: true })

// ── Cost Tracking ──

const costs = {
  opus: { input_tokens: 0, output_tokens: 0 },
  exa: { searches: 0, fetches: 0 },
  entity: { opus: { input_tokens: 0, output_tokens: 0 }, exa: { searches: 0, fetches: 0 } },

  trackClaude(usage) {
    this.opus.input_tokens += usage.input_tokens || 0
    this.opus.output_tokens += usage.output_tokens || 0
    this.entity.opus.input_tokens += usage.input_tokens || 0
    this.entity.opus.output_tokens += usage.output_tokens || 0
  },

  trackExaSearch() {
    this.exa.searches++
    this.entity.exa.searches++
  },

  trackExaFetch() {
    this.exa.fetches++
    this.entity.exa.fetches++
  },

  resetEntity() {
    this.entity = { opus: { input_tokens: 0, output_tokens: 0 }, exa: { searches: 0, fetches: 0 } }
  },

  getEntityCost() {
    const opusCost = (this.entity.opus.input_tokens * 15 + this.entity.opus.output_tokens * 75) / 1_000_000
    const exaCost = (this.entity.exa.searches + this.entity.exa.fetches) * 0.01
    return { opus_usd: opusCost, exa_usd: exaCost, total_usd: opusCost + exaCost }
  },

  getSummary() {
    const opusCost = (this.opus.input_tokens * 15 + this.opus.output_tokens * 75) / 1_000_000
    const exaCost = (this.exa.searches + this.exa.fetches) * 0.01
    return {
      opus_cost_usd: opusCost,
      exa_cost_usd: exaCost,
      total_cost_usd: opusCost + exaCost,
      opus_tokens: this.opus,
      exa_calls: this.exa,
    }
  },
}

// ── Tool Definitions ──

const tools = [
  {
    name: 'exa_search',
    description: `Search for sources to verify claims. You can run multiple queries at once (up to 5).
Use this to find primary sources for each claim in the notes.`,
    input_schema: {
      type: 'object',
      properties: {
        queries: {
          type: 'array',
          items: { type: 'string' },
          description: 'Search queries (1-5 queries)',
          maxItems: 5,
        },
      },
      required: ['queries'],
    },
  },
  {
    name: 'fetch_content',
    description: `Fetch full page content from a URL to get more context.
Use when search results look promising but you need more detail from the source.`,
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
      },
      required: ['url'],
    },
  },
  {
    name: 'submit_verified_notes',
    description: 'Submit the verified notes and sources. This is the final output.',
    input_schema: {
      type: 'object',
      properties: {
        verified_notes: {
          type: 'string',
          description: 'Reconstructed notes containing only verified claims',
        },
        sources: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              claim: { type: 'string', description: 'The specific claim that was verified' },
              claim_type: {
                type: 'string',
                enum: ['biographical', 'affiliation', 'financial', 'date', 'relationship', 'achievement', 'position'],
              },
              url: { type: 'string', description: 'Source URL' },
              citation: { type: 'string', description: 'Verbatim quote from source' },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['claim', 'url', 'citation', 'confidence'],
          },
          description: 'Per-claim sources',
        },
        removed_claims: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              claim: { type: 'string', description: 'The claim that was removed' },
              claim_type: { type: 'string' },
              reason: {
                type: 'string',
                enum: ['no_source_found', 'source_contradicts', 'unverifiable_specifics', 'outdated'],
              },
            },
            required: ['claim', 'reason'],
          },
          description: 'Claims that were removed',
        },
        confidence: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description: 'Overall verification confidence',
        },
        reasoning: {
          type: 'string',
          description: 'Brief explanation of verification quality',
        },
      },
      required: ['verified_notes', 'sources', 'removed_claims', 'confidence', 'reasoning'],
    },
  },
]

// ── Tool Handlers ──

function sanitizeText(text) {
  if (!text) return ''
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

const exaCache = new Map()

async function handleExaSearch(queries) {
  const allResults = []

  for (const query of queries.slice(0, 5)) {
    if (exaCache.has(query)) {
      allResults.push({ query, results: exaCache.get(query), fromCache: true })
      continue
    }

    costs.trackExaSearch()
    try {
      const response = await exa.searchAndContents(query, {
        numResults: 8,
        text: { maxCharacters: 3000 },
        highlights: { numSentences: 3 },
      })

      const results = (response.results || []).map((r) => ({
        url: r.url,
        title: sanitizeText(r.title),
        text: sanitizeText(r.text?.substring(0, 2000)),
        highlights: r.highlights?.map(sanitizeText),
        publishedDate: r.publishedDate,
      }))

      exaCache.set(query, results)
      allResults.push({ query, results })
    } catch (err) {
      allResults.push({ query, results: [], error: err.message })
    }
  }

  // Format as readable text
  const text = allResults
    .map(({ query, results, error }) => {
      if (error) return `Query: "${query}"\n  Error: ${error}`
      const entries = results
        .map(
          (r, i) =>
            `  [${i + 1}] ${r.title}\n      URL: ${r.url}\n      Published: ${r.publishedDate || 'unknown'}` +
            (r.highlights?.length
              ? `\n      Highlights:\n${r.highlights.map((h) => `        - ${h}`).join('\n')}`
              : '') +
            (r.text ? `\n      Text (truncated):\n        ${r.text.slice(0, 800)}...` : ''),
        )
        .join('\n\n')
      return `Query: "${query}"\n${entries || '  No results'}`
    })
    .join('\n\n---\n\n')

  return text
}

async function handleFetchContent(url) {
  costs.trackExaFetch()

  try {
    const response = await exa.getContents([url], {
      text: { maxCharacters: 8000 },
    })

    const page = response.results?.[0]
    if (!page) return `No content returned for URL: ${url}`

    return `URL: ${page.url}\nTitle: ${sanitizeText(page.title)}\n\n${sanitizeText(page.text) || '(no text)'}`
  } catch (err) {
    return `Error fetching ${url}: ${err.message}`
  }
}

// ── Database Helpers ──

function generateSourceId(url) {
  return 'src-' + crypto.createHash('sha256').update(url).digest('hex').slice(0, 12)
}

async function insertNoteCorrection(entity, result) {
  try {
    const res = await pool.query(
      `INSERT INTO note_correction
        (entity_id, entity_name, entity_type,
         original_notes, original_notes_length, original_claim_count,
         verified_notes, verified_notes_length, verified_claim_count,
         removed_claims, removed_claim_count,
         confidence, reasoning, pipeline, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'notes-1-opus', 'pending')
       ON CONFLICT (entity_id, pipeline) DO UPDATE SET
         verified_notes = EXCLUDED.verified_notes,
         verified_notes_length = EXCLUDED.verified_notes_length,
         verified_claim_count = EXCLUDED.verified_claim_count,
         removed_claims = EXCLUDED.removed_claims,
         removed_claim_count = EXCLUDED.removed_claim_count,
         confidence = EXCLUDED.confidence,
         reasoning = EXCLUDED.reasoning,
         status = 'pending'
       RETURNING id`,
      [
        entity.id,
        entity.name,
        entity.entity_type,
        entity.notes,
        entity.notes?.length || 0,
        result.sources.length + result.removed_claims.length,
        result.verified_notes,
        result.verified_notes?.length || 0,
        result.sources.length,
        JSON.stringify(result.removed_claims),
        result.removed_claims.length,
        result.confidence,
        result.reasoning,
      ],
    )
    return res.rows[0]?.id
  } catch (err) {
    console.error(`    DB error (note_correction): ${err.message}`)
    return null
  }
}

async function insertNoteClaims(entity, result, correctionId) {
  let insertedCount = 0

  for (const source of result.sources) {
    try {
      const sourceId = generateSourceId(source.url)

      // Upsert source
      await pool.query(
        `INSERT INTO source (source_id, url, source_type)
         VALUES ($1, $2, 'web')
         ON CONFLICT (source_id) DO NOTHING`,
        [sourceId, source.url],
      )

      // Insert note_claim
      await pool.query(
        `INSERT INTO note_claim
          (entity_id, source_id, correction_id, claim_text, claim_type,
           citation, verdict, confidence, extracted_by, extraction_model, extraction_date)
         VALUES ($1, $2, $3, $4, $5, $6, 'supported', $7, 'notes-1-opus', 'claude-opus-4', CURRENT_DATE)`,
        [
          entity.id,
          sourceId,
          correctionId,
          source.claim,
          source.claim_type || null,
          source.citation,
          source.confidence,
        ],
      )
      insertedCount++
    } catch (err) {
      console.error(`    DB error (note_claim): ${err.message}`)
    }
  }

  // Also insert removed claims (without source)
  for (const removed of result.removed_claims) {
    try {
      await pool.query(
        `INSERT INTO note_claim
          (entity_id, correction_id, claim_text, claim_type,
           verdict, confidence, extracted_by, extraction_model, extraction_date)
         VALUES ($1, $2, $3, $4, 'unsupported', 'high', 'notes-1-opus', 'claude-opus-4', CURRENT_DATE)`,
        [entity.id, correctionId, removed.claim, removed.claim_type || null],
      )
    } catch (err) {
      console.error(`    DB error (removed claim): ${err.message}`)
    }
  }

  return insertedCount
}

// ── CSV Loading ──

async function loadEntitiesFromCsv(csvPath) {
  const fullPath = path.resolve(__dirname, '..', csvPath)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`CSV file not found: ${fullPath}`)
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const lines = content.trim().split('\n')
  const header = lines[0].split(',')
  const idIndex = header.indexOf('id')

  if (idIndex === -1) {
    throw new Error('CSV must have an "id" column')
  }

  const ids = lines
    .slice(1)
    .map((line) => {
      const parts = line.split(',')
      return parseInt(parts[idIndex], 10)
    })
    .filter((id) => !isNaN(id))

  console.log(`Loaded ${ids.length} entity IDs from CSV`)
  return ids
}

// ── Get Entities with Notes ──

async function getEntitiesWithNotes(entityIds) {
  const result = await pool.query(
    `SELECT id, name, entity_type, notes
     FROM entity
     WHERE id = ANY($1)
       AND notes IS NOT NULL
       AND LENGTH(notes) > 50
     ORDER BY id`,
    [entityIds],
  )
  return result.rows
}

async function getAlreadyVerifiedEntityIds() {
  const result = await pool.query(
    `SELECT entity_id FROM note_correction WHERE pipeline = 'notes-1-opus'`,
  )
  return new Set(result.rows.map((r) => r.entity_id))
}

// ── Parallel Execution Helper ──

async function runWithConcurrency(items, concurrency, fn) {
  const results = []
  let index = 0

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++
      const item = items[currentIndex]
      try {
        const result = await fn(item, currentIndex)
        results[currentIndex] = result
      } catch (err) {
        results[currentIndex] = { error: err.message, item }
      }
    }
  }

  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker())

  await Promise.all(workers)
  return results
}

// ── Main Verification Function ──

async function verifyEntityNotes(entity) {
  console.log(`\n${'='.repeat(50)}`)
  console.log(`[${entity.id}] ${entity.name} (${entity.entity_type})`)
  console.log('='.repeat(50))
  console.log(`  Notes length: ${entity.notes.length} chars`)

  const userMessage = `
## Entity to Verify

**ID:** ${entity.id}
**Name:** ${entity.name}
**Type:** ${entity.entity_type}

## Current Notes

${entity.notes}

---

Please verify each factual claim in these notes. Search for primary sources, then reconstruct the notes using only verified claims.
`.trim()

  const messages = [{ role: 'user', content: userMessage }]

  let result = null
  let iterations = 0
  const maxIterations = 15

  while (iterations < maxIterations) {
    iterations++

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    })

    costs.trackClaude(response.usage)

    // Check for tool use
    const toolUses = response.content.filter((c) => c.type === 'tool_use')

    if (toolUses.length === 0) {
      // No tool use, check stop reason
      if (response.stop_reason === 'end_turn') {
        console.log('  Warning: Agent ended without submitting results')
        break
      }
      continue
    }

    // Process tool calls
    const toolResults = []

    for (const toolUse of toolUses) {
      let toolResult

      if (toolUse.name === 'exa_search') {
        console.log(`    🔍 exa_search: ${toolUse.input.queries?.length || 0} queries`)
        toolResult = await handleExaSearch(toolUse.input.queries || [])
      } else if (toolUse.name === 'fetch_content') {
        console.log(`    📄 fetch_content: ${toolUse.input.url?.substring(0, 50)}...`)
        toolResult = await handleFetchContent(toolUse.input.url)
      } else if (toolUse.name === 'submit_verified_notes') {
        console.log(`    ✅ submit_verified_notes`)
        result = toolUse.input
        toolResult = 'Verification submitted successfully.'
      } else {
        toolResult = `Unknown tool: ${toolUse.name}`
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
      })
    }

    // Add assistant message and tool results
    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })

    // If we got a result, we're done
    if (result) break
  }

  if (!result) {
    throw new Error('Agent did not submit results after max iterations')
  }

  // Log summary
  console.log(`  ─────────────────────────────────`)
  console.log(`  Verified claims: ${result.sources?.length || 0}`)
  console.log(`  Removed claims: ${result.removed_claims?.length || 0}`)
  console.log(`  Confidence: ${result.confidence}`)

  return result
}

// ── Main ──

async function main() {
  console.log('Notes Verification Pipeline — Single Opus Agent')
  console.log('='.repeat(50))

  // Parse args
  const args = process.argv.slice(2)
  const flags = {}
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      flags[key] = value === undefined ? true : value
    }
  }

  const options = {
    entityId: flags.id ? parseInt(flags.id) : null,
    limit: flags.limit ? parseInt(flags.limit) : 10,
    writeDb: flags['write-db'] === true || flags['write-db'] === 'true',
    csvPath: flags.csv || null,
    parallel: flags.parallel ? parseInt(flags.parallel) : 1,
    resume: flags.resume === true || flags.resume === 'true',
  }

  if (options.parallel > 1) {
    console.log(`Parallel execution: ${options.parallel} concurrent entities`)
  }

  if (options.writeDb) {
    console.log('Database writes: ENABLED')
  } else {
    console.log('Database writes: DISABLED (use --write-db to enable)')
  }

  // Progress tracking
  const progressPath = path.join(RESULTS_DIR, 'progress.json')
  const progress = options.resume
    ? (() => {
        try {
          return JSON.parse(fs.readFileSync(progressPath, 'utf-8'))
        } catch {
          return { completed: [], started_at: new Date().toISOString() }
        }
      })()
    : { completed: [], started_at: new Date().toISOString() }
  const completedSet = new Set(progress.completed)

  if (options.resume && completedSet.size > 0) {
    console.log(`Resuming: ${completedSet.size} entities already completed`)
  }

  // Get already verified entity IDs
  const alreadyVerifiedIds = await getAlreadyVerifiedEntityIds()
  console.log(`Already verified in DB: ${alreadyVerifiedIds.size}`)

  // Load entities
  let entityIds
  if (options.csvPath) {
    entityIds = await loadEntitiesFromCsv(options.csvPath)
  } else if (options.entityId) {
    entityIds = [options.entityId]
  } else {
    // Default: get entities with notes
    const result = await pool.query(
      `SELECT id FROM entity WHERE notes IS NOT NULL AND LENGTH(notes) > 50 LIMIT $1`,
      [options.limit],
    )
    entityIds = result.rows.map((r) => r.id)
  }

  // Get full entity data
  const entities = await getEntitiesWithNotes(entityIds)
  console.log(`Entities with notes: ${entities.length}`)

  // Filter out already completed (for resume)
  let entitiesToProcess = entities.filter((e) => !completedSet.has(e.id))
  console.log(`Entities to process: ${entitiesToProcess.length}`)

  // Cost ceiling
  const COST_CEILING = 500
  console.log(`Cost ceiling: $${COST_CEILING}`)

  // Results tracking
  const jsonlPath = path.join(RESULTS_DIR, 'corrections.jsonl')
  const costLedgerPath = path.join(RESULTS_DIR, 'cost-ledger.jsonl')

  let processedCount = 0
  let errorCount = 0

  // Process function for each entity
  async function processEntity(entity, index) {
    costs.resetEntity()
    const startTime = Date.now()

    try {
      const result = await verifyEntityNotes(entity)
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      const entityCost = costs.getEntityCost()

      // Write to JSONL
      const record = {
        entity_id: entity.id,
        entity_name: entity.name,
        entity_type: entity.entity_type,
        original_notes_length: entity.notes.length,
        verified_notes_length: result.verified_notes?.length || 0,
        verified_claim_count: result.sources?.length || 0,
        removed_claim_count: result.removed_claims?.length || 0,
        confidence: result.confidence,
        reasoning: result.reasoning,
        cost_usd: entityCost.total_usd,
        elapsed_seconds: parseFloat(elapsed),
        timestamp: new Date().toISOString(),
      }
      fs.appendFileSync(jsonlPath, JSON.stringify(record) + '\n')

      // Write detailed result
      fs.writeFileSync(
        path.join(ENTITIES_DIR, `${entity.id}.json`),
        JSON.stringify({ entity, result, cost: entityCost }, null, 2),
      )

      // Write to DB
      if (options.writeDb) {
        const correctionId = await insertNoteCorrection(entity, result)
        if (correctionId) {
          const claimCount = await insertNoteClaims(entity, result, correctionId)
          console.log(`  DB: correction_id=${correctionId}, ${claimCount} claims inserted`)
        }
      }

      // Cost ledger
      fs.appendFileSync(
        costLedgerPath,
        JSON.stringify({
          id: entity.id,
          name: entity.name,
          cost_usd: entityCost.total_usd,
          timestamp: new Date().toISOString(),
        }) + '\n',
      )

      // Update progress
      progress.completed.push(entity.id)
      fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2))

      processedCount++
      return { success: true, entity, result, entityCost }
    } catch (err) {
      console.error(`  ERROR: ${err.message}`)
      errorCount++

      fs.appendFileSync(
        costLedgerPath,
        JSON.stringify({
          id: entity.id,
          name: entity.name,
          error: err.message.substring(0, 200),
          timestamp: new Date().toISOString(),
        }) + '\n',
      )

      return { success: false, entity, error: err.message }
    }
  }

  // Run verification
  const startTime = Date.now()

  if (options.parallel > 1) {
    console.log(`\nStarting parallel verification (${options.parallel} concurrent)...`)
    await runWithConcurrency(entitiesToProcess, options.parallel, async (entity, i) => {
      // Check cost ceiling
      const currentCost = costs.getSummary().total_cost_usd
      if (currentCost >= COST_CEILING) {
        console.log(`\n⚠️  Cost ceiling reached ($${currentCost.toFixed(2)}). Stopping.`)
        return { skipped: true, reason: 'cost_ceiling' }
      }

      const outcome = await processEntity(entity, i)
      console.log(
        `  Cost: $${outcome.entityCost?.total_usd?.toFixed(3) || '0'} | Cumulative: $${costs.getSummary().total_cost_usd.toFixed(2)} | ${i + 1}/${entitiesToProcess.length}`,
      )
      return outcome
    })
  } else {
    for (let i = 0; i < entitiesToProcess.length; i++) {
      const entity = entitiesToProcess[i]

      // Check cost ceiling
      const currentCost = costs.getSummary().total_cost_usd
      if (currentCost >= COST_CEILING) {
        console.log(`\n⚠️  Cost ceiling reached ($${currentCost.toFixed(2)}). Stopping.`)
        break
      }

      const outcome = await processEntity(entity, i)
      console.log(
        `  Cost: $${outcome.entityCost?.total_usd?.toFixed(3) || '0'} | Cumulative: $${costs.getSummary().total_cost_usd.toFixed(2)} | ${i + 1}/${entitiesToProcess.length}`,
      )
    }
  }

  // Final summary
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const costSummary = costs.getSummary()

  console.log('\n' + '='.repeat(50))
  console.log('SUMMARY')
  console.log('='.repeat(50))
  console.log(`Entities processed: ${processedCount}`)
  console.log(`Entities with errors: ${errorCount}`)
  console.log(`Time: ${totalElapsed}s`)
  console.log(`\nCosts:`)
  console.log(`  Opus: $${costSummary.opus_cost_usd.toFixed(4)}`)
  console.log(`  Exa: $${costSummary.exa_cost_usd.toFixed(4)}`)
  console.log(`  TOTAL: $${costSummary.total_cost_usd.toFixed(4)}`)

  // Write run stats
  const runStats = {
    started_at: progress.started_at,
    completed_at: new Date().toISOString(),
    entities_processed: processedCount,
    entities_with_errors: errorCount,
    total_elapsed_seconds: parseFloat(totalElapsed),
    costs: costSummary,
    options,
  }
  fs.writeFileSync(path.join(RESULTS_DIR, 'run-stats.json'), JSON.stringify(runStats, null, 2))

  if (options.writeDb) {
    console.log(`\nDatabase writes: ${processedCount} corrections inserted`)
  }

  await pool.end()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
