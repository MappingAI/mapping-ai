import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { type, timestamp, data, _hp } = req.body;

    // Honeypot: humans leave this blank; bots fill it in
    if (_hp) {
      return res.status(200).json({ success: true, message: 'Submission received' });
    }

    if (!type || !data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['person', 'organization', 'resource'].includes(type)) {
      return res.status(400).json({ error: 'Invalid submission type' });
    }

    // Validate required field based on type
    if ((type === 'person' || type === 'organization') && !data.name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }
    if (type === 'resource' && !data.title) {
      return res.status(400).json({ error: 'Missing required field: title' });
    }

    // Field length limits
    const SHORT_LIMIT = 200;
    const LONG_LIMIT = 1000;
    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== 'string') continue;
      const limit = key === 'notes' ? LONG_LIMIT : SHORT_LIMIT;
      if (value.length > limit) {
        return res.status(400).json({ error: `Field "${key}" exceeds maximum length` });
      }
    }

    if (type === 'person') {
      await sql`
        INSERT INTO people (
          name, category, title, primary_org, other_orgs, location,
          regulatory_stance, capability_belief, influence_type, twitter,
          notes, submitter_email, submitted_at, status
        ) VALUES (
          ${data.name},
          ${data.category || null},
          ${data.title || null},
          ${data.primaryOrg || null},
          ${data.otherOrgs || null},
          ${data.location || null},
          ${data.regulatoryStance || null},
          ${data.capabilityBelief || null},
          ${data.influenceType || null},
          ${data.twitter || null},
          ${data.notes || null},
          ${data.submitterEmail || null},
          ${timestamp || new Date().toISOString()},
          'pending'
        )
      `;
    } else if (type === 'organization') {
      await sql`
        INSERT INTO organizations (
          name, category, website, location, funding_model,
          regulatory_stance, capability_belief, influence_type, twitter,
          notes, submitter_email, submitted_at, status
        ) VALUES (
          ${data.name},
          ${data.category || null},
          ${data.website || null},
          ${data.location || null},
          ${data.fundingModel || null},
          ${data.regulatoryStance || null},
          ${data.capabilityBelief || null},
          ${data.influenceType || null},
          ${data.twitter || null},
          ${data.notes || null},
          ${data.submitterEmail || null},
          ${timestamp || new Date().toISOString()},
          'pending'
        )
      `;
    } else if (type === 'resource') {
      await sql`
        INSERT INTO resources (
          title, author, resource_type, url, year, category,
          key_argument, notes, submitter_email, submitted_at, status
        ) VALUES (
          ${data.title},
          ${data.author || null},
          ${data.resourceType || null},
          ${data.url || null},
          ${data.year || null},
          ${data.category || null},
          ${data.keyArgument || null},
          ${data.notes || null},
          ${data.submitterEmail || null},
          ${timestamp || new Date().toISOString()},
          'pending'
        )
      `;
    }

    return res.status(200).json({
      success: true,
      message: 'Submission received'
    });

  } catch (error) {
    console.error('Submission error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
