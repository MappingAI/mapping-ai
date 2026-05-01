#!/usr/bin/env node
/**
 * Discover funding relationships for all entities (people + orgs)
 *
 * Usage:
 *   node scripts/edge-enrichment/discover-funding.js --limit=3
 *   node scripts/edge-enrichment/discover-funding.js --all
 *   node scripts/edge-enrichment/discover-funding.js --type=organization --limit=10
 *   node scripts/edge-enrichment/discover-funding.js --dry-run --limit=3
 */
import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import Exa from 'exa-js'
import { getConnections, closeConnections } from './lib/db.js'
import { resolveEntity, loadEntityCache, createOrUpdateSuggestion, suggestionId } from './lib/entity-resolution.js'
import { registerSource, srcId } from './lib/source.js'
import { loadProgress, saveProgress } from './lib/progress.js'
import { costs } from './lib/costs.js'

const SCRIPT_NAME = 'discover-funding'

// Parse CLI args
const args = process.argv.slice(2)
const flags = {
  limit: parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1]) || null,
  all: args.includes('--all'),
  resume: args.includes('--resume'),
  dryRun: args.includes('--dry-run'),
  type: args.find((a) => a.startsWith('--type='))?.split('=')[1] || null,
}

if (!flags.all && !flags.limit) {
  console.log('Usage: node discover-funding.js --limit=N or --all')
  console.log('Options: --dry-run, --resume, --type=person|organization')
  process.exit(1)
}

const anthropic = new Anthropic()
const exa = new Exa(process.env.EXA_API_KEY)

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

/**
 * Normalize date strings to valid Postgres date format
 * Accepts: "2019", "2019-03", "2019-03-15"
 * Returns: "2019-01-01", "2019-03-01", "2019-03-15" or null
 */
function normalizeDate(dateStr) {
  if (!dateStr) return null
  const str = String(dateStr).trim()
  if (/^\d{4}$/.test(str)) return `${str}-01-01`
  if (/^\d{4}-\d{2}$/.test(str)) return `${str}-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  return null // Invalid format
}

const EXTRACTION_PROMPT = `You are extracting AI-RELATED funding relationships from search results about a specific entity.

For the entity provided, extract funding relationships where:
1. The entity is the FUNDER (giving money), OR
2. The entity is the RECIPIENT (receiving money)

CRITICAL RULES:
- The searched entity MUST be either the funder OR recipient in every relationship
- Do NOT extract relationships between two OTHER entities mentioned in the text
- Only extract relationships related to AI, ML, technology, or policy

AI-RELATED includes:
✓ AI/ML companies, research labs, safety organizations
✓ Tech companies with AI divisions (Google, Microsoft, Amazon, Meta, Nvidia)
✓ AI policy think tanks, governance organizations
✓ Semiconductor/chip manufacturing (AI infrastructure)
✓ AI ethics, safety, alignment research
✓ Universities doing AI/ML/CS research
✓ Government AI programs (DARPA AI, NSF AI grants, CHIPS Act implementation)

NOT AI-RELATED (skip these):
✗ General philanthropy (global health, poverty, climate - unless AI-focused)
✗ Non-tech acquisitions or corporate activities
✗ Political campaign donations (unless specifically for AI policy organizations)
✗ Media/journalism funding (unless AI-focused publication)
✗ General education funding (unless AI/CS/ML programs)
✗ Biomedical/NIH grants (unless specifically AI/ML in healthcare)

For each relationship found, return:
- funder_name: The ACTUAL ORGANIZATION OR PERSON that provided the money
- recipient_name: The ACTUAL ORGANIZATION OR PERSON that received the money
- amount_usd: Dollar amount if stated (number only, no symbols)
- amount_note: Context about the amount ("Series A", "grant", "annual budget")
- start_date: When funding started (YYYY-MM-DD or YYYY-MM or YYYY)
- end_date: When funding ended (if applicable)
- citation: A verbatim quote from the source supporting this claim (1-2 sentences)
- source_url: The URL where you found this information
- confidence: "high" (explicit statement), "medium" (clear implication), "low" (uncertain)
- ai_relevance: Brief explanation of why this is AI-related (required)

CRITICAL - VALID FUNDERS/RECIPIENTS:
✓ Organizations: companies, foundations, nonprofits, universities, government agencies
✓ People: individuals, philanthropists, investors
✗ NOT valid: legislation (CHIPS Act), programs (BEAD Program), tax credits, "federal government", "private sector", generic terms
✗ NOT valid: Self-referential (funder = recipient)

Examples:
- "CHIPS Act funding" → funder should be "U.S. Department of Commerce" not "CHIPS Act"
- "government grant" → identify the specific agency (NSF, DARPA, NIH, etc.)
- "private investment" → only include if the specific investor is named

IMPORTANT:
- The searched entity MUST be either funder_name or recipient_name in every relationship
- Only extract relationships with clear evidence in the text
- Include the exact source URL for each relationship
- If no AI-related funding relationships involving the entity are found, return an empty array
- Do not invent or guess relationships
- The citation must be a VERBATIM quote from the text
- Skip relationships where funder = recipient (self-referential)
- Skip political donations, general philanthropy, and non-AI grants

Return JSON in this exact format:
{
  "entity_name": "the entity we searched for",
  "relationships": [
    {
      "funder_name": "...",
      "recipient_name": "...",
      "amount_usd": 5000000,
      "amount_note": "Series A funding",
      "start_date": "2023",
      "end_date": null,
      "citation": "verbatim quote from source...",
      "source_url": "https://...",
      "confidence": "high",
      "ai_relevance": "AI safety research funding"
    }
  ]
}

If no AI-related relationships found involving the entity, return:
{
  "entity_name": "...",
  "relationships": []
}`

async function searchFunding(entityName, entityType) {
  const typeContext = entityType === 'person' ? 'person individual' : 'organization company'
  const query = `"${entityName}" funding OR investment OR grant OR donation OR backed by OR funded by ${typeContext}`

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
    console.error(`  Exa error for "${entityName}": ${err.message}`)
    return []
  }
}

async function extractFundingFromResults(entityName, searchResults) {
  if (!searchResults.length) return { entity_name: entityName, relationships: [] }

  const context = searchResults
    .map((r, i) => `--- Source ${i + 1}: ${r.url} ---\n${r.text || r.highlight || ''}`)
    .join('\n\n')

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Entity to analyze: "${entityName}"\n\nSearch results:\n${context}\n\n${EXTRACTION_PROMPT}`,
        },
      ],
    })

    costs.trackClaude(response.usage)

    const text = response.content[0].text
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return { entity_name: entityName, relationships: [] }
  } catch (err) {
    console.error(`  Claude error for "${entityName}": ${err.message}`)
    return { entity_name: entityName, relationships: [] }
  }
}

