#!/usr/bin/env node

/**
 * Update field_verification for the 154 verified entities
 *
 * Only marks fields as "verified" if they were actually verified:
 * - Notes: entity has note_correction with status = 'applied'
 * - Beliefs: entity has belief_correction record for that specific field
 *
 * Usage:
 *   node update-field-verification.cjs --dry-run    # Preview changes
 *   node update-field-verification.cjs --apply      # Apply changes
 */

const pg = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const staging = new pg.Pool({ connectionString: process.env.STAGING_DATABASE_URL });
const prod = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const DRY_RUN = !process.argv.includes('--apply');

// Map belief_correction field names to field_verification keys
const BELIEF_FIELD_MAP = {
  'belief_regulatory_stance': 'belief_regulatory_stance',
  'belief_regulatory_stance_detail': 'belief_regulatory_stance_detail',
  'belief_agi_timeline': 'belief_agi_timeline',
  'belief_ai_risk': 'belief_ai_risk',
  'belief_threat_models': 'belief_threat_models',
  'belief_evidence_source': 'belief_evidence_source',
};

async function main() {
  console.log('='.repeat(60));
  console.log('UPDATE FIELD_VERIFICATION FOR VERIFIED ENTITIES');
  console.log('='.repeat(60));
  console.log('\nMode:', DRY_RUN ? 'DRY RUN' : 'APPLY');

  // 1. Get all entities with note_correction (applied)
  const { rows: noteEntities } = await staging.query(`
    SELECT entity_id, confidence
    FROM note_correction
    WHERE pipeline = 'notes-1-opus' AND status = 'applied'
  `);

  const entityIds = noteEntities.map(r => r.entity_id);
  const noteConfidence = new Map(noteEntities.map(r => [r.entity_id, r.confidence]));

  console.log('\nEntities with verified notes:', entityIds.length);

  // 2. Get belief_correction records for these entities
  const { rows: beliefCorrections } = await staging.query(`
    SELECT entity_id, field, verdict, confidence
    FROM belief_correction
    WHERE pipeline = '1-opus' AND entity_id = ANY($1)
    ORDER BY entity_id, field
  `, [entityIds]);

  console.log('Belief correction records:', beliefCorrections.length);

  // 3. Build per-entity field verification updates
  const updates = new Map(); // entity_id -> { field: 'verified', ... }

  // Initialize with notes verification
  for (const id of entityIds) {
    updates.set(id, {
      notes: 'verified'
    });
  }

  // Add belief field verifications
  for (const bc of beliefCorrections) {
    const fieldKey = BELIEF_FIELD_MAP[bc.field];
    if (!fieldKey) continue;

    if (!updates.has(bc.entity_id)) {
      updates.set(bc.entity_id, {});
    }

    updates.get(bc.entity_id)[fieldKey] = 'verified';
  }

  // 4. Get current field_verification from production
  const { rows: currentFV } = await prod.query(`
    SELECT id, name, field_verification
    FROM entity
    WHERE id = ANY($1)
  `, [entityIds]);

  const currentFVMap = new Map(currentFV.map(r => [r.id, { name: r.name, fv: r.field_verification || {} }]));

  // 5. Calculate final field_verification (merge with existing)
  const finalUpdates = [];

  for (const [entityId, newFields] of updates) {
    const current = currentFVMap.get(entityId);
    if (!current) continue;

    const merged = { ...current.fv };

    // Update only the fields we verified
    for (const [field, value] of Object.entries(newFields)) {
      merged[field] = value;
    }

    finalUpdates.push({
      entityId,
      name: current.name,
      newFields: Object.keys(newFields),
      merged
    });
  }

  // 6. Show summary
  console.log('\n=== SUMMARY ===\n');

  // Count fields being marked as verified
  const fieldCounts = {};
  for (const u of finalUpdates) {
    for (const f of u.newFields) {
      fieldCounts[f] = (fieldCounts[f] || 0) + 1;
    }
  }

  console.log('Fields being marked as verified:');
  for (const [field, count] of Object.entries(fieldCounts).sort((a, b) => b[1] - a[1])) {
    console.log('  ' + field + ': ' + count + ' entities');
  }

  // 7. Show sample updates
  console.log('\n=== SAMPLE UPDATES (first 5) ===\n');

  for (const u of finalUpdates.slice(0, 5)) {
    console.log('[' + u.entityId + '] ' + u.name);
    console.log('  Marking as verified: ' + u.newFields.join(', '));
  }

  if (finalUpdates.length > 5) {
    console.log('\n... and ' + (finalUpdates.length - 5) + ' more entities');
  }

  // 8. Apply if not dry run
  if (DRY_RUN) {
    console.log('\n=== DRY RUN - NO CHANGES MADE ===');
    console.log('Run with --apply to update production');
  } else {
    console.log('\n=== APPLYING UPDATES ===\n');

    const client = await prod.connect();
    try {
      await client.query('BEGIN');

      let updated = 0;
      for (const u of finalUpdates) {
        await client.query(
          'UPDATE entity SET field_verification = $1 WHERE id = $2',
          [JSON.stringify(u.merged), u.entityId]
        );
        updated++;
      }

      await client.query('COMMIT');
      console.log('Updated ' + updated + ' entities');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('ROLLBACK:', err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  await staging.end();
  await prod.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
