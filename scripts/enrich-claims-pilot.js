/**
 * Claims enrichment pilot — full schema version
 *
 * Tests the source + claim DB schema on 10 diverse entities:
 * 4 people, 4 orgs, 2 resources. Writes to Neon claims-pilot branch.
 *
 * For each entity:
 *   1. Exa search for public statements on regulatory stance, AGI timeline, AI risk
 *   2. Claude extracts sourced claims with verbatim citations
 *   3. Specifically searches for AGI definitions used
 *   4. Registers sources (deduplicated by URL hash) and writes claims to Neon
 *
 * Usage:
 *   PILOT_DB="postgresql://..." node scripts/enrich-claims-pilot.js
 */
import 'dotenv/config'
import Exa from 'exa-js'
import Anthropic from '@anthropic-ai/sdk'
import pg from 'pg'
import crypto from 'crypto'

const exa = new Exa(process.env.EXA_API_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const prodDb = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const costs = {
  exa_searches: 0,
  exa_cost: 0,
  claude_calls: 0,
  claude_input_tokens: 0,
  claude_output_tokens: 0,
  claude_cost: 0,
  EXA_PER_SEARCH: 0.008,
  CLAUDE_INPUT_PER_M: 3,
  CLAUDE_OUTPUT_PER_M: 15,
  trackExa() {
    this.exa_searches++
    this.exa_cost = this.exa_searches * this.EXA_PER_SEARCH
  },
  trackClaude(usage) {
    this.claude_calls++
    this.claude_input_tokens += usage.input_tokens || 0
    this.claude_output_tokens += usage.output_tokens || 0
    this.claude_cost =
      (this.claude_input_tokens / 1_000_000) * this.CLAUDE_INPUT_PER_M +
      (this.claude_output_tokens / 1_000_000) * this.CLAUDE_OUTPUT_PER_M
  },
  summary() {
    return `Exa: ${this.exa_searches} searches ($${this.exa_cost.toFixed(3)}) | Claude: ${this.claude_calls} calls, ${this.claude_input_tokens} in / ${this.claude_output_tokens} out ($${this.claude_cost.toFixed(3)}) | Total: $${(this.exa_cost + this.claude_cost).toFixed(3)}`
  },
}

const pilotDb = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false },
})

const PILOT_ENTITIES = [
  { id: 8, type: 'person', name: 'Dario Amodei' },
  { id: 855, type: 'person', name: 'Eric Schmidt' },
  { id: 890, type: 'person', name: 'Zvi Mowshowitz' },
  { id: 929, type: 'person', name: 'Alan Davidson' },
  { id: 202, type: 'organization', name: 'Machine Learning for Alignment Bootcamp (MLAB)' },
  { id: 957, type: 'organization', name: 'Windfall Trust' },
  { id: 407, type: 'organization', name: 'The Compendium' },
  { id: 186, type: 'organization', name: 'Intelligence Rising' },
  { id: 606, type: 'resource', name: 'Doom Debates', url: 'https://www.youtube.com/@DoomDebates' },
  {
    id: 690,
    type: 'resource',
    name: 'MIT study finds AI can already replace 11.7% of U.S. workforce',
    url: 'https://www.cnbc.com/2025/11/26/mit-study-finds-ai-can-already-replace-11point7percent-of-us-workforce.html',
  },
]

