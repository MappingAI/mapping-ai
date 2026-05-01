#!/usr/bin/env node
/**
 * Run claims enrichment on all combined-v4 entities
 *
 * This is a wrapper that calls enrich-claims.js for each entity
 * to add source attribution for belief dimensions.
 *
 * Usage:
 *   node scripts/edge-enrichment/run-claims-enrichment-combined-v4.js --dry-run --limit=5
 *   node scripts/edge-enrichment/run-claims-enrichment-combined-v4.js --limit=50
 *   node scripts/edge-enrichment/run-claims-enrichment-combined-v4.js --all
 */
import 'dotenv/config'
import pg from 'pg'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const rds = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null
const allMode = args.includes('--all')

if (!limit && !allMode) {
  console.log('Usage: node run-claims-enrichment-combined-v4.js [--limit=N | --all] [--dry-run]')
  process.exit(0)
}

async function runClaimsEnrichment(entityId, dryRun) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../scripts/enrich-claims.js')
    const args = [`--id=${entityId}`]
    if (dryRun) args.push('--dry-run')

    const child = spawn('node', [scriptPath, ...args], {
      cwd: path.join(__dirname, '../..'),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => { stdout += data.toString() })
    child.stderr.on('data', (data) => { stderr += data.toString() })

    child.on('close', (code) => {
      // Extract cost from output
      const costMatch = stdout.match(/Total: \$([0-9.]+)/)
      const cost = costMatch ? parseFloat(costMatch[1]) : 0

      // Extract claims count
      const claimsMatch = stdout.match(/Claude: (\d+) claims extracted/)
      const claims = claimsMatch ? parseInt(claimsMatch[1]) : 0

      resolve({ code, cost, claims, stdout, stderr })
    })

    child.on('error', reject)
  })
}

async function main() {
  console.log('='.repeat(60))
  console.log('CLAIMS ENRICHMENT FOR COMBINED-V4 ENTITIES')
  console.log('='.repeat(60))
  if (dryRun) console.log('[DRY RUN MODE]')
  console.log()

  // Get combined-v4 entity IDs
  const res = await rds.query(`
    SELECT id, name, entity_type
    FROM entity
    WHERE enrichment_version = 'combined-v4' AND status = 'approved'
    ORDER BY id
  `)

  let entities = res.rows
  if (limit) entities = entities.slice(0, limit)

  console.log(`Processing ${entities.length} of ${res.rows.length} entities`)
  console.log(`Estimated cost: ~$${(entities.length * 0.12).toFixed(2)}`)
  console.log()

  let totalCost = 0
  let totalClaims = 0
  let processed = 0
  let errors = 0

  for (const entity of entities) {
    processed++
    process.stdout.write(`[${processed}/${entities.length}] ${entity.name} (${entity.entity_type})... `)

    try {
      const result = await runClaimsEnrichment(entity.id, dryRun)
      totalCost += result.cost
      totalClaims += result.claims

      if (result.code === 0) {
        console.log(`✓ ${result.claims} claims, $${result.cost.toFixed(3)}`)
      } else {
        console.log(`✗ exit code ${result.code}`)
        errors++
      }
    } catch (err) {
      console.log(`✗ ${err.message}`)
      errors++
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 500))
  }

  console.log()
  console.log('='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Processed: ${processed}`)
  console.log(`Errors: ${errors}`)
  console.log(`Total claims: ${totalClaims}`)
  console.log(`Total cost: $${totalCost.toFixed(2)}`)

  await rds.end()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
