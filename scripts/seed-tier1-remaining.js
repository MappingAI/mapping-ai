#!/usr/bin/env node
/**
 * Seed script for remaining Tier 1 categories from DATA-PLAN.md:
 * - Ethics/Bias/Rights (orgs + people)
 * - Government/Agency (orgs + people as Policymaker)
 * - Cultural Figures (people)
 *
 * Usage:
 *   node scripts/seed-tier1-remaining.js              # Dry run
 *   node scripts/seed-tier1-remaining.js --execute    # Actually insert
 */

import pg from 'pg';
import dotenv from 'dotenv';
const { Client } = pg;
dotenv.config();

// ============================================================================
// DATA TO SEED
// ============================================================================

const ETHICS_RIGHTS_PEOPLE = [
  // Tier 1: Flagship Civil Rights / Digital Rights
  { name: 'Joy Buolamwini', category: 'Researcher', title: 'Founder, Algorithmic Justice League; MIT Media Lab Researcher; Creator, Gender Shades Study', primary_org: 'Algorithmic Justice League' },
  { name: 'Cindy Cohn', category: 'Organizer', title: 'Executive Director, Electronic Frontier Foundation', primary_org: 'Electronic Frontier Foundation' },
  { name: 'Corynne McSherry', category: 'Organizer', title: 'Legal Director, Electronic Frontier Foundation', primary_org: 'Electronic Frontier Foundation' },
  { name: 'Ben Wizner', category: 'Organizer', title: 'Director, ACLU Speech, Privacy & Technology Project; Attorney for Edward Snowden', primary_org: 'ACLU' },
  { name: 'Janet Haven', category: 'Organizer', title: 'Executive Director, Data & Society Research Institute', primary_org: 'Data & Society' },
  { name: 'danah boyd', category: 'Academic', title: 'Founder, Data & Society; Partner Researcher, Microsoft Research; Georgetown Professor', primary_org: 'Data & Society' },
  { name: 'Alexandra Reeve Givens', category: 'Organizer', title: 'President & CEO, Center for Democracy & Technology', primary_org: 'Center for Democracy & Technology' },
  { name: 'Sarah Myers West', category: 'Researcher', title: 'Managing Director, AI Now Institute; Former AI Policy Analyst', primary_org: 'AI Now Institute' },
  { name: 'Safiya Noble', category: 'Academic', title: 'Professor, UCLA; Author, Algorithms of Oppression', primary_org: 'UCLA' },
  { name: 'Ruha Benjamin', category: 'Academic', title: 'Professor of African American Studies, Princeton; Author, Race After Technology', primary_org: 'Princeton University' },
  { name: 'Cathy O\'Neil', category: 'Researcher', title: 'Founder, ORCAA; Author, Weapons of Math Destruction', primary_org: 'ORCAA' },
  { name: 'Virginia Eubanks', category: 'Academic', title: 'Professor of Political Science, University at Albany; Author, Automating Inequality', primary_org: 'University at Albany' },
];

const GOVERNMENT_AGENCY_PEOPLE = [
  // Federal Executive Branch - as Policymaker
  { name: 'Lina Khan', category: 'Policymaker', title: 'Chair, Federal Trade Commission (FTC)', primary_org: 'Federal Trade Commission' },
  { name: 'Arati Prabhakar', category: 'Policymaker', title: 'Director, White House Office of Science and Technology Policy (OSTP)', primary_org: 'White House OSTP' },
  { name: 'Alan Davidson', category: 'Policymaker', title: 'Assistant Secretary for Communications and Information, NTIA; Former Google Policy Director', primary_org: 'NTIA' },
  { name: 'Laurie Locascio', category: 'Policymaker', title: 'Director, National Institute of Standards and Technology (NIST); Under Secretary of Commerce', primary_org: 'NIST' },
  { name: 'Elham Tabassi', category: 'Policymaker', title: 'Chief of Staff, Information Technology Laboratory, NIST; AI Risk Management Framework Lead', primary_org: 'NIST' },
  { name: 'Jonathan Kanter', category: 'Policymaker', title: 'Assistant Attorney General, Antitrust Division, DOJ', primary_org: 'Department of Justice' },
  { name: 'Jen Easterly', category: 'Policymaker', title: 'Director, Cybersecurity and Infrastructure Security Agency (CISA)', primary_org: 'CISA' },
  { name: 'Stefano Mazzocchi', category: 'Policymaker', title: 'Chief AI Officer, Department of Commerce', primary_org: 'Department of Commerce' },

  // International
  { name: 'Margrethe Vestager', category: 'Policymaker', title: 'Executive Vice President, European Commission; EU Competition & Digital Policy Chief', primary_org: 'European Commission' },
  { name: 'Thierry Breton', category: 'Policymaker', title: 'Former European Commissioner for Internal Market; EU AI Act Architect', primary_org: 'European Commission' },
  { name: 'Yoshua Bengio', category: 'Academic', title: 'Scientific Director, Mila; Advisor, UK AI Safety Institute', primary_org: 'Mila' }, // Note: already in DB, will skip
];

