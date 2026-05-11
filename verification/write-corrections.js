/**
 * Write Corrections to Database
 *
 * Non-LLM script that applies corrections from the verification pipeline.
 * Reads corrections.jsonl and writes to staging database.
 *
 * Usage:
 *   node write-corrections.js --dry-run              # Preview only
 *   node write-corrections.js --confidence=high      # Apply high-confidence corrections
 *   node write-corrections.js --confidence=medium    # Apply medium+ confidence
 *   node write-corrections.js --review               # Interactive review mode
 *   node write-corrections.js --entity=123           # Single entity only
 *   node write-corrections.js --verdict=wrong        # Only "wrong" verdicts
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// Database - use staging
const DATABASE_URL = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: No DATABASE_URL found.');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Neon pilot DB for claims/sources
const PILOT_DB = process.env.PILOT_DB;
const neonPool = PILOT_DB
  ? new pg.Pool({ connectionString: PILOT_DB, ssl: { rejectUnauthorized: false } })
  : null;

// CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const reviewMode = args.includes('--review');
const confidenceArg = args.find(a => a.startsWith('--confidence='));
const minConfidence = confidenceArg ? confidenceArg.split('=')[1] : 'high';
const entityArg = args.find(a => a.startsWith('--entity='));
const entityFilter = entityArg ? parseInt(entityArg.split('=')[1]) : null;
const verdictArg = args.find(a => a.startsWith('--verdict='));
const verdictFilter = verdictArg ? verdictArg.split('=')[1] : null;

// File paths
const CORRECTIONS_FILE = path.join(__dirname, 'results/corrections.jsonl');
const APPLIED_FILE = path.join(__dirname, 'results/applied-corrections.jsonl');

// Confidence ranking
const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 };

function srcId(url) {
  return 'src-' + crypto.createHash('sha256').update(url).digest('hex').slice(0, 12);
}

// Load corrections from JSONL
function loadCorrections() {
  if (!fs.existsSync(CORRECTIONS_FILE)) {
    console.error(`Corrections file not found: ${CORRECTIONS_FILE}`);
    console.error('Run the verification pipeline first: node run-belief-verification.js');
    process.exit(1);
  }

  const lines = fs.readFileSync(CORRECTIONS_FILE, 'utf-8').trim().split('\n');
  const corrections = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      corrections.push(JSON.parse(line));
    } catch (err) {
      console.warn(`Skipping invalid line: ${err.message}`);
    }
  }

  return corrections;
}

// Filter corrections based on CLI args
function filterCorrections(corrections) {
  return corrections.filter(c => {
    // Entity filter
    if (entityFilter && c.entity_id !== entityFilter) return false;

    // Verdict filter
    if (verdictFilter && c.verdict !== verdictFilter) return false;

    // Confidence filter
    const minRank = CONFIDENCE_RANK[minConfidence] || 1;
    const corrRank = CONFIDENCE_RANK[c.confidence] || 0;
    if (corrRank < minRank) return false;

    // Only actionable verdicts
    if (!['wrong', 'unsupported'].includes(c.verdict)) return false;

    return true;
  });
}

// Apply a single correction
async function applyCorrection(correction) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Update entity belief field
    if (correction.proposed_value !== undefined) {
      const field = correction.field;
      await client.query(
        `UPDATE entity SET ${field} = $1, updated_at = NOW() WHERE id = $2`,
        [correction.proposed_value, correction.entity_id]
      );
    }

    // 2. Update field_verification JSONB
    const verificationUpdate = {
      [correction.field]: {
        status: correction.proposed_value ? 'verified' : 'removed',
        confidence: correction.confidence,
        verified_at: new Date().toISOString(),
        source_url: correction.source_url,
        corrected_from: correction.current_value,
      },
    };

    await client.query(
      `UPDATE entity
       SET field_verification = COALESCE(field_verification, '{}'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(verificationUpdate), correction.entity_id]
    );

    // 3. Log to audit table
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_audit (
        id SERIAL PRIMARY KEY,
        entity_id INTEGER,
        action TEXT NOT NULL,
        field TEXT,
        old_value TEXT,
        new_value TEXT,
        reason TEXT,
        source_url TEXT,
        citation TEXT,
        confidence TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(
      `INSERT INTO verification_audit
        (entity_id, action, field, old_value, new_value, reason, source_url, citation, confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        correction.entity_id,
        correction.verdict === 'wrong' ? 'correct' : 'remove',
        correction.field,
        correction.current_value,
        correction.proposed_value,
        correction.reasoning,
        correction.source_url,
        correction.citation,
        correction.confidence,
      ]
    );

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Write source and claim to Neon (if available)
async function writeSourceAndClaim(correction) {
  if (!neonPool || !correction.source_url || !correction.citation) {
    return false;
  }

  const client = await neonPool.connect();

  try {
    const sourceId = srcId(correction.source_url);

    // Upsert source
    await client.query(
      `INSERT INTO source (source_id, url, source_type)
       VALUES ($1, $2, 'web')
       ON CONFLICT (source_id) DO NOTHING`,
      [sourceId, correction.source_url]
    );

    // Upsert claim
    const beliefDimension = correction.field.replace('belief_', '');
    const claimId = `${correction.entity_id}_${beliefDimension}_${sourceId}`;

    await client.query(
      `INSERT INTO claim
        (claim_id, entity_id, entity_name, entity_type, belief_dimension,
         stance, citation, source_id, claim_type, confidence,
         extracted_by, extraction_model, extraction_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_DATE)
       ON CONFLICT (claim_id) DO UPDATE SET
         stance = EXCLUDED.stance,
         citation = EXCLUDED.citation,
         confidence = EXCLUDED.confidence,
         extraction_date = CURRENT_DATE`,
      [
        claimId,
        correction.entity_id,
        correction.entity_name,
        correction.entity_type,
        beliefDimension,
        correction.proposed_value,
        correction.citation,
        sourceId,
        correction.attribution_type === 'first_person' ? 'direct_statement' : 'authored_position',
        correction.confidence,
        'belief-verification-v1',
        'claude-sonnet-4',
      ]
    );

    return true;
  } catch (err) {
    console.warn(`  Warning: Failed to write to Neon: ${err.message}`);
    return false;
  } finally {
    client.release();
  }
}

// Log applied correction
function logApplied(correction, status) {
  const entry = {
    ...correction,
    applied_at: new Date().toISOString(),
    status,
  };
  fs.appendFileSync(APPLIED_FILE, JSON.stringify(entry) + '\n');
}

// Interactive review prompt
async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// Review a single correction interactively
async function reviewCorrection(correction, index, total) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/${total}] ${correction.entity_name} (ID: ${correction.entity_id})`);
  console.log('='.repeat(60));
  console.log(`Field: ${correction.field}`);
  console.log(`Current: "${correction.current_value}"`);
  console.log(`Verdict: ${correction.verdict} (${correction.confidence})`);

  if (correction.proposed_value !== undefined) {
    console.log(`Proposed: "${correction.proposed_value}"`);
  }

  if (correction.citation) {
    console.log(`\nCitation: "${correction.citation.substring(0, 200)}..."`);
  }

  if (correction.source_url) {
    console.log(`Source: ${correction.source_url}`);
  }

  if (correction.reasoning) {
    console.log(`\nReasoning: ${correction.reasoning}`);
  }

  const answer = await promptUser('\nApply? [y]es / [n]o / [s]kip all / [q]uit: ');

  if (answer === 'y' || answer === 'yes') return 'apply';
  if (answer === 'n' || answer === 'no') return 'skip';
  if (answer === 's' || answer === 'skip') return 'skip_all';
  if (answer === 'q' || answer === 'quit') return 'quit';

  return 'skip';
}

// Main
async function main() {
  console.log('Write Corrections to Database');
  console.log('=============================\n');

  // Test DB connection
  await pool.query('SELECT 1');
  console.log(`Database: ${DATABASE_URL.includes('staging') ? 'STAGING' : 'PRODUCTION (careful!)'}`);
  console.log(`Neon: ${neonPool ? 'Connected' : 'Not configured'}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : reviewMode ? 'INTERACTIVE REVIEW' : 'AUTO-APPLY'}`);
  console.log(`Min confidence: ${minConfidence}`);

  // Load and filter corrections
  const allCorrections = loadCorrections();
  console.log(`\nLoaded ${allCorrections.length} total corrections`);

  const corrections = filterCorrections(allCorrections);
  console.log(`Filtered to ${corrections.length} actionable corrections`);

  if (corrections.length === 0) {
    console.log('\nNo corrections to apply.');
    await pool.end();
    if (neonPool) await neonPool.end();
    return;
  }

  // Summary of what we'll do
  const summary = {
    wrong: corrections.filter(c => c.verdict === 'wrong').length,
    unsupported: corrections.filter(c => c.verdict === 'unsupported').length,
    high: corrections.filter(c => c.confidence === 'high').length,
    medium: corrections.filter(c => c.confidence === 'medium').length,
    low: corrections.filter(c => c.confidence === 'low').length,
  };

  console.log(`\nCorrections breakdown:`);
  console.log(`  wrong: ${summary.wrong}, unsupported: ${summary.unsupported}`);
  console.log(`  high: ${summary.high}, medium: ${summary.medium}, low: ${summary.low}`);

  if (dryRun) {
    console.log('\n--- DRY RUN - No changes will be made ---\n');
    for (const c of corrections.slice(0, 20)) {
      console.log(`[${c.entity_id}] ${c.entity_name}`);
      console.log(`  ${c.field}: "${c.current_value}" → "${c.proposed_value}" (${c.verdict}/${c.confidence})`);
    }
    if (corrections.length > 20) {
      console.log(`\n... and ${corrections.length - 20} more`);
    }
    await pool.end();
    if (neonPool) await neonPool.end();
    return;
  }

  // Apply corrections
  let applied = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < corrections.length; i++) {
    const correction = corrections[i];

    // Interactive review mode
    if (reviewMode) {
      const decision = await reviewCorrection(correction, i, corrections.length);

      if (decision === 'quit') {
        console.log('\nQuitting...');
        break;
      }

      if (decision === 'skip_all') {
        console.log('\nSkipping remaining corrections...');
        skipped += corrections.length - i;
        break;
      }

      if (decision === 'skip') {
        skipped++;
        logApplied(correction, 'skipped');
        continue;
      }
    }

    // Apply correction
    try {
      await applyCorrection(correction);
      await writeSourceAndClaim(correction);
      applied++;
      logApplied(correction, 'applied');

      if (!reviewMode) {
        console.log(`[${correction.entity_id}] ${correction.field}: "${correction.current_value}" → "${correction.proposed_value}"`);
      }
    } catch (err) {
      errors++;
      logApplied(correction, `error: ${err.message}`);
      console.error(`Error applying [${correction.entity_id}]: ${err.message}`);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('WRITE COMPLETE');
  console.log('='.repeat(60));
  console.log(`Applied: ${applied}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nApplied corrections logged to: ${APPLIED_FILE}`);

  await pool.end();
  if (neonPool) await neonPool.end();
}

main().catch(err => {
  console.error('Error:', err);
  pool.end();
  if (neonPool) neonPool.end();
  process.exit(1);
});
