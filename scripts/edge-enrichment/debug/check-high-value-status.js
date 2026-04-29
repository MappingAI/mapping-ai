import 'dotenv/config'
import pg from 'pg'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

// Check status of high-value edges
const highValue = await neon.query(`
  SELECT discovery_id, source_entity_name, target_entity_name, 
         source_entity_id, target_entity_id, amount_usd, status
  FROM edge_discovery
  WHERE amount_usd > 10000000000
  ORDER BY amount_usd DESC
  LIMIT 20
`)

console.log('=== HIGH-VALUE EDGES (>$10B) STATUS ===\n')
for (const e of highValue.rows) {
  const srcStatus = e.source_entity_id ? `✓ matched (${e.source_entity_id})` : '✗ unmatched'
  const tgtStatus = e.target_entity_id ? `✓ matched (${e.target_entity_id})` : '✗ unmatched'
  console.log(`$${(e.amount_usd/1e9).toFixed(0)}B: ${e.source_entity_name} → ${e.target_entity_name}`)
  console.log(`  Source: ${srcStatus}, Target: ${tgtStatus}`)
  console.log(`  Status: ${e.status}`)
  console.log()
}

await neon.end()
