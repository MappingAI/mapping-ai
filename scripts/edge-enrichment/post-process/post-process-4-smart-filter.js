#!/usr/bin/env node
/**
 * Post-processing Step 4: Smart filter for single-occurrence entities
 *
 * Uses Exa search + Claude to classify single-occurrence entities as:
 * - real_entity: Verified real organization/person (keep)
 * - noise: Generic term, vague phrase, not a real entity (reject)
 * - needs_review: Ambiguous, needs human review
 * - ai_irrelevant: Real entity but not AI-related (reject for this project)
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process-4-smart-filter.js --dry-run --limit 10
 *   node scripts/edge-enrichment/post-process-4-smart-filter.js --apply --limit 100
 *   node scripts/edge-enrichment/post-process-4-smart-filter.js --apply --all --resume
 */
import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import Exa from 'exa-js'
import pg from 'pg'
import fs from 'fs'

const anthropic = new Anthropic()
const exa = new Exa(process.env.EXA_API_KEY)

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'
const PROGRESS_FILE = 'data/edge-enrichment/smart-filter-progress.json'
const LOG_FILE = 'data/edge-enrichment/smart-filter.log'

// Pre-filter: obvious noise patterns (skip API calls for these)
const OBVIOUS_NOISE_PATTERNS = [
  /^(unknown|unspecified|various|multiple|several|other|misc)/i,
  /^(the |a |an )[a-z]/i,  // "the government", "a foundation" (but not "The Rockefeller Foundation")
  /(unspecified|various|multiple|several|unknown)$/i,
  /^(investors|donors|funders|backers|supporters|members|partners)$/i,
  /^(private|public|federal|state|local) (sector|government|investors)$/i,
  /^(wealthy|rich|anonymous|individual) /i,
  /\(various\)/i,
  /\(unspecified\)/i,
]

// Pre-filter: patterns that suggest real entities (skip to keep)
const LIKELY_REAL_PATTERNS = [
  / (Inc|LLC|Corp|Ltd|Foundation|Fund|Institute|University|College|Ventures|Capital|Partners)\.?$/i,
  / (GmbH|AG|SA|BV|PLC)$/i,
  /^[A-Z][a-z]+ [A-Z][a-z]+ (Foundation|Fund|Institute)$/,  // "John Smith Foundation"
]

function log(message) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${message}`
  console.log(message)
  fs.appendFileSync(LOG_FILE, line + '\n')
}

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
  } catch {
    return { completed: [], stats: { real_entity: 0, noise: 0, needs_review: 0, ai_irrelevant: 0, skipped_obvious: 0 } }
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

function preFilter(name) {
  // Check obvious noise
  for (const pattern of OBVIOUS_NOISE_PATTERNS) {
    if (pattern.test(name)) {
      return { decision: 'noise', reason: 'obvious_pattern' }
    }
  }

  // Check if too long (likely a description, not a name)
  if (name.length > 100) {
    return { decision: 'noise', reason: 'too_long' }
  }

  // Check likely real patterns
  for (const pattern of LIKELY_REAL_PATTERNS) {
    if (pattern.test(name)) {
      return { decision: 'likely_real', reason: 'name_pattern' }
    }
  }

  return { decision: 'needs_api', reason: null }
}

async function searchEntity(name) {
  try {
    const results = await exa.search(name, {
      numResults: 3,
      type: 'neural',
      useAutoprompt: true,
    })
    return results.results || []
  } catch (error) {
    log(`  Exa error for "${name}": ${error.message}`)
    return []
  }
}

async function classifyEntity(name, searchResults, context) {
  const searchContext = searchResults.length > 0
    ? searchResults.map(r => `- ${r.title}: ${r.url}`).join('\n')
    : 'No search results found.'

  const prompt = `You are classifying entity names discovered during AI policy research funding analysis.

Entity name: "${name}"

Context from funding data:
${context}

Web search results:
${searchContext}

