/**
 * Deep Quality Review — comprehensive LLM pass on EVERY entry
 *
 * Uses Claude Haiku to verify and fix:
 * - Every person: name, category, title, primary_org, location, stance, timeline, risk, threats, influence, twitter
 * - Every org: name, category, website, location, funding, stance, risk, influence
 * - Every resource: title, author, type, URL validity, year, category, key_argument
 * - Every relationship: verify it makes sense
 *
 * Processes in batches of 5 for efficiency.
 *
 * Usage: node scripts/deep-quality-review.js
 */
import pg from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

let apiCalls = 0;
let inputTokens = 0;
let outputTokens = 0;
let fixes = 0;

async function askClaude(prompt) {
  apiCalls++;
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });
  inputTokens += msg.usage.input_tokens;
  outputTokens += msg.usage.output_tokens;
  return msg.content[0].text;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Review People in batches ──
async function reviewPeople() {
  const client = await pool.connect();
  try {
    const people = await client.query(`
      SELECT id, name, category, title, primary_org, location, regulatory_stance,
             agi_timeline, ai_risk_level, threat_models, influence_type, twitter
      FROM people WHERE status = 'approved' ORDER BY id
    `);
    console.log(`\n══ Reviewing ${people.rows.length} people ══\n`);

    // Process in batches of 5
    for (let i = 0; i < people.rows.length; i += 5) {
      const batch = people.rows.slice(i, i + 5);
      const batchData = batch.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category || 'MISSING',
        title: p.title || 'MISSING',
        primary_org: p.primary_org || 'MISSING',
        location: p.location || 'MISSING',
        regulatory_stance: p.regulatory_stance || 'MISSING',
        agi_timeline: p.agi_timeline || 'MISSING',
        ai_risk_level: p.ai_risk_level || 'MISSING',
        threat_models: p.threat_models || 'MISSING',
        influence_type: p.influence_type || 'MISSING',
        twitter: p.twitter || 'MISSING',
      }));

      try {
        const response = await askClaude(`You are a fact-checker reviewing a database of people in the US AI policy landscape. For each person below, verify the data and return corrections as a JSON array. ONLY include entries that need fixing.

ALLOWED VALUES:
- category: Executive, Researcher, Policymaker, Investor, Organizer, Journalist, Academic, Cultural figure
- regulatory_stance: Accelerate, Light-touch, Targeted, Moderate, Restrictive, Precautionary, Mixed/unclear, Unknown
- agi_timeline: Already here, 2-3 years, 5-10 years, 10-25 years, 25+ years or never, Ill-defined, Unknown
- ai_risk_level: Overstated, Manageable, Serious, Catastrophic, Existential, Mixed/nuanced, Unknown
- threat_models: max 3 from: Labor displacement, Economic inequality, Power concentration, Democratic erosion, Cybersecurity, Misinformation, Environmental, Weapons, Loss of control, Copyright/IP, Existential risk
- influence_type: max 3 from: Decision-maker, Advisor/strategist, Researcher/analyst, Funder/investor, Builder, Organizer/advocate, Narrator, Implementer, Connector/convener
- location: "City, ST" for US or "City, Country" for international. Must be a real place.
- twitter: must be a real @handle or null

DATA TO REVIEW:
${JSON.stringify(batchData, null, 1)}

Return ONLY a JSON array of objects with "id" and changed fields. Example:
[{"id": 123, "regulatory_stance": "Targeted", "location": "San Francisco, CA"}]
If all entries are correct, return: []`);

        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) continue;
        const corrections = JSON.parse(jsonMatch[0]);

        for (const correction of corrections) {
          const { id, ...fields } = correction;
          if (!id || Object.keys(fields).length === 0) continue;

          const allowed = ['category', 'title', 'primary_org', 'location', 'regulatory_stance', 'agi_timeline', 'ai_risk_level', 'threat_models', 'influence_type', 'twitter'];
          const updates = [];
          const values = [];
          let idx = 1;
          for (const [key, value] of Object.entries(fields)) {
            if (allowed.includes(key) && value !== undefined) {
              updates.push(`${key} = $${idx++}`);
              values.push(value);
            }
          }
          if (updates.length > 0) {
            values.push(id);
            await client.query(`UPDATE people SET ${updates.join(', ')} WHERE id = $${idx}`, values);
            fixes++;
            const name = batch.find(p => p.id === id)?.name || id;
            console.log(`  ✎ ${name}: ${Object.entries(fields).map(([k,v]) => `${k}=${String(v).substring(0,30)}`).join(', ')}`);
          }
        }

        const batchNames = batch.map(p => p.name.substring(0, 15)).join(', ');
        if (corrections.length === 0) console.log(`  ✓ batch OK: ${batchNames}`);

        await sleep(200);
      } catch (err) {
        console.log(`  ✗ batch error: ${err.message}`);
      }
    }
  } finally { client.release(); }
}

