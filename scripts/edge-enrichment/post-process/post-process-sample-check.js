#!/usr/bin/env node
/**
 * Post-processing: Sample quality check
 *
 * Randomly samples entity suggestions and edge discoveries to verify quality.
 * Shows samples with their source URLs for manual verification.
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process-sample-check.js
 *   node scripts/edge-enrichment/post-process-sample-check.js --count 20
 */
import 'dotenv/config'
import pg from 'pg'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

async function main() {
  const countArg = process.argv.find(a => a.startsWith('--count'))
  const count = countArg ? parseInt(process.argv[process.argv.indexOf(countArg) + 1]) || 10 : 10

  console.log(`=== QUALITY SAMPLE CHECK ===\n`)
  console.log(`Sampling ${count} items from each category...\n`)

  // 1. Sample high-frequency entity suggestions (seen 5+x)
  console.log('--- HIGH-FREQUENCY ENTITY SUGGESTIONS (seen 5+x) ---\n')
  const highFreq = await neon.query(`
    SELECT extracted_name, entity_type, times_seen, potential_duplicates
    FROM entity_suggestion
    WHERE status = 'pending' AND times_seen >= 5
    ORDER BY RANDOM()
    LIMIT $1
  `, [count])

  for (const r of highFreq.rows) {
    const dupes = r.potential_duplicates?.map(d => d.name).slice(0, 2).join(', ') || 'none'
    console.log(`  "${r.extracted_name}" (${r.entity_type || 'unknown'})`)
    console.log(`    Seen: ${r.times_seen}x | Potential duplicates: ${dupes}`)
    console.log()
  }

  // 2. Sample medium-frequency suggestions (seen 2-4x)
  console.log('--- MEDIUM-FREQUENCY SUGGESTIONS (seen 2-4x) ---\n')
  const medFreq = await neon.query(`
    SELECT extracted_name, entity_type, times_seen
    FROM entity_suggestion
    WHERE status = 'pending' AND times_seen BETWEEN 2 AND 4
    ORDER BY RANDOM()
    LIMIT $1
  `, [count])

  for (const r of medFreq.rows) {
    console.log(`  "${r.extracted_name}" (${r.entity_type || 'unknown'}) - seen ${r.times_seen}x`)
  }

  // 3. Sample single-occurrence suggestions (likely noise)
  console.log('\n--- SINGLE-OCCURRENCE SUGGESTIONS (likely noise) ---\n')
  const singleOccur = await neon.query(`
    SELECT extracted_name, entity_type
    FROM entity_suggestion
    WHERE status = 'pending' AND times_seen = 1
    ORDER BY RANDOM()
    LIMIT $1
  `, [count])

  for (const r of singleOccur.rows) {
    console.log(`  "${r.extracted_name}" (${r.entity_type || 'unknown'})`)
  }

  // 4. Sample edge discoveries with amounts (funding)
  console.log('\n--- EDGE DISCOVERIES WITH AMOUNTS ---\n')
  const withAmounts = await neon.query(`
    SELECT
      d.source_entity_name as funder,
      d.target_entity_name as recipient,
      d.amount_usd,
      s.url,
      SUBSTRING(d.citation, 1, 80) as citation
    FROM edge_discovery d
    JOIN source s ON d.source_id = s.source_id
    WHERE d.amount_usd IS NOT NULL
    ORDER BY RANDOM()
    LIMIT $1
  `, [count])

  for (const r of withAmounts.rows) {
    console.log(`  ${r.funder} → ${r.recipient}`)
    console.log(`    Amount: $${Number(r.amount_usd).toLocaleString()}`)
    console.log(`    Source: ${r.url}`)
    console.log(`    Citation: ${r.citation}...`)
    console.log()
  }

  // 5. Sample edge discoveries without amounts
  console.log('--- EDGE DISCOVERIES WITHOUT AMOUNTS ---\n')
  const noAmounts = await neon.query(`
    SELECT
      d.source_entity_name as funder,
      d.target_entity_name as recipient,
      d.edge_type,
      s.url,
      SUBSTRING(d.citation, 1, 80) as citation
    FROM edge_discovery d
    JOIN source s ON d.source_id = s.source_id
    WHERE d.amount_usd IS NULL
    ORDER BY RANDOM()
    LIMIT $1
  `, [count])

  for (const r of noAmounts.rows) {
    console.log(`  ${r.funder} → ${r.recipient} (${r.edge_type})`)
    console.log(`    Source: ${r.url}`)
    console.log(`    Citation: ${r.citation}...`)
    console.log()
  }

  // 6. Sample edge evidence (temporal data)
  console.log('--- EDGE EVIDENCE (temporal data) ---\n')
  const evidence = await neon.query(`
    SELECT
      e.edge_id,
      e.start_date,
      e.end_date,
      e.confidence,
      s.url,
      SUBSTRING(e.citation, 1, 80) as citation
    FROM edge_evidence e
    JOIN source s ON e.source_id = s.source_id
    WHERE e.start_date IS NOT NULL OR e.end_date IS NOT NULL
    ORDER BY RANDOM()
    LIMIT $1
  `, [count])

  for (const r of evidence.rows) {
    const start = r.start_date ? new Date(r.start_date).toISOString().split('T')[0] : null
    const end = r.end_date ? new Date(r.end_date).toISOString().split('T')[0] : null
    const dateStr = [start, end].filter(Boolean).join(' → ') || 'no dates'
    console.log(`  Edge ${r.edge_id}: ${dateStr} (${r.confidence || 'unknown'} confidence)`)
    console.log(`    Source: ${r.url}`)
    console.log(`    Citation: ${r.citation}...`)
    console.log()
  }

  // 7. Potential issues - check for non-AI relevant
  console.log('--- POTENTIAL NON-AI RELEVANT (sample) ---\n')
  const nonAI = await neon.query(`
    SELECT extracted_name, times_seen
    FROM entity_suggestion
    WHERE status = 'pending'
      AND extracted_name ~* '(music|sports|athletic|church|religious|culinary|food|restaurant|fashion|beauty)'
      AND extracted_name !~* '(ai|ml|machine|learning|tech|compute|algorithm|robot)'
    ORDER BY times_seen DESC
    LIMIT $1
  `, [count])

  if (nonAI.rows.length === 0) {
    console.log('  No obvious non-AI entities found.')
  } else {
    for (const r of nonAI.rows) {
      console.log(`  "${r.extracted_name}" (seen ${r.times_seen}x)`)
    }
  }

  // 8. Summary stats
  console.log('\n--- SUMMARY STATS ---\n')

  const stats = await neon.query(`
    SELECT
      (SELECT COUNT(*) FROM entity_suggestion WHERE status = 'pending') as pending_suggestions,
      (SELECT COUNT(*) FROM entity_suggestion WHERE status = 'pending' AND times_seen >= 5) as high_freq,
      (SELECT COUNT(*) FROM entity_suggestion WHERE status = 'pending' AND times_seen BETWEEN 2 AND 4) as med_freq,
      (SELECT COUNT(*) FROM entity_suggestion WHERE status = 'pending' AND times_seen = 1) as low_freq,
      (SELECT COUNT(*) FROM edge_discovery WHERE status = 'pending_review') as ready_for_review,
      (SELECT COUNT(*) FROM edge_discovery WHERE status = 'pending_entities') as pending_entities,
      (SELECT COUNT(*) FROM edge_evidence) as edge_evidence
  `)

  const s = stats.rows[0]
  console.log(`Entity Suggestions:`)
  console.log(`  Total pending: ${s.pending_suggestions}`)
  console.log(`  High frequency (5+x): ${s.high_freq}`)
  console.log(`  Medium frequency (2-4x): ${s.med_freq}`)
  console.log(`  Low frequency (1x): ${s.low_freq}`)
  console.log()
  console.log(`Edge Discoveries:`)
  console.log(`  Ready for review: ${s.ready_for_review}`)
  console.log(`  Pending entity resolution: ${s.pending_entities}`)
  console.log()
  console.log(`Edge Evidence: ${s.edge_evidence}`)

  await neon.end()
  console.log('\n=== END SAMPLE CHECK ===')
}

main().catch(console.error)
