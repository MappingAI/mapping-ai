/**
 * Deep People Enrichment with LLM (3-table schema)
 *
 * Updated for entity/submission/edge schema.
 *
 * Usage:
 *   node scripts/enrich-people.js --pilot           # 3-5 people only
 *   node scripts/enrich-people.js --id=123          # single person by ID
 *   node scripts/enrich-people.js --ids=1,2,3       # specific IDs only
 *   node scripts/enrich-people.js --new-only        # only unenriched people (no stance yet)
 *   node scripts/enrich-people.js --all             # all people
 *   node scripts/enrich-people.js --force           # ignore progress, re-run all
 */
import pg from 'pg';
import Exa from 'exa-js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const exa = new Exa(process.env.EXA_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Parse CLI args
const args = process.argv.slice(2);
const pilotMode = args.includes('--pilot');
const newOnly = args.includes('--new-only');
const forceRerun = args.includes('--force');
const doAll = args.includes('--all') || pilotMode;
const singleIdArg = args.find(a => a.startsWith('--id='));
const singleId = singleIdArg ? parseInt(singleIdArg.split('=')[1], 10) : null;
const idsArg = args.find(a => a.startsWith('--ids='));
const specificIds = idsArg ? idsArg.split('=')[1].split(',').map(Number) : null;

// Tracking
let exaSearches = 0;
let llmCalls = 0;
let inputTokens = 0;
let outputTokens = 0;
let enriched = 0;
let skipped = 0;

// ══════════════════════════════════════════════════════════════════════════════
// ALLOWED VALUES FROM CONTRIBUTE FORM
// Must match exactly what the form accepts
// ══════════════════════════════════════════════════════════════════════════════

// Single-select dropdowns
const VALID_CATEGORIES = ['Executive', 'Researcher', 'Policymaker', 'Investor', 'Organizer', 'Journalist', 'Academic', 'Cultural figure'];
const VALID_STANCES = ['Accelerate', 'Light-touch', 'Targeted', 'Moderate', 'Restrictive', 'Precautionary', 'Nationalize', 'Mixed/unclear'];
const VALID_TIMELINES = ['Already here', '2-3 years', '5-10 years', '10-25 years', '25+ years or never', 'Ill-defined', 'Unknown'];
const VALID_RISKS = ['Overstated', 'Manageable', 'Serious', 'Catastrophic', 'Existential', 'Mixed/nuanced', 'Unknown'];
const VALID_EVIDENCE = ['Explicitly stated', 'Inferred', 'Unknown'];

// Multi-select checkboxes
const VALID_THREAT_MODELS = ['Labor displacement', 'Economic inequality', 'Power concentration', 'Democratic erosion', 'Cybersecurity', 'Misinformation', 'Environmental', 'Weapons', 'Loss of control', 'Copyright/IP', 'Existential risk'];
const MAX_THREAT_MODELS = 3; // Form limits to 3

const VALID_INFLUENCE = ['Decision-maker', 'Advisor/strategist', 'Researcher/analyst', 'Funder/investor', 'Builder', 'Organizer/advocate', 'Narrator', 'Implementer', 'Connector/convener'];
// No limit on influence types

// ── Rate-limited Exa search ──
async function exaSearch(query, opts) {
  await new Promise(r => setTimeout(r, 150));
  exaSearches++;
  try {
    const res = await exa.searchAndContents(query, opts);
    return res;
  } catch (err) {
    console.log(`    Exa error: ${err.message}`);
    return { results: [] };
  }
}

// ── Claude Sonnet call ──
async function askSonnet(prompt) {
  await new Promise(r => setTimeout(r, 100));
  llmCalls++;
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });
  inputTokens += msg.usage.input_tokens;
  outputTokens += msg.usage.output_tokens;
  return msg.content[0].text;
}

