/**
 * Submit endpoint — Cloudflare Pages Function port of api/submit.ts (Lambda).
 *
 * POST /api/submit
 *
 * Accepts crowdsourced entity submissions. Identical business logic to Lambda:
 * honeypot, field validation, contributor key auth, rate limiting, LLM review.
 *
 * Differences from Lambda:
 *  - Web standard Request/Response
 *  - context.env for secrets
 *  - IP from CF-Connecting-IP header (set by Cloudflare edge)
 */
import crypto from 'crypto'
import type { Env } from './_shared/env.ts'
import { jsonResponse, optionsResponse } from './_shared/cors.ts'
import { getDb } from './_shared/db.ts'

const CONTRIBUTOR_KEY_REGEX = /^mak_[a-f0-9]{32}$/

// Anonymous IP rate limiting (in-memory, per-isolate)
const ANON_RATE_LIMIT = 10
const ANON_RATE_WINDOW_MS = 60 * 60 * 1000
const anonIpCounts = new Map<string, { count: number; windowStart: number }>()

function checkAnonRateLimit(ip: string | undefined): boolean {
  if (!ip) return false
  const now = Date.now()
  const entry = anonIpCounts.get(ip)
  if (!entry || now - entry.windowStart > ANON_RATE_WINDOW_MS) {
    anonIpCounts.set(ip, { count: 1, windowStart: now })
    return false
  }
  entry.count++
  return entry.count > ANON_RATE_LIMIT
}

// Ordinal score mappings
const STANCE_SCORES: Record<string, number> = {
  Accelerate: 1,
  'Light-touch': 2,
  Targeted: 3,
  Moderate: 4,
  Restrictive: 5,
  Precautionary: 6,
  Nationalize: 7,
}
const TIMELINE_SCORES: Record<string, number> = {
  'Already here': 1,
  '2-3 years': 2,
  '5-10 years': 3,
  '10-25 years': 4,
  '25+ years or never': 5,
}
const RISK_SCORES: Record<string, number> = {
  Overstated: 1,
  Manageable: 2,
  Serious: 3,
  Catastrophic: 4,
  Existential: 5,
}

