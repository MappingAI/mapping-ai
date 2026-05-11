/**
 * Pre-run backup utility for verification/enrichment scripts.
 *
 * Creates timestamped backups of all tables to local files AND R2.
 * Call runPreBackup() at the start of any script that modifies the DB.
 *
 * Usage:
 *   import { runPreBackup } from './lib/backup.js';
 *   await runPreBackup(pool, { label: 'belief-verification', r2: true });
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKUP_DIR = path.join(__dirname, '../../backups')

const TABLES = [
  { name: 'entity', orderBy: 'id' },
  { name: 'submission', orderBy: 'id' },
  { name: 'edge', orderBy: 'id' },
  { name: 'claim', orderBy: 'entity_id, claim_id' },
  { name: 'source', orderBy: 'source_id' },
  { name: 'field_feedback', orderBy: 'id' },
  { name: 'field_notes', orderBy: 'id' },
]

async function getR2Client() {
  const keyId = process.env.R2_ACCESS_KEY_ID
  const secret = process.env.R2_SECRET_ACCESS_KEY
  if (!keyId || !secret) return null
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'ac57c6d87068ab259c6f54dba468de8d'
  const { S3Client } = await import('@aws-sdk/client-s3')
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: keyId, secretAccessKey: secret },
  })
}

export async function runPreBackup(pool, options = {}) {
  const { label = 'unknown', r2 = true, tables = TABLES } = options

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `backup-${label}-${ts}.json`

  console.log(`\n  Pre-run backup (${label})...`)

  const backup = {
    _meta: {
      backed_up_at: new Date().toISOString(),
      label,
      tables: {},
    },
  }

  for (const { name, orderBy } of tables) {
    try {
      const r = await pool.query(`SELECT * FROM ${name} ORDER BY ${orderBy}`)
      backup[name] = r.rows
      backup._meta.tables[name] = r.rows.length
    } catch (e) {
      backup._meta.tables[name] = `error: ${e.message.substring(0, 50)}`
    }
  }

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })

  const json = JSON.stringify(backup)
  const localPath = path.join(BACKUP_DIR, filename)
  fs.writeFileSync(localPath, json)
  const sizeMB = (json.length / 1024 / 1024).toFixed(1)
  console.log(`  Local: ${localPath} (${sizeMB}MB)`)

  if (r2) {
    try {
      const r2Client = await getR2Client()
      if (r2Client) {
        const { PutObjectCommand } = await import('@aws-sdk/client-s3')
        await r2Client.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET || 'mapping-ai-data',
            Key: `backups/${filename}`,
            Body: json,
            ContentType: 'application/json',
          }),
        )
        console.log(`  R2: backups/${filename}`)
      } else {
        console.log(`  R2: skipped (no credentials)`)
      }
    } catch (e) {
      console.log(`  R2: failed (${e.message.substring(0, 50)})`)
    }
  }

  const tableSummary = Object.entries(backup._meta.tables)
    .map(([t, c]) => `${t}:${c}`)
    .join(', ')
  console.log(`  Tables: ${tableSummary}`)
  console.log('')

  return { localPath, filename }
}
