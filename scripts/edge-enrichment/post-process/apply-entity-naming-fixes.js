#!/usr/bin/env node
/**
 * Apply Entity Naming Fixes from Claude.ai Review
 *
 * Standardizes entity names, removes redundant parentheticals,
 * drops "The" prefixes, and assigns parent orgs where appropriate.
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/apply-entity-naming-fixes.js --dry-run
 *   node scripts/edge-enrichment/post-process/apply-entity-naming-fixes.js --apply
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
  console.log('Usage: node apply-entity-naming-fixes.js [--dry-run | --apply]')
  process.exit(0)
}

// Entity naming fixes from Claude.ai review
const NAME_CHANGES = [
  { id: 2039, from: "Athena 2.0 (AI Safety Mentorship Program)", to: "Athena 2.0" },
  { id: 2084, from: "Capital K (KAUST Deep Tech Innovation Fund)", to: "Capital K" },
  { id: 2040, from: "German Federal Government (Bund)", to: "German Federal Government" },
  { id: 2263, from: "Hoover Institution at Stanford University", to: "Hoover Institution" },
  { id: 2051, from: "HSBC Strategic Innovation Investments", to: "HSBC Strategic Innovation Investments (HSBC SII)" },
  { id: 2066, from: "IvySys Technologies, LLC", to: "IvySys Technologies" },
  { id: 2089, from: "Kim Jungsik (Kim Jeong-sik)", to: "Kim Jungsik" },
  { id: 2094, from: "Lambda (Lambda Labs)", to: "Lambda Labs" },
  { id: 2095, from: "Land Berlin (State of Berlin)", to: "Land Berlin" },
  { id: 2096, from: "State of Brandenburg (Land Brandenburg)", to: "Land Brandenburg" },
  { id: 2113, from: "M12 (Microsoft's Venture Fund)", to: "M12" },
  { id: 2217, from: "MacArthur Foundation Research Network on Opening Governance", to: "Research Network on Opening Governance" },
  { id: 2115, from: "MATS Research Inc.", to: "MATS Research" },
  { id: 2116, from: "MIT Quest for Intelligence (MIT Siegel Family Quest for Intelligence)", to: "MIT Quest for Intelligence" },
  { id: 2118, from: "MIT Task Force on the Work of the Future", to: "MIT Work of the Future" },
  { id: 2147, from: "Natcast (National Center for the Advancement of Semiconductor Technology)", to: "Natcast" },
  { id: 2148, from: "National AI Research Resource (NAIRR) Pilot", to: "National AI Research Resource (NAIRR)" },
  { id: 2142, from: "National Defense Science and Engineering Graduate (NDSEG) Fellowship Program", to: "NDSEG Fellowship" },
  { id: 2239, from: "National Infrastructure Fund (Infra)", to: "National Infrastructure Fund" },
  { id: 2152, from: "National Telecommunications and Information Administration", to: "National Telecommunications and Information Administration (NTIA)" },
  { id: 2153, from: "Natural Sciences and Engineering Research Council of Canada", to: "Natural Sciences and Engineering Research Council of Canada (NSERC)" },
  { id: 2145, from: "NVentures (NVIDIA Venture Capital)", to: "NVentures" },
  { id: 2146, from: "NYU Center for Mind, Ethics, and Policy (CMEP)", to: "NYU Center for Mind, Ethics, and Policy" },
  { id: 2174, from: "Okawa Foundation for Information and Telecommunications", to: "Okawa Foundation" },
  { id: 2175, from: "Okta, Inc.", to: "Okta" },
  { id: 2177, from: "Ontario Early Researcher Awards", to: "Ontario Early Researcher Awards (Ontario ERA)" },
  { id: 2181, from: "Organisation for Economic Co-operation and Development (OECD)", to: "OECD" },
  { id: 2184, from: "Parallel (beparallel.com)", to: "Parallel" },
  { id: 2198, from: "Prairies Economic Development Canada (PrairiesCan)", to: "Prairies Economic Development Canada" },
  { id: 2202, from: "Public Interest Tech Lab (Harvard Kennedy School)", to: "Public Interest Tech Lab" },
  { id: 2218, from: "Respan (formerly Keywords AI)", to: "Respan" },
  { id: 2241, from: "Schwartz Reisman Institute for Technology and Society", to: "Schwartz Reisman Institute" },
  { id: 2261, from: "Squirrel AI Learning (Yixue Group)", to: "Squirrel AI Learning" },
  { id: 2267, from: "StepStone Group Inc.", to: "StepStone Group" },
  { id: 2269, from: "Strategic Artificial Intelligence Research Centre", to: "Strategic AI Research Centre (SARC)" },
  { id: 2276, from: "TDK Ventures Inc.", to: "TDK Ventures" },
  { id: 2285, from: "The Alan Turing Institute", to: "Alan Turing Institute" },
  { id: 2289, from: "The Ethics & Governance of AI Initiative", to: "Ethics and Governance of AI Initiative" },
  { id: 2290, from: "The Goodly Institute", to: "Goodly Institute" },
  { id: 2086, from: "The Kavli Foundation", to: "Kavli Foundation" },
  { id: 2291, from: "The Marcus Foundation", to: "Marcus Foundation" },
  { id: 2120, from: "The MITRE Corporation", to: "MITRE Corporation" },
  { id: 2293, from: "The NOMIS Foundation", to: "NOMIS Foundation" },
  { id: 2221, from: "The Rockefeller Foundation", to: "Rockefeller Foundation" },
  { id: 2236, from: "The San Francisco Compute Company", to: "San Francisco Compute Company" },
  { id: 2246, from: "Thomas and Stacey Siebel Foundation", to: "Siebel Foundation" },
  { id: 2294, from: "Toyota Motor Corporation", to: "Toyota" },
  { id: 2299, from: "UC Investments (University of California Investment Office)", to: "UC Investments" },
  { id: 2310, from: "Vanderbilt University Institute of National Security", to: "Vanderbilt Institute of National Security" },
  { id: 2313, from: "Vicarious FPC Inc.", to: "Vicarious" },
  { id: 2300, from: "Fundamental AI Research Lab (FAIR Laboratory)", to: "FAIR Laboratory (UK)" }
]

// Parent org assignments (name -> lookup existing entity)
const PARENT_ASSIGNMENTS = [
  { entityId: 2263, parentName: "Stanford University", note: "Hoover Institution → Stanford" },
  { entityId: 2217, parentName: "MacArthur Foundation", note: "Research Network → MacArthur" },
  { entityId: 2116, parentName: "Massachusetts Institute of Technology", note: "MIT Quest → MIT" },
  { entityId: 2118, parentName: "Massachusetts Institute of Technology", note: "MIT Work of Future → MIT" },
  { entityId: 2146, parentName: "New York University", note: "NYU CMEP → NYU" },
  { entityId: 2262, parentName: "Stanford University", note: "Stanford Impact Labs → Stanford" },
  { entityId: 2299, parentName: "University of California", note: "UC Investments → UC" }
]

// Entities that need new parent orgs created (skip for now, flag for manual review)
const NEEDS_NEW_PARENT = [
  { entityId: 2084, parentName: "King Abdullah University of Science and Technology (KAUST)" },
  { entityId: 2051, parentName: "HSBC" },
  { entityId: 2276, parentName: "TDK Corporation" },
  { entityId: 2279, parentName: "Ontario Teachers' Pension Plan" },
  { entityId: 2284, parentName: "State of Texas" },
  { entityId: 2261, parentName: "Yixue Group" }
]

async function main() {
  console.log('='.repeat(60))
  console.log('ENTITY NAMING FIXES FROM CLAUDE.AI REVIEW')
  console.log('='.repeat(60))
  console.log(dryRun ? '[DRY RUN MODE]' : '[APPLY MODE]')
  console.log()

  let stats = { renamed: 0, parentsAssigned: 0, skipped: 0 }

  // 1. Apply name changes
  console.log('--- NAME CHANGES ---')
  for (const change of NAME_CHANGES) {
    const entity = await rds.query('SELECT id, name FROM entity WHERE id = $1', [change.id])

    if (entity.rows.length === 0) {
      console.log(`⚠ #${change.id} not found`)
      stats.skipped++
      continue
    }

    const current = entity.rows[0].name
    if (current !== change.from) {
      console.log(`⚠ #${change.id} name mismatch: "${current}" vs expected "${change.from}"`)
      // Still apply if target is different
      if (current === change.to) {
        console.log(`  Already renamed to "${change.to}"`)
        stats.skipped++
        continue
      }
    }

    console.log(`#${change.id}: "${current}" → "${change.to}"`)

    if (!dryRun) {
      await rds.query('UPDATE entity SET name = $1 WHERE id = $2', [change.to, change.id])
      stats.renamed++
    }
  }

  // 2. Assign parent orgs
  console.log('\n--- PARENT ORG ASSIGNMENTS ---')
  for (const pa of PARENT_ASSIGNMENTS) {
    // Look up parent by name
    const parent = await rds.query(
      'SELECT id, name FROM entity WHERE name = $1 AND status = $2',
      [pa.parentName, 'approved']
    )

    if (parent.rows.length === 0) {
      console.log(`⚠ Parent "${pa.parentName}" not found`)
      stats.skipped++
      continue
    }

    const child = await rds.query('SELECT id, name, parent_org_id FROM entity WHERE id = $1', [pa.entityId])
    if (child.rows.length === 0) {
      console.log(`⚠ Child #${pa.entityId} not found`)
      stats.skipped++
      continue
    }

    if (child.rows[0].parent_org_id) {
      console.log(`✓ ${pa.note} - already has parent`)
      stats.skipped++
      continue
    }

    console.log(`${pa.note} (#${pa.entityId} → #${parent.rows[0].id})`)

    if (!dryRun) {
      await rds.query('UPDATE entity SET parent_org_id = $1 WHERE id = $2', [parent.rows[0].id, pa.entityId])
      stats.parentsAssigned++
    }
  }

  // 3. Flag entities needing new parent orgs
  console.log('\n--- NEEDS NEW PARENT ORG (manual review) ---')
  for (const item of NEEDS_NEW_PARENT) {
    console.log(`#${item.entityId} needs parent: ${item.parentName}`)
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Names changed: ${dryRun ? NAME_CHANGES.length + ' (pending)' : stats.renamed}`)
  console.log(`Parents assigned: ${dryRun ? PARENT_ASSIGNMENTS.length + ' (pending)' : stats.parentsAssigned}`)
  console.log(`Skipped: ${stats.skipped}`)
  console.log(`Need new parent orgs: ${NEEDS_NEW_PARENT.length}`)

  if (dryRun) {
    console.log('\n[DRY RUN] No changes applied. Run with --apply to execute.')
  }

  await rds.end()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
