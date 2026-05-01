#!/usr/bin/env node
/**
 * Quality control check - run anytime during enrichment
 * Usage: node scripts/edge-enrichment/qc-check.js
 */
import 'dotenv/config'
import pg from 'pg'

const neon = new pg.Pool({ 
  connectionString: process.env.PILOT_DB, 
  ssl: { rejectUnauthorized: false } 
})

async function main() {
  console.log('=== ENRICHMENT QC CHECK ===\n')
  console.log(`Timestamp: ${new Date().toLocaleString()}\n`)

  // Progress from files
  const fs = await import('fs')
  const progressDir = 'data/edge-enrichment'
  for (const script of ['discover-funding', 'enrich-edges', 'enrich-org-lifecycle']) {
    try {
      const progress = JSON.parse(fs.readFileSync(`${progressDir}/${script}-progress.json`))
      console.log(`${script}: ${progress.completed?.length || 0} items processed`)
    } catch { 
      console.log(`${script}: not started or no progress file`)
    }
  }

  console.log('\n--- DATABASE COUNTS ---\n')

  // Edge evidence
  const evidence = await neon.query('SELECT COUNT(*) as count FROM edge_evidence')
  console.log(`Edge Evidence: ${evidence.rows[0].count} records`)

  // Edge discoveries by status
  const discoveries = await neon.query(`
    SELECT status, COUNT(*) as count 
    FROM edge_discovery 
    GROUP BY status 
    ORDER BY count DESC
  `)
  console.log(`\nEdge Discoveries:`)
  for (const row of discoveries.rows) {
    console.log(`  ${row.status}: ${row.count}`)
  }

  // Entity suggestions
  const suggestions = await neon.query(`
    SELECT status, COUNT(*) as count 
    FROM entity_suggestion 
    GROUP BY status
  `)
  console.log(`\nEntity Suggestions:`)
  for (const row of suggestions.rows) {
    console.log(`  ${row.status}: ${row.count}`)
  }

  // Claims (founding dates)
  const claims = await neon.query(`
    SELECT belief_dimension, COUNT(*) as count 
    FROM claim 
    WHERE belief_dimension IN ('founded_year', 'end_year')
    GROUP BY belief_dimension
  `)
  console.log(`\nLifecycle Claims:`)
  for (const row of claims.rows) {
    console.log(`  ${row.belief_dimension}: ${row.count}`)
  }

  console.log('\n--- RECENT ACTIVITY (last 5 of each) ---\n')

  // Recent edge evidence
  const recentEvidence = await neon.query(`
    SELECT edge_id, SUBSTRING(citation, 1, 50) as citation 
    FROM edge_evidence 
    ORDER BY created_at DESC 
    LIMIT 5
  `)
  console.log('Recent Edge Evidence:')
  for (const row of recentEvidence.rows) {
    console.log(`  [${row.edge_id}] ${row.citation}...`)
  }

  // Recent discoveries
  const recentDiscoveries = await neon.query(`
    SELECT source_entity_name, target_entity_name, amount_usd
    FROM edge_discovery 
    ORDER BY created_at DESC 
    LIMIT 5
  `)
  console.log('\nRecent Discoveries:')
  for (const row of recentDiscoveries.rows) {
    const amt = row.amount_usd ? `$${Number(row.amount_usd).toLocaleString()}` : ''
    console.log(`  ${row.source_entity_name} → ${row.target_entity_name} ${amt}`)
  }

  // Recent claims
  const recentClaims = await neon.query(`
    SELECT entity_name, stance_label as year
    FROM claim 
    WHERE belief_dimension = 'founded_year'
    ORDER BY created_at DESC 
    LIMIT 5
  `)
  console.log('\nRecent Founded Years:')
  for (const row of recentClaims.rows) {
    console.log(`  ${row.entity_name}: ${row.year}`)
  }

  console.log('\n--- QUALITY FLAGS ---\n')

  // Check for issues
  const genericNames = await neon.query(`
    SELECT COUNT(*) as count FROM entity_suggestion 
    WHERE extracted_name ILIKE '%unknown%' 
       OR extracted_name ILIKE '%various%'
       OR extracted_name ILIKE '%individual%'
  `)
  console.log(`Generic entity names: ${genericNames.rows[0].count}`)

  const nullCitations = await neon.query(`
    SELECT COUNT(*) as count FROM edge_discovery WHERE citation IS NULL
  `)
  console.log(`Discoveries without citations: ${nullCitations.rows[0].count}`)

  const duplicateSuggestions = await neon.query(`
    SELECT COUNT(*) as count FROM entity_suggestion 
    WHERE potential_duplicates IS NOT NULL
  `)
  console.log(`Suggestions with potential duplicates: ${duplicateSuggestions.rows[0].count}`)

  await neon.end()
  console.log('\n=== END QC CHECK ===')
}

main().catch(console.error)
