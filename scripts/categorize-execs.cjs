const { Client } = require('pg');
require('dotenv').config({ path: '/Users/sophiajwang/Desktop/for the soul/Important/mapping-ai/.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function categorize() {
  await client.connect();

  const res = await client.query(
    "SELECT id, name, notes FROM entity WHERE category = 'Executive' AND (primary_org IS NULL OR primary_org = '') AND status = 'approved' ORDER BY name"
  );

  const categories = {
    'Frontier Lab': [],
    'AI Safety/Alignment': [],
    'VC/Capital/Philanthropy': [],
    'Think Tank/Policy Org': [],
    'Deployers & Platforms': [],
    'Academic': [],
    'Government/Agency': [],
    'Infrastructure & Compute': [],
    'UNCLEAR': []
  };

  // Keywords to match - order matters (first match wins)
  const rules = [
    { cat: 'Frontier Lab', keywords: ['OpenAI', 'Anthropic', 'DeepMind', 'Google DeepMind', 'Mistral AI', 'xAI', 'Meta FAIR', 'frontier AI company', 'Inflection AI', 'SSI', 'Safe Superintelligence'] },
    { cat: 'AI Safety/Alignment', keywords: ['AI safety', 'alignment', 'FAR.AI', 'Redwood Research', 'ARC', 'MIRI', 'interpretability', 'ControlAI', 'SaferAI', 'Timaeus', 'AI Objectives Institute', 'safety nonprofit', 'AI Safety Foundation', 'Cooperative AI', 'Center for AI Safety'] },
    { cat: 'VC/Capital/Philanthropy', keywords: ['BlackRock', 'investor', 'venture capital', 'Open Philanthropy', 'Coefficient Giving', 'asset manager', 'YC partner'] },
    { cat: 'Think Tank/Policy Org', keywords: ['AI Now', 'policy', 'think tank', 'IAPS', 'Foresight Institute', 'Institute for AI Policy', 'Adam Smith Institute', 'RAND', 'Center for Humane Technology', 'Epoch AI', 'Forethought'] },
    { cat: 'Deployers & Platforms', keywords: ['Microsoft', 'Salesforce', 'Tesla', 'Amazon', 'Google', 'Meta', 'Sierra AI', 'Stripe', 'World Labs', 'Twitch', 'Figma', 'enterprise AI', 'Goodfire', 'Faculty AI', 'AE Studio'] },
    { cat: 'Academic', keywords: ['Professor', 'University', 'UC Berkeley', 'Stanford', 'MIT', 'Carnegie Mellon', 'CHAI'] },
    { cat: 'Government/Agency', keywords: ['Saudi Arabia', 'Crown Prince', 'government', 'State Department', 'federal', 'Naval Officer'] },
    { cat: 'Infrastructure & Compute', keywords: ['NVIDIA', 'compute', 'infrastructure', 'chip'] }
  ];

  res.rows.forEach(r => {
    const notes = (r.notes || '');
    let assigned = false;

    for (const rule of rules) {
      for (const kw of rule.keywords) {
        if (notes.toLowerCase().includes(kw.toLowerCase())) {
          categories[rule.cat].push({ id: r.id, name: r.name, match: kw });
          assigned = true;
          break;
        }
      }
      if (assigned) break;
    }

    if (!assigned) {
      categories['UNCLEAR'].push({ id: r.id, name: r.name, notes: notes.substring(0, 100) });
    }
  });

  console.log('Suggested categorization based on notes:\n');
  for (const [cat, people] of Object.entries(categories)) {
    if (people.length > 0) {
      console.log(`${cat} (${people.length}):`);
      people.forEach(p => console.log(`  ${p.id}: ${p.name}` + (p.match ? ` [matched: ${p.match}]` : '')));
      console.log('');
    }
  }

  await client.end();
}

categorize().catch(e => console.error('Error:', e.message));
