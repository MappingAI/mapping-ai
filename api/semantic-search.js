const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MAP_DATA_URL = 'https://mapping-ai.org/map-data.json';

// Cache for map data (persists across warm Lambda invocations)
let cachedMapData = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getMapData() {
  const now = Date.now();
  if (cachedMapData && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedMapData;
  }

  const response = await fetch(MAP_DATA_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch map data: ${response.status}`);
  }
  cachedMapData = await response.json();
  cacheTimestamp = now;
  return cachedMapData;
}

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

    // Fetch cached map data from CDN (much faster than DB query)
    const mapData = await getMapData();

    // Build context for LLM - group by type
    const people = (mapData.people || [])
      .map(r => `- ${r.name} (${r.category || 'unknown role'}${r.primary_org ? ', ' + r.primary_org : ''}${r.regulatory_stance ? ', stance: ' + r.regulatory_stance : ''})`);

    const orgs = (mapData.organizations || [])
      .map(r => `- ${r.name} (${r.category || 'unknown sector'}${r.regulatory_stance ? ', stance: ' + r.regulatory_stance : ''})`);

    const resources = (mapData.resources || [])
      .map(r => `- ${r.title || r.name} (${r.category || 'resource'})`);

    const entityContext = `
PEOPLE (${people.length}):
${people.join('\n')}

ORGANIZATIONS (${orgs.length}):
${orgs.join('\n')}

RESOURCES (${resources.length}):
${resources.join('\n')}
    `.trim();

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
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `You are helping search a database of AI policy stakeholders. Your goal is to BROADLY interpret queries and return all entities that could be relevant.

QUERY: "${query}"

Here are all the entities in the database:

${entityContext}

Return a JSON object with:
- "names": array of exact entity names from the list above that match
- "explanation": 1 sentence explaining the matches

IMPORTANT - Be INCLUSIVE, not selective:

1. **Topic queries** (e.g., "AI safety", "governance", "existential risk"):
   - Include organizations in that space
   - Include ALL people who work at those organizations (check their primary_org field!)
   - Include people whose roles suggest involvement (researchers, policymakers)

2. **Organization queries** (e.g., "OpenAI", "Anthropic", "frontier labs"):
   - Include the organization(s) themselves
   - Include ALL people whose primary_org matches that organization
   - For "frontier labs", include: OpenAI, Anthropic, Google DeepMind, Meta AI, xAI and ALL their employees

3. **Stance queries** (e.g., "wants regulation", "accelerationists"):
   - "pro-regulation", "cautious", "wants oversight" → include Restrictive, Precautionary, Moderate stances
   - "against regulation", "accelerationist", "e/acc" → include Accelerate, Light-touch stances
   - Include people at organizations known for those stances

4. **Role queries** (e.g., "researchers", "policymakers", "executives"):
   - Include all people with matching category/role

5. **Ultra-specific policy queries** (e.g., "SB 1047", "preemption", "compute governance"):
   - Use your world knowledge to identify who works on these specific issues
   - Include relevant think tanks, policymakers, researchers, advocates
   - Include organizations that have published on or advocated positions on these topics
   - For "SB 1047" or California AI legislation, include Scott Wiener, Gavin Newsom, CAIS, AI Policy Institute, etc.

6. **Belief queries** (e.g., "thinks AGI is close", "worried about AI risk"):
   - Match against agi_timeline and ai_risk fields
   - Include people at organizations known for those views

Return up to 100 matches. For broad queries, return MORE entities rather than fewer.
When in doubt, INCLUDE the entity rather than exclude it.

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
    const validNames = new Set([
      ...(mapData.people || []).map(p => p.name),
      ...(mapData.organizations || []).map(o => o.name),
      ...(mapData.resources || []).map(r => r.title || r.name),
    ]);

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
