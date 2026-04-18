import pg from 'pg'
import 'dotenv/config'
import fs from 'fs'
// Relative imports keep the `.js` extension even pointing at `.ts` source —
// canonical TS-ESM form; `tsx` and the SAM esbuild bundler both accept it.
import { generateMapData, splitMapData } from '../api/export-map.js'
// @ts-expect-error -- compute-positions is still JS; moves to TS in a follow-up PR.
import { computePositions } from './compute-positions.js'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function exportMapData() {
  const client = await pool.connect()
  try {
    console.log('Exporting map data...\n')
    const data = await generateMapData(client)

    const counts = {
      people: data.people.length,
      organizations: data.organizations.length,
      resources: data.resources.length,
      relationships: data.relationships.length,
    }
    for (const [k, v] of Object.entries(counts)) console.log(`  ✓ ${v} ${k}`)

    // Mark as test data if no approved entities yet.
    // `_meta` is an open-shaped record here — we're attaching a diagnostic note.
    if (counts.people + counts.organizations + counts.resources === 0) {
      ;(data._meta as Record<string, unknown>).note = 'No approved entities — run migrate.js and seed data first'
    }

    // Pre-compute force simulation positions for the "all" view.
    const positions = computePositions(data) as Record<string, { x: number; y: number }>
    for (const arr of [data.people, data.organizations, data.resources]) {
      for (const entity of arr) {
        const key = `${String(entity.entity_type)}-${String(entity.id)}`
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
