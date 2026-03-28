import pg from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { generateMapData } from './export-map.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const s3 = new S3Client({});
const cf = new CloudFrontClient({});
const S3_BUCKET = process.env.S3_BUCKET;
const CF_DIST_ID = process.env.CF_DISTRIBUTION_ID;

async function refreshMapData(client) {
  try {
    const data = await generateMapData(client);
    const json = JSON.stringify(data);
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: 'map-data.json',
      Body: json,
      ContentType: 'application/json',
      CacheControl: 'public, max-age=60',
    }));
    await cf.send(new CreateInvalidationCommand({
      DistributionId: CF_DIST_ID,
      InvalidationBatch: {
        Paths: { Quantity: 1, Items: ['/map-data.json'] },
        CallerReference: `admin-approve-${Date.now()}`,
      },
    }));
    console.log('Map data refreshed on S3 + CloudFront invalidated');
  } catch (e) {
    console.warn('Map data refresh failed (non-critical):', e.message);
  }
}

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
      const status = params.status;
      const noStatusFilter = ['submissions', 'relationships', 'person_organizations'].includes(table);
      const query = (noStatusFilter || !status)
        ? `SELECT * FROM ${table} ORDER BY id DESC LIMIT 500`
        : `SELECT * FROM ${table} WHERE status = $1 ORDER BY id DESC LIMIT 500`;
      const result = (noStatusFilter || !status)
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

        // Fetch submission data before marking merged (needed for org linking below)
        const subResult = await client.query(
          `SELECT s.data FROM submissions s
           JOIN ${table} t ON t.id = $1
           WHERE s.entity_type = $2 AND s.status = 'pending'
             AND (s.entity_id = $1 OR s.data->>'name' = t.name)
           ORDER BY s.id DESC LIMIT 1`,
          [id, type]
        );

        await client.query(`UPDATE ${table} SET status = 'approved' WHERE id = $1`, [id]);
        // Also update linked submission
        await client.query(`UPDATE submissions SET status = 'merged', reviewed_at = NOW() WHERE entity_type = $1 AND entity_id = $2 AND status = 'pending'`, [type, id]);
        // If no entity_id match, try matching by data
        await client.query(`UPDATE submissions SET status = 'merged', reviewed_at = NOW() WHERE id IN (SELECT s.id FROM submissions s, ${table} t WHERE t.id = $1 AND s.entity_type = $2 AND s.status = 'pending' AND s.data->>'name' = t.name LIMIT 1)`, [id, type]);

        // For persons: link affiliated orgs into person_organizations
        if (type === 'person' && subResult.rows.length > 0) {
          const subData = subResult.rows[0].data;
          const affiliatedOrgIds = subData.affiliatedOrgIds;
          if (Array.isArray(affiliatedOrgIds)) {
            for (const orgId of affiliatedOrgIds) {
              const parsedOrgId = parseInt(orgId, 10);
              if (!isNaN(parsedOrgId)) {
                await client.query(
                  `INSERT INTO person_organizations (person_id, organization_id, is_primary)
                   SELECT $1, $2, false
                   WHERE NOT EXISTS (
                     SELECT 1 FROM person_organizations WHERE person_id = $1 AND organization_id = $2
                   )`,
                  [id, parsedOrgId]
                );
              }
            }
          }
        }

        // Regenerate map-data.json on S3 so the map reflects the approval (including new org links)
        await refreshMapData(client);
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
          people: ['name','category','title','primary_org','other_orgs','location','regulatory_stance','regulatory_stance_detail','evidence_source','agi_timeline','ai_risk_level','threat_models','threat_models_detail','influence_type','twitter','bluesky','notes','thumbnail_url','status'],
          organizations: ['name','category','website','location','funding_model','regulatory_stance','regulatory_stance_detail','evidence_source','agi_timeline','ai_risk_level','threat_models','threat_models_detail','influence_type','twitter','bluesky','notes','parent_org_id','thumbnail_url','status'],
          resources: ['title','author','resource_type','url','year','category','key_argument','notes','regulatory_stance','agi_timeline','ai_risk_level','status'],
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