Classify this entity into ONE of these categories:

1. **real_entity** - This is a real, identifiable organization, company, fund, foundation, government agency, or person that could plausibly be involved in funding or receiving funds. Examples: "Sequoia Capital", "MacArthur Foundation", "Peter Thiel", "DARPA"

2. **noise** - This is NOT a real entity. It's a generic term, vague description, placeholder, or error. Examples: "investors", "federal government", "AI programs", "various donors", "U.S. operations", "wealthy backers"

3. **ai_irrelevant** - This IS a real entity but has NO connection to AI, tech, policy, science, or related fields. Examples: "Brooklyn Academy of Music", "National Restaurant Association", "Professional Golfers Association"

4. **needs_review** - Ambiguous. Could be real or noise, can't determine from available information.

Respond with ONLY a JSON object:
{
  "classification": "real_entity|noise|ai_irrelevant|needs_review",
  "confidence": "high|medium|low",
  "reasoning": "Brief explanation (1 sentence)"
}

Important guidelines:
- Government agencies (DOE, NSF, DARPA) are real_entity, not noise
- VCs, foundations, and funds are real_entity
- "X administration" or "X government" without specifics is noise
- Generic terms like "private investors" or "tech companies" are noise
- If it's a real entity that COULD fund or do AI work, it's real_entity (don't over-filter)
- When in doubt between real_entity and ai_irrelevant, prefer real_entity`

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content[0].text.trim()
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return { classification: 'needs_review', confidence: 'low', reasoning: 'Failed to parse response' }
  } catch (error) {
    log(`  Claude error for "${name}": ${error.message}`)
    return { classification: 'needs_review', confidence: 'low', reasoning: `API error: ${error.message}` }
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const apply = process.argv.includes('--apply')
  const resume = process.argv.includes('--resume')
  const all = process.argv.includes('--all')

  const limitArg = process.argv.find(a => a.startsWith('--limit'))
  const limit = limitArg ? parseInt(process.argv[process.argv.indexOf(limitArg) + 1]) || 50 : 50

  if (!dryRun && !apply) {
    console.log('Usage:')
    console.log('  --dry-run    Show classifications without making changes')
    console.log('  --apply      Apply classifications to database')
    console.log('  --limit N    Process N entities (default 50)')
    console.log('  --all        Process all single-occurrence entities')
    console.log('  --resume     Resume from last progress')
    process.exit(1)
  }

  log(`=== SMART FILTER: Single-Occurrence Entities ===`)
  log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING'}`)
  log(`Limit: ${all ? 'ALL' : limit}`)
  log(`Resume: ${resume}`)

  const progress = resume ? loadProgress() : { completed: [], stats: { real_entity: 0, noise: 0, needs_review: 0, ai_irrelevant: 0, skipped_obvious: 0 } }
  const completedSet = new Set(progress.completed)

  // Get single-occurrence entities
  const query = `
    SELECT s.suggestion_id, s.extracted_name,
           d.source_entity_name, d.target_entity_name, d.amount_usd, d.citation
    FROM entity_suggestion s
    LEFT JOIN edge_discovery d ON s.suggestion_id = d.source_suggestion_id OR s.suggestion_id = d.target_suggestion_id
    WHERE s.times_seen = 1 AND s.status = 'pending'
    ORDER BY s.suggestion_id
    ${all ? '' : `LIMIT ${limit * 2}`}
  `

  const result = await neon.query(query)

  // Group by suggestion_id and take context from first edge
  const entities = new Map()
  for (const row of result.rows) {
    if (!entities.has(row.suggestion_id)) {
      entities.set(row.suggestion_id, {
        suggestion_id: row.suggestion_id,
        name: row.extracted_name,
        context: row.citation ? row.citation.substring(0, 200) : '',
        amount: row.amount_usd
      })
    }
  }

  let processed = 0
  let apiCalls = 0
  const startTime = Date.now()

  for (const [suggestionId, entity] of entities) {
    if (completedSet.has(suggestionId)) continue
    if (!all && processed >= limit) break

    log(`\nProcessing: "${entity.name}"`)

    // Pre-filter first
    const preResult = preFilter(entity.name)

    let classification, confidence, reasoning

    if (preResult.decision === 'noise') {
      classification = 'noise'
      confidence = 'high'
      reasoning = `Pre-filter: ${preResult.reason}`
      progress.stats.skipped_obvious++
      log(`  Pre-filter → noise (${preResult.reason})`)
    } else if (preResult.decision === 'likely_real') {
      classification = 'real_entity'
      confidence = 'medium'
      reasoning = `Pre-filter: ${preResult.reason}`
      log(`  Pre-filter → likely_real (${preResult.reason})`)
    } else {
      // Need API calls
      log(`  Searching...`)
      const searchResults = await searchEntity(entity.name)
      log(`  Found ${searchResults.length} results`)

      log(`  Classifying...`)
      const result = await classifyEntity(entity.name, searchResults, entity.context || 'No context available')
      classification = result.classification
      confidence = result.confidence
      reasoning = result.reasoning
      apiCalls++

      log(`  → ${classification} (${confidence}): ${reasoning}`)
    }

    progress.stats[classification]++

    if (!dryRun) {
      // Update the entity suggestion status
      if (classification === 'noise' || classification === 'ai_irrelevant') {
        await neon.query(`
          UPDATE entity_suggestion
          SET status = 'rejected',
              rejection_reason = $1
          WHERE suggestion_id = $2
        `, [`smart_filter:${classification}:${reasoning}`, suggestionId])

        // Also reject associated edge discoveries
        await neon.query(`
          UPDATE edge_discovery
          SET status = 'rejected'
          WHERE (source_suggestion_id = $1 OR target_suggestion_id = $1)
            AND status = 'pending_entities'
        `, [suggestionId])
      } else if (classification === 'real_entity') {
        // Mark as verified for future processing
        await neon.query(`
          UPDATE entity_suggestion
          SET status = 'verified_single',
              verification_note = $1
          WHERE suggestion_id = $2
        `, [`smart_filter:${confidence}:${reasoning}`, suggestionId])
      }
      // needs_review stays as 'pending'
    }

    progress.completed.push(suggestionId)
    completedSet.add(suggestionId)
    processed++

    // Save progress periodically
    if (processed % 10 === 0) {
      saveProgress(progress)
      const elapsed = (Date.now() - startTime) / 1000
      const rate = processed / elapsed
      log(`  Progress: ${processed} processed, ${apiCalls} API calls, ${rate.toFixed(1)}/sec`)
    }

    // Small delay to avoid rate limits
    if (apiCalls > 0 && apiCalls % 5 === 0) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  saveProgress(progress)

  const elapsed = (Date.now() - startTime) / 1000
  const exaCost = apiCalls * 0.008
  const claudeCost = apiCalls * 0.01  // Rough estimate for small requests

  log(`\n=== SUMMARY ===`)
  log(`Processed: ${processed}`)
  log(`API calls: ${apiCalls}`)
  log(`Time: ${elapsed.toFixed(1)}s`)
  log(`Est. cost: $${(exaCost + claudeCost).toFixed(2)} (Exa: $${exaCost.toFixed(2)}, Claude: $${claudeCost.toFixed(2)})`)
  log(``)
  log(`Classifications:`)
  log(`  real_entity: ${progress.stats.real_entity}`)
  log(`  noise: ${progress.stats.noise}`)
  log(`  ai_irrelevant: ${progress.stats.ai_irrelevant}`)
  log(`  needs_review: ${progress.stats.needs_review}`)
  log(`  skipped (obvious patterns): ${progress.stats.skipped_obvious}`)

  if (dryRun) {
    log(`\nRun with --apply to execute these classifications.`)
  }

  await neon.end()
}

main().catch(console.error)
