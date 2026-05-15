#!/usr/bin/env node

/**
 * Edge Verification Pipeline — Single Opus Agent
 *
 * Verifies relationship edges between entities using Claude Opus with Exa search.
 * Modeled after beliefs-1-opus but for edge verification.
 *
 * Usage:
 *   node verification/edges-1-opus/run.js --id=18
 *   node verification/edges-1-opus/run.js --csv=verification/mapping-priority.csv --parallel=5 --write-db
 *   node verification/edges-1-opus/run.js --csv=verification/mapping-priority.csv --parallel=5 --write-db --resume
 */

import Anthropic from '@anthropic-ai/sdk'
import Exa from 'exa-js'
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { runPreBackup } from '../lib/backup.js'

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

// Database connection - staging by default
if (!process.env.STAGING_DATABASE_URL && !process.argv.includes('--allow-production')) {
  console.error('ERROR: STAGING_DATABASE_URL not set. Set it or pass --allow-production.')
  process.exit(1)
}
if (!process.env.STAGING_DATABASE_URL && process.argv.includes('--allow-production')) {
  console.error('⚠⚠⚠ WARNING: --allow-production active. Writing to PRODUCTION database. ⚠⚠⚠')
}
const pool = new pg.Pool({
  connectionString: process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
})

// ── Load Prompt ──

const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'prompts/verify-edges.md'), 'utf-8')

// ── Canonical Edge Types ──

const CANONICAL_EDGE_TYPES = {
  // Person → Organization
  person_organization: [
    'employer',
    'founder',
    'board_member',
    'advisor',
    'member',
    'affiliated',
    'critic',
    'supporter',
  ],
  // Organization → Organization
  organization_organization: ['funder', 'parent_company', 'partner', 'collaborator', 'member'],
  // Person → Person
  person_person: ['collaborator', 'advisor', 'funder', 'critic', 'supporter'],
  // Resource edges
  resource: ['author', 'publisher'],
}

// Legacy types that can be confirmed but should be corrected to canonical
const LEGACY_TYPE_MAPPINGS = {
  employed_by: 'employer',
  employed: 'employer',
  advises: 'advisor',
  authored_by: 'author',
}

// ── Output Directories ──

const RESULTS_DIR = path.join(__dirname, 'results')
const ENTITIES_DIR = path.join(RESULTS_DIR, 'entities')
for (const dir of [RESULTS_DIR, ENTITIES_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// ── Cost Tracking ──

const costs = {
  opus_input: 0,
  opus_output: 0,
  exa_searches: 0,
  exa_fetches: 0,

  // Per-entity tracking
  _entity_opus_input: 0,
  _entity_opus_output: 0,
  _entity_exa: 0,

  resetEntity() {
    this._entity_opus_input = 0
    this._entity_opus_output = 0
    this._entity_exa = 0
  },

  trackClaude(usage) {
    this.opus_input += usage.input_tokens
    this.opus_output += usage.output_tokens
    this._entity_opus_input += usage.input_tokens
    this._entity_opus_output += usage.output_tokens
  },

  trackExaSearch() {
    this.exa_searches++
    this._entity_exa++
  },

  trackExaFetch() {
    this.exa_fetches++
    this._entity_exa++
  },

  getEntityCost() {
    const opus = (this._entity_opus_input * 15 + this._entity_opus_output * 75) / 1_000_000
    const exa = this._entity_exa * 0.008
    return {
      opus_usd: opus,
      exa_usd: exa,
      total_usd: opus + exa,
      input_tokens: this._entity_opus_input,
      output_tokens: this._entity_opus_output,
      exa_calls: this._entity_exa,
    }
  },

  getSummary() {
    const opusCost = (this.opus_input * 15 + this.opus_output * 75) / 1_000_000
    const exaCost = (this.exa_searches + this.exa_fetches) * 0.008
    return {
      opus_cost_usd: opusCost,
      exa_cost_usd: exaCost,
      total_cost_usd: opusCost + exaCost,
      claude_calls: {
        opus_input_tokens: this.opus_input,
        opus_output_tokens: this.opus_output,
      },
      exa_searches: this.exa_searches,
      exa_fetches: this.exa_fetches,
    }
  },
}

// ── Exa Cache ──

const exaCache = new Map()

// ── Tool Definitions ──

const EXA_SEARCH_TOOL = {
  name: 'exa_search',
  description: `Search the web for evidence about relationships between entities.
Use this to find evidence confirming or contradicting edges.
Search for employment records, founding information, board memberships, funding relationships, etc.`,
  input_schema: {
    type: 'object',
    properties: {
      queries: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 5,
        description: 'Search queries to run. Use multiple queries to search different angles.',
      },
      num_results: {
        type: 'number',
        description: 'Results per query (default: 5, max: 10)',
      },
    },
    required: ['queries'],
  },
}

const FETCH_CONTENT_TOOL = {
  name: 'fetch_content',
  description: `Fetch the full text content of a specific URL via Exa.
Use this to read an official source (company website, LinkedIn, press release).
Only use when you need more context from a promising source.`,
  input_schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to fetch full content from',
      },
    },
    required: ['url'],
  },
}

