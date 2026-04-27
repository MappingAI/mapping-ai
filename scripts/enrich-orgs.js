/**
 * Organization Enrichment with LLM (entity table schema)
 *
 * Updated for entity/submission/edge schema.
 *
 * Usage:
 *   node scripts/enrich-orgs.js --pilot           # 5 orgs only
 *   node scripts/enrich-orgs.js --id=123          # single org by ID
 *   node scripts/enrich-orgs.js --ids=1,2,3       # specific IDs only
 *   node scripts/enrich-orgs.js --new-only        # only unenriched orgs (no stance yet)
 *   node scripts/enrich-orgs.js --all             # all orgs
 *   node scripts/enrich-orgs.js --force           # ignore progress, re-run all
 */
import pg from 'pg'
import Exa from 'exa-js'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const exa = new Exa(process.env.EXA_API_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Parse CLI args
const args = process.argv.slice(2)
const pilotMode = args.includes('--pilot')
const newOnly = args.includes('--new-only')
const forceRerun = args.includes('--force')
const doAll = args.includes('--all') || pilotMode
const singleIdArg = args.find((a) => a.startsWith('--id='))
const singleId = singleIdArg ? parseInt(singleIdArg.split('=')[1], 10) : null
const idsArg = args.find((a) => a.startsWith('--ids='))
const specificIds = idsArg ? idsArg.split('=')[1].split(',').map(Number) : null

// Tracking
let exaSearches = 0
let llmCalls = 0
let inputTokens = 0
let outputTokens = 0
let enriched = 0
let skipped = 0

// Valid enum values (must match form)
const VALID_CATEGORIES = [
  'Frontier Lab',
  'AI Safety/Alignment',
  'Think Tank/Policy Org',
  'Government/Agency',
  'Academic',
  'VC/Capital/Philanthropy',
  'Labor/Civil Society',
  'Ethics/Bias/Rights',
  'Media/Journalism',
  'Political Campaign/PAC',
]
const VALID_STANCES = [
  'Accelerate',
  'Light-touch',
  'Targeted',
  'Moderate',
  'Restrictive',
  'Precautionary',
  'Nationalize',
  'Mixed/unclear',
]
const VALID_TIMELINES = [
  'Already here',
  '2-3 years',
  '5-10 years',
  '10-25 years',
  '25+ years or never',
  'Ill-defined',
  'Unknown',
]
const VALID_RISKS = ['Overstated', 'Manageable', 'Serious', 'Catastrophic', 'Existential', 'Mixed/nuanced', 'Unknown']
const VALID_EVIDENCE = ['Explicitly stated', 'Inferred', 'Unknown']
const VALID_THREAT_MODELS = [
  'Labor displacement',
  'Economic inequality',
  'Power concentration',
  'Democratic erosion',
  'Cybersecurity',
  'Misinformation',
  'Environmental',
  'Weapons',
  'Loss of control',
  'Copyright/IP',
  'Existential risk',
]
const MAX_THREAT_MODELS = 3
const VALID_INFLUENCE = [
  'Decision-maker',
  'Advisor/strategist',
  'Researcher/analyst',
  'Funder/investor',
  'Builder',
  'Organizer/advocate',
  'Narrator',
  'Implementer',
  'Connector/convener',
]

// ── Rate-limited Exa search ──
async function exaSearch(query, opts) {
  await new Promise((r) => setTimeout(r, 150))
  exaSearches++
  try {
    const res = await exa.searchAndContents(query, opts)
    return res
  } catch (err) {
    console.log(`    Exa error: ${err.message}`)
    return { results: [] }
  }
}

// ── Claude Sonnet call ──
async function askSonnet(prompt) {
  await new Promise((r) => setTimeout(r, 100))
  llmCalls++
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })
  inputTokens += msg.usage.input_tokens
  outputTokens += msg.usage.output_tokens
  return msg.content[0].text
}

