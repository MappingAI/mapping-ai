#!/usr/bin/env node
/**
 * Apply Final Entity Fixes from Claude.ai Review
 *
 * Fixes identified from comprehensive review of 271 combined-v4 entities.
 * - 5 confirmed merges with existing entities
 * - 1 internal duplicate
 * - 17 parent org assignments
 * - 25+ field fixes
 * - 2 entities to delete
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/apply-final-entity-fixes.js --dry-run
 *   node scripts/edge-enrichment/post-process/apply-final-entity-fixes.js --apply
 */
import 'dotenv/config'
import pg from 'pg'

const rds = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const apply = args.includes('--apply')

if (!dryRun && !apply) {
  console.log('Usage: node apply-final-entity-fixes.js [--dry-run | --apply]')
  process.exit(0)
}

// =============================================================================
// MERGES: New entities that duplicate existing ones
// =============================================================================
const MERGES = [
  { deleteId: 2076, keepId: 1267, name: 'Johns Hopkins Applied Physics Laboratory' },
  { deleteId: 2091, keepId: 325, name: 'LASR Labs (London AI Safety Research Labs)' },
  { deleteId: 2144, keepId: 1707, name: 'National Institutes of Health (NIH)' },
  { deleteId: 2173, keepId: 345, name: 'Office of Science and Technology Policy → White House OSTP' },
  { deleteId: 2277, keepId: 1406, name: 'Technische Universität Berlin (TU Berlin)' },
  // Internal duplicate within combined-v4
  { deleteId: 2287, keepId: 2292, name: 'The Andrew W. Mellon Foundation → Andrew W. Mellon Foundation' }
]

// =============================================================================
// DELETIONS: Entities with no AI relevance
// =============================================================================
const DELETIONS = [
  { id: 2168, name: 'North Carolina General Assembly', reason: 'No AI relevance - funded nursing education' },
  { id: 2266, name: 'Utah Attorney General\'s Office', reason: 'No AI relevance - salary payment edge only' }
]

// =============================================================================
// PARENT ORG ASSIGNMENTS
// =============================================================================
const PARENT_ASSIGNMENTS = [
  // Samsung family
  { entityId: 2233, parentId: 2235, note: 'SAIT → Samsung Electronics' },
  { entityId: 2234, parentId: 2235, note: 'Samsung Austin Semiconductor → Samsung Electronics' },
  // Sony family
  { entityId: 2257, parentId: 2256, note: 'Sony Innovation Fund → Sony Group Corporation' },
  // Corporate VC arms to existing parents
  { entityId: 2113, parentId: 1042, note: 'M12 → Microsoft' },
  { entityId: 2145, parentId: 728, note: 'NVentures → Nvidia' },
  { entityId: 2229, parentId: 745, note: 'Salesforce Ventures → Salesforce' },
  // UK FAIR Lab → UKRI (both new, set after both exist)
  { entityId: 2300, parentId: 2302, note: 'UK FAIR Laboratory → UKRI' }
]

