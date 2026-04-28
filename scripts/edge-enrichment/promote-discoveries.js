#!/usr/bin/env node
/**
 * Promote approved edge discoveries to RDS
 * Creates edge in RDS + edge_evidence in Neon
 *
 * Usage:
 *   node scripts/edge-enrichment/promote-discoveries.js
 *   node scripts/edge-enrichment/promote-discoveries.js --dry-run
 */
import { getConnections, closeConnections } from './lib/db.js'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

async function main() {
  console.log('=== Promoting Approved Discoveries ===')
  if (dryRun) console.log('[DRY-RUN MODE]')

  const { rds, neon } = await getConnections()
  console.log('Connected to databases')

  // Get approved discoveries ready for promotion
  const approved = await neon.query(`
    SELECT *
    FROM edge_discovery
    WHERE status = 'approved'
      AND source_entity_id IS NOT NULL
      AND target_entity_id IS NOT NULL
    ORDER BY created_at
  `)

  console.log(`Found ${approved.rows.length} approved discoveries ready for promotion\n`)

  if (approved.rows.length === 0) {
    console.log('Nothing to promote.')
    await closeConnections()
    return
  }

  let promoted = 0
  let skipped = 0
  let errors = 0

  for (const discovery of approved.rows) {
    console.log(`\nProcessing: ${discovery.source_entity_name} → ${discovery.target_entity_name}`)

    try {
      // Check if edge already exists (idempotent)
      const existing = await rds.query(
        `SELECT id FROM edge
         WHERE source_id = $1 AND target_id = $2 AND edge_type = $3`,
        [discovery.source_entity_id, discovery.target_entity_id, discovery.edge_type]
      )

      let edgeId
      if (existing.rows.length > 0) {
        edgeId = existing.rows[0].id
        console.log(`  Edge already exists: ${edgeId}`)
      } else {
        if (dryRun) {
          console.log(`  [DRY-RUN] Would create edge`)
          edgeId = 'dry-run'
        } else {
          // Create edge in RDS
          const newEdge = await rds.query(
            `INSERT INTO edge (source_id, target_id, edge_type, created_by)
             VALUES ($1, $2, $3, 'edge_discovery')
             RETURNING id`,
            [discovery.source_entity_id, discovery.target_entity_id, discovery.edge_type]
          )
          edgeId = newEdge.rows[0].id
          console.log(`  Created edge: ${edgeId}`)
        }
      }

      if (!dryRun) {
        // Create edge_evidence in Neon
        const evidenceId = `${edgeId}_${discovery.source_id}`
        await neon.query(
          `INSERT INTO edge_evidence (
            evidence_id, edge_id, source_id,
            start_date, end_date, amount_usd, amount_note,
            citation, confidence,
            extracted_by, extraction_model, extraction_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (evidence_id) DO NOTHING`,
          [
            evidenceId,
            edgeId,
            discovery.source_id,
            discovery.start_date,
            discovery.end_date,
            discovery.amount_usd,
            discovery.amount_note,
            discovery.citation,
            discovery.confidence,
            discovery.extracted_by,
            discovery.extraction_model,
            discovery.extraction_date,
          ]
        )
        console.log(`  Created evidence: ${evidenceId}`)

        // Update discovery status
        await neon.query(
          `UPDATE edge_discovery
           SET status = 'promoted',
               promoted_edge_id = $2,
               promoted_at = NOW()
           WHERE discovery_id = $1`,
          [discovery.discovery_id, edgeId]
        )
        console.log(`  Marked as promoted`)
      }

      promoted++
    } catch (err) {
      console.error(`  ERROR: ${err.message}`)
      errors++
    }
  }

  console.log('\n=== Summary ===')
  console.log(`Promoted: ${promoted}`)
  console.log(`Errors: ${errors}`)
  if (dryRun) {
    console.log('\n[DRY-RUN] No changes made. Run without --dry-run to promote.')
  }

  await closeConnections()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
