/**
 * Full data verification — checks every entity field + edges against external sources.
 *
 * Writes directly to existing DB structure:
 *  - RDS entity.field_verification (JSONB)
 *  - RDS entity.belief_evidence_source (fixes mislabels)
 *  - Neon source table (registers all Exa result URLs)
 *  - Neon claim table (upserts verification claims with confidence)
 *
 * For each approved entity:
 *  1. URL checks (website, twitter, bluesky) via HTTP HEAD
 *  2. Exa search for factual + belief evidence
 *  3. Quote verification: fetch cited source URLs, substring-match stance_detail
 *  4. Multi-step Claude evaluation (summarize sources → verify each field)
 *  5. Edge verification: check entity's relationships against Exa results
 *  6. Write results to both RDS + Neon
 *
 * Usage:
 *   node scripts/verify-all.js --limit=5
 *   node scripts/verify-all.js --id=351
 *   node scripts/verify-all.js --all --resume --concurrency=3
 *   node scripts/verify-all.js --type=organization --limit=20
 */
import Exa from 'exa-js'
import Anthropic from '@anthropic-ai/sdk'
import pg from 'pg'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const { config: loadEnv } = await import('dotenv')
const envCandidates = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../../.env'),
  path.join(__dirname, '../../../../.env'),
]
for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    loadEnv({ path: p })
    break
  }
}

const exa = new Exa(process.env.EXA_API_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const rds = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 })
const neon = process.env.PILOT_DB
  ? new pg.Pool({ connectionString: process.env.PILOT_DB, ssl: { rejectUnauthorized: false }, max: 5 })
  : null

const args = process.argv.slice(2)
const limitArg = args.find((a) => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null
const allMode = args.includes('--all')
const resumeMode = args.includes('--resume')
const singleId = args.find((a) => a.startsWith('--id='))?.split('=')[1]
const typeFilter = args.find((a) => a.startsWith('--type='))?.split('=')[1]
const concurrencyArg = args.find((a) => a.startsWith('--concurrency='))
const CONCURRENCY = concurrencyArg ? parseInt(concurrencyArg.split('=')[1]) : 3

if (!limit && !allMode && !singleId) {
  console.log(
    'Usage: node scripts/verify-all.js [--limit=N | --all | --id=N] [--resume] [--type=person|organization] [--concurrency=N]',
  )
  process.exit(0)
}

const DATA_BASE = path.join(process.cwd(), 'data')
const PROGRESS_PATH = path.join(DATA_BASE, 'verification-progress.json')
if (!fs.existsSync(DATA_BASE)) fs.mkdirSync(DATA_BASE, { recursive: true })

function srcId(url) {
  return 'src-' + crypto.createHash('sha256').update(url).digest('hex').slice(0, 12)
}

function makeClaimId(entityId, dimension, sourceId) {
  return `${entityId}_${dimension}_${sourceId}`
}

const costs = {
  exa_searches: 0,
  exa_cost: 0,
  claude_calls: 0,
  claude_input_tokens: 0,
  claude_output_tokens: 0,
  claude_cost: 0,
  url_checks: 0,
  url_fetches: 0,
  trackExa() {
    this.exa_searches++
    this.exa_cost = this.exa_searches * 0.008
  },
  trackClaude(usage) {
    this.claude_calls++
    this.claude_input_tokens += usage.input_tokens || 0
    this.claude_output_tokens += usage.output_tokens || 0
    this.claude_cost = (this.claude_input_tokens / 1_000_000) * 3 + (this.claude_output_tokens / 1_000_000) * 15
  },
  summary() {
    const total = this.exa_cost + this.claude_cost
    return `Exa: ${this.exa_searches} ($${this.exa_cost.toFixed(2)}) | Claude: ${this.claude_calls} ($${this.claude_cost.toFixed(2)}) | URLs: ${this.url_checks}+${this.url_fetches} fetched | Total: $${total.toFixed(2)}`
  },
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// ── R2 progress sync ─────────────────────────────────────────────────────────

const R2_BUCKET = 'mapping-ai-data'
const R2_PROGRESS_KEY = 'verification-progress.json'
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'ac57c6d87068ab259c6f54dba468de8d'

let r2Client = null
function getR2() {
  if (r2Client) return r2Client
  const keyId = process.env.R2_ACCESS_KEY_ID
  const secret = process.env.R2_SECRET_ACCESS_KEY
  if (!keyId || !secret) return null
  // Lazy import to avoid breaking when @aws-sdk/client-s3 isn't available
  return import('@aws-sdk/client-s3').then(({ S3Client }) => {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: keyId, secretAccessKey: secret },
    })
    return r2Client
  })
}

