/**
 * Phase 2b: Create missing orgs for people without matching primary_org
 *
 * Usage:
 *   node scripts/create-missing-orgs.js --dry-run    # Show what would happen
 *   node scripts/create-missing-orgs.js --execute    # Actually do it
 */
import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const args = process.argv.slice(2)
const dryRun = !args.includes('--execute')

// Orgs to create with their categories
const MISSING_ORGS = [
  // Government - Legislative
  { name: 'United States Senate', category: 'Government/Agency', website: 'https://senate.gov' },
  {
    name: 'U.S. House of Representatives',
    category: 'Government/Agency',
    website: 'https://house.gov',
  },
  {
    name: 'California State Senate',
    category: 'Government/Agency',
    website: 'https://senate.ca.gov',
  },
  {
    name: 'New York State Assembly',
    category: 'Government/Agency',
    website: 'https://nyassembly.gov',
  },

  // Government - Executive
  { name: 'White House', category: 'Government/Agency', website: 'https://whitehouse.gov' },
  {
    name: 'U.S. Department of Commerce',
    category: 'Government/Agency',
    website: 'https://commerce.gov',
  },
  { name: 'State of California', category: 'Government/Agency', website: 'https://ca.gov' },
  { name: 'State of Texas', category: 'Government/Agency', website: 'https://texas.gov' },
  { name: 'State of Colorado', category: 'Government/Agency', website: 'https://colorado.gov' },
  { name: 'State of New York', category: 'Government/Agency', website: 'https://ny.gov' },
  { name: 'State of Ohio', category: 'Government/Agency', website: 'https://ohio.gov' },
  {
    name: 'Office of the Governor of Indiana',
    category: 'Government/Agency',
    website: 'https://in.gov/gov',
  },

  // Political Parties
  { name: 'Republican Party', category: 'Political Campaign/PAC', website: 'https://gop.com' },
  {
    name: 'Democratic Party',
    category: 'Political Campaign/PAC',
    website: 'https://democrats.org',
  },

  // Big Tech
  { name: 'Google', category: 'Frontier Lab', website: 'https://google.com' },
  { name: 'Microsoft', category: 'Frontier Lab', website: 'https://microsoft.com' },
  { name: 'Meta', category: 'Frontier Lab', website: 'https://meta.com' },

  // Universities
  { name: 'University of Virginia', category: 'Academic', website: 'https://virginia.edu' },
  { name: 'Vanderbilt University', category: 'Academic', website: 'https://vanderbilt.edu' },
  { name: 'University College London', category: 'Academic', website: 'https://ucl.ac.uk' },
  { name: 'Brown University', category: 'Academic', website: 'https://brown.edu' },
  { name: 'Columbia University', category: 'Academic', website: 'https://columbia.edu' },
  { name: 'University of Washington', category: 'Academic', website: 'https://washington.edu' },
  {
    name: 'MIT Sloan',
    category: 'Academic',
    website: 'https://mitsloan.mit.edu',
    parentName: 'Massachusetts Institute of Technology',
  },

  // Research / Safety orgs
  {
    name: 'Center for Humane Technology',
    category: 'Ethics/Bias/Rights',
    website: 'https://humanetech.com',
  },
  { name: 'DAIR Institute', category: 'Ethics/Bias/Rights', website: 'https://dairinstitute.org' },
  { name: 'Mila', category: 'Academic', website: 'https://mila.quebec' },
  { name: 'Signal', category: 'Ethics/Bias/Rights', website: 'https://signal.org' },

  // Philanthropy / Investment
  {
    name: 'Gates Foundation',
    category: 'VC/Capital/Philanthropy',
    website: 'https://gatesfoundation.org',
  },
  {
    name: 'Emerson Collective',
    category: 'VC/Capital/Philanthropy',
    website: 'https://emersoncollective.com',
  },
  { name: 'AngelList', category: 'VC/Capital/Philanthropy', website: 'https://angellist.com' },

  // Defense / Tech
  { name: 'Anduril Industries', category: 'Frontier Lab', website: 'https://anduril.com' },

  // Media
  { name: 'New York Times', category: 'Media/Journalism', website: 'https://nytimes.com' },
  { name: 'Platformer', category: 'Media/Journalism', website: 'https://platformer.news' },

  // Other
  {
    name: 'Common Sense Media',
    category: 'Ethics/Bias/Rights',
    website: 'https://commonsensemedia.org',
  },
  { name: 'Civic Signals', category: 'Think Tank/Policy Org', website: 'https://civicsignals.io' },
  {
    name: 'Amazon Labor Union',
    category: 'Labor/Civil Society',
    website: 'https://amazonlaborunion.org',
  },
]

// Aliases: map variations to canonical names
const ALIASES = {
  'U.S. Senate': 'United States Senate',
  'Office of Science and Technology Policy':
    'White House Office of Science and Technology Policy (OSTP)',
  'Harvard Law School': 'Harvard University',
  'Vanderbilt University Law School': 'Vanderbilt University',
  'University of California, Berkeley': 'UC Berkeley',
  'Signal (or Center for AI Safety)': 'Signal',
}

