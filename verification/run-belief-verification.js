/**
 * Belief Field Adversarial Verification Pipeline
 *
 * Full multi-agent pipeline for verifying belief fields:
 * 1. Decomposer → search queries
 * 2. Prosecutor search + Defender search (parallel)
 * 3. Prosecutor attribution + Defender attribution (parallel)
 * 4. Prosecutor argument + Defender argument (parallel)
 * 5. Judge (Opus) → verdict
 *
 * Outputs JSONL corrections for review and commit via write-corrections.js
 *
 * Usage:
 *   node run-belief-verification.js --limit=10
 *   node run-belief-verification.js --id=123
 *   node run-belief-verification.js --all --resume
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

import { searchForEvidence, costs as exaCosts } from './lib/exa-search.js';
import { validateBeliefValue, normalizeBeliefValue } from './lib/belief-enums.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// API clients
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_MULTIAGENT_VERIFICATION_KEY || process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('ERROR: No Anthropic API key found.');
  process.exit(1);
}
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Database
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
const resumeMode = args.includes('--resume');
const statusMode = args.includes('--status');

// ID range for parallel execution (e.g., --id-range=1-500)
const idRangeArg = args.find(a => a.startsWith('--id-range='));
const idRange = idRangeArg ? idRangeArg.split('=')[1].split('-').map(Number) : null;

// Output paths
const RESULTS_DIR = path.join(__dirname, 'results');
const CORRECTIONS_FILE = path.join(RESULTS_DIR, 'corrections.jsonl');
// Progress file includes range for parallel execution
const PROGRESS_FILE = idRange
  ? path.join(RESULTS_DIR, `belief-verification-progress-${idRange[0]}-${idRange[1]}.json`)
  : path.join(RESULTS_DIR, 'belief-verification-progress.json');

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Load prompts
const PROMPTS = {
  decomposer: fs.readFileSync(path.join(__dirname, 'agents/prompts/beliefs/decomposer.md'), 'utf-8'),
  attribution: fs.readFileSync(path.join(__dirname, 'agents/prompts/beliefs/attribution.md'), 'utf-8'),
  prosecutor: fs.readFileSync(path.join(__dirname, 'agents/prompts/beliefs/prosecutor.md'), 'utf-8'),
  defender: fs.readFileSync(path.join(__dirname, 'agents/prompts/beliefs/defender.md'), 'utf-8'),
  judge: fs.readFileSync(path.join(__dirname, 'agents/prompts/beliefs/judge.md'), 'utf-8'),
};

// Belief fields to verify by entity type
// All categorical belief fields + evidence_source + stance_detail
const BELIEF_FIELDS = {
  person: [
    'belief_regulatory_stance',
    'belief_regulatory_stance_detail',
    'belief_evidence_source',
    'belief_agi_timeline',
    'belief_ai_risk',
    'belief_threat_models',
  ],
  organization: [
    'belief_regulatory_stance',
    'belief_regulatory_stance_detail',
    'belief_evidence_source',
    'belief_agi_timeline',
    'belief_ai_risk',
    'belief_threat_models',
  ],
  // Resources don't have belief fields
  resource: [],
};

// Cost tracking
const costs = {
  claude_calls: 0,
  claude_input_tokens: 0,
  claude_output_tokens: 0,
  sonnet_cost: 0,
  opus_cost: 0,

  trackClaude(usage, model = 'sonnet') {
    this.claude_calls++;
    this.claude_input_tokens += usage.input_tokens || 0;
    this.claude_output_tokens += usage.output_tokens || 0;

    if (model === 'opus') {
      this.opus_cost += (usage.input_tokens / 1_000_000) * 15 + (usage.output_tokens / 1_000_000) * 75;
    } else {
      this.sonnet_cost += (usage.input_tokens / 1_000_000) * 3 + (usage.output_tokens / 1_000_000) * 15;
    }
  },

  get total() {
    return this.sonnet_cost + this.opus_cost + exaCosts.cost;
  },

  summary() {
    return `Claude: ${this.claude_calls} calls (Sonnet: $${this.sonnet_cost.toFixed(3)}, Opus: $${this.opus_cost.toFixed(3)}) | ${exaCosts.summary()} | Total: $${this.total.toFixed(3)}`;
  },

  toJSON() {
    return {
      claude_calls: this.claude_calls,
      claude_input_tokens: this.claude_input_tokens,
      claude_output_tokens: this.claude_output_tokens,
      sonnet_cost_usd: this.sonnet_cost,
      opus_cost_usd: this.opus_cost,
      exa_searches: exaCosts.searches,
      exa_cost_usd: exaCosts.cost,
      total_cost_usd: this.total,
    };
  },
};

// Timing tracking
const timing = {
  run_started_at: null,
  run_ended_at: null,
  entities_processed: 0,
  fields_verified: 0,
  entity_times: [],  // ms per entity

  start() {
    this.run_started_at = new Date();
  },

  end() {
    this.run_ended_at = new Date();
  },

  trackEntity(ms) {
    this.entities_processed++;
    this.entity_times.push(ms);
  },

  trackField() {
    this.fields_verified++;
  },

  get totalMs() {
    return this.run_ended_at - this.run_started_at;
  },

  get avgEntityMs() {
    if (this.entity_times.length === 0) return 0;
    return this.entity_times.reduce((a, b) => a + b, 0) / this.entity_times.length;
  },

  summary() {
    const totalSec = (this.totalMs / 1000).toFixed(1);
    const avgSec = (this.avgEntityMs / 1000).toFixed(1);
    return `Time: ${totalSec}s total, ${avgSec}s avg/entity | ${this.entities_processed} entities, ${this.fields_verified} fields`;
  },

  toJSON() {
    return {
      run_started_at: this.run_started_at?.toISOString(),
      run_ended_at: this.run_ended_at?.toISOString(),
      total_duration_ms: this.totalMs,
      entities_processed: this.entities_processed,
      fields_verified: this.fields_verified,
      avg_ms_per_entity: Math.round(this.avgEntityMs),
    };
  },
};

// Write run stats to file
function writeRunStats(summary) {
  const statsFile = path.join(RESULTS_DIR, 'run-stats.json');
  const stats = {
    ...timing.toJSON(),
    ...costs.toJSON(),
    verdicts: summary,
    run_id: `run-${Date.now()}`,
  };
  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2) + '\n');
  console.log(`\nRun stats written to: ${statsFile}`);
}

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

function appendCorrection(correction) {
  // Write to JSONL (backup)
  fs.appendFileSync(CORRECTIONS_FILE, JSON.stringify(correction) + '\n');
}

async function insertCorrectionToDB(correction) {
  try {
    await pool.query(
      `INSERT INTO belief_correction
        (entity_id, entity_type, entity_name, field, current_value, verdict,
         proposed_value, confidence, attribution_type, winning_side,
         source_url, citation, new_source_id, new_claim_id, superseded_claim_ids,
         prosecutor_argument, defender_argument, judge_reasoning, evidence_assessment,
         validation_error, original_proposed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
      [
        correction.entity_id,
        correction.entity_type,
        correction.entity_name,
        correction.field,
        correction.current_value,
        correction.verdict,
        correction.proposed_value,
        correction.confidence,
        correction.attribution_type,
        correction.winning_side,
        correction.source_url,
        correction.citation,
        correction.new_source_id || null,
        correction.new_claim_id || null,
        correction.superseded_claim_ids || null,
        correction.prosecutor_argument || null,
        correction.defender_argument || null,
        correction.judge_reasoning || null,
        correction.evidence_assessment ? JSON.stringify(correction.evidence_assessment) : null,
        correction.validation_error,
        correction.original_proposed,
      ]
    );
    return true;
  } catch (err) {
    console.error(`    DB insert error: ${err.message}`);
    return false;
  }
}

// ── Database Setup ──

async function ensureCorrectionTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS belief_correction (
      id                    SERIAL PRIMARY KEY,
      entity_id             INTEGER REFERENCES entity(id),
      entity_type           VARCHAR(20),
      entity_name           VARCHAR(200),
      field                 VARCHAR(50) NOT NULL,
      current_value         VARCHAR(200),
      verdict               VARCHAR(20) NOT NULL,
      proposed_value        VARCHAR(200),
      confidence            VARCHAR(20),
      attribution_type      VARCHAR(50),
      winning_side          VARCHAR(20),

      -- Source attribution (what we're adding)
      source_url            TEXT,
      citation              TEXT,
      new_source_id         VARCHAR(50),
      new_claim_id          VARCHAR(100),

      -- What we're replacing
      superseded_claim_ids  TEXT[],

      -- Debate record (truncated to ~1000 chars each)
      prosecutor_argument   TEXT,
      defender_argument     TEXT,
      judge_reasoning       TEXT,
      evidence_assessment   JSONB,

      -- Validation
      validation_error      TEXT,
      original_proposed     VARCHAR(200),

      -- Status lifecycle: pending → applied → promoted (or rejected)
      status                VARCHAR(20) DEFAULT 'pending',
      created_at            TIMESTAMPTZ DEFAULT NOW(),
      applied_at            TIMESTAMPTZ,
      applied_by            VARCHAR(100),
      promoted_at           TIMESTAMPTZ
    )
  `);

  // Index for efficient lookups
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_belief_correction_entity ON belief_correction(entity_id);
    CREATE INDEX IF NOT EXISTS idx_belief_correction_status ON belief_correction(status);
    CREATE INDEX IF NOT EXISTS idx_belief_correction_verdict ON belief_correction(verdict);
  `);
}

// ── Database Queries ──

async function getExistingClaims(entityId, beliefField) {
  // Convert field name to belief_dimension format used in claim table
  // e.g., "belief_regulatory_stance" → "regulatory_stance"
  const beliefDimension = beliefField.replace('belief_', '');

  try {
    const result = await pool.query(
      `SELECT claim_id, stance, citation, source_id, confidence, extraction_date
       FROM claim
       WHERE entity_id = $1 AND belief_dimension = $2
       ORDER BY extraction_date DESC`,
      [entityId, beliefDimension]
    );
    return result.rows;
  } catch (err) {
    // Table might not exist in staging yet
    if (err.code === '42P01') {
      return [];
    }
    throw err;
  }
}

async function getEntitiesWithBeliefs(options = {}) {
  const { limit: queryLimit, entityId, completedIds = [], idRange: range } = options;

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

  // ID range for parallel execution
  if (range && range.length === 2) {
    query += ` AND id >= $${paramIndex} AND id <= $${paramIndex + 1}`;
    params.push(range[0], range[1]);
    paramIndex += 2;
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

// ── LLM Helpers ──

async function callSonnet(systemPrompt, userMessage) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt + '\n\nReturn JSON only, no markdown fences.',
    messages: [{ role: 'user', content: userMessage }],
  });
  costs.trackClaude(response.usage, 'sonnet');
  return response.content[0].text;
}

async function callOpus(systemPrompt, userMessage) {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 2000,
    system: systemPrompt + '\n\nReturn JSON only, no markdown fences.',
    messages: [{ role: 'user', content: userMessage }],
  });
  costs.trackClaude(response.usage, 'opus');
  return response.content[0].text;
}

function parseJSON(text) {
  try {
    return JSON.parse(text.trim());
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return null;
  }
}

// ── Multi-Agent Pipeline ──

async function runDecomposer(entity, field, currentValue) {
  const input = {
    entity_id: entity.id,
    entity_name: entity.name,
    entity_type: entity.entity_type,
    field,
    current_value: currentValue,
  };

  const response = await callSonnet(PROMPTS.decomposer, JSON.stringify(input, null, 2));
  return parseJSON(response) || { search_queries: { prosecutor: `"${entity.name}" ${field}`, defender: `"${entity.name}" ${field}` } };
}

async function runSearch(query, role) {
  // Add role-specific modifiers
  const results = await searchForEvidence(query, {
    numResults: 5,
    excludeDomains: ['wikipedia.org', 'wikidata.org'],
  });

  return {
    role,
    query,
    results: results.results || [],
  };
}

async function runAttribution(entity, field, currentValue, searchResults, role) {
  const input = {
    entity_name: entity.name,
    field,
    current_value: currentValue,
    role,
    search_results: searchResults.map(r => ({
      url: r.url,
      title: r.title,
      text: r.text?.substring(0, 2000),
      highlights: r.highlights,
    })),
  };

  const response = await callSonnet(PROMPTS.attribution, JSON.stringify(input, null, 2));
  return parseJSON(response) || { attribution_chains: [], summary: {} };
}

async function runDebater(entity, field, currentValue, attributionChain, role) {
  const prompt = role === 'prosecutor' ? PROMPTS.prosecutor : PROMPTS.defender;

  const input = `
ENTITY: ${entity.name}
FIELD: ${field}
CURRENT VALUE: ${currentValue}

YOUR ATTRIBUTION CHAIN:
${JSON.stringify(attributionChain, null, 2)}
`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: prompt,
    messages: [{ role: 'user', content: input }],
  });
  costs.trackClaude(response.usage, 'sonnet');

  return response.content[0].text;
}

async function runJudge(entity, field, currentValue, prosecutorArgument, defenderArgument) {
  const input = `
ENTITY: ${entity.name}
FIELD: ${field}
CURRENT VALUE: ${currentValue}

--- PROSECUTION ARGUMENT ---
${prosecutorArgument}

--- DEFENSE ARGUMENT ---
${defenderArgument}
`;

  const response = await callOpus(PROMPTS.judge, input);
  return parseJSON(response);
}

// ── Main Field Verification ──

async function verifyBeliefField(entity, field) {
  const currentValue = entity[field];
  if (!currentValue) return null;

  console.log(`\n    [${field}] = "${currentValue}"`);

  // Step 0: Get existing claims for this field (before agents run)
  const existingClaims = await getExistingClaims(entity.id, field);
  if (existingClaims.length > 0) {
    console.log(`      Found ${existingClaims.length} existing claim(s)`);
  }

  // Step 1: Decompose → search queries
  console.log(`      1. Decomposing...`);
  const decomposed = await runDecomposer(entity, field, currentValue);

  // Step 2: Parallel search (prosecutor + defender)
  console.log(`      2. Searching (prosecutor + defender)...`);
  const [prosecutorSearch, defenderSearch] = await Promise.all([
    runSearch(decomposed.search_queries?.prosecutor || `"${entity.name}" ${field}`, 'prosecutor'),
    runSearch(decomposed.search_queries?.defender || `"${entity.name}" ${field}`, 'defender'),
  ]);

  const totalResults = prosecutorSearch.results.length + defenderSearch.results.length;
  console.log(`         Found ${prosecutorSearch.results.length} + ${defenderSearch.results.length} sources`);

  if (totalResults === 0) {
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
      reasoning: 'No sources found by either prosecutor or defender search.',
    };
  }

  // Step 3: Parallel attribution chains
  console.log(`      3. Building attribution chains...`);
  const [prosecutorAttrib, defenderAttrib] = await Promise.all([
    runAttribution(entity, field, currentValue, prosecutorSearch.results, 'prosecutor'),
    runAttribution(entity, field, currentValue, defenderSearch.results, 'defender'),
  ]);

  // Step 4: Parallel debate
  console.log(`      4. Running debate...`);
  const [prosecutorArg, defenderArg] = await Promise.all([
    runDebater(entity, field, currentValue, prosecutorAttrib, 'prosecutor'),
    runDebater(entity, field, currentValue, defenderAttrib, 'defender'),
  ]);

  // Step 5: Judge (Opus)
  console.log(`      5. Judging (Opus)...`);
  const verdict = await runJudge(entity, field, currentValue, prosecutorArg, defenderArg);

  if (!verdict) {
    return {
      entity_id: entity.id,
      entity_name: entity.name,
      entity_type: entity.entity_type,
      field,
      current_value: currentValue,
      verdict: 'error',
      reasoning: 'Failed to parse judge verdict',
    };
  }

  // Validate and normalize proposed value against schema
  if (verdict.verdict === 'correct' && verdict.proposed_value) {
    const validation = validateBeliefValue(field, verdict.proposed_value);

    if (!validation.valid) {
      // Try to normalize the value
      const normalized = normalizeBeliefValue(field, verdict.proposed_value);

      if (normalized) {
        console.log(`      ⚠ Normalized: "${verdict.proposed_value}" → "${normalized}"`);
        verdict.original_proposed = verdict.proposed_value;
        verdict.proposed_value = normalized;
      } else {
        // Can't normalize - mark as invalid
        console.log(`      ✗ Invalid proposed value: "${verdict.proposed_value}" (${validation.reason})`);
        verdict.validation_error = validation.reason;
        verdict.valid_options = validation.valid_options;
        // Downgrade verdict - can't correct with invalid value
        verdict.original_verdict = verdict.verdict;
        verdict.verdict = 'confirm';
        verdict.reasoning = `Judge proposed invalid value "${verdict.original_proposed || verdict.proposed_value}". ${verdict.reasoning}`;
      }
    }
  }

  // Add metadata to output
  verdict.entity_id = entity.id;
  verdict.entity_type = entity.entity_type;

  // Store full debate arguments (no truncation)
  verdict.prosecutor_argument = prosecutorArg;
  verdict.defender_argument = defenderArg;
  verdict.judge_reasoning = verdict.reasoning;

  // Track which existing claims this correction supersedes
  if (existingClaims.length > 0) {
    verdict.superseded_claim_ids = existingClaims.map(c => c.claim_id);
  }

  console.log(`      → Verdict: ${verdict.verdict} (${verdict.confidence})`);
  if (verdict.verdict === 'correct' && verdict.proposed_value) {
    console.log(`      → Correction: "${currentValue}" → "${verdict.proposed_value}"`);
  }

  return verdict;
}

async function verifyEntity(entity) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`[${entity.id}] ${entity.name} (${entity.entity_type})`);
  console.log('='.repeat(50));

  const fields = BELIEF_FIELDS[entity.entity_type] || BELIEF_FIELDS.person;
  const corrections = [];

  for (const field of fields) {
    if (!entity[field]) continue;

    try {
      const result = await verifyBeliefField(entity, field);
      if (result) {
        corrections.push(result);
        appendCorrection(result);       // JSONL backup
        await insertCorrectionToDB(result);  // Primary storage
      }
    } catch (err) {
      console.error(`      Error verifying ${field}: ${err.message}`);
    }
  }

  return corrections;
}

// ── Status Check ──

async function showStatus() {
  console.log('Belief Verification Status');
  console.log('==========================\n');

  // Get all progress files
  const progressFiles = fs.readdirSync(RESULTS_DIR)
    .filter(f => f.startsWith('belief-verification-progress'))
    .sort();

  // Get totals from DB
  const totalResult = await pool.query(`
    SELECT
      COUNT(DISTINCT entity_id) as entities_with_corrections,
      COUNT(*) as total_corrections,
      COUNT(*) FILTER (WHERE verdict = 'confirm') as confirmed,
      COUNT(*) FILTER (WHERE verdict = 'correct') as corrected,
      COUNT(*) FILTER (WHERE verdict = 'remove') as removed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'applied') as applied
    FROM belief_correction
  `);
  const totals = totalResult.rows[0];

  // Get entity counts
  const entityResult = await pool.query(`
    SELECT
      MIN(id) as min_id,
      MAX(id) as max_id,
      COUNT(*) as total
    FROM entity
    WHERE status = 'approved'
      AND (belief_regulatory_stance IS NOT NULL OR belief_agi_timeline IS NOT NULL
           OR belief_ai_risk IS NOT NULL OR belief_threat_models IS NOT NULL)
  `);
  const entities = entityResult.rows[0];

  console.log('ENTITIES TO VERIFY:');
  console.log(`  ID range: ${entities.min_id} - ${entities.max_id}`);
  console.log(`  Total: ${entities.total}`);
  console.log('');

  console.log('PROGRESS BY RUNNER:');
  if (progressFiles.length === 0) {
    console.log('  No progress files found. Run with --id-range=X-Y to start.');
  } else {
    for (const file of progressFiles) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf-8'));
        const rangeMatch = file.match(/progress-(\d+)-(\d+)/);
        const range = rangeMatch ? `${rangeMatch[1]}-${rangeMatch[2]}` : 'all';
        console.log(`  [${range}] ${data.completed?.length || 0} entities completed`);
      } catch {
        console.log(`  [${file}] (error reading)`);
      }
    }
  }
  console.log('');

  console.log('CORRECTIONS IN DATABASE:');
  console.log(`  Total corrections: ${totals.total_corrections}`);
  console.log(`  Entities touched: ${totals.entities_with_corrections}`);
  console.log(`  Verdicts: ${totals.confirmed} confirmed, ${totals.corrected} to correct, ${totals.removed} to remove`);
  console.log(`  Status: ${totals.pending} pending, ${totals.applied} applied`);
  console.log('');

  // Suggest ranges for parallel execution
  const third = Math.floor(parseInt(entities.total) / 3);
  const minId = parseInt(entities.min_id);
  const maxId = parseInt(entities.max_id);

  console.log('SUGGESTED RANGES FOR 3 RUNNERS:');
  console.log(`  Terminal 1: node run-belief-verification.js --id-range=${minId}-${minId + Math.floor((maxId-minId)/3)} --all --resume`);
  console.log(`  Terminal 2: node run-belief-verification.js --id-range=${minId + Math.floor((maxId-minId)/3) + 1}-${minId + Math.floor(2*(maxId-minId)/3)} --all --resume`);
  console.log(`  Terminal 3: node run-belief-verification.js --id-range=${minId + Math.floor(2*(maxId-minId)/3) + 1}-${maxId} --all --resume`);

  await pool.end();
}

// ── Main ──

async function main() {
  // Handle --status mode
  if (statusMode) {
    await showStatus();
    return;
  }

  timing.start();

  console.log('Belief Field Adversarial Verification Pipeline');
  console.log('==============================================\n');
  console.log('Architecture: 8 LLM calls per field (7 Sonnet + 1 Opus)');

  // Test DB and ensure tables exist
  await pool.query('SELECT 1');
  await ensureCorrectionTable();
  const isStaging = DATABASE_URL.includes('verification-staging') || DATABASE_URL.includes('staging');
  console.log(`Database: ${isStaging ? 'STAGING' : 'PRODUCTION (read-only recommended)'}`);
  console.log(`Corrections table: belief_correction`);

  // Progress
  const progress = resumeMode ? loadProgress() : { completed: [], started_at: new Date().toISOString() };
  const completedSet = new Set(progress.completed);

  const modeDesc = singleId
    ? `Single entity ${singleId}`
    : idRange
      ? `ID range ${idRange[0]}-${idRange[1]}`
      : allMode
        ? 'All entities'
        : `${limit} entities`;
  console.log(`Mode: ${modeDesc}`);
  if (resumeMode && completedSet.size > 0) {
    console.log(`Resuming: ${completedSet.size} already completed`);
  }

  // Clear corrections if not resuming
  if (!resumeMode) {
    fs.writeFileSync(CORRECTIONS_FILE, '');
  }

  // Get entities
  const entities = await getEntitiesWithBeliefs({
    limit: allMode ? null : limit,
    entityId: singleId,
    completedIds: resumeMode ? progress.completed : [],
    idRange: idRange,
  });

  console.log(`\nEntities to process: ${entities.length}`);

  // Estimate
  const totalFields = entities.reduce((sum, e) => {
    const fields = BELIEF_FIELDS[e.entity_type] || BELIEF_FIELDS.person;
    return sum + fields.filter(f => e[f]).length;
  }, 0);
  console.log(`Total belief fields: ~${totalFields}`);
  console.log(`Estimated LLM calls: ~${totalFields * 8}`);
  console.log(`Estimated cost: ~$${(totalFields * 0.20).toFixed(2)}`);

  // Process
  // Verdicts from judge: confirm, correct, remove
  const summary = { confirm: 0, correct: 0, remove: 0, unsupported: 0, error: 0 };

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];

    if (completedSet.has(entity.id)) continue;

    const entityStart = Date.now();

    try {
      const corrections = await verifyEntity(entity);

      for (const c of corrections) {
        const v = c.verdict || 'error';
        summary[v] = (summary[v] || 0) + 1;
        timing.trackField();
      }

      timing.trackEntity(Date.now() - entityStart);
      progress.completed.push(entity.id);
      saveProgress(progress);

      if ((i + 1) % 5 === 0) {
        console.log(`\n  --- Progress: ${i + 1}/${entities.length} | ${timing.summary()} | ${costs.summary()} ---\n`);
      }
    } catch (err) {
      console.error(`  Entity error: ${err.message}`);
    }
  }

  // Final summary
  timing.end();

  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nEntities processed: ${timing.entities_processed}`);
  console.log(`Fields verified: ${timing.fields_verified}`);
  console.log(`\nVerdicts:`);
  console.log(`  confirm (value OK): ${summary.confirm || 0}`);
  console.log(`  correct (value wrong): ${summary.correct || 0}`);
  console.log(`  remove (no support): ${summary.remove || 0}`);
  console.log(`  unsupported (no sources): ${summary.unsupported || 0}`);
  console.log(`  error: ${summary.error || 0}`);
  console.log(`\nTiming: ${timing.summary()}`);
  console.log(`Costs: ${costs.summary()}`);
  console.log(`\nCorrections written to: ${CORRECTIONS_FILE}`);

  // Write run stats
  writeRunStats(summary);

  console.log(`\nNext: node write-corrections.js --dry-run`);

  await pool.end();
}

main().catch(err => {
  console.error('Pipeline error:', err);
  pool.end();
  process.exit(1);
});