async function pullProgressFromR2() {
  try {
    const client = await getR2()
    if (!client) return null
    const { GetObjectCommand } = await import('@aws-sdk/client-s3')
    const res = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: R2_PROGRESS_KEY }))
    const body = await res.Body?.transformToString()
    if (!body) return null
    console.log('  Pulled progress from R2')
    return JSON.parse(body)
  } catch {
    return null
  }
}

async function pushProgressToR2(progress) {
  try {
    const client = await getR2()
    if (!client) return
    const { PutObjectCommand } = await import('@aws-sdk/client-s3')
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: R2_PROGRESS_KEY,
        Body: JSON.stringify(progress),
        ContentType: 'application/json',
      }),
    )
  } catch (err) {
    console.error(`  R2 push failed: ${err.message}`)
  }
}

let saveCounter = 0

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'))
  } catch {
    return { completed: [], started_at: new Date().toISOString() }
  }
}
function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2) + '\n')
  saveCounter++
  if (saveCounter % 5 === 0) {
    pushProgressToR2(progress).catch(() => {})
  }
}

async function loadOrPullProgress() {
  const local = loadProgress()
  const remote = await pullProgressFromR2()
  if (!remote) return local
  if (remote.completed.length > local.completed.length) {
    console.log(`  R2 progress is ahead (${remote.completed.length} vs ${local.completed.length} local), using R2`)
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify(remote, null, 2) + '\n')
    return remote
  }
  return local
}

// ── URL checking ──────────────────────────────────────────────────────────────

async function checkUrl(url) {
  if (!url) return null
  costs.url_checks++
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(url, {
      method: 'HEAD',
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'MappingAI-Verifier/1.0' },
    })
    clearTimeout(t)
    return { reachable: res.ok, status: res.status }
  } catch {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(url, {
        method: 'GET',
        signal: ctrl.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'MappingAI-Verifier/1.0' },
      })
      clearTimeout(t)
      return { reachable: res.ok, status: res.status }
    } catch (err) {
      return { reachable: false, error: err.message }
    }
  }
}

// ── Quote verification ────────────────────────────────────────────────────────

async function verifyQuoteAtUrl(url, quoteText) {
  if (!url || !quoteText || quoteText.length < 20) return null
  costs.url_fetches++
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12000)
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'MappingAI-Verifier/1.0' },
    })
    clearTimeout(t)
    if (!res.ok) return { found: false, reason: `HTTP ${res.status}` }
    const contentType = res.headers.get('content-type') || ''
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('application/json')
    ) {
      return { found: false, reason: `non-text content: ${contentType}` }
    }
    const body = await res.text()
    const normalized = body
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
    const segments = quoteText
      .split(/[.!?]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 15)
    const found = segments.filter((seg) => normalized.includes(seg))
    return { found: found.length > 0, matched: found.length, total: segments.length }
  } catch (err) {
    return { found: false, reason: err.message }
  }
}

// ── Exa search ────────────────────────────────────────────────────────────────

async function searchEntity(entity) {
  const name = entity.name
  const type = entity.entity_type
  let factualResults = []
  let beliefResults = []

  try {
    const q = type === 'organization' ? `"${name}" about mission founded` : `"${name}" biography role position`
    const r = await exa.searchAndContents(q, {
      numResults: 5,
      type: 'auto',
      text: { maxCharacters: 3000 },
      startPublishedDate: '2022-01-01',
    })
    costs.trackExa()
    factualResults = (r.results || []).map((r) => ({
      url: r.url,
      title: r.title || '',
      text: (r.text || '').slice(0, 3000),
    }))
  } catch (err) {
    console.error(`    Exa factual error: ${err.message}`)
  }
  await delay(200)

  try {
    const q =
      type === 'organization'
        ? `"${name}" AI regulation stance policy position safety risk`
        : `"${name}" AI regulation stance policy position AGI timeline risk safety`
    const r = await exa.searchAndContents(q, {
      numResults: 5,
      type: 'auto',
      text: { maxCharacters: 3000 },
      startPublishedDate: '2022-01-01',
    })
    costs.trackExa()
    beliefResults = (r.results || []).map((r) => ({
      url: r.url,
      title: r.title || '',
      text: (r.text || '').slice(0, 3000),
    }))
  } catch (err) {
    console.error(`    Exa belief error: ${err.message}`)
  }
  await delay(200)

  return { factualResults, beliefResults }
}

