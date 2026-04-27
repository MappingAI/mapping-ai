/**
 * Deep Organization Enrichment with LLM
 *
 * Similar to enrich-deep.js but for organizations.
 * Handles different org types: Frontier Labs, AI Safety orgs, Think Tanks,
 * VCs/Funders, Government, Academic, Media, Civil Society, etc.
 *
 * Usage:
 *   node scripts/enrich-deep-orgs.js --pilot          # 5 orgs only
 *   node scripts/enrich-deep-orgs.js --id=123         # single org by ID
 *   node scripts/enrich-deep-orgs.js --orgs           # all orgs
 *   node scripts/enrich-deep-orgs.js --orgs --force   # re-run all (ignore progress)
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
const doOrgs = args.includes('--orgs') || pilotMode
const singleIdArg = args.find((a) => a.startsWith('--id='))
const singleId = singleIdArg ? parseInt(singleIdArg.split('=')[1], 10) : null
const forceRerun = args.includes('--force')

// Tracking
let exaSearches = 0
let llmCalls = 0
let inputTokens = 0
let outputTokens = 0
let enriched = 0
let skipped = 0

// Progress tracking
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

// Valid enum values
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
const VALID_EVIDENCE = ['Explicitly stated', 'Inferred from actions', 'Inferred from associations']
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
const VALID_FUNDING = [
  'Venture-backed',
  'Revenue-generating',
  'Government-funded',
  'Philanthropic',
  'Membership',
  'Mixed',
  'Public benefit',
  'Self-funded',
  'Other',
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
  queries.push({ q: `${name} AI funding investors backed`, n: 3 })
  queries.push({ q: `${name} founded headquarters location team`, n: 3 })
  queries.push({ q: `${name} AI 2024 2025`, n: 3 })

  return queries
}

// ── Get org-type-specific prompt guidance ──
function getOrgGuidance(org) {
  const cat = (org.category || '').toLowerCase()

  if (cat.includes('frontier lab')) {
    return {
      type: 'Frontier AI Lab',
      categoryCorrect: 'Frontier Lab',
      stanceExample:
        "Advocates for 'responsible scaling' with voluntary safety commitments and pre-deployment testing. Supports targeted disclosure requirements but opposes broad licensing schemes.",
      threatExample:
        'Company safety team focuses on alignment research, red-teaming for dangerous capabilities (bio, cyber), and preventing misuse. Published responsible scaling policy with capability thresholds.',
      notesExample:
        'Founded 2015 as nonprofit, restructured 2019. Launched ChatGPT (Nov 2022), GPT-4 (Mar 2023). 1,500+ employees, valued at $80B+ (2024). HQ in San Francisco. Key products: ChatGPT, API, DALL-E.',
      lookFor:
        'products/models released, funding raised, valuation, employee count, safety policies, government testimony, voluntary commitments',
    }
  } else if (cat.includes('safety') || cat.includes('alignment')) {
    return {
      type: 'AI Safety/Alignment Organization',
      categoryCorrect: 'AI Safety/Alignment',
      stanceExample:
        'Advocates for mandatory safety evaluations and third-party audits before deploying frontier models. Publishes technical alignment research and policy recommendations.',
      threatExample:
        'Research focuses on alignment techniques (RLHF, constitutional AI, interpretability), deceptive alignment risks, and evaluating dangerous capabilities in frontier models.',
      notesExample:
        "Founded 2017, nonprofit. 25 researchers. Funded by Open Philanthropy, SFF. Key publications: 'Concrete Problems in AI Safety', interpretability research. Partners with Anthropic, DeepMind on safety evals.",
      lookFor:
        'research focus areas, key publications, funding sources, team size, partnerships with labs, policy recommendations',
    }
  } else if (cat.includes('think tank') || cat.includes('policy')) {
    return {
      type: 'Think Tank/Policy Organization',
      categoryCorrect: 'Think Tank/Policy Org',
      stanceExample:
        'Publishes policy briefs advocating for risk-based regulatory framework with mandatory incident reporting and pre-deployment assessments for high-risk AI systems.',
      threatExample:
        'Research covers AI governance gaps, recommends export controls on AI chips, algorithmic accountability frameworks, and workforce transition policies.',
      notesExample:
        "Founded 2018, nonprofit. Based in Washington DC. Staff of 15. Funded by Ford Foundation, Hewlett. Key reports: 'AI Governance Roadmap' (2024). Testified before Senate Commerce Committee.",
      lookFor:
        'policy papers published, congressional testimony, funding sources, political lean, key staff, influence on legislation',
    }
  } else if (cat.includes('vc') || cat.includes('capital') || cat.includes('philanthrop') || cat.includes('funder')) {
    return {
      type: 'VC/Funder/Incubator',
      categoryCorrect: 'VC/Capital/Philanthropy',
      stanceExample:
        "Portfolio includes both AI capabilities and safety companies. Investment thesis emphasizes 'responsible AI' as market opportunity. No explicit policy advocacy.",
      threatExample:
        'Funds startups working on AI safety tooling, interpretability platforms, and governance software. Treats safety risks as business opportunities rather than existential concerns.',
      notesExample:
        'Founded 2015, $500M AUM. 40 portfolio companies, 5 unicorns. Key AI investments: Anthropic (Series A), Cohere. Partners: Jane Doe, John Smith. Based in SF.',
      lookFor:
        'AUM, portfolio companies, AI-specific investments, fund partners, investment thesis, incubator programs, co-investors',
    }
  } else if (cat.includes('government') || cat.includes('agency')) {
    return {
      type: 'Government Agency',
      categoryCorrect: 'Government/Agency',
      stanceExample:
        'Implements AI executive orders, develops federal AI use guidelines, coordinates agency AI adoption. Balances innovation promotion with risk management.',
      threatExample:
        'Regulatory focus on algorithmic discrimination, AI in critical infrastructure, federal procurement standards, and national security applications.',
      notesExample:
        'Established 2021 under OSTP. Coordinates federal AI policy across 20+ agencies. Published AI Bill of Rights (Oct 2022). Director: Jane Smith (appointed 2023).',
      lookFor:
        'regulatory authority, key rules/guidelines issued, leadership, budget, enforcement actions, international coordination',
    }
  } else if (cat.includes('academic')) {
    return {
      type: 'Academic Institution/Lab',
      categoryCorrect: 'Academic',
      stanceExample:
        'Faculty publish research on AI governance frameworks. Lab director testified advocating for mandatory pre-deployment audits and compute governance.',
      threatExample:
        'Research covers technical AI safety, societal impacts, labor displacement modeling, and AI ethics. Trains next generation of AI policy researchers.',
      notesExample:
        'Founded 2019, housed in CS department. 8 faculty, 30 PhD students. Funded by NSF, Open Philanthropy. Key publications: 150+ papers on AI safety/governance. Director: Prof. Jane Smith.',
      lookFor:
        'faculty, research areas, key publications, funding sources, PhD students, policy influence, industry partnerships',
    }
  } else if (cat.includes('media') || cat.includes('journalism')) {
    return {
      type: 'Media/Journalism Organization',
      categoryCorrect: 'Media/Journalism',
      stanceExample:
        'Editorial coverage tends to emphasize AI risks and corporate accountability. Investigative reporting on AI lab safety practices.',
      threatExample:
        'Coverage focuses on labor impacts, algorithmic bias, misinformation, and corporate influence on AI policy.',
      notesExample:
        "AI coverage team of 5 reporters. Won Pulitzer for AI accountability series (2024). Key beat reporters: Jane Smith, John Doe. Podcast: 'AI Explained' (100K subscribers).",
      lookFor:
        'AI beat reporters, notable stories/investigations, editorial stance, audience reach, awards, podcasts/newsletters',
    }
  } else if (cat.includes('labor') || cat.includes('civil') || cat.includes('union')) {
    return {
      type: 'Labor/Civil Society Organization',
      categoryCorrect: 'Labor/Civil Society',
      stanceExample:
        'Advocates for worker voice in AI deployment decisions, algorithmic transparency in hiring, and transition support for displaced workers.',
      threatExample:
        'Campaigns focus on AI-driven surveillance, algorithmic management, gig worker classification, and ensuring workers benefit from AI productivity gains.',
      notesExample:
        "Founded 2020, coalition of 15 unions. 500K members. Key campaigns: 'AI Workers Bill of Rights', Amazon warehouse algorithm transparency. Director: Jane Smith.",
      lookFor: 'member unions/orgs, campaigns, policy wins, leadership, funding, coalition partners',
    }
  } else if (cat.includes('ethics') || cat.includes('bias') || cat.includes('rights')) {
    return {
      type: 'Ethics/Rights Organization',
      categoryCorrect: 'Ethics/Bias/Rights',
      stanceExample:
        'Advocates for mandatory algorithmic impact assessments, bias audits, and community consent before AI deployment in public services.',
      threatExample:
        'Research documents discriminatory AI systems in criminal justice, hiring, healthcare. Campaigns against facial recognition, predictive policing.',
      notesExample:
        "Founded 2017, nonprofit. Staff of 20. Key reports: 'Gender Shades' study on facial recognition bias. Director: Dr. Jane Smith. Funded by Ford, MacArthur foundations.",
      lookFor: 'research/audits published, campaigns, litigation, policy influence, leadership, funding sources',
    }
  } else if (cat.includes('political') || cat.includes('campaign') || cat.includes('pac')) {
    return {
      type: 'Political Campaign/PAC',
      categoryCorrect: 'Political Campaign/PAC',
      stanceExample:
        'Supports candidates favoring light-touch AI regulation and innovation-friendly policies. Opposes state-level AI safety bills.',
      threatExample:
        'Lobbying focuses on preventing regulatory burden on AI companies, promoting federal preemption of state AI laws.',
      notesExample:
        'Super PAC founded 2024. Raised $10M. Major donors: tech executives. Spent $5M on 2024 House races. Opposes SB 1047-style legislation.',
      lookFor:
        'donations received, spending, candidates supported/opposed, lobbying targets, major donors, policy positions',
    }
  }

  return {
    type: 'Organization',
    categoryCorrect: null,
    stanceExample: "Organization's stated or inferred position on AI regulation and governance.",
    threatExample: 'Key AI-related concerns the organization focuses on or addresses.',
    notesExample: 'Founded [year], [type]. [Size]. [Funding]. Key activities: [main work]. [Location].',
    lookFor: 'mission, founding, size, funding, key activities, leadership, location',
  }
}

// ── Build the LLM prompt ──
function buildPrompt(org, webContent) {
  const guidance = getOrgGuidance(org)

  return `You are a researcher enriching a database entry for a ${guidance.type} in the US AI policy landscape. Your job is to provide THOROUGH, SPECIFIC, FACTUAL information based on the web search results.

CURRENT DATABASE ENTRY:
- Name: ${org.name}
- Category: ${org.category || '(empty)'}
- Website: ${org.website || '(empty)'}
- Location: ${org.location || '(empty)'}
- Funding model: ${org.funding_model || '(empty)'}
- Regulatory stance: ${org.regulatory_stance || '(empty)'}
- Regulatory stance detail: ${org.regulatory_stance_detail || '(empty)'}
- Evidence source: ${org.evidence_source || '(empty)'}
- AGI timeline: ${org.agi_timeline || '(empty)'}
- AI risk level: ${org.ai_risk_level || '(empty)'}
- Threat models: ${org.threat_models || '(empty)'}
- Influence type: ${org.influence_type || '(empty)'}
- Twitter: ${org.twitter || '(empty)'}
- Notes: ${org.notes || '(empty)'}

WEB SEARCH RESULTS:
${webContent || 'No relevant web content found.'}

FOR THIS ${guidance.type.toUpperCase()}, LOOK FOR: ${guidance.lookFor}

VALID CATEGORIES (pick the BEST fit):
Frontier Lab | AI Safety/Alignment | Think Tank/Policy Org | Government/Agency | Academic | VC/Capital/Philanthropy | Labor/Civil Society | Ethics/Bias/Rights | Media/Journalism | Political Campaign/PAC

Provide enriched values in JSON. BE THOROUGH AND SPECIFIC:

{
  "name": "Corrected name if needed (e.g., add parent org: '5050 AI (by Fifty Years)')",
  "category": "CORRECT category from the list above - many orgs are miscategorized",
  "website": "Full URL with https://",
  "location": "HQ city, state/country (can add context like 'SF + London office')",
  "funding_model": "Venture-backed | Revenue-generating | Government-funded | Philanthropic | Membership | Mixed | Public benefit | Self-funded | Other",
  "regulatory_stance": "Accelerate | Light-touch | Targeted | Moderate | Restrictive | Precautionary | Nationalize | Mixed/unclear",
  "regulatory_stance_detail": "1-3 sentences explaining position. Example: '${guidance.stanceExample}'",
  "evidence_source": "Explicitly stated | Inferred from actions | Inferred from associations",
  "agi_timeline": "Already here | 2-3 years | 5-10 years | 10-25 years | 25+ years or never | Ill-defined | Unknown",
  "ai_risk_level": "Overstated | Manageable | Serious | Catastrophic | Existential | Mixed/nuanced | Unknown",
  "threat_models": "Comma-separated concerns from: Labor displacement, Economic inequality, Power concentration, Democratic erosion, Cybersecurity, Misinformation, Environmental, Weapons proliferation, Loss of control, Copyright/IP, Existential risk, Bias/discrimination, Privacy, National security. Include brief detail on specific focus areas. Example: '${guidance.threatExample}'",
  "influence_type": "Comma-separated from: Decision-maker, Advisor/strategist, Researcher/analyst, Funder/investor, Builder, Organizer/advocate, Narrator, Implementer, Connector/convener",
  "twitter": "@handle",
  "notes": "2-4 sentences with SPECIFIC facts. Example: '${guidance.notesExample}'"
}

CRITICAL INSTRUCTIONS:
1. CORRECT the category if it's wrong. Many orgs are miscategorized (e.g., VC incubators labeled as "AI Safety", research labs labeled as "Think Tank").
2. For VCs/incubators, the category should be "VC/Capital/Philanthropy" even if they focus on AI safety investments.
3. For academic labs at universities, use "Academic" not "AI Safety/Alignment".
4. regulatory_stance_detail should explain the org's actual position, not just restate the enum.
5. notes should include: founding year, size/team, funding, key activities, notable outputs.
6. If the org has no explicit policy positions, use "Inferred from actions" and explain in stance_detail.

Return ONLY the JSON object.`
}

// ── Validate and clean the LLM response ──
function validateResponse(data) {
  const clean = {}

  // Name (if corrected)
  if (data.name && typeof data.name === 'string' && data.name.length > 2) {
    clean.name = data.name.substring(0, 195)
  }

  // Category - validate against list
  if (data.category && VALID_CATEGORIES.includes(data.category)) {
    clean.category = data.category
  }

  // Website
  if (data.website && typeof data.website === 'string' && data.website.startsWith('http')) {
    clean.website = data.website.substring(0, 195)
  }

  // Location
  if (data.location && typeof data.location === 'string' && data.location.length > 2) {
    clean.location = data.location.substring(0, 195)
  }

  // Funding model
  if (data.funding_model && VALID_FUNDING.includes(data.funding_model)) {
    clean.funding_model = data.funding_model
  }

  // Regulatory stance
  if (data.regulatory_stance && VALID_STANCES.includes(data.regulatory_stance)) {
    clean.regulatory_stance = data.regulatory_stance
  }
  if (data.regulatory_stance_detail && typeof data.regulatory_stance_detail === 'string') {
    clean.regulatory_stance_detail = data.regulatory_stance_detail.substring(0, 2000)
  }

  // Evidence source
  if (data.evidence_source && VALID_EVIDENCE.includes(data.evidence_source)) {
    clean.evidence_source = data.evidence_source
  }

  // Timeline
  if (data.agi_timeline && VALID_TIMELINES.includes(data.agi_timeline)) {
    clean.agi_timeline = data.agi_timeline
  }

  // Risk level
  if (data.ai_risk_level && VALID_RISKS.includes(data.ai_risk_level)) {
    clean.ai_risk_level = data.ai_risk_level
  }

  // Threat models - can include detail since threat_models_detail is not a column
  if (data.threat_models && typeof data.threat_models === 'string') {
    clean.threat_models = data.threat_models.substring(0, 2000)
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

  // Update name if corrected
  if (clean.name && clean.name !== org.name) {
    updates.push(`name = $${idx++}`)
    values.push(clean.name)
  }

  // Always update category if we got a valid one (helps fix miscategorizations)
  if (clean.category) {
    updates.push(`category = $${idx++}`)
    values.push(clean.category)
  }

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

  // Update funding_model
  if (clean.funding_model) {
    updates.push(`funding_model = $${idx++}`)
    values.push(clean.funding_model)
  }

  // Core enrichment fields - use belief_* column names
  if (clean.regulatory_stance) {
    updates.push(`belief_regulatory_stance = $${idx++}`)
    values.push(clean.regulatory_stance)
  }
  if (clean.regulatory_stance_detail) {
    updates.push(`belief_regulatory_stance_detail = $${idx++}`)
    values.push(clean.regulatory_stance_detail)
  }
  if (clean.evidence_source) {
    updates.push(`belief_evidence_source = $${idx++}`)
    values.push(clean.evidence_source)
  }
  if (clean.agi_timeline) {
    updates.push(`belief_agi_timeline = $${idx++}`)
    values.push(clean.agi_timeline)
  }
  if (clean.ai_risk_level) {
    updates.push(`belief_ai_risk = $${idx++}`)
    values.push(clean.ai_risk_level)
  }
  if (clean.threat_models) {
    updates.push(`belief_threat_models = $${idx++}`)
    values.push(clean.threat_models)
  }
  // Note: threat_models_detail is not a DB column
  if (clean.influence_type) {
    updates.push(`influence_type = $${idx++}`)
    values.push(clean.influence_type)
  }

  // Twitter only if org doesn't have one
  if (clean.twitter && !org.twitter) {
    updates.push(`twitter = $${idx++}`)
    values.push(clean.twitter)
  }

  // Always update notes if we got good ones
  if (clean.notes) {
    updates.push(`notes = $${idx++}`)
    values.push(clean.notes)
  }

  if (updates.length === 0) {
    console.log('  No updates needed')
    skipped++
    return
  }

  values.push(org.id)
  await client.query(`UPDATE entity SET ${updates.join(', ')} WHERE id = $${idx}`, values)
  enriched++

  // Log what we found
  console.log('  ✓ ENRICHED:')
  if (clean.name && clean.name !== org.name) {
    console.log(`    name: ${org.name} → ${clean.name}`)
  }
  if (clean.category) {
    const changed = org.category !== clean.category
    const marker = changed ? ' ← CHANGED' : ''
    console.log(`    category: ${org.category || '(empty)'} → ${clean.category}${marker}`)
  }
  if (clean.funding_model) {
    console.log(`    funding: ${org.funding_model || '(empty)'} → ${clean.funding_model}`)
  }
  if (clean.regulatory_stance) {
    const changed = org.regulatory_stance !== clean.regulatory_stance
    const marker = changed ? ' ← CHANGED' : ''
    console.log(`    stance: ${org.regulatory_stance || '(empty)'} → ${clean.regulatory_stance}${marker}`)
  }
  if (clean.regulatory_stance_detail) {
    console.log(`    stance_detail: ${clean.regulatory_stance_detail.substring(0, 120)}...`)
  }
  if (clean.evidence_source) {
    console.log(`    evidence: ${clean.evidence_source}`)
  }
  if (clean.threat_models) {
    console.log(`    threats: ${clean.threat_models}`)
  }
  if (clean.influence_type) {
    console.log(`    influence: ${clean.influence_type}`)
  }
  if (clean.notes) {
    console.log(`    notes: ${clean.notes.substring(0, 120)}...`)
  }
}

// ── Checkpoint: export to Excel ──
async function saveCheckpoint(client, checkpointNum) {
  const XLSX = await import('xlsx')
  const result = await client.query(`
    SELECT id, name, category, website, location, funding_model,
           belief_regulatory_stance AS regulatory_stance,
           belief_regulatory_stance_detail AS regulatory_stance_detail,
           belief_evidence_source AS evidence_source,
           belief_agi_timeline AS agi_timeline,
           belief_ai_risk AS ai_risk_level,
           belief_threat_models AS threat_models,
           influence_type, twitter, notes
    FROM entity WHERE entity_type = 'organization' AND status = 'approved'
    ORDER BY id
  `)

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(result.rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Organizations')

  const filename = `data/enrichment-orgs-checkpoint-${checkpointNum}.xlsx`
  XLSX.writeFile(wb, filename)
  console.log(`\n  💾 CHECKPOINT ${checkpointNum}: Saved ${result.rows.length} orgs to ${filename}\n`)
}

// ── Main ──
async function main() {
  console.log('Deep Organization Enrichment (Exa + Claude Sonnet)')
  console.log('===================================================\n')

  const completedIds = loadProgress()

  if (completedIds.size > 0 && !forceRerun) {
    console.log(`Resuming from previous run: ${completedIds.size} orgs already processed`)
    console.log(`(Use --force to start fresh)\n`)
  }

  const client = await pool.connect()
  try {
    // Use aliases to map DB column names (belief_*) to script's expected names
    let query = `
      SELECT id, name, category, website, location, funding_model,
             belief_regulatory_stance AS regulatory_stance,
             belief_regulatory_stance_detail AS regulatory_stance_detail,
             belief_evidence_source AS evidence_source,
             belief_agi_timeline AS agi_timeline,
             belief_ai_risk AS ai_risk_level,
             belief_threat_models AS threat_models,
             influence_type, twitter, bluesky, notes
      FROM entity WHERE entity_type = 'organization' AND status = 'approved'
    `

    if (singleId) {
      query += ` AND id = ${singleId}`
    }
    query += ` ORDER BY id`
    if (pilotMode) {
      query += ` LIMIT 5`
    }

    const result = await client.query(query)

    // Filter out already-completed orgs
    let orgsToProcess = result.rows
    if (!forceRerun && !pilotMode && !singleId) {
      orgsToProcess = result.rows.filter((o) => !completedIds.has(o.id))
    }

    const total = orgsToProcess.length
    const totalInDb = result.rows.length

    console.log(`Total approved orgs: ${totalInDb}`)
    console.log(`Already processed: ${totalInDb - total}`)
    console.log(`Remaining to process: ${total}`)
    console.log(`Checkpoints saved every 25 orgs\n`)

    if (total === 0) {
      console.log('Nothing to process!')
      return
    }

    const CHECKPOINT_INTERVAL = 25
    let processedInRun = 0

    for (let i = 0; i < orgsToProcess.length; i++) {
      const org = orgsToProcess[i]
      console.log(`\n[${i + 1}/${total}] ─────────────────────────────────────`)

      await enrichOrg(client, org)
      processedInRun++

      // Save progress
      completedIds.add(org.id)
      saveProgress(completedIds, { enriched, skipped, exaSearches, llmCalls })

      // Checkpoint every 25
      if (processedInRun > 0 && processedInRun % CHECKPOINT_INTERVAL === 0) {
        await saveCheckpoint(client, Math.floor(processedInRun / CHECKPOINT_INTERVAL))
      }
    }

    // Final checkpoint
    if (processedInRun > 0) {
      await saveCheckpoint(client, 'final')
    }

    console.log('\n===================================================')
    console.log('SUMMARY')
    console.log('===================================================')
    console.log(`Orgs processed: ${processedInRun}`)
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
