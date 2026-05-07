/**
 * Sync verification data: reads progress from R2, reports DB status,
 * and re-exports map data so the frontend picks up verification indicators.
 *
 * Usage:
 *   node scripts/sync-verification.js              # Report current status
 *   node scripts/sync-verification.js --export      # Re-export map data after verification run
 *   node scripts/sync-verification.js --pull        # Pull progress from R2 and report
 */
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const { config: loadEnv } = await import('dotenv')
const envPaths = [path.join(process.cwd(), '.env'), path.join(__dirname, '../.env')]
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    loadEnv({ path: p })
    break
  }
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
})

const args = process.argv.slice(2)
const doPull = args.includes('--pull')
const doExport = args.includes('--export')

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'ac57c6d87068ab259c6f54dba468de8d'
const R2_BUCKET = process.env.R2_BUCKET || 'mapping-ai-data'

async function getR2Client() {
  const keyId = process.env.R2_ACCESS_KEY_ID
  const secret = process.env.R2_SECRET_ACCESS_KEY
  if (!keyId || !secret) return null
  const { S3Client } = await import('@aws-sdk/client-s3')
  return new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: keyId, secretAccessKey: secret },
  })
}

async function pullProgressFromR2() {
  try {
    const client = await getR2Client()
    if (!client) {
      console.log('  R2 credentials not configured, skipping R2 pull')
      return null
    }
    const { GetObjectCommand } = await import('@aws-sdk/client-s3')
    const res = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: 'verification-progress.json' }))
    const body = await res.Body?.transformToString()
    if (!body) return null
    return JSON.parse(body)
  } catch (e) {
    console.log(`  Could not pull from R2: ${e.message}`)
    return null
  }
}

async function getDbVerificationStatus() {
  const client = await pool.connect()
  try {
    const total = await client.query(
      `SELECT COUNT(*) as count FROM entity WHERE status = 'approved' AND qa_approved = true`,
    )
    const verified = await client.query(
      `SELECT COUNT(*) as count FROM entity WHERE status = 'approved' AND qa_approved = true
       AND field_verification IS NOT NULL AND field_verification != '{}'::jsonb`,
    )
    const breakdown = await client.query(`
      SELECT entity_type, COUNT(*) as count
      FROM entity
      WHERE status = 'approved' AND qa_approved = true
        AND field_verification IS NOT NULL AND field_verification != '{}'::jsonb
      GROUP BY entity_type
    `)

    const statusCounts = await client.query(`
      SELECT
        SUM(CASE WHEN unv_ratio = 0 THEN 1 ELSE 0 END) as verified_count,
        SUM(CASE WHEN unv_ratio > 0 AND unv_ratio < 0.5 THEN 1 ELSE 0 END) as partial_count,
        SUM(CASE WHEN unv_ratio >= 0.5 THEN 1 ELSE 0 END) as unverified_count
      FROM (
        SELECT id,
          (SELECT COUNT(*) FILTER (WHERE value = 'unverified')::float /
                  NULLIF(COUNT(*), 0)
           FROM jsonb_each_text(field_verification)) as unv_ratio
        FROM entity
        WHERE status = 'approved' AND qa_approved = true
          AND field_verification IS NOT NULL AND field_verification != '{}'::jsonb
      ) t
    `)

    return {
      totalApproved: parseInt(total.rows[0].count),
      withVerification: parseInt(verified.rows[0].count),
      byType: breakdown.rows,
      statusBreakdown: statusCounts.rows[0],
    }
  } finally {
    client.release()
  }
}

async function main() {
  console.log('Verification sync status\n')

  // DB status
  const dbStatus = await getDbVerificationStatus()
  console.log(`Approved entities: ${dbStatus.totalApproved}`)
  console.log(
    `With verification data: ${dbStatus.withVerification} (${((dbStatus.withVerification / dbStatus.totalApproved) * 100).toFixed(1)}%)`,
  )
  console.log(`Without verification data: ${dbStatus.totalApproved - dbStatus.withVerification}`)
  console.log()

  if (dbStatus.byType.length > 0) {
    console.log('By type:')
    dbStatus.byType.forEach((r) => console.log(`  ${r.entity_type}: ${r.count}`))
    console.log()
  }

  if (dbStatus.statusBreakdown) {
    const sb = dbStatus.statusBreakdown
    console.log('Verification status:')
    console.log(`  Verified (100% fields OK): ${sb.verified_count || 0}`)
    console.log(`  Partial (50-99%): ${sb.partial_count || 0}`)
    console.log(`  Unverified (<50% OK): ${sb.unverified_count || 0}`)
    console.log()
  }

  // R2 progress
  if (doPull) {
    console.log('Pulling progress from R2...')
    const progress = await pullProgressFromR2()
    if (progress) {
      console.log(`  Started: ${progress.started_at || 'unknown'}`)
      console.log(`  Completed entities: ${progress.completed?.length || 0}`)
      if (progress.completed?.length > 0) {
        const localPath = path.join(process.cwd(), 'data', 'verification-progress.json')
        const dir = path.dirname(localPath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(localPath, JSON.stringify(progress, null, 2) + '\n')
        console.log(`  Saved to ${localPath}`)
      }
    }
  }

  // Re-export map data
  if (doExport) {
    console.log('Re-exporting map data...')
    const { generateMapData, splitMapData } = await import('../api/export-map.ts')
    const sql = {
      query: async (q, p) => {
        const res = await pool.query(q, p)
        return res.rows
      },
    }
    const fullData = await generateMapData(sql.query)
    const { skeleton, detail } = splitMapData(fullData)

    const outDir = path.join(process.cwd(), 'public', 'data')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, 'map-data.json'), JSON.stringify(skeleton))
    fs.writeFileSync(path.join(outDir, 'map-detail.json'), JSON.stringify(detail))
    console.log('  Wrote public/data/map-data.json and map-detail.json')

    const entitiesWithFv = [...fullData.people, ...fullData.organizations, ...fullData.resources].filter(
      (e) => e.field_verification && Object.keys(e.field_verification).length > 0,
    ).length
    console.log(`  ${entitiesWithFv} entities have verification data in export`)
  }

  await pool.end()
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