// ── Get org-type-specific search queries ──
function getSearchQueries(org) {
  const name = `"${org.name}"`
  const cat = (org.category || '').toLowerCase()

  const queries = []

  if (cat.includes('frontier lab') || cat.includes('ai lab')) {
    queries.push({ q: `${name} AI company safety policy responsible scaling`, n: 5 })
    queries.push({ q: `${name} AI regulation government testimony policy`, n: 4 })
  } else if (cat.includes('safety') || cat.includes('alignment')) {
    queries.push({ q: `${name} AI safety alignment research mission`, n: 5 })
    queries.push({ q: `${name} AI policy recommendations regulation`, n: 4 })
  } else if (cat.includes('think tank') || cat.includes('policy')) {
    queries.push({ q: `${name} AI policy research publications recommendations`, n: 5 })
    queries.push({ q: `${name} AI regulation testimony position`, n: 4 })
  } else if (cat.includes('vc') || cat.includes('capital') || cat.includes('philanthrop') || cat.includes('funder')) {
    queries.push({ q: `${name} AI investment portfolio fund thesis`, n: 5 })
    queries.push({ q: `${name} AI startups backed funded companies`, n: 4 })
  } else if (cat.includes('government') || cat.includes('agency')) {
    queries.push({ q: `${name} AI policy regulation enforcement`, n: 5 })
    queries.push({ q: `${name} AI legislation rules guidelines`, n: 4 })
  } else if (cat.includes('academic') || cat.includes('university')) {
    queries.push({ q: `${name} AI research lab faculty publications`, n: 5 })
    queries.push({ q: `${name} AI policy recommendations experts`, n: 4 })
  } else if (cat.includes('media') || cat.includes('journalism')) {
    queries.push({ q: `${name} AI coverage reporting editorial`, n: 5 })
    queries.push({ q: `${name} AI technology journalism`, n: 4 })
  } else if (cat.includes('labor') || cat.includes('civil') || cat.includes('union')) {
    queries.push({ q: `${name} AI workers rights labor policy`, n: 5 })
    queries.push({ q: `${name} AI advocacy campaign positions`, n: 4 })
  } else if (cat.includes('ethics') || cat.includes('bias') || cat.includes('rights')) {
    queries.push({ q: `${name} AI ethics bias fairness accountability`, n: 5 })
    queries.push({ q: `${name} AI rights advocacy policy`, n: 4 })
  } else if (cat.includes('political') || cat.includes('campaign') || cat.includes('pac')) {
    queries.push({ q: `${name} AI political campaign donations spending`, n: 5 })
    queries.push({ q: `${name} AI policy lobbying advocacy`, n: 4 })
  } else {
    queries.push({ q: `${name} AI organization mission about`, n: 5 })
    queries.push({ q: `${name} AI policy position stance`, n: 4 })
  }

  // Everyone gets these
  queries.push({ q: `${name} AI 2024 2025`, n: 3 })

  return queries
}

