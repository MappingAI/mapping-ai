-- Edge Correction Table
-- Stores verification results for edges before promotion to production
-- Run on staging branch: STAGING_DATABASE_URL

CREATE TABLE IF NOT EXISTS edge_correction (
  id SERIAL PRIMARY KEY,

  -- Edge identification
  edge_id INTEGER NOT NULL,           -- FK to edge table
  source_entity_id INTEGER NOT NULL,  -- FK to entity (edge source)
  source_entity_name TEXT,            -- Denormalized for readability
  source_entity_type TEXT,            -- person/organization
  target_entity_id INTEGER NOT NULL,  -- FK to entity (edge target)
  target_entity_name TEXT,            -- Denormalized for readability
  target_entity_type TEXT,            -- person/organization

  -- Current values (from edge table)
  current_edge_type TEXT,
  current_role_title TEXT,
  current_start_date TEXT,
  current_end_date TEXT,

  -- Proposed values (if verdict = 'correct')
  proposed_edge_type TEXT,            -- Must be canonical type
  proposed_role_title TEXT,
  proposed_start_date TEXT,
  proposed_end_date TEXT,

  -- Evidence (written to edge_evidence table)
  source_url TEXT,                    -- URL of supporting source
  citation TEXT,                      -- Verbatim quote from source
  evidence_confidence TEXT,           -- high/medium/low

  -- Verification metadata
  verdict TEXT NOT NULL,              -- confirm/correct/remove
  confidence TEXT,                    -- high/medium/low (overall confidence)
  reasoning TEXT,                     -- Claude's reasoning
  search_results JSONB,               -- Exa search results used

  -- Pipeline tracking
  pipeline TEXT DEFAULT 'edges-1-opus',
  reviewed_entity_id INTEGER,         -- Which entity triggered this review
  status TEXT DEFAULT 'pending',      -- pending/applied/rejected/error
  applied_at TIMESTAMPTZ,
  applied_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate reviews
  UNIQUE(edge_id, pipeline)
);

-- Index for checking if edge already reviewed
CREATE INDEX IF NOT EXISTS idx_edge_correction_edge_id ON edge_correction(edge_id);

-- Index for finding corrections by entity
CREATE INDEX IF NOT EXISTS idx_edge_correction_source_entity ON edge_correction(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_edge_correction_target_entity ON edge_correction(target_entity_id);

-- Index for pipeline status queries
CREATE INDEX IF NOT EXISTS idx_edge_correction_status ON edge_correction(status);
CREATE INDEX IF NOT EXISTS idx_edge_correction_verdict ON edge_correction(verdict);