// ── Neon writes ───────────────────────────────────────────────────────────────

async function registerSources(neonClient, searchResults) {
  if (!neonClient) return []
  const registered = []
  const allResults = [...searchResults.factualResults, ...searchResults.beliefResults]
  for (const r of allResults) {
    const sid = srcId(r.url)
    await neonClient.query(
      `INSERT INTO source (source_id, url, title, source_type, cached_excerpt)
       VALUES ($1, $2, $3, 'web', $4)
       ON CONFLICT (source_id) DO UPDATE SET title = COALESCE(EXCLUDED.title, source.title)`,
      [sid, r.url, r.title || null, (r.text || '').slice(0, 500)],
    )
    registered.push({ sid, url: r.url })
  }
  return registered
}

async function upsertVerificationClaim(neonClient, entity, claim) {
  if (!neonClient) return
  const sid = srcId(claim.source_url)
  const cid = makeClaimId(entity.id, claim.belief_dimension, sid)
  await neonClient.query(
    `INSERT INTO claim (claim_id, entity_id, entity_name, entity_type, belief_dimension,
       stance, stance_score, stance_label, citation, source_id,
       claim_type, confidence, extracted_by, extraction_model, extraction_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_DATE)
     ON CONFLICT (claim_id) DO UPDATE SET
       citation = EXCLUDED.citation, stance = EXCLUDED.stance, stance_score = EXCLUDED.stance_score,
       confidence = EXCLUDED.confidence, extraction_date = CURRENT_DATE`,
    [
      cid,
      entity.id,
      entity.name,
      entity.entity_type,
      claim.belief_dimension,
      claim.stance || null,
      claim.stance_score ?? null,
      claim.stance_label || null,
      claim.citation,
      sid,
      claim.claim_type || 'direct_statement',
      claim.confidence || 'medium',
      'verification-v1',
      'claude-sonnet-4-6',
    ],
  )
}

// ── Claude verification (multi-step) ──────────────────────────────────────────

const VERIFY_PROMPT = `You are an adversarial fact-checker. Your job is to CHALLENGE a database entry, not confirm it. Assume the entry is wrong until proven right.

CRITICAL DISTINCTIONS:
- An INDIVIDUAL expressing a view in an interview is NOT the same as their ORGANIZATION holding that position
- "Inferred from actions" is NOT "Explicitly stated." Only use "Explicitly stated" for direct first-person quotes
- If an entity does NOT take a public position on something, the correct answer is null, not "Mixed/unclear"
- A journalist writing about someone's views is NOT the same as that person stating those views
- Someone DESCRIBING or SUMMARIZING another person's argument in an interview (e.g. "some people think X") is NOT the same as them holding that view. Only attribute a view to an individual if they clearly endorse it as their own position, not when they are explaining, exploring, or playing devil's advocate
- Interview quotes require extra scrutiny: was the person stating their own settled position, or responding to a hypothetical, exploring an idea, or restating the interviewer's framing?
- A single quote from one interview is weaker evidence than a consistent pattern across multiple statements. Mark single-source belief attributions as confidence "low"

TASK: Verify each field in the database entry against the search results AND the quote verification results.

STEP 1: Summarize what the search results actually say about this entity (3-5 sentences).
STEP 2: For each field, determine:
- "verified" = you found clear, direct evidence supporting the exact current value
- "unverified" = insufficient evidence, ambiguous, or only tangentially related
- "incorrect" = evidence clearly contradicts the current value
- "should_be_null" = the entity does not hold a position on this topic, or the field should not be populated

For belief fields specifically:
- Only "verified" if you found a direct quote, official published position, or explicit public statement FROM the entity itself where they clearly endorse the position as their own
- Organizational stances require official organizational publications (website, official reports, press releases), not individual employee opinions or CEO interviews
- For individuals: a belief is only "verified" if the person has expressed it as their own settled view (not as a hypothetical, not restating someone else's position, not responding to an interviewer's framing). Single interview quotes should get confidence "low" at best
- If evidence_source says "Explicitly stated" but you only found inferred evidence, interviews, or secondhand characterizations, mark it "incorrect" with correction "Inferred"
- If the entity is a research/evaluation org, standards body, or government agency, they very likely do NOT hold a regulatory stance. Default to "should_be_null" unless you find an official position paper

Return JSON (and ONLY JSON, no markdown fences):
{
  "summary": "What sources actually say about this entity",
  "fields": {
    "location": { "status": "verified|unverified|incorrect|should_be_null", "detail": "...", "correction": null },
    "category": { "status": "...", "detail": "...", "correction": null },
    "title": { "status": "...", "detail": "...", "correction": null },
    "primary_org": { "status": "...", "detail": "...", "correction": null },
    "website": { "status": "...", "detail": "...", "correction": null },
    "funding_model": { "status": "...", "detail": "...", "correction": null },
    "belief_regulatory_stance": { "status": "...", "detail": "...", "correction": null },
    "belief_regulatory_stance_detail": { "status": "...", "detail": "...", "correction": null },
    "belief_evidence_source": { "status": "...", "detail": "...", "correction": null },
    "belief_agi_timeline": { "status": "...", "detail": "...", "correction": null },
    "belief_ai_risk": { "status": "...", "detail": "...", "correction": null },
    "belief_threat_models": { "status": "...", "detail": "...", "correction": null },
    "notes_accuracy": { "status": "...", "detail": "list specific factual errors", "correction": null }
  },
  "claims": [
    {
      "belief_dimension": "regulatory_stance|agi_timeline|ai_risk_level",
      "stance": "text label or null",
      "stance_score": null,
      "stance_label": "short label",
      "citation": "VERBATIM quote from source, 1-2 sentences",
      "source_url": "exact URL from search results",
      "claim_type": "direct_statement|authored_position|inferred_from_action",
      "confidence": "high|medium|low"
    }
  ],
  "edge_checks": [
    { "edge_id": 123, "status": "verified|unverified|incorrect", "detail": "..." }
  ]
}`

