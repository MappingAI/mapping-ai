/**
 * Phase 3 - Step 2: Create frequently-mentioned orgs
 *
 * These orgs appear multiple times in other_orgs but don't exist in DB.
 *
 * Usage:
 *   node scripts/create-frequent-orgs.js --dry-run    # Show what would happen
 *   node scripts/create-frequent-orgs.js --execute    # Actually do it
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

// Orgs frequently mentioned in other_orgs that should be created
const FREQUENT_ORGS = [
  // Research institutions (9+ mentions)
  { name: 'National Bureau of Economic Research (NBER)', category: 'Academic', website: 'https://nber.org' },

  // Tech research labs (6+ mentions)
  { name: 'Google Brain', category: 'Frontier Lab', website: 'https://research.google', parentName: 'Google' },
  { name: 'Google Research', category: 'Frontier Lab', website: 'https://research.google', parentName: 'Google' },

  // Policy/Think tanks (5+ mentions)
  { name: 'Council on Foreign Relations', category: 'Think Tank/Policy Org', website: 'https://cfr.org' },
  { name: 'World Economic Forum', category: 'Think Tank/Policy Org', website: 'https://weforum.org' },

  // Tech research (4+ mentions)
  { name: 'Microsoft Research', category: 'Frontier Lab', website: 'https://research.microsoft.com', parentName: 'Microsoft' },
  { name: 'Facebook AI Research (FAIR)', category: 'Frontier Lab', website: 'https://ai.meta.com', parentName: 'Meta' },

  // Accelerators/Investors (3+ mentions)
  { name: 'Y Combinator', category: 'VC/Capital/Philanthropy', website: 'https://ycombinator.com' },

  // Companies (3+ mentions)
  { name: 'Tesla', category: 'Frontier Lab', website: 'https://tesla.com' },
  { name: 'Stripe', category: 'Frontier Lab', website: 'https://stripe.com' },
  { name: 'Palantir', category: 'Frontier Lab', website: 'https://palantir.com' },

  // Other research (2+ mentions)
  { name: 'DeepLearning.AI', category: 'Academic', website: 'https://deeplearning.ai' },
  { name: 'Coursera', category: 'Academic', website: 'https://coursera.org' },
  { name: 'BlackRock', category: 'VC/Capital/Philanthropy', website: 'https://blackrock.com' },

  // Universities not yet in DB
  { name: 'University of Toronto', category: 'Academic', website: 'https://utoronto.ca' },
  { name: 'Carnegie Mellon University', category: 'Academic', website: 'https://cmu.edu' },
  { name: 'Georgetown University', category: 'Academic', website: 'https://georgetown.edu' },
  { name: 'Yale University', category: 'Academic', website: 'https://yale.edu' },

  // Government/International
  { name: 'United Nations', category: 'Government/Agency', website: 'https://un.org' },
  { name: 'European Union', category: 'Government/Agency', website: 'https://europa.eu' },
  { name: 'DARPA', category: 'Government/Agency', website: 'https://darpa.mil' },
];

async function main() {
  console.log('Phase 3 - Step 2: Create Frequently-Mentioned Orgs');
  console.log('===================================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}\n`);

  const client = await pool.connect();

  try {
    // Get existing orgs
    const existing = await client.query(`
      SELECT id, name FROM entity
      WHERE entity_type = 'organization' AND status = 'approved'
    `);
    const existingByName = new Map(existing.rows.map(o => [o.name.toLowerCase(), o]));

    // Also check for partial matches to avoid duplicates
    const existingNames = existing.rows.map(o => o.name.toLowerCase());

    console.log('=== ORGS TO CREATE ===\n');

    let created = 0;
    let skipped = 0;
    const createdOrgs = [];

    for (const org of FREQUENT_ORGS) {
      // Check exact match
      if (existingByName.has(org.name.toLowerCase())) {
        console.log(`  ✓ ${org.name} (already exists)`);
        skipped++;
        continue;
      }

      // Skip similar-name check for orgs with explicit parent relationships
      // (e.g., "Google Brain" should be created even though "Google" exists)
      if (!org.parentName) {
        // Check if similar name exists (e.g., "Y Combinator" might exist as something else)
        const baseName = org.name.replace(/\s*\([^)]+\)\s*$/, '').toLowerCase();
        const similarExists = existingNames.some(n =>
          n.includes(baseName) || baseName.includes(n.replace(/\s*\([^)]+\)\s*$/, ''))
        );

        if (similarExists && baseName.length > 5) {
          const similar = existingNames.find(n =>
            n.includes(baseName) || baseName.includes(n.replace(/\s*\([^)]+\)\s*$/, ''))
          );
          console.log(`  ⚠ ${org.name} - similar exists: "${similar}"`);
          skipped++;
          continue;
        }
      }

      console.log(`  + ${org.name} [${org.category}]`);

      if (!dryRun) {
        // Look up parent org if specified
        let parentOrgId = null;
        if (org.parentName) {
          const parent = existingByName.get(org.parentName.toLowerCase());
          if (parent) {
            parentOrgId = parent.id;
            console.log(`      → subsidiary of ${org.parentName}`);
          }
        }

        const result = await client.query(`
          INSERT INTO entity (entity_type, name, category, website, parent_org_id, status)
          VALUES ('organization', $1, $2, $3, $4, 'approved')
          RETURNING id
        `, [org.name, org.category, org.website, parentOrgId]);

        const newOrg = { id: result.rows[0].id, ...org };
        createdOrgs.push(newOrg);
        existingByName.set(org.name.toLowerCase(), newOrg);

        // Create subsidiary_of edge if has parent
        if (parentOrgId) {
          await client.query(`
            INSERT INTO edge (source_id, target_id, edge_type, created_by)
            VALUES ($1, $2, 'subsidiary_of', 'create-frequent-orgs')
            ON CONFLICT (source_id, target_id, edge_type) DO NOTHING
          `, [result.rows[0].id, parentOrgId]);
        }

        created++;
      }
    }

    // Summary
    const finalOrgCount = await client.query(`
      SELECT COUNT(*)::int as cnt FROM entity WHERE entity_type = 'organization' AND status = 'approved'
    `);

    console.log('\n===================================================');
    console.log('SUMMARY');
    console.log('===================================================');
    console.log(`Orgs ${dryRun ? 'to create' : 'created'}: ${dryRun ? FREQUENT_ORGS.filter(o => !existingByName.has(o.name.toLowerCase())).length : created}`);
    console.log(`Orgs skipped (already exist): ${skipped}`);
    console.log(`Total orgs in database: ${finalOrgCount.rows[0].cnt}`);

    if (dryRun) {
      console.log('\nTo execute, run:');
      console.log('  node scripts/create-frequent-orgs.js --execute');
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
