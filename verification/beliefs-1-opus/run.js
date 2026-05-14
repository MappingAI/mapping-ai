#!/usr/bin/env node

/**
 * Belief Field Verification Pipeline — Single Opus Agent
 *
 * Simplified approach using one Opus agent with extended thinking that:
 * - Searches for BOTH supporting AND contradicting evidence via Exa
 * - Distinguishes first-person vs third-party sources
 * - Renders per-field verdicts with citations
 *
 * Comparison to 3-agent design:
 * - Fewer LLM calls (1 per entity vs 3 per field)
 * - May have confirmation bias (no adversarial pressure)
 * - Faster and cheaper per entity
 *
 * Usage:
 *   node beliefs-1-opus/run.js --id=18
 *   node beliefs-1-opus/run.js --limit=10
 *   node beliefs-1-opus/run.js --limit=50 --parallel=5    # Run 5 entities concurrently
 *   node beliefs-1-opus/run.js --csv=mapping_ai_verification_priority.csv --parallel=10
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
import { getCache, setCache } from '../lib/exa-cache.js'

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

const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'prompts/verifier.md'), 'utf-8')

// ── Belief Enums ──

// Belief enums — ground truth from src/contribute/PersonForm.tsx
const BELIEF_ENUMS = {
  // SELECT_1: regulatory stance scale (permissive → restrictive)
  belief_regulatory_stance: [
    'Accelerate',
    'Light-touch',
    'Targeted',
    'Moderate',
    'Precautionary',
    'Restrictive',
    'Nationalize',
    'Mixed/unclear',
    'Other',
  ],
  // SELECT_1: AGI timeline expectations
  belief_agi_timeline: [
    'Already here',
    '2-3 years',
    '5-10 years',
    '10-25 years',
    '25+ years or never',
    'Ill-defined',
    'Unknown',
    'Mixed/unclear',
  ],
  // SELECT_1: RISK_OPTIONS (lines 63-71)
  belief_ai_risk: [
    'Overstated',
    'Manageable',
    'Serious',
    'Catastrophic',
    'Existential',
    'Mixed/nuanced',
    'Unknown',
  ],
  // SELECT_UP_TO_3: KEY_CONCERNS (lines 73-85) — form enforces max 3 at line 491
  belief_threat_models: [
    'Labor displacement',
    'Economic inequality',
    'Power concentration',
    'Democratic erosion',
    'Cybersecurity',
    'Misinformation',
    'Environmental',
    'Weapons',
    'Loss of control',
    'Copyright/IP',
    'Existential risk',
  ],
  // SELECT_1: EVIDENCE_OPTIONS (line 51)
  belief_evidence_source: [
    'Explicitly stated',
    'Inferred',
    'Unknown',
  ],
}

// Field types
const FIELD_TYPES = {
  belief_regulatory_stance: 'enum',
  belief_regulatory_stance_detail: 'text',
  belief_agi_timeline: 'enum',
  belief_ai_risk: 'enum',
  belief_threat_models: 'multi_enum',
  belief_evidence_source: 'enum',
}

// Field constraints (maxCount for multi_enum fields)
const FIELD_CONSTRAINTS = {
  belief_threat_models: { maxCount: 3 },
}

/**
 * Validate a proposed value against field constraints
 * Returns { valid: boolean, error?: string, corrected?: string }
 */
