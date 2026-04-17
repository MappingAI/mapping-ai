#!/usr/bin/env node
/**
 * Seed script for expanded academics/researchers list
 * Based on consolidated list from user - political economy, technical AI,
 * critical theory, law & governance, political science, AI safety, discourse
 *
 * Usage:
 *   node scripts/seed-academics-expanded.js              # Dry run
 *   node scripts/seed-academics-expanded.js --execute    # Actually insert
 */

import pg from 'pg'
import dotenv from 'dotenv'
const { Client } = pg
dotenv.config()

// ============================================================================
// DATA TO SEED
// ============================================================================

const PEOPLE = [
  // Political Economy & Labor
  {
    name: 'David Autor',
    category: 'Academic',
    title:
      'Ford Professor of Economics, MIT; Co-Director, MIT Shaping the Future of Work Initiative',
    primary_org: 'MIT',
  },
  {
    name: 'Lawrence Katz',
    category: 'Academic',
    title: 'Elisabeth Allison Professor of Economics, Harvard University',
    primary_org: 'Harvard University',
  },
  {
    name: 'Joseph Stiglitz',
    category: 'Academic',
    title:
      'University Professor, Columbia University; Nobel Prize Economics 2001; Chief Economist, Roosevelt Institute',
    primary_org: 'Columbia University',
  },
  {
    name: 'Ajay Agrawal',
    category: 'Academic',
    title:
      'Professor of Strategic Management, Rotman School; Founder, Creative Destruction Lab; Co-author, Prediction Machines',
    primary_org: 'University of Toronto',
  },
  {
    name: 'Joshua Gans',
    category: 'Academic',
    title:
      'Professor of Strategic Management, Rotman School; Co-author, Prediction Machines and Power and Prediction',
    primary_org: 'University of Toronto',
  },
  {
    name: 'Daniel Susskind',
    category: 'Academic',
    title: "Research Professor, King's College London; Author, A World Without Work",
    primary_org: "King's College London",
  },
  {
    name: 'Fiona Scott Morton',
    category: 'Academic',
    title:
      'Theodore Nierenberg Professor of Economics, Yale School of Management; Former DOJ Chief Economist',
    primary_org: 'Yale University',
  },
  {
    name: 'Betsey Stevenson',
    category: 'Academic',
    title:
      'Professor of Public Policy and Economics, University of Michigan; Former Member, Council of Economic Advisers',
    primary_org: 'University of Michigan',
  },
  {
    name: 'Ioana Marinescu',
    category: 'Academic',
    title:
      'Associate Professor of Economics, University of Pennsylvania; Congressional testimony on AI and labor',
    primary_org: 'University of Pennsylvania',
  },
  {
    name: 'Ramin Toloui',
    category: 'Academic',
    title:
      'Lee Shau Kee Director, Stanford Institute for Economic Policy Research (SIEPR); Former Asst Secretary of State',
    primary_org: 'Stanford University',
  },
  {
    name: 'Neil Thompson',
    category: 'Academic',
    title: 'Director, MIT FutureTech Research Project; Research Scientist, MIT CSAIL',
    primary_org: 'MIT',
  },
  {
    name: 'Susan Athey',
    category: 'Academic',
    title:
      'Economics of Technology Professor, Stanford GSB; John Bates Clark Medal; Former Microsoft Chief Economist',
    primary_org: 'Stanford University',
  },
  {
    name: 'Jason Furman',
    category: 'Academic',
    title:
      'Aetna Professor of Practice, Harvard Kennedy School; Former Chair, Council of Economic Advisers',
    primary_org: 'Harvard University',
  },
  {
    name: 'Avi Goldfarb',
    category: 'Academic',
    title:
      'Rotman Chair in AI and Healthcare, University of Toronto; Co-author, Prediction Machines',
    primary_org: 'University of Toronto',
  },

  // Technical AI Research
  {
    name: 'Andrew Ng',
    category: 'Academic',
    title:
      'Founder, DeepLearning.AI; Adjunct Professor, Stanford; Co-founder, Coursera; Former Chief Scientist, Baidu',
    primary_org: 'Stanford University',
  },
  {
    name: 'Daniela Rus',
    category: 'Academic',
    title: 'Director, MIT CSAIL; Deputy Dean of Research, MIT Schwarzman College; MacArthur Fellow',
    primary_org: 'MIT',
  },

  // Critical Theory / STS / Power
  {
    name: 'Shoshana Zuboff',
    category: 'Academic',
    title: 'Professor Emerita, Harvard Business School; Author, The Age of Surveillance Capitalism',
    primary_org: 'Harvard University',
  },

  // Law & Governance
  {
    name: 'Frank Pasquale',
    category: 'Academic',
    title: 'Professor of Law, Cornell Tech; Author, The Black Box Society and New Laws of Robotics',
    primary_org: 'Cornell University',
  },
  {
    name: 'Ryan Calo',
    category: 'Academic',
    title:
      'Lane Powell and D. Wayne Gittinger Professor, University of Washington School of Law; Co-Director, Tech Policy Lab',
    primary_org: 'University of Washington',
  },
  {
    name: 'Woodrow Hartzog',
    category: 'Academic',
    title: "Professor of Law, Boston University; Author, Privacy's Blueprint",
    primary_org: 'Boston University',
  },
  {
    name: 'Danielle Allen',
    category: 'Academic',
    title:
      'James Bryant Conant University Professor, Harvard; Director, Allen Lab for Democracy Renovation',
    primary_org: 'Harvard University',
  },
  {
    name: 'Nathaniel Persily',
    category: 'Academic',
    title:
      'James B. McClatchy Professor of Law, Stanford; Co-Director, Stanford Cyber Policy Center',
    primary_org: 'Stanford University',
  },
  {
    name: 'Eugene Volokh',
    category: 'Academic',
    title: 'Gary T. Schwartz Professor of Law, UCLA; Senior Fellow, Hoover Institution',
    primary_org: 'UCLA',
  },

  // Political Science / Democracy / Governance
  {
    name: 'Henry Farrell',
    category: 'Academic',
    title: 'SNF Agora Professor, Johns Hopkins SAIS; AI and democracy scholarship',
    primary_org: 'Johns Hopkins University',
  },
  {
    name: 'Hélène Landemore',
    category: 'Academic',
    title: 'Professor of Political Science, Yale University; Author, Open Democracy',
    primary_org: 'Yale University',
  },
  {
    name: 'Zeynep Tufekci',
    category: 'Journalist',
    title:
      'Professor, Columbia University; New York Times Opinion Columnist; Author, Twitter and Tear Gas',
    primary_org: 'Columbia University',
  },
  {
    name: 'Lily Tsai',
    category: 'Academic',
    title: 'Ford Professor of Political Science, MIT; Founder, MIT Governance Lab (GOV/LAB)',
    primary_org: 'MIT',
  },
  {
    name: 'E. Glen Weyl',
    category: 'Researcher',
    title:
      'Founder, Plurality Institute; Research Lead, Microsoft Research EPIC; Co-author, Radical Markets',
    primary_org: 'Microsoft Research',
  },

  // Discourse / Public Intellectual
  {
    name: 'Gary Marcus',
    category: 'Researcher',
    title: 'Professor Emeritus, NYU; Author, Rebooting AI; AI Safety Commentator',
    primary_org: null,
  },
  {
    name: 'Noam Chomsky',
    category: 'Academic',
    title: 'Institute Professor Emeritus, MIT; Linguist and Public Intellectual',
    primary_org: 'MIT',
  },
  {
    name: 'Alison Gopnik',
    category: 'Academic',
    title:
      'Professor of Psychology and Philosophy, UC Berkeley; Developmental Psychology Critique of LLMs',
    primary_org: 'UC Berkeley',
  },
  {
    name: 'Divya Siddarth',
    category: 'Researcher',
    title: 'Co-Founder, Collective Intelligence Project; Research Lead, Microsoft Research',
    primary_org: 'Collective Intelligence Project',
  },
  {
    name: 'Audrey Tang',
    category: 'Policymaker',
    title:
      "Former Digital Minister of Taiwan (2016-2024); World's First Digital Minister; Plurality Advocate",
    primary_org: 'Taiwan Ministry of Digital Affairs',
  },
  {
    name: 'Saffron Huang',
    category: 'Researcher',
    title: 'Co-Founder, Collective Intelligence Project; Former DeepMind; Democratic AI Research',
    primary_org: 'Collective Intelligence Project',
  },

  // Geopolitics / International
  {
    name: 'Marietje Schaake',
    category: 'Policymaker',
    title: 'International Policy Director, Stanford HAI; Former Member, European Parliament',
    primary_org: 'Stanford HAI',
  },
  {
    name: 'Samantha Bradshaw',
    category: 'Academic',
    title: 'Assistant Professor, American University; Disinformation and AI Governance Research',
    primary_org: 'American University',
  },
  {
    name: 'Alvin Graylin',
    category: 'Executive',
    title: 'President, HTC China; Advisor, Stanford HAI; US-China AI Policy Expert',
    primary_org: 'HTC',
  },
]

