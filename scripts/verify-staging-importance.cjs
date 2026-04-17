const pg = require('pg');
const fs = require('fs');
require('dotenv').config();

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

async function verify() {
  const backupEntities = JSON.parse(fs.readFileSync('backups/staging-20260415-with-importance/entities.json'));
  const backupEdges = JSON.parse(fs.readFileSync('backups/staging-20260415-with-importance/edges.json'));

  console.log('=== STAGING WITH IMPORTANCE BACKUP VERIFICATION ===\n');

  // Entity spot check
  console.log('--- Entity Spot Check (3 samples) ---');
  const sampleIds = [1, 544, 928];

  for (const id of sampleIds) {
    const backupRow = backupEntities.find(e => e.id === id);
    const dbResult = await stagingPool.query('SELECT * FROM entity WHERE id = $1', [id]);
    const dbRow = dbResult.rows[0];

    if (!backupRow || !dbRow) {
      console.log('ID ' + id + ' missing');
      continue;
    }

    console.log('\n[' + id + '] ' + backupRow.name);

    const allFields = Object.keys(backupRow);
    let matches = 0;
    for (const field of allFields) {
      if (JSON.stringify(backupRow[field]) === JSON.stringify(dbRow[field])) matches++;
    }
    console.log('  All fields match: ' + matches + '/' + allFields.length + (matches === allFields.length ? ' ✓' : ''));
    console.log('  Importance: ' + backupRow.importance);
  }

  // Edge spot check
  console.log('\n--- Edge Spot Check (2 samples) ---');
  for (const idx of [0, 500]) {
    const backupEdge = backupEdges[idx];
    const dbResult = await stagingPool.query('SELECT * FROM edge WHERE id = $1', [backupEdge.id]);
    const dbEdge = dbResult.rows[0];

    if (!dbEdge) {
      console.log('Edge ' + backupEdge.id + ' missing');
      continue;
    }

    console.log('\n[Edge ' + backupEdge.id + '] ' + backupEdge.edge_type);

    const allFields = Object.keys(backupEdge);
    let matches = 0;
    for (const f of allFields) {
      if (JSON.stringify(backupEdge[f]) === JSON.stringify(dbEdge[f])) matches++;
    }
    console.log('  All fields match: ' + matches + '/' + allFields.length + (matches === allFields.length ? ' ✓' : ''));
  }

  stagingPool.end();
}

verify().catch(e => { console.error(e); stagingPool.end(); });
