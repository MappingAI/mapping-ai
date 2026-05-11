#!/usr/bin/env node

/**
 * Belief Field Verification Pipeline — Single Opus Agent
 *
 * Simplified approach using one Opus agent with extended thinking that:
 * - Searches for BOTH supporting AND contradicting evidence via Exa
 * - Distinguishes first-person vs third-party sources
 * - Renders per-field verdicts with citations
 *
 * Comparison to 3-agent design:
 * - Fewer LLM calls (1 per entity vs 3 per field)
 * - May have confirmation bias (no adversarial pressure)
 * - Faster and cheaper per entity
 *
 * Usage:
 *   node beliefs-1-opus/run.js --id=18
 *   node beliefs-1-opus/run.js --limit=10
 */

import Anthropic from '@anthropic-ai/sdk';
import Exa from 'exa-js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
dotenv.config({ path: path.join(__dirname, '../../.env') });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_MULTIAGENT_VERIFICATION_KEY,
});

const exa = new Exa(process.env.EXA_MULTIAGENT_VERIFICATION_KEY);

const pool = new pg.Pool({
  connectionString: process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL,
});

// ── Load Prompt ──

const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'prompts/verifier.md'), 'utf-8');

// ── Belief Enums ──

const BELIEF_ENUMS = {
  belief_regulatory_stance: [
    'Accelerate', 'Light-touch', 'Targeted', 'Moderate',
    'Precautionary', 'Restrictive', 'Nationalize', 'Mixed/unclear', 'Other',
  ],
  belief_agi_timeline: [
    'Already here', '2-3 years', '5-10 years', '10-25 years',
    '25+ years or never', 'Ill-defined', 'Unknown', 'Mixed/unclear',
  ],
  belief_ai_risk: [
    'Overstated', 'Manageable', 'Serious', 'Catastrophic',
    'Existential', 'Mixed/nuanced', 'Unknown',
  ],
  belief_threat_models: [
    'Labor displacement', 'Economic inequality', 'Power concentration',
    'Democratic erosion', 'Cybersecurity', 'Misinformation', 'Environmental',
    'Weapons', 'Loss of control', 'Copyright/IP', 'Existential risk',
  ],
  belief_evidence_source: [
    'Explicitly stated', 'Inferred', 'Inferred from actions',
  ],
};

// Field types
const FIELD_TYPES = {
  belief_regulatory_stance: 'enum',
  belief_regulatory_stance_detail: 'text',
  belief_agi_timeline: 'enum',
  belief_ai_risk: 'enum',
  belief_threat_models: 'multi_enum',
  belief_evidence_source: 'enum',
};

// Fields to verify by entity type
const BELIEF_FIELDS = {
  person: [
    'belief_regulatory_stance',
    'belief_regulatory_stance_detail',
    'belief_agi_timeline',
    'belief_ai_risk',
    'belief_threat_models',
    'belief_evidence_source',
  ],
  organization: [
    'belief_regulatory_stance',
    'belief_regulatory_stance_detail',
    'belief_agi_timeline',
    'belief_ai_risk',
    'belief_threat_models',
    'belief_evidence_source',
  ],
  resource: [],
};

// ── Cost Tracking ──

const costs = {
  opus_input: 0,
  opus_output: 0,
  exa_searches: 0,
  exa_fetches: 0,

  trackClaude(usage) {
    this.opus_input += usage.input_tokens;
    this.opus_output += usage.output_tokens;
  },

  trackExaSearch() {
    this.exa_searches++;
  },

  trackExaFetch() {
    this.exa_fetches++;
  },

  getSummary() {
    // Opus 4.5: $15/1M input, $75/1M output
    const opusCost = (this.opus_input * 15 + this.opus_output * 75) / 1_000_000;
    const exaCost = (this.exa_searches + this.exa_fetches) * 0.008;

    return {
      opus_cost_usd: opusCost,
      exa_cost_usd: exaCost,
      total_cost_usd: opusCost + exaCost,
      claude_calls: {
        opus_input_tokens: this.opus_input,
        opus_output_tokens: this.opus_output,
      },
      exa_searches: this.exa_searches,
      exa_fetches: this.exa_fetches,
    };
  },
};

