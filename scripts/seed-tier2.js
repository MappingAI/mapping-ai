#!/usr/bin/env node
/**
 * Seed script for Tier 2 additions - US-focused
 * Priority: Policymakers, Executives, Labor/Advocacy, remaining gaps
 *
 * Usage:
 *   node scripts/seed-tier2.js              # Dry run
 *   node scripts/seed-tier2.js --execute    # Actually insert
 */

import pg from 'pg';
import dotenv from 'dotenv';
const { Client } = pg;
dotenv.config();

// ============================================================================
// TIER 2 DATA - US FOCUSED
// ============================================================================

const POLICYMAKERS = [
  // Congressional - Senate AI Working Group / Key AI legislators
  { name: 'Chuck Schumer', category: 'Policymaker', title: 'Senate Majority Leader; Convener, Senate AI Insight Forums', primary_org: 'U.S. Senate' },
  { name: 'Mike Rounds', category: 'Policymaker', title: 'U.S. Senator (R-SD); Senate AI Insight Forum Co-Lead', primary_org: 'U.S. Senate' },
  { name: 'Martin Heinrich', category: 'Policymaker', title: 'U.S. Senator (D-NM); Senate AI Insight Forum Co-Lead', primary_org: 'U.S. Senate' },
  { name: 'Todd Young', category: 'Policymaker', title: 'U.S. Senator (R-IN); Senate AI Insight Forum Co-Lead', primary_org: 'U.S. Senate' },
  { name: 'Maria Cantwell', category: 'Policymaker', title: 'Chair, Senate Commerce Committee; AI Legislation Lead', primary_org: 'U.S. Senate' },
  { name: 'Ted Cruz', category: 'Policymaker', title: 'Ranking Member, Senate Commerce Committee', primary_org: 'U.S. Senate' },
  { name: 'Richard Blumenthal', category: 'Policymaker', title: 'Chair, Senate Judiciary Subcommittee on Privacy & Technology; AI Hearings Lead', primary_org: 'U.S. Senate' },
  { name: 'Josh Hawley', category: 'Policymaker', title: 'U.S. Senator (R-MO); AI Legislation Sponsor', primary_org: 'U.S. Senate' },

  // House
  { name: 'Jay Obernolte', category: 'Policymaker', title: 'U.S. Representative (R-CA); Co-Chair, House AI Caucus; Only PhD in AI in Congress', primary_org: 'U.S. House' },
  { name: 'Don Beyer', category: 'Policymaker', title: 'U.S. Representative (D-VA); Co-Chair, House AI Caucus', primary_org: 'U.S. House' },
  { name: 'Ted Lieu', category: 'Policymaker', title: 'U.S. Representative (D-CA); House AI Task Force; Computer Science Background', primary_org: 'U.S. House' },
  { name: 'Anna Eshoo', category: 'Policymaker', title: 'U.S. Representative (D-CA); Silicon Valley Rep; Tech Legislation', primary_org: 'U.S. House' },
  { name: 'Ro Khanna', category: 'Policymaker', title: 'U.S. Representative (D-CA); Silicon Valley Rep; Tech Policy Voice', primary_org: 'U.S. House' },
  { name: 'Mike Gallagher', category: 'Policymaker', title: 'Former Chair, House Select Committee on China; AI & National Security', primary_org: 'U.S. House' },

  // State Level - California (most active on AI)
  { name: 'Scott Wiener', category: 'Policymaker', title: 'California State Senator; Author, SB 1047 (AI Safety Bill)', primary_org: 'California State Senate' },
  { name: 'Gavin Newsom', category: 'Policymaker', title: 'Governor of California; Executive Orders on AI', primary_org: 'State of California' },

  // Agency - Additional key figures
  { name: 'Bruce Reed', category: 'Policymaker', title: 'White House Deputy Chief of Staff; AI Policy Coordinator', primary_org: 'White House' },
];

