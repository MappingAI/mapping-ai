/**
 * Belief Field Verification Pipeline
 *
 * Focused pipeline that verifies belief fields and produces actionable corrections.
 * Outputs JSONL for review and commit via write-corrections.js
 *
 * Usage:
 *   node run-belief-verification.js --limit=10              # 10 entities
 *   node run-belief-verification.js --id=123                # Single entity
 *   node run-belief-verification.js --all                   # All entities with belief fields
 *   node run-belief-verification.js --unverified            # Only unverified belief fields
 *   node run-belief-verification.js --resume                # Resume from progress file
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

import { searchForBeliefAttribution, costs as exaCosts } from './lib/exa-search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// API clients
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_MULTIAGENT_VERIFICATION_KEY || process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('ERROR: No Anthropic API key found.');
  process.exit(1);
}
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Database - use staging for safety
const DATABASE_URL = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: No DATABASE_URL found.');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// CLI args
const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;
const singleId = args.find(a => a.startsWith('--id='))?.split('=')[1];
const allMode = args.includes('--all');
const unverifiedOnly = args.includes('--unverified');
const resumeMode = args.includes('--resume');

// Output paths
const RESULTS_DIR = path.join(__dirname, 'results');
const CORRECTIONS_FILE = path.join(RESULTS_DIR, 'corrections.jsonl');
const PROGRESS_FILE = path.join(RESULTS_DIR, 'belief-verification-progress.json');

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Load prompt
const VERIFIER_PROMPT = fs.readFileSync(
  path.join(__dirname, 'agents/prompts/belief-verifier.md'),
  'utf-8'
);

// Belief fields to verify
const BELIEF_FIELDS = [
  'belief_regulatory_stance',
  'belief_agi_timeline',
  'belief_ai_risk',
  'belief_threat_models',
];

// Cost tracking
const costs = {
  claude_calls: 0,
  claude_input_tokens: 0,
  claude_output_tokens: 0,
  claude_cost: 0,

  trackClaude(usage) {
    this.claude_calls++;
    this.claude_input_tokens += usage.input_tokens || 0;
    this.claude_output_tokens += usage.output_tokens || 0;
    // Sonnet pricing
    this.claude_cost =
      (this.claude_input_tokens / 1_000_000) * 3 +
      (this.claude_output_tokens / 1_000_000) * 15;
  },

  summary() {
    const total = this.claude_cost + exaCosts.cost;
    return `Claude: ${this.claude_calls} calls ($${this.claude_cost.toFixed(3)}) | ${exaCosts.summary()} | Total: $${total.toFixed(3)}`;
  },
};

// Progress tracking
function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  } catch {
    return { completed: [], started_at: new Date().toISOString() };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2) + '\n');
}

// Append correction to JSONL
function appendCorrection(correction) {
  fs.appendFileSync(CORRECTIONS_FILE, JSON.stringify(correction) + '\n');
}

// ── Database Queries ──

async function getEntitiesWithBeliefs(options = {}) {
  const { limit: queryLimit, entityId, unverifiedOnly: unverified, completedIds = [] } = options;

  let query = `
    SELECT id, entity_type, name, category,
           belief_regulatory_stance, belief_regulatory_stance_detail,
           belief_evidence_source, belief_agi_timeline, belief_ai_risk,
           belief_threat_models, field_verification
    FROM entity
    WHERE status = 'approved'
      AND (
        belief_regulatory_stance IS NOT NULL
        OR belief_agi_timeline IS NOT NULL
        OR belief_ai_risk IS NOT NULL
        OR belief_threat_models IS NOT NULL
      )
  `;

  const params = [];
  let paramIndex = 1;

  if (entityId) {
    query += ` AND id = $${paramIndex}`;
    params.push(parseInt(entityId));
    paramIndex++;
  }

  if (unverified) {
    query += ` AND (
      field_verification IS NULL
      OR field_verification->>'belief_regulatory_stance' = 'unverified'
      OR field_verification->>'belief_agi_timeline' = 'unverified'
      OR field_verification->>'belief_ai_risk' = 'unverified'
      OR field_verification->>'belief_threat_models' = 'unverified'
    )`;
  }

  if (completedIds.length > 0) {
    query += ` AND id != ALL($${paramIndex})`;
    params.push(completedIds);
    paramIndex++;
  }

  query += ` ORDER BY id`;

  if (queryLimit && !entityId) {
    query += ` LIMIT $${paramIndex}`;
    params.push(queryLimit);
  }

  const result = await pool.query(query, params);
  return result.rows;
}

async function getExistingClaims(entityId) {
  try {
    const result = await pool.query(
      `SELECT belief_dimension, stance, citation, confidence, source_id
       FROM claim WHERE entity_id = $1`,
      [entityId]
    );
    return result.rows;
  } catch {
    // Claims table may not exist
    return [];
  }
}

// ── Verification Logic ──

async function verifyBeliefField(entity, field, existingClaims) {
  const currentValue = entity[field];

  // Skip if null and we're not looking for missing values
  if (!currentValue) {
    return null;
  }

  console.log(`    ${field}: "${currentValue}"`);

  // Search for evidence
  console.log(`      Searching...`);
  const searchResults = await searchForBeliefAttribution(entity.name, field);

  if (!searchResults.success || searchResults.results.length === 0) {
    console.log(`      No sources found`);
    return {
      entity_id: entity.id,
      entity_name: entity.name,
      entity_type: entity.entity_type,
      field,
      current_value: currentValue,
      verdict: 'unsupported',
      proposed_value: null,
      confidence: 'low',
      attribution_type: 'none',
      source_url: null,
      citation: null,
      reasoning: 'No first-person evidence found in search results.',
    };
  }

  console.log(`      Found ${searchResults.results.length} sources, judging...`);

  // Check existing claims for this field
  const relevantClaims = existingClaims.filter(c =>
    c.belief_dimension === field.replace('belief_', '')
  );

  // Build context for verifier
  const context = {
    entity_id: entity.id,
    entity_name: entity.name,
    entity_type: entity.entity_type,
    category: entity.category,
    field,
    current_value: currentValue,
    evidence_source: entity.belief_evidence_source,
    stance_detail: entity.belief_regulatory_stance_detail,
    existing_claims: relevantClaims.map(c => ({
      stance: c.stance,
      citation: c.citation,
      confidence: c.confidence,
    })),
    search_results: searchResults.results.map(r => ({
      url: r.url,
      title: r.title,
      published: r.publishedDate,
      highlights: r.highlights,
      text: r.text?.substring(0, 1500),
    })),
  };

  // Call verifier
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: VERIFIER_PROMPT + '\n\nReturn JSON only, no markdown fences.',
    messages: [{
      role: 'user',
      content: `Verify this belief field:\n\n${JSON.stringify(context, null, 2)}`,
    }],
  });

  costs.trackClaude(response.usage);

  // Parse response
  const text = response.content[0].text.trim();
  try {
    const result = JSON.parse(text);
    console.log(`      Verdict: ${result.verdict} (${result.confidence})`);
    if (result.verdict === 'wrong' && result.proposed_value) {
      console.log(`      Correction: "${currentValue}" → "${result.proposed_value}"`);
    }
    return result;
  } catch {
    // Try extracting JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        console.log(`      Verdict: ${result.verdict} (${result.confidence})`);
        return result;
      } catch {}
    }
    console.log(`      Failed to parse response`);
    return {
      entity_id: entity.id,
      entity_name: entity.name,
      field,
      current_value: currentValue,
      verdict: 'error',
      reasoning: 'Failed to parse verifier response',
      raw_response: text.substring(0, 500),
    };
  }
}

async function verifyEntity(entity) {
  console.log(`\n[${entity.id}] ${entity.name} (${entity.entity_type})`);

  // Get existing claims for context
  const existingClaims = await getExistingClaims(entity.id);

  const corrections = [];

  for (const field of BELIEF_FIELDS) {
    const result = await verifyBeliefField(entity, field, existingClaims);
    if (result) {
      corrections.push(result);
      appendCorrection(result);
    }
  }

  return corrections;
}

// ── Main ──

async function main() {
  console.log('Belief Field Verification Pipeline');
  console.log('===================================\n');

  // Test DB connection
  await pool.query('SELECT 1');
  console.log(`Database: ${DATABASE_URL.includes('staging') ? 'STAGING' : 'PRODUCTION (careful!)'}`);

  // Load progress for resume
  const progress = resumeMode ? loadProgress() : { completed: [], started_at: new Date().toISOString() };
  const completedSet = new Set(progress.completed);

  console.log(`Mode: ${singleId ? `Single entity ${singleId}` : allMode ? 'All entities' : `${limit} entities`}`);
  console.log(`Filter: ${unverifiedOnly ? 'Unverified only' : 'All belief fields'}`);
  if (resumeMode && completedSet.size > 0) {
    console.log(`Resuming: ${completedSet.size} already completed`);
  }

  // Clear corrections file if not resuming
  if (!resumeMode) {
    fs.writeFileSync(CORRECTIONS_FILE, '');
  }

  // Get entities
  const entities = await getEntitiesWithBeliefs({
    limit: allMode ? null : limit,
    entityId: singleId,
    unverifiedOnly,
    completedIds: resumeMode ? progress.completed : [],
  });

  console.log(`\nEntities to process: ${entities.length}\n`);

  // Process
  let totalCorrections = 0;
  const summary = {
    correct: 0,
    wrong: 0,
    unsupported: 0,
    ambiguous: 0,
    error: 0,
  };

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];

    if (completedSet.has(entity.id)) {
      continue;
    }

    console.log(`\n--- ${i + 1}/${entities.length} ---`);

    try {
      const corrections = await verifyEntity(entity);
      totalCorrections += corrections.length;

      for (const c of corrections) {
        summary[c.verdict] = (summary[c.verdict] || 0) + 1;
      }

      // Update progress
      progress.completed.push(entity.id);
      saveProgress(progress);

      // Periodic cost update
      if ((i + 1) % 10 === 0) {
        console.log(`\n  Progress: ${i + 1}/${entities.length} | ${costs.summary()}\n`);
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nEntities processed: ${progress.completed.length}`);
  console.log(`Total corrections: ${totalCorrections}`);
  console.log(`\nVerdicts:`);
  console.log(`  correct: ${summary.correct}`);
  console.log(`  wrong: ${summary.wrong}`);
  console.log(`  unsupported: ${summary.unsupported}`);
  console.log(`  ambiguous: ${summary.ambiguous}`);
  console.log(`  error: ${summary.error}`);
  console.log(`\nCosts: ${costs.summary()}`);
  console.log(`\nCorrections written to: ${CORRECTIONS_FILE}`);
  console.log(`\nNext step: Review corrections, then run:`);
  console.log(`  node write-corrections.js --confidence=high`);
  console.log(`  node write-corrections.js --review  # for medium confidence`);

  await pool.end();
}

main().catch(err => {
  console.error('Pipeline error:', err);
  pool.end();
  process.exit(1);
});
