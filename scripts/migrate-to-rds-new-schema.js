/**
 * Migration script: Merge Neon + RDS data → RDS with new 3-table schema
 *
 * This script:
 * 1. Exports data from both Neon and RDS (old 6-table schema)
 * 2. Merges them intelligently (Neon's enrichments + RDS's extra relationships)
 * 3. Creates the new 3-table schema on RDS
 * 4. Transforms and imports data into new schema
 */

import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Connection strings - NEVER hardcode credentials, use environment variables
const NEON_URL = process.env.DATABASE_URL; // Current .env points to Neon
const RDS_URL = process.env.RDS_DATABASE_URL; // Set in .env, never commit

const neonPool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });
const rdsPool = new Pool({ connectionString: RDS_URL, ssl: { rejectUnauthorized: false } });

// Score mappings for the new schema
const STANCE_SCORES = {
  'Accelerate': 1, 'Light-touch': 2, 'Targeted': 3, 'Moderate': 4,
  'Restrictive': 5, 'Precautionary': 6, 'Nationalize': 7
};
const TIMELINE_SCORES = {
  'Already here': 1, '2-3 years': 2, 'Within 2-3 years': 2,
  '5-10 years': 3, '10-25 years': 4, '25+ years or never': 5
};
const RISK_SCORES = {
  'Overstated': 1, 'Manageable': 2, 'Serious': 3,
  'Catastrophic': 4, 'Potentially catastrophic': 4, 'Existential': 5
};

async function exportFromDB(pool, name) {
  const client = await pool.connect();
  try {
    console.log(`\nExporting from ${name}...`);
    const data = {};

    for (const table of ['people', 'organizations', 'resources', 'submissions', 'relationships', 'person_organizations']) {
      const res = await client.query(`SELECT * FROM ${table}`);
      data[table] = res.rows;
      console.log(`  ${table}: ${res.rows.length} rows`);
    }

    return data;
  } finally {
    client.release();
  }
}

function mergeData(neonData, rdsData) {
  console.log('\nMerging data...');
  const merged = {
    people: [],
    organizations: [],
    resources: [],
    submissions: [],
    relationships: [],
    person_organizations: []
  };

  // Helper: create lookup by name (lowercase)
  const byName = (arr, field = 'name') => {
    const map = {};
    arr.forEach(r => {
      const key = (r[field] || '').toLowerCase().trim();
      if (key) map[key] = r;
    });
    return map;
  };

  // Merge people: prefer Neon's enriched data, but keep RDS-only entries
  const neonPeople = byName(neonData.people);
  const rdsPeople = byName(rdsData.people);
  const allPeopleNames = new Set([...Object.keys(neonPeople), ...Object.keys(rdsPeople)]);

  allPeopleNames.forEach(name => {
    const neon = neonPeople[name];
    const rds = rdsPeople[name];

    if (neon && rds) {
      // Both have it - prefer Neon if it has more enrichment
      const neonEnriched = !!(neon.regulatory_stance || neon.agi_timeline);
      const rdsEnriched = !!(rds.regulatory_stance || rds.agi_timeline);
      merged.people.push(neonEnriched ? neon : rds);
    } else {
      merged.people.push(neon || rds);
    }
  });
  console.log(`  People: ${merged.people.length} (Neon: ${neonData.people.length}, RDS: ${rdsData.people.length})`);

  // Merge organizations: same logic
  const neonOrgs = byName(neonData.organizations);
  const rdsOrgs = byName(rdsData.organizations);
  const allOrgNames = new Set([...Object.keys(neonOrgs), ...Object.keys(rdsOrgs)]);

  allOrgNames.forEach(name => {
    const neon = neonOrgs[name];
    const rds = rdsOrgs[name];

    if (neon && rds) {
      const neonEnriched = !!(neon.regulatory_stance);
      merged.organizations.push(neonEnriched ? neon : rds);
    } else {
      merged.organizations.push(neon || rds);
    }
  });
  console.log(`  Organizations: ${merged.organizations.length} (Neon: ${neonData.organizations.length}, RDS: ${rdsData.organizations.length})`);

  // Merge resources: use title as key
  const neonResources = byName(neonData.resources, 'title');
  const rdsResources = byName(rdsData.resources, 'title');
  const allResourceTitles = new Set([...Object.keys(neonResources), ...Object.keys(rdsResources)]);

  allResourceTitles.forEach(title => {
    merged.resources.push(neonResources[title] || rdsResources[title]);
  });
  console.log(`  Resources: ${merged.resources.length} (Neon: ${neonData.resources.length}, RDS: ${rdsData.resources.length})`);

  // Submissions: combine both (they likely have different IDs but that's OK)
  merged.submissions = [...neonData.submissions];
  console.log(`  Submissions: ${merged.submissions.length} (from Neon)`);

  // Relationships: combine and dedupe
  const relKey = r => `${r.source_type}:${r.source_id}:${r.target_type}:${r.target_id}:${r.relationship_type}`;
  const seenRels = new Set();
  [...rdsData.relationships, ...neonData.relationships].forEach(r => {
    const key = relKey(r);
    if (!seenRels.has(key)) {
      seenRels.add(key);
      merged.relationships.push(r);
    }
  });
  console.log(`  Relationships: ${merged.relationships.length} (Neon: ${neonData.relationships.length}, RDS: ${rdsData.relationships.length})`);

  // Person-organizations: combine and dedupe
  const poKey = r => `${r.person_id}:${r.organization_id}`;
  const seenPO = new Set();
  [...rdsData.person_organizations, ...neonData.person_organizations].forEach(r => {
    const key = poKey(r);
    if (!seenPO.has(key)) {
      seenPO.add(key);
      merged.person_organizations.push(r);
    }
  });
  console.log(`  Person-organizations: ${merged.person_organizations.length} (Neon: ${neonData.person_organizations.length}, RDS: ${rdsData.person_organizations.length})`);

  return merged;
}