const SUBMIT_VERDICTS_TOOL = {
  name: 'submit_verdicts',
  description: `Submit your final per-edge verdicts. Call this exactly once when you have finished all research.
This is a TERMINAL action - after calling this, your task is complete.`,
  input_schema: {
    type: 'object',
    properties: {
      verdicts: {
        type: 'array',
        description: 'One verdict per edge verified',
        items: {
          type: 'object',
          properties: {
            edge_id: { type: 'number', description: 'Edge ID being verified' },
            verdict: {
              type: 'string',
              enum: ['confirm', 'correct', 'remove'],
              description: 'confirm = edge correct, correct = needs field changes, remove = no evidence',
            },
            confidence: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
            },
            // Current values
            current_edge_type: { type: 'string' },
            current_role: { type: 'string' },
            current_start_date: { type: 'string' },
            current_end_date: { type: 'string' },
            // Proposed values (for correct verdict)
            proposed_edge_type: { type: 'string', description: 'Must be canonical type' },
            proposed_role: { type: 'string' },
            proposed_start_date: { type: 'string' },
            proposed_end_date: { type: 'string' },
            // Evidence
            source_url: { type: 'string', description: 'Required for confirm/correct' },
            citation: { type: 'string', description: 'Required for confirm/correct' },
            reasoning: { type: 'string', description: 'Explanation of verdict' },
          },
          required: ['edge_id', 'verdict', 'confidence', 'reasoning'],
        },
      },
    },
    required: ['verdicts'],
  },
}

// ── Tool Handlers ──

function sanitizeText(text) {
  if (!text) return text
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff) {
      const nextCode = text.charCodeAt(i + 1)
      if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
        result += text[i] + text[i + 1]
        i++
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      // Skip orphan low surrogate
    } else {
      result += text[i]
    }
  }
  return result
}

