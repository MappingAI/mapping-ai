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

// Output paths
const RESULTS_DIR = path.join(__dirname, 'results');
const CORRECTIONS_FILE = path.join(RESULTS_DIR, 'corrections.jsonl');
const PROGRESS_FILE = path.join(RESULTS_DIR, 'belief-verification-progress.json');

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

// Belief fields
const BELIEF_FIELDS = {
  person: ['belief_regulatory_stance', 'belief_agi_timeline', 'belief_ai_risk', 'belief_threat_models'],
  organization: ['belief_regulatory_stance'],
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

function appendCorrection(correction) {
  fs.appendFileSync(CORRECTIONS_FILE, JSON.stringify(correction) + '\n');
}

// ── Database Queries ──

async function getEntitiesWithBeliefs(options = {}) {
  const { limit: queryLimit, entityId, completedIds = [] } = options;

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

  // Add debate log to output
  verdict.entity_id = entity.id;
  verdict.entity_type = entity.entity_type;
  verdict.debate_log = {
    prosecutor: prosecutorArg.substring(0, 1000),
    defender: defenderArg.substring(0, 1000),
  };

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
        appendCorrection(result);
      }
    } catch (err) {
      console.error(`      Error verifying ${field}: ${err.message}`);
    }
  }

  return corrections;
}

// ── Main ──

async function main() {
  console.log('Belief Field Adversarial Verification Pipeline');
  console.log('==============================================\n');
  console.log('Architecture: 8 LLM calls per field (7 Sonnet + 1 Opus)');

  // Test DB
  await pool.query('SELECT 1');
  const isStaging = DATABASE_URL.includes('verification-staging') || DATABASE_URL.includes('staging');
  console.log(`Database: ${isStaging ? 'STAGING' : 'PRODUCTION (read-only recommended)'}`);

  // Progress
  const progress = resumeMode ? loadProgress() : { completed: [], started_at: new Date().toISOString() };
  const completedSet = new Set(progress.completed);

  console.log(`Mode: ${singleId ? `Single entity ${singleId}` : allMode ? 'All entities' : `${limit} entities`}`);
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
  const summary = { correct: 0, wrong: 0, unsupported: 0, error: 0 };

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];

    if (completedSet.has(entity.id)) continue;

    try {
      const corrections = await verifyEntity(entity);

      for (const c of corrections) {
        const v = c.verdict || 'error';
        summary[v] = (summary[v] || 0) + 1;
      }

      progress.completed.push(entity.id);
      saveProgress(progress);

      if ((i + 1) % 5 === 0) {
        console.log(`\n  --- Progress: ${i + 1}/${entities.length} | ${costs.summary()} ---\n`);
      }
    } catch (err) {
      console.error(`  Entity error: ${err.message}`);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nEntities processed: ${progress.completed.length}`);
  console.log(`\nVerdicts:`);
  console.log(`  confirm (correct): ${summary.confirm || summary.correct || 0}`);
  console.log(`  correct (wrong): ${summary.wrong || 0}`);
  console.log(`  remove (unsupported): ${summary.remove || summary.unsupported || 0}`);
  console.log(`  error: ${summary.error || 0}`);
  console.log(`\nCosts: ${costs.summary()}`);
  console.log(`\nCorrections written to: ${CORRECTIONS_FILE}`);
  console.log(`\nNext: node write-corrections.js --dry-run`);

  await pool.end();
}

main().catch(err => {
  console.error('Pipeline error:', err);
  pool.end();
  process.exit(1);
});