async function createNewSchema(client) {
  console.log('\nCreating new 3-table schema on RDS...');

  // Drop old tables (we have backups)
  await client.query('DROP TABLE IF EXISTS person_organizations CASCADE');
  await client.query('DROP TABLE IF EXISTS relationships CASCADE');
  await client.query('DROP TABLE IF EXISTS submissions CASCADE');
  await client.query('DROP TABLE IF EXISTS resources CASCADE');
  await client.query('DROP TABLE IF EXISTS organizations CASCADE');
  await client.query('DROP TABLE IF EXISTS people CASCADE');
  console.log('  Dropped old tables');

  // Create entity table
  await client.query(`
    CREATE TABLE entity (
      id                              SERIAL PRIMARY KEY,
      entity_type                     VARCHAR(50) NOT NULL,
      name                            TEXT,
      title                           TEXT,
      category                        TEXT,
      primary_org                     TEXT,
      other_orgs                      TEXT,
      website                         TEXT,
      funding_model                   TEXT,
      parent_org_id                   INTEGER REFERENCES entity(id),
      resource_title                  TEXT,
      resource_category               TEXT,
      resource_author                 TEXT,
      resource_type                   TEXT,
      resource_url                    TEXT,
      resource_year                   VARCHAR(20),
      resource_key_argument           TEXT,
      location                        TEXT,
      influence_type                  TEXT,
      twitter                         TEXT,
      bluesky                         TEXT,
      notes                           TEXT,
      thumbnail_url                   TEXT,
      belief_regulatory_stance        TEXT,
      belief_regulatory_stance_detail TEXT,
      belief_evidence_source          TEXT,
      belief_agi_timeline             TEXT,
      belief_ai_risk                  TEXT,
      belief_threat_models            TEXT,
      belief_regulatory_stance_wavg   REAL,
      belief_regulatory_stance_wvar   REAL,
      belief_regulatory_stance_n      INTEGER DEFAULT 0,
      belief_agi_timeline_wavg        REAL,
      belief_agi_timeline_wvar        REAL,
      belief_agi_timeline_n           INTEGER DEFAULT 0,
      belief_ai_risk_wavg             REAL,
      belief_ai_risk_wvar             REAL,
      belief_ai_risk_n                INTEGER DEFAULT 0,
      submission_count                INTEGER DEFAULT 0,
      status                          VARCHAR(20) DEFAULT 'approved',
      created_at                      TIMESTAMPTZ DEFAULT NOW(),
      updated_at                      TIMESTAMPTZ DEFAULT NOW(),
      search_vector                   tsvector
    )
  `);
  console.log('  Created entity table');

  // Create submission table
  await client.query(`
    CREATE TABLE submission (
      id                               SERIAL PRIMARY KEY,
      entity_type                      VARCHAR(50) NOT NULL,
      entity_id                        INTEGER REFERENCES entity(id),
      submitter_email                  TEXT,
      submitter_relationship           VARCHAR(50),
      name                             TEXT,
      title                            TEXT,
      category                         TEXT,
      primary_org                      TEXT,
      other_orgs                       TEXT,
      website                          TEXT,
      funding_model                    TEXT,
      resource_title                   TEXT,
      resource_category                TEXT,
      resource_author                  TEXT,
      resource_type                    TEXT,
      resource_url                     TEXT,
      resource_year                    VARCHAR(20),
      resource_key_argument            TEXT,
      location                         TEXT,
      influence_type                   TEXT,
      twitter                          TEXT,
      bluesky                          TEXT,
      notes                            TEXT,
      notes_html                       TEXT,
      notes_mentions                   JSONB,
      belief_regulatory_stance         TEXT,
      belief_regulatory_stance_score   SMALLINT,
      belief_regulatory_stance_detail  TEXT,
      belief_evidence_source           TEXT,
      belief_agi_timeline              TEXT,
      belief_agi_timeline_score        SMALLINT,
      belief_ai_risk                   TEXT,
      belief_ai_risk_score             SMALLINT,
      belief_threat_models             TEXT,
      status                           VARCHAR(50) DEFAULT 'pending',
      llm_review                       JSONB,
      resolution_notes                 TEXT,
      submitted_at                     TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at                      TIMESTAMPTZ,
      reviewed_by                      VARCHAR(200)
    )
  `);
  console.log('  Created submission table');

  // Create edge table
  await client.query(`
    CREATE TABLE edge (
      id           SERIAL PRIMARY KEY,
      source_id    INTEGER NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
      target_id    INTEGER NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
      edge_type    TEXT,
      role         TEXT,
      is_primary   BOOLEAN DEFAULT FALSE,
      evidence     TEXT,
      created_by   VARCHAR(50) DEFAULT 'system',
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(source_id, target_id, edge_type)
    )
  `);
  console.log('  Created edge table');

  // Create indexes
  await client.query('CREATE INDEX idx_entity_type ON entity(entity_type)');
  await client.query('CREATE INDEX idx_entity_status ON entity(status)');
  await client.query('CREATE INDEX idx_sub_entity ON submission(entity_id)');
  await client.query('CREATE INDEX idx_sub_status ON submission(status)');
  await client.query('CREATE INDEX idx_edge_source ON edge(source_id)');
  await client.query('CREATE INDEX idx_edge_target ON edge(target_id)');
  console.log('  Created indexes');
}