const EXECUTIVES = [
  // Frontier Lab leaders not yet added
  { name: 'Sundar Pichai', category: 'Executive', title: 'CEO, Alphabet & Google', primary_org: 'Google' },
  { name: 'Satya Nadella', category: 'Executive', title: 'CEO, Microsoft', primary_org: 'Microsoft' },
  { name: 'Jensen Huang', category: 'Executive', title: 'CEO & Founder, NVIDIA', primary_org: 'NVIDIA' },
  { name: 'Mark Zuckerberg', category: 'Executive', title: 'CEO, Meta; Open Source AI Advocate', primary_org: 'Meta' },
  { name: 'Arvind Krishna', category: 'Executive', title: 'CEO, IBM', primary_org: 'IBM' },
  { name: 'Andy Jassy', category: 'Executive', title: 'CEO, Amazon', primary_org: 'Amazon' },
  { name: 'Lisa Su', category: 'Executive', title: 'CEO, AMD', primary_org: 'AMD' },

  // AI company leaders
  { name: 'Arthur Mensch', category: 'Executive', title: 'CEO & Co-founder, Mistral AI', primary_org: 'Mistral AI' },
  { name: 'Aravind Srinivas', category: 'Executive', title: 'CEO & Co-founder, Perplexity AI', primary_org: 'Perplexity AI' },
  { name: 'Noam Shazeer', category: 'Executive', title: 'CEO, Character.AI; Former Google Transformer Co-author', primary_org: 'Character.AI' },
  { name: 'Emad Mostaque', category: 'Executive', title: 'Former CEO, Stability AI; Open Source AI Advocate', primary_org: null },
  { name: 'Richard Socher', category: 'Executive', title: 'CEO, You.com; Former Salesforce Chief Scientist', primary_org: 'You.com' },
];

const ORGANIZERS_LABOR = [
  // Labor unions with AI focus
  { name: 'Sara Nelson', category: 'Organizer', title: 'International President, Association of Flight Attendants-CWA; Labor Leader', primary_org: 'AFA-CWA' },
  { name: 'Chris Smalls', category: 'Organizer', title: 'President, Amazon Labor Union; Warehouse Worker AI/Automation Advocacy', primary_org: 'Amazon Labor Union' },
  { name: 'Fran Drescher', category: 'Organizer', title: 'President, SAG-AFTRA; Led 2023 Strike on AI Likeness Rights', primary_org: 'SAG-AFTRA' },
  { name: 'Meredith Stiehm', category: 'Organizer', title: 'President, Writers Guild of America West; AI Contract Negotiations', primary_org: 'WGA West' },

  // Tech worker advocacy
  { name: 'Chelsey Glasson', category: 'Organizer', title: 'Founder, Tech Workers Coalition; Google Walkout Organizer', primary_org: 'Tech Workers Coalition' },
];

const INVESTORS_TIER2 = [
  // Policy-connected investors not yet added
  { name: 'Laurene Powell Jobs', category: 'Investor', title: 'Founder, Emerson Collective; Philanthropist; AI & Media Investments', primary_org: 'Emerson Collective' },
  { name: 'Chris Sacca', category: 'Investor', title: 'Founder, Lowercase Capital; Early Twitter/Uber Investor; Climate & AI', primary_org: 'Lowercase Capital' },
  { name: 'Naval Ravikant', category: 'Investor', title: 'Co-founder, AngelList; Philosopher-Investor; AI Commentary', primary_org: 'AngelList' },
  { name: 'Balaji Srinivasan', category: 'Investor', title: 'Former CTO, Coinbase; Former a16z GP; AI & Crypto Commentator', primary_org: null },

  // Defense/National Security AI investors
  { name: 'Palmer Luckey', category: 'Executive', title: 'Founder, Anduril Industries & Oculus; Defense AI', primary_org: 'Anduril' },
  { name: 'Trae Stephens', category: 'Investor', title: 'Co-founder, Anduril; Partner, Founders Fund; Former Palantir', primary_org: 'Founders Fund' },
];

