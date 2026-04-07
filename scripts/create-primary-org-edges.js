/**
 * Phase 2: Create edges from primary_org field
 *
 * For people who have primary_org set but no edge to that org,
 * creates an employed_by edge.
 *
 * Usage:
 *   node scripts/create-primary-org-edges.js --dry-run    # Show what would happen
 *   node scripts/create-primary-org-edges.js --execute    # Actually do it
 */
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

async function main() {
  console.log('Phase 2: Create Edges from primary_org');
  console.log('=======================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}\n`);

  const client = await pool.connect();

  try {
    // Get all people with primary_org set
    const people = await client.query(`
      SELECT id, name, primary_org, title
      FROM entity
      WHERE entity_type = 'person'
        AND status = 'approved'
        AND primary_org IS NOT NULL
        AND primary_org != ''
      ORDER BY name
    `);

    console.log(`Found ${people.rows.length} people with primary_org set\n`);

    // Get all orgs for matching
    const orgs = await client.query(`
      SELECT id, name FROM entity
      WHERE entity_type = 'organization' AND status = 'approved'
    `);
    const orgByName = new Map();
    const orgByNameLower = new Map();
    for (const org of orgs.rows) {
      orgByName.set(org.name, org);
      orgByNameLower.set(org.name.toLowerCase(), org);
    }

    // Get existing edges
    const existingEdges = await client.query(`
      SELECT source_id, target_id, edge_type
      FROM edge
      WHERE edge_type IN ('employed_by', 'affiliated', 'founded', 'leads')
    `);
    const edgeSet = new Set(
      existingEdges.rows.map(e => `${e.source_id}-${e.target_id}`)
    );

    let edgesToCreate = [];
    let noMatch = [];
    let alreadyHasEdge = [];

    for (const person of people.rows) {
      const primaryOrg = person.primary_org.trim();

      // Try exact match first, then case-insensitive
      let org = orgByName.get(primaryOrg) || orgByNameLower.get(primaryOrg.toLowerCase());

      // Try common variations
      if (!org) {
        // "OpenAI" vs "Open AI"
        const noSpace = primaryOrg.replace(/\s+/g, '');
        for (const [name, o] of orgByName) {
          if (name.replace(/\s+/g, '') === noSpace) {
            org = o;
            break;
          }
        }
      }

      if (!org) {
        // Try partial match for abbreviations like "MIT" → "Massachusetts Institute of Technology"
        const abbrevMatches = {
          'MIT': 'Massachusetts Institute of Technology',
          'NYU': 'New York University',
          'Stanford': 'Stanford University',
          'Harvard': 'Harvard University',
          'Oxford': 'University of Oxford',
          'Cambridge': 'University of Cambridge',
          'Berkeley': 'UC Berkeley',
          'Princeton': 'Princeton University',
        };
        if (abbrevMatches[primaryOrg]) {
          org = orgByName.get(abbrevMatches[primaryOrg]);
        }
      }

      if (!org) {
        noMatch.push({ person: person.name, primaryOrg });
        continue;
      }

      // Check if edge already exists
      const key = `${person.id}-${org.id}`;
      if (edgeSet.has(key)) {
        alreadyHasEdge.push({ person: person.name, org: org.name });
        continue;
      }

      edgesToCreate.push({
        personId: person.id,
        personName: person.name,
        personTitle: person.title,
        orgId: org.id,
        orgName: org.name,
      });
    }

    // Report findings
    console.log('=== EDGES TO CREATE ===');
    console.log(`${edgesToCreate.length} new employed_by edges\n`);

    for (const e of edgesToCreate) {
      console.log(`  [${e.personId}] ${e.personName}`);
      console.log(`      → [${e.orgId}] ${e.orgName} (employed_by)`);
      if (e.personTitle) console.log(`      Role: ${e.personTitle}`);
      console.log('');
    }

    console.log('\n=== ALREADY HAS EDGE ===');
    console.log(`${alreadyHasEdge.length} people already have an edge to their primary_org`);
    if (alreadyHasEdge.length <= 20) {
      for (const e of alreadyHasEdge) {
        console.log(`  ✓ ${e.person} → ${e.org}`);
      }
    }

    console.log('\n=== NO MATCHING ORG ===');
    console.log(`${noMatch.length} people have primary_org that doesn't match any org entity`);
    for (const e of noMatch) {
      console.log(`  ⚠ ${e.person} — "${e.primaryOrg}"`);
    }

    // Execute if not dry run
    if (!dryRun && edgesToCreate.length > 0) {
      console.log('\n=== CREATING EDGES ===');
      let created = 0;
      for (const e of edgesToCreate) {
        try {
          await client.query(`
            INSERT INTO edge (source_id, target_id, edge_type, role, is_primary, created_by)
            VALUES ($1, $2, 'employed_by', $3, true, 'create-primary-org-edges')
            ON CONFLICT (source_id, target_id, edge_type) DO NOTHING
          `, [e.personId, e.orgId, e.personTitle]);
          created++;
          console.log(`  ✓ Created: ${e.personName} → ${e.orgName}`);
        } catch (err) {
          console.log(`  ✗ Failed: ${e.personName} → ${e.orgName}: ${err.message}`);
        }
      }
      console.log(`\nCreated ${created} edges`);
    }

    // Summary
    console.log('\n=======================================');
    console.log('SUMMARY');
    console.log('=======================================');
    console.log(`People with primary_org: ${people.rows.length}`);
    console.log(`Already has edge: ${alreadyHasEdge.length}`);
    console.log(`Edges ${dryRun ? 'to create' : 'created'}: ${edgesToCreate.length}`);
    console.log(`No matching org (need manual fix): ${noMatch.length}`);

    if (dryRun) {
      console.log('\nTo execute, run:');
      console.log('  node scripts/create-primary-org-edges.js --execute');
    }

    // Final edge count
    const edgeCount = await client.query('SELECT COUNT(*)::int as cnt FROM edge');
    console.log(`\nTotal edges in database: ${edgeCount.rows[0].cnt}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
