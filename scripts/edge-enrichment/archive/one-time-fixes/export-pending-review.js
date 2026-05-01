import 'dotenv/config'
import pg from 'pg'
import fs from 'fs'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

const rds = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// Get entity names from RDS
const entities = await rds.query('SELECT id, name FROM entity')
const entityMap = new Map(entities.rows.map(e => [e.id, e.name]))

// Get source URLs
const sources = await neon.query('SELECT source_id, url FROM source')
const sourceMap = new Map(sources.rows.map(s => [s.source_id, s.url]))

// Get all pending_review edges (both entities matched)
const edges = await neon.query(`
  SELECT discovery_id, source_entity_name, target_entity_name,
         source_entity_id, target_entity_id,
         amount_usd, citation, source_id
  FROM edge_discovery
  WHERE status = 'pending_review'
  ORDER BY amount_usd DESC NULLS LAST
`)

console.log('Total pending_review edges:', edges.rows.length)

// Format for export
const exportData = edges.rows.map((e, i) => ({
  row: i + 1,
  source_extracted: e.source_entity_name,
  source_matched: entityMap.get(e.source_entity_id),
  source_id: e.source_entity_id,
  target_extracted: e.target_entity_name,
  target_matched: entityMap.get(e.target_entity_id),
  target_id: e.target_entity_id,
  amount_usd: e.amount_usd,
  amount_display: e.amount_usd ? '$' + (e.amount_usd >= 1e9 ? (e.amount_usd / 1e9).toFixed(1) + 'B' : (e.amount_usd / 1e6).toFixed(1) + 'M') : null,
  citation: e.citation,
  url: sourceMap.get(e.source_id) || null
}))

// Save as JSON
fs.writeFileSync('data/edge-enrichment/pending-review-edges.json', JSON.stringify(exportData, null, 2))
console.log('Saved to data/edge-enrichment/pending-review-edges.json')

// Also create a markdown format for Claude review
const mdLines = [
  '# Edge Discoveries: Pending Review',
  '',
  'Total: ' + exportData.length + ' edges',
  '',
  '## Instructions for Review',
  '',
  'For each edge, verify:',
  '1. Is the relationship AI-related? (funding AI research, AI companies, AI policy, etc.)',
  '2. Does the citation support the relationship?',
  '3. Are the entity matches correct?',
  '',
  'Mark as:',
  '- ✅ APPROVE - Valid AI-related funding relationship',
  '- ❌ REJECT - Not AI-related or incorrect',
  '- ⚠️ REVIEW - Needs human verification',
  '',
  '---',
  ''
]

for (const e of exportData) {
  const citation = (e.citation || '').replace(/\n/g, ' ').substring(0, 200)
  mdLines.push(`### ${e.row}. ${e.source_matched} → ${e.target_matched}`)
  mdLines.push('')
  mdLines.push(`**Amount:** ${e.amount_display || 'Not specified'}`)
  mdLines.push('')
  mdLines.push(`**Citation:** "${citation}..."`)
  mdLines.push('')
  if (e.url) {
    mdLines.push(`**Source:** ${e.url}`)
    mdLines.push('')
  }
  mdLines.push('**Verdict:** [ ]')
  mdLines.push('')
  mdLines.push('---')
  mdLines.push('')
}

fs.writeFileSync('data/edge-enrichment/pending-review-edges.md', mdLines.join('\n'))
console.log('Saved to data/edge-enrichment/pending-review-edges.md')

// Show sample
console.log('')
console.log('Sample (first 20):')
console.log('')
for (const e of exportData.slice(0, 20)) {
  console.log(e.row + '. ' + e.source_matched + ' → ' + e.target_matched + ' ' + (e.amount_display || ''))
}

await neon.end()
await rds.end()
