#!/usr/bin/env node

/**
 * Belief Field Verification Pipeline — 3-Agent Design
 *
 * Architecture:
 *   Prosecutor (Sonnet) ──┐
 *                         ├──▶ Judge (Opus + extended thinking)
 *   Defender (Sonnet)  ───┘
 *
 * Each agent:
 *   - Receives existing claims/sources to interrogate
 *   - Has tool access to Exa search
 *   - Builds attribution chain + argument in one call
 *
 * Output: JSONL corrections + database writes
 */

import Anthropic from '@anthropic-ai/sdk';
import Exa from 'exa-js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
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

// ── Load Prompts ──

const PROMPTS = {
  prosecutor: fs.readFileSync(path.join(__dirname, 'prompts/prosecutor.md'), 'utf-8'),
  defender: fs.readFileSync(path.join(__dirname, 'prompts/defender.md'), 'utf-8'),
  judge: fs.readFileSync(path.join(__dirname, 'prompts/judge.md'), 'utf-8'),
};

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
  // belief_regulatory_stance_detail is free text, no enum
};

// Field types for different verification logic
const FIELD_TYPES = {
  belief_regulatory_stance: 'enum',
  belief_regulatory_stance_detail: 'text',
  belief_agi_timeline: 'enum',
  belief_ai_risk: 'enum',
  belief_threat_models: 'multi_enum',
  belief_evidence_source: 'enum',
};

// Fields to verify by entity type
// All belief fields apply to both persons and organizations
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
  sonnet_input: 0,
  sonnet_output: 0,
  opus_input: 0,
  opus_output: 0,
  exa_searches: 0,

  trackClaude(usage, model) {
    if (model === 'sonnet') {
      this.sonnet_input += usage.input_tokens;
      this.sonnet_output += usage.output_tokens;
    } else {
      this.opus_input += usage.input_tokens;
      this.opus_output += usage.output_tokens;
    }
  },

  trackExa() {
    this.exa_searches++;
  },

  getSummary() {
    // Sonnet 4: $3/1M input, $15/1M output
    // Opus 4.5: $15/1M input, $75/1M output
    const sonnetCost = (this.sonnet_input * 3 + this.sonnet_output * 15) / 1_000_000;
    const opusCost = (this.opus_input * 15 + this.opus_output * 75) / 1_000_000;
    const exaCost = this.exa_searches * 0.008; // ~$0.008 per search

    return {
      sonnet_cost_usd: sonnetCost,
      opus_cost_usd: opusCost,
      exa_cost_usd: exaCost,
      total_cost_usd: sonnetCost + opusCost + exaCost,
      claude_calls: {
        sonnet_input_tokens: this.sonnet_input,
        sonnet_output_tokens: this.sonnet_output,
        opus_input_tokens: this.opus_input,
        opus_output_tokens: this.opus_output,
      },
      exa_searches: this.exa_searches,
    };
  },
};

// ── Tool Definitions ──

const EXA_SEARCH_TOOL = {
  name: 'exa_search',
  description: 'Search the web for evidence about an entity\'s beliefs or positions. Returns relevant snippets from web pages.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query. Be specific — include the entity name and the belief/position you\'re looking for evidence about.',
      },
      num_results: {
        type: 'number',
        description: 'Number of results to return (default: 5, max: 10)',
      },
    },
    required: ['query'],
  },
};