async function verifyWithClaude(entity, searchResults, edges, quoteCheck) {
  const allResults = [...searchResults.factualResults, ...searchResults.beliefResults]
  if (allResults.length === 0) return null

  const resultsText = allResults
    .map((r, i) => `[Source ${i + 1}] ${r.url}\nTitle: ${r.title}\n${r.text}\n`)
    .join('\n---\n')

  const edgesText =
    edges.length > 0
      ? '\nKNOWN RELATIONSHIPS IN DATABASE:\n' +
        edges.map((e) => `- Edge ${e.id}: ${e.edge_type} with "${e.other_name}" (role: ${e.role || 'none'})`).join('\n')
      : ''

  const quoteText = quoteCheck
    ? `\nQUOTE VERIFICATION: The stance_detail text was ${quoteCheck.found ? 'FOUND' : 'NOT FOUND'} at the cited source URL. ${quoteCheck.matched ? `${quoteCheck.matched}/${quoteCheck.total} sentence segments matched.` : quoteCheck.reason || ''}`
    : ''

  const entityText = `Entity: ${entity.name}
Type: ${entity.entity_type}
Category: ${entity.category || 'N/A'}
Title: ${entity.title || 'N/A'}
Primary Org: ${entity.primary_org || 'N/A'}
Location: ${entity.location || 'N/A'}
Website: ${entity.website || 'N/A'}
Funding Model: ${entity.funding_model || 'N/A'}
Regulatory Stance: ${entity.belief_regulatory_stance || 'N/A'}
Stance Detail: ${entity.belief_regulatory_stance_detail || 'N/A'}
Evidence Source: ${entity.belief_evidence_source || 'N/A'}
AGI Timeline: ${entity.belief_agi_timeline || 'N/A'}
AI Risk Level: ${entity.belief_ai_risk || 'N/A'}
Threat Models: ${entity.belief_threat_models || 'N/A'}
Notes: ${(entity.notes || '').slice(0, 2000)}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 5000,
      messages: [
        {
          role: 'user',
          content: `${VERIFY_PROMPT}\n\nDATABASE ENTRY:\n${entityText}${edgesText}${quoteText}\n\nWEB SEARCH RESULTS:\n${resultsText}`,
        },
      ],
    })
    costs.trackClaude(response.usage || {})
    const text = response.content[0]?.text || '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error(`    Claude error: ${err.message}`)
    return null
  }
}

// ── Main verification ─────────────────────────────────────────────────────────

async function verifyEntity(entity, edges, neonClient) {
  // 1. URL checks
  const urlChecks = {}
  if (entity.website) urlChecks.website = await checkUrl(entity.website)
  if (entity.twitter) urlChecks.twitter = await checkUrl(`https://x.com/${entity.twitter.replace('@', '')}`)
  if (entity.bluesky) urlChecks.bluesky = await checkUrl(`https://bsky.app/profile/${entity.bluesky.replace('@', '')}`)

  // 2. Exa search
  const searchResults = await searchEntity(entity)

  // 3. Register all source URLs in Neon
  await registerSources(neonClient, searchResults)

  // 4. Quote verification for stance_detail
  let quoteCheck = null
  if (entity.belief_regulatory_stance_detail && entity.website) {
    quoteCheck = await verifyQuoteAtUrl(entity.website, entity.belief_regulatory_stance_detail)
  }

  // 5. Claude verification
  const verification = await verifyWithClaude(entity, searchResults, edges, quoteCheck)
  if (!verification) {
    return { field_verification: {}, claims_written: 0, corrections: 0 }
  }

  // 6. Build field_verification JSONB from Claude results
  const fv = { name: 'verified' }
  const corrections = {}
  const fields = verification.fields || {}

  for (const [field, result] of Object.entries(fields)) {
    if (field === 'notes_accuracy') {
      if (result.status === 'verified') fv.notes = 'verified'
      else fv.notes = 'unverified'
      if (result.status === 'incorrect') corrections.notes = result
      continue
    }
    if (result.status === 'verified') fv[field] = 'verified'
    else if (result.status === 'should_be_null') {
      fv[field] = 'unverified'
      corrections[field] = { ...result, suggested: null }
    } else if (result.status === 'incorrect') {
      fv[field] = 'unverified'
      corrections[field] = result
    } else {
      fv[field] = 'unverified'
    }
  }

  // Override with URL check results
  if (urlChecks.website?.reachable) fv.website = 'verified'
  else if (urlChecks.website && !urlChecks.website.reachable) fv.website = 'unverified'
  if (urlChecks.twitter?.reachable) fv.twitter = 'verified'
  if (urlChecks.bluesky?.reachable) fv.bluesky = 'verified'

  // 7. Write claims to Neon
  let claimsWritten = 0
  if (verification.claims) {
    for (const claim of verification.claims) {
      if (!claim.source_url || !claim.citation || !claim.belief_dimension) continue
      try {
        await registerSources(neonClient, {
          factualResults: [{ url: claim.source_url, title: '', text: '' }],
          beliefResults: [],
        })
        await upsertVerificationClaim(neonClient, entity, claim)
        claimsWritten++
      } catch (err) {
        console.error(`    Claim write error: ${err.message}`)
      }
    }
  }

  // 8. Check edges
  if (verification.edge_checks) {
    for (const ec of verification.edge_checks) {
      const edge = edges.find((e) => e.id === ec.edge_id)
      if (edge && ec.status === 'incorrect') {
        corrections[`edge_${ec.edge_id}`] = { detail: ec.detail, edge }
      }
    }
  }

  // 9. Fix evidence_source if verification found it wrong
  let evidenceFixed = false
  if (corrections.belief_evidence_source?.correction) {
    const corrected = corrections.belief_evidence_source.correction
    if (corrected === 'Inferred' || corrected === 'should_be_null') {
      await rds.query(`UPDATE entity SET belief_evidence_source = $1, updated_at = NOW() WHERE id = $2`, [
        corrected === 'should_be_null' ? null : corrected,
        entity.id,
      ])
      evidenceFixed = true
    }
  }

  // 10. Write field_verification to RDS
  await rds.query(`UPDATE entity SET field_verification = $1::jsonb, updated_at = NOW() WHERE id = $2`, [
    JSON.stringify(fv),
    entity.id,
  ])

  return {
    field_verification: fv,
    claims_written: claimsWritten,
    corrections: Object.keys(corrections).length,
    evidence_fixed: evidenceFixed,
    summary: verification.summary,
  }
}

