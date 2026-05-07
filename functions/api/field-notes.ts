import type { Env } from './_shared/env.ts'
import { jsonResponse, optionsResponse } from './_shared/cors.ts'
import { getDb } from './_shared/db.ts'

const FALLBACK_SALT = 'mapping-ai-field-notes-2026'

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
    note?: string
    noteHtml?: string
    noteMentions?: unknown[]
    voterId?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, request, 400)
  }

  const { entityId, fieldName, note, noteHtml, noteMentions, voterId } = body
  if (typeof entityId !== 'number' || !Number.isInteger(entityId) || entityId <= 0) {
    return jsonResponse({ error: 'Invalid entityId' }, request, 400)
  }
  if (!fieldName || !/^[a-z][a-z0-9_]{0,99}$/.test(fieldName)) {
    return jsonResponse({ error: 'Invalid fieldName' }, request, 400)
  }
  if (!note || typeof note !== 'string' || note.trim().length === 0) {
    return jsonResponse({ error: 'Note text required' }, request, 400)
  }
  const MAX_NOTE_LENGTH = 5000
  const trimmedNote = note.trim().slice(0, MAX_NOTE_LENGTH)
  const trimmedHtml = typeof noteHtml === 'string' ? noteHtml.slice(0, MAX_NOTE_LENGTH * 3) : null
  const mentions =
    Array.isArray(noteMentions) && noteMentions.length <= 50 ? JSON.stringify(noteMentions.slice(0, 50)) : null

  const clientId = typeof voterId === 'string' && voterId.length >= 8 ? voterId : 'anon'
  const voterHash = await computeVoterHash(ip, clientId, env.VOTER_SALT)

  const sql = getDb(env.DATABASE_URL)

  const recentCount = await sql`
    SELECT COUNT(*)::int AS cnt FROM field_notes
    WHERE voter_id = ${voterHash} AND created_at > NOW() - INTERVAL '1 minute'
  `
  if (recentCount[0]?.cnt >= 10) {
    return jsonResponse({ error: 'Rate limit exceeded, try again shortly' }, request, 429)
  }

  await sql`
    INSERT INTO field_notes (entity_id, field_name, note, note_html, note_mentions, voter_id)
    VALUES (${entityId}, ${fieldName}, ${trimmedNote}, ${trimmedHtml}, ${mentions}::jsonb, ${voterHash})
  `

  return jsonResponse({ ok: true }, request)
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const entityIdParam = url.searchParams.get('entityId')
  if (!entityIdParam) {
    return jsonResponse({ error: 'entityId required' }, request, 400)
  }
  const entityId = parseInt(entityIdParam, 10)
  if (isNaN(entityId) || entityId <= 0) {
    return jsonResponse({ error: 'entityId must be a positive integer' }, request, 400)
  }

  const sql = getDb(env.DATABASE_URL)
  const rows = await sql`
    SELECT field_name, note, note_html, created_at
    FROM field_notes
    WHERE entity_id = ${entityId}
    ORDER BY created_at DESC
    LIMIT 50
  `

  const notes: Record<string, Array<{ note: string; html: string | null; date: string }>> = {}
  for (const row of rows) {
    if (!notes[row.field_name]) notes[row.field_name] = []
    notes[row.field_name].push({
      note: row.note,
      html: row.note_html || null,
      date: row.created_at,
    })
  }

  return jsonResponse({ notes }, request, 200, { methods: 'POST, GET, OPTIONS' })
}
