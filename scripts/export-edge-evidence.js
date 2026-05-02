/**
 * Export edge evidence from Neon PILOT_DB to JSON.
 *
 * Generates edge-evidence.json with all edge evidence records and their sources,
 * keyed by edge_id for lookup from the map.
 *
 * Usage:
 *   node scripts/export-edge-evidence.js              # writes to public/edge-evidence.json
 *   node scripts/export-edge-evidence.js --upload     # also uploads to R2
 *
 * Requires:
 *   - PILOT_DB in .env (Neon connection string)
 *   - R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY in .env (for --upload)
 */
import 'dotenv/config'
import pg from 'pg'
import fs from 'fs'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const dbUrl = process.env.PILOT_DB
if (!dbUrl) {
  console.error('PILOT_DB not found in .env')
  process.exit(1)
}

const pilot = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
})

const upload = process.argv.includes('--upload')
const BUCKET = 'mapping-ai-data'
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'ac57c6d87068ab259c6f54dba468de8d'

async function main() {
  console.log('Querying edge evidence from PILOT_DB...')

  // Get all edge evidence with source info
  const { rows } = await pilot.query(`
    SELECT
      ee.edge_id,
      ee.citation,
      ee.start_date,
      ee.end_date,
      ee.amount_usd,
      ee.role_title,
      ee.confidence,
      s.url AS source_url,
      s.title AS source_title,
      s.source_type,
      s.date_published,
      s.author
    FROM edge_evidence ee
    JOIN source s ON ee.source_id = s.source_id
    ORDER BY ee.edge_id, ee.created_at
  `)

  // Group by edge_id
  const edges = {}
  for (const row of rows) {
    if (!edges[row.edge_id]) {
      edges[row.edge_id] = { evidence: [] }
    }
    edges[row.edge_id].evidence.push({
      citation: row.citation,
      source_url: row.source_url,
      source_title: row.source_title,
      source_type: row.source_type,
      date_published: row.date_published?.toISOString().split('T')[0] || null,
      author: row.author,
      start_date: row.start_date?.toISOString().split('T')[0] || null,
      end_date: row.end_date?.toISOString().split('T')[0] || null,
      amount_usd: row.amount_usd ? Number(row.amount_usd) : null,
      role_title: row.role_title,
      confidence: row.confidence,
    })
  }

  const output = {
    _meta: { generated_at: new Date().toISOString() },
    edges,
  }

  const json = JSON.stringify(output)
  const edgeCount = Object.keys(edges).length
  const evidenceCount = rows.length
  const sizeKB = (json.length / 1024).toFixed(0)

  console.log(`Exported ${edgeCount} edges with ${evidenceCount} evidence records (${sizeKB} KB)`)

  // Write to public/ for local dev
  fs.writeFileSync('public/edge-evidence.json', json)
  console.log('Written to public/edge-evidence.json')

  // Optional R2 upload
  if (upload) {
    const keyId = process.env.R2_ACCESS_KEY_ID
    const secret = process.env.R2_SECRET_ACCESS_KEY
    if (!keyId || !secret) {
      console.error('R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY required for --upload')
      process.exit(1)
    }

    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: keyId, secretAccessKey: secret },
    })

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: 'edge-evidence.json',
        Body: json,
        ContentType: 'application/json',
        CacheControl: 'public, max-age=300, s-maxage=3600',
      }),
    )
    console.log('Uploaded to R2: edge-evidence.json')
  }

  await pilot.end()
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
