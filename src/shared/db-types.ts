// DB row types mirroring the Postgres schema in scripts/migrate.js.
//
// These are the *backend* side of the data contract. The *frontend* side lives
// in src/types/entity.ts — a `toFrontendShape()` step in api/export-map.js
// bridges column names (e.g. `belief_regulatory_stance` → `regulatory_stance`).
//
// Keep this file in lockstep with scripts/migrate.js's CREATE TABLE statements.
// If you add or rename a column in the migration, update the matching row
// type here. Otherwise the backend and frontend will drift silently —
// see CLAUDE.md "Field name mapping" for why this matters.

/** `entity` table — unified people / organizations / resources row. */
export interface DbEntityRow {
  id: number
  entity_type: 'person' | 'organization' | 'resource'

  // Identity
  name: string | null
  title: string | null
  category: string | null
  other_categories: string | null
  primary_org: string | null
  other_orgs: string | null

  // Organization-specific
  website: string | null
  funding_model: string | null
  parent_org_id: number | null

  // Resource-specific (`resource_*` prefix)
  resource_title: string | null
  resource_category: string | null
  resource_author: string | null
  resource_type: string | null
  resource_url: string | null
  resource_year: string | null
  resource_key_argument: string | null

  // Resource tagging + advocated beliefs
  topic_tags: string[] | null
  format_tags: string[] | null
  advocated_stance: string | null
  advocated_timeline: string | null
  advocated_risk: string | null

  // Shared
  location: string | null
  influence_type: string | null
  twitter: string | null
  bluesky: string | null
  notes: string | null
  notes_html: string | null
  thumbnail_url: string | null

  // Belief labels (ordinal text, auto-derived from wavg by trigger)
  belief_regulatory_stance: string | null
  belief_regulatory_stance_detail: string | null
  belief_evidence_source: string | null
  belief_agi_timeline: string | null
  belief_ai_risk: string | null
  belief_threat_models: string | null

  // Belief aggregates (trigger-maintained; null for entities with no submissions)
  belief_regulatory_stance_wavg: number | null
  belief_regulatory_stance_wvar: number | null
  belief_regulatory_stance_n: number
  belief_agi_timeline_wavg: number | null
  belief_agi_timeline_wvar: number | null
  belief_agi_timeline_n: number
  belief_ai_risk_wavg: number | null
  belief_ai_risk_wvar: number | null
  belief_ai_risk_n: number

  submission_count: number
  status: 'approved' | 'pending' | 'internal'
  qa_approved: boolean

  created_at: string
  updated_at: string
  // tsvector is opaque; never send to the client. Handlers strip it before
  // serialization — the canonical place is `api/export-map.js` SENSITIVE set.
  search_vector?: string
}

/** `submission` table — pending contributions before admin review. */
export interface DbSubmissionRow {
  id: number
  entity_type: 'person' | 'organization' | 'resource'
  // NULL for new-entity submissions; set for edit submissions.
  entity_id: number | null

  // Submitter — PII. Never export to the public map.
  submitter_email: string | null
  submitter_relationship: 'self' | 'connector' | 'external' | null

  // All entity fields duplicated as flat columns (see scripts/migrate.js).
  name: string | null
  title: string | null
  category: string | null
  other_categories: string | null
  primary_org: string | null
  other_orgs: string | null
  website: string | null
  funding_model: string | null
  parent_org_id: number | null
  resource_title: string | null
  resource_category: string | null
  resource_author: string | null
  resource_type: string | null
  resource_url: string | null
  resource_year: string | null
  resource_key_argument: string | null
  // Resource tagging + advocated beliefs
  topic_tags: string[] | null
  format_tags: string[] | null
  advocated_stance: string | null
  advocated_timeline: string | null
  advocated_risk: string | null
  location: string | null
  influence_type: string | null
  twitter: string | null
  bluesky: string | null
  notes: string | null
  notes_html: string | null
  notes_mentions: unknown

  // Belief fields — `_score` is the numeric value the trigger aggregates.
  belief_regulatory_stance: string | null
  belief_regulatory_stance_score: number | null
  belief_regulatory_stance_detail: string | null
  belief_evidence_source: string | null
  belief_agi_timeline: string | null
  belief_agi_timeline_score: number | null
  belief_ai_risk: string | null
  belief_ai_risk_score: number | null
  belief_threat_models: string | null

  // Review workflow
  status: 'pending' | 'approved' | 'rejected'
  // LLM quality review from Claude Haiku (shape varies; treated as opaque JSON).
  llm_review: unknown
  resolution_notes: string | null
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  contributor_key_id: number | null
}

/** `edge` table — typed relationships between entities. */
export interface DbEdgeRow {
  id: number
  source_id: number
  target_id: number
  edge_type: string | null
  role: string | null
  is_primary: boolean
  evidence: string | null
  created_by: string
  created_at: string
}

/**
 * `contributor_keys` table — API-key metadata for trusted contributors.
 * Never shipped to the client or to any public artifact; holds PII
 * (name, email) plus a SHA-256 key hash.
 */
export interface DbContributorKeyRow {
  id: number
  key_hash: string
  name: string
  email: string | null
  daily_limit: number
  created_at: string
  revoked_at: string | null
}
