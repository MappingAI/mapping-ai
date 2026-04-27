/**
 * Semantic search endpoint — Cloudflare Pages Function port of api/semantic-search.ts (Lambda).
 *
 * GET /api/semantic-search?q=...
 *
 * Fetches map-data.json from the public CDN, builds context for Claude Haiku,
 * and returns semantically matched entity names. No direct DB access needed.
 */
import type { Env } from './_shared/env.ts'
import { jsonResponse, optionsResponse } from './_shared/cors.ts'

const MAP_DATA_URL = 'https://mapping-ai.org/map-data.json'
const LLM_TIMEOUT_MS = 15000

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

// Module-scoped cache (persists across warm isolate invocations)
let cachedMapData: MapDataShape | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000

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

function buildPersonSectorsLookup(mapData: MapDataShape): Map<number, Set<string>> {
  const orgById = new Map<number, MapDataEntity>()
  for (const org of mapData.organizations ?? []) {
    orgById.set(org.id, org)
  }

  const personSectors = new Map<number, Set<string>>()

  for (const affil of mapData.person_organizations ?? []) {
    const org = orgById.get(affil.organization_id)
    if (!org?.category) continue
    if (!personSectors.has(affil.person_id)) {
      personSectors.set(affil.person_id, new Set())
    }
    personSectors.get(affil.person_id)?.add(org.category as string)
  }

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
        personSectors.get(person.id)?.add(org.category as string)
      }
    }
  }

  return personSectors
}

function buildRelationshipContext(mapData: MapDataShape): string {
  const validEdgeTypes = new Set(['funder', 'critic', 'collaborator', 'authored_by'])
  const entityById = new Map<number, string | null>()

  for (const p of mapData.people || []) entityById.set(p.id, p.name ?? null)
  for (const o of mapData.organizations || []) entityById.set(o.id, o.name ?? null)

  const orgRelations = new Map<string, { funders: string[]; critics: string[]; collaborators: string[] }>()

  for (const rel of mapData.relationships ?? []) {
    if (!rel.relationship_type || !validEdgeTypes.has(rel.relationship_type)) continue

    const targetName = entityById.get(rel.target_id)
    const sourceName = entityById.get(rel.source_id)
    if (!targetName || !sourceName) continue

    if (!orgRelations.has(targetName)) {
      orgRelations.set(targetName, { funders: [], critics: [], collaborators: [] })
    }

    const rels = orgRelations.get(targetName)!
    if (rel.relationship_type === 'funder') rels.funders.push(sourceName)
    else if (rel.relationship_type === 'critic') rels.critics.push(sourceName)
    else if (rel.relationship_type === 'collaborator') rels.collaborators.push(sourceName)
  }

  const lines: string[] = []
  let charCount = 0
  const MAX_CHARS = 15000

  for (const [orgName, rels] of orgRelations) {
    const parts: string[] = []
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

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return optionsResponse(request)
  }

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, request, 405)
  }

  try {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')

    if (!q || q.trim().length < 3) {
      return jsonResponse({ error: 'Query must be at least 3 characters' }, request, 400)
    }

    const query = q.trim()

    const ANTHROPIC_API_KEY = env.ANTHROPIC_SEMANTIC_SEARCH_KEY ?? env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_API_KEY) {
      return jsonResponse({ error: 'AI search not configured' }, request, 503)
    }

    const mapData = await getMapData()
    const personSectors = buildPersonSectorsLookup(mapData)
    const relationshipContext = buildRelationshipContext(mapData)

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

    if (relationshipContext) {
      entityContext += `\n\nRELATIONSHIPS (funders, critics, collaborators):\n${relationshipContext}`
    }

    console.log(`Context size: ${entityContext.length} chars`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)

    let response: Response
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
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          temperature: 0,
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
      return jsonResponse({ error: 'AI search temporarily unavailable' }, request, 500)
    }

    const data = (await response.json()) as {
      content?: { text?: string }[]
    }
    const content = data.content?.[0]?.text || ''

    let parsed: { names?: string[]; summary?: string; match_reasons?: Record<string, unknown>; explanation?: string }
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      parsed = JSON.parse(jsonMatch[0]) as typeof parsed
    } catch {
      console.error('Failed to parse LLM response:', content)
      return jsonResponse(
        { error: 'Failed to parse AI response', names: [], summary: '', match_reasons: {} },
        request,
        500,
      )
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

    const filteredReasons: Record<string, unknown> = {}
    if (parsed.match_reasons && typeof parsed.match_reasons === 'object') {
      for (const [name, reason] of Object.entries(parsed.match_reasons)) {
        if (validNames.has(name) && filteredNames.includes(name)) {
          filteredReasons[name] = reason
        }
      }
    }

    return jsonResponse(
      {
        names: filteredNames,
        summary: parsed.summary || '',
        match_reasons: filteredReasons,
        explanation: parsed.summary || parsed.explanation || '',
        query,
      },
      request,
    )
  } catch (error) {
    console.error('Semantic search error:', error)

    if (error instanceof Error && error.name === 'AbortError') {
      return jsonResponse({ error: 'Search timed out, please try again' }, request, 504)
    }

    return jsonResponse({ error: 'Internal server error' }, request, 500)
  }
}
