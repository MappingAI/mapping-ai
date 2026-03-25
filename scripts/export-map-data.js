import pg from 'pg';
import 'dotenv/config';
import fs from 'fs';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function exportMapData() {
  const client = await pool.connect();
  try {
    console.log('Exporting map data...\n');

    const people = await client.query(
      "SELECT * FROM people WHERE status = 'approved' ORDER BY id"
    );
    console.log(`✓ ${people.rows.length} people`);

    const orgs = await client.query(
      "SELECT * FROM organizations WHERE status = 'approved' ORDER BY id"
    );
    console.log(`✓ ${orgs.rows.length} organizations`);

    // Strip sensitive fields before export
    const sensitiveFields = ['submitter_email', 'submitter_relationship', 'is_self_submission'];
    const stripSensitive = (rows) => rows.map(row => {
      const clean = { ...row };
      sensitiveFields.forEach(f => delete clean[f]);
      return clean;
    });

    const data = {
      people: stripSensitive(people.rows),
      organizations: stripSensitive(orgs.rows),
    };

    fs.writeFileSync('map-data.json', JSON.stringify(data, null, 2));
    console.log('\n✓ map-data.json created');
  } finally {
    client.release();
    await pool.end();
  }
}

exportMapData().catch(console.error);
