#!/usr/bin/env node
/**
 * Apply final entity rejections from Claude.ai entity review
 *
 * These are the 57 REJECT entities from the final review of remaining
 * unmatched entities (Step 1.4).
 *
 * Categories:
 * - Political PACs and donations
 * - Generic aggregates (programs, participants, regions)
 * - Non-AI philanthropy/organizations
 * - Employment misclassified as grants
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/apply-final-entity-rejections.js --dry-run
 *   node scripts/edge-enrichment/post-process/apply-final-entity-rejections.js --apply
 */
import 'dotenv/config'
import pg from 'pg'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

// REJECT entities from Claude.ai final entity review (Step 1.4)
const REJECT_ENTITIES = [
  // Political PACs and unions
  'American Staffing Association Staffing PAC',
  'Cracker Barrel Old Country Store, Inc. PAC',
  'Genentech Inc. Political Action Committee',
  'UNITED FOOD AND COMMERCIAL WORKERS INTERNATIONAL UNION',
  'BRANCH 193 NATIONAL ASSOCIATION OF LETTER CARRIERS POLITICAL ACTION COMMITTEE',
  'AMERICAN ROLL-ON ROLL-OFF CARRIER GROUP, INC. FREEDOM PAC / ARC FREEDOM',
  'International Association of Heat & Frost Insulators and Allied Workers',
  'American Postal Workers Union Committee on Political Action',
  'Assurant Inc. Political Action Committee',
  'H&R Block Inc. Political Action Committee (Blockpac)',
  'SEAFARERS INTERNATIONAL UNION OF NA-AGLIW',
  'AMERICAN FEDERATION OF STATE, COUNTY AND MUNICIPAL EMPLOYEES, AFL-CIO',
  'Gilead Sciences Inc Healthcare Policy PAC',
  'Ohio Republican State Central & Executive Committee State Candidate Fund',
  'Noble Energy Political Action Committee',
  'Anadarko Petroleum Corporation Political Action Committee',
  'Directv Group, Inc. Fund - Federal (Directv PAC)',
  'Investment Company Institute Political Action Committee (Ici PAC)',
  'International Association of Machinists and Aerospace Workers',
  'International Union of Painters and Allied Trades Political Action Together Political Comm',
  'Political Educational Fund of the Building and Construction Trades Department, Afl-Cio',

  // Generic aggregates (programs, participants, regions)
  'private and public pensions, family offices, high-net worth individuals and sovereign wealth funds',
  'K-12 schools, colleges, nonprofits, public agencies, and other organizations',
  'cities, towns, counties, Tribal governments and Metropolitan Planning Organizations',
  'Ohio faith-based and nonprofit institutions',
  'small and medium-sized manufacturers and their National Laboratory, university, and non-profit partners',
  'Critical Minerals Research, Development and Demonstration program projects',
  'Indigenous Natural Resource Partnerships program projects',
  'SFF applicants',
  'AI Safety Retraining Program participants',
  'Lake, Orange, Riverside, Sacramento, Santa Clara, Solano, Yolo and Yuba regions',
  'Seven-bank consortium (BNP Paribas, Crédit Agricole CIB, HSBC, MUFG, Bpifrance, La Banque Postale, and Natixis CIB)',
  'Viktor Warlop and Oliver Zhang',

  // Non-AI organizations/programs
  'University of Hawaii Sea Grant College Program',
  'California Workforce Development Board and California Department of Transportation',
  'Stanford University Trust for Post Retirement and Post Employment Benefits',
  'DreamYard Project',
  'National 4-H Council',
  'Athena Mentorship Program for Women',
  'Packaging Machinery Manufacturers Institute',
  'Michigan Manufacturing Technology Center',
  'Community Collaboration Fund',
  'Grant for the Web program',
  'Stephenson Data Science Bicentennial Scholars Fund',
  'ASTM International',

  // Non-AI foundations/philanthropy
  'The Goizueta Foundation',
  'Winston Churchill Foundation of U.S.',
  'Norwegian Agency for Development Cooperation (Norad)',
  'Norway\'s International Climate and Forest Initiative (NICFI)',

  // Non-AI tech companies
  'Snoop Dogg',
  'ZUFFA LLC DBA ULTIMATE FIGHTING CHAMPIONSHIP',
  'Advance Magazine Publishers Inc.',

  // Self-referential or unclear
  'DARR, WILLIAM H (BILL)',
  'Getthiss Innovation Sdn. Bhd.',
  'Umane',
  'WAIAI',
  'ENS',
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

  console.log(`=== APPLY FINAL ENTITY REJECTIONS (Step 1.4) ===`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING CHANGES'}`)
  console.log(`Checking ${REJECT_ENTITIES.length} entity patterns\n`)

  let totalFound = 0
  let totalRejected = 0

  for (const entityName of REJECT_ENTITIES) {
    // Find edges where this entity is source OR target
    const edges = await neon.query(`
      SELECT discovery_id, source_entity_name, target_entity_name
      FROM edge_discovery
      WHERE status = 'pending_entities'
        AND (LOWER(source_entity_name) = LOWER($1) OR LOWER(target_entity_name) = LOWER($1))
    `, [entityName])

    if (edges.rows.length === 0) continue

    totalFound += edges.rows.length
    console.log(`\n${entityName} (${edges.rows.length} edges):`)

    for (const edge of edges.rows) {
      const isSource = edge.source_entity_name.toLowerCase() === entityName.toLowerCase()
      console.log(`  ✗ ${edge.source_entity_name} → ${edge.target_entity_name}`)
      console.log(`    Rejected ${isSource ? 'source' : 'target'}: final entity review`)

      if (!dryRun) {
        await neon.query(`
          UPDATE edge_discovery
          SET status = 'rejected',
              review_notes = $2,
              reviewed_at = NOW()
          WHERE discovery_id = $1
        `, [edge.discovery_id, `Entity rejected in final review: ${entityName}`])
        totalRejected++
      }
    }
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Entity patterns checked: ${REJECT_ENTITIES.length}`)
  console.log(`Edges found: ${totalFound}`)
  if (!dryRun) {
    console.log(`Edges rejected: ${totalRejected}`)
  }

  if (dryRun) {
    console.log(`\nRun with --apply to execute these rejections.`)
  }

  await neon.end()
}

main().catch(console.error)
