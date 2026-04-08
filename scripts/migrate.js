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
    console.log('Running migration: 3-table schema (entity / submission / edge)\n');

    // ── 1. entity ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS entity (
        id                              SERIAL PRIMARY KEY,
        entity_type                     VARCHAR(20) NOT NULL,
        -- person + org identity
        name                            VARCHAR(200),
        title                           VARCHAR(300),
        category                        VARCHAR(200),
        other_categories                TEXT,
        primary_org                     VARCHAR(200),
        other_orgs                      VARCHAR(200),
        -- org-specific
        website                         VARCHAR(200),
        funding_model                   VARCHAR(200),
        parent_org_id                   INTEGER REFERENCES entity(id),
        -- resource-specific (resource_ prefix)
        resource_title                  VARCHAR(300),
        resource_category               VARCHAR(200),
        resource_author                 VARCHAR(200),
        resource_type                   VARCHAR(100),
        resource_url                    VARCHAR(500),
        resource_year                   VARCHAR(10),
        resource_key_argument           TEXT,
        -- shared
        location                        VARCHAR(200),
        influence_type                  TEXT,
        twitter                         VARCHAR(200),
        bluesky                         VARCHAR(200),
        notes                           TEXT,
        notes_html                      TEXT,
        thumbnail_url                   VARCHAR(500),
        -- belief display labels (ordinal: auto-derived from wavg by trigger)
        belief_regulatory_stance        VARCHAR(200),
        belief_regulatory_stance_detail TEXT,
        belief_evidence_source          VARCHAR(200),
        belief_agi_timeline             VARCHAR(200),
        belief_ai_risk                  VARCHAR(200),
        belief_threat_models            TEXT,
        -- belief aggregates (trigger-maintained)
        belief_regulatory_stance_wavg   REAL,
        belief_regulatory_stance_wvar   REAL,
        belief_regulatory_stance_n      INTEGER DEFAULT 0,
        belief_agi_timeline_wavg        REAL,
        belief_agi_timeline_wvar        REAL,
        belief_agi_timeline_n           INTEGER DEFAULT 0,
        belief_ai_risk_wavg             REAL,
        belief_ai_risk_wvar             REAL,
        belief_ai_risk_n                INTEGER DEFAULT 0,
        -- total approved submissions (all, not per-field)
        submission_count                INTEGER DEFAULT 0,
        -- metadata
        status                          VARCHAR(20) DEFAULT 'pending',
        created_at                      TIMESTAMPTZ DEFAULT NOW(),
        updated_at                      TIMESTAMPTZ DEFAULT NOW(),
        search_vector                   tsvector
      )
    `);
    console.log('  ✓ entity');

    // ── 2. submission ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS submission (
        id                               SERIAL PRIMARY KEY,
        entity_type                      VARCHAR(20) NOT NULL,
        entity_id                        INTEGER REFERENCES entity(id),
        -- submitter (self | connector | external)
        submitter_email                  VARCHAR(200),
        submitter_relationship           VARCHAR(20),
        -- person + org fields
        name                             VARCHAR(200),
        title                            VARCHAR(300),
        category                         VARCHAR(200),
        other_categories                 TEXT,
        primary_org                      VARCHAR(200),
        other_orgs                       VARCHAR(200),
        -- org-specific
        website                          VARCHAR(200),
        funding_model                    VARCHAR(200),
        parent_org_id                    INTEGER,
        -- resource-specific (resource_ prefix)
        resource_title                   VARCHAR(300),
        resource_category                VARCHAR(200),
        resource_author                  VARCHAR(200),
        resource_type                    VARCHAR(100),
        resource_url                     VARCHAR(500),
        resource_year                    VARCHAR(10),
        resource_key_argument            TEXT,
        -- shared
        location                         VARCHAR(200),
        influence_type                   TEXT,
        twitter                          VARCHAR(200),
        bluesky                          VARCHAR(200),
        notes                            TEXT,
        notes_html                       TEXT,
        notes_mentions                   JSONB,
        -- belief fields (_score: numeric for trigger; NULL if mixed/unclear/other)
        belief_regulatory_stance         VARCHAR(200),
        belief_regulatory_stance_score   SMALLINT,
        belief_regulatory_stance_detail  TEXT,
        belief_evidence_source           VARCHAR(200),
        belief_agi_timeline              VARCHAR(200),
        belief_agi_timeline_score        SMALLINT,
        belief_ai_risk                   VARCHAR(200),
        belief_ai_risk_score             SMALLINT,
        belief_threat_models             TEXT,
        -- review
        status                           VARCHAR(20) DEFAULT 'pending',
        llm_review                       JSONB,
        resolution_notes                 TEXT,
        submitted_at                     TIMESTAMPTZ DEFAULT NOW(),
        reviewed_at                      TIMESTAMPTZ,
        reviewed_by                      VARCHAR(200)
      )
    `);
    console.log('  ✓ submission');

    // ── 3. edge ───────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS edge (
        id           SERIAL PRIMARY KEY,
        source_id    INTEGER NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
        target_id    INTEGER NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
        edge_type    VARCHAR(50),
        role         VARCHAR(200),
        is_primary   BOOLEAN DEFAULT FALSE,
        evidence     TEXT,
        created_by   VARCHAR(50) DEFAULT 'system',
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(source_id, target_id, edge_type)
      )
    `);
    console.log('  ✓ edge');

    // ── 4. Indexes ────────────────────────────────────────────────────────────
    console.log('\nCreating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_entity_type   ON entity(entity_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_entity_status ON entity(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sub_entity    ON submission(entity_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sub_status    ON submission(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sub_type      ON submission(entity_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_edge_source   ON edge(source_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_edge_target   ON edge(target_id)');
    console.log('  ✓ indexes');

    // ── 4b. Schema migrations (safe ADD COLUMN for existing tables) ──────────
    await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS parent_org_id INTEGER`);
    console.log('  ✓ schema migrations');

    // ── 4c. contributor_keys table ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS contributor_keys (
        id SERIAL PRIMARY KEY,
        key_hash VARCHAR(64) NOT NULL UNIQUE,   -- SHA256 of key (never store plaintext)
        name VARCHAR(200) NOT NULL,             -- Contributor name
        email VARCHAR(200),                     -- Contact email
        daily_limit INTEGER DEFAULT 250,        -- Max submissions per day
        created_at TIMESTAMPTZ DEFAULT NOW(),
        revoked_at TIMESTAMPTZ                  -- NULL = active, set = revoked
      )
    `);
    await client.query(`ALTER TABLE submission ADD COLUMN IF NOT EXISTS contributor_key_id INTEGER REFERENCES contributor_keys(id)`);
    await client.query('CREATE INDEX IF NOT EXISTS idx_sub_contributor ON submission(contributor_key_id)');
    console.log('  ✓ contributor_keys');

    // ── 5. Score recalculation function ──────────────────────────────────────
    // Weights: self=10, connector=2, external=1
    // _n counts only submissions with a non-null score for that field
    // submission_count counts all approved submissions
    // Weighted variance (one-pass): wvar = SUM(w*x^2)/SUM(w) - (SUM(w*x)/SUM(w))^2
    console.log('\nCreating trigger functions...');
    await client.query(`
      CREATE OR REPLACE FUNCTION recalculate_entity_scores(p_entity_id INTEGER) RETURNS void AS $$
      DECLARE
        v_stance_wavg   REAL; v_stance_wvar   REAL; v_stance_n   INTEGER;
        v_timeline_wavg REAL; v_timeline_wvar REAL; v_timeline_n INTEGER;
        v_risk_wavg     REAL; v_risk_wvar     REAL; v_risk_n     INTEGER;
        v_sub_count     INTEGER;
      BEGIN
        -- Stance (1-7)
        SELECT
          SUM(w * belief_regulatory_stance_score) / NULLIF(SUM(w), 0),
          COALESCE(
            SUM(w * belief_regulatory_stance_score::REAL * belief_regulatory_stance_score) / NULLIF(SUM(w), 0)
            - POWER(SUM(w * belief_regulatory_stance_score) / NULLIF(SUM(w), 0), 2),
            0
          ),
          COUNT(*)::INTEGER
        INTO v_stance_wavg, v_stance_wvar, v_stance_n
        FROM (
          SELECT belief_regulatory_stance_score,
                 CASE submitter_relationship WHEN 'self' THEN 10.0 WHEN 'connector' THEN 2.0 ELSE 1.0 END AS w
          FROM submission
          WHERE entity_id = p_entity_id AND status = 'approved'
            AND belief_regulatory_stance_score IS NOT NULL
        ) s;

        -- Timeline (1-5)
        SELECT
          SUM(w * belief_agi_timeline_score) / NULLIF(SUM(w), 0),
          COALESCE(
            SUM(w * belief_agi_timeline_score::REAL * belief_agi_timeline_score) / NULLIF(SUM(w), 0)
            - POWER(SUM(w * belief_agi_timeline_score) / NULLIF(SUM(w), 0), 2),
            0
          ),
          COUNT(*)::INTEGER
        INTO v_timeline_wavg, v_timeline_wvar, v_timeline_n
        FROM (
          SELECT belief_agi_timeline_score,
                 CASE submitter_relationship WHEN 'self' THEN 10.0 WHEN 'connector' THEN 2.0 ELSE 1.0 END AS w
          FROM submission
          WHERE entity_id = p_entity_id AND status = 'approved'
            AND belief_agi_timeline_score IS NOT NULL
        ) s;

        -- Risk (1-5)
        SELECT
          SUM(w * belief_ai_risk_score) / NULLIF(SUM(w), 0),
          COALESCE(
            SUM(w * belief_ai_risk_score::REAL * belief_ai_risk_score) / NULLIF(SUM(w), 0)
            - POWER(SUM(w * belief_ai_risk_score) / NULLIF(SUM(w), 0), 2),
            0
          ),
          COUNT(*)::INTEGER
        INTO v_risk_wavg, v_risk_wvar, v_risk_n
        FROM (
          SELECT belief_ai_risk_score,
                 CASE submitter_relationship WHEN 'self' THEN 10.0 WHEN 'connector' THEN 2.0 ELSE 1.0 END AS w
          FROM submission
          WHERE entity_id = p_entity_id AND status = 'approved'
            AND belief_ai_risk_score IS NOT NULL
        ) s;

        SELECT COUNT(*)::INTEGER INTO v_sub_count
        FROM submission WHERE entity_id = p_entity_id AND status = 'approved';

        UPDATE entity SET
          belief_regulatory_stance_wavg = v_stance_wavg,
          belief_regulatory_stance_wvar = CASE WHEN v_stance_n > 0 THEN v_stance_wvar ELSE NULL END,
          belief_regulatory_stance_n    = v_stance_n,
          belief_regulatory_stance      = CASE
            WHEN v_stance_wavg IS NULL THEN belief_regulatory_stance
            ELSE CASE ROUND(v_stance_wavg::NUMERIC)
              WHEN 1 THEN 'Accelerate'   WHEN 2 THEN 'Light-touch'
              WHEN 3 THEN 'Targeted'     WHEN 4 THEN 'Moderate'
              WHEN 5 THEN 'Restrictive'  WHEN 6 THEN 'Precautionary'
              WHEN 7 THEN 'Nationalize'  ELSE belief_regulatory_stance
            END
          END,
          belief_agi_timeline_wavg = v_timeline_wavg,
          belief_agi_timeline_wvar = CASE WHEN v_timeline_n > 0 THEN v_timeline_wvar ELSE NULL END,
          belief_agi_timeline_n    = v_timeline_n,
          belief_agi_timeline      = CASE
            WHEN v_timeline_wavg IS NULL THEN belief_agi_timeline
            ELSE CASE ROUND(v_timeline_wavg::NUMERIC)
              WHEN 1 THEN 'Already here'        WHEN 2 THEN '2-3 years'
              WHEN 3 THEN '5-10 years'          WHEN 4 THEN '10-25 years'
              WHEN 5 THEN '25+ years or never'  ELSE belief_agi_timeline
            END
          END,
          belief_ai_risk_wavg = v_risk_wavg,
          belief_ai_risk_wvar = CASE WHEN v_risk_n > 0 THEN v_risk_wvar ELSE NULL END,
          belief_ai_risk_n    = v_risk_n,
          belief_ai_risk      = CASE
            WHEN v_risk_wavg IS NULL THEN belief_ai_risk
            ELSE CASE ROUND(v_risk_wavg::NUMERIC)
              WHEN 1 THEN 'Overstated'   WHEN 2 THEN 'Manageable'
              WHEN 3 THEN 'Serious'      WHEN 4 THEN 'Catastrophic'
              WHEN 5 THEN 'Existential'  ELSE belief_ai_risk
            END
          END,
          submission_count = v_sub_count,
          updated_at       = NOW()
        WHERE id = p_entity_id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('  ✓ recalculate_entity_scores()');

    // ── 6. BEFORE trigger: entity creation on new submission approval ─────────
    // When admin sets submission.status = 'approved' for a submission with
    // entity_id IS NULL, this trigger inserts a new entity row and backfills
    // submission.entity_id before the row is written.
    // Admin can update submission fields in the same UPDATE call to override
    // what gets copied into entity.
    await client.query(`
      CREATE OR REPLACE FUNCTION before_submission_update() RETURNS trigger AS $$
      DECLARE
        v_entity_id INTEGER;
      BEGIN
        IF NEW.entity_id IS NULL AND NEW.status = 'approved' AND OLD.status <> 'approved' THEN
          INSERT INTO entity (
            entity_type,
            name, title, category, other_categories, primary_org, other_orgs,
            website, funding_model, parent_org_id,
            resource_title, resource_category, resource_author, resource_type,
            resource_url, resource_year, resource_key_argument,
            location, influence_type, twitter, bluesky, notes, notes_html,
            belief_regulatory_stance, belief_regulatory_stance_detail,
            belief_evidence_source, belief_agi_timeline, belief_ai_risk,
            belief_threat_models,
            status, qa_approved
          ) VALUES (
            NEW.entity_type,
            NEW.name, NEW.title, NEW.category, NEW.other_categories, NEW.primary_org, NEW.other_orgs,
            NEW.website, NEW.funding_model, NEW.parent_org_id,
            NEW.resource_title, NEW.resource_category, NEW.resource_author, NEW.resource_type,
            NEW.resource_url, NEW.resource_year, NEW.resource_key_argument,
            NEW.location, NEW.influence_type, NEW.twitter, NEW.bluesky, NEW.notes, NEW.notes_html,
            NEW.belief_regulatory_stance, NEW.belief_regulatory_stance_detail,
            NEW.belief_evidence_source, NEW.belief_agi_timeline, NEW.belief_ai_risk,
            NEW.belief_threat_models,
            'approved', true
          ) RETURNING id INTO v_entity_id;

          NEW.entity_id   := v_entity_id;
          NEW.reviewed_at := COALESCE(NEW.reviewed_at, NOW());
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await client.query('DROP TRIGGER IF EXISTS trg_before_submission_update ON submission');
    await client.query(`
      CREATE TRIGGER trg_before_submission_update
      BEFORE UPDATE OF status ON submission
      FOR EACH ROW EXECUTE FUNCTION before_submission_update()
    `);
    console.log('  ✓ before_submission_update (entity creation)');

    // ── 7. AFTER trigger: score recalculation on status change ────────────────
    await client.query(`
      CREATE OR REPLACE FUNCTION after_submission_update() RETURNS trigger AS $$
      BEGIN
        IF NEW.entity_id IS NOT NULL
           AND NEW.status IS DISTINCT FROM OLD.status
           AND (NEW.status = 'approved' OR OLD.status = 'approved')
        THEN
          PERFORM recalculate_entity_scores(NEW.entity_id);
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await client.query('DROP TRIGGER IF EXISTS trg_after_submission_update ON submission');
    await client.query(`
      CREATE TRIGGER trg_after_submission_update
      AFTER UPDATE OF status ON submission
      FOR EACH ROW EXECUTE FUNCTION after_submission_update()
    `);
    console.log('  ✓ after_submission_update (score recalculation)');

    // ── 8. Full-text search on entity ─────────────────────────────────────────
    console.log('\nSetting up full-text search on entity...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_entity_search() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := to_tsvector('english',
          coalesce(NEW.name, '') || ' ' ||
          coalesce(NEW.title, '') || ' ' ||
          coalesce(NEW.category, '') || ' ' ||
          coalesce(NEW.primary_org, '') || ' ' ||
          coalesce(NEW.other_orgs, '') || ' ' ||
          coalesce(NEW.resource_title, '') || ' ' ||
          coalesce(NEW.resource_author, '') || ' ' ||
          coalesce(NEW.resource_category, '') || ' ' ||
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
    await client.query('CREATE INDEX IF NOT EXISTS idx_entity_search ON entity USING GIN(search_vector)');
    console.log('  ✓ full-text search');

    // ── 9. Drop old tables ────────────────────────────────────────────────────
    console.log('\nDropping old tables...');
    await client.query('DROP TABLE IF EXISTS person_organizations CASCADE');
    await client.query('DROP TABLE IF EXISTS relationships CASCADE');
    await client.query('DROP TABLE IF EXISTS submissions CASCADE');
    await client.query('DROP TABLE IF EXISTS resources CASCADE');
    await client.query('DROP TABLE IF EXISTS organizations CASCADE');
    await client.query('DROP TABLE IF EXISTS people CASCADE');
    console.log('  ✓ people, organizations, resources, submissions, relationships, person_organizations dropped');

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
