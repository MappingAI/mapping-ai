import crypto from 'crypto'
import type { Env } from './_shared/env.ts'
import { jsonResponse, optionsResponse } from './_shared/cors.ts'
import { getDb } from './_shared/db.ts'

const RATE_LIMIT = 60
const RATE_WINDOW_MS = 60 * 60 * 1000
const ipCounts = new Map<string, { count: number; windowStart: number }>()

function checkRateLimit(ip: string | undefined): boolean {
  if (!ip) return false
  const now = Date.now()
  const entry = ipCounts.get(ip)
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    ipCounts.set(ip, { count: 1, windowStart: now })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return optionsResponse(request, { methods: 'POST, GET, OPTIONS' })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for')
  if (checkRateLimit(ip)) {
    return jsonResponse({ error: 'Rate limit exceeded' }, request, 429)
  }

  const body = (await request.json()) as {
    entityId?: number
    fieldName?: string
    vote?: number
  }

  const { entityId, fieldName, vote } = body
  if (!entityId || !fieldName || (vote !== 1 && vote !== -1)) {
    return jsonResponse({ error: 'Invalid request: entityId, fieldName, vote (+1/-1) required' }, request, 400)
  }

  const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16) : 'unknown'

  const sql = getDb(env.DATABASE_URL)
  await sql`
    INSERT INTO field_feedback (entity_id, field_name, vote, ip_hash)
    VALUES (${entityId}, ${fieldName}, ${vote}, ${ipHash})
    ON CONFLICT (entity_id, field_name, ip_hash)
    DO UPDATE SET vote = ${vote}, created_at = NOW()
  `

  return jsonResponse({ ok: true }, request)
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const entityId = url.searchParams.get('entityId')
  if (!entityId) {
    return jsonResponse({ error: 'entityId required' }, request, 400)
  }

  const sql = getDb(env.DATABASE_URL)
  const rows = await sql`
    SELECT field_name,
           SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END)::int AS confirms,
           SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END)::int AS flags
    FROM field_feedback
    WHERE entity_id = ${parseInt(entityId, 10)}
    GROUP BY field_name
  `

  const feedback: Record<string, { confirms: number; flags: number }> = {}
  for (const row of rows) {
    feedback[row.field_name] = { confirms: row.confirms, flags: row.flags }
  }

  return jsonResponse({ feedback }, request, 200, { methods: 'POST, GET, OPTIONS' })
}
