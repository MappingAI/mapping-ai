/**
 * Cloudflare Pages environment bindings.
 *
 * These are set in the Cloudflare dashboard (Settings > Environment Variables)
 * or in wrangler.toml for local dev. R2 buckets are configured as bindings.
 */
export interface Env {
  // R2 bucket for map-data.json, thumbnails, etc.
  DATA_BUCKET: R2Bucket

  // Postgres connection (Neon)
  DATABASE_URL: string

  // Admin API key
  ADMIN_KEY: string

  // Anthropic API key (for LLM review + semantic search)
  ANTHROPIC_API_KEY?: string
  ANTHROPIC_SEMANTIC_SEARCH_KEY?: string

  // CloudFront domain for thumbnail URLs (legacy, replaced by R2 public URL)
  THUMBNAIL_PUBLIC_URL?: string
}
