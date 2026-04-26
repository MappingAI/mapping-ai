/**
 * Submissions endpoint — Cloudflare Pages Function port of api/submissions.ts (Lambda).
 *
 * GET /api/submissions?type=person|organization|resource&status=approved|pending
 *
 * Returns all entities + edges, split by entity_type for backwards compatibility
 * with the map frontend.
 */
import type { Env } from './_shared/env.ts'
import type { DbEntityRow, DbEdgeRow } from '../../src/shared/db-types.ts'
import { jsonResponse, optionsResponse } from './_shared/cors.ts'
import { getDb } from './_shared/db.ts'

const SENSITIVE = new Set<keyof DbEntityRow>(['search_vector'])

type EntityRow = DbEntityRow & Record<string, unknown>
type EdgeRow = Pick<DbEdgeRow, 'id' | 'source_id' | 'target_id' | 'edge_type' | 'role' | 'is_primary'>

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
    const type = url.searchParams.get('type')
    const status = url.searchParams.get('status')
    const filterStatus = status ?? 'approved'

    const sql = getDb(env.DATABASE_URL)

    const typeClause = type ? 'AND entity_type = $2' : ''
    const queryParams: string[] = type ? [filterStatus, type] : [filterStatus]

    const entityRows = (await sql.query(
      `SELECT * FROM entity WHERE status = $1 ${typeClause} ORDER BY COALESCE(name, resource_title) ASC`,
      queryParams,
    )) as EntityRow[]

    const edgeRows = (await sql.query(
      `SELECT id, source_id, target_id, edge_type, role, is_primary FROM edge ORDER BY id`,
    )) as EdgeRow[]

    const clean = entityRows.map((row) => {
      const r: EntityRow = { ...row }
      for (const f of SENSITIVE) delete (r as Record<string, unknown>)[f]
      return r
    })

    const people = clean.filter((r) => r.entity_type === 'person')
    const organizations = clean.filter((r) => r.entity_type === 'organization')
    const resources = clean.filter((r) => r.entity_type === 'resource')

    return jsonResponse({ people, organizations, resources, edges: edgeRows }, request)
  } catch (error) {
    console.error('Query error:', error)
    return jsonResponse({ error: 'Internal server error' }, request, 500)
  }
}
