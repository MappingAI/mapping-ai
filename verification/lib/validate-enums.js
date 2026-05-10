/**
 * Phase 0: Enum Validator (No LLM)
 *
 * Validates all SELECT_1, SELECT_MULTIPLE, and SELECT_UP_TO_3 fields
 * against their allowed values. Flags invalid and over-limit entries.
 */

import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Schema definitions from full-schema-reference.md
const SCHEMA = {
  // Person category
  person_category: {
    constraint: 'SELECT_1',
    values: [
      'Executive', 'Researcher', 'Policymaker', 'Investor',
      'Organizer', 'Journalist', 'Academic', 'Cultural figure'
    ]
  },

  // Org category
  org_category: {
    constraint: 'SELECT_1',
    values: [
      'Frontier Lab', 'AI Safety/Alignment', 'Think Tank/Policy Org',
      'Government/Agency', 'Academic', 'VC/Capital/Philanthropy',
      'Labor/Civil Society', 'Ethics/Bias/Rights', 'Media/Journalism',
      'Political Campaign/PAC', 'AI Infrastructure & Compute', 'Deployers & Platforms'
    ]
  },

  // Resource type
  resource_type: {
    constraint: 'SELECT_1',
    values: [
      'Essay', 'Book', 'Report', 'Podcast', 'Video',
      'Website', 'Academic Paper', 'News Article', 'Substack/Newsletter'
    ]
  },

  // Regulatory stance (all entity types)
  belief_regulatory_stance: {
    constraint: 'SELECT_1',
    values: [
      'Accelerate', 'Light-touch', 'Targeted', 'Moderate',
      'Precautionary', 'Restrictive', 'Nationalize', 'Mixed/unclear', 'Other'
    ]
  },

  // Evidence source
  belief_evidence_source: {
    constraint: 'SELECT_1',
    values: ['Explicitly stated', 'Inferred', 'Unknown']
  },

  // AGI timeline
  belief_agi_timeline: {
    constraint: 'SELECT_1',
    values: [
      'Already here', '2-3 years', '5-10 years', '10-25 years',
      '25+ years or never', 'Ill-defined', 'Unknown', 'Mixed/unclear'
    ]
  },

  // AI risk level
  belief_ai_risk: {
    constraint: 'SELECT_1',
    values: [
      'Overstated', 'Manageable', 'Serious', 'Catastrophic',
      'Existential', 'Mixed/nuanced', 'Unknown'
    ]
  },

  // Threat models (max 3)
  belief_threat_models: {
    constraint: 'SELECT_UP_TO_3',
    maxCount: 3,
    values: [
      'Labor displacement', 'Economic inequality', 'Power concentration',
      'Democratic erosion', 'Cybersecurity', 'Misinformation',
      'Environmental', 'Weapons', 'Loss of control', 'Copyright/IP', 'Existential risk'
    ]
  },

  // Funding model
  funding_model: {
    constraint: 'SELECT_MULTIPLE',
    values: [
      'Venture-backed', 'Revenue-generating', 'Government-funded',
      'Philanthropic', 'Membership', 'Mixed', 'Public benefit', 'Self-funded', 'Other'
    ]
  },

  // Influence type
  influence_type: {
    constraint: 'SELECT_MULTIPLE',
    values: [
      'Decision-maker', 'Researcher/analyst', 'Builder', 'Narrator',
      'Connector/convener', 'Advisor/strategist', 'Funder/investor',
      'Organizer/advocate', 'Implementer'
    ]
  }
};

// Parse comma-separated field values
function parseMultiValue(value) {
  if (!value) return [];
  return value.split(',').map(v => v.trim()).filter(v => v);
}

// Validate a single field
function validateField(fieldName, value, entityType) {
  const schema = SCHEMA[fieldName];
  if (!schema) return null; // Field not in schema

  const issues = [];

  if (schema.constraint === 'SELECT_1') {
    if (value && !schema.values.includes(value)) {
      issues.push({
        type: 'invalid_value',
        field: fieldName,
        value,
        allowed: schema.values
      });
    }
  } else if (schema.constraint === 'SELECT_MULTIPLE' || schema.constraint === 'SELECT_UP_TO_3') {
    const values = parseMultiValue(value);

    // Check each value
    for (const v of values) {
      if (!schema.values.includes(v)) {
        issues.push({
          type: 'invalid_value',
          field: fieldName,
          value: v,
          allowed: schema.values
        });
      }
    }

    // Check count limit
    if (schema.maxCount && values.length > schema.maxCount) {
      issues.push({
        type: 'over_limit',
        field: fieldName,
        count: values.length,
        maxCount: schema.maxCount,
        values
      });
    }
  }

  return issues.length > 0 ? issues : null;
}

