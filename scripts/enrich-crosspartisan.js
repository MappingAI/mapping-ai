/**
 * Crosspartisan claim enrichment
 *
 * For each policymaker × policy area, searches Exa for public statements,
 * then asks Claude to extract sourced claims with verbatim quotes.
 *
 * Writes to src/insights/crosspartisan/data/claims.json (never touches the DB).
 * Every claim requires: source_url, verbatim quote, date_stated, stance score.
 *
 * Architecture:
 *   1. Load policymakers.json (120 partisan policymakers)
 *   2. For each person, run Exa searches across all 6 policy areas
 *   3. Pass search highlights to Claude Sonnet for structured extraction
 *   4. Validate: reject claims without a source_url or quote
 *   5. Append to claims.json, deduplicating by claim_id
 *
 * Usage:
 *   node scripts/enrich-crosspartisan.js --pilot          # 3 people only
 *   node scripts/enrich-crosspartisan.js --id=82          # single person by ID (e.g., Ted Cruz)
 *   node scripts/enrich-crosspartisan.js --all            # all 120 partisan policymakers (~$6)
 *   node scripts/enrich-crosspartisan.js --resume         # skip already-enriched people
 *   node scripts/enrich-crosspartisan.js --dry-run        # search + extract but don't write
 *
 * Cost estimate (--all):
 *   Exa: 720 searches × ~$0.008 = ~$5.76
 *   Claude: 120 calls × ~$0.003 = ~$0.36
 *   Total: ~$6.12
 */
