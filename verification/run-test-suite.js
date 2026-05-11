#!/usr/bin/env node

/**
 * Test Suite Runner — runs verification pipelines against known-answer entities
 * and scores accuracy.
 *
 * Usage:
 *   node verification/run-test-suite.js --pipeline=1-opus
 *   node verification/run-test-suite.js --pipeline=3-agent
 *   node verification/run-test-suite.js --pipeline=1-opus --id=356
 *   node verification/run-test-suite.js --pipeline=1-opus --dry-run   # show test plan only
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import pg from 'pg'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const args = process.argv.slice(2)
const pipelineArg = args.find((a) => a.startsWith('--pipeline='))
const pipeline = pipelineArg ? pipelineArg.split('=')[1] : '1-opus'
const singleId = args.find((a) => a.startsWith('--id='))?.split('=')[1]
const dryRun = args.includes('--dry-run')

const PIPELINE_SCRIPTS = {
  '1-opus': 'verification/beliefs-1-opus/run.js',
  '3-agent': 'verification/beliefs-3/run.js',
  courthouse: 'verification/run-belief-verification.js',
}

const script = PIPELINE_SCRIPTS[pipeline]
if (!script) {
  console.error(`Unknown pipeline: ${pipeline}. Use: ${Object.keys(PIPELINE_SCRIPTS).join(', ')}`)
  process.exit(1)
}

// Load test suite
const testSuite = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-suite.json'), 'utf-8'))
const testData = JSON.parse(fs.readFileSync(path.join(__dirname, 'beliefs-3/test-suite-data.json'), 'utf-8'))

// Filter test cases to ones with entity_id and expected_action
const entityTests = testSuite.test_cases.filter(
  (tc) => tc.entity_id && tc.expected_action && tc.field?.startsWith('belief_'),
)
const testEntityIds = [...new Set(entityTests.map((tc) => tc.entity_id))]

if (singleId) {
  const id = parseInt(singleId)
  if (!testEntityIds.includes(id)) {
    console.error(`Entity ${id} not in test suite. Available: ${testEntityIds.join(', ')}`)
    process.exit(1)
  }
}

const entitiesToTest = singleId ? [parseInt(singleId)] : testEntityIds

console.log('Verification Test Suite Runner')
console.log('='.repeat(50))
console.log(`Pipeline: ${pipeline} (${script})`)
console.log(`Entities to test: ${entitiesToTest.length}`)
console.log(`Test cases: ${entityTests.filter((tc) => entitiesToTest.includes(tc.entity_id)).length}`)
console.log('')

if (dryRun) {
  console.log('TEST PLAN (dry run):\n')
  for (const eid of entitiesToTest) {
    const name = testData[eid]?.entity?.name || `Entity ${eid}`
    const cases = entityTests.filter((tc) => tc.entity_id === eid)
    console.log(`  ${name} (id=${eid}):`)
    for (const tc of cases) {
      console.log(`    ${tc.id}: ${tc.field} → expect ${tc.expected_action}`)
    }
  }
  process.exit(0)
}

// Connect to staging DB to read corrections after pipeline runs
const pool = new pg.Pool({
  connectionString: process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const results = {
  pipeline,
  started_at: new Date().toISOString(),
  entities: [],
  totals: { pass: 0, fail: 0, skip: 0, total: 0 },
  costs: { total_usd: 0 },
  timing: { total_ms: 0 },
}

for (const eid of entitiesToTest) {
  const name = testData[eid]?.entity?.name || `Entity ${eid}`
  console.log(`\n${'═'.repeat(50)}`)
  console.log(`Testing: ${name} (id=${eid})`)
  console.log('═'.repeat(50))

  const entityStart = Date.now()

  // Run the pipeline
  try {
    const cmd = `node ${script} --id=${eid} --write-db --allow-production`
    console.log(`  Running: ${cmd}`)
    const output = execSync(cmd, {
      cwd: path.join(__dirname, '..'),
      timeout: 300000,
      encoding: 'utf-8',
      env: { ...process.env },
    })

    // Extract cost from output
    const costMatch = output.match(/TOTAL:\s*\$([0-9.]+)/)
    if (costMatch) results.costs.total_usd += parseFloat(costMatch[1])

    // Print pipeline output summary
    const summaryLines = output
      .split('\n')
      .filter((l) => l.includes('Verdict') || l.includes('correct') || l.includes('confirm') || l.includes('remove'))
    for (const line of summaryLines.slice(0, 10)) console.log(`  ${line.trim()}`)
  } catch (err) {
    console.error(`  Pipeline failed: ${err.message.substring(0, 100)}`)
    results.entities.push({ id: eid, name, error: err.message.substring(0, 200) })
    continue
  }

  const entityMs = Date.now() - entityStart
  results.timing.total_ms += entityMs

  // Read most recent corrections per field (any pipeline, since tags may be null)
  const corrections = await pool.query(
    `SELECT DISTINCT ON (field) field, verdict, proposed_value, confidence, pipeline
     FROM belief_correction
     WHERE entity_id = $1
     ORDER BY field, created_at DESC`,
    [eid],
  )

  // Score against test cases
  const cases = entityTests.filter((tc) => tc.entity_id === eid)
  const entityResult = { id: eid, name, time_ms: entityMs, cases: [] }

  for (const tc of cases) {
    const correction = corrections.rows.find((c) => c.field === tc.field)
    let pass = false
    let actual = 'no_result'

    if (correction) {
      actual = correction.verdict
      if (tc.expected_action === 'confirm' && correction.verdict === 'confirm') pass = true
      else if (tc.expected_action === 'remove' && correction.verdict === 'remove') pass = true
      else if (tc.expected_action === 'correct' && correction.verdict === 'correct') pass = true
      else if (tc.expected_action === 'flag_for_human' && correction.verdict !== 'confirm') pass = true
      else if (tc.expected_action === 'confirm_entity_null_and_supersede_claims') pass = correction.verdict === 'remove'
    }

    const icon = pass ? '✓' : '✗'
    console.log(
      `  ${icon} ${tc.id} ${tc.field}: expected=${tc.expected_action} got=${actual} ${pass ? 'PASS' : 'FAIL'}`,
    )

    entityResult.cases.push({
      test_id: tc.id,
      field: tc.field,
      expected: tc.expected_action,
      actual,
      pass,
      confidence: correction?.confidence,
    })

    results.totals.total++
    if (pass) results.totals.pass++
    else results.totals.fail++
  }

  results.entities.push(entityResult)
}

// Summary
console.log('\n' + '═'.repeat(50))
console.log('TEST SUITE RESULTS')
console.log('═'.repeat(50))
console.log(`Pipeline: ${pipeline}`)
console.log(`Entities tested: ${results.entities.length}`)
console.log(`Total cases: ${results.totals.total}`)
console.log(`  Pass: ${results.totals.pass}`)
console.log(`  Fail: ${results.totals.fail}`)
console.log(`  Skip: ${results.totals.skip}`)

const precision = results.totals.total > 0 ? ((results.totals.pass / results.totals.total) * 100).toFixed(1) : 0
console.log(`\nAccuracy: ${precision}%`)
console.log(`Cost: $${results.costs.total_usd.toFixed(2)}`)
console.log(`Time: ${(results.timing.total_ms / 1000).toFixed(1)}s`)

// Pass criteria
const passRate = results.totals.total > 0 ? results.totals.pass / results.totals.total : 0
console.log(`\nPass criteria: precision >= 0.80`)
console.log(`Result: ${passRate >= 0.8 ? 'PASS' : 'FAIL'} (${(passRate * 100).toFixed(1)}%)`)

// Save results
const outPath = path.join(
  __dirname,
  `results/test-suite-${pipeline}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
)
const outDir = path.dirname(outPath)
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
results.ended_at = new Date().toISOString()
fs.writeFileSync(outPath, JSON.stringify(results, null, 2) + '\n')
console.log(`\nResults saved: ${outPath}`)

await pool.end()
