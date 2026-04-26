interface Env {
  DATA_BUCKET: R2Bucket
}

const ALLOWED_FILES = new Set(['claims-detail.json', 'agi-definitions.json'])

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const file = context.params.file as string

  if (!ALLOWED_FILES.has(file)) {
    return new Response('Not Found', { status: 404 })
  }

  const object = await context.env.DATA_BUCKET.get(file)

  if (object === null) {
    return new Response('Not Found', { status: 404 })
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)

  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'public, max-age=300, s-maxage=3600')
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json; charset=utf-8')
  }

  return new Response(object.body, { headers })
}
