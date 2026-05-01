#!/usr/bin/env node
/**
 * Create Skeleton Entities in RDS
 *
 * ANTI-HALLUCINATION DESIGN (following Connor/Anushree patterns):
 * - Every classification must be grounded in Exa search results
 * - Explicit "INSUFFICIENT_DATA" when sources are thin
 * - Confidence scores for type classification
 * - Only creates entities with confidence >= 3
 * - Strict requirements: entity must SHAPE AI ecosystem (not just use it)
 *
 * Process:
 * 1. Extract unique unmatched entity names from edge_discovery
 * 2. For each entity, search Exa for verification
 * 3. Use Claude to classify type (person/organization) based ONLY on sources
 * 4. Create skeleton in RDS with status='pending'
 * 5. Update edge_discovery with new entity IDs
 *
 * Usage:
 *   node scripts/edge-enrichment/create-skeleton-entities.js --dry-run --limit=5
 *   node scripts/edge-enrichment/create-skeleton-entities.js --limit=10
 *   node scripts/edge-enrichment/create-skeleton-entities.js --all
 *   node scripts/edge-enrichment/create-skeleton-entities.js --name="OpenAI"
 */
import 'dotenv/config'
import pg from 'pg'
import Exa from 'exa-js'
import Anthropic from '@anthropic-ai/sdk'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

const rds = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const exa = new Exa(process.env.EXA_API_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Parse CLI args
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null
const allMode = args.includes('--all')
const nameArg = args.find(a => a.startsWith('--name='))
const singleName = nameArg ? nameArg.split('=')[1].replace(/^["']|["']$/g, '') : null
const minConfidence = 3

// Cost tracking
const costs = {
  exa_searches: 0,
  claude_calls: 0,
  claude_input_tokens: 0,
  claude_output_tokens: 0,
  get exa_cost() { return this.exa_searches * 0.008 },
  get claude_cost() {
    return (this.claude_input_tokens / 1_000_000) * 3 + (this.claude_output_tokens / 1_000_000) * 15
  },
  get total() { return this.exa_cost + this.claude_cost },
  summary() {
    return `Exa: ${this.exa_searches} searches ($${this.exa_cost.toFixed(3)}) | ` +
      `Claude: ${this.claude_calls} calls ($${this.claude_cost.toFixed(3)}) | ` +
      `Total: $${this.total.toFixed(3)}`
  }
}

// Valid categories
const PERSON_CATEGORIES = [
  'Executive', 'Researcher', 'Policymaker', 'Investor', 'Organizer',
  'Journalist', 'Academic', 'Cultural figure'
]

const ORG_CATEGORIES = [
  'Frontier Lab', 'AI Safety/Alignment', 'Think Tank/Policy Org', 'Government/Agency',
  'Academic', 'VC/Capital/Philanthropy', 'Labor/Civil Society', 'Ethics/Bias/Rights',
  'Media/Journalism', 'Political Campaign/PAC', 'Infrastructure & Compute', 'Deployers & Platforms'
]

// ═══════════════════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function searchExa(query, numResults = 5) {
  await new Promise(r => setTimeout(r, 200)) // Rate limit
  costs.exa_searches++
  try {
    const res = await exa.searchAndContents(query, {
      type: 'auto',
      numResults,
      highlights: { numSentences: 5, highlightsPerUrl: 3 }
    })
    return res.results
  } catch (err) {
    console.log(`    Exa error: ${err.message}`)
    return []
  }
}

async function askClaude(prompt) {
  await new Promise(r => setTimeout(r, 100)) // Rate limit
  costs.claude_calls++
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  })
  costs.claude_input_tokens += msg.usage.input_tokens
  costs.claude_output_tokens += msg.usage.output_tokens
  return msg.content[0].text
}

// ═══════════════════════════════════════════════════════════════════════════
// ANTI-HALLUCINATION PROMPT
// ═══════════════════════════════════════════════════════════════════════════

