import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  options: '-c statement_timeout=10000',
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SENSITIVE = new Set(['submitter_email', 'submitter_relationship', 'search_vector']);

export const handler = async (event) => {
  const method = event.requestContext.http.method;

  if (method === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (method !== 'GET') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { type, status } = event.queryStringParameters || {};
    const filterStatus = status || 'approved';

    const client = await pool.connect();
    try {
      // Filter by entity_type if requested, otherwise return all
      const typeClause = type ? `AND entity_type = $2` : '';
      const queryParams = type ? [filterStatus, type] : [filterStatus];

      const entityResult = await client.query(
        `SELECT * FROM entity WHERE status = $1 ${typeClause} ORDER BY COALESCE(name, resource_title) ASC`,
        queryParams
      );

      const edges = await client.query(
        `SELECT id, source_id, target_id, edge_type, role, is_primary FROM edge ORDER BY id`
      );

      const clean = entityResult.rows.map(row => {
        const r = { ...row };
        SENSITIVE.forEach(f => delete r[f]);
        return r;
      });

      // Split into typed arrays for backwards compatibility with map frontend
      const people        = clean.filter(r => r.entity_type === 'person');
      const organizations = clean.filter(r => r.entity_type === 'organization');
      const resources     = clean.filter(r => r.entity_type === 'resource');

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ people, organizations, resources, edges: edges.rows }),
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Query error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