// ── Tool Definitions ──

const EXA_SEARCH_TOOL = {
  name: 'exa_search',
  description: `Search the web for evidence about an entity's beliefs or positions.
Use this to find BOTH supporting AND contradicting evidence.
Run multiple queries with different angles - one looking for evidence FOR the current value, one AGAINST.
Results include page text when available.`,
  input_schema: {
    type: 'object',
    properties: {
      queries: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 5,
        description: 'Search queries to run. Use multiple queries to search for both supporting and contradicting evidence.',
      },
      num_results: {
        type: 'number',
        description: 'Results per query (default: 5, max: 10)',
      },
    },
    required: ['queries'],
  },
};

const FETCH_CONTENT_TOOL = {
  name: 'fetch_content',
  description: `Fetch the full text content of a specific URL via Exa.
Use this to read a first-person source page (e.g. an official about page, interview transcript, op-ed).
Only use when you need more context from a promising source found in search results.`,
  input_schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to fetch full content from',
      },
    },
    required: ['url'],
  },
};

const SUBMIT_VERDICTS_TOOL = {
  name: 'submit_verdicts',
  description: `Submit your final per-field verdicts. Call this exactly once when you have finished all research.
This is a TERMINAL action - after calling this, your task is complete.`,
  input_schema: {
    type: 'object',
    properties: {
      verdicts: {
        type: 'array',
        description: 'One verdict per field verified',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', description: 'Field name' },
            current_value: { type: 'string', description: 'Current value in the record' },
            verdict: {
              type: 'string',
              enum: ['confirm', 'correct', 'remove'],
              description: 'confirm = evidence supports value, correct = first-person evidence contradicts it, remove = no evidence exists',
            },
            proposed_value: {
              type: 'string',
              description: 'Replacement value (required for correct, null otherwise)',
            },
            confidence: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
            },
            winning_side: {
              type: 'string',
              enum: ['prosecution', 'defense', 'neither'],
              description: 'Which side of your internal debate won. prosecution = evidence against current value won, defense = evidence for current value won, neither = inconclusive',
            },
            attribution_type: {
              type: 'string',
              enum: ['first_person', 'third_party_characterization', 'none'],
              description: 'Type of the strongest evidence supporting the verdict',
            },
            source_url: { type: 'string', description: 'URL of the best supporting source' },
            citation: { type: 'string', description: 'Relevant quote from the source' },
            reasoning: { type: 'string', description: 'Detailed explanation of the verdict' },
            evidence_assessment: {
              type: 'object',
              description: 'Count of evidence types found',
              properties: {
                first_person_for: { type: 'number', description: 'First-person sources supporting current value' },
                first_person_against: { type: 'number', description: 'First-person sources contradicting current value' },
                third_party_for: { type: 'number', description: 'Third-party sources supporting current value' },
                third_party_against: { type: 'number', description: 'Third-party sources contradicting current value' },
              },
            },
          },
          required: ['field', 'verdict', 'confidence', 'winning_side', 'reasoning', 'evidence_assessment'],
        },
      },
    },
    required: ['verdicts'],
  },
};

// ── Tool Handlers ──

async function handleExaSearch(queries, numResults = 5) {
  costs.trackExaSearch();

  const allResults = [];

  for (const query of queries) {
    try {
      const response = await exa.searchAndContents(query, {
        numResults: Math.min(numResults, 10),
        text: { maxCharacters: 2000 },
        highlights: { numSentences: 3 },
        excludeDomains: ['wikipedia.org', 'wikidata.org'],
      });

      allResults.push({
        query,
        results: (response.results || []).map(r => ({
          url: r.url,
          title: r.title,
          text: r.text?.substring(0, 1500),
          highlights: r.highlights,
          publishedDate: r.publishedDate,
          author: r.author,
        })),
      });
    } catch (err) {
      allResults.push({ query, results: [], error: err.message });
    }
  }

  // Format as readable text
  const text = allResults
    .map(({ query, results, error }) => {
      if (error) return `Query: "${query}"\n  Error: ${error}`;
      const entries = results
        .map((r, i) =>
          `  [${i + 1}] ${r.title}\n      URL: ${r.url}\n      Published: ${r.publishedDate || 'unknown'}` +
          (r.highlights?.length ? `\n      Highlights:\n${r.highlights.map(h => `        - ${h}`).join('\n')}` : '') +
          (r.text ? `\n      Text (truncated):\n        ${r.text.slice(0, 800)}...` : '')
        )
        .join('\n\n');
      return `Query: "${query}"\n${entries || '  No results'}`;
    })
    .join('\n\n---\n\n');

  return text;
}

