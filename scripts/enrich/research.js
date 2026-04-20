#!/usr/bin/env node
/**
 * Research orchestrator for the enrichment skill (Unit 3 of the plan).
 *
 * Given a seed (name + entityType), this module:
 *   1. Probes for a duplicate in the existing DB via searchEntitiesByName.
 *   2. Runs 3-5 Exa queries (or a degraded WebSearch fallback) per entity type.
 *   3. Feeds snippets to the Haiku classifier (lib/classify.js).
 *   4. Extracts adjacent-entity hints from the classifier reasoning and
 *      cross-checks them against the DB so we only surface NEW candidates.
 *   5. Returns a full draft submission ready to be handed to validate.js +
 *      submit.js in Unit 4 — no writes happen here.
 *
 * Exa retrieval precedence:
 *   (a) global.__ENRICH_TOOLS__.exaSearch(...) — hook set by the Claude Code
 *       skill when an Exa MCP tool is available in the session.
 *   (b) https://api.exa.ai/search with EXA_API_KEY — scripted/CI path.
 *   (c) https://duckduckgo.com/?q=... — last-resort degraded path; warns
 *       loudly in the draft.
 *
 * Re-verify mode (--mode=reverify --entity-id=N) pulls the existing entity
 * row and returns a diff-shaped draft so callers can see what changed since
 * the last enrichment run.
 */
import 'dotenv/config'
import { writeFile } from 'node:fs/promises'

import {
  CURRENT_ENRICHMENT_VERSION,
  SIM_HIGH,
  SIM_LOW,
  classifyEntity,
  findMatches,
  getEntityById,
  searchAPI,
  searchEntitiesByName,
} from './lib/index.js'

const EXA_API_URL = 'https://api.exa.ai/search'
const EXA_NUM_RESULTS = 5
const EXA_TIMEOUT_MS = 20000
const MAX_ADJACENT_HINTS = 5

/**
 * Query templates per entity type. The skill's references/exa-queries.md
 * tunes these over time; the defaults match the plan spec so research.js
 * works standalone even without the skill installed.
 */
export const QUERY_TEMPLATES = {
  person: (name) => [`${name} AI policy`, `${name} Twitter`, `${name} bio affiliation`],
  organization: (name) => [`${name} AI mission`, `${name} AI funding leadership`, `${name} website AI`],
  resource: (title) => [`${title} author`, `${title} publisher`, `${title} review`],
}

function assertEntityType(entityType) {
  if (!['person', 'organization', 'resource'].includes(entityType)) {
    throw new Error(`entityType must be person|organization|resource, got: ${entityType}`)
  }
}

/**
 * Detect which retriever to use. Checks the Claude Code hook first, then env.
 * Returns { retriever, run }, where run(query) => Promise<RawResult[]>.
 */
