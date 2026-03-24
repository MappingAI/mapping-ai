import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Creating/updating tables...');

    // --- People ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS people (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(200),
        title VARCHAR(200),
        primary_org VARCHAR(200),
        other_orgs VARCHAR(200),
        location VARCHAR(200),
        regulatory_stance VARCHAR(200),
        evidence_source VARCHAR(200),
        agi_timeline VARCHAR(200),
        ai_risk_level VARCHAR(200),
        threat_models TEXT,
        influence_type TEXT,
        twitter VARCHAR(200),
        bluesky VARCHAR(200),
        notes TEXT,
        submitter_email VARCHAR(200),
        submitter_relationship VARCHAR(200),
        is_self_submission BOOLEAN DEFAULT FALSE,
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  ✓ people table exists');

    // Idempotent column additions for existing databases
    const peopleNewCols = [
      ['evidence_source', 'VARCHAR(200)'],
      ['agi_timeline', 'VARCHAR(200)'],
      ['ai_risk_level', 'VARCHAR(200)'],
      ['threat_models', 'TEXT'],
      ['bluesky', 'VARCHAR(200)'],
      ['submitter_relationship', 'VARCHAR(200)'],
      ['is_self_submission', 'BOOLEAN DEFAULT FALSE'],
    ];
    for (const [col, type] of peopleNewCols) {
      await client.query(`ALTER TABLE people ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      console.log(`    + people.${col}`);
    }

    // --- Organizations ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(200),
        website VARCHAR(200),
        location VARCHAR(200),
        funding_model VARCHAR(200),
        regulatory_stance VARCHAR(200),
        evidence_source VARCHAR(200),
        agi_timeline VARCHAR(200),
        ai_risk_level VARCHAR(200),
        threat_models TEXT,
        influence_type TEXT,
        twitter VARCHAR(200),
        bluesky VARCHAR(200),
        notes TEXT,
        submitter_email VARCHAR(200),
        submitter_relationship VARCHAR(200),
        is_self_submission BOOLEAN DEFAULT FALSE,
        last_verified VARCHAR(50),
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  ✓ organizations table exists');

    const orgsNewCols = [
      ['evidence_source', 'VARCHAR(200)'],
      ['agi_timeline', 'VARCHAR(200)'],
      ['ai_risk_level', 'VARCHAR(200)'],
      ['threat_models', 'TEXT'],
      ['bluesky', 'VARCHAR(200)'],
      ['submitter_relationship', 'VARCHAR(200)'],
      ['is_self_submission', 'BOOLEAN DEFAULT FALSE'],
      ['last_verified', 'VARCHAR(50)'],
    ];
    for (const [col, type] of orgsNewCols) {
      await client.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      console.log(`    + organizations.${col}`);
    }

    // --- Resources ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS resources (
        id SERIAL PRIMARY KEY,
        title VARCHAR(300) NOT NULL,
        author VARCHAR(200),
        resource_type VARCHAR(100),
        url VARCHAR(500),
        year VARCHAR(10),
        category VARCHAR(200),
        key_argument TEXT,
        notes TEXT,
        submitter_email VARCHAR(200),
        submitter_relationship VARCHAR(200),
        is_self_submission BOOLEAN DEFAULT FALSE,
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  ✓ resources table exists');

    const resourcesNewCols = [
      ['submitter_relationship', 'VARCHAR(200)'],
      ['is_self_submission', 'BOOLEAN DEFAULT FALSE'],
    ];
    for (const [col, type] of resourcesNewCols) {
      await client.query(`ALTER TABLE resources ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      console.log(`    + resources.${col}`);
    }

    // Indexes on status for filtered queries
    await client.query('CREATE INDEX IF NOT EXISTS idx_people_status ON people(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status)');

    console.log('Migration complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
