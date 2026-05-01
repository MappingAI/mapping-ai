/**
 * Database connections for edge enrichment
 * RDS = source of truth (entities, edges)
 * Neon = enrichment data (claims, evidence, discoveries)
 */
import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../../.env') })

const { Pool } = pg

let rdsPool = null
let neonPool = null

/**
 * Get RDS connection pool (entities + edges)
 */
export function getRdsPool() {
  if (!rdsPool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not set. Add it to .env file.')
    }
    rdsPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    })
  }
  return rdsPool
}

/**
 * Get Neon connection pool (claims, evidence, discoveries)
 */
export function getNeonPool() {
  if (!neonPool) {
    if (!process.env.PILOT_DB) {
      throw new Error('PILOT_DB not set. Add it to .env file.')
    }
    neonPool = new Pool({
      connectionString: process.env.PILOT_DB,
      ssl: { rejectUnauthorized: false },
      max: 5,
    })
  }
  return neonPool
}

/**
 * Get both pools for scripts that need both
 */
export async function getConnections() {
  const rds = getRdsPool()
  const neon = getNeonPool()

  // Test connections
  await rds.query('SELECT 1')
  await neon.query('SELECT 1')

  return { rds, neon }
}

/**
 * Close all connections
 */
export async function closeConnections() {
  if (rdsPool) {
    await rdsPool.end()
    rdsPool = null
  }
  if (neonPool) {
    await neonPool.end()
    neonPool = null
  }
}

/**
 * Get entity counts for summary
 */
export async function getEntityCounts(rds) {
  const result = await rds.query(`
    SELECT
      entity_type,
      COUNT(*) as count
    FROM entity
    WHERE status = 'approved'
    GROUP BY entity_type
    ORDER BY count DESC
  `)
  return result.rows
}

/**
 * Get edge counts by type
 */
export async function getEdgeCounts(rds) {
  const result = await rds.query(`
    SELECT
      edge_type,
      COUNT(*) as count
    FROM edge
    GROUP BY edge_type
    ORDER BY count DESC
  `)
  return result.rows
}