// Validate all entities
async function validateAllEntities() {
  const pool = new pg.Pool({
    connectionString: process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Using:', process.env.STAGING_DATABASE_URL ? 'STAGING' : 'PRODUCTION');
  const client = await pool.connect();

  console.log('Phase 0: Enum Validation\n');
  console.log('Checking all approved entities against schema...\n');

  const results = {
    checked: 0,
    clean: 0,
    issues: [],
  };

  try {
    const entities = await client.query(`
      SELECT id, name, entity_type, category,
             belief_regulatory_stance, belief_evidence_source,
             belief_agi_timeline, belief_ai_risk, belief_threat_models,
             funding_model, influence_type
      FROM entity
      WHERE status = 'approved'
    `);

    for (const entity of entities.rows) {
      results.checked++;
      const entityIssues = [];

      // Check category based on entity type
      if (entity.entity_type === 'person') {
        const issues = validateField('person_category', entity.category, 'person');
        if (issues) entityIssues.push(...issues);
      } else if (entity.entity_type === 'organization') {
        const issues = validateField('org_category', entity.category, 'organization');
        if (issues) entityIssues.push(...issues);
      } else if (entity.entity_type === 'resource') {
        const issues = validateField('resource_type', entity.category, 'resource');
        if (issues) entityIssues.push(...issues);
      }

      // Check all belief fields
      for (const field of ['belief_regulatory_stance', 'belief_evidence_source',
                           'belief_agi_timeline', 'belief_ai_risk', 'belief_threat_models']) {
        const issues = validateField(field, entity[field], entity.entity_type);
        if (issues) entityIssues.push(...issues);
      }

      // Check funding model (orgs only typically)
      const fundingIssues = validateField('funding_model', entity.funding_model, entity.entity_type);
      if (fundingIssues) entityIssues.push(...fundingIssues);

      // Check influence type (people only typically)
      const influenceIssues = validateField('influence_type', entity.influence_type, entity.entity_type);
      if (influenceIssues) entityIssues.push(...influenceIssues);

      if (entityIssues.length > 0) {
        results.issues.push({
          entity_id: entity.id,
          name: entity.name,
          entity_type: entity.entity_type,
          issues: entityIssues
        });
      } else {
        results.clean++;
      }
    }

    // Summary
    console.log('='.repeat(60));
    console.log('ENUM VALIDATION RESULTS');
    console.log('='.repeat(60));
    console.log(`\nEntities checked: ${results.checked}`);
    console.log(`Clean: ${results.clean}`);
    console.log(`With issues: ${results.issues.length}`);

    if (results.issues.length > 0) {
      console.log('\n--- ISSUES ---\n');

      // Group by issue type
      const invalidValues = results.issues.filter(e =>
        e.issues.some(i => i.type === 'invalid_value'));
      const overLimit = results.issues.filter(e =>
        e.issues.some(i => i.type === 'over_limit'));

      if (invalidValues.length > 0) {
        console.log(`Invalid values: ${invalidValues.length} entities`);
        for (const e of invalidValues.slice(0, 10)) {
          const invalid = e.issues.filter(i => i.type === 'invalid_value');
          console.log(`  - ${e.name} (${e.entity_type}): ${invalid.map(i => `${i.field}="${i.value}"`).join(', ')}`);
        }
        if (invalidValues.length > 10) {
          console.log(`  ... and ${invalidValues.length - 10} more`);
        }
      }

      if (overLimit.length > 0) {
        console.log(`\nOver-limit values: ${overLimit.length} entities`);
        for (const e of overLimit.slice(0, 10)) {
          const over = e.issues.filter(i => i.type === 'over_limit');
          console.log(`  - ${e.name}: ${over.map(i => `${i.field} has ${i.count}/${i.maxCount}`).join(', ')}`);
        }
        if (overLimit.length > 10) {
          console.log(`  ... and ${overLimit.length - 10} more`);
        }
      }
    }

    return results;

  } finally {
    client.release();
    await pool.end();
  }
}

validateAllEntities().catch(console.error);
