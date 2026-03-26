/**
 * Phase 1: Import AI Safety Map CSV + Readings + Policy Efforts
 *
 * Splits entries: org-like → organizations table, content-like → resources table
 * Deduplicates against existing DB entries by name (case-insensitive)
 *
 * Usage: node scripts/import-aisafety-csv.js [--dry-run]
 */
import pg from 'pg';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function readCSV(filename) {
  const content = readFileSync(resolve(root, filename), 'utf-8').replace(/^\uFEFF/, '');
  return parse(content, { columns: true, skip_empty_lines: true, trim: true });
}

// Categories that indicate content/resource rather than organization
const RESOURCE_CATEGORIES = new Set(['Blog', 'Podcast', 'Newsletter', 'Video', 'Resource']);
const ORG_CATEGORIES = new Set([
  'Advocacy', 'Capabilities research', 'Career support', 'Conceptual research',
  'Empirical research', 'Forecasting', 'Funding', 'Governance', 'Research support',
  'Strategy', 'Training and education',
]);

// Map AI Safety Map categories to our org category system
function mapOrgCategory(csvCats) {
  const cats = csvCats.map(c => c.trim()).filter(Boolean);
  if (cats.some(c => ['Advocacy', 'Strategy'].includes(c))) return 'AI Safety/Alignment';
  if (cats.some(c => c === 'Governance')) return 'Think Tank/Policy Org';
  if (cats.some(c => c === 'Funding')) return 'VC/Capital/Philanthropy';
  if (cats.some(c => ['Empirical research', 'Conceptual research', 'Capabilities research'].includes(c))) return 'AI Safety/Alignment';
  if (cats.some(c => ['Training and education', 'Career support'].includes(c))) return 'Academic';
  if (cats.some(c => c === 'Research support')) return 'AI Safety/Alignment';
  if (cats.some(c => c === 'Forecasting')) return 'Think Tank/Policy Org';
  return 'AI Safety/Alignment'; // default for AI safety orgs
}

// Map content categories to resource type
function mapResourceType(csvCats) {
  const cats = csvCats.map(c => c.trim());
  if (cats.includes('Blog')) return 'Substack/Newsletter';
  if (cats.includes('Podcast')) return 'Podcast';
  if (cats.includes('Newsletter')) return 'Substack/Newsletter';
  if (cats.includes('Video')) return 'Video';
  if (cats.includes('Resource')) return 'Website';
  return 'Website';
}

// Map readings CSV type to our resource_type
function mapReadingType(csvType) {
  const t = (csvType || '').toLowerCase();
  if (t.includes('blog') || t.includes('substack')) return 'Substack/Newsletter';
  if (t.includes('book')) return 'Book';
  if (t.includes('paper') || t.includes('academic')) return 'Academic Paper';
  if (t.includes('report')) return 'Report';
  if (t.includes('essay')) return 'Essay';
  if (t.includes('podcast')) return 'Podcast';
  if (t.includes('video')) return 'Video';
  if (t.includes('article') || t.includes('news')) return 'News Article';
  return 'Essay'; // default
}

