/**
 * Admin endpoint — Cloudflare Pages Function port of api/admin.ts (Lambda).
 *
 * GET/POST /api/admin
 *
 * Full admin CRUD: approve, reject, merge, update, delete entities/submissions.
 * Key differences from Lambda:
 *  - R2 bucket binding replaces S3 for map-data.json uploads
 *  - Cloudflare cache API replaces CloudFront invalidation
 *  - export-map.ts is imported from the api/ directory (shared with Lambda)
 */
import type { Env } from './_shared/env.ts'
import type { NeonQueryFn } from './_shared/db.ts'
import { jsonResponse, optionsResponse } from './_shared/cors.ts'
import { getDb } from './_shared/db.ts'
import { generateMapData, splitMapData } from '../../api/export-map.ts'

async function refreshMapData(sql: NeonQueryFn, bucket: R2Bucket) {
  try {
    const data = await generateMapData(sql.query)
    const { skeleton, detail } = splitMapData(data)

    // Upload skeleton + detail to R2 in parallel
    await Promise.all([
      bucket.put('map-data.json', JSON.stringify(skeleton), {
        httpMetadata: {
          contentType: 'application/json',
          cacheControl: 'public, max-age=60',
        },
      }),
      bucket.put('map-detail.json', JSON.stringify(detail), {
        httpMetadata: {
          contentType: 'application/json',
          cacheControl: 'public, max-age=60',
        },
      }),
    ])

    // Purge Cloudflare cache for these URLs
    // NOTE: Cache API purge requires the full URLs. In Pages, the assets are
    // served from the same domain, so we purge using the site URL.
    // For now, the short max-age=60 handles staleness. If needed, add
    // explicit cache purge via the Cloudflare API with an API token binding.
  } catch (e) {
    console.warn('Map data refresh failed (non-critical):', e instanceof Error ? e.message : String(e))
  }
}

