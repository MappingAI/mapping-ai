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

  const object = await env.DATA_BUCKET.get(key)
  if (!object) {
    return new Response('Not found', { status: 404 })
  }

  const headers = new Headers({
    'Content-Type': 'video/mp4',
    'Cache-Control': 'public, max-age=86400',
    'Access-Control-Allow-Origin': '*',
    'Accept-Ranges': 'bytes',
  })

  // Handle range requests for video seeking
  const range = request.headers.get('Range')
  if (range && object.size) {
    const [, start, end] = range.match(/bytes=(\d+)-(\d*)/) || []
    const startByte = parseInt(start, 10)
    const endByte = end ? parseInt(end, 10) : object.size - 1

    headers.set('Content-Range', `bytes ${startByte}-${endByte}/${object.size}`)
    headers.set('Content-Length', String(endByte - startByte + 1))

    // R2 supports range requests natively
    const rangeObject = await env.DATA_BUCKET.get(key, {
      range: { offset: startByte, length: endByte - startByte + 1 },
    })

    if (!rangeObject) {
      return new Response('Not found', { status: 404 })
    }

    return new Response(rangeObject.body, { status: 206, headers })
  }

  if (object.size) {
    headers.set('Content-Length', String(object.size))
  }

  return new Response(object.body, { headers })
}
