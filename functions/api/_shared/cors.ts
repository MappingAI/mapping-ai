/**
 * CORS origin allowlist for Cloudflare Pages Functions.
 *
 * Mirrors the Lambda cors.ts allowlist. When adding or removing origins,
 * update both files until the Lambda handlers are fully retired.
 */

const ALLOWED_ORIGINS = new Set([
  'https://mapping-ai.org',
  'https://www.mapping-ai.org',
  'https://aimapping.org',
  'https://www.aimapping.org',
  'https://mapping-ai.pages.dev',
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

// Cloudflare Pages preview URLs: https://<hash>.mapping-ai.pages.dev
const PAGES_PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.mapping-ai\.pages\.dev$/

function isAllowed(origin: string): boolean {
  return ALLOWED_ORIGINS.has(origin) || PAGES_PREVIEW_RE.test(origin)
}

export interface CorsOptions {
  methods?: string
  headers?: string
}

/**
 * Build CORS response headers with origin validation.
 * If the request Origin is in the allowlist, reflect it back.
 */
export function getCorsHeaders(
  request: Request,
  { methods = 'GET, OPTIONS', headers = 'Content-Type' }: CorsOptions = {},
): Record<string, string> {
  const origin = request.headers.get('origin')
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

/** Shorthand for a JSON response with CORS headers. */
export function jsonResponse(body: unknown, request: Request, status = 200, corsOptions?: CorsOptions): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(request, corsOptions),
    },
  })
}

/** Shorthand for a CORS preflight (OPTIONS) response. */
export function optionsResponse(request: Request, corsOptions?: CorsOptions): Response {
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(request, corsOptions),
  })
}
