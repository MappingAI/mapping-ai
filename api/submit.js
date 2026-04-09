import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  options: '-c statement_timeout=15000',
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Contributor-Key',
};

// Contributor key format: mak_ + 32 hex chars
const CONTRIBUTOR_KEY_REGEX = /^mak_[a-f0-9]{32}$/;

// Anonymous IP rate limiting (in-memory, best-effort across Lambda warm instances)
// Limit: 10 submissions per IP per hour for anonymous (no contributor key) requests
const ANON_RATE_LIMIT = 10;
const ANON_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const anonIpCounts = new Map(); // ip → { count, windowStart }

function checkAnonRateLimit(ip) {
  if (!ip) return false;
  const now = Date.now();
  const entry = anonIpCounts.get(ip);
  if (!entry || now - entry.windowStart > ANON_RATE_WINDOW_MS) {
    anonIpCounts.set(ip, { count: 1, windowStart: now });
    return false; // not rate limited
  }
  entry.count++;
  return entry.count > ANON_RATE_LIMIT;
}

// Ordinal score mappings — values not present get NULL score (mixed/unclear/other)
const STANCE_SCORES = {
  'Accelerate': 1, 'Light-touch': 2, 'Targeted': 3, 'Moderate': 4,
  'Restrictive': 5, 'Precautionary': 6, 'Nationalize': 7,
};
const TIMELINE_SCORES = {
  'Already here': 1, '2-3 years': 2, '5-10 years': 3,
  '10-25 years': 4, '25+ years or never': 5,
};
const RISK_SCORES = {
  'Overstated': 1, 'Manageable': 2, 'Serious': 3, 'Catastrophic': 4, 'Existential': 5,
};

// Normalize submitter_relationship to the canonical 3-value set
function normalizeRelationship(raw) {
  if (!raw) return null;
  if (raw === 'self') return 'self';
  if (raw === 'connector' || raw === 'close_relation') return 'connector';
  return 'external';
}

