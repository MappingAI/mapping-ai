import { sql } from '@vercel/postgres';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function readCSV(filename) {
  const content = readFileSync(resolve(root, filename), 'utf-8').replace(/^\uFEFF/, '');
  return parse(content, { columns: true, skip_empty_lines: true, trim: true });
}

async function seed() {
  // --- People ---
  const people = readCSV('data/People-Grid view.csv');
  console.log(`Seeding ${people.length} people...`);

  // Deduplicate by name (CSV has some duplicates like Brian Schatz, Marsha Blackburn, David Sacks)
  const seenPeople = new Set();

  for (const row of people) {
    const name = row['Name']?.trim();
    if (!name || seenPeople.has(name)) continue;
    seenPeople.add(name);

    const title = row['Title']?.trim() || null;
    const primaryOrg = row['Primary org']?.trim() || null;
    const otherOrgs = row['Other orgs']?.trim() || null;
    const category = row['Role type']?.trim() || null;
    const twitter = row['Twitter/X']?.trim() || null;
    const location = row['Location']?.trim() || null;
    const notes = row['Notes']?.trim() || null;

    await sql`
      INSERT INTO people (name, category, title, primary_org, other_orgs, location, twitter, notes, status, submitted_at)
      VALUES (${name}, ${category}, ${title}, ${primaryOrg}, ${otherOrgs}, ${location}, ${twitter}, ${notes}, 'approved', NOW())
      ON CONFLICT DO NOTHING
    `;
  }
  console.log(`  ✓ ${seenPeople.size} unique people seeded`);

  // --- Organizations ---
  const orgs = readCSV('data/Organizations-Grid view.csv');
  console.log(`Seeding ${orgs.length} organizations...`);

  for (const row of orgs) {
    const name = row['Name']?.trim();
    if (!name) continue;

    const category = row['Category']?.trim() || null;
    const website = row['Website']?.trim() || null;
    const location = row['Location']?.trim() || null;
    const fundingModel = row['Funding model']?.trim() || null;
    const regulatoryStance = row['Regulatory stance']?.trim() || null;
    const capabilityBelief = row['Capability belief']?.trim() || null;
    const influenceType = row['Influence type']?.trim() || null;
    const twitter = row['Twitter/X']?.trim() || null;
    const notes = row['Notes']?.trim() || null;

    await sql`
      INSERT INTO organizations (name, category, website, location, funding_model, regulatory_stance, capability_belief, influence_type, twitter, notes, status, submitted_at)
      VALUES (${name}, ${category}, ${website}, ${location}, ${fundingModel}, ${regulatoryStance}, ${capabilityBelief}, ${influenceType}, ${twitter}, ${notes}, 'approved', NOW())
      ON CONFLICT DO NOTHING
    `;
  }
  console.log(`  ✓ ${orgs.length} organizations seeded`);

  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