async function processEntity(entity, rds, neon, entityCache, dryRun) {
  console.log(`\nProcessing: ${entity.name} (${entity.entity_type})`)

  // Search for funding relationships
  const searchResults = await searchFunding(entity.name, entity.entity_type)
  console.log(`  Found ${searchResults.length} search results`)

  if (searchResults.length === 0) {
    return { found: 0, existing: 0, new: 0, suggestions: 0 }
  }

  // Extract funding relationships
  const extraction = await extractFundingFromResults(entity.name, searchResults)
  console.log(`  Extracted ${extraction.relationships.length} relationships`)

  if (extraction.relationships.length === 0) {
    return { found: 0, existing: 0, new: 0, suggestions: 0 }
  }

  const stats = { found: extraction.relationships.length, existing: 0, new: 0, suggestions: 0 }

  // Filter out invalid/generic entity names
  const INVALID_NAMES = ['unknown', 'private sector', 'federal government', 'government', 'n/a', 'various', 'multiple', 'anonymous']
  const INVALID_PATTERNS = [
    /^unknown/i,
    /\(various\)/i,
    /^individual /i,
    /^anonymous /i,
    /^various /i,
    /^multiple /i,
    /^unnamed /i,
    /^undisclosed /i,
  ]

  // AI relevance keywords for validation
  const AI_KEYWORDS = /\b(ai|artificial intelligence|machine learning|ml|deep learning|neural|llm|gpt|transformer|nlp|computer vision|robotics|autonomous|semiconductor|chip|gpu|safety|alignment|governance|anthropic|openai|deepmind|meta ai|google ai|microsoft ai)\b/i

  for (const rel of extraction.relationships) {
    // Skip relationships with invalid funder/recipient names
    const funderLower = (rel.funder_name || '').toLowerCase().trim()
    const recipientLower = (rel.recipient_name || '').toLowerCase().trim()

    const isInvalidFunder = INVALID_NAMES.includes(funderLower) || INVALID_PATTERNS.some(p => p.test(rel.funder_name || ''))
    const isInvalidRecipient = INVALID_NAMES.includes(recipientLower) || INVALID_PATTERNS.some(p => p.test(rel.recipient_name || ''))

    if (isInvalidFunder || isInvalidRecipient) {
      console.log(`  ⊘ Skipped (generic name): ${rel.funder_name} → ${rel.recipient_name}`)
      continue
    }

    // VALIDATION 1: Entity must be involved (funder or recipient)
    const entityLower = entity.name.toLowerCase()
    const entityInvolved =
      funderLower.includes(entityLower) ||
      recipientLower.includes(entityLower) ||
      entityLower.includes(funderLower) ||
      entityLower.includes(recipientLower)

    if (!entityInvolved) {
      console.log(`  ⊘ Skipped (entity not involved): ${rel.funder_name} → ${rel.recipient_name}`)
      continue
    }

    // VALIDATION 2: No self-referential edges
    if (funderLower === recipientLower) {
      console.log(`  ⊘ Skipped (self-referential): ${rel.funder_name} → ${rel.recipient_name}`)
      continue
    }

    // VALIDATION 3: AI relevance check (if ai_relevance field missing or no keywords)
    const textToCheck = `${rel.funder_name} ${rel.recipient_name} ${rel.citation || ''} ${rel.ai_relevance || ''}`
    if (!AI_KEYWORDS.test(textToCheck)) {
      console.log(`  ⊘ Skipped (not AI-related): ${rel.funder_name} → ${rel.recipient_name}`)
      continue
    }

    if (dryRun) {
      console.log(`  [DRY-RUN] Would process: ${rel.funder_name} → ${rel.recipient_name}`)
      continue
    }

    // Register source
    const sid = await registerSource(neon, {
      url: rel.source_url,
      title: null,
      type: 'web',
      excerpt: rel.citation,
    })

    // Resolve funder
    const funderResolution = await resolveEntity(rel.funder_name, rds, neon, entityCache)
    const recipientResolution = await resolveEntity(rel.recipient_name, rds, neon, entityCache)

    const funderId = funderResolution?.id
    const recipientId = recipientResolution?.id

    // Check if edge already exists in RDS
    let edgeExists = false
    let existingEdgeId = null
    if (funderId && recipientId) {
      const existingEdge = await rds.query(
        `SELECT id FROM edge
         WHERE source_id = $1 AND target_id = $2 AND edge_type = 'funder'`,
        [funderId, recipientId]
      )
      if (existingEdge.rows.length > 0) {
        edgeExists = true
        existingEdgeId = existingEdge.rows[0].id
      }
    }

    if (edgeExists) {
      // Write to edge_evidence (enriching existing edge)
      const evidenceId = `${existingEdgeId}_${sid}`
      await neon.query(
        `INSERT INTO edge_evidence (
          evidence_id, edge_id, source_id,
          start_date, end_date, amount_usd, amount_note,
          citation, confidence, extracted_by, extraction_model, extraction_date
        ) VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, $9, $10, $11, CURRENT_DATE)
        ON CONFLICT (evidence_id) DO NOTHING`,
        [
          evidenceId,
          existingEdgeId,
          sid,
          normalizeDate(rel.start_date),
          normalizeDate(rel.end_date),
          rel.amount_usd || null,
          rel.amount_note || null,
          rel.citation,
          rel.confidence,
          SCRIPT_NAME,
          CLAUDE_MODEL,
        ]
      )
      console.log(`  ✓ Enriched existing edge ${existingEdgeId}: ${rel.funder_name} → ${rel.recipient_name}`)
      stats.existing++
    } else {
      // Handle unresolved entities by creating suggestions
      let funderSuggestionId = null
      let recipientSuggestionId = null

      if (!funderId) {
        funderSuggestionId = await createOrUpdateSuggestion(neon, rds, {
          extracted_name: rel.funder_name,
          entity_type: 'organization', // Most funders are orgs
          context: `Discovered as funder of ${rel.recipient_name}`,
          source_url: rel.source_url,
          source_id: sid,
          citation: rel.citation,
          seen_as_funder: true,
        })
        console.log(`  → Created entity suggestion: ${rel.funder_name}`)
        stats.suggestions++
      }

      if (!recipientId) {
        recipientSuggestionId = await createOrUpdateSuggestion(neon, rds, {
          extracted_name: rel.recipient_name,
          entity_type: 'organization',
          context: `Discovered as recipient of funding from ${rel.funder_name}`,
          source_url: rel.source_url,
          source_id: sid,
          citation: rel.citation,
          seen_as_recipient: true,
        })
        console.log(`  → Created entity suggestion: ${rel.recipient_name}`)
        stats.suggestions++
      }

      // Check if this edge already exists in edge_discovery (consolidate sources)
      // Match on funder, recipient, type, AND amount to avoid treating different funding rounds as duplicates
      const existingDiscovery = await neon.query(
        `SELECT discovery_id, source_id, sources_count
         FROM edge_discovery
         WHERE LOWER(source_entity_name) = LOWER($1)
           AND LOWER(target_entity_name) = LOWER($2)
           AND edge_type = 'funder'
           AND (amount_usd = $3 OR (amount_usd IS NULL AND $3 IS NULL))`,
        [rel.funder_name, rel.recipient_name, rel.amount_usd || null]
      )

      if (existingDiscovery.rows.length > 0) {
        // Edge already discovered - increment sources count
        const existing = existingDiscovery.rows[0]
        const newCount = (existing.sources_count || 1) + 1
        await neon.query(
          `UPDATE edge_discovery
           SET sources_count = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE discovery_id = $2`,
          [newCount, existing.discovery_id]
        )
        console.log(`  ≡ Consolidated source (${newCount} total): ${rel.funder_name} → ${rel.recipient_name}`)
        stats.existing++ // Count as existing since we're not creating a new row
        continue
      }

      // Write to edge_discovery (new edge pending review)
      const discoveryId = `${rel.funder_name}_${rel.recipient_name}_funder_${sid}`.slice(0, 200)

      // Determine status based on resolution
      let status = 'pending_entities'
      if (funderId && recipientId) {
        status = 'pending_review'
      }

      await neon.query(
        `INSERT INTO edge_discovery (
          discovery_id, source_entity_id, target_entity_id,
          source_suggestion_id, target_suggestion_id,
          edge_type, source_entity_name, target_entity_name,
          source_id, start_date, end_date, amount_usd, amount_note,
          citation, confidence, status, sources_count,
          extracted_by, extraction_model, extraction_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11::date, $12, $13, $14, $15, $16, 1, $17, $18, CURRENT_DATE)
        ON CONFLICT (source_entity_name, target_entity_name, edge_type, source_id) DO NOTHING`,
        [
          discoveryId,
          funderId || null,
          recipientId || null,
          funderSuggestionId,
          recipientSuggestionId,
          'funder',
          rel.funder_name,
          rel.recipient_name,
          sid,
          normalizeDate(rel.start_date),
          normalizeDate(rel.end_date),
          rel.amount_usd || null,
          rel.amount_note || null,
          rel.citation,
          rel.confidence,
          status,
          SCRIPT_NAME,
          CLAUDE_MODEL,
        ]
      )
      console.log(`  + New discovery: ${rel.funder_name} → ${rel.recipient_name} (${status})`)
      stats.new++
    }
  }

  return stats
}

