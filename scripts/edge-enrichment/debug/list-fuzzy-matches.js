import 'dotenv/config'
import pg from 'pg'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

const rds = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// Get all entity names from RDS
const entities = await rds.query('SELECT id, name FROM entity')
const entityMap = new Map(entities.rows.map(e => [e.id, e.name]))

// Get edges where entity_id is set
const edges = await neon.query(`
  SELECT ed.discovery_id, ed.source_entity_name, ed.target_entity_name,
         ed.source_entity_id, ed.target_entity_id,
         ed.amount_usd
  FROM edge_discovery ed
  WHERE ed.source_entity_id IS NOT NULL OR ed.target_entity_id IS NOT NULL
`)

const fuzzyMatched = []

for (const e of edges.rows) {
  const srcName = e.source_entity_name?.toLowerCase().trim()
  const tgtName = e.target_entity_name?.toLowerCase().trim()
  const srcMatchedName = e.source_entity_id ? entityMap.get(e.source_entity_id)?.toLowerCase().trim() : null
  const tgtMatchedName = e.target_entity_id ? entityMap.get(e.target_entity_id)?.toLowerCase().trim() : null

  // Check if source was fuzzy matched (name differs)
  const srcFuzzy = srcMatchedName && srcName !== srcMatchedName
  // Check if target was fuzzy matched (name differs)
  const tgtFuzzy = tgtMatchedName && tgtName !== tgtMatchedName

  if (srcFuzzy || tgtFuzzy) {
    fuzzyMatched.push({
      source: e.source_entity_name,
      target: e.target_entity_name,
      sourceId: e.source_entity_id,
      targetId: e.target_entity_id,
      sourceFuzzy: srcFuzzy ? entityMap.get(e.source_entity_id) : null,
      targetFuzzy: tgtFuzzy ? entityMap.get(e.target_entity_id) : null,
      amount: e.amount_usd
    })
  }
}

console.log('=== FUZZY MATCHED EDGES (name differs from RDS) ===')
console.log('Total:', fuzzyMatched.length)
console.log('')

let i = 0
for (const e of fuzzyMatched.sort((a, b) => (b.amount || 0) - (a.amount || 0))) {
  i++
  const amt = e.amount ? '$' + (e.amount / 1e6).toFixed(0) + 'M' : ''
  console.log(i + '. "' + e.source + '" → "' + e.target + '" ' + amt)
  if (e.sourceFuzzy) console.log('   Source FUZZY: "' + e.source + '" matched to "' + e.sourceFuzzy + '"')
  if (e.targetFuzzy) console.log('   Target FUZZY: "' + e.target + '" matched to "' + e.targetFuzzy + '"')
  console.log('')
}

await neon.end()
await rds.end()