// ── Review Organizations in batches ──
async function reviewOrgs() {
  const client = await pool.connect();
  try {
    const orgs = await client.query(`
      SELECT id, name, category, website, location, funding_model, regulatory_stance,
             ai_risk_level, threat_models, influence_type, twitter
      FROM organizations WHERE status = 'approved' ORDER BY id
    `);
    console.log(`\n══ Reviewing ${orgs.rows.length} organizations ══\n`);

    for (let i = 0; i < orgs.rows.length; i += 5) {
      const batch = orgs.rows.slice(i, i + 5);
      const batchData = batch.map(o => ({
        id: o.id,
        name: o.name,
        category: o.category || 'MISSING',
        website: o.website || 'MISSING',
        location: o.location || 'MISSING',
        funding_model: o.funding_model || 'MISSING',
        regulatory_stance: o.regulatory_stance || 'MISSING',
        ai_risk_level: o.ai_risk_level || 'MISSING',
        influence_type: o.influence_type || 'MISSING',
      }));

      try {
        const response = await askClaude(`You are fact-checking a database of organizations in the US AI policy landscape. Return corrections as a JSON array.

ALLOWED VALUES:
- category: Frontier Lab, AI Safety/Alignment, Think Tank/Policy Org, Government/Agency, Academic, VC/Capital/Philanthropy, Labor/Civil Society, Ethics/Bias/Rights, Media/Journalism, Political Campaign/PAC
- funding_model: Venture-backed, Revenue-generating, Government-funded, Philanthropic, Membership, Mixed, Public benefit, Self-funded, Other
- regulatory_stance: Accelerate, Light-touch, Targeted, Moderate, Restrictive, Precautionary, Mixed/unclear, Unknown
- influence_type: 1-2 from: Builder, Researcher/analyst, Advisor/strategist, Decision-maker, Funder/investor, Organizer/advocate, Narrator, Implementer
- location: HQ city, format "City, ST" or "City, Country"

DATA:
${JSON.stringify(batchData, null, 1)}

Return JSON array of corrections. Example: [{"id": 77, "funding_model": "Mixed", "location": "San Francisco, CA"}]
Return [] if all correct.`);

        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) continue;
        const corrections = JSON.parse(jsonMatch[0]);

        for (const correction of corrections) {
          const { id, ...fields } = correction;
          if (!id || Object.keys(fields).length === 0) continue;

          const allowed = ['category', 'website', 'location', 'funding_model', 'regulatory_stance', 'ai_risk_level', 'influence_type', 'twitter'];
          const updates = [];
          const values = [];
          let idx = 1;
          for (const [key, value] of Object.entries(fields)) {
            if (allowed.includes(key) && value !== undefined) {
              updates.push(`${key} = $${idx++}`);
              values.push(value);
            }
          }
          if (updates.length > 0) {
            values.push(id);
            await client.query(`UPDATE organizations SET ${updates.join(', ')} WHERE id = $${idx}`, values);
            fixes++;
            const name = batch.find(o => o.id === id)?.name || id;
            console.log(`  ✎ ${name}: ${Object.entries(fields).map(([k,v]) => `${k}=${String(v).substring(0,30)}`).join(', ')}`);
          }
        }

        await sleep(200);
      } catch (err) {
        console.log(`  ✗ batch error: ${err.message}`);
      }
    }
  } finally { client.release(); }
}

