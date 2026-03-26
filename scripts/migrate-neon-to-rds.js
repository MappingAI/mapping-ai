/**
 * One-time migration: Copy all data from Neon Postgres → AWS RDS Postgres
 * Usage: node scripts/migrate-neon-to-rds.js
 */
import pg from 'pg';
import 'dotenv/config';

const NEON_URL = process.env.DATABASE_URL; // Neon (old)
const RDS_URL = 'postgresql://mappingai:MappingAI2026Secure!@mapping-ai-db.c9sccou2k3xe.eu-west-2.rds.amazonaws.com:5432/mappingai';

const neonPool = new pg.Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });
const rdsPool = new pg.Pool({ connectionString: RDS_URL, ssl: { rejectUnauthorized: false } });

const TABLES = [
  { name: 'organizations', idCol: 'id' }, // orgs first (referenced by people FK)
  { name: 'people', idCol: 'id' },
  { name: 'resources', idCol: 'id' },
  { name: 'person_organizations', idCol: 'id' },
  { name: 'relationships', idCol: 'id' },
  { name: 'submissions', idCol: 'id' },
];

async function migrate() {
  const neon = await neonPool.connect();
  const rds = await rdsPool.connect();

  try {
    for (const table of TABLES) {
      console.log(`\nMigrating ${table.name}...`);

      // Get all rows from Neon
      const { rows } = await neon.query(`SELECT * FROM ${table.name} ORDER BY id`);
      console.log(`  Source (Neon): ${rows.length} rows`);

      if (rows.length === 0) continue;

      // Clear RDS table first (clean migration)
      await rds.query(`DELETE FROM ${table.name}`);

      // Insert in batches
      let inserted = 0;
      for (const row of rows) {
        const cols = Object.keys(row).filter(k => row[k] !== undefined);
        const vals = cols.map(k => row[k]);
        const placeholders = cols.map((_, i) => `$${i + 1}`);

        try {
          await rds.query(
            `INSERT INTO ${table.name} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT DO NOTHING`,
            vals
          );
          inserted++;
        } catch (err) {
          // Skip rows that cause constraint violations
          if (!err.message.includes('duplicate') && !err.message.includes('violates')) {
            console.log(`  Error on row ${row.id}: ${err.message}`);
          }
        }
      }

      // Reset sequence to max id
      try {
        const maxId = await rds.query(`SELECT COALESCE(MAX(id), 0) as max FROM ${table.name}`);
        const seqName = `${table.name}_id_seq`;
        await rds.query(`SELECT setval('${seqName}', $1, true)`, [maxId.rows[0].max]);
      } catch (e) { /* some tables may not have sequences */ }

      console.log(`  Inserted: ${inserted} rows`);
    }

    // Verify counts
    console.log('\n=== Verification ===');
    for (const table of TABLES) {
      const neonCount = await neon.query(`SELECT count(*) FROM ${table.name}`);
      const rdsCount = await rds.query(`SELECT count(*) FROM ${table.name}`);
      const match = neonCount.rows[0].count === rdsCount.rows[0].count;
      console.log(`${table.name}: Neon=${neonCount.rows[0].count} RDS=${rdsCount.rows[0].count} ${match ? '✓' : '✗ MISMATCH'}`);
    }

    console.log('\nMigration complete!');
  } finally {
    neon.release();
    rds.release();
    await neonPool.end();
    await rdsPool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
