/**
 * Shared Postgres pool for Cloudflare Pages Functions.
 *
 * Neon supports standard Postgres protocol over TLS. Workers/Pages have
 * ~30s CPU time per invocation, so we keep max=1 and rely on Neon's
 * connection pooler (PgBouncer) for multiplexing.
 *
 * NOTE: In production Pages Functions, each isolate gets its own module
 * scope, so this pool lives per-isolate. Neon's serverless driver
 * (@neondatabase/serverless) would be better for cold-start latency,
 * but pg.Pool works fine and keeps the port from Lambda minimal.
 */
import pg from 'pg'

const { Pool } = pg

let pool: pg.Pool | null = null

export function getPool(databaseUrl: string): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      options: '-c statement_timeout=10000',
    })
  }
  return pool
}
