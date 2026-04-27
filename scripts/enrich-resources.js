/**
 * Resource enrichment script
 *
 * For each resource entity with a resource_url, fetches content via Exa,
 * then uses Claude to extract structured metadata:
 *   - key_argument (if empty)
 *   - topic_tags, format_tags
 *   - advocated_stance, advocated_timeline, advocated_risk
 *   - claims with source citations (written to claim + source tables)
 *
 * Reads from DATABASE_URL (prod/main), writes entity updates to PILOT_DB
 * and claims/sources to PILOT_DB.
 *
 * Usage:
 *   PILOT_DB="postgresql://..." node scripts/enrich-resources.js --limit=5
 *   PILOT_DB="postgresql://..." node scripts/enrich-resources.js --limit=20 --resume
 *   PILOT_DB="postgresql://..." node scripts/enrich-resources.js --all
 *   PILOT_DB="postgresql://..." node scripts/enrich-resources.js --id=553
 *   PILOT_DB="postgresql://..." node scripts/enrich-resources.js --dry-run --limit=3
 *
 * Flags:
 *   --limit=N    Process N resources then stop
 *   --all        Process all eligible resources
 *   --id=N       Single resource by ID
 *   --resume     Skip resources already processed (tracked in progress file)
 *   --dry-run    Fetch + extract but don't write to DB
 *   --no-claims  Only update entity metadata, skip claim extraction
 */
