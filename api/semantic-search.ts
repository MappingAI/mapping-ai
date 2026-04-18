import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { getCorsHeaders } from './cors.js'

// Use dedicated key for semantic search (separate from submission review key)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_SEMANTIC_SEARCH_KEY ?? process.env.ANTHROPIC_API_KEY
const MAP_DATA_URL = 'https://mapping-ai.org/map-data.json'
const LLM_TIMEOUT_MS = 15000 // 15 second timeout for Haiku (100K context needs time)

// The map-data.json response is consumed as a structured dictionary of
// entity arrays. The shape here matches the public map-data.json served
// from S3 (see api/export-map.ts → GeneratedMapData) but we keep it loose
// because semantic-search tolerates missing or extra fields gracefully.
interface MapDataEntity {
  id: number
  name?: string | null
  title?: string | null
  category?: string | null
  [key: string]: unknown
}
interface MapDataRelationship {
  source_type: string
  target_type: string
  source_id: number
  target_id: number
  relationship_type?: string | null
  role?: string | null
  evidence?: string | null
}
interface MapDataShape {
  people?: MapDataEntity[]
  organizations?: MapDataEntity[]
  resources?: MapDataEntity[]
  person_organizations?: { person_id: number; organization_id: number }[]
  relationships?: MapDataRelationship[]
}

