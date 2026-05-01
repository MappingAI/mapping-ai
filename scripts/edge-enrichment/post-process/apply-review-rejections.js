#!/usr/bin/env node
/**
 * Apply rejections from Claude's review of pending_review edges
 *
 * Based on review of 448 deduplicated edges (508 with duplicates)
 *
 * Usage:
 *   node scripts/edge-enrichment/apply-review-rejections.js --dry-run
 *   node scripts/edge-enrichment/apply-review-rejections.js --apply
 */
import 'dotenv/config'
import pg from 'pg'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

// Row numbers to reject (from Claude's review)
// These are NOT AI-related
const REJECT_ROWS = [
  1, 16, 25, 26, 31, 34, 35, 36, 37, 43, 57, 66, 68, 69, 88, 95, 96, 103, 109, 110,
  113, 114, 118, 120, 121, 123, 126, 131, 132, 133, 136, 138, 146, 149, 155, 161,
  169, 174, 177, 192, 193, 194, 195, 196, 197, 198, 202, 203, 206, 207, 215, 217,
  218, 226, 229, 233, 243, 245, 246, 250, 254, 255, 257, 258, 259, 261, 262, 263,
  283, 310, 311, 322, 326, 327, 328, 329, 331, 332, 335, 340, 341, 358, 369, 372,
  373, 374, 379, 393, 395, 399, 432, 440, 441, 458, 469, 483, 497, 498, 506
]

// Suspicious citations (wrong data, self-referential, etc.)
const SUSPICIOUS_ROWS = [29, 30, 41, 51, 75, 136, 198, 260, 358, 395, 469]

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const apply = process.argv.includes('--apply')

  if (!dryRun && !apply) {
    console.log('Usage:')
    console.log('  --dry-run  Show what would be changed')
    console.log('  --apply    Apply the rejections')
    process.exit(1)
  }

  console.log('=== APPLY REVIEW REJECTIONS ===')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING'}`)
  console.log('')

  // Get the deduplicated edges in the same order as the export
  const edges = await neon.query(`
    SELECT source_entity_id, target_entity_id, amount_usd,
           MIN(discovery_id) as first_discovery_id
    FROM edge_discovery
    WHERE status = 'pending_review'
    GROUP BY source_entity_id, target_entity_id, amount_usd
    ORDER BY amount_usd DESC NULLS LAST
  `)

  console.log(`Total deduplicated edges: ${edges.rows.length}`)

  // Map row numbers to source/target pairs
  const rowToEdge = new Map()
  edges.rows.forEach((e, i) => {
    rowToEdge.set(i + 1, {
      source_entity_id: e.source_entity_id,
      target_entity_id: e.target_entity_id,
      amount_usd: e.amount_usd
    })
  })

  // Collect edges to reject
  const toReject = []
  const toFlagSuspicious = []

  for (const row of REJECT_ROWS) {
    const edge = rowToEdge.get(row)
    if (edge) {
      toReject.push({ row, ...edge })
    } else {
      console.log(`  Warning: Row ${row} not found`)
    }
  }

  for (const row of SUSPICIOUS_ROWS) {
    const edge = rowToEdge.get(row)
    if (edge) {
      toFlagSuspicious.push({ row, ...edge })
    }
  }

  console.log(`\nEdges to reject (not AI-related): ${toReject.length}`)
  console.log(`Edges to flag as suspicious: ${toFlagSuspicious.length}`)

  // Also find and reject self-referential edges (source_entity_id = target_entity_id)
  const selfRef = await neon.query(`
    SELECT discovery_id, source_entity_name, target_entity_name
    FROM edge_discovery
    WHERE status = 'pending_review'
      AND source_entity_id = target_entity_id
  `)
  console.log(`Self-referential edges to reject: ${selfRef.rows.length}`)

  if (!dryRun) {
    console.log('\nApplying rejections...')

    // Reject not-AI-related edges
    for (const edge of toReject) {
      const result = await neon.query(`
        UPDATE edge_discovery
        SET status = 'rejected',
            review_notes = 'Not AI-related (Claude review)'
        WHERE source_entity_id = $1
          AND target_entity_id = $2
          AND ($3::numeric IS NULL AND amount_usd IS NULL OR amount_usd = $3)
          AND status = 'pending_review'
        RETURNING discovery_id
      `, [edge.source_entity_id, edge.target_entity_id, edge.amount_usd])
      console.log(`  Rejected row ${edge.row}: ${result.rowCount} edges`)
    }

    // Flag suspicious edges
    for (const edge of toFlagSuspicious) {
      await neon.query(`
        UPDATE edge_discovery
        SET review_notes = COALESCE(review_notes, '') || ' [SUSPICIOUS CITATION]'
        WHERE source_entity_id = $1
          AND target_entity_id = $2
          AND ($3::numeric IS NULL AND amount_usd IS NULL OR amount_usd = $3)
      `, [edge.source_entity_id, edge.target_entity_id, edge.amount_usd])
    }

    // Reject self-referential edges
    const selfRefResult = await neon.query(`
      UPDATE edge_discovery
      SET status = 'rejected',
          review_notes = 'Self-referential (source = target)'
      WHERE status = 'pending_review'
        AND source_entity_id = target_entity_id
      RETURNING discovery_id
    `)
    console.log(`  Rejected ${selfRefResult.rowCount} self-referential edges`)
  }

  // Summary
  console.log('\n=== SUMMARY ===')
  const remaining = await neon.query(`
    SELECT status, COUNT(*) as count
    FROM edge_discovery
    GROUP BY status
    ORDER BY count DESC
  `)
  for (const r of remaining.rows) {
    console.log(`  ${r.status}: ${r.count}`)
  }

  if (dryRun) {
    console.log('\nRun with --apply to execute these changes.')
  }

  await neon.end()
}

main().catch(console.error)
