/**
 * Shared map-data export logic — used by admin Lambda on approve/merge
 * and by scripts/export-map-data.js for local/CI builds.
 */

const SENSITIVE = new Set(['submitter_email', 'submitter_relationship', 'search_vector'])

const stripSensitive = (row) => {
  const clean = { ...row }
  SENSITIVE.forEach((f) => delete clean[f])
  return clean
}

// Ordinal scores derived from text labels — used as fallback when
// the entity has no approved submissions (i.e. belief_*_wavg is null)
const STANCE_SCORES = {
  Accelerate: 1,
  'Light-touch': 2,
  'Light-touch regulation': 2,
  Targeted: 3,
  'Targeted regulation': 3,
  Moderate: 4,
  'Moderate regulation': 4,
  Restrictive: 5,
  'Restrictive regulation': 5,
  Precautionary: 6,
  Nationalize: 7,
}
const TIMELINE_SCORES = {
  'Already here': 1,
  '2-3 years': 2,
  'Within 2-3 years': 2,
  '5-10 years': 3,
  '10-25 years': 4,
  '25+ years or never': 5,
}
const RISK_SCORES = {
  Overstated: 1,
  Manageable: 2,
  Serious: 3,
  Catastrophic: 4,
  'Potentially catastrophic': 4,
  Existential: 5,
}

/**
 * Map entity row to the shape the frontend expects.
 * Bridges new DB column names (belief_*) → old frontend field names
 * (regulatory_stance, agi_timeline, ai_risk_level, title for resources).
 */
function toFrontendShape(row) {
  // Explicit allowlist — only export fields the frontend needs
  const out = {
    id: row.id,
    entity_type: row.entity_type,
    name: row.name,
    category: row.category,
    other_categories: row.other_categories || null,
    title: row.title,
    primary_org: row.primary_org,
    other_orgs: row.other_orgs,
    website: row.website,
    funding_model: row.funding_model,
    parent_org_id: row.parent_org_id,
    location: row.location,
    influence_type: row.influence_type,
    twitter: row.twitter,
    bluesky: row.bluesky,
    notes: row.notes,
    thumbnail_url: row.thumbnail_url,
    submission_count: row.submission_count,
    status: row.status,
  }

  // Map belief columns → frontend field names
  out.regulatory_stance = row.belief_regulatory_stance
  out.regulatory_stance_detail = row.belief_regulatory_stance_detail
  out.evidence_source = row.belief_evidence_source
  out.agi_timeline = row.belief_agi_timeline
  out.ai_risk_level = row.belief_ai_risk
  out.threat_models = row.belief_threat_models

  // Resources: frontend uses `title` (mapped from resource_title)
  if (row.entity_type === 'resource') {
    out.title = row.resource_title || row.name
    out.category = row.resource_category || row.category
    out.author = row.resource_author
    out.resource_type = row.resource_type
    out.url = row.resource_url
    out.year = row.resource_year
    out.key_argument = row.resource_key_argument
  }

  // Numeric scores: prefer wavg from submissions, fall back to text label lookup
  out.stance_score =
    row.belief_regulatory_stance_wavg ?? STANCE_SCORES[out.regulatory_stance] ?? null
  out.timeline_score = row.belief_agi_timeline_wavg ?? TIMELINE_SCORES[out.agi_timeline] ?? null
  out.risk_score = row.belief_ai_risk_wavg ?? RISK_SCORES[out.ai_risk_level] ?? null

  return out
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
  `)
  return new Map(result.rows.map((r) => [r.entity_id, r.source_type]))
}

export async function generateMapData(client) {
  // Only export entities that have passed QA review
  const entities = await client.query(
    `SELECT * FROM entity WHERE status = 'approved' AND qa_approved = true ORDER BY id`,
  )
  // Only export edges between QA-approved entities
  const edges = await client.query(
    `SELECT e.id, e.source_id, e.target_id, e.edge_type, e.role, e.is_primary,
            e.evidence, e.created_by,
            src.entity_type AS source_type,
            tgt.entity_type AS target_type
     FROM edge e
     JOIN entity src ON src.id = e.source_id AND src.qa_approved = true
     JOIN entity tgt ON tgt.id = e.target_id AND tgt.qa_approved = true
     ORDER BY e.id`,
  )

  const sourceTypeMap = await computeSourceTypes(client)

  const people = []
  const organizations = []
  const resources = []

  for (const row of entities.rows) {
    const clean = stripSensitive(row)
    const shaped = toFrontendShape(clean)
    shaped.source_type = sourceTypeMap.get(row.id) || 'external'

    if (row.entity_type === 'person') people.push(shaped)
    else if (row.entity_type === 'organization') organizations.push(shaped)
    else if (row.entity_type === 'resource') resources.push(shaped)
  }

  // Build relationships array in the shape map.html expects:
  // { source_type, target_type, source_id, target_id, relationship_type }
  const relationships = edges.rows.map((e) => ({
    source_type: e.source_type,
    target_type: e.target_type,
    source_id: e.source_id,
    target_id: e.target_id,
    relationship_type: e.edge_type,
    role: e.role,
    evidence: e.evidence,
  }))

  // Build person_organizations array for affiliation edges:
  // { person_id, organization_id, role, is_primary }
  const person_organizations = edges.rows
    .filter(
      (e) =>
        e.edge_type === 'affiliated' &&
        ((e.source_type === 'person' && e.target_type === 'organization') ||
          (e.source_type === 'organization' && e.target_type === 'person')),
    )
    .map((e) => ({
      person_id: e.source_type === 'person' ? e.source_id : e.target_id,
      organization_id: e.source_type === 'organization' ? e.source_id : e.target_id,
      role: e.role,
      is_primary: e.is_primary,
    }))

  return {
    _meta: { generated_at: new Date().toISOString() },
    people,
    organizations,
    resources,
    relationships,
    person_organizations,
  }
}

/**
 * Detail-only fields — heavy text (notes, stance_detail, threat_models)
 * plus fields only shown when clicking a node. These are stripped from
 * the skeleton and served as a separate lazy-loaded file.
 */
const DETAIL_FIELDS = new Set([
  'notes',
  'regulatory_stance_detail',
  'evidence_source',
  'threat_models',
  'key_argument',
  'author',
  'url',
  'year',
  'twitter',
  'bluesky',
  'parent_org_id',
  'status',
])

/**
 * Split full map data into skeleton (render-critical) + detail (lazy-loaded).
 * Skeleton: id, name, category, scores, thumbnail, positions, relationships.
 * Detail: keyed by entity id — notes, stance_detail, threat_models, etc.
 */
export function splitMapData(fullData) {
  const detail = {}

  const stripDetail = (entity) => {
    const d = {}
    const skeleton = {}
    for (const [k, v] of Object.entries(entity)) {
      if (DETAIL_FIELDS.has(k) && v != null) {
        d[k] = v
      } else {
        skeleton[k] = v
      }
    }
    if (Object.keys(d).length > 0) {
      detail[entity.id] = d
    }
    return skeleton
  }

  const skeleton = {
    _meta: fullData._meta,
    people: fullData.people.map(stripDetail),
    organizations: fullData.organizations.map(stripDetail),
    resources: (fullData.resources || []).map(stripDetail),
    relationships: fullData.relationships,
    person_organizations: fullData.person_organizations,
  }

  return { skeleton, detail }
}
