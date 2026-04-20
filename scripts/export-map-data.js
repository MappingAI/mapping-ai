import pg from 'pg'
import 'dotenv/config'
import fs from 'fs'
import { generateMapData, splitMapData } from '../api/export-map.js'
import { computePositions } from './compute-positions.js'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// Columns the Library page depends on. If any are missing, the migration
// at scripts/migrate.js has not been applied against this DB yet. Fail
// loud so CI stops the deploy before an old-shape map-data.json ships.
// See docs/plans/2026-04-19-001-feat-resources-rethink-phase-1-plan.md
const REQUIRED_RESOURCE_COLUMNS = [
  'topic_tags',
  'format_tags',
  'advocated_stance',
  'advocated_timeline',
  'advocated_risk',
  'source',
  'source_url',
]

async function assertSchema(client) {
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'entity' AND column_name = ANY($1::text[])`,
    [REQUIRED_RESOURCE_COLUMNS],
  )
  const present = new Set(res.rows.map((r) => r.column_name))
  const missing = REQUIRED_RESOURCE_COLUMNS.filter((c) => !present.has(c))
  if (missing.length > 0) {
    throw new Error(
      `Schema precondition failed: entity table is missing columns: ${missing.join(', ')}. ` +
        `Run scripts/migrate.js before exporting map data.`,
    )
  }
}

async function exportMapData() {
  const client = await pool.connect()
  try {
    console.log('Exporting map data...\n')
    await assertSchema(client)
    const data = await generateMapData(client)

    const counts = {
      people: data.people.length,
      organizations: data.organizations.length,
      resources: data.resources.length,
      relationships: data.relationships.length,
    }
    for (const [k, v] of Object.entries(counts)) console.log(`  ✓ ${v} ${k}`)

    // Mark as test data if no approved entities yet
    if (counts.people + counts.organizations + counts.resources === 0) {
      data._meta.note = 'No approved entities — run migrate.js and seed data first'
    }

    // Pre-compute force simulation positions for the "all" view
    const positions = computePositions(data)
    // Attach positions to each entity
    for (const arr of [data.people, data.organizations, data.resources]) {
      for (const entity of arr) {
        const key = `${entity.entity_type}-${entity.id}`
        const pos = positions[key]
        if (pos) {
          entity._x = Math.round(pos.x * 10000) / 10000
          entity._y = Math.round(pos.y * 10000) / 10000
        }
      }
    }

    // Split into skeleton (render-critical) + detail (lazy-loaded)
    const { skeleton, detail } = splitMapData(data)
    fs.writeFileSync('map-data.json', JSON.stringify(skeleton))
    fs.writeFileSync('map-detail.json', JSON.stringify(detail))

    const skeletonSize = (JSON.stringify(skeleton).length / 1024).toFixed(0)
    const detailSize = (JSON.stringify(detail).length / 1024).toFixed(0)
    const detailCount = Object.keys(detail).length
    console.log(`\n✓ map-data.json written (${skeletonSize} KB skeleton)`)
    console.log(`✓ map-detail.json written (${detailSize} KB detail for ${detailCount} entities)`)
  } finally {
    client.release()
    await pool.end()
  }
}

exportMapData().catch((err) => {
  console.error(err)
  process.exit(1)
})
