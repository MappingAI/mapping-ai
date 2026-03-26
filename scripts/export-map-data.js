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

    // Strip sensitive fields before export
    const sensitiveFields = ['submitter_email', 'submitter_relationship', 'is_self_submission', 'search_vector'];
    const stripSensitive = (rows) => rows.map(row => {
      const clean = { ...row };
      sensitiveFields.forEach(f => delete clean[f]);
      return clean;
    });

    const people = await client.query(
      "SELECT * FROM people WHERE status = 'approved' ORDER BY id"
    );
    console.log(`✓ ${people.rows.length} people`);

    const orgs = await client.query(
      "SELECT * FROM organizations WHERE status = 'approved' ORDER BY id"
    );
    console.log(`✓ ${orgs.rows.length} organizations`);

    const resources = await client.query(
      "SELECT * FROM resources WHERE status = 'approved' ORDER BY id"
    );
    console.log(`✓ ${resources.rows.length} resources`);

    const relationships = await client.query(
      "SELECT id, source_type, source_id, target_type, target_id, relationship_type, evidence, created_by FROM relationships ORDER BY id"
    );
    console.log(`✓ ${relationships.rows.length} relationships`);

    const personOrgs = await client.query(
      "SELECT id, person_id, organization_id, role, is_primary FROM person_organizations ORDER BY id"
    );
    console.log(`✓ ${personOrgs.rows.length} person-organization links`);

    const data = {
      _meta: {
        generated_at: new Date().toISOString(),
        note: 'TEST DATA — This dataset contains fictional entries for development purposes',
      },
      people: stripSensitive(people.rows),
      organizations: stripSensitive(orgs.rows),
      resources: stripSensitive(resources.rows),
      relationships: relationships.rows,
      person_organizations: personOrgs.rows,
    };

    fs.writeFileSync('map-data.json', JSON.stringify(data, null, 2));
    console.log('\n✓ map-data.json created');
  } finally {
    client.release();
    await pool.end();
  }
}

exportMapData().catch(console.error);
