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

// Get entity names
const entities = await rds.query('SELECT id, name FROM entity')
const entityMap = new Map(entities.rows.map(e => [e.id, e.name]))

// Get pending_review edges and check if names match
const edges = await neon.query(`
  SELECT DISTINCT ON (source_entity_id, target_entity_id)
         source_entity_name, target_entity_name,
         source_entity_id, target_entity_id
  FROM edge_discovery
  WHERE status = 'pending_review'
`)

// Find mismatches
const mismatches = []
for (const e of edges.rows) {
  const srcMatched = entityMap.get(e.source_entity_id)
  const tgtMatched = entityMap.get(e.target_entity_id)

  const srcDiff = srcMatched && e.source_entity_name.toLowerCase() !== srcMatched.toLowerCase()
  const tgtDiff = tgtMatched && e.target_entity_name.toLowerCase() !== tgtMatched.toLowerCase()

  if (srcDiff || tgtDiff) {
    mismatches.push({
      srcExtracted: e.source_entity_name,
      srcMatched,
      tgtExtracted: e.target_entity_name,
      tgtMatched,
      srcDiff,
      tgtDiff
    })
  }
}

console.log('=== FUZZY MATCHES IN PENDING_REVIEW ===')
console.log('Total unique edges:', edges.rows.length)
console.log('Edges with name differences:', mismatches.length)
console.log('')

// Check for suspicious mismatches (where first word doesn't match)
function isSuspicious(extracted, matched) {
  if (!extracted || !matched) return false
  const extFirst = extracted.toLowerCase().split(/\s+/)[0]
  const matchFirst = matched.toLowerCase().split(/\s+/)[0]
  // Suspicious if first words don't overlap
  return !extFirst.includes(matchFirst) && !matchFirst.includes(extFirst)
}

const suspicious = mismatches.filter(m => {
  return (m.srcDiff && isSuspicious(m.srcExtracted, m.srcMatched)) ||
         (m.tgtDiff && isSuspicious(m.tgtExtracted, m.tgtMatched))
})

console.log('SUSPICIOUS mismatches (likely wrong - first word differs):')
console.log('Count:', suspicious.length)
console.log('')

for (const m of suspicious) {
  if (m.srcDiff && isSuspicious(m.srcExtracted, m.srcMatched)) {
    console.log('  Source: "' + m.srcExtracted + '" → "' + m.srcMatched + '"')
  }
  if (m.tgtDiff && isSuspicious(m.tgtExtracted, m.tgtMatched)) {
    console.log('  Target: "' + m.tgtExtracted + '" → "' + m.tgtMatched + '"')
  }
}

console.log('')
console.log('NORMAL fuzzy matches (likely correct - formatting differences):')
const normal = mismatches.filter(m => !suspicious.includes(m)).slice(0, 15)
for (const m of normal) {
  if (m.srcDiff) {
    console.log('  "' + m.srcExtracted + '" → "' + m.srcMatched + '"')
  }
  if (m.tgtDiff) {
    console.log('  "' + m.tgtExtracted + '" → "' + m.tgtMatched + '"')
  }
}

await neon.end()
await rds.end()
