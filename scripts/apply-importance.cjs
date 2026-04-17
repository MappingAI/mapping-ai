const pg = require('pg');
const fs = require('fs');
require('dotenv').config();

// Use main user for staging (has ALTER permissions)
const mainUrl = process.env.DATABASE_URL;
const match = mainUrl.match(/postgresql:\/\/([^:]+):([^@]+)@/);
const [, user, pass] = match;

const stagingPool = new pg.Pool({
  host: 'mapping-ai-db.c9sccou2k3xe.eu-west-2.rds.amazonaws.com',
  port: 5432,
  database: 'mapping_ai_staging',
  user: user,
  password: pass,
  ssl: { rejectUnauthorized: false }
});

function parseCSV(filepath) {
  const csv = fs.readFileSync(filepath, 'utf8');
  const lines = csv.trim().split('\n').slice(1); // skip header
  const ratings = [];

  for (const line of lines) {
    // Parse: id,name,category,importance,rationale
    // Handle quoted fields with commas
    const match = line.match(/^(\d+),([^,]*),([^,]*),(\d+),/);
    if (match) {
      ratings.push({
        id: parseInt(match[1]),
        importance: parseInt(match[4])
      });
    }
  }
  return ratings;
}

async function apply() {
  console.log('Loading importance ratings from CSVs...');

  const persons = parseCSV('enrichment/logs/importance/importance_ratings_persons.csv');
  const orgs = parseCSV('enrichment/logs/importance/importance_ratings_orgs.csv');
  const resources = parseCSV('enrichment/logs/importance/importance_ratings_resources.csv');

  console.log('  Persons:', persons.length);
  console.log('  Orgs:', orgs.length);
  console.log('  Resources:', resources.length);

  const allRatings = [...persons, ...orgs, ...resources];
  console.log('  Total:', allRatings.length);

  // Get existing entity IDs in staging
  const existing = await stagingPool.query('SELECT id FROM entity');
  const existingIds = new Set(existing.rows.map(r => r.id));

  // Filter to only existing entities
  const validRatings = allRatings.filter(r => existingIds.has(r.id));
  const skipped = allRatings.length - validRatings.length;

  console.log('\nApplying ratings...');
  console.log('  Valid (exist in staging):', validRatings.length);
  console.log('  Skipped (not in staging):', skipped);

  // Apply in batches
  let applied = 0;
  let errors = 0;

  for (const rating of validRatings) {
    try {
      await stagingPool.query(
        'UPDATE entity SET importance = $1 WHERE id = $2',
        [rating.importance, rating.id]
      );
      applied++;
    } catch (e) {
      errors++;
      console.error('Error updating id ' + rating.id + ':', e.message);
    }
  }

  console.log('\nResults:');
  console.log('  Applied:', applied);
  console.log('  Errors:', errors);

  // Verify
  const verify = await stagingPool.query('SELECT importance, COUNT(*) as count FROM entity GROUP BY importance ORDER BY importance');
  console.log('\nImportance distribution in staging:');
  for (const row of verify.rows) {
    console.log('  ' + (row.importance || 'NULL') + ': ' + row.count);
  }

  stagingPool.end();
}

apply().catch(e => { console.error(e); stagingPool.end(); });
