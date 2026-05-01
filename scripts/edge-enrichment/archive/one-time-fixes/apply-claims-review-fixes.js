#!/usr/bin/env node
/**
 * Apply Claims QC Review Fixes
 *
 * Fixes identified from Claude.ai review of claims batches 1-6 (272 entities, ~900 claims).
 * 33 total issues: 5 critical, 14 high, 14 medium.
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/apply-claims-review-fixes.js --dry-run
 *   node scripts/edge-enrichment/post-process/apply-claims-review-fixes.js --apply
 */
import 'dotenv/config'
import pg from 'pg'

const rds = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const apply = args.includes('--apply')

if (!dryRun && !apply) {
  console.log('Usage: node apply-claims-review-fixes.js [--dry-run | --apply]')
  process.exit(0)
}

// =============================================================================
// CRITICAL FIXES
// =============================================================================

// Duplicate entity: Schmidt Fund (2288) is same as Schmidt Sciences (2240)
const ENTITY_MERGES = [
  {
    deleteId: 2288,
    keepId: 2240,
    name: 'The Eric and Wendy Schmidt Fund for Strategic Innovation',
    keepName: 'Schmidt Sciences'
  }
]

// Entity disambiguation: Sierra is ambiguous (AI company vs Sierra Club)
// Based on sierraclub.org source, this is The Sierra Club (environmental nonprofit)
const ENTITY_RENAMES = [
  {
    id: 2248,
    oldName: 'Sierra',
    newName: 'Sierra Club',
    newCategory: 'Labor/Civil Society',
    reason: 'Only source is sierraclub.org - environmental nonprofit, not AI company sierra.ai'
  },
  {
    id: 2295,
    oldName: 'Truth Terminal',
    newName: 'Andy Ayrey',
    newType: 'person',
    newCategory: 'Researcher',
    reason: 'Truth Terminal is an AI chatbot; all claims quote its human creator Andy Ayrey'
  }
]

// =============================================================================
// HIGH PRIORITY CLAIM DELETIONS (Wrong Attribution)
// =============================================================================

// Claims to delete entirely (wrong entity attribution)
const CLAIMS_TO_DELETE = [
  // Samsung SAIT - corporate claims belong to Samsung Electronics (2235)
  '2233_agi_definition_src-b400388684ba',
  '2233_ai_risk_level_src-e824fa907c75',
  '2233_regulatory_stance_src-ab30851390b8',
  '2233_ai_risk_level_src-2378be3b0987',
  '2233_regulatory_stance_src-e34759563859',

  // Samsung Austin Semiconductor - AGI claims belong to Samsung Electronics
  '2234_agi_definition_src-b400388684ba',
  '2234_agi_definition_src-2454172e7693',

  // UKRI - These are UK Government/DSIT documents, not UKRI's own stance
  '2302_agi_definition_src-d75be1daae0d',
  '2302_agi_definition_src-aef604e25310',
  '2302_agi_timeline_src-d75be1daae0d',
  '2302_ai_risk_level_src-1ec1e8bc1dd1',
  '2302_regulatory_stance_src-aef604e25310',
  '2302_ai_risk_level_src-533b576199ec', // AISI doc, not UKRI

  // Utah AG - Jeff Jackson quotes are NC AG, not Utah
  '2266_ai_risk_level_src-31f20b541b21',
  '2266_regulatory_stance_src-31f20b541b21',

  // QIA - Investment appetite is not regulatory stance (category error)
  '2204_regulatory_stance_src-25ba8dbebd0d',
  '2204_regulatory_stance_src-d683907ad6ab',
  '2204_regulatory_stance_src-cda1f7091d4f',

  // CSU Sacramento - These are CSU system-wide, not Sacramento specifically
  '2226_regulatory_stance_src-deba029a54b0',
  '2226_regulatory_stance_src-b9e4ad3babf4',
  '2226_ai_risk_level_src-deba029a54b0',

  // FAIR - Superintelligence lab article, not FAIR
  '2300_agi_definition_src-bb15cca098f0',

  // Batches 1-3: Wrong attributions
  // Accel (#2033) - claims about Accel Partners VC, not Accel AI Institute
  // (Delete all claims for this entity - wrong entity entirely)

  // Jim Mitre (#2224) - claims about MITRE Corp, not individual
  // (Delete all claims for this entity)

  // Land Berlin (#2227) - EU/national strategy claims, not state government
  // Innovate UK (#2217) - central government policy, not Innovate UK
  // Infosys Foundation (#2213) - no cited sources for stance claims
  // Leverhulme Trust (#2230) - claims about recipients, not trust's position
]

