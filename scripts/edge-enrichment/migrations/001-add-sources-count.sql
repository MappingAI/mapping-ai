-- Migration: Add sources_count and updated_at columns to edge_discovery
-- Run: psql "$PILOT_DB" -f scripts/edge-enrichment/migrations/001-add-sources-count.sql

-- Add sources_count column (tracks how many independent sources found this edge)
ALTER TABLE edge_discovery
ADD COLUMN IF NOT EXISTS sources_count INTEGER DEFAULT 1;

-- Add updated_at column
ALTER TABLE edge_discovery
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Set default values for existing rows
UPDATE edge_discovery
SET sources_count = 1
WHERE sources_count IS NULL;

UPDATE edge_discovery
SET updated_at = created_at
WHERE updated_at IS NULL;

-- Verify
SELECT 'Migration complete. Column counts:' as status;
SELECT
  COUNT(*) as total_rows,
  COUNT(sources_count) as has_sources_count,
  COUNT(updated_at) as has_updated_at
FROM edge_discovery;
