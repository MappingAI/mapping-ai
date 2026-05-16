#!/usr/bin/env node

/**
 * Migrate notes verification results from staging to production
 *
 * This script:
 * 1. Copies new sources from staging to production
 * 2. Copies note_claim records from staging to production
 * 3. Updates entity.notes based on note_correction.verified_notes
 * 4. Marks note_correction as applied in staging (does NOT copy table to prod)
 *
 * Usage:
 *   node migrate-notes-to-production.js --dry-run              # Preview all phases
 *   node migrate-notes-to-production.js --phase=sources        # Migrate sources only
 *   node migrate-notes-to-production.js --phase=claims         # Migrate claims only
 *   node migrate-notes-to-production.js --phase=entities       # Update entity.notes only
 *   node migrate-notes-to-production.js --phase=entities --batch=10  # Test batch
 *   node migrate-notes-to-production.js --apply                # Run all phases
 *
 * Safety:
 *   - Requires explicit --apply or --phase flag to make changes
 *   - Takes backup before each phase
 *   - Uses transactions for atomicity
 *   - Validates data before applying
 *   - Logs all changes for audit
 */

import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../../../.env') })

// Parse args
const args = process.argv.slice(2)
const flags = {}
for (const arg of args) {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=')
    flags[key] = value || true
  }
}

const DRY_RUN = !flags.apply && !flags.phase
const PHASE = flags.phase || 'all'
const BATCH_SIZE = flags.batch ? parseInt(flags.batch) : null
const PIPELINE = 'notes-1-opus'

const staging = new pg.Pool({ connectionString: process.env.STAGING_DATABASE_URL })
const production = new pg.Pool({ connectionString: process.env.DATABASE_URL })

// Logging
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const logDir = path.join(__dirname, '../exports')
fs.mkdirSync(logDir, { recursive: true })
const logFile = path.join(logDir, `migration-log-${timestamp}.json`)

const migrationLog = {
  started_at: new Date().toISOString(),
  dry_run: DRY_RUN,
  phase: PHASE,
  batch_size: BATCH_SIZE,
  sources: { migrated: 0, skipped: 0, errors: [] },
  claims: { migrated: 0, skipped: 0, errors: [] },
  entities: { updated: 0, skipped: 0, errors: [] },
}

// ── Backup ──

async function backup(pool, tableName, label) {
  const backupDir = path.join(__dirname, '../../../backups')
  fs.mkdirSync(backupDir, { recursive: true })

  let query
  if (tableName === 'entity') {
    // Only backup notes-related columns
    query = `SELECT id, name, notes FROM entity WHERE notes IS NOT NULL`
  } else {
    query = `SELECT * FROM ${tableName}`
  }

  const result = await pool.query(query)
  const backupPath = path.join(backupDir, `${tableName}-${label}-${timestamp}.json`)
  fs.writeFileSync(backupPath, JSON.stringify(result.rows, null, 2))
  console.log(`  Backup: ${backupPath} (${result.rows.length} rows)`)
  return backupPath
}

// ── Phase 1: Migrate Sources ──

