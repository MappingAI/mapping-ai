const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

// Staging DB credentials - password must be set via STAGING_PASSWORD env var
const pool = new Pool({
  host: 'mapping-ai-db.c9sccou2k3xe.eu-west-2.rds.amazonaws.com',
  port: 5432,
  database: 'mapping_ai_staging',
  user: 'connor_staging',
  password: process.env.STAGING_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

if (!process.env.STAGING_PASSWORD) {
  console.error('ERROR: STAGING_PASSWORD environment variable not set');
  process.exit(1);
}

async function verify() {
  // Load backup
  const backupEntities = JSON.parse(fs.readFileSync('backups/staging-20260415/entities.json'));
  const backupEdges = JSON.parse(fs.readFileSync('backups/staging-20260415/edges.json'));

  // Check columns in backup
  console.log('=== BACKUP COLUMN CHECK ===');
  const sampleEntity = backupEntities[0];
  const entityCols = Object.keys(sampleEntity);
  console.log('Entity columns in backup:', entityCols.length);
  console.log(entityCols.join(', '));

  const sampleEdge = backupEdges[0];
  const edgeCols = Object.keys(sampleEdge);
  console.log('\nEdge columns in backup:', edgeCols.length);
  console.log(edgeCols.join(', '));

  // Sample 3 entities and compare
  console.log('\n=== ENTITY SPOT CHECK (3 samples) ===');
  const sampleIds = [1, 544, 928]; // Stuart Russell, Situational Awareness, Lina Khan

  for (const id of sampleIds) {
    const backupRow = backupEntities.find(e => e.id === id);
    const dbResult = await pool.query('SELECT * FROM entity WHERE id = $1', [id]);
    const dbRow = dbResult.rows[0];

    if (!backupRow) { console.log('ID ' + id + ' missing in backup'); continue; }
    if (!dbRow) { console.log('ID ' + id + ' missing in DB'); continue; }

    console.log('\n[' + id + '] ' + backupRow.name);

    // Compare ALL fields
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

    console.log('  All fields match: ' + matches + '/' + allFields.length);
    if (mismatches.length > 0) {
      console.log('  Mismatches: ' + mismatches.join(', '));
      for (const f of mismatches.slice(0, 3)) {
        const bv = String(backupRow[f] || '').substring(0, 40);
        const dv = String(dbRow[f] || '').substring(0, 40);
        console.log('    ' + f + ': backup="' + bv + '..." vs db="' + dv + '..."');
      }
    }
  }

  // Sample 2 edges
  console.log('\n=== EDGE SPOT CHECK (2 samples) ===');

  for (const idx of [0, 500]) {
    const backupEdge = backupEdges[idx];
    const dbResult = await pool.query('SELECT * FROM edge WHERE id = $1', [backupEdge.id]);
    const dbEdge = dbResult.rows[0];

    if (!dbEdge) { console.log('Edge ' + backupEdge.id + ' missing in DB'); continue; }

    console.log('\n[Edge ' + backupEdge.id + '] ' + backupEdge.edge_type);

    const allFields = Object.keys(backupEdge);
    let matches = 0;
    let mismatches = [];
    for (const f of allFields) {
      const backupVal = JSON.stringify(backupEdge[f]);
      const dbVal = JSON.stringify(dbEdge[f]);
      if (backupVal === dbVal) {
        matches++;
      } else {
        mismatches.push(f);
      }
    }
    console.log('  All fields match: ' + matches + '/' + allFields.length);
    if (mismatches.length > 0) {
      console.log('  Mismatches: ' + mismatches.join(', '));
    }
  }

  pool.end();
}

verify().catch(e => { console.error(e); pool.end(); });
