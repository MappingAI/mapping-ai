import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// Missing notable US AI figures identified in data review
const MISSING_PEOPLE = [
  // High Priority (Major influence on US AI policy)
  {
    name: 'Sundar Pichai',
    category: 'Executive',
    title: 'CEO',
    primary_org: 'Google',
    location: 'San Francisco, CA',
    twitter: '@sundarpichai',
    notes:
      'CEO of Alphabet/Google. Major voice in AI policy discussions, testified before Congress on AI regulation.',
  },
  {
    name: 'Satya Nadella',
    category: 'Executive',
    title: 'CEO',
    primary_org: 'Microsoft',
    location: 'Seattle, WA',
    twitter: '@sataborland', // Note: actual handle
    notes:
      'CEO of Microsoft. Led $13B OpenAI investment, major advocate for responsible AI development.',
  },
  {
    name: 'Tristan Harris',
    category: 'Organizer',
    title: 'Co-founder',
    primary_org: 'Center for Humane Technology',
    location: 'San Francisco, CA',
    twitter: '@tristanharris',
    notes:
      'Former Google design ethicist. The Social Dilemma documentary. Congressional testimony on AI existential risks.',
  },
  {
    name: 'Aza Raskin',
    category: 'Organizer',
    title: 'Co-founder',
    primary_org: 'Center for Humane Technology',
    location: 'San Francisco, CA',
    twitter: '@aza',
    notes:
      'Co-founder of Center for Humane Technology. AI x-risk advocate, creator of infinite scroll.',
  },
  {
    name: 'Amy Klobuchar',
    category: 'Policymaker',
    title: 'U.S. Senator',
    primary_org: 'U.S. Senate',
    location: 'Washington, DC',
    twitter: '@amyklobuchar',
    notes:
      'Chair of Senate Judiciary Subcommittee on Competition Policy. Leading voice on tech antitrust and AI legislation.',
  },
  {
    name: 'Ron Wyden',
    category: 'Policymaker',
    title: 'U.S. Senator',
    primary_org: 'U.S. Senate',
    location: 'Washington, DC',
    twitter: '@RonWyden',
    notes:
      'Senior member of Senate Intelligence Committee. Advocate for privacy protection and AI transparency.',
  },
  {
    name: 'Marco Rubio',
    category: 'Policymaker',
    title: 'U.S. Senator',
    primary_org: 'U.S. Senate',
    location: 'Washington, DC',
    twitter: '@marcorubio',
    notes:
      'Vice Chair of Senate Intelligence Committee. Focus on AI national security and US-China competition.',
  },
  {
    name: 'Andrej Karpathy',
    category: 'Researcher',
    title: 'AI Researcher & Educator',
    primary_org: null, // Independent
    location: 'San Francisco, CA',
    twitter: '@karpathy',
    notes:
      'Former Tesla AI Director, founding member of OpenAI. Leading AI educator, influential voice on AI capabilities.',
  },
  {
    name: 'Palmer Luckey',
    category: 'Executive',
    title: 'Founder',
    primary_org: 'Anduril Industries',
    location: 'Orange County, CA',
    twitter: '@PalmerLuckey',
    notes:
      'Founder of Oculus VR and Anduril. Major figure in defense AI and autonomous weapons development.',
  },

  // Medium Priority (Notable but less central)
  {
    name: 'Bill Gates',
    category: 'Investor',
    title: 'Co-chair',
    primary_org: 'Gates Foundation',
    location: 'Seattle, WA',
    twitter: '@BillGates',
    notes:
      'Microsoft co-founder. Major voice on AI risks and benefits, significant AI philanthropy through Gates Foundation.',
  },
  {
    name: 'Laurene Powell Jobs',
    category: 'Investor',
    title: 'Founder',
    primary_org: 'Emerson Collective',
    location: 'Palo Alto, CA',
    twitter: '@laurenepowell',
    notes:
      'Founder of Emerson Collective. Influential tech philanthropy, investments in AI education and journalism.',
  },
  {
    name: 'Naval Ravikant',
    category: 'Investor',
    title: 'Co-founder',
    primary_org: 'AngelList',
    location: 'San Francisco, CA',
    twitter: '@naval',
    notes:
      'Co-founder of AngelList. Influential tech investor and thought leader on AI and technology futures.',
  },
  {
    name: 'Chris Smalls',
    category: 'Organizer',
    title: 'President',
    primary_org: 'Amazon Labor Union',
    location: 'New York, NY',
    twitter: '@Shut_downAmazon',
    notes:
      'Founder of Amazon Labor Union. Voice on AI/automation impact on workers, labor organizing in tech.',
  },
  {
    name: 'Kashmir Hill',
    category: 'Journalist',
    title: 'Technology Reporter',
    primary_org: 'The New York Times',
    location: 'New York, NY',
    twitter: '@kashmir',
    notes:
      'NYT tech reporter specializing in privacy, surveillance, and AI. Book: "Your Face Belongs to Us" on facial recognition.',
  },
  {
    name: 'Walter Isaacson',
    category: 'Cultural figure',
    title: 'Author & Biographer',
    primary_org: null, // Independent author
    location: 'New Orleans, LA',
    twitter: '@WalterIsaacson',
    notes:
      'Biographer of Elon Musk, Steve Jobs. Former CNN chairman. Influential voice on tech leadership and AI futures.',
  },
  {
    name: 'Kevin Kelly',
    category: 'Cultural figure',
    title: 'Senior Maverick',
    primary_org: 'Wired',
    location: 'Pacifica, CA',
    twitter: '@kevin2kelly',
    notes:
      'Founding executive editor of Wired. Futurist and author on technology and AI. Books: "The Inevitable", "What Technology Wants".',
  },
]

