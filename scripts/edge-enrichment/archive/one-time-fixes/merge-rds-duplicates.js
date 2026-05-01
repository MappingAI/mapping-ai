#!/usr/bin/env node
/**
 * Merge internal RDS entity duplicates
 *
 * For each duplicate pair:
 * 1. Keep the entity with canonical name (or more edges)
 * 2. Update all edges pointing to the duplicate to point to the primary
 * 3. Delete the duplicate entity
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/merge-rds-duplicates.js --dry-run
 *   node scripts/edge-enrichment/post-process/merge-rds-duplicates.js --apply
 */
import 'dotenv/config'
import pg from 'pg'

const rds = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// Duplicate pairs: { keep: ID to keep, remove: ID to delete }
// Based on canonical name preference and edge count
const DUPLICATE_PAIRS = [
  { keep: 1052, remove: 875, keepName: 'DAIR Institute', removeName: 'DAIR' },
  { keep: 1117, remove: 432, keepName: 'International Association for Safe and Ethical AI', removeName: 'International Association for Safe & Ethical AI (IASEAI)' },
  { keep: 947, remove: 1362, keepName: 'MIT CSAIL', removeName: 'MIT Computer Science & Artificial Intelligence Laboratory' },
  { keep: 255, remove: 1731, keepName: 'Survival and Flourishing Fund', removeName: 'Survival & Flourishing Fund' },
  { keep: 1113, remove: 1053, keepName: 'Mila - Quebec Artificial Intelligence Institute', removeName: 'Mila' },
  { keep: 284, remove: 1569, keepName: 'Long-Term Future Fund', removeName: 'LTFF' },
  { keep: 415, remove: 1570, keepName: 'ML Alignment & Theory Scholars (MATS)', removeName: 'SERI-MATS' },
]

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const apply = process.argv.includes('--apply')

  if (!dryRun && !apply) {
    console.log('Usage:')
    console.log('  --dry-run  Show what would be merged')
    console.log('  --apply    Actually perform the merges')
    process.exit(1)
  }

  console.log(`=== MERGE RDS ENTITY DUPLICATES ===`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING CHANGES'}\n`)

  let totalEdgesUpdated = 0
  let totalEntitiesDeleted = 0

  for (const { keep, remove, keepName, removeName } of DUPLICATE_PAIRS) {
    console.log(`\n${removeName} [${remove}] → ${keepName} [${keep}]`)

    // Find edges that reference the entity to remove
    const sourceEdges = await rds.query(`
      SELECT id, source_id, target_id FROM edge WHERE source_id = $1
    `, [remove])

    const targetEdges = await rds.query(`
      SELECT id, source_id, target_id FROM edge WHERE target_id = $1
    `, [remove])

    console.log(`  Found ${sourceEdges.rows.length} source edges, ${targetEdges.rows.length} target edges`)

    if (!dryRun) {
      // Update source edges
      for (const edge of sourceEdges.rows) {
        // Check if this would create a duplicate edge
        const existing = await rds.query(`
          SELECT id FROM edge WHERE source_id = $1 AND target_id = $2 AND edge_type = (
            SELECT edge_type FROM edge WHERE id = $3
          )
        `, [keep, edge.target_id, edge.id])

        if (existing.rows.length > 0) {
          // Delete duplicate instead of updating
          await rds.query(`DELETE FROM edge WHERE id = $1`, [edge.id])
          console.log(`  ⊕ Deleted duplicate edge ${edge.id}`)
        } else {
          await rds.query(`UPDATE edge SET source_id = $1 WHERE id = $2`, [keep, edge.id])
          totalEdgesUpdated++
        }
      }

      // Update target edges
      for (const edge of targetEdges.rows) {
        // Check if this would create a duplicate edge
        const existing = await rds.query(`
          SELECT id FROM edge WHERE source_id = $1 AND target_id = $2 AND edge_type = (
            SELECT edge_type FROM edge WHERE id = $3
          )
        `, [edge.source_id, keep, edge.id])

        if (existing.rows.length > 0) {
          // Delete duplicate instead of updating
          await rds.query(`DELETE FROM edge WHERE id = $1`, [edge.id])
          console.log(`  ⊕ Deleted duplicate edge ${edge.id}`)
        } else {
          await rds.query(`UPDATE edge SET target_id = $1 WHERE id = $2`, [keep, edge.id])
          totalEdgesUpdated++
        }
      }

      // Delete the duplicate entity
      await rds.query(`DELETE FROM entity WHERE id = $1`, [remove])
      totalEntitiesDeleted++
      console.log(`  ✓ Deleted entity ${remove}`)
    } else {
      totalEdgesUpdated += sourceEdges.rows.length + targetEdges.rows.length
      totalEntitiesDeleted++
    }
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Edges updated: ${totalEdgesUpdated}`)
  console.log(`Entities deleted: ${totalEntitiesDeleted}`)

  if (dryRun) {
    console.log('\nRun with --apply to execute these changes.')
  }

  await rds.end()
}

main().catch(console.error)
