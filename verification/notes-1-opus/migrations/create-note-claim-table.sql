-- Note Claim Table
-- Stores per-claim evidence for verified notes
-- Run on BOTH environments:
--   psql $STAGING_DATABASE_URL -f create-note-claim-table.sql
--   psql $DATABASE_URL -f create-note-claim-table.sql

CREATE TABLE IF NOT EXISTS note_claim (
  id SERIAL PRIMARY KEY,

  -- Links
  entity_id INTEGER NOT NULL,
  source_id TEXT REFERENCES source(source_id),  -- FK to source table
  correction_id INTEGER,  -- FK to note_correction (staging only)

  -- Claim content
  claim_text TEXT NOT NULL,
  claim_type TEXT,  -- biographical/affiliation/financial/date/relationship/achievement

  -- Evidence
  citation TEXT,

  -- Verification
  verdict TEXT,  -- supported/unsupported
  confidence TEXT,  -- high/medium/low

  -- Pipeline tracking
  extracted_by TEXT DEFAULT 'notes-1-opus',
  extraction_model TEXT,
  extraction_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_note_claim_entity_id ON note_claim(entity_id);
CREATE INDEX IF NOT EXISTS idx_note_claim_source_id ON note_claim(source_id);
CREATE INDEX IF NOT EXISTS idx_note_claim_correction_id ON note_claim(correction_id);
CREATE INDEX IF NOT EXISTS idx_note_claim_verdict ON note_claim(verdict);
