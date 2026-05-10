/**
 * Test the verification pipeline with a sample of entities
 *
 * Selects diverse test cases and runs them through the multi-agent pipeline.
 */

import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Use dedicated verification API key
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_MULTIAGENT_VERIFICATION_KEY || process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('ERROR: No Anthropic API key found.');
  console.error('Set ANTHROPIC_MULTIAGENT_VERIFICATION_KEY in .env for billing isolation.');
  process.exit(1);
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Load agent IDs
function loadAgentIds() {
  const idsPath = path.join(__dirname, 'agent-ids.json');
  if (!fs.existsSync(idsPath)) {
    throw new Error('agent-ids.json not found. Run setup-agents.js first.');
  }
  return JSON.parse(fs.readFileSync(idsPath, 'utf-8'));
}

// Get sample entities for testing
async function getSampleEntities(dbClient, count = 5) {
  console.log(`Selecting ${count} diverse test entities...\n`);

  const samples = [];

  // 1. Entity with belief_evidence_source = 'Explicitly stated' (highest risk)
  const explicit = await dbClient.query(`
    SELECT id, name, entity_type, belief_evidence_source, belief_regulatory_stance
    FROM entity
    WHERE status = 'approved'
      AND belief_evidence_source = 'Explicitly stated'
      AND belief_regulatory_stance IS NOT NULL
    ORDER BY random()
    LIMIT 1
  `);
  if (explicit.rows[0]) {
    samples.push({ ...explicit.rows[0], reason: 'Explicitly stated belief' });
  }

  // 2. Entity with crowdsourced submission
  const crowdsourced = await dbClient.query(`
    SELECT e.id, e.name, e.entity_type, s.submitter_relationship
    FROM entity e
    JOIN submission s ON s.entity_id = e.id
    WHERE e.status = 'approved'
      AND s.submitter_relationship = 'external'
    ORDER BY random()
    LIMIT 1
  `);
  if (crowdsourced.rows[0]) {
    samples.push({ ...crowdsourced.rows[0], reason: 'Crowdsourced submission' });
  }

  // 3. Entity with notes_html containing multiple claims
  const notes = await dbClient.query(`
    SELECT id, name, entity_type, length(notes_html) as notes_length
    FROM entity
    WHERE status = 'approved'
      AND notes_html IS NOT NULL
      AND length(notes_html) > 500
    ORDER BY random()
    LIMIT 1
  `);
  if (notes.rows[0]) {
    samples.push({ ...notes.rows[0], reason: 'Long notes_html' });
  }

  // 4. Organization with regulatory stance (org beliefs are higher risk)
  const org = await dbClient.query(`
    SELECT id, name, entity_type, belief_regulatory_stance
    FROM entity
    WHERE status = 'approved'
      AND entity_type = 'organization'
      AND belief_regulatory_stance IS NOT NULL
      AND belief_regulatory_stance != 'Mixed/unclear'
    ORDER BY random()
    LIMIT 1
  `);
  if (org.rows[0]) {
    samples.push({ ...org.rows[0], reason: 'Org with regulatory stance' });
  }

  // 5. Person with multiple belief fields set
  const multibelief = await dbClient.query(`
    SELECT id, name, entity_type,
           belief_regulatory_stance, belief_agi_timeline, belief_ai_risk
    FROM entity
    WHERE status = 'approved'
      AND entity_type = 'person'
      AND belief_regulatory_stance IS NOT NULL
      AND belief_agi_timeline IS NOT NULL
      AND belief_ai_risk IS NOT NULL
    ORDER BY random()
    LIMIT 1
  `);
  if (multibelief.rows[0]) {
    samples.push({ ...multibelief.rows[0], reason: 'Person with multiple beliefs' });
  }

  return samples;
}

