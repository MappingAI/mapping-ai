import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { type, status } = req.query;

    // Default: return all approved entries (both types)
    const filterStatus = status || 'approved';

    let people = { rows: [] };
    let organizations = { rows: [] };

    if (!type || type === 'person') {
      people = await sql`
        SELECT id, name, category, title, primary_org, other_orgs, location,
               regulatory_stance, capability_belief, influence_type, twitter,
               notes, submitted_at, status
        FROM people
        WHERE status = ${filterStatus}
        ORDER BY name ASC
      `;
    }

    if (!type || type === 'organization') {
      organizations = await sql`
        SELECT id, name, category, website, location, funding_model,
               regulatory_stance, capability_belief, influence_type, twitter,
               notes, submitted_at, status
        FROM organizations
        WHERE status = ${filterStatus}
        ORDER BY name ASC
      `;
    }

    return res.status(200).json({
      people: people.rows,
      organizations: organizations.rows
    });

  } catch (error) {
    console.error('Query error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
