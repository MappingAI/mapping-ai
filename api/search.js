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
    const { q, type } = event.queryStringParameters || {};

    if (!q || q.trim().length < 2) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Query must be at least 2 characters' }),
      };
    }

    const query = q.trim();
    const client = await pool.connect();
    try {
      const results = { people: [], organizations: [], resources: [] };

      if (!type || type === 'person') {
        const people = await client.query(
          `SELECT id, name, category, title, primary_org, location, regulatory_stance,
                  ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
           FROM people
           WHERE search_vector @@ plainto_tsquery('english', $1)
              OR name ILIKE $2
           ORDER BY
             CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END,
             ts_rank(search_vector, plainto_tsquery('english', $1)) DESC
           LIMIT 10`,
          [query, `%${query}%`]
        );
        results.people = people.rows;
      }

      if (!type || type === 'organization') {
        const orgs = await client.query(
          `SELECT id, name, category, website, location, regulatory_stance, parent_org_id,
                  ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
           FROM organizations
           WHERE search_vector @@ plainto_tsquery('english', $1)
              OR name ILIKE $2
           ORDER BY
             CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END,
             ts_rank(search_vector, plainto_tsquery('english', $1)) DESC
           LIMIT 10`,
          [query, `%${query}%`]
        );
        results.organizations = orgs.rows;
      }

      if (!type || type === 'resource') {
        const resources = await client.query(
          `SELECT id, title, author, resource_type, category,
                  ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
           FROM resources
           WHERE search_vector @@ plainto_tsquery('english', $1)
              OR title ILIKE $2
           ORDER BY
             CASE WHEN title ILIKE $2 THEN 0 ELSE 1 END,
             ts_rank(search_vector, plainto_tsquery('english', $1)) DESC
           LIMIT 10`,
          [query, `%${query}%`]
        );
        results.resources = resources.rows;
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(results),
      };
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Search error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