// Entities where ALL claims should be deleted (wrong entity entirely)
const DELETE_ALL_CLAIMS_FOR_ENTITIES = [
  // Batches 1-3 Critical
  { id: 2033, name: 'Accel', reason: 'Claims are about Accel Partners VC, not Accel AI Institute (Berkeley)' },
  { id: 2224, name: 'Jim Mitre', reason: 'Claims are about MITRE Corp, not individual Jim Mitre' },
  // Batches 1-3 High - wrong attribution
  { id: 2095, name: 'Land Berlin', reason: 'EU/national AI strategy claims attributed to state government' },
  { id: 2063, name: 'Innovate UK', reason: 'Central government R&D strategies attributed to Innovate UK' },
  { id: 2062, name: 'Infosys Foundation', reason: 'Regulatory stance claims have no cited sources' },
  { id: 2100, name: 'Leverhulme Trust', reason: 'Claims about AI research recipients, not trust own position' }
]

// =============================================================================
// CLAIM UPDATES (Stance/Confidence fixes)
// =============================================================================

const CLAIM_UPDATES = [
  // Fix typo: Light-tooth → Light-touch
  {
    claim_id: '2295_regulatory_stance_src-03461bf4f83d',
    field: 'stance',
    oldValue: 'Light-tooth',
    newValue: 'Light-touch',
    reason: 'Typo fix'
  },

  // Hoover Institution: Risk evaluation = Targeted, not Light-touch
  {
    claim_id: '2263_regulatory_stance_src-7c5ac0740f1e',
    field: 'stance',
    oldValue: 'Light-touch',
    newValue: 'Targeted',
    reason: 'Citation argues for active risk evaluation capacity - that is Targeted, not Light-touch'
  },

  // Waymo: AV-specific lobbying is Targeted, not Accelerate
  {
    claim_id: '2318_regulatory_stance_src-8ef2cbbcb6a5',
    field: 'stance',
    oldValue: 'Accelerate',
    newValue: 'Targeted',
    reason: 'AV-specific Congressional lobbying, not general AI deregulation stance'
  },
  {
    claim_id: '2318_regulatory_stance_src-8ef2cbbcb6a5',
    field: 'confidence',
    oldValue: 'high',
    newValue: 'medium',
    reason: 'Sector-specific advocacy, not broad AI policy position'
  }
]

// Confidence downgrades for third-party sources
const CONFIDENCE_DOWNGRADES = [
  // Safeguarded AI - atlascomputing.org is third-party summary
  { claim_id: '2227_agi_definition_src-bb8e9897f094', newConfidence: 'low', reason: 'Third-party summary (atlascomputing.org), not ARIA' },
  { claim_id: '2227_agi_timeline_src-bb8e9897f094', newConfidence: 'low', reason: 'Third-party summary' },
  { claim_id: '2227_ai_risk_level_src-bb8e9897f094', newConfidence: 'low', reason: 'Third-party summary' },

  // FAIR - forwardfuture.ai is third-party blog
  { claim_id: '2300_agi_timeline_src-9c1846dcd6b1', newConfidence: 'low', reason: 'Third-party blog (forwardfuture.ai)' }
]

// =============================================================================
// ENTITY NOTES UPDATES (Add context for admin-mixing issues)
// =============================================================================

