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

      if (!type || type === 'person') {
        people = await client.query(
          `SELECT id, name, category, title, primary_org, other_orgs, location,
                  regulatory_stance, evidence_source, agi_timeline, ai_risk_level,
                  threat_models, influence_type, twitter, bluesky,
                  notes, submitter_relationship, submitted_at, status
           FROM people
           WHERE status = $1
           ORDER BY name ASC`,
          [filterStatus]
        );
      }

      if (!type || type === 'organization') {
        organizations = await client.query(
          `SELECT id, name, category, website, location, funding_model,
                  regulatory_stance, evidence_source, agi_timeline, ai_risk_level,
                  threat_models, influence_type, twitter, bluesky,
                  notes, submitter_relationship, last_verified, submitted_at, status
           FROM organizations
           WHERE status = $1
           ORDER BY name ASC`,
          [filterStatus]
        );
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          people: people.rows,
          organizations: organizations.rows,
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
