import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';
import { getCorsHeaders } from './cors.js';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  options: '-c statement_timeout=30000',
});

const s3 = new S3Client({});
const BUCKET = process.env.THUMBNAIL_BUCKET;
const CF_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
const ADMIN_KEY = process.env.ADMIN_KEY;
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export const handler = async (event) => {
  const CORS_HEADERS = getCorsHeaders(event, { methods: 'POST, OPTIONS', headers: 'Content-Type, X-Admin-Key' });
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  // Auth check
  const adminKey = event.headers?.['x-admin-key'] || event.queryStringParameters?.key;
  if (adminKey !== ADMIN_KEY) {
    return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const contentType = event.headers?.['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Expected multipart/form-data' }) };
    }

    // Parse multipart boundary
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing boundary' }) };
    }

    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body);

    // Simple multipart parser
    const parts = parseMultipart(body, boundary);
    const filePart = parts.find(p => p.filename);
    const typePart = parts.find(p => p.name === 'type');
    const idPart = parts.find(p => p.name === 'id');

    if (!filePart || !typePart || !idPart) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing file, type, or id' }) };
    }

    const entityType = typePart.data.toString().trim();
    const entityId = parseInt(idPart.data.toString().trim(), 10);

    if (!['person', 'organization'].includes(entityType) || isNaN(entityId)) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid type or id' }) };
    }

    if (filePart.data.length > MAX_SIZE) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'File too large (max 2MB)' }) };
    }

    // Determine file extension from content type
    const mimeToExt = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const ext = mimeToExt[filePart.contentType];
    if (!ext) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Only JPG, PNG, or WebP allowed' }) };
    }

    const key = `thumbnails/${entityType}-${entityId}.${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: filePart.data,
      ContentType: filePart.contentType,
      CacheControl: 'public, max-age=86400',
    }));

    const url = `https://${CF_DOMAIN}/${key}`;

    // Update entity in DB
    const client = await pool.connect();
    try {
      await client.query(`UPDATE entity SET thumbnail_url = $1 WHERE id = $2 AND entity_type = $3`, [url, entityId, entityType]);
    } finally {
      client.release();
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, url }),
    };
  } catch (error) {
    console.error('Upload error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Upload failed' }) };
  }
};

// Minimal multipart parser
function parseMultipart(body, boundary) {
  const parts = [];
  const sep = Buffer.from(`--${boundary}`);
  let start = body.indexOf(sep) + sep.length;

  while (start < body.length) {
    const end = body.indexOf(sep, start);
    if (end === -1) break;

    const part = body.slice(start, end);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) { start = end + sep.length; continue; }

    const headers = part.slice(0, headerEnd).toString();
    const data = part.slice(headerEnd + 4, part.length - 2); // strip trailing \r\n

    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const ctMatch = headers.match(/Content-Type:\s*(\S+)/i);

    parts.push({
      name: nameMatch?.[1],
      filename: filenameMatch?.[1],
      contentType: ctMatch?.[1] || 'application/octet-stream',
      data,
    });

    start = end + sep.length;
  }

  return parts;
}
