// Admin API — 3-table schema (entity / submission / edge)
import pg, { type PoolClient } from 'pg'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { generateMapData, splitMapData } from './export-map.js'
import { getCorsHeaders } from './cors.js'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  options: '-c statement_timeout=30000',
})

const s3 = new S3Client({})
const cf = new CloudFrontClient({})
const S3_BUCKET = process.env.S3_BUCKET
const CF_DIST_ID = process.env.CF_DISTRIBUTION_ID
const ADMIN_KEY = process.env.ADMIN_KEY

async function refreshMapData(client: PoolClient) {
  try {
    // Wrap pg.PoolClient in the SqlQueryFn interface that export-map.ts expects
    const sql = async (query: string, params?: unknown[]) => {
      const result = await client.query(query, params)
      return result.rows as Record<string, unknown>[]
    }
    const data = await generateMapData(sql)
    const { skeleton, detail } = splitMapData(data)

    // Upload skeleton + detail in parallel
    await Promise.all([
      s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: 'map-data.json',
          Body: JSON.stringify(skeleton),
          ContentType: 'application/json',
          CacheControl: 'public, max-age=60',
        }),
      ),
      s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: 'map-detail.json',
          Body: JSON.stringify(detail),
          ContentType: 'application/json',
          CacheControl: 'public, max-age=60',
        }),
      ),
    ])

    await cf.send(
      new CreateInvalidationCommand({
        DistributionId: CF_DIST_ID,
        InvalidationBatch: {
          Paths: { Quantity: 2, Items: ['/map-data.json', '/map-detail.json'] },
          CallerReference: `admin-${Date.now()}`,
        },
      }),
    )
  } catch (e) {
    console.warn('Map data refresh failed (non-critical):', e instanceof Error ? e.message : String(e))
  }
}