function buildClassificationPrompt(entityName, searchResults) {
  const sourcesText = searchResults.map((r, i) => {
    const highlights = (r.highlights || []).slice(0, 3).join('\n')
    return `=== SOURCE [${i + 1}] ===\nURL: ${r.url}\nTitle: ${r.title || 'N/A'}\n\n${highlights}`
  }).join('\n\n')

  return `You are classifying an entity for a database mapping the US AI POLICY ECOSYSTEM.

## ENTITY NAME
"${entityName}"

## SEARCH RESULTS
${sourcesText || 'NO SEARCH RESULTS FOUND'}

═══════════════════════════════════════════════════════════════════════════════
## STRICT RULES - VIOLATION = FAILURE

1. ONLY use information that appears in the sources above
2. If the entity cannot be verified from sources, return status: "INSUFFICIENT_DATA"
3. DO NOT use any knowledge about this entity beyond what's in the sources
4. DO NOT guess or infer - if unclear, return INSUFFICIENT_DATA

## THE KEY DISTINCTION
SHAPES AI ECOSYSTEM = researches AI, builds AI, funds AI, regulates AI, advocates about AI, reports on AI, organizes around AI issues
USES AI = company/person that uses AI tools as a customer (e.g., retailers using AI, hospitals using AI diagnostics)

We want entities who SHAPE the ecosystem, not those who merely USE AI.
If the sources only show they USE AI (not shape it), return shapes_ai_ecosystem: false

## ENTITY TYPE RULES
- "person" = individual human being (researcher, executive, policymaker, etc.)
- "organization" = company, nonprofit, government agency, university, fund, institute, etc.
- Look for pronouns (he/she/they vs it), job titles, founding dates, employee counts

## CATEGORY RULES
For PERSON: ${PERSON_CATEGORIES.join(' | ')}
For ORGANIZATION: ${ORG_CATEGORIES.join(' | ')}
═══════════════════════════════════════════════════════════════════════════════

Return this exact JSON structure:

{
  "status": "SUCCESS" | "INSUFFICIENT_DATA",

  "entity_exists": true | false,
  "entity_type": "person" | "organization" | null,
  "category": "<category from list above or null>",

  "shapes_ai_ecosystem": true | false,
  "ai_relevance_quote": "<Copy EXACT text from source proving AI involvement, or null>",

  "confidence": <1-5>,
  "confidence_reasoning": "<Why this confidence level? How many sources? How clear?>",

  "source_quote": "<Copy EXACT text from source that identifies the entity type>"
}

## CONFIDENCE SCALE (be conservative):
5 = Entity clearly identified in 2+ sources with type obvious
4 = Entity clearly identified in 1 reliable source
3 = Entity found but type somewhat unclear
2 = Weak evidence, significant uncertainty
1 = Minimal evidence, mostly guessing

Return ONLY valid JSON. No other text.`
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LOGIC
// ═══════════════════════════════════════════════════════════════════════════

async function classifyEntity(entityName) {
  console.log(`\n  Searching Exa for "${entityName}"...`)

  // Search for the entity
  const results = await searchExa(`"${entityName}" AI`, 5)

  if (results.length === 0) {
    console.log(`    No search results found`)
    return {
      status: 'INSUFFICIENT_DATA',
      entity_exists: false,
      confidence: 0,
      confidence_reasoning: 'No search results found'
    }
  }

  console.log(`    Found ${results.length} results, classifying...`)

  // Ask Claude to classify
  const prompt = buildClassificationPrompt(entityName, results)
  const response = await askClaude(prompt)

  // Parse response
  try {
    const match = response.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found')
    return JSON.parse(match[0])
  } catch (err) {
    console.log(`    Parse error: ${err.message}`)
    return {
      status: 'PARSE_ERROR',
      confidence: 0,
      raw_response: response.substring(0, 200)
    }
  }
}

async function createSkeletonEntity(client, entityName, classification) {
  // Insert into RDS
  const result = await client.query(`
    INSERT INTO entity (
      name,
      entity_type,
      category,
      status,
      notes,
      notes_confidence,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, 'pending', $4, $5, NOW(), NOW())
    RETURNING id
  `, [
    entityName,
    classification.entity_type,
    classification.category,
    `Auto-created skeleton. AI relevance: ${classification.ai_relevance_quote || 'N/A'}`,
    classification.confidence
  ])

  return result.rows[0].id
}

async function updateEdgeDiscovery(entityName, entityId) {
  // Update source matches
  await neon.query(`
    UPDATE edge_discovery
    SET source_entity_id = $2, updated_at = NOW()
    WHERE status = 'pending_entities'
      AND LOWER(source_entity_name) = LOWER($1)
      AND source_entity_id IS NULL
  `, [entityName, entityId])

  // Update target matches
  await neon.query(`
    UPDATE edge_discovery
    SET target_entity_id = $2, updated_at = NOW()
    WHERE status = 'pending_entities'
      AND LOWER(target_entity_name) = LOWER($1)
      AND target_entity_id IS NULL
  `, [entityName, entityId])
}

async function main() {
  if (!limit && !allMode && !singleName) {
    console.log('Usage:')
    console.log('  --dry-run        Show what would be created')
    console.log('  --limit=N        Process N entities')
    console.log('  --all            Process all unmatched entities')
    console.log('  --name="X"       Process single entity by name')
    process.exit(1)
  }

  console.log('=== CREATE SKELETON ENTITIES ===')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'CREATING ENTITIES'}`)
  console.log(`Min confidence: ${minConfidence}`)
  if (limit) console.log(`Limit: ${limit}`)

  // Get unique unmatched entity names
  let query = `
    SELECT DISTINCT name, role FROM (
      SELECT source_entity_name as name, 'source' as role
      FROM edge_discovery
      WHERE status = 'pending_entities' AND source_entity_id IS NULL
      UNION
      SELECT target_entity_name as name, 'target' as role
      FROM edge_discovery
      WHERE status = 'pending_entities' AND target_entity_id IS NULL
    ) sub
    ORDER BY name
  `

  if (singleName) {
    query = `
      SELECT DISTINCT name, role FROM (
        SELECT source_entity_name as name, 'source' as role
        FROM edge_discovery
        WHERE status = 'pending_entities'
          AND source_entity_id IS NULL
          AND LOWER(source_entity_name) = LOWER('${singleName.replace(/'/g, "''")}')
        UNION
        SELECT target_entity_name as name, 'target' as role
        FROM edge_discovery
        WHERE status = 'pending_entities'
          AND target_entity_id IS NULL
          AND LOWER(target_entity_name) = LOWER('${singleName.replace(/'/g, "''")}')
      ) sub
    `
  }

  const entities = await neon.query(query)
  let toProcess = entities.rows

  if (limit && !singleName) {
    toProcess = toProcess.slice(0, limit)
  }

  console.log(`\nFound ${entities.rows.length} unique unmatched entities`)
  console.log(`Processing ${toProcess.length} entities\n`)

  // Stats
  let created = 0
  let skipped_insufficient = 0
  let skipped_not_ai = 0
  let skipped_low_confidence = 0
  let errors = 0

  const rdsClient = await rds.connect()

  try {
    for (const { name } of toProcess) {
      console.log(`\n[${created + skipped_insufficient + skipped_not_ai + skipped_low_confidence + errors + 1}/${toProcess.length}] ${name}`)

      const classification = await classifyEntity(name)

      // Check status
      if (classification.status === 'INSUFFICIENT_DATA' || !classification.entity_exists) {
        console.log(`  ⚠ INSUFFICIENT_DATA - skipping`)
        skipped_insufficient++
        continue
      }

      // Check AI relevance
      if (!classification.shapes_ai_ecosystem) {
        console.log(`  ⚠ Does not shape AI ecosystem - skipping`)
        skipped_not_ai++
        continue
      }

      // Check confidence
      if (classification.confidence < minConfidence) {
        console.log(`  ⚠ Low confidence (${classification.confidence}/${minConfidence}) - skipping`)
        skipped_low_confidence++
        continue
      }

      console.log(`  ✓ Type: ${classification.entity_type}, Category: ${classification.category}`)
      console.log(`    Confidence: ${classification.confidence}/5 - ${classification.confidence_reasoning}`)
      console.log(`    AI relevance: ${(classification.ai_relevance_quote || '').substring(0, 100)}...`)

      if (!dryRun) {
        try {
          // Create entity
          const newId = await createSkeletonEntity(rdsClient, name, classification)
          console.log(`    Created entity ID: ${newId}`)

          // Update edge_discovery
          await updateEdgeDiscovery(name, newId)
          console.log(`    Updated edge_discovery references`)

          created++
        } catch (err) {
          console.log(`    ERROR: ${err.message}`)
          errors++
        }
      } else {
        created++
      }
    }
  } finally {
    rdsClient.release()
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('=== SUMMARY ===')
  console.log(`Entities processed: ${toProcess.length}`)
  console.log(`Created: ${created}`)
  console.log(`Skipped (insufficient data): ${skipped_insufficient}`)
  console.log(`Skipped (not AI-related): ${skipped_not_ai}`)
  console.log(`Skipped (low confidence): ${skipped_low_confidence}`)
  console.log(`Errors: ${errors}`)
  console.log(`\n${costs.summary()}`)

  if (dryRun) {
    console.log('\nRun without --dry-run to create entities.')
  }

  await neon.end()
  await rds.end()
}

main().catch(console.error)