const ENTITY_NOTES_ADDITIONS = [
  {
    id: 2173, // Office of Science and Technology Policy (combined-v4)
    addToNotes: '\n\n[Note: Stance reflects multiple administrations - positions vary by administration.]',
    reason: 'Obama-era and Biden-era positions conflated'
  },
  {
    id: 2298, // DFC
    addToNotes: '\n\n[Note: AI stance reflects executive branch priorities and varies by administration.]',
    reason: 'Biden "Moderate" vs Trump "Light-touch" merged without date-scoping'
  },
  {
    id: 2201, // Public First
    addToNotes: '\n\n[Note: This is Public First (research/polling firm). Public First Action (political advocacy, #1439) is a separate entity.]',
    reason: 'Claims may mix Public First (research firm) with Public First Action (political advocacy)'
  }
]

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  console.log('='.repeat(60))
  console.log('CLAIMS QC REVIEW FIXES')
  console.log('='.repeat(60))
  console.log(dryRun ? '[DRY RUN MODE]' : '[APPLY MODE]')
  console.log()

  let stats = {
    entitiesMerged: 0,
    entitiesRenamed: 0,
    claimsDeleted: 0,
    claimsUpdated: 0,
    confidenceDowngraded: 0,
    notesUpdated: 0,
    edgesRemapped: 0
  }

  // -------------------------------------------------------------------------
  // 1. ENTITY MERGES (Critical)
  // -------------------------------------------------------------------------
  console.log('\n--- ENTITY MERGES (Critical) ---')
  for (const merge of ENTITY_MERGES) {
    console.log(`\nMerging ${merge.name} (#${merge.deleteId}) → ${merge.keepName} (#${merge.keepId})`)

    // Check if both entities exist
    const [deleteEntity, keepEntity] = await Promise.all([
      rds.query('SELECT id, name FROM entity WHERE id = $1', [merge.deleteId]),
      rds.query('SELECT id, name FROM entity WHERE id = $1', [merge.keepId])
    ])

    if (deleteEntity.rows.length === 0) {
      console.log(`  ⚠ Entity #${merge.deleteId} not found - may already be merged`)
      continue
    }
    if (keepEntity.rows.length === 0) {
      console.log(`  ⚠ Keep entity #${merge.keepId} not found - skipping`)
      continue
    }

    // Count edges to remap
    const edgeCount = await rds.query(`
      SELECT COUNT(*) as count FROM edge
      WHERE source_id = $1 OR target_id = $1
    `, [merge.deleteId])
    console.log(`  Edges to remap: ${edgeCount.rows[0].count}`)

    // Count claims to delete
    const claimCount = await neon.query(`
      SELECT COUNT(*) as count FROM claim WHERE entity_id = $1
    `, [merge.deleteId])
    console.log(`  Claims to delete: ${claimCount.rows[0].count}`)

    if (!dryRun) {
      // Remap edges
      await rds.query('UPDATE edge SET source_id = $1 WHERE source_id = $2', [merge.keepId, merge.deleteId])
      await rds.query('UPDATE edge SET target_id = $1 WHERE target_id = $2', [merge.keepId, merge.deleteId])
      stats.edgesRemapped += parseInt(edgeCount.rows[0].count)

      // Delete claims for merged entity
      await neon.query('DELETE FROM claim WHERE entity_id = $1', [merge.deleteId])
      stats.claimsDeleted += parseInt(claimCount.rows[0].count)

      // Delete the duplicate entity
      await rds.query('DELETE FROM entity WHERE id = $1', [merge.deleteId])
      stats.entitiesMerged++

      console.log(`  ✓ Merged`)
    } else {
      console.log(`  [DRY RUN] Would merge`)
    }
  }

  // -------------------------------------------------------------------------
  // 2. ENTITY RENAMES (Critical - disambiguation)
  // -------------------------------------------------------------------------
  console.log('\n--- ENTITY RENAMES (Disambiguation) ---')
  for (const rename of ENTITY_RENAMES) {
    console.log(`\nRenaming #${rename.id}: "${rename.oldName}" → "${rename.newName}"`)
    console.log(`  Reason: ${rename.reason}`)

    const entity = await rds.query('SELECT id, name, entity_type, category FROM entity WHERE id = $1', [rename.id])
    if (entity.rows.length === 0) {
      console.log(`  ⚠ Entity not found`)
      continue
    }

    if (!dryRun) {
      const updates = ['name = $2']
      const values = [rename.id, rename.newName]
      let paramIndex = 3

      if (rename.newType) {
        updates.push(`entity_type = $${paramIndex}`)
        values.push(rename.newType)
        paramIndex++
      }
      if (rename.newCategory) {
        updates.push(`category = $${paramIndex}`)
        values.push(rename.newCategory)
        paramIndex++
      }

      await rds.query(`UPDATE entity SET ${updates.join(', ')} WHERE id = $1`, values)

      // Also update entity_name in claims table
      await neon.query('UPDATE claim SET entity_name = $1 WHERE entity_id = $2', [rename.newName, rename.id])

      stats.entitiesRenamed++
      console.log(`  ✓ Renamed`)
    } else {
      console.log(`  [DRY RUN] Would rename`)
    }
  }

  // -------------------------------------------------------------------------
  // 3. DELETE ALL CLAIMS FOR WRONG ENTITIES
  // -------------------------------------------------------------------------
  console.log('\n--- DELETE ALL CLAIMS FOR WRONG ENTITIES ---')
  for (const entity of DELETE_ALL_CLAIMS_FOR_ENTITIES) {
    console.log(`\nEntity #${entity.id} (${entity.name}): ${entity.reason}`)

    const claimCount = await neon.query('SELECT COUNT(*) as count FROM claim WHERE entity_id = $1', [entity.id])
    console.log(`  Claims to delete: ${claimCount.rows[0].count}`)

    if (!dryRun && parseInt(claimCount.rows[0].count) > 0) {
      await neon.query('DELETE FROM claim WHERE entity_id = $1', [entity.id])
      stats.claimsDeleted += parseInt(claimCount.rows[0].count)
      console.log(`  ✓ Deleted`)
    } else if (dryRun) {
      console.log(`  [DRY RUN] Would delete`)
    }
  }

  // -------------------------------------------------------------------------
  // 4. DELETE SPECIFIC CLAIMS (Wrong attribution)
  // -------------------------------------------------------------------------
  console.log('\n--- DELETE SPECIFIC CLAIMS (Wrong Attribution) ---')
  for (const claimId of CLAIMS_TO_DELETE) {
    const claim = await neon.query('SELECT claim_id, entity_name, belief_dimension FROM claim WHERE claim_id = $1', [claimId])
    if (claim.rows.length === 0) {
      // Try partial match (claim IDs may have slight variations)
      continue
    }

    const c = claim.rows[0]
    console.log(`  ${c.entity_name}: ${c.belief_dimension}`)

    if (!dryRun) {
      await neon.query('DELETE FROM claim WHERE claim_id = $1', [claimId])
      stats.claimsDeleted++
    }
  }
  console.log(`\nTotal specific claims to delete: ${CLAIMS_TO_DELETE.length}`)
  if (!dryRun) {
    console.log(`✓ Deleted`)
  }

  // -------------------------------------------------------------------------
  // 5. UPDATE CLAIMS (Stance/field fixes)
  // -------------------------------------------------------------------------
  console.log('\n--- CLAIM UPDATES (Stance/Field Fixes) ---')
  for (const update of CLAIM_UPDATES) {
    console.log(`\n${update.claim_id}:`)
    console.log(`  ${update.field}: "${update.oldValue}" → "${update.newValue}"`)
    console.log(`  Reason: ${update.reason}`)

    if (!dryRun) {
      await neon.query(`UPDATE claim SET ${update.field} = $1 WHERE claim_id = $2`, [update.newValue, update.claim_id])
      stats.claimsUpdated++
      console.log(`  ✓ Updated`)
    } else {
      console.log(`  [DRY RUN] Would update`)
    }
  }

  // -------------------------------------------------------------------------
  // 6. CONFIDENCE DOWNGRADES
  // -------------------------------------------------------------------------
  console.log('\n--- CONFIDENCE DOWNGRADES ---')
  for (const downgrade of CONFIDENCE_DOWNGRADES) {
    console.log(`  ${downgrade.claim_id} → ${downgrade.newConfidence} (${downgrade.reason})`)

    if (!dryRun) {
      await neon.query('UPDATE claim SET confidence = $1 WHERE claim_id = $2', [downgrade.newConfidence, downgrade.claim_id])
      stats.confidenceDowngraded++
    }
  }
  if (!dryRun) {
    console.log(`✓ Downgraded ${stats.confidenceDowngraded} claims`)
  }

  // -------------------------------------------------------------------------
  // 7. ENTITY NOTES ADDITIONS (Admin-mixing context)
  // -------------------------------------------------------------------------
  console.log('\n--- ENTITY NOTES ADDITIONS ---')
  for (const note of ENTITY_NOTES_ADDITIONS) {
    const entity = await rds.query('SELECT id, name, notes FROM entity WHERE id = $1', [note.id])
    if (entity.rows.length === 0) {
      console.log(`  ⚠ Entity #${note.id} not found`)
      continue
    }

    const e = entity.rows[0]
    console.log(`  #${note.id} (${e.name}): ${note.reason}`)

    if (!dryRun) {
      const newNotes = (e.notes || '') + note.addToNotes
      await rds.query('UPDATE entity SET notes = $1 WHERE id = $2', [newNotes, note.id])
      stats.notesUpdated++
      console.log(`  ✓ Updated`)
    } else {
      console.log(`  [DRY RUN] Would add note`)
    }
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Entities merged: ${stats.entitiesMerged}`)
  console.log(`Entities renamed: ${stats.entitiesRenamed}`)
  console.log(`Edges remapped: ${stats.edgesRemapped}`)
  console.log(`Claims deleted: ${stats.claimsDeleted}`)
  console.log(`Claims updated: ${stats.claimsUpdated}`)
  console.log(`Confidence downgraded: ${stats.confidenceDowngraded}`)
  console.log(`Entity notes updated: ${stats.notesUpdated}`)

  if (dryRun) {
    console.log('\n[DRY RUN] No changes applied. Run with --apply to execute.')
  }

  await rds.end()
  await neon.end()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