const CULTURAL_FIGURES = [
  // Tier 1: Authors & Public Intellectuals
  { name: 'Ted Chiang', category: 'Cultural figure', title: 'Science Fiction Author; Stories include "Story of Your Life" (Arrival), "Exhalation"', primary_org: null },
  { name: 'Yuval Noah Harari', category: 'Cultural figure', title: 'Historian & Author; Sapiens, Homo Deus, 21 Lessons for the 21st Century', primary_org: 'Hebrew University of Jerusalem' },
  { name: 'Kate Crawford', category: 'Academic', title: 'Research Professor, USC Annenberg; Senior Principal Researcher, Microsoft Research; Author, Atlas of AI', primary_org: 'Microsoft Research' },
  { name: 'Cory Doctorow', category: 'Cultural figure', title: 'Science Fiction Author & Activist; Coiner of "Enshittification"; Co-editor, Boing Boing', primary_org: 'Electronic Frontier Foundation' },
  { name: 'Naomi Klein', category: 'Cultural figure', title: 'Author & Activist; The Shock Doctrine, No Logo, Doppelganger', primary_org: null },
  { name: 'Brian Christian', category: 'Cultural figure', title: 'Author, The Alignment Problem, The Most Human Human', primary_org: null },

  // Tier 2: Filmmakers
  { name: 'Shalini Kantayya', category: 'Cultural figure', title: 'Documentary Filmmaker; Director, Coded Bias (Netflix)', primary_org: null },
];

const ORGANIZATIONS = [
  // Ethics/Rights orgs
  { name: 'Algorithmic Justice League', category: 'Ethics/Bias/Rights', website: 'https://ajl.org', notes: 'Founded by Joy Buolamwini to fight algorithmic bias' },
  { name: 'Electronic Frontier Foundation', category: 'Ethics/Bias/Rights', website: 'https://eff.org', notes: 'Digital rights nonprofit founded 1990' },
  { name: 'ACLU', category: 'Ethics/Bias/Rights', website: 'https://aclu.org', notes: 'American Civil Liberties Union - Speech, Privacy & Technology Project' },
  { name: 'Data & Society', category: 'Ethics/Bias/Rights', website: 'https://datasociety.net', notes: 'Research institute studying social implications of data and automation' },
  { name: 'Center for Democracy & Technology', category: 'Ethics/Bias/Rights', website: 'https://cdt.org', notes: 'Digital rights nonprofit focused on tech policy' },
  { name: 'AI Now Institute', category: 'Ethics/Bias/Rights', website: 'https://ainowinstitute.org', notes: 'Research institute studying social implications of AI' },
  { name: 'ORCAA', category: 'Ethics/Bias/Rights', website: 'https://orcaarisk.com', notes: 'O\'Neil Risk Consulting & Algorithmic Auditing, founded by Cathy O\'Neil' },

  // Government agencies
  { name: 'Federal Trade Commission', category: 'Government/Agency', website: 'https://ftc.gov', notes: 'FTC - AI enforcement and consumer protection' },
  { name: 'White House OSTP', category: 'Government/Agency', website: 'https://whitehouse.gov/ostp', notes: 'Office of Science and Technology Policy' },
  { name: 'NTIA', category: 'Government/Agency', website: 'https://ntia.gov', notes: 'National Telecommunications and Information Administration' },
  { name: 'NIST', category: 'Government/Agency', website: 'https://nist.gov', notes: 'National Institute of Standards and Technology - AI Risk Management Framework' },
  { name: 'Department of Justice', category: 'Government/Agency', website: 'https://justice.gov', notes: 'DOJ Antitrust Division - AI competition enforcement' },
  { name: 'CISA', category: 'Government/Agency', website: 'https://cisa.gov', notes: 'Cybersecurity and Infrastructure Security Agency' },
  { name: 'Department of Commerce', category: 'Government/Agency', website: 'https://commerce.gov', notes: 'Includes BIS export controls on AI chips' },
  { name: 'European Commission', category: 'Government/Agency', website: 'https://ec.europa.eu', notes: 'EU executive body - AI Act implementation' },
];

