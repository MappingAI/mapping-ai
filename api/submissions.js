import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const handler = async (event) => {
  const method = event.requestContext.http.method;

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (method !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { type, status } = event.queryStringParameters || {};
    const filterStatus = status || 'approved';

    const client = await pool.connect();
    try {
      let people = { rows: [] };
      let organizations = { rows: [] };
      let resources = { rows: [] };

      if (!type || type === 'person') {
        people = await client.query(
          `SELECT id, name, category, title, primary_org, other_orgs, location,
                  regulatory_stance, regulatory_stance_detail,
                  evidence_source, agi_timeline, ai_risk_level,
                  threat_models, threat_models_detail, influence_type,
                  twitter, bluesky, notes, submission_count,
                  submitted_at, status
           FROM people
           WHERE status = $1
           ORDER BY name ASC`,
          [filterStatus]
        );
      }

      if (!type || type === 'organization') {
        organizations = await client.query(
          `SELECT id, name, category, website, location, funding_model,
                  regulatory_stance, regulatory_stance_detail,
                  evidence_source, agi_timeline, ai_risk_level,
                  threat_models, threat_models_detail, influence_type,
                  twitter, bluesky, notes, parent_org_id, submission_count,
                  last_verified, submitted_at, status
           FROM organizations
           WHERE status = $1
           ORDER BY name ASC`,
          [filterStatus]
        );
      }

      if (!type || type === 'resource') {
        resources = await client.query(
          `SELECT id, title, author, resource_type, url, year, category,
                  key_argument, notes, submission_count,
                  submitted_at, status
           FROM resources
           WHERE status = $1
           ORDER BY title ASC`,
          [filterStatus]
        );
      }

      // Fetch relationships
      const relationships = await client.query(
        `SELECT id, source_type, source_id, target_type, target_id, relationship_type, evidence
         FROM relationships
         ORDER BY id`
      );

      // Fetch person-org links
      const personOrgs = await client.query(
        `SELECT id, person_id, organization_id, role, is_primary
         FROM person_organizations
         ORDER BY id`
      );

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          people: people.rows,
          organizations: organizations.rows,
          resources: resources.rows,
          relationships: relationships.rows,
          person_organizations: personOrgs.rows,
        }),
      };
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Query error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