async function migrateSources() {
  console.log('\n' + '='.repeat(50))
  console.log('PHASE 1: MIGRATE SOURCES')
  console.log('='.repeat(50) + '\n')

  // Get source_ids used by our note_claims
  const usedSourceIds = await staging.query(`
    SELECT DISTINCT source_id
    FROM note_claim
    WHERE source_id IS NOT NULL
      AND extracted_by = $1
  `, [PIPELINE])

  const sourceIds = usedSourceIds.rows.map(r => r.source_id)
  console.log(`Sources referenced by note_claims: ${sourceIds.length}`)

  if (sourceIds.length === 0) {
    console.log('No sources to migrate.')
    return
  }

  // Get these sources from staging
  const stagingSources = await staging.query(
    `SELECT * FROM source WHERE source_id = ANY($1)`,
    [sourceIds]
  )

  // Check which already exist in production
  const prodSources = await production.query(
    `SELECT source_id FROM source WHERE source_id = ANY($1)`,
    [sourceIds]
  )
  const prodSourceSet = new Set(prodSources.rows.map(r => r.source_id))

  const newSources = stagingSources.rows.filter(s => !prodSourceSet.has(s.source_id))
  const existingSources = stagingSources.rows.filter(s => prodSourceSet.has(s.source_id))

  console.log(`Already in production: ${existingSources.length}`)
  console.log(`New sources to migrate: ${newSources.length}`)

  if (DRY_RUN) {
    console.log('\nDRY RUN - would migrate:')
    newSources.slice(0, 10).forEach(s => {
      console.log(`  ${s.source_id}: ${s.url?.substring(0, 60)}...`)
    })
    if (newSources.length > 10) console.log(`  ... and ${newSources.length - 10} more`)
    return
  }

  if (newSources.length === 0) {
    console.log('No new sources to migrate.')
    return
  }

  // Backup production source table
  await backup(production, 'source', 'pre-notes-migrate')

  // Migrate in transaction
  const client = await production.connect()
  try {
    await client.query('BEGIN')

    for (const source of newSources) {
      try {
        await client.query(`
          INSERT INTO source (source_id, url, title, author, publisher, date_published,
                              source_type, cached_excerpt, resource_entity_id, created_at, last_verified_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (source_id) DO NOTHING
        `, [
          source.source_id, source.url, source.title, source.author, source.publisher,
          source.date_published, source.source_type, source.cached_excerpt,
          source.resource_entity_id, source.created_at, source.last_verified_at
        ])
        migrationLog.sources.migrated++
      } catch (err) {
        migrationLog.sources.errors.push({ source_id: source.source_id, error: err.message })
      }
    }

    await client.query('COMMIT')
    console.log(`\n✓ Migrated ${migrationLog.sources.migrated} sources`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('ROLLBACK: Source migration failed:', err.message)
    throw err
  } finally {
    client.release()
  }
}

// ── Phase 2: Migrate Claims ──

async function migrateClaims() {
  console.log('\n' + '='.repeat(50))
  console.log('PHASE 2: MIGRATE NOTE_CLAIMS')
  console.log('='.repeat(50) + '\n')

  // Get staging claims
  const stagingClaims = await staging.query(`
    SELECT * FROM note_claim WHERE extracted_by = $1
  `, [PIPELINE])

  console.log(`Total claims in staging: ${stagingClaims.rows.length}`)

  // Check existing in production
  const prodClaims = await production.query(`
    SELECT entity_id, claim_text FROM note_claim WHERE extracted_by = $1
  `, [PIPELINE])

  // Create a set for deduplication (entity_id + claim_text)
  const prodClaimSet = new Set(
    prodClaims.rows.map(r => `${r.entity_id}:${r.claim_text?.substring(0, 100)}`)
  )

  const newClaims = stagingClaims.rows.filter(c =>
    !prodClaimSet.has(`${c.entity_id}:${c.claim_text?.substring(0, 100)}`)
  )

  console.log(`Already in production: ${prodClaims.rows.length}`)
  console.log(`New claims to migrate: ${newClaims.length}`)

  // Breakdown by verdict
  const supported = newClaims.filter(c => c.verdict === 'supported').length
  const unsupported = newClaims.filter(c => c.verdict === 'unsupported').length
  console.log(`  - supported: ${supported}`)
  console.log(`  - unsupported: ${unsupported}`)

  if (DRY_RUN) {
    console.log('\nDRY RUN - would migrate:')
    newClaims.slice(0, 10).forEach(c => {
      console.log(`  [${c.entity_id}] ${c.verdict}: ${c.claim_text?.substring(0, 50)}...`)
    })
    if (newClaims.length > 10) console.log(`  ... and ${newClaims.length - 10} more`)
    return
  }

  if (newClaims.length === 0) {
    console.log('No new claims to migrate.')
    return
  }

  // Backup production note_claim table
  await backup(production, 'note_claim', 'pre-notes-migrate')

  // Migrate in transaction
  const client = await production.connect()
  try {
    await client.query('BEGIN')

    for (const claim of newClaims) {
      try {
        await client.query(`
          INSERT INTO note_claim (
            entity_id, source_id, correction_id, claim_text, claim_type,
            citation, verdict, confidence, extracted_by, extraction_model,
            extraction_date, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          claim.entity_id, claim.source_id, null, // correction_id stays null in prod
          claim.claim_text, claim.claim_type, claim.citation, claim.verdict,
          claim.confidence, claim.extracted_by, claim.extraction_model,
          claim.extraction_date, claim.created_at
        ])
        migrationLog.claims.migrated++
      } catch (err) {
        migrationLog.claims.errors.push({ entity_id: claim.entity_id, error: err.message })
      }
    }

    await client.query('COMMIT')
    console.log(`\n✓ Migrated ${migrationLog.claims.migrated} claims`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('ROLLBACK: Claim migration failed:', err.message)
    throw err
  } finally {
    client.release()
  }
}

// ── Phase 3: Update Entity Notes ──

async function updateEntityNotes() {
  console.log('\n' + '='.repeat(50))
  console.log('PHASE 3: UPDATE ENTITY NOTES')
  console.log('='.repeat(50) + '\n')

  // Get pending corrections
  let query = `
    SELECT id, entity_id, entity_name, original_notes, verified_notes, confidence
    FROM note_correction
    WHERE pipeline = $1
      AND status = 'pending'
      AND verified_notes IS NOT NULL
    ORDER BY entity_id
  `
  const params = [PIPELINE]

  const corrections = await staging.query(query, params)
  let toApply = corrections.rows

  console.log(`Pending corrections: ${toApply.length}`)

  // Apply batch limit if specified
  if (BATCH_SIZE && toApply.length > BATCH_SIZE) {
    console.log(`Batch size: ${BATCH_SIZE} (limiting)`)
    toApply = toApply.slice(0, BATCH_SIZE)
  }

  // Breakdown by confidence
  const high = toApply.filter(c => c.confidence === 'high').length
  const medium = toApply.filter(c => c.confidence === 'medium').length
  const low = toApply.filter(c => c.confidence === 'low').length
  console.log(`  - high confidence: ${high}`)
  console.log(`  - medium confidence: ${medium}`)
  console.log(`  - low confidence: ${low}`)

  if (DRY_RUN) {
    console.log('\nDRY RUN - would update:')
    toApply.slice(0, 15).forEach(c => {
      const origLen = c.original_notes?.length || 0
      const newLen = c.verified_notes?.length || 0
      const delta = newLen - origLen
      const sign = delta >= 0 ? '+' : ''
      console.log(`  [${c.entity_id}] ${c.entity_name}`)
      console.log(`      ${origLen} → ${newLen} chars (${sign}${delta}) [${c.confidence}]`)
    })
    if (toApply.length > 15) console.log(`  ... and ${toApply.length - 15} more`)
    return
  }

  if (toApply.length === 0) {
    console.log('No corrections to apply.')
    return
  }

  // Backup production entity notes
  await backup(production, 'entity', 'pre-notes-migrate')

  // Apply in transaction
  const prodClient = await production.connect()
  const stagingClient = await staging.connect()
  const appliedAt = new Date().toISOString()
  const appliedBy = 'migrate-notes-to-production'

  try {
    await prodClient.query('BEGIN')
    await stagingClient.query('BEGIN')

    for (const c of toApply) {
      try {
        // Update entity.notes in production
        const result = await prodClient.query(
          `UPDATE entity SET notes = $1 WHERE id = $2 RETURNING id`,
          [c.verified_notes, c.entity_id]
        )

        if (result.rowCount === 0) {
          console.log(`  ⚠ [${c.entity_id}] ${c.entity_name} - entity not found in production`)
          migrationLog.entities.skipped++
          continue
        }

        // Mark as applied in staging
        await stagingClient.query(
          `UPDATE note_correction
           SET status = 'applied', applied_at = $1, applied_by = $2
           WHERE id = $3`,
          [appliedAt, appliedBy, c.id]
        )

        migrationLog.entities.updated++
        console.log(`  ✓ [${c.entity_id}] ${c.entity_name}`)
      } catch (err) {
        migrationLog.entities.errors.push({
          entity_id: c.entity_id,
          entity_name: c.entity_name,
          error: err.message
        })
        console.error(`  ✗ [${c.entity_id}] ${c.entity_name}: ${err.message}`)
      }
    }

    await prodClient.query('COMMIT')
    await stagingClient.query('COMMIT')
    console.log(`\n✓ Updated ${migrationLog.entities.updated} entities`)
  } catch (err) {
    await prodClient.query('ROLLBACK')
    await stagingClient.query('ROLLBACK')
    console.error('ROLLBACK: Entity update failed:', err.message)
    throw err
  } finally {
    prodClient.release()
    stagingClient.release()
  }
}

// ── Verify Migration ──

async function verifyMigration() {
  console.log('\n' + '='.repeat(50))
  console.log('VERIFICATION')
  console.log('='.repeat(50) + '\n')

  // Check staging status
  const stagingStatus = await staging.query(`
    SELECT status, COUNT(*)
    FROM note_correction
    WHERE pipeline = $1
    GROUP BY status
  `, [PIPELINE])

  console.log('Staging note_correction status:')
  for (const r of stagingStatus.rows) {
    console.log(`  ${r.status}: ${r.count}`)
  }

  // Check production note_claim count
  const prodClaims = await production.query(`
    SELECT COUNT(*) FROM note_claim WHERE extracted_by = $1
  `, [PIPELINE])
  console.log(`\nProduction note_claim records: ${prodClaims.rows[0].count}`)

  // Check a sample entity
  const applied = await staging.query(`
    SELECT entity_id, entity_name
    FROM note_correction
    WHERE pipeline = $1 AND status = 'applied'
    LIMIT 1
  `, [PIPELINE])

  if (applied.rows.length > 0) {
    const entityId = applied.rows[0].entity_id
    const prodEntity = await production.query(
      `SELECT id, name, LENGTH(notes) as notes_len FROM entity WHERE id = $1`,
      [entityId]
    )
    if (prodEntity.rows.length > 0) {
      console.log(`\nSample applied entity:`)
      console.log(`  [${prodEntity.rows[0].id}] ${prodEntity.rows[0].name}`)
      console.log(`  Notes length: ${prodEntity.rows[0].notes_len} chars`)
    }
  }
}

// ── Main ──

async function main() {
  console.log('='.repeat(50))
  console.log('MIGRATE NOTES VERIFICATION TO PRODUCTION')
  console.log('='.repeat(50))

  if (DRY_RUN) {
    console.log('\nMODE: DRY RUN (no changes will be made)')
  } else {
    console.log(`\nMODE: APPLY (phase: ${PHASE})`)
  }

  if (BATCH_SIZE) {
    console.log(`BATCH SIZE: ${BATCH_SIZE}`)
  }

  try {
    if (PHASE === 'all' || PHASE === 'sources') {
      await migrateSources()
    }

    if (PHASE === 'all' || PHASE === 'claims') {
      await migrateClaims()
    }

    if (PHASE === 'all' || PHASE === 'entities') {
      await updateEntityNotes()
    }

    // Verify if we made changes
    if (!DRY_RUN) {
      await verifyMigration()
    }

    // Save migration log
    migrationLog.completed_at = new Date().toISOString()
    fs.writeFileSync(logFile, JSON.stringify(migrationLog, null, 2))
    console.log(`\nMigration log: ${logFile}`)

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('SUMMARY')
    console.log('='.repeat(50))
    console.log(`Sources: ${migrationLog.sources.migrated} migrated, ${migrationLog.sources.errors.length} errors`)
    console.log(`Claims: ${migrationLog.claims.migrated} migrated, ${migrationLog.claims.errors.length} errors`)
    console.log(`Entities: ${migrationLog.entities.updated} updated, ${migrationLog.entities.skipped} skipped, ${migrationLog.entities.errors.length} errors`)

    if (DRY_RUN) {
      console.log('\n--- DRY RUN COMPLETE ---')
      console.log('Run with --apply to make all changes')
      console.log('Or run phases individually:')
      console.log('  --phase=sources   Migrate sources only')
      console.log('  --phase=claims    Migrate claims only')
      console.log('  --phase=entities  Update entity notes only')
      console.log('  --phase=entities --batch=10  Test batch of 10')
    }

  } finally {
    await staging.end()
    await production.end()
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