const SUBMIT_ARGUMENT_TOOL = {
  name: 'submit_argument',
  description: 'Submit your final argument. This completes your task.',
  input_schema: {
    type: 'object',
    properties: {
      existing_evidence_critique: {
        type: 'string',
        description: 'Your assessment of the existing database claims (if any were provided). Rate each as strong/moderate/weak and explain why.',
      },
      attribution_chain: {
        type: 'array',
        description: 'Your attribution chain from fresh search results',
        items: {
          type: 'object',
          properties: {
            source_url: { type: 'string' },
            source_title: { type: 'string' },
            quote_or_paraphrase: { type: 'string' },
            is_direct_quote: { type: 'boolean' },
            speaker: { type: 'string' },
            attribution_type: {
              type: 'string',
              enum: ['first_person', 'authored_position', 'third_party_characterization'],
            },
            supports_current_value: { type: 'boolean' },
            contradicts_current_value: { type: 'boolean' },
            notes: { type: 'string' },
          },
        },
      },
      argument: {
        type: 'string',
        description: 'Your complete argument text, including evidence analysis and conclusion.',
      },
      proposed_value: {
        type: 'string',
        description: 'For prosecutor: the value you propose instead (if any). For defender: leave null.',
      },
      evidence_summary: {
        type: 'object',
        properties: {
          first_person_count: { type: 'number' },
          third_party_count: { type: 'number' },
          strongest_source_url: { type: 'string' },
          strongest_citation: { type: 'string' },
        },
      },
    },
    required: ['argument', 'attribution_chain', 'evidence_summary'],
  },
};

const SUBMIT_VERDICT_TOOL = {
  name: 'submit_verdict',
  description: 'Submit your final verdict. This completes your task.',
  input_schema: {
    type: 'object',
    properties: {
      verdict: {
        type: 'string',
        enum: ['confirm', 'correct', 'remove'],
        description: 'confirm = current value is correct, correct = propose new value, remove = no evidence supports any value',
      },
      proposed_value: {
        type: 'string',
        description: 'Required if verdict is "correct". Must be a valid enum value.',
      },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
      },
      winning_side: {
        type: 'string',
        enum: ['prosecution', 'defense', 'neither'],
      },
      attribution_type: {
        type: 'string',
        enum: ['first_person', 'third_party_characterization', 'none'],
        description: 'Type of the strongest evidence supporting the verdict',
      },
      source_url: {
        type: 'string',
        description: 'URL of the strongest supporting source',
      },
      citation: {
        type: 'string',
        description: 'Key quote or citation from the strongest source',
      },
      reasoning: {
        type: 'string',
        description: 'Detailed explanation of your verdict',
      },
      evidence_assessment: {
        type: 'object',
        properties: {
          prosecution_first_person: { type: 'number' },
          prosecution_third_party: { type: 'number' },
          defense_first_person: { type: 'number' },
          defense_third_party: { type: 'number' },
        },
      },
    },
    required: ['verdict', 'confidence', 'winning_side', 'reasoning', 'evidence_assessment'],
  },
};

// ── Exa Search Handler ──

async function handleExaSearch(query, numResults = 5) {
  costs.trackExa();

  try {
    const response = await exa.searchAndContents(query, {
      numResults: Math.min(numResults, 10),
      text: { maxCharacters: 2000 },
      highlights: { numSentences: 3 },
      excludeDomains: ['wikipedia.org', 'wikidata.org'],
    });

    return {
      results: (response.results || []).map(r => ({
        url: r.url,
        title: r.title,
        text: r.text?.substring(0, 1500),
        highlights: r.highlights,
        publishedDate: r.publishedDate,
      })),
    };
  } catch (err) {
    console.error('Exa search error:', err.message);
    return { results: [], error: err.message };
  }
}

// ── Database Queries ──

// Map fields to their claim dimension (some fields share claims)
function getClaimDimension(field) {
  const dimensionMap = {
    belief_regulatory_stance: 'regulatory_stance',
    belief_regulatory_stance_detail: 'regulatory_stance', // shares claims with stance
    belief_evidence_source: null, // uses ALL claims for the entity, not a specific dimension
    belief_agi_timeline: 'agi_timeline',
    belief_ai_risk: 'ai_risk_level',
    belief_threat_models: 'threat_models',
  };
  return dimensionMap[field] ?? field.replace('belief_', '');
}

