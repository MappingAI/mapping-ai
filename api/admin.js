// Admin API - updated 2026-03-30
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

// Score mappings for weighted average calculations
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
const SELF_WEIGHT = 3;

// Recalculate weighted scores for an entity based on all merged submissions
async function recalculateScores(client, entityType, entityId) {
  const table = entityType === 'person' ? 'people' : 'organizations';

  // Get all merged submissions for this entity
  const subs = await client.query(
    `SELECT data, is_self_submission FROM submissions
     WHERE entity_type = $1 AND entity_id = $2 AND status = 'merged'`,
    [entityType, entityId]
  );

  // Get the entity's current values (treat as original data point)
  const entity = await client.query(`SELECT regulatory_stance, agi_timeline, ai_risk_level, is_self_submission FROM ${table} WHERE id = $1`, [entityId]);
  if (entity.rows.length === 0) return;

  const scores = { stance: [], timeline: [], risk: [] };

  // Include entity's current values as the "original" data point
  const entityRow = entity.rows[0];
  const entityWeight = entityRow.is_self_submission ? SELF_WEIGHT : 1;
  if (STANCE_SCORES[entityRow.regulatory_stance]) {
    scores.stance.push({ value: STANCE_SCORES[entityRow.regulatory_stance], weight: entityWeight });
  }
  if (TIMELINE_SCORES[entityRow.agi_timeline]) {
    scores.timeline.push({ value: TIMELINE_SCORES[entityRow.agi_timeline], weight: entityWeight });
  }
  if (RISK_SCORES[entityRow.ai_risk_level]) {
    scores.risk.push({ value: RISK_SCORES[entityRow.ai_risk_level], weight: entityWeight });
  }

  // Add scores from merged submissions
  for (const sub of subs.rows) {
    const weight = sub.is_self_submission ? SELF_WEIGHT : 1;
    const data = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;

    if (STANCE_SCORES[data.regulatoryStance]) {
      scores.stance.push({ value: STANCE_SCORES[data.regulatoryStance], weight });
    }
    if (TIMELINE_SCORES[data.agiTimeline]) {
      scores.timeline.push({ value: TIMELINE_SCORES[data.agiTimeline], weight });
    }
    if (RISK_SCORES[data.aiRiskLevel]) {
      scores.risk.push({ value: RISK_SCORES[data.aiRiskLevel], weight });
    }
  }

  // Calculate weighted averages
  const weightedAvg = (arr) => {
    if (arr.length === 0) return null;
    const totalWeight = arr.reduce((sum, x) => sum + x.weight, 0);
    return arr.reduce((sum, x) => sum + x.value * x.weight, 0) / totalWeight;
  };

  // Calculate variance for disagreement score
  const variance = (arr) => {
    if (arr.length < 2) return 0;
    const values = arr.map(x => x.value);
    const mean = values.reduce((a, b) => a + b) / values.length;
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  };

  // Normalize disagreement to 0-1 range (max variance for 7-point scale is ~9)
  const maxVariance = 9;
  const disagreement = Math.min(1, Math.max(
    variance(scores.stance),
    variance(scores.timeline),
    variance(scores.risk)
  ) / maxVariance);

  await client.query(
    `UPDATE ${table} SET
      weighted_stance_score = $1,
      weighted_timeline_score = $2,
      weighted_risk_score = $3,
      disagreement_score = $4
     WHERE id = $5`,
    [
      weightedAvg(scores.stance),
      weightedAvg(scores.timeline),
      weightedAvg(scores.risk),
      disagreement,
      entityId
    ]
  );
}

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

    // GET /admin?action=pending_merges — get entities with pending submissions to merge
    if (method === 'GET' && params.action === 'pending_merges') {
      // Get people with unreviewed submissions
      const peopleWithMerges = await client.query(`
        SELECT p.*, array_agg(
          json_build_object(
            'id', s.id,
            'data', s.data,
            'submitter_email', s.submitter_email,
            'is_self_submission', s.is_self_submission,
            'llm_review', s.llm_review,
            'submitted_at', s.submitted_at
          )
        ) FILTER (WHERE s.id IS NOT NULL) as pending_submissions
        FROM people p
        LEFT JOIN submissions s ON s.entity_type = 'person' AND s.entity_id = p.id AND s.status = 'pending'
        WHERE COALESCE(p.unreviewed_submissions, 0) > 0
        GROUP BY p.id
        ORDER BY p.id DESC
      `);

      // Get organizations with unreviewed submissions
      const orgsWithMerges = await client.query(`
        SELECT o.*, array_agg(
          json_build_object(
            'id', s.id,
            'data', s.data,
            'submitter_email', s.submitter_email,
            'is_self_submission', s.is_self_submission,
            'llm_review', s.llm_review,
            'submitted_at', s.submitted_at
          )
        ) FILTER (WHERE s.id IS NOT NULL) as pending_submissions
        FROM organizations o
        LEFT JOIN submissions s ON s.entity_type = 'organization' AND s.entity_id = o.id AND s.status = 'pending'
        WHERE COALESCE(o.unreviewed_submissions, 0) > 0
        GROUP BY o.id
        ORDER BY o.id DESC
      `);

      return {
        statusCode: 200, headers: CORS_HEADERS,
        body: JSON.stringify({
          people: peopleWithMerges.rows,
          organizations: orgsWithMerges.rows,
        }),
      };
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

      // Merge a submission into an existing entity
      if (action === 'merge') {
        const { entity_id, submission_id, merged_data, resolution_notes } = body;
        const table = { person: 'people', organization: 'organizations', resource: 'resources' }[type];
        if (!table || !entity_id || !submission_id) {
          return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing required fields for merge' }) };
        }

        // Build update query from merged_data
        if (merged_data && Object.keys(merged_data).length > 0) {
          const allowedFields = {
            people: ['name','category','title','primary_org','other_orgs','location','regulatory_stance','regulatory_stance_detail','evidence_source','agi_timeline','ai_risk_level','threat_models','threat_models_detail','influence_type','twitter','bluesky','notes','thumbnail_url'],
            organizations: ['name','category','website','location','funding_model','regulatory_stance','regulatory_stance_detail','evidence_source','agi_timeline','ai_risk_level','threat_models','threat_models_detail','influence_type','twitter','bluesky','notes','parent_org_id','thumbnail_url'],
            resources: ['title','author','resource_type','url','year','category','key_argument','notes','regulatory_stance','agi_timeline','ai_risk_level'],
          };
          const allowed = allowedFields[table] || [];
          const updates = [];
          const values = [];
          let idx = 1;
          for (const [key, value] of Object.entries(merged_data)) {
            if (allowed.includes(key)) {
              updates.push(`${key} = $${idx++}`);
              values.push(value);
            }
          }
          if (updates.length > 0) {
            values.push(entity_id);
            await client.query(`UPDATE ${table} SET ${updates.join(', ')} WHERE id = $${idx}`, values);
          }
        }

        // Mark submission as merged
        await client.query(
          `UPDATE submissions SET status = 'merged', reviewed_at = NOW(), resolution_notes = $1 WHERE id = $2`,
          [resolution_notes || null, submission_id]
        );

        // Decrement unreviewed_submissions
        await client.query(
          `UPDATE ${table} SET unreviewed_submissions = GREATEST(0, COALESCE(unreviewed_submissions, 1) - 1) WHERE id = $1`,
          [entity_id]
        );

        // Recalculate weighted scores (only for people and orgs)
        if (type === 'person' || type === 'organization') {
          await recalculateScores(client, type, entity_id);
        }

        // Refresh map data
        await refreshMapData(client);

        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, action: 'merged' }) };
      }

      // Reject a single submission without affecting the entity
      if (action === 'reject_submission') {
        const { submission_id, resolution_notes } = body;
        if (!submission_id) {
          return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing submission_id' }) };
        }

        // Get the submission to find the parent entity
        const subResult = await client.query(
          'SELECT entity_type, entity_id FROM submissions WHERE id = $1',
          [submission_id]
        );
        if (subResult.rows.length === 0) {
          return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Submission not found' }) };
        }

        const { entity_type, entity_id } = subResult.rows[0];

        // Mark submission as rejected
        await client.query(
          `UPDATE submissions SET status = 'rejected', reviewed_at = NOW(), resolution_notes = $1 WHERE id = $2`,
          [resolution_notes || null, submission_id]
        );

        // Decrement unreviewed_submissions on parent entity if it exists
        if (entity_id) {
          const table = entity_type === 'person' ? 'people' : entity_type === 'organization' ? 'organizations' : 'resources';
          await client.query(
            `UPDATE ${table} SET unreviewed_submissions = GREATEST(0, COALESCE(unreviewed_submissions, 1) - 1) WHERE id = $1`,
            [entity_id]
          );
        }

        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, action: 'rejected_submission' }) };
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
