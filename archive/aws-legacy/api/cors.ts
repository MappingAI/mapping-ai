// Shared CORS origin allowlist — kept in sync with template.yaml CorsConfiguration.AllowOrigins.
// Lambda handlers must use this instead of Access-Control-Allow-Origin: *.
//
// Drift with template.yaml is a silent bug: API Gateway will 204 the preflight,
// but the handler's response Origin won't match and the browser blocks the real
// request. Keep the two lists aligned when adding/removing entries.

import type { APIGatewayProxyEventV2 } from 'aws-lambda'

const ALLOWED_ORIGINS = new Set([
  'https://mapping-ai.org',
  'https://www.mapping-ai.org',
  'https://aimapping.org',
  'https://www.aimapping.org',
  'https://mapping-ai.pages.dev',
  // S3 bucket direct + CloudFront default domain — used by ops tooling and
  // direct-S3 smoke checks. If the bucket or distribution changes, update both
  // here and in template.yaml.
  'https://mapping-ai-website-561047280976.s3.eu-west-2.amazonaws.com',
  'https://d3fo5mm9fktie3.cloudfront.net',
  'http://localhost:3000',
  'http://localhost:4000',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://localhost:5500',
  'http://localhost:8000',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5500',
])

// Cloudflare Pages preview URLs follow `https://<hash>.mapping-ai.pages.dev`.
// template.yaml's AllowOrigins only lists the prod alias; API Gateway's CORS
// has a `*` fallback so preflights succeed, but the Lambda echo-back has to
// match this pattern to keep preview branches usable from the browser.
const PAGES_PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.mapping-ai\.pages\.dev$/

function isAllowed(origin: string): boolean {
  return ALLOWED_ORIGINS.has(origin) || PAGES_PREVIEW_RE.test(origin)
}

export interface CorsHeadersOptions {
  methods?: string
  headers?: string
}

/**
 * Build CORS response headers with origin validation.
 * If the request Origin is in the allowlist, reflect it back.
 * If not (or no Origin header, e.g. direct curl), omit Access-Control-Allow-Origin.
 * Browsers enforce CORS; non-browser clients ignore it.
 */
export function getCorsHeaders(
  event: Pick<APIGatewayProxyEventV2, 'headers'>,
  { methods = 'GET, OPTIONS', headers = 'Content-Type' }: CorsHeadersOptions = {},
): Record<string, string> {
  const origin = event.headers?.origin
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': headers,
    'X-Content-Type-Options': 'nosniff',
  }
  if (origin && isAllowed(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin
    corsHeaders['Vary'] = 'Origin'
  }
  return corsHeaders
}
