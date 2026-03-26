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

export const handler = async (event) => {
  const method = event.requestContext.http.method;

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (method !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid request body' }),
      };
    }

    const { type, timestamp, data, _hp } = JSON.parse(event.body);

    // Honeypot: humans leave this blank; bots fill it in
    if (_hp) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, message: 'Submission received' }),
      };
    }

    if (!type || !data) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    if (!['person', 'organization', 'resource'].includes(type)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid submission type' }),
      };
    }

    if ((type === 'person' || type === 'organization') && !data.name) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing required field: name' }),
      };
    }
    if (type === 'resource' && !data.title) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing required field: title' }),
      };
    }

    const SHORT_LIMIT = 200;
    const LONG_LIMIT = 2000;
    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== 'string') continue;
      const limit = ['notes', 'notesHtml', 'keyArgument', 'threatModels', 'threatModelsDetail', 'regulatoryStanceDetail'].includes(key) ? LONG_LIMIT : SHORT_LIMIT;
      if (value.length > limit) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: `Field "${key}" exceeds maximum length` }),
        };
      }
    }

    const client = await pool.connect();
    try {
      const ts = timestamp || new Date().toISOString();

      // Extract entity_id if this is an update to an existing entity
      const entityId = data.entityId ? parseInt(data.entityId, 10) : null;

      // Extract TipTap notes data
      const notesHtml = data.notesHtml || null;
      const notesMentions = data.notesMentions ? JSON.parse(data.notesMentions) : null;

      // Store the full submission in the submissions table
      const submissionData = { ...data };
      delete submissionData.entityId;
      delete submissionData.notesHtml;
      delete submissionData.notesMentions;
      delete submissionData.submitterEmail;
      delete submissionData.submitterRelationship;

      const submissionResult = await client.query(
        `INSERT INTO submissions (entity_type, entity_id, data, submitter_email, submitter_relationship,
          is_self_submission, notes_html, notes_mentions, submitted_at, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
        RETURNING id`,
        [
          type, entityId, JSON.stringify(submissionData),
          data.submitterEmail || null, data.submitterRelationship || null,
          data.submitterRelationship === 'self' || false,
          notesHtml, notesMentions ? JSON.stringify(notesMentions) : null, ts,
        ]
      );

      // Also insert into the entity table (as pending) for backward compatibility
      if (type === 'person') {
        await client.query(
          `INSERT INTO people (
            name, category, title, primary_org, other_orgs, location,
            regulatory_stance, regulatory_stance_detail, evidence_source,
            agi_timeline, ai_risk_level,
            threat_models, threat_models_detail, influence_type,
            twitter, bluesky,
            notes, submitter_email, submitter_relationship, submitted_at, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'pending')
          RETURNING id`,
          [
            data.name, data.category || null, data.title || null,
            data.primaryOrg || null, data.otherOrgs || null, data.location || null,
            data.regulatoryStance || null, data.regulatoryStanceDetail || null,
            data.evidenceSource || null,
            data.agiTimeline || null, data.aiRiskLevel || null,
            data.threatModels || null, data.threatModelsDetail || null,
            data.influenceType || null,
            data.twitter || null, data.bluesky || null,
            data.notes || null, data.submitterEmail || null,
            data.submitterRelationship || null, ts,
          ]
        );

        // If affiliated org IDs provided, store in person_organizations (on approval)
        if (data.affiliatedOrgIds && Array.isArray(data.affiliatedOrgIds)) {
          // Store in submission data for admin review; actual linking happens on approval
        }
      } else if (type === 'organization') {
        await client.query(
          `INSERT INTO organizations (
            name, category, website, location, funding_model,
            regulatory_stance, regulatory_stance_detail, evidence_source,
            agi_timeline, ai_risk_level,
            threat_models, threat_models_detail, influence_type,
            twitter, bluesky,
            notes, parent_org_id, submitter_email, submitter_relationship,
            last_verified, submitted_at, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'pending')`,
          [
            data.name, data.category || null, data.website || null,
            data.location || null, data.fundingModel || null,
            data.regulatoryStance || null, data.regulatoryStanceDetail || null,
            data.evidenceSource || null,
            data.agiTimeline || null, data.aiRiskLevel || null,
            data.threatModels || null, data.threatModelsDetail || null,
            data.influenceType || null,
            data.twitter || null, data.bluesky || null,
            data.notes || null, data.parentOrgId ? parseInt(data.parentOrgId, 10) : null,
            data.submitterEmail || null, data.submitterRelationship || null,
            data.lastVerified || null, ts,
          ]
        );
      } else if (type === 'resource') {
        await client.query(
          `INSERT INTO resources (
            title, author, resource_type, url, year, category,
            key_argument, notes, submitter_email, submitter_relationship, submitted_at, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')`,
          [
            data.title, data.author || null, data.resourceType || null,
            data.url || null, data.year || null, data.category || null,
            data.keyArgument || null, data.notes || null,
            data.submitterEmail || null, data.submitterRelationship || null, ts,
          ]
        );
      }

      // If TipTap mentions exist, create relationship entries (pending review)
      if (notesMentions && Array.isArray(notesMentions)) {
        for (const mention of notesMentions) {
          if (mention.type && mention.id) {
            await client.query(
              `INSERT INTO relationships (source_type, source_id, target_type, target_id, relationship_type, created_by)
              VALUES ($1, $2, $3, $4, 'mentioned', 'tiptap_mention')
              ON CONFLICT DO NOTHING`,
              [type, submissionResult.rows[0].id, mention.type, parseInt(mention.id, 10)]
            );
          }
        }
      }

      // If this is an update to existing entity, increment submission_count
      if (entityId) {
        const table = type === 'person' ? 'people' : type === 'organization' ? 'organizations' : 'resources';
        await client.query(
          `UPDATE ${table} SET submission_count = submission_count + 1 WHERE id = $1`,
          [entityId]
        );
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
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