function validateProposedValue(field, proposedValue) {
  const fieldType = FIELD_TYPES[field] || 'enum'
  const validValues = BELIEF_ENUMS[field] || []
  const constraints = FIELD_CONSTRAINTS[field] || {}

  // Text fields have no constraints
  if (fieldType === 'text') {
    return { valid: true }
  }

  // Single-select enum fields
  if (fieldType === 'enum') {
    if (!validValues.includes(proposedValue)) {
      return {
        valid: false,
        error: `Invalid value "${proposedValue}". Must be one of: ${validValues.join(', ')}`,
      }
    }
    return { valid: true }
  }

  // Multi-select enum fields (e.g., threat_models)
  if (fieldType === 'multi_enum') {
    // Parse comma-separated values
    const values = proposedValue
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0)

    // Check each value is in the allowed list
    const invalidValues = values.filter((v) => !validValues.includes(v))
    if (invalidValues.length > 0) {
      return {
        valid: false,
        error: `Invalid values: ${invalidValues.join(', ')}. Allowed: ${validValues.join(', ')}`,
      }
    }

    // Check maxCount constraint
    const maxCount = constraints.maxCount
    if (maxCount && values.length > maxCount) {
      // Auto-correct by truncating to maxCount (keep first N)
      const truncated = values.slice(0, maxCount).join(', ')
      return {
        valid: false,
        error: `Too many values (${values.length}). Maximum allowed: ${maxCount}. Truncating to: ${truncated}`,
        corrected: truncated,
      }
    }

    return { valid: true }
  }

  return { valid: true }
}

// Fields to verify by entity type
const BELIEF_FIELDS = {
  person: [
    'belief_regulatory_stance',
    'belief_regulatory_stance_detail',
    'belief_agi_timeline',
    'belief_ai_risk',
    'belief_threat_models',
    'belief_evidence_source',
  ],
  organization: [
    'belief_regulatory_stance',
    'belief_regulatory_stance_detail',
    'belief_agi_timeline',
    'belief_ai_risk',
    'belief_threat_models',
    'belief_evidence_source',
  ],
  resource: [],
}

// ── Output Directories ──