async function handleFetchContent(url) {
  costs.trackExaFetch();

  try {
    const response = await exa.getContents([url], {
      text: { maxCharacters: 8000 },
    });

    const page = response.results?.[0];
    if (!page) return `No content returned for URL: ${url}`;

    return `URL: ${page.url}\nTitle: ${page.title}\n\n${page.text || '(no text)'}`;
  } catch (err) {
    return `Error fetching ${url}: ${err.message}`;
  }
}

// ── Database Writes ──

function generateSourceId(url) {
  return 'src-' + crypto.createHash('sha256').update(url).digest('hex').slice(0, 12);
}

async function insertCorrectionToDB(correction) {
  try {
    // Map single-agent fields to belief_correction schema
    const winning_side = correction.verdict === 'confirm' ? 'defense' :
                         correction.verdict === 'correct' ? 'prosecution' :
                         correction.verdict === 'remove' ? 'prosecution' : 'neither';

    await pool.query(
      `INSERT INTO belief_correction
        (entity_id, entity_type, entity_name, field, current_value, verdict,
         proposed_value, confidence, attribution_type, winning_side,
         source_url, citation, new_source_id, new_claim_id, superseded_claim_ids,
         prosecutor_argument, defender_argument, judge_reasoning, evidence_assessment,
         validation_error, original_proposed, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'pending')
       ON CONFLICT DO NOTHING`,
      [
        correction.entity_id,
        correction.entity_type,
        correction.entity_name,
        correction.field,
        correction.current_value,
        correction.verdict,
        correction.proposed_value || null,
        correction.confidence,
        correction.attribution_type || null,
        winning_side,
        correction.source_url || null,
        correction.citation || null,
        correction.new_source_id || null,
        correction.new_claim_id || null,
        correction.superseded_claim_ids || null,
        null, // prosecutor_argument (single agent)
        null, // defender_argument (single agent)
        correction.reasoning || null, // maps to judge_reasoning
        correction.evidence_assessment ? JSON.stringify(correction.evidence_assessment) : null,
        correction.validation_error || null,
        correction.proposed_value || null, // original_proposed
      ]
    );
    return true;
  } catch (err) {
    console.error(`    DB insert error: ${err.message}`);
    return false;
  }
}

