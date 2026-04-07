#!/usr/bin/env node
/**
 * Seed script for journalists and organizers from DATA-PLAN.md
 *
 * Usage:
 *   node scripts/seed-journalists-organizers.js              # Dry run
 *   node scripts/seed-journalists-organizers.js --execute    # Actually insert
 */

import pg from 'pg';
import dotenv from 'dotenv';
const { Client } = pg;
dotenv.config();

// ============================================================================
// DATA TO SEED
// ============================================================================

const JOURNALISTS = [
  // Tier 1: AI Beat Reporters (major outlets)
  { name: 'Cade Metz', category: 'Journalist', title: 'Technology Reporter, The New York Times; Author, Genius Makers', primary_org: 'The New York Times' },
  { name: 'Kevin Roose', category: 'Journalist', title: 'Technology Columnist, The New York Times; Co-host, Hard Fork Podcast', primary_org: 'The New York Times' },
  { name: 'Will Knight', category: 'Journalist', title: 'Senior Writer, Wired; AI & Robotics Coverage', primary_org: 'Wired' },
  { name: 'James Vincent', category: 'Journalist', title: 'Senior Reporter, The Verge; AI & Science Coverage', primary_org: 'The Verge' },
  { name: 'Melissa Heikkilä', category: 'Journalist', title: 'Senior Reporter, MIT Technology Review; AI Policy & EU Focus', primary_org: 'MIT Technology Review' },
  { name: 'Parmy Olson', category: 'Journalist', title: 'Columnist, Bloomberg Opinion; Author, Supremacy: AI, ChatGPT, and the Race That Will Change the World', primary_org: 'Bloomberg' },
  { name: 'Madhumita Murgia', category: 'Journalist', title: 'AI Editor, Financial Times; Author, Code Dependent', primary_org: 'Financial Times' },
  { name: 'Matt O\'Brien', category: 'Journalist', title: 'Technology Writer, Associated Press; AI Policy Coverage', primary_org: 'Associated Press' },
  { name: 'Nitasha Tiku', category: 'Journalist', title: 'Technology Reporter, The Washington Post; AI Labor & Ethics', primary_org: 'The Washington Post' },
  { name: 'Kara Swisher', category: 'Journalist', title: 'Host, On with Kara Swisher & Pivot Podcasts; Co-founder, Recode', primary_org: 'Vox Media' },

  // Tier 2: Substacks & Independent Voices
  { name: 'Ethan Mollick', category: 'Academic', title: 'Associate Professor, Wharton School; Author, One Useful Thing Newsletter & Co-Intelligence', primary_org: 'University of Pennsylvania' },
  { name: 'Leopold Aschenbrenner', category: 'Researcher', title: 'Founder, Situational Awareness; Former OpenAI Superalignment Researcher', primary_org: null },
  { name: 'Nathan Lambert', category: 'Researcher', title: 'Research Scientist; Author, Interconnects Newsletter; RLHF Expert', primary_org: null },
  { name: 'Zvi Mowshowitz', category: 'Researcher', title: 'AI Policy Analyst; Author, Don\'t Worry About the Vase', primary_org: null },

  // Tier 3: Podcasters
  { name: 'Lex Fridman', category: 'Journalist', title: 'Host, Lex Fridman Podcast; Research Scientist, MIT', primary_org: 'MIT' },
  { name: 'Dwarkesh Patel', category: 'Journalist', title: 'Host, Dwarkesh Podcast; AI Researcher Interviews', primary_org: null },
  { name: 'Craig Smith', category: 'Journalist', title: 'Host, Eye on AI Podcast', primary_org: null },
  { name: 'Nathaniel Whittemore', category: 'Journalist', title: 'Host, The AI Breakdown Podcast', primary_org: null },
];

const ORGANIZERS = [
  // AI-Specific Advocacy
  { name: 'Sneha Revanur', category: 'Organizer', title: 'Founder & President, Encode Justice; Gen Z AI Policy Advocate', primary_org: 'Encode Justice' },
  { name: 'Mary Wareham', category: 'Organizer', title: 'Advocacy Director, Arms Division, Human Rights Watch; Coordinator, Campaign to Stop Killer Robots', primary_org: 'Human Rights Watch' },
  { name: 'Rebecca Finlay', category: 'Organizer', title: 'CEO, Partnership on AI', primary_org: 'Partnership on AI' },
  { name: 'Mark Surman', category: 'Organizer', title: 'President & Executive Director, Mozilla Foundation', primary_org: 'Mozilla Foundation' },

  // Labor & Worker Advocacy
  { name: 'Veena Dubal', category: 'Academic', title: 'Professor of Law, UC Irvine; Gig Economy & Algorithmic Management Expert', primary_org: 'UC Irvine' },
  { name: 'Alex Hanna', category: 'Organizer', title: 'Director of Research, Distributed AI Research Institute (DAIR); Former Google AI Ethics', primary_org: 'DAIR' },
  { name: 'Liz Shuler', category: 'Organizer', title: 'President, AFL-CIO', primary_org: 'AFL-CIO' },

  // Tech Worker Organizing
  { name: 'Mira Murati', category: 'Executive', title: 'Former CTO, OpenAI; Founder, Thinking Machines Lab', primary_org: 'Thinking Machines Lab' },
];

const ORGANIZATIONS = [
  // Media outlets
  { name: 'The New York Times', category: 'Media/Journalism', website: 'https://nytimes.com' },
  { name: 'Wired', category: 'Media/Journalism', website: 'https://wired.com' },
  { name: 'MIT Technology Review', category: 'Media/Journalism', website: 'https://technologyreview.com' },
  { name: 'Bloomberg', category: 'Media/Journalism', website: 'https://bloomberg.com' },
  { name: 'Financial Times', category: 'Media/Journalism', website: 'https://ft.com' },
  { name: 'Associated Press', category: 'Media/Journalism', website: 'https://apnews.com' },
  { name: 'The Washington Post', category: 'Media/Journalism', website: 'https://washingtonpost.com' },
  { name: 'Vox Media', category: 'Media/Journalism', website: 'https://voxmedia.com' },

  // Advocacy orgs
  { name: 'Encode Justice', category: 'Labor/Civil Society', website: 'https://encodejustice.org' },
  { name: 'Human Rights Watch', category: 'Ethics/Bias/Rights', website: 'https://hrw.org' },
  { name: 'Campaign to Stop Killer Robots', category: 'Labor/Civil Society', website: 'https://stopkillerrobots.org' },
  { name: 'Partnership on AI', category: 'AI Safety/Alignment', website: 'https://partnershiponai.org' },
  { name: 'Mozilla Foundation', category: 'Ethics/Bias/Rights', website: 'https://foundation.mozilla.org' },
  { name: 'AFL-CIO', category: 'Labor/Civil Society', website: 'https://aflcio.org' },
  { name: 'DAIR', category: 'Ethics/Bias/Rights', website: 'https://dair-institute.org', notes: 'Distributed AI Research Institute, founded by Timnit Gebru' },
  { name: 'Thinking Machines Lab', category: 'Frontier Lab', website: null, notes: 'AI research company founded by Mira Murati' },
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
  const allPeople = [...JOURNALISTS, ...ORGANIZERS];

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