// ── Get org-type-specific prompt guidance ──
function getOrgGuidance(org) {
  const cat = (org.category || '').toLowerCase()

  if (cat.includes('frontier lab')) {
    return {
      type: 'Frontier AI Lab',
      stanceExample:
        "Advocates for 'responsible scaling' with voluntary safety commitments and pre-deployment testing. Supports targeted disclosure requirements but opposes broad licensing schemes.",
      threatExample:
        'Company safety team focuses on alignment research, red-teaming for dangerous capabilities (bio, cyber), and preventing misuse.',
      notesExample:
        'Founded 2015 as nonprofit, restructured 2019. Launched ChatGPT (Nov 2022), GPT-4 (Mar 2023). 1,500+ employees, valued at $80B+.',
      lookFor:
        'products/models released, funding raised, valuation, employee count, safety policies, government testimony',
    }
  } else if (cat.includes('safety') || cat.includes('alignment')) {
    return {
      type: 'AI Safety/Alignment Organization',
      stanceExample:
        'Advocates for mandatory safety evaluations and third-party audits before deploying frontier models.',
      threatExample: 'Research focuses on alignment techniques (RLHF, interpretability), deceptive alignment risks.',
      notesExample: 'Founded 2017, nonprofit. 25 researchers. Funded by Open Philanthropy, SFF.',
      lookFor: 'research focus areas, key publications, funding sources, team size, partnerships',
    }
  } else if (cat.includes('think tank') || cat.includes('policy')) {
    return {
      type: 'Think Tank/Policy Organization',
      stanceExample:
        'Publishes policy briefs advocating for risk-based regulatory framework with mandatory incident reporting.',
      threatExample: 'Research covers AI governance gaps, recommends export controls on AI chips.',
      notesExample: 'Founded 2018, nonprofit. Based in Washington DC. Staff of 15. Funded by Ford Foundation.',
      lookFor: 'policy papers published, congressional testimony, funding sources, key staff',
    }
  } else if (cat.includes('vc') || cat.includes('capital') || cat.includes('philanthrop')) {
    return {
      type: 'VC/Funder/Philanthropist',
      stanceExample:
        "Portfolio includes both AI capabilities and safety companies. Investment thesis emphasizes 'responsible AI'.",
      threatExample: 'Funds startups working on AI safety tooling, interpretability platforms.',
      notesExample: 'Founded 2015, $500M AUM. 40 portfolio companies. Key AI investments: Anthropic, Cohere.',
      lookFor: 'AUM, portfolio companies, AI-specific investments, fund partners',
    }
  } else if (cat.includes('government') || cat.includes('agency')) {
    return {
      type: 'Government Agency',
      stanceExample: 'Implements AI executive orders, develops federal AI use guidelines.',
      threatExample: 'Regulatory focus on algorithmic discrimination, AI in critical infrastructure.',
      notesExample: 'Established 2021 under OSTP. Coordinates federal AI policy.',
      lookFor: 'regulatory authority, key rules/guidelines issued, leadership',
    }
  } else if (cat.includes('academic')) {
    return {
      type: 'Academic Institution/Lab',
      stanceExample:
        'Faculty publish research on AI governance frameworks. Lab director testified advocating for mandatory audits.',
      threatExample: 'Research covers technical AI safety, societal impacts, labor displacement.',
      notesExample: 'Founded 2019, housed in CS department. 8 faculty, 30 PhD students.',
      lookFor: 'faculty, research areas, key publications, funding sources',
    }
  } else if (cat.includes('media') || cat.includes('journalism')) {
    return {
      type: 'Media/Journalism Organization',
      stanceExample: 'Editorial coverage tends to emphasize AI risks and corporate accountability.',
      threatExample: 'Coverage focuses on labor impacts, algorithmic bias, misinformation.',
      notesExample: 'AI coverage team of 5 reporters. Won Pulitzer for AI accountability series.',
      lookFor: 'AI beat reporters, notable stories/investigations, editorial stance',
    }
  } else if (cat.includes('labor') || cat.includes('civil')) {
    return {
      type: 'Labor/Civil Society Organization',
      stanceExample: 'Advocates for worker voice in AI deployment decisions, algorithmic transparency.',
      threatExample: 'Campaigns focus on AI-driven surveillance, algorithmic management, gig worker rights.',
      notesExample: 'Founded 2020, coalition of 15 unions. 500K members.',
      lookFor: 'member unions/orgs, campaigns, policy wins, leadership',
    }
  } else if (cat.includes('ethics') || cat.includes('bias') || cat.includes('rights')) {
    return {
      type: 'Ethics/Rights Organization',
      stanceExample: 'Advocates for mandatory algorithmic impact assessments, bias audits.',
      threatExample: 'Research documents discriminatory AI systems in criminal justice, hiring.',
      notesExample: "Founded 2017, nonprofit. Staff of 20. Key reports: 'Gender Shades' study.",
      lookFor: 'research/audits published, campaigns, litigation, policy influence',
    }
  }

  return {
    type: 'Organization',
    stanceExample: "Organization's stated or inferred position on AI regulation.",
    threatExample: 'Key AI-related concerns the organization focuses on.',
    notesExample: 'Founded [year], [type]. [Size]. [Funding]. Key activities: [main work].',
    lookFor: 'mission, founding, size, funding, key activities, leadership',
  }
}

