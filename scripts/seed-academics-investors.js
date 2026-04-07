#!/usr/bin/env node
/**
 * Seed script for academics, researchers, and investors from DATA-PLAN.md
 *
 * Usage:
 *   node scripts/seed-academics-investors.js              # Dry run
 *   node scripts/seed-academics-investors.js --execute    # Actually insert
 *   node scripts/seed-academics-investors.js --enrich     # Insert + run enrichment
 */

import pg from 'pg';
import dotenv from 'dotenv';
const { Client } = pg;
dotenv.config();

// ============================================================================
// DATA TO SEED
// ============================================================================

const ACADEMICS_RESEARCHERS = [
  // Tier 1: AI Safety/Alignment Research Leaders
  { name: 'Geoffrey Hinton', category: 'Academic', title: 'Professor Emeritus, University of Toronto; Former VP & Engineering Fellow, Google', primary_org: 'University of Toronto' },
  { name: 'Jan Leike', category: 'Researcher', title: 'Former Head of Superalignment, OpenAI (resigned May 2024)', primary_org: null },
  { name: 'Chris Olah', category: 'Researcher', title: 'Co-founder, Anthropic; Interpretability Research Lead', primary_org: 'Anthropic' },
  { name: 'Connor Leahy', category: 'Researcher', title: 'CEO, Conjecture', primary_org: 'Conjecture' },

  // Tier 2: AI Policy Academics
  { name: 'Helen Toner', category: 'Academic', title: 'Director of Strategy & Foundational Research Grants, Georgetown CSET; Former OpenAI Board Member', primary_org: 'Georgetown CSET' },
  { name: 'Jason Matheny', category: 'Academic', title: 'President & CEO, RAND Corporation; Former Director, IARPA', primary_org: 'RAND Corporation' },
  { name: 'Allan Dafoe', category: 'Researcher', title: 'President, Centre for the Governance of AI; Former Head of AI Governance, Google DeepMind', primary_org: 'Centre for the Governance of AI' },
  { name: 'Remco Zwetsloot', category: 'Researcher', title: 'Research Fellow, Georgetown CSET; AI Talent & Immigration Policy', primary_org: 'Georgetown CSET' },
  { name: 'Jack Clark', category: 'Researcher', title: 'Co-founder, Anthropic; Author, Import AI Newsletter', primary_org: 'Anthropic' },
  { name: 'Azeem Azhar', category: 'Researcher', title: 'Founder, Exponential View; Author, The Exponential Age', primary_org: 'Exponential View' },

  // Tier 3: AI Ethics/Fairness Researchers
  { name: 'Emily Bender', category: 'Academic', title: 'Professor of Linguistics, University of Washington; Co-author, Stochastic Parrots Paper', primary_org: 'University of Washington' },
  { name: 'Rediet Abebe', category: 'Academic', title: 'Assistant Professor of Computer Science, UC Berkeley; Co-founder, Black in AI', primary_org: 'UC Berkeley' },
  { name: 'Abeba Birhane', category: 'Researcher', title: 'Senior Advisor in AI Accountability, Mozilla Foundation; Trinity College Dublin', primary_org: 'Mozilla Foundation' },
  { name: 'Shakir Mohamed', category: 'Researcher', title: 'Staff Research Scientist, Google DeepMind; Co-author, Decolonial AI', primary_org: 'Google DeepMind' },

  // Tier 4: Technical ML Researchers (policy-relevant)
  { name: 'Ilya Sutskever', category: 'Researcher', title: 'Co-founder, Safe Superintelligence Inc; Former Chief Scientist, OpenAI', primary_org: 'Safe Superintelligence Inc' },
  { name: 'John Schulman', category: 'Researcher', title: 'Co-founder, OpenAI; Inventor of PPO/RLHF', primary_org: 'OpenAI' },
  { name: 'Percy Liang', category: 'Academic', title: 'Associate Professor of Computer Science, Stanford; Director, Stanford CRFM; Creator, HELM', primary_org: 'Stanford University' },
  { name: 'Jacob Steinhardt', category: 'Academic', title: 'Assistant Professor of Computer Science, UC Berkeley; AI Safety & Robustness', primary_org: 'UC Berkeley' },
  { name: 'David Krueger', category: 'Academic', title: 'Assistant Professor, University of Cambridge; AI Safety Research', primary_org: 'University of Cambridge' },
  { name: 'Rohin Shah', category: 'Researcher', title: 'Research Scientist, Google DeepMind; Author, Alignment Newsletter', primary_org: 'Google DeepMind' },

  // Tier 5: International Academic Voices
  { name: 'Toby Ord', category: 'Academic', title: 'Senior Research Fellow, Future of Humanity Institute, Oxford; Author, The Precipice', primary_org: 'University of Oxford' },
  { name: 'Jaan Tallinn', category: 'Investor', title: 'Co-founder, Skype & Kazaa; Co-founder, Centre for the Study of Existential Risk', primary_org: 'CSER' },
  { name: 'Seán Ó hÉigeartaigh', category: 'Researcher', title: 'Executive Director, Centre for the Study of Existential Risk, Cambridge', primary_org: 'CSER' },
  { name: 'Rumman Chowdhury', category: 'Researcher', title: 'CEO, Humane Intelligence; Former Director of ML Ethics, Twitter', primary_org: 'Humane Intelligence' },
  { name: 'Yolanda Gil', category: 'Academic', title: 'Research Professor & Director, AI & Data Science, USC Information Sciences Institute', primary_org: 'USC' },

  // Additional key figures
  { name: 'Max Tegmark', category: 'Academic', title: 'Professor of Physics, MIT; Co-founder, Future of Life Institute', primary_org: 'MIT' },
  { name: 'Nick Bostrom', category: 'Academic', title: 'Founding Director, Future of Humanity Institute (closed 2024); Author, Superintelligence', primary_org: 'University of Oxford' },
];

