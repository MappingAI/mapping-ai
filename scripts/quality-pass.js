/**
 * LLM Quality Pass — Uses Claude Haiku to review and fix every entity's fields.
 *
 * For each entity, sends current data to Haiku and asks it to:
 * 1. Verify/correct the regulatory stance classification
 * 2. Fix any misclassified resource types
 * 3. Write proper 1-2 sentence key_arguments
 * 4. Validate and clean all other fields
 *
 * Usage:
 *   node scripts/quality-pass.js --resources          # fix resources (~$0.30)
 *   node scripts/quality-pass.js --people             # fix people (~$0.20)
 *   node scripts/quality-pass.js --orgs               # fix orgs (~$0.20)
 *   node scripts/quality-pass.js --pilot              # test 3 resources
 *   node scripts/quality-pass.js --all                # everything (~$0.70)
 */
import pg from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const args = process.argv.slice(2);
const pilot = args.includes('--pilot');
const doResources = args.includes('--resources') || args.includes('--all') || pilot;
const doPeople = args.includes('--people') || args.includes('--all');
const doOrgs = args.includes('--orgs') || args.includes('--all');

let apiCalls = 0;
let inputTokens = 0;
let outputTokens = 0;
let fixes = 0;

async function askHaiku(prompt) {
  apiCalls++;
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });
  inputTokens += msg.usage.input_tokens;
  outputTokens += msg.usage.output_tokens;
  return msg.content[0].text;
}

// ── Fix Resources ──
async function fixResources() {
  const client = await pool.connect();
  try {
    const resources = await client.query(`
      SELECT id, title, author, resource_type, url, year, category, key_argument
      FROM resources WHERE status = 'approved'
      ORDER BY id ${pilot ? 'LIMIT 3' : ''}
    `);
    console.log(`\n── Reviewing ${resources.rows.length} resources ──\n`);

    for (const r of resources.rows) {
      try {
        const response = await askHaiku(`You are reviewing a database entry for an AI policy resource. Fix any errors and fill missing fields. Return ONLY a JSON object with corrected values. Do not include any explanation.

Current data:
- title: ${r.title}
- author: ${r.author || 'MISSING'}
- resource_type: ${r.resource_type} (must be one of: Essay, Book, Report, Podcast, Video, Website, Academic Paper, News Article, Substack/Newsletter)
- url: ${r.url || 'MISSING'}
- year: ${r.year || 'MISSING'}
- category: ${r.category} (must be one of: AI Safety, AI Policy, AI Capabilities, Labor & Economy, National Security, Industry Analysis, Policy Proposal, Technical, Philosophy/Ethics)
- key_argument: ${r.key_argument ? r.key_argument.substring(0, 200) : 'MISSING'}

Rules:
- resource_type must match the actual content (a congressional hearing transcript is a Report, not a Podcast)
- key_argument must be 1-2 clear sentences summarizing the main point. Not raw HTML or scraped text.
- If key_argument looks like garbage/scraped text, write a proper summary based on the title.
- If author is MISSING and you know it, fill it in.
- Only include fields that need changing. Skip fields that are already correct.

Return JSON like: {"resource_type": "Report", "key_argument": "A clear summary...", "author": "Name"}
If nothing needs fixing, return: {}`);

        // Parse JSON response
        const jsonMatch = response.match(/\{[^}]*\}/s);
        if (!jsonMatch) continue;
        const changes = JSON.parse(jsonMatch[0]);

        if (Object.keys(changes).length === 0) {
          console.log(`  ✓ [${r.id}] ${r.title.substring(0, 50)} — OK`);
          continue;
        }

        // Apply changes
        const updates = [];
        const values = [];
        let idx = 1;
        for (const [key, value] of Object.entries(changes)) {
          if (['resource_type', 'key_argument', 'author', 'year', 'category'].includes(key) && value) {
            updates.push(`${key} = $${idx++}`);
            values.push(value);
          }
        }
        if (updates.length > 0) {
          values.push(r.id);
          await client.query(`UPDATE resources SET ${updates.join(', ')} WHERE id = $${idx}`, values);
          fixes++;
          console.log(`  ✎ [${r.id}] ${r.title.substring(0, 50)}`);
          for (const [k, v] of Object.entries(changes)) {
            console.log(`      ${k}: ${String(v).substring(0, 80)}`);
          }
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        console.log(`  ✗ [${r.id}] Error: ${err.message}`);
      }
    }
  } finally { client.release(); }
}