async function handleExaSearch(queries, numResults = 5) {
  const allResults = []

  for (const query of queries) {
    // Check cache
    if (exaCache.has(query)) {
      allResults.push({ query, results: exaCache.get(query), fromCache: true })
      continue
    }

    costs.trackExaSearch()
    try {
      const response = await exa.searchAndContents(query, {
        numResults: Math.min(numResults, 10),
        text: { maxCharacters: 3000 },
        highlights: { numSentences: 3 },
        excludeDomains: ['wikipedia.org', 'wikidata.org'],
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

async function getEdgesForEntity(entityId) {
  const result = await pool.query(
    `SELECT
      e.id as edge_id,
      e.source_id,
      e.target_id,
      e.edge_type,
      e.role,
      e.is_primary,
      e.evidence,
      es.name as source_name,
      es.entity_type as source_type,
      et.name as target_name,
      et.entity_type as target_type
    FROM edge e
    JOIN entity es ON es.id = e.source_id
    JOIN entity et ON et.id = e.target_id
    WHERE (e.source_id = $1 OR e.target_id = $1)
      AND es.status = 'approved'
      AND et.status = 'approved'
    ORDER BY e.id`,
    [entityId],
  )
  return result.rows
}

async function getAlreadyReviewedEdgeIds() {
  try {
    const result = await pool.query(`SELECT edge_id FROM edge_correction WHERE status != 'error'`)
    return new Set(result.rows.map((r) => r.edge_id))
  } catch (err) {
    // Table might not exist yet
    if (err.code === '42P01') return new Set()
    throw err
  }
}

async function insertCorrectionToDB(correction) {
  try {
    await pool.query(
      `INSERT INTO edge_correction
        (edge_id, source_entity_id, source_entity_name, source_entity_type,
         target_entity_id, target_entity_name, target_entity_type,
         current_edge_type, current_role_title, current_start_date, current_end_date,
         proposed_edge_type, proposed_role_title, proposed_start_date, proposed_end_date,
         source_url, citation, evidence_confidence,
         verdict, confidence, reasoning, search_results,
         pipeline, reviewed_entity_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 'edges-1-opus', $23, 'pending')
       ON CONFLICT (edge_id, pipeline) DO UPDATE SET
         verdict = EXCLUDED.verdict,
         confidence = EXCLUDED.confidence,
         reasoning = EXCLUDED.reasoning,
         proposed_edge_type = EXCLUDED.proposed_edge_type,
         proposed_role_title = EXCLUDED.proposed_role_title,
         proposed_start_date = EXCLUDED.proposed_start_date,
         proposed_end_date = EXCLUDED.proposed_end_date,
         source_url = EXCLUDED.source_url,
         citation = EXCLUDED.citation,
         status = 'pending'`,
      [
        correction.edge_id,
        correction.source_entity_id,
        correction.source_entity_name,
        correction.source_entity_type,
        correction.target_entity_id,
        correction.target_entity_name,
        correction.target_entity_type,
        correction.current_edge_type,
        correction.current_role_title,
        correction.current_start_date,
        correction.current_end_date,
        correction.proposed_edge_type || null,
        correction.proposed_role_title || null,
        correction.proposed_start_date || null,
        correction.proposed_end_date || null,
        correction.source_url || null,
        correction.citation || null,
        correction.evidence_confidence || null,
        correction.verdict,
        correction.confidence,
        correction.reasoning,
        correction.search_results ? JSON.stringify(correction.search_results) : null,
        correction.reviewed_entity_id,
      ],
    )
    return true
  } catch (err) {
    console.error(`    DB insert error: ${err.message}`)
    return false
  }
}

async function writeSourceAndEvidence(correction) {
  if (!correction.source_url || !correction.citation) {
    return { success: false }
  }

  try {
    const sourceId = generateSourceId(correction.source_url)

    // Upsert source
    await pool.query(
      `INSERT INTO source (source_id, url, source_type)
       VALUES ($1, $2, 'web')
       ON CONFLICT (source_id) DO NOTHING`,
      [sourceId, correction.source_url],
    )

    // Generate evidence ID
    const evidenceId = `${correction.edge_id}_${sourceId}`

    // Upsert edge_evidence
    await pool.query(
      `INSERT INTO edge_evidence
        (evidence_id, edge_id, source_id, citation, role_title, confidence,
         extracted_by, extraction_model, extraction_date)
       VALUES ($1, $2, $3, $4, $5, $6, 'edges-1-opus', 'claude-opus-4.5', CURRENT_DATE)
       ON CONFLICT (evidence_id) DO UPDATE SET
         citation = EXCLUDED.citation,
         confidence = EXCLUDED.confidence,
         extraction_date = CURRENT_DATE`,
      [
        evidenceId,
        correction.edge_id,
        sourceId,
        correction.citation,
        correction.proposed_role_title || correction.current_role_title,
        correction.confidence,
      ],
    )

    return { success: true, sourceId, evidenceId }
  } catch (err) {
    if (err.code === '42P01') {
      return { success: false, error: 'Tables not created yet' }
    }
    console.warn(`    Warning: Failed to write source/evidence: ${err.message}`)
    return { success: false, error: err.message }
  }
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

// ── Main Verification ──

const BATCH_SIZE = 10 // Max edges per Claude call

async function verifyEntityEdges(entity, edges, reviewedEdgeIds) {
  console.log(`\n${'='.repeat(50)}`)
  console.log(`[${entity.id}] ${entity.name} (${entity.entity_type})`)
  console.log('='.repeat(50))

  // Filter out already reviewed edges
  const edgesToVerify = edges.filter((e) => !reviewedEdgeIds.has(e.edge_id))

  if (edgesToVerify.length === 0) {
    console.log('  All edges already reviewed')
    return { results: [], skipped: edges.length }
  }

  console.log(`  Edges: ${edgesToVerify.length} to verify (${edges.length - edgesToVerify.length} already reviewed)`)

  // Batch edges into groups of BATCH_SIZE
  const batches = []
  for (let i = 0; i < edgesToVerify.length; i += BATCH_SIZE) {
    batches.push(edgesToVerify.slice(i, i + BATCH_SIZE))
  }

  console.log(`  Batches: ${batches.length} (${BATCH_SIZE} edges per batch)`)

  const allResults = []
  const conversationTrace = []

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx]
    console.log(`\n  Batch ${batchIdx + 1}/${batches.length}: ${batch.length} edges`)

    costs.resetEntity()

    // Build edge list for prompt
    const edgesList = batch
      .map((e, i) => {
        const direction = e.source_id === entity.id ? 'outgoing' : 'incoming'
        const otherEntity = direction === 'outgoing' ? e.target_name : e.source_name
        const otherType = direction === 'outgoing' ? e.target_type : e.source_type

        return `${i + 1}. Edge ID: ${e.edge_id}
   ${e.source_name} (${e.source_type}) → ${e.target_name} (${e.target_type})
   Type: ${e.edge_type || '(none)'}
   Role: ${e.role || '(none)'}
   Direction: ${direction} (other entity: ${otherEntity}, ${otherType})`
      })
      .join('\n\n')

    const userMessage = `Verify the following edges for entity "${entity.name}" (${entity.entity_type}):

EDGES TO VERIFY:
${edgesList}

Search for evidence about each relationship and submit your verdicts.
Remember:
- confirm/correct require source URL + citation
- remove only needs reasoning
- proposed_edge_type must be a canonical type
`

    const tools = [EXA_SEARCH_TOOL, FETCH_CONTENT_TOOL, SUBMIT_VERDICTS_TOOL]
    const messages = [{ role: 'user', content: userMessage }]

    let verdicts = null
    const maxTurns = 15

    for (let turn = 0; turn < maxTurns; turn++) {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 16000,
        thinking: {
          type: 'enabled',
          budget_tokens: 10000,
        },
        system: SYSTEM_PROMPT,
        tools,
        messages,
      })

      costs.trackClaude(response.usage)

      // Capture trace
      const traceEntry = {
        batch: batchIdx,
        turn,
        usage: response.usage,
        stop_reason: response.stop_reason,
        tool_calls: [],
      }
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          traceEntry.tool_calls.push({
            name: block.name,
            input_preview: JSON.stringify(block.input).substring(0, 300),
          })
        }
      }
      conversationTrace.push(traceEntry)

      // Process tool calls
      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use')

      if (response.stop_reason === 'end_turn' && toolUseBlocks.length === 0) {
        console.log('    Agent finished without submitting verdicts')
        break
      }

      const toolResults = []
      for (const toolUse of toolUseBlocks) {
        console.log(`    🔧 ${toolUse.name}`)

        if (toolUse.name === 'exa_search') {
          const result = await handleExaSearch(toolUse.input.queries, toolUse.input.num_results || 5)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          })
        } else if (toolUse.name === 'fetch_content') {
          const result = await handleFetchContent(toolUse.input.url)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          })
        } else if (toolUse.name === 'submit_verdicts') {
          verdicts = toolUse.input.verdicts
          console.log(`    ✓ Received ${verdicts.length} verdicts`)
          break
        }
      }

      if (verdicts) break

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })
    }

    if (!verdicts) {
      console.log('    ERROR: Agent did not submit verdicts for this batch')
      continue
    }

    // Map verdicts back to full edge info
    for (const v of verdicts) {
      const edge = batch.find((e) => e.edge_id === v.edge_id)
      if (!edge) {
        console.log(`    ⚠ Verdict for unknown edge_id: ${v.edge_id}`)
        continue
      }

      const result = {
        edge_id: edge.edge_id,
        source_entity_id: edge.source_id,
        source_entity_name: edge.source_name,
        source_entity_type: edge.source_type,
        target_entity_id: edge.target_id,
        target_entity_name: edge.target_name,
        target_entity_type: edge.target_type,
        current_edge_type: edge.edge_type,
        current_role_title: edge.role, // Maps to DB column current_role_title
        current_start_date: null, // Edge table doesn't have these yet
        current_end_date: null,
        proposed_edge_type: v.proposed_edge_type || null,
        proposed_role_title: v.proposed_role || null, // Claude sends proposed_role, we store as proposed_role_title
        proposed_start_date: v.proposed_start_date || null,
        proposed_end_date: v.proposed_end_date || null,
        source_url: v.source_url || null,
        citation: v.citation || null,
        evidence_confidence: v.confidence,
        verdict: v.verdict,
        confidence: v.confidence,
        reasoning: v.reasoning,
        reviewed_entity_id: entity.id,
      }

      allResults.push(result)

      // Log verdict
      const icon = v.verdict === 'confirm' ? '✓' : v.verdict === 'correct' ? '→' : '✗'
      console.log(`    ${icon} Edge ${edge.edge_id}: ${v.verdict} (${v.confidence})`)
      if (v.verdict === 'correct' && v.proposed_edge_type) {
        console.log(`      Type: ${edge.edge_type} → ${v.proposed_edge_type}`)
      }
    }
  }

  return { results: allResults, trace: conversationTrace }
}

