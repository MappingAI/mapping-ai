/**
 * Export claims data from Neon DB to JSON, then upload to R2.
 *
 * Generates:
 *   - claims-detail.json: All claims + sources keyed by entity ID
 *
 * Also uploads agi-definitions.json if found locally.
 *
 * Usage:
 *   node scripts/export-claims-data.js              # generate only (writes to stdout summary)
 *   node scripts/export-claims-data.js --upload      # generate + upload to R2
 *
 * Requires:
 *   - DATABASE_URL or PILOT_DB in .env (Neon connection)
 *   - R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY in .env or GitHub Secrets (for --upload)
 */
import 'dotenv/config'
import pg from 'pg'
import fs from 'fs'
import os from 'os'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const dbUrl = process.env.PILOT_DB || process.env.DATABASE_URL
if (!dbUrl) {
  console.error('No database URL found. Set DATABASE_URL or PILOT_DB in .env')
  process.exit(1)
}

const db = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
const upload = process.argv.includes('--upload')
const BUCKET = 'mapping-ai-data'
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'ac57c6d87068ab259c6f54dba468de8d'

function getR2Client() {
  const keyId = process.env.R2_ACCESS_KEY_ID
  const secret = process.env.R2_SECRET_ACCESS_KEY
  if (!keyId || !secret) {
    console.error('R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY required for --upload')
    process.exit(1)
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: keyId, secretAccessKey: secret },
  })
}

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
  console.log(
    `  ${Object.keys(byEntity).length} entities, ${claimR.rows.length} claims, ${Object.keys(sourceMap).length} sources (${(json.length / 1024).toFixed(0)} KB)`,
  )
  return { key: 'claims-detail.json', body: json }
}

async function uploadToR2(r2, key, body) {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: 'application/json',
      CacheControl: 'public, max-age=300, s-maxage=3600',
    }),
  )
}

async function main() {
  const uploads = []

  const claims = await exportClaimsDetail()
  uploads.push(claims)

  // agi-definitions.json is pre-generated (requires Voyage AI embeddings)
  for (const candidate of ['public/agi-definitions.json', 'agi-definitions.json']) {
    if (fs.existsSync(candidate)) {
      uploads.push({ key: 'agi-definitions.json', body: fs.readFileSync(candidate, 'utf-8') })
      console.log('agi-definitions.json found at ' + candidate + ', will include in upload')
      break
    }
  }

  if (upload) {
    const r2 = getR2Client()
    console.log('\nUploading to R2...')
    for (const { key, body } of uploads) {
      try {
        await uploadToR2(r2, key, body)
        console.log(`  ✓ ${key} (${(body.length / 1024).toFixed(0)} KB)`)
      } catch (err) {
        console.error(`  ✗ ${key}: ${err.message}`)
        process.exit(1)
      }
    }
    console.log('\nUploaded to R2. Served via Pages Function at /data/<filename>')
  } else {
    console.log('\nSkipping upload (use --upload to push to R2)')
    // Write to temp dir for local inspection
    const tmpDir = os.tmpdir()
    for (const { key, body } of uploads) {
      const path = `${tmpDir}/${key}`
      fs.writeFileSync(path, body)
      console.log(`  Written to ${path}`)
    }
  }

  await db.end()
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
