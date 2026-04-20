/**
 * /submit + /admin HTTP client for the enrichment skill.
 *
 * Every write goes through this module. Responsibilities:
 *   1. Attach X-Contributor-Key (CONTRIBUTOR_KEY env) on POST /submit
 *   2. Attach X-Admin-Key (ADMIN_KEY env) on POST /admin
 *   3. Keep notes / notes_html in sync (derive plain text from HTML every time)
 *   4. Expose a dry-run mode that returns the payload without POSTing
 *
 * Callers never fetch directly. If another surface needs to be added (e.g.
 * batch submit), add a function here rather than bypassing.
 */
import 'dotenv/config'

// Production API Gateway base URL. Hard-coded here because it's a public
// endpoint and doesn't live in .env; change in one place if it ever moves.
const DEFAULT_API_BASE = 'https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com'

export function getApiBase() {
  return process.env.MAPPING_AI_API_BASE || DEFAULT_API_BASE
}

export function getContributorKey() {
  const key = process.env.CONTRIBUTOR_KEY
  if (!key)
    throw new Error('CONTRIBUTOR_KEY is not set. Mint one via scripts/generate-contributor-key.js and add to .env.')
  if (!/^mak_[a-f0-9]{32}$/.test(key)) throw new Error('CONTRIBUTOR_KEY has invalid format (expected mak_<32hex>)')
  return key
}

export function getAdminKey() {
  const key = process.env.ADMIN_KEY
  if (!key) throw new Error('ADMIN_KEY is not set. Add it to .env.')
  return key
}

/**
 * Derive plain-text `notes` from `notesHtml`. Used by every write path so the
 * two columns never drift (workshop-overwrite post-mortem discipline).
 *
 * Cheap strip: remove tags, decode &amp;/&lt;/&gt;/&quot;/&#39;, collapse
 * whitespace. For richer HTML consider a proper parser; the current TipTap
 * output is plain-enough to survive this.
 */
export function htmlToPlainText(html) {
  if (!html) return null
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalise a draft submission into the exact camelCase shape /submit expects.
 * Ensures `notes` is derived from `notesHtml`, `notesSources` is JSON-encoded,
 * and only recognised fields are forwarded.
 *
 * The allow-list is explicit so arbitrary Haiku output can't sneak fields
 * that submit.js won't persist (or worse, fields that collide with future
 * columns).
 */
export function buildSubmitPayload(draft) {
  const { type, ...data } = draft
  if (!type || !['person', 'organization', 'resource'].includes(type)) {
    throw new Error(`Invalid or missing type on draft: ${type}`)
  }

  // Keep notes and notesHtml in sync
  const notesHtml = data.notesHtml || null
  const notes = data.notes ?? htmlToPlainText(notesHtml)

  // Serialise complex fields for the HTTP layer
  const notesSources = data.notesSources == null ? null : JSON.stringify(data.notesSources)

  const outData = {
    // person + org
    name: data.name ?? null,
    title: data.title ?? null,
    category: data.category ?? null,
    otherCategories: data.otherCategories ?? null,
    primaryOrg: data.primaryOrg ?? null,
    otherOrgs: data.otherOrgs ?? null,
    website: data.website ?? null,
    fundingModel: data.fundingModel ?? null,
    parentOrgId: data.parentOrgId ?? null,
    // resource
    author: data.author ?? null,
    resourceType: data.resourceType ?? null,
    url: data.url ?? null,
    year: data.year ?? null,
    keyArgument: data.keyArgument ?? null,
    // shared
    location: data.location ?? null,
    influenceType: data.influenceType ?? null,
    twitter: data.twitter ?? null,
    bluesky: data.bluesky ?? null,
    notes,
    notesHtml,
    notesMentions: data.notesMentions ? JSON.stringify(data.notesMentions) : null,
    // belief
    regulatoryStance: data.regulatoryStance ?? null,
    regulatoryStanceDetail: data.regulatoryStanceDetail ?? null,
    evidenceSource: data.evidenceSource ?? null,
    agiTimeline: data.agiTimeline ?? null,
    aiRiskLevel: data.aiRiskLevel ?? null,
    threatModels: data.threatModels ?? null,
    // provenance (enrichment skill)
    notesSources,
    notesConfidence: data.notesConfidence ?? null,
    enrichmentVersion: data.enrichmentVersion ?? null,
    // submitter
    submitterEmail: data.submitterEmail ?? null,
    submitterRelationship: data.submitterRelationship ?? 'external',
    // edit vs create
    entityId: data.entityId ?? null,
  }

  // For resources the contribute form uses `title` as both the entity name
  // and the resource_title; preserve that convention.
  if (type === 'resource' && outData.title && !outData.name) {
    outData.name = outData.title
  }

  return {
    type,
    timestamp: new Date().toISOString(),
    data: outData,
    _hp: '',
  }
}

/**
 * POST /submit. Returns { submissionId } on success, throws on failure with
 * the server's error message.
 */
export async function submitDraft(draft, { dryRun = true } = {}) {
  const payload = buildSubmitPayload(draft)
  if (dryRun) return { dryRun: true, payload }

  const res = await fetch(`${getApiBase()}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Contributor-Key': getContributorKey(),
    },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`POST /submit failed: ${res.status} — ${body.error || res.statusText}`)
  }
  return { submissionId: body.submissionId, message: body.message }
}

/**
 * POST /admin action=approve for a submission id. Returns { action: 'approved' }
 * on success. Admin path triggers map-data regen + CloudFront invalidation.
 */
export async function approveSubmission(submissionId, { dryRun = true } = {}) {
  if (!submissionId) throw new Error('approveSubmission: submissionId is required')
  const body = { action: 'approve', submission_id: submissionId }
  if (dryRun) return { dryRun: true, payload: body }

  const res = await fetch(`${getApiBase()}/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': getAdminKey(),
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      `POST /admin approve failed: ${res.status} — ${json.error || res.statusText}. Submission ${submissionId} left pending — retry approval by hand if needed.`,
    )
  }
  return json
}

/**
 * GET /search for duplicate detection. Uses the public search endpoint so no
 * admin key is needed.
 */
export async function searchAPI(query, { entityType = null, status = 'all' } = {}) {
  const params = new URLSearchParams({ q: query, status })
  if (entityType) params.set('type', entityType)
  const res = await fetch(`${getApiBase()}/search?${params}`)
  if (!res.ok) throw new Error(`GET /search failed: ${res.status}`)
  const json = await res.json()
  return json
}
