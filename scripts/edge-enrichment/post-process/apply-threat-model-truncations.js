#!/usr/bin/env node
/**
 * Apply Threat Model Truncations from Claude.ai Review
 *
 * 48 entities had >3 threat_models values. Claude.ai selected the best 3 for each.
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/apply-threat-model-truncations.js --dry-run
 *   node scripts/edge-enrichment/post-process/apply-threat-model-truncations.js --apply
 */
import 'dotenv/config'
import pg from 'pg'

const rds = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const apply = args.includes('--apply')

if (!dryRun && !apply) {
  console.log('Usage: node apply-threat-model-truncations.js [--dry-run | --apply]')
  process.exit(0)
}

// Claude.ai selections - keep only these 3 threat models for each entity
const TRUNCATIONS = [
  { id: 2300, keep: ["Loss of control", "National security", "Cybersecurity"] },
  { id: 2040, keep: ["Bias/discrimination", "Labor displacement", "Power concentration"] },
  { id: 2263, keep: ["National security", "Power concentration", "Cybersecurity"] },
  { id: 2066, keep: ["National security", "Weapons", "Cybersecurity"] },
  { id: 2074, keep: ["Misinformation", "Democratic erosion", "Bias/discrimination"] },
  { id: 2079, keep: ["Power concentration", "Misinformation", "National security"] },
  { id: 2093, keep: ["Existential risk", "Loss of control", "Power concentration"] },
  { id: 2097, keep: ["Existential risk", "Loss of control", "Power concentration"] },
  { id: 2091, keep: ["Loss of control", "Existential risk", "Cybersecurity"] },
  { id: 2100, keep: ["Existential risk", "Loss of control", "Weapons"] },
  { id: 2105, keep: ["Existential risk", "Loss of control", "Cybersecurity"] },
  { id: 2122, keep: ["Existential risk", "Loss of control", "Weapons"] },
  { id: 2134, keep: ["Power concentration", "Bias/discrimination", "Economic inequality"] },
  { id: 2138, keep: ["Bias/discrimination", "Power concentration", "Democratic erosion"] },
  { id: 2148, keep: ["Bias/discrimination", "Economic inequality", "Power concentration"] },
  { id: 2149, keep: ["Bias/discrimination", "Labor displacement", "National security"] },
  { id: 2152, keep: ["Bias/discrimination", "Economic inequality", "Democratic erosion"] },
  { id: 2162, keep: ["Bias/discrimination", "Power concentration", "Democratic erosion"] },
  { id: 2166, keep: ["Democratic erosion", "Power concentration", "Economic inequality"] },
  { id: 2167, keep: ["Existential risk", "Power concentration", "National security"] },
  { id: 2173, keep: ["Bias/discrimination", "National security", "Cybersecurity"] },
  { id: 2176, keep: ["Power concentration", "Democratic erosion", "Economic inequality"] },
  { id: 2178, keep: ["Bias/discrimination", "Power concentration", "Democratic erosion"] },
  { id: 2181, keep: ["Labor displacement", "Economic inequality", "Power concentration"] },
  { id: 2186, keep: ["Bias/discrimination", "Economic inequality", "National security"] },
  { id: 2188, keep: ["Power concentration", "Bias/discrimination", "Democratic erosion"] },
  { id: 2193, keep: ["Existential risk", "Loss of control", "Weapons"] },
  { id: 2200, keep: ["Existential risk", "Loss of control", "Power concentration"] },
  { id: 2201, keep: ["National security", "Cybersecurity", "Weapons"] },
  { id: 2202, keep: ["Bias/discrimination", "Power concentration", "Economic inequality"] },
  { id: 2219, keep: ["Bias/discrimination", "Misinformation", "Democratic erosion"] },
  { id: 2123, keep: ["Economic inequality", "Labor displacement", "Cybersecurity"] },
  { id: 2227, keep: ["Loss of control", "Existential risk", "Cybersecurity"] },
  { id: 2240, keep: ["Existential risk", "Loss of control", "Bias/discrimination"] },
  { id: 2241, keep: ["Bias/discrimination", "Power concentration", "Democratic erosion"] },
  { id: 2247, keep: ["Labor displacement", "Economic inequality", "Bias/discrimination"] },
  { id: 2262, keep: ["Bias/discrimination", "Misinformation", "Democratic erosion"] },
  { id: 2268, keep: ["Misinformation", "Democratic erosion", "Power concentration"] },
  { id: 2272, keep: ["Misinformation", "Bias/discrimination", "Democratic erosion"] },
  { id: 2274, keep: ["Power concentration", "Existential risk", "National security"] },
  { id: 2286, keep: ["Loss of control", "Existential risk", "National security"] },
  { id: 2086, keep: ["Power concentration", "Bias/discrimination", "Economic inequality"] },
  { id: 2120, keep: ["Cybersecurity", "National security", "Bias/discrimination"] },
  { id: 2221, keep: ["Bias/discrimination", "Economic inequality", "Power concentration"] },
  { id: 2305, keep: ["Bias/discrimination", "Cybersecurity", "National security"] },
  { id: 2310, keep: ["National security", "Cybersecurity", "Misinformation"] },
  { id: 2315, keep: ["Existential risk", "Loss of control", "Power concentration"] },
  { id: 2316, keep: ["Existential risk", "Loss of control", "Power concentration"] }
]

async function main() {
  console.log('='.repeat(60))
  console.log('THREAT MODEL TRUNCATIONS FROM CLAUDE.AI REVIEW')
  console.log('='.repeat(60))
  console.log(dryRun ? '[DRY RUN MODE]' : '[APPLY MODE]')
  console.log(`Processing ${TRUNCATIONS.length} entities\n`)

  let updated = 0
  let skipped = 0

  for (const t of TRUNCATIONS) {
    const entity = await rds.query(
      'SELECT id, name, belief_threat_models FROM entity WHERE id = $1',
      [t.id]
    )

    if (entity.rows.length === 0) {
      console.log(`⚠ #${t.id} not found - skipping`)
      skipped++
      continue
    }

    const row = entity.rows[0]
    const current = row.belief_threat_models || ''
    const currentList = current.split(',').map(s => s.trim()).filter(Boolean)
    const newValue = t.keep.join(', ')

    // Check if already truncated
    if (currentList.length <= 3) {
      console.log(`✓ #${t.id} ${row.name} - already ≤3 values`)
      skipped++
      continue
    }

    console.log(`#${t.id} ${row.name}`)
    console.log(`  Current (${currentList.length}): ${current}`)
    console.log(`  New (3): ${newValue}`)

    if (!dryRun) {
      await rds.query(
        'UPDATE entity SET belief_threat_models = $1 WHERE id = $2',
        [newValue, t.id]
      )
      updated++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)

  if (dryRun) {
    console.log('\n[DRY RUN] No changes applied. Run with --apply to execute.')
  }

  await rds.end()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
