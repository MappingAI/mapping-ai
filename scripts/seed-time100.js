/**
 * Seed TIME100 AI 2025 People
 *
 * Adds missing TIME100 AI people and orgs to the database.
 * Creates edge records linking people to their organizations.
 *
 * Usage:
 *   node scripts/seed-time100.js --dry-run    # Preview what would be added
 *   node scripts/seed-time100.js              # Actually add to database
 */
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

// ══════════════════════════════════════════════════════════════════════════════
// ALLOWED VALUES FROM CONTRIBUTE FORM
// ══════════════════════════════════════════════════════════════════════════════

const PERSON_CATEGORIES = [
  'Executive', 'Researcher', 'Policymaker', 'Investor',
  'Organizer', 'Journalist', 'Academic', 'Cultural figure'
];

const ORG_CATEGORIES = [
  'Frontier Lab', 'AI Safety/Alignment', 'Think Tank/Policy Org', 'Government/Agency',
  'Academic', 'VC/Capital/Philanthropy', 'Labor/Civil Society', 'Ethics/Bias/Rights',
  'Media/Journalism', 'Political Campaign/PAC'
];

// ══════════════════════════════════════════════════════════════════════════════
// TIME100 AI 2025 DATA
// ══════════════════════════════════════════════════════════════════════════════

// People to add (using exact categories from form)
const TIME100_PEOPLE = [
  // Leaders
  { name: 'Matthew Prince', title: 'Co-founder and CEO, Cloudflare', primary_org: 'Cloudflare', category: 'Executive' },
  { name: 'Jensen Huang', title: 'CEO, Nvidia', primary_org: 'Nvidia', category: 'Executive' },
  { name: 'Fidji Simo', title: 'CEO of Applications, OpenAI', primary_org: 'OpenAI', category: 'Executive' },
  { name: 'Andy Jassy', title: 'President and CEO, Amazon', primary_org: 'Amazon', category: 'Executive' },
  { name: 'Allie K. Miller', title: 'CEO, Open Machine', primary_org: 'Open Machine', category: 'Executive' },
  { name: 'Strive Masiyiwa', title: 'Founder and Executive Chairman, Cassava Technologies', primary_org: 'Cassava Technologies', category: 'Executive' },
  { name: 'Cristiano Amon', title: 'President and CEO, Qualcomm', primary_org: 'Qualcomm', category: 'Executive' },
  { name: 'Alexandr Wang', title: 'CEO, Scale AI', primary_org: 'Scale AI', category: 'Executive' },
  { name: 'Nat Friedman', title: 'Investor and Co-founder, AI Grant', primary_org: 'AI Grant', category: 'Investor' },
  { name: 'C.C. Wei', title: 'Chairman and CEO, TSMC', primary_org: 'TSMC', category: 'Executive' },
  { name: 'David Holz', title: 'Founder, Midjourney', primary_org: 'Midjourney', category: 'Executive' },
  { name: 'Ren Zhengfei', title: 'Founder and CEO, Huawei', primary_org: 'Huawei', category: 'Executive' },
  { name: 'Steve Huffman', title: 'Co-founder and CEO, Reddit', primary_org: 'Reddit', category: 'Executive' },
  { name: 'Masayoshi Son', title: 'Founder, Chairman, and CEO, SoftBank', primary_org: 'SoftBank', category: 'Investor' },
  { name: 'Adam Evans', title: 'EVP and GM, Salesforce AI', primary_org: 'Salesforce', category: 'Executive' },
  { name: 'Rene Haas', title: 'CEO, Arm', primary_org: 'Arm', category: 'Executive' },
  { name: 'Wang Xingxing', title: 'CEO, Unitree Robotics', primary_org: 'Unitree Robotics', category: 'Executive' },
  { name: 'Amnon Shashua', title: 'President and CEO, Mobileye', primary_org: 'Mobileye', category: 'Executive' },

  // Innovators
  { name: 'Natasha Lyonne', title: 'Co-founder, Asteria Film Co.', primary_org: 'Asteria Film Co.', category: 'Cultural figure' },
  { name: 'Refik Anadol', title: 'Artist', primary_org: null, category: 'Cultural figure' },
  { name: 'Alex Blania', title: 'Co-founder and CEO, Tools for Humanity', primary_org: 'Tools for Humanity', category: 'Executive' },
  { name: 'Maithra Raghu', title: 'Co-founder and CEO, Samaya AI', primary_org: 'Samaya AI', category: 'Executive' },
  { name: 'Rick Rubin', title: 'Music Producer', primary_org: null, category: 'Cultural figure' },
  { name: 'Mati Staniszewski', title: 'Co-founder and CEO, ElevenLabs', primary_org: 'ElevenLabs', category: 'Executive' },
  { name: 'Peggy Johnson', title: 'CEO, Agility Robotics', primary_org: 'Agility Robotics', category: 'Executive' },
  { name: 'James Peng', title: 'Founder and CEO, Pony.ai', primary_org: 'Pony.ai', category: 'Executive' },
  { name: 'Tareq Amin', title: 'CEO, Humain', primary_org: 'Humain', category: 'Executive' },
  { name: 'Mfikeyi Makayi', title: 'CEO, KoBold Metals Africa', primary_org: 'KoBold Metals', category: 'Executive' },
  { name: 'Sam Rodriques', title: 'Co-founder and CEO, FutureHouse', primary_org: 'FutureHouse', category: 'Executive' },
  { name: 'Andy Parsons', title: 'Senior Director of Content Authenticity, Adobe', primary_org: 'Adobe', category: 'Executive' },
  { name: 'Navrina Singh', title: 'Founder and CEO, Credo AI', primary_org: 'Credo AI', category: 'Executive' },
  { name: 'David Ha', title: 'Co-founder and CEO, Sakana AI', primary_org: 'Sakana AI', category: 'Executive' },
  { name: 'Edwin Chen', title: 'Founder and CEO, Surge AI', primary_org: 'Surge AI', category: 'Executive' },
  { name: 'Priya Donti', title: 'Assistant Professor, MIT', primary_org: 'MIT', category: 'Academic' },
  { name: 'Alan Descoins', title: 'CEO, Tryolabs', primary_org: 'Tryolabs', category: 'Executive' },
  { name: 'Kakul Srivastava', title: 'CEO, Splice', primary_org: 'Splice', category: 'Executive' },
  { name: 'Brandon Tseng', title: 'Co-founder and President, Shield AI', primary_org: 'Shield AI', category: 'Executive' },
  { name: 'Denise Herzing', title: 'Founder and Research Director, Wild Dolphin Project', primary_org: 'Wild Dolphin Project', category: 'Researcher' },
  { name: 'Mitesh Khapra', title: 'Associate Professor, IIT Madras', primary_org: 'IIT Madras', category: 'Academic' },
  { name: 'Ana Helena Ulbrich', title: 'Co-founder and Director, NoHarm', primary_org: 'NoHarm', category: 'Organizer' },
  { name: 'Jeff Leek', title: 'VP and Chief Data Officer, Fred Hutchinson Cancer Center', primary_org: 'Fred Hutchinson Cancer Center', category: 'Executive' },

  // Shapers
  { name: 'Fei-Fei Li', title: 'Co-director, Stanford HAI; CEO, World Labs', primary_org: 'Stanford HAI', category: 'Academic' },
];

