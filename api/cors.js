// Shared CORS origin allowlist — matches template.yaml CorsConfiguration.AllowOrigins
// Lambda handlers must use this instead of Access-Control-Allow-Origin: *

const ALLOWED_ORIGINS = new Set([
  'https://mapping-ai.org',
  'https://www.mapping-ai.org',
  'https://aimapping.org',
  'https://www.aimapping.org',
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
]);

/**
 * Build CORS response headers with origin validation.
 * If the request Origin is in the allowlist, reflect it back.
 * If not (or no Origin header, e.g. direct curl), omit Access-Control-Allow-Origin.
 * Browsers enforce CORS; non-browser clients ignore it.
 */
export function getCorsHeaders(event, { methods = 'GET, OPTIONS', headers = 'Content-Type' } = {}) {
  const origin = event?.headers?.origin;
  const corsHeaders = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': headers,
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Vary'] = 'Origin';
  }
  return corsHeaders;
}
