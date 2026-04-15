const pg = require('pg');
const fs = require('fs');
require('dotenv').config();

const prodPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  // Load production backup
  const backupEntities = JSON.parse(fs.readFileSync('backups/production-20260415/entities.json'));
  const backupEdges = JSON.parse(fs.readFileSync('backups/production-20260415/edges.json'));

  console.log('=== PRODUCTION BACKUP COLUMN CHECK ===');
  const entityCols = Object.keys(backupEntities[0]);
  console.log('Entity columns in backup:', entityCols.length);
  console.log(entityCols.join(', '));

  const edgeCols = Object.keys(backupEdges[0]);
  console.log('\nEdge columns in backup:', edgeCols.length);
  console.log(edgeCols.join(', '));

  // Sample 3 entities and compare ALL fields
  console.log('\n=== PRODUCTION ENTITY SPOT CHECK (3 samples) ===');
  const sampleIds = [1, 100, 500];

  for (const id of sampleIds) {
    const backupRow = backupEntities.find(e => e.id === id);
    const dbResult = await prodPool.query('SELECT * FROM entity WHERE id = $1', [id]);
    const dbRow = dbResult.rows[0];

    if (!backupRow || !dbRow) {
      console.log('ID ' + id + ' missing');
      continue;
    }

    console.log('\n[' + id + '] ' + backupRow.name);

    const allFields = Object.keys(backupRow);
    let matches = 0;
    let mismatches = [];

    for (const field of allFields) {
      const backupVal = JSON.stringify(backupRow[field]);
      const dbVal = JSON.stringify(dbRow[field]);
      if (backupVal === dbVal) {
        matches++;
      } else {
        mismatches.push(field);
      }
    }

    console.log('  All fields match: ' + matches + '/' + allFields.length + (matches === allFields.length ? ' ✓' : ''));
    if (mismatches.length > 0) {
      console.log('  Mismatches: ' + mismatches.join(', '));
    }
  }

  // Sample 2 edges
  console.log('\n=== PRODUCTION EDGE SPOT CHECK (2 samples) ===');
  for (const idx of [0, 100]) {
    const backupEdge = backupEdges[idx];
    const dbResult = await prodPool.query('SELECT * FROM edge WHERE id = $1', [backupEdge.id]);
    const dbEdge = dbResult.rows[0];

    if (!dbEdge) {
      console.log('Edge ' + backupEdge.id + ' missing');
      continue;
    }

    console.log('\n[Edge ' + backupEdge.id + '] ' + backupEdge.edge_type);

    const allFields = Object.keys(backupEdge);
    let matches = 0;
    let mismatches = [];
    for (const f of allFields) {
      if (JSON.stringify(backupEdge[f]) === JSON.stringify(dbEdge[f])) {
        matches++;
      } else {
        mismatches.push(f);
      }
    }
    console.log('  All fields match: ' + matches + '/' + allFields.length + (matches === allFields.length ? ' ✓' : ''));
    if (mismatches.length > 0) {
      console.log('  Mismatches: ' + mismatches.join(', '));
    }
  }

  prodPool.end();
}

verify().catch(e => { console.error(e); prodPool.end(); });