const BELIEF_DIMENSIONS = [
  {
    id: 'regulatory_stance',
    label: 'Regulatory stance on AI',
    scale: 'Accelerate (1) → Light-touch (2) → Targeted (3) → Moderate (4) → Restrictive (5) → Precautionary (6)',
    person_query: (name) => `"${name}" AI regulation stance policy position statement interview`,
    org_query: (name) => `"${name}" AI regulation policy position advocacy`,
  },
  {
    id: 'agi_timeline',
    label: 'AGI timeline belief',
    scale: 'Already here → 2-3 years → 5-10 years → 10-25 years → 25+ years → Never/not meaningful',
    person_query: (name) => `"${name}" AGI timeline when artificial general intelligence prediction years`,
    org_query: (name) => `"${name}" AGI timeline artificial general intelligence prediction`,
  },
  {
    id: 'ai_risk_level',
    label: 'AI risk level assessment',
    scale: 'Overstated → Manageable → Serious → Catastrophic → Existential',
    person_query: (name) => `"${name}" AI risk existential catastrophic danger safety level assessment`,
    org_query: (name) => `"${name}" AI risk existential safety danger assessment`,
  },
  {
    id: 'agi_definition',
    label: 'How they define AGI',
    scale: 'N/A — this captures the definition used, not a stance score',
    person_query: (name) => `"${name}" definition of AGI "artificial general intelligence" meaning what is`,
    org_query: (name) => `"${name}" definition AGI artificial general intelligence meaning`,
  },
]

const EXTRACTION_PROMPT = `You are extracting sourced claims about an entity's beliefs on AI from web search results.

For each belief dimension below, determine if the search results contain DIRECT evidence of this entity's position.

BELIEF DIMENSIONS:
${BELIEF_DIMENSIONS.map((d) => `- ${d.id}: "${d.label}" (scale: ${d.scale})`).join('\n')}

RULES:
1. Every claim MUST have a source_url from the search results. Never fabricate URLs.
2. Every claim MUST have a citation — a VERBATIM quote (1-2 sentences) from the source.
3. Only create claims where you find direct evidence. Empty arrays are fine.
4. For agi_definition claims: the citation should be how they define AGI. Set stance_score to null. Use definition_used for their definition in normalized form.
5. For other dimensions: set stance_score using the scale provided.
6. date_stated should be YYYY-MM-DD (first of month if only month/year known).
7. claim_type: direct_statement (quote from the entity), authored_position (org published a position), inferred_from_action (co-sponsored a bill, joined coalition), or resource_content (extracted from the resource itself).
8. confidence: high = direct unambiguous statement. medium = clear position but not on exact mechanism. low = inferred.
9. For the source_type field use: hearing, bill, tweet, op_ed, interview, press_release, floor_speech, letter, report, paper, blog, podcast, video.

Return a JSON array of claim objects:
{
  "belief_dimension": "<dimension id>",
  "stance": "<text label from scale, or null for agi_definition>",
  "stance_score": <integer or null>,
  "stance_label": "<short label>",
  "definition_used": "<how they defined the key term, one sentence — especially important for AGI>",
  "citation": "<VERBATIM quote from source, 1-2 sentences>",
  "source_url": "<exact URL from search results>",
  "source_type": "<type>",
  "source_title": "<human-readable title>",
  "source_author": "<author if available, or null>",
  "source_published": "<YYYY-MM-DD>",
  "date_stated": "<YYYY-MM-DD when entity made this statement>",
  "claim_type": "<direct_statement|authored_position|inferred_from_action|resource_content>",
  "confidence": "<high|medium|low>",
  "notes": "<context or null>"
}

Return ONLY the JSON array.`

function sourceId(url) {
  return 'src-' + crypto.createHash('sha256').update(url).digest('hex').slice(0, 12)
}

