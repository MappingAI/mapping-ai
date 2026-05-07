/**
 * Bulk-fix known data errors across all entities.
 *
 * Applies the patterns from qc-batches/people/batch-001-fixes.sql to
 * the full dataset. No API calls, just SQL.
 *
 * Usage:
 *   node scripts/bulk-fix-known-errors.js --dry-run   # Preview
 *   node scripts/bulk-fix-known-errors.js              # Apply
 */
import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const dryRun = process.argv.includes('--dry-run')

async function run() {
  const client = await pool.connect()
  const counts = {}

  async function fix(label, sql, params = []) {
    if (dryRun) {
      const countSql = sql
        .replace(/^UPDATE .+ SET .+ WHERE/s, 'SELECT COUNT(*) as n FROM entity WHERE')
        .replace(/^DELETE FROM edge WHERE/, 'SELECT COUNT(*) as n FROM edge WHERE')
      try {
        const r = await client.query(countSql, params)
        const n = r.rows[0]?.n || 0
        counts[label] = parseInt(n)
        console.log(`  [dry-run] ${label}: ${n} rows would be affected`)
      } catch {
        console.log(`  [dry-run] ${label}: (count query failed, will attempt fix)`)
      }
    } else {
      const r = await client.query(sql, params)
      counts[label] = r.rowCount
      console.log(`  ✓ ${label}: ${r.rowCount} rows`)
    }
  }

  console.log(`BULK FIX KNOWN ERRORS ${dryRun ? '(DRY RUN)' : ''}\n`)

  // 1. Downgrade "Explicitly stated" → "Inferred" where no stance_detail exists
  console.log('1. Evidence source mislabels')
  await fix(
    'Explicitly stated → Inferred (no stance detail)',
    `UPDATE entity SET belief_evidence_source = 'Inferred', updated_at = NOW()
     WHERE belief_evidence_source = 'Explicitly stated'
       AND (belief_regulatory_stance_detail IS NULL OR belief_regulatory_stance_detail = '')`,
  )

  // 2. Null out belief fields where evidence_source is null or Unknown
  console.log('\n2. Remove unsupported belief attributions')
  await fix(
    'Null stance where evidence = Unknown/null',
    `UPDATE entity SET
       belief_regulatory_stance = NULL,
       belief_regulatory_stance_detail = NULL,
       belief_agi_timeline = NULL,
       belief_ai_risk = NULL,
       belief_threat_models = NULL,
       belief_evidence_source = NULL,
       updated_at = NOW()
     WHERE status = 'approved'
       AND belief_evidence_source IN ('Unknown')
       AND belief_regulatory_stance_n = 0
       AND belief_agi_timeline_n = 0
       AND belief_ai_risk_n = 0`,
  )

  // 3. Truncate threat_models to max 3 values
  console.log('\n3. Threat models cardinality (max 3)')
  await fix(
    'Truncate threat_models > 3 values',
    `UPDATE entity SET
       belief_threat_models = array_to_string((string_to_array(belief_threat_models, ', '))[1:3], ', '),
       updated_at = NOW()
     WHERE belief_threat_models IS NOT NULL
       AND array_length(string_to_array(belief_threat_models, ', '), 1) > 3`,
  )

  // 4. Normalize funding_model values
  console.log('\n4. Funding model normalization')
  const fundingFixes = [
    ['Venture capital', 'VC-backed'],
    ['Nonprofit', 'Philanthropic'],
    ['Nonprofit/grants', 'Philanthropic'],
    ['Nonprofit/grant', 'Philanthropic'],
    ['Membership/donations', 'Membership'],
    ['Venture-backed', 'VC-backed'],
  ]
  for (const [from, to] of fundingFixes) {
    await fix(
      `"${from}" → "${to}"`,
      `UPDATE entity SET funding_model = REPLACE(funding_model, $1, $2), updated_at = NOW()
       WHERE funding_model LIKE '%' || $1 || '%'`,
      [from, to],
    )
  }

  // 5. Clear obviously wrong Twitter handles (common LLM errors)
  console.log('\n5. Invalid Twitter handles')
  await fix(
    'Null generic/wrong handles',
    `UPDATE entity SET twitter = NULL, updated_at = NOW()
     WHERE twitter IN ('@time', '@cs', '@mit', '@stanford', '@harvard', '@google', '@microsoft',
                       '@facebook', '@meta', '@apple', '@amazon', '@openai')
       AND entity_type = 'person'`,
  )

  // 6. Clear "Unknown" belief values (these should be NULL, not the string "Unknown")
  console.log('\n6. Clear "Unknown" string values')
  await fix(
    'AGI timeline "Unknown" → NULL',
    `UPDATE entity SET belief_agi_timeline = NULL, updated_at = NOW()
     WHERE belief_agi_timeline = 'Unknown' AND belief_agi_timeline_n = 0`,
  )
  await fix(
    'AI risk "Unknown" → NULL',
    `UPDATE entity SET belief_ai_risk = NULL, updated_at = NOW()
     WHERE belief_ai_risk = 'Unknown' AND belief_ai_risk_n = 0`,
  )

  console.log('\n' + '='.repeat(50))
  const totalFixed = Object.values(counts).reduce((a, b) => a + b, 0)
  console.log(`Total rows affected: ${totalFixed}`)
  if (dryRun) console.log('(dry run, no changes made)')

  client.release()
  await pool.end()
}

run().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
