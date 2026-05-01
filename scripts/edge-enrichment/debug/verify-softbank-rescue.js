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

// Build maps
const rdsEntities = await rds.query('SELECT id, name FROM entity')
const normalizedMap = new Map()
const suffixStrippedMap = new Map()
for (const r of rdsEntities.rows) {
  normalizedMap.set(normalize(r.name), { id: r.id, name: r.name })
  const stripped = normalizeWithSuffixStrip(r.name)
  if (!suffixStrippedMap.has(stripped)) {
    suffixStrippedMap.set(stripped, { id: r.id, name: r.name })
  }
}

// Get SoftBank edges
const softbankEdges = await neon.query(`
  SELECT discovery_id, source_entity_name, target_entity_name
  FROM edge_discovery
  WHERE (source_entity_name ILIKE '%softbank%' OR target_entity_name ILIKE '%softbank%')
    AND source_entity_id IS NULL
    AND target_entity_id IS NULL
`)

console.log('Checking rescue for SoftBank edges:')
for (const edge of softbankEdges.rows) {
  const sourceStripped = normalizeWithSuffixStrip(edge.source_entity_name)
  const targetStripped = normalizeWithSuffixStrip(edge.target_entity_name)

  const sourceMatch = normalizedMap.get(normalize(edge.source_entity_name)) || suffixStrippedMap.get(sourceStripped)
  const targetMatch = normalizedMap.get(normalize(edge.target_entity_name)) || suffixStrippedMap.get(targetStripped)

  const canRescue = sourceMatch || targetMatch
  console.log('  ' + edge.source_entity_name + ' -> ' + edge.target_entity_name)
  console.log('    Can rescue:', canRescue ? 'YES' : 'NO')
  if (sourceMatch) console.log('    Source matches:', sourceMatch.name)
  if (targetMatch) console.log('    Target matches:', targetMatch.name)
}

await neon.end()
await rds.end()
