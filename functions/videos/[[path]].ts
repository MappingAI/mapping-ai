/**
 * Serves guide videos from R2.
 *
 * Catch-all route: /videos/<filename> → R2 key "videos/<filename>"
 * Returns the video with proper content-type and cache headers.
 */

interface Env {
  DATA_BUCKET: R2Bucket
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { params, env, request } = context
  const pathSegments = Array.isArray(params.path) ? params.path : [params.path]
  const key = `videos/${pathSegments.join('/')}`

  const headers = new Headers({
    'Content-Type': 'video/mp4',
    'Cache-Control': 'public, max-age=86400',
    'Access-Control-Allow-Origin': '*',
    'Accept-Ranges': 'bytes',
  })

  // Handle range requests for video seeking (avoids fetching full object)
  const range = request.headers.get('Range')
  if (range) {
    const head = await env.DATA_BUCKET.head(key)
    if (!head) {
      return new Response('Not found', { status: 404 })
    }

    const match = range.match(/bytes=(\d+)-(\d*)/)
    if (!match) {
      return new Response('Bad range', { status: 416 })
    }
    const startByte = parseInt(match[1], 10)
    const endByte = match[2] ? parseInt(match[2], 10) : head.size - 1

    headers.set('Content-Range', `bytes ${startByte}-${endByte}/${head.size}`)
    headers.set('Content-Length', String(endByte - startByte + 1))

    const rangeObject = await env.DATA_BUCKET.get(key, {
      range: { offset: startByte, length: endByte - startByte + 1 },
    })

    if (!rangeObject) {
      return new Response('Not found', { status: 404 })
    }

    return new Response(rangeObject.body, { status: 206, headers })
  }

  const object = await env.DATA_BUCKET.get(key)
  if (!object) {
    return new Response('Not found', { status: 404 })
  }

  if (object.size) {
    headers.set('Content-Length', String(object.size))
  }

  return new Response(object.body, { headers })
}