export function resolveRetriever() {
  const hook = globalThis.__ENRICH_TOOLS__
  if (hook && typeof hook.exaSearch === 'function') {
    return {
      retriever: 'mcp',
      run: async (query) => {
        const raw = await hook.exaSearch(query, { numResults: EXA_NUM_RESULTS })
        return normaliseResults(raw)
      },
    }
  }
  if (process.env.EXA_API_KEY) {
    return {
      retriever: 'exa',
      run: async (query) => {
        const res = await fetch(EXA_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EXA_API_KEY}`,
          },
          body: JSON.stringify({ query, num_results: EXA_NUM_RESULTS, type: 'keyword' }),
          signal: AbortSignal.timeout(EXA_TIMEOUT_MS),
        })
        if (!res.ok) {
          throw new Error(`Exa search failed for "${query}": ${res.status} ${res.statusText}`)
        }
        const json = await res.json()
        return normaliseResults(json.results)
      },
    }
  }
  return {
    retriever: 'web-search',
    run: async (query) => {
      // Degraded fallback — DuckDuckGo HTML has no proper search API. We fire
      // a single request to record retrieval intent; we can't parse reliable
      // snippets, so the result is a skeleton entry that tells downstream
      // that research quality is low.
      const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
      return [
        {
          url,
          title: `DuckDuckGo search: ${query}`,
          snippet: '(web-search fallback — snippet not extracted; review source manually)',
        },
      ]
    },
  }
}

function normaliseResults(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((r) => ({
      url: r.url || r.link || null,
      title: r.title || null,
      snippet: r.snippet || r.text || r.content || r.description || '',
    }))
    .filter((r) => r.url)
}

/**
 * Build queries for the entity type from the templates.
 */
function buildQueries(name, entityType) {
  const builder = QUERY_TEMPLATES[entityType]
  if (!builder) throw new Error(`No query template for entityType=${entityType}`)
  return builder(name)
}

/**
 * Run all queries, dedupe by URL, assemble notesSources + evidenceText for
 * the classifier. Individual query failures are captured as warnings; the
 * run keeps going so we get partial evidence rather than total loss.
 */
async function runResearchLoop(name, entityType, retrieverHandle) {
  const queries = buildQueries(name, entityType)
  const urlSet = new Set()
  const sources = []
  const warnings = []
  const retrievedAt = new Date().toISOString()

  for (const query of queries) {
    try {
      const results = await retrieverHandle.run(query)
      for (const r of results) {
        if (!r.url || urlSet.has(r.url)) continue
        urlSet.add(r.url)
        sources.push({
          url: r.url,
          snippet: r.snippet || '',
          retrieved_at: retrievedAt,
          retriever: retrieverHandle.retriever,
          query,
          title: r.title || null,
        })
      }
    } catch (err) {
      warnings.push({ type: 'query_failed', query, error: err.message })
    }
  }

  const evidenceText = sources
    .map((s, i) => `[${i + 1}] ${s.title ? s.title + ' — ' : ''}${s.url}\n${s.snippet}`)
    .join('\n\n')

  return { sources, evidenceText, warnings }
}

/**
 * Pull capitalised multi-word phrases out of freeform text — a cheap proxy
 * for "proper-noun candidate". Skips the seed name itself so we don't loop
 * back on the thing we already have.
 */
function extractCandidatePhrases(text, seedName) {
  if (!text || typeof text !== 'string') return []
  const seedLower = (seedName || '').toLowerCase()
  const rx = /\b([A-Z][a-zA-Z0-9&.'-]*(?:\s+[A-Z][a-zA-Z0-9&.'-]*){1,4})\b/g
  const seen = new Set()
  const out = []
  let m
  while ((m = rx.exec(text)) !== null) {
    const phrase = m[1].trim()
    const lower = phrase.toLowerCase()
    if (lower === seedLower) continue
    if (lower.length < 4) continue
    if (seen.has(lower)) continue
    seen.add(lower)
    out.push(phrase)
  }
  return out
}

/**
 * Cross-check candidate phrases against the DB. Anything already present is
 * dropped; up to MAX_ADJACENT_HINTS NEW candidates are returned with the
 * evidence snippet that surfaced them.
 */
async function resolveAdjacentHints(phrases, sources, warnings) {
  const hints = []
  for (const phrase of phrases) {
    if (hints.length >= MAX_ADJACENT_HINTS) break
    let existing = []
    try {
      existing = await searchEntitiesByName(phrase, { limit: 3 })
    } catch (err) {
      warnings.push({ type: 'adjacent_lookup_failed', phrase, error: err.message })
      continue
    }
    if (existing.length > 0) continue // already in DB — skip
    const evidenceSnippet = sources.find((s) => (s.snippet || '').includes(phrase))?.snippet || null
    hints.push({ name: phrase, evidence: evidenceSnippet })
  }
  return hints
}

/**
 * Duplicate detection via searchEntitiesByName + findMatches. Returns the
 * top hits sorted by similarity; caller inspects the top score against
 * SIM_HIGH / SIM_LOW.
 */
async function detectDuplicates(name, entityType) {
  let rows = []
  try {
    rows = await searchEntitiesByName(name, { entityType, limit: 10 })
  } catch (err) {
    // DB unreachable — try the public search API as a fallback so CLI runs
    // without DATABASE_URL still get duplicate protection.
    try {
      const json = await searchAPI(name, { entityType, status: 'approved' })
      rows = [...(json.people || []), ...(json.organizations || []), ...(json.resources || [])].map((r) => ({
        id: r.id,
        entity_type: r.entity_type || entityType,
        name: r.name || r.title,
        category: r.category,
        primary_org: r.primary_org,
        status: r.status,
      }))
    } catch {
      throw new Error(`Duplicate detection failed: ${err.message}`)
    }
  }
  return findMatches(name, rows, { entityType, limit: 5 })
}

/**
 * Build the draft submission object from the classification + sources.
 * Shape is what lib/api.js#buildSubmitPayload expects.
 */
function buildDraft({ name, entityType, classification, sources, warnings }) {
  const draft = {
    type: entityType,
    name,
    category: classification.category ?? null,
    otherCategories: classification.otherCategories ?? null,
    regulatoryStance: classification.regulatoryStance ?? null,
    agiTimeline: classification.agiTimeline ?? null,
    aiRiskLevel: classification.aiRiskLevel ?? null,
    evidenceSource: classification.evidenceSource ?? null,
    threatModels: classification.threatModels ?? null,
    notesHtml: classification.reasoning ? `<p>${escapeHtml(classification.reasoning)}</p>` : null,
    // Merge raw-search sources with classifier-extracted per-claim sources
    // (quote, claim_date, definition). Per-claim entries land alongside the
    // URL-level ones so downstream features (quote-level sourcing UI,
    // definition-space viz, trajectory sparklines) can read a flat list.
    notesSources: mergeSources(sources, classification.claims),
    notesConfidence: classification.confidence ?? null,
    enrichmentVersion: classification.enrichmentVersion ?? CURRENT_ENRICHMENT_VERSION,
    submitterRelationship: 'external',
  }
  if (entityType === 'resource') {
    draft.title = name
  }
  if (classification.enumWarnings && classification.enumWarnings.length > 0) {
    warnings.push({ type: 'classifier_enum_warning', details: classification.enumWarnings })
  }
  if (classification.warning) {
    warnings.push({ type: 'classifier_warning', detail: classification.warning })
  }
  return draft
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Merge raw research sources with per-claim sources from the classifier. A
 * per-claim entry for a URL we already fetched gets its quote / claim_date /
 * definition / field_name merged onto the existing entry. Standalone claim
 * entries (classifier pointed at a URL we didn't fetch) are appended.
 */
function mergeSources(rawSources, claims) {
  const merged = rawSources.map((s) => ({ ...s }))
  if (!Array.isArray(claims) || claims.length === 0) return merged
  const byUrl = new Map(merged.map((s) => [s.url, s]))
  for (const c of claims) {
    if (!c?.url) continue
    const existing = byUrl.get(c.url)
    if (existing) {
      // Merge per-claim fields onto existing URL entry. If multiple claims
      // touch the same URL for different fields, the second one overwrites
      // the first — downstream features should pull claim-level data from
      // a future per-field provenance table, not rely on this collapsing.
      existing.field_name = c.field_name ?? existing.field_name ?? null
      existing.quote = c.quote ?? existing.quote ?? null
      existing.claim_date = c.claim_date ?? existing.claim_date ?? null
      existing.definition = c.definition ?? existing.definition ?? null
    } else {
      merged.push(c)
      byUrl.set(c.url, c)
    }
  }
  return merged
}

/**
 * Diff an existing entity row against a fresh draft. Only fields that
 * actually changed are included in the output.
 */
function diffEntity(existing, draft) {
  const fieldMap = {
    category: 'category',
    regulatory_stance: 'regulatoryStance',
    belief_regulatory_stance: 'regulatoryStance',
    agi_timeline: 'agiTimeline',
    belief_agi_timeline: 'agiTimeline',
    ai_risk_level: 'aiRiskLevel',
    belief_ai_risk: 'aiRiskLevel',
    evidence_source: 'evidenceSource',
    belief_evidence_source: 'evidenceSource',
    other_categories: 'otherCategories',
  }
  const diff = {}
  for (const [dbField, draftField] of Object.entries(fieldMap)) {
    if (!(dbField in existing)) continue
    const before = existing[dbField]
    const after = draft[draftField]
    if (before == null && after == null) continue
    if (before === after) continue
    diff[draftField] = { before: before ?? null, after: after ?? null }
  }
  return diff
}

/**
 * Main entry point. Returns { draft, sources, adjacentHints, duplicates, warnings }.
 *
 * Parameters:
 *   name           seed name (for person/org) or title (for resource)
 *   entityType     'person' | 'organization' | 'resource'
 *   mode           'seed' (default) | 'reverify'
 *   entityId       required when mode === 'reverify'
 *   overrideDuplicate  when true, proceed even if a high-similarity DB hit exists
 */
export async function research({ name, entityType, mode = 'seed', entityId = null, overrideDuplicate = false } = {}) {
  if (!name) throw new Error('research: `name` is required')
  assertEntityType(entityType)

  const warnings = []
  let existingEntity = null

  if (mode === 'reverify') {
    if (!entityId) throw new Error('research: --mode=reverify requires --entity-id')
    existingEntity = await getEntityById(entityId)
    if (!existingEntity) throw new Error(`research: no entity found for id=${entityId}`)
  }

  // Duplicate detection — only applies for new-seed mode. Reverify is
  // explicitly updating a known entity.
  let duplicates = []
  if (mode === 'seed') {
    duplicates = await detectDuplicates(name, entityType)
    const top = duplicates[0]
    if (top && top.similarity >= SIM_HIGH && !overrideDuplicate) {
      return {
        draft: { type: entityType, name, skipReason: 'duplicate' },
        sources: [],
        adjacentHints: [],
        duplicates,
        warnings: [
          {
            type: 'duplicate_detected',
            candidate: name,
            match: top.entity,
            similarity: top.similarity,
            hint: 'Re-run with overrideDuplicate=true / --override-duplicate to proceed anyway.',
          },
        ],
      }
    }
    if (top && top.similarity >= SIM_LOW) {
      warnings.push({
        type: 'possible_duplicate',
        match: top.entity,
        similarity: top.similarity,
      })
    }
  }

  const retriever = resolveRetriever()
  if (retriever.retriever === 'web-search') {
    warnings.push({
      type: 'retriever_degraded',
      detail:
        'No Exa MCP hook and no EXA_API_KEY — falling back to web-search. Source snippets are not extracted; please verify manually.',
    })
  }

  const { sources, evidenceText, warnings: researchWarnings } = await runResearchLoop(name, entityType, retriever)
  warnings.push(...researchWarnings)

  let classification
  try {
    classification = await classifyEntity({ name, entityType, evidenceText })
  } catch (err) {
    // Re-raise with enough context so callers can tell which step failed.
    throw new Error(`Classifier failed for ${entityType} "${name}": ${err.message}`)
  }

  const draft = buildDraft({ name, entityType, classification, sources, warnings })

  // Adjacent-entity hints: scan classifier reasoning + evidence for candidate
  // phrases, then cross-check against the DB so only NEW ones are surfaced.
  const hintText = `${classification.reasoning || ''}\n\n${evidenceText}`
  const phrases = extractCandidatePhrases(hintText, name)
  const adjacentHints = await resolveAdjacentHints(phrases, sources, warnings)

  if (mode === 'reverify') {
    draft.entityId = entityId
    draft.diff = diffEntity(existingEntity, draft)
    draft.existing = {
      id: existingEntity.id,
      name: existingEntity.name,
      category: existingEntity.category,
    }
  }

  return { draft, sources, adjacentHints, duplicates, warnings }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { mode: 'seed' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--name') args.name = argv[++i]
    else if (a === '--type') args.entityType = argv[++i]
    else if (a === '--mode') args.mode = argv[++i]
    else if (a === '--entity-id') args.entityId = Number(argv[++i])
    else if (a === '--out') args.out = argv[++i]
    else if (a === '--override-duplicate') args.overrideDuplicate = true
    else if (a === '--help' || a === '-h') args.help = true
  }
  return args
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node scripts/enrich/research.js --name "<name>" --type <person|organization|resource>',
      '                                       [--mode=seed|reverify] [--entity-id N]',
      '                                       [--override-duplicate] [--out draft.json]',
      '',
      'Env vars:',
      '  EXA_API_KEY          — enables Exa retrieval (preferred)',
      '  ANTHROPIC_API_KEY    — enables Haiku classifier',
      '  DATABASE_URL         — enables DB duplicate + adjacent-hint lookups',
      '',
    ].join('\n'),
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.name || !args.entityType) {
    printHelp()
    process.exit(args.help ? 0 : 2)
  }
  const result = await research(args)
  const out = JSON.stringify(result, null, 2)
  if (args.out) {
    await writeFile(args.out, out, 'utf8')
    process.stderr.write(`Draft written to ${args.out}\n`)
  } else {
    process.stdout.write(out + '\n')
  }
}

// Only run CLI when invoked directly (not when imported by tests).
const invokedAsScript = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('research.js')
if (invokedAsScript) {
  main().catch((err) => {
    process.stderr.write(`research.js error: ${err.message}\n`)
    process.exit(1)
  })
}
