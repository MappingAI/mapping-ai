/**
 * Phase 1: Set up org hierarchy
 *
 * 1. Create parent university orgs
 * 2. Set parent_org_id on children
 * 3. Create subsidiary_of edges for visibility
 *
 * Usage:
 *   node scripts/setup-hierarchy.js --dry-run    # Show what would happen
 *   node scripts/setup-hierarchy.js --execute    # Actually do it
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

// Hierarchy configuration
const HIERARCHY = [
  {
    parent: { name: 'Stanford University', category: 'Academic', website: 'https://stanford.edu' },
    childPattern: /^Stanford /i,
    exclude: []
  },
  {
    parent: { name: 'Massachusetts Institute of Technology', category: 'Academic', website: 'https://mit.edu' },
    childPattern: /^MIT /i,
    exclude: ['MIT Technology Review'] // Independent publication
  },
  {
    parent: { name: 'Harvard University', category: 'Academic', website: 'https://harvard.edu' },
    childPattern: /^Harvard /i,
    exclude: []
  },
  {
    parent: { name: 'Princeton University', category: 'Academic', website: 'https://princeton.edu' },
    childPattern: /^Princeton /i,
    exclude: []
  },
  {
    parent: { name: 'University of Cambridge', category: 'Academic', website: 'https://cam.ac.uk' },
    childPattern: /Cambridge|Leverhulme/i,
    exclude: ['Cambridge Boston Alignment Initiative (CBAI)'] // Boston org, not UK
  },
  {
    parent: { name: 'University of Oxford', category: 'Academic', website: 'https://ox.ac.uk' },
    childPattern: /Oxford/i,
    exclude: []
  },
  {
    parent: { name: 'UC Berkeley', category: 'Academic', website: 'https://berkeley.edu' },
    childPattern: /Berkeley/i,
    exclude: []
  },
  {
    parent: { name: 'New York University', category: 'Academic', website: 'https://nyu.edu' },
    childPattern: /NYU|New York University/i,
    exclude: []
  },
  // Existing parents - just need to link children
  {
    parent: { name: 'Anthropic', exists: true },
    childPattern: /^Anthropic /i,
    exclude: ['Anthropic']
  },
  {
    parent: { name: 'Schmidt Futures', exists: true },
    childPattern: /Schmidt/i,
    exclude: ['Schmidt Futures']
  },
];

async function main() {
  console.log('Phase 1: Set up Org Hierarchy');
  console.log('=============================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}\n`);

  const client = await pool.connect();

  try {
    // Get all orgs
    const orgs = await client.query(`
      SELECT id, name, category, parent_org_id
      FROM entity
      WHERE entity_type = 'organization' AND status = 'approved'
    `);
    const orgByName = new Map(orgs.rows.map(o => [o.name.toLowerCase(), o]));

    let parentsCreated = 0;
    let childrenLinked = 0;
    let edgesCreated = 0;

    for (const h of HIERARCHY) {
      console.log(`\n=== ${h.parent.name} ===`);

      // Check if parent exists
      let parentOrg = orgByName.get(h.parent.name.toLowerCase());

      if (parentOrg) {
        console.log(`  Parent: [${parentOrg.id}] EXISTS`);
      } else if (h.parent.exists) {
        console.log(`  Parent: ⚠ SHOULD EXIST BUT NOT FOUND - skipping`);
        continue;
      } else {
        console.log(`  Parent: ${dryRun ? 'WILL CREATE' : 'CREATING'}`);
        if (!dryRun) {
          const result = await client.query(`
            INSERT INTO entity (entity_type, name, category, website, status)
            VALUES ('organization', $1, $2, $3, 'approved')
            RETURNING id
          `, [h.parent.name, h.parent.category, h.parent.website]);
          parentOrg = { id: result.rows[0].id, name: h.parent.name };
          orgByName.set(h.parent.name.toLowerCase(), parentOrg);
          parentsCreated++;
          console.log(`  Parent: [${parentOrg.id}] CREATED`);
        }
      }

      // Find children
      const children = orgs.rows.filter(o =>
        h.childPattern.test(o.name) &&
        !h.exclude.includes(o.name) &&
        o.name !== h.parent.name
      );

      if (children.length === 0) {
        console.log('  Children: (none)');
        continue;
      }

      console.log('  Children:');
      for (const child of children) {
        const alreadyLinked = child.parent_org_id != null;
        console.log(`    [${child.id}] ${child.name}${alreadyLinked ? ' (already linked)' : ''}`);

        if (alreadyLinked) continue;

        if (!dryRun && parentOrg) {
          // Set parent_org_id
          await client.query(
            'UPDATE entity SET parent_org_id = $1 WHERE id = $2',
            [parentOrg.id, child.id]
          );
          childrenLinked++;

          // Create subsidiary_of edge
          try {
            await client.query(`
              INSERT INTO edge (source_id, target_id, edge_type, created_by)
              VALUES ($1, $2, 'subsidiary_of', 'setup-hierarchy')
              ON CONFLICT (source_id, target_id, edge_type) DO NOTHING
            `, [child.id, parentOrg.id]);
            edgesCreated++;
          } catch (e) {
            // Edge might already exist
          }
        }
      }
    }

    console.log('\n=============================');
    console.log('SUMMARY');
    console.log('=============================');
    console.log(`Parent orgs ${dryRun ? 'to create' : 'created'}: ${dryRun ? HIERARCHY.filter(h => !h.parent.exists && !orgByName.has(h.parent.name.toLowerCase())).length : parentsCreated}`);
    console.log(`Children ${dryRun ? 'to link' : 'linked'}: ${dryRun ? '(see above)' : childrenLinked}`);
    console.log(`Edges ${dryRun ? 'to create' : 'created'}: ${dryRun ? '(same as children)' : edgesCreated}`);

    if (dryRun) {
      console.log('\nTo execute, run:');
      console.log('  node scripts/setup-hierarchy.js --execute');
    } else {
      // Final counts
      const counts = await client.query(`
        SELECT entity_type, COUNT(*)::int as cnt
        FROM entity WHERE status = 'approved'
        GROUP BY entity_type
      `);
      console.log('\nFinal counts:');
      for (const row of counts.rows) {
        console.log(`  ${row.entity_type}: ${row.cnt}`);
      }

      const edgeCount = await client.query('SELECT COUNT(*)::int as cnt FROM edge');
      console.log(`  edges: ${edgeCount.rows[0].cnt}`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
