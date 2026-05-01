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

// Get RDS entities
const rdsEntities = await rds.query('SELECT id, name FROM entity')

// Build multiple lookup strategies
const exactMap = new Map()  // exact lowercase
const wordMap = new Map()   // first significant word

for (const r of rdsEntities.rows) {
  const lower = r.name.toLowerCase()
  exactMap.set(lower, { id: r.id, name: r.name })
  
  // Get first word (skip common prefixes)
  const words = r.name.split(/\s+/)
  const firstWord = words[0].toLowerCase()
  if (!wordMap.has(firstWord) && firstWord.length > 2) {
    wordMap.set(firstWord, { id: r.id, name: r.name })
  }
}

// Get edges where neither exists
const neitherEdges = await neon.query(`
  SELECT discovery_id, source_entity_name, target_entity_name, amount_usd
  FROM edge_discovery
  WHERE source_entity_id IS NULL AND target_entity_id IS NULL
  ORDER BY amount_usd DESC NULLS LAST
  LIMIT 100
`)

console.log('=== TOP 100 NEITHER-EXISTS EDGES ===\n')
console.log('Checking for potential RDS matches...\n')

let rescuable = []
let highValueUnmatched = []

for (const edge of neitherEdges.rows) {
  const sourceLower = edge.source_entity_name.toLowerCase()
  const targetLower = edge.target_entity_name.toLowerCase()
  
  // Check various matching strategies
  const sourceMatch = exactMap.get(sourceLower) || 
                      wordMap.get(sourceLower.split(/\s+/)[0]) ||
                      [...exactMap.values()].find(e => e.name.toLowerCase().includes(sourceLower) || sourceLower.includes(e.name.toLowerCase()))
  
  const targetMatch = exactMap.get(targetLower) ||
                      wordMap.get(targetLower.split(/\s+/)[0]) ||
                      [...exactMap.values()].find(e => e.name.toLowerCase().includes(targetLower) || targetLower.includes(e.name.toLowerCase()))
  
  if (sourceMatch || targetMatch) {
    rescuable.push({
      ...edge,
      sourceMatch,
      targetMatch
    })
  } else if (edge.amount_usd && edge.amount_usd > 100000000) {
    highValueUnmatched.push(edge)
  }
}

console.log(`--- RESCUABLE WITH BETTER MATCHING (${rescuable.length}) ---\n`)
for (const r of rescuable.slice(0, 20)) {
  const amt = r.amount_usd ? `$${(r.amount_usd/1e9).toFixed(1)}B` : 'no amount'
  console.log(`${r.source_entity_name} → ${r.target_entity_name} (${amt})`)
  if (r.sourceMatch) console.log(`  Source matches: "${r.sourceMatch.name}" (id: ${r.sourceMatch.id})`)
  if (r.targetMatch) console.log(`  Target matches: "${r.targetMatch.name}" (id: ${r.targetMatch.id})`)
  console.log()
}

console.log(`\n--- HIGH-VALUE UNMATCHED (>$100M) ---\n`)
for (const e of highValueUnmatched.slice(0, 10)) {
  const amt = e.amount_usd ? `$${(e.amount_usd/1e9).toFixed(1)}B` : ''
  console.log(`${e.source_entity_name} → ${e.target_entity_name} (${amt})`)
}

await neon.end()
await rds.end()