// =============================================================================
// FIELD FIXES
// =============================================================================
const FIELD_FIXES = [
  // CRITICAL: Sierra Club → Sierra (AI startup)
  { id: 2248, field: 'name', value: 'Sierra', note: 'Wrong entity name - notes describe AI startup sierra.ai' },
  { id: 2248, field: 'category', value: 'Frontier Lab', note: 'AI startup, not environmental nonprofit' },

  // Category fixes
  { id: 2131, field: 'category', value: 'Frontier Lab', note: 'Merge Labs is BCI company, not AI Safety' },
  { id: 2256, field: 'category', value: 'Deployers & Platforms', note: 'Sony is conglomerate, not Frontier Lab' },
  { id: 2233, field: 'category', value: 'Academic', note: 'SAIT is R&D lab, not Frontier Lab' },
  { id: 2300, field: 'category', value: 'AI Safety/Alignment', note: 'UK FAIR Lab is safety research' },
  { id: 2182, field: 'category', value: 'Deployers & Platforms', note: 'Overland AI is defense deployer' },
  { id: 2175, field: 'category', value: 'Deployers & Platforms', note: 'Okta is identity platform' },
  { id: 2327, field: 'category', value: 'Deployers & Platforms', note: 'fal.ai is platform layer' },
  { id: 2108, field: 'category', value: 'Government/Agency', note: 'LANL is DOE national lab' },

  // Stance fixes
  { id: 2239, field: 'belief_regulatory_stance', value: 'Light-touch', note: 'Saudi Infra fund - Light-touch not Accelerate' },
  { id: 2190, field: 'belief_regulatory_stance', value: 'Light-touch', note: 'Thiel Foundation - Light-touch not Accelerate' },
  { id: 2318, field: 'belief_regulatory_stance', value: 'Mixed/unclear', note: 'Waymo - compliance-driven not ideological' },

  // Importance downgrades
  { id: 2070, field: 'importance', value: 3, note: 'Jed McCaleb - crypto donor, indirect AI influence' },
  { id: 2123, field: 'importance', value: 3, note: 'R. Martin Chavez - finance exec with AI investments' },
  { id: 2052, field: 'importance', value: 3, note: 'Horizons Ventures - historically notable but less current' },

  // Name standardization
  { id: 2321, field: 'name', value: 'Wharton Mack Institute', note: 'Canonical name per overlap review' }
]

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  console.log('='.repeat(60))
  console.log('FINAL ENTITY FIXES FROM CLAUDE.AI REVIEW')
  console.log('='.repeat(60))
  console.log(dryRun ? '[DRY RUN MODE]' : '[APPLY MODE]')
  console.log()

  let stats = {
    merged: 0,
    deleted: 0,
    parentAssigned: 0,
    fieldsFixed: 0,
    edgesRemapped: 0
  }

  // -------------------------------------------------------------------------
  // 1. MERGE DUPLICATES
  // -------------------------------------------------------------------------
  console.log('\n--- MERGE DUPLICATES ---')
  for (const merge of MERGES) {
    console.log(`\n${merge.name}`)
    console.log(`  #${merge.deleteId} → #${merge.keepId}`)

    // Check entities exist
    const [deleteE, keepE] = await Promise.all([
      rds.query('SELECT id, name FROM entity WHERE id = $1', [merge.deleteId]),
      rds.query('SELECT id, name FROM entity WHERE id = $1', [merge.keepId])
    ])

    if (deleteE.rows.length === 0) {
      console.log(`  ⚠ Entity #${merge.deleteId} not found - may already be merged`)
      continue
    }
    if (keepE.rows.length === 0) {
      console.log(`  ⚠ Keep entity #${merge.keepId} not found - skipping`)
      continue
    }

    // Count edges to remap
    const edgeCount = await rds.query(`
      SELECT COUNT(*) as count FROM edge
      WHERE source_id = $1 OR target_id = $1
    `, [merge.deleteId])
    console.log(`  Edges to remap: ${edgeCount.rows[0].count}`)

    if (!dryRun) {
      // Remap edges
      await rds.query('UPDATE edge SET source_id = $1 WHERE source_id = $2', [merge.keepId, merge.deleteId])
      await rds.query('UPDATE edge SET target_id = $1 WHERE target_id = $2', [merge.keepId, merge.deleteId])
      stats.edgesRemapped += parseInt(edgeCount.rows[0].count)

      // Delete duplicate entity
      await rds.query('DELETE FROM entity WHERE id = $1', [merge.deleteId])
      stats.merged++
      console.log(`  ✓ Merged`)
    } else {
      console.log(`  [DRY RUN] Would merge`)
    }
  }

  // -------------------------------------------------------------------------
  // 2. DELETE NON-AI ENTITIES
  // -------------------------------------------------------------------------
  console.log('\n--- DELETE NON-AI ENTITIES ---')
  for (const del of DELETIONS) {
    console.log(`\n#${del.id} ${del.name}`)
    console.log(`  Reason: ${del.reason}`)

    const entity = await rds.query('SELECT id FROM entity WHERE id = $1', [del.id])
    if (entity.rows.length === 0) {
      console.log(`  ⚠ Not found - may already be deleted`)
      continue
    }

    // Check for edges
    const edgeCount = await rds.query('SELECT COUNT(*) as count FROM edge WHERE source_id = $1 OR target_id = $1', [del.id])
    console.log(`  Edges: ${edgeCount.rows[0].count}`)

    if (!dryRun) {
      // Delete edges first
      await rds.query('DELETE FROM edge WHERE source_id = $1 OR target_id = $1', [del.id])
      // Delete entity
      await rds.query('DELETE FROM entity WHERE id = $1', [del.id])
      stats.deleted++
      console.log(`  ✓ Deleted`)
    } else {
      console.log(`  [DRY RUN] Would delete`)
    }
  }

  // -------------------------------------------------------------------------
  // 3. PARENT ORG ASSIGNMENTS
  // -------------------------------------------------------------------------
  console.log('\n--- PARENT ORG ASSIGNMENTS ---')
  for (const pa of PARENT_ASSIGNMENTS) {
    console.log(`  ${pa.note}`)

    // Check both entities exist
    const [child, parent] = await Promise.all([
      rds.query('SELECT id, name FROM entity WHERE id = $1', [pa.entityId]),
      rds.query('SELECT id, name FROM entity WHERE id = $1', [pa.parentId])
    ])

    if (child.rows.length === 0) {
      console.log(`    ⚠ Child #${pa.entityId} not found`)
      continue
    }
    if (parent.rows.length === 0) {
      console.log(`    ⚠ Parent #${pa.parentId} not found`)
      continue
    }

    if (!dryRun) {
      await rds.query('UPDATE entity SET parent_org_id = $1 WHERE id = $2', [pa.parentId, pa.entityId])
      stats.parentAssigned++
    }
  }
  if (!dryRun) {
    console.log(`✓ Assigned ${stats.parentAssigned} parent relationships`)
  }

  // -------------------------------------------------------------------------
  // 4. FIELD FIXES
  // -------------------------------------------------------------------------
  console.log('\n--- FIELD FIXES ---')
  for (const fix of FIELD_FIXES) {
    const entity = await rds.query('SELECT id, name FROM entity WHERE id = $1', [fix.id])
    if (entity.rows.length === 0) {
      console.log(`  ⚠ #${fix.id} not found`)
      continue
    }

    console.log(`  #${fix.id}: ${fix.field} = '${fix.value}' (${fix.note})`)

    if (!dryRun) {
      await rds.query(`UPDATE entity SET ${fix.field} = $1 WHERE id = $2`, [fix.value, fix.id])
      stats.fieldsFixed++
    }
  }
  if (!dryRun) {
    console.log(`✓ Fixed ${stats.fieldsFixed} fields`)
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Entities merged: ${stats.merged}`)
  console.log(`Entities deleted: ${stats.deleted}`)
  console.log(`Parent orgs assigned: ${stats.parentAssigned}`)
  console.log(`Fields fixed: ${stats.fieldsFixed}`)
  console.log(`Edges remapped: ${stats.edgesRemapped}`)

  if (dryRun) {
    console.log('\n[DRY RUN] No changes applied. Run with --apply to execute.')
  }

  await rds.end()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
