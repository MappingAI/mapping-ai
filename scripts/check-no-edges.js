/**
 * Check how many people still have no edges
 */
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();

  // People with no edges
  const noEdges = await client.query(`
    SELECT p.id, p.name, p.primary_org, p.category
    FROM entity p
    LEFT JOIN edge e ON e.source_id = p.id
    WHERE p.entity_type = 'person' AND p.status = 'approved'
    GROUP BY p.id
    HAVING COUNT(e.id) = 0
    ORDER BY p.name
  `);

  // Total people
  const total = await client.query(`
    SELECT COUNT(*)::int as cnt FROM entity WHERE entity_type = 'person' AND status = 'approved'
  `);

  console.log('PEOPLE WITH NO EDGES');
  console.log('====================');
  console.log(`${noEdges.rows.length} / ${total.rows[0].cnt} people have no edges (${Math.round(noEdges.rows.length / total.rows[0].cnt * 100)}%)\n`);

  for (const p of noEdges.rows) {
    console.log(`  [${p.id}] ${p.name}`);
    if (p.primary_org) console.log(`      primary_org: ${p.primary_org}`);
  }

  client.release();
  await pool.end();
}

main().catch(console.error);
