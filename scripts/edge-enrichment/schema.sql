-- Edge Enrichment Schema for Neon (claims-pilot branch)
-- Run: psql "$PILOT_DB" -f scripts/edge-enrichment/schema.sql

-- Source table (shared with Anushree's enrichment scripts)
CREATE TABLE IF NOT EXISTS source (
  source_id          TEXT PRIMARY KEY,      -- src-{sha256(url)[:12]}
  url                TEXT UNIQUE NOT NULL,
  title              TEXT,
  source_type        TEXT,
  date_published     DATE,
  author             TEXT,
  cached_excerpt     TEXT,
  resource_entity_id INTEGER,               -- Optional link to resource entity
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Claim table (shared with Anushree's enrichment scripts)
CREATE TABLE IF NOT EXISTS claim (
  claim_id           TEXT PRIMARY KEY,
  entity_id          INTEGER NOT NULL,
  entity_name        TEXT,
  belief_dimension   TEXT NOT NULL,         -- 'regulatory_stance', 'agi_timeline', 'ai_risk_level', 'founded_year', 'end_year'
  stance             TEXT,                  -- NULL for factual claims
  stance_score       INTEGER,               -- NULL for factual claims
  stance_label       TEXT,                  -- "2015" for founded_year
  definition_used    TEXT,
  citation           TEXT NOT NULL,
  source_id          TEXT REFERENCES source(source_id),
  confidence         TEXT,
  extracted_by       TEXT,
  extraction_date    DATE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_entity_id ON claim(entity_id);
CREATE INDEX IF NOT EXISTS idx_claim_dimension ON claim(belief_dimension);

-- Edge evidence: source attribution for existing RDS edges
CREATE TABLE IF NOT EXISTS edge_evidence (
  evidence_id      TEXT PRIMARY KEY,        -- {edge_id}_{source_id}
  edge_id          INTEGER NOT NULL,        -- FK to RDS edge.id
  source_id        TEXT NOT NULL REFERENCES source(source_id),
  start_date       DATE,
  end_date         DATE,
  amount_usd       NUMERIC(15,2),
  amount_note      TEXT,
  role_title       TEXT,
  citation         TEXT NOT NULL,
  confidence       TEXT,
  extracted_by     TEXT,
  extraction_model TEXT,
  extraction_date  DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edge_evidence_edge_id ON edge_evidence(edge_id);
CREATE INDEX IF NOT EXISTS idx_edge_evidence_source_id ON edge_evidence(source_id);

-- Entity suggestion: discovered entities pending review
CREATE TABLE IF NOT EXISTS entity_suggestion (
  suggestion_id      TEXT PRIMARY KEY,       -- suggestion-{sha256(name)[:12]}
  extracted_name     TEXT NOT NULL,
  entity_type        TEXT,                   -- 'organization' or 'person'
  context            TEXT,
  source_url         TEXT,
  source_id          TEXT REFERENCES source(source_id),
  citation           TEXT,
  times_seen         INTEGER DEFAULT 1,
  seen_as_funder     BOOLEAN DEFAULT FALSE,
  seen_as_recipient  BOOLEAN DEFAULT FALSE,
  potential_duplicates JSONB,                -- [{entity_id, name, similarity}, ...]
  status             TEXT DEFAULT 'pending', -- pending | approved | rejected | duplicate
  duplicate_of_id    INTEGER,
  duplicate_check_done BOOLEAN DEFAULT FALSE,
  reviewed_by        TEXT,
  reviewed_at        TIMESTAMPTZ,
  review_notes       TEXT,
  created_entity_id  INTEGER,
  created_at_rds     TIMESTAMPTZ,
  first_seen_at      TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(extracted_name)
);

CREATE INDEX IF NOT EXISTS idx_entity_suggestion_status ON entity_suggestion(status);
CREATE INDEX IF NOT EXISTS idx_entity_suggestion_times_seen ON entity_suggestion(times_seen DESC);

-- Edge discovery: candidate edges pending review
CREATE TABLE IF NOT EXISTS edge_discovery (
  discovery_id       TEXT PRIMARY KEY,
  source_entity_id     INTEGER,              -- FK to RDS entity.id (if resolved)
  target_entity_id     INTEGER,              -- FK to RDS entity.id (if resolved)
  source_suggestion_id TEXT REFERENCES entity_suggestion(suggestion_id),
  target_suggestion_id TEXT REFERENCES entity_suggestion(suggestion_id),
  edge_type            TEXT NOT NULL,
  source_entity_name TEXT NOT NULL,
  target_entity_name TEXT NOT NULL,
  source_id          TEXT NOT NULL REFERENCES source(source_id),
  start_date         DATE,
  end_date           DATE,
  amount_usd         NUMERIC(15,2),
  amount_note        TEXT,
  citation           TEXT NOT NULL,
  confidence         TEXT,
  status             TEXT DEFAULT 'pending_entities',
  -- pending_entities = waiting for entity_suggestion approval
  -- pending_review = entities resolved, waiting for edge review
  -- approved = edge approved, ready to promote
  -- rejected = edge rejected
  -- promoted = edge created in RDS
  reviewed_by        TEXT,
  reviewed_at        TIMESTAMPTZ,
  review_notes       TEXT,
  promoted_edge_id   INTEGER,
  promoted_at        TIMESTAMPTZ,
  extracted_by       TEXT,
  extraction_model   TEXT,
  extraction_date    DATE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_entity_name, target_entity_name, edge_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_edge_discovery_status ON edge_discovery(status);
CREATE INDEX IF NOT EXISTS idx_edge_discovery_source_suggestion ON edge_discovery(source_suggestion_id);
CREATE INDEX IF NOT EXISTS idx_edge_discovery_target_suggestion ON edge_discovery(target_suggestion_id);

-- Entity alias: known abbreviations and variations
CREATE TABLE IF NOT EXISTS entity_alias (
  alias        TEXT PRIMARY KEY,
  canonical    TEXT NOT NULL,
  entity_id    INTEGER NOT NULL,             -- FK to RDS entity.id
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Seed common aliases
INSERT INTO entity_alias (alias, canonical, entity_id) VALUES
  ('Open Phil', 'Open Philanthropy', 128),
  ('MIRI', 'Machine Intelligence Research Institute', 341),
  ('FHI', 'Future of Humanity Institute', 156),
  ('GovAI', 'Centre for the Governance of AI', 189),
  ('80k', '80,000 Hours', 201),
  ('CEA', 'Centre for Effective Altruism', 145),
  ('DeepMind', 'Google DeepMind', 67),
  ('Anthropic AI', 'Anthropic', 42)
ON CONFLICT (alias) DO NOTHING;

-- Summary
SELECT 'Tables created:' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('edge_evidence', 'entity_suggestion', 'edge_discovery', 'entity_alias');