const INVESTORS = [
  // Tier 1: Top AI VC Voices
  { name: 'Reid Hoffman', category: 'Investor', title: 'Co-founder, LinkedIn; Partner, Greylock; Author, Impromptu: Amplifying Our Humanity Through AI', primary_org: 'Greylock' },
  { name: 'Vinod Khosla', category: 'Investor', title: 'Founder, Khosla Ventures; Vocal on AI Regulation', primary_org: 'Khosla Ventures' },
  { name: 'Martin Casado', category: 'Investor', title: 'General Partner, Andreessen Horowitz; Former VMware VP', primary_org: 'a16z' },
  { name: 'Anjney Midha', category: 'Investor', title: 'General Partner, Andreessen Horowitz; AI/Gaming Focus', primary_org: 'a16z' },
  { name: 'Sonya Huang', category: 'Investor', title: 'Partner, Sequoia Capital; Author, State of AI Report', primary_org: 'Sequoia Capital' },
  { name: 'Seth Rosenberg', category: 'Investor', title: 'Partner, Greylock; Enterprise AI Focus', primary_org: 'Greylock' },
  { name: 'Elad Gil', category: 'Investor', title: 'Investor & Advisor; Author, High Growth Handbook; Former Twitter VP', primary_org: null },

  // Tier 2: Hill & Valley (policy-connected investors)
  { name: 'Eric Schmidt', category: 'Investor', title: 'Former CEO & Chairman, Google; Founder, Schmidt Futures; Chair, NSCAI (2019-2021)', primary_org: 'Schmidt Futures' },
  { name: 'Josh Wolfe', category: 'Investor', title: 'Co-founder & Managing Partner, Lux Capital; Defense Tech & National Security AI', primary_org: 'Lux Capital' },
  { name: 'Joe Lonsdale', category: 'Investor', title: 'Co-founder, Palantir & 8VC; Conservative Tech Policy Voice', primary_org: '8VC' },
  { name: 'Sam Lessin', category: 'Investor', title: 'General Partner, Slow Ventures; Former VP Product, Facebook', primary_org: 'Slow Ventures' },
  { name: 'Matt Clifford', category: 'Investor', title: 'Co-founder & CEO, Entrepreneur First; UK AI Safety Summit Organizer; Advisor to UK PM', primary_org: 'Entrepreneur First' },
  { name: 'Ian Hogarth', category: 'Investor', title: 'Chair, UK AI Safety Institute; Co-founder, Plural; Author, "We Must Slow Down the Race to God-like AI"', primary_org: 'UK AI Safety Institute' },

  // Tier 3: Safety/Alignment-focused funders
  { name: 'Ajeya Cotra', category: 'Researcher', title: 'Senior Program Officer, Open Philanthropy; AI Timelines & Governance', primary_org: 'Open Philanthropy' },
];

