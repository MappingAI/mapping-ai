/**
 * Phase 3: Discover new entities via Exa search
 *
 * Finds influential AI policy resources, people, and orgs NOT already in our database.
 * Creates relationships between discovered entities and existing ones.
 *
 * Usage:
 *   node scripts/discover-with-exa.js --resources    # discover resources (~$0.85)
 *   node scripts/discover-with-exa.js --people       # discover people (~$1.20)
 *   node scripts/discover-with-exa.js --all          # everything (~$2.85)
 *   node scripts/discover-with-exa.js --pilot        # 2 searches only (~$0.02)
 */
import pg from 'pg';
import Exa from 'exa-js';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const exa = new Exa(process.env.EXA_API_KEY);

const args = process.argv.slice(2);
const pilotMode = args.includes('--pilot');
const doResources = args.includes('--resources') || args.includes('--all') || pilotMode;
const doPeople = args.includes('--people') || args.includes('--all');

let searchCount = 0;
let newResources = 0;
let newRelationships = 0;

// Load existing titles/names for dedup
let existingResourceTitles = new Set();
let existingPeopleNames = new Set();
let existingOrgNames = new Set();

async function loadExisting(client) {
  const r = await client.query("SELECT LOWER(title) as t FROM resources");
  existingResourceTitles = new Set(r.rows.map(x => x.t));
  const p = await client.query("SELECT LOWER(name) as n FROM people");
  existingPeopleNames = new Set(p.rows.map(x => x.n));
  const o = await client.query("SELECT LOWER(name) as n FROM organizations");
  existingOrgNames = new Set(o.rows.map(x => x.n));
  console.log(`Loaded existing: ${existingResourceTitles.size} resources, ${existingPeopleNames.size} people, ${existingOrgNames.size} orgs\n`);
}

function isDupeResource(title) {
  const t = title.toLowerCase().trim();
  if (existingResourceTitles.has(t)) return true;
  // Fuzzy: check if any existing title contains this or vice versa (> 20 chars)
  if (t.length > 20) {
    for (const existing of existingResourceTitles) {
      if (existing.includes(t.substring(0, 20)) || t.includes(existing.substring(0, 20))) return true;
    }
  }
  return false;
}

function classifyResourceType(url, title, text) {
  const all = (url + ' ' + title + ' ' + text).toLowerCase();
  if (all.includes('podcast') || all.includes('episode') || all.includes('listen')) return 'Podcast';
  if (all.includes('book') || all.includes('isbn') || all.includes('chapter')) return 'Book';
  if (all.includes('arxiv') || all.includes('paper') || all.includes('journal') || all.includes('doi.org')) return 'Academic Paper';
  if (all.includes('report') || all.includes('whitepaper') || all.includes('brief')) return 'Report';
  if (all.includes('video') || all.includes('youtube') || all.includes('watch')) return 'Video';
  if (all.includes('substack') || all.includes('newsletter')) return 'Substack/Newsletter';
  if (all.includes('news') || all.includes('article') || all.includes('nytimes') || all.includes('washingtonpost') || all.includes('reuters')) return 'News Article';
  return 'Essay';
}

function classifyResourceCategory(text) {
  const t = text.toLowerCase();
  if (t.includes('safety') || t.includes('alignment') || t.includes('x-risk') || t.includes('existential')) return 'AI Safety';
  if (t.includes('governance') || t.includes('regulation') || t.includes('policy') || t.includes('legislation')) return 'AI Policy';
  if (t.includes('capability') || t.includes('scaling') || t.includes('benchmark') || t.includes('frontier')) return 'AI Capabilities';
  if (t.includes('labor') || t.includes('job') || t.includes('worker') || t.includes('econom')) return 'Labor & Economy';
  if (t.includes('security') || t.includes('military') || t.includes('defense') || t.includes('china')) return 'National Security';
  if (t.includes('ethic') || t.includes('bias') || t.includes('fairness') || t.includes('rights')) return 'Philosophy/Ethics';
  return 'AI Policy';
}

function extractYear(text, url) {
  // Look for year in URL or text
  const yearMatch = (url + ' ' + text).match(/\b(202[0-6])\b/);
  return yearMatch ? yearMatch[1] : null;
}

function extractAuthor(title, text) {
  // Try to find "by [Author]" patterns
  const byMatch = text.match(/\bby\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+ [A-Z][a-z]+)?)/);
  if (byMatch) return byMatch[1];
  return null;
}

async function discoverResources(limit) {
  const client = await pool.connect();
  try {
    await loadExisting(client);

    const searches = [
      { query: 'influential AI policy paper report 2024 2025 regulation governance', numResults: 15, category: 'research_paper' },
      { query: 'AI governance framework white paper recommendation 2024 2025', numResults: 10 },
      { query: 'AI safety alignment important research paper 2024 2025', numResults: 10, category: 'research_paper' },
      { query: 'AI regulation podcast interview discussion 2024 2025', numResults: 10 },
      { query: 'AI policy book published influential 2023 2024 2025', numResults: 10 },
      { query: 'AI congressional testimony hearing transcript 2024 2025', numResults: 10 },
      { query: 'AI executive order legislation bill signed 2024 2025', numResults: 10 },
      { query: 'AI newsletter substack influential policy analysis', numResults: 10 },
      { query: 'artificial intelligence societal impact labor displacement study report', numResults: 10 },
      { query: 'frontier AI model evaluation safety benchmark report', numResults: 10 },
    ];

    const searchesToRun = pilotMode ? searches.slice(0, 2) : searches;

    for (const s of searchesToRun) {
      console.log(`\nSearching: ${s.query.substring(0, 60)}...`);
      try {
        const res = await exa.searchAndContents(s.query, {
          type: 'auto',
          numResults: s.numResults || 10,
          highlights: { numSentences: 3, highlightsPerUrl: 2 },
          startPublishedDate: '2023-01-01',
          ...(s.category ? { category: s.category } : {}),
        });
        searchCount++;

        for (const r of res.results) {
          const title = r.title?.trim();
          if (!title || title.length < 10) continue;
          if (isDupeResource(title)) {
            console.log(`  skip (dupe): ${title.substring(0, 60)}`);
            continue;
          }

          const highlights = (r.highlights || []).join(' ');
          const resourceType = classifyResourceType(r.url, title, highlights);
          const category = classifyResourceCategory(highlights);
          const year = extractYear(highlights, r.url);
          const author = r.author || extractAuthor(title, highlights);
          const keyArgument = highlights.substring(0, 500) || null;

          await client.query(
            `INSERT INTO resources (title, author, resource_type, url, year, category, key_argument, status, submitted_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', NOW())
             ON CONFLICT DO NOTHING`,
            [title, author, resourceType, r.url, year, category, keyArgument]
          );
          existingResourceTitles.add(title.toLowerCase());
          newResources++;
          console.log(`  + [${resourceType}] ${title.substring(0, 70)} (${year || '?'})`);
        }

        await new Promise(r => setTimeout(r, 150));
      } catch (err) {
        console.log(`  Error: ${err.message}`);
      }
    }

    console.log(`\nDiscovered ${newResources} new resources`);
  } finally {
    client.release();
  }
}

async function main() {
  console.log('Exa Discovery');
  console.log('=============\n');

  if (doResources) await discoverResources();

  console.log('\n=============');
  console.log(`Total searches: ${searchCount}`);
  console.log(`New resources: ${newResources}`);
  console.log(`Estimated cost: $${(searchCount * 0.007 + searchCount * 10 * 0.001).toFixed(2)}`);

  await pool.end();
}

main().catch(err => {
  console.error('Discovery failed:', err);
  process.exit(1);
});