// Cache for map data (persists across warm Lambda invocations)
let cachedMapData: MapDataShape | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getMapData(): Promise<MapDataShape> {
  const now = Date.now()
  if (cachedMapData && now - cacheTimestamp < CACHE_TTL) {
    return cachedMapData
  }

  const response = await fetch(MAP_DATA_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch map data: ${response.status}`)
  }
  cachedMapData = (await response.json()) as MapDataShape
  cacheTimestamp = now
  return cachedMapData
}

/**
 * Build a lookup of person ID → Set of affiliated organization sectors.
 * Uses person_organizations array + organizations to map affiliations.
 */
function buildPersonSectorsLookup(mapData: MapDataShape): Map<number, Set<string>> {
  const orgById = new Map<number, MapDataEntity>()
  for (const org of mapData.organizations ?? []) {
    orgById.set(org.id, org)
  }

  const personSectors = new Map<number, Set<string>>()

  // Process person_organizations affiliations
  for (const affil of mapData.person_organizations ?? []) {
    const org = orgById.get(affil.organization_id)
    if (!org?.category) continue

    if (!personSectors.has(affil.person_id)) {
      personSectors.set(affil.person_id, new Set())
    }
    personSectors.get(affil.person_id)?.add(org.category)
  }

  // Also check primary_org as fallback (match by name)
  const orgByName = new Map<string, MapDataEntity>()
  for (const org of mapData.organizations ?? []) {
    if (org.name) orgByName.set(org.name.toLowerCase(), org)
  }

  for (const person of mapData.people ?? []) {
    if (typeof person.primary_org === 'string') {
      const org = orgByName.get(person.primary_org.toLowerCase())
      if (org?.category) {
        if (!personSectors.has(person.id)) {
          personSectors.set(person.id, new Set())
        }
        personSectors.get(person.id)?.add(org.category)
      }
    }
  }

  return personSectors
}

/**
 * Build relationship summaries for funder/critic/collaborator edges.
 * Returns a string section for the LLM context.
 */
function buildRelationshipContext(mapData: MapDataShape) {
  const validEdgeTypes = new Set(['funder', 'critic', 'collaborator', 'authored_by'])
  const entityById = new Map()

  for (const p of mapData.people || []) entityById.set(p.id, p.name)
  for (const o of mapData.organizations || []) entityById.set(o.id, o.name)

  // Group edges by target org and edge type
  const orgRelations = new Map() // orgName → { funders: [], critics: [], collaborators: [] }

  for (const rel of mapData.relationships ?? []) {
    if (!rel.relationship_type || !validEdgeTypes.has(rel.relationship_type)) continue
    if (rel.relationship_type === 'affiliated') continue // Skip affiliations, handled separately

    const targetName = entityById.get(rel.target_id)
    const sourceName = entityById.get(rel.source_id)
    if (!targetName || !sourceName) continue

    if (!orgRelations.has(targetName)) {
      orgRelations.set(targetName, { funders: [], critics: [], collaborators: [] })
    }

    const rels = orgRelations.get(targetName)
    if (rel.relationship_type === 'funder') rels.funders.push(sourceName)
    else if (rel.relationship_type === 'critic') rels.critics.push(sourceName)
    else if (rel.relationship_type === 'collaborator') rels.collaborators.push(sourceName)
  }

  // Format as context string (cap at ~15KB)
  const lines = []
  let charCount = 0
  const MAX_CHARS = 15000

  for (const [orgName, rels] of orgRelations) {
    const parts = []
    if (rels.funders.length) parts.push(`funders: ${rels.funders.join(', ')}`)
    if (rels.critics.length) parts.push(`critics: ${rels.critics.join(', ')}`)
    if (rels.collaborators.length) parts.push(`collaborators: ${rels.collaborators.join(', ')}`)

    if (parts.length === 0) continue

    const line = `- ${orgName}: ${parts.join('; ')}`
    if (charCount + line.length > MAX_CHARS) break
    lines.push(line)
    charCount += line.length
  }

  return lines.length > 0 ? lines.join('\n') : ''
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const CORS_HEADERS = getCorsHeaders(event)
  const method = event.requestContext.http.method

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' }
  }

  if (method !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const { q } = event.queryStringParameters || {}

    if (!q || q.trim().length < 3) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Query must be at least 3 characters' }),
      }
    }

    const query = q.trim()

    if (!ANTHROPIC_API_KEY) {
      return {
        statusCode: 503,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'AI search not configured' }),
      }
    }

    // Fetch cached map data from CDN
    const mapData = await getMapData()

    // Build person-to-sectors lookup for multi-affiliation queries
    const personSectors = buildPersonSectorsLookup(mapData)

    // Build relationship context for funder/critic queries
    const relationshipContext = buildRelationshipContext(mapData)

    // Build enriched context for LLM
    const people = (mapData.people || []).map((r) => {
      const sectors = personSectors.get(r.id)
      const affiliations = sectors ? `[sectors: ${[...sectors].join(', ')}]` : ''
      return `- ${r.name} (${r.category || 'unknown role'}${r.primary_org ? ', ' + r.primary_org : ''}${r.regulatory_stance ? ', stance: ' + r.regulatory_stance : ''}) ${affiliations}`
    })

    const orgs = (mapData.organizations || []).map(
      (r) =>
        `- ${r.name} (${r.category || 'unknown sector'}${r.regulatory_stance ? ', stance: ' + r.regulatory_stance : ''})`,
    )

    const resources = (mapData.resources || []).map((r) => `- ${r.title || r.name} (${r.category || 'resource'})`)

    let entityContext = `
PEOPLE (${people.length}):
${people.join('\n')}

ORGANIZATIONS (${orgs.length}):
${orgs.join('\n')}

RESOURCES (${resources.length}):
${resources.join('\n')}
    `.trim()

    // Add relationship context if available
    if (relationshipContext) {
      entityContext += `\n\nRELATIONSHIPS (funders, critics, collaborators):\n${relationshipContext}`
    }

    // Log context size for monitoring
    console.log(`Context size: ${entityContext.length} chars`)

    // Call Claude Haiku with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)

    let response
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4096,
          temperature: 0, // Zero temperature for fully deterministic results
          messages: [
            {
              role: 'user',
              content: `You are helping search a database of AI policy stakeholders. Your goal is to BROADLY interpret queries and return relevant entities.

QUERY: "${query}"

Here are all the entities in the database:

${entityContext}

Return a JSON object with:
- "names": array of exact entity names from the list above that match the query
- "summary": 1-2 sentences describing the result set (e.g., "Found 15 researchers and executives who have worked at both frontier labs and government agencies")
- "match_reasons": object mapping entity names to brief explanations of why they matched (e.g., {"Heidy Khlaaf": "affiliated with: Trail of Bits, NIST [Government/Agency], Google [Frontier Lab]"})

QUERY TYPES - Handle these patterns:

1. **Multi-affiliation intersection queries** (e.g., "people at frontier labs AND think tanks AND government"):
   - Look at each person's [sectors: ...] field
   - Return ONLY people whose sectors include ALL the requested types
   - Be strict about intersections - "AND" means they must have affiliations in ALL mentioned sectors

2. **Connection/path queries** (e.g., "how is X connected to Y"):
   - Return both X and Y
   - Return any entities that appear in relationships with both X and Y
   - Explain the connection path in match_reasons

3. **Relationship-type queries** (e.g., "funders of X", "critics of Y"):
   - Check the RELATIONSHIPS section for funder/critic/collaborator edges
   - Return entities that have the specified relationship type to the target

4. **Neighborhood queries** (e.g., "tell me about X", "who is X"):
   - Return X and all entities directly connected to X
   - Include connected orgs, collaborators, funders, critics

5. **Standard queries** (topic, organization, stance, role):
   - Be INCLUSIVE - return all plausibly relevant entities
   - For org queries, include all people at that org
   - For topic queries, include orgs AND their people

EMPTY RESULTS:
If no entities match ALL criteria in an intersection query, return:
- "names": []
- "summary": "No entities matched all criteria. [Explain what was missing]. Try relaxing to: [suggest simpler query]"
- "match_reasons": {}

Return up to 100 matches. Respond ONLY with valid JSON, no other text.`,
            },
          ],
        }),
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', response.status, errText)
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'AI search temporarily unavailable' }),
      }
    }

    const data = await response.json()
    const content = data.content?.[0]?.text || ''

    // Parse JSON from response
    let parsed
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      console.error('Failed to parse LLM response:', content)
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Failed to parse AI response',
          names: [],
          summary: '',
          match_reasons: {},
        }),
      }
    }

    // Validate names against actual entity list to prevent hallucinations
    const validNames = new Set<string>(
      [
        ...(mapData.people ?? []).map((p) => p.name ?? null),
        ...(mapData.organizations ?? []).map((o) => o.name ?? null),
        ...(mapData.resources ?? []).map((r) => r.title ?? r.name ?? null),
      ].filter((n): n is string => typeof n === 'string' && n.length > 0),
    )

    const parsedNames: string[] = Array.isArray(parsed.names) ? (parsed.names as string[]) : []
    const filteredNames = parsedNames.filter((name) => validNames.has(name))

    // Filter match_reasons to only include valid names
    const filteredReasons: Record<string, unknown> = {}
    if (parsed.match_reasons && typeof parsed.match_reasons === 'object') {
      for (const [name, reason] of Object.entries(parsed.match_reasons)) {
        if (validNames.has(name) && filteredNames.includes(name)) {
          filteredReasons[name] = reason
        }
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        names: filteredNames,
        summary: parsed.summary || '',
        match_reasons: filteredReasons,
        explanation: parsed.summary || parsed.explanation || '', // backwards compat
        query: query,
      }),
    }
  } catch (error) {
    console.error('Semantic search error:', error)

    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        statusCode: 504,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Search timed out, please try again' }),
      }
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
