import pg from 'pg'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import type { DbEdgeRow, DbEntityRow } from '../src/shared/db-types.js'
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

const SENSITIVE = new Set<keyof DbEntityRow>(['search_vector'])

type EntityRow = DbEntityRow & Record<string, unknown>
type EdgeRow = Pick<DbEdgeRow, 'id' | 'source_id' | 'target_id' | 'edge_type' | 'role' | 'is_primary'>

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const CORS_HEADERS = getCorsHeaders(event)
  const method = event.requestContext.http.method

  if (method === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' }
  if (method !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const { type, status } = event.queryStringParameters ?? {}
    const filterStatus = status ?? 'approved'

    const client = await pool.connect()
    try {
      const typeClause = type ? 'AND entity_type = $2' : ''
      const queryParams: string[] = type ? [filterStatus, type] : [filterStatus]

      const entityResult = await client.query<EntityRow>(
        `SELECT * FROM entity WHERE status = $1 ${typeClause} ORDER BY COALESCE(name, resource_title) ASC`,
        queryParams,
      )

      const edges = await client.query<EdgeRow>(
        `SELECT id, source_id, target_id, edge_type, role, is_primary FROM edge ORDER BY id`,
      )

      const clean = entityResult.rows.map((row) => {
        const r: EntityRow = { ...row }
        for (const f of SENSITIVE) delete (r as Record<string, unknown>)[f]
        return r
      })

      // Split into typed arrays for backwards compatibility with the map frontend.
      const people = clean.filter((r) => r.entity_type === 'person')
      const organizations = clean.filter((r) => r.entity_type === 'organization')
      const resources = clean.filter((r) => r.entity_type === 'resource')

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ people, organizations, resources, edges: edges.rows }),
      }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Query error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
