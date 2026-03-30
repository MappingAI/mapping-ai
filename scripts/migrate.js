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
    console.log('Creating/updating tables...\n');

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
        regulatory_stance_detail TEXT,
        evidence_source VARCHAR(200),
        agi_timeline VARCHAR(200),
        ai_risk_level VARCHAR(200),
        threat_models TEXT,
        threat_models_detail TEXT,
        influence_type TEXT,
        twitter VARCHAR(200),
        bluesky VARCHAR(200),
        notes TEXT,
        submission_count INTEGER DEFAULT 1,
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
      ['threat_models_detail', 'TEXT'],
      ['bluesky', 'VARCHAR(200)'],
      ['submitter_relationship', 'VARCHAR(200)'],
      ['is_self_submission', 'BOOLEAN DEFAULT FALSE'],
      ['regulatory_stance_detail', 'TEXT'],
      ['submission_count', 'INTEGER DEFAULT 1'],
      ['thumbnail_url', 'VARCHAR(500)'],
      ['unreviewed_submissions', 'INTEGER DEFAULT 0'],
      ['weighted_stance_score', 'REAL'],
      ['weighted_timeline_score', 'REAL'],
      ['weighted_risk_score', 'REAL'],
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
        regulatory_stance_detail TEXT,
        evidence_source VARCHAR(200),
        agi_timeline VARCHAR(200),
        ai_risk_level VARCHAR(200),
        threat_models TEXT,
        threat_models_detail TEXT,
        influence_type TEXT,
        twitter VARCHAR(200),
        bluesky VARCHAR(200),
        notes TEXT,
        parent_org_id INTEGER REFERENCES organizations(id),
        submission_count INTEGER DEFAULT 1,
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
      ['threat_models_detail', 'TEXT'],
      ['bluesky', 'VARCHAR(200)'],
      ['submitter_relationship', 'VARCHAR(200)'],
      ['is_self_submission', 'BOOLEAN DEFAULT FALSE'],
      ['last_verified', 'VARCHAR(50)'],
      ['parent_org_id', 'INTEGER REFERENCES organizations(id)'],
      ['regulatory_stance_detail', 'TEXT'],
      ['submission_count', 'INTEGER DEFAULT 1'],
      ['thumbnail_url', 'VARCHAR(500)'],
      ['unreviewed_submissions', 'INTEGER DEFAULT 0'],
      ['weighted_stance_score', 'REAL'],
      ['weighted_timeline_score', 'REAL'],
      ['weighted_risk_score', 'REAL'],
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
        submission_count INTEGER DEFAULT 1,
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
      ['submission_count', 'INTEGER DEFAULT 1'],
      ['regulatory_stance', 'VARCHAR(200)'],
      ['agi_timeline', 'VARCHAR(200)'],
      ['ai_risk_level', 'VARCHAR(200)'],
    ];
    for (const [col, type] of resourcesNewCols) {
      await client.query(`ALTER TABLE resources ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      console.log(`    + resources.${col}`);
    }

    // --- Relationships (polymorphic) ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS relationships (
        id SERIAL PRIMARY KEY,
        source_type VARCHAR(20) NOT NULL,
        source_id INTEGER NOT NULL,
        target_type VARCHAR(20) NOT NULL,
        target_id INTEGER NOT NULL,
        relationship_type VARCHAR(50),
        evidence TEXT,
        created_by VARCHAR(50) DEFAULT 'system',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(source_type, source_id, target_type, target_id, relationship_type)
      )
    `);
    console.log('  ✓ relationships table exists');

    // --- Person-Organization junction ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS person_organizations (
        id SERIAL PRIMARY KEY,
        person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        role VARCHAR(200),
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(person_id, organization_id)
      )
    `);
    console.log('  ✓ person_organizations table exists');

    // --- Submissions (versioned form submissions) ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(20) NOT NULL,
        entity_id INTEGER,
        data JSONB NOT NULL,
        submitter_email VARCHAR(200),
        submitter_relationship VARCHAR(200),
        is_self_submission BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'pending',
        notes_html TEXT,
        notes_mentions JSONB,
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        reviewed_by VARCHAR(200)
      )
    `);
    console.log('  ✓ submissions table exists');
    await client.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS llm_review JSONB`);
    console.log('    + submissions.llm_review');
    await client.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS resolution_notes TEXT`);
    console.log('    + submissions.resolution_notes');

    // --- Indexes ---
    console.log('\nCreating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_people_status ON people(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_rel_source ON relationships(source_type, source_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_rel_target ON relationships(target_type, target_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_person_orgs_person ON person_organizations(person_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_person_orgs_org ON person_organizations(organization_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_submissions_entity ON submissions(entity_type, entity_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status)');
    console.log('  ✓ indexes created');

    // --- Full-text search ---
    console.log('\nSetting up full-text search...');

    // Add tsvector columns (idempotent)
    await client.query('ALTER TABLE people ADD COLUMN IF NOT EXISTS search_vector tsvector');
    await client.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS search_vector tsvector');
    await client.query('ALTER TABLE resources ADD COLUMN IF NOT EXISTS search_vector tsvector');

    // Create trigger functions
    await client.query(`
      CREATE OR REPLACE FUNCTION update_people_search() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := to_tsvector('english',
          coalesce(NEW.name, '') || ' ' ||
          coalesce(NEW.title, '') || ' ' ||
          coalesce(NEW.primary_org, '') || ' ' ||
          coalesce(NEW.other_orgs, '') || ' ' ||
          coalesce(NEW.category, '') || ' ' ||
          coalesce(NEW.notes, '')
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_organizations_search() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := to_tsvector('english',
          coalesce(NEW.name, '') || ' ' ||
          coalesce(NEW.website, '') || ' ' ||
          coalesce(NEW.category, '') || ' ' ||
          coalesce(NEW.notes, '')
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_resources_search() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := to_tsvector('english',
          coalesce(NEW.title, '') || ' ' ||
          coalesce(NEW.author, '') || ' ' ||
          coalesce(NEW.category, '') || ' ' ||
          coalesce(NEW.key_argument, '') || ' ' ||
          coalesce(NEW.notes, '')
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Create triggers (drop first to make idempotent)
    await client.query('DROP TRIGGER IF EXISTS people_search_update ON people');
    await client.query(`
      CREATE TRIGGER people_search_update
      BEFORE INSERT OR UPDATE ON people
      FOR EACH ROW EXECUTE FUNCTION update_people_search()
    `);

    await client.query('DROP TRIGGER IF EXISTS organizations_search_update ON organizations');
    await client.query(`
      CREATE TRIGGER organizations_search_update
      BEFORE INSERT OR UPDATE ON organizations
      FOR EACH ROW EXECUTE FUNCTION update_organizations_search()
    `);

    await client.query('DROP TRIGGER IF EXISTS resources_search_update ON resources');
    await client.query(`
      CREATE TRIGGER resources_search_update
      BEFORE INSERT OR UPDATE ON resources
      FOR EACH ROW EXECUTE FUNCTION update_resources_search()
    `);

    // GIN indexes for fast full-text search
    await client.query('CREATE INDEX IF NOT EXISTS idx_people_search ON people USING GIN(search_vector)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_organizations_search ON organizations USING GIN(search_vector)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_resources_search ON resources USING GIN(search_vector)');
    console.log('  ✓ full-text search configured');

    // --- Backfill search vectors for existing rows ---
    // --- Disagreement score columns ---
    console.log('\nAdding disagreement framework columns...');
    for (const table of ['people', 'organizations']) {
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS disagreement_score REAL DEFAULT 0`);
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS consensus_stance VARCHAR(200)`);
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS consensus_risk VARCHAR(200)`);
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS consensus_timeline VARCHAR(200)`);
      console.log(`  ✓ ${table} disagreement columns`);
    }

    console.log('\nBackfilling search vectors...');
    await client.query(`
      UPDATE people SET search_vector = to_tsvector('english',
        coalesce(name, '') || ' ' ||
        coalesce(title, '') || ' ' ||
        coalesce(primary_org, '') || ' ' ||
        coalesce(other_orgs, '') || ' ' ||
        coalesce(category, '') || ' ' ||
        coalesce(notes, '')
      ) WHERE search_vector IS NULL
    `);
    await client.query(`
      UPDATE organizations SET search_vector = to_tsvector('english',
        coalesce(name, '') || ' ' ||
        coalesce(website, '') || ' ' ||
        coalesce(category, '') || ' ' ||
        coalesce(notes, '')
      ) WHERE search_vector IS NULL
    `);
    await client.query(`
      UPDATE resources SET search_vector = to_tsvector('english',
        coalesce(title, '') || ' ' ||
        coalesce(author, '') || ' ' ||
        coalesce(category, '') || ' ' ||
        coalesce(key_argument, '') || ' ' ||
        coalesce(notes, '')
      ) WHERE search_vector IS NULL
    `);
    console.log('  ✓ search vectors backfilled');

    console.log('\nMigration complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
