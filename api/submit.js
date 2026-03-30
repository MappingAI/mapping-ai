import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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

    const client = await pool.connect();
    try {
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
          submitter_email, submitter_relationship,
          name, title, category, primary_org, other_orgs,
          website, funding_model,
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
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, $24, $25,
          $26, $27, $28, $29, $30, $31, $32, $33, $34,
          $35, 'pending'
        ) RETURNING id`,
        [
          type, entityId,
          data.submitterEmail || null, relationship,
          // person + org
          data.name   || null,
          data.title  || null,
          data.category || null,
          data.primaryOrg  || null,
          data.otherOrgs   || null,
          // org
          data.website     || null,
          data.fundingModel || null,
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

      const submissionId = result.rows[0].id;

      // Non-critical: LLM quality review via Claude Haiku
      if (process.env.ANTHROPIC_API_KEY) {
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
            await client.query(
              'UPDATE submission SET llm_review = $1 WHERE id = $2',
              [JSON.stringify(review), submissionId]
            );
          }
        } catch (e) {
          console.warn('LLM review failed (non-critical):', e.message);
        }
      }

    } finally {
      client.release();
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, message: 'Submission received' }),
    };

  } catch (error) {
    console.error('Submission error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