// ── Main Entry Point ──

async function main() {
  const args = process.argv.slice(2)
  const flags = {}

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      flags[key] = value || true
    }
  }

  console.log('Edge Verification Pipeline — Single Opus Agent')
  console.log('='.repeat(50))

  const options = {
    entityId: flags.id,
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

  // Pre-run backup
  await runPreBackup(pool, { label: 'edges-1-opus', r2: true })

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

  // Get already reviewed edge IDs
  const reviewedEdgeIds = await getAlreadyReviewedEdgeIds()
  console.log(`Already reviewed edges: ${reviewedEdgeIds.size}`)

  // Load entities
  let entityIds
  if (options.csvPath) {
    entityIds = await loadEntitiesFromCsv(options.csvPath)
  } else if (options.entityId) {
    entityIds = [parseInt(options.entityId)]
  } else {
    // Default: get entities with edges
    const result = await pool.query(
      `SELECT DISTINCT e.id, e.name, e.entity_type
       FROM entity e
       WHERE e.status = 'approved'
         AND EXISTS (SELECT 1 FROM edge WHERE source_id = e.id OR target_id = e.id)
       ORDER BY e.id
       LIMIT $1`,
      [options.limit],
    )
    entityIds = result.rows.map((r) => r.id)
  }

  // Fetch entity details
  const placeholders = entityIds.map((_, i) => `$${i + 1}`).join(',')
  const entitiesResult = await pool.query(
    `SELECT id, name, entity_type FROM entity WHERE id IN (${placeholders})`,
    entityIds,
  )
  const entitiesMap = new Map(entitiesResult.rows.map((e) => [e.id, e]))

  // Filter out completed entities
  const entitiesToProcess = entityIds
    .filter((id) => !completedSet.has(id))
    .map((id) => entitiesMap.get(id))
    .filter(Boolean)

  console.log(`Entities to process: ${entitiesToProcess.length}`)

  // JSONL paths
  const jsonlPath = path.join(RESULTS_DIR, 'corrections.jsonl')
  const costLedgerPath = path.join(RESULTS_DIR, 'cost-ledger.jsonl')

  const maxCost = flags['max-cost'] ? parseFloat(flags['max-cost']) : 500
  console.log(`Cost ceiling: $${maxCost}`)

  const startTime = Date.now()
  let processedCount = 0
  let errorCount = 0
  let dbWriteCount = 0
  let totalEdgesVerified = 0

  // Process entity function
  async function processEntity(entity) {
    const entityStart = Date.now()

    try {
      // Get edges for this entity
      const edges = await getEdgesForEntity(entity.id)

      if (edges.length === 0) {
        console.log(`  [${entity.id}] ${entity.name}: No edges`)
        return { success: true, entity, results: [], skipped: 0, entityMs: Date.now() - entityStart }
      }

      const { results, trace, skipped } = await verifyEntityEdges(entity, edges, reviewedEdgeIds)

      return {
        success: true,
        entity,
        results,
        trace,
        skipped: skipped || 0,
        entityMs: Date.now() - entityStart,
        entityCost: costs.getEntityCost(),
      }
    } catch (err) {
      return {
        success: false,
        entity,
        error: err.message,
        entityMs: Date.now() - entityStart,
      }
    }
  }

  // Save results function
  async function saveResults(outcome) {
    const { entity, results, trace, entityCost, entityMs, error } = outcome

    if (outcome.success) {
      // Save per-entity JSON
      const entityResult = {
        id: entity.id,
        name: entity.name,
        entity_type: entity.entity_type,
        verified_at: new Date().toISOString(),
        time_ms: entityMs,
        cost: entityCost,
        edges_verified: results.length,
        verdicts: results,
        conversation_trace: trace,
      }
      fs.writeFileSync(path.join(ENTITIES_DIR, `${entity.id}.json`), JSON.stringify(entityResult, null, 2) + '\n')

      // Append to cost ledger
      fs.appendFileSync(
        costLedgerPath,
        JSON.stringify({
          id: entity.id,
          name: entity.name,
          cost_usd: entityCost?.total_usd || 0,
          edges: results.length,
          verdicts: results.map((r) => r.verdict),
          timestamp: new Date().toISOString(),
        }) + '\n',
      )

      // Write each result to JSONL and DB
      for (const r of results) {
        fs.appendFileSync(jsonlPath, JSON.stringify(r) + '\n')

        if (options.writeDb) {
          await writeSourceAndEvidence(r)
          const inserted = await insertCorrectionToDB(r)
          if (inserted) dbWriteCount++
        }

        // Mark edge as reviewed for future batches
        reviewedEdgeIds.add(r.edge_id)
      }

      totalEdgesVerified += results.length
      processedCount++
      progress.completed.push(entity.id)
    } else {
      errorCount++
      fs.appendFileSync(
        costLedgerPath,
        JSON.stringify({
          id: entity.id,
          name: entity.name,
          cost_usd: 0,
          error: error.substring(0, 200),
          timestamp: new Date().toISOString(),
        }) + '\n',
      )
    }

    // Save progress
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2) + '\n')
  }

  // Run processing
  if (options.parallel > 1) {
    console.log(`\nStarting parallel verification (${options.parallel} concurrent)...`)

    async function processAndSave(entity) {
      const outcome = await processEntity(entity)
      await saveResults(outcome)
      return outcome
    }

    await runWithConcurrency(entitiesToProcess, options.parallel, processAndSave)
  } else {
    // Sequential
    for (let i = 0; i < entitiesToProcess.length; i++) {
      const entity = entitiesToProcess[i]

      const currentCost = costs.getSummary().total_cost_usd
      if (currentCost >= maxCost) {
        console.error(`\nABORTING: Cost ceiling reached ($${currentCost.toFixed(2)} >= $${maxCost})`)
        break
      }

      const outcome = await processEntity(entity)
      await saveResults(outcome)

      if (outcome.success) {
        console.log(
          `  Cost: $${outcome.entityCost?.total_usd?.toFixed(3) || '0'} | Cumulative: $${costs.getSummary().total_cost_usd.toFixed(2)} | ${i + 1}/${entitiesToProcess.length}`,
        )
      } else {
        console.error(`  ERROR: ${outcome.error}`)
      }
    }
  }

  // Summary
  const elapsed = Date.now() - startTime
  const costSummary = costs.getSummary()

  console.log('\n' + '='.repeat(50))
  console.log('SUMMARY')
  console.log('='.repeat(50))
  console.log(`Entities processed: ${processedCount}`)
  console.log(`Entities with errors: ${errorCount}`)
  console.log(`Edges verified: ${totalEdgesVerified}`)
  console.log(`Time: ${(elapsed / 1000).toFixed(1)}s`)

  console.log(`\nCosts:`)
  console.log(`  Opus: $${costSummary.opus_cost_usd.toFixed(4)}`)
  console.log(`  Exa: $${costSummary.exa_cost_usd.toFixed(4)}`)
  console.log(`  TOTAL: $${costSummary.total_cost_usd.toFixed(4)}`)

  if (options.writeDb) {
    console.log(`\nDatabase writes: ${dbWriteCount} corrections inserted`)
  }

  // Write run stats
  const statsPath = path.join(RESULTS_DIR, 'run-stats.json')
  fs.writeFileSync(
    statsPath,
    JSON.stringify(
      {
        run_started_at: new Date(startTime).toISOString(),
        run_ended_at: new Date().toISOString(),
        total_duration_ms: elapsed,
        entities_processed: processedCount,
        entities_with_errors: errorCount,
        edges_verified: totalEdgesVerified,
        parallelism: options.parallel,
        ...costSummary,
        db_writes: options.writeDb ? { enabled: true, count: dbWriteCount } : { enabled: false },
      },
      null,
      2,
    ),
  )

  await pool.end()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
