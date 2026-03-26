import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
};

// Simple admin key check (set in Lambda env or use a fixed key for now)
const ADMIN_KEY = process.env.ADMIN_KEY || 'mappingai-admin-2026';

function unauthorized() {
  return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) };
}

export const handler = async (event) => {
  const method = event.requestContext.http.method;
  if (method === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  // Check admin key
  const key = event.headers?.['x-admin-key'] || event.queryStringParameters?.key;
  if (key !== ADMIN_KEY) return unauthorized();

  const path = event.rawPath || event.requestContext.http.path;
  const params = event.queryStringParameters || {};

  const client = await pool.connect();
  try {
    // GET /admin?action=pending — get all pending submissions
    if (method === 'GET' && params.action === 'pending') {
      const people = await client.query("SELECT * FROM people WHERE status = 'pending' ORDER BY id DESC");
      const orgs = await client.query("SELECT * FROM organizations WHERE status = 'pending' ORDER BY id DESC");
      const resources = await client.query("SELECT * FROM resources WHERE status = 'pending' ORDER BY id DESC");
      const submissions = await client.query("SELECT * FROM submissions WHERE status = 'pending' ORDER BY id DESC");
      return {
        statusCode: 200, headers: CORS_HEADERS,
        body: JSON.stringify({ people: people.rows, organizations: orgs.rows, resources: resources.rows, submissions: submissions.rows }),
      };
    }

    // GET /admin?action=all&type=people — get all entities of a type
    if (method === 'GET' && params.action === 'all') {
      const type = params.type || 'people';
      const table = { people: 'people', organizations: 'organizations', resources: 'resources', submissions: 'submissions', relationships: 'relationships', person_organizations: 'person_organizations' }[type];
      if (!table) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid type' }) };
      const status = params.status || 'approved';
      const query = ['submissions', 'relationships', 'person_organizations'].includes(table)
        ? `SELECT * FROM ${table} ORDER BY id DESC LIMIT 500`
        : `SELECT * FROM ${table} WHERE status = $1 ORDER BY id DESC LIMIT 500`;
      const result = ['submissions', 'relationships', 'person_organizations'].includes(table)
        ? await client.query(query)
        : await client.query(query, [status]);
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ data: result.rows, total: result.rows.length }) };
    }

    // GET /admin?action=stats — get database stats
    if (method === 'GET' && params.action === 'stats') {
      const stats = {};
      for (const table of ['people', 'organizations', 'resources']) {
        const approved = await client.query(`SELECT count(*) FROM ${table} WHERE status = 'approved'`);
        const pending = await client.query(`SELECT count(*) FROM ${table} WHERE status = 'pending'`);
        stats[table] = { approved: parseInt(approved.rows[0].count), pending: parseInt(pending.rows[0].count) };
      }
      const rels = await client.query('SELECT count(*) FROM relationships');
      const pos = await client.query('SELECT count(*) FROM person_organizations');
      const subs = await client.query("SELECT count(*) FROM submissions WHERE status = 'pending'");
      stats.relationships = parseInt(rels.rows[0].count);
      stats.person_organizations = parseInt(pos.rows[0].count);
      stats.pending_submissions = parseInt(subs.rows[0].count);
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(stats) };
    }

    // POST /admin — approve, reject, update, delete, merge
    if (method === 'POST') {
      const body = JSON.parse(event.body);
      const { action, type, id, data } = body;

      // Approve a pending entry
      if (action === 'approve') {
        const table = { person: 'people', organization: 'organizations', resource: 'resources' }[type];
        if (!table) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid type' }) };
        await client.query(`UPDATE ${table} SET status = 'approved' WHERE id = $1`, [id]);
        // Also update linked submission
        await client.query(`UPDATE submissions SET status = 'merged', reviewed_at = NOW() WHERE entity_type = $1 AND entity_id = $2 AND status = 'pending'`, [type, id]);
        // If no entity_id match, try matching by data
        await client.query(`UPDATE submissions SET status = 'merged', reviewed_at = NOW() WHERE id IN (SELECT s.id FROM submissions s, ${table} t WHERE t.id = $1 AND s.entity_type = $2 AND s.status = 'pending' AND s.data->>'name' = t.name LIMIT 1)`, [id, type]);
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, action: 'approved' }) };
      }

      // Reject a pending entry
      if (action === 'reject') {
        const table = { person: 'people', organization: 'organizations', resource: 'resources' }[type];
        if (!table) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid type' }) };
        await client.query(`UPDATE ${table} SET status = 'rejected' WHERE id = $1`, [id]);
        await client.query(`UPDATE submissions SET status = 'rejected', reviewed_at = NOW() WHERE entity_type = $1 AND status = 'pending' AND (entity_id = $2 OR data->>'name' IN (SELECT name FROM ${table} WHERE id = $2))`, [type, id]);
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, action: 'rejected' }) };
      }

      // Update an entity's fields
      if (action === 'update') {
        const table = { person: 'people', organization: 'organizations', resource: 'resources' }[type];
        if (!table || !data || !id) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing data' }) };

        const allowedFields = {
          people: ['name','category','title','primary_org','other_orgs','location','regulatory_stance','evidence_source','agi_timeline','ai_risk_level','threat_models','influence_type','twitter','bluesky','notes','status'],
          organizations: ['name','category','website','location','funding_model','regulatory_stance','evidence_source','agi_timeline','ai_risk_level','threat_models','influence_type','twitter','bluesky','notes','parent_org_id','status'],
          resources: ['title','author','resource_type','url','year','category','key_argument','notes','status'],
        };
        const allowed = allowedFields[table] || [];
        const updates = [];
        const values = [];
        let idx = 1;
        for (const [key, value] of Object.entries(data)) {
          if (allowed.includes(key)) {
            updates.push(`${key} = $${idx++}`);
            values.push(value);
          }
        }
        if (updates.length === 0) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'No valid fields' }) };
        values.push(id);
        await client.query(`UPDATE ${table} SET ${updates.join(', ')} WHERE id = $${idx}`, values);
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, action: 'updated', fields: Object.keys(data) }) };
      }

      // Delete an entity
      if (action === 'delete') {
        const table = { person: 'people', organization: 'organizations', resource: 'resources' }[type];
        if (!table) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid type' }) };
        await client.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, action: 'deleted' }) };
      }

      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Unknown action' }) };
    }

    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error('Admin error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Internal server error', detail: error.message }) };
  } finally {
    client.release();
  }
};
