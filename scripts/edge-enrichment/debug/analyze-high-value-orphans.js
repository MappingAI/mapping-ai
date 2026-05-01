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

// Get RDS entity names for precise matching
const rdsEntities = await rds.query('SELECT id, name FROM entity')
const rdsNames = new Map(rdsEntities.rows.map(r => [r.name.toLowerCase().trim(), r]))

// Get high-value neither-exists edges
const highValue = await neon.query(`
  SELECT discovery_id, source_entity_name, target_entity_name, amount_usd,
         SUBSTRING(citation, 1, 150) as citation
  FROM edge_discovery
  WHERE source_entity_id IS NULL AND target_entity_id IS NULL
    AND amount_usd > 100000000
  ORDER BY amount_usd DESC
`)

console.log(`=== HIGH-VALUE ORPHAN EDGES (>$100M): ${highValue.rows.length} ===\n`)

// Group by whether they seem real or noise
const realEntities = []
const likelyNoise = []
const uncertain = []

const NOISE_INDICATORS = [
  /programs?$/i,
  /projects?$/i,
  /initiatives?$/i,
  /investments?$/i,
  /^private sector$/i,
  /^government$/i,
  /institutions$/i,
  /athletes$/i,
  /victims$/i,
  /accounts program$/i,
]

const REAL_INDICATORS = [
  / Inc\.?$/i,
  / Corp\.?$/i,
  / LLC$/i,
  / Ltd\.?$/i,
  / Group$/i,
  / Ventures$/i,
  / Capital$/i,
  / Foundation$/i,
  / Initiative$/i,  // Chan Zuckerberg Initiative is real
  / Company$/i,
]

for (const edge of highValue.rows) {
  const sourceNoise = NOISE_INDICATORS.some(p => p.test(edge.source_entity_name))
  const targetNoise = NOISE_INDICATORS.some(p => p.test(edge.target_entity_name))
  const sourceReal = REAL_INDICATORS.some(p => p.test(edge.source_entity_name))
  const targetReal = REAL_INDICATORS.some(p => p.test(edge.target_entity_name))
  
  // Check if source or target closely matches RDS
  const sourceInRDS = [...rdsNames.keys()].some(n => 
    n.includes(edge.source_entity_name.toLowerCase()) || 
    edge.source_entity_name.toLowerCase().includes(n)
  )
  const targetInRDS = [...rdsNames.keys()].some(n =>
    n.includes(edge.target_entity_name.toLowerCase()) ||
    edge.target_entity_name.toLowerCase().includes(n)
  )
  
  const info = {
    source: edge.source_entity_name,
    target: edge.target_entity_name,
    amount: `$${(edge.amount_usd / 1e9).toFixed(1)}B`,
    citation: edge.citation,
    sourceInRDS,
    targetInRDS
  }
  
  if ((sourceNoise || targetNoise) && !sourceReal && !targetReal) {
    likelyNoise.push(info)
  } else if (sourceReal || targetReal || sourceInRDS || targetInRDS) {
    realEntities.push(info)
  } else {
    uncertain.push(info)
  }
}

console.log(`--- LIKELY REAL ENTITIES (${realEntities.length}) ---\n`)
for (const e of realEntities.slice(0, 15)) {
  console.log(`${e.source} → ${e.target} (${e.amount})`)
  console.log(`  Source in RDS: ${e.sourceInRDS}, Target in RDS: ${e.targetInRDS}`)
  console.log(`  "${e.citation}..."`)
  console.log()
}

console.log(`\n--- LIKELY NOISE (${likelyNoise.length}) ---\n`)
for (const e of likelyNoise.slice(0, 10)) {
  console.log(`${e.source} → ${e.target} (${e.amount})`)
}

console.log(`\n--- UNCERTAIN (${uncertain.length}) ---\n`)
for (const e of uncertain.slice(0, 10)) {
  console.log(`${e.source} → ${e.target} (${e.amount})`)
  console.log(`  "${e.citation}..."`)
  console.log()
}

await neon.end()
await rds.end()
