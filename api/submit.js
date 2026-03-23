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
    const LONG_LIMIT = 1000;
    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== 'string') continue;
      const limit = key === 'notes' ? LONG_LIMIT : SHORT_LIMIT;
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

      if (type === 'person') {
        await client.query(
          `INSERT INTO people (
            name, category, title, primary_org, other_orgs, location,
            regulatory_stance, capability_belief, influence_type, twitter,
            notes, submitter_email, submitted_at, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending')`,
          [
            data.name, data.category || null, data.title || null,
            data.primaryOrg || null, data.otherOrgs || null, data.location || null,
            data.regulatoryStance || null, data.capabilityBelief || null,
            data.influenceType || null, data.twitter || null,
            data.notes || null, data.submitterEmail || null, ts,
          ]
        );
      } else if (type === 'organization') {
        await client.query(
          `INSERT INTO organizations (
            name, category, website, location, funding_model,
            regulatory_stance, capability_belief, influence_type, twitter,
            notes, submitter_email, submitted_at, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending')`,
          [
            data.name, data.category || null, data.website || null,
            data.location || null, data.fundingModel || null,
            data.regulatoryStance || null, data.capabilityBelief || null,
            data.influenceType || null, data.twitter || null,
            data.notes || null, data.submitterEmail || null, ts,
          ]
        );
      } else if (type === 'resource') {
        await client.query(
          `INSERT INTO resources (
            title, author, resource_type, url, year, category,
            key_argument, notes, submitter_email, submitted_at, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')`,
          [
            data.title, data.author || null, data.resourceType || null,
            data.url || null, data.year || null, data.category || null,
            data.keyArgument || null, data.notes || null,
            data.submitterEmail || null, ts,
          ]
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
