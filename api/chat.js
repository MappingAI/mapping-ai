import { getCorsHeaders } from './cors.js'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_SEMANTIC_SEARCH_KEY || process.env.ANTHROPIC_API_KEY
const MAP_DATA_URL = process.env.MAP_DATA_URL || 'https://mapping-ai.org/map-data.json'
const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOOL_ITERATIONS = 6
const LLM_TIMEOUT_MS = 20000

let cachedMapData = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000

async function getMapData() {
  const now = Date.now()
  if (cachedMapData && now - cacheTimestamp < CACHE_TTL) return cachedMapData
  const response = await fetch(MAP_DATA_URL)
  if (!response.ok) throw new Error(`Failed to fetch map data: ${response.status}`)
  cachedMapData = await response.json()
  cacheTimestamp = now
  return cachedMapData
}

function entityLabel(e) {
  if (e._type === 'resource') return e.title || e.name
  return e.name
}

function normalize(s) {
  return (s || '').toString().toLowerCase()
}

function indexMap(mapData) {
  const all = []
  const byId = new Map()
  for (const p of mapData.people || []) {
    const e = { ...p, _type: 'person' }
    all.push(e)
    byId.set(`person:${p.id}`, e)
  }
  for (const o of mapData.organizations || []) {
    const e = { ...o, _type: 'organization' }
    all.push(e)
    byId.set(`organization:${o.id}`, e)
  }
  for (const r of mapData.resources || []) {
    const e = { ...r, _type: 'resource' }
    all.push(e)
    byId.set(`resource:${r.id}`, e)
  }
  return { all, byId }
}

// ────────────────────────────────────────────────────────────────────────────
// Tool implementations — each returns a compact JSON-friendly result
// ────────────────────────────────────────────────────────────────────────────

function toolSearchEntities(mapData, { query, type, limit = 20 }) {
  const { all } = indexMap(mapData)
  const q = normalize(query)
  if (!q) return { matches: [], note: 'empty query' }
  const tokens = q.split(/\s+/).filter(Boolean)

  const scored = []
  for (const e of all) {
    if (type && e._type !== type) continue
    const label = normalize(entityLabel(e))
    const haystack = [
      label,
      normalize(e.category),
      normalize(e.other_categories),
      normalize(e.primary_org),
      normalize(e.title),
      normalize(e.location),
      normalize(e.regulatory_stance),
      normalize(e.agi_timeline),
      normalize(e.ai_risk_level),
    ].join(' | ')

    let score = 0
    for (const t of tokens) {
      if (!t) continue
      if (label === t) score += 20
      else if (label.startsWith(t)) score += 10
      else if (label.includes(t)) score += 6
      if (haystack.includes(t)) score += 2
    }
    if (score > 0) scored.push({ e, score })
  }

  scored.sort((a, b) => b.score - a.score)
  const matches = scored.slice(0, Math.max(1, Math.min(limit, 30))).map(({ e }) => ({
    id: e.id,
    type: e._type,
    name: entityLabel(e),
    category: e.category || null,
    primary_org: e.primary_org || null,
    location: e.location || null,
  }))
  return { matches, total: scored.length }
}

function toolFilterByCategory(mapData, { category, type, limit = 50 }) {
  const { all } = indexMap(mapData)
  const target = normalize(category)
  const matches = []
  for (const e of all) {
    if (type && e._type !== type) continue
    const primary = normalize(e.category)
    const others = normalize(e.other_categories)
    if (primary === target || primary.includes(target) || others.includes(target)) {
      matches.push({
        id: e.id,
        type: e._type,
        name: entityLabel(e),
        category: e.category || null,
        primary_org: e.primary_org || null,
      })
      if (matches.length >= Math.min(limit, 100)) break
    }
  }
  return { matches, total: matches.length }
}

function toolGetEntityDetails(mapData, { entities }) {
  const { byId } = indexMap(mapData)
  const items = []
  for (const ref of (entities || []).slice(0, 12)) {
    const key = `${ref.type}:${ref.id}`
    const e = byId.get(key)
    if (!e) continue
    items.push({
      id: e.id,
      type: e._type,
      name: entityLabel(e),
      category: e.category || null,
      other_categories: e.other_categories || null,
      title: e.title || null,
      primary_org: e.primary_org || null,
      other_orgs: e.other_orgs || null,
      location: e.location || null,
      website: e.website || null,
      regulatory_stance: e.regulatory_stance || null,
      agi_timeline: e.agi_timeline || null,
      ai_risk_level: e.ai_risk_level || null,
      stance_score: e.stance_score ?? null,
      timeline_score: e.timeline_score ?? null,
      risk_score: e.risk_score ?? null,
      funding_model: e.funding_model || null,
      resource_type: e.resource_type || null,
      resource_url: e.resource_url || e.url || null,
      resource_year: e.resource_year || null,
      notes: (e.notes || '').slice(0, 400) || null,
    })
  }
  return { entities: items }
}