function normalizeRelationship(raw: unknown): 'self' | 'connector' | 'external' | null {
  if (!raw || typeof raw !== 'string') return null
  if (raw === 'self') return 'self'
  if (raw === 'connector' || raw === 'close_relation') return 'connector'
  return 'external'
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const corsOptions = { methods: 'POST, OPTIONS', headers: 'Content-Type, X-Contributor-Key' }

  if (request.method === 'OPTIONS') {
    return optionsResponse(request, corsOptions)
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, request, 405, corsOptions)
  }

  try {
    const bodyText = await request.text()
    if (!bodyText) {
      return jsonResponse({ error: 'Invalid request body' }, request, 400, corsOptions)
    }

    const { type, timestamp, data, _hp } = JSON.parse(bodyText) as {
      type?: string
      timestamp?: string
      data?: Record<string, unknown>
      _hp?: string
    }

    // Honeypot
    if (_hp) {
      return jsonResponse({ success: true, message: 'Submission received' }, request, 200, corsOptions)
    }

    if (!type || !data) {
      return jsonResponse({ error: 'Missing required fields' }, request, 400, corsOptions)
    }
    if (!['person', 'organization', 'resource'].includes(type)) {
      return jsonResponse({ error: 'Invalid submission type' }, request, 400, corsOptions)
    }
    if (type === 'resource' && !data.title) {
      return jsonResponse({ error: 'Missing required field: title' }, request, 400, corsOptions)
    }
    if ((type === 'person' || type === 'organization') && !data.name) {
      return jsonResponse({ error: 'Missing required field: name' }, request, 400, corsOptions)
    }

    // Field length limits
    const SHORT_LIMIT = 200
    const LONG_LIMIT = 2000
    const longFields = new Set(['notes', 'notesHtml', 'keyArgument', 'threatModels', 'regulatoryStanceDetail'])
    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== 'string') continue
      const limit = longFields.has(key) ? LONG_LIMIT : SHORT_LIMIT
      if (value.length > limit) {
        return jsonResponse({ error: `Field "${key}" exceeds maximum length` }, request, 400, corsOptions)
      }
    }

    // Contributor key validation
    const contributorKey = request.headers.get('x-contributor-key')
    let contributorKeyId: number | null = null
    let submissionId: number | null = null

    if (contributorKey && !CONTRIBUTOR_KEY_REGEX.test(contributorKey)) {
      return jsonResponse({ error: 'Invalid contributor key format' }, request, 401, corsOptions)
    }

    // Anonymous IP rate limiting
    if (!contributorKey) {
      // Cloudflare sets CF-Connecting-IP for the real client IP
      const clientIp =
        request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      if (checkAnonRateLimit(clientIp ?? undefined)) {
        return jsonResponse({ error: 'Too many submissions. Please try again later.' }, request, 429, corsOptions)
      }
    }

    const sql = getDb(env.DATABASE_URL)

    // Validate contributor key if provided
    if (contributorKey) {
      const keyHash = crypto.createHash('sha256').update(contributorKey).digest('hex')

      const keyRows = await sql.query(
        'SELECT id, name, daily_limit FROM contributor_keys WHERE key_hash = $1 AND revoked_at IS NULL',
        [keyHash],
      )

      if (keyRows.length === 0) {
        return jsonResponse({ error: 'Invalid or revoked contributor key' }, request, 401, corsOptions)
      }

      contributorKeyId = keyRows[0].id as number
      const dailyLimit = (keyRows[0].daily_limit as number) || 20

      const rateRows = await sql.query(
        `SELECT COUNT(*) AS count FROM submission
         WHERE contributor_key_id = $1 AND submitted_at > NOW() - INTERVAL '24 hours'`,
        [contributorKeyId],
      )

      if (parseInt(rateRows[0].count as string, 10) >= dailyLimit) {
        return jsonResponse({ error: 'Daily submission limit reached', limit: dailyLimit }, request, 429, corsOptions)
      }
    }

    const ts = timestamp || new Date().toISOString()
    const entityId = data.entityId ? parseInt(data.entityId as string, 10) : null
    const relationship = normalizeRelationship(data.submitterRelationship)

    const scoreKey = (v: unknown): string => (typeof v === 'string' ? v : '')
    const stanceScore = STANCE_SCORES[scoreKey(data.regulatoryStance)] ?? null
    const timelineScore = TIMELINE_SCORES[scoreKey(data.agiTimeline)] ?? null
    const riskScore = RISK_SCORES[scoreKey(data.aiRiskLevel)] ?? null

    const notesHtml = (data.notesHtml as string) || null
    const notesMentions = data.notesMentions ? JSON.parse(data.notesMentions as string) : null

    // Normalize array fields (topic_tags, format_tags): accept string[] from JSON body
    const topicTags = Array.isArray(data.topicTags)
      ? (data.topicTags as string[]).filter((t) => typeof t === 'string' && t.length > 0)
      : null
    const formatTags = Array.isArray(data.formatTags)
      ? (data.formatTags as string[]).filter((t) => typeof t === 'string' && t.length > 0)
      : null

    const insertRows = await sql.query(
      `INSERT INTO submission (
        entity_type, entity_id,
        submitter_email, submitter_relationship, contributor_key_id,
        name, title, category, other_categories, primary_org, other_orgs,
        website, funding_model, parent_org_id,
        resource_title, resource_category, resource_author, resource_type,
        resource_url, resource_year, resource_key_argument,
        topic_tags, format_tags,
        advocated_stance, advocated_timeline, advocated_risk,
        location, influence_type, twitter, bluesky, notes, notes_html, notes_mentions,
        belief_regulatory_stance, belief_regulatory_stance_score,
        belief_regulatory_stance_detail, belief_evidence_source,
        belief_agi_timeline, belief_agi_timeline_score,
        belief_ai_risk, belief_ai_risk_score,
        belief_threat_models,
        submitted_at, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31, $32, $33,
        $34, $35, $36, $37, $38, $39, $40, $41, $42,
        $43, 'pending'
      ) RETURNING id`,
      [
        type,
        entityId,
        (data.submitterEmail as string) || null,
        relationship,
        contributorKeyId,
        (data.name as string) || null,
        (data.title as string) || null,
        (data.category as string) || null,
        (data.otherCategories as string) || null,
        (data.primaryOrg as string) || null,
        (data.otherOrgs as string) || null,
        (data.website as string) || null,
        (data.fundingModel as string) || null,
        data.parentOrgId ? parseInt(data.parentOrgId as string, 10) : null,
        type === 'resource' ? (data.title as string) || null : null,
        type === 'resource' ? (data.category as string) || null : null,
        (data.author as string) || null,
        (data.resourceType as string) || null,
        (data.url as string) || null,
        (data.year as string) || null,
        (data.keyArgument as string) || null,
        topicTags && topicTags.length > 0 ? topicTags : null,
        formatTags && formatTags.length > 0 ? formatTags : null,
        (data.advocatedStance as string) || null,
        (data.advocatedTimeline as string) || null,
        (data.advocatedRisk as string) || null,
        (data.location as string) || null,
        (data.influenceType as string) || null,
        (data.twitter as string) || null,
        (data.bluesky as string) || null,
        (data.notes as string) || null,
        notesHtml,
        notesMentions ? JSON.stringify(notesMentions) : null,
        (data.regulatoryStance as string) || null,
        stanceScore,
        (data.regulatoryStanceDetail as string) || null,
        (data.evidenceSource as string) || null,
        (data.agiTimeline as string) || null,
        timelineScore,
        (data.aiRiskLevel as string) || null,
        riskScore,
        (data.threatModels as string) || null,
        ts,
      ],
    )

    submissionId = insertRows[0].id as number

    // LLM quality review runs after response via waitUntil
    if (env.ANTHROPIC_API_KEY && submissionId) {
      const sid = submissionId
      context.waitUntil(
        (async () => {
          try {
            const reviewPayload = {
              name: data.name || data.title,
              type,
              regulatoryStance: data.regulatoryStance,
              agiTimeline: data.agiTimeline,
              aiRiskLevel: data.aiRiskLevel,
              notes: data.notes,
            }
            const reviewPrompt = `Review this crowdsourced submission to a U.S. AI policy stakeholder database. Rate its quality and flag issues.
Entity type: ${type}
Data: ${JSON.stringify(reviewPayload)}
Respond in JSON only: {"quality": 1-5, "flags": ["spam"|"low-quality"|"duplicate"|"offensive"|"incomplete"], "notes": "brief explanation"}`

            const llmRes = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': env.ANTHROPIC_API_KEY!,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 300,
                messages: [{ role: 'user', content: reviewPrompt }],
              }),
              signal: AbortSignal.timeout(5000),
            })

            if (llmRes.ok) {
              const llmData = (await llmRes.json()) as { content?: { text?: string }[] }
              const reviewText = llmData.content?.[0]?.text ?? ''
              let review: unknown
              try {
                const cleaned = reviewText
                  .replace(/```json\s*/g, '')
                  .replace(/```\s*/g, '')
                  .trim()
                review = JSON.parse(cleaned)
              } catch {
                review = { raw: reviewText }
              }
              const reviewSql = getDb(env.DATABASE_URL)
              await reviewSql('UPDATE submission SET llm_review = $1 WHERE id = $2', [JSON.stringify(review), sid])
            }
          } catch (e) {
            console.warn('LLM review failed (non-critical):', e instanceof Error ? e.message : String(e))
          }
        })(),
      )
    }

    return jsonResponse(
      {
        success: true,
        submissionId,
        message: 'Submission received and pending review',
      },
      request,
      200,
      corsOptions,
    )
  } catch (error) {
    console.error('Submission error:', error)
    return jsonResponse({ error: 'Internal server error' }, request, 500, corsOptions)
  }
}
