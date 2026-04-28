/**
 * Serves entity thumbnails from R2.
 *
 * Catch-all route: /thumbnails/<anything> → R2 key "thumbnails/<anything>"
 * Returns the image with its original content-type and a 24-hour cache header.
 */

interface Env {
  DATA_BUCKET: R2Bucket
}

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { params, env } = context
  const pathSegments = Array.isArray(params.path) ? params.path : [params.path]
  const key = `thumbnails/${pathSegments.join('/')}`

  const object = await env.DATA_BUCKET.get(key)
  if (!object) {
    return new Response('Not found', { status: 404 })
  }

  const ext = key.substring(key.lastIndexOf('.')).toLowerCase()
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'

  return new Response(object.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
