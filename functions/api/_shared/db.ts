/**
 * Shared Postgres client for Cloudflare Pages Functions.
 *
 * Uses @neondatabase/serverless which connects via WebSocket (compatible
 * with Workers runtime, unlike pg.Pool which needs raw TCP sockets).
 */
import { neon } from '@neondatabase/serverless'

export type NeonQueryFn = ReturnType<typeof neon>

export function getDb(databaseUrl: string): NeonQueryFn {
  return neon(databaseUrl)
}