// Get full entity record with edges and claims
async function getFullEntityRecord(dbClient, entityId) {
  const entity = await dbClient.query(
    'SELECT * FROM entity WHERE id = $1',
    [entityId]
  );

  const edges = await dbClient.query(`
    SELECT e.*,
           s.name as source_name, s.entity_type as source_type,
           t.name as target_name, t.entity_type as target_type
    FROM edge e
    JOIN entity s ON e.source_id = s.id
    JOIN entity t ON e.target_id = t.id
    WHERE e.source_id = $1 OR e.target_id = $1
  `, [entityId]);

  const claims = await dbClient.query(
    'SELECT * FROM claim WHERE entity_id = $1',
    [entityId]
  );

  return {
    entity: entity.rows[0],
    edges: edges.rows,
    claims: claims.rows,
  };
}

// Run verification on a single entity
async function verifyEntity(agentIds, record, environmentId) {
  console.log(`\nVerifying: ${record.entity.name} (${record.entity.entity_type})`);
  console.log(`  ID: ${record.entity.id}`);
  console.log(`  Edges: ${record.edges.length}, Claims: ${record.claims.length}`);

  // Create session with coordinator
  const session = await client.beta.sessions.create({
    agent: agentIds.coordinator,
    environment_id: environmentId,
  });

  console.log(`  Session: ${session.id}`);

  // Send the record to the coordinator
  await client.beta.sessions.events.send(session.id, {
    events: [{
      type: 'user.message',
      content: [{
        type: 'text',
        text: `Verify this entity record:\n\n${JSON.stringify(record, null, 2)}`,
      }],
    }],
  });

  // Stream events
  console.log('\n  Pipeline output:');
  console.log('  ' + '─'.repeat(60));

  const stream = await client.beta.sessions.events.stream(session.id);

  for await (const event of stream) {
    if (event.type === 'agent.message') {
      for (const block of event.content) {
        if (block.type === 'text') {
          // Indent and wrap output
          const lines = block.text.split('\n');
          for (const line of lines) {
            console.log(`  │ ${line}`);
          }
        }
      }
    } else if (event.type === 'session.thread_created') {
      console.log(`  │ [Thread created: ${event.agent_name}]`);
    } else if (event.type === 'session.thread_status_idle') {
      if (event.stop_reason?.type === 'end_turn') {
        break;
      }
    }
  }

  console.log('  ' + '─'.repeat(60));

  return session.id;
}

async function main() {
  // Load agent IDs
  const agentIds = loadAgentIds();
  console.log('Loaded agent IDs:', Object.keys(agentIds).join(', '));

  // Connect to staging database (never production for verification)
  const dbUrl = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;
  console.log(`Using database: ${dbUrl ? 'STAGING' : 'PRODUCTION (warning!)'}\n`);

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const dbClient = await pool.connect();

  try {
    // Get sample entities
    const samples = await getSampleEntities(dbClient, 5);

    console.log('Selected test entities:');
    for (const sample of samples) {
      console.log(`  - ${sample.name} (${sample.entity_type}) - ${sample.reason}`);
    }

    // Create environment (or use existing)
    // Note: You may need to create an environment first via the API
    const environmentId = process.env.ANTHROPIC_ENVIRONMENT_ID;
    if (!environmentId) {
      console.error('\nError: ANTHROPIC_ENVIRONMENT_ID not set in .env');
      console.log('Create an environment first, then set the ID.');
      return;
    }

    // Verify each entity
    const results = [];
    for (const sample of samples) {
      const record = await getFullEntityRecord(dbClient, sample.id);
      const sessionId = await verifyEntity(agentIds, record, environmentId);
      results.push({
        entity: sample,
        sessionId,
      });
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`\nProcessed ${results.length} entities.`);
    console.log('Session IDs for detailed review:');
    for (const r of results) {
      console.log(`  - ${r.entity.name}: ${r.sessionId}`);
    }

  } finally {
    dbClient.release();
    await pool.end();
  }
}

main().catch(console.error);
