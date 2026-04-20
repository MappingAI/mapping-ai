import pg from 'pg'
import { getCorsHeaders } from './cors.js'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  options: '-c statement_timeout=10000',
})

export const handler = async (event) => {
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
    const { q, type, status } = event.queryStringParameters || {}

    if (!q || q.trim().length < 2) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Query must be at least 2 characters' }),
      }
    }

    const query = q.trim()

    // Auth check: status=pending and status=all require admin key
    const ADMIN_KEY = process.env.ADMIN_KEY
    const providedKey = event.headers?.['x-admin-key'] || event.queryStringParameters?.key
    const isAdmin = ADMIN_KEY && providedKey === ADMIN_KEY

    // Build parameterized WHERE clauses
    const params = [query, `%${query}%`]
    let paramIdx = 3
    const clauses = []

    // Type filter (parameterized)
    const typeMap = { person: 'person', organization: 'organization', resource: 'resource' }
    const entityType = typeMap[type]
    if (entityType) {
      clauses.push(`AND entity_type = $${paramIdx}`)
      params.push(entityType)
      paramIdx++
    }

    // Status filter (parameterized)
    // pending: public (needed for link-as-you-go form workflow)
    // all: admin only (exposes internal entities)
    if (status === 'pending') {
      clauses.push(`AND status = $${paramIdx}`)
      params.push('pending')
      paramIdx++
    } else if (status === 'all' && isAdmin) {
      // No status filter — return all statuses
    } else {
      clauses.push(`AND status = $${paramIdx}`)
      params.push('approved')
      paramIdx++
    }

    const whereExtra = clauses.join(' ')

    const client = await pool.connect()
    try {
      let result

      if (status === 'pending') {
        // Search the submission table for new pending entities (entity_id IS NULL)
        const pendingParams = [`%${query}%`]
        let pIdx = 2
        let pendingTypeClause = ''
        if (entityType) {
          pendingTypeClause = `AND entity_type = $${pIdx}`
          pendingParams.push(entityType)
          pIdx++
        }
        result = await client.query(
          `SELECT id, entity_type, name, category, title, primary_org, location,
                  belief_regulatory_stance AS regulatory_stance, 'pending' AS status,
                  resource_title, resource_type, resource_author, resource_category, website, parent_org_id,
                  topic_tags, format_tags,
                  advocated_stance, advocated_timeline, advocated_risk,
                  source
           FROM submission
           WHERE entity_id IS NULL AND status = 'pending'
             AND (name ILIKE $1 OR resource_title ILIKE $1) ${pendingTypeClause}
           ORDER BY submitted_at DESC
           LIMIT 15`,
          pendingParams,
        )
      } else {
        result = await client.query(
          `SELECT id, entity_type, name, category, title, primary_org, location,
                  belief_regulatory_stance AS regulatory_stance, status,
                  resource_title, resource_type, resource_author, resource_category, website, parent_org_id,
                  topic_tags, format_tags,
                  advocated_stance, advocated_timeline, advocated_risk,
                  source,
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
      const results = { people: [], organizations: [], resources: [] }
      for (const row of result.rows) {
        if (row.entity_type === 'person') {
          results.people.push(row)
        } else if (row.entity_type === 'organization') {
          results.organizations.push(row)
        } else if (row.entity_type === 'resource') {
          // Map resource fields for frontend compatibility
          row.title = row.resource_title
          row.author = row.resource_author
          results.resources.push(row)
        }
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(results),
      }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Search error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