async function writeSourceAndClaim(correction) {
  if (!correction.source_url || !correction.citation) {
    return { success: false };
  }

  try {
    const sourceId = generateSourceId(correction.source_url);

    // Upsert source
    await pool.query(
      `INSERT INTO source (source_id, url, source_type)
       VALUES ($1, $2, 'web')
       ON CONFLICT (source_id) DO NOTHING`,
      [sourceId, correction.source_url]
    );

    // Upsert claim
    const beliefDimension = correction.field.replace('belief_', '');
    const claimId = `${correction.entity_id}_${beliefDimension}_${sourceId}`;

    await pool.query(
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
        correction.proposed_value || correction.current_value,
        correction.citation,
        sourceId,
        correction.attribution_type === 'first_person' ? 'direct_statement' : 'authored_position',
        correction.confidence,
        'beliefs-1-opus',
        'claude-opus-4.5',
      ]
    );

    // Store IDs on correction object for later reference
    correction.new_source_id = sourceId;
    correction.new_claim_id = claimId;

    return { success: true, sourceId, claimId };
  } catch (err) {
    // Tables might not exist yet - that's ok
    if (err.code === '42P01') {
      return { success: false, error: 'Tables not created yet' };
    }
    console.warn(`    Warning: Failed to write source/claim: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ── Database Queries ──

function getClaimDimension(field) {
  const dimensionMap = {
    belief_regulatory_stance: 'regulatory_stance',
    belief_regulatory_stance_detail: 'regulatory_stance',
    belief_evidence_source: null,
    belief_agi_timeline: 'agi_timeline',
    belief_ai_risk: 'ai_risk_level',
    belief_threat_models: 'threat_models',
  };
  return dimensionMap[field] ?? field.replace('belief_', '');
}

async function getExistingClaims(entityId) {
  // Get ALL claims for the entity (single query for efficiency)
  try {
    const result = await pool.query(
      `SELECT
         c.claim_id,
         c.belief_dimension,
         c.stance,
         c.citation,
         c.source_id,
         c.confidence,
         c.extraction_date,
         c.claim_type,
         s.url as source_url,
         s.title as source_title,
         s.source_type,
         s.date_published as source_date,
         s.cached_excerpt
       FROM claim c
       LEFT JOIN source s ON c.source_id = s.source_id
       WHERE c.entity_id = $1
       ORDER BY c.belief_dimension, c.confidence DESC`,
      [entityId]
    );
    return result.rows;
  } catch (err) {
    if (err.code === '42P01') return [];
    throw err;
  }
}

async function getEntitiesWithBeliefs(options = {}) {
  const { limit: queryLimit, entityId, idRange: range } = options;

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

  if (range && range.length === 2) {
    query += ` AND id >= $${paramIndex} AND id <= $${paramIndex + 1}`;
    params.push(range[0], range[1]);
    paramIndex += 2;
  }

  query += ` ORDER BY id`;

  if (queryLimit && !entityId) {
    query += ` LIMIT $${paramIndex}`;
    params.push(queryLimit);
  }

  const result = await pool.query(query, params);
  return result.rows;
}

// ── Format Existing Sources ──

function formatExistingSourcesAsSearchResults(claims) {
  if (!claims || claims.length === 0) return null;

  const withUrls = claims.filter(c => c.source_url);
  if (withUrls.length === 0) return null;

  return withUrls.map(c => ({
    url: c.source_url,
    title: c.source_title || 'Untitled',
    text: c.cached_excerpt || c.citation || '',
    publishedDate: c.source_date || null,
    belief_dimension: c.belief_dimension,
    stance: c.stance,
  }));
}

// ── Main Verification ──

async function verifyEntity(entity) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`[${entity.id}] ${entity.name} (${entity.entity_type})`);
  console.log('='.repeat(50));

  // Get all fields to verify
  const fieldsConfig = BELIEF_FIELDS[entity.entity_type] || BELIEF_FIELDS.person;
  const fieldsToVerify = fieldsConfig.filter(f => entity[f] !== null && entity[f] !== undefined);

  if (fieldsToVerify.length === 0) {
    console.log('  No fields to verify');
    return [];
  }

  // Fetch existing claims once
  const existingClaims = await getExistingClaims(entity.id);
  console.log(`  Existing claims: ${existingClaims.length}`);

  // Format existing sources
  const initialSources = formatExistingSourcesAsSearchResults(existingClaims);

  // Build the fields list with values, valid options, and field-specific instructions
  const fieldsInfo = fieldsToVerify.map(field => {
    const value = entity[field];
    const displayValue = typeof value === 'string' && value.length > 200
      ? value.substring(0, 200) + '...'
      : value;
    const fieldType = FIELD_TYPES[field] || 'enum';
    const validValues = BELIEF_ENUMS[field] || [];

    let info = `- ${field}: "${displayValue}"`;
    info += `\n    Field type: ${fieldType}`;

    if (fieldType === 'text') {
      info += `\n    THIS IS A FREE-TEXT FIELD. Verify whether this text accurately summarizes the entity's position.
    - If accurate: verdict = confirm
    - If inaccurate or incomplete: verdict = correct, proposed_value = your improved summary
    - If no evidence supports any summary: verdict = remove`;
    } else if (field === 'belief_evidence_source') {
      info += `\n    THIS IS AN EVIDENCE CLASSIFICATION FIELD. Determine whether the evidence type is correctly classified.
    - "Explicitly stated" = entity directly stated their views (first-person quotes, testimony, op-eds)
    - "Inferred" = third-party characterizations or analysis
    - "Inferred from actions" = deduced from behavior/decisions without explicit statements
    Valid values: ${validValues.join(', ')}`;
    } else if (validValues.length > 0) {
      info += `\n    Valid values: ${validValues.join(', ')}`;
    }
    return info;
  }).join('\n\n');

  // Build user message
  let userMessage = `Verify the following entity:

ENTITY: ${entity.name}
TYPE: ${entity.entity_type}
ID: ${entity.id}

FIELDS TO VERIFY:
${fieldsInfo}
`;

  if (initialSources && initialSources.length > 0) {
    userMessage += `
INITIAL SOURCES (evaluate these along with your search results):
${JSON.stringify(initialSources, null, 2)}
`;
  }

  userMessage += `
Search for evidence and produce your per-field verdicts. Remember:
- Search for BOTH supporting AND contradicting evidence for each field
- A "correct" verdict requires first-person evidence
- Use the submit_verdicts tool when done
`;

  // Run the agent
  console.log('  Running Opus agent with extended thinking...');

  const tools = [EXA_SEARCH_TOOL, FETCH_CONTENT_TOOL, SUBMIT_VERDICTS_TOOL];
  const messages = [{ role: 'user', content: userMessage }];

  let verdicts = null;
  const maxTurns = 15;

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000,
      },
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    costs.trackClaude(response.usage);

    // Process tool calls
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

    if (response.stop_reason === 'end_turn' && toolUseBlocks.length === 0) {
      console.log('  Agent finished without submitting verdicts');
      break;
    }

    const toolResults = [];
    for (const toolUse of toolUseBlocks) {
      console.log(`    🔧 ${toolUse.name}`);

      if (toolUse.name === 'exa_search') {
        const result = await handleExaSearch(
          toolUse.input.queries,
          toolUse.input.num_results || 5
        );
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      } else if (toolUse.name === 'fetch_content') {
        const result = await handleFetchContent(toolUse.input.url);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      } else if (toolUse.name === 'submit_verdicts') {
        verdicts = toolUse.input.verdicts;
        console.log(`  ✓ Received ${verdicts.length} verdicts`);
        break;
      }
    }

    if (verdicts) break;

    // Continue conversation
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });
  }

  if (!verdicts) {
    console.log('  ERROR: Agent did not submit verdicts');
    return [{
      entity_id: entity.id,
      entity_name: entity.name,
      entity_type: entity.entity_type,
      verdict: 'error',
      reasoning: 'Agent did not submit verdicts',
    }];
  }

  // Process and validate verdicts
  const results = [];
  for (const v of verdicts) {
    const fieldType = FIELD_TYPES[v.field] || 'enum';
    const validValues = BELIEF_ENUMS[v.field] || [];

    // Validate proposed value for enum fields
    if (v.verdict === 'correct' && v.proposed_value && fieldType !== 'text') {
      if (validValues.length > 0 && !validValues.includes(v.proposed_value)) {
        console.log(`    ⚠️ Invalid proposed value for ${v.field}: "${v.proposed_value}"`);
        v.validation_error = `Invalid value. Valid options: ${validValues.join(', ')}`;
      }
    }

    const result = {
      entity_id: entity.id,
      entity_name: entity.name,
      entity_type: entity.entity_type,
      ...v,
    };

    results.push(result);

    // Log verdict
    const icon = v.verdict === 'confirm' ? '✓' : v.verdict === 'correct' ? '→' : '✗';
    console.log(`    ${icon} ${v.field}: ${v.verdict} (${v.confidence})`);
    if (v.verdict === 'correct') {
      const displayProposed = v.proposed_value?.length > 50
        ? v.proposed_value.substring(0, 50) + '...'
        : v.proposed_value;
      console.log(`      Correction: "${displayProposed}"`);
    }
  }

  return results;
}

// ── Main Entry Point ──

async function main() {
  const args = process.argv.slice(2);
  const flags = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      flags[key] = value || true;
    }
  }

  console.log('Belief Verification Pipeline — Single Opus Agent');
  console.log('='.repeat(50));

  // Parse options
  const options = {
    entityId: flags.id,
    limit: flags.limit ? parseInt(flags.limit) : 10,
    idRange: flags['id-range'] ? flags['id-range'].split('-').map(Number) : null,
    writeDb: flags['write-db'] === true || flags['write-db'] === 'true',
  };

  if (options.writeDb) {
    console.log('Database writes: ENABLED (corrections will be inserted to belief_correction table)');
  } else {
    console.log('Database writes: DISABLED (use --write-db to enable)');
  }

  // Fetch entities
  const entities = await getEntitiesWithBeliefs(options);
  console.log(`Found ${entities.length} entities to verify`);

  const allResults = [];
  const startTime = Date.now();

  let dbWriteCount = 0;
  let dbWriteErrors = 0;

  for (const entity of entities) {
    try {
      const results = await verifyEntity(entity);
      allResults.push(...results);

      // Write to JSONL immediately
      const jsonlPath = path.join(__dirname, 'results/corrections.jsonl');
      fs.mkdirSync(path.dirname(jsonlPath), { recursive: true });
      for (const r of results) {
        fs.appendFileSync(jsonlPath, JSON.stringify(r) + '\n');

        // Write to DB if enabled
        if (options.writeDb) {
          // Write source and claim first (to get IDs)
          await writeSourceAndClaim(r);

          // Insert correction to belief_correction table
          const inserted = await insertCorrectionToDB(r);
          if (inserted) {
            dbWriteCount++;
          } else {
            dbWriteErrors++;
          }
        }
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      allResults.push({
        entity_id: entity.id,
        entity_name: entity.name,
        verdict: 'error',
        reasoning: err.message,
      });
    }
  }

  // Summary
  const elapsed = Date.now() - startTime;
  const costSummary = costs.getSummary();

  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Entities processed: ${entities.length}`);
  console.log(`Fields verified: ${allResults.length}`);
  console.log(`Time: ${(elapsed / 1000).toFixed(1)}s`);

  console.log(`\nVerdicts:`);
  const verdictCounts = {};
  for (const r of allResults) {
    verdictCounts[r.verdict] = (verdictCounts[r.verdict] || 0) + 1;
  }
  for (const [v, count] of Object.entries(verdictCounts)) {
    console.log(`  ${v}: ${count}`);
  }

  console.log(`\nCosts:`);
  console.log(`  Opus: $${costSummary.opus_cost_usd.toFixed(4)}`);
  console.log(`  Exa: $${costSummary.exa_cost_usd.toFixed(4)}`);
  console.log(`  TOTAL: $${costSummary.total_cost_usd.toFixed(4)}`);

  if (options.writeDb) {
    console.log(`\nDatabase writes:`);
    console.log(`  Corrections inserted: ${dbWriteCount}`);
    if (dbWriteErrors > 0) {
      console.log(`  Errors: ${dbWriteErrors}`);
    }
  }

  // Write run stats
  const statsPath = path.join(__dirname, 'results/run-stats.json');
  fs.mkdirSync(path.dirname(statsPath), { recursive: true });
  fs.writeFileSync(statsPath, JSON.stringify({
    run_started_at: new Date(startTime).toISOString(),
    run_ended_at: new Date().toISOString(),
    total_duration_ms: elapsed,
    entities_processed: entities.length,
    fields_verified: allResults.length,
    verdicts: verdictCounts,
    ...costSummary,
    db_writes: options.writeDb ? {
      enabled: true,
      corrections_inserted: dbWriteCount,
      errors: dbWriteErrors,
    } : { enabled: false },
  }, null, 2));

  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
