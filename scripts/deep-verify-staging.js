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

async function deepCheck() {
  const prod = await prodPool.connect();
  const staging = await stagingPool.connect();

  try {
    // Check specific well-known entities with ALL fields
    const knownIds = [1, 2, 140, 500, 1000, 1500];

    console.log('=== DEEP ENTITY CHECK (comparing entire rows) ===\n');

    for (const id of knownIds) {
      const pRes = await prod.query('SELECT * FROM entity WHERE id = $1', [id]);
      const sRes = await staging.query('SELECT * FROM entity WHERE id = $1', [id]);

      const p = pRes.rows[0];
      const s = sRes.rows[0];

      if (!p) {
        console.log(`Entity ${id}: NOT IN PRODUCTION`);
        continue;
      }
      if (!s) {
        console.log(`Entity ${id}: NOT IN STAGING ❌`);
        continue;
      }

      // Compare all fields
      const pJson = JSON.stringify(p);
      const sJson = JSON.stringify(s);
      const match = pJson === sJson;

      console.log(`Entity ${id} (${p.name}): ${match ? '✅ EXACT MATCH' : '❌ MISMATCH'}`);

      if (!match) {
        // Find which fields differ
        for (const key of Object.keys(p)) {
          const pVal = JSON.stringify(p[key]);
          const sVal = JSON.stringify(s[key]);
          if (pVal !== sVal) {
            console.log(`  DIFF [${key}]:`);
            console.log(`    prod:    ${pVal?.substring(0, 80)}`);
            console.log(`    staging: ${sVal?.substring(0, 80)}`);
          }
        }
      }
    }

    console.log('\n=== DEEP EDGE CHECK (comparing entire rows) ===\n');

    const edgeIds = [1, 100, 500, 1000, 1500, 2000];

    for (const id of edgeIds) {
      const pRes = await prod.query('SELECT * FROM edge WHERE id = $1', [id]);
      const sRes = await staging.query('SELECT * FROM edge WHERE id = $1', [id]);

      const p = pRes.rows[0];
      const s = sRes.rows[0];

      if (!p) {
        console.log(`Edge ${id}: NOT IN PRODUCTION`);
        continue;
      }
      if (!s) {
        console.log(`Edge ${id}: NOT IN STAGING ❌`);
        continue;
      }

      const pJson = JSON.stringify(p);
      const sJson = JSON.stringify(s);
      const match = pJson === sJson;

      console.log(`Edge ${id} (${p.edge_type}: ${p.source_id}→${p.target_id}): ${match ? '✅ EXACT MATCH' : '❌ MISMATCH'}`);

      if (!match) {
        for (const key of Object.keys(p)) {
          const pVal = JSON.stringify(p[key]);
          const sVal = JSON.stringify(s[key]);
          if (pVal !== sVal) {
            console.log(`  DIFF [${key}]: prod=${pVal} staging=${sVal}`);
          }
        }
      }
    }

    // Also do a random sample
    console.log('\n=== RANDOM SAMPLE (5 entities, 5 edges) ===\n');

    const randomEntities = await prod.query('SELECT id FROM entity ORDER BY RANDOM() LIMIT 5');
    for (const row of randomEntities.rows) {
      const pRes = await prod.query('SELECT * FROM entity WHERE id = $1', [row.id]);
      const sRes = await staging.query('SELECT * FROM entity WHERE id = $1', [row.id]);
      const match = JSON.stringify(pRes.rows[0]) === JSON.stringify(sRes.rows[0]);
      console.log(`Entity ${row.id} (${pRes.rows[0]?.name}): ${match ? '✅' : '❌'}`);
    }

    const randomEdges = await prod.query('SELECT id FROM edge ORDER BY RANDOM() LIMIT 5');
    for (const row of randomEdges.rows) {
      const pRes = await prod.query('SELECT * FROM edge WHERE id = $1', [row.id]);
      const sRes = await staging.query('SELECT * FROM edge WHERE id = $1', [row.id]);
      const match = JSON.stringify(pRes.rows[0]) === JSON.stringify(sRes.rows[0]);
      const e = pRes.rows[0];
      console.log(`Edge ${row.id} (${e?.edge_type}): ${match ? '✅' : '❌'}`);
    }

  } finally {
    prod.release();
    staging.release();
    await prodPool.end();
    await stagingPool.end();
  }
}

deepCheck().catch(console.error);