// ── Fix People ──
async function fixPeople() {
  const client = await pool.connect();
  try {
    const people = await client.query(`
      SELECT id, name, title, primary_org, category, location, regulatory_stance,
             agi_timeline, ai_risk_level, threat_models, influence_type, twitter
      FROM people WHERE status = 'approved'
      ORDER BY id ${pilot ? 'LIMIT 3' : ''}
    `);
    console.log(`\n── Reviewing ${people.rows.length} people ──\n`);

    for (const p of people.rows) {
      try {
        const response = await askHaiku(`You are reviewing a database entry for a person in the US AI policy landscape. Fix any errors. Return ONLY a JSON object with corrected values.

Current data:
- name: ${p.name}
- title: ${p.title || 'MISSING'}
- primary_org: ${p.primary_org || 'MISSING'}
- category: ${p.category || 'MISSING'} (must be: Executive, Researcher, Policymaker, Investor, Organizer, Journalist, Academic, Cultural figure)
- location: ${p.location || 'MISSING'} (format: City, ST or City, Country)
- regulatory_stance: ${p.regulatory_stance || 'MISSING'} (must be: Accelerate, Light-touch, Targeted, Moderate, Restrictive, Precautionary, Nationalize, Mixed/unclear)
- agi_timeline: ${p.agi_timeline || 'MISSING'} (must be: Already here, 2-3 years, 5-10 years, 10-25 years, 25+ years or never, Ill-defined, Unknown)
- ai_risk_level: ${p.ai_risk_level || 'MISSING'} (must be: Overstated, Manageable, Serious, Catastrophic, Existential, Mixed/nuanced, Unknown)
- influence_type: ${p.influence_type || 'MISSING'} (1-3 from: Decision-maker, Advisor/strategist, Researcher/analyst, Funder/investor, Builder, Organizer/advocate, Narrator, Implementer, Connector/convener)

Rules:
- Only include fields that need CORRECTING or FILLING. Skip correct fields.
- If you're not confident about a classification, use Unknown or Mixed.
- influence_type should be 1-3 types max, not 5+.
- Location should be "City, ST" for US or "City, Country" for international.

Return JSON like: {"regulatory_stance": "Targeted", "location": "San Francisco, CA"}
If nothing needs fixing, return: {}`);

        const jsonMatch = response.match(/\{[^}]*\}/s);
        if (!jsonMatch) continue;
        const changes = JSON.parse(jsonMatch[0]);

        if (Object.keys(changes).length === 0) {
          console.log(`  ✓ [${p.id}] ${p.name} — OK`);
          continue;
        }

        const updates = [];
        const values = [];
        let idx = 1;
        for (const [key, value] of Object.entries(changes)) {
          if (['category', 'location', 'regulatory_stance', 'agi_timeline', 'ai_risk_level', 'influence_type', 'primary_org', 'title', 'twitter'].includes(key) && value) {
            updates.push(`${key} = $${idx++}`);
            values.push(value);
          }
        }
        if (updates.length > 0) {
          values.push(p.id);
          await client.query(`UPDATE people SET ${updates.join(', ')} WHERE id = $${idx}`, values);
          fixes++;
          console.log(`  ✎ [${p.id}] ${p.name}`);
          for (const [k, v] of Object.entries(changes)) {
            console.log(`      ${k}: ${String(v).substring(0, 80)}`);
          }
        }

        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        console.log(`  ✗ [${p.id}] Error: ${err.message}`);
      }
    }
  } finally { client.release(); }
}

// ── Fix Orgs ──
async function fixOrgs() {
  const client = await pool.connect();
  try {
    const orgs = await client.query(`
      SELECT id, name, category, website, location, funding_model, regulatory_stance,
             ai_risk_level, threat_models, influence_type
      FROM organizations WHERE status = 'approved'
      ORDER BY id ${pilot ? 'LIMIT 3' : ''}
    `);
    console.log(`\n── Reviewing ${orgs.rows.length} orgs ──\n`);

    for (const o of orgs.rows) {
      try {
        const response = await askHaiku(`You are reviewing a database entry for an organization in the US AI policy landscape. Fix any errors. Return ONLY a JSON object.

Current data:
- name: ${o.name}
- category: ${o.category} (must be: Frontier Lab, AI Safety/Alignment, Think Tank/Policy Org, Government/Agency, Academic, VC/Capital/Philanthropy, Labor/Civil Society, Ethics/Bias/Rights, Media/Journalism, Political Campaign/PAC)
- location: ${o.location || 'MISSING'} (HQ city)
- funding_model: ${o.funding_model || 'MISSING'} (must be: Venture-backed, Revenue-generating, Government-funded, Philanthropic, Membership, Mixed, Public benefit, Self-funded, Other)
- regulatory_stance: ${o.regulatory_stance || 'MISSING'} (Accelerate/Light-touch/Targeted/Moderate/Restrictive/Precautionary/Nationalize/Mixed/unclear)
- influence_type: ${o.influence_type || 'MISSING'} (1-2 from: Builder, Researcher/analyst, Advisor/strategist, Decision-maker, Funder/investor, Organizer/advocate, Narrator, Implementer)

Only fix what's wrong or missing. Return {} if OK.
Return JSON: {"funding_model": "Philanthropic", "location": "Washington, DC"}`);

        const jsonMatch = response.match(/\{[^}]*\}/s);
        if (!jsonMatch) continue;
        const changes = JSON.parse(jsonMatch[0]);

        if (Object.keys(changes).length === 0) {
          console.log(`  ✓ [${o.id}] ${o.name} — OK`);
          continue;
        }

        const updates = [];
        const values = [];
        let idx = 1;
        for (const [key, value] of Object.entries(changes)) {
          if (['category', 'location', 'funding_model', 'regulatory_stance', 'ai_risk_level', 'influence_type'].includes(key) && value) {
            updates.push(`${key} = $${idx++}`);
            values.push(value);
          }
        }
        if (updates.length > 0) {
          values.push(o.id);
          await client.query(`UPDATE organizations SET ${updates.join(', ')} WHERE id = $${idx}`, values);
          fixes++;
          console.log(`  ✎ [${o.id}] ${o.name}`);
          for (const [k, v] of Object.entries(changes)) {
            console.log(`      ${k}: ${String(v).substring(0, 80)}`);
          }
        }

        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        console.log(`  ✗ [${o.id}] Error: ${err.message}`);
      }
    }
  } finally { client.release(); }
}

async function main() {
  console.log('LLM Quality Pass (Claude Haiku)\n');

  if (doResources) await fixResources();
  if (doPeople) await fixPeople();
  if (doOrgs) await fixOrgs();

  console.log(`\n══ QUALITY PASS SUMMARY ══`);
  console.log(`API calls: ${apiCalls}`);
  console.log(`Tokens: ${inputTokens} in, ${outputTokens} out`);
  console.log(`Fixes applied: ${fixes}`);
  console.log(`Est. cost: $${((inputTokens * 0.25 + outputTokens * 1.25) / 1000000).toFixed(3)}`);

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