function toolGetConnections(mapData, { entity_id, entity_type, edge_type, limit = 30 }) {
  const { byId } = indexMap(mapData)
  const nameById = new Map()
  for (const [key, e] of byId.entries()) nameById.set(key, entityLabel(e))

  const self = byId.get(`${entity_type}:${entity_id}`)
  if (!self) return { error: 'Entity not found', connections: [] }

  const rels = mapData.relationships || []
  const out = []
  for (const r of rels) {
    if (edge_type && r.relationship_type !== edge_type) continue
    const srcMatches = r.source_id === entity_id
    const tgtMatches = r.target_id === entity_id
    if (!srcMatches && !tgtMatches) continue

    const otherId = srcMatches ? r.target_id : r.source_id
    // relationships use numeric ids but could refer to any entity type; look up by scanning
    let other = null
    for (const t of ['person', 'organization', 'resource']) {
      if (byId.has(`${t}:${otherId}`)) {
        other = byId.get(`${t}:${otherId}`)
        break
      }
    }
    if (!other) continue
    out.push({
      id: other.id,
      type: other._type,
      name: entityLabel(other),
      category: other.category || null,
      relationship: r.relationship_type,
      direction: srcMatches ? 'outgoing' : 'incoming',
    })
    if (out.length >= Math.min(limit, 50)) break
  }

  // Also include person-organization affiliations if applicable
  if (self._type === 'person') {
    for (const po of mapData.person_organizations || []) {
      if (po.person_id !== entity_id) continue
      const org = byId.get(`organization:${po.organization_id}`)
      if (!org) continue
      out.push({
        id: org.id,
        type: 'organization',
        name: entityLabel(org),
        category: org.category || null,
        relationship: 'affiliated',
        direction: 'outgoing',
      })
      if (out.length >= Math.min(limit, 50)) break
    }
  }
  return { entity: { id: self.id, type: self._type, name: entityLabel(self) }, connections: out }
}

// ────────────────────────────────────────────────────────────────────────────
// Tool definitions sent to the model
// ────────────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'search_entities',
    description:
      'Keyword search for people, organizations, or resources in the AI policy stakeholder map. Returns up to 20 matches with id, type, name, category. Use this to find candidates before fetching details.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search terms. Names, roles, topics, stances.' },
        type: {
          type: 'string',
          enum: ['person', 'organization', 'resource'],
          description: 'Optional: restrict to one entity type.',
        },
        limit: { type: 'integer', minimum: 1, maximum: 30 },
      },
      required: ['query'],
    },
  },
  {
    name: 'filter_by_category',
    description:
      'List entities in a specific category or sector (e.g. "AI Safety/Alignment", "Frontier Lab", "Think Tank/Policy Org", "Policymaker", "Investor"). Returns up to 50 matches.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        type: { type: 'string', enum: ['person', 'organization', 'resource'] },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
      required: ['category'],
    },
  },
  {
    name: 'get_entity_details',
    description:
      'Fetch full profile for up to 12 entities: category, org, location, stance, timeline, risk, notes. Pass entity refs from previous search results.',
    input_schema: {
      type: 'object',
      properties: {
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              type: { type: 'string', enum: ['person', 'organization', 'resource'] },
            },
            required: ['id', 'type'],
          },
        },
      },
      required: ['entities'],
    },
  },
  {
    name: 'get_connections',
    description:
      'List entities connected to a given entity: funders, critics, collaborators, authors, affiliations. Use to explore relationships.',
    input_schema: {
      type: 'object',
      properties: {
        entity_id: { type: 'integer' },
        entity_type: { type: 'string', enum: ['person', 'organization', 'resource'] },
        edge_type: {
          type: 'string',
          enum: ['affiliated', 'funder', 'critic', 'collaborator', 'authored_by'],
          description: 'Optional: restrict to one relationship type.',
        },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
      required: ['entity_id', 'entity_type'],
    },
  },
  {
    name: 'highlight_on_map',
    description:
      'Highlight a set of entities on the map view. The map dims everything else and shows their connections. Use after finding relevant entities so the user can see them visually.',
    input_schema: {
      type: 'object',
      properties: {
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              type: { type: 'string', enum: ['person', 'organization', 'resource'] },
              name: { type: 'string' },
            },
            required: ['name'],
          },
        },
        label: { type: 'string', description: 'Short caption shown to the user, e.g. "AI safety critics of OpenAI".' },
      },
      required: ['entities'],
    },
  },
  {
    name: 'clear_highlight',
    description: 'Remove any current highlight and restore the full map view.',
    input_schema: { type: 'object', properties: {} },
  },
]

