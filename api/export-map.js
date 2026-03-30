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

  return {
    _meta: { generated_at: new Date().toISOString() },
    people: addScores(stripSensitive(people.rows)),
    organizations: addScores(stripSensitive(orgs.rows)),
    resources: addScores(stripSensitive(resources.rows)),
    relationships: relationships.rows,
    person_organizations: personOrgs.rows,
  };
}