// All editable non-aggregate entity fields. Score aggregates are trigger-maintained.
const ENTITY_FIELDS = [
  'name',
  'title',
  'category',
  'other_categories',
  'primary_org',
  'other_orgs',
  'website',
  'funding_model',
  'parent_org_id',
  'resource_title',
  'resource_category',
  'resource_author',
  'resource_type',
  'resource_url',
  'resource_year',
  'resource_key_argument',
  'topic_tags',
  'format_tags',
  'advocated_stance',
  'advocated_timeline',
  'advocated_risk',
  'location',
  'influence_type',
  'twitter',
  'bluesky',
  'notes',
  'thumbnail_url',
  'belief_regulatory_stance',
  'belief_regulatory_stance_detail',
  'belief_evidence_source',
  'belief_agi_timeline',
  'belief_ai_risk',
  'belief_threat_models',
  'status',
]

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const CORS_HEADERS = getCorsHeaders(event, {
    methods: 'GET, POST, PUT, DELETE, OPTIONS',
    headers: 'Content-Type, X-Admin-Key',
  })
  const method = event.requestContext.http.method
  if (method === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' }

  const key = event.headers?.['x-admin-key'] || event.queryStringParameters?.key
  if (key !== ADMIN_KEY)
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized' }),
    }

  const params = event.queryStringParameters || {}
  const client = await pool.connect()

  try {
    // ── GET endpoints ──────────────────────────────────────────────────────────

    // GET ?action=pending — new entity submissions (entity_id IS NULL)
    if (method === 'GET' && params.action === 'pending') {
      const result = await client.query(
        `SELECT * FROM submission WHERE entity_id IS NULL AND status = 'pending' ORDER BY id DESC`,
      )
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ submissions: result.rows }),
      }
    }

    // GET ?action=pending_merges — edit submissions for existing entities (entity_id IS NOT NULL)
    if (method === 'GET' && params.action === 'pending_merges') {
      const result = await client.query(`
        SELECT
          e.*,
          json_agg(
            json_build_object(
              'id',                          s.id,
              'submitter_email',             s.submitter_email,
              'submitter_relationship',      s.submitter_relationship,
              'llm_review',                  s.llm_review,
              'submitted_at',                s.submitted_at,
              'name',                        s.name,
              'title',                       s.title,
              'category',                    s.category,
              'primary_org',                 s.primary_org,
              'other_orgs',                  s.other_orgs,
              'website',                     s.website,
              'funding_model',               s.funding_model,
              'resource_title',              s.resource_title,
              'resource_category',           s.resource_category,
              'resource_author',             s.resource_author,
              'resource_type',               s.resource_type,
              'resource_url',                s.resource_url,
              'resource_year',               s.resource_year,
              'resource_key_argument',       s.resource_key_argument,
              'topic_tags',                  s.topic_tags,
              'format_tags',                 s.format_tags,
              'advocated_stance',            s.advocated_stance,
              'advocated_timeline',          s.advocated_timeline,
              'advocated_risk',              s.advocated_risk,
              'location',                    s.location,
              'influence_type',              s.influence_type,
              'twitter',                     s.twitter,
              'bluesky',                     s.bluesky,
              'notes',                       s.notes,
              'belief_regulatory_stance',    s.belief_regulatory_stance,
              'belief_regulatory_stance_detail', s.belief_regulatory_stance_detail,
              'belief_evidence_source',      s.belief_evidence_source,
              'belief_agi_timeline',         s.belief_agi_timeline,
              'belief_ai_risk',              s.belief_ai_risk,
              'belief_threat_models',        s.belief_threat_models
            )
          ) FILTER (WHERE s.id IS NOT NULL) AS pending_submissions
        FROM entity e
        JOIN submission s ON s.entity_id = e.id AND s.status = 'pending'
        GROUP BY e.id
        ORDER BY e.id DESC
      `)
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ entities: result.rows }),
      }
    }

    // GET ?action=all&type=entity|submission|edge&status=approved&entity_type=person|organization|resource
    if (method === 'GET' && params.action === 'all') {
      const type = params.type || 'entity'
      if (!['entity', 'submission', 'edge'].includes(type)) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Invalid type' }),
        }
      }
      const hasStatus = ['entity', 'submission'].includes(type)
      const entityType = params.entity_type // person, organization, resource

      // Build query with optional filters
      const conditions = []
      const values = []
      let idx = 1

      if (hasStatus && params.status) {
        conditions.push(`status = $${idx++}`)
        values.push(params.status)
      }
      if (type === 'entity' && entityType) {
        conditions.push(`entity_type = $${idx++}`)
        values.push(entityType)
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const query = `SELECT * FROM ${type} ${whereClause} ORDER BY id DESC LIMIT 500`
      const result = await client.query(query, values)
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ data: result.rows, total: result.rows.length }),
      }
    }

    // GET ?action=stats — single query instead of 5 round-trips
    if (method === 'GET' && params.action === 'stats') {
      const result = await client.query(`
        SELECT
          (SELECT json_object_agg(entity_type, cnt) FROM (SELECT entity_type, COUNT(*)::int AS cnt FROM entity WHERE status = 'approved' GROUP BY entity_type) t) AS approved,
          (SELECT json_object_agg(entity_type, cnt) FROM (SELECT entity_type, COUNT(*)::int AS cnt FROM entity WHERE status = 'pending'  GROUP BY entity_type) t) AS pending,
          (SELECT COUNT(*)::int FROM submission WHERE entity_id IS NULL     AND status = 'pending') AS pending_new,
          (SELECT COUNT(*)::int FROM submission WHERE entity_id IS NOT NULL AND status = 'pending') AS pending_edit,
          (SELECT COUNT(*)::int FROM edge) AS edges
      `)
      const r = result.rows[0]
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          approved: r.approved || {},
          pending: r.pending || {},
          pending_new_submissions: r.pending_new,
          pending_edit_submissions: r.pending_edit,
          edges: r.edges,
        }),
      }
    }

    // ── POST endpoints ─────────────────────────────────────────────────────────
    if (method === 'POST') {
      // Admin POST body is polymorphic — 10+ actions, each with different
      // required fields (approve/reject/merge/update_entity/delete/...).
      // Each branch narrows what it needs from the raw record below, rather
      // than modelling the whole shape as one big discriminated union up
      // front. Keeping the entry type as `Record<string, unknown>` means
      // tsc still catches accidental non-string/non-number reads per branch
      // (whereas `any` silently propagates).
      const parsed: unknown = JSON.parse(event.body ?? '{}')
      const body: Record<string, unknown> =
        typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
      const action = typeof body.action === 'string' ? body.action : undefined

      // Approve a new entity submission (entity_id IS NULL).
      // Admin may pass overrides in `data`; those are written to the submission row
      // before status is set to 'approved', so the BEFORE trigger picks them up.
      if (action === 'approve') {
        const submission_id = body.submission_id
        const overrides: Record<string, unknown> =
          typeof body.data === 'object' && body.data !== null ? (body.data as Record<string, unknown>) : {}
        if (!submission_id) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Missing submission_id' }),
          }
        }

        // Verify it's a new-entity submission
        const check = await client.query(`SELECT id, entity_id FROM submission WHERE id = $1 AND status = 'pending'`, [
          submission_id,
        ])
        if (check.rows.length === 0) {
          return {
            statusCode: 404,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Submission not found or already reviewed' }),
          }
        }
        if (check.rows[0].entity_id !== null) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Use action=merge for edit submissions' }),
          }
        }

        // Apply any admin field overrides to the submission row, then set status.
        // The BEFORE trigger will create the entity from the final submission values.
        const overrideFields = Object.keys(overrides).filter((k) => ENTITY_FIELDS.includes(k))
        const setClauses = overrideFields.map((k, i) => `${k} = $${i + 2}`)
        setClauses.push(`status = $${overrideFields.length + 2}`)
        setClauses.push(`reviewed_at = NOW()`)
        const values = [submission_id, ...overrideFields.map((k) => overrides[k]), 'approved']
        await client.query(`UPDATE submission SET ${setClauses.join(', ')} WHERE id = $1`, values)

        await refreshMapData(client)
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, action: 'approved' }),
        }
      }

      // Reject a new entity submission
      if (action === 'reject') {
        const { submission_id, resolution_notes } = body
        if (!submission_id) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Missing submission_id' }),
          }
        }
        await client.query(
          `UPDATE submission SET status = 'rejected', reviewed_at = NOW(), resolution_notes = $1
           WHERE id = $2 AND entity_id IS NULL`,
          [resolution_notes || null, submission_id],
        )
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, action: 'rejected' }),
        }
      }

      // Merge an edit submission (entity_id IS NOT NULL) into the existing entity.
      // merged_data: admin-selected field values to write onto the entity.
      // Null-overwrite guard: will not blank a currently non-null entity field.
      if (action === 'merge') {
        const submission_id = body.submission_id
        const merged_data: Record<string, unknown> =
          typeof body.merged_data === 'object' && body.merged_data !== null
            ? (body.merged_data as Record<string, unknown>)
            : {}
        const resolution_notes = typeof body.resolution_notes === 'string' ? body.resolution_notes : null
        if (!submission_id) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Missing submission_id' }),
          }
        }

        const sub = await client.query(`SELECT entity_id FROM submission WHERE id = $1 AND status = 'pending'`, [
          submission_id,
        ])
        if (sub.rows.length === 0) {
          return {
            statusCode: 404,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Submission not found or already reviewed' }),
          }
        }
        const entityId = sub.rows[0].entity_id
        if (!entityId) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Use action=approve for new entity submissions' }),
          }
        }

        // Fetch current entity to enforce null-overwrite guard
        const entityRow = await client.query(`SELECT * FROM entity WHERE id = $1`, [entityId])
        if (entityRow.rows.length === 0) {
          return {
            statusCode: 404,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Entity not found' }),
          }
        }
        if (Object.keys(merged_data).length > 0) {
          const updates = []
          const values = []
          let idx = 1
          for (const [field, value] of Object.entries(merged_data)) {
            if (!ENTITY_FIELDS.includes(field)) continue
            // Admin explicitly selected this field for merge — allow clearing
            updates.push(`${field} = $${idx++}`)
            values.push(value)
          }
          if (updates.length > 0) {
            values.push(entityId)
            await client.query(`UPDATE entity SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, values)
          }
        }

        // Mark submission approved — AFTER trigger recalculates scores
        await client.query(
          `UPDATE submission SET status = 'approved', reviewed_at = NOW(), resolution_notes = $1 WHERE id = $2`,
          [resolution_notes || null, submission_id],
        )

        await refreshMapData(client)
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, action: 'merged' }),
        }
      }

      // Reject an edit submission (entity_id IS NOT NULL) without touching the entity
      if (action === 'reject_submission') {
        const { submission_id, resolution_notes } = body
        if (!submission_id) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Missing submission_id' }),
          }
        }
        await client.query(
          `UPDATE submission SET status = 'rejected', reviewed_at = NOW(), resolution_notes = $1 WHERE id = $2`,
          [resolution_notes || null, submission_id],
        )
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, action: 'rejected_submission' }),
        }
      }

      // Direct entity edit — admin can set any field, including blanking non-null values
      if (action === 'update_entity') {
        const entity_id = body.entity_id
        const data: Record<string, unknown> =
          typeof body.data === 'object' && body.data !== null ? (body.data as Record<string, unknown>) : {}
        if (!entity_id || !data) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Missing entity_id or data' }),
          }
        }
        const updates = []
        const values = []
        let idx = 1
        for (const [field, value] of Object.entries(data)) {
          if (!ENTITY_FIELDS.includes(field)) continue
          updates.push(`${field} = $${idx++}`)
          values.push(value)
        }
        if (updates.length === 0) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'No valid fields' }),
          }
        }
        values.push(entity_id)
        await client.query(`UPDATE entity SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, values)
        await refreshMapData(client)
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, action: 'updated' }),
        }
      }

      // Delete an entity (and cascades to edges + submissions via FK)
      if (action === 'delete') {
        const entity_id = body.entity_id
        if (!entity_id) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Missing entity_id' }),
          }
        }
        await client.query(`DELETE FROM entity WHERE id = $1`, [entity_id])
        await refreshMapData(client)
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, action: 'deleted' }),
        }
      }

      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Unknown action' }),
      }
    }

    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  } catch (error) {
    console.error('Admin error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : String(error),
      }),
    }
  } finally {
    client.release()
  }
}
