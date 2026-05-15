-- Note Correction Table
-- Stores verification results for notes before promotion to production
-- Run on STAGING ONLY: psql $STAGING_DATABASE_URL -f create-note-correction-table.sql

CREATE TABLE IF NOT EXISTS note_correction (
  id SERIAL PRIMARY KEY,

  -- Entity reference
  entity_id INTEGER NOT NULL,
  entity_name TEXT,
  entity_type TEXT,  -- person/organization/resource

  -- Original content
  original_notes TEXT,
  original_notes_length INTEGER,
  original_claim_count INTEGER,

  -- Verified content
  verified_notes TEXT,
  verified_notes_length INTEGER,
  verified_claim_count INTEGER,

  -- Removed content (JSON array of {claim, reason})
  removed_claims JSONB,
  removed_claim_count INTEGER,

  -- Metadata
  confidence TEXT,  -- high/medium/low
  reasoning TEXT,

  -- Pipeline tracking
  pipeline TEXT DEFAULT 'notes-1-opus',
  status TEXT DEFAULT 'pending',  -- pending/applied/rejected
  applied_at TIMESTAMPTZ,
  applied_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate reviews per pipeline
  UNIQUE(entity_id, pipeline)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_note_correction_entity_id ON note_correction(entity_id);
CREATE INDEX IF NOT EXISTS idx_note_correction_status ON note_correction(status);
CREATE INDEX IF NOT EXISTS idx_note_correction_pipeline ON note_correction(pipeline);
