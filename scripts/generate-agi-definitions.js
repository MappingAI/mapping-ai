/**
 * Generate agi-definitions.json from Neon claims-pilot DB.
 *
 * Pipeline:
 *   1. Query all agi_definition claims + entity metadata from Neon
 *   2. Deduplicate: highest-confidence claim per entity (tie-break: latest date)
 *   3. Embed definitions with Voyage AI voyage-3
 *   4. Project embeddings to 2D with UMAP
 *   5. Classify each definition into one of 8 fixed clusters via Claude Haiku
 *   6. Write agi-definitions.json
 *
 * Usage:
 *   PILOT_DB="postgresql://..." node scripts/generate-agi-definitions.js
 *
 * Requires: PILOT_DB (or DATABASE_URL), VOYAGE_API_KEY, ANTHROPIC_API_KEY in .env
 */
import 'dotenv/config'
import pg from 'pg'
import fs from 'fs'
import { UMAP } from 'umap-js'

const PILOT_DB = process.env.PILOT_DB || process.env.DATABASE_URL
if (!PILOT_DB) {
  console.error('Set PILOT_DB or DATABASE_URL')
  process.exit(1)
}
const VOYAGE_KEY = process.env.VOYAGE_API_KEY
if (!VOYAGE_KEY) {
  console.error('Set VOYAGE_API_KEY')
  process.exit(1)
}
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
if (!ANTHROPIC_KEY) {
  console.error('Set ANTHROPIC_API_KEY')
  process.exit(1)
}

const CLUSTERS = [
  {
    id: 'human-level-cognitive-parity',
    label: 'Human-Level Cognitive Parity',
    description: 'AGI defined as AI matching human-level performance across a broad range of cognitive tasks.',
  },
  {
    id: 'economic-automation',
    label: 'Economic Work Automation',
    description: 'AGI defined as AI that can perform most economically valuable work that humans do.',
  },
  {
    id: 'autonomous-research-capability',
    label: 'Autonomous Research',
    description: 'AGI defined by ability to conduct independent scientific research and make discoveries.',
  },
  {
    id: 'superintelligent-systems',
    label: 'Superintelligent Systems',
    description: 'AGI defined as AI surpassing human intelligence, often linked to recursive self-improvement.',
  },
  {
    id: 'general-purpose-agents',
    label: 'General-Purpose Agents',
    description:
      'AGI defined as flexible, adaptable AI systems that can handle diverse tasks in open-ended environments.',
  },
  {
    id: 'transformative-societal-impact',
    label: 'Transformative Impact',
    description: 'AGI defined by its potential to fundamentally reshape society, economy, or power structures.',
  },
  {
    id: 'conceptual-critique',
    label: 'Conceptual Critique',
    description: 'Definitions that question, reframe, or reject the standard AGI framing.',
  },
  {
    id: 'augmentative-tools',
    label: 'Augmentative Tools',
    description: 'AGI defined as AI that enhances human capabilities rather than replacing them.',
  },
]

const STANCE_SCORES = {
  Accelerate: 1,
  'Light-touch': 2,
  'Light-touch regulation': 2,
  Targeted: 3,
  'Targeted regulation': 3,
  Moderate: 4,
  'Moderate regulation': 4,
  Restrictive: 5,
  'Restrictive regulation': 5,
  Precautionary: 6,
  Nationalize: 7,
}
const TIMELINE_SCORES = {
  'Already here': 1,
  '2-3 years': 2,
  'Within 2-3 years': 2,
  '5-10 years': 3,
  '10-25 years': 4,
  '25+ years or never': 5,
}
const RISK_SCORES = {
  Overstated: 1,
  Manageable: 2,
  Serious: 3,
  Catastrophic: 4,
  'Potentially catastrophic': 4,
  Existential: 5,
}

const CONF_ORDER = { high: 3, medium: 2, low: 1, unverified: 0 }

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function voyageEmbed(texts, model = 'voyage-3') {
  // Free tier: 3 RPM, 10K TPM. Use small batches with delays.
  const BATCH = 64
  const allEmbeddings = []
  let totalTokens = 0

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH)

    let attempts = 0
    let json
    while (true) {
      const res = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VOYAGE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: batch, model }),
      })
      if (res.ok) {
        json = await res.json()
        break
      }
      if (res.status === 429 && attempts < 5) {
        attempts++
        const wait = 25000 * attempts
        console.log(`  rate limited, waiting ${wait / 1000}s (attempt ${attempts})...`)
        await sleep(wait)
        continue
      }
      const body = await res.text()
      throw new Error(`Voyage API ${res.status}: ${body}`)
    }

    totalTokens += json.usage?.total_tokens || 0
    for (const d of json.data) {
      allEmbeddings.push(d.embedding)
    }
    console.log(`  embedded ${Math.min(i + BATCH, texts.length)}/${texts.length} (${totalTokens} tokens)`)

    // Respect rate limits: wait between batches
    if (i + BATCH < texts.length) {
      await sleep(22000)
    }
  }
  console.log(`  total tokens: ${totalTokens}`)
  return allEmbeddings
}

