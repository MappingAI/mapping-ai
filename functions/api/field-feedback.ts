import type { Env } from './_shared/env.ts'
import { jsonResponse, optionsResponse } from './_shared/cors.ts'
import { getDb } from './_shared/db.ts'

async function computeVoterHash(ip: string, salt: string | undefined): Promise<string> {
  const raw = salt ? ip + salt : ip
  const data = new TextEncoder().encode(raw)
  const hashBuf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return optionsResponse(request, { methods: 'POST, GET, OPTIONS' })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for')
  if (!ip) {
    return jsonResponse({ error: 'Unable to identify client' }, request, 400)
  }

  let body: {
    entityId?: number
    fieldName?: string
    vote?: number
    voterId?: string
    action?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, request, 400)
  }

  const { entityId, fieldName, vote, action } = body
  if (!entityId || !fieldName || (vote !== 1 && vote !== -1)) {
    return jsonResponse({ error: 'Invalid request: entityId, fieldName, vote (+1/-1) required' }, request, 400)
  }
  if (!/^[a-z][a-z0-9_]{0,99}$/.test(fieldName)) {
    return jsonResponse({ error: 'Invalid fieldName format' }, request, 400)
  }

  const voterHash = await computeVoterHash(ip, env.VOTER_SALT)

  const sql = getDb(env.DATABASE_URL)
  if (action === 'remove') {
    await sql`
      DELETE FROM field_feedback
      WHERE entity_id = ${entityId} AND field_name = ${fieldName} AND voter_id = ${voterHash} AND vote = ${vote}
    `
  } else {
    await sql`
      INSERT INTO field_feedback (entity_id, field_name, vote, voter_id)
      VALUES (${entityId}, ${fieldName}, ${vote}, ${voterHash})
      ON CONFLICT (entity_id, field_name, voter_id, vote) DO NOTHING
    `
  }

  return jsonResponse({ ok: true }, request)
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const entityIdParam = url.searchParams.get('entityId')
  if (!entityIdParam) {
    return jsonResponse({ error: 'entityId required' }, request, 400)
  }
  const entityId = parseInt(entityIdParam, 10)
  if (isNaN(entityId)) {
    return jsonResponse({ error: 'entityId must be a number' }, request, 400)
  }

  const sql = getDb(env.DATABASE_URL)
  const rows = await sql`
    SELECT field_name,
           SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END)::int AS confirms,
           SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END)::int AS flags
    FROM field_feedback
    WHERE entity_id = ${entityId}
    GROUP BY field_name
  `

  const feedback: Record<string, { confirms: number; flags: number }> = {}
  for (const row of rows) {
    feedback[row.field_name] = { confirms: row.confirms, flags: row.flags }
  }

  return jsonResponse({ feedback }, request, 200, { methods: 'POST, GET, OPTIONS' })
}