async function importData(client, merged) {
  console.log('\nImporting data into new schema...');

  // ID mappings (old ID -> new entity ID)
  const personIdMap = {};
  const orgIdMap = {};
  const resourceIdMap = {};

  // Import people as entities
  for (const p of merged.people) {
    const res = await client.query(`
      INSERT INTO entity (
        entity_type, name, title, category, primary_org, other_orgs,
        location, influence_type, twitter, bluesky, notes, thumbnail_url,
        belief_regulatory_stance, belief_regulatory_stance_detail,
        belief_evidence_source, belief_agi_timeline, belief_ai_risk,
        belief_threat_models, submission_count, status, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING id
    `, [
      'person', p.name, p.title, p.category, p.primary_org, p.other_orgs,
      p.location, p.influence_type, p.twitter, p.bluesky, p.notes, p.thumbnail_url,
      p.regulatory_stance, p.regulatory_stance_detail,
      p.evidence_source, p.agi_timeline, p.ai_risk_level,
      p.threat_models, p.submission_count || 0, p.status || 'approved', p.created_at || new Date()
    ]);
    personIdMap[p.id] = res.rows[0].id;
  }
  console.log(`  Imported ${merged.people.length} people`);

  // Import organizations as entities
  for (const o of merged.organizations) {
    const res = await client.query(`
      INSERT INTO entity (
        entity_type, name, category, website, location, funding_model,
        influence_type, twitter, bluesky, notes, thumbnail_url,
        belief_regulatory_stance, belief_regulatory_stance_detail,
        belief_evidence_source, belief_agi_timeline, belief_ai_risk,
        belief_threat_models, submission_count, status, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING id
    `, [
      'organization', o.name, o.category, o.website, o.location, o.funding_model,
      o.influence_type, o.twitter, o.bluesky, o.notes, o.thumbnail_url,
      o.regulatory_stance, o.regulatory_stance_detail,
      o.evidence_source, o.agi_timeline, o.ai_risk_level,
      o.threat_models, o.submission_count || 0, o.status || 'approved', o.created_at || new Date()
    ]);
    orgIdMap[o.id] = res.rows[0].id;
  }
  console.log(`  Imported ${merged.organizations.length} organizations`);

  // Import resources as entities
  for (const r of merged.resources) {
    const res = await client.query(`
      INSERT INTO entity (
        entity_type, resource_title, resource_author, resource_type,
        resource_url, resource_year, resource_category, resource_key_argument,
        notes, belief_regulatory_stance, belief_agi_timeline, belief_ai_risk,
        submission_count, status, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id
    `, [
      'resource', r.title, r.author, r.resource_type,
      r.url, r.year, r.category, r.key_argument,
      r.notes, r.regulatory_stance, r.agi_timeline, r.ai_risk_level,
      r.submission_count || 0, r.status || 'approved', r.created_at || new Date()
    ]);
    resourceIdMap[r.id] = res.rows[0].id;
  }
  console.log(`  Imported ${merged.resources.length} resources`);

  // Import person_organizations as edges
  let edgeCount = 0;
  for (const po of merged.person_organizations) {
    const sourceId = personIdMap[po.person_id];
    const targetId = orgIdMap[po.organization_id];
    if (sourceId && targetId) {
      try {
        await client.query(`
          INSERT INTO edge (source_id, target_id, edge_type, role, is_primary, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (source_id, target_id, edge_type) DO NOTHING
        `, [sourceId, targetId, 'affiliated', po.role, po.is_primary, 'migration']);
        edgeCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
  }
  console.log(`  Imported ${edgeCount} person-org edges`);

  // Import relationships as edges
  let relCount = 0;
  for (const rel of merged.relationships) {
    let sourceId, targetId;

    if (rel.source_type === 'person') sourceId = personIdMap[rel.source_id];
    else if (rel.source_type === 'organization') sourceId = orgIdMap[rel.source_id];
    else if (rel.source_type === 'resource') sourceId = resourceIdMap[rel.source_id];

    if (rel.target_type === 'person') targetId = personIdMap[rel.target_id];
    else if (rel.target_type === 'organization') targetId = orgIdMap[rel.target_id];
    else if (rel.target_type === 'resource') targetId = resourceIdMap[rel.target_id];

    if (sourceId && targetId) {
      try {
        await client.query(`
          INSERT INTO edge (source_id, target_id, edge_type, evidence, created_by)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (source_id, target_id, edge_type) DO NOTHING
        `, [sourceId, targetId, rel.relationship_type, rel.evidence, rel.created_by || 'migration']);
        relCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
  }
  console.log(`  Imported ${relCount} relationship edges`);

  // Import submissions (transform old JSONB format to new flat format)
  let subCount = 0;
  for (const s of merged.submissions) {
    const data = s.data || {};
    const entityType = s.entity_type;

    // Map old entity_id to new entity_id
    let newEntityId = null;
    if (s.entity_id) {
      if (entityType === 'person') newEntityId = personIdMap[s.entity_id];
      else if (entityType === 'organization') newEntityId = orgIdMap[s.entity_id];
      else if (entityType === 'resource') newEntityId = resourceIdMap[s.entity_id];
    }

    await client.query(`
      INSERT INTO submission (
        entity_type, entity_id, submitter_email, submitter_relationship,
        name, title, category, primary_org, other_orgs,
        website, funding_model, location, twitter, bluesky, notes, notes_html, notes_mentions,
        belief_regulatory_stance, belief_regulatory_stance_score,
        belief_agi_timeline, belief_agi_timeline_score,
        belief_ai_risk, belief_ai_risk_score,
        status, llm_review, submitted_at, reviewed_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
    `, [
      entityType, newEntityId, s.submitter_email, s.submitter_relationship || (s.is_self_submission ? 'self' : 'external'),
      data.name, data.title, data.category, data.primaryOrg, data.otherOrgs,
      data.website, data.fundingModel, data.location, data.twitter, data.bluesky,
      data.notes, s.notes_html, s.notes_mentions,
      data.regulatoryStance, STANCE_SCORES[data.regulatoryStance] || null,
      data.agiTimeline, TIMELINE_SCORES[data.agiTimeline] || null,
      data.aiRiskLevel, RISK_SCORES[data.aiRiskLevel] || null,
      s.status, s.llm_review, s.submitted_at || new Date(), s.reviewed_at
    ]);
    subCount++;
  }
  console.log(`  Imported ${subCount} submissions`);

  return { personIdMap, orgIdMap, resourceIdMap };
}

async function createTriggers(client) {
  console.log('\nCreating triggers...');

  // Full-text search trigger
  await client.query(`
    CREATE OR REPLACE FUNCTION update_entity_search() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector := to_tsvector('english',
        coalesce(NEW.name, '') || ' ' ||
        coalesce(NEW.title, '') || ' ' ||
        coalesce(NEW.category, '') || ' ' ||
        coalesce(NEW.primary_org, '') || ' ' ||
        coalesce(NEW.resource_title, '') || ' ' ||
        coalesce(NEW.resource_author, '') || ' ' ||
        coalesce(NEW.notes, '')
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await client.query('DROP TRIGGER IF EXISTS trg_entity_search ON entity');
  await client.query(`
    CREATE TRIGGER trg_entity_search
    BEFORE INSERT OR UPDATE ON entity
    FOR EACH ROW EXECUTE FUNCTION update_entity_search()
  `);
  console.log('  Created search trigger');

  // Update search vectors for existing data
  await client.query('UPDATE entity SET updated_at = NOW()');
  console.log('  Updated search vectors');

  await client.query('CREATE INDEX IF NOT EXISTS idx_entity_search ON entity USING GIN(search_vector)');
  console.log('  Created search index');
}

async function main() {
  console.log('=== Migration: Neon + RDS → RDS (New Schema) ===\n');

  try {
    // Step 1: Export from both databases
    const neonData = await exportFromDB(neonPool, 'Neon');
    const rdsData = await exportFromDB(rdsPool, 'RDS');

    // Step 2: Merge data
    const merged = mergeData(neonData, rdsData);

    // Save backup
    const fs = await import('fs');
    fs.writeFileSync('data/migration-backup.json', JSON.stringify({ neon: neonData, rds: rdsData, merged }, null, 2));
    console.log('\nBackup saved to data/migration-backup.json');

    // Step 3-5: Create schema and import on RDS
    const rdsClient = await rdsPool.connect();
    try {
      await rdsClient.query('BEGIN');

      await createNewSchema(rdsClient);
      await importData(rdsClient, merged);
      await createTriggers(rdsClient);

      await rdsClient.query('COMMIT');
      console.log('\n✓ Migration committed successfully!');
    } catch (err) {
      await rdsClient.query('ROLLBACK');
      throw err;
    } finally {
      rdsClient.release();
    }

    // Verify
    const verifyClient = await rdsPool.connect();
    try {
      const counts = await verifyClient.query(`
        SELECT
          (SELECT COUNT(*) FROM entity WHERE entity_type = 'person') as people,
          (SELECT COUNT(*) FROM entity WHERE entity_type = 'organization') as orgs,
          (SELECT COUNT(*) FROM entity WHERE entity_type = 'resource') as resources,
          (SELECT COUNT(*) FROM submission) as submissions,
          (SELECT COUNT(*) FROM edge) as edges
      `);
      console.log('\n=== Verification ===');
      console.log(`  People: ${counts.rows[0].people}`);
      console.log(`  Organizations: ${counts.rows[0].orgs}`);
      console.log(`  Resources: ${counts.rows[0].resources}`);
      console.log(`  Submissions: ${counts.rows[0].submissions}`);
      console.log(`  Edges: ${counts.rows[0].edges}`);
    } finally {
      verifyClient.release();
    }

    console.log('\n=== Next Steps ===');
    console.log('1. Update .env to use RDS: DATABASE_URL="postgresql://mappingai:...@mapping-ai-db...amazonaws.com:5432/mappingai"');
    console.log('2. Update Lambda environment variables to use RDS');
    console.log('3. Deploy updated API code (from robby/db-restructure branch)');
    console.log('4. Test the application');

  } finally {
    await neonPool.end();
    await rdsPool.end();
  }
}

main().catch(err => {
  console.error('\nMigration failed:', err);
  process.exit(1);
});
