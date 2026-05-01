#!/usr/bin/env node
/**
 * Apply rejections from Claude.ai review of promoted edges
 *
 * These edges were already promoted to RDS but should be removed
 * based on manual review (not AI-related, wrong citations, etc.)
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/apply-promoted-rejections.js --dry-run
 *   node scripts/edge-enrichment/post-process/apply-promoted-rejections.js --apply
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

// Edges to reject based on Claude.ai review (funder → recipient)
// Reason codes: NAR = Not AI Related, WC = Wrong Citation, NF = Not Funding, POL = Political
const REJECTIONS = [
  // NOT AI-RELATED
  { funder: 'American University', recipient: 'Gwanhoo Lee', reason: 'NAR: Erasmus scholarship, not AI' },
  { funder: 'Bill Gates', recipient: 'KoBold Metals', reason: 'NAR: Copper mining project' },
  { funder: 'Bill Gates', recipient: 'University of Washington', reason: 'NAR: Molecular Biotechnology (1990s biomedical)' },
  { funder: 'Carnegie Corporation of New York', recipient: 'Federation of American Scientists', reason: 'NAR: Nuclear stability research' },
  { funder: 'Carnegie Corporation of New York', recipient: 'Ganesh Sitaraman', reason: 'NAR: Constitutional law fellowship' },
  { funder: 'Carnegie Corporation of New York', recipient: 'Nathaniel Persily', reason: 'NAR: Democracy research fellowship' },
  { funder: 'Carnegie Corporation of New York', recipient: 'Zeynep Tufekci', reason: 'NAR: Democracy/international order fellowship' },
  { funder: 'Club For Growth Action', recipient: 'Ted Budd', reason: 'POL: Political campaign donation' },
  { funder: 'Court Watch NOLA', recipient: 'University of Pennsylvania', reason: 'NAR: General support, not AI' },
  { funder: 'DARPA', recipient: 'Sandy Pentland', reason: 'NF: Award recognition, not funding grant' },
  { funder: 'DARPA', recipient: 'Sebastian Thrun', reason: 'NF: Contractor award, not research grant' },
  { funder: 'Department of Defense', recipient: 'Scott Strobel', reason: 'NAR: Diesel fuel from fungi research' },
  { funder: 'Department of Homeland Security', recipient: 'CISA', reason: 'NAR: General cybersecurity infrastructure' },
  { funder: 'Donald Trump', recipient: 'Pam Bondi', reason: 'POL: Political donation' },
  { funder: 'Elon Musk', recipient: 'Khan Academy', reason: 'NAR: General education donation' },
  { funder: 'European Union', recipient: 'Gwanhoo Lee', reason: 'NAR: Erasmus scholarship' },
  { funder: 'Ford Foundation', recipient: 'ACLU', reason: 'NAR: Civil liberties endowment' },
  { funder: 'Ford Foundation', recipient: 'Center for Strategic and International Studies (CSIS)', reason: 'NAR: No AI description in citation' },
  { funder: 'Ford Foundation', recipient: 'Human Rights Data Analysis Group', reason: 'NAR: War crimes analysis' },
  { funder: 'Ford Foundation', recipient: 'Washington Post', reason: 'NAR: Media/journalism funding' },
  { funder: 'Gates Foundation', recipient: 'Bipartisan Policy Center', reason: 'NAR: Higher education finance modeling' },
  { funder: 'Gates Foundation', recipient: 'Mozilla Foundation', reason: 'NAR: Agricultural development' },
  { funder: 'Gates Foundation', recipient: 'Stanford University', reason: 'NAR: Global health (monoclonal antibodies)' },
  { funder: 'General Services Administration', recipient: 'Google', reason: 'NF: Procurement agreement, not funding' },
  { funder: 'Gigafund', recipient: 'SpaceX', reason: 'NAR: Space launch, not AI' },
  { funder: 'Google', recipient: 'SpaceX', reason: 'NAR: Space investment' },
  { funder: 'Google Inc', recipient: 'John Hickenlooper', reason: 'POL: Political campaign donation' },
  { funder: 'Google Inc.', recipient: 'Steve Scalise', reason: 'POL: Political campaign donation' },
  { funder: 'Greylock', recipient: 'LinkedIn', reason: 'NAR: Professional networking, not AI (2003)' },
  { funder: 'Jensen Huang', recipient: 'Stanford University', reason: 'NAR: General engineering scholarship' },
  { funder: 'Khosla Ventures', recipient: 'Vox Media', reason: 'NAR: Media company investment' },
  { funder: 'Laurene Powell Jobs', recipient: 'Andy Kim', reason: 'POL: Political campaign donation' },
  { funder: 'MIT GOV/LAB', recipient: 'Stuart Russell', reason: 'WC: Wrong person (political science PhD, not AI researcher)' },
  { funder: 'MacArthur Foundation', recipient: 'Danielle Allen', reason: 'NAR: Classical Languages fellowship' },
  { funder: 'Manifund', recipient: 'Connor Axiotes', reason: 'NF: Citation says $0 raised' },
  { funder: 'Marc Andreessen', recipient: 'Reddit', reason: 'NAR: Social media platform' },
  { funder: 'Marc Benioff', recipient: 'TIME Magazine', reason: 'NAR: Media acquisition' },
  { funder: 'Marsha Blackburn', recipient: 'National Republican Senatorial Committee', reason: 'POL: Political donation' },
  { funder: 'Meta', recipient: 'Arizona Secretary of State', reason: 'NAR: Election operations' },
  { funder: 'Microsoft', recipient: 'LinkedIn', reason: 'NAR: Corporate acquisition of professional network' },
  { funder: 'Microsoft Corp', recipient: 'Catherine Cortez Masto', reason: 'POL: Political campaign donation' },
  { funder: 'Microsoft Corp', recipient: 'John Hickenlooper', reason: 'POL: Political campaign donation' },
  { funder: 'National Institutes of Health', recipient: 'Emory University', reason: 'NAR: General biomedical research' },
  { funder: 'Peter Thiel', recipient: 'Eric Schmitt', reason: 'POL: Political donation' },
  { funder: 'Peter Thiel', recipient: 'Reddit', reason: 'NAR: Social media platform' },
  { funder: 'Peter Thiel', recipient: 'Stripe', reason: 'NAR: Payments company' },
  { funder: 'Peter Thiel', recipient: 'Thrive Capital', reason: 'NAR: General tech VC fund' },
  { funder: 'Princeton University', recipient: 'Thrive Capital', reason: 'NAR: General tech VC fund LP' },
  { funder: 'Sam Altman', recipient: 'Reddit', reason: 'NAR: Social media platform' },
  { funder: 'Sequoia Capital', recipient: 'LinkedIn', reason: 'NAR: Professional network (2003)' },
  { funder: 'Sequoia Capital', recipient: 'Stripe', reason: 'NAR: Payments company' },
  { funder: 'Stanford University', recipient: 'Ramin Toloui', reason: 'NF: Salary, not grant' },
  { funder: 'Stanford University', recipient: 'Veena Dubal', reason: 'NAR: Labor law fellowship' },
  { funder: 'State of California', recipient: 'Government Operations Agency', reason: 'NAR: State budget allocation' },
  { funder: 'Susan Athey', recipient: 'Cory Booker', reason: 'POL: Political donation' },
  { funder: 'U.S. Department of Commerce', recipient: 'NTIA', reason: 'NAR: Broadband/digital inclusion' },
  { funder: 'U.S. Department of State', recipient: 'Human Rights Data Analysis Group', reason: 'NAR: Truth commission work' },
  { funder: 'University of Michigan', recipient: 'Hélène Landemore', reason: 'NF: Lecture honorarium, not grant' },
  { funder: 'University of Michigan', recipient: 'Matthew Johnson-Roberson', reason: 'NF: University award, not grant' },
  { funder: 'University of Notre Dame', recipient: 'Ted Chiang', reason: 'NAR: Artist residency' },
  { funder: 'University of Oxford', recipient: 'Brian Christian', reason: 'NAR: Academic scholarship, not AI funding' },
  { funder: 'University of Virginia', recipient: 'Darden School of Business', reason: 'NAR: Business school gift' },
  { funder: 'Vox Media', recipient: 'Ezra Klein', reason: 'NF: Employment, not funding' },
  { funder: 'William and Flora Hewlett Foundation', recipient: 'Effective Institutions Project', reason: 'NAR: Governance reform' },
  { funder: 'William and Flora Hewlett Foundation', recipient: 'MIT Shaping the Future of Work Initiative', reason: 'NAR: Labor policy research' },
  { funder: 'World Economic Forum', recipient: 'Børge Brende', reason: 'NF: Salary, not grant' },
  { funder: 'Y Combinator', recipient: 'ACLU', reason: 'NAR: Civil liberties nonprofit' },
  { funder: 'Y Combinator', recipient: 'Reddit', reason: 'NAR: Social media platform' },
  // Suspicious citations (keeping for reference but may keep some)
  { funder: 'RAND Corporation', recipient: 'Allen Newell', reason: 'NF: Historical employment (1950), not funding' },
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

  console.log(`=== APPLY PROMOTED EDGE REJECTIONS ===`)
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