// Organizations to add (using exact categories from form)
const TIME100_ORGS = [
  { name: 'Cloudflare', category: 'Frontier Lab', website: 'https://cloudflare.com' },
  { name: 'Nvidia', category: 'Frontier Lab', website: 'https://nvidia.com' },
  { name: 'Amazon', category: 'Frontier Lab', website: 'https://amazon.com' },
  { name: 'Open Machine', category: 'AI Safety/Alignment', website: null },
  { name: 'Cassava Technologies', category: 'Frontier Lab', website: 'https://cassavatechnologies.com' },
  { name: 'Qualcomm', category: 'Frontier Lab', website: 'https://qualcomm.com' },
  { name: 'Scale AI', category: 'Frontier Lab', website: 'https://scale.com' },
  { name: 'AI Grant', category: 'VC/Capital/Philanthropy', website: 'https://aigrant.com' },
  { name: 'TSMC', category: 'Frontier Lab', website: 'https://tsmc.com' },
  { name: 'Midjourney', category: 'Frontier Lab', website: 'https://midjourney.com' },
  { name: 'Huawei', category: 'Frontier Lab', website: 'https://huawei.com' },
  { name: 'Reddit', category: 'Media/Journalism', website: 'https://reddit.com' },
  { name: 'SoftBank', category: 'VC/Capital/Philanthropy', website: 'https://softbank.com' },
  { name: 'Salesforce', category: 'Frontier Lab', website: 'https://salesforce.com' },
  { name: 'Arm', category: 'Frontier Lab', website: 'https://arm.com' },
  { name: 'Unitree Robotics', category: 'Frontier Lab', website: 'https://unitree.com' },
  { name: 'Mobileye', category: 'Frontier Lab', website: 'https://mobileye.com' },
  { name: 'Asteria Film Co.', category: 'Media/Journalism', website: null },
  { name: 'Tools for Humanity', category: 'Frontier Lab', website: 'https://toolsforhumanity.com' },
  { name: 'Samaya AI', category: 'AI Safety/Alignment', website: 'https://samaya.ai' },
  { name: 'ElevenLabs', category: 'Frontier Lab', website: 'https://elevenlabs.io' },
  { name: 'Agility Robotics', category: 'Frontier Lab', website: 'https://agilityrobotics.com' },
  { name: 'Pony.ai', category: 'Frontier Lab', website: 'https://pony.ai' },
  { name: 'Humain', category: 'Frontier Lab', website: null },
  { name: 'KoBold Metals', category: 'Frontier Lab', website: 'https://koboldmetals.com' },
  { name: 'FutureHouse', category: 'AI Safety/Alignment', website: 'https://futurehouse.org' },
  { name: 'Adobe', category: 'Frontier Lab', website: 'https://adobe.com' },
  { name: 'Credo AI', category: 'AI Safety/Alignment', website: 'https://credo.ai' },
  { name: 'Sakana AI', category: 'Frontier Lab', website: 'https://sakana.ai' },
  { name: 'Surge AI', category: 'Frontier Lab', website: 'https://surgehq.ai' },
  { name: 'Tryolabs', category: 'Frontier Lab', website: 'https://tryolabs.com' },
  { name: 'Splice', category: 'Frontier Lab', website: 'https://splice.com' },
  { name: 'Shield AI', category: 'Frontier Lab', website: 'https://shield.ai' },
  { name: 'Wild Dolphin Project', category: 'Academic', website: 'https://wilddolphinproject.org' },
  { name: 'IIT Madras', category: 'Academic', website: 'https://iitm.ac.in' },
  { name: 'NoHarm', category: 'Ethics/Bias/Rights', website: null },
  { name: 'Fred Hutchinson Cancer Center', category: 'Academic', website: 'https://fredhutch.org' },
  { name: 'World Labs', category: 'Frontier Lab', website: 'https://worldlabs.ai' },
];