const RESULTS_DIR = path.join(__dirname, 'results')
const ENTITIES_DIR = path.join(RESULTS_DIR, 'entities')
for (const dir of [RESULTS_DIR, ENTITIES_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// ── Cost Tracking (per-entity + cumulative) ──

const costs = {
  opus_input: 0,
  opus_output: 0,
  exa_searches: 0,
  exa_fetches: 0,
  cumulative_usd: 0,

  // Per-entity tracking (reset between entities)
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
    this.cumulative_usd = opusCost + exaCost

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

// ── Tool Definitions ──

const EXA_SEARCH_TOOL = {
  name: 'exa_search',
  description: `Search the web for evidence about an entity's beliefs or positions.
Use this to find BOTH supporting AND contradicting evidence.
Run multiple queries with different angles - one looking for evidence FOR the current value, one AGAINST.
Results include page text when available.`,
  input_schema: {
    type: 'object',
    properties: {
      queries: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 5,
        description:
          'Search queries to run. Use multiple queries to search for both supporting and contradicting evidence.',
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
Use this to read a first-person source page (e.g. an official about page, interview transcript, op-ed).
Only use when you need more context from a promising source found in search results.`,
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
  description: `Submit your final per-field verdicts. Call this exactly once when you have finished all research.
This is a TERMINAL action - after calling this, your task is complete.`,
  input_schema: {
    type: 'object',
    properties: {
      verdicts: {
        type: 'array',
        description: 'One verdict per field verified',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', description: 'Field name' },
            current_value: { type: 'string', description: 'Current value in the record' },
            verdict: {
              type: 'string',
              enum: ['confirm', 'correct', 'remove'],
              description:
                'confirm = evidence supports value, correct = first-person evidence contradicts it, remove = no evidence exists',
            },
            proposed_value: {
              type: 'string',
              description: 'Replacement value (required for correct, null otherwise)',
            },
            confidence: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
            },
            winning_side: {
              type: 'string',
              enum: ['prosecution', 'defense', 'neither'],
              description:
                'Which side of your internal debate won. prosecution = evidence against current value won, defense = evidence for current value won, neither = inconclusive',
            },
            attribution_type: {
              type: 'string',
              enum: ['first_person', 'third_party_characterization', 'none'],
              description: 'Type of the strongest evidence supporting the verdict',
            },
            source_url: { type: 'string', description: 'URL of the best supporting source' },
            citation: { type: 'string', description: 'Relevant quote from the source' },
            reasoning: { type: 'string', description: 'Detailed explanation of the verdict' },
            evidence_assessment: {
              type: 'object',
              description: 'Count of evidence types found',
              properties: {
                first_person_for: { type: 'number', description: 'First-person sources supporting current value' },
                first_person_against: {
                  type: 'number',
                  description: 'First-person sources contradicting current value',
                },
                third_party_for: { type: 'number', description: 'Third-party sources supporting current value' },
                third_party_against: { type: 'number', description: 'Third-party sources contradicting current value' },
              },
            },
          },
          required: ['field', 'verdict', 'confidence', 'winning_side', 'reasoning', 'evidence_assessment'],
        },
      },
    },
    required: ['verdicts'],
  },
}

// ── Tool Handlers ──

async function handleExaSearch(queries, numResults = 5) {
  const allResults = []

  for (const query of queries) {
    // Check shared cache first
    const cached = getCache(query)
    if (cached) {
      allResults.push({ query, results: cached, fromCache: true })
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
        title: r.title,
        text: r.text?.substring(0, 2000),
        highlights: r.highlights,
        publishedDate: r.publishedDate,
        author: r.author,
      }))

      setCache(query, results)

      allResults.push({
        query,
        results,
      })
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

    return `URL: ${page.url}\nTitle: ${page.title}\n\n${page.text || '(no text)'}`
  } catch (err) {
    return `Error fetching ${url}: ${err.message}`
  }
}

// ── Database Writes ──

function generateSourceId(url) {
  return 'src-' + crypto.createHash('sha256').update(url).digest('hex').slice(0, 12)
}

async function insertCorrectionToDB(correction) {
  try {
    // Map single-agent fields to belief_correction schema
    const winning_side =
      correction.verdict === 'confirm'
        ? 'defense'
        : correction.verdict === 'correct'
          ? 'prosecution'
          : correction.verdict === 'remove'
            ? 'prosecution'
            : 'neither'

    await pool.query(
      `INSERT INTO belief_correction
        (entity_id, entity_type, entity_name, field, current_value, verdict,
         proposed_value, confidence, attribution_type, winning_side,
         source_url, citation, new_source_id, new_claim_id, superseded_claim_ids,
         prosecutor_argument, defender_argument, judge_reasoning, evidence_assessment,
         validation_error, original_proposed, pipeline, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, '1-opus', 'pending')
       ON CONFLICT DO NOTHING`,
      [
        correction.entity_id,
        correction.entity_type,
        correction.entity_name,
        correction.field,
        correction.current_value,
        correction.verdict,
        correction.proposed_value || null,
        correction.confidence,
        correction.attribution_type || null,
        winning_side,
        correction.source_url || null,
        correction.citation || null,
        correction.new_source_id || null,
        correction.new_claim_id || null,
        correction.superseded_claim_ids || null,
        null, // prosecutor_argument (single agent)
        null, // defender_argument (single agent)
        correction.reasoning || null, // maps to judge_reasoning
        correction.evidence_assessment ? JSON.stringify(correction.evidence_assessment) : null,
        correction.validation_error || null,
        correction.proposed_value || null, // original_proposed
      ],
    )
    return true
  } catch (err) {
    console.error(`    DB insert error: ${err.message}`)
    return false
  }
}

async function writeSourceAndClaim(correction) {
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

    // Upsert claim
    const beliefDimension = correction.field.replace('belief_', '')
    const claimId = `${correction.entity_id}_${beliefDimension}_${sourceId}`

    await pool.query(
      `INSERT INTO claim
        (claim_id, entity_id, entity_name, entity_type, belief_dimension,
         stance, citation, source_id, claim_type, confidence,
         extracted_by, extraction_model, extraction_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_DATE)
       ON CONFLICT (claim_id) DO UPDATE SET
         stance = EXCLUDED.stance,
         citation = EXCLUDED.citation,
         confidence = EXCLUDED.confidence,
         extraction_date = CURRENT_DATE
       WHERE claim.manually_reviewed IS NOT TRUE`,
      [
        claimId,
        correction.entity_id,
        correction.entity_name,
        correction.entity_type,
        beliefDimension,
        correction.proposed_value || correction.current_value,
        correction.citation,
        sourceId,
        correction.attribution_type === 'first_person' ? 'direct_statement' : 'authored_position',
        correction.confidence,
        'beliefs-1-opus',
        'claude-opus-4.5',
      ],
    )

    // Store IDs on correction object for later reference
    correction.new_source_id = sourceId
    correction.new_claim_id = claimId

    return { success: true, sourceId, claimId }
  } catch (err) {
    // Tables might not exist yet - that's ok
    if (err.code === '42P01') {
      return { success: false, error: 'Tables not created yet' }
    }
    console.warn(`    Warning: Failed to write source/claim: ${err.message}`)
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

  // Start workers
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker())

  await Promise.all(workers)
  return results
}

// ── Database Queries ──

function getClaimDimension(field) {
  const dimensionMap = {
    belief_regulatory_stance: 'regulatory_stance',
    belief_regulatory_stance_detail: 'regulatory_stance',
    belief_evidence_source: null,
    belief_agi_timeline: 'agi_timeline',
    belief_ai_risk: 'ai_risk_level',
    belief_threat_models: 'threat_models',
  }
  return dimensionMap[field] ?? field.replace('belief_', '')
}

async function getExistingClaims(entityId) {
  // Get ALL claims for the entity (single query for efficiency)
  try {
    const result = await pool.query(
      `SELECT
         c.claim_id,
         c.belief_dimension,
         c.stance,
         c.citation,
         c.source_id,
         c.confidence,
         c.extraction_date,
         c.claim_type,
         s.url as source_url,
         s.title as source_title,
         s.source_type,
         s.date_published as source_date,
         s.cached_excerpt
       FROM claim c
       LEFT JOIN source s ON c.source_id = s.source_id
       WHERE c.entity_id = $1
       ORDER BY c.belief_dimension, c.confidence DESC`,
      [entityId],
    )
    return result.rows
  } catch (err) {
    if (err.code === '42P01') return []
    throw err
  }
}

async function getEntitiesWithBeliefs(options = {}) {
  const { limit: queryLimit, entityId, idRange: range } = options

  let query = `
    SELECT id, entity_type, name, category,
           belief_regulatory_stance, belief_regulatory_stance_detail,
           belief_evidence_source, belief_agi_timeline, belief_ai_risk,
           belief_threat_models, field_verification
    FROM entity
    WHERE status = 'approved'
      AND (
        belief_regulatory_stance IS NOT NULL
        OR belief_agi_timeline IS NOT NULL
        OR belief_ai_risk IS NOT NULL
        OR belief_threat_models IS NOT NULL
      )
  `

  const params = []
  let paramIndex = 1

  if (entityId) {
    query += ` AND id = $${paramIndex}`
    params.push(parseInt(entityId))
    paramIndex++
  }

  if (range && range.length === 2) {
    query += ` AND id >= $${paramIndex} AND id <= $${paramIndex + 1}`
    params.push(range[0], range[1])
    paramIndex += 2
  }

  query += ` ORDER BY id`

  if (queryLimit && !entityId) {
    query += ` LIMIT $${paramIndex}`
    params.push(queryLimit)
  }

  const result = await pool.query(query, params)
  return result.rows
}

// ── Format Existing Sources ──

function formatExistingSourcesAsSearchResults(claims) {
  if (!claims || claims.length === 0) return null

  const withUrls = claims.filter((c) => c.source_url)
  if (withUrls.length === 0) return null

  return withUrls.map((c) => ({
    url: c.source_url,
    title: c.source_title || 'Untitled',
    text: c.cached_excerpt || c.citation || '',
    publishedDate: c.source_date || null,
    belief_dimension: c.belief_dimension,
    stance: c.stance,
  }))
}

// ── Main Verification ──

async function verifyEntity(entity) {
  console.log(`\n${'='.repeat(50)}`)
  console.log(`[${entity.id}] ${entity.name} (${entity.entity_type})`)
  console.log('='.repeat(50))

  // Get all fields to verify
  const fieldsConfig = BELIEF_FIELDS[entity.entity_type] || BELIEF_FIELDS.person
  const fieldsToVerify = fieldsConfig.filter((f) => entity[f] !== null && entity[f] !== undefined)

  if (fieldsToVerify.length === 0) {
    console.log('  No fields to verify')
    return []
  }

  // Fetch existing claims once
  const existingClaims = await getExistingClaims(entity.id)
  console.log(`  Existing claims: ${existingClaims.length}`)

  // Format existing sources
  const initialSources = formatExistingSourcesAsSearchResults(existingClaims)

  // Build the fields list with values, valid options, and field-specific instructions
  const fieldsInfo = fieldsToVerify
    .map((field) => {
      const value = entity[field]
      const displayValue = typeof value === 'string' && value.length > 200 ? value.substring(0, 200) + '...' : value
      const fieldType = FIELD_TYPES[field] || 'enum'
      const validValues = BELIEF_ENUMS[field] || []

      let info = `- ${field}: "${displayValue}"`
      info += `\n    Field type: ${fieldType}`

      if (fieldType === 'text') {
        info += `\n    THIS IS A FREE-TEXT FIELD. Verify whether this text accurately summarizes the entity's position.
    - If accurate: verdict = confirm
    - If inaccurate or incomplete: verdict = correct, proposed_value = your improved summary
    - If no evidence supports any summary: verdict = remove`
      } else if (field === 'belief_evidence_source') {
        info += `\n    THIS IS AN EVIDENCE CLASSIFICATION FIELD. Determine whether the evidence type is correctly classified.
    - "Explicitly stated" = entity directly stated their views (first-person quotes, testimony, op-eds)
    - "Inferred" = third-party characterizations or analysis
    - "Inferred from actions" = deduced from behavior/decisions without explicit statements
    Valid values: ${validValues.join(', ')}`
      } else if (validValues.length > 0) {
        info += `\n    Valid values: ${validValues.join(', ')}`
      }
      return info
    })
    .join('\n\n')

  // Build user message
  let userMessage = `Verify the following entity:

ENTITY: ${entity.name}
TYPE: ${entity.entity_type}
ID: ${entity.id}

FIELDS TO VERIFY:
${fieldsInfo}
`

  if (initialSources && initialSources.length > 0) {
    userMessage += `
INITIAL SOURCES (evaluate these along with your search results):
${JSON.stringify(initialSources, null, 2)}
`
  }

  userMessage += `
Search for evidence and produce your per-field verdicts. Remember:
- Search for BOTH supporting AND contradicting evidence for each field
- A "correct" verdict requires first-person evidence
- Use the submit_verdicts tool when done
`

  // Run the agent
  console.log('  Running Opus agent with extended thinking...')

  const tools = [EXA_SEARCH_TOOL, FETCH_CONTENT_TOOL, SUBMIT_VERDICTS_TOOL]
  const messages = [{ role: 'user', content: userMessage }]

  let verdicts = null
  const maxTurns = 15
  const conversationTrace = []

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
      turn,
      usage: response.usage,
      stop_reason: response.stop_reason,
      tool_calls: [],
      text_blocks: [],
    }
    for (const block of response.content) {
      if (block.type === 'text') traceEntry.text_blocks.push(block.text.substring(0, 500))
      if (block.type === 'tool_use')
        traceEntry.tool_calls.push({ name: block.name, input_preview: JSON.stringify(block.input).substring(0, 300) })
    }
    conversationTrace.push(traceEntry)

    // Process tool calls
    const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use')

    if (response.stop_reason === 'end_turn' && toolUseBlocks.length === 0) {
      console.log('  Agent finished without submitting verdicts')
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
        console.log(`  ✓ Received ${verdicts.length} verdicts`)
        break
      }
    }

    if (verdicts) break

    // Continue conversation
    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })
  }

  if (!verdicts) {
    console.log('  ERROR: Agent did not submit verdicts')
    return {
      results: [
        {
          entity_id: entity.id,
          entity_name: entity.name,
          entity_type: entity.entity_type,
          verdict: 'error',
          reasoning: 'Agent did not submit verdicts',
        },
      ],
      trace: conversationTrace,
    }
  }

  // Process and validate verdicts
  const results = []
  for (const v of verdicts) {
    // Validate proposed value against field constraints
    if (v.verdict === 'correct' && v.proposed_value) {
      const validation = validateProposedValue(v.field, v.proposed_value)

      if (!validation.valid) {
        console.log(`    ⚠️ Validation failed for ${v.field}: ${validation.error}`)
        v.validation_error = validation.error
        v.original_proposed = v.proposed_value

        // If we have an auto-corrected value, use it
        if (validation.corrected) {
          console.log(`    📝 Auto-corrected to: "${validation.corrected}"`)
          v.proposed_value = validation.corrected
          v.validation_error = `Auto-corrected: ${validation.error}`
        }
      }
    }

    const result = {
      entity_id: entity.id,
      entity_name: entity.name,
      entity_type: entity.entity_type,
      ...v,
    }

    results.push(result)

    // Log verdict
    const icon = v.verdict === 'confirm' ? '✓' : v.verdict === 'correct' ? '→' : '✗'
    console.log(`    ${icon} ${v.field}: ${v.verdict} (${v.confidence})`)
    if (v.verdict === 'correct') {
      const displayProposed =
        v.proposed_value?.length > 50 ? v.proposed_value.substring(0, 50) + '...' : v.proposed_value
      console.log(`      Correction: "${displayProposed}"`)
    }
  }

  return { results, trace: conversationTrace }
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

  console.log('Belief Verification Pipeline — Single Opus Agent')
  console.log('='.repeat(50))

  // Parse options
  const resumeMode = flags.resume === true || flags.resume === 'true'
  const options = {
    entityId: flags.id,
    limit: flags.limit ? parseInt(flags.limit) : 10,
    idRange: flags['id-range'] ? flags['id-range'].split('-').map(Number) : null,
    writeDb: flags['write-db'] === true || flags['write-db'] === 'true',
    csvPath: flags.csv || null,
    parallel: flags.parallel ? parseInt(flags.parallel) : 1,
  }

  if (options.parallel > 1) {
    console.log(`Parallel execution: ${options.parallel} concurrent entities`)
  }

  // #5: Progress tracking with resume support
  const rangeTagForProgress = options.idRange ? `-${options.idRange[0]}-${options.idRange[1]}` : ''
  const progressPath = path.join(RESULTS_DIR, `progress${rangeTagForProgress}.json`)
  const progress = resumeMode
    ? (() => {
        try {
          return JSON.parse(fs.readFileSync(progressPath, 'utf-8'))
        } catch {
          return { completed: [], started_at: new Date().toISOString() }
        }
      })()
    : { completed: [], started_at: new Date().toISOString() }
  const completedSet = new Set(progress.completed)
  if (resumeMode && completedSet.size > 0) {
    console.log(`Resuming: ${completedSet.size} entities already completed`)
  }

  if (options.writeDb) {
    console.log('Database writes: ENABLED (corrections will be inserted to belief_correction table)')
  } else {
    console.log('Database writes: DISABLED (use --write-db to enable)')
  }

  // Pre-run backup before any DB mutations
  await runPreBackup(pool, { label: 'beliefs-1-opus', r2: true })

  // Fetch entities - either from CSV or database query
  let entities
  if (options.csvPath) {
    const csvIds = await loadEntitiesFromCsv(options.csvPath)
    // Fetch full entity data for these IDs
    const placeholders = csvIds.map((_, i) => `$${i + 1}`).join(',')
    const result = await pool.query(
      `SELECT id, entity_type, name, category,
              belief_regulatory_stance, belief_regulatory_stance_detail,
              belief_evidence_source, belief_agi_timeline, belief_ai_risk,
              belief_threat_models, field_verification
       FROM entity
       WHERE status = 'approved' AND id IN (${placeholders})
       ORDER BY id`,
      csvIds,
    )
    entities = result.rows
    console.log(`Found ${entities.length} entities from CSV (${csvIds.length - entities.length} not found/not approved)`)
  } else {
    entities = await getEntitiesWithBeliefs(options)
    console.log(`Found ${entities.length} entities to verify`)
  }

  const maxCost = flags['max-cost'] ? parseFloat(flags['max-cost']) : 500
  console.log(`Cost ceiling: $${maxCost}`)

  // #6: Deduplication — check for recent corrections before spending money
  let skippedDupes = 0
  if (!options.entityId) {
    const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const recent = await pool.query(
      `SELECT DISTINCT entity_id FROM belief_correction WHERE created_at > $1 AND status = 'pending'`,
      [recentCutoff],
    )
    const recentIds = new Set(recent.rows.map((r) => r.entity_id))
    const before = entities.length
    const filtered = entities.filter((e) => !recentIds.has(e.id))
    skippedDupes = before - filtered.length
    if (skippedDupes > 0) {
      console.log(`Skipping ${skippedDupes} entities with pending corrections from last 7 days`)
    }
    entities.length = 0
    entities.push(...filtered)
  }

  // #7: Per-range JSONL for parallel runners
  const rangeTag = options.idRange ? `-${options.idRange[0]}-${options.idRange[1]}` : ''
  const jsonlPath = path.join(RESULTS_DIR, `corrections${rangeTag}.jsonl`)
  const costLedgerPath = path.join(RESULTS_DIR, `cost-ledger${rangeTag}.jsonl`)

  const allResults = []
  const startTime = Date.now()

  let dbWriteCount = 0
  let dbWriteErrors = 0
  let processedCount = 0
  let errorCount = 0

  // Filter out already completed entities
  const entitiesToProcess = entities.filter((e) => !completedSet.has(e.id))
  console.log(`Entities to process: ${entitiesToProcess.length} (${entities.length - entitiesToProcess.length} already completed)`)

  // Process entity function (used for both sequential and parallel)
  async function processEntity(entity, index) {
    const entityStart = Date.now()

    try {
      const { results, trace } = await verifyEntity(entity)
      const entityMs = Date.now() - entityStart

      // Calculate cost from results (rough estimate based on trace)
      let inputTokens = 0
      let outputTokens = 0
      let exaCalls = 0
      for (const t of trace || []) {
        if (t.usage) {
          inputTokens += t.usage.input_tokens || 0
          outputTokens += t.usage.output_tokens || 0
        }
        exaCalls += (t.tool_calls || []).filter((tc) => tc.name.startsWith('exa')).length
      }
      const opusCost = (inputTokens * 15 + outputTokens * 75) / 1_000_000
      const exaCost = exaCalls * 0.008
      const entityCost = {
        opus_usd: opusCost,
        exa_usd: exaCost,
        total_usd: opusCost + exaCost,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        exa_calls: exaCalls,
      }

      return {
        success: true,
        entity,
        results,
        trace,
        entityCost,
        entityMs,
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

  // Process results (write to files, DB, etc.)
  async function saveResults(outcome) {
    const { entity, results, trace, entityCost, entityMs, error } = outcome

    if (outcome.success) {
      allResults.push(...results)

      // Track global costs
      costs.opus_input += entityCost.input_tokens
      costs.opus_output += entityCost.output_tokens
      costs.exa_searches += entityCost.exa_calls

      // Save per-entity result file with full trace
      const entityResult = {
        id: entity.id,
        name: entity.name,
        entity_type: entity.entity_type,
        verified_at: new Date().toISOString(),
        time_ms: entityMs,
        cost: entityCost,
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
          cost_usd: entityCost.total_usd,
          input_tokens: entityCost.input_tokens,
          output_tokens: entityCost.output_tokens,
          exa_calls: entityCost.exa_calls,
          time_ms: entityMs,
          fields: results.length,
          verdicts: results.map((r) => r.verdict),
          timestamp: new Date().toISOString(),
        }) + '\n',
      )

      // Write to JSONL
      for (const r of results) {
        fs.appendFileSync(jsonlPath, JSON.stringify(r) + '\n')

        if (options.writeDb) {
          await writeSourceAndClaim(r)
          const inserted = await insertCorrectionToDB(r)
          if (inserted) {
            dbWriteCount++
          } else {
            dbWriteErrors++
          }
        }
      }

      // Save progress
      progress.completed.push(entity.id)
      processedCount++
    } else {
      errorCount++
      allResults.push({
        entity_id: entity.id,
        entity_name: entity.name,
        verdict: 'error',
        reasoning: error,
      })

      // Append error to cost ledger
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
  }

  // Run either in parallel or sequential mode
  if (options.parallel > 1) {
    // Parallel execution
    console.log(`\nStarting parallel verification (${options.parallel} concurrent)...`)

    const outcomes = await runWithConcurrency(entitiesToProcess, options.parallel, processEntity)

    // Save all results sequentially (for file safety)
    for (const outcome of outcomes) {
      if (outcome && !outcome.error) {
        await saveResults(outcome)
      } else if (outcome?.error) {
        console.error(`  ERROR processing entity: ${outcome.error}`)
      }
    }

    // Save final progress
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2) + '\n')
  } else {
    // Sequential execution (original behavior)
    let consecutiveErrors = 0

    for (let i = 0; i < entitiesToProcess.length; i++) {
      const entity = entitiesToProcess[i]

      // Cost ceiling check
      const currentCost = costs.getSummary().total_cost_usd
      if (currentCost >= maxCost) {
        console.error(
          `\n  ABORTING: Cost ceiling reached ($${currentCost.toFixed(2)} >= $${maxCost}). ${i}/${entitiesToProcess.length} entities processed.`,
        )
        break
      }

      const outcome = await processEntity(entity, i)
      await saveResults(outcome)

      if (outcome.success) {
        consecutiveErrors = 0
        console.log(
          `  Cost: $${outcome.entityCost.total_usd.toFixed(3)} | Cumulative: $${costs.getSummary().total_cost_usd.toFixed(2)} | ${i + 1}/${entitiesToProcess.length}`,
        )
      } else {
        consecutiveErrors++
        console.error(`  ERROR: ${outcome.error}`)

        if (consecutiveErrors >= 3) {
          console.error('  ABORTING: 3 consecutive errors. Likely systemic issue.')
          break
        }
      }

      // Save progress after each entity
      fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2) + '\n')
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
  console.log(`Fields verified: ${allResults.length}`)
  console.log(`Time: ${(elapsed / 1000).toFixed(1)}s`)
  if (options.parallel > 1) {
    console.log(`Parallelism: ${options.parallel} concurrent`)
  }

  console.log(`\nVerdicts:`)
  const verdictCounts = {}
  for (const r of allResults) {
    verdictCounts[r.verdict] = (verdictCounts[r.verdict] || 0) + 1
  }
  for (const [v, count] of Object.entries(verdictCounts)) {
    console.log(`  ${v}: ${count}`)
  }

  console.log(`\nCosts:`)
  console.log(`  Opus: $${costSummary.opus_cost_usd.toFixed(4)}`)
  console.log(`  Exa: $${costSummary.exa_cost_usd.toFixed(4)}`)
  console.log(`  TOTAL: $${costSummary.total_cost_usd.toFixed(4)}`)

  if (options.writeDb) {
    console.log(`\nDatabase writes:`)
    console.log(`  Corrections inserted: ${dbWriteCount}`)
    if (dbWriteErrors > 0) {
      console.log(`  Errors: ${dbWriteErrors}`)
    }
  }

  // Write run stats
  const statsPath = path.join(__dirname, 'results/run-stats.json')
  fs.mkdirSync(path.dirname(statsPath), { recursive: true })
  fs.writeFileSync(
    statsPath,
    JSON.stringify(
      {
        run_started_at: new Date(startTime).toISOString(),
        run_ended_at: new Date().toISOString(),
        total_duration_ms: elapsed,
        entities_processed: processedCount,
        entities_with_errors: errorCount,
        fields_verified: allResults.length,
        parallelism: options.parallel,
        verdicts: verdictCounts,
        ...costSummary,
        db_writes: options.writeDb
          ? {
              enabled: true,
              corrections_inserted: dbWriteCount,
              errors: dbWriteErrors,
            }
          : { enabled: false },
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