// ── Get role-specific guidance for the prompt ──
function getRoleGuidance(person) {
  const cat = (person.category || '').toLowerCase();
  const title = (person.title || '').toLowerCase();

  if (cat.includes('policymaker') || title.match(/senator|congress|assembl|legislat|representative|secretary|commissioner|governor/)) {
    return {
      type: 'Policymaker',
      stanceExample: "Sponsored the RAISE Act, which places safety requirements specifically on frontier AI developers who have spent $100M+ on training.",
      threatExample: "The RAISE Act was designed to address severe risks including assisting in the creation of bioweapons and automated criminal activity.",
      notesExample: "Named to Time 100 AI list (2025); won Future Caucus Rising Star award (2024). Has MS in Computer Science (Georgia Tech).",
      lookFor: "bills sponsored/co-sponsored, committee assignments, floor statements, testimony, votes, campaign positions"
    };
  } else if (cat.includes('executive') || title.match(/ceo|cto|coo|founder|co-founder|chief|president(?! of)/)) {
    return {
      type: 'Executive',
      stanceExample: "Advocates for 'responsible scaling' rather than pausing development. Company voluntarily committed to pre-deployment safety testing.",
      threatExample: "Has publicly warned about concentration of AI power in few hands, potential for autonomous weapons.",
      notesExample: "Co-founded Anthropic (2021) after leaving OpenAI over safety disagreements. PhD Physics, Princeton.",
      lookFor: "company safety policies, voluntary commitments, congressional testimony, blog posts/essays, interviews"
    };
  } else if (cat.includes('researcher') || cat.includes('academic') || title.match(/professor|researcher|scientist|fellow|director.*institute|phd/)) {
    return {
      type: 'Researcher/Academic',
      stanceExample: "Co-authored influential paper arguing for mandatory third-party audits of frontier models.",
      threatExample: "Research focuses on AI alignment and interpretability. Has published on deceptive AI systems.",
      notesExample: "Professor of Computer Science at Stanford; Director of HAI. Over 50,000 citations.",
      lookFor: "papers published, research focus, expert testimony, policy recommendations, institutional affiliations"
    };
  } else if (cat.includes('investor')) {
    return {
      type: 'Investor',
      stanceExample: "Portfolio heavily weighted toward AI safety startups. Advocates for voluntary industry standards over government regulation.",
      threatExample: "Warns about economic disruption from rapid automation. Funds research on AI job displacement.",
      notesExample: "General Partner at Founders Fund. Led Series A investments in Anthropic, Cohere.",
      lookFor: "portfolio companies, investment thesis, public statements, board seats"
    };
  } else if (cat.includes('journalist') || title.match(/journalist|reporter|editor|columnist|correspondent/)) {
    return {
      type: 'Journalist',
      stanceExample: "Coverage tends to emphasize AI risks and corporate accountability.",
      threatExample: "Reporting focuses on labor displacement, algorithmic bias, and corporate lobbying.",
      notesExample: "AI reporter at New York Times since 2022. Won Pulitzer Prize for series on facial recognition (2023).",
      lookFor: "beat/coverage area, notable stories broken, publications, awards, books authored"
    };
  } else if (cat.includes('organizer') || title.match(/organizer|activist|advocate|director.*union|campaign/)) {
    return {
      type: 'Organizer/Advocate',
      stanceExample: "Leading campaign for mandatory algorithmic impact assessments.",
      threatExample: "Organization focuses on labor rights in the AI era, algorithmic discrimination.",
      notesExample: "Executive Director of AI Now Institute since 2020. Former FTC advisor (2018-2020).",
      lookFor: "organizations led, campaigns organized, coalitions built, policy wins"
    };
  } else if (cat.includes('cultural') || title.match(/author|writer|philosopher|intellectual|commentator/)) {
    return {
      type: 'Cultural Figure/Intellectual',
      stanceExample: "Has argued AI development should be slowed until governance catches up.",
      threatExample: "Writing emphasizes existential risk and loss of human agency.",
      notesExample: "Author of 'Superintelligence' (2014). Professor of Philosophy at Oxford.",
      lookFor: "books written, major essays, public lectures, open letters signed"
    };
  }

  return {
    type: 'General',
    stanceExample: "Has publicly advocated for [specific policy].",
    threatExample: "Has expressed concern about [specific risks].",
    notesExample: "Background in [field]. Previously at [organizations].",
    lookFor: "public statements, organizational affiliations, notable actions, career history"
  };
}