const CLUSTER_IDS = CLUSTERS.map((c) => c.id)
const CLUSTER_ID_SET = new Set(CLUSTER_IDS)

const CLASSIFY_SYSTEM = `You classify AGI definitions into exactly one of these categories. Respond with ONLY the category ID, nothing else.

Categories:
${CLUSTERS.map((c) => `- ${c.id}: ${c.label}. ${c.description}`).join('\n')}

Guidelines:
- "human-level-cognitive-parity": definitions about matching human performance across cognitive tasks
- "economic-automation": definitions focused on automating economically valuable work
- "autonomous-research-capability": definitions about conducting independent scientific research
- "superintelligent-systems": definitions about surpassing human intelligence or recursive self-improvement
- "general-purpose-agents": definitions about flexible, adaptable AI handling diverse tasks
- "transformative-societal-impact": definitions about reshaping society, economy, or power structures
- "conceptual-critique": definitions that QUESTION, REJECT, or REFRAME the AGI concept (e.g. "AGI is a meaningless term", "the concept is flawed", "AGI is marketing")
- "augmentative-tools": definitions about enhancing/augmenting human capabilities rather than replacing them`

async function classifyBatch(definitions) {
  const numbered = definitions.map((d, i) => `${i + 1}. "${d}"`).join('\n')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: CLASSIFY_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Classify each definition. Respond with one category ID per line, numbered to match:\n\n${numbered}`,
        },
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic API ${res.status}: ${body}`)
  }
  const json = await res.json()
  const text = json.content[0].text.trim()
  const lines = text.split('\n').map((l) => l.replace(/^\d+[.):\s]+/, '').trim())

  return lines.map((line) => {
    if (CLUSTER_ID_SET.has(line)) return line
    const match = CLUSTER_IDS.find((id) => line.includes(id))
    return match || 'human-level-cognitive-parity'
  })
}