// ── Concurrency runner ────────────────────────────────────────────────────────

async function processWithConcurrency(entities, allEdges, concurrency, progress) {
  let index = 0
  let totalVerified = 0
  let totalUnverified = 0
  let totalClaims = 0
  let totalCorrections = 0

  async function worker() {
    const neonClient = neon ? await neon.connect() : null
    try {
      while (index < entities.length) {
        const i = index++
        const entity = entities[i]
        const entityEdges = allEdges
          .filter((e) => e.source_id === entity.id || e.target_id === entity.id)
          .map((e) => ({
            id: e.id,
            edge_type: e.edge_type,
            role: e.role,
            other_name: e.source_id === entity.id ? e.target_name : e.source_name,
            other_id: e.source_id === entity.id ? e.target_id : e.source_id,
          }))

        console.log(
          `\n[${i + 1}/${entities.length}] ${entity.name} (${entity.entity_type}, id=${entity.id}, ${entityEdges.length} edges)`,
        )

        try {
          const result = await verifyEntity(entity, entityEdges, neonClient)
          const vCounts = Object.values(result.field_verification)
          const v = vCounts.filter((s) => s === 'verified').length
          const u = vCounts.length - v
          totalVerified += v
          totalUnverified += u
          totalClaims += result.claims_written
          totalCorrections += result.corrections

          console.log(
            `    ${v}/${vCounts.length} verified, ${result.claims_written} claims, ${result.corrections} corrections${result.evidence_fixed ? ', evidence_source fixed' : ''}`,
          )
        } catch (err) {
          console.error(`    ERROR: ${err.message}`)
        }

        progress.completed.push(entity.id)
        saveProgress(progress)

        if ((i + 1) % 10 === 0) console.log(`\n  ── ${i + 1}/${entities.length} | ${costs.summary()} ──\n`)
      }
    } finally {
      if (neonClient) neonClient.release()
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, entities.length) }, () => worker())
  await Promise.all(workers)

  return { totalVerified, totalUnverified, totalClaims, totalCorrections }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('DATA VERIFICATION v2')
  console.log('====================')
  console.log(
    `Writes to: RDS (field_verification)${neon ? ' + Neon (source, claim)' : ' (no PILOT_DB, skipping Neon writes)'}`,
  )
  console.log(`Concurrency: ${CONCURRENCY}\n`)

  await rds.query('SELECT 1')
  if (neon) await neon.query('SELECT 1')
  console.log('DB connections OK\n')

  const progress = await loadOrPullProgress()
  const resumeSet = new Set(progress.completed)

  // Fetch entities
  let query = `SELECT id, entity_type, name, title, category, other_categories,
                      primary_org, other_orgs, website, funding_model, location,
                      influence_type, twitter, bluesky, notes,
                      belief_regulatory_stance, belief_regulatory_stance_detail,
                      belief_evidence_source, belief_agi_timeline, belief_ai_risk,
                      belief_threat_models, belief_regulatory_stance_n,
                      belief_agi_timeline_n, belief_ai_risk_n
               FROM entity WHERE status = 'approved'`
  const params = []
  if (singleId) {
    query = query.replace("status = 'approved'", 'id = $1')
    params.push(parseInt(singleId))
  } else if (typeFilter) {
    query += ' AND entity_type = $1'
    params.push(typeFilter)
  }
  query += ' ORDER BY id'
  const { rows: allEntities } = await rds.query(query, params)

  let entities = allEntities
  if (resumeMode) {
    entities = entities.filter((e) => !resumeSet.has(e.id))
    console.log(`Resuming: ${resumeSet.size} completed, ${entities.length} remaining`)
  }
  if (limit) entities = entities.slice(0, limit)

  // Fetch all edges (for edge verification)
  const { rows: allEdges } = await rds.query(`
    SELECT e.id, e.source_id, e.target_id, e.edge_type, e.role,
           src.name as source_name, tgt.name as target_name
    FROM edge e
    JOIN entity src ON src.id = e.source_id
    JOIN entity tgt ON tgt.id = e.target_id
  `)

  console.log(`Entities: ${entities.length}, Edges: ${allEdges.length}`)
  const estCost = entities.length * 0.09
  console.log(`Estimated cost: ~$${estCost.toFixed(2)}`)
  console.log()

  const result = await processWithConcurrency(entities, allEdges, CONCURRENCY, progress)

  console.log('\n' + '='.repeat(60))
  console.log('VERIFICATION COMPLETE')
  console.log('='.repeat(60))
  console.log(`Fields verified: ${result.totalVerified}`)
  console.log(`Fields unverified: ${result.totalUnverified}`)
  console.log(`Claims written to Neon: ${result.totalClaims}`)
  console.log(`Corrections found: ${result.totalCorrections}`)
  console.log(`Costs: ${costs.summary()}`)

  await pushProgressToR2(progress)
  console.log('Progress synced to R2')

  await rds.end()
  if (neon) await neon.end()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