async function main() {
  console.log('Phase 2b: Create Missing Orgs')
  console.log('==============================')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}\n`)

  const client = await pool.connect()

  try {
    // Get existing orgs
    const existing = await client.query(`
      SELECT id, name FROM entity
      WHERE entity_type = 'organization' AND status = 'approved'
    `)
    const existingByName = new Map(existing.rows.map((o) => [o.name.toLowerCase(), o]))

    // Get people with unmatched primary_org
    const unmatchedPeople = await client.query(`
      SELECT id, name, primary_org
      FROM entity
      WHERE entity_type = 'person'
        AND status = 'approved'
        AND primary_org IS NOT NULL
        AND primary_org != ''
      ORDER BY primary_org
    `)

    // Count how many people need each org
    const orgNeeds = new Map()
    for (const p of unmatchedPeople.rows) {
      let orgName = p.primary_org.trim()
      // Apply alias
      if (ALIASES[orgName]) {
        orgName = ALIASES[orgName]
      }
      // Check if org exists
      if (!existingByName.has(orgName.toLowerCase())) {
        if (!orgNeeds.has(orgName)) {
          orgNeeds.set(orgName, [])
        }
        orgNeeds.get(orgName).push(p.name)
      }
    }

    console.log('=== ORGS NEEDED (by people count) ===\n')
    const sortedNeeds = [...orgNeeds.entries()].sort((a, b) => b[1].length - a[1].length)
    for (const [org, people] of sortedNeeds) {
      const willCreate = MISSING_ORGS.find((o) => o.name.toLowerCase() === org.toLowerCase())
      console.log(`${willCreate ? '✓' : '⚠'} "${org}" (${people.length} people)`)
      for (const person of people.slice(0, 3)) {
        console.log(`    - ${person}`)
      }
      if (people.length > 3) {
        console.log(`    ... and ${people.length - 3} more`)
      }
    }

    console.log('\n=== CREATING ORGS ===\n')
    let created = 0
    const createdOrgs = new Map()

    for (const org of MISSING_ORGS) {
      if (existingByName.has(org.name.toLowerCase())) {
        console.log(`  ✓ ${org.name} (already exists)`)
        continue
      }

      console.log(`  + ${org.name} [${org.category}]`)

      if (!dryRun) {
        // Look up parent org if specified
        let parentOrgId = null
        if (org.parentName) {
          const parent = existingByName.get(org.parentName.toLowerCase())
          if (parent) {
            parentOrgId = parent.id
          }
        }

        const result = await client.query(
          `
          INSERT INTO entity (entity_type, name, category, website, parent_org_id, status)
          VALUES ('organization', $1, $2, $3, $4, 'approved')
          RETURNING id
        `,
          [org.name, org.category, org.website, parentOrgId],
        )

        createdOrgs.set(org.name.toLowerCase(), { id: result.rows[0].id, ...org })
        existingByName.set(org.name.toLowerCase(), { id: result.rows[0].id, name: org.name })
        created++

        // Create subsidiary_of edge if has parent
        if (parentOrgId) {
          await client.query(
            `
            INSERT INTO edge (source_id, target_id, edge_type, created_by)
            VALUES ($1, $2, 'subsidiary_of', 'create-missing-orgs')
            ON CONFLICT (source_id, target_id, edge_type) DO NOTHING
          `,
            [result.rows[0].id, parentOrgId],
          )
          console.log(`      → subsidiary of ${org.parentName}`)
        }
      }
    }

    console.log(
      `\n${dryRun ? 'Would create' : 'Created'}: ${dryRun ? MISSING_ORGS.filter((o) => !existingByName.has(o.name.toLowerCase())).length : created} orgs`,
    )

    // Now create edges for people whose orgs were just created
    if (!dryRun && created > 0) {
      console.log('\n=== CREATING EDGES FOR NEW ORGS ===\n')
      let edgesCreated = 0

      for (const person of unmatchedPeople.rows) {
        let orgName = person.primary_org.trim()
        if (ALIASES[orgName]) {
          orgName = ALIASES[orgName]
        }

        const org = existingByName.get(orgName.toLowerCase())
        if (!org) continue

        // Check if edge already exists
        const existingEdge = await client.query(
          `
          SELECT 1 FROM edge
          WHERE source_id = $1 AND target_id = $2
        `,
          [person.id, org.id],
        )

        if (existingEdge.rows.length > 0) continue

        // Get person's title for role
        const personData = await client.query('SELECT title FROM entity WHERE id = $1', [person.id])
        const role = personData.rows[0]?.title

        await client.query(
          `
          INSERT INTO edge (source_id, target_id, edge_type, role, is_primary, created_by)
          VALUES ($1, $2, 'employed_by', $3, true, 'create-missing-orgs')
          ON CONFLICT (source_id, target_id, edge_type) DO NOTHING
        `,
          [person.id, org.id, role],
        )

        edgesCreated++
        console.log(`  ✓ ${person.name} → ${org.name}`)
      }

      console.log(`\nCreated ${edgesCreated} edges`)
    }

    // Summary
    const finalOrgCount = await client.query(`
      SELECT COUNT(*)::int as cnt FROM entity WHERE entity_type = 'organization' AND status = 'approved'
    `)
    const finalEdgeCount = await client.query('SELECT COUNT(*)::int as cnt FROM edge')

    console.log('\n==============================')
    console.log('SUMMARY')
    console.log('==============================')
    console.log(
      `Orgs ${dryRun ? 'to create' : 'created'}: ${dryRun ? MISSING_ORGS.filter((o) => !existingByName.has(o.name.toLowerCase())).length : created}`,
    )
    console.log(
      `Still unmatched orgs: ${sortedNeeds.filter(([org]) => !MISSING_ORGS.find((o) => o.name.toLowerCase() === org.toLowerCase())).length}`,
    )
    console.log(`Total orgs: ${finalOrgCount.rows[0].cnt}`)
    console.log(`Total edges: ${finalEdgeCount.rows[0].cnt}`)

    if (dryRun) {
      console.log('\nTo execute, run:')
      console.log('  node scripts/create-missing-orgs.js --execute')
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