import Exa from 'exa-js'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const exa = new Exa(process.env.EXA_API_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const args = process.argv.slice(2)
const pilotMode = args.includes('--pilot')
const allMode = args.includes('--all')
const resumeMode = args.includes('--resume')
const dryRun = args.includes('--dry-run')
const singleId = args.find((a) => a.startsWith('--id='))?.split('=')[1]

if (!pilotMode && !allMode && !singleId) {
  console.log('Usage: node scripts/enrich-crosspartisan.js [--pilot | --all | --id=N] [--resume] [--dry-run]')
  process.exit(0)
}

const CLAIMS_PATH = path.join(__dirname, '../src/insights/crosspartisan/data/claims.json')
const POLICYMAKERS_PATH = path.join(__dirname, '../src/insights/crosspartisan/data/policymakers.json')
const POLICY_AREAS_PATH = path.join(__dirname, '../src/insights/crosspartisan/data/policy-areas.json')
const PROGRESS_PATH = path.join(__dirname, '../data/crosspartisan-progress.json')

const POLICY_AREAS = JSON.parse(fs.readFileSync(POLICY_AREAS_PATH, 'utf-8')).policy_areas

const SEARCH_QUERIES_BY_AREA = {
  state_preemption: (name) => `${name} AI federal preemption state regulation California SB 1047 position statement`,
  open_source_weights: (name) =>
    `${name} open source AI open weights Llama frontier model release restriction position`,
  compute_governance: (name) =>
    `${name} AI compute threshold FLOPs reporting requirement training run executive order position`,
  export_controls_chips: (name) => `${name} AI chip export controls China BIS semiconductor position`,
  pre_deployment_testing: (name) => `${name} AI safety testing pre-deployment evaluation red team AISI NIST position`,
  liability: (name) => `${name} AI developer liability product liability Section 230 harm accountability position`,
}

const EXTRACTION_PROMPT = `You are analyzing web search results about a US policymaker's positions on specific AI policy issues.

For each policy area below, determine if the search results contain evidence of this person's position. Only extract claims where you find DIRECT evidence (a quote, a bill they sponsored, a vote, a public statement).

POLICY AREAS:
${POLICY_AREAS.map(
  (a) => `- ${a.id}: "${a.label}"
  Support means: ${a.support_means}
  Oppose means: ${a.oppose_means}`,
).join('\n')}

STANCE SCALE (per policy area):
  -2 = Strongly oppose
  -1 = Oppose / skeptical
   0 = Mixed / conditional / neutral
   1 = Support / sympathetic
   2 = Strongly support

RULES:
1. Every claim MUST have a source_url from the search results. Never fabricate URLs.
2. Every claim MUST include a VERBATIM quote (exact words from the source, 1-2 sentences max). If you cannot find a direct quote, use the closest paraphrase and set confidence to "low".
3. Only create a claim if there is real evidence. It is fine and expected to return zero claims for policy areas where the person has no public record.
4. Set date_stated to YYYY-MM-DD. If only month/year is available, use the first of the month.
5. source_type must be one of: hearing, bill, tweet, op_ed, interview, press_release, floor_speech, letter, report
6. confidence: "high" = unambiguous direct statement on the specific mechanism. "medium" = clear position but not on the exact mechanism. "low" = inferred from adjacent statements or voting record.

Respond with a JSON array of claim objects (may be empty). Each object:
{
  "policy_area": "<id from list above>",
  "stance": <integer -2 to 2>,
  "stance_label": "<short human label>",
  "definition_used": "<how they defined the key term, one sentence>",
  "quote": "<VERBATIM excerpt, ≤2 sentences>",
  "source_url": "<exact URL from search results>",
  "source_type": "<one of the allowed types>",
  "source_title": "<human-readable title>",
  "date_stated": "<YYYY-MM-DD>",
  "confidence": "<high|medium|low>",
  "notes": "<optional context or null>"
}

Respond ONLY with the JSON array, no other text.`

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function makeClaimId(personName, policyArea, dateStated) {
  const last = personName.split(' ').pop().toLowerCase()
  const yymm = dateStated ? dateStated.slice(0, 7) : 'unknown'
  return `${last}_${policyArea}_${yymm}`
}

async function searchPolicyArea(personName, areaId) {
  const queryFn = SEARCH_QUERIES_BY_AREA[areaId]
  if (!queryFn) return []

  try {
    const result = await exa.searchAndContents(queryFn(personName), {
      numResults: 4,
      highlights: { numSentences: 5, highlightsPerUrl: 3 },
      startPublishedDate: '2023-01-01',
    })
    return (result.results || []).map((r) => ({
      url: r.url,
      title: r.title || '',
      published: r.publishedDate || '',
      highlights: (r.highlights || []).join(' … '),
    }))
  } catch (err) {
    console.error(`  Exa error for ${personName} / ${areaId}: ${err.message}`)
    return []
  }
}

async function extractClaims(personName, personId, party, title, searchResults) {
  if (searchResults.length === 0) return []

  const sourcesText = searchResults
    .map(
      (r, i) =>
        `[Source ${i + 1}] ${r.url}\n  Title: ${r.title}\n  Published: ${r.published}\n  Highlights: ${r.highlights}`,
    )
    .join('\n\n')

  const userPrompt = `Person: ${personName}
Title: ${title || 'N/A'}
Party: ${party}

SEARCH RESULTS:
${sourcesText}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: EXTRACTION_PROMPT + '\n\n' + userPrompt }],
    })

    const text = response.content[0]?.text || '[]'
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const raw = JSON.parse(jsonMatch[0])
    return raw
      .filter((c) => c.source_url && c.quote && c.policy_area && c.stance != null)
      .map((c) => ({
        claim_id: makeClaimId(personName, c.policy_area, c.date_stated),
        person_id: personId,
        person_name: personName,
        policy_area: c.policy_area,
        stance: c.stance,
        stance_label: c.stance_label || '',
        definition_used: c.definition_used || '',
        quote: c.quote,
        source_url: c.source_url,
        source_type: c.source_type || 'report',
        source_title: c.source_title || '',
        date_stated: c.date_stated || 'unknown',
        confidence: c.confidence || 'medium',
        extracted_by: 'exa+claude',
        notes: c.notes || null,
      }))
  } catch (err) {
    console.error(`  Claude error for ${personName}: ${err.message}`)
    return []
  }
}

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'))
  } catch {
    return { completed: [] }
  }
}

function saveProgress(progress) {
  const dir = path.dirname(PROGRESS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2) + '\n')
}

async function main() {
  console.log('CROSSPARTISAN CLAIM ENRICHMENT')
  console.log('==============================')

  const policymakers = JSON.parse(fs.readFileSync(POLICYMAKERS_PATH, 'utf-8')).policymakers
  const existingClaims = JSON.parse(fs.readFileSync(CLAIMS_PATH, 'utf-8'))
  const progress = loadProgress()

  let targets = policymakers.filter((p) => p.party && ['D', 'R', 'I'].includes(p.party))

  if (singleId) {
    targets = targets.filter((p) => p.person_id === parseInt(singleId))
  } else if (pilotMode) {
    targets = targets.slice(0, 3)
  }

  if (resumeMode) {
    const done = new Set(progress.completed)
    targets = targets.filter((p) => !done.has(p.person_id))
  }

  console.log(`Targets: ${targets.length} policymakers`)
  console.log(`Policy areas: ${POLICY_AREAS.length}`)
  console.log(`Exa searches: ~${targets.length * POLICY_AREAS.length}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`)

  const newClaims = []
  const existingIds = new Set(existingClaims.claims.map((c) => c.claim_id))
  let searchCount = 0
  let claudeCount = 0

  for (const pm of targets) {
    console.log(`\n▸ ${pm.name} (${pm.party}, id=${pm.person_id})`)

    const allResults = []
    for (const area of POLICY_AREAS) {
      const results = await searchPolicyArea(pm.name, area.id)
      allResults.push(...results.map((r) => ({ ...r, area_id: area.id })))
      searchCount++
      await delay(150)
    }

    console.log(`  Exa: ${allResults.length} results across ${POLICY_AREAS.length} areas`)

    if (allResults.length === 0) {
      console.log('  No search results; skipping Claude call')
      progress.completed.push(pm.person_id)
      continue
    }

    const claims = await extractClaims(pm.name, pm.person_id, pm.party, pm.title, allResults)
    claudeCount++
    await delay(100)

    let added = 0
    for (const c of claims) {
      let id = c.claim_id
      let suffix = 0
      while (existingIds.has(id)) {
        suffix++
        id = `${c.claim_id}-${suffix}`
      }
      c.claim_id = id
      existingIds.add(id)
      newClaims.push(c)
      added++
    }

    console.log(`  Claude: ${claims.length} claims extracted, ${added} new`)
    for (const c of claims) {
      console.log(`    ${c.policy_area}: stance=${c.stance} (${c.confidence}) — ${c.source_url.slice(0, 60)}…`)
    }

    progress.completed.push(pm.person_id)
    saveProgress(progress)
  }

  console.log('\n==============================')
  console.log(`Searches: ${searchCount}, Claude calls: ${claudeCount}`)
  console.log(`New claims: ${newClaims.length}`)

  if (!dryRun && newClaims.length > 0) {
    const manual = existingClaims.claims.filter((c) => c.extracted_by === 'manual')
    const allClaims = [...manual, ...newClaims]
    existingClaims.claims = allClaims
    existingClaims.note =
      'One row per (policymaker, policy_area, source). Claims with extracted_by="manual" were hand-verified. ' +
      'Claims with extracted_by="exa+claude" were auto-extracted and should be spot-checked.'
    fs.writeFileSync(CLAIMS_PATH, JSON.stringify(existingClaims, null, 2) + '\n')
    console.log(`Wrote ${allClaims.length} total claims to ${CLAIMS_PATH}`)
  } else if (dryRun) {
    console.log('Dry run; no files written. Re-run without --dry-run to persist.')
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
