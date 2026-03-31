/**
 * Shared map-data export logic — used by admin Lambda on approve/merge
 * and by scripts/export-map-data.js for local/CI builds.
 */

const SENSITIVE = new Set(['submitter_email', 'submitter_relationship', 'search_vector']);

const stripSensitive = (row) => {
  const clean = { ...row };
  SENSITIVE.forEach(f => delete clean[f]);
  return clean;
};

// Ordinal scores derived from text labels — used as fallback when
// the entity has no approved submissions (i.e. belief_*_wavg is null)
const STANCE_SCORES = {
  'Accelerate': 1,
  'Light-touch': 2, 'Light-touch regulation': 2,
  'Targeted': 3, 'Targeted regulation': 3,
  'Moderate': 4, 'Moderate regulation': 4,
  'Restrictive': 5, 'Restrictive regulation': 5,
  'Precautionary': 6,
  'Nationalize': 7,
};
const TIMELINE_SCORES = {
  'Already here': 1,
  '2-3 years': 2, 'Within 2-3 years': 2,
  '5-10 years': 3,
  '10-25 years': 4,
  '25+ years or never': 5,
};
const RISK_SCORES = {
  'Overstated': 1,
  'Manageable': 2,
  'Serious': 3,
  'Catastrophic': 4, 'Potentially catastrophic': 4,
  'Existential': 5,
};

/**
 * Map entity row to the shape the frontend expects.
 * Bridges new DB column names (belief_*) → old frontend field names
 * (regulatory_stance, agi_timeline, ai_risk_level, title for resources).
 */
function toFrontendShape(row) {
  const out = { ...row };

  // Map belief columns → frontend field names
  out.regulatory_stance        = row.belief_regulatory_stance;
  out.regulatory_stance_detail = row.belief_regulatory_stance_detail;
  out.evidence_source          = row.belief_evidence_source;
  out.agi_timeline             = row.belief_agi_timeline;
  out.ai_risk_level            = row.belief_ai_risk;
  out.threat_models            = row.belief_threat_models;

  // Resources: frontend uses `title` (mapped from resource_title)
  if (row.entity_type === 'resource') {
    out.title         = row.resource_title || row.name;
    out.category      = row.resource_category || row.category;
    out.author        = row.resource_author;
    out.resource_type = row.resource_type;
    out.url           = row.resource_url;
    out.year          = row.resource_year;
    out.key_argument  = row.resource_key_argument;
  }

  // Numeric scores: prefer wavg from submissions, fall back to text label lookup
  out.stance_score   = row.belief_regulatory_stance_wavg ?? STANCE_SCORES[out.regulatory_stance]   ?? null;
  out.timeline_score = row.belief_agi_timeline_wavg      ?? TIMELINE_SCORES[out.agi_timeline]      ?? null;
  out.risk_score     = row.belief_ai_risk_wavg           ?? RISK_SCORES[out.ai_risk_level]         ?? null;

  return out;
}

/**
 * source_type priority: self > connector > external
 * Derived from any approved submission for the entity.
 */
async function computeSourceTypes(client) {
  const result = await client.query(`
    SELECT entity_id,
      CASE
        WHEN bool_or(submitter_relationship = 'self')      THEN 'self'
        WHEN bool_or(submitter_relationship = 'connector') THEN 'connector'
        ELSE 'external'
      END AS source_type
    FROM submission
    WHERE entity_id IS NOT NULL AND status = 'approved'
    GROUP BY entity_id
  `);
  return new Map(result.rows.map(r => [r.entity_id, r.source_type]));
}

export async function generateMapData(client) {
  const entities = await client.query(
    `SELECT * FROM entity WHERE status = 'approved' ORDER BY id`
  );
  const edges = await client.query(
    `SELECT id, source_id, target_id, edge_type, role, is_primary, evidence, created_by FROM edge ORDER BY id`
  );

  const sourceTypeMap = await computeSourceTypes(client);

  const people = [];
  const organizations = [];
  const resources = [];

  for (const row of entities.rows) {
    const clean = stripSensitive(row);
    const shaped = toFrontendShape(clean);
    shaped.source_type = sourceTypeMap.get(row.id) || 'external';

    if (row.entity_type === 'person')            people.push(shaped);
    else if (row.entity_type === 'organization') organizations.push(shaped);
    else if (row.entity_type === 'resource')     resources.push(shaped);
  }

  return {
    _meta: { generated_at: new Date().toISOString() },
    people,
    organizations,
    resources,
    edges: edges.rows,
  };
}
