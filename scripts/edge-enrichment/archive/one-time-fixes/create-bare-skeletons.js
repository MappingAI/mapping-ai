#!/usr/bin/env node
/**
 * Create Bare Skeleton Entities - NO API CALLS
 *
 * Simply inserts entity names from edge_discovery into RDS with status='pending'.
 * No classification, no enrichment - that happens in a single combined pass later.
 *
 * Usage:
 *   node scripts/edge-enrichment/create-bare-skeletons.js --dry-run
 *   node scripts/edge-enrichment/create-bare-skeletons.js --apply
 */
import 'dotenv/config'
import pg from 'pg'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

const rds = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const apply = process.argv.includes('--apply')

  if (!dryRun && !apply) {
    console.log('Usage:')
    console.log('  --dry-run  Show what would be created')
    console.log('  --apply    Actually create the skeletons')
    process.exit(1)
  }

  console.log('=== CREATE BARE SKELETON ENTITIES ===')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING'}`)
  console.log('No API calls - just inserting names\n')

  // Get unique unmatched entity names
  const entities = await neon.query(`
    SELECT DISTINCT name FROM (
      SELECT source_entity_name as name
      FROM edge_discovery
      WHERE status = 'pending_entities' AND source_entity_id IS NULL
      UNION
      SELECT target_entity_name as name
      FROM edge_discovery
      WHERE status = 'pending_entities' AND target_entity_id IS NULL
    ) sub
    ORDER BY name
  `)

  console.log(`Found ${entities.rows.length} unique unmatched entities\n`)

  if (entities.rows.length === 0) {
    console.log('Nothing to create!')
    await neon.end()
    await rds.end()
    return
  }

  let created = 0
  let skipped = 0
  const rdsClient = await rds.connect()

  try {
    for (const { name } of entities.rows) {
      // Check if entity already exists in RDS (case-insensitive)
      const existing = await rdsClient.query(`
        SELECT id, name FROM entity WHERE LOWER(name) = LOWER($1)
      `, [name])

      if (existing.rows.length > 0) {
        // Link to existing entity
        const existingId = existing.rows[0].id

        if (!dryRun) {
          await neon.query(`
            UPDATE edge_discovery
            SET source_entity_id = $2, updated_at = NOW()
            WHERE status = 'pending_entities'
              AND LOWER(source_entity_name) = LOWER($1)
              AND source_entity_id IS NULL
          `, [name, existingId])

          await neon.query(`
            UPDATE edge_discovery
            SET target_entity_id = $2, updated_at = NOW()
            WHERE status = 'pending_entities'
              AND LOWER(target_entity_name) = LOWER($1)
              AND target_entity_id IS NULL
          `, [name, existingId])
        }

        console.log(`  ⊕ "${name}" → existing ID ${existingId}`)
        skipped++
        continue
      }

      // Create bare skeleton (entity_type required, will be updated during enrichment)
      if (!dryRun) {
        const result = await rdsClient.query(`
          INSERT INTO entity (name, entity_type, status, created_at, updated_at)
          VALUES ($1, 'organization', 'pending', NOW(), NOW())
          RETURNING id
        `, [name])

        const newId = result.rows[0].id

        // Update edge_discovery references
        await neon.query(`
          UPDATE edge_discovery
          SET source_entity_id = $2, updated_at = NOW()
          WHERE status = 'pending_entities'
            AND LOWER(source_entity_name) = LOWER($1)
            AND source_entity_id IS NULL
        `, [name, newId])

        await neon.query(`
          UPDATE edge_discovery
          SET target_entity_id = $2, updated_at = NOW()
          WHERE status = 'pending_entities'
            AND LOWER(target_entity_name) = LOWER($1)
            AND target_entity_id IS NULL
        `, [name, newId])

        console.log(`  ✓ "${name}" → new ID ${newId}`)
      } else {
        console.log(`  ✓ "${name}" → would create`)
      }

      created++
    }
  } finally {
    rdsClient.release()
  }

  // Final status
  const status = await neon.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE source_entity_id IS NOT NULL AND target_entity_id IS NOT NULL) as ready,
      COUNT(*) FILTER (WHERE source_entity_id IS NULL OR target_entity_id IS NULL) as pending
    FROM edge_discovery
    WHERE status = 'pending_entities'
  `)

  console.log('\n=== SUMMARY ===')
  console.log(`Created: ${created}`)
  console.log(`Linked to existing: ${skipped}`)
  console.log(`\nEdge status:`)
  console.log(`  Ready to promote: ${status.rows[0].ready}`)
  console.log(`  Still pending: ${status.rows[0].pending}`)

  if (dryRun) {
    console.log('\nRun with --apply to create entities.')
  }

  await neon.end()
  await rds.end()
}

main().catch(console.error)
