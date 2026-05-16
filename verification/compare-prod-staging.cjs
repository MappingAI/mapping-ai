#!/usr/bin/env node

const pg = require('pg');
require('dotenv').config();

const staging = new pg.Pool({ connectionString: process.env.STAGING_DATABASE_URL });
const prod = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function compare() {
  console.log('='.repeat(60));
  console.log('PRODUCTION vs STAGING COMPARISON');
  console.log('='.repeat(60));

  // Get the 154 entity IDs that went through notes verification
  const { rows: noteEntities } = await staging.query(
    `SELECT entity_id FROM note_correction
     WHERE pipeline = 'notes-1-opus' AND status = 'applied'`
  );
  const entityIds = noteEntities.map(r => r.entity_id);
  console.log('\nEntities to compare:', entityIds.length);

  // Compare belief fields
  console.log('\n=== BELIEF FIELDS COMPARISON ===\n');

  const beliefFields = [
    'belief_regulatory_stance',
    'belief_regulatory_stance_detail',
    'belief_agi_timeline',
    'belief_ai_risk',
    'belief_threat_models',
    'belief_evidence_source'
  ];

  const { rows: prodBeliefs } = await prod.query(
    `SELECT id, name,
      belief_regulatory_stance, belief_regulatory_stance_detail,
      belief_agi_timeline, belief_ai_risk, belief_threat_models, belief_evidence_source
    FROM entity WHERE id = ANY($1)`,
    [entityIds]
  );

  const { rows: stagingBeliefs } = await staging.query(
    `SELECT id, name,
      belief_regulatory_stance, belief_regulatory_stance_detail,
      belief_agi_timeline, belief_ai_risk, belief_threat_models, belief_evidence_source
    FROM entity WHERE id = ANY($1)`,
    [entityIds]
  );

  const prodMap = new Map(prodBeliefs.map(r => [r.id, r]));
  const stagingMap = new Map(stagingBeliefs.map(r => [r.id, r]));

  // Track differences per field
  const fieldDiffs = {};
  beliefFields.forEach(f => {
    fieldDiffs[f] = { same: 0, different: 0, prodNull: 0, stagingNull: 0 };
  });

  for (const id of entityIds) {
    const p = prodMap.get(id);
    const s = stagingMap.get(id);
    if (!p || !s) continue;

    for (const field of beliefFields) {
      const pVal = p[field];
      const sVal = s[field];

      if (pVal === sVal) {
        fieldDiffs[field].same++;
      } else {
        fieldDiffs[field].different++;
      }
      if (pVal === null) fieldDiffs[field].prodNull++;
      if (sVal === null) fieldDiffs[field].stagingNull++;
    }
  }

  console.log('Field                              | Same | Diff | ProdNull | StagingNull');
  console.log('-'.repeat(75));
  for (const field of beliefFields) {
    const d = fieldDiffs[field];
    console.log(field + ' | ' + d.same + ' | ' + d.different + ' | ' + d.prodNull + ' | ' + d.stagingNull);
  }

  // Compare notes field
  console.log('\n=== NOTES FIELD COMPARISON ===\n');

  const { rows: prodNotes } = await prod.query(
    `SELECT id, name, notes FROM entity WHERE id = ANY($1)`,
    [entityIds]
  );

  const { rows: stagingNotes } = await staging.query(
    `SELECT id, name, notes FROM entity WHERE id = ANY($1)`,
    [entityIds]
  );

  const prodNotesMap = new Map(prodNotes.map(r => [r.id, r]));
  const stagingNotesMap = new Map(stagingNotes.map(r => [r.id, r]));

  let notesSame = 0, notesDiff = 0;
  const notesDiffList = [];

  for (const id of entityIds) {
    const p = prodNotesMap.get(id);
    const s = stagingNotesMap.get(id);
    if (!p || !s) continue;

    if (p.notes === s.notes) {
      notesSame++;
    } else {
      notesDiff++;
      notesDiffList.push({ id, name: p.name, prodLen: (p.notes || '').length, stagingLen: (s.notes || '').length });
    }
  }

  console.log('Notes SAME between prod & staging: ' + notesSame);
  console.log('Notes DIFFERENT: ' + notesDiff);

  // The notes that are SAME means production was already updated
  // The notes that are DIFFERENT means staging has newer data

  console.log('\n=== INTERPRETATION ===\n');
  console.log('If prod === staging for a field, it means the migration was applied.');
  console.log('If prod !== staging, it means staging has data that was NOT migrated.\n');

  // Show belief field differences in detail
  console.log('\n=== ENTITIES WITH BELIEF DIFFERENCES ===\n');

  let diffCount = 0;
  for (const id of entityIds) {
    const p = prodMap.get(id);
    const s = stagingMap.get(id);
    if (!p || !s) continue;

    const diffs = [];
    for (const field of beliefFields) {
      if (p[field] !== s[field]) {
        diffs.push(field + ': PROD="' + p[field] + '" vs STAGING="' + s[field] + '"');
      }
    }

    if (diffs.length > 0 && diffCount < 5) {
      console.log('[' + id + '] ' + p.name + ':');
      diffs.forEach(d => console.log('  ' + d));
      diffCount++;
    }
  }

  if (diffCount === 0) {
    console.log('No differences found - prod and staging beliefs are in sync.');
  }

  await staging.end();
  await prod.end();
}

compare().catch(console.error);
