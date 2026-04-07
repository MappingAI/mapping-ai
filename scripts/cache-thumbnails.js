/**
 * Cache thumbnails to S3/CloudFront
 *
 * Fetches logos (orgs) and photos (people) from external sources,
 * uploads them to S3, and updates entity.thumbnail_url with CloudFront URL.
 *
 * Run: node scripts/cache-thumbnails.js [--dry-run] [--type=org|person] [--limit=N]
 */

import pg from 'pg';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const s3 = new S3Client({ region: 'eu-west-2' });
const BUCKET = 'mapping-ai-website-561047280976';
const CF_DOMAIN = 'd1vsiezx2npkka.cloudfront.net'; // Main CloudFront distribution

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const TYPE_FILTER = args.find(a => a.startsWith('--type='))?.split('=')[1];
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

// Known org domains (fallback if website not available)
const ORG_DOMAINS = {
  'OpenAI': 'openai.com',
  'Anthropic': 'anthropic.com',
  'Google DeepMind': 'deepmind.google',
  'Meta AI': 'ai.meta.com',
  'xAI': 'x.ai',
  'Nvidia': 'nvidia.com',
  'Microsoft': 'microsoft.com',
  'Amazon': 'amazon.com',
  'Apple': 'apple.com',
  'Tesla': 'tesla.com',
};

/**
 * Extract domain from website URL or known mapping
 */
function getDomain(entity) {
  if (ORG_DOMAINS[entity.name]) return ORG_DOMAINS[entity.name];
  if (entity.website) {
    try {
      return new URL(entity.website).hostname.replace('www.', '');
    } catch { return null; }
  }
  return null;
}

/**
 * Fetch image from URL with timeout
 */
async function fetchImage(url, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MappingAI/1.0' }
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('image')) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    // Skip tiny images (likely placeholder/error icons)
    if (buffer.length < 500) return null;

    return { buffer, contentType };
  } catch (e) {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Check if object exists in S3
 */
async function s3Exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Upload image to S3
 */
async function uploadToS3(key, buffer, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable', // 1 year
  }));
  return `https://${CF_DOMAIN}/${key}`;
}

/**
 * Fetch and cache org logo
 */
async function cacheOrgLogo(entity) {
  const domain = getDomain(entity);
  if (!domain) return { status: 'skip', reason: 'no domain' };

  const key = `thumbnails/org-${entity.id}.png`;

  // Check if already cached
  if (await s3Exists(key)) {
    return { status: 'exists', url: `https://${CF_DOMAIN}/${key}` };
  }

  // Try Google Favicons (high-res)
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  const img = await fetchImage(faviconUrl);

  if (!img) return { status: 'fail', reason: 'fetch failed' };

  if (DRY_RUN) {
    return { status: 'dry-run', url: `https://${CF_DOMAIN}/${key}` };
  }

  const url = await uploadToS3(key, img.buffer, img.contentType);
  return { status: 'cached', url };
}

/**
 * Fetch and cache person photo from Wikipedia
 */
async function cachePersonPhoto(entity) {
  const key = `thumbnails/person-${entity.id}.jpg`;

  // Check if already cached
  if (await s3Exists(key)) {
    return { status: 'exists', url: `https://${CF_DOMAIN}/${key}` };
  }

  // Try Wikipedia API
  const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(entity.name)}`;

  try {
    const res = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'MappingAI/1.0' }
    });
    if (!res.ok) return { status: 'fail', reason: 'wiki api failed' };

    const data = await res.json();
    const thumbnailUrl = data.thumbnail?.source;
    if (!thumbnailUrl) return { status: 'skip', reason: 'no wiki thumbnail' };

    const img = await fetchImage(thumbnailUrl);
    if (!img) return { status: 'fail', reason: 'fetch failed' };

    if (DRY_RUN) {
      return { status: 'dry-run', url: `https://${CF_DOMAIN}/${key}` };
    }

    const url = await uploadToS3(key, img.buffer, img.contentType);
    return { status: 'cached', url };
  } catch (e) {
    return { status: 'fail', reason: e.message };
  }
}

/**
 * Update entity thumbnail_url in database
 */
async function updateThumbnailUrl(entityId, url) {
  if (DRY_RUN) return;
  await pool.query(
    'UPDATE entity SET thumbnail_url = $1 WHERE id = $2',
    [url, entityId]
  );
}

/**
 * Main
 */
async function main() {
  console.log('Caching thumbnails to S3...');
  if (DRY_RUN) console.log('  (dry run - no uploads or DB updates)\n');

  // Query entities without thumbnail_url
  let query = `
    SELECT id, entity_type, name, website
    FROM entity
    WHERE status = 'approved'
      AND thumbnail_url IS NULL
  `;

  if (TYPE_FILTER === 'org') {
    query += ` AND entity_type = 'organization'`;
  } else if (TYPE_FILTER === 'person') {
    query += ` AND entity_type = 'person'`;
  } else {
    query += ` AND entity_type IN ('organization', 'person')`;
  }

  query += ` ORDER BY id`;
  if (LIMIT > 0) query += ` LIMIT ${LIMIT}`;

  const { rows: entities } = await pool.query(query);
  console.log(`Found ${entities.length} entities without thumbnails\n`);

  const stats = { cached: 0, exists: 0, skip: 0, fail: 0 };

  for (const entity of entities) {
    const isOrg = entity.entity_type === 'organization';
    const result = isOrg
      ? await cacheOrgLogo(entity)
      : await cachePersonPhoto(entity);

    const icon = isOrg ? '🏢' : '👤';
    const statusIcon = {
      'cached': '✓',
      'exists': '•',
      'skip': '○',
      'fail': '✗',
      'dry-run': '~'
    }[result.status] || '?';

    console.log(`${statusIcon} ${icon} ${entity.name.substring(0, 40).padEnd(40)} ${result.status}${result.reason ? ` (${result.reason})` : ''}`);

    // Update DB if we got a URL
    if (result.url && (result.status === 'cached' || result.status === 'exists')) {
      await updateThumbnailUrl(entity.id, result.url);
      stats[result.status]++;
    } else {
      stats[result.status] = (stats[result.status] || 0) + 1;
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n--- Summary ---');
  console.log(`Cached:  ${stats.cached}`);
  console.log(`Exists:  ${stats.exists}`);
  console.log(`Skipped: ${stats.skip}`);
  console.log(`Failed:  ${stats.fail}`);

  await pool.end();
}

main().catch(console.error);
