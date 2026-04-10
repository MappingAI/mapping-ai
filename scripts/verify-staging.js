import pg from 'pg';
import 'dotenv/config';

const prodPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const stagingUrl = new URL(process.env.DATABASE_URL);
stagingUrl.pathname = '/mapping_ai_staging';
const stagingPool = new pg.Pool({
  connectionString: stagingUrl.toString(),
  ssl: { rejectUnauthorized: false }
});

async function sampleCheck() {
  const prod = await prodPool.connect();
  const staging = await stagingPool.connect();

  try {
    console.log('=== ENTITY SAMPLE CHECK ===\n');

    // Sample: first 3, last 3, random 3
    const sampleIds = await prod.query(`
      (SELECT id FROM entity ORDER BY id LIMIT 3)
      UNION ALL
      (SELECT id FROM entity ORDER BY id DESC LIMIT 3)
      UNION ALL
      (SELECT id FROM entity ORDER BY RANDOM() LIMIT 3)
    `);

    for (const row of sampleIds.rows) {
      const pEnt = await prod.query('SELECT id, name, entity_type, category, notes FROM entity WHERE id = $1', [row.id]);
      const sEnt = await staging.query('SELECT id, name, entity_type, category, notes FROM entity WHERE id = $1', [row.id]);

      const p = pEnt.rows[0];
      const s = sEnt.rows[0];

      if (!p || !s) {
        console.log(`Entity ${row.id}: MISSING - prod:${!!p} staging:${!!s} ❌`);
        continue;
      }

      const match = p.name === s.name && p.entity_type === s.entity_type && p.category === s.category && p.notes === s.notes;
      const name = p.name.substring(0, 35).padEnd(35);
      console.log(`Entity ${row.id}: ${name} ${match ? '✅' : '❌'}`);
    }

    console.log('\n=== EDGE SAMPLE CHECK ===\n');

    const edgeIds = await prod.query(`
      (SELECT id FROM edge ORDER BY id LIMIT 3)
      UNION ALL
      (SELECT id FROM edge ORDER BY id DESC LIMIT 3)
      UNION ALL
      (SELECT id FROM edge ORDER BY RANDOM() LIMIT 3)
    `);

    for (const row of edgeIds.rows) {
      const pEdge = await prod.query('SELECT * FROM edge WHERE id = $1', [row.id]);
      const sEdge = await staging.query('SELECT * FROM edge WHERE id = $1', [row.id]);

      const p = pEdge.rows[0];
      const s = sEdge.rows[0];

      if (!p || !s) {
        console.log(`Edge ${row.id}: MISSING - prod:${!!p} staging:${!!s} ❌`);
        continue;
      }

      const match = p.source_id === s.source_id && p.target_id === s.target_id && p.edge_type === s.edge_type && p.role === s.role;
      console.log(`Edge ${row.id}: ${p.edge_type.padEnd(20)} (${p.source_id}→${p.target_id}) ${match ? '✅' : '❌'}`);
    }

  } finally {
    prod.release();
    staging.release();
    await prodPool.end();
    await stagingPool.end();
  }
}

sampleCheck().catch(console.error);
