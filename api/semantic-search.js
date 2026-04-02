import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  options: '-c statement_timeout=10000',
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export const handler = async (event) => {
  const method = event.requestContext.http.method;

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (method !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { q } = event.queryStringParameters || {};

    if (!q || q.trim().length < 3) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Query must be at least 3 characters' }),
      };
    }

    const query = q.trim();

    if (!ANTHROPIC_API_KEY) {
      return {
        statusCode: 503,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'AI search not configured' }),
      };
    }

    // Fetch all entity names from database for context
    const client = await pool.connect();
    let entityContext;
    try {
      const result = await client.query(`
        SELECT entity_type, name, category, title, primary_org,
               belief_regulatory_stance AS regulatory_stance,
               belief_agi_timeline AS agi_timeline,
               belief_ai_risk AS ai_risk,
               resource_title, resource_category
        FROM entity
        WHERE status = 'approved'
        ORDER BY name
      `);

      // Build context for LLM - group by type
      const people = result.rows
        .filter(r => r.entity_type === 'person')
        .map(r => `- ${r.name} (${r.category || 'unknown role'}${r.primary_org ? ', ' + r.primary_org : ''}${r.regulatory_stance ? ', stance: ' + r.regulatory_stance : ''})`);

      const orgs = result.rows
        .filter(r => r.entity_type === 'organization')
        .map(r => `- ${r.name} (${r.category || 'unknown sector'}${r.regulatory_stance ? ', stance: ' + r.regulatory_stance : ''})`);

      const resources = result.rows
        .filter(r => r.entity_type === 'resource')
        .map(r => `- ${r.resource_title || r.name} (${r.resource_category || 'resource'})`);

      entityContext = `
PEOPLE (${people.length}):
${people.join('\n')}

ORGANIZATIONS (${orgs.length}):
${orgs.join('\n')}

RESOURCES (${resources.length}):
${resources.join('\n')}
      `.trim();

    } finally {
      client.release();
    }

    // Call Claude Haiku for semantic matching
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are helping search a database of AI policy stakeholders. Given a natural language query, return the names of entities that match.

QUERY: "${query}"

Here are all the entities in the database:

${entityContext}

Return a JSON object with:
- "names": array of entity names that match the query (exact names from the list above)
- "explanation": brief explanation of why these match (1 sentence)

Only return entities that genuinely match the query intent. Be selective - it's better to return fewer highly relevant matches than many weak ones. Return at most 30 matches.

For stance-related queries:
- "pro-regulation", "cautious", "wants oversight" -> look for Restrictive, Precautionary, Moderate stances
- "against regulation", "accelerationist", "e/acc" -> look for Accelerate, Light-touch stances
- "safety-focused" -> AI Safety orgs, safety researchers

For role queries:
- "researchers" -> people with Researcher, Academic roles
- "executives", "leaders" -> people with Executive role
- "politicians", "policymakers" -> people with Policymaker role

For affiliation queries:
- "from OpenAI", "at Anthropic" -> match the org name in primary_org

Respond ONLY with valid JSON, no other text.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'AI search temporarily unavailable' }),
      };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    // Parse JSON from response
    let parsed;
    try {
      // Handle potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('Failed to parse LLM response:', content);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Failed to parse AI response', names: [] }),
      };
    }

    // Validate names against actual entity list to prevent hallucinations
    const validNames = new Set(
      (await pool.query("SELECT name FROM entity WHERE status = 'approved' UNION SELECT resource_title FROM entity WHERE entity_type = 'resource' AND status = 'approved'"))
        .rows.map(r => r.name || r.resource_title)
    );

    const filteredNames = (parsed.names || []).filter(name => validNames.has(name));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        names: filteredNames,
        explanation: parsed.explanation || '',
        query: query,
      }),
    };

  } catch (error) {
    console.error('Semantic search error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
