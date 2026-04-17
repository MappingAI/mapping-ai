import pg from 'pg'
import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function readCSV(filename) {
  const content = readFileSync(resolve(root, filename), 'utf-8').replace(/^\uFEFF/, '')
  return parse(content, { columns: true, skip_empty_lines: true, trim: true })
}

async function seed() {
  const client = await pool.connect()
  try {
    // --- People ---
    const people = readCSV('data/People-Grid view.csv')
    console.log(`Seeding ${people.length} people...`)

    const seenPeople = new Set()
    for (const row of people) {
      const name = row['Name']?.trim()
      if (!name || seenPeople.has(name)) continue
      seenPeople.add(name)

      await client.query(
        `INSERT INTO people (name, category, title, primary_org, other_orgs, location, twitter, notes, status, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', NOW())
         ON CONFLICT DO NOTHING`,
        [
          name,
          row['Role type']?.trim() || null,
          row['Title']?.trim() || null,
          row['Primary org']?.trim() || null,
          row['Other orgs']?.trim() || null,
          row['Location']?.trim() || null,
          row['Twitter/X']?.trim() || null,
          row['Notes']?.trim() || null,
        ],
      )
    }
    console.log(`  ✓ ${seenPeople.size} unique people seeded`)

    // --- Organizations ---
    const orgs = readCSV('data/Organizations-Grid view.csv')
    console.log(`Seeding ${orgs.length} organizations...`)

    for (const row of orgs) {
      const name = row['Name']?.trim()
      if (!name) continue

      await client.query(
        `INSERT INTO organizations (name, category, website, location, funding_model, regulatory_stance, influence_type, twitter, notes, status, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'approved', NOW())
         ON CONFLICT DO NOTHING`,
        [
          name,
          row['Category']?.trim() || null,
          row['Website']?.trim() || null,
          row['Location']?.trim() || null,
          row['Funding model']?.trim() || null,
          row['Regulatory stance']?.trim() || null,
          row['Influence type']?.trim() || null,
          row['Twitter/X']?.trim() || null,
          row['Notes']?.trim() || null,
        ],
      )
    }
    console.log(`  ✓ ${orgs.length} organizations seeded`)

    console.log('Seed complete.')
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
