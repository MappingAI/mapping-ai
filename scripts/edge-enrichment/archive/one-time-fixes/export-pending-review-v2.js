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
         amount_usd, citation, source_id, start_date, end_date
  FROM edge_discovery
  WHERE status = 'pending_review'
  ORDER BY amount_usd DESC NULLS LAST
`)

console.log('Total pending_review edges:', edges.rows.length)

// Group by source_entity_id, target_entity_id, amount_usd to find duplicates
const grouped = new Map()

for (const e of edges.rows) {
  const key = `${e.source_entity_id}|${e.target_entity_id}|${e.amount_usd || 'null'}`
  if (!grouped.has(key)) {
    grouped.set(key, {
      source_entity_id: e.source_entity_id,
      target_entity_id: e.target_entity_id,
      source_name: entityMap.get(e.source_entity_id),
      target_name: entityMap.get(e.target_entity_id),
      amount_usd: e.amount_usd,
      instances: []
    })
  }
  grouped.get(key).instances.push({
    discovery_id: e.discovery_id,
    citation: e.citation,
    url: sourceMap.get(e.source_id),
    start_date: e.start_date,
    end_date: e.end_date
  })
}

console.log('Unique relationships (after deduping):', grouped.size)

// Convert to array and sort by amount
const deduped = [...grouped.values()].sort((a, b) => (b.amount_usd || 0) - (a.amount_usd || 0))

// Create markdown export
const mdLines = [
  '# Edge Discoveries: Pending Review (Deduplicated)',
  '',
  `Total unique relationships: ${deduped.length}`,
  `Total instances (with duplicates): ${edges.rows.length}`,
  '',
  '## Instructions for Review',
  '',
  'For each edge, verify:',
  '1. Is the relationship AI-related? (funding AI research, AI companies, AI policy, etc.)',
  '2. Does the citation support the relationship?',
  '',
  'Mark as:',
  '- ✅ APPROVE - Valid AI-related funding relationship',
  '- ❌ REJECT - Not AI-related or incorrect',
  '',
  '---',
  ''
]

let rowNum = 0
for (const e of deduped) {
  rowNum++
  const amt = e.amount_usd
    ? '$' + (e.amount_usd >= 1e9 ? (e.amount_usd / 1e9).toFixed(1) + 'B' : (e.amount_usd / 1e6).toFixed(1) + 'M')
    : 'Not specified'

  // Get best date from instances
  const dates = e.instances.filter(i => i.start_date || i.end_date)
  const dateStr = dates.length > 0
    ? dates[0].start_date
      ? new Date(dates[0].start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      : 'Unknown'
    : 'No date'

  mdLines.push(`### ${rowNum}. ${e.source_name} → ${e.target_name}`)
  mdLines.push('')
  mdLines.push(`**Amount:** ${amt} | **Date:** ${dateStr} | **Sources:** ${e.instances.length}`)
  mdLines.push('')

  // Show first citation
  const firstCitation = (e.instances[0].citation || '').replace(/\n/g, ' ').substring(0, 200)
  mdLines.push(`**Citation:** "${firstCitation}..."`)
  mdLines.push('')

  // Show URLs
  const urls = e.instances.map(i => i.url).filter(Boolean)
  if (urls.length > 0) {
    mdLines.push(`**Source(s):** ${urls[0]}${urls.length > 1 ? ` (+${urls.length - 1} more)` : ''}`)
    mdLines.push('')
  }

  mdLines.push('**Verdict:** [ ]')
  mdLines.push('')
  mdLines.push('---')
  mdLines.push('')
}

fs.writeFileSync('data/edge-enrichment/pending-review-edges-deduped.md', mdLines.join('\n'))
console.log('Saved to data/edge-enrichment/pending-review-edges-deduped.md')

// Also save JSON with full details
const jsonExport = deduped.map((e, i) => ({
  row: i + 1,
  source: e.source_name,
  source_id: e.source_entity_id,
  target: e.target_name,
  target_id: e.target_entity_id,
  amount_usd: e.amount_usd,
  num_sources: e.instances.length,
  instances: e.instances.map(inst => ({
    citation: inst.citation,
    url: inst.url,
    start_date: inst.start_date,
    end_date: inst.end_date
  }))
}))

fs.writeFileSync('data/edge-enrichment/pending-review-edges-deduped.json', JSON.stringify(jsonExport, null, 2))
console.log('Saved to data/edge-enrichment/pending-review-edges-deduped.json')

// Summary stats
console.log('')
console.log('Summary:')
console.log('  - Single source:', deduped.filter(e => e.instances.length === 1).length)
console.log('  - 2 sources:', deduped.filter(e => e.instances.length === 2).length)
console.log('  - 3+ sources:', deduped.filter(e => e.instances.length >= 3).length)

await neon.end()
await rds.end()
