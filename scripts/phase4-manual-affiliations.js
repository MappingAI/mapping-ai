/**
 * Phase 4: Manual/LLM-suggested affiliations for 42 people with no edges
 *
 * Usage:
 *   node scripts/phase4-manual-affiliations.js --dry-run    # Show what would happen
 *   node scripts/phase4-manual-affiliations.js --execute    # Actually do it
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

// Orgs to create (10 - Tarbell already exists)
const ORGS_TO_CREATE = [
  { name: 'University of Michigan', category: 'Academic', website: 'https://umich.edu' },
  { name: 'UCLA', category: 'Academic', website: 'https://ucla.edu' },
  { name: 'Johns Hopkins University', category: 'Academic', website: 'https://jhu.edu' },
  { name: 'University of Louisville', category: 'Academic', website: 'https://louisville.edu' },
  { name: 'American University', category: 'Academic', website: 'https://american.edu' },
  { name: 'SUNY Albany', category: 'Academic', website: 'https://albany.edu' },
  { name: 'USC', category: 'Academic', website: 'https://usc.edu' },
  { name: 'Wharton School', category: 'Academic', website: 'https://wharton.upenn.edu' },
  { name: 'Tulane University', category: 'Academic', website: 'https://tulane.edu' },
  {
    name: 'U.S. Department of Transportation',
    category: 'Government/Agency',
    website: 'https://transportation.gov',
  },
]

// Affiliations to create
// Format: { personId, personName, orgName, edgeType, isPrimary }
const AFFILIATIONS = [
  // ACADEMICS - Current positions (employed_by)
  {
    personId: 992,
    personName: 'Alison Gopnik',
    orgName: 'UC Berkeley',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 969,
    personName: 'Betsey Stevenson',
    orgName: 'University of Michigan',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 977,
    personName: 'Daniela Rus',
    orgName: 'MIT CSAIL',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 982,
    personName: 'Danielle Allen',
    orgName: 'Harvard University',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 327,
    personName: 'Dylan Hadfield-Menell',
    orgName: 'MIT CSAIL',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 831,
    personName: 'Emily Bender',
    orgName: 'University of Washington',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 887,
    personName: 'Ethan Mollick',
    orgName: 'Wharton School',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 984,
    personName: 'Eugene Volokh',
    orgName: 'UCLA',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 968,
    personName: 'Fiona Scott Morton',
    orgName: 'Yale University',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 985,
    personName: 'Henry Farrell',
    orgName: 'Johns Hopkins University',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 963,
    personName: 'Lawrence Katz',
    orgName: 'Harvard University',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 988,
    personName: 'Lily Tsai',
    orgName: 'MIT GOV/LAB',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 846,
    personName: 'Max Tegmark',
    orgName: 'Massachusetts Institute of Technology',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 846,
    personName: 'Max Tegmark',
    orgName: 'Future of Life Institute',
    edgeType: 'affiliated',
    isPrimary: false,
  },
  {
    personId: 983,
    personName: 'Nathaniel Persily',
    orgName: 'Stanford University',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 847,
    personName: 'Nick Bostrom',
    orgName: 'University of Oxford',
    edgeType: 'affiliated',
    isPrimary: true,
  }, // Former FHI
  {
    personId: 991,
    personName: 'Noam Chomsky',
    orgName: 'Massachusetts Institute of Technology',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 832,
    personName: 'Rediet Abebe',
    orgName: 'UC Berkeley',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 326,
    personName: 'Roman Yampolskiy',
    orgName: 'University of Louisville',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 925,
    personName: 'Ruha Benjamin',
    orgName: 'Princeton University',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 924,
    personName: 'Safiya Noble',
    orgName: 'UCLA',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 997,
    personName: 'Samantha Bradshaw',
    orgName: 'American University',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 978,
    personName: 'Shoshana Zuboff',
    orgName: 'Harvard University',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 973,
    personName: 'Susan Athey',
    orgName: 'Stanford University',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 927,
    personName: 'Virginia Eubanks',
    orgName: 'SUNY Albany',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 845,
    personName: 'Yolanda Gil',
    orgName: 'USC',
    edgeType: 'employed_by',
    isPrimary: true,
  },

  // RESEARCHERS
  {
    personId: 833,
    personName: 'Abeba Birhane',
    orgName: 'Mozilla Foundation',
    edgeType: 'employed_by',
    isPrimary: true,
  },
  {
    personId: 990,
    personName: 'Gary Marcus',
    orgName: 'New York University',
    edgeType: 'affiliated',
    isPrimary: true,
  }, // Emeritus
  {
    personId: 888,
    personName: 'Leopold Aschenbrenner',
    orgName: 'OpenAI',
    edgeType: 'affiliated',
    isPrimary: false,
  }, // Former

  // JOURNALISTS
  {
    personId: 893,
    personName: 'Craig Smith',
    orgName: 'New York Times',
    edgeType: 'affiliated',
    isPrimary: false,
  }, // Former
  {
    personId: 891,
    personName: 'Lex Fridman',
    orgName: 'Massachusetts Institute of Technology',
    edgeType: 'affiliated',
    isPrimary: true,
  },
  {
    personId: 23,
    personName: 'Michel Justen',
    orgName: 'Tarbell Center for AI Journalism',
    edgeType: 'employed_by',
    isPrimary: true,
  },

  // CULTURAL FIGURES
  {
    personId: 1014,
    personName: 'Walter Isaacson',
    orgName: 'Tulane University',
    edgeType: 'employed_by',
    isPrimary: true,
  },

  // EXECUTIVES
  {
    personId: 998,
    personName: 'Alvin Graylin',
    orgName: 'Stanford HAI',
    edgeType: 'affiliated',
    isPrimary: true,
  },

  // POLICYMAKERS
  {
    personId: 40,
    personName: 'Pete Buttigieg',
    orgName: 'U.S. Department of Transportation',
    edgeType: 'affiliated',
    isPrimary: true,
  }, // Former
  {
    personId: 714,
    personName: 'Valerie Foushee',
    orgName: 'U.S. House of Representatives',
    edgeType: 'employed_by',
    isPrimary: true,
  },
]

async function main() {
  console.log('Phase 4: Manual/LLM-Suggested Affiliations')
  console.log('==========================================')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}\n`)

  const client = await pool.connect()

  try {
    // Get existing orgs
    const existingOrgs = await client.query(`
      SELECT id, name FROM entity
      WHERE entity_type = 'organization' AND status = 'approved'
    `)
    const orgByName = new Map(existingOrgs.rows.map((o) => [o.name.toLowerCase(), o]))

    // Step 1: Create missing orgs
    console.log('STEP 1: CREATE MISSING ORGS')
    console.log('---------------------------')
    let orgsCreated = 0

    for (const org of ORGS_TO_CREATE) {
      if (orgByName.has(org.name.toLowerCase())) {
        console.log(`  ✓ ${org.name} (already exists)`)
        continue
      }

      console.log(`  + ${org.name} [${org.category}]`)

      if (!dryRun) {
        const result = await client.query(
          `
          INSERT INTO entity (entity_type, name, category, website, status)
          VALUES ('organization', $1, $2, $3, 'approved')
          RETURNING id
        `,
          [org.name, org.category, org.website],
        )

        orgByName.set(org.name.toLowerCase(), { id: result.rows[0].id, name: org.name })
        orgsCreated++
      }
    }

    console.log(
      `\n${dryRun ? 'Would create' : 'Created'}: ${dryRun ? ORGS_TO_CREATE.filter((o) => !orgByName.has(o.name.toLowerCase())).length : orgsCreated} orgs\n`,
    )

    // Step 2: Create edges
    console.log('STEP 2: CREATE EDGES')
    console.log('--------------------')
    let edgesCreated = 0
    let edgesSkipped = 0

    for (const aff of AFFILIATIONS) {
      const org = orgByName.get(aff.orgName.toLowerCase())

      if (!org) {
        console.log(`  ⚠ ${aff.personName} → ${aff.orgName} (org not found)`)
        edgesSkipped++
        continue
      }

      console.log(`  + [${aff.personId}] ${aff.personName} → ${aff.orgName} (${aff.edgeType})`)

      if (!dryRun) {
        try {
          await client.query(
            `
            INSERT INTO edge (source_id, target_id, edge_type, is_primary, created_by)
            VALUES ($1, $2, $3, $4, 'phase4-manual')
            ON CONFLICT (source_id, target_id, edge_type) DO NOTHING
          `,
            [aff.personId, org.id, aff.edgeType, aff.isPrimary],
          )
          edgesCreated++
        } catch (err) {
          console.log(`    ✗ Error: ${err.message}`)
          edgesSkipped++
        }
      }
    }

    console.log(
      `\n${dryRun ? 'Would create' : 'Created'}: ${dryRun ? AFFILIATIONS.length : edgesCreated} edges`,
    )
    if (edgesSkipped > 0) console.log(`Skipped: ${edgesSkipped}`)

    // Summary
    const finalCounts = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM entity WHERE entity_type = 'organization' AND status = 'approved') as orgs,
        (SELECT COUNT(*)::int FROM edge) as edges
    `)

    console.log('\n==========================================')
    console.log('SUMMARY')
    console.log('==========================================')
    console.log(`Total orgs: ${finalCounts.rows[0].orgs}`)
    console.log(`Total edges: ${finalCounts.rows[0].edges}`)

    // Check remaining people with no edges
    const noEdges = await client.query(`
      SELECT COUNT(*)::int as cnt
      FROM entity p
      LEFT JOIN edge e ON e.source_id = p.id
      WHERE p.entity_type = 'person' AND p.status = 'approved'
      GROUP BY p.id
      HAVING COUNT(e.id) = 0
    `)
    console.log(`People with no edges: ${noEdges.rows.length}`)

    if (dryRun) {
      console.log('\nTo execute, run:')
      console.log('  node scripts/phase4-manual-affiliations.js --execute')
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
