import type { Entity } from '../types/entity'
import type { FuzzySearchResult } from '../types/api'

/** Score fields for each entity type during fuzzy search. */
const SEARCH_FIELDS: Record<string, string[]> = {
  person: ['name', 'title', 'primary_org', 'category', 'notes'],
  organization: ['name', 'category', 'website', 'notes'],
  resource: ['title', 'author', 'category', 'notes'],
}

/**
 * Score an entity against a query. Returns 0-100.
 * - exact match: 100
 * - startsWith: 80
 * - includes: 60
 */
function scoreEntity(entity: Entity, query: string, fields: string[]): number {
  let score = 0
  for (const f of fields) {
    const val = (entity as unknown as Record<string, unknown>)[f] as string | null | undefined
    if (!val) continue
    const lower = val.toLowerCase()
    if (lower === query) return 100
    if (lower.startsWith(query)) score = Math.max(score, 80)
    else if (lower.includes(query)) score = Math.max(score, 60)
  }
  return score
}

/**
 * Client-side fuzzy search against the entity cache.
 * Mirrors the original searchEntities() from contribute.html.
 */
export function fuzzySearch(
  entities: Entity[],
  query: string,
  type?: 'person' | 'organization' | 'resource',
  limit = 10,
): FuzzySearchResult[] {
  if (!query || query.length < 1) return []

  const q = query.toLowerCase()
  const results: FuzzySearchResult[] = []

  for (const entity of entities) {
    if (type && entity.entity_type !== type) continue

    const fields = SEARCH_FIELDS[entity.entity_type] ?? ['name']
    const score = scoreEntity(entity, q, fields)

    if (score > 0) {
      results.push({
        id: entity.id,
        entity_type: entity.entity_type,
        name: entity.name,
        category: entity.category,
        title: entity.title,
        primary_org: entity.primary_org,
        location: entity.location,
        status: entity.status as 'approved' | 'pending',
        score,
        isPending: false,
      })
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
