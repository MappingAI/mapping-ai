import { sql } from '@vercel/postgres';
import 'dotenv/config';

async function migrate() {
  console.log('Creating tables...');

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
      capability_belief VARCHAR(200),
      influence_type VARCHAR(200),
      twitter VARCHAR(200),
      notes TEXT,
      submitter_email VARCHAR(200),
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✓ people');

  await sql`
    CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      category VARCHAR(200),
      website VARCHAR(200),
      location VARCHAR(200),
      funding_model VARCHAR(200),
      regulatory_stance VARCHAR(200),
      capability_belief VARCHAR(200),
      influence_type VARCHAR(200),
      twitter VARCHAR(200),
      notes TEXT,
      submitter_email VARCHAR(200),
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✓ organizations');

  // Index on status for filtered queries
  await sql`CREATE INDEX IF NOT EXISTS idx_people_status ON people(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status)`;

  console.log('Migration complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
