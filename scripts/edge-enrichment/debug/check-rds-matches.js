import 'dotenv/config'
import pg from 'pg'

const rds = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// Search for entities that might match the 'well-known' names being deleted
const searchTerms = ['Amazon', 'Google', 'Goldman', 'SoftBank', 'MetaDAO', 'Dragoneer']

for (const term of searchTerms) {
  const result = await rds.query(
    `SELECT id, name FROM entity WHERE LOWER(name) LIKE LOWER('%' || $1 || '%') LIMIT 5`,
    [term]
  )
  if (result.rows.length > 0) {
    console.log(`\n${term}:`)
    for (const r of result.rows) {
      console.log(`  - ${r.name} (id: ${r.id})`)
    }
  } else {
    console.log(`\n${term}: NOT FOUND in RDS`)
  }
}

await rds.end()
