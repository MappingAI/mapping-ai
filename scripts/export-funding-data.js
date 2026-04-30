#!/usr/bin/env node
/**
 * Export Funding Data for Insights Page
 *
 * Generates funding-data.json from Neon edge_discovery table
 * Used by the insights page funding visualizations
 *
 * Usage:
 *   node scripts/export-funding-data.js
 */
import 'dotenv/config'
import pg from 'pg'
import fs from 'fs'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

const rds = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function main() {
  console.log('Exporting funding data...\n')

  // Get entity data from RDS for category/stance lookups
  const entityResult = await rds.query(`
    SELECT id, name, entity_type, category,
           belief_regulatory_stance as stance,
           CASE belief_regulatory_stance
             WHEN 'Accelerate' THEN 1
             WHEN 'Light-touch' THEN 2
             WHEN 'Targeted' THEN 3
             WHEN 'Moderate' THEN 4
             WHEN 'Restrictive' THEN 5
             WHEN 'Precautionary' THEN 6
             ELSE NULL
           END as stance_score
    FROM entity
    WHERE status = 'approved'
  `)

  const entityByName = new Map()
  const entityById = new Map()
  entityResult.rows.forEach(e => {
    entityByName.set(e.name.toLowerCase(), e)
    entityById.set(e.id, e)
  })
  console.log(`Loaded ${entityResult.rows.length} entities from RDS`)

  // Get all funding edges from Neon
  const fundingResult = await neon.query(`
    SELECT
      source_entity_name as funder,
      target_entity_name as recipient,
      amount_usd,
      start_date,
      end_date,
      citation
    FROM edge_discovery
    ORDER BY start_date DESC NULLS LAST
  `)
  console.log(`Loaded ${fundingResult.rows.length} funding edges from Neon`)

  // Process funding edges with entity metadata
  const fundingEdges = fundingResult.rows.map(e => {
    const funderEntity = entityByName.get(e.funder.toLowerCase())
    const recipientEntity = entityByName.get(e.recipient.toLowerCase())

    return {
      funder: e.funder,
      recipient: e.recipient,
      amount_usd: e.amount_usd ? parseFloat(e.amount_usd) : null,
      start_date: e.start_date,
      end_date: e.end_date,
      funder_category: funderEntity?.category || 'Unknown',
      funder_type: funderEntity?.entity_type || 'unknown',
      recipient_category: recipientEntity?.category || 'Unknown',
      recipient_type: recipientEntity?.entity_type || 'unknown',
      recipient_stance: recipientEntity?.stance || null,
      recipient_stance_score: recipientEntity?.stance_score || null,
    }
  })

  // Aggregate: funders summary
  const funderStats = new Map()
  fundingEdges.forEach(e => {
    const key = e.funder
    if (!funderStats.has(key)) {
      funderStats.set(key, {
        name: e.funder,
        category: e.funder_category,
        type: e.funder_type,
        investments: 0,
        recipients: new Set(),
        total_usd: 0,
        with_amounts: 0,
        recipient_stances: [],
        years: []
      })
    }
    const s = funderStats.get(key)
    s.investments++
    s.recipients.add(e.recipient)
    if (e.amount_usd) {
      s.total_usd += e.amount_usd
      s.with_amounts++
    }
    if (e.recipient_stance_score) {
      s.recipient_stances.push(e.recipient_stance_score)
    }
    if (e.start_date) {
      s.years.push(new Date(e.start_date).getFullYear())
    }
  })

  const funders = Array.from(funderStats.values())
    .map(s => ({
      name: s.name,
      category: s.category,
      type: s.type,
      investments: s.investments,
      unique_recipients: s.recipients.size,
      total_usd: s.total_usd,
      with_amounts: s.with_amounts,
      mean_recipient_stance: s.recipient_stances.length > 0
        ? s.recipient_stances.reduce((a, b) => a + b, 0) / s.recipient_stances.length
        : null,
      first_year: s.years.length > 0 ? Math.min(...s.years) : null,
      last_year: s.years.length > 0 ? Math.max(...s.years) : null,
    }))
    .sort((a, b) => b.investments - a.investments)

  console.log(`Aggregated ${funders.length} unique funders`)

  // Aggregate: recipients summary
  const recipientStats = new Map()
  fundingEdges.forEach(e => {
    const key = e.recipient
    if (!recipientStats.has(key)) {
      recipientStats.set(key, {
        name: e.recipient,
        category: e.recipient_category,
        type: e.recipient_type,
        stance: e.recipient_stance,
        funding_rounds: 0,
        funders: new Set(),
        total_usd: 0,
        years: []
      })
    }
    const s = recipientStats.get(key)
    s.funding_rounds++
    s.funders.add(e.funder)
    if (e.amount_usd) {
      s.total_usd += e.amount_usd
    }
    if (e.start_date) {
      s.years.push(new Date(e.start_date).getFullYear())
    }
  })

  const recipients = Array.from(recipientStats.values())
    .map(s => ({
      name: s.name,
      category: s.category,
      type: s.type,
      stance: s.stance,
      funding_rounds: s.funding_rounds,
      unique_funders: s.funders.size,
      total_usd: s.total_usd,
      first_year: s.years.length > 0 ? Math.min(...s.years) : null,
      last_year: s.years.length > 0 ? Math.max(...s.years) : null,
    }))
    .sort((a, b) => b.total_usd - a.total_usd)

  console.log(`Aggregated ${recipients.length} unique recipients`)

  // Aggregate: flows by funder → recipient_category
  const flowStats = new Map()
  fundingEdges.forEach(e => {
    const key = `${e.funder}|||${e.recipient_category}`
    if (!flowStats.has(key)) {
      flowStats.set(key, {
        funder: e.funder,
        funder_category: e.funder_category,
        recipient_category: e.recipient_category,
        count: 0,
        total_usd: 0
      })
    }
    const s = flowStats.get(key)
    s.count++
    if (e.amount_usd) s.total_usd += e.amount_usd
  })

  const flows = Array.from(flowStats.values())
    .filter(f => f.count >= 2)
    .sort((a, b) => b.count - a.count)

  console.log(`Generated ${flows.length} funder→category flows`)

  // Aggregate: by year
  const yearStats = new Map()
  fundingEdges.forEach(e => {
    if (!e.start_date) return
    const year = new Date(e.start_date).getFullYear()
    if (year < 2010 || year > 2027) return

    if (!yearStats.has(year)) {
      yearStats.set(year, {
        year,
        count: 0,
        total_usd: 0,
        by_recipient_category: {}
      })
    }
    const s = yearStats.get(year)
    s.count++
    if (e.amount_usd) s.total_usd += e.amount_usd

    const cat = e.recipient_category || 'Unknown'
    if (!s.by_recipient_category[cat]) {
      s.by_recipient_category[cat] = { count: 0, total_usd: 0 }
    }
    s.by_recipient_category[cat].count++
    if (e.amount_usd) s.by_recipient_category[cat].total_usd += e.amount_usd
  })

  const byYear = Array.from(yearStats.values()).sort((a, b) => a.year - b.year)
  console.log(`Generated timeline data for ${byYear.length} years`)

  // Aggregate: by funder and year (for timing patterns)
  const funderYearStats = new Map()
  fundingEdges.forEach(e => {
    if (!e.start_date) return
    const year = new Date(e.start_date).getFullYear()
    if (year < 2015 || year > 2027) return

    const key = `${e.funder}|||${year}`
    if (!funderYearStats.has(key)) {
      funderYearStats.set(key, {
        funder: e.funder,
        funder_category: e.funder_category,
        year,
        count: 0,
        total_usd: 0
      })
    }
    const s = funderYearStats.get(key)
    s.count++
    if (e.amount_usd) s.total_usd += e.amount_usd
  })

  const funderByYear = Array.from(funderYearStats.values())
    .sort((a, b) => a.year - b.year || b.count - a.count)

  console.log(`Generated ${funderByYear.length} funder-year data points`)

  // Build output
  const output = {
    _meta: {
      generated_at: new Date().toISOString(),
      total_edges: fundingEdges.length,
      edges_with_amounts: fundingEdges.filter(e => e.amount_usd).length,
      edges_with_dates: fundingEdges.filter(e => e.start_date).length,
    },
    funders: funders.slice(0, 100), // Top 100 funders
    recipients: recipients.slice(0, 100), // Top 100 recipients
    flows,
    byYear,
    funderByYear,
  }

  // Write to file
  const outPath = 'funding-data.json'
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2))
  console.log(`\nWrote ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`)

  await neon.end()
  await rds.end()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
