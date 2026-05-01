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

// Build maps from RDS
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

console.log('Does suffixStrippedMap have "softbank"?', suffixStrippedMap.has('softbank'))
console.log('Value:', suffixStrippedMap.get('softbank'))

// Test specific edges
const testEdges = [
  { source: 'Goldman Sachs', target: 'SoftBank Group' },
  { source: 'JPMorgan Chase', target: 'SoftBank Group Corp' },
]

for (const edge of testEdges) {
  console.log(`\n--- ${edge.source} -> ${edge.target} ---`)

  const sourceNorm = normalize(edge.source)
  const targetNorm = normalize(edge.target)
  const sourceStripped = normalizeWithSuffixStrip(edge.source)
  const targetStripped = normalizeWithSuffixStrip(edge.target)

  console.log('Source normalize:', sourceNorm)
  console.log('Target normalize:', targetNorm)
  console.log('Source suffixStrip:', sourceStripped)
  console.log('Target suffixStrip:', targetStripped)

  const sourceMatch = normalizedMap.get(sourceNorm) || suffixStrippedMap.get(sourceStripped)
  const targetMatch = normalizedMap.get(targetNorm) || suffixStrippedMap.get(targetStripped)

  console.log('Source match:', sourceMatch ? sourceMatch.name : 'NONE')
  console.log('Target match:', targetMatch ? targetMatch.name : 'NONE')
}

await neon.end()
await rds.end()