// ============================================================================
// SEED LOGIC
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log(execute ? '🚀 EXECUTING INSERTS' : '🔍 DRY RUN (use --execute to insert)');
  console.log('');

  // Get existing names for duplicate detection
  const existingPeople = await client.query(
    "SELECT LOWER(name) as name FROM entity WHERE entity_type = 'person'"
  );
  const existingOrgs = await client.query(
    "SELECT LOWER(name) as name FROM entity WHERE entity_type = 'organization'"
  );
  const existingPeopleSet = new Set(existingPeople.rows.map(r => r.name));
  const existingOrgsSet = new Set(existingOrgs.rows.map(r => r.name));

  // Combine all people
  const allPeople = [...ETHICS_RIGHTS_PEOPLE, ...GOVERNMENT_AGENCY_PEOPLE, ...CULTURAL_FIGURES];

  let insertedPeople = 0;
  let insertedOrgs = 0;
  let skippedPeople = 0;
  let skippedOrgs = 0;
  const insertedPeopleIds = [];

  // Insert organizations first
  console.log('=== ORGANIZATIONS ===');
  for (const org of ORGANIZATIONS) {
    if (existingOrgsSet.has(org.name.toLowerCase())) {
      console.log(`  SKIP (exists): ${org.name}`);
      skippedOrgs++;
      continue;
    }

    console.log(`  ADD: ${org.name} [${org.category}]`);

    if (execute) {
      await client.query(`
        INSERT INTO entity (entity_type, name, category, website, notes, status, created_at)
        VALUES ('organization', $1, $2, $3, $4, 'approved', NOW())
        RETURNING id
      `, [org.name, org.category, org.website || null, org.notes || null]);
      insertedOrgs++;
      existingOrgsSet.add(org.name.toLowerCase());
    }
  }

  // Get org IDs for person->org links
  const orgIds = {};
  const orgResult = await client.query(
    "SELECT id, LOWER(name) as name FROM entity WHERE entity_type = 'organization'"
  );
  for (const row of orgResult.rows) {
    orgIds[row.name] = row.id;
  }

  // Insert people
  console.log('\n=== PEOPLE ===');
  for (const person of allPeople) {
    if (existingPeopleSet.has(person.name.toLowerCase())) {
      console.log(`  SKIP (exists): ${person.name}`);
      skippedPeople++;
      continue;
    }

    console.log(`  ADD: ${person.name} [${person.category}] - ${person.title?.substring(0, 50)}...`);

    if (execute) {
      const result = await client.query(`
        INSERT INTO entity (entity_type, name, category, title, status, created_at)
        VALUES ('person', $1, $2, $3, 'approved', NOW())
        RETURNING id
      `, [person.name, person.category, person.title]);

      const personId = result.rows[0].id;
      insertedPeople++;
      insertedPeopleIds.push(personId);
      existingPeopleSet.add(person.name.toLowerCase());

      // Create edge to primary org if exists
      if (person.primary_org) {
        const orgKey = person.primary_org.toLowerCase();
        const orgId = orgIds[orgKey];
        if (orgId) {
          await client.query(`
            INSERT INTO edge (source_id, target_id, edge_type, is_primary, created_at)
            VALUES ($1, $2, 'person_organization', true, NOW())
          `, [personId, orgId]);
          console.log(`    -> Linked to ${person.primary_org}`);
        }
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`People: ${insertedPeople} added, ${skippedPeople} skipped`);
  console.log(`Organizations: ${insertedOrgs} added, ${skippedOrgs} skipped`);

  if (execute && insertedPeopleIds.length > 0) {
    console.log('\nTo enrich these people, run:');
    console.log('node scripts/enrich-people.js --ids=' + insertedPeopleIds.join(','));
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
