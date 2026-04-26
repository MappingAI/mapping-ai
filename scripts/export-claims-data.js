/**
 * Export claims data from Neon DB to JSON files, then upload to R2.
 *
 * Generates:
 *   - claims-detail.json: All claims + sources keyed by entity ID
 *   - agi-definitions.json: AGI definition embeddings + clusters
 *
 * Usage:
 *   node scripts/export-claims-data.js              # generate only
 *   node scripts/export-claims-data.js --upload      # generate + upload to R2
 *
 * Requires:
 *   - DATABASE_URL or PILOT_DB in .env (Neon connection)
 *   - wrangler auth for --upload (via `wrangler login`)
 */
import 'dotenv/config'
import pg from 'pg'
import fs from 'fs'
import { execSync } from 'child_process'

const dbUrl = process.env.PILOT_DB || process.env.DATABASE_URL
if (!dbUrl) {
  console.error('No database URL found. Set DATABASE_URL or PILOT_DB in .env')
  process.exit(1)
}

const db = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
const upload = process.argv.includes('--upload')
const BUCKET = 'mapping-ai-data'
const OUT_DIR = 'public'

async function exportClaimsDetail() {
  console.log('Exporting claims-detail.json...')

  const srcR = await db.query('SELECT source_id, url, title, source_type, date_published, author FROM source')
  const sourceMap = {}
  for (const s of srcR.rows) {
    sourceMap[s.source_id] = {
      url: s.url,
      title: s.title,
      type: s.source_type,
      date: s.date_published ? new Date(s.date_published).toISOString().split('T')[0] : null,
      author: s.author,
    }
  }

  const claimR = await db.query(
    `SELECT entity_id, belief_dimension, stance, stance_score, stance_label,
            definition_used, citation, source_id, date_stated, confidence
     FROM claim ORDER BY entity_id, belief_dimension`,
  )
  const byEntity = {}
  for (const c of claimR.rows) {
    if (!byEntity[c.entity_id]) byEntity[c.entity_id] = []
    byEntity[c.entity_id].push({
      dim: c.belief_dimension,
      score: c.stance_score,
      label: c.stance_label || c.stance,
      def: c.definition_used || null,
      cite: c.citation,
      src: c.source_id,
      date: c.date_stated ? new Date(c.date_stated).toISOString().split('T')[0] : null,
      conf: c.confidence,
    })
  }

  const json = JSON.stringify({ sources: sourceMap, claims: byEntity })
  const path = `${OUT_DIR}/claims-detail.json`
  fs.writeFileSync(path, json)
  console.log(
    `  ${Object.keys(byEntity).length} entities, ${claimR.rows.length} claims, ${Object.keys(sourceMap).length} sources (${(json.length / 1024).toFixed(0)} KB)`,
  )
  return path
}

async function main() {
  const files = []

  files.push(await exportClaimsDetail())

  // agi-definitions.json is pre-generated (requires Voyage AI embeddings)
  // Only upload it if it exists
  const agiPath = `${OUT_DIR}/agi-definitions.json`
  if (fs.existsSync(agiPath)) {
    files.push(agiPath)
    console.log('agi-definitions.json found, will include in upload')
  }

  if (upload) {
    console.log('\nUploading to R2...')
    for (const file of files) {
      const key = file.replace(`${OUT_DIR}/`, '')
      try {
        execSync(
          `pnpm exec wrangler r2 object put ${BUCKET}/${key} --file=${file} --content-type=application/json --remote`,
          { stdio: 'inherit' },
        )
        console.log(`  ✓ ${key}`)
      } catch (err) {
        console.error(`  ✗ ${key}: ${err.message}`)
      }
    }
    console.log(`\nFiles available at: https://pub-b922bd462cf047f2afc0d8dd5a8dd34c.r2.dev/`)
  } else {
    console.log('\nSkipping upload (use --upload to push to R2)')
  }

  await db.end()
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
