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

    // Ordinal scores for 2D view axes (null = excluded from plot)
    const STANCE_SCORES = {
      'Accelerate': 1,
      'Light-touch': 2, 'Light-touch regulation': 2,
      'Targeted': 3, 'Targeted regulation': 3,
      'Moderate': 4, 'Moderate regulation': 4,
      'Restrictive': 5, 'Restrictive regulation': 5,
      'Precautionary': 6,
      'Nationalize': 7,
      // 'Mixed', 'Mixed/unclear', 'Unknown', 'unclear' → null (excluded)
    };
    const TIMELINE_SCORES = {
      'Already here': 1,
      '2-3 years': 2, 'Within 2-3 years': 2,
      '5-10 years': 3,
      '10-25 years': 4,
      '25+ years or never': 5,
      // 'Ill-defined', 'Ill-defined concept', 'Unknown' → null (excluded)
    };
    const RISK_SCORES = {
      'Overstated': 1,
      'Manageable': 2,
      'Serious': 3,
      'Catastrophic': 4, 'Potentially catastrophic': 4,
      'Existential': 5,
      // 'Mixed/nuanced', 'Unknown' → null (excluded)
    };
    const addScores = (rows) => rows.map(row => ({
      ...row,
      stance_score:   STANCE_SCORES[row.regulatory_stance]  ?? null,
      timeline_score: TIMELINE_SCORES[row.agi_timeline]     ?? null,
      risk_score:     RISK_SCORES[row.ai_risk_level]        ?? null,
    }));

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
      people: addScores(stripSensitive(people.rows)),
      organizations: addScores(stripSensitive(orgs.rows)),
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