const ORGANIZATIONS = [
  // Stanford
  {
    name: 'Stanford Digital Economy Lab',
    category: 'Academic',
    website: 'https://digitaleconomy.stanford.edu',
    notes: 'Brynjolfsson, Pentland, Toloui; economics of AI research',
  },
  {
    name: 'Stanford SIEPR',
    category: 'Academic',
    website: 'https://siepr.stanford.edu',
    notes: 'Stanford Institute for Economic Policy Research',
  },

  // MIT
  {
    name: 'MIT Shaping the Future of Work',
    category: 'Academic',
    website: 'https://shapingwork.mit.edu',
    notes: 'Acemoglu, Autor, Johnson; labor economics and AI',
  },
  {
    name: 'MIT CSAIL',
    category: 'Academic',
    website: 'https://csail.mit.edu',
    notes: 'Computer Science and Artificial Intelligence Laboratory; Daniela Rus director',
  },
  {
    name: 'MIT GOV/LAB',
    category: 'Academic',
    website: 'https://mitgovlab.org',
    notes: 'MIT Governance Lab; Lily Tsai founder',
  },
  {
    name: 'MIT Media Lab',
    category: 'Academic',
    website: 'https://media.mit.edu',
    notes: 'Interdisciplinary research lab',
  },

  // Other Academic
  {
    name: 'Princeton CITP',
    category: 'Academic',
    website: 'https://citp.princeton.edu',
    notes: 'Center for Information Technology Policy; Narayanan AI Snake Oil',
  },
  {
    name: 'Harvard Ash Center',
    category: 'Academic',
    website: 'https://ash.harvard.edu',
    notes: 'Ash Center for Democratic Governance; Danielle Allen',
  },
  {
    name: 'Harvard Berkman Klein Center',
    category: 'Academic',
    website: 'https://cyber.harvard.edu',
    notes: 'Berkman Klein Center for Internet & Society',
  },
  {
    name: 'UW Tech Policy Lab',
    category: 'Academic',
    website: 'https://techpolicylab.uw.edu',
    notes: 'University of Washington; Ryan Calo co-director',
  },
  {
    name: 'Creative Destruction Lab',
    category: 'Academic',
    website: 'https://creativedestructionlab.com',
    notes: 'Toronto; Agrawal, Gans; AI startup program',
  },
  {
    name: 'EconTAI',
    category: 'Academic',
    website: null,
    notes: 'UVA Economics of Transformative AI; Anton Korinek',
  },

  // Think Tanks / Research
  {
    name: 'Roosevelt Institute',
    category: 'Think Tank/Policy Org',
    website: 'https://rooseveltinstitute.org',
    notes: 'Progressive economic policy; Stiglitz Chief Economist',
  },
  {
    name: 'Windfall Trust',
    category: 'Think Tank/Policy Org',
    website: null,
    notes: 'Transformative AI economic disruption research',
  },
  {
    name: 'Collective Intelligence Project',
    category: 'Think Tank/Policy Org',
    website: 'https://cip.org',
    notes: 'Siddarth, Huang; democratic AI governance',
  },
  {
    name: 'Plurality Institute',
    category: 'Think Tank/Policy Org',
    website: 'https://plurality.institute',
    notes: 'Glen Weyl; plural technology and governance',
  },
  {
    name: 'RadicalxChange',
    category: 'Think Tank/Policy Org',
    website: 'https://radicalxchange.org',
    notes: 'Glen Weyl; democratic innovation',
  },

  // Government
  {
    name: 'Taiwan Ministry of Digital Affairs',
    category: 'Government/Agency',
    website: 'https://moda.gov.tw',
    notes: 'Audrey Tang former minister',
  },
]

