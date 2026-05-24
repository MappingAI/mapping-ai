import type { Env } from './_shared/env.ts'
import { jsonResponse, optionsResponse } from './_shared/cors.ts'
import { getDb } from './_shared/db.ts'

const corsOptions = {
  methods: 'GET, POST, OPTIONS',
  headers: 'Content-Type, X-Verify-Key',
}

async function authenticateReviewer(sql: ReturnType<typeof getDb>, keyPlaintext: string) {
  const data = new TextEncoder().encode(keyPlaintext)
  const hashBuf = await crypto.subtle.digest('SHA-256', data)
  const keyHash = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const rows = await sql`
    SELECT id, name, email FROM contributor_keys
    WHERE key_hash = ${keyHash} AND revoked_at IS NULL
  `
  return rows.length > 0 ? rows[0] : null
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return optionsResponse(request, corsOptions)
  }

  const url = new URL(request.url)
  const key = request.headers.get('x-verify-key') || url.searchParams.get('key')
  if (!key) {
    return jsonResponse({ error: 'Missing verification key' }, request, 401, corsOptions)
  }

  const sql = getDb(env.DATABASE_URL)
  const reviewer = await authenticateReviewer(sql, key)
  if (!reviewer) {
    return jsonResponse({ error: 'Invalid or revoked key' }, request, 401, corsOptions)
  }

  const reviewerKeyId = reviewer.id as number

  try {
    if (request.method === 'GET') {
      const action = url.searchParams.get('action')

      if (action === 'auth') {
        return jsonResponse({ ok: true, reviewer: { name: reviewer.name } }, request, 200, corsOptions)
      }

      if (action === 'queue') {
        const rows = await sql`
          SELECT
            e.id, e.name, e.entity_type, e.category, e.primary_org,
            e.notes IS NOT NULL AS has_notes,
            COUNT(DISTINCT c.claim_id)::int AS claim_count,
            COUNT(DISTINCT ed.id)::int AS edge_count,
            vr.verdict AS review_verdict,
            vr.updated_at AS reviewed_at
          FROM entity e
          LEFT JOIN claim c ON c.entity_id = e.id
          LEFT JOIN edge ed ON (ed.source_id = e.id OR ed.target_id = e.id)
          LEFT JOIN verification_review vr ON vr.entity_id = e.id AND vr.reviewer_key_id = ${reviewerKeyId}
          WHERE e.status = 'approved'
          GROUP BY e.id, vr.verdict, vr.updated_at
          ORDER BY
            vr.verdict IS NULL DESC,
            CASE WHEN e.entity_type = 'organization' THEN 0 ELSE 1 END,
            COUNT(DISTINCT ed.id) DESC,
            e.name
        `
        return jsonResponse({ entities: rows }, request, 200, corsOptions)
      }

      if (action === 'entity') {
        const id = parseInt(url.searchParams.get('id') || '', 10)
        if (!id || isNaN(id)) {
          return jsonResponse({ error: 'Missing entity id' }, request, 400, corsOptions)
        }

        const [entities, claims, edgeRows, corrections, reviews] = await Promise.all([
          sql`SELECT * FROM entity WHERE id = ${id}`,
          sql`
            SELECT c.*, s.url AS source_url, s.title AS source_title,
                   s.source_type, s.cached_excerpt
            FROM claim c
            LEFT JOIN source s ON s.source_id = c.source_id
            WHERE c.entity_id = ${id}
            ORDER BY c.belief_dimension, c.confidence DESC
          `,
          sql`
            SELECT e.*,
              CASE WHEN e.source_id = ${id} THEN t.name ELSE s.name END AS other_name,
              CASE WHEN e.source_id = ${id} THEN t.entity_type ELSE s.entity_type END AS other_type,
              CASE WHEN e.source_id = ${id} THEN t.id ELSE s.id END AS other_id
            FROM edge e
            LEFT JOIN entity s ON s.id = e.source_id
            LEFT JOIN entity t ON t.id = e.target_id
            WHERE e.source_id = ${id} OR e.target_id = ${id}
            ORDER BY e.edge_type, e.is_primary DESC
          `,
          sql`
            SELECT * FROM verification_correction
            WHERE entity_id = ${id} AND reviewer_key_id = ${reviewerKeyId}
            ORDER BY created_at DESC
          `,
          sql`
            SELECT * FROM verification_review
            WHERE entity_id = ${id} AND reviewer_key_id = ${reviewerKeyId}
          `,
        ])

        if (entities.length === 0) {
          return jsonResponse({ error: 'Entity not found' }, request, 404, corsOptions)
        }

        const edgeIds = edgeRows.map((e: Record<string, unknown>) => e.id as number)
        const edgeEvidenceMap: Record<number, Array<Record<string, unknown>>> = {}
        if (edgeIds.length > 0) {
          const evidenceRows = await sql`
            SELECT ee.edge_id, ee.citation, ee.confidence, ee.role_title,
                   src.url AS source_url, src.title AS source_title
            FROM edge_evidence ee
            LEFT JOIN source src ON src.source_id = ee.source_id
            WHERE ee.edge_id = ANY(${edgeIds})
            ORDER BY ee.edge_id
          `
          for (const row of evidenceRows) {
            const eid = row.edge_id as number
            if (!edgeEvidenceMap[eid]) edgeEvidenceMap[eid] = []
            edgeEvidenceMap[eid].push(row)
          }
        }

        const edges = edgeRows.map((e: Record<string, unknown>) => ({
          ...e,
          evidence_records: edgeEvidenceMap[e.id as number] || [],
        }))

        return jsonResponse(
          {
            entity: entities[0],
            claims,
            edges,
            corrections,
            review: reviews.length > 0 ? reviews[0] : null,
          },
          request,
          200,
          corsOptions,
        )
      }

      return jsonResponse({ error: 'Unknown action' }, request, 400, corsOptions)
    }

    if (request.method === 'POST') {
      const body = (await request.json()) as Record<string, unknown>
      const action = body.action as string

      if (action === 'review') {
        const entityId = body.entityId as number
        const verdict = body.verdict as string
        const notes = (body.notes as string) || null
        const durationMs = (body.durationMs as number) || null

        if (!entityId || !verdict) {
          return jsonResponse({ error: 'Missing entityId or verdict' }, request, 400, corsOptions)
        }
        if (!['confirmed', 'needs_correction', 'flagged'].includes(verdict)) {
          return jsonResponse({ error: 'Invalid verdict' }, request, 400, corsOptions)
        }

        await sql`
          INSERT INTO verification_review (entity_id, reviewer_key_id, verdict, notes, duration_ms, revisions)
          VALUES (${entityId}, ${reviewerKeyId}, ${verdict}, ${notes}, ${durationMs}, 1)
          ON CONFLICT (entity_id, reviewer_key_id)
          DO UPDATE SET
            verdict = ${verdict},
            notes = ${notes},
            duration_ms = COALESCE(verification_review.duration_ms, 0) + COALESCE(${durationMs}, 0),
            revisions = COALESCE(verification_review.revisions, 1) + 1,
            updated_at = NOW()
        `
        return jsonResponse({ ok: true }, request, 200, corsOptions)
      }

      if (action === 'correction') {
        const entityId = body.entityId as number
        if (!entityId) {
          return jsonResponse({ error: 'Missing entityId' }, request, 400, corsOptions)
        }

        await sql`
          INSERT INTO verification_correction (
            entity_id, reviewer_key_id,
            field_name, claim_id, edge_id,
            error_type, original_value, corrected_value,
            correction_note, correction_note_html,
            source_accessible, quote_found, conclusion_supported
          ) VALUES (
            ${entityId}, ${reviewerKeyId},
            ${(body.fieldName as string) || null},
            ${(body.claimId as string) || null},
            ${(body.edgeId as number) || null},
            ${(body.errorType as string) || null},
            ${(body.originalValue as string) || null},
            ${(body.correctedValue as string) || null},
            ${(body.correctionNote as string) || null},
            ${(body.correctionNoteHtml as string) || null},
            ${body.sourceAccessible != null ? (body.sourceAccessible as boolean) : null},
            ${body.quoteFound != null ? (body.quoteFound as boolean) : null},
            ${body.conclusionSupported != null ? (body.conclusionSupported as boolean) : null}
          )
        `
        return jsonResponse({ ok: true }, request, 200, corsOptions)
      }

      if (action === 'delete_correction') {
        const correctionId = body.correctionId as number
        if (!correctionId) {
          return jsonResponse({ error: 'Missing correctionId' }, request, 400, corsOptions)
        }

        await sql`
          DELETE FROM verification_correction
          WHERE id = ${correctionId} AND reviewer_key_id = ${reviewerKeyId}
        `
        return jsonResponse({ ok: true }, request, 200, corsOptions)
      }

      return jsonResponse({ error: 'Unknown action' }, request, 400, corsOptions)
    }

    return jsonResponse({ error: 'Method not allowed' }, request, 405, corsOptions)
  } catch (err) {
    console.error('Verify API error:', err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, request, 500, corsOptions)
  }
}