import 'dotenv/config'
import Exa from 'exa-js'
import Anthropic from '@anthropic-ai/sdk'
import pg from 'pg'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const exa = new Exa(process.env.EXA_API_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
// PILOT_DB has the latest schema (topic_tags, format_tags, advocated_* columns).
// Use it for both reads and writes.
const pilotDb = new pg.Pool({ connectionString: process.env.PILOT_DB, ssl: { rejectUnauthorized: false } })

const args = process.argv.slice(2)
const limitArg = args.find((a) => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null
const allMode = args.includes('--all')
const resumeMode = args.includes('--resume')
const dryRun = args.includes('--dry-run')
const noClaims = args.includes('--no-claims')
const singleId = args.find((a) => a.startsWith('--id='))?.split('=')[1]

if (!limit && !allMode && !singleId) {
  console.log(
    'Usage: PILOT_DB="..." node scripts/enrich-resources.js [--limit=N | --all | --id=N] [--resume] [--dry-run] [--no-claims]',
  )
  process.exit(0)
}

const PROGRESS_PATH = path.join(__dirname, '../data/resource-enrichment-progress.json')

// Valid topic and format tags (used for validation)
const VALID_TOPIC_TAGS = [
  'AI Safety',
  'AI Governance',
  'AI Ethics',
  'AI Capabilities',
  'AI Risk',
  'Alignment',
  'Interpretability',
  'Regulation',
  'Legislation',
  'Export Controls',
  'Compute Governance',
  'Open Source AI',
  'National Security',
  'Labor & Economy',
  'Existential Risk',
  'Biosecurity',
  'Cybersecurity',
  'Geopolitics',
  'China',
  'EU Policy',
  'US Policy',
  'Responsible Scaling',
  'Evaluation & Testing',
  'Frontier Models',
  'Foundation Models',
  'RLHF',
  'Constitutional AI',
  'Agent Safety',
  'Deepfakes',
  'Misinformation',
  'Bias & Fairness',
  'Privacy',
  'Copyright & IP',
  'Liability',
  'Transparency',
  'Forecasting',
  'Philosophy of Mind',
  'Consciousness',
  'AGI',
  'Superintelligence',
]

const VALID_FORMAT_TAGS = [
  'Newsletter',
  'Blog',
  'Podcast',
  'YouTube Channel',
  'Video Series',
  'Research Paper',
  'Policy Brief',
  'White Paper',
  'Legislative Text',
  'Testimony',
  'Report',
  'Book',
  'Essay',
  'Op-Ed',
  'Interview',
  'Database',
  'Tool',
  'Directory',
  'Community',
  'Course',
  'Educational',
  'News Coverage',
  'Explainer',
  'Scenario',
  'Open Letter',
  'Framework',
]

const costs = {
  exa_fetches: 0,
  exa_searches: 0,
  exa_cost: 0,
  claude_calls: 0,
  claude_input_tokens: 0,
  claude_output_tokens: 0,
  claude_cost: 0,
  trackExa(type) {
    if (type === 'search') {
      this.exa_searches++
    } else {
      this.exa_fetches++
    }
    this.exa_cost = (this.exa_searches + this.exa_fetches) * 0.008
  },
  trackClaude(usage) {
    this.claude_calls++
    this.claude_input_tokens += usage.input_tokens || 0
    this.claude_output_tokens += usage.output_tokens || 0
    this.claude_cost = (this.claude_input_tokens / 1_000_000) * 3 + (this.claude_output_tokens / 1_000_000) * 15
  },
  summary() {
    const total = this.exa_cost + this.claude_cost
    const perEntity = total / Math.max(this.claude_calls, 1)
    return (
      `Exa: ${this.exa_fetches} fetches + ${this.exa_searches} searches ($${this.exa_cost.toFixed(3)}) | ` +
      `Claude: ${this.claude_calls} calls, ${this.claude_input_tokens} in / ${this.claude_output_tokens} out ($${this.claude_cost.toFixed(3)}) | ` +
      `Total: $${total.toFixed(3)} ($${perEntity.toFixed(3)}/resource)`
    )
  },
}

const EXTRACTION_PROMPT = `You are analyzing the content of a resource (article, report, paper, newsletter, podcast, etc.) related to AI policy, safety, or governance. Extract structured metadata and any belief claims advocated by this resource.

VALID TOPIC TAGS (pick all that apply, 1-5 tags):
${VALID_TOPIC_TAGS.join(', ')}

VALID FORMAT TAGS (pick 1-3):
${VALID_FORMAT_TAGS.join(', ')}

BELIEF SCALES:
- Regulatory stance: Accelerate (1) | Light-touch (2) | Targeted (3) | Moderate (4) | Restrictive (5) | Precautionary (6)
- AGI timeline: Already here | 2-3 years | 5-10 years | 10-25 years | 25+ years | Never/not meaningful
- AI risk level: Overstated | Manageable | Serious | Catastrophic | Existential

RULES:
1. key_argument: 1-2 sentence summary of the resource's central thesis or purpose. Use present tense.
2. topic_tags: Choose from the VALID TOPIC TAGS list only. Pick the most relevant 1-5.
3. format_tags: Choose from the VALID FORMAT TAGS list only. Pick 1-3.
4. advocated_stance/timeline/risk: Only set if the resource explicitly advocates for a position. Many resources are informational or aggregative and won't advocate a specific stance. Set to null in those cases.
5. For claims: every claim MUST have a source_url (use the resource's own URL) and a verbatim citation from the content.
6. claim_type should be "resource_content" for all claims extracted from the resource itself.
7. Only extract claims where the resource makes a clear, attributable assertion about AI regulation, timeline, or risk. Do not fabricate claims from generic descriptions.

Return this JSON:
{
  "key_argument": "<1-2 sentence summary of central thesis/purpose, or null if unclear>",
  "topic_tags": ["<tag1>", "<tag2>"],
  "format_tags": ["<tag1>"],
  "advocated_stance": "<label from scale, or null>",
  "advocated_stance_score": <integer 1-6 or null>,
  "advocated_timeline": "<label from scale, or null>",
  "advocated_risk": "<label from scale, or null>",
  "claims": [
    {
      "belief_dimension": "<regulatory_stance|agi_timeline|ai_risk_level>",
      "stance": "<text label from scale>",
      "stance_score": <integer or null>,
      "stance_label": "<short label>",
      "citation": "<VERBATIM quote from the resource, 1-2 sentences>",
      "source_type": "<report|paper|blog|essay|interview|op_ed|podcast|video|press_release|letter>",
      "date_stated": "<YYYY-MM-DD or null>",
      "confidence": "<high|medium|low>"
    }
  ]
}

Return ONLY the JSON object.`

function srcId(url) {
  return 'src-' + crypto.createHash('sha256').update(url).digest('hex').slice(0, 12)
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
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

async function getTargetResources(resumeSet) {
  let query = `
    SELECT id, name, resource_url, resource_type, resource_category,
           resource_key_argument, resource_author, resource_year,
           notes, topic_tags, format_tags,
           advocated_stance, advocated_timeline, advocated_risk
    FROM entity
    WHERE entity_type = 'resource' AND status = 'approved'
      AND resource_url IS NOT NULL AND resource_url != ''
  `
  const params = []

  if (singleId) {
    query = `
      SELECT id, name, resource_url, resource_type, resource_category,
             resource_key_argument, resource_author, resource_year,
             notes, topic_tags, format_tags,
             advocated_stance, advocated_timeline, advocated_risk
      FROM entity WHERE id = $1
    `
    params.push(parseInt(singleId))
  }

  query += ' ORDER BY id'
  const r = await pilotDb.query(query, params)

  let resources = r.rows.map((row) => ({
    id: row.id,
    name: row.name,
    url: row.resource_url,
    type: row.resource_type,
    category: row.resource_category,
    key_argument: row.resource_key_argument,
    author: row.resource_author,
    year: row.resource_year,
    notes: row.notes,
    topic_tags: row.topic_tags,
    format_tags: row.format_tags,
    advocated_stance: row.advocated_stance,
    advocated_timeline: row.advocated_timeline,
    advocated_risk: row.advocated_risk,
  }))

  if (resumeMode) {
    resources = resources.filter((r) => !resumeSet.has(r.id))
  }

  if (limit) {
    resources = resources.slice(0, limit)
  }

  return resources
}

async function fetchResourceContent(resource) {
  // Try Exa getContents first for the resource URL
  let content = null

  try {
    const r = await exa.getContents([resource.url], {
      text: { maxCharacters: 8000 },
      highlights: { numSentences: 10, highlightsPerUrl: 5 },
    })
    costs.trackExa('fetch')

    if (r.results && r.results.length > 0) {
      const result = r.results[0]
      const text = result.text || ''
      const highlights = (result.highlights || []).join('\n\n')
      content = { text, highlights, title: result.title || resource.name }
    }
  } catch (err) {
    console.log(`    Exa getContents failed: ${err.message}`)
  }

  // Fallback: search for the resource by name if getContents didn't work
  if (!content || (!content.text && !content.highlights)) {
    try {
      const searchQuery = `"${resource.name}" ${resource.author || ''} ${resource.category || ''}`
      const r = await exa.searchAndContents(searchQuery, {
        numResults: 3,
        highlights: { numSentences: 8, highlightsPerUrl: 4 },
        startPublishedDate: '2020-01-01',
      })
      costs.trackExa('search')

      if (r.results && r.results.length > 0) {
        const allHighlights = r.results.flatMap((res) => res.highlights || [])
        content = {
          text: '',
          highlights: allHighlights.join('\n\n'),
          title: r.results[0].title || resource.name,
          fallback: true,
        }
      }
    } catch (err) {
      console.log(`    Exa search fallback failed: ${err.message}`)
    }
  }

  return content
}

async function extractMetadata(resource, content) {
  const contentText = content.text ? `FULL TEXT (truncated):\n${content.text.substring(0, 6000)}` : ''
  const highlightsText = content.highlights ? `KEY EXCERPTS:\n${content.highlights.substring(0, 3000)}` : ''

  if (!contentText && !highlightsText) return null

  const existingNotes = resource.notes ? `Existing notes: ${resource.notes}` : ''

  const prompt = `Resource: ${resource.name}
URL: ${resource.url}
Type: ${resource.type || 'unknown'}
Category: ${resource.category || 'unknown'}
Author: ${resource.author || 'unknown'}
Year: ${resource.year || 'unknown'}
${existingNotes}

${contentText}

${highlightsText}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: EXTRACTION_PROMPT + '\n\n' + prompt }],
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

async function writeEntityUpdates(client, resource, metadata) {
  const updates = []
  const values = []
  let paramIdx = 1

  // key_argument: only update if currently empty
  if (metadata.key_argument && (!resource.key_argument || resource.key_argument.trim() === '')) {
    updates.push(`resource_key_argument = $${paramIdx++}`)
    values.push(metadata.key_argument.substring(0, 500))
  }

  // topic_tags: validate and set
  if (metadata.topic_tags && Array.isArray(metadata.topic_tags) && metadata.topic_tags.length > 0) {
    const validTags = metadata.topic_tags.filter((t) => VALID_TOPIC_TAGS.includes(t))
    if (validTags.length > 0) {
      updates.push(`topic_tags = $${paramIdx++}`)
      values.push(validTags)
    }
  }

  // format_tags: validate and set
  if (metadata.format_tags && Array.isArray(metadata.format_tags) && metadata.format_tags.length > 0) {
    const validTags = metadata.format_tags.filter((t) => VALID_FORMAT_TAGS.includes(t))
    if (validTags.length > 0) {
      updates.push(`format_tags = $${paramIdx++}`)
      values.push(validTags)
    }
  }

  // advocated beliefs: only set if metadata provides them and entity doesn't have them
  if (metadata.advocated_stance && !resource.advocated_stance) {
    updates.push(`advocated_stance = $${paramIdx++}`)
    values.push(metadata.advocated_stance)
  }
  if (metadata.advocated_timeline && !resource.advocated_timeline) {
    updates.push(`advocated_timeline = $${paramIdx++}`)
    values.push(metadata.advocated_timeline)
  }
  if (metadata.advocated_risk && !resource.advocated_risk) {
    updates.push(`advocated_risk = $${paramIdx++}`)
    values.push(metadata.advocated_risk)
  }

  if (updates.length === 0) return 0

  updates.push('updated_at = NOW()')
  values.push(resource.id)

  await client.query(`UPDATE entity SET ${updates.join(', ')} WHERE id = $${paramIdx}`, values)

  return updates.length - 1 // exclude updated_at from count
}

async function writeClaims(client, resource, metadata) {
  if (!metadata.claims || !Array.isArray(metadata.claims) || metadata.claims.length === 0) {
    return 0
  }

  // Register the resource URL as a source
  const sid = srcId(resource.url)
  await client.query(
    `INSERT INTO source (source_id, url, title, source_type, date_published, author, resource_entity_id)
     VALUES ($1, $2, $3, $4, $5::date, $6, $7)
     ON CONFLICT (source_id) DO UPDATE SET resource_entity_id = $7`,
    [
      sid,
      resource.url,
      resource.name,
      mapSourceType(resource.type),
      resource.year ? `${resource.year}-01-01` : null,
      resource.author || null,
      resource.id,
    ],
  )

  let count = 0
  for (const claim of metadata.claims) {
    if (!claim.citation || !claim.belief_dimension) continue
    if (!['regulatory_stance', 'agi_timeline', 'ai_risk_level'].includes(claim.belief_dimension)) continue

    const cid = `${resource.id}_${claim.belief_dimension}_${sid}`
    try {
      await client.query(
        `INSERT INTO claim (claim_id, entity_id, entity_name, entity_type, belief_dimension,
           stance, stance_score, stance_label, citation,
           source_id, date_stated, claim_type, confidence, extracted_by, extraction_model, extraction_date)
         VALUES ($1, $2, $3, 'resource', $4, $5, $6, $7, $8, $9, $10::date, $11, $12, $13, $14, CURRENT_DATE)
         ON CONFLICT (claim_id) DO UPDATE SET
           citation = EXCLUDED.citation, stance = EXCLUDED.stance, stance_score = EXCLUDED.stance_score,
           confidence = EXCLUDED.confidence, extraction_date = CURRENT_DATE`,
        [
          cid,
          resource.id,
          resource.name,
          claim.belief_dimension,
          claim.stance || null,
          claim.stance_score ?? null,
          claim.stance_label || null,
          claim.citation,
          sid,
          claim.date_stated || null,
          claim.claim_type || 'resource_content',
          claim.confidence || 'medium',
          'exa+claude',
          'claude-sonnet-4-6',
        ],
      )
      count++
    } catch (err) {
      console.error(`    Claim write error: ${err.message}`)
    }
  }
  return count
}

function mapSourceType(resourceType) {
  const mapping = {
    'Academic Paper': 'paper',
    Report: 'report',
    Book: 'book',
    Essay: 'essay',
    'News Article': 'article',
    'Substack/Newsletter': 'blog',
    Podcast: 'podcast',
    Video: 'video',
    Website: 'website',
  }
  return mapping[resourceType] || 'report'
}

async function main() {
  console.log('RESOURCE ENRICHMENT')
  console.log('===================')

  const progress = loadProgress()
  const resumeSet = new Set(progress.completed)
  const resources = await getTargetResources(resumeSet)

  console.log(`Targets: ${resources.length} resources`)
  if (resumeMode) console.log(`Resuming: ${resumeSet.size} already completed`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}${noClaims ? ' (no claims)' : ''}`)
  console.log()

  const client = dryRun ? null : await pilotDb.connect()
  let totalUpdated = 0
  let totalClaims = 0
  let totalSkipped = 0
  let processed = 0

  try {
    for (const resource of resources) {
      processed++
      console.log(`\n[${processed}/${resources.length}] ${resource.name} (id=${resource.id}, type=${resource.type})`)
      console.log(`  URL: ${resource.url}`)

      // Fetch content
      const content = await fetchResourceContent(resource)
      if (!content) {
        console.log('  No content retrieved; skipping')
        totalSkipped++
        progress.completed.push(resource.id)
        saveProgress(progress)
        continue
      }

      const contentLen = (content.text || '').length + (content.highlights || '').length
      console.log(`  Content: ${contentLen} chars${content.fallback ? ' (search fallback)' : ''}`)

      // Extract metadata
      const metadata = await extractMetadata(resource, content)
      if (!metadata) {
        console.log('  Extraction failed; skipping')
        totalSkipped++
        progress.completed.push(resource.id)
        saveProgress(progress)
        continue
      }

      // Log extracted data
      if (metadata.key_argument) {
        console.log(`  key_argument: ${metadata.key_argument.substring(0, 80)}...`)
      }
      if (metadata.topic_tags) {
        console.log(`  topic_tags: ${metadata.topic_tags.join(', ')}`)
      }
      if (metadata.format_tags) {
        console.log(`  format_tags: ${metadata.format_tags.join(', ')}`)
      }
      if (metadata.advocated_stance) {
        console.log(`  advocated_stance: ${metadata.advocated_stance}`)
      }
      if (metadata.advocated_timeline) {
        console.log(`  advocated_timeline: ${metadata.advocated_timeline}`)
      }
      if (metadata.advocated_risk) {
        console.log(`  advocated_risk: ${metadata.advocated_risk}`)
      }

      // Write updates
      if (client) {
        const fieldCount = await writeEntityUpdates(client, resource, metadata)
        if (fieldCount > 0) {
          console.log(`  Updated ${fieldCount} fields`)
          totalUpdated++
        }

        if (!noClaims && metadata.claims && metadata.claims.length > 0) {
          const claimCount = await writeClaims(client, resource, metadata)
          console.log(`  Wrote ${claimCount} claims`)
          totalClaims += claimCount
        }
      }

      progress.completed.push(resource.id)
      saveProgress(progress)
      await delay(200)

      if (processed % 10 === 0) {
        console.log(`\n  --- Progress: ${processed}/${resources.length} | ${costs.summary()} ---`)
      }
    }
  } finally {
    if (client) client.release()
  }

  console.log('\n===================')
  console.log(`Processed: ${processed} resources`)
  console.log(`Updated: ${totalUpdated}`)
  console.log(`Claims written: ${totalClaims}`)
  console.log(`Skipped: ${totalSkipped}`)

  if (!dryRun) {
    const r1 = await pilotDb.query(
      `SELECT count(*) FROM entity WHERE entity_type='resource' AND topic_tags IS NOT NULL AND topic_tags != '{}'`,
    )
    const r2 = await pilotDb.query(
      `SELECT count(*) FROM entity WHERE entity_type='resource' AND advocated_stance IS NOT NULL`,
    )
    const r3 = await pilotDb.query(`SELECT count(*) FROM claim WHERE entity_type='resource'`)
    console.log(
      `DB totals: ${r1.rows[0].count} resources with topic_tags, ${r2.rows[0].count} with advocated_stance, ${r3.rows[0].count} resource claims`,
    )
  }
  console.log(`\nCOST: ${costs.summary()}`)

  await pilotDb.end()
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
