#!/usr/bin/env node
/**
 * Apply entity overlap mappings from Claude.ai review
 *
 * This script handles:
 * 1. DUPLICATE entities (CREATE → RDS exact match) - edges use existing RDS entity
 * 2. MAP entities (CREATE → RDS alias/variant) - edges map to canonical RDS name
 * 3. Internal CREATE duplicates - merge before entity creation
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/apply-overlap-mappings.js --dry-run
 *   node scripts/edge-enrichment/post-process/apply-overlap-mappings.js --apply
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

// EXACT DUPLICATES: These CREATE entities already exist in RDS
// We need to find their RDS IDs and link the edges
const EXACT_DUPLICATES = [
  'Alphabet Inc.',
  'Amazon',
  'Anduril Industries',
  'Center for Security and Emerging Technology (CSET)',
  'DARPA',
  'DeepSeek',
  'Department of Commerce',
  'EA Infrastructure Fund',
  'European Commission',
  'Ford Foundation',
  'Google DeepMind',
  'Greylock',
  'Huawei',
  'Long-Term Future Fund',
  'Microsoft',
  'Redwood Research',
  'Sequoia Capital',
  'SoftBank',
  'Stanford HAI',
  'UC Berkeley',
  'University College London',
  'University of Cambridge',
  'University of Michigan',
  'University of Toronto',
  'USC',
]

// ALIAS MAPPINGS: CREATE entity → canonical RDS name
const ALIAS_MAPPINGS = [
  { alias: 'Advanced Research and Invention Agency (ARIA)', mapTo: 'Advanced Research + Invention Agency (ARIA)' },
  { alias: 'AI Safety Tactical Opportunities Fund', mapTo: 'AI Safety Tactical Opportunities Fund (AISTOF)' },
  { alias: 'ARC (Alignment Research Center)', mapTo: 'Alignment Research Center (ARC)' },
  { alias: 'Center for Democracy and Technology', mapTo: 'Center for Democracy & Technology' },
  { alias: 'DAIR', mapTo: 'DAIR' }, // Maps to existing DAIR (will use DAIR Institute after RDS cleanup)
  { alias: 'Global Priorities Institute', mapTo: 'Global Priorities Institute (University of Oxford)' },
  { alias: 'Greenoaks Capital Partners', mapTo: 'Greenoaks Capital' },
  { alias: 'International Association for Safe and Ethical AI (IASEAI)', mapTo: 'International Association for Safe and Ethical AI' },
  { alias: 'Longview', mapTo: 'Longview Philanthropy' },
  { alias: 'MGX', mapTo: 'MGX investment group' },
  { alias: 'MIT CSAIL', mapTo: 'MIT CSAIL' }, // Exact match exists
  { alias: 'National Science Foundation', mapTo: 'U.S. National Science Foundation' },
  { alias: 'Open Philanthropy', mapTo: 'Coefficient Giving (formerly Open Philanthropy)' },
  { alias: 'PIBBSS', mapTo: 'PIBBSS Fellowship (Principles of Intelligent Behavior in Biological and Social Systems)' },
  { alias: 'Survival and Flourishing Fund', mapTo: 'Survival and Flourishing Fund' }, // Exact match exists
]

// INTERNAL CREATE DUPLICATES: Merge these before entity creation
const INTERNAL_CREATE_DUPLICATES = [
  { keep: 'Gordon and Betty Moore Foundation', remove: 'The Gordon and Betty Moore Foundation' },
  { keep: 'Apache Software Foundation', remove: 'The Apache Software Foundation' },
]

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const apply = process.argv.includes('--apply')

  if (!dryRun && !apply) {
    console.log('Usage:')
    console.log('  --dry-run  Show what would be changed')
    console.log('  --apply    Actually perform the changes')
    process.exit(1)
  }

  console.log(`=== APPLY ENTITY OVERLAP MAPPINGS ===`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING CHANGES'}\n`)

  let totalDuplicatesFound = 0
  let totalMapped = 0
  let totalInternalMerged = 0

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Handle exact duplicates - find RDS entity IDs and link edges
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('=== STEP 1: Exact Duplicates (link to existing RDS entities) ===\n')

  for (const entityName of EXACT_DUPLICATES) {
    // Find the RDS entity ID
    const rdsEntity = await rds.query(`
      SELECT id, name FROM entity WHERE LOWER(name) = LOWER($1) AND status = 'approved'
    `, [entityName])

    if (rdsEntity.rows.length === 0) {
      console.log(`⚠ "${entityName}" not found in RDS - skipping`)
      continue
    }

    const rdsId = rdsEntity.rows[0].id
    const rdsName = rdsEntity.rows[0].name

    // Find pending edges with this entity name (as source or target)
    const sourceEdges = await neon.query(`
      SELECT discovery_id, source_entity_name, target_entity_name
      FROM edge_discovery
      WHERE status = 'pending_entities'
        AND LOWER(source_entity_name) = LOWER($1)
        AND source_entity_id IS NULL
    `, [entityName])

    const targetEdges = await neon.query(`
      SELECT discovery_id, source_entity_name, target_entity_name
      FROM edge_discovery
      WHERE status = 'pending_entities'
        AND LOWER(target_entity_name) = LOWER($1)
        AND target_entity_id IS NULL
    `, [entityName])

    const totalEdges = sourceEdges.rows.length + targetEdges.rows.length
    if (totalEdges === 0) continue

    totalDuplicatesFound += totalEdges
    console.log(`"${entityName}" → RDS ID ${rdsId} (${totalEdges} edges)`)

    if (!dryRun) {
      // Update source edges
      if (sourceEdges.rows.length > 0) {
        await neon.query(`
          UPDATE edge_discovery
          SET source_entity_id = $2,
              source_entity_name = $3,
              updated_at = NOW()
          WHERE status = 'pending_entities'
            AND LOWER(source_entity_name) = LOWER($1)
            AND source_entity_id IS NULL
        `, [entityName, rdsId, rdsName])
        console.log(`  ✓ Updated ${sourceEdges.rows.length} source edges`)
      }

      // Update target edges
      if (targetEdges.rows.length > 0) {
        await neon.query(`
          UPDATE edge_discovery
          SET target_entity_id = $2,
              target_entity_name = $3,
              updated_at = NOW()
          WHERE status = 'pending_entities'
            AND LOWER(target_entity_name) = LOWER($1)
            AND target_entity_id IS NULL
        `, [entityName, rdsId, rdsName])
        console.log(`  ✓ Updated ${targetEdges.rows.length} target edges`)
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Handle alias mappings - update entity names to canonical form
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== STEP 2: Alias Mappings (update to canonical names) ===\n')

  for (const { alias, mapTo } of ALIAS_MAPPINGS) {
    // Find the RDS entity ID for the canonical name
    const rdsEntity = await rds.query(`
      SELECT id, name FROM entity WHERE LOWER(name) = LOWER($1) AND status = 'approved'
    `, [mapTo])

    let rdsId = null
    let rdsName = mapTo

    if (rdsEntity.rows.length > 0) {
      rdsId = rdsEntity.rows[0].id
      rdsName = rdsEntity.rows[0].name
    }

    // Find pending edges with the alias name
    const sourceEdges = await neon.query(`
      SELECT discovery_id FROM edge_discovery
      WHERE status = 'pending_entities'
        AND LOWER(source_entity_name) = LOWER($1)
    `, [alias])

    const targetEdges = await neon.query(`
      SELECT discovery_id FROM edge_discovery
      WHERE status = 'pending_entities'
        AND LOWER(target_entity_name) = LOWER($1)
    `, [alias])

    const totalEdges = sourceEdges.rows.length + targetEdges.rows.length
    if (totalEdges === 0) continue

    totalMapped += totalEdges
    console.log(`"${alias}" → "${rdsName}"${rdsId ? ` (RDS ID ${rdsId})` : ''} (${totalEdges} edges)`)

    if (!dryRun) {
      // Update source edges one by one to handle duplicates
      if (sourceEdges.rows.length > 0) {
        let updated = 0
        let deleted = 0
        for (const edge of sourceEdges.rows) {
          // Check if updating would create a duplicate
          const wouldDuplicate = await neon.query(`
            SELECT discovery_id FROM edge_discovery
            WHERE LOWER(source_entity_name) = LOWER($2)
              AND target_entity_name = (SELECT target_entity_name FROM edge_discovery WHERE discovery_id = $1)
              AND edge_type = (SELECT edge_type FROM edge_discovery WHERE discovery_id = $1)
              AND discovery_id != $1
          `, [edge.discovery_id, rdsName])

          if (wouldDuplicate.rows.length > 0) {
            await neon.query(`DELETE FROM edge_discovery WHERE discovery_id = $1`, [edge.discovery_id])
            deleted++
          } else {
            const updateFields = rdsId
              ? 'source_entity_id = $2, source_entity_name = $3'
              : 'source_entity_name = $3'
            await neon.query(`
              UPDATE edge_discovery
              SET ${updateFields}, updated_at = NOW()
              WHERE discovery_id = $1
            `, rdsId ? [edge.discovery_id, rdsId, rdsName] : [edge.discovery_id, null, rdsName])
            updated++
          }
        }
        if (updated > 0) console.log(`  ✓ Updated ${updated} source edges`)
        if (deleted > 0) console.log(`  ⊕ Deleted ${deleted} duplicate source edges`)
      }

      // Update target edges one by one to handle duplicates
      if (targetEdges.rows.length > 0) {
        let updated = 0
        let deleted = 0
        for (const edge of targetEdges.rows) {
          // Check if updating would create a duplicate
          const wouldDuplicate = await neon.query(`
            SELECT discovery_id FROM edge_discovery
            WHERE source_entity_name = (SELECT source_entity_name FROM edge_discovery WHERE discovery_id = $1)
              AND LOWER(target_entity_name) = LOWER($2)
              AND edge_type = (SELECT edge_type FROM edge_discovery WHERE discovery_id = $1)
              AND discovery_id != $1
          `, [edge.discovery_id, rdsName])

          if (wouldDuplicate.rows.length > 0) {
            await neon.query(`DELETE FROM edge_discovery WHERE discovery_id = $1`, [edge.discovery_id])
            deleted++
          } else {
            const updateFields = rdsId
              ? 'target_entity_id = $2, target_entity_name = $3'
              : 'target_entity_name = $3'
            await neon.query(`
              UPDATE edge_discovery
              SET ${updateFields}, updated_at = NOW()
              WHERE discovery_id = $1
            `, rdsId ? [edge.discovery_id, rdsId, rdsName] : [edge.discovery_id, null, rdsName])
            updated++
          }
        }
        if (updated > 0) console.log(`  ✓ Updated ${updated} target edges`)
        if (deleted > 0) console.log(`  ⊕ Deleted ${deleted} duplicate target edges`)
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Handle internal CREATE duplicates - merge before entity creation
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== STEP 3: Internal CREATE Duplicates (merge entity names) ===\n')

  for (const { keep, remove } of INTERNAL_CREATE_DUPLICATES) {
    // Find edges with the "remove" name and update to "keep" name
    const sourceEdges = await neon.query(`
      SELECT discovery_id FROM edge_discovery
      WHERE status = 'pending_entities'
        AND LOWER(source_entity_name) = LOWER($1)
    `, [remove])

    const targetEdges = await neon.query(`
      SELECT discovery_id FROM edge_discovery
      WHERE status = 'pending_entities'
        AND LOWER(target_entity_name) = LOWER($1)
    `, [remove])

    const totalEdges = sourceEdges.rows.length + targetEdges.rows.length
    if (totalEdges === 0) {
      console.log(`"${remove}" → "${keep}" (no edges found)`)
      continue
    }

    totalInternalMerged += totalEdges
    console.log(`"${remove}" → "${keep}" (${totalEdges} edges)`)

    if (!dryRun) {
      if (sourceEdges.rows.length > 0) {
        await neon.query(`
          UPDATE edge_discovery
          SET source_entity_name = $2, updated_at = NOW()
          WHERE status = 'pending_entities'
            AND LOWER(source_entity_name) = LOWER($1)
        `, [remove, keep])
        console.log(`  ✓ Updated ${sourceEdges.rows.length} source edges`)
      }

      if (targetEdges.rows.length > 0) {
        await neon.query(`
          UPDATE edge_discovery
          SET target_entity_name = $2, updated_at = NOW()
          WHERE status = 'pending_entities'
            AND LOWER(target_entity_name) = LOWER($1)
        `, [remove, keep])
        console.log(`  ✓ Updated ${targetEdges.rows.length} target edges`)
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== SUMMARY ===')
  console.log(`Exact duplicates linked to RDS: ${totalDuplicatesFound} edges`)
  console.log(`Alias mappings applied: ${totalMapped} edges`)
  console.log(`Internal CREATE duplicates merged: ${totalInternalMerged} edges`)
  console.log(`Total edges updated: ${totalDuplicatesFound + totalMapped + totalInternalMerged}`)

  if (dryRun) {
    console.log('\nRun with --apply to execute these changes.')
  }

  // Check remaining pending_entities status
  const remaining = await neon.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE source_entity_id IS NOT NULL AND target_entity_id IS NOT NULL) as ready_to_promote,
      COUNT(*) FILTER (WHERE source_entity_id IS NULL OR target_entity_id IS NULL) as still_pending
    FROM edge_discovery
    WHERE status = 'pending_entities'
  `)

  console.log(`\nPost-update status:`)
  console.log(`  Total pending_entities: ${remaining.rows[0].total}`)
  console.log(`  Ready to promote (both IDs set): ${remaining.rows[0].ready_to_promote}`)
  console.log(`  Still needs entity creation: ${remaining.rows[0].still_pending}`)

  await neon.end()
  await rds.end()
}

main().catch(console.error)