// ══════════════════════════════════════════════════════════════════════════════
// FUZZY MATCHING
// ══════════════════════════════════════════════════════════════════════════════

function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .replace(/\s+/g, '');
}

function fuzzyMatch(name, existingNames) {
  const normalized = normalize(name);
  const nameLower = name.toLowerCase();

  for (const existing of existingNames) {
    const existingNorm = normalize(existing);
    const existingLower = existing.toLowerCase();

    // Exact match after normalization (removes hyphens, spaces, etc.)
    if (normalized === existingNorm) return existing;

    // For people: require BOTH first and last name to match
    // Split into parts and check for full word matches
    const nameParts = nameLower.split(/[\s-]+/).filter(p => p.length > 1);
    const existingParts = existingLower.split(/[\s-]+/).filter(p => p.length > 1);

    if (nameParts.length >= 2 && existingParts.length >= 2) {
      // Check if first AND last parts match (not just one)
      const firstMatches = nameParts[0] === existingParts[0];
      const lastMatches = nameParts[nameParts.length - 1] === existingParts[existingParts.length - 1];

      if (firstMatches && lastMatches) return existing;
    }
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('Seeding TIME100 AI 2025 People & Organizations');
  console.log('==============================================\n');

  if (dryRun) {
    console.log('DRY RUN - No changes will be made\n');
  }

  const client = await pool.connect();

  try {
    // Get existing people and orgs
    const existingPeopleResult = await client.query(
      `SELECT id, name FROM entity WHERE entity_type = 'person'`
    );
    const existingOrgsResult = await client.query(
      `SELECT id, name FROM entity WHERE entity_type = 'organization'`
    );

    const existingPeople = new Map(existingPeopleResult.rows.map(r => [r.name, r.id]));
    const existingOrgs = new Map(existingOrgsResult.rows.map(r => [r.name, r.id]));
    const existingPeopleNames = Array.from(existingPeople.keys());
    const existingOrgNames = Array.from(existingOrgs.keys());

    // Track what we're adding
    const orgsToAdd = [];
    const peopleToAdd = [];
    const edgesToCreate = [];
    const duplicatesFound = [];

    // Check orgs for duplicates with fuzzy matching
    console.log('--- Checking Organizations ---');
    for (const org of TIME100_ORGS) {
      // Validate category
      if (!ORG_CATEGORIES.includes(org.category)) {
        console.log(`  ⚠ ${org.name} has invalid category "${org.category}"`);
        continue;
      }
      const match = fuzzyMatch(org.name, existingOrgNames);
      if (match) {
        duplicatesFound.push({ type: 'org', name: org.name, matchedWith: match });
        console.log(`  ~ ${org.name} → already exists as "${match}"`);
      } else {
        orgsToAdd.push(org);
        console.log(`  + ${org.name} (${org.category})`);
      }
    }

    // Check people for duplicates with fuzzy matching
    console.log('\n--- Checking People ---');
    for (const person of TIME100_PEOPLE) {
      // Validate category
      if (!PERSON_CATEGORIES.includes(person.category)) {
        console.log(`  ⚠ ${person.name} has invalid category "${person.category}"`);
        continue;
      }
      const match = fuzzyMatch(person.name, existingPeopleNames);
      if (match) {
        duplicatesFound.push({ type: 'person', name: person.name, matchedWith: match });
        console.log(`  ~ ${person.name} → already exists as "${match}"`);
      } else {
        peopleToAdd.push(person);
        console.log(`  + ${person.name} (${person.category})`);
      }
    }

    // Apply limit if specified
    if (limit) {
      orgsToAdd.splice(limit);
      peopleToAdd.splice(limit);
    }

    console.log(`\n--- Summary ---`);
    console.log(`Orgs to add: ${orgsToAdd.length}${limit ? ` (limited to ${limit})` : ''}`);
    console.log(`People to add: ${peopleToAdd.length}${limit ? ` (limited to ${limit})` : ''}`);
    console.log(`Duplicates found: ${duplicatesFound.length}`);

    if (dryRun) {
      console.log('\nDry run complete. Run without --dry-run to execute.');
      return;
    }

    // Add orgs first
    console.log('\n--- Adding Organizations ---');
    const addedOrgIds = new Map();
    for (const org of orgsToAdd) {
      const result = await client.query(
        `INSERT INTO entity (entity_type, name, category, website, status)
         VALUES ('organization', $1, $2, $3, 'approved')
         RETURNING id`,
        [org.name, org.category, org.website]
      );
      addedOrgIds.set(org.name, result.rows[0].id);
      console.log(`  ✓ Added ${org.name} (ID: ${result.rows[0].id})`);
    }

    // Merge existing + newly added orgs for edge creation
    const allOrgs = new Map([...existingOrgs, ...addedOrgIds]);

    // Add people
    console.log('\n--- Adding People ---');
    const addedPeopleIds = [];
    for (const person of peopleToAdd) {
      const result = await client.query(
        `INSERT INTO entity (entity_type, name, title, primary_org, category, status)
         VALUES ('person', $1, $2, $3, $4, 'approved')
         RETURNING id`,
        [person.name, person.title, person.primary_org, person.category]
      );
      const personId = result.rows[0].id;
      addedPeopleIds.push(personId);
      console.log(`  ✓ Added ${person.name} (ID: ${personId})`);

      // Create edge to primary org if it exists
      if (person.primary_org) {
        // Try to find org by exact name or fuzzy match
        let orgId = allOrgs.get(person.primary_org);
        if (!orgId) {
          const orgMatch = fuzzyMatch(person.primary_org, Array.from(allOrgs.keys()));
          if (orgMatch) orgId = allOrgs.get(orgMatch);
        }

        if (orgId) {
          edgesToCreate.push({
            source_id: personId,
            target_id: orgId,
            edge_type: 'affiliated',
            role: person.title?.split(',')[0] || 'Member',
            is_primary: true
          });
        }
      }
    }

    // Create edges
    console.log('\n--- Creating Edges ---');
    for (const edge of edgesToCreate) {
      await client.query(
        `INSERT INTO edge (source_id, target_id, edge_type, role, is_primary)
         VALUES ($1, $2, $3, $4, $5)`,
        [edge.source_id, edge.target_id, edge.edge_type, edge.role, edge.is_primary]
      );
      console.log(`  ✓ Edge: person ${edge.source_id} → org ${edge.target_id} (${edge.role})`);
    }

    // Final summary
    console.log('\n==============================================');
    console.log('COMPLETE');
    console.log('==============================================');
    console.log(`Organizations added: ${addedOrgIds.size}`);
    console.log(`People added: ${addedPeopleIds.length}`);
    console.log(`Edges created: ${edgesToCreate.length}`);

    if (addedPeopleIds.length > 0) {
      console.log(`\nTo enrich these new people, run:`);
      console.log(`  node scripts/enrich-people.js --ids=${addedPeopleIds.join(',')}`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