// ── Build the LLM prompt ──
function buildPrompt(person, webContent) {
  const guidance = getRoleGuidance(person);

  return `You are a researcher enriching a database entry for a ${guidance.type} in the US AI policy landscape.

CURRENT DATABASE ENTRY:
- Name: ${person.name}
- Title: ${person.title || '(empty)'}
- Primary org: ${person.primary_org || '(empty)'}
- Other orgs: ${person.other_orgs || '(empty)'}
- Category: ${person.category || '(empty)'}
- Location: ${person.location || '(empty)'}
- Regulatory stance: ${person.belief_regulatory_stance || '(empty)'}
- Evidence source: ${person.belief_evidence_source || '(empty)'}
- AGI timeline: ${person.belief_agi_timeline || '(empty)'}
- AI risk level: ${person.belief_ai_risk || '(empty)'}
- Threat models: ${person.belief_threat_models || '(empty)'}
- Influence type: ${person.influence_type || '(empty)'}
- Twitter: ${person.twitter || '(empty)'}
- Notes: ${person.notes || '(empty)'}

WEB SEARCH RESULTS:
${webContent || 'No relevant web content found.'}

FOR THIS ${guidance.type.toUpperCase()}, LOOK FOR: ${guidance.lookFor}

Provide enriched values in JSON:

{
  "title": "Full title with specifics",
  "other_orgs": "Additional affiliations found",
  "location": "Most accurate location",
  "belief_regulatory_stance": "Accelerate | Light-touch | Targeted | Moderate | Restrictive | Precautionary | Nationalize | Mixed/unclear",
  "belief_regulatory_stance_detail": "1-3 sentences explaining their SPECIFIC position",
  "belief_evidence_source": "Explicitly stated | Inferred from actions | Inferred from associations",
  "belief_agi_timeline": "Already here | 2-3 years | 5-10 years | 10-25 years | 25+ years or never | Ill-defined | Unknown",
  "belief_ai_risk": "Overstated | Manageable | Serious | Catastrophic | Existential | Mixed/nuanced | Unknown",
  "belief_threat_models": "MAX 3, comma-separated from: Labor displacement, Economic inequality, Power concentration, Democratic erosion, Cybersecurity, Misinformation, Environmental, Weapons, Loss of control, Copyright/IP, Existential risk",
  "influence_type": "Comma-separated from: Decision-maker, Advisor/strategist, Researcher/analyst, Funder/investor, Builder, Organizer/advocate, Narrator, Implementer, Connector/convener",
  "twitter": "@handle",
  "notes": "2-4 sentences with SPECIFIC facts"
}

CRITICAL:
1. Only include fields where you have evidence. Use null for fields with no information.
2. Be precise and factual — include dates, bill names, publications where possible.

Return ONLY the JSON object.`;
}

