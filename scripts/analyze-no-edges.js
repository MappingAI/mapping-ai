/**
 * Analyze the remaining people with no edges
 */
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();

  const noEdges = await client.query(`
    SELECT p.id, p.name, p.category, p.title, p.primary_org, p.other_orgs
    FROM entity p
    LEFT JOIN edge e ON e.source_id = p.id
    WHERE p.entity_type = 'person' AND p.status = 'approved'
    GROUP BY p.id
    HAVING COUNT(e.id) = 0
    ORDER BY p.category, p.name
  `);

  console.log('PEOPLE WITH NO EDGES: ' + noEdges.rows.length);
  console.log('='.repeat(40) + '\n');

  // Group by category
  const byCategory = new Map();
  for (const p of noEdges.rows) {
    const cat = p.category || '(none)';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(p);
  }

  let withData = 0;
  let withoutData = 0;

  for (const [cat, people] of byCategory) {
    console.log(`${cat} (${people.length}):`);
    for (const p of people) {
      const hasData = p.primary_org || p.other_orgs;
      if (hasData) withData++;
      else withoutData++;

      const icon = hasData ? '📝' : '❌';
      console.log(`  ${icon} [${p.id}] ${p.name}`);
      if (p.primary_org) console.log(`      primary_org: ${p.primary_org}`);
    }
    console.log('');
  }

  console.log('='.repeat(40));
  console.log('SUMMARY');
  console.log('='.repeat(40));
  console.log(`With org data (could potentially extract): ${withData}`);
  console.log(`Without any org data (need research): ${withoutData}`);
  console.log('\nLegend: 📝 = has primary_org or other_orgs, ❌ = no org data');

  client.release();
  await pool.end();
}

main().catch(console.error);
