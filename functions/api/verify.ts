import type { Env } from './_shared/env.ts'
import { jsonResponse, optionsResponse } from './_shared/cors.ts'
import { getDb } from './_shared/db.ts'

const FALLBACK_SALT = 'mapping-ai-field-feedback-2026'

async function computeVoterHash(ip: string, clientId: string, salt: string | undefined): Promise<string> {
  const raw = `${ip}:${clientId}:${salt || FALLBACK_SALT}`
  const data = new TextEncoder().encode(raw)
  const hashBuf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return optionsResponse(request, { methods: 'GET, POST, OPTIONS' })
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const action = url.searchParams.get('action')
  const sql = getDb(env.DATABASE_URL)

  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown'
  const voterHash = await computeVoterHash(ip, request.headers.get('X-Voter-Id') || 'anon', env.VOTER_SALT)

  if (action === 'queue') {
    const rows = await sql`
      SELECT
        e.id,
        e.name,
        e.entity_type,
        e.category,
        e.primary_org,
        COALESCE(ff.total_votes, 0)::int AS total_votes,
        COALESCE(edge_counts.edge_count, 0)::int AS edge_count,
        vr.verdict,
        (vr.entity_id IS NOT NULL) AS reviewed
      FROM entity e
      LEFT JOIN (
        SELECT entity_id, COUNT(*) AS total_votes
        FROM field_feedback
        GROUP BY entity_id
      ) ff ON ff.entity_id = e.id
      LEFT JOIN (
        SELECT source_id AS entity_id, COUNT(*) AS edge_count
        FROM edge
        GROUP BY source_id
      ) edge_counts ON edge_counts.entity_id = e.id
      LEFT JOIN verification_review vr
        ON vr.entity_id = e.id AND vr.voter_id = ${voterHash}
      WHERE e.status = 'approved'
        AND e.entity_type IN ('person', 'organization')
      ORDER BY total_votes ASC, edge_count DESC, e.name ASC
    `

    return jsonResponse({ entities: rows }, request, 200, { methods: 'GET, POST, OPTIONS' })
  }

  if (action === 'entity') {
    const idParam = url.searchParams.get('id')
    if (!idParam) return jsonResponse({ error: 'id required' }, request, 400)
    const entityId = parseInt(idParam, 10)
    if (isNaN(entityId) || entityId <= 0) return jsonResponse({ error: 'invalid id' }, request, 400)

    const [entityRows, feedbackRows, correctionRows, reviewRows] = await Promise.all([
      sql`
        SELECT id, name, entity_type, category, primary_org, other_orgs, location,
               title, website, twitter, bluesky,
               belief_regulatory_stance, belief_agi_timeline, belief_ai_risk,
               belief_threat_models, funding_model, influence_type, belief_evidence_source,
               field_verification, notes, notes_html
        FROM entity
        WHERE id = ${entityId} AND status = 'approved'
      `,
      sql`
        SELECT field_name,
               SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END)::int AS confirms,
               SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END)::int AS flags
        FROM field_feedback
        WHERE entity_id = ${entityId}
        GROUP BY field_name
      `,
      sql`
        SELECT id, field_name, error_type, original_value, corrected_value,
               correction_note, correction_note_html, created_at
        FROM verification_correction
        WHERE entity_id = ${entityId} AND voter_id = ${voterHash}
        ORDER BY created_at ASC
      `,
      sql`
        SELECT verdict, duration_ms, revisions, reviewed_at
        FROM verification_review
        WHERE entity_id = ${entityId} AND voter_id = ${voterHash}
        LIMIT 1
      `,
    ])

    if (entityRows.length === 0) return jsonResponse({ error: 'not found' }, request, 404)

    const feedback: Record<string, { confirms: number; flags: number }> = {}
    for (const row of feedbackRows) {
      feedback[row.field_name] = { confirms: row.confirms, flags: row.flags }
    }

    return jsonResponse(
      {
        entity: entityRows[0],
        feedback,
        corrections: correctionRows,
        review: reviewRows[0] ?? null,
      },
      request,
      200,
      { methods: 'GET, POST, OPTIONS' },
    )
  }

  if (action === 'next_task') {
    // Pick from top-20 least-verified (entity, field) pairs not yet voted on,
    // then return a random one to spread load across concurrent users.
    const rows = await sql`
      WITH entity_base AS (
        SELECT e.id, e.name, e.entity_type, e.category, e.primary_org,
               COALESCE(ec.cnt, 0) AS edge_count,
               e.title, e.location, e.belief_regulatory_stance,
               e.belief_agi_timeline, e.belief_ai_risk,
               e.belief_threat_models, e.funding_model
        FROM entity e
        LEFT JOIN (SELECT source_id, COUNT(*)::int AS cnt FROM edge GROUP BY source_id) ec
          ON ec.source_id = e.id
        WHERE e.status = 'approved' AND e.entity_type IN ('person', 'organization')
      ),
      tasks AS (
        SELECT id AS entity_id, name, entity_type, category, primary_org, edge_count, 'category' AS field_name, category AS field_value FROM entity_base WHERE category IS NOT NULL
        UNION ALL
        SELECT id, name, entity_type, category, primary_org, edge_count, 'title', title FROM entity_base WHERE entity_type = 'person' AND title IS NOT NULL
        UNION ALL
        SELECT id, name, entity_type, category, primary_org, edge_count, 'primary_org', primary_org FROM entity_base WHERE entity_type = 'person' AND primary_org IS NOT NULL
        UNION ALL
        SELECT id, name, entity_type, category, primary_org, edge_count, 'location', location FROM entity_base WHERE location IS NOT NULL
        UNION ALL
        SELECT id, name, entity_type, category, primary_org, edge_count, 'belief_regulatory_stance', belief_regulatory_stance FROM entity_base WHERE belief_regulatory_stance IS NOT NULL
        UNION ALL
        SELECT id, name, entity_type, category, primary_org, edge_count, 'belief_agi_timeline', belief_agi_timeline FROM entity_base WHERE entity_type = 'person' AND belief_agi_timeline IS NOT NULL
        UNION ALL
        SELECT id, name, entity_type, category, primary_org, edge_count, 'belief_ai_risk', belief_ai_risk FROM entity_base WHERE entity_type = 'person' AND belief_ai_risk IS NOT NULL
        UNION ALL
        SELECT id, name, entity_type, category, primary_org, edge_count, 'belief_threat_models', belief_threat_models FROM entity_base WHERE belief_threat_models IS NOT NULL
        UNION ALL
        SELECT id, name, entity_type, category, primary_org, edge_count, 'funding_model', funding_model FROM entity_base WHERE entity_type = 'organization' AND funding_model IS NOT NULL
      ),
      already_voted AS (
        SELECT entity_id, field_name FROM field_feedback WHERE voter_id = ${voterHash}
      ),
      vote_counts AS (
        SELECT entity_id, field_name, COUNT(*)::int AS cnt
        FROM field_feedback GROUP BY entity_id, field_name
      ),
      candidates AS (
        SELECT t.entity_id, t.name, t.entity_type, t.category, t.primary_org,
               t.field_name, t.field_value, COALESCE(vc.cnt, 0) AS vote_count
        FROM tasks t
        LEFT JOIN vote_counts vc ON vc.entity_id = t.entity_id AND vc.field_name = t.field_name
        WHERE NOT EXISTS (
          SELECT 1 FROM already_voted av
          WHERE av.entity_id = t.entity_id AND av.field_name = t.field_name
        )
        ORDER BY vote_count ASC, t.edge_count DESC
        LIMIT 20
      )
      SELECT * FROM candidates ORDER BY RANDOM() LIMIT 1
    `

    const task = rows[0]
      ? {
          entityId: rows[0].entity_id as number,
          name: rows[0].name as string,
          entityType: rows[0].entity_type as string,
          category: rows[0].category as string | null,
          primaryOrg: rows[0].primary_org as string | null,
          fieldName: rows[0].field_name as string,
          fieldValue: rows[0].field_value as string,
        }
      : null

    return jsonResponse({ task }, request, 200, { methods: 'GET, POST, OPTIONS' })
  }

  return jsonResponse({ error: 'unknown action' }, request, 400)
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for')
  if (!ip) return jsonResponse({ error: 'Unable to identify client' }, request, 400)

  const clientId = request.headers.get('X-Voter-Id') || 'anon'
  const voterHash = await computeVoterHash(ip, clientId, env.VOTER_SALT)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, request, 400)
  }

  const sql = getDb(env.DATABASE_URL)

  if (body.action === 'review') {
    const entityId = body.entityId as number
    const verdict = body.verdict as string
    const durationMs = typeof body.durationMs === 'number' ? Math.floor(body.durationMs) : null

    if (typeof entityId !== 'number' || entityId <= 0) {
      return jsonResponse({ error: 'invalid entityId' }, request, 400)
    }
    if (!['confirmed', 'needs_correction', 'flagged'].includes(verdict)) {
      return jsonResponse({ error: 'invalid verdict' }, request, 400)
    }

    // Rate limit: max 200/hour
    const recentRows = await sql`
      SELECT COUNT(*)::int AS cnt FROM verification_review
      WHERE voter_id = ${voterHash} AND reviewed_at > NOW() - INTERVAL '1 hour'
    `
    if (recentRows[0].cnt >= 200) {
      return jsonResponse({ error: 'Rate limit exceeded' }, request, 429)
    }

    await sql`
      INSERT INTO verification_review (entity_id, voter_id, verdict, duration_ms, revisions)
      VALUES (${entityId}, ${voterHash}, ${verdict}, ${durationMs}, 1)
      ON CONFLICT (entity_id, voter_id) DO UPDATE SET
        verdict = EXCLUDED.verdict,
        duration_ms = COALESCE(verification_review.duration_ms, 0) + COALESCE(EXCLUDED.duration_ms, 0),
        revisions = verification_review.revisions + 1,
        reviewed_at = NOW()
    `
    return jsonResponse({ ok: true }, request)
  }

  if (body.action === 'correction') {
    const entityId = body.entityId as number
    const fieldName = body.fieldName as string | null
    const errorType = body.errorType as string | null
    const originalValue = body.originalValue as string | null
    const correctedValue = body.correctedValue as string | null
    const correctionNote = body.correctionNote as string | null
    const correctionNoteHtml = body.correctionNoteHtml as string | null

    if (typeof entityId !== 'number' || entityId <= 0) {
      return jsonResponse({ error: 'invalid entityId' }, request, 400)
    }

    // Rate limit: max 500 corrections/hour
    const recentRows = await sql`
      SELECT COUNT(*)::int AS cnt FROM verification_correction
      WHERE voter_id = ${voterHash} AND created_at > NOW() - INTERVAL '1 hour'
    `
    if (recentRows[0].cnt >= 500) {
      return jsonResponse({ error: 'Rate limit exceeded' }, request, 429)
    }

    const inserted = await sql`
      INSERT INTO verification_correction
        (entity_id, voter_id, field_name, error_type, original_value, corrected_value, correction_note, correction_note_html)
      VALUES
        (${entityId}, ${voterHash}, ${fieldName}, ${errorType}, ${originalValue}, ${correctedValue}, ${correctionNote}, ${correctionNoteHtml})
      RETURNING id
    `
    return jsonResponse({ ok: true, id: inserted[0].id }, request)
  }

  if (body.action === 'update_correction') {
    const correctionId = body.correctionId as number
    const errorType = body.errorType as string | null
    const correctedValue = body.correctedValue as string | null
    const correctionNote = body.correctionNote as string | null
    const correctionNoteHtml = body.correctionNoteHtml as string | null

    if (typeof correctionId !== 'number' || correctionId <= 0) {
      return jsonResponse({ error: 'invalid correctionId' }, request, 400)
    }

    await sql`
      UPDATE verification_correction
      SET error_type = ${errorType},
          corrected_value = ${correctedValue},
          correction_note = ${correctionNote},
          correction_note_html = ${correctionNoteHtml}
      WHERE id = ${correctionId} AND voter_id = ${voterHash}
    `
    return jsonResponse({ ok: true }, request)
  }

  if (body.action === 'delete_correction') {
    const correctionId = body.correctionId as number
    if (typeof correctionId !== 'number' || correctionId <= 0) {
      return jsonResponse({ error: 'invalid correctionId' }, request, 400)
    }
    await sql`
      DELETE FROM verification_correction
      WHERE id = ${correctionId} AND voter_id = ${voterHash}
    `
    return jsonResponse({ ok: true }, request)
  }

  if (body.action === 'task_vote') {
    const entityId = body.entityId as number
    const fieldName = body.fieldName as string
    const originalValue = body.originalValue as string | null
    const vote = body.vote as 1 | -1 | 0
    const errorType = (body.errorType as string | undefined) ?? null
    const correctedValue = (body.correctedValue as string | undefined) ?? null

    if (typeof entityId !== 'number' || entityId <= 0) {
      return jsonResponse({ error: 'invalid entityId' }, request, 400)
    }
    if (!fieldName) return jsonResponse({ error: 'fieldName required' }, request, 400)
    if (vote !== 1 && vote !== -1 && vote !== 0) {
      return jsonResponse({ error: 'vote must be 1, -1, or 0' }, request, 400)
    }

    if (vote === 1 || vote === -1) {
      // Rate limit: 500 votes/hr
      const rateRows = await sql`
        SELECT COUNT(*)::int AS cnt FROM field_feedback
        WHERE voter_id = ${voterHash} AND created_at > NOW() - INTERVAL '1 hour'
      `
      if (rateRows[0].cnt >= 500) {
        return jsonResponse({ error: 'Rate limit exceeded' }, request, 429)
      }

      // Write to field_feedback — the same table the map reads for vote badges.
      // ON CONFLICT UPDATE: if the user changes their vote, update in place instead of ignoring.
      await sql`
        INSERT INTO field_feedback (entity_id, field_name, vote, voter_id)
        VALUES (${entityId}, ${fieldName}, ${vote}, ${voterHash})
        ON CONFLICT (entity_id, field_name, voter_id) DO UPDATE SET vote = EXCLUDED.vote, created_at = NOW()
      `

      // For flags with an error type: also write a structured correction
      if (vote === -1 && errorType) {
        await sql`
          INSERT INTO verification_correction (entity_id, voter_id, field_name, error_type, original_value, corrected_value)
          VALUES (${entityId}, ${voterHash}, ${fieldName}, ${errorType}, ${originalValue}, ${correctedValue})
        `
      }
    }

    // Session stats for this voter in the last 24h
    const statsRows = await sql`
      SELECT
        SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END)::int AS confirmed,
        SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END)::int AS flagged
      FROM field_feedback
      WHERE voter_id = ${voterHash} AND created_at > NOW() - INTERVAL '24 hours'
    `

    return jsonResponse(
      {
        ok: true,
        sessionStats: {
          confirmed: (statsRows[0]?.confirmed as number | null) ?? 0,
          flagged: (statsRows[0]?.flagged as number | null) ?? 0,
        },
      },
      request,
    )
  }

  return jsonResponse({ error: 'unknown action' }, request, 400)
}