const ORGANIZATIONS = [
  // VC firms not yet in DB
  { name: 'Khosla Ventures', category: 'VC/Capital/Philanthropy', website: 'https://khoslaventures.com' },
  { name: 'Sequoia Capital', category: 'VC/Capital/Philanthropy', website: 'https://sequoiacap.com' },
  { name: 'Greylock', category: 'VC/Capital/Philanthropy', website: 'https://greylock.com' },
  { name: 'Lux Capital', category: 'VC/Capital/Philanthropy', website: 'https://luxcapital.com' },
  { name: '8VC', category: 'VC/Capital/Philanthropy', website: 'https://8vc.com' },
  { name: 'Slow Ventures', category: 'VC/Capital/Philanthropy', website: 'https://slow.co' },
  { name: 'Entrepreneur First', category: 'VC/Capital/Philanthropy', website: 'https://entrepreneurfirst.com' },
  { name: 'Plural', category: 'VC/Capital/Philanthropy', website: 'https://plural.com' },
  { name: 'Schmidt Futures', category: 'VC/Capital/Philanthropy', website: 'https://schmidtfutures.com' },

  // Research orgs
  { name: 'Georgetown CSET', category: 'Think Tank/Policy Org', website: 'https://cset.georgetown.edu' },
  { name: 'Centre for the Governance of AI', category: 'Think Tank/Policy Org', website: 'https://governance.ai' },
  { name: 'Conjecture', category: 'AI Safety/Alignment', website: 'https://conjecture.dev' },
  { name: 'Safe Superintelligence Inc', category: 'AI Safety/Alignment', website: null },
  { name: 'Humane Intelligence', category: 'Ethics/Bias/Rights', website: 'https://humane-intelligence.org' },
  { name: 'CSER', category: 'Academic', website: 'https://cser.ac.uk', notes: 'Centre for the Study of Existential Risk, University of Cambridge' },
  { name: 'Stanford CRFM', category: 'Academic', website: 'https://crfm.stanford.edu', notes: 'Center for Research on Foundation Models' },
  { name: 'UK AI Safety Institute', category: 'Government/Agency', website: 'https://aisafety.gov.uk' },
  { name: 'Exponential View', category: 'Media/Journalism', website: 'https://exponentialview.co' },
];

// ============================================================================
// SEED LOGIC
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute') || args.includes('--enrich');
  const enrich = args.includes('--enrich');

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
  const allPeople = [...ACADEMICS_RESEARCHERS, ...INVESTORS];

  let insertedPeople = 0;
  let insertedOrgs = 0;
  let skippedPeople = 0;
  let skippedOrgs = 0;
  const insertedPeopleIds = [];

  // Insert organizations first (for foreign key references)
  console.log('=== ORGANIZATIONS ===');
  for (const org of ORGANIZATIONS) {
    if (existingOrgsSet.has(org.name.toLowerCase())) {
      console.log(`  SKIP (exists): ${org.name}`);
      skippedOrgs++;
      continue;
    }

    console.log(`  ADD: ${org.name} [${org.category}]`);

    if (execute) {
      const result = await client.query(`
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

  if (enrich && insertedPeopleIds.length > 0) {
    console.log('\n=== RUNNING ENRICHMENT ===');
    console.log(`Enriching ${insertedPeopleIds.length} people...`);
    // TODO: Call enrich-people.js with IDs
    console.log('Run manually: node scripts/enrich-people.js --ids=' + insertedPeopleIds.join(','));
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
