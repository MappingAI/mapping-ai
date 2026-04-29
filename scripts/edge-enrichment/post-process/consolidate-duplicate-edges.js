#!/usr/bin/env node
/**
 * Consolidate duplicate edge discoveries
 *
 * Identifies edges that represent the same relationship (same funder, recipient, type, amount)
 * but were discovered from different sources. Keeps one row and increments sources_count.
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/consolidate-duplicate-edges.js --dry-run
 *   node scripts/edge-enrichment/post-process/consolidate-duplicate-edges.js --apply
 */
import 'dotenv/config'
import { getConnections, closeConnections } from '../lib/db.js'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const apply = args.includes('--apply')

if (!dryRun && !apply) {
  console.log('Usage: node consolidate-duplicate-edges.js --dry-run | --apply')
  process.exit(1)
}

async function main() {
  const { neon } = await getConnections()
  console.log('=== Consolidate Duplicate Edge Discoveries ===')
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}`)

  // Find duplicate groups (same funder, recipient, type, amount)
  // Group by lowercase names to catch case variations
  const duplicates = await neon.query(`
    WITH duplicate_groups AS (
      SELECT
        LOWER(source_entity_name) as funder_lower,
        LOWER(target_entity_name) as recipient_lower,
        edge_type,
        amount_usd,
        COUNT(*) as count,
        array_agg(discovery_id ORDER BY created_at) as discovery_ids,
        array_agg(source_id ORDER BY created_at) as source_ids,
        MIN(created_at) as first_seen
      FROM edge_discovery
      WHERE status NOT IN ('rejected', 'promoted')
      GROUP BY
        LOWER(source_entity_name),
        LOWER(target_entity_name),
        edge_type,
        amount_usd
      HAVING COUNT(*) > 1
    )
    SELECT * FROM duplicate_groups
    ORDER BY count DESC
  `)

  console.log(`\nFound ${duplicates.rows.length} duplicate groups`)

  if (duplicates.rows.length === 0) {
    console.log('No duplicates to consolidate!')
    await closeConnections()
    return
  }

  // Show summary
  const totalDuplicates = duplicates.rows.reduce((sum, g) => sum + parseInt(g.count) - 1, 0)
  console.log(`Total rows to consolidate: ${totalDuplicates}`)

  let consolidated = 0
  let deleted = 0

  for (const group of duplicates.rows) {
    const [keepId, ...deleteIds] = group.discovery_ids
    const sourcesCount = group.count

    console.log(`\n${group.funder_lower} → ${group.recipient_lower}`)
    console.log(`  Amount: ${group.amount_usd ? `$${group.amount_usd.toLocaleString()}` : 'N/A'}`)
    console.log(`  Sources: ${sourcesCount} (keeping ${keepId}, removing ${deleteIds.length})`)

    if (apply) {
      // Update the kept row with sources_count
      await neon.query(
        `UPDATE edge_discovery
         SET sources_count = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE discovery_id = $2`,
        [sourcesCount, keepId]
      )

      // Delete the duplicate rows
      await neon.query(
        `DELETE FROM edge_discovery WHERE discovery_id = ANY($1)`,
        [deleteIds]
      )

      console.log(`  ✓ Consolidated`)
      consolidated++
      deleted += deleteIds.length
    }
  }

  console.log('\n=== Summary ===')
  if (apply) {
    console.log(`Consolidated: ${consolidated} groups`)
    console.log(`Deleted: ${deleted} duplicate rows`)
  } else {
    console.log(`Would consolidate: ${duplicates.rows.length} groups`)
    console.log(`Would delete: ${totalDuplicates} duplicate rows`)
    console.log('\nRun with --apply to execute')
  }

  // Verify final state
  if (apply) {
    const remaining = await neon.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE sources_count > 1) as multi_source
      FROM edge_discovery
      WHERE status NOT IN ('rejected', 'promoted')
    `)
    console.log(`\nAfter consolidation:`)
    console.log(`  Total edges: ${remaining.rows[0].total}`)
    console.log(`  Multi-source edges: ${remaining.rows[0].multi_source}`)
  }

  await closeConnections()
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