// ── Build the LLM prompt ──
function buildPrompt(org, webContent) {
  const guidance = getOrgGuidance(org)

  return `You are a researcher enriching a database entry for a ${guidance.type} in the US AI policy landscape.

CURRENT DATABASE ENTRY:
- Name: ${org.name}
- Category: ${org.category || '(empty)'}
- Website: ${org.website || '(empty)'}
- Location: ${org.location || '(empty)'}
- Funding model: ${org.funding_model || '(empty)'}
- Regulatory stance: ${org.belief_regulatory_stance || '(empty)'}
- Regulatory stance detail: ${org.belief_regulatory_stance_detail || '(empty)'}
- Evidence source: ${org.belief_evidence_source || '(empty)'}
- AGI timeline: ${org.belief_agi_timeline || '(empty)'}
- AI risk level: ${org.belief_ai_risk || '(empty)'}
- Threat models: ${org.belief_threat_models || '(empty)'}
- Influence type: ${org.influence_type || '(empty)'}
- Twitter: ${org.twitter || '(empty)'}
- Notes: ${org.notes || '(empty)'}

WEB SEARCH RESULTS:
${webContent || 'No relevant web content found.'}

FOR THIS ${guidance.type.toUpperCase()}, LOOK FOR: ${guidance.lookFor}

Provide enriched values in JSON:

{
  "website": "Full URL with https://",
  "location": "HQ city, state/country",
  "belief_regulatory_stance": "Accelerate | Light-touch | Targeted | Moderate | Restrictive | Precautionary | Nationalize | Mixed/unclear",
  "belief_regulatory_stance_detail": "1-3 sentences explaining position. Example: '${guidance.stanceExample}'",
  "belief_evidence_source": "Explicitly stated | Inferred | Unknown",
  "belief_agi_timeline": "Already here | 2-3 years | 5-10 years | 10-25 years | 25+ years or never | Ill-defined | Unknown",
  "belief_ai_risk": "Overstated | Manageable | Serious | Catastrophic | Existential | Mixed/nuanced | Unknown",
  "belief_threat_models": "MAX 3, comma-separated from: Labor displacement, Economic inequality, Power concentration, Democratic erosion, Cybersecurity, Misinformation, Environmental, Weapons, Loss of control, Copyright/IP, Existential risk",
  "influence_type": "Comma-separated from: Decision-maker, Advisor/strategist, Researcher/analyst, Funder/investor, Builder, Organizer/advocate, Narrator, Implementer, Connector/convener",
  "twitter": "@handle",
  "notes": "2-4 sentences with SPECIFIC facts. Example: '${guidance.notesExample}'"
}

CRITICAL:
1. Only include fields where you have evidence. Use null for fields with no information.
2. Be precise and factual — include founding year, team size, key activities.
3. For government agencies, use "Unknown" for agi_timeline and ai_risk unless explicitly stated.

Return ONLY the JSON object.`
}

// ── Validate and clean the LLM response ──
function validateResponse(data) {
  const clean = {}

  // Website
  if (data.website && typeof data.website === 'string' && data.website.startsWith('http')) {
    clean.website = data.website.substring(0, 195)
  }

  // Location
  if (data.location && typeof data.location === 'string' && data.location.length > 2) {
    clean.location = data.location.substring(0, 195)
  }

  // Regulatory stance
  if (data.belief_regulatory_stance && VALID_STANCES.includes(data.belief_regulatory_stance)) {
    clean.belief_regulatory_stance = data.belief_regulatory_stance
  }
  if (data.belief_regulatory_stance_detail && typeof data.belief_regulatory_stance_detail === 'string') {
    clean.belief_regulatory_stance_detail = data.belief_regulatory_stance_detail.substring(0, 2000)
  }

  // Evidence source
  if (data.belief_evidence_source && VALID_EVIDENCE.includes(data.belief_evidence_source)) {
    clean.belief_evidence_source = data.belief_evidence_source
  }

  // Timeline
  if (data.belief_agi_timeline && VALID_TIMELINES.includes(data.belief_agi_timeline)) {
    clean.belief_agi_timeline = data.belief_agi_timeline
  }

  // Risk level
  if (data.belief_ai_risk && VALID_RISKS.includes(data.belief_ai_risk)) {
    clean.belief_ai_risk = data.belief_ai_risk
  }

  // Threat models (max 3)
  if (data.belief_threat_models && typeof data.belief_threat_models === 'string') {
    const models = data.belief_threat_models
      .split(',')
      .map((t) => t.trim())
      .filter((t) => VALID_THREAT_MODELS.includes(t))
    if (models.length > 0) {
      clean.belief_threat_models = models.slice(0, MAX_THREAT_MODELS).join(', ')
    }
  }

  // Influence type
  if (data.influence_type && typeof data.influence_type === 'string') {
    const types = data.influence_type
      .split(',')
      .map((t) => t.trim())
      .filter((t) => VALID_INFLUENCE.includes(t))
    if (types.length > 0) {
      clean.influence_type = types.join(', ')
    }
  }

  // Twitter
  if (data.twitter && typeof data.twitter === 'string') {
    let handle = data.twitter.trim()
    if (!handle.startsWith('@')) handle = '@' + handle
    if (/^@[A-Za-z0-9_]{1,15}$/.test(handle)) {
      clean.twitter = handle
    }
  }

  // Notes
  if (data.notes && typeof data.notes === 'string' && data.notes.length > 10) {
    clean.notes = data.notes.substring(0, 3000)
  }

  return clean
}

