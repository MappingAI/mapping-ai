/**
 * Setup script for verification pipeline agents
 *
 * Creates all agents in the Claude Managed Agents API and outputs their IDs.
 * Run once to set up the pipeline, then use the IDs in test-sample.js
 *
 * Uses ANTHROPIC_MULTIAGENT_VERIFICATION_KEY for billing isolation.
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../.env') })

// Use dedicated verification API key
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_MULTIAGENT_VERIFICATION_KEY || process.env.ANTHROPIC_API_KEY

if (!ANTHROPIC_API_KEY) {
  console.error('ERROR: No Anthropic API key found.')
  console.error('Set ANTHROPIC_MULTIAGENT_VERIFICATION_KEY in .env for billing isolation.')
  process.exit(1)
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

// Read prompt files
function readPrompt(name) {
  const promptPath = path.join(__dirname, 'prompts', `${name}.md`)
  if (fs.existsSync(promptPath)) {
    return fs.readFileSync(promptPath, 'utf-8')
  }
  console.warn(`Warning: Prompt file not found for ${name}, using fallback`)
  return `You are the ${name} agent in a verification pipeline.`
}

// Model assignments per spec in multiagent-verification.md
const MODELS = {
  haiku: 'claude-3-5-haiku-20241022',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-5-20251101',
}

// Agent definitions with model assignments from spec
const AGENTS = [
  // Phase 0 - Pre-pass
  {
    name: 'enum-repair',
    model: MODELS.sonnet,
    description: 'Repairs invalid or over-limit enum values. Needs contextual reasoning.',
    promptFile: null, // Uses inline prompt (logic is in lib/enum-mappings.js)
    system: `You repair enum field values that are invalid or exceed limits.

Given a field with an invalid value, map it to the nearest valid enum entry.
Given a field with too many values (e.g., 5 threat_models when max is 3), rank by evidence strength and keep top N.

High-confidence remaps (e.g., "Targeted regulation" → "Targeted") can be auto-applied.
Ambiguous remaps should be flagged for human review.

For org belief fields: if only employee statements support the value (not org's own position), downgrade to "Mixed/unclear".`,
  },

  // Phase 1 - Decompose and route
  {
    name: 'decomposer',
    model: MODELS.sonnet,
    description: 'Decomposes records into atomic claims, tags verification_type, assigns routing',
    promptFile: 'decomposer',
  },

  // Phase 2 - Search, fetch, and attribution
  {
    name: 'url-validator',
    model: MODELS.haiku, // Simple HTTP checks
    description: 'Validates URLs via HTTP fetch and content relevance check',
    promptFile: 'url-validator',
  },
  {
    name: 'search-attribution',
    model: MODELS.sonnet, // Needs Exa search + structured extraction
    description: 'Independent search agent - builds attribution chains. Never sees candidate URLs.',
    promptFile: 'search-attribution',
  },

  // Phase 3 - Adversarial debate
  {
    name: 'prosecutor',
    model: MODELS.sonnet, // Adversarial reasoning
    description: 'Challenges weak evidence and finds flaws in claims',
    promptFile: 'prosecutor',
  },
  {
    name: 'defender',
    model: MODELS.sonnet, // Symmetric with prosecutor
    description: 'Finds corroborating evidence and validates claims',
    promptFile: 'defender',
  },
  {
    name: 'judge',
    model: MODELS.opus, // Only Opus call - final adjudication
    description: 'Final arbiter - sees ONLY debate transcript, not original record',
    promptFile: 'judge',
  },

  // Phase 4 - Correction and notes regeneration
  {
    name: 'correction-proposal',
    model: MODELS.sonnet, // Applies action rules based on verdicts
    description: 'Proposes corrections based on verdicts. Applies first-person evidence rules.',
    promptFile: 'correction-proposal',
  },
  {
    name: 'notes-regen',
    model: MODELS.sonnet, // Rewrites notes from verified claims
    description: 'Regenerates notes_html from verified claims only',
    promptFile: 'notes-regen',
  },

  // Phase 5 - Triage and write-back
  {
    name: 'triage-router',
    model: MODELS.haiku, // Mechanical aggregation
    description: 'Aggregates results and routes to final destinations',
    promptFile: 'triage-router',
  },
  {
    name: 'write-back',
    model: MODELS.haiku, // Simple DB writes
    description: 'Writes verification results to staging database',
    promptFile: 'write-back',
  },
]

async function createAgents() {
  console.log('Creating verification pipeline agents...')
  console.log(`Using API key: ${ANTHROPIC_API_KEY.slice(0, 12)}...`)
  console.log('')

  const agentIds = {}
  const errors = []

  for (const agentDef of AGENTS) {
    const system = agentDef.promptFile ? readPrompt(agentDef.promptFile) : agentDef.system

    console.log(
      `Creating ${agentDef.name} (${agentDef.model.includes('haiku') ? 'Haiku' : agentDef.model.includes('opus') ? 'Opus' : 'Sonnet'})...`,
    )

    try {
      const agent = await client.beta.agents.create({
        name: `verification-${agentDef.name}`,
        model: agentDef.model,
        system: system,
        tools: [{ type: 'agent_toolset_20260401' }],
      })

      agentIds[agentDef.name] = agent.id
      console.log(`  ✓ ${agentDef.name}: ${agent.id}`)
    } catch (error) {
      console.error(`  ✗ ${agentDef.name}: ${error.message}`)
      errors.push({ agent: agentDef.name, error: error.message })
    }
  }

  // Create coordinator with all agents in roster
  console.log('\nCreating coordinator (Opus)...')

  try {
    const coordinator = await client.beta.agents.create({
      name: 'verification-coordinator',
      model: MODELS.opus,
      system: readPrompt('coordinator'),
      tools: [{ type: 'agent_toolset_20260401' }],
      multiagent: {
        type: 'coordinator',
        agents: Object.values(agentIds).map((id) => ({ type: 'agent', id })),
      },
    })

    agentIds.coordinator = coordinator.id
    console.log(`  ✓ coordinator: ${coordinator.id}`)
  } catch (error) {
    console.error(`  ✗ coordinator: ${error.message}`)
    errors.push({ agent: 'coordinator', error: error.message })
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('SETUP SUMMARY')
  console.log('='.repeat(60))
  console.log(`\nAgents created: ${Object.keys(agentIds).length}/${AGENTS.length + 1}`)

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`)
    for (const e of errors) {
      console.log(`  - ${e.agent}: ${e.error}`)
    }
  }

  // Model breakdown
  console.log('\nModel breakdown:')
  const modelCounts = {
    Haiku: AGENTS.filter((a) => a.model === MODELS.haiku).length,
    Sonnet: AGENTS.filter((a) => a.model === MODELS.sonnet).length,
    Opus: AGENTS.filter((a) => a.model === MODELS.opus).length + 1, // +1 for coordinator
  }
  console.log(`  Haiku: ${modelCounts.Haiku} agents (url-validator, triage-router, write-back)`)
  console.log(`  Sonnet: ${modelCounts.Sonnet} agents (search, debate, correction)`)
  console.log(`  Opus: ${modelCounts.Opus} agents (judge, coordinator)`)

  // Save agent IDs to file
  const outputPath = path.join(__dirname, 'agent-ids.json')
  fs.writeFileSync(outputPath, JSON.stringify(agentIds, null, 2))
  console.log(`\nAgent IDs saved to ${outputPath}`)

  return agentIds
}

// Run if called directly
createAgents().catch(console.error)