async function main() {
  const db = new pg.Pool({ connectionString: PILOT_DB, ssl: { rejectUnauthorized: false } })

  // 1. Query all AGI definition claims joined with entity metadata
  console.log('Querying AGI definitions from Neon...')
  const { rows } = await db.query(`
    SELECT
      c.entity_id, c.entity_name, c.definition_used, c.citation,
      c.source_id, c.confidence, c.date_stated,
      e.entity_type, e.category,
      e.belief_regulatory_stance, e.belief_agi_timeline, e.belief_ai_risk,
      e.belief_regulatory_stance_wavg, e.belief_agi_timeline_wavg, e.belief_ai_risk_wavg
    FROM claim c
    JOIN entity e ON e.id = c.entity_id
    WHERE c.belief_dimension = 'agi_definition'
      AND c.definition_used IS NOT NULL
      AND c.definition_used != ''
      AND e.status = 'approved'
    ORDER BY c.entity_id, c.confidence DESC, c.date_stated DESC NULLS LAST
  `)
  console.log(`  ${rows.length} total AGI definition claims`)

  // 2. Deduplicate: keep highest-confidence (then latest) claim per entity
  const byEntity = new Map()
  for (const r of rows) {
    const existing = byEntity.get(r.entity_id)
    if (!existing) {
      byEntity.set(r.entity_id, r)
      continue
    }
    const newConf = CONF_ORDER[r.confidence] ?? 0
    const oldConf = CONF_ORDER[existing.confidence] ?? 0
    if (newConf > oldConf) {
      byEntity.set(r.entity_id, r)
    } else if (newConf === oldConf && r.date_stated > existing.date_stated) {
      byEntity.set(r.entity_id, r)
    }
  }
  const defs = [...byEntity.values()]
  console.log(`  ${defs.length} unique entities after deduplication`)

  // Collect sources
  const sourceIds = [...new Set(defs.map((d) => d.source_id).filter(Boolean))]
  const srcResult = await db.query(
    `SELECT source_id, url, title, source_type, date_published FROM source WHERE source_id = ANY($1)`,
    [sourceIds],
  )
  const sourceMap = {}
  for (const s of srcResult.rows) {
    sourceMap[s.source_id] = {
      url: s.url,
      title: s.title,
      type: s.source_type,
      date: s.date_published ? new Date(s.date_published).toISOString().split('T')[0] : null,
    }
  }

  await db.end()

  // 3. Embed definitions with Voyage AI
  console.log(`Embedding ${defs.length} definitions with Voyage AI voyage-3...`)
  const texts = defs.map((d) => d.definition_used)
  const embeddings = await voyageEmbed(texts)

  // 4. Classify each definition into a cluster using Claude Haiku
  console.log('Classifying definitions with Claude Haiku...')
  const CLASSIFY_BATCH = 20
  const clusterIdToIdx = Object.fromEntries(CLUSTERS.map((c, i) => [c.id, i]))
  const clusterCounts = new Array(CLUSTERS.length).fill(0)
  const assignments = []

  for (let i = 0; i < texts.length; i += CLASSIFY_BATCH) {
    const batch = texts.slice(i, i + CLASSIFY_BATCH)
    let ids
    let attempts = 0
    while (true) {
      try {
        ids = await classifyBatch(batch)
        break
      } catch (err) {
        if (err.message.includes('529') && attempts < 3) {
          attempts++
          console.log(`  API overloaded, waiting 10s (attempt ${attempts})...`)
          await sleep(10000)
          continue
        }
        throw err
      }
    }
    for (const id of ids) {
      const idx = clusterIdToIdx[id] ?? 0
      clusterCounts[idx]++
      assignments.push(idx)
    }
    console.log(`  classified ${Math.min(i + CLASSIFY_BATCH, texts.length)}/${texts.length}`)
    if (i + CLASSIFY_BATCH < texts.length) await sleep(500)
  }

  console.log('Cluster distribution:')
  CLUSTERS.forEach((c, i) => console.log(`  ${c.label}: ${clusterCounts[i]}`))

  // 6. Project to 2D with UMAP
  console.log('Running UMAP projection...')
  const umap = new UMAP({
    nComponents: 2,
    nNeighbors: 15,
    minDist: 0.1,
    spread: 1.0,
    random: () => {
      // Seeded PRNG for reproducibility (simple LCG)
      seed = (seed * 1664525 + 1013904223) & 0xffffffff
      return (seed >>> 0) / 0xffffffff
    },
  })
  let seed = 42
  const projected = umap.fit(embeddings)

  // 7. Build output
  const clusterCentroids = CLUSTERS.map(() => ({ sx: 0, sy: 0, n: 0 }))

  const points = defs.map((d, i) => {
    const cIdx = assignments[i]
    const cluster = CLUSTERS[cIdx]
    const [x, y] = projected[i]
    clusterCentroids[cIdx].sx += x
    clusterCentroids[cIdx].sy += y
    clusterCentroids[cIdx].n++

    const stance = d.belief_regulatory_stance || null
    const timeline = d.belief_agi_timeline || null
    const risk = d.belief_ai_risk || null

    return {
      entity_id: d.entity_id,
      name: d.entity_name,
      entity_type: d.entity_type,
      category: d.category,
      definition: d.definition_used,
      citation: d.citation,
      source_id: d.source_id,
      date: d.date_stated ? new Date(d.date_stated).toISOString().split('T')[0] : null,
      confidence: d.confidence,
      x,
      y,
      stance,
      stance_score: d.belief_regulatory_stance_wavg ?? (stance ? (STANCE_SCORES[stance] ?? null) : null),
      timeline,
      timeline_score: d.belief_agi_timeline_wavg ?? (timeline ? (TIMELINE_SCORES[timeline] ?? null) : null),
      risk,
      risk_score: d.belief_ai_risk_wavg ?? (risk ? (RISK_SCORES[risk] ?? null) : null),
      cluster_id: cluster.id,
      cluster_label: cluster.label,
    }
  })

  const clusters = CLUSTERS.map((c, i) => ({
    id: c.id,
    label: c.label,
    description: c.description,
    count: clusterCounts[i],
    cx: clusterCentroids[i].n ? clusterCentroids[i].sx / clusterCentroids[i].n : 0,
    cy: clusterCentroids[i].n ? clusterCentroids[i].sy / clusterCentroids[i].n : 0,
  }))

  const output = { points, sources: sourceMap, clusters }
  const json = JSON.stringify(output)
  const outPath = 'public/data/agi-definitions.json'

  // Ensure directory exists
  const dir = outPath.substring(0, outPath.lastIndexOf('/'))
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  fs.writeFileSync(outPath, json)
  console.log(
    `\nWrote ${outPath}: ${points.length} points, ${Object.keys(sourceMap).length} sources, ${clusters.length} clusters (${(json.length / 1024).toFixed(0)} KB)`,
  )
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
