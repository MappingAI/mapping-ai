#!/usr/bin/env node
/**
 * Post-processing Step 1: Auto-merge obvious duplicates
 *
 * Merges entity suggestions that clearly match existing entities in RDS.
 * Updates edge_discovery records to point to the real entity IDs.
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process-1-merge-duplicates.js --dry-run
 *   node scripts/edge-enrichment/post-process-1-merge-duplicates.js --apply
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

// High-confidence duplicate mappings: suggestion name → existing entity name
// These are manually verified matches
const DUPLICATE_MAPPINGS = [
  // Exact matches with different formatting - VERIFIED against RDS
  { suggestion: 'Open Philanthropy', existingName: 'Coefficient Giving (formerly Open Philanthropy)' },
  { suggestion: 'Open Philanthropy Project', existingName: 'Coefficient Giving (formerly Open Philanthropy)' },
  { suggestion: 'National Science Foundation', existingName: 'U.S. National Science Foundation' },
  { suggestion: 'Andreessen Horowitz', existingName: 'Andreessen Horowitz (a16z)' },
  { suggestion: 'Berkeley Existential Risk Initiative', existingName: 'Berkeley Existential Risk Initiative (BERI)' },
  { suggestion: 'Machine Intelligence Research Institute', existingName: 'Machine Intelligence Research Institute (MIRI)' },
  { suggestion: 'Future of Humanity Institute', existingName: 'Future of Humanity Institute (closed 2024)' },
  { suggestion: 'Bill & Melinda Gates Foundation', existingName: 'Gates Foundation' },
  // NOTE: Schmidt Sciences (2024) is DIFFERENT from Schmidt Futures (2017) - do not merge
  // { suggestion: 'Schmidt Sciences', existingName: 'Schmidt Futures' },
  { suggestion: 'Google.org', existingName: 'Google' },
  { suggestion: 'PublicAI', existingName: 'Public AI' },
  { suggestion: 'Dovetail', existingName: 'Dovetail Research' },
  { suggestion: 'Entrepreneurs First', existingName: 'Entrepreneur First' },

  // Government agencies - VERIFIED
  { suggestion: 'U.S. Department of Energy', existingName: 'Department of Energy' },
  { suggestion: 'U.S. Department of Defense', existingName: 'Department of Defense' },

  // Research orgs - VERIFIED
  { suggestion: 'Center for AI Safety', existingName: 'AI Safety, Ethics and Society (Center for AI Safety)' },
  { suggestion: 'Future of Life Institute', existingName: 'Future of Life Institute' },

  // People
  { suggestion: 'Eric and Wendy Schmidt', existingName: 'Eric Schmidt' },

  // Additional mappings identified during processing
  { suggestion: 'NSF', existingName: 'U.S. National Science Foundation' },
  { suggestion: 'John D. and Catherine T. MacArthur Foundation', existingName: 'MacArthur Foundation' },
  { suggestion: 'Palantir Technologies', existingName: 'Palantir' },
  { suggestion: 'Facebook', existingName: 'Meta' },
  { suggestion: 'Survival and Flourishing Fund', existingName: 'Survival and Flourishing Fund' },

  // Add more as identified...
]

async function findEntityByName(name) {
  const result = await rds.query(
    'SELECT id, name FROM entity WHERE LOWER(name) = LOWER($1)',
    [name]
  )
  return result.rows[0] || null
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const apply = process.argv.includes('--apply')

  if (!dryRun && !apply) {
    console.log('Usage:')
    console.log('  --dry-run  Show what would be merged without making changes')
    console.log('  --apply    Actually perform the merges')
    process.exit(1)
  }

  console.log(`=== POST-PROCESS STEP 1: MERGE DUPLICATES ===`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING CHANGES'}\n`)

  let merged = 0
  let notFound = 0
  let noSuggestion = 0

  for (const mapping of DUPLICATE_MAPPINGS) {
    // Find the existing entity in RDS
    const existingEntity = await findEntityByName(mapping.existingName)
    if (!existingEntity) {
      console.log(`⚠️  Existing entity not found: "${mapping.existingName}"`)
      notFound++
      continue
    }

    // Find the suggestion in Neon
    const suggestion = await neon.query(
      'SELECT suggestion_id, extracted_name, times_seen FROM entity_suggestion WHERE LOWER(extracted_name) = LOWER($1)',
      [mapping.suggestion]
    )

    if (suggestion.rows.length === 0) {
      // console.log(`   No suggestion found for: "${mapping.suggestion}"`)
      noSuggestion++
      continue
    }

    const sugg = suggestion.rows[0]
    console.log(`\n✓ "${sugg.extracted_name}" (seen ${sugg.times_seen}x) → "${existingEntity.name}" (id: ${existingEntity.id})`)

    if (!dryRun) {
      // Update edge_discovery records where this suggestion is the source
      const sourceUpdates = await neon.query(`
        UPDATE edge_discovery
        SET source_entity_id = $1,
            status = CASE
              WHEN target_entity_id IS NOT NULL THEN 'pending_review'
              ELSE status
            END
        WHERE source_suggestion_id = $2
        RETURNING discovery_id
      `, [existingEntity.id, sugg.suggestion_id])

      // Update edge_discovery records where this suggestion is the target
      const targetUpdates = await neon.query(`
        UPDATE edge_discovery
        SET target_entity_id = $1,
            status = CASE
              WHEN source_entity_id IS NOT NULL THEN 'pending_review'
              ELSE status
            END
        WHERE target_suggestion_id = $2
        RETURNING discovery_id
      `, [existingEntity.id, sugg.suggestion_id])

      // Mark the suggestion as merged
      await neon.query(`
        UPDATE entity_suggestion
        SET status = 'merged',
            merged_to_entity_id = $1
        WHERE suggestion_id = $2
      `, [existingEntity.id, sugg.suggestion_id])

      console.log(`   Updated ${sourceUpdates.rowCount} source refs, ${targetUpdates.rowCount} target refs`)
    }

    merged++
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Mappings processed: ${DUPLICATE_MAPPINGS.length}`)
  console.log(`Successfully merged: ${merged}`)
  console.log(`Existing entity not found: ${notFound}`)
  console.log(`No suggestion to merge: ${noSuggestion}`)

  if (dryRun) {
    console.log(`\nRun with --apply to execute these merges.`)
  }

  // Show remaining pending_entities count
  const remaining = await neon.query(`
    SELECT COUNT(*) as count FROM edge_discovery WHERE status = 'pending_entities'
  `)
  const readyForReview = await neon.query(`
    SELECT COUNT(*) as count FROM edge_discovery WHERE status = 'pending_review'
  `)
  console.log(`\nEdge discoveries pending_entities: ${remaining.rows[0].count}`)
  console.log(`Edge discoveries pending_review: ${readyForReview.rows[0].count}`)

  await neon.end()
  await rds.end()
}

main().catch(console.error)
