import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// JSONB columns need to be stringified when copying between databases
const JSONB_COLUMNS = new Set(['llm_review', 'notes_mentions']);

function prepareValue(colName, value) {
  if (value === null || value === undefined) return value;
  if (JSONB_COLUMNS.has(colName) && typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

// Production connection
const prodPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Parse production URL to build staging URL
const prodUrl = new URL(process.env.DATABASE_URL);
const stagingUrl = new URL(process.env.DATABASE_URL);
stagingUrl.pathname = '/mapping_ai_staging';
// Use admin user to setup, connor_staging will have access via grants
// stagingUrl.username = 'connor_staging';
// stagingUrl.password = process.env.STAGING_PASSWORD;

const stagingPool = new Pool({
  connectionString: stagingUrl.toString(),
  ssl: { rejectUnauthorized: false },
});

async function setupStaging() {
  const prodClient = await prodPool.connect();
  const stagingClient = await stagingPool.connect();

  try {
    console.log('Setting up staging database...\n');

    // ── 1. Drop and recreate tables ─────────────────────────────────────────
    console.log('1. Creating schema (mirroring production)...');

    await stagingClient.query(`
      DROP TABLE IF EXISTS edge CASCADE;
      DROP TABLE IF EXISTS submission CASCADE;
      DROP TABLE IF EXISTS entity CASCADE;
    `);

    // Get entity table DDL from production and recreate
    const entityCols = await prodClient.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'entity' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    let entityDDL = 'CREATE TABLE entity (\n';
    const colDefs = entityCols.rows.map(col => {
      let def = `  ${col.column_name} `;
      if (col.column_name === 'id') {
        def += 'SERIAL PRIMARY KEY';
      } else if (col.data_type === 'character varying') {
        def += col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'TEXT';
      } else if (col.data_type === 'timestamp with time zone') {
        def += 'TIMESTAMPTZ';
        if (col.column_default) def += ' DEFAULT NOW()';
      } else if (col.data_type === 'tsvector') {
        def += 'TSVECTOR';
      } else if (col.data_type === 'real') {
        def += 'REAL';
      } else if (col.data_type === 'smallint') {
        def += 'SMALLINT';
      } else if (col.data_type === 'integer') {
        def += 'INTEGER';
        if (col.column_default && col.column_name !== 'id') def += ` DEFAULT ${col.column_default}`;
      } else if (col.data_type === 'boolean') {
        def += 'BOOLEAN';
        if (col.column_default) def += ` DEFAULT ${col.column_default}`;
      } else {
        def += 'TEXT';
      }
      return def;
    });
    entityDDL += colDefs.join(',\n') + '\n)';

    await stagingClient.query(entityDDL);
    console.log('   - entity table created');

    // Get submission table DDL
    const submissionCols = await prodClient.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'submission' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    let submissionDDL = 'CREATE TABLE submission (\n';
    const subColDefs = submissionCols.rows.map(col => {
      let def = `  ${col.column_name} `;
      if (col.column_name === 'id') {
        def += 'SERIAL PRIMARY KEY';
      } else if (col.data_type === 'character varying') {
        def += col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'TEXT';
      } else if (col.data_type === 'timestamp with time zone') {
        def += 'TIMESTAMPTZ';
        if (col.column_default) def += ' DEFAULT NOW()';
      } else if (col.data_type === 'jsonb') {
        def += 'JSONB';
      } else if (col.data_type === 'smallint') {
        def += 'SMALLINT';
      } else if (col.data_type === 'integer') {
        def += 'INTEGER';
      } else {
        def += 'TEXT';
      }
      return def;
    });
    submissionDDL += subColDefs.join(',\n') + '\n)';

    await stagingClient.query(submissionDDL);
    console.log('   - submission table created');

    // Get edge table DDL
    const edgeCols = await prodClient.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'edge' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    let edgeDDL = 'CREATE TABLE edge (\n';
    const edgeColDefs = edgeCols.rows.map(col => {
      let def = `  ${col.column_name} `;
      if (col.column_name === 'id') {
        def += 'SERIAL PRIMARY KEY';
      } else if (col.column_name === 'source_id' || col.column_name === 'target_id') {
        def += 'INTEGER NOT NULL';
      } else if (col.data_type === 'character varying') {
        def += col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'TEXT';
      } else if (col.data_type === 'timestamp with time zone') {
        def += 'TIMESTAMPTZ';
        if (col.column_default) def += ' DEFAULT NOW()';
      } else if (col.data_type === 'boolean') {
        def += 'BOOLEAN';
        if (col.column_default) def += ` DEFAULT ${col.column_default}`;
      } else if (col.data_type === 'integer') {
        def += 'INTEGER';
      } else if (col.data_type === 'smallint') {
        def += 'SMALLINT';
      } else {
        def += 'TEXT';
      }
      return def;
    });
    edgeDDL += edgeColDefs.join(',\n') + '\n)';

    await stagingClient.query(edgeDDL);
    console.log('   - edge table created');

    // Create indexes
    await stagingClient.query(`
      CREATE INDEX IF NOT EXISTS idx_entity_type ON entity(entity_type);
      CREATE INDEX IF NOT EXISTS idx_entity_status ON entity(status);
      CREATE INDEX IF NOT EXISTS idx_entity_search ON entity USING GIN(search_vector);
      CREATE INDEX IF NOT EXISTS idx_edge_source ON edge(source_id);
      CREATE INDEX IF NOT EXISTS idx_edge_target ON edge(target_id);
      CREATE INDEX IF NOT EXISTS idx_submission_status ON submission(status);
    `);
    console.log('   - indexes created');

    // ── 2. Copy data from production ────────────────────────────────────────
    console.log('\n2. Copying data from production...');

    // Copy entities
    const entities = await prodClient.query('SELECT * FROM entity ORDER BY id');
    console.log(`   - Found ${entities.rows.length} entities`);

    if (entities.rows.length > 0) {
      const cols = Object.keys(entities.rows[0]);
      const colList = cols.join(', ');

      // Batch insert for performance
      for (const row of entities.rows) {
        const values = cols.map(c => row[c]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        await stagingClient.query(`INSERT INTO entity (${colList}) VALUES (${placeholders})`, values);
      }
      console.log(`   - Inserted ${entities.rows.length} entities`);
      await stagingClient.query(`SELECT setval('entity_id_seq', (SELECT COALESCE(MAX(id), 1) FROM entity))`);
    }

    // Copy edges
    const edges = await prodClient.query('SELECT * FROM edge ORDER BY id');
    console.log(`   - Found ${edges.rows.length} edges`);

    if (edges.rows.length > 0) {
      const cols = Object.keys(edges.rows[0]);
      const colList = cols.join(', ');

      for (const row of edges.rows) {
        const values = cols.map(c => row[c]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        await stagingClient.query(`INSERT INTO edge (${colList}) VALUES (${placeholders})`, values);
      }
      console.log(`   - Inserted ${edges.rows.length} edges`);
      await stagingClient.query(`SELECT setval('edge_id_seq', (SELECT COALESCE(MAX(id), 1) FROM edge))`);
    }

    // Copy submissions
    const submissions = await prodClient.query('SELECT * FROM submission ORDER BY id');
    console.log(`   - Found ${submissions.rows.length} submissions`);

    if (submissions.rows.length > 0) {
      const cols = Object.keys(submissions.rows[0]);
      const colList = cols.join(', ');

      for (const row of submissions.rows) {
        const values = cols.map(c => prepareValue(c, row[c]));
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        await stagingClient.query(`INSERT INTO submission (${colList}) VALUES (${placeholders})`, values);
      }
      console.log(`   - Inserted ${submissions.rows.length} submissions`);
      await stagingClient.query(`SELECT setval('submission_id_seq', (SELECT COALESCE(MAX(id), 1) FROM submission))`);
    }

    // ── 3. Verify ───────────────────────────────────────────────────────────
    console.log('\n3. Verifying staging data...');
    const counts = await stagingClient.query(`
      SELECT
        (SELECT COUNT(*) FROM entity) as entities,
        (SELECT COUNT(*) FROM edge) as edges,
        (SELECT COUNT(*) FROM submission) as submissions
    `);
    console.log('   Staging database counts:', counts.rows[0]);

    console.log('\n✓ Staging database setup complete!');

    // Build connection string for Connor
    const connorUrl = new URL(process.env.DATABASE_URL);
    connorUrl.pathname = '/mapping_ai_staging';
    connorUrl.username = 'connor_staging';
    connorUrl.password = process.env.STAGING_PASSWORD || '***';

    console.log('\nConnection details for Connor:');
    console.log('  Database: mapping_ai_staging');
    console.log('  User: connor_staging');
    console.log('  Host:', connorUrl.hostname);
    console.log('  Port:', connorUrl.port || 5432);

  } finally {
    prodClient.release();
    stagingClient.release();
    await prodPool.end();
    await stagingPool.end();
  }
}

setupStaging().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
