/**
 * Export database data for consultant trial.
 *
 * Outputs DB-format JSON (not frontend-transformed) so consultants
 * can see actual column names and provide data in the same format.
 *
 * Usage:
 *   node scripts/export-trial-data.js
 *
 * Outputs:
 *   docs/trial/entities.json
 *   docs/trial/edges.json
 */
import pg from 'pg';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Fields to exclude from export (sensitive or internal)
const EXCLUDE_FIELDS = new Set([
  'search_vector',
  'created_at',
  'updated_at',
]);

function cleanRow(row) {
  const clean = {};
  for (const [key, value] of Object.entries(row)) {
    if (!EXCLUDE_FIELDS.has(key)) {
      clean[key] = value;
    }
  }
  return clean;
}

async function exportTrialData() {
  const client = await pool.connect();

  try {
    console.log('Exporting trial data (DB format)...\n');

    // Ensure output directory exists
    const outDir = path.join(process.cwd(), 'docs', 'trial');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Export entities (approved only, with DB column names)
    // Excludes internal fields: wavg scores, enrichment_version, notes_html
    const entities = await client.query(`
      SELECT
        id,
        entity_type,
        name,
        title,
        category,
        other_categories,
        primary_org,
        other_orgs,
        website,
        funding_model,
        parent_org_id,
        location,
        influence_type,
        twitter,
        bluesky,
        notes,
        notes_sources,
        thumbnail_url,
        -- Belief fields (DB names)
        belief_regulatory_stance,
        belief_regulatory_stance_detail,
        belief_evidence_source,
        belief_agi_timeline,
        belief_ai_risk,
        belief_threat_models,
        -- Resource fields
        resource_title,
        resource_category,
        resource_author,
        resource_type,
        resource_url,
        resource_year,
        resource_key_argument
      FROM entity
      WHERE status = 'approved'
      ORDER BY entity_type, id
    `);

    // Export edges (all columns)
    const edges = await client.query(`
      SELECT
        e.id,
        e.source_id,
        e.target_id,
        e.edge_type,
        e.role,
        e.is_primary,
        e.start_date,
        e.end_date,
        e.evidence,
        e.source_url,
        e.confidence,
        e.created_by,
        -- Include entity names for readability
        src.name AS source_name,
        src.entity_type AS source_entity_type,
        tgt.name AS target_name,
        tgt.entity_type AS target_entity_type
      FROM edge e
      JOIN entity src ON src.id = e.source_id
      JOIN entity tgt ON tgt.id = e.target_id
      ORDER BY e.id
    `);

    // Group entities by type for easier browsing
    const entitiesByType = {
      people: [],
      organizations: [],
      resources: [],
    };

    for (const row of entities.rows) {
      const clean = cleanRow(row);
      if (row.entity_type === 'person') entitiesByType.people.push(clean);
      else if (row.entity_type === 'organization') entitiesByType.organizations.push(clean);
      else if (row.entity_type === 'resource') entitiesByType.resources.push(clean);
    }

    const entityData = {
      _meta: {
        generated_at: new Date().toISOString(),
        format: 'database',
        note: 'Field names match database columns. Use these names in your submissions.',
      },
      counts: {
        people: entitiesByType.people.length,
        organizations: entitiesByType.organizations.length,
        resources: entitiesByType.resources.length,
      },
      ...entitiesByType,
    };

    const edgeData = {
      _meta: {
        generated_at: new Date().toISOString(),
        format: 'database',
        note: 'Edges flow from source_id to target_id. source_name/target_name included for readability.',
      },
      count: edges.rows.length,
      edges: edges.rows.map(cleanRow),
    };

    // Write files
    const entitiesPath = path.join(outDir, 'entities.json');
    const edgesPath = path.join(outDir, 'edges.json');

    fs.writeFileSync(entitiesPath, JSON.stringify(entityData, null, 2));
    fs.writeFileSync(edgesPath, JSON.stringify(edgeData, null, 2));

    console.log(`  ✓ ${entitiesByType.people.length} people`);
    console.log(`  ✓ ${entitiesByType.organizations.length} organizations`);
    console.log(`  ✓ ${entitiesByType.resources.length} resources`);
    console.log(`  ✓ ${edges.rows.length} edges`);
    console.log('');
    console.log(`Written to:`);
    console.log(`  ${entitiesPath}`);
    console.log(`  ${edgesPath}`);

  } finally {
    client.release();
    await pool.end();
  }
}

exportTrialData().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
