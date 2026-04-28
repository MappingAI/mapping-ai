/**
 * Source registration for edge enrichment
 * Reuses Anushree's source table in Neon (claims-pilot branch)
 */
import crypto from 'crypto'

/**
 * Generate source ID from URL (same algorithm as enrich-claims.js)
 * src-{first 12 hex chars of SHA-256}
 */
export function srcId(url) {
  return 'src-' + crypto.createHash('sha256').update(url).digest('hex').slice(0, 12)
}

/**
 * Register a source in the Neon source table
 * Uses upsert pattern - safe to call multiple times for same URL
 */
export async function registerSource(client, sourceData) {
  const sid = srcId(sourceData.url)
  await client.query(
    `INSERT INTO source (source_id, url, title, source_type, date_published, author, cached_excerpt)
     VALUES ($1, $2, $3, $4, $5::date, $6, $7)
     ON CONFLICT (source_id) DO UPDATE SET
       title = COALESCE(EXCLUDED.title, source.title),
       source_type = COALESCE(EXCLUDED.source_type, source.source_type),
       date_published = COALESCE(EXCLUDED.date_published, source.date_published)`,
    [
      sid,
      sourceData.url,
      sourceData.title || null,
      sourceData.type || null,
      sourceData.date || null,
      sourceData.author || null,
      sourceData.excerpt || null,
    ]
  )
  return sid
}
