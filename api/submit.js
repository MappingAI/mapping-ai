// Vercel Serverless Function
// This handles form submissions and creates JSON files in the GitHub repo

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers
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

    if (!type || !data || !data.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate type
    if (!['person', 'organization'].includes(type)) {
      return res.status(400).json({ error: 'Invalid submission type' });
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

    // Environment variables (set these in Vercel dashboard)
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'sophiajwang/mapping-ai'; // Change to your repo
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

    if (!GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Generate a unique filename
    const sanitizedName = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
    const uniqueId = Date.now().toString(36);
    const filename = `${sanitizedName}-${uniqueId}.json`;

    // Determine folder based on type
    const folder = type === 'person' ? 'submissions/people' : 'submissions/organizations';
    const path = `${folder}/${filename}`;

    // Prepare the file content
    const fileContent = JSON.stringify({
      ...data,
      _meta: {
        submittedAt: timestamp,
        type: type,
        status: 'pending'
      }
    }, null, 2);

    // Create file via GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Mapping-AI-Form'
        },
        body: JSON.stringify({
          message: `Add ${type}: ${data.name}`,
          content: Buffer.from(fileContent).toString('base64'),
          branch: GITHUB_BRANCH
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub API error:', errorData);
      return res.status(500).json({ error: 'Failed to save submission' });
    }

    return res.status(200).json({
      success: true,
      message: 'Submission received',
      path: path
    });

  } catch (error) {
    console.error('Submission error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