// ── Validate and clean the LLM response ──
function validateResponse(data) {
  const clean = {};

  if (data.title && typeof data.title === 'string' && data.title.length > 2) {
    clean.title = data.title.substring(0, 195);
  }
  if (data.other_orgs && typeof data.other_orgs === 'string' && data.other_orgs.length > 2) {
    clean.other_orgs = data.other_orgs.substring(0, 195);
  }
  if (data.location && typeof data.location === 'string' && data.location.length > 2) {
    clean.location = data.location.substring(0, 195);
  }
  if (data.belief_regulatory_stance && VALID_STANCES.includes(data.belief_regulatory_stance)) {
    clean.belief_regulatory_stance = data.belief_regulatory_stance;
  }
  if (data.belief_regulatory_stance_detail && typeof data.belief_regulatory_stance_detail === 'string') {
    clean.belief_regulatory_stance_detail = data.belief_regulatory_stance_detail.substring(0, 2000);
  }
  if (data.belief_evidence_source && VALID_EVIDENCE.includes(data.belief_evidence_source)) {
    clean.belief_evidence_source = data.belief_evidence_source;
  }
  if (data.belief_agi_timeline && VALID_TIMELINES.includes(data.belief_agi_timeline)) {
    clean.belief_agi_timeline = data.belief_agi_timeline;
  }
  if (data.belief_ai_risk && VALID_RISKS.includes(data.belief_ai_risk)) {
    clean.belief_ai_risk = data.belief_ai_risk;
  }
  if (data.belief_threat_models && typeof data.belief_threat_models === 'string') {
    // Validate each threat model and enforce max 3 limit
    const models = data.belief_threat_models.split(',').map(t => t.trim()).filter(t => VALID_THREAT_MODELS.includes(t));
    if (models.length > 0) {
      clean.belief_threat_models = models.slice(0, MAX_THREAT_MODELS).join(', ');
    }
  }
  if (data.influence_type && typeof data.influence_type === 'string') {
    const types = data.influence_type.split(',').map(t => t.trim()).filter(t => VALID_INFLUENCE.includes(t));
    if (types.length > 0) {
      clean.influence_type = types.join(', ');
    }
  }
  if (data.twitter && typeof data.twitter === 'string') {
    let handle = data.twitter.trim();
    if (!handle.startsWith('@')) handle = '@' + handle;
    if (/^@[A-Za-z0-9_]{1,15}$/.test(handle)) {
      clean.twitter = handle;
    }
  }
  if (data.notes && typeof data.notes === 'string' && data.notes.length > 10) {
    clean.notes = data.notes.substring(0, 3000);
  }

  return clean;
}

// ── Build search queries based on person's role ──
function getSearchQueries(person) {
  const name = `"${person.name}"`;
  const context = [person.title, person.primary_org].filter(Boolean).join(' ');
  const cat = (person.category || '').toLowerCase();

  const queries = [];

  if (cat.includes('policymaker') || (person.title || '').toLowerCase().match(/senator|congress|assembl|legislat|representative|secretary|commissioner/)) {
    queries.push({ q: `${name} AI legislation bill sponsor testimony`, n: 5 });
    queries.push({ q: `${name} AI regulation vote policy statement`, n: 4 });
  } else if (cat.includes('executive') || (person.title || '').toLowerCase().match(/ceo|cto|founder|chief|president|director/)) {
    queries.push({ q: `${name} ${person.primary_org || ''} AI policy safety responsible`, n: 5 });
    queries.push({ q: `${name} interview AI regulation government`, n: 4 });
  } else if (cat.includes('researcher') || cat.includes('academic') || (person.title || '').toLowerCase().match(/professor|researcher|scientist|phd/)) {
    queries.push({ q: `${name} AI research paper safety alignment`, n: 5 });
    queries.push({ q: `${name} AI expert testimony policy recommendation`, n: 4 });
  } else if (cat.includes('investor')) {
    queries.push({ q: `${name} AI investment portfolio thesis`, n: 5 });
    queries.push({ q: `${name} AI startup funding safety`, n: 4 });
  } else if (cat.includes('journalist') || cat.includes('cultural')) {
    queries.push({ q: `${name} AI coverage writing book article`, n: 5 });
    queries.push({ q: `${name} AI opinion views interview`, n: 4 });
  } else {
    queries.push({ q: `${name} ${context} AI policy regulation stance`, n: 5 });
    queries.push({ q: `${name} AI views position statement`, n: 4 });
  }

  queries.push({ q: `${name} AI safety risk existential AGI timeline`, n: 4 });
  queries.push({ q: `${name} ${context} biography career education award`, n: 4 });
  queries.push({ q: `${name} AI 2024 2025`, n: 3 });

  return queries;
}