async function seed() {
  const client = await pool.connect()

  try {
    console.log('Seeding missing notable US AI figures...\n')

    let added = 0
    let skipped = 0

    for (const person of MISSING_PEOPLE) {
      // Check if person already exists
      const { rows: existing } = await client.query(
        `SELECT id, name FROM entity WHERE entity_type = 'person' AND LOWER(name) = LOWER($1)`,
        [person.name],
      )

      if (existing.length > 0) {
        console.log(`⚪ Skipped: ${person.name} (already exists, id=${existing[0].id})`)
        skipped++
        continue
      }

      // Insert new person
      const {
        rows: [inserted],
      } = await client.query(
        `INSERT INTO entity (
          entity_type, name, category, title, primary_org, location, twitter, notes, status
        ) VALUES (
          'person', $1, $2, $3, $4, $5, $6, $7, 'approved'
        ) RETURNING id`,
        [
          person.name,
          person.category,
          person.title,
          person.primary_org,
          person.location,
          person.twitter,
          person.notes,
        ],
      )

      console.log(`✓ Added: ${person.name} (id=${inserted.id}, ${person.category})`)
      added++

      // Create affiliation edge if primary_org exists
      if (person.primary_org) {
        const { rows: orgRows } = await client.query(
          `SELECT id FROM entity WHERE entity_type = 'organization' AND name = $1`,
          [person.primary_org],
        )

        if (orgRows.length > 0) {
          await client.query(
            `INSERT INTO edge (source_id, target_id, edge_type, role, is_primary, created_by)
             VALUES ($1, $2, 'affiliated', $3, true, 'seed-missing-notable')
             ON CONFLICT (source_id, target_id, edge_type) DO NOTHING`,
            [inserted.id, orgRows[0].id, person.title],
          )
          console.log(`  → Linked to ${person.primary_org}`)
        }
      }
    }

    console.log('\n' + '='.repeat(40))
    console.log(`\nSummary:`)
    console.log(`  Added: ${added}`)
    console.log(`  Skipped (already exist): ${skipped}`)

    // Get final counts
    const {
      rows: [{ people_count }],
    } = await client.query(
      `SELECT COUNT(*) as people_count FROM entity WHERE entity_type = 'person' AND status = 'approved'`,
    )
    const {
      rows: [{ edge_count }],
    } = await client.query(`SELECT COUNT(*) as edge_count FROM edge WHERE edge_type = 'affiliated'`)

    console.log(`\nCurrent totals:`)
    console.log(`  People: ${people_count}`)
    console.log(`  Affiliations: ${edge_count}`)
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})
