#!/usr/bin/env node
/**
 * Post-processing Step 3: Expand abbreviations and merge
 *
 * Handles common abbreviations by either:
 * - Merging to existing entity if it exists
 * - Expanding the name in place if no existing entity
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process-3-expand-abbreviations.js --dry-run
 *   node scripts/edge-enrichment/post-process-3-expand-abbreviations.js --apply
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

// Abbreviation mappings: abbreviation → { fullName, existingEntityName? }
// If existingEntityName is provided, we'll merge to that entity
// Otherwise, we'll just expand the name in place
const ABBREVIATION_MAPPINGS = [
  // Government agencies
  { abbrev: 'NSF', fullName: 'National Science Foundation', existingName: 'U.S. National Science Foundation' },
  { abbrev: 'NIH', fullName: 'National Institutes of Health', existingName: 'National Institutes of Health' },
  { abbrev: 'DARPA', fullName: 'Defense Advanced Research Projects Agency', existingName: 'DARPA' },
  { abbrev: 'DOE', fullName: 'Department of Energy', existingName: 'Department of Energy' },
  { abbrev: 'DOD', fullName: 'Department of Defense', existingName: 'Department of Defense' },
  { abbrev: 'NIST', fullName: 'National Institute of Standards and Technology', existingName: 'NIST' },
  { abbrev: 'FTC', fullName: 'Federal Trade Commission', existingName: 'Federal Trade Commission (FTC)' },
  { abbrev: 'SEC', fullName: 'Securities and Exchange Commission' },
  { abbrev: 'FDA', fullName: 'Food and Drug Administration' },
  { abbrev: 'EPA', fullName: 'Environmental Protection Agency' },
  { abbrev: 'OSTP', fullName: 'Office of Science and Technology Policy', existingName: 'Office of Science and Technology Policy (OSTP)' },
  { abbrev: 'OMB', fullName: 'Office of Management and Budget' },
  { abbrev: 'GAO', fullName: 'Government Accountability Office' },
  { abbrev: 'CBO', fullName: 'Congressional Budget Office' },
  { abbrev: 'ODNI', fullName: 'Office of the Director of National Intelligence' },
  { abbrev: 'NSA', fullName: 'National Security Agency' },
  { abbrev: 'CIA', fullName: 'Central Intelligence Agency' },
  { abbrev: 'FBI', fullName: 'Federal Bureau of Investigation' },
  { abbrev: 'DHS', fullName: 'Department of Homeland Security' },
  { abbrev: 'CISA', fullName: 'Cybersecurity and Infrastructure Security Agency' },

  // Universities
  { abbrev: 'MIT', fullName: 'Massachusetts Institute of Technology', existingName: 'MIT' },
  { abbrev: 'CMU', fullName: 'Carnegie Mellon University', existingName: 'Carnegie Mellon University' },
  { abbrev: 'Stanford', fullName: 'Stanford University', existingName: 'Stanford University' },
  { abbrev: 'Berkeley', fullName: 'UC Berkeley', existingName: 'UC Berkeley' },
  { abbrev: 'UCB', fullName: 'UC Berkeley', existingName: 'UC Berkeley' },
  { abbrev: 'UCLA', fullName: 'University of California, Los Angeles' },
  { abbrev: 'NYU', fullName: 'New York University' },
  { abbrev: 'USC', fullName: 'University of Southern California' },
  { abbrev: 'GT', fullName: 'Georgia Tech' },
  { abbrev: 'UW', fullName: 'University of Washington' },
  { abbrev: 'UIUC', fullName: 'University of Illinois Urbana-Champaign' },
  { abbrev: 'UMich', fullName: 'University of Michigan' },
  { abbrev: 'Princeton', fullName: 'Princeton University', existingName: 'Princeton University' },
  { abbrev: 'Harvard', fullName: 'Harvard University', existingName: 'Harvard University' },
  { abbrev: 'Yale', fullName: 'Yale University' },
  { abbrev: 'Oxford', fullName: 'University of Oxford', existingName: 'University of Oxford' },
  { abbrev: 'Cambridge', fullName: 'University of Cambridge', existingName: 'University of Cambridge' },

  // AI/Tech orgs
  { abbrev: 'MIRI', fullName: 'Machine Intelligence Research Institute', existingName: 'Machine Intelligence Research Institute (MIRI)' },
  { abbrev: 'BERI', fullName: 'Berkeley Existential Risk Initiative', existingName: 'Berkeley Existential Risk Initiative (BERI)' },
  { abbrev: 'FHI', fullName: 'Future of Humanity Institute', existingName: 'Future of Humanity Institute (closed 2024)' },
  { abbrev: 'FLI', fullName: 'Future of Life Institute', existingName: 'Future of Life Institute' },
  { abbrev: 'CAIS', fullName: 'Center for AI Safety', existingName: 'Center for AI Safety' },
  { abbrev: 'GovAI', fullName: 'Centre for the Governance of AI', existingName: 'Centre for the Governance of AI' },
  { abbrev: 'CHAI', fullName: 'Center for Human-Compatible AI', existingName: 'Center for Human-Compatible AI (CHAI)' },
  { abbrev: 'ARC', fullName: 'Alignment Research Center', existingName: 'Alignment Research Center (ARC)' },
  { abbrev: 'Redwood', fullName: 'Redwood Research', existingName: 'Redwood Research' },
  { abbrev: 'SFF', fullName: 'Survival and Flourishing Fund', existingName: 'Survival and Flourishing Fund' },
  { abbrev: 'LTFF', fullName: 'Long-Term Future Fund' },
  { abbrev: 'EA', fullName: 'Effective Altruism' },
  { abbrev: 'CEA', fullName: 'Centre for Effective Altruism', existingName: 'Centre for Effective Altruism' },
  { abbrev: 'OP', fullName: 'Open Philanthropy', existingName: 'Open Philanthropy' },
  { abbrev: 'a16z', fullName: 'Andreessen Horowitz', existingName: 'Andreessen Horowitz (a16z)' },
  { abbrev: 'YC', fullName: 'Y Combinator', existingName: 'Y Combinator' },
  { abbrev: 'OpenAI', fullName: 'OpenAI', existingName: 'OpenAI' },
  { abbrev: 'DeepMind', fullName: 'Google DeepMind', existingName: 'Google DeepMind' },
  { abbrev: 'Anthropic', fullName: 'Anthropic', existingName: 'Anthropic' },

  // International
  { abbrev: 'EU', fullName: 'European Union', existingName: 'European Union' },
  { abbrev: 'UN', fullName: 'United Nations', existingName: 'United Nations' },
  { abbrev: 'UNESCO', fullName: 'UNESCO' },
  { abbrev: 'OECD', fullName: 'Organisation for Economic Co-operation and Development', existingName: 'OECD' },
  { abbrev: 'NATO', fullName: 'North Atlantic Treaty Organization' },
  { abbrev: 'UKRI', fullName: 'UK Research and Innovation' },
  { abbrev: 'ARIA', fullName: 'Advanced Research and Invention Agency' },
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
    console.log('  --dry-run  Show what would be expanded/merged without making changes')
    console.log('  --apply    Actually perform the expansions/merges')
    process.exit(1)
  }

  console.log(`=== POST-PROCESS STEP 3: EXPAND ABBREVIATIONS ===`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING CHANGES'}\n`)

  let merged = 0
  let expanded = 0
  let notFound = 0

  for (const mapping of ABBREVIATION_MAPPINGS) {
    // Find the suggestion in Neon
    const suggestion = await neon.query(
      `SELECT suggestion_id, extracted_name, times_seen
       FROM entity_suggestion
       WHERE LOWER(extracted_name) = LOWER($1)
         AND status = 'pending'`,
      [mapping.abbrev]
    )

    if (suggestion.rows.length === 0) {
      continue // No suggestion with this abbreviation
    }

    const sugg = suggestion.rows[0]

    // Try to find existing entity to merge to
    let existingEntity = null
    if (mapping.existingName) {
      existingEntity = await findEntityByName(mapping.existingName)
    }

    if (existingEntity) {
      // Merge to existing entity
      console.log(`\n✓ MERGE: "${sugg.extracted_name}" (seen ${sugg.times_seen}x) → "${existingEntity.name}" (id: ${existingEntity.id})`)

      if (!dryRun) {
        // Update edge_discovery records
        await neon.query(`
          UPDATE edge_discovery
          SET source_entity_id = $1,
              status = CASE WHEN target_entity_id IS NOT NULL THEN 'pending_review' ELSE status END
          WHERE source_suggestion_id = $2
        `, [existingEntity.id, sugg.suggestion_id])

        await neon.query(`
          UPDATE edge_discovery
          SET target_entity_id = $1,
              status = CASE WHEN source_entity_id IS NOT NULL THEN 'pending_review' ELSE status END
          WHERE target_suggestion_id = $2
        `, [existingEntity.id, sugg.suggestion_id])

        // Mark suggestion as merged
        await neon.query(`
          UPDATE entity_suggestion
          SET status = 'merged', merged_to_entity_id = $1
          WHERE suggestion_id = $2
        `, [existingEntity.id, sugg.suggestion_id])
      }
      merged++
    } else {
      // Just expand the name in place
      console.log(`\n→ EXPAND: "${sugg.extracted_name}" (seen ${sugg.times_seen}x) → "${mapping.fullName}"`)

      if (!dryRun) {
        await neon.query(`
          UPDATE entity_suggestion
          SET extracted_name = $1
          WHERE suggestion_id = $2
        `, [mapping.fullName, sugg.suggestion_id])

        // Also update the names in edge_discovery for clarity
        await neon.query(`
          UPDATE edge_discovery
          SET source_entity_name = $1
          WHERE source_suggestion_id = $2
        `, [mapping.fullName, sugg.suggestion_id])

        await neon.query(`
          UPDATE edge_discovery
          SET target_entity_name = $1
          WHERE target_suggestion_id = $2
        `, [mapping.fullName, sugg.suggestion_id])
      }
      expanded++
    }
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Abbreviations checked: ${ABBREVIATION_MAPPINGS.length}`)
  console.log(`Merged to existing entity: ${merged}`)
  console.log(`Expanded in place: ${expanded}`)

  if (dryRun) {
    console.log(`\nRun with --apply to execute these changes.`)
  }

  // Show remaining counts
  const remaining = await neon.query(`
    SELECT status, COUNT(*) as count
    FROM entity_suggestion
    GROUP BY status
    ORDER BY count DESC
  `)
  console.log(`\nEntity suggestion status:`)
  for (const r of remaining.rows) {
    console.log(`  ${r.status}: ${r.count}`)
  }

  await neon.end()
  await rds.end()
}

main().catch(console.error)