function claimId(entityId, dimension, srcId) {
  return `${entityId}_${dimension}_${srcId}`
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function searchEntity(entity) {
  const results = []
  for (const dim of BELIEF_DIMENSIONS) {
    const queryFn = entity.type === 'organization' ? dim.org_query : dim.person_query
    try {
      const r = await exa.searchAndContents(queryFn(entity.name), {
        numResults: 4,
        highlights: { numSentences: 5, highlightsPerUrl: 3 },
        startPublishedDate: '2023-01-01',
      })
      costs.trackExa()
      for (const result of r.results || []) {
        results.push({
          url: result.url,
          title: result.title || '',
          published: result.publishedDate || '',
          highlights: (result.highlights || []).join(' … '),
          dimension: dim.id,
        })
      }
    } catch (err) {
      console.error(`    Exa error for ${entity.name} / ${dim.id}: ${err.message}`)
    }
    await delay(150)
  }
  return results
}

async function extractClaims(entity, searchResults) {
  if (searchResults.length === 0) return []

  const sourcesText = searchResults
    .map(
      (r, i) =>
        `[Source ${i + 1}] ${r.url}\n  Title: ${r.title}\n  Published: ${r.published}\n  Dimension: ${r.dimension}\n  Highlights: ${r.highlights}`,
    )
    .join('\n\n')

  const prompt = `Entity: ${entity.name}
Type: ${entity.type}

SEARCH RESULTS:
${sourcesText}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: EXTRACTION_PROMPT + '\n\n' + prompt }],
    })

    costs.trackClaude(response.usage || {})
    const text = response.content[0]?.text || '[]'
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    return JSON.parse(jsonMatch[0]).filter((c) => c.source_url && c.citation && c.belief_dimension)
  } catch (err) {
    console.error(`    Claude error: ${err.message}`)
    return []
  }
}

async function registerSource(client, claim) {
  const sid = sourceId(claim.source_url)
  await client.query(
    `INSERT INTO source (source_id, url, title, source_type, date_published, author, cached_excerpt)
     VALUES ($1, $2, $3, $4, $5::date, $6, $7)
     ON CONFLICT (source_id) DO NOTHING`,
    [
      sid,
      claim.source_url,
      claim.source_title || null,
      claim.source_type || null,
      claim.source_published || null,
      claim.source_author || null,
      claim.citation,
    ],
  )
  return sid
}

async function writeClaim(client, entity, claim, sid) {
  const cid = claimId(entity.id, claim.belief_dimension, sid)

  await client.query(
    `INSERT INTO claim (claim_id, entity_id, entity_name, entity_type, belief_dimension,
       stance, stance_score, stance_label, definition_used, citation,
       source_id, date_stated, claim_type, confidence, extracted_by, extraction_model, extraction_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::date, $13, $14, $15, $16, CURRENT_DATE)
     ON CONFLICT (claim_id) DO UPDATE SET
       citation = EXCLUDED.citation, source_id = EXCLUDED.source_id,
       stance = EXCLUDED.stance, stance_score = EXCLUDED.stance_score,
       confidence = EXCLUDED.confidence, extraction_date = CURRENT_DATE`,
    [
      cid,
      entity.id,
      entity.name,
      entity.type,
      claim.belief_dimension,
      claim.stance || null,
      claim.stance_score ?? null,
      claim.stance_label || null,
      claim.definition_used || null,
      claim.citation,
      sid,
      claim.date_stated || null,
      claim.claim_type || 'direct_statement',
      claim.confidence || 'medium',
      'exa+claude',
      'claude-sonnet-4-20250514',
    ],
  )
}

async function main() {
  console.log('CLAIMS ENRICHMENT PILOT — FULL SCHEMA')
  console.log('======================================')
  console.log(`Entities: ${PILOT_ENTITIES.length}`)
  console.log(`Dimensions: ${BELIEF_DIMENSIONS.length}`)
  console.log(`Writing to Neon claims-pilot branch\n`)

  const client = await pilotDb.connect()
  let totalSources = 0
  let totalClaims = 0

  try {
    for (const entity of PILOT_ENTITIES) {
      console.log(`\n▸ ${entity.name} (${entity.type}, id=${entity.id})`)

      if (entity.type === 'resource' && entity.url) {
        const sid = sourceId(entity.url)
        await client.query(
          `INSERT INTO source (source_id, url, title, source_type, resource_entity_id)
           VALUES ($1, $2, $3, 'report', $4)
           ON CONFLICT (source_id) DO UPDATE SET resource_entity_id = $4`,
          [sid, entity.url, entity.name, entity.id],
        )
        console.log(`  Registered resource URL as source [${sid}]`)
        totalSources++
        continue
      }

      const results = await searchEntity(entity)
      console.log(`  Exa: ${results.length} results across ${BELIEF_DIMENSIONS.length} dimensions`)

      let claims = []
      if (results.length > 0) {
        claims = await extractClaims(entity, results)
        console.log(`  Claude: ${claims.length} claims extracted`)

        for (const c of claims) {
          const sid = await registerSource(client, c)
          await writeClaim(client, entity, c, sid)
          totalSources++
          totalClaims++
          const dimLabel = c.belief_dimension === 'agi_definition' ? 'AGI def' : c.belief_dimension
          console.log(
            `    ${dimLabel}: ${c.stance_label || c.definition_used?.slice(0, 40) || '?'} [${c.confidence}] ${sid}`,
          )
        }
        await delay(100)
      } else {
        console.log('  Exa: 0 results')
      }

      // Fallback: preserve existing DB beliefs as unsourced claims for dimensions with no Exa-backed claims
      const coveredDims = new Set(claims.map((c) => c.belief_dimension))
      const dbBeliefs = await prodDb.query(
        `SELECT belief_regulatory_stance, belief_agi_timeline, belief_ai_risk,
                belief_evidence_source, belief_regulatory_stance_detail, website
         FROM entity WHERE id = $1`,
        [entity.id],
      )
      const row = dbBeliefs.rows[0]
      if (row) {
        const UNSOURCED_SRC_ID = 'src-crowdsourced-db'
        await client.query(
          `INSERT INTO source (source_id, url, title, source_type)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (source_id) DO NOTHING`,
          [UNSOURCED_SRC_ID, 'https://mapping-ai.org/contribute', 'Mapping AI crowdsourced submission', 'crowdsourced'],
        )

        const fallbacks = [
          {
            dim: 'regulatory_stance',
            value: row.belief_regulatory_stance,
            detail: row.belief_regulatory_stance_detail,
          },
          { dim: 'agi_timeline', value: row.belief_agi_timeline, detail: null },
          { dim: 'ai_risk_level', value: row.belief_ai_risk, detail: null },
        ]
        for (const fb of fallbacks) {
          if (fb.value && !coveredDims.has(fb.dim)) {
            const cid = claimId(entity.id, fb.dim, UNSOURCED_SRC_ID)
            await client.query(
              `INSERT INTO claim (claim_id, entity_id, entity_name, entity_type, belief_dimension,
                 stance, stance_label, citation, source_id, claim_type, confidence,
                 extracted_by, extraction_date)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_DATE)
               ON CONFLICT (claim_id) DO NOTHING`,
              [
                cid,
                entity.id,
                entity.name,
                entity.type,
                fb.dim,
                fb.value,
                fb.value,
                fb.detail ||
                  `Submitted as "${fb.value}" via crowdsourced form (evidence: ${row.belief_evidence_source || 'unknown'})`,
                UNSOURCED_SRC_ID,
                'crowdsourced_submission',
                row.belief_evidence_source === 'Explicitly stated' ? 'unverified' : 'low',
                'db_fallback',
              ],
            )
            totalClaims++
            console.log(
              `    ${fb.dim}: ${fb.value} [${row.belief_evidence_source === 'Explicitly stated' ? 'unverified' : 'low'}, unsourced fallback]`,
            )
          }
        }
      }
    }
  } finally {
    client.release()
  }

  console.log('\n======================================')
  console.log(`Sources registered: ${totalSources}`)
  console.log(`Claims written: ${totalClaims}`)

  const r1 = await pilotDb.query('SELECT count(*) FROM source')
  const r2 = await pilotDb.query('SELECT count(*) FROM claim')
  console.log(`DB totals: ${r1.rows[0].count} sources, ${r2.rows[0].count} claims`)
  console.log(`\nCOST: ${costs.summary()}`)

  await pilotDb.end()
  await prodDb.end()
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