const CLIENT_SIDE_TOOLS = new Set(['highlight_on_map', 'clear_highlight'])

const SYSTEM_PROMPT = `You are a research assistant embedded in an interactive map of the US AI policy stakeholder landscape. The map shows people, organizations, and resources with their categories, belief scores (regulatory stance, AGI timeline, AI risk level), and relationships (funders, critics, collaborators, affiliations).

Your job is to help the user explore this landscape conversationally. Use your tools aggressively to look things up — you do NOT have the full dataset in context. Never invent entities, relationships, or scores; every specific claim must come from a tool result.

Guidelines:
- Start by searching or filtering. Don't guess names from memory.
- When you find a useful set of entities, call highlight_on_map so the user sees them on the map. Keep highlight sets focused (under 30 entities when possible).
- For niche questions the map doesn't directly answer, you can still synthesize insights from tool results — e.g. compare stances across a group, trace funding chains, identify gaps.
- Be concise. 2–4 sentences of prose per turn. Follow up with a question if it would narrow the user's intent.
- If a tool returns nothing useful, say so plainly and suggest a different angle.
- Categories include: Frontier Lab, AI Safety/Alignment, Think Tank/Policy Org, Government/Agency, Academic, VC/Capital/Philanthropy, Labor/Civil Society, Ethics/Bias/Rights, Media/Journalism, Political Campaign/PAC, AI Infrastructure & Compute, AI Deployers & Platforms. Person roles: Executive, Researcher, Policymaker, Investor, Organizer, Journalist, Academic, Cultural figure.`

// ────────────────────────────────────────────────────────────────────────────
// Anthropic call
// ────────────────────────────────────────────────────────────────────────────

async function callAnthropic(messages, signal) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    signal,
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic ${res.status}: ${body.slice(0, 500)}`)
  }
  return res.json()
}

function executeServerTool(name, input, mapData) {
  try {
    if (name === 'search_entities') return toolSearchEntities(mapData, input || {})
    if (name === 'filter_by_category') return toolFilterByCategory(mapData, input || {})
    if (name === 'get_entity_details') return toolGetEntityDetails(mapData, input || {})
    if (name === 'get_connections') return toolGetConnections(mapData, input || {})
    return { error: `Unknown tool: ${name}` }
  } catch (err) {
    return { error: err.message || 'tool execution failed' }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────────────────

export const handler = async (event) => {
  const CORS_HEADERS = getCorsHeaders(event, { methods: 'POST, OPTIONS' })
  const method = event.requestContext.http.method

  if (method === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' }
  if (method !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 503,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Chat not configured' }),
    }
  }

  let body
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {}
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid JSON' }),
    }
  }

  const history = Array.isArray(body.messages) ? body.messages : []
  const userMessage = typeof body.message === 'string' ? body.message.trim() : ''
  if (!userMessage && history.length === 0) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Missing message' }),
    }
  }

  const messages = [...history]
  if (userMessage) messages.push({ role: 'user', content: userMessage })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)

  try {
    const mapData = await getMapData()

    const uiActions = []
    let finalText = ''
    let iterations = 0

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++
      const response = await callAnthropic(messages, controller.signal)
      const content = response.content || []

      // Collect any plain text from this turn
      for (const block of content) {
        if (block.type === 'text' && block.text) finalText += (finalText ? '\n\n' : '') + block.text
      }

      if (response.stop_reason !== 'tool_use') break

      // Assistant turn goes into history verbatim (required for tool_use_id correlation)
      messages.push({ role: 'assistant', content })

      const toolResults = []
      for (const block of content) {
        if (block.type !== 'tool_use') continue
        if (CLIENT_SIDE_TOOLS.has(block.name)) {
          uiActions.push({ action: block.name, input: block.input || {} })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ ok: true, queued_for_client: true }),
          })
        } else {
          const result = executeServerTool(block.name, block.input, mapData)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          })
        }
      }

      messages.push({ role: 'user', content: toolResults })
    }

    clearTimeout(timeout)

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reply: finalText || "I couldn't generate a response. Try rephrasing.",
        messages,
        ui_actions: uiActions,
      }),
    }
  } catch (error) {
    clearTimeout(timeout)
    console.error('Chat error:', error)
    const isTimeout = error.name === 'AbortError'
    return {
      statusCode: isTimeout ? 504 : 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: isTimeout ? 'Chat timed out, please try again' : 'Internal server error' }),
    }
  }
}
