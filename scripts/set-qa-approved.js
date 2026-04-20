import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const ids = process.argv.slice(2).map(Number).filter(Boolean)
if (!ids.length) {
  console.error('usage: node scripts/set-qa-approved.js <id> [<id>...]')
  process.exit(1)
}
const r = await pool.query(
  'UPDATE entity SET qa_approved = true WHERE id = ANY($1::int[]) RETURNING id, name, qa_approved',
  [ids],
)
console.log(r.rows)
await pool.end()
