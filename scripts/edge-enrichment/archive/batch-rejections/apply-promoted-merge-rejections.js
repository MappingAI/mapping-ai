#!/usr/bin/env node
/**
 * Apply rejections from Claude.ai review of promoted-from-merge edges
 * (187 edges from promoted-from-merge-review.csv)
 *
 * These edges were promoted via merge-duplicates but need QC review.
 * Note: Palantir → Jacob Helberg kept per user request (consulting relationship is relevant)
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/apply-promoted-merge-rejections.js --dry-run
 *   node scripts/edge-enrichment/post-process/apply-promoted-merge-rejections.js --apply
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

// Rejections from Claude.ai review of promoted-from-merge batch
// Note: Palantir → Jacob Helberg NOT included per user request
const REJECTIONS = [
  // Political donations
  { funder: 'Andreessen Horowitz', recipient: 'Cynthia Lummis', reason: 'Political campaign donation, not AI policy' },

  // Non-AI investments
  { funder: 'Andreessen Horowitz', recipient: 'KoBold Metals', reason: 'Mineral exploration for energy transition, not AI' },
  { funder: 'Andreessen Horowitz', recipient: 'Stripe', reason: 'General tech investment (payments company), not AI' },
  { funder: 'Founders Fund', recipient: 'Facebook', reason: 'Early social media investment, not AI' },

  // Gates Foundation general philanthropy
  { funder: 'Bill & Melinda Gates Foundation', recipient: 'Brookings Institution', reason: 'General think tank support, not AI' },
  { funder: 'Bill & Melinda Gates Foundation', recipient: 'CSIS', reason: 'General think tank donor, not AI' },
  { funder: 'Bill & Melinda Gates Foundation', recipient: 'RAND Corporation', reason: 'Health/education/safety research, not AI' },
  { funder: 'Bill & Melinda Gates Foundation', recipient: 'University of Washington', reason: 'Global health measurement programs, not AI' },

  // MacArthur Foundation
  { funder: 'John D. and Catherine T. MacArthur Foundation', recipient: 'Human Rights Data Analysis Group', reason: 'Human rights/war crimes data analysis, not AI' },
  { funder: 'John D. and Catherine T. MacArthur Foundation', recipient: 'danah boyd', reason: 'General research funding, not AI-specific' },

  // NSF non-AI grants
  { funder: 'NSF', recipient: 'William Bialek', reason: 'Neuroscience/biophysics research, not AI' },
  { funder: 'National Science Foundation', recipient: 'Arthur Spirling', reason: 'Linguistics/political text analysis, not AI' },
  { funder: 'National Science Foundation', recipient: 'Arvind Narayanan', reason: 'Cryptocurrency security/anonymity research, not AI' },
  { funder: 'National Science Foundation', recipient: 'Court Watch NOLA', reason: 'Criminal justice reform, not AI' },
  { funder: 'National Science Foundation', recipient: 'David Autor', reason: 'NSF CAREER Award for labor economics, not AI' },
  { funder: 'National Science Foundation', recipient: 'Emory University', reason: 'Research development professionals diversity program, not AI' },
  { funder: 'National Science Foundation', recipient: 'Giles Hooker', reason: 'General statistics award, not AI' },
  { funder: 'National Science Foundation', recipient: 'Kate Kellogg', reason: 'Organizational technology adoption, not AI research' },
  { funder: 'National Science Foundation', recipient: 'Ryan Calo', reason: 'NSF event organization role, not funding relationship' },
  { funder: 'National Science Foundation', recipient: 'Scott A. Strobel', reason: 'US-Peru field ecology training, not AI' },
  { funder: 'National Science Foundation', recipient: 'Speed School of Engineering', reason: 'Battery research, not AI' },

  // Open Philanthropy non-AI grants
  { funder: 'Open Philanthropy', recipient: 'Court Watch NOLA', reason: 'Criminal justice reform, not AI' },
  { funder: 'Open Philanthropy', recipient: 'Probably Good', reason: 'General EA career support, not AI' },
  { funder: 'Open Philanthropy', recipient: 'Successif', reason: 'General EA career support, not AI' },

  // DOE non-AI grants
  { funder: 'U.S. Department of Defense', recipient: 'Jeff Hancock', reason: 'Social science research, not AI-specific' },
  { funder: 'U.S. Department of Energy', recipient: 'Carnegie Mellon University', reason: 'Decarbonization in steelmaking, not AI' },
  { funder: 'U.S. Department of Energy', recipient: 'Federation of American Scientists', reason: 'Building technologies energy efficiency, not AI' },
  { funder: 'U.S. Department of Energy', recipient: 'Idaho National Laboratory', reason: 'Nuclear reactor infrastructure, not AI' },
  { funder: 'U.S. Department of Energy', recipient: 'PCAST', reason: 'Administrative support for advisory committee, not AI' },
  { funder: 'U.S. Department of Energy', recipient: 'University of Tennessee', reason: 'Fusion energy materials design, not AI' },
]

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const apply = process.argv.includes('--apply')

  if (!dryRun && !apply) {
    console.log('Usage:')
    console.log('  --dry-run  Show what would be rejected')
    console.log('  --apply    Actually perform the rejections')
    process.exit(1)
  }

  console.log(`=== APPLY PROMOTED-FROM-MERGE REJECTIONS ===`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING CHANGES'}\n`)

  let found = 0
  let notFound = 0
  let rdsDeleted = 0

  for (const rej of REJECTIONS) {
    // Find the edge_discovery record
    const discovery = await neon.query(`
      SELECT discovery_id, promoted_edge_id, source_entity_name, target_entity_name
      FROM edge_discovery
      WHERE LOWER(source_entity_name) = LOWER($1)
        AND LOWER(target_entity_name) = LOWER($2)
        AND status = 'promoted'
    `, [rej.funder, rej.recipient])

    if (discovery.rows.length === 0) {
      console.log(`⊘ Not found: ${rej.funder} → ${rej.recipient}`)
      notFound++
      continue
    }

    const disc = discovery.rows[0]
    console.log(`✗ ${disc.source_entity_name} → ${disc.target_entity_name}`)
    console.log(`  Reason: ${rej.reason}`)
    console.log(`  Edge ID: ${disc.promoted_edge_id}`)
    found++

    if (!dryRun) {
      // Delete from RDS edge table
      if (disc.promoted_edge_id) {
        await rds.query('DELETE FROM edge WHERE id = $1', [disc.promoted_edge_id])
        console.log(`  Deleted from RDS`)
        rdsDeleted++
      }

      // Update edge_discovery status to rejected
      await neon.query(`
        UPDATE edge_discovery
        SET status = 'rejected',
            review_notes = $2,
            reviewed_at = NOW()
        WHERE discovery_id = $1
      `, [disc.discovery_id, rej.reason])
      console.log(`  Marked as rejected in Neon`)
    }
    console.log('')
  }

  console.log(`=== SUMMARY ===`)
  console.log(`Rejections defined: ${REJECTIONS.length}`)
  console.log(`Found in database: ${found}`)
  console.log(`Not found: ${notFound}`)
  if (!dryRun) {
    console.log(`Deleted from RDS: ${rdsDeleted}`)
  }

  if (dryRun) {
    console.log(`\nRun with --apply to execute these rejections.`)
  }

  await neon.end()
  await rds.end()
}

main().catch(console.error)
