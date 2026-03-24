import { sql } from '@vercel/postgres';
import 'dotenv/config';

async function migrate() {
  console.log('Creating/updating tables...');

  // People table with new fields
  await sql`
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
      is_self_submission BOOLEAN DEFAULT FALSE,
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✓ people table exists');

  // Add new columns to people if they don't exist
  const peopleNewCols = [
    ['evidence_source', 'VARCHAR(200)'],
    ['agi_timeline', 'VARCHAR(200)'],
    ['ai_risk_level', 'VARCHAR(200)'],
    ['threat_models', 'TEXT'],
    ['bluesky', 'VARCHAR(200)'],
    ['is_self_submission', 'BOOLEAN DEFAULT FALSE'],
    ['submitter_relationship', 'VARCHAR(200)']
  ];
  for (const [col, type] of peopleNewCols) {
    try {
      await sql.query(`ALTER TABLE people ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      console.log(`    + people.${col}`);
    } catch (e) {
      // Column might already exist
    }
  }

  // Organizations table with new fields
  await sql`
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
      is_self_submission BOOLEAN DEFAULT FALSE,
      last_verified VARCHAR(50),
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✓ organizations table exists');

  // Add new columns to organizations if they don't exist
  const orgsNewCols = [
    ['evidence_source', 'VARCHAR(200)'],
    ['agi_timeline', 'VARCHAR(200)'],
    ['ai_risk_level', 'VARCHAR(200)'],
    ['threat_models', 'TEXT'],
    ['bluesky', 'VARCHAR(200)'],
    ['is_self_submission', 'BOOLEAN DEFAULT FALSE'],
    ['submitter_relationship', 'VARCHAR(200)'],
    ['last_verified', 'VARCHAR(50)']
  ];
  for (const [col, type] of orgsNewCols) {
    try {
      await sql.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      console.log(`    + organizations.${col}`);
    } catch (e) {
      // Column might already exist
    }
  }

  // Resources table (unchanged structure)
  await sql`
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
      is_self_submission BOOLEAN DEFAULT FALSE,
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✓ resources table exists');

  // Add columns to resources if they don't exist
  try {
    await sql.query(`ALTER TABLE resources ADD COLUMN IF NOT EXISTS is_self_submission BOOLEAN DEFAULT FALSE`);
    console.log('    + resources.is_self_submission');
  } catch (e) {}
  try {
    await sql.query(`ALTER TABLE resources ADD COLUMN IF NOT EXISTS submitter_relationship VARCHAR(200)`);
    console.log('    + resources.submitter_relationship');
  } catch (e) {}

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_people_status ON people(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status)`;

  console.log('Migration complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
