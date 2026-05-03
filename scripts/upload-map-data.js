/**
 * Upload map-data.json and map-detail.json to R2.
 *
 * Usage:
 *   node scripts/upload-map-data.js
 *
 * Requires:
 *   - map-data.json and map-detail.json in project root (run db:export-map first)
 *   - R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY in .env
 */
import 'dotenv/config'
import fs from 'fs'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const BUCKET = 'mapping-ai-data'
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'ac57c6d87068ab259c6f54dba468de8d'

async function main() {
  const keyId = process.env.R2_ACCESS_KEY_ID
  const secret = process.env.R2_SECRET_ACCESS_KEY

  if (!keyId || !secret) {
    console.error('R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY required')
    process.exit(1)
  }

  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: keyId, secretAccessKey: secret },
  })

  const files = ['map-data.json', 'map-detail.json']

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`${file} not found. Run 'pnpm run db:export-map' first.`)
      process.exit(1)
    }

    const body = fs.readFileSync(file)
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: file,
        Body: body,
        ContentType: 'application/json',
        CacheControl: 'public, max-age=300, s-maxage=3600',
      }),
    )
    console.log(`✓ ${file} (${(body.length / 1024).toFixed(0)} KB)`)
  }

  console.log('\nUploaded to R2. Served via /data/map-data.json and /data/map-detail.json')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
