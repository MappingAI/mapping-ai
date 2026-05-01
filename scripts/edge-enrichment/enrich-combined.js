#!/usr/bin/env node
/**
 * Combined Entity Classification + Enrichment (RDS)
 *
 * Fills ALL relevant RDS columns including:
 * - Core: entity_type, name (corrected), category, other_categories
 * - People: title, primary_org, other_orgs
 * - Orgs: funding_model
 * - Contact: website, twitter, bluesky, location
 * - Notes: notes, notes_sources, notes_confidence, notes_html
 * - Beliefs: belief_regulatory_stance, belief_regulatory_stance_detail, belief_agi_timeline, belief_ai_risk, belief_threat_models, belief_evidence_source
 * - Meta: influence_type, importance, enrichment_version
 *
 * Usage:
 *   node scripts/edge-enrichment/enrich-combined.js --dry-run --limit=5
 *   node scripts/edge-enrichment/enrich-combined.js --limit=15
 *   node scripts/edge-enrichment/enrich-combined.js --all
 */
import 'dotenv/config'
import pg from 'pg'
import Exa from 'exa-js'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'

const rds = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// Neon database for edge_discovery context
const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

const exa = new Exa(process.env.EXA_API_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ENRICHMENT_VERSION = 'combined-v4'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null
const allMode = args.includes('--all')
const idArg = args.find(a => a.startsWith('--id='))
const singleId = idArg ? parseInt(idArg.split('=')[1], 10) : null

const costs = {
  exa_searches: 0, claude_calls: 0, claude_input_tokens: 0, claude_output_tokens: 0,
  get exa_cost() { return this.exa_searches * 0.008 },
  get claude_cost() { return (this.claude_input_tokens / 1_000_000) * 3 + (this.claude_output_tokens / 1_000_000) * 15 },
  get total() { return this.exa_cost + this.claude_cost },
  summary() { return `Exa: ${this.exa_searches} ($${this.exa_cost.toFixed(3)}) | Claude: ${this.claude_calls} ($${this.claude_cost.toFixed(3)}) | Total: $${this.total.toFixed(3)}` }
}

// ENUMS
const PERSON_CATEGORIES = ['Executive', 'Researcher', 'Policymaker', 'Investor', 'Organizer', 'Journalist', 'Academic', 'Cultural figure']
const ORG_CATEGORIES = ['Frontier Lab', 'AI Safety/Alignment', 'Think Tank/Policy Org', 'Government/Agency', 'Academic', 'VC/Capital/Philanthropy', 'Labor/Civil Society', 'Ethics/Bias/Rights', 'Media/Journalism', 'Political Campaign/PAC', 'Infrastructure & Compute', 'Deployers & Platforms']
const REGULATORY_STANCES = ['Accelerate', 'Light-touch', 'Moderate', 'Targeted', 'Restrictive', 'Precautionary', 'Nationalize', 'Mixed/unclear']
const AGI_TIMELINES = ['Already here', '2-3 years', '5-10 years', '10-25 years', '25+ years or never', 'Ill-defined', 'Unknown']
const AI_RISK_LEVELS = ['Overstated', 'Manageable', 'Serious', 'Catastrophic', 'Existential', 'Mixed/nuanced', 'Unknown']
const THREAT_MODELS = ['Existential risk', 'Loss of control', 'Misinformation', 'Bias/discrimination', 'Privacy', 'Labor displacement', 'Power concentration', 'Democratic erosion', 'Cybersecurity', 'National security', 'Weapons proliferation', 'Copyright/IP', 'Economic inequality']
const INFLUENCE_TYPES = ['Decision-maker', 'Funder/investor', 'Builder', 'Researcher/analyst', 'Advisor/strategist', 'Organizer/advocate', 'Narrator', 'Implementer', 'Connector/convener']
const FUNDING_MODELS = ['Government (U.S. federal)', 'Government (non-U.S.)', 'Endowment/philanthropy', 'Grant/nonprofit', 'Corporate/commercial', 'Subscription/reader-funded', 'VC-backed', 'Self-funded']
const EVIDENCE_SOURCES = ['Explicitly stated', 'Inferred from actions', 'Inferred from associations']

// Role-specific guidance for better belief extraction (from Connor's enrich-deep.js)
function getRoleGuidance(entityType, category) {
  const cat = (category || '').toLowerCase()

  if (entityType === 'organization') {
    if (cat.includes('frontier') || cat.includes('lab')) {
      return {
        type: 'Frontier AI Lab',
        stanceExample: "Advocates for 'responsible scaling' with voluntary safety commitments. Supports targeted disclosure requirements but opposes broad licensing. Has published responsible scaling policy.",
        threatExample: 'Company research focuses on alignment and interpretability. Has warned about concentration of AI power and autonomous weapons risks.',
        lookFor: 'safety policies, voluntary commitments, government testimony, published research priorities, hiring for safety roles',
        beliefHint: 'Labs typically have documented positions from RSPs, blog posts, testimony. Look for explicit safety commitments.'
      }
    } else if (cat.includes('safety') || cat.includes('alignment')) {
      return {
        type: 'AI Safety Organization',
        stanceExample: 'Advocates for mandatory third-party audits of frontier models. Research supports compute thresholds for regulation.',
        threatExample: 'Research focuses on existential risk, alignment failures, and loss of human control scenarios.',
        lookFor: 'research publications, policy recommendations, expert testimony, funding sources',
        beliefHint: 'Safety orgs usually have explicit positions. Check their mission statement, research focus, and any policy recommendations.'
      }
    } else if (cat.includes('think tank') || cat.includes('policy')) {
      return {
        type: 'Think Tank/Policy Org',
        stanceExample: 'Published policy framework calling for sector-specific AI regulation. Testified before Congress recommending licensing for high-risk applications.',
        threatExample: 'Reports focus on algorithmic bias, labor displacement, and democratic erosion from AI-generated content.',
        lookFor: 'policy papers, congressional testimony, regulatory comments, public statements, expert convenings',
        beliefHint: 'Policy orgs publish positions. Look for reports, testimony, op-eds. Their funding model may indicate stance.'
      }
    } else if (cat.includes('vc') || cat.includes('capital') || cat.includes('philanthropy')) {
      return {
        type: 'Funder/Investor',
        stanceExample: 'Portfolio weighted toward AI safety startups. Investment thesis emphasizes responsible development. Signed voluntary AI safety commitments.',
        threatExample: 'Funds research on economic disruption and power concentration. Investment criteria includes safety review requirements.',
        lookFor: 'portfolio companies, investment thesis, public statements, signed commitments, fund focus areas',
        beliefHint: 'Investors reveal stance through portfolio choices (safety vs acceleration), public statements, and signed commitments.'
      }
    } else if (cat.includes('government') || cat.includes('agency')) {
      return {
        type: 'Government/Agency',
        stanceExample: 'Agency issued binding guidance requiring impact assessments for AI in hiring. Enforcement actions against algorithmic discrimination.',
        threatExample: 'Regulatory focus on consumer protection, civil rights, and national security implications of AI.',
        lookFor: 'regulations issued, enforcement actions, public guidance, congressional testimony, interagency participation',
        beliefHint: 'Government stance shown through regulations, guidance, enforcement. Check official statements and actions.'
      }
    }
    // Default for orgs
    return {
      type: 'Organization',
      stanceExample: 'Organization has taken public position on AI governance through statements, commitments, or actions.',
      threatExample: 'Organization focuses on specific AI-related concerns in their work.',
      lookFor: 'public statements, policy positions, partnerships, funding, product decisions',
      beliefHint: 'Look for any public statements, signed letters, partnerships that indicate position on AI governance.'
    }
  }

  // Person categories
  if (cat.includes('policymaker')) {
    return {
      type: 'Policymaker',
      stanceExample: 'Sponsored AI safety legislation requiring frontier model evaluations. Testified calling for mandatory disclosure. Distinguished from broad restriction by emphasizing narrow scope.',
      threatExample: 'Bill addresses bioweapon assistance, automated criminal activity, and critical infrastructure risks.',
      lookFor: 'bills sponsored, committee assignments, floor statements, testimony, votes, campaign positions',
      beliefHint: 'Policymakers have voting records, sponsored bills, public statements. Most have discernible positions even if nuanced.'
    }
  } else if (cat.includes('executive')) {
    return {
      type: 'Executive',
      stanceExample: "Advocates for 'responsible scaling' rather than pausing. Company voluntarily committed to safety testing. Testified supporting targeted disclosure but opposing licensing.",
      threatExample: 'Has warned about concentration of power, autonomous weapons, and racing without safety research.',
      lookFor: 'company policies, voluntary commitments, testimony, blog posts, interviews, product decisions',
      beliefHint: 'Executives often have on-record positions from interviews, testimony, company policies. Check for RSPs, safety commitments.'
    }
  } else if (cat.includes('researcher') || cat.includes('academic')) {
    return {
      type: 'Researcher/Academic',
      stanceExample: 'Co-authored paper arguing for mandatory third-party audits. Testified recommending compute thresholds. Called voluntary commitments insufficient.',
      threatExample: 'Research focuses on alignment, interpretability, deceptive AI systems, and recursive self-improvement.',
      lookFor: 'papers, research focus, expert testimony, policy recommendations, institutional affiliations',
      beliefHint: 'Researchers reveal views through papers, testimony, public commentary. Check research focus and recommendations.'
    }
  } else if (cat.includes('investor')) {
    return {
      type: 'Investor',
      stanceExample: 'Portfolio weighted toward safety startups. Will not invest without safety review boards. Advocates voluntary standards over regulation.',
      threatExample: 'Warns about economic disruption from automation. Funds displacement research. Concerned about capability concentration.',
      lookFor: 'portfolio companies, investment thesis, public statements, board seats, fund focus',
      beliefHint: 'Investors show stance through investments (safety-focused vs acceleration), statements, and signed commitments.'
    }
  } else if (cat.includes('journalist')) {
    return {
      type: 'Journalist',
      stanceExample: 'Coverage emphasizes AI risks and corporate accountability. Written critically about voluntary safety commitments.',
      threatExample: 'Reporting focuses on labor displacement, algorithmic bias, corporate lobbying, AI misinformation.',
      lookFor: 'beat/coverage area, notable stories, publications, books authored, expertise areas',
      beliefHint: 'Journalists reveal stance through coverage patterns, framing, sources quoted. Check overall body of work.'
    }
  } else if (cat.includes('organizer')) {
    return {
      type: 'Organizer/Advocate',
      stanceExample: 'Leading campaign for algorithmic impact assessments. Coalition opposed industry self-regulation. Advocates worker voice in deployment.',
      threatExample: 'Focuses on labor rights, algorithmic discrimination, corporate accountability. Campaigned against specific AI tools.',
      lookFor: 'campaigns organized, coalitions built, policy wins, testimony, reports published',
      beliefHint: 'Advocates have clear positions from campaigns, coalition letters, public statements. Usually explicit.'
    }
  } else if (cat.includes('cultural')) {
    return {
      type: 'Cultural Figure',
      stanceExample: 'Argued AI development should slow until governance catches up. Signed open letter calling for training pause.',
      threatExample: 'Writing emphasizes existential risk, loss of human agency, consciousness questions, race to bottom on safety.',
      lookFor: 'books, major essays, public lectures, open letters signed, media appearances',
      beliefHint: 'Public intellectuals often have explicit positions from books, essays, signed letters, public debates.'
    }
  }

  return {
    type: 'General',
    stanceExample: 'Has publicly advocated for specific policy approach through statements, actions, or affiliations.',
    threatExample: 'Has expressed concern about specific AI risks through work or statements.',
    lookFor: 'public statements, organizational affiliations, notable actions, career history',
    beliefHint: 'Look for any public record: statements, signed letters, affiliations, actions that indicate position.'
  }
}

async function searchExa(query, numResults = 8) {
  await new Promise(r => setTimeout(r, 200))
  costs.exa_searches++
  try {
    const res = await exa.searchAndContents(query, { type: 'auto', numResults, highlights: { numSentences: 5, highlightsPerUrl: 3 } })
    return res.results
  } catch (err) { console.log(`    Exa error: ${err.message}`); return [] }
}

// Fetch edge context from Neon edge_discovery table
async function getEdgeContext(entityName) {
  try {
    const result = await neon.query(`
      SELECT
        source_entity_name,
        target_entity_name,
        edge_type,
        citation,
        amount_usd,
        amount_note
      FROM edge_discovery
      WHERE LOWER(source_entity_name) = LOWER($1)
         OR LOWER(target_entity_name) = LOWER($1)
      ORDER BY created_at DESC
      LIMIT 5
    `, [entityName])

    if (result.rows.length === 0) return null

    // Build context summary
    const edges = result.rows.map(e => {
      const isSource = e.source_entity_name.toLowerCase() === entityName.toLowerCase()
      const otherEntity = isSource ? e.target_entity_name : e.source_entity_name
      const relationship = isSource
        ? `${e.edge_type} of ${otherEntity}`
        : `${e.edge_type} by ${otherEntity}`
      const amount = e.amount_usd ? ` ($${Number(e.amount_usd).toLocaleString()})` : ''
      const citation = e.citation ? ` — "${e.citation.substring(0, 150)}..."` : ''
      return `• ${relationship}${amount}${citation}`
    })

    return {
      summary: edges.join('\n'),
      edges: result.rows
    }
  } catch (err) {
    console.log(`    Edge context error: ${err.message}`)
    return null
  }
}

async function askClaude(prompt) {
  await new Promise(r => setTimeout(r, 100))
  costs.claude_calls++
  const msg = await anthropic.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
  costs.claude_input_tokens += msg.usage.input_tokens
  costs.claude_output_tokens += msg.usage.output_tokens
  return msg.content[0].text
}

function buildPrompt(entityName, searchResults, edgeContext) {
  const sourcesText = searchResults.map((r, i) => `=== SOURCE [${i + 1}] ===\nURL: ${r.url}\nTitle: ${r.title || 'N/A'}\n\n${(r.highlights || []).slice(0, 4).join('\n')}`).join('\n\n')

  const edgeSection = edgeContext ? `
## CRITICAL: EDGE CONTEXT FROM OUR DATABASE
This entity was discovered through these relationships (use this to disambiguate):
${edgeContext.summary}

⚠️ USE THIS CONTEXT to identify the correct entity. For example:
- If edge says "funder of Anthropic", this is likely a VC/investor, not a product company
- If edge says "funded by ARPA-H", this is likely a defense/health R&D org, not a VC
- If edge says "funded by Manifund for $8K", this is a small grant project, not a major research system
` : ''

  return `You are enriching an entity for a US AI POLICY ECOSYSTEM database.

## ENTITY NAME (as given)
"${entityName}"
${edgeSection}
## SEARCH RESULTS
${sourcesText || 'NO RESULTS'}

═══════════════════════════════════════════════════════════════════════════════
## RULES
1. ONLY use information from sources above - no hallucination
2. If the name is ambiguous (matches multiple entities), pick the most AI-relevant one and set corrected_name to the full/proper name
3. CRITICAL: Fill belief fields when there's ANY signal. Use "Unknown" or "Mixed/unclear" when evidence is partial but present.

## DOES IT SHAPE AI ECOSYSTEM?
SHAPES = researches/builds/funds/regulates/advocates about AI
DOES NOT SHAPE = merely uses AI as customer

═══════════════════════════════════════════════════════════════════════════════
## BELIEF FIELD GUIDANCE

These fields are IMPORTANT. Fill them based on evidence in sources:

**belief_regulatory_stance** - Their position on AI regulation:
- "Accelerate": Opposes most regulation, wants faster AI development
- "Light-touch": Minimal regulation, industry self-governance preferred
- "Moderate": Balanced approach, targeted requirements for high-risk uses
- "Targeted": Supports specific narrow regulations (e.g., for frontier models only)
- "Restrictive": Broad mandatory requirements, licensing, audits
- "Precautionary": Pause or slow development until governance catches up
- "Nationalize": Government should control AI development
- "Mixed/unclear": Has nuanced or inconsistent positions

**belief_agi_timeline** - When they think AGI/transformative AI arrives:
- "Already here", "2-3 years", "5-10 years", "10-25 years", "25+ years or never"
- "Ill-defined": Thinks AGI is poorly defined concept
- "Unknown": No evidence of their view

**belief_ai_risk** - How serious they view AI risks:
- "Overstated": Thinks concerns are exaggerated
- "Manageable": Risks exist but can be handled with current approaches
- "Serious": Significant concern requiring attention
- "Catastrophic": Could cause major harm to society
- "Existential": Could threaten human existence/control
- "Mixed/nuanced": Different risk levels for different concerns
- "Unknown": No evidence of their view

**belief_evidence_source** - How do we know their views?
- "Explicitly stated": Direct quotes, testimony, published positions, interviews
- "Inferred from actions": Portfolio choices, company policies, research focus
- "Inferred from associations": Org membership, signed letters, who they work with

EXAMPLES of good belief assignments:
- Dario Amodei (Anthropic CEO): stance=Moderate, evidence=Explicitly stated (testimony, essays), risk=Catastrophic, timeline=2-3 years
- Sam Altman (OpenAI CEO): stance=Light-touch, evidence=Explicitly stated (interviews, testimony), risk=Serious
- Tim Draper (VC): stance=Accelerate, evidence=Explicitly stated (interviews), risk=Overstated
- CSET (Georgetown): stance=Targeted, evidence=Explicitly stated (policy papers), threats=National security, Power concentration

If entity shapes AI ecosystem and has ANY public presence, they likely have discernible beliefs. Use "Unknown" only when truly no signal exists.

═══════════════════════════════════════════════════════════════════════════════

Return JSON with EXACT RDS column names:

{
  "status": "SUCCESS" | "INSUFFICIENT_DATA",
  "shapes_ai_ecosystem": true | false,

  "corrected_name": "<Full proper name if different from input, e.g. 'Tim Draper' instead of 'Draper', or null if name is correct>",
  "ambiguous_name": true | false,
  "ambiguity_note": "<If ambiguous, explain what was matched and why>",

  "entity_type": "person" | "organization",
  "category": "<from: ${[...PERSON_CATEGORIES, ...ORG_CATEGORIES].join(' | ')}>",
  "other_categories": "<secondary category or null>",

  // FOR PEOPLE ONLY:
  "title": "<Detailed role, e.g. 'Executive Vice President at CNAS; Defense Technology Expert; Author of Army of None'>",
  "primary_org": "<Main organization name>",
  "other_orgs": "<Other affiliations, comma-separated, or null>",

  // FOR ORGANIZATIONS ONLY:
  "funding_model": "<from: ${FUNDING_MODELS.join(' | ')}>",

  // CONTACT
  "website": "<URL or null>",
  "twitter": "<handle without @ or null>",
  "bluesky": "<handle without @ or null>",
  "location": "<city, state/country or null>",

  // NOTES - BE DETAILED AND SPECIFIC
  "notes": "<DETAILED 5-8 sentences: Who they are, role, key achievements WITH DATES, how they shape AI ecosystem, notable affiliations. Include specific facts from sources.>",

  // BELIEFS - FILL THESE when evidence exists
  "belief_regulatory_stance": "<from: ${REGULATORY_STANCES.join(' | ')} - USE 'Mixed/unclear' if nuanced>",
  "belief_regulatory_stance_detail": "<1-3 sentences with SPECIFIC evidence: bills sponsored, statements made, policies adopted>",
  "belief_agi_timeline": "<from: ${AGI_TIMELINES.join(' | ')} - USE 'Unknown' only if truly no signal>",
  "belief_ai_risk": "<from: ${AI_RISK_LEVELS.join(' | ')} - USE 'Unknown' only if truly no signal>",
  "belief_threat_models": "<comma-separated from: ${THREAT_MODELS.join(', ')} - what AI risks concern them?>",
  "belief_evidence_source": "<from: ${EVIDENCE_SOURCES.join(' | ')} - how do we know their views?>",

  // META
  "influence_type": "<comma-separated from: ${INFLUENCE_TYPES.join(', ')}>",
  "importance": <1-5 where 5=extremely influential in AI ecosystem>,
  "notes_confidence": <1-5>,

  "reasoning": "<Brief explanation of entity type determination and belief assignments>"
}

Return ONLY valid JSON.`
}

// Validate and clean LLM response against RDS enums
function validateAndClean(data) {
  const clean = { ...data }

  // Validate enum fields
  if (clean.belief_regulatory_stance && !REGULATORY_STANCES.includes(clean.belief_regulatory_stance)) {
    console.log(`    Warning: Invalid stance "${clean.belief_regulatory_stance}", setting to null`)
    clean.belief_regulatory_stance = null
  }
  if (clean.belief_agi_timeline && !AGI_TIMELINES.includes(clean.belief_agi_timeline)) {
    console.log(`    Warning: Invalid timeline "${clean.belief_agi_timeline}", setting to null`)
    clean.belief_agi_timeline = null
  }
  if (clean.belief_ai_risk && !AI_RISK_LEVELS.includes(clean.belief_ai_risk)) {
    console.log(`    Warning: Invalid risk "${clean.belief_ai_risk}", setting to null`)
    clean.belief_ai_risk = null
  }
  if (clean.belief_evidence_source && !EVIDENCE_SOURCES.includes(clean.belief_evidence_source)) {
    console.log(`    Warning: Invalid evidence source "${clean.belief_evidence_source}", setting to null`)
    clean.belief_evidence_source = null
  }

  // Validate threat_models (comma-separated, each must be valid)
  if (clean.belief_threat_models) {
    const threats = clean.belief_threat_models.split(',').map(t => t.trim())
    const validThreats = threats.filter(t => THREAT_MODELS.includes(t))
    if (validThreats.length > 0) {
      clean.belief_threat_models = validThreats.join(', ')
    } else {
      clean.belief_threat_models = null
    }
  }

  // Validate influence_type (comma-separated)
  if (clean.influence_type) {
    const types = clean.influence_type.split(',').map(t => t.trim())
    const validTypes = types.filter(t => INFLUENCE_TYPES.includes(t))
    if (validTypes.length > 0) {
      clean.influence_type = validTypes.join(', ')
    } else {
      clean.influence_type = null
    }
  }

  // Validate category
  const allCategories = [...PERSON_CATEGORIES, ...ORG_CATEGORIES]
  if (clean.category && !allCategories.includes(clean.category)) {
    console.log(`    Warning: Invalid category "${clean.category}"`)
  }

  // Validate funding_model
  if (clean.funding_model && !FUNDING_MODELS.includes(clean.funding_model)) {
    console.log(`    Warning: Invalid funding_model "${clean.funding_model}", setting to null`)
    clean.funding_model = null
  }

  return clean
}

async function updateEntity(client, entityId, cleanData, sourceUrls) {
  const updates = []
  const values = []
  let idx = 1

  // Data is already validated by caller

  // If name should be corrected
  if (cleanData.corrected_name) {
    updates.push(`name = $${idx++}`)
    values.push(cleanData.corrected_name)
  }

  const stringFields = ['entity_type', 'category', 'other_categories', 'title', 'primary_org', 'other_orgs',
    'funding_model', 'website', 'location', 'notes', 'belief_regulatory_stance', 'belief_regulatory_stance_detail',
    'belief_agi_timeline', 'belief_ai_risk', 'belief_threat_models', 'belief_evidence_source', 'influence_type']

  for (const field of stringFields) {
    if (cleanData[field]) {
      updates.push(`${field} = $${idx++}`)
      values.push(cleanData[field])
    }
  }

  // Generate notes_html from notes (simple paragraph wrapper)
  if (cleanData.notes) {
    updates.push(`notes_html = $${idx++}`)
    values.push(`<p>${cleanData.notes.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`)
  }

  // Twitter/bluesky without @
  if (cleanData.twitter) { updates.push(`twitter = $${idx++}`); values.push(cleanData.twitter.replace(/^@/, '')) }
  if (cleanData.bluesky) { updates.push(`bluesky = $${idx++}`); values.push(cleanData.bluesky.replace(/^@/, '')) }

  // Numeric fields
  if (cleanData.importance) { updates.push(`importance = $${idx++}`); values.push(cleanData.importance) }
  if (cleanData.notes_confidence) { updates.push(`notes_confidence = $${idx++}`); values.push(cleanData.notes_confidence) }

  // Sources as semicolon-separated
  updates.push(`notes_sources = $${idx++}`)
  values.push(sourceUrls.join('; '))

  updates.push(`enrichment_version = $${idx++}`)
  values.push(ENRICHMENT_VERSION)
  updates.push(`updated_at = NOW()`)

  values.push(entityId)
  await client.query(`UPDATE entity SET ${updates.join(', ')} WHERE id = $${idx}`, values)
}

async function main() {
  if (!limit && !allMode && !singleId) {
    console.log('Usage: --dry-run --limit=N | --all | --id=N')
    process.exit(1)
  }

  console.log('=== COMBINED ENRICHMENT v4 (with edge context) ===')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING'}`)
  if (limit) console.log(`Limit: ${limit}`)

  let query = `SELECT id, name FROM entity WHERE status = 'pending' AND (notes IS NULL OR notes = '') ORDER BY id`
  if (singleId) query = `SELECT id, name FROM entity WHERE id = ${singleId}`

  const entities = await rds.query(query)
  let toProcess = entities.rows
  if (limit && !singleId) toProcess = toProcess.slice(0, limit)

  console.log(`\nProcessing ${toProcess.length} of ${entities.rows.length} pending\n`)

  const exportResults = []
  const ambiguous = []
  let enriched = 0, skipped = 0, rejected = 0, errors = 0

  const client = await rds.connect()

  try {
    for (const entity of toProcess) {
      const num = enriched + skipped + rejected + errors + 1
      console.log(`\n[${num}/${toProcess.length}] ${entity.name} (ID: ${entity.id})`)

      // Fetch edge context from Neon to help disambiguate
      const edgeContext = await getEdgeContext(entity.name)
      if (edgeContext) {
        console.log(`  📊 Edge context found (${edgeContext.edges.length} relationships)`)
      }

      // Build smarter search query using edge context
      let searchQuery = `"${entity.name}" AI`
      if (edgeContext && edgeContext.edges.length > 0) {
        // Add context from edges to help find the right entity
        const firstEdge = edgeContext.edges[0]
        const otherEntity = firstEdge.source_entity_name.toLowerCase() === entity.name.toLowerCase()
          ? firstEdge.target_entity_name
          : firstEdge.source_entity_name
        // Include relationship context in search
        if (firstEdge.edge_type === 'funder' && firstEdge.citation) {
          // Extract key terms from citation
          const citationTerms = firstEdge.citation.substring(0, 80)
          searchQuery = `"${entity.name}" ${citationTerms}`
        } else {
          searchQuery = `"${entity.name}" ${otherEntity} ${firstEdge.edge_type}`
        }
        console.log(`  🔍 Enhanced search: ${searchQuery.substring(0, 60)}...`)
      }

      const results = await searchExa(searchQuery, 8)
      if (results.length === 0) { console.log(`  ⚠ No results`); skipped++; continue }

      console.log(`  ${results.length} results, enriching...`)
      const response = await askClaude(buildPrompt(entity.name, results, edgeContext))

      let data
      try {
        const match = response.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('No JSON')
        data = JSON.parse(match[0])
      } catch (err) { console.log(`  ✗ Parse error`); errors++; continue }

      if (data.status === 'INSUFFICIENT_DATA') { console.log(`  ⚠ Insufficient data`); skipped++; continue }
      if (!data.shapes_ai_ecosystem) {
        console.log(`  ⚠ Not AI-related - rejecting`)
        if (!dryRun) await client.query(`UPDATE entity SET status = 'rejected' WHERE id = $1`, [entity.id])
        rejected++
        continue
      }

      // Validate before display and export
      const cleanData = validateAndClean(data)

      const displayName = cleanData.corrected_name || entity.name
      console.log(`  ✓ ${cleanData.entity_type} | ${cleanData.category} | ${displayName}`)
      if (cleanData.corrected_name) console.log(`    NAME CORRECTED: "${entity.name}" → "${cleanData.corrected_name}"`)
      if (cleanData.title) console.log(`    Title: ${cleanData.title}`)
      if (cleanData.primary_org) console.log(`    Org: ${cleanData.primary_org}`)
      console.log(`    Notes: ${(cleanData.notes || '').substring(0, 100)}...`)

      // Show beliefs prominently
      console.log(`    ── BELIEFS ──`)
      console.log(`    Stance: ${cleanData.belief_regulatory_stance || '(none)'} | Risk: ${cleanData.belief_ai_risk || '(none)'} | Timeline: ${cleanData.belief_agi_timeline || '(none)'}`)
      if (cleanData.belief_regulatory_stance_detail) console.log(`    Stance detail: ${cleanData.belief_regulatory_stance_detail.substring(0, 100)}...`)
      if (cleanData.belief_threat_models) console.log(`    Threats: ${cleanData.belief_threat_models}`)
      if (cleanData.belief_evidence_source) console.log(`    Evidence: ${cleanData.belief_evidence_source}`)

      if (cleanData.influence_type) console.log(`    Influence: ${cleanData.influence_type}`)
      console.log(`    Importance: ${cleanData.importance}/5, Confidence: ${cleanData.notes_confidence}/5`)

      if (cleanData.ambiguous_name) ambiguous.push({ id: entity.id, original: entity.name, corrected: cleanData.corrected_name, note: cleanData.ambiguity_note })

      const sourceUrls = results.map(r => r.url.replace(/^https?:\/\//, '').split('/')[0])

      // Export validated data
      exportResults.push({ id: entity.id, original_name: entity.name, ...cleanData, notes_sources: sourceUrls.join('; ') })

      if (!dryRun) {
        try { await updateEntity(client, entity.id, cleanData, sourceUrls); enriched++ }
        catch (err) { console.log(`    ERROR: ${err.message}`); errors++ }
      } else { enriched++ }
    }
  } finally { client.release() }

  const exportPath = `docs/enrichment-sample-${Date.now()}.json`
  fs.writeFileSync(exportPath, JSON.stringify({
    meta: { timestamp: new Date().toISOString(), enriched, rejected, skipped, errors, cost: costs.summary() },
    ambiguous_entities: ambiguous,
    entities: exportResults
  }, null, 2))

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Enriched: ${enriched}, Rejected: ${rejected}, Skipped: ${skipped}, Errors: ${errors}`)
  console.log(`Ambiguous: ${ambiguous.length}`)
  console.log(costs.summary())
  console.log(`Exported: ${exportPath}`)
  if (dryRun) console.log('\nRun without --dry-run to apply.')

  await rds.end()
  await neon.end()
}

main().catch(console.error)
