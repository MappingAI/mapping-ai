/**
 * Shared map-data export logic — used by admin Lambda on approve/merge
 * and by scripts/export-map-data.js for local/CI builds.
 */

const SENSITIVE = new Set(['submitter_email', 'submitter_relationship', 'search_vector']);

const stripSensitive = (rows) => rows.map(row => {
  const clean = { ...row };
  SENSITIVE.forEach(f => delete clean[f]);
  return clean;
});

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
    const source_type = sourceTypeMap.get(row.id) || 'external';
    const enriched = {
      ...clean,
      source_type,
      // Expose belief aggregates as the canonical score fields for the map/plot views
      stance_score:   row.belief_regulatory_stance_wavg ?? null,
      timeline_score: row.belief_agi_timeline_wavg ?? null,
      risk_score:     row.belief_ai_risk_wavg ?? null,
    };
    if (row.entity_type === 'person')       people.push(enriched);
    else if (row.entity_type === 'organization') organizations.push(enriched);
    else if (row.entity_type === 'resource')     resources.push(enriched);
  }

  return {
    _meta: { generated_at: new Date().toISOString() },
    people,
    organizations,
    resources,
    edges: edges.rows,
  };
}
