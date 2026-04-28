#!/usr/bin/env node
/**
 * Enrich existing edges with temporal data (start_date, end_date, amounts)
 *
 * Usage:
 *   node scripts/edge-enrichment/enrich-edges.js --limit=5
 *   node scripts/edge-enrichment/enrich-edges.js --all
 *   node scripts/edge-enrichment/enrich-edges.js --type=employer --limit=10
 */
import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import Exa from 'exa-js'
import { getConnections, closeConnections } from './lib/db.js'
import { registerSource } from './lib/source.js'
import { loadProgress, saveProgress, edgeKey } from './lib/progress.js'
import { costs } from './lib/costs.js'

const SCRIPT_NAME = 'enrich-edges'

const args = process.argv.slice(2)
const flags = {
  limit: parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1]) || null,
  all: args.includes('--all'),
  resume: args.includes('--resume'),
  dryRun: args.includes('--dry-run'),
  type: args.find((a) => a.startsWith('--type='))?.split('=')[1] || null,
}

if (!flags.all && !flags.limit) {
  console.log('Usage: node enrich-edges.js --limit=N or --all')
  console.log('Options: --dry-run, --resume, --type=employer|funder|founder|member|advisor')
  process.exit(1)
}

const anthropic = new Anthropic()
const exa = new Exa(process.env.EXA_API_KEY)

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

/**
 * Normalize date strings to valid Postgres date format
 */
function normalizeDate(dateStr) {
  if (!dateStr) return null
  const str = String(dateStr).trim()
  if (/^\d{4}$/.test(str)) return `${str}-01-01`
  if (/^\d{4}-\d{2}$/.test(str)) return `${str}-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  return null
}

// Search query templates by edge type
const SEARCH_TEMPLATES = {
  employer: (source, target) => `"${source}" "${target}" employment OR worked at OR joined OR left OR hired`,
  funder: (source, target) => `"${source}" "${target}" funding OR invested OR grant OR donated`,
  founder: (source, target) => `"${source}" founded OR co-founded "${target}"`,
  member: (source, target) => `"${source}" "${target}" member OR board OR advisory`,
  advisor: (source, target) => `"${source}" "${target}" advisor OR advises OR consulting`,
}

const EXTRACTION_PROMPT = `You are extracting temporal information about a relationship between two entities.

Relationship: {source_name} — {edge_type} — {target_name}

Extract the following if mentioned:
- start_date: When this relationship began (YYYY-MM-DD or YYYY-MM or YYYY)
- end_date: When this relationship ended (null if ongoing)
- role_title: Specific job title or role if mentioned
- amount_usd: Dollar amount if this is a funding relationship (number only)
- amount_note: Context about the amount ("seed round", "annual salary", etc.)
- citation: A verbatim quote from the source supporting these facts (1-2 sentences)
- source_url: The URL where you found this information
- confidence: "high" (explicit dates), "medium" (approximate), "low" (inferred)

IMPORTANT:
- Only extract information that is explicitly stated or clearly implied
- If no temporal information is found, return null for those fields
- The citation must be a VERBATIM quote from the text
- Return null for the whole result if nothing useful is found

Return JSON:
{
  "start_date": "2019-03" | null,
  "end_date": "2023-06-15" | null,
  "role_title": "Chief Scientist" | null,
  "amount_usd": 5000000 | null,
  "amount_note": "Series A" | null,
  "citation": "exact quote from source...",
  "source_url": "https://...",
  "confidence": "high" | "medium" | "low"
}

If nothing useful found, return:
null`

async function searchEdge(sourceName, targetName, edgeType) {
  const template = SEARCH_TEMPLATES[edgeType] || SEARCH_TEMPLATES.employer
  const query = template(sourceName, targetName)

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

async function extractTemporalData(sourceName, targetName, edgeType, searchResults) {
  if (!searchResults.length) return null

  const context = searchResults
    .map((r, i) => `--- Source ${i + 1}: ${r.url} ---\n${r.text || r.highlight || ''}`)
    .join('\n\n')

  const prompt = EXTRACTION_PROMPT.replace('{source_name}', sourceName)
    .replace('{target_name}', targetName)
    .replace('{edge_type}', edgeType)

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nSearch results:\n${context}`,
        },
      ],
    })

    costs.trackClaude(response.usage)

    const text = response.content[0].text.trim()
    if (text === 'null' || text === '{}') return null

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      // Validate we got something useful
      if (parsed.citation && parsed.source_url) {
        return parsed
      }
    }
    return null
  } catch (err) {
    console.error(`  Claude error: ${err.message}`)
    return null
  }
}

