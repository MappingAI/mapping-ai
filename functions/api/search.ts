/**
 * Search endpoint — Cloudflare Pages Function port of api/search.ts (Lambda).
 *
 * GET /api/search?q=...&type=person|organization|resource&status=approved|pending|all
 *
 * Business logic is identical to the Lambda version. Changes:
 *  - Web standard Request/Response instead of APIGatewayProxyHandlerV2
 *  - context.env for secrets instead of process.env
 *  - Shared CORS + DB pool helpers
 */
import type { Env } from './_shared/env.ts'
import { jsonResponse, optionsResponse } from './_shared/cors.ts'
import { getPool } from './_shared/db.ts'

interface SearchRow {
  id: number
  entity_type: 'person' | 'organization' | 'resource'
  name: string | null
  category: string | null
  title: string | null
  primary_org: string | null
  location: string | null
  regulatory_stance: string | null
  status: string
  resource_title: string | null
  resource_type: string | null
  resource_author: string | null
  resource_category: string | null
  website: string | null
  parent_org_id: number | null
  rank?: number
  author?: string | null
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
    const type = url.searchParams.get('type')
    const status = url.searchParams.get('status')

    if (!q || q.trim().length < 2) {
      return jsonResponse({ error: 'Query must be at least 2 characters' }, request, 400)
    }

    const query = q.trim()

    // Auth check: status=all requires admin key
    const providedKey = request.headers.get('x-admin-key') || url.searchParams.get('key')
    const isAdmin = env.ADMIN_KEY && providedKey === env.ADMIN_KEY

    // Build parameterized WHERE clauses
    const params: (string | number)[] = [query, `%${query}%`]
    let paramIdx = 3
    const clauses: string[] = []

    // Type filter
    const typeMap: Record<string, string> = {
      person: 'person',
      organization: 'organization',
      resource: 'resource',
    }
    const entityType = type ? typeMap[type] : undefined
    if (entityType) {
      clauses.push(`AND entity_type = $${paramIdx}`)
      params.push(entityType)
      paramIdx++
    }

    // Status filter
    if (status === 'pending') {
      clauses.push(`AND status = $${paramIdx}`)
      params.push('pending')
      paramIdx++
    } else if (status === 'all' && isAdmin) {
      // No status filter
    } else {
      clauses.push(`AND status = $${paramIdx}`)
      params.push('approved')
      paramIdx++
    }

    const whereExtra = clauses.join(' ')

    const pool = getPool(env.DATABASE_URL)
    const client = await pool.connect()
    try {
      let result: { rows: SearchRow[] }

      if (status === 'pending') {
        // Search submission table for new pending entities
        const pendingParams: string[] = [`%${query}%`]
        let pIdx = 2
        let pendingTypeClause = ''
        if (entityType) {
          pendingTypeClause = `AND entity_type = $${pIdx}`
          pendingParams.push(entityType)
          pIdx++
        }
        // Suppress unused variable lint — pIdx is kept for clarity if more clauses are added
        void pIdx

        result = await client.query<SearchRow>(
          `SELECT id, entity_type, name, category, title, primary_org, location,
                  belief_regulatory_stance AS regulatory_stance, 'pending' AS status,
                  resource_title, resource_type, resource_author, resource_category, website, parent_org_id
           FROM submission
           WHERE entity_id IS NULL AND status = 'pending'
             AND (name ILIKE $1 OR resource_title ILIKE $1) ${pendingTypeClause}
           ORDER BY submitted_at DESC
           LIMIT 15`,
          pendingParams,
        )
      } else {
        result = await client.query<SearchRow>(
          `SELECT id, entity_type, name, category, title, primary_org, location,
                  belief_regulatory_stance AS regulatory_stance, status,
                  resource_title, resource_type, resource_author, resource_category, website, parent_org_id,
                  ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
           FROM entity
           WHERE (search_vector @@ plainto_tsquery('english', $1)
              OR name ILIKE $2
              OR resource_title ILIKE $2) ${whereExtra}
           ORDER BY
             CASE WHEN name ILIKE $2 OR resource_title ILIKE $2 THEN 0 ELSE 1 END,
             ts_rank(search_vector, plainto_tsquery('english', $1)) DESC
           LIMIT 30`,
          params,
        )
      }

      // Group results by entity_type for backwards compatibility
      const results: { people: SearchRow[]; organizations: SearchRow[]; resources: SearchRow[] } = {
        people: [],
        organizations: [],
        resources: [],
      }
      for (const row of result.rows) {
        if (row.entity_type === 'person') {
          results.people.push(row)
        } else if (row.entity_type === 'organization') {
          results.organizations.push(row)
        } else if (row.entity_type === 'resource') {
          row.title = row.resource_title
          row.author = row.resource_author
          results.resources.push(row)
        }
      }

      return jsonResponse(results, request)
    } finally {
      client.release()
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Search error:', error)
    return jsonResponse({ error: 'Internal server error', debug: msg, hasDbUrl: !!env.DATABASE_URL }, request, 500)
  }
}