// ── Enrich a single organization ──
async function enrichOrg(client, org) {
  console.log(`\n[${org.id}] ${org.name}`)
  console.log(`  Category: ${org.category || 'unknown'}`)

  // Get search queries
  const queries = getSearchQueries(org)

  // Run all searches
  const allResults = []
  for (const { q, n } of queries) {
    const res = await exaSearch(q, {
      type: 'auto',
      numResults: n,
      highlights: { numSentences: 10, highlightsPerUrl: 5 },
    })
    allResults.push(...res.results)
  }

  const allHighlights = allResults.flatMap((r) => r.highlights || [])

  if (allHighlights.length === 0) {
    console.log('  No web content found, skipping')
    skipped++
    return
  }

  // Include source URLs for context
  const sourcesWithHighlights = allResults
    .filter((r) => r.highlights && r.highlights.length > 0)
    .map((r) => `[Source: ${r.url}]\n${r.highlights.join('\n')}`)
    .slice(0, 15)

  const webContent = sourcesWithHighlights.join('\n\n---\n\n')
  console.log(`  Found ${allHighlights.length} highlights from ${allResults.length} sources`)

  // Call Claude Sonnet
  const prompt = buildPrompt(org, webContent)
  console.log(`  Calling Claude Sonnet...`)
  let response
  try {
    response = await askSonnet(prompt)
  } catch (err) {
    console.log(`  LLM error: ${err.message}`)
    skipped++
    return
  }

  // Parse JSON response
  let data
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.log('  No JSON in response')
      skipped++
      return
    }
    data = JSON.parse(jsonMatch[0])
  } catch (err) {
    console.log(`  JSON parse error: ${err.message}`)
    skipped++
    return
  }

  // Validate and clean
  const clean = validateResponse(data)

  if (Object.keys(clean).length === 0) {
    console.log('  No valid fields extracted')
    skipped++
    return
  }

  // Build UPDATE query
  const updates = []
  const values = []
  let idx = 1

  // Update website if better
  if (clean.website && (!org.website || clean.website.length > org.website.length)) {
    updates.push(`website = $${idx++}`)
    values.push(clean.website)
  }

  // Update location if we found one
  if (clean.location && !org.location) {
    updates.push(`location = $${idx++}`)
    values.push(clean.location)
  }

  // Core enrichment fields - only update if currently empty
  if (clean.belief_regulatory_stance && !org.belief_regulatory_stance) {
    updates.push(`belief_regulatory_stance = $${idx++}`)
    values.push(clean.belief_regulatory_stance)
  }
  if (clean.belief_regulatory_stance_detail && !org.belief_regulatory_stance_detail) {
    updates.push(`belief_regulatory_stance_detail = $${idx++}`)
    values.push(clean.belief_regulatory_stance_detail)
  }
  if (clean.belief_evidence_source && !org.belief_evidence_source) {
    updates.push(`belief_evidence_source = $${idx++}`)
    values.push(clean.belief_evidence_source)
  }
  if (clean.belief_agi_timeline && !org.belief_agi_timeline) {
    updates.push(`belief_agi_timeline = $${idx++}`)
    values.push(clean.belief_agi_timeline)
  }
  if (clean.belief_ai_risk && !org.belief_ai_risk) {
    updates.push(`belief_ai_risk = $${idx++}`)
    values.push(clean.belief_ai_risk)
  }
  if (clean.belief_threat_models && !org.belief_threat_models) {
    updates.push(`belief_threat_models = $${idx++}`)
    values.push(clean.belief_threat_models)
  }
  if (clean.influence_type && !org.influence_type) {
    updates.push(`influence_type = $${idx++}`)
    values.push(clean.influence_type)
  }

  // Twitter only if org doesn't have one
  if (clean.twitter && !org.twitter) {
    updates.push(`twitter = $${idx++}`)
    values.push(clean.twitter)
  }

  // Notes - only update if currently empty
  if (clean.notes && !org.notes) {
    updates.push(`notes = $${idx++}`)
    values.push(clean.notes)
  }

  if (updates.length === 0) {
    console.log('  No updates needed (all fields already populated)')
    skipped++
    return
  }

  values.push(org.id)
  await client.query(`UPDATE entity SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, values)
  enriched++

  // Log what we found
  console.log('  ✓ ENRICHED:')
  Object.keys(clean).forEach((k) => {
    const val = clean[k]
    const display = typeof val === 'string' && val.length > 100 ? val.substring(0, 100) + '...' : val
    console.log(`    ${k}: ${display}`)
  })
}

// ── Progress tracking ──
const PROGRESS_FILE = 'data/enrichment-orgs-progress.json'

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
      return new Set(data.completedIds || [])
    }
  } catch (err) {
    console.log(`Warning: Could not load progress file: ${err.message}`)
  }
  return new Set()
}

function saveProgress(completedIds, stats) {
  const data = {
    completedIds: Array.from(completedIds),
    lastUpdated: new Date().toISOString(),
    stats: stats,
  }
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2))
}

// ── Main ──
async function main() {
  console.log('Organization Enrichment (entity table schema)')
  console.log('=============================================\n')

  if (!singleId && !specificIds && !doAll && !newOnly) {
    console.log('Usage:')
    console.log('  --pilot        First 5 orgs only')
    console.log('  --id=123       Single org by ID')
    console.log('  --ids=1,2,3    Specific IDs only')
    console.log('  --new-only     Only orgs without stance data')
    console.log('  --all          All orgs')
    console.log('  --force        Ignore progress, re-run')
    return
  }

  const completedIds = forceRerun ? new Set() : loadProgress()

  if (completedIds.size > 0 && !forceRerun) {
    console.log(`Resuming: ${completedIds.size} orgs already processed`)
    console.log(`(Use --force to start fresh)\n`)
  }

  const client = await pool.connect()
  try {
    // Build query for entity table
    let query = `
      SELECT id, name, category, website, location, funding_model,
             belief_regulatory_stance, belief_regulatory_stance_detail, belief_evidence_source,
             belief_agi_timeline, belief_ai_risk, belief_threat_models,
             influence_type, twitter, bluesky, notes
      FROM entity
      WHERE entity_type = 'organization' AND status = 'approved'
    `

    if (singleId) {
      query += ` AND id = ${singleId}`
    } else if (specificIds) {
      query += ` AND id IN (${specificIds.join(',')})`
    } else if (newOnly) {
      query += ` AND belief_regulatory_stance IS NULL AND belief_agi_timeline IS NULL AND belief_ai_risk IS NULL`
    }

    query += ` ORDER BY id`

    if (pilotMode) {
      query += ` LIMIT 5`
    }

    const result = await client.query(query)

    let orgsToProcess = result.rows
    if (!forceRerun && !pilotMode && !singleId && !specificIds) {
      orgsToProcess = result.rows.filter((o) => !completedIds.has(o.id))
    }

    const total = orgsToProcess.length
    console.log(`Found ${total} orgs to process\n`)

    if (total === 0) {
      console.log('Nothing to process!')
      return
    }

    for (let i = 0; i < orgsToProcess.length; i++) {
      const org = orgsToProcess[i]
      console.log(`\n[${i + 1}/${total}] ─────────────────────────────────────`)

      await enrichOrg(client, org)

      completedIds.add(org.id)
      saveProgress(completedIds, { enriched, skipped, exaSearches, llmCalls })
    }

    console.log('\n=============================================')
    console.log('SUMMARY')
    console.log('=============================================')
    console.log(`Processed: ${total}`)
    console.log(`Enriched: ${enriched}`)
    console.log(`Skipped: ${skipped}`)
    console.log(`Exa searches: ${exaSearches}`)
    console.log(`LLM calls: ${llmCalls}`)
    console.log(`Tokens: ${inputTokens} in, ${outputTokens} out`)

    const exaCost = exaSearches * 0.01
    const llmCost = (inputTokens * 3 + outputTokens * 15) / 1000000
    console.log(`\nEstimated cost:`)
    console.log(`  Exa: $${exaCost.toFixed(3)}`)
    console.log(`  Claude Sonnet: $${llmCost.toFixed(3)}`)
    console.log(`  Total: $${(exaCost + llmCost).toFixed(3)}`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Enrichment failed:', err)
  process.exit(1)
})