// ============================================================================
// SEED LOGIC
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const execute = args.includes('--execute')

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  console.log(execute ? '🚀 EXECUTING INSERTS' : '🔍 DRY RUN (use --execute to insert)')
  console.log('')

  // Get existing names for duplicate detection
  const existingPeople = await client.query(
    "SELECT LOWER(name) as name FROM entity WHERE entity_type = 'person'",
  )
  const existingOrgs = await client.query(
    "SELECT LOWER(name) as name FROM entity WHERE entity_type = 'organization'",
  )
  const existingPeopleSet = new Set(existingPeople.rows.map((r) => r.name))
  const existingOrgsSet = new Set(existingOrgs.rows.map((r) => r.name))

  let insertedPeople = 0
  let insertedOrgs = 0
  let skippedPeople = 0
  let skippedOrgs = 0
  const insertedPeopleIds = []

  // Insert organizations first
  console.log('=== ORGANIZATIONS ===')
  for (const org of ORGANIZATIONS) {
    if (existingOrgsSet.has(org.name.toLowerCase())) {
      console.log(`  SKIP (exists): ${org.name}`)
      skippedOrgs++
      continue
    }

    console.log(`  ADD: ${org.name} [${org.category}]`)

    if (execute) {
      await client.query(
        `
        INSERT INTO entity (entity_type, name, category, website, notes, status, created_at)
        VALUES ('organization', $1, $2, $3, $4, 'approved', NOW())
        RETURNING id
      `,
        [org.name, org.category, org.website || null, org.notes || null],
      )
      insertedOrgs++
      existingOrgsSet.add(org.name.toLowerCase())
    }
  }

  // Get org IDs for person->org links
  const orgIds = {}
  const orgResult = await client.query(
    "SELECT id, LOWER(name) as name FROM entity WHERE entity_type = 'organization'",
  )
  for (const row of orgResult.rows) {
    orgIds[row.name] = row.id
  }

  // Insert people
  console.log('\n=== PEOPLE ===')
  for (const person of PEOPLE) {
    if (existingPeopleSet.has(person.name.toLowerCase())) {
      console.log(`  SKIP (exists): ${person.name}`)
      skippedPeople++
      continue
    }

    console.log(`  ADD: ${person.name} [${person.category}] - ${person.title?.substring(0, 50)}...`)

    if (execute) {
      const result = await client.query(
        `
        INSERT INTO entity (entity_type, name, category, title, status, created_at)
        VALUES ('person', $1, $2, $3, 'approved', NOW())
        RETURNING id
      `,
        [person.name, person.category, person.title],
      )

      const personId = result.rows[0].id
      insertedPeople++
      insertedPeopleIds.push(personId)
      existingPeopleSet.add(person.name.toLowerCase())

      // Create edge to primary org if exists
      if (person.primary_org) {
        const orgKey = person.primary_org.toLowerCase()
        const orgId = orgIds[orgKey]
        if (orgId) {
          await client.query(
            `
            INSERT INTO edge (source_id, target_id, edge_type, is_primary, created_at)
            VALUES ($1, $2, 'person_organization', true, NOW())
          `,
            [personId, orgId],
          )
          console.log(`    -> Linked to ${person.primary_org}`)
        }
      }
    }
  }

  console.log('\n=== SUMMARY ===')
  console.log(`People: ${insertedPeople} added, ${skippedPeople} skipped`)
  console.log(`Organizations: ${insertedOrgs} added, ${skippedOrgs} skipped`)

  if (execute && insertedPeopleIds.length > 0) {
    console.log('\nTo enrich these people, run:')
    console.log('node scripts/enrich-people.js --ids=' + insertedPeopleIds.join(','))
  }

  await client.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
