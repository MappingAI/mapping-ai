/**
 * Backup all DB tables to S3 as timestamped JSON + SQL inserts.
 *
 * Usage:
 *   node scripts/backup-db.js           # backup to S3
 *   node scripts/backup-db.js --local   # backup to local file only
 *
 * Requires: DATABASE_URL, AWS credentials (from .env)
 */
import pg from 'pg'
import 'dotenv/config'
import fs from 'fs'
import { execSync } from 'child_process'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const S3_BUCKET = 'mapping-ai-website-561047280976'
const BACKUP_PREFIX = 'backups/'
const TABLES = ['entity', 'submission', 'edge']
const LOCAL_ONLY = process.argv.includes('--local')

function escapeSQL(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (typeof val === 'number') return String(val)
  if (val instanceof Date) return `'${val.toISOString()}'`
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`
  return `'${String(val).replace(/'/g, "''")}'`
}

function rowToInsert(table, row) {
  const cols = Object.keys(row).join(', ')
  const vals = Object.values(row).map(escapeSQL).join(', ')
  return `INSERT INTO ${table} (${cols}) VALUES (${vals});`
}

async function backup() {
  const client = await pool.connect()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const jsonData = { _meta: { backed_up_at: new Date().toISOString(), tables: {} } }
  const sqlLines = [
    `-- mapping-ai DB backup: ${new Date().toISOString()}`,
    `-- Restore with: psql $DATABASE_URL < this_file.sql\n`,
  ]

  try {
    console.log(`Backing up database (${timestamp})...\n`)

    for (const table of TABLES) {
      const result = await client.query(`SELECT * FROM ${table} ORDER BY id`)
      jsonData._meta.tables[table] = result.rows.length
      jsonData[table] = result.rows

      sqlLines.push(`-- ${table}: ${result.rows.length} rows`)
      sqlLines.push(`DELETE FROM ${table};`)
      for (const row of result.rows) {
        sqlLines.push(rowToInsert(table, row))
      }
      // Reset sequence to max id + 1
      if (result.rows.length > 0) {
        const maxId = Math.max(...result.rows.map((r) => r.id))
        sqlLines.push(`SELECT setval('${table}_id_seq', ${maxId}, true);`)
      }
      sqlLines.push('')

      console.log(`  ✓ ${table}: ${result.rows.length} rows`)
    }

    // Write local files
    const jsonFile = `backup-${timestamp}.json`
    const sqlFile = `backup-${timestamp}.sql`
    fs.writeFileSync(jsonFile, JSON.stringify(jsonData, null, 2))
    fs.writeFileSync(sqlFile, sqlLines.join('\n'))
    console.log(`\n✓ Local files: ${jsonFile}, ${sqlFile}`)

    // Upload to S3
    if (!LOCAL_ONLY) {
      const s3JsonKey = `${BACKUP_PREFIX}${jsonFile}`
      const s3SqlKey = `${BACKUP_PREFIX}${sqlFile}`
      execSync(`aws s3 cp ${jsonFile} s3://${S3_BUCKET}/${s3JsonKey} --region eu-west-2`, {
        stdio: 'inherit',
      })
      execSync(`aws s3 cp ${sqlFile} s3://${S3_BUCKET}/${s3SqlKey} --region eu-west-2`, {
        stdio: 'inherit',
      })
      console.log(`✓ Uploaded to s3://${S3_BUCKET}/${BACKUP_PREFIX}`)

      // Clean up local files after successful upload
      fs.unlinkSync(jsonFile)
      fs.unlinkSync(sqlFile)
      console.log('✓ Cleaned up local files')
    }

    console.log('\nDone.')
  } finally {
    client.release()
    await pool.end()
  }
}

backup().catch((err) => {
  console.error('Backup failed:', err)
  process.exit(1)
})
