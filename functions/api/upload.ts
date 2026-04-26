/**
 * Upload endpoint — Cloudflare Pages Function port of api/upload.ts (Lambda).
 *
 * POST /api/upload (multipart/form-data)
 *
 * Accepts thumbnail image uploads for entities. Key differences from Lambda:
 *  - Uses R2 bucket binding (context.env.DATA_BUCKET) instead of S3 client
 *  - Public URL from env.THUMBNAIL_PUBLIC_URL instead of CloudFront domain
 *  - Web standard Request for multipart parsing (no custom parser needed)
 */
import type { Env } from './_shared/env.ts'
import { jsonResponse, optionsResponse } from './_shared/cors.ts'
import { getPool } from './_shared/db.ts'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const corsOptions = { methods: 'POST, OPTIONS', headers: 'Content-Type, X-Admin-Key' }

  if (request.method === 'OPTIONS') {
    return optionsResponse(request, corsOptions)
  }

  // Auth check
  const adminKey = request.headers.get('x-admin-key') || new URL(request.url).searchParams.get('key')
  if (adminKey !== env.ADMIN_KEY) {
    return jsonResponse({ error: 'Unauthorized' }, request, 401, corsOptions)
  }

  try {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return jsonResponse({ error: 'Expected multipart/form-data' }, request, 400, corsOptions)
    }

    // Use standard FormData API (available in Workers/Pages runtime)
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const entityType = (formData.get('type') as string)?.trim()
    const entityIdStr = (formData.get('id') as string)?.trim()

    if (!file || !entityType || !entityIdStr) {
      return jsonResponse({ error: 'Missing file, type, or id' }, request, 400, corsOptions)
    }

    const entityId = parseInt(entityIdStr, 10)
    if (!['person', 'organization'].includes(entityType) || isNaN(entityId)) {
      return jsonResponse({ error: 'Invalid type or id' }, request, 400, corsOptions)
    }

    if (file.size > MAX_SIZE) {
      return jsonResponse({ error: 'File too large (max 2MB)' }, request, 400, corsOptions)
    }

    // Determine file extension
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const ext = mimeToExt[file.type]
    if (!ext) {
      return jsonResponse({ error: 'Only JPG, PNG, or WebP allowed' }, request, 400, corsOptions)
    }

    const key = `thumbnails/${entityType}-${entityId}.${ext}`

    // Upload to R2 bucket
    const fileBuffer = await file.arrayBuffer()
    await env.DATA_BUCKET.put(key, fileBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=86400',
      },
    })

    // Build public URL
    const publicBase = env.THUMBNAIL_PUBLIC_URL || 'https://mapping-ai.org'
    const url = `${publicBase}/${key}`

    // Update entity in DB
    const pool = getPool(env.DATABASE_URL)
    const client = await pool.connect()
    try {
      await client.query(`UPDATE entity SET thumbnail_url = $1 WHERE id = $2 AND entity_type = $3`, [
        url,
        entityId,
        entityType,
      ])
    } finally {
      client.release()
    }

    return jsonResponse({ success: true, url }, request, 200, corsOptions)
  } catch (error) {
    console.error('Upload error:', error)
    return jsonResponse({ error: 'Upload failed' }, request, 500, corsOptions)
  }
}
