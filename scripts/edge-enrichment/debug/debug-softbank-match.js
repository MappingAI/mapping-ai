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

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeWithSuffixStrip(str) {
  let result = str.toLowerCase()
  const suffixPattern = /\s+(group|corp|corporation|inc|llc|ltd|co|company)\.?$/i
  while (suffixPattern.test(result)) {
    result = result.replace(suffixPattern, '')
  }
  return result.replace(/[^a-z0-9]/g, '')
}

// Check RDS for SoftBank
const softbankRDS = await rds.query(`SELECT id, name FROM entity WHERE name ILIKE '%softbank%'`)
console.log('RDS SoftBank entities:')
for (const r of softbankRDS.rows) {
  console.log(`  ${r.name} (id: ${r.id})`)
  console.log(`    normalize: "${normalize(r.name)}"`)
  console.log(`    suffixStrip: "${normalizeWithSuffixStrip(r.name)}"`)
}

// Check Neon for SoftBank edges
const softbankEdges = await neon.query(`
  SELECT source_entity_name, target_entity_name, source_entity_id, target_entity_id
  FROM edge_discovery
  WHERE source_entity_name ILIKE '%softbank%' OR target_entity_name ILIKE '%softbank%'
  LIMIT 10
`)
console.log('\nNeon SoftBank edges:')
for (const e of softbankEdges.rows) {
  console.log(`  ${e.source_entity_name} → ${e.target_entity_name}`)
  console.log(`    Source ID: ${e.source_entity_id}, Target ID: ${e.target_entity_id}`)
  console.log(`    Target normalize: "${normalize(e.target_entity_name)}"`)
  console.log(`    Target suffixStrip: "${normalizeWithSuffixStrip(e.target_entity_name)}"`)
}

await neon.end()
await rds.end()
