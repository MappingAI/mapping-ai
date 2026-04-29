/**
 * Resolve thumbnail URLs for all entities
 *
 * For orgs: Computes Google Favicons URL (deterministic, no API call)
 * For people: Fetches Wikipedia API to get thumbnail URL
 *
 * Stores URLs directly in entity.thumbnail_url - no S3 caching needed.
 * This eliminates runtime API calls when loading the map.
 *
 * Run: node scripts/resolve-thumbnails.js [--dry-run] [--type=org|person] [--limit=N] [--retry-failed]
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const RETRY_FAILED = args.includes('--retry-failed');
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
  'Cohere': 'cohere.com',
  'Stability AI': 'stability.ai',
  'Inflection AI': 'inflection.ai',
  'Mistral AI': 'mistral.ai',
  'Hugging Face': 'huggingface.co',
  'Scale AI': 'scale.com',
  'Databricks': 'databricks.com',
  'Palantir': 'palantir.com',
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
 * Resolve org logo URL (Google Favicons - deterministic, no API call)
 */
function resolveOrgUrl(entity) {
  const domain = getDomain(entity);
  if (!domain) return { status: 'skip', reason: 'no domain' };

  // Google Favicons URL is deterministic
  const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  return { status: 'resolved', url };
}

/**
 * Resolve person photo URL from Wikipedia (requires API call)
 */
async function resolvePersonUrl(entity, retryCount = 0) {
  const maxRetries = 2;

  // Try Wikipedia API
  const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(entity.name)}`;

  try {
    const res = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'MappingAI/1.0 (https://mapping-ai.org; contact@mapping-ai.org)' }
    });

    if (res.status === 429 && retryCount < maxRetries) {
      // Rate limited - wait and retry
      await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
      return resolvePersonUrl(entity, retryCount + 1);
    }

    if (!res.ok) return { status: 'fail', reason: `wiki api ${res.status}` };

    const data = await res.json();

    // Handle disambiguation pages
    if (data.type === 'disambiguation') {
      return { status: 'skip', reason: 'disambiguation page' };
    }

    const thumbnailUrl = data.thumbnail?.source;
    if (!thumbnailUrl) return { status: 'skip', reason: 'no wiki thumbnail' };

    // Return the Wikipedia thumbnail URL directly
    return { status: 'resolved', url: thumbnailUrl };

  } catch (e) {
    if (retryCount < maxRetries) {
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return resolvePersonUrl(entity, retryCount + 1);
    }
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
  console.log('Resolving thumbnail URLs...');
  if (DRY_RUN) console.log('  (dry run - no DB updates)\n');
  if (RETRY_FAILED) console.log('  (retrying previously failed entities)\n');

  // Query entities needing thumbnails
  let query = `
    SELECT id, entity_type, name, website, thumbnail_url
    FROM entity
    WHERE status = 'approved'
  `;

  if (RETRY_FAILED) {
    // Retry entities that previously failed (have no thumbnail)
    query += ` AND thumbnail_url IS NULL`;
  } else {
    // Only process entities without any thumbnail_url
    query += ` AND thumbnail_url IS NULL`;
  }

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
  console.log(`Found ${entities.length} entities to process\n`);

  const stats = { resolved: 0, skip: 0, fail: 0 };

  for (const entity of entities) {
    const isOrg = entity.entity_type === 'organization';
    const result = isOrg
      ? resolveOrgUrl(entity)
      : await resolvePersonUrl(entity);

    const icon = isOrg ? '🏢' : '👤';
    const statusIcon = {
      'resolved': '✓',
      'skip': '○',
      'fail': '✗',
    }[result.status] || '?';

    console.log(`${statusIcon} ${icon} ${entity.name.substring(0, 40).padEnd(40)} ${result.status}${result.reason ? ` (${result.reason})` : ''}`);

    // Update DB if we got a URL
    if (result.url && result.status === 'resolved') {
      await updateThumbnailUrl(entity.id, result.url);
      stats.resolved++;
    } else {
      stats[result.status] = (stats[result.status] || 0) + 1;
    }

    // Delay between Wikipedia API calls (orgs don't need delay - no API call)
    if (!isOrg) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Resolved: ${stats.resolved}`);
  console.log(`Skipped:  ${stats.skip}`);
  console.log(`Failed:   ${stats.fail}`);

  await pool.end();
}

main().catch(console.error);
