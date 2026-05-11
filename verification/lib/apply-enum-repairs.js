/**
 * Apply Enum Repairs to Staging Database
 *
 * Previews and applies enum repairs. Run with --dry-run first.
 */

import pg from 'pg'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { repairFundingModel, repairThreatModels } from './enum-mappings.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../.env') })

const DRY_RUN = process.argv.includes('--dry-run')
const APPLY = process.argv.includes('--apply')

if (!DRY_RUN && !APPLY) {
  console.log('Usage: node apply-enum-repairs.js [--dry-run | --apply]')
  console.log('  --dry-run  Preview changes without applying')
  console.log('  --apply    Apply changes to staging database')
  process.exit(1)
}

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.STAGING_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  const client = await pool.connect()

  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== APPLYING REPAIRS ===')
  console.log('Database: STAGING\n')

  const stats = {
    fundingModel: { unchanged: 0, mapped: 0, humanReview: 0 },
    threatModels: { unchanged: 0, mapped: 0, trimmed: 0, humanReview: 0 },
    updates: [],
    humanReviewQueue: [],
  }

  try {
    // Get all entities with funding_model or belief_threat_models
    const entities = await client.query(`
      SELECT id, name, entity_type, funding_model, belief_threat_models
      FROM entity
      WHERE status = 'approved'
        AND (funding_model IS NOT NULL OR belief_threat_models IS NOT NULL)
    `)

    console.log(`Processing ${entities.rows.length} entities...\n`)

    for (const entity of entities.rows) {
      const updates = {}

      // Repair funding_model
      if (entity.funding_model) {
        const result = repairFundingModel(entity.funding_model)
        stats.fundingModel[result.action]++

        if (result.action === 'mapped') {
          updates.funding_model = result.value
        } else if (result.action === 'human_review') {
          stats.humanReviewQueue.push({
            entity_id: entity.id,
            name: entity.name,
            field: 'funding_model',
            value: entity.funding_model,
            reason: result.reason,
          })
        }
      }

      // Repair belief_threat_models
      if (entity.belief_threat_models) {
        const result = repairThreatModels(entity.belief_threat_models)
        stats.threatModels[result.action]++

        if (result.action === 'mapped' || result.action === 'trimmed') {
          updates.belief_threat_models = result.value
          if (result.dropped?.length > 0) {
            stats.humanReviewQueue.push({
              entity_id: entity.id,
              name: entity.name,
              field: 'belief_threat_models',
              action: 'dropped',
              dropped: result.dropped,
            })
          }
        } else if (result.action === 'human_review') {
          stats.humanReviewQueue.push({
            entity_id: entity.id,
            name: entity.name,
            field: 'belief_threat_models',
            value: entity.belief_threat_models,
            humanReview: result.humanReview,
            reason: result.reason,
          })
        }
      }

      // Record updates
      if (Object.keys(updates).length > 0) {
        stats.updates.push({
          entity_id: entity.id,
          name: entity.name,
          updates,
        })
      }
    }

    // Summary
    console.log('='.repeat(60))
    console.log('SUMMARY')
    console.log('='.repeat(60))

    console.log('\nfunding_model:')
    console.log(`  Unchanged: ${stats.fundingModel.unchanged}`)
    console.log(`  Mapped: ${stats.fundingModel.mapped}`)
    console.log(`  Human review: ${stats.fundingModel.humanReview}`)

    console.log('\nbelief_threat_models:')
    console.log(`  Unchanged: ${stats.threatModels.unchanged}`)
    console.log(`  Mapped: ${stats.threatModels.mapped}`)
    console.log(`  Trimmed: ${stats.threatModels.trimmed}`)
    console.log(`  Human review: ${stats.threatModels.humanReview}`)

    console.log(`\nTotal updates: ${stats.updates.length}`)
    console.log(`Human review queue: ${stats.humanReviewQueue.length}`)

    // Show sample updates
    if (stats.updates.length > 0) {
      console.log('\n--- Sample Updates (first 10) ---')
      for (const u of stats.updates.slice(0, 10)) {
        console.log(`  ${u.name}:`)
        for (const [field, value] of Object.entries(u.updates)) {
          console.log(`    ${field} → ${value}`)
        }
      }
      if (stats.updates.length > 10) {
        console.log(`  ... and ${stats.updates.length - 10} more`)
      }
    }

    // Show human review queue sample
    if (stats.humanReviewQueue.length > 0) {
      console.log('\n--- Human Review Queue (first 10) ---')
      for (const item of stats.humanReviewQueue.slice(0, 10)) {
        console.log(`  ${item.name} (${item.field}):`)
        if (item.dropped) {
          console.log(`    Dropped: ${item.dropped.join(', ')}`)
        } else {
          console.log(`    Value: ${item.value?.substring(0, 80)}...`)
          console.log(`    Reason: ${item.reason}`)
        }
      }
    }

    // Apply updates if not dry run
    if (APPLY && stats.updates.length > 0) {
      console.log('\n--- Applying Updates ---')

      let applied = 0
      for (const u of stats.updates) {
        const setClauses = []
        const values = []
        let paramIndex = 1

        for (const [field, value] of Object.entries(u.updates)) {
          setClauses.push(`${field} = $${paramIndex}`)
          values.push(value)
          paramIndex++
        }
        values.push(u.entity_id)

        await client.query(`UPDATE entity SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`, values)
        applied++

        if (applied % 100 === 0) {
          console.log(`  Applied ${applied}/${stats.updates.length}...`)
        }
      }

      console.log(`\n✓ Applied ${applied} updates to staging database`)
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(console.error)