async function processEdge(edge, neon, dryRun) {
  console.log(`\nProcessing: ${edge.source_name} —[${edge.edge_type}]→ ${edge.target_name}`)

  const searchResults = await searchEdge(edge.source_name, edge.target_name, edge.edge_type)
  console.log(`  Found ${searchResults.length} search results`)

  if (searchResults.length === 0) {
    return false
  }

  const extraction = await extractTemporalData(edge.source_name, edge.target_name, edge.edge_type, searchResults)

  if (!extraction) {
    console.log(`  No temporal data found`)
    return false
  }

  if (dryRun) {
    console.log(`  [DRY-RUN] Would save:`, extraction)
    return true
  }

  // Register source
  const sid = await registerSource(neon, {
    url: extraction.source_url,
    type: 'web',
    excerpt: extraction.citation,
  })

  // Write to edge_evidence
  const evidenceId = `${edge.id}_${sid}`
  await neon.query(
    `INSERT INTO edge_evidence (
      evidence_id, edge_id, source_id,
      start_date, end_date, amount_usd, amount_note, role_title,
      citation, confidence, extracted_by, extraction_model, extraction_date
    ) VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, $9, $10, $11, $12, CURRENT_DATE)
    ON CONFLICT (evidence_id) DO UPDATE SET
      start_date = COALESCE(EXCLUDED.start_date, edge_evidence.start_date),
      end_date = COALESCE(EXCLUDED.end_date, edge_evidence.end_date),
      amount_usd = COALESCE(EXCLUDED.amount_usd, edge_evidence.amount_usd)`,
    [
      evidenceId,
      edge.id,
      sid,
      normalizeDate(extraction.start_date),
      normalizeDate(extraction.end_date),
      extraction.amount_usd || null,
      extraction.amount_note || null,
      extraction.role_title || null,
      extraction.citation,
      extraction.confidence,
      SCRIPT_NAME,
      CLAUDE_MODEL,
    ]
  )

  console.log(`  ✓ Saved evidence: ${extraction.start_date || '?'} - ${extraction.end_date || 'present'}`)
  return true
}

async function main() {
  const startTime = Date.now()
  console.log('=== Edge Temporal Enrichment ===')
  console.log(`Options: limit=${flags.limit || 'all'}, type=${flags.type || 'all'}, dryRun=${flags.dryRun}`)

  const { rds, neon } = await getConnections()
  console.log('Connected to databases')

  const progress = flags.resume ? loadProgress(SCRIPT_NAME) : { completed: [] }
  console.log(`Progress: ${progress.completed.length} edges already processed`)

  // Get edges with entity names
  let query = `
    SELECT
      e.id, e.source_id, e.target_id, e.edge_type,
      src.name as source_name,
      tgt.name as target_name
    FROM edge e
    JOIN entity src ON e.source_id = src.id
    JOIN entity tgt ON e.target_id = tgt.id
    WHERE 1=1
  `
  const params = []

  if (flags.type) {
    params.push(flags.type)
    query += ` AND e.edge_type = $${params.length}`
  }

  query += ` ORDER BY e.id`

  if (flags.limit) {
    params.push(flags.limit)
    query += ` LIMIT $${params.length}`
  }

  const edges = (await rds.query(query, params)).rows

  // Filter completed
  const toProcess = edges.filter((e) => !progress.completed.includes(edgeKey(e)))
  console.log(`Processing ${toProcess.length} edges (${edges.length - toProcess.length} skipped)`)

  let enrichedCount = 0

  for (let i = 0; i < toProcess.length; i++) {
    const edge = toProcess[i]

    try {
      const enriched = await processEdge(edge, neon, flags.dryRun)
      if (enriched) enrichedCount++

      if (!flags.dryRun) {
        progress.completed.push(edgeKey(edge))
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
  console.log(`Edges processed: ${toProcess.length}`)
  console.log(`Edges enriched: ${enrichedCount}`)
  console.log(`Time: ${elapsed}s (${(elapsed / Math.max(toProcess.length, 1)).toFixed(2)}s/edge)`)
  console.log(costs.summary())

  await closeConnections()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
