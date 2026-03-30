/**
 * Shared map-data export logic — used by admin Lambda on approve
 * and by scripts/export-map-data.js for local/CI builds.
 */

const sensitiveFields = ['submitter_email', 'submitter_relationship', 'is_self_submission', 'search_vector'];
const stripSensitive = (rows) => rows.map(row => {
  const clean = { ...row };
  sensitiveFields.forEach(f => delete clean[f]);
  return clean;
});

/**
 * Compute source_type for entities based on their submission history:
 * - "self": entity has a merged submission where is_self_submission = true
 * - "connector": entity has a merged submission where submitter_relationship is not null (and not self)
 * - "external": seeded data or submissions without relationship info
 */
async function computeSourceTypes(client) {
  // Get entities with self-submissions
  const selfRes = await client.query(`
    SELECT DISTINCT entity_type, entity_id
    FROM submissions
    WHERE is_self_submission = true AND status = 'merged' AND entity_id IS NOT NULL
  `);
  const selfSet = new Set(selfRes.rows.map(r => `${r.entity_type}:${r.entity_id}`));

  // Get entities with connector submissions (non-null submitter_relationship, not self)
  const connectorRes = await client.query(`
    SELECT DISTINCT entity_type, entity_id
    FROM submissions
    WHERE submitter_relationship IS NOT NULL
      AND submitter_relationship != ''
      AND is_self_submission = false
      AND status = 'merged'
      AND entity_id IS NOT NULL
  `);
  const connectorSet = new Set(connectorRes.rows.map(r => `${r.entity_type}:${r.entity_id}`));

  return { selfSet, connectorSet };
}

function addSourceType(rows, entityType, selfSet, connectorSet) {
  return rows.map(row => {
    const key = `${entityType}:${row.id}`;
    let source_type = 'external';
    if (selfSet.has(key)) {
      source_type = 'self';
    } else if (connectorSet.has(key)) {
      source_type = 'connector';
    }
    return { ...row, source_type };
  });
}

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

const addScores = (rows) => rows.map(row => ({
  ...row,
  // Prefer weighted scores if available, fall back to direct mapping
  stance_score:   row.weighted_stance_score ?? STANCE_SCORES[row.regulatory_stance] ?? null,
  timeline_score: row.weighted_timeline_score ?? TIMELINE_SCORES[row.agi_timeline] ?? null,
  risk_score:     row.weighted_risk_score ?? RISK_SCORES[row.ai_risk_level] ?? null,
  // disagreement_score and submission_count are already included from DB
}));

export async function generateMapData(client) {
  const people = await client.query("SELECT * FROM people WHERE status = 'approved' ORDER BY id");
  const orgs = await client.query("SELECT * FROM organizations WHERE status = 'approved' ORDER BY id");
  const resources = await client.query("SELECT * FROM resources WHERE status = 'approved' ORDER BY id");
  const relationships = await client.query(
    "SELECT id, source_type, source_id, target_type, target_id, relationship_type, evidence, created_by FROM relationships ORDER BY id"
  );
  const personOrgs = await client.query(
    "SELECT id, person_id, organization_id, role, is_primary FROM person_organizations ORDER BY id"
  );

  // Compute source types based on submission history
  const { selfSet, connectorSet } = await computeSourceTypes(client);

  return {
    _meta: { generated_at: new Date().toISOString() },
    people: addScores(addSourceType(stripSensitive(people.rows), 'person', selfSet, connectorSet)),
    organizations: addScores(addSourceType(stripSensitive(orgs.rows), 'organization', selfSet, connectorSet)),
    resources: addScores(addSourceType(stripSensitive(resources.rows), 'resource', selfSet, connectorSet)),
    relationships: relationships.rows,
    person_organizations: personOrgs.rows,
  };
}