async function main() {
  const startTime = Date.now()
  console.log('=== Funding Discovery ===')
  console.log(`Options: limit=${flags.limit || 'all'}, type=${flags.type || 'all'}, dryRun=${flags.dryRun}`)

  const { rds, neon } = await getConnections()
  console.log('Connected to databases')

  // Load progress if resuming
  const progress = flags.resume ? loadProgress(SCRIPT_NAME) : { completed: [] }
  console.log(`Progress: ${progress.completed.length} entities already processed`)

  // Load entity cache for faster resolution
  const entityCache = await loadEntityCache(rds)
  console.log(`Loaded ${entityCache.length} entities into cache`)

  // Get entities to process
  let query = `
    SELECT id, name, entity_type
    FROM entity
    WHERE status = 'approved'
      AND entity_type IN ('person', 'organization')
  `
  const params = []

  if (flags.type) {
    query += ` AND entity_type = $1`
    params.push(flags.type)
  }

  query += ` ORDER BY id`

  if (flags.limit) {
    query += ` LIMIT $${params.length + 1}`
    params.push(flags.limit)
  }

  const entities = (await rds.query(query, params)).rows

  // Filter out already completed
  const toProcess = entities.filter((e) => !progress.completed.includes(e.id))
  console.log(`Processing ${toProcess.length} entities (${entities.length - toProcess.length} skipped)`)

  // Process entities
  const totals = { found: 0, existing: 0, new: 0, suggestions: 0 }

  for (let i = 0; i < toProcess.length; i++) {
    const entity = toProcess[i]

    try {
      const stats = await processEntity(entity, rds, neon, entityCache, flags.dryRun)
      totals.found += stats.found
      totals.existing += stats.existing
      totals.new += stats.new
      totals.suggestions += stats.suggestions

      // Save progress
      if (!flags.dryRun) {
        progress.completed.push(entity.id)
        saveProgress(SCRIPT_NAME, progress)
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}`)
    }

    // Progress update
    if ((i + 1) % 10 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${toProcess.length} ---`)
      console.log(costs.summary())
    }
  }

  // Final summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('\n=== Summary ===')
  console.log(`Entities processed: ${toProcess.length}`)
  console.log(`Relationships found: ${totals.found}`)
  console.log(`  - Enriched existing: ${totals.existing}`)
  console.log(`  - New discoveries: ${totals.new}`)
  console.log(`  - Entity suggestions: ${totals.suggestions}`)
  console.log(`Time: ${elapsed}s (${(elapsed / Math.max(toProcess.length, 1)).toFixed(2)}s/entity)`)
  console.log(costs.summary())

  await closeConnections()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
