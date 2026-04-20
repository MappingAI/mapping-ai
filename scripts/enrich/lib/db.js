/**
 * Read-only-ish DB client for the enrichment skill.
 *
 * The skill never writes via direct SQL (all writes go through /submit and
 * /admin). This client exists for:
 *   - duplicate detection before submitting a new entity
 *   - fetching current entity state before proposing an edit (read-before-write)
 *   - read-only diagnostics
 *
 * It exposes a minimal query surface. If future needs demand writes, add a
 * thin, clearly-labelled wrapper with safe-sequence-reset baked in rather
 * than opening arbitrary SQL to callers.
 */
import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

let poolInstance = null

export function getPool() {
  if (!poolInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Add it to .env or export it before running.')
    }
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 30000,
    })
  }
  return poolInstance
}

export async function closePool() {
  if (poolInstance) {
    await poolInstance.end()
    poolInstance = null
  }
}

/**
 * Fetch a single entity by ID, including all provenance columns added in
 * Unit 1 of the enrichment skill plan. Returns null if not found.
 */
export async function getEntityById(id) {
  const { rows } = await getPool().query(`SELECT * FROM entity WHERE id = $1`, [id])
  return rows[0] ?? null
}

/**
 * Fuzzy search entities by name. Limited to top N hits. Used by the skill's
 * duplicate-detection path before creating anything new.
 */
export async function searchEntitiesByName(name, { entityType = null, limit = 10 } = {}) {
  const conditions = [`name ILIKE '%' || $1 || '%'`]
  const values = [name]
  if (entityType) {
    conditions.push(`entity_type = $2`)
    values.push(entityType)
  }
  const whereClause = conditions.join(' AND ')
  const { rows } = await getPool().query(
    `SELECT id, entity_type, name, category, primary_org, status, qa_approved
     FROM entity
     WHERE ${whereClause}
     ORDER BY
       CASE WHEN LOWER(name) = LOWER($1) THEN 0 ELSE 1 END,
       submission_count DESC NULLS LAST,
       id
     LIMIT ${parseInt(limit, 10)}`,
    values,
  )
  return rows
}

/**
 * Count currently-approved entities of each type. Useful as a sanity check
 * before a re-enrichment loop.
 */
export async function countEntitiesByType() {
  const { rows } = await getPool().query(
    `SELECT entity_type, COUNT(*)::int AS count
     FROM entity
     WHERE status = 'approved' AND qa_approved = true
     GROUP BY entity_type`,
  )
  return Object.fromEntries(rows.map((r) => [r.entity_type, r.count]))
}
