import pg from 'pg'
import 'dotenv/config'
import { slugify, generateEntitySlug } from '../src/shared/slugify.js'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function backfillSlugs() {
  const client = await pool.connect()
  try {
    const { rows } = await client.query(
      `SELECT id, entity_type, name, resource_title, title
       FROM entity
       WHERE slug IS NULL
       ORDER BY entity_type, id`,
    )

    if (rows.length === 0) {
      console.log('All entities already have slugs. Nothing to do.')
      return
    }

    console.log(`Backfilling slugs for ${rows.length} entities...\n`)

    const slugsByType: Record<string, Set<string>> = {}

    const { rows: existing } = await client.query(`SELECT entity_type, slug FROM entity WHERE slug IS NOT NULL`)
    for (const row of existing) {
      const type = row.entity_type as string
      if (!slugsByType[type]) slugsByType[type] = new Set()
      slugsByType[type].add(row.slug as string)
    }

    let updated = 0
    for (const row of rows) {
      const type = row.entity_type as string
      if (!slugsByType[type]) slugsByType[type] = new Set()

      const name =
        type === 'resource'
          ? (row.resource_title as string) || (row.title as string) || (row.name as string)
          : (row.name as string)

      const slug = generateEntitySlug(name, type, slugsByType[type], row.id as number)
      slugsByType[type].add(slug)

      await client.query(`UPDATE entity SET slug = $1 WHERE id = $2`, [slug, row.id])
      updated++

      const displayName = name || `(id=${row.id})`
      if (slugify(displayName) !== slug) {
        console.log(`  ${type}/${slug} <- "${displayName}" (collision or fallback)`)
      }
    }

    console.log(`\nBackfilled ${updated} entity slugs`)
  } finally {
    client.release()
    await pool.end()
  }
}

backfillSlugs().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