// All editable non-aggregate entity fields
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

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const corsOptions = {
    methods: 'GET, POST, PUT, DELETE, OPTIONS',
    headers: 'Content-Type, X-Admin-Key',
  }

  if (request.method === 'OPTIONS') {
    return optionsResponse(request, corsOptions)
  }

  const url = new URL(request.url)
  const key = request.headers.get('x-admin-key') || url.searchParams.get('key')
  if (key !== env.ADMIN_KEY) {
    return jsonResponse({ error: 'Unauthorized' }, request, 401, corsOptions)
  }

  const sql = getDb(env.DATABASE_URL)

  try {
    // ── GET endpoints ──────────────────────────────────────────────────────

    if (request.method === 'GET') {
      const action = url.searchParams.get('action')

      // GET ?action=pending
      if (action === 'pending') {
        const rows = await sql.query(
          `SELECT * FROM submission WHERE entity_id IS NULL AND status = 'pending' ORDER BY id DESC`,
        )
        return jsonResponse({ submissions: rows }, request, 200, corsOptions)
      }

      // GET ?action=pending_merges
      if (action === 'pending_merges') {
        const rows = await sql.query(`
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
                'belief_threat_models',        s.belief_threat_models,
                'topic_tags',                  s.topic_tags,
                'format_tags',                 s.format_tags,
                'advocated_stance',            s.advocated_stance,
                'advocated_timeline',          s.advocated_timeline,
                'advocated_risk',              s.advocated_risk
              )
            ) FILTER (WHERE s.id IS NOT NULL) AS pending_submissions
          FROM entity e
          JOIN submission s ON s.entity_id = e.id AND s.status = 'pending'
          GROUP BY e.id
          ORDER BY e.id DESC
        `)
        return jsonResponse({ entities: rows }, request, 200, corsOptions)
      }

      // GET ?action=all&type=entity|submission|edge&status=...&entity_type=...
      if (action === 'all') {
        const tableType = url.searchParams.get('type') || 'entity'
        if (!['entity', 'submission', 'edge'].includes(tableType)) {
          return jsonResponse({ error: 'Invalid type' }, request, 400, corsOptions)
        }
        const hasStatus = ['entity', 'submission'].includes(tableType)
        const entityType = url.searchParams.get('entity_type')
        const filterStatus = url.searchParams.get('status')

        const conditions: string[] = []
        const values: string[] = []
        let idx = 1

        if (hasStatus && filterStatus) {
          conditions.push(`status = $${idx++}`)
          values.push(filterStatus)
        }
        if (tableType === 'entity' && entityType) {
          conditions.push(`entity_type = $${idx++}`)
          values.push(entityType)
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
        const queryStr = `SELECT * FROM ${tableType} ${whereClause} ORDER BY id DESC LIMIT 500`
        const rows = await sql.query(queryStr, values)
        return jsonResponse({ data: rows, total: rows.length }, request, 200, corsOptions)
      }

      // GET ?action=stats
      if (action === 'stats') {
        const rows = await sql.query(`
          SELECT
            (SELECT json_object_agg(entity_type, cnt) FROM (SELECT entity_type, COUNT(*)::int AS cnt FROM entity WHERE status = 'approved' GROUP BY entity_type) t) AS approved,
            (SELECT json_object_agg(entity_type, cnt) FROM (SELECT entity_type, COUNT(*)::int AS cnt FROM entity WHERE status = 'pending'  GROUP BY entity_type) t) AS pending,
            (SELECT COUNT(*)::int FROM submission WHERE entity_id IS NULL     AND status = 'pending') AS pending_new,
            (SELECT COUNT(*)::int FROM submission WHERE entity_id IS NOT NULL AND status = 'pending') AS pending_edit,
            (SELECT COUNT(*)::int FROM edge) AS edges
        `)
        const r = rows[0] as Record<string, unknown>
        return jsonResponse(
          {
            approved: r.approved || {},
            pending: r.pending || {},
            pending_new_submissions: r.pending_new,
            pending_edit_submissions: r.pending_edit,
            edges: r.edges,
          },
          request,
          200,
          corsOptions,
        )
      }

      return jsonResponse({ error: 'Unknown action' }, request, 400, corsOptions)
    }

    // ── POST endpoints ─────────────────────────────────────────────────────

    if (request.method === 'POST') {
      const parsed: unknown = await request.json()
      const body: Record<string, unknown> =
        typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
      const action = typeof body.action === 'string' ? body.action : undefined

      // Approve a new entity submission
      if (action === 'approve') {
        const submission_id = body.submission_id
        const overrides: Record<string, unknown> =
          typeof body.data === 'object' && body.data !== null ? (body.data as Record<string, unknown>) : {}
        if (!submission_id) {
          return jsonResponse({ error: 'Missing submission_id' }, request, 400, corsOptions)
        }

        const checkRows = await sql.query(`SELECT id, entity_id FROM submission WHERE id = $1 AND status = 'pending'`, [
          submission_id,
        ])
        if (checkRows.length === 0) {
          return jsonResponse({ error: 'Submission not found or already reviewed' }, request, 404, corsOptions)
        }
        if ((checkRows[0] as Record<string, unknown>).entity_id !== null) {
          return jsonResponse({ error: 'Use action=merge for edit submissions' }, request, 400, corsOptions)
        }

        const overrideFields = Object.keys(overrides).filter((k) => ENTITY_FIELDS.includes(k))
        const setClauses = overrideFields.map((k, i) => `${k} = $${i + 2}`)
        setClauses.push(`status = $${overrideFields.length + 2}`)
        setClauses.push(`reviewed_at = NOW()`)
        const values = [submission_id, ...overrideFields.map((k) => overrides[k]), 'approved']
        await sql.query(`UPDATE submission SET ${setClauses.join(', ')} WHERE id = $1`, values)

        await refreshMapData(sql, env.DATA_BUCKET)
        return jsonResponse({ success: true, action: 'approved' }, request, 200, corsOptions)
      }

      // Reject a new entity submission
      if (action === 'reject') {
        const { submission_id, resolution_notes } = body
        if (!submission_id) {
          return jsonResponse({ error: 'Missing submission_id' }, request, 400, corsOptions)
        }
        await sql.query(
          `UPDATE submission SET status = 'rejected', reviewed_at = NOW(), resolution_notes = $1
           WHERE id = $2 AND entity_id IS NULL`,
          [resolution_notes || null, submission_id],
        )
        return jsonResponse({ success: true, action: 'rejected' }, request, 200, corsOptions)
      }

      // Merge an edit submission into the existing entity
      if (action === 'merge') {
        const submission_id = body.submission_id
        const merged_data: Record<string, unknown> =
          typeof body.merged_data === 'object' && body.merged_data !== null
            ? (body.merged_data as Record<string, unknown>)
            : {}
        const resolution_notes = typeof body.resolution_notes === 'string' ? body.resolution_notes : null
        if (!submission_id) {
          return jsonResponse({ error: 'Missing submission_id' }, request, 400, corsOptions)
        }

        const subRows = await sql.query(`SELECT entity_id FROM submission WHERE id = $1 AND status = 'pending'`, [
          submission_id,
        ])
        if (subRows.length === 0) {
          return jsonResponse({ error: 'Submission not found or already reviewed' }, request, 404, corsOptions)
        }
        const entityId = (subRows[0] as Record<string, unknown>).entity_id
        if (!entityId) {
          return jsonResponse({ error: 'Use action=approve for new entity submissions' }, request, 400, corsOptions)
        }

        const entityRows = await sql.query(`SELECT * FROM entity WHERE id = $1`, [entityId])
        if (entityRows.length === 0) {
          return jsonResponse({ error: 'Entity not found' }, request, 404, corsOptions)
        }

        if (Object.keys(merged_data).length > 0) {
          const updates: string[] = []
          const values: unknown[] = []
          let idx = 1
          for (const [field, value] of Object.entries(merged_data)) {
            if (!ENTITY_FIELDS.includes(field)) continue
            updates.push(`${field} = $${idx++}`)
            values.push(value)
          }
          if (updates.length > 0) {
            values.push(entityId)
            await sql.query(`UPDATE entity SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, values)
          }
        }

        await sql.query(
          `UPDATE submission SET status = 'approved', reviewed_at = NOW(), resolution_notes = $1 WHERE id = $2`,
          [resolution_notes || null, submission_id],
        )

        await refreshMapData(sql, env.DATA_BUCKET)
        return jsonResponse({ success: true, action: 'merged' }, request, 200, corsOptions)
      }

      // Reject an edit submission
      if (action === 'reject_submission') {
        const { submission_id, resolution_notes } = body
        if (!submission_id) {
          return jsonResponse({ error: 'Missing submission_id' }, request, 400, corsOptions)
        }
        await sql.query(
          `UPDATE submission SET status = 'rejected', reviewed_at = NOW(), resolution_notes = $1 WHERE id = $2`,
          [resolution_notes || null, submission_id],
        )
        return jsonResponse({ success: true, action: 'rejected_submission' }, request, 200, corsOptions)
      }

      // Direct entity edit
      if (action === 'update_entity') {
        const entity_id = body.entity_id
        const data: Record<string, unknown> =
          typeof body.data === 'object' && body.data !== null ? (body.data as Record<string, unknown>) : {}
        if (!entity_id || Object.keys(data).length === 0) {
          return jsonResponse({ error: 'Missing entity_id or data' }, request, 400, corsOptions)
        }
        const updates: string[] = []
        const values: unknown[] = []
        let idx = 1
        for (const [field, value] of Object.entries(data)) {
          if (!ENTITY_FIELDS.includes(field)) continue
          updates.push(`${field} = $${idx++}`)
          values.push(value)
        }
        if (updates.length === 0) {
          return jsonResponse({ error: 'No valid fields' }, request, 400, corsOptions)
        }
        values.push(entity_id)
        await sql.query(`UPDATE entity SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, values)
        await refreshMapData(sql, env.DATA_BUCKET)
        return jsonResponse({ success: true, action: 'updated' }, request, 200, corsOptions)
      }

      // Delete an entity (clear FK references in submission + edge first)
      if (action === 'delete') {
        const entity_id = body.entity_id
        if (!entity_id) {
          return jsonResponse({ error: 'Missing entity_id' }, request, 400, corsOptions)
        }
        await sql.query(`BEGIN`)
        await sql.query(`UPDATE submission SET entity_id = NULL WHERE entity_id = $1`, [entity_id])
        await sql.query(`DELETE FROM edge WHERE source_id = $1 OR target_id = $1`, [entity_id])
        await sql.query(`DELETE FROM entity WHERE id = $1`, [entity_id])
        await sql.query(`COMMIT`)
        await refreshMapData(sql, env.DATA_BUCKET)
        return jsonResponse({ success: true, action: 'deleted' }, request, 200, corsOptions)
      }

      return jsonResponse({ error: 'Unknown action' }, request, 400, corsOptions)
    }

    return jsonResponse({ error: 'Method not allowed' }, request, 405, corsOptions)
  } catch (error) {
    console.error('Admin error:', error)
    return jsonResponse(
      {
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : String(error),
      },
      request,
      500,
      corsOptions,
    )
  }
}