async function importData() {
  const client = await pool.connect();
  try {
    // Get existing names for dedup
    const existingOrgs = await client.query('SELECT LOWER(name) as name FROM organizations');
    const existingOrgNames = new Set(existingOrgs.rows.map(r => r.name));
    const existingResources = await client.query('SELECT LOWER(title) as title FROM resources');
    const existingResourceNames = new Set(existingResources.rows.map(r => r.title));

    console.log(`Existing: ${existingOrgNames.size} orgs, ${existingResourceNames.size} resources\n`);

    // ── Import AI Safety Map CSV ──
    const aiSafetyRows = readCSV('data/AISafety.com_map.csv');
    console.log(`AI Safety CSV: ${aiSafetyRows.length} rows`);

    let newOrgs = 0, newResources = 0, skippedDupes = 0, skippedInactive = 0;

    for (const row of aiSafetyRows) {
      const name = (row['Long name'] || '').trim();
      if (!name) continue;

      const csvCats = (row['Category'] || '').split(',').map(c => c.trim());
      const status = (row['Status'] || '').trim();
      const description = (row['Description'] || '').trim();
      const link = (row['Link'] || '').trim();

      // Skip inactive entries
      if (status === 'No longer active') {
        skippedInactive++;
        continue;
      }

      // Determine: org or resource?
      const isResource = csvCats.every(c => RESOURCE_CATEGORIES.has(c) || !c);
      const isOrg = csvCats.some(c => ORG_CATEGORIES.has(c));

      if (isResource && !isOrg) {
        // → Resources table
        if (existingResourceNames.has(name.toLowerCase())) { skippedDupes++; continue; }
        const resourceType = mapResourceType(csvCats);
        const notes = description ? `From AISafety.com map. ${description}` : 'From AISafety.com map.';

        if (!dryRun) {
          await client.query(
            `INSERT INTO resources (title, resource_type, url, category, notes, status, submitted_at)
             VALUES ($1, $2, $3, 'AI Safety', $4, 'approved', NOW())
             ON CONFLICT DO NOTHING`,
            [name, resourceType, link || null, notes]
          );
        }
        existingResourceNames.add(name.toLowerCase());
        newResources++;
        console.log(`  + [resource] ${name} (${resourceType})`);
      } else {
        // → Organizations table
        if (existingOrgNames.has(name.toLowerCase())) { skippedDupes++; continue; }
        const category = mapOrgCategory(csvCats);
        const notes = description ? `From AISafety.com map. ${description}` : 'From AISafety.com map.';

        if (!dryRun) {
          await client.query(
            `INSERT INTO organizations (name, category, website, notes, status, submitted_at)
             VALUES ($1, $2, $3, $4, 'approved', NOW())
             ON CONFLICT DO NOTHING`,
            [name, category, link || null, notes]
          );
        }
        existingOrgNames.add(name.toLowerCase());
        newOrgs++;
        console.log(`  + [org] ${name} (${category})`);
      }
    }

    console.log(`\nAI Safety CSV: ${newOrgs} orgs, ${newResources} resources added (${skippedDupes} dupes, ${skippedInactive} inactive skipped)\n`);

    // ── Import Readings CSV ──
    const readingsRows = readCSV('data/Readings-Grid view.csv');
    console.log(`Readings CSV: ${readingsRows.length} rows`);
    let newReadings = 0;

    for (const row of readingsRows) {
      const title = (row['Title'] || '').trim();
      if (!title) continue;
      if (existingResourceNames.has(title.toLowerCase())) { console.log(`  skip (dupe): ${title}`); continue; }

      const author = (row['Author'] || '').trim();
      const resourceType = mapReadingType(row['Type'] || '');
      const year = (row['Year'] || '').trim();
      const url = (row['URL'] || '').trim();
      const relatedOrgs = (row['Related orgs'] || '').trim();
      const notes = relatedOrgs ? `Related: ${relatedOrgs}` : null;

      if (!dryRun) {
        await client.query(
          `INSERT INTO resources (title, author, resource_type, url, year, category, notes, status, submitted_at)
           VALUES ($1, $2, $3, $4, $5, 'AI Policy', $6, 'approved', NOW())
           ON CONFLICT DO NOTHING`,
          [title, author || null, resourceType, url || null, year || null, notes]
        );
      }
      existingResourceNames.add(title.toLowerCase());
      newReadings++;
      console.log(`  + [reading] ${title} by ${author || '?'} (${resourceType})`);
    }

    console.log(`\nReadings: ${newReadings} added\n`);

    // ── Import Policy Efforts CSV ──
    const policyRows = readCSV('data/Policy Efforts-Grid view.csv');
    console.log(`Policy Efforts CSV: ${policyRows.length} rows`);
    let newPolicies = 0;

    for (const row of policyRows) {
      const name = (row['Name'] || '').trim();
      if (!name) continue;
      if (existingResourceNames.has(name.toLowerCase())) { console.log(`  skip (dupe): ${name}`); continue; }

      const type = (row['Type'] || '').trim();
      const status = (row['Status'] || '').trim();
      const jurisdiction = (row['Jurisdiction'] || '').trim();
      const year = (row['Year'] || '').trim();
      const summary = (row['Summary'] || '').trim();
      const url = (row['URL'] || '').trim();
      const notes = [type, status, jurisdiction, summary].filter(Boolean).join('. ');

      if (!dryRun) {
        await client.query(
          `INSERT INTO resources (title, resource_type, url, year, category, notes, status, submitted_at)
           VALUES ($1, 'Report', $2, $3, 'AI Policy', $4, 'approved', NOW())
           ON CONFLICT DO NOTHING`,
          [name, url || null, year || null, notes || `Policy effort: ${type}`]
        );
      }
      existingResourceNames.add(name.toLowerCase());
      newPolicies++;
      console.log(`  + [policy] ${name} (${type || 'policy effort'})`);
    }

    console.log(`\nPolicy efforts: ${newPolicies} added`);
    console.log(`\n=== SUMMARY ===`);
    console.log(`New organizations: ${newOrgs}`);
    console.log(`New resources: ${newResources + newReadings + newPolicies}`);
    console.log(`Duplicates skipped: ${skippedDupes}`);
    console.log(`Inactive skipped: ${skippedInactive}`);
    if (dryRun) console.log('\n(DRY RUN — no data written)');

  } finally {
    client.release();
    await pool.end();
  }
}

importData().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
