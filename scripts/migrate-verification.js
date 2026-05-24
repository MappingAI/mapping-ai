import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function migrate() {
  const client = await pool.connect()
  try {
    console.log('Running migration: verification tables\n')

    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_review (
        id              SERIAL PRIMARY KEY,
        entity_id       INTEGER NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
        reviewer_key_id INTEGER NOT NULL REFERENCES contributor_keys(id),
        verdict         VARCHAR(20) NOT NULL,
        notes           TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(entity_id, reviewer_key_id)
      )
    `)
    console.log('  ✓ verification_review')

    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_correction (
        id                   SERIAL PRIMARY KEY,
        entity_id            INTEGER NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
        reviewer_key_id      INTEGER NOT NULL REFERENCES contributor_keys(id),
        field_name           VARCHAR(100),
        claim_id             TEXT,
        edge_id              INTEGER,
        error_type           VARCHAR(30),
        original_value       TEXT,
        corrected_value      TEXT,
        correction_note      TEXT,
        correction_note_html TEXT,
        source_accessible    BOOLEAN,
        quote_found          BOOLEAN,
        conclusion_supported BOOLEAN,
        created_at           TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('  ✓ verification_correction')

    await client.query(`CREATE INDEX IF NOT EXISTS idx_vc_entity ON verification_correction(entity_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vc_reviewer ON verification_correction(reviewer_key_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vr_entity ON verification_review(entity_id)`)
    console.log('  ✓ indexes')

    console.log('\nVerification tables created successfully.')
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
