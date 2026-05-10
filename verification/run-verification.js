/**
 * Run Verification Pipeline
 *
 * Orchestrates the verification pipeline using standard Claude API calls.
 * Tests the full 6-phase flow on a sample of entities.
 *
 * Usage:
 *   node run-verification.js --limit=5              # 5 random entities
 *   node run-verification.js --id=123               # Single entity
 *   node run-verification.js --dry-run --limit=3    # Preview only
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { getFullEntityRecord, getVerificationQueue, updateFieldVerification, updateEntityFields, addToHumanReviewQueue, logVerificationAudit, batchUpdateSourcesVerifiedAt } from './lib/db-tools.js';
import { searchForBeliefAttribution, searchForFactualClaim, validateUrl, costs as exaCosts } from './lib/exa-search.js';
import { repairFundingModel, repairThreatModels } from './lib/enum-mappings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// Use dedicated verification API key
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_MULTIAGENT_VERIFICATION_KEY || process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('ERROR: No Anthropic API key found.');
  process.exit(1);
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Parse CLI args
const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 5;
const singleId = args.find(a => a.startsWith('--id='))?.split('=')[1];
const dryRun = args.includes('--dry-run');

// Cost tracking
const costs = {
  claude_calls: 0,
  claude_input_tokens: 0,
  claude_output_tokens: 0,
  claude_cost: 0,

  trackClaude(usage, model = 'sonnet') {
    this.claude_calls++;
    this.claude_input_tokens += usage.input_tokens || 0;
    this.claude_output_tokens += usage.output_tokens || 0;

    // Pricing per model
    const pricing = {
      haiku: { input: 0.25, output: 1.25 },
      sonnet: { input: 3, output: 15 },
      opus: { input: 15, output: 75 },
    };
    const p = pricing[model] || pricing.sonnet;
    this.claude_cost =
      (this.claude_input_tokens / 1_000_000) * p.input +
      (this.claude_output_tokens / 1_000_000) * p.output;
  },

  summary() {
    const total = this.claude_cost + exaCosts.cost;
    return `Claude: ${this.claude_calls} calls, ${this.claude_input_tokens.toLocaleString()} in / ${this.claude_output_tokens.toLocaleString()} out ($${this.claude_cost.toFixed(3)}) | ${exaCosts.summary()} | Total: $${total.toFixed(3)}`;
  }
};

// Load prompts
function loadPrompt(name) {
  const promptPath = path.join(__dirname, 'agents/prompts', `${name}.md`);
  if (fs.existsSync(promptPath)) {
    return fs.readFileSync(promptPath, 'utf-8');
  }
  return null;
}

// ── Phase 0: Enum Validation ──

function runEnumValidation(entity) {
  const repairs = {};

  if (entity.funding_model) {
    const result = repairFundingModel(entity.funding_model);
    if (result.action !== 'unchanged') {
      repairs.funding_model = result;
    }
  }

  if (entity.belief_threat_models) {
    const result = repairThreatModels(entity.belief_threat_models);
    if (result.action !== 'unchanged') {
      repairs.belief_threat_models = result;
    }
  }

  return repairs;
}

// ── Phase 1: Decompose into Claims ──

async function decomposeToClaims(entity) {
  const prompt = loadPrompt('decomposer');

  // Simplify entity for decomposition - only send relevant fields
  const simplified = {
    entity_type: entity.entity_type,
    name: entity.name,
    category: entity.category,
    other_categories: entity.other_categories,
  };

  // Add type-specific fields
  if (entity.entity_type === 'person') {
    Object.assign(simplified, {
      title: entity.title,
      primary_org: entity.primary_org,
      belief_regulatory_stance: entity.belief_regulatory_stance,
      belief_evidence_source: entity.belief_evidence_source,
      belief_agi_timeline: entity.belief_agi_timeline,
      belief_ai_risk: entity.belief_ai_risk,
      belief_threat_models: entity.belief_threat_models,
      influence_type: entity.influence_type,
      twitter: entity.twitter,
      website: entity.website,
    });
  } else if (entity.entity_type === 'organization') {
    Object.assign(simplified, {
      funding_model: entity.funding_model,
      belief_regulatory_stance: entity.belief_regulatory_stance,
      website: entity.website,
      twitter: entity.twitter,
    });
  }

  // Add notes excerpt (first 500 chars) - column is `notes` not `notes_html`
  if (entity.notes) {
    simplified.notes_excerpt = entity.notes.substring(0, 500);
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: prompt + `\n\nIMPORTANT: Your response must be valid JSON only. Do not include any text before or after the JSON object. Start with { and end with }.`,
    messages: [{
      role: 'user',
      content: `Decompose this ${entity.entity_type} record into atomic claims. Return JSON only:\n\n${JSON.stringify(simplified, null, 2)}`
    }]
  });

  costs.trackClaude(response.usage, 'sonnet');

  // Parse JSON from response
  const text = response.content[0].text.trim();

  // Try multiple parsing strategies
  try {
    // Direct parse
    return JSON.parse(text);
  } catch {
    // Try extracting JSON block
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {}
    }

    // Try finding JSON object
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch {}
    }

    console.log('  Warning: Could not parse decomposer output as JSON');
    console.log('  Raw output (first 200 chars):', text.substring(0, 200));
    return { claims: [], raw: text };
  }
}

// ── Phase 2: Search + Attribution ──

async function searchAndAttribute(claim, entityName) {
  const { field, verification_type, current_value } = claim;

  // Use the entity name passed from the main function, not from the claim
  // The decomposer may not include it consistently
  const name = entityName || claim.entity || claim.entity_name;

  if (!name) {
    console.log('      Warning: No entity name for search');
    return { success: false, results: [], error: 'No entity name' };
  }

  if (verification_type === 'belief_attribution') {
    return await searchForBeliefAttribution(name, field);
  } else {
    return await searchForFactualClaim(name, current_value, 'general');
  }
}

// ── Phase 3: Adversarial Debate ──

async function runAdversarialDebate(claim, searchResults) {
  // Prosecutor
  const prosecutorPrompt = loadPrompt('prosecutor');
  const prosecutorResponse = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: prosecutorPrompt,
    messages: [{
      role: 'user',
      content: `Challenge this claim:\n\nClaim: ${JSON.stringify(claim)}\n\nEvidence:\n${JSON.stringify(searchResults, null, 2)}`
    }]
  });
  costs.trackClaude(prosecutorResponse.usage, 'sonnet');

  // Defender
  const defenderPrompt = loadPrompt('defender');
  const defenderResponse = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: defenderPrompt,
    messages: [{
      role: 'user',
      content: `Defend this claim:\n\nClaim: ${JSON.stringify(claim)}\n\nEvidence:\n${JSON.stringify(searchResults, null, 2)}`
    }]
  });
  costs.trackClaude(defenderResponse.usage, 'sonnet');

  // Judge (Opus - most expensive, runs once)
  const judgePrompt = loadPrompt('judge');
  const judgeResponse = await client.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 1000,
    system: judgePrompt,
    messages: [{
      role: 'user',
      content: `Judge this debate:\n\nClaim field: ${claim.field}\nClaim value: ${claim.current_value}\n\nProsecutor arguments:\n${prosecutorResponse.content[0].text}\n\nDefender arguments:\n${defenderResponse.content[0].text}`
    }]
  });
  costs.trackClaude(judgeResponse.usage, 'opus');

  return {
    prosecutor: prosecutorResponse.content[0].text,
    defender: defenderResponse.content[0].text,
    judge: judgeResponse.content[0].text,
  };
}

// ── Phase 4: Correction Proposal ──

async function generateCorrectionProposal(claim, debate, searchResults) {
  const prompt = loadPrompt('correction-proposal');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: prompt + `\n\nReturn your response as valid JSON only.`,
    messages: [{
      role: 'user',
      content: `Generate a correction proposal for this claim based on the debate verdict.

Claim: ${JSON.stringify(claim)}

Judge verdict: ${debate.judge}

Evidence sources: ${JSON.stringify(searchResults.results?.map(r => ({ url: r.url, title: r.title, excerpt: r.highlights?.[0] })) || [], null, 2)}`
    }]
  });

  costs.trackClaude(response.usage, 'sonnet');

  const text = response.content[0].text.trim();
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]); } catch {}
    }
    return { raw: text };
  }
}

// ── Main Pipeline ──

async function verifyEntity(entityId) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Verifying entity ${entityId}`);
  console.log('='.repeat(60));

  // Get full record
  const record = await getFullEntityRecord(entityId);
  if (!record.found) {
    console.log(`  Entity ${entityId} not found`);
    return null;
  }

  const entity = record.entity;
  console.log(`\n  Name: ${entity.name}`);
  console.log(`  Type: ${entity.entity_type}`);
  console.log(`  Category: ${entity.category}`);
  console.log(`  Edges: ${record.edges.length}, Claims: ${record.claims.length}`);

  // Phase 0: Enum validation
  console.log('\n  Phase 0: Enum validation...');
  const enumRepairs = runEnumValidation(entity);
  if (Object.keys(enumRepairs).length > 0) {
    console.log(`    Repairs needed: ${Object.keys(enumRepairs).join(', ')}`);
    for (const [field, repair] of Object.entries(enumRepairs)) {
      console.log(`      ${field}: ${repair.action} → ${repair.value}`);
    }
  } else {
    console.log('    No enum repairs needed');
  }

  // Phase 1: Decompose
  console.log('\n  Phase 1: Decomposing into claims...');
  const decomposed = await decomposeToClaims(entity);
  const claims = decomposed.claims || [];
  console.log(`    Found ${claims.length} claims`);

  if (claims.length === 0) {
    console.log('    No claims to verify');
    return { entity, enumRepairs, claims: [], verdicts: [] };
  }

  // Show claim breakdown
  const fullPathClaims = claims.filter(c => c.path === 'full_path');
  const fastPathClaims = claims.filter(c => c.path === 'fast_path');
  console.log(`    Full path: ${fullPathClaims.length}, Fast path: ${fastPathClaims.length}`);

  // Phase 2 & 3: Search + Debate (for full path claims only)
  const verdicts = [];

  // Process belief claims AND notes claims (up to 5 total to control costs)
  const beliefClaims = fullPathClaims.filter(c => c.field?.startsWith('belief_'));
  const notesClaims = fullPathClaims.filter(c => c.field === 'notes' || c.field === 'notes_excerpt');

  // Prioritize: belief claims first, then notes claims
  const claimsToVerify = [...beliefClaims.slice(0, 3), ...notesClaims.slice(0, 2)];

  if (claimsToVerify.length > 0) {
    console.log(`\n  Phase 2-3: Verifying ${claimsToVerify.length} claims (${beliefClaims.length} belief, ${notesClaims.length} notes)...`);

    for (const claim of claimsToVerify) {
      console.log(`\n    Claim: ${claim.field} = "${claim.current_value}"`);

      // Search
      console.log('      Searching for evidence...');
      const searchResults = await searchAndAttribute(claim, entity.name);
      console.log(`      Found ${searchResults.results?.length || 0} sources`);

      if (searchResults.results?.length > 0) {
        // Run debate
        console.log('      Running adversarial debate...');
        const debate = await runAdversarialDebate(claim, searchResults);

        // Extract verdict from judge response
        const verdictMatch = debate.judge.match(/"verdict":\s*"(\w+)"/);
        const confidenceMatch = debate.judge.match(/"confidence":\s*"(\w+)"/);

        // Generate correction proposal
        console.log('      Generating correction proposal...');
        const proposal = await generateCorrectionProposal(claim, debate, searchResults);

        const verdict = {
          field: claim.field,
          current_value: claim.current_value,
          verdict: verdictMatch?.[1] || 'UNCERTAIN',
          confidence: confidenceMatch?.[1] || 'low',
          sources_found: searchResults.results.length,
          // Rich data that differentiates from verify-all.js
          evidence: searchResults.results.map(r => ({
            url: r.url,
            title: r.title,
            excerpt: r.highlights?.[0] || r.text?.substring(0, 200),
          })),
          debate: {
            prosecutor_summary: debate.prosecutor.substring(0, 500),
            defender_summary: debate.defender.substring(0, 500),
            judge_rationale: debate.judge,
          },
          proposal: proposal,
        };

        verdicts.push(verdict);
        console.log(`      Verdict: ${verdict.verdict} (${verdict.confidence})`);
        if (proposal.action) {
          console.log(`      Proposal: ${proposal.action}${proposal.proposed_value ? ' → ' + proposal.proposed_value : ''}`);
        }
      } else {
        verdicts.push({
          field: claim.field,
          current_value: claim.current_value,
          verdict: 'UNCERTAIN',
          confidence: 'unsupported',
          sources_found: 0,
          evidence: [],
          debate: null,
          proposal: { action: 'flag_for_human', reason: 'No sources found' },
        });
        console.log('      Verdict: UNCERTAIN (no sources found)');
      }
    }
  }

  // Summary
  console.log(`\n  Summary:`);
  console.log(`    Enum repairs: ${Object.keys(enumRepairs).length}`);
  console.log(`    Claims verified: ${verdicts.length}`);
  console.log(`    Verdicts: ${verdicts.filter(v => v.verdict === 'SUPPORTED').length} supported, ${verdicts.filter(v => v.verdict === 'UNCERTAIN').length} uncertain, ${verdicts.filter(v => v.verdict === 'REFUTED').length} refuted`);

  // Apply write-back (if not dry run)
  if (!dryRun) {
    console.log('\n  Phase 5: Write-back...');

    const fieldUpdates = {};
    const fieldVerificationUpdates = {};
    const sourcesVerified = [];

    for (const verdict of verdicts) {
      const action = verdict.proposal?.action;
      const field = verdict.field;

      // Collect source URLs that were verified
      if (verdict.evidence) {
        sourcesVerified.push(...verdict.evidence.map(e => e.url));
      }

      // Apply based on proposal action
      if (action === 'confirm') {
        // Mark field as verified, keep current value
        fieldVerificationUpdates[field] = {
          status: 'verified',
          confidence: verdict.confidence,
          checked_at: new Date().toISOString(),
          source_urls: verdict.evidence?.map(e => e.url) || [],
        };
        console.log(`    ✓ ${field}: confirmed (verified)`);

      } else if (action === 'correct' && verdict.proposal?.proposed_value) {
        // Update field value AND mark as verified
        fieldUpdates[field] = verdict.proposal.proposed_value;
        fieldVerificationUpdates[field] = {
          status: 'verified',
          confidence: verdict.confidence,
          checked_at: new Date().toISOString(),
          corrected_from: verdict.current_value,
          source_urls: verdict.evidence?.map(e => e.url) || [],
        };
        console.log(`    ✓ ${field}: corrected "${verdict.current_value}" → "${verdict.proposal.proposed_value}"`);

      } else if (action === 'remove') {
        // Set field to NULL and mark as unverified
        fieldUpdates[field] = null;
        fieldVerificationUpdates[field] = {
          status: 'unverified',
          confidence: 'unsupported',
          checked_at: new Date().toISOString(),
          removed_value: verdict.current_value,
          reason: verdict.proposal?.reason || 'No supporting evidence found',
        };
        console.log(`    ✗ ${field}: removed (was "${verdict.current_value}")`);

      } else if (action === 'flag_for_human') {
        // Add to human review queue, mark as pending
        fieldVerificationUpdates[field] = {
          status: 'pending_review',
          confidence: verdict.confidence,
          checked_at: new Date().toISOString(),
        };
        await addToHumanReviewQueue({
          entity_id: entity.id,
          entity_name: entity.name,
          field: verdict.field,
          current_value: verdict.current_value,
          proposed_value: verdict.proposal?.proposed_value,
          reason: verdict.proposal?.reason || 'Flagged by verification pipeline',
          evidence_summary: verdict.debate?.judge_rationale?.substring(0, 500),
          evidence_urls: verdict.evidence?.map(e => e.url),
          priority: verdict.field.startsWith('belief_') ? 'high' : 'normal',
        });
        console.log(`    ? ${field}: flagged for human review`);

      } else {
        // No action or unknown action - mark as checked but uncertain
        fieldVerificationUpdates[field] = {
          status: 'uncertain',
          confidence: verdict.confidence || 'low',
          checked_at: new Date().toISOString(),
        };
        console.log(`    ~ ${field}: uncertain (no clear action)`);
      }

      // Log to audit
      await logVerificationAudit({
        entity_id: entity.id,
        action: action || 'verify',
        field: verdict.field,
        old_value: verdict.current_value,
        new_value: verdict.proposal?.proposed_value || null,
        reason: `Verdict: ${verdict.verdict} (${verdict.confidence}). Proposal: ${action || 'none'}`,
        evidence_urls: verdict.evidence?.map(e => e.url) || null,
        confidence: verdict.confidence,
      });
    }

    // Apply field value updates
    if (Object.keys(fieldUpdates).length > 0) {
      await updateEntityFields(entity.id, fieldUpdates);
      console.log(`    Applied ${Object.keys(fieldUpdates).length} field corrections`);
    }

    // Apply field_verification JSONB updates
    if (Object.keys(fieldVerificationUpdates).length > 0) {
      await updateFieldVerification(entity.id, fieldVerificationUpdates);
      console.log(`    Updated field_verification for ${Object.keys(fieldVerificationUpdates).length} fields`);
    }

    // Update last_verified_at on sources
    if (sourcesVerified.length > 0) {
      const uniqueUrls = [...new Set(sourcesVerified)];
      const updated = await batchUpdateSourcesVerifiedAt(uniqueUrls);
      if (updated > 0) {
        console.log(`    Updated last_verified_at on ${updated} sources`);
      }
    }
  }

  return { entity, enumRepairs, claims, verdicts };
}

async function main() {
  console.log('Mapping AI Verification Pipeline');
  console.log('================================\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Target: ${singleId ? `Entity ${singleId}` : `${limit} entities from queue`}`);

  const results = [];

  if (singleId) {
    const result = await verifyEntity(parseInt(singleId));
    if (result) results.push(result);
  } else {
    // Get entities from verification queue
    const queue = await getVerificationQueue({ limit });
    console.log(`\nLoaded ${queue.length} entities from queue`);

    for (const entity of queue) {
      const result = await verifyEntity(entity.id);
      if (result) results.push(result);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nEntities processed: ${results.length}`);

  const totalVerdicts = results.flatMap(r => r.verdicts);
  console.log(`Total verdicts: ${totalVerdicts.length}`);
  console.log(`  SUPPORTED: ${totalVerdicts.filter(v => v.verdict === 'SUPPORTED').length}`);
  console.log(`  UNCERTAIN: ${totalVerdicts.filter(v => v.verdict === 'UNCERTAIN').length}`);
  console.log(`  REFUTED: ${totalVerdicts.filter(v => v.verdict === 'REFUTED').length}`);

  // Proposal breakdown
  const proposals = totalVerdicts.map(v => v.proposal?.action).filter(Boolean);
  console.log(`\nProposals:`);
  console.log(`  confirm: ${proposals.filter(p => p === 'confirm').length}`);
  console.log(`  correct: ${proposals.filter(p => p === 'correct').length}`);
  console.log(`  flag_for_human: ${proposals.filter(p => p === 'flag_for_human').length}`);
  console.log(`  remove: ${proposals.filter(p => p === 'remove').length}`);

  console.log(`\nCosts: ${costs.summary()}`);

  // Save full results to JSON file
  const outputPath = path.join(__dirname, `results/verification-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fullResults = {
    timestamp: new Date().toISOString(),
    mode: dryRun ? 'dry_run' : 'live',
    entities_processed: results.length,
    costs: {
      claude_calls: costs.claude_calls,
      claude_input_tokens: costs.claude_input_tokens,
      claude_output_tokens: costs.claude_output_tokens,
      claude_cost: costs.claude_cost,
      exa_searches: exaCosts.searches,
      exa_cost: exaCosts.cost,
      total_cost: costs.claude_cost + exaCosts.cost,
    },
    summary: {
      supported: totalVerdicts.filter(v => v.verdict === 'SUPPORTED').length,
      uncertain: totalVerdicts.filter(v => v.verdict === 'UNCERTAIN').length,
      refuted: totalVerdicts.filter(v => v.verdict === 'REFUTED').length,
    },
    results: results.map(r => ({
      entity_id: r.entity.id,
      entity_name: r.entity.name,
      entity_type: r.entity.entity_type,
      enum_repairs: r.enumRepairs,
      claims_count: r.claims.length,
      verdicts: r.verdicts,
    })),
  };

  fs.writeFileSync(outputPath, JSON.stringify(fullResults, null, 2));
  console.log(`\nFull results saved to: ${outputPath}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Pipeline error:', err);
  process.exit(1);
});
