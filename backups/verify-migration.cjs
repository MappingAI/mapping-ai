const pg = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  console.log('=== MIGRATION VERIFICATION ===\n');

  // Load staging backup for comparison
  const backupEntities = JSON.parse(fs.readFileSync('backups/staging-20260415-with-importance/entities.json'));
  const backupEdges = JSON.parse(fs.readFileSync('backups/staging-20260415-with-importance/edges.json'));

  // 1. Count verification
  console.log('--- COUNT VERIFICATION ---');
  const entityCount = await pool.query('SELECT COUNT(*) FROM entity');
  const edgeCount = await pool.query('SELECT COUNT(*) FROM edge');
  const submissionCount = await pool.query('SELECT COUNT(*) FROM submission');

  console.log('Entities: DB=' + entityCount.rows[0].count + ', Backup=' + backupEntities.length);
  console.log('Edges: DB=' + edgeCount.rows[0].count + ', Backup (raw)=' + backupEdges.length);
  console.log('Submissions: DB=' + submissionCount.rows[0].count + ' (preserved from production)');

  // 2. Entity spot checks (10 random samples)
  console.log('\n--- ENTITY SPOT CHECK (10 samples) ---');
  const sampleIds = [1, 100, 250, 500, 750, 928, 1000, 1200, 1500, 1695];
  let entityMatches = 0;

  for (const id of sampleIds) {
    const backupEntity = backupEntities.find(e => e.id === id);
    if (!backupEntity) {
      console.log('[' + id + '] Not in backup');
      continue;
    }

    const dbResult = await pool.query('SELECT * FROM entity WHERE id = $1', [id]);
    const dbEntity = dbResult.rows[0];

    if (!dbEntity) {
      console.log('[' + id + '] ' + backupEntity.name + ' - MISSING in DB ✗');
      continue;
    }

    // Compare key fields
    const fieldsToCheck = ['name', 'entity_type', 'category', 'importance', 'primary_org', 'title'];
    let allMatch = true;
    let mismatches = [];

    for (const field of fieldsToCheck) {
      if (JSON.stringify(dbEntity[field]) !== JSON.stringify(backupEntity[field])) {
        allMatch = false;
        mismatches.push(field + ': DB=' + dbEntity[field] + ' vs Backup=' + backupEntity[field]);
      }
    }

    if (allMatch) {
      console.log('[' + id + '] ' + dbEntity.name + ' (' + dbEntity.entity_type + ', importance=' + dbEntity.importance + ') ✓');
      entityMatches++;
    } else {
      console.log('[' + id + '] ' + dbEntity.name + ' - MISMATCH ✗');
      for (const m of mismatches) {
        console.log('      ' + m);
      }
    }
  }
  console.log('Entity match rate: ' + entityMatches + '/' + sampleIds.length);

  // 3. Edge spot checks (5 samples)
  console.log('\n--- EDGE SPOT CHECK (5 samples) ---');
  const edgeSamples = [backupEdges[0], backupEdges[100], backupEdges[500], backupEdges[1000], backupEdges[2000]];
  let edgeMatches = 0;

  for (const backupEdge of edgeSamples) {
    if (!backupEdge) continue;

    const dbResult = await pool.query(
      'SELECT * FROM edge WHERE source_id = $1 AND target_id = $2 AND edge_type = $3',
      [backupEdge.source_id, backupEdge.target_id, backupEdge.edge_type]
    );
    const dbEdge = dbResult.rows[0];

    // Get entity names for context
    const srcResult = await pool.query('SELECT name FROM entity WHERE id = $1', [backupEdge.source_id]);
    const tgtResult = await pool.query('SELECT name FROM entity WHERE id = $1', [backupEdge.target_id]);
    const srcName = srcResult.rows[0]?.name || backupEdge.source_id;
    const tgtName = tgtResult.rows[0]?.name || backupEdge.target_id;

    if (dbEdge) {
      console.log('[Edge] ' + srcName + ' → ' + tgtName + ' (' + backupEdge.edge_type + ') ✓');
      edgeMatches++;
    } else {
      console.log('[Edge] ' + srcName + ' → ' + tgtName + ' (' + backupEdge.edge_type + ') - MISSING ✗');
    }
  }
  console.log('Edge match rate: ' + edgeMatches + '/5');

  // 4. Importance distribution
  console.log('\n--- IMPORTANCE DISTRIBUTION ---');
  const importance = await pool.query('SELECT importance, COUNT(*) as count FROM entity GROUP BY importance ORDER BY importance');
  for (const row of importance.rows) {
    console.log('  ' + (row.importance || 'NULL') + ': ' + row.count);
  }

  // 5. Connor's merged duplicates verification (should NOT exist)
  console.log('\n--- MERGED DUPLICATES CHECK ---');
  const duplicateNames = ['President Biden', 'President Trump', 'Satya Nadela', 'Sam Altma', 'Yann Lecun'];
  for (const name of duplicateNames) {
    const result = await pool.query('SELECT id, name FROM entity WHERE name = $1', [name]);
    if (result.rows.length === 0) {
      console.log('"' + name + '" - correctly removed ✓');
    } else {
      console.log('"' + name + '" - still exists ✗');
    }
  }

  // 6. Verify correct names exist
  console.log('\n--- CORRECT NAMES CHECK ---');
  const correctNames = ['Joe Biden', 'Donald Trump', 'Satya Nadella', 'Sam Altman', 'Yann LeCun'];
  for (const name of correctNames) {
    const result = await pool.query('SELECT id, name, importance FROM entity WHERE name = $1', [name]);
    if (result.rows.length > 0) {
      console.log('[' + result.rows[0].id + '] ' + name + ' (importance=' + result.rows[0].importance + ') ✓');
    } else {
      console.log('"' + name + '" - MISSING ✗');
    }
  }

  // 7. Submissions preserved
  console.log('\n--- SUBMISSIONS PRESERVED ---');
  const submissions = await pool.query("SELECT id, entity_type, name, resource_title, status FROM submission ORDER BY id");
  for (const s of submissions.rows) {
    console.log('[' + s.id + '] ' + (s.name || s.resource_title || 'unnamed') + ' (' + s.entity_type + ') - ' + s.status);
  }

  pool.end();
  console.log('\n=== VERIFICATION COMPLETE ===');
}

verify().catch(e => { console.error(e); pool.end(); });