export const handler = async (event) => {
  const method = event.requestContext.http.method;

  if (method === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (method !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    if (!event.body) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid request body' }) };
    }

    const { type, timestamp, data, _hp } = JSON.parse(event.body);

    // Honeypot
    if (_hp) {
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, message: 'Submission received' }) };
    }

    if (!type || !data) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing required fields' }) };
    }
    if (!['person', 'organization', 'resource'].includes(type)) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid submission type' }) };
    }
    if (type === 'resource' && !data.title) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing required field: title' }) };
    }
    if ((type === 'person' || type === 'organization') && !data.name) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing required field: name' }) };
    }

    // Field length limits
    const SHORT_LIMIT = 200;
    const LONG_LIMIT = 2000;
    const longFields = new Set(['notes', 'notesHtml', 'keyArgument', 'threatModels', 'regulatoryStanceDetail']);
    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== 'string') continue;
      const limit = longFields.has(key) ? LONG_LIMIT : SHORT_LIMIT;
      if (value.length > limit) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: `Field "${key}" exceeds maximum length` }) };
      }
    }

    // Contributor key validation (optional - for AI agent submissions)
    const contributorKey = event.headers?.['x-contributor-key'];
    let contributorKeyId = null;
    let submissionId = null;

    // Format validation before DB connection
    if (contributorKey && !CONTRIBUTOR_KEY_REGEX.test(contributorKey)) {
      return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid contributor key format' }) };
    }

    // Anonymous IP rate limiting (no contributor key)
    if (!contributorKey) {
      const clientIp = event.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
        || event.requestContext?.http?.sourceIp;
      if (checkAnonRateLimit(clientIp)) {
        return { statusCode: 429, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Too many submissions. Please try again later.' }) };
      }
    }

    const client = await pool.connect();
    try {
      // Validate contributor key if provided
      if (contributorKey) {
        const keyHash = crypto.createHash('sha256').update(contributorKey).digest('hex');

        // Check key exists and is not revoked
        const keyResult = await client.query(
          'SELECT id, name, daily_limit FROM contributor_keys WHERE key_hash = $1 AND revoked_at IS NULL',
          [keyHash]
        );

        if (keyResult.rows.length === 0) {
          client.release();
          return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid or revoked contributor key' }) };
        }

        contributorKeyId = keyResult.rows[0].id;
        const dailyLimit = keyResult.rows[0].daily_limit || 20;

        // Rate limiting: check submissions in last 24 hours
        const rateResult = await client.query(
          `SELECT COUNT(*) AS count FROM submission
           WHERE contributor_key_id = $1 AND submitted_at > NOW() - INTERVAL '24 hours'`,
          [contributorKeyId]
        );

        if (parseInt(rateResult.rows[0].count, 10) >= dailyLimit) {
          client.release();
          return { statusCode: 429, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Daily submission limit reached', limit: dailyLimit }) };
        }
      }

      const ts = timestamp || new Date().toISOString();
      const entityId = data.entityId ? parseInt(data.entityId, 10) : null;
      const relationship = normalizeRelationship(data.submitterRelationship);

      // Compute belief scores (NULL for unscored responses like mixed/unclear/other)
      const stanceScore  = STANCE_SCORES[data.regulatoryStance]  ?? null;
      const timelineScore = TIMELINE_SCORES[data.agiTimeline]    ?? null;
      const riskScore    = RISK_SCORES[data.aiRiskLevel]          ?? null;

      const notesHtml = data.notesHtml || null;
      const notesMentions = data.notesMentions ? JSON.parse(data.notesMentions) : null;

      const result = await client.query(
        `INSERT INTO submission (
          entity_type, entity_id,
          submitter_email, submitter_relationship, contributor_key_id,
          name, title, category, other_categories, primary_org, other_orgs,
          website, funding_model, parent_org_id,
          resource_title, resource_category, resource_author, resource_type,
          resource_url, resource_year, resource_key_argument,
          location, influence_type, twitter, bluesky, notes, notes_html, notes_mentions,
          belief_regulatory_stance, belief_regulatory_stance_score,
          belief_regulatory_stance_detail, belief_evidence_source,
          belief_agi_timeline, belief_agi_timeline_score,
          belief_ai_risk, belief_ai_risk_score,
          belief_threat_models,
          submitted_at, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21,
          $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35, $36, $37,
          $38, 'pending'
        ) RETURNING id`,
        [
          type, entityId,
          data.submitterEmail || null, relationship, contributorKeyId,
          // person + org
          data.name   || null,
          data.title  || null,
          data.category || null,
          data.otherCategories || null,
          data.primaryOrg  || null,
          data.otherOrgs   || null,
          // org
          data.website     || null,
          data.fundingModel || null,
          data.parentOrgId ? parseInt(data.parentOrgId, 10) : null,
          // resource
          type === 'resource' ? (data.title || null) : null,   // resource_title
          type === 'resource' ? (data.category || null) : null, // resource_category
          data.author      || null,
          data.resourceType || null,
          data.url         || null,
          data.year        || null,
          data.keyArgument || null,
          // shared
          data.location    || null,
          data.influenceType || null,
          data.twitter     || null,
          data.bluesky     || null,
          data.notes       || null,
          notesHtml,
          notesMentions ? JSON.stringify(notesMentions) : null,
          // belief
          data.regulatoryStance       || null, stanceScore,
          data.regulatoryStanceDetail || null,
          data.evidenceSource         || null,
          data.agiTimeline            || null, timelineScore,
          data.aiRiskLevel            || null, riskScore,
          data.threatModels           || null,
          ts,
        ]
      );

      submissionId = result.rows[0].id;

    } finally {
      client.release();
    }

    // Fire-and-forget: LLM quality review runs after response is sent
    // Uses a separate DB connection so the main client is already released
    if (process.env.ANTHROPIC_API_KEY && submissionId) {
      (async () => {
        try {
          const reviewPayload = {
            name: data.name || data.title,
            type,
            regulatoryStance: data.regulatoryStance,
            agiTimeline: data.agiTimeline,
            aiRiskLevel: data.aiRiskLevel,
            notes: data.notes,
          };
          const reviewPrompt = `Review this crowdsourced submission to a U.S. AI policy stakeholder database. Rate its quality and flag issues.
Entity type: ${type}
Data: ${JSON.stringify(reviewPayload)}
Respond in JSON only: {"quality": 1-5, "flags": ["spam"|"low-quality"|"duplicate"|"offensive"|"incomplete"], "notes": "brief explanation"}`;

          const llmRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 300,
              messages: [{ role: 'user', content: reviewPrompt }],
            }),
            signal: AbortSignal.timeout(5000),
          });

          if (llmRes.ok) {
            const llmData = await llmRes.json();
            const reviewText = llmData.content?.[0]?.text;
            let review;
            try {
              const cleaned = reviewText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
              review = JSON.parse(cleaned);
            } catch { review = { raw: reviewText }; }
            const reviewClient = await pool.connect();
            try {
              await reviewClient.query(
                'UPDATE submission SET llm_review = $1 WHERE id = $2',
                [JSON.stringify(review), submissionId]
              );
            } finally {
              reviewClient.release();
            }
          }
        } catch (e) {
          console.warn('LLM review failed (non-critical):', e.message);
        }
      })();
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, submissionId, message: 'Submission received and pending review' }),
    };

  } catch (error) {
    console.error('Submission error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
