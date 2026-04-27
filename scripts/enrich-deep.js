/**
 * Deep People Enrichment with LLM
 *
 * Produces rich, detailed profiles like:
 *   Name: Dario Amodei
 *   Regulatory stance: Moderate (mandatory safety evals + transparency)
 *   Evidence source: Explicitly stated (speeches, testimony, writing)
 *   AGI timeline: Within 2–3 years
 *   AI risk level: Potentially catastrophic
 *   Key concerns: Concentration of power, Weapons proliferation, Loss of human control
 *   Notes: Co-founded Anthropic after leaving OpenAI over safety disagreements...
 *
 * Architecture:
 *   1. Exa Search: Get detailed web results about each person's AI views
 *   2. Claude Sonnet: Analyze results and generate structured, detailed output
 *   3. Database Update: Populate all fields including detail columns and notes
 *
 * Usage:
 *   node scripts/enrich-deep.js --pilot          # 3-5 people only (~$0.18)
 *   node scripts/enrich-deep.js --id=123         # single person by ID
 *   node scripts/enrich-deep.js --people         # all people (~$4.50 for 127)
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
const doPeople = args.includes('--people') || pilotMode
const singleIdArg = args.find((a) => a.startsWith('--id='))
const singleId = singleIdArg ? parseInt(singleIdArg.split('=')[1], 10) : null

// Tracking
let exaSearches = 0
let llmCalls = 0
let inputTokens = 0
let outputTokens = 0
let enriched = 0
let skipped = 0

// Valid enum values for validation
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

// ── Rate-limited Exa search ──
async function exaSearch(query, opts) {
  await new Promise((r) => setTimeout(r, 150)) // Respect rate limits
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
  await new Promise((r) => setTimeout(r, 100)) // Rate limit
  llmCalls++
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })
  inputTokens += msg.usage.input_tokens
  outputTokens += msg.usage.output_tokens
  return msg.content[0].text
}

// ── Get role-specific guidance for the prompt ──
function getRoleGuidance(person) {
  const cat = (person.category || '').toLowerCase()
  const title = (person.title || '').toLowerCase()

  if (
    cat.includes('policymaker') ||
    title.match(/senator|congress|assembl|legislat|representative|secretary|commissioner|governor/)
  ) {
    return {
      type: 'Policymaker',
      stanceExample:
        'Sponsored the RAISE Act, which places safety requirements specifically on frontier AI developers who have spent $100M+ on training. Has explicitly distanced himself from broad restriction, emphasizing the bill is narrowly scoped.',
      threatExample:
        'The RAISE Act was designed to address severe risks including assisting in the creation of bioweapons and automated criminal activity. Also sponsors training data transparency legislation.',
      notesExample:
        'Named to Time 100 AI list (2025); won Future Caucus Rising Star award (2024). Running for NY-12 Congressional seat; being targeted by AI industry super PAC. Has MS in Computer Science (Georgia Tech).',
      lookFor:
        'bills sponsored/co-sponsored, committee assignments, floor statements, testimony, votes, campaign positions, endorsements, PAC opposition/support',
    }
  } else if (cat.includes('executive') || title.match(/ceo|cto|coo|founder|co-founder|chief|president(?! of)/)) {
    return {
      type: 'Executive',
      stanceExample:
        "Advocates for 'responsible scaling' rather than pausing development. Company voluntarily committed to pre-deployment safety testing and red-teaming. Testified before Senate supporting targeted disclosure requirements but opposing broad licensing.",
      threatExample:
        'Has publicly warned about concentration of AI power in few hands, potential for autonomous weapons, and risks of rushing capabilities without adequate safety research. Published essay on bioweapon risks.',
      notesExample:
        "Co-founded Anthropic (2021) after leaving OpenAI over safety disagreements. Published 'Machines of Loving Grace' (Oct 2024). Former VP Research at OpenAI. PhD Physics, Princeton.",
      lookFor:
        'company safety policies, voluntary commitments, congressional testimony, blog posts/essays, interviews, product decisions, hiring priorities, funding raised',
    }
  } else if (
    cat.includes('researcher') ||
    cat.includes('academic') ||
    title.match(/professor|researcher|scientist|fellow|director.*institute|phd/)
  ) {
    return {
      type: 'Researcher/Academic',
      stanceExample:
        "Co-authored influential paper arguing for mandatory third-party audits of frontier models. Testified before Congress recommending compute thresholds for regulation. Has called current voluntary commitments 'insufficient'.",
      threatExample:
        'Research focuses on AI alignment and interpretability. Has published on deceptive AI systems and instrumental convergence. Warns about recursive self-improvement scenarios.',
      notesExample:
        "Professor of Computer Science at Stanford; Director of HAI. Previously at Google Brain (2015-2020). Authored 'The Alignment Problem' (2020). Over 50,000 citations.",
      lookFor:
        'papers published, research focus, expert testimony, policy recommendations, institutional affiliations, citations, awards, grants, media commentary',
    }
  } else if (cat.includes('investor')) {
    return {
      type: 'Investor',
      stanceExample:
        'Portfolio heavily weighted toward AI safety startups. Has publicly stated will not invest in companies without safety review boards. Advocates for voluntary industry standards over government regulation.',
      threatExample:
        'Warns about economic disruption from rapid automation. Funds research on AI job displacement. Concerned about concentration of AI capabilities in few large labs.',
      notesExample:
        'General Partner at Founders Fund. Led Series A investments in Anthropic, Cohere. Previously founded PayPal with Peter Thiel. Forbes Midas List (2023, 2024).',
      lookFor:
        'portfolio companies, investment thesis, public statements, board seats, fund focus areas, returns, co-investors',
    }
  } else if (cat.includes('journalist') || title.match(/journalist|reporter|editor|columnist|correspondent/)) {
    return {
      type: 'Journalist',
      stanceExample:
        'Coverage tends to emphasize AI risks and corporate accountability. Has written critically about voluntary safety commitments. Broke story on OpenAI internal safety concerns.',
      threatExample:
        'Reporting focuses on labor displacement, algorithmic bias, and corporate lobbying against regulation. Has covered AI-generated misinformation extensively.',
      notesExample:
        "AI reporter at New York Times since 2022. Previously covered tech at Wired. Won Pulitzer Prize for series on facial recognition (2023). Author of 'Code Red' (2024).",
      lookFor:
        'beat/coverage area, notable stories broken, publications, awards, books authored, expertise areas, social media following',
    }
  } else if (cat.includes('organizer') || title.match(/organizer|activist|advocate|director.*union|campaign/)) {
    return {
      type: 'Organizer/Advocate',
      stanceExample:
        'Leading campaign for mandatory algorithmic impact assessments. Coalition brought together 50+ civil society groups to oppose industry self-regulation. Advocates for worker voice in AI deployment decisions.',
      threatExample:
        'Organization focuses on labor rights in the AI era, algorithmic discrimination, and corporate accountability. Has campaigned against specific AI hiring tools.',
      notesExample:
        "Executive Director of AI Now Institute since 2020. Former FTC advisor (2018-2020). Co-authored 'Discriminating Systems' report. Organizes annual AI accountability summit.",
      lookFor:
        'organizations led, campaigns organized, coalitions built, policy wins, testimony, reports published, events convened',
    }
  } else if (cat.includes('cultural') || title.match(/author|writer|philosopher|intellectual|commentator/)) {
    return {
      type: 'Cultural Figure/Intellectual',
      stanceExample:
        'Has argued AI development should be slowed until governance catches up. Public intellectual voice for precautionary approach. Signed open letter calling for 6-month pause on frontier AI training.',
      threatExample:
        "Writing emphasizes existential risk and loss of human agency. Warns about AI consciousness and moral status questions. Concerned about 'race to the bottom' on safety.",
      notesExample:
        "Author of 'Superintelligence' (2014) and 'Deep Utopia' (2024). Professor of Philosophy at Oxford; Director of Future of Humanity Institute. Over 100,000 Twitter followers.",
      lookFor:
        'books written, major essays, public lectures, open letters signed, media appearances, academic positions, public debates',
    }
  }

  // Default
  return {
    type: 'General',
    stanceExample:
      'Has publicly advocated for [specific policy]. Signed [specific letter/commitment]. Testified/spoke at [specific venue] arguing for [specific approach].',
    threatExample: 'Has expressed concern about [specific risks]. Work/statements focus on [specific threat areas].',
    notesExample:
      'Background in [field]. Previously at [organizations]. Notable for [specific achievements/positions].',
    lookFor: 'public statements, organizational affiliations, notable actions, career history',
  }
}

// ── Build the LLM prompt ──
function buildPrompt(person, webContent) {
  const guidance = getRoleGuidance(person)

  return `You are a researcher enriching a database entry for a ${guidance.type} in the US AI policy landscape. Your job is to provide THOROUGH, SPECIFIC, FACTUAL information based on the web search results.

CURRENT DATABASE ENTRY:
- Name: ${person.name}
- Title: ${person.title || '(empty)'}
- Primary org: ${person.primary_org || '(empty)'}
- Other orgs: ${person.other_orgs || '(empty)'}
- Category: ${person.category || '(empty)'}
- Location: ${person.location || '(empty)'}
- Regulatory stance: ${person.regulatory_stance || '(empty)'}
- Regulatory stance detail: ${person.regulatory_stance_detail || '(empty)'}
- Evidence source: ${person.evidence_source || '(empty)'}
- AGI timeline: ${person.agi_timeline || '(empty)'}
- AI risk level: ${person.ai_risk_level || '(empty)'}
- Threat models: ${person.threat_models || '(empty)'}
- Influence type: ${person.influence_type || '(empty)'}
- Twitter: ${person.twitter || '(empty)'}
- Notes: ${person.notes || '(empty)'}

WEB SEARCH RESULTS:
${webContent || 'No relevant web content found.'}

FOR THIS ${guidance.type.toUpperCase()}, LOOK FOR: ${guidance.lookFor}

Provide enriched values in JSON. BE THOROUGH AND SPECIFIC:

{
  "title": "Full title with specifics (district numbers, roles, etc.)",
  "other_orgs": "Additional affiliations found (boards, former employers, advisory roles)",
  "location": "Most accurate location for their work",
  "regulatory_stance": "Accelerate | Light-touch | Targeted | Moderate | Restrictive | Precautionary | Nationalize | Mixed/unclear",
  "regulatory_stance_detail": "1-3 sentences explaining their SPECIFIC position. Example for ${guidance.type}: '${guidance.stanceExample}'",
  "evidence_source": "Explicitly stated | Inferred from actions | Inferred from associations",
  "agi_timeline": "Already here | 2-3 years | 5-10 years | 10-25 years | 25+ years or never | Ill-defined | Unknown",
  "ai_risk_level": "Overstated | Manageable | Serious | Catastrophic | Existential | Mixed/nuanced | Unknown",
  "threat_models": "Comma-separated concerns from: Labor displacement, Economic inequality, Power concentration, Democratic erosion, Cybersecurity, Misinformation, Environmental, Weapons proliferation, Loss of control, Copyright/IP, Existential risk, Bias/discrimination, Privacy, National security. Include brief detail on their SPECIFIC concerns. Example: '${guidance.threatExample}'",
  "influence_type": "Comma-separated from: Decision-maker, Advisor/strategist, Researcher/analyst, Funder/investor, Builder, Organizer/advocate, Narrator, Implementer, Connector/convener",
  "twitter": "@handle",
  "notes": "2-4 sentences with SPECIFIC facts. Example for ${guidance.type}: '${guidance.notesExample}'"
}

CRITICAL INSTRUCTIONS:
1. CORRECT existing values if the evidence shows they're wrong (e.g., if current stance is "Restrictive" but evidence shows "Targeted" is more accurate based on their actual positions)
2. regulatory_stance_detail and threat_models_detail should be FULL PARAGRAPHS with specific evidence - bill names, dollar amounts, dates, quotes
3. notes should include SPECIFIC facts: awards (with years), degrees (with schools), employers (with years), publications (with dates)
4. evidence_source: Use "Explicitly stated" if they have on-record interviews, testimony, published positions, or public statements. Most ${guidance.type}s with any public profile should qualify.
5. Only include fields where you have evidence. Use null for fields with no information.
6. Be precise about influence_type - consider all the ways they exert influence beyond their formal role

Return ONLY the JSON object.`
}

// ── Validate and clean the LLM response ──
// Database column limits from migrate.js:
// - title: VARCHAR(200)
// - other_orgs: VARCHAR(200)
// - location: VARCHAR(200)
// - regulatory_stance: VARCHAR(200)
// - regulatory_stance_detail: TEXT
// - evidence_source: VARCHAR(200)
// - threat_models: TEXT
// - threat_models_detail: TEXT
// - influence_type: TEXT
// - notes: TEXT

function validateResponse(data) {
  const clean = {}

  // VARCHAR(200) fields - truncate to 195 to be safe
  if (data.title && typeof data.title === 'string' && data.title.length > 2) {
    clean.title = data.title.substring(0, 195)
  }
  if (data.other_orgs && typeof data.other_orgs === 'string' && data.other_orgs.length > 2) {
    clean.other_orgs = data.other_orgs.substring(0, 195)
  }
  if (data.location && typeof data.location === 'string' && data.location.length > 2) {
    clean.location = data.location.substring(0, 195)
  }

  // Enum fields (VARCHAR(200))
  if (data.regulatory_stance && VALID_STANCES.includes(data.regulatory_stance)) {
    clean.regulatory_stance = data.regulatory_stance
  }
  // TEXT fields - can be longer
  if (data.regulatory_stance_detail && typeof data.regulatory_stance_detail === 'string') {
    clean.regulatory_stance_detail = data.regulatory_stance_detail.replace(/^["']|["']$/g, '').substring(0, 2000)
  }
  if (data.evidence_source && VALID_EVIDENCE.includes(data.evidence_source)) {
    clean.evidence_source = data.evidence_source
  }
  if (data.agi_timeline && VALID_TIMELINES.includes(data.agi_timeline)) {
    clean.agi_timeline = data.agi_timeline
  }
  if (data.ai_risk_level && VALID_RISKS.includes(data.ai_risk_level)) {
    clean.ai_risk_level = data.ai_risk_level
  }
  // TEXT field - can include detail since threat_models_detail is not a column
  if (data.threat_models && typeof data.threat_models === 'string') {
    clean.threat_models = data.threat_models.substring(0, 2000)
  }
  // TEXT field
  if (data.influence_type && typeof data.influence_type === 'string') {
    // Validate each type - allow any number
    const types = data.influence_type
      .split(',')
      .map((t) => t.trim())
      .filter((t) => VALID_INFLUENCE.includes(t))
    if (types.length > 0) {
      clean.influence_type = types.join(', ')
    }
  }
  if (data.twitter && typeof data.twitter === 'string') {
    // Normalize twitter handle
    let handle = data.twitter.trim()
    if (!handle.startsWith('@')) handle = '@' + handle
    if (/^@[A-Za-z0-9_]{1,15}$/.test(handle)) {
      clean.twitter = handle
    }
  }
  // TEXT field
  if (data.notes && typeof data.notes === 'string' && data.notes.length > 10) {
    clean.notes = data.notes.substring(0, 3000)
  }

  return clean
}

// ── Build search queries based on person's role ──
function getSearchQueries(person) {
  const name = `"${person.name}"`
  const context = [person.title, person.primary_org].filter(Boolean).join(' ')
  const cat = (person.category || '').toLowerCase()

  // Base queries everyone gets
  const queries = []

  // Role-specific policy/stance queries
  if (
    cat.includes('policymaker') ||
    (person.title || '').toLowerCase().match(/senator|congress|assembl|legislat|representative|secretary|commissioner/)
  ) {
    // Politicians: legislation, bills, testimony, votes
    queries.push({ q: `${name} AI legislation bill sponsor testimony`, n: 5 })
    queries.push({ q: `${name} AI regulation vote policy statement`, n: 4 })
  } else if (
    cat.includes('executive') ||
    (person.title || '').toLowerCase().match(/ceo|cto|founder|chief|president|director/)
  ) {
    // Executives: company policy, public statements, interviews
    queries.push({ q: `${name} ${person.primary_org || ''} AI policy safety responsible`, n: 5 })
    queries.push({ q: `${name} interview AI regulation government`, n: 4 })
  } else if (
    cat.includes('researcher') ||
    cat.includes('academic') ||
    (person.title || '').toLowerCase().match(/professor|researcher|scientist|phd/)
  ) {
    // Researchers: papers, research, expert testimony
    queries.push({ q: `${name} AI research paper safety alignment`, n: 5 })
    queries.push({ q: `${name} AI expert testimony policy recommendation`, n: 4 })
  } else if (cat.includes('investor')) {
    // Investors: portfolio, investment thesis, AI bets
    queries.push({ q: `${name} AI investment portfolio thesis`, n: 5 })
    queries.push({ q: `${name} AI startup funding safety`, n: 4 })
  } else if (cat.includes('journalist') || cat.includes('cultural')) {
    // Journalists/writers: articles, books, coverage
    queries.push({ q: `${name} AI coverage writing book article`, n: 5 })
    queries.push({ q: `${name} AI opinion views interview`, n: 4 })
  } else {
    // Default: general AI policy searches
    queries.push({ q: `${name} ${context} AI policy regulation stance`, n: 5 })
    queries.push({ q: `${name} AI views position statement`, n: 4 })
  }

  // Everyone gets these
  queries.push({ q: `${name} AI safety risk existential AGI timeline`, n: 4 }) // Risk/timeline views
  queries.push({ q: `${name} ${context} biography career education award`, n: 4 }) // Background
  queries.push({ q: `${name} AI 2024 2025`, n: 3 }) // Recent news

  return queries
}

// ── Enrich a single person ──
async function enrichPerson(client, person) {
  console.log(`\n[${person.id}] ${person.name}${person.title ? ' (' + person.title + ')' : ''}`)
  console.log(`  Category: ${person.category || 'unknown'}`)

  // Get role-appropriate search queries
  const queries = getSearchQueries(person)

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
  const prompt = buildPrompt(person, webContent)
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
      console.log(`  Raw response: ${response.substring(0, 200)}...`)
      skipped++
      return
    }
    data = JSON.parse(jsonMatch[0])
  } catch (err) {
    console.log(`  JSON parse error: ${err.message}`)
    console.log(`  Raw response: ${response.substring(0, 300)}...`)
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

  // Update title if enriched version is longer/better
  if (clean.title && (!person.title || clean.title.length > person.title.length)) {
    updates.push(`title = $${idx++}`)
    values.push(clean.title)
  }
  // Update other_orgs if we found new ones
  if (clean.other_orgs && (!person.other_orgs || clean.other_orgs.length > person.other_orgs.length)) {
    updates.push(`other_orgs = $${idx++}`)
    values.push(clean.other_orgs)
  }
  // Update location if we found a better one
  if (clean.location && !person.location) {
    updates.push(`location = $${idx++}`)
    values.push(clean.location)
  }

  // Always update these core fields if we got good data (they're the point of deep enrichment)
  // Note: DB columns use belief_* prefix
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
  // Note: threat_models_detail is not a DB column - detail goes in belief_threat_models
  if (clean.influence_type) {
    updates.push(`influence_type = $${idx++}`)
    values.push(clean.influence_type)
  }
  // Only update twitter if person doesn't have one
  if (clean.twitter && !person.twitter) {
    updates.push(`twitter = $${idx++}`)
    values.push(clean.twitter)
  }
  // Always update notes if we got good enriched notes
  if (clean.notes) {
    updates.push(`notes = $${idx++}`)
    values.push(clean.notes)
  }

  if (updates.length === 0) {
    console.log('  No updates needed')
    skipped++
    return
  }

  values.push(person.id)
  await client.query(`UPDATE entity SET ${updates.join(', ')} WHERE id = $${idx}`, values)
  enriched++

  // Log what we found - show changes from original
  console.log('  ✓ ENRICHED:')
  if (clean.title) {
    console.log(`    title: ${person.title || '(empty)'} → ${clean.title}`)
  }
  if (clean.other_orgs) {
    console.log(`    other_orgs: ${person.other_orgs || '(empty)'} → ${clean.other_orgs}`)
  }
  if (clean.regulatory_stance) {
    const changed = person.regulatory_stance !== clean.regulatory_stance
    const marker = changed ? ' ← CHANGED' : ''
    console.log(`    stance: ${person.regulatory_stance || '(empty)'} → ${clean.regulatory_stance}${marker}`)
  }
  if (clean.regulatory_stance_detail) {
    console.log(`    stance_detail: ${clean.regulatory_stance_detail.substring(0, 150)}...`)
  }
  if (clean.evidence_source) {
    const changed = person.evidence_source !== clean.evidence_source
    const marker = changed ? ' ← CHANGED' : ''
    console.log(`    evidence: ${person.evidence_source || '(empty)'} → ${clean.evidence_source}${marker}`)
  }
  if (clean.agi_timeline) {
    console.log(`    timeline: ${person.agi_timeline || '(empty)'} → ${clean.agi_timeline}`)
  }
  if (clean.ai_risk_level) {
    console.log(`    risk: ${person.ai_risk_level || '(empty)'} → ${clean.ai_risk_level}`)
  }
  if (clean.threat_models) {
    console.log(`    threats: ${clean.threat_models.substring(0, 150)}${clean.threat_models.length > 150 ? '...' : ''}`)
  }
  if (clean.influence_type) {
    console.log(`    influence: ${person.influence_type || '(empty)'} → ${clean.influence_type}`)
  }
  if (clean.twitter && !person.twitter) {
    console.log(`    twitter: ${clean.twitter}`)
  }
  if (clean.notes) {
    console.log(`    notes: ${clean.notes.substring(0, 150)}...`)
  }
}

// ── Progress tracking via state file ──
const PROGRESS_FILE = 'data/enrichment-progress.json'

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

// ── Checkpoint: export current state to Excel ──
async function saveCheckpoint(client, checkpointNum) {
  const XLSX = await import('xlsx')
  const result = await client.query(`
    SELECT id, name, title, primary_org, other_orgs, category, location,
           belief_regulatory_stance AS regulatory_stance,
           belief_regulatory_stance_detail AS regulatory_stance_detail,
           belief_evidence_source AS evidence_source,
           belief_agi_timeline AS agi_timeline,
           belief_ai_risk AS ai_risk_level,
           belief_threat_models AS threat_models,
           influence_type, twitter, notes
    FROM entity WHERE entity_type = 'person' AND status = 'approved'
    ORDER BY id
  `)

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(result.rows)
  XLSX.utils.book_append_sheet(wb, ws, 'People')

  const filename = `data/enrichment-checkpoint-${checkpointNum}.xlsx`
  XLSX.writeFile(wb, filename)
  console.log(`\n  💾 CHECKPOINT ${checkpointNum}: Saved ${result.rows.length} people to ${filename}\n`)
}

// ── Main ──
async function main() {
  console.log('Deep People Enrichment (Exa + Claude Sonnet)')
  console.log('=============================================\n')

  // Load progress from previous runs
  const completedIds = loadProgress()
  const forceRerun = args.includes('--force') // Add --force to ignore progress

  if (completedIds.size > 0 && !forceRerun) {
    console.log(`Resuming from previous run: ${completedIds.size} people already processed`)
    console.log(`(Use --force to start fresh)\n`)
  }

  const client = await pool.connect()
  try {
    // Query all approved people
    // Use aliases to map DB column names (belief_*) to script's expected names
    let query = `
      SELECT id, name, title, primary_org, other_orgs, category, location,
             belief_regulatory_stance AS regulatory_stance,
             belief_regulatory_stance_detail AS regulatory_stance_detail,
             belief_evidence_source AS evidence_source,
             belief_agi_timeline AS agi_timeline,
             belief_ai_risk AS ai_risk_level,
             belief_threat_models AS threat_models,
             influence_type, twitter, bluesky, notes
      FROM entity WHERE entity_type = 'person' AND status = 'approved'
    `

    if (singleId) {
      query += ` AND id = ${singleId}`
    }
    query += ` ORDER BY id`
    if (pilotMode) {
      query += ` LIMIT 5`
    }

    const result = await client.query(query)

    // Filter out already-completed people (unless --force or --pilot or --id)
    let peopleToProcess = result.rows
    if (!forceRerun && !pilotMode && !singleId) {
      peopleToProcess = result.rows.filter((p) => !completedIds.has(p.id))
    }

    const total = peopleToProcess.length
    const totalInDb = result.rows.length

    console.log(`Total approved people: ${totalInDb}`)
    console.log(`Already processed: ${totalInDb - total}`)
    console.log(`Remaining to process: ${total}`)
    console.log(`Checkpoints saved every 25 people to data/enrichment-checkpoint-*.xlsx\n`)

    if (total === 0) {
      console.log('Nothing to process!')
      console.log('Use --force to re-run all, --pilot for first 5, or --id=X for specific person.')
      return
    }

    const CHECKPOINT_INTERVAL = 25
    let processedInRun = 0

    for (let i = 0; i < peopleToProcess.length; i++) {
      const person = peopleToProcess[i]
      console.log(`\n[${i + 1}/${total}] ─────────────────────────────────────`)

      await enrichPerson(client, person)
      processedInRun++

      // Mark as completed and save progress after each person
      completedIds.add(person.id)
      saveProgress(completedIds, { enriched, skipped, exaSearches, llmCalls })

      // Save Excel checkpoint every 25 people
      if (processedInRun > 0 && processedInRun % CHECKPOINT_INTERVAL === 0) {
        await saveCheckpoint(client, Math.floor(processedInRun / CHECKPOINT_INTERVAL))
      }
    }

    // Final checkpoint
    if (processedInRun > 0) {
      await saveCheckpoint(client, 'final')
    }

    console.log('\n=============================================')
    console.log('SUMMARY')
    console.log('=============================================')
    console.log(`People processed this run: ${processedInRun}`)
    console.log(`Enriched: ${enriched}`)
    console.log(`Skipped: ${skipped}`)
    console.log(`Exa searches: ${exaSearches}`)
    console.log(`LLM calls: ${llmCalls}`)
    console.log(`Tokens: ${inputTokens} in, ${outputTokens} out`)

    const exaCost = exaSearches * 0.01 // ~$0.01 per search with highlights
    const llmCost = (inputTokens * 3 + outputTokens * 15) / 1000000 // Sonnet pricing ($3/M in, $15/M out)
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