async function getExistingClaims(entityId, beliefField) {
  const beliefDimension = getClaimDimension(beliefField);

  // For evidence_source, get ALL claims to assess overall evidence quality
  if (beliefDimension === null) {
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
         ORDER BY c.confidence DESC, c.extraction_date DESC`,
        [entityId]
      );
      return result.rows;
    } catch (err) {
      if (err.code === '42P01') return [];
      throw err;
    }
  }

  try {
    const result = await pool.query(
      `SELECT
         c.claim_id,
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
       WHERE c.entity_id = $1 AND c.belief_dimension = $2
       ORDER BY c.confidence DESC, c.extraction_date DESC`,
      [entityId, beliefDimension]
    );
    return result.rows;
  } catch (err) {
    if (err.code === '42P01') return [];
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

// ── Agent Runners ──

async function runAgentWithTools(systemPrompt, userMessage, tools, maxTurns = 10) {
  const messages = [{ role: 'user', content: userMessage }];

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      tools,
      messages,
    });

    costs.trackClaude(response.usage, 'sonnet');

    // Check for tool use
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

    if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
      // No tool calls, agent is done (shouldn't happen with our design)
      const textBlocks = response.content.filter(b => b.type === 'text');
      return { text: textBlocks.map(b => b.text).join('\n'), toolResult: null };
    }

    // Process tool calls
    const toolResults = [];
    for (const toolUse of toolUseBlocks) {
      if (toolUse.name === 'exa_search') {
        const result = await handleExaSearch(
          toolUse.input.query,
          toolUse.input.num_results || 5
        );
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result, null, 2),
        });
      } else if (toolUse.name === 'submit_argument') {
        // Terminal tool - return the argument
        return { text: null, toolResult: toolUse.input };
      } else if (toolUse.name === 'submit_verdict') {
        // Terminal tool - return the verdict
        return { text: null, toolResult: toolUse.input };
      }
    }

    // Add assistant message and tool results to continue conversation
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });
  }

  throw new Error('Agent exceeded max turns without completing');
}

async function runJudgeWithExtendedThinking(systemPrompt, userMessage) {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 16000,
    thinking: {
      type: 'enabled',
      budget_tokens: 8000,
    },
    system: systemPrompt,
    tools: [SUBMIT_VERDICT_TOOL],
    messages: [{ role: 'user', content: userMessage }],
  });

  costs.trackClaude(response.usage, 'opus');

  // Find the tool use block
  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (toolUse && toolUse.name === 'submit_verdict') {
    return toolUse.input;
  }

  // Fallback: try to parse from text
  const textBlocks = response.content.filter(b => b.type === 'text');
  const text = textBlocks.map(b => b.text).join('\n');

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}

  return null;
}

// ── Format Existing Claims as Search Results ──
// Present existing sources identically to Exa results — no "database" labeling

function formatExistingSourcesAsSearchResults(claims) {
  if (!claims || claims.length === 0) {
    return null;
  }

  // Filter to claims that have actual source URLs
  const withUrls = claims.filter(c => c.source_url);
  if (withUrls.length === 0) return null;

  // Format exactly like Exa search results
  return withUrls.map(c => ({
    url: c.source_url,
    title: c.source_title || 'Untitled',
    text: c.cached_excerpt || c.citation || '',
    publishedDate: c.source_date || null,
  }));
}

// ── Main Field Verification ──

async function verifyBeliefField(entity, field) {
  const currentValue = entity[field];
  if (!currentValue) return null;

  // Truncate display for long text fields
  const displayValue = currentValue.length > 100
    ? currentValue.substring(0, 100) + '...'
    : currentValue;
  console.log(`\n    [${field}] = "${displayValue}"`);

  // Fetch existing claims with sources
  const existingClaims = await getExistingClaims(entity.id, field);
  console.log(`      Existing claims: ${existingClaims.length}`);

  const fieldType = FIELD_TYPES[field] || 'enum';
  const validValues = BELIEF_ENUMS[field] || [];

  // Format existing sources to look like search results (no "database" labeling)
  const initialSources = formatExistingSourcesAsSearchResults(existingClaims);

  // Build user message for agents based on field type
  let agentContext = `
ENTITY: ${entity.name}
ENTITY TYPE: ${entity.entity_type}
FIELD: ${field}
FIELD TYPE: ${fieldType}
CURRENT VALUE: ${currentValue}
`;

  // Add field-specific instructions
  if (fieldType === 'text') {
    agentContext += `
THIS IS A FREE-TEXT FIELD. Your task is to verify whether this text accurately summarizes the entity's position based on the evidence.
- If accurate: verdict = confirm
- If inaccurate or incomplete: verdict = correct, proposed_value = your improved summary
- If no evidence supports any summary: verdict = remove
`;
  } else if (field === 'belief_evidence_source') {
    agentContext += `
THIS IS AN EVIDENCE CLASSIFICATION FIELD. Based on the claims/sources, determine whether the evidence type is correctly classified.
- "Explicitly stated" = entity directly stated their views (first-person quotes, testimony, op-eds)
- "Inferred" = third-party characterizations or analysis
- "Inferred from actions" = deduced from behavior/decisions without explicit statements

VALID VALUES: ${validValues.join(', ')}
`;
  } else {
    agentContext += `
VALID VALUES FOR THIS FIELD:
${validValues.join(', ')}
`;
  }

  // Add initial sources if we have any (formatted like search results)
  if (initialSources && initialSources.length > 0) {
    agentContext += `
INITIAL SOURCES:
The following sources have been provided as a starting point. You may use these and/or search for additional sources.

${JSON.stringify(initialSources, null, 2)}
`;
  } else {
    agentContext += `
No initial sources provided. Use the exa_search tool to find evidence.
`;
  }

  // Run prosecutor and defender in parallel
  console.log(`      Running prosecutor + defender...`);

  const [prosecutorResult, defenderResult] = await Promise.all([
    runAgentWithTools(
      PROMPTS.prosecutor,
      agentContext,
      [EXA_SEARCH_TOOL, SUBMIT_ARGUMENT_TOOL]
    ),
    runAgentWithTools(
      PROMPTS.defender,
      agentContext,
      [EXA_SEARCH_TOOL, SUBMIT_ARGUMENT_TOOL]
    ),
  ]);

  const prosecutorArg = prosecutorResult.toolResult;
  const defenderArg = defenderResult.toolResult;

  if (!prosecutorArg || !defenderArg) {
    console.log(`      ERROR: Agent failed to submit argument`);
    return {
      entity_id: entity.id,
      entity_name: entity.name,
      entity_type: entity.entity_type,
      field,
      current_value: currentValue,
      verdict: 'error',
      reasoning: 'Agent failed to submit argument',
    };
  }

  // Build debate transcript for judge
  const debateTranscript = `
ENTITY: ${entity.name}
FIELD: ${field}
CURRENT VALUE: ${currentValue}

=== PROSECUTION ARGUMENT ===

${prosecutorArg.argument}

Evidence Summary:
- First-person sources: ${prosecutorArg.evidence_summary?.first_person_count || 0}
- Third-party sources: ${prosecutorArg.evidence_summary?.third_party_count || 0}
- Strongest source: ${prosecutorArg.evidence_summary?.strongest_source_url || 'none'}

Proposed correction: ${prosecutorArg.proposed_value || 'none'}

=== DEFENSE ARGUMENT ===

${defenderArg.argument}

Evidence Summary:
- First-person sources: ${defenderArg.evidence_summary?.first_person_count || 0}
- Third-party sources: ${defenderArg.evidence_summary?.third_party_count || 0}
- Strongest source: ${defenderArg.evidence_summary?.strongest_source_url || 'none'}
`;

  // Run judge with extended thinking
  console.log(`      Running judge (Opus + extended thinking)...`);

  const verdict = await runJudgeWithExtendedThinking(PROMPTS.judge, debateTranscript);

  if (!verdict) {
    return {
      entity_id: entity.id,
      entity_name: entity.name,
      entity_type: entity.entity_type,
      field,
      current_value: currentValue,
      verdict: 'error',
      reasoning: 'Judge failed to submit verdict',
    };
  }

  // Validate proposed value (skip for text fields which have no enum)
  if (verdict.verdict === 'correct' && verdict.proposed_value && fieldType !== 'text') {
    if (validValues.length > 0 && !validValues.includes(verdict.proposed_value)) {
      console.log(`      WARNING: Invalid proposed value "${verdict.proposed_value}"`);
      verdict.validation_error = `Invalid value. Valid options: ${validValues.join(', ')}`;
    }
  }

  // Attach metadata
  verdict.entity_id = entity.id;
  verdict.entity_name = entity.name;
  verdict.entity_type = entity.entity_type;
  verdict.field = field;
  verdict.current_value = currentValue;
  verdict.prosecutor_argument = prosecutorArg.argument;
  verdict.defender_argument = defenderArg.argument;
  verdict.prosecutor_attribution_chain = prosecutorArg.attribution_chain;
  verdict.defender_attribution_chain = defenderArg.attribution_chain;

  // Track superseded claims
  if (existingClaims.length > 0) {
    verdict.superseded_claim_ids = existingClaims.map(c => c.claim_id);
  }

  console.log(`      → Verdict: ${verdict.verdict} (${verdict.confidence})`);
  if (verdict.verdict === 'correct') {
    console.log(`      → Correction: "${currentValue}" → "${verdict.proposed_value}"`);
  }

  return verdict;
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

  console.log('Belief Verification Pipeline — 3-Agent Design');
  console.log('='.repeat(50));

  // Parse options
  const options = {
    entityId: flags.id,
    limit: flags.limit ? parseInt(flags.limit) : 10,
    idRange: flags['id-range'] ? flags['id-range'].split('-').map(Number) : null,
  };

  // Fetch entities
  const entities = await getEntitiesWithBeliefs(options);
  console.log(`Found ${entities.length} entities to verify\n`);

  const allCorrections = [];
  const startTime = Date.now();

  for (const entity of entities) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`[${entity.id}] ${entity.name} (${entity.entity_type})`);
    console.log('='.repeat(50));

    const fields = BELIEF_FIELDS[entity.entity_type] || BELIEF_FIELDS.person;

    for (const field of fields) {
      if (!entity[field]) continue;

      try {
        const correction = await verifyBeliefField(entity, field);
        if (correction) {
          allCorrections.push(correction);

          // Write to JSONL immediately
          const jsonlPath = path.join(__dirname, 'results/corrections.jsonl');
          fs.mkdirSync(path.dirname(jsonlPath), { recursive: true });
          fs.appendFileSync(jsonlPath, JSON.stringify(correction) + '\n');
        }
      } catch (err) {
        console.error(`      ERROR: ${err.message}`);
        allCorrections.push({
          entity_id: entity.id,
          entity_name: entity.name,
          field,
          verdict: 'error',
          reasoning: err.message,
        });
      }
    }
  }

  // Summary
  const elapsed = Date.now() - startTime;
  const costSummary = costs.getSummary();

  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Entities processed: ${entities.length}`);
  console.log(`Fields verified: ${allCorrections.length}`);
  console.log(`Time: ${(elapsed / 1000).toFixed(1)}s`);
  console.log(`\nVerdicts:`);

  const verdictCounts = {};
  for (const c of allCorrections) {
    verdictCounts[c.verdict] = (verdictCounts[c.verdict] || 0) + 1;
  }
  for (const [v, count] of Object.entries(verdictCounts)) {
    console.log(`  ${v}: ${count}`);
  }

  console.log(`\nCosts:`);
  console.log(`  Sonnet: $${costSummary.sonnet_cost_usd.toFixed(4)}`);
  console.log(`  Opus: $${costSummary.opus_cost_usd.toFixed(4)}`);
  console.log(`  Exa: $${costSummary.exa_cost_usd.toFixed(4)}`);
  console.log(`  TOTAL: $${costSummary.total_cost_usd.toFixed(4)}`);

  // Write run stats
  const statsPath = path.join(__dirname, 'results/run-stats.json');
  fs.writeFileSync(statsPath, JSON.stringify({
    run_started_at: new Date(startTime).toISOString(),
    run_ended_at: new Date().toISOString(),
    total_duration_ms: elapsed,
    entities_processed: entities.length,
    fields_verified: allCorrections.length,
    verdicts: verdictCounts,
    ...costSummary,
  }, null, 2));

  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
