#!/usr/bin/env node

/**
 * Test Suite Runner — runs verification pipelines against known-answer entities
 * and scores accuracy.
 *
 * Usage:
 *   node verification/run-test-suite.js --pipeline=1-opus
 *   node verification/run-test-suite.js --pipeline=3-agent
 *   node verification/run-test-suite.js --pipeline=1-opus --id=356
 *   node verification/run-test-suite.js --pipeline=1-opus --dry-run
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

const PIPELINE_TAGS = {
  '1-opus': 'opus-1',
  '3-agent': '3-agent',
  courthouse: 'courthouse-8',
}

const script = PIPELINE_SCRIPTS[pipeline]
if (!script) {
  console.error(`Unknown pipeline: ${pipeline}. Use: ${Object.keys(PIPELINE_SCRIPTS).join(', ')}`)
  process.exit(1)
}

// #1 FIX: Require STAGING_DATABASE_URL — never pass --allow-production
if (!process.env.STAGING_DATABASE_URL) {
  console.error('ERROR: STAGING_DATABASE_URL is required for test suite runs.')
  console.error('The test runner will NOT write to production. Set STAGING_DATABASE_URL.')
  process.exit(1)
}

// Load test suite
const testSuite = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-suite.json'), 'utf-8'))
const testData = JSON.parse(fs.readFileSync(path.join(__dirname, 'beliefs-3/test-suite-data.json'), 'utf-8'))

// #4 FIX: Include ALL test cases, track which ones are scoreable vs skipped
const allTests = testSuite.test_cases.filter((tc) => tc.entity_id && tc.expected_action)
const beliefTests = allTests.filter((tc) => tc.field?.startsWith('belief_'))
const skippedTests = allTests.filter((tc) => !tc.field?.startsWith('belief_'))
const testEntityIds = [...new Set(beliefTests.map((tc) => tc.entity_id))]

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
console.log(`Database: STAGING (${process.env.STAGING_DATABASE_URL.substring(0, 40)}...)`)
console.log(`Entities to test: ${entitiesToTest.length}`)
console.log(`Belief test cases: ${beliefTests.filter((tc) => entitiesToTest.includes(tc.entity_id)).length}`)
if (skippedTests.length > 0) {
  console.log(`Skipped (non-belief): ${skippedTests.length} cases (${skippedTests.map((tc) => tc.id).join(', ')})`)
}
console.log('')

if (dryRun) {
  console.log('TEST PLAN (dry run):\n')
  for (const eid of entitiesToTest) {
    const name = testData[eid]?.entity?.name || `Entity ${eid}`
    const cases = beliefTests.filter((tc) => tc.entity_id === eid)
    console.log(`  ${name} (id=${eid}):`)
    for (const tc of cases) {
      console.log(`    ${tc.id}: ${tc.field} → expect ${tc.expected_action}`)
    }
  }
  process.exit(0)
}

// Record timestamp before pipeline runs so we can filter corrections
const runStartTime = new Date().toISOString()

const pool = new pg.Pool({
  connectionString: process.env.STAGING_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
})

const results = {
  pipeline,
  started_at: runStartTime,
  entities: [],
  totals: { pass: 0, fail: 0, skip: skippedTests.length, total: 0 },
  costs: { total_usd: 0 },
  timing: { total_ms: 0 },
}

let consecutiveDbErrors = 0

for (const eid of entitiesToTest) {
  const name = testData[eid]?.entity?.name || `Entity ${eid}`
  console.log(`\n${'═'.repeat(50)}`)
  console.log(`Testing: ${name} (id=${eid})`)
  console.log('═'.repeat(50))

  const entityStart = Date.now()

  // #1 FIX: Do NOT pass --allow-production. Pipeline will use STAGING_DATABASE_URL.
  try {
    const cmd = `node ${script} --id=${eid} --write-db`
    console.log(`  Running: ${cmd}`)
    const output = execSync(cmd, {
      cwd: path.join(__dirname, '..'),
      timeout: 300000,
      encoding: 'utf-8',
      env: { ...process.env },
    })

    const costMatch = output.match(/TOTAL:\s*\$([0-9.]+)/)
    if (costMatch) results.costs.total_usd += parseFloat(costMatch[1])

    const summaryLines = output
      .split('\n')
      .filter((l) => l.includes('Verdict') || l.includes('correct') || l.includes('confirm') || l.includes('remove'))
    for (const line of summaryLines.slice(0, 10)) console.log(`  ${line.trim()}`)

    consecutiveDbErrors = 0
  } catch (err) {
    console.error(`  Pipeline failed: ${err.message.substring(0, 100)}`)
    results.entities.push({ id: eid, name, error: err.message.substring(0, 200) })
    consecutiveDbErrors++

    // #11 FIX: Circuit breaker — abort after 3 consecutive failures
    if (consecutiveDbErrors >= 3) {
      console.error('\n  ABORTING: 3 consecutive pipeline failures. Likely systemic issue.')
      break
    }
    continue
  }

  const entityMs = Date.now() - entityStart
  results.timing.total_ms += entityMs

  // #2 FIX: Only read corrections created DURING this run, for this pipeline
  const corrections = await pool.query(
    `SELECT DISTINCT ON (field) field, verdict, proposed_value, confidence, pipeline
     FROM belief_correction
     WHERE entity_id = $1 AND created_at >= $2
     ORDER BY field, created_at DESC`,
    [eid, runStartTime],
  )

  const cases = beliefTests.filter((tc) => tc.entity_id === eid)
  const entityResult = { id: eid, name, time_ms: entityMs, cases: [] }

  for (const tc of cases) {
    const correction = corrections.rows.find((c) => c.field === tc.field)
    let pass = false
    let actual = 'no_result'

    if (correction) {
      actual = correction.verdict
    }

    // #9 FIX: For 'confirm' expectations, 'no_result' also counts as pass
    // (pipeline found nothing wrong = implicit confirm)
    if (tc.expected_action === 'confirm') {
      pass = actual === 'confirm' || actual === 'no_result'
    } else if (tc.expected_action === 'remove') {
      pass = actual === 'remove'
    } else if (tc.expected_action === 'correct') {
      pass = actual === 'correct'
    } else if (tc.expected_action === 'flag_for_human') {
      pass = actual !== 'confirm' && actual !== 'no_result'
    } else if (tc.expected_action === 'confirm_entity_null_and_supersede_claims') {
      pass = actual === 'remove' || actual === 'no_result'
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
console.log(`Belief cases scored: ${results.totals.total}`)
console.log(`  Pass: ${results.totals.pass}`)
console.log(`  Fail: ${results.totals.fail}`)
console.log(`Non-belief cases skipped: ${results.totals.skip}`)

const precision = results.totals.total > 0 ? ((results.totals.pass / results.totals.total) * 100).toFixed(1) : 0
console.log(`\nAccuracy: ${precision}%`)
console.log(`Cost: $${results.costs.total_usd.toFixed(2)}`)
console.log(`Time: ${(results.timing.total_ms / 1000).toFixed(1)}s`)

const passRate = results.totals.total > 0 ? results.totals.pass / results.totals.total : 0
const hasErrors = results.entities.some((e) => e.error)
console.log(`\nPass criteria: precision >= 0.80`)
console.log(`Result: ${passRate >= 0.8 && !hasErrors ? 'PASS' : 'FAIL'} (${(passRate * 100).toFixed(1)}%)`)

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

// #6 FIX: Exit non-zero on failure
if (passRate < 0.8 || hasErrors) {
  process.exit(1)
}