// ── Enrich a single person ──
async function enrichPerson(client, person) {
  console.log(`\n[${person.id}] ${person.name}${person.title ? ' (' + person.title + ')' : ''}`);
  console.log(`  Category: ${person.category || 'unknown'}`);

  const queries = getSearchQueries(person);

  const allResults = [];
  for (const { q, n } of queries) {
    const res = await exaSearch(q, {
      type: 'auto',
      numResults: n,
      highlights: { numSentences: 10, highlightsPerUrl: 5 }
    });
    allResults.push(...res.results);
  }

  const allHighlights = allResults.flatMap(r => r.highlights || []);

  if (allHighlights.length === 0) {
    console.log('  No web content found, skipping');
    skipped++;
    return;
  }

  const sourcesWithHighlights = allResults
    .filter(r => r.highlights && r.highlights.length > 0)
    .map(r => `[Source: ${r.url}]\n${r.highlights.join('\n')}`)
    .slice(0, 15);

  const webContent = sourcesWithHighlights.join('\n\n---\n\n');
  console.log(`  Found ${allHighlights.length} highlights from ${allResults.length} sources`);

  const prompt = buildPrompt(person, webContent);
  console.log(`  Calling Claude Sonnet...`);
  let response;
  try {
    response = await askSonnet(prompt);
  } catch (err) {
    console.log(`  LLM error: ${err.message}`);
    skipped++;
    return;
  }

  let data;
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('  No JSON in response');
      skipped++;
      return;
    }
    data = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.log(`  JSON parse error: ${err.message}`);
    skipped++;
    return;
  }

  const clean = validateResponse(data);

  if (Object.keys(clean).length === 0) {
    console.log('  No valid fields extracted');
    skipped++;
    return;
  }

  // Build UPDATE query
  const updates = [];
  const values = [];
  let idx = 1;

  // Only update title/other_orgs/location if currently empty or new is better
  if (clean.title && (!person.title || clean.title.length > person.title.length)) {
    updates.push(`title = $${idx++}`);
    values.push(clean.title);
  }
  if (clean.other_orgs && (!person.other_orgs || clean.other_orgs.length > person.other_orgs.length)) {
    updates.push(`other_orgs = $${idx++}`);
    values.push(clean.other_orgs);
  }
  if (clean.location && !person.location) {
    updates.push(`location = $${idx++}`);
    values.push(clean.location);
  }

  // Belief fields - only update if currently empty (don't overwrite existing data)
  if (clean.belief_regulatory_stance && !person.belief_regulatory_stance) {
    updates.push(`belief_regulatory_stance = $${idx++}`);
    values.push(clean.belief_regulatory_stance);
  }
  if (clean.belief_regulatory_stance_detail && !person.belief_regulatory_stance_detail) {
    updates.push(`belief_regulatory_stance_detail = $${idx++}`);
    values.push(clean.belief_regulatory_stance_detail);
  }
  if (clean.belief_evidence_source && !person.belief_evidence_source) {
    updates.push(`belief_evidence_source = $${idx++}`);
    values.push(clean.belief_evidence_source);
  }
  if (clean.belief_agi_timeline && !person.belief_agi_timeline) {
    updates.push(`belief_agi_timeline = $${idx++}`);
    values.push(clean.belief_agi_timeline);
  }
  if (clean.belief_ai_risk && !person.belief_ai_risk) {
    updates.push(`belief_ai_risk = $${idx++}`);
    values.push(clean.belief_ai_risk);
  }
  if (clean.belief_threat_models && !person.belief_threat_models) {
    updates.push(`belief_threat_models = $${idx++}`);
    values.push(clean.belief_threat_models);
  }
  if (clean.influence_type && !person.influence_type) {
    updates.push(`influence_type = $${idx++}`);
    values.push(clean.influence_type);
  }
  if (clean.twitter && !person.twitter) {
    updates.push(`twitter = $${idx++}`);
    values.push(clean.twitter);
  }
  // Notes - only update if currently empty
  if (clean.notes && !person.notes) {
    updates.push(`notes = $${idx++}`);
    values.push(clean.notes);
  }

  if (updates.length === 0) {
    console.log('  No updates needed (all fields already populated)');
    skipped++;
    return;
  }

  values.push(person.id);
  await client.query(`UPDATE entity SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, values);
  enriched++;

  console.log('  ✓ ENRICHED:');
  Object.keys(clean).forEach(k => {
    const val = clean[k];
    const display = typeof val === 'string' && val.length > 100 ? val.substring(0, 100) + '...' : val;
    console.log(`    ${k}: ${display}`);
  });
}

// ── Progress tracking ──
const PROGRESS_FILE = 'data/enrichment-people-progress.json';

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      return new Set(data.completedIds || []);
    }
  } catch (err) {
    console.log(`Warning: Could not load progress file: ${err.message}`);
  }
  return new Set();
}

function saveProgress(completedIds, stats) {
  const data = {
    completedIds: Array.from(completedIds),
    lastUpdated: new Date().toISOString(),
    stats: stats
  };
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

// ── Main ──
async function main() {
  console.log('Deep People Enrichment (3-table schema)');
  console.log('========================================\n');

  if (!singleId && !specificIds && !doAll && !newOnly) {
    console.log('Usage:');
    console.log('  --pilot        First 5 people only');
    console.log('  --id=123       Single person by ID');
    console.log('  --ids=1,2,3    Specific IDs only');
    console.log('  --new-only     Only people without stance data');
    console.log('  --all          All people');
    console.log('  --force        Ignore progress, re-run');
    return;
  }

  const completedIds = loadProgress();

  if (completedIds.size > 0 && !forceRerun) {
    console.log(`Resuming: ${completedIds.size} people already processed`);
    console.log(`(Use --force to start fresh)\n`);
  }

  const client = await pool.connect();
  try {
    // Build query for entity table
    let query = `
      SELECT id, name, title, primary_org, other_orgs, category, location,
             belief_regulatory_stance, belief_regulatory_stance_detail, belief_evidence_source,
             belief_agi_timeline, belief_ai_risk, belief_threat_models,
             influence_type, twitter, bluesky, notes
      FROM entity
      WHERE entity_type = 'person' AND status = 'approved'
    `;

    if (singleId) {
      query += ` AND id = ${singleId}`;
    } else if (specificIds) {
      query += ` AND id IN (${specificIds.join(',')})`;
    } else if (newOnly) {
      query += ` AND belief_regulatory_stance IS NULL`;
    }

    query += ` ORDER BY id`;

    if (pilotMode) {
      query += ` LIMIT 5`;
    }

    const result = await client.query(query);

    let peopleToProcess = result.rows;
    if (!forceRerun && !pilotMode && !singleId && !specificIds) {
      peopleToProcess = result.rows.filter(p => !completedIds.has(p.id));
    }

    const total = peopleToProcess.length;
    console.log(`Found ${total} people to process\n`);

    if (total === 0) {
      console.log('Nothing to process!');
      return;
    }

    for (let i = 0; i < peopleToProcess.length; i++) {
      const person = peopleToProcess[i];
      console.log(`\n[${i + 1}/${total}] ─────────────────────────────────────`);

      await enrichPerson(client, person);

      completedIds.add(person.id);
      saveProgress(completedIds, { enriched, skipped, exaSearches, llmCalls });
    }

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Processed: ${total}`);
    console.log(`Enriched: ${enriched}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Exa searches: ${exaSearches}`);
    console.log(`LLM calls: ${llmCalls}`);
    console.log(`Tokens: ${inputTokens} in, ${outputTokens} out`);

    const exaCost = exaSearches * 0.01;
    const llmCost = (inputTokens * 3 + outputTokens * 15) / 1000000;
    console.log(`\nEstimated cost: $${(exaCost + llmCost).toFixed(3)}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Enrichment failed:', err);
  process.exit(1);
});