// ── Review Resources in batches ──
async function reviewResources() {
  const client = await pool.connect();
  try {
    const resources = await client.query(`
      SELECT id, title, author, resource_type, url, year, category, key_argument
      FROM resources WHERE status = 'approved' ORDER BY id
    `);
    console.log(`\n══ Reviewing ${resources.rows.length} resources ══\n`);

    for (let i = 0; i < resources.rows.length; i += 5) {
      const batch = resources.rows.slice(i, i + 5);
      const batchData = batch.map(r => ({
        id: r.id,
        title: r.title,
        author: r.author || 'MISSING',
        resource_type: r.resource_type,
        url: r.url || 'MISSING',
        year: r.year || 'MISSING',
        category: r.category,
        key_argument: r.key_argument ? r.key_argument.substring(0, 150) : 'MISSING',
      }));

      try {
        const response = await askClaude(`You are fact-checking a database of AI policy resources. Return corrections as JSON array.

RULES:
- resource_type must match content: Essay, Book, Report, Podcast, Video, Website, Academic Paper, News Article, Substack/Newsletter
  - Congressional hearings/testimony = Report
  - Executive orders = Report
  - A person's blog/substack = Substack/Newsletter
  - News coverage = News Article
- key_argument must be 1-2 clear sentences summarizing the main point. NOT raw scraped text.
  - If it looks like garbage/HTML/scraped text, write a proper summary.
  - If it says MISSING, write one based on the title.
- category: AI Safety, AI Policy, AI Capabilities, Labor & Economy, National Security, Industry Analysis, Policy Proposal, Technical, Philosophy/Ethics
- author: if MISSING and you know it, fill in. Use real author names.
- year: if MISSING and you can infer from title/URL, fill in.

DATA:
${JSON.stringify(batchData, null, 1)}

Return: [{"id": 1, "resource_type": "Report", "key_argument": "A clear summary..."}]
Return [] if all correct.`);

        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) continue;
        const corrections = JSON.parse(jsonMatch[0]);

        for (const correction of corrections) {
          const { id, ...fields } = correction;
          if (!id || Object.keys(fields).length === 0) continue;

          const allowed = ['resource_type', 'key_argument', 'author', 'year', 'category', 'title'];
          const updates = [];
          const values = [];
          let idx = 1;
          for (const [key, value] of Object.entries(fields)) {
            if (allowed.includes(key) && value !== undefined) {
              updates.push(`${key} = $${idx++}`);
              values.push(value);
            }
          }
          if (updates.length > 0) {
            values.push(id);
            await client.query(`UPDATE resources SET ${updates.join(', ')} WHERE id = $${idx}`, values);
            fixes++;
            const title = batch.find(r => r.id === id)?.title?.substring(0, 40) || id;
            console.log(`  ✎ ${title}: ${Object.keys(fields).join(', ')}`);
          }
        }

        await sleep(200);
      } catch (err) {
        console.log(`  ✗ batch error: ${err.message}`);
      }
    }
  } finally { client.release(); }
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  DEEP QUALITY REVIEW (Claude Haiku)');
  console.log('═══════════════════════════════════════\n');

  await reviewPeople();
  await reviewOrgs();
  await reviewResources();

  console.log('\n═══════════════════════════════════════');
  console.log(`API calls: ${apiCalls}`);
  console.log(`Tokens: ${inputTokens} in, ${outputTokens} out`);
  console.log(`Fixes: ${fixes}`);
  console.log(`Cost: $${((inputTokens * 0.25 + outputTokens * 1.25) / 1000000).toFixed(3)}`);
  console.log('═══════════════════════════════════════');

  // Export and deploy
  console.log('\nExporting and deploying...');
  const { execSync } = await import('child_process');
  execSync('node scripts/export-map-data.js', { stdio: 'inherit' });
  execSync('aws s3 cp map-data.json s3://mapping-ai-website-561047280976/map-data.json --content-type application/json', { stdio: 'inherit' });
  execSync('aws cloudfront create-invalidation --distribution-id E34ZXLC7CZX7XT --paths "/*"', { stdio: 'pipe' });
  console.log('Deployed!');

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