const CULTURAL_TIER2 = [
  // Authors and public voices
  { name: 'Walter Isaacson', category: 'Cultural figure', title: 'Biographer; Author, Elon Musk; Former CNN CEO', primary_org: null },
  { name: 'Steven Levy', category: 'Journalist', title: 'Editor at Large, Wired; Author, Hackers; Tech Journalism Pioneer', primary_org: 'Wired' },
  { name: 'Kevin Kelly', category: 'Cultural figure', title: 'Founding Editor, Wired; Author, The Inevitable; Tech Futurist', primary_org: 'Wired' },
  { name: 'Tristan Harris', category: 'Organizer', title: 'Co-founder, Center for Humane Technology; The Social Dilemma', primary_org: 'Center for Humane Technology' },
  { name: 'Aza Raskin', category: 'Organizer', title: 'Co-founder, Center for Humane Technology; Earth Species Project', primary_org: 'Center for Humane Technology' },
];

const ORGANIZATIONS = [
  // Government
  { name: 'U.S. Senate', category: 'Government/Agency', website: 'https://senate.gov' },
  { name: 'U.S. House', category: 'Government/Agency', website: 'https://house.gov' },
  { name: 'California State Senate', category: 'Government/Agency', website: 'https://senate.ca.gov' },
  { name: 'State of California', category: 'Government/Agency', website: 'https://ca.gov' },

  // Companies
  { name: 'NVIDIA', category: 'Frontier Lab', website: 'https://nvidia.com', notes: 'GPU leader, AI infrastructure' },
  { name: 'AMD', category: 'Frontier Lab', website: 'https://amd.com', notes: 'GPU/chip competitor' },
  { name: 'Perplexity AI', category: 'Frontier Lab', website: 'https://perplexity.ai', notes: 'AI search startup' },
  { name: 'Character.AI', category: 'Frontier Lab', website: 'https://character.ai', notes: 'Conversational AI' },
  { name: 'You.com', category: 'Frontier Lab', website: 'https://you.com', notes: 'AI search' },
  { name: 'Anduril', category: 'Frontier Lab', website: 'https://anduril.com', notes: 'Defense AI, Palmer Luckey' },

  // Labor
  { name: 'AFA-CWA', category: 'Labor/Civil Society', website: 'https://afacwa.org', notes: 'Association of Flight Attendants' },
  { name: 'Amazon Labor Union', category: 'Labor/Civil Society', website: null, notes: 'Chris Smalls, warehouse workers' },
  { name: 'SAG-AFTRA', category: 'Labor/Civil Society', website: 'https://sagaftra.org', notes: 'Actors union, AI likeness rights' },
  { name: 'WGA West', category: 'Labor/Civil Society', website: 'https://wga.org', notes: 'Writers Guild, AI contract terms' },
  { name: 'Tech Workers Coalition', category: 'Labor/Civil Society', website: 'https://techworkerscoalition.org' },

  // Advocacy
  { name: 'Center for Humane Technology', category: 'Ethics/Bias/Rights', website: 'https://humanetech.com', notes: 'Tristan Harris, The Social Dilemma' },
  { name: 'Emerson Collective', category: 'VC/Capital/Philanthropy', website: 'https://emersoncollective.com', notes: 'Laurene Powell Jobs' },
  { name: 'Lowercase Capital', category: 'VC/Capital/Philanthropy', website: null, notes: 'Chris Sacca' },
  { name: 'AngelList', category: 'VC/Capital/Philanthropy', website: 'https://angellist.com', notes: 'Naval Ravikant' },
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
  const allPeople = [...POLICYMAKERS, ...EXECUTIVES, ...ORGANIZERS_LABOR, ...INVESTORS_TIER2, ...CULTURAL_TIER2];

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
