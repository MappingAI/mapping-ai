#!/usr/bin/env node
/**
 * Post-processing Step 2: Bulk reject generic/vague entity names
 *
 * Rejects entity suggestions that are too generic to be useful:
 * - "investors", "donors", "backers", etc.
 * - "unknown X", "various X", "anonymous X"
 * - Single words that are too vague
 * - Non-entity terms
 *
 * Also marks associated edge_discovery records as 'rejected'.
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process-2-reject-generic.js --dry-run
 *   node scripts/edge-enrichment/post-process-2-reject-generic.js --apply
 */
import 'dotenv/config'
import pg from 'pg'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

// Patterns for generic/vague names to reject
const REJECT_PATTERNS = [
  // Generic investor/funder terms
  /^investors?$/i,
  /^donors?$/i,
  /^funders?$/i,
  /^backers?$/i,
  /^contributors?$/i,
  /^sponsors?$/i,
  /^partners?$/i,
  /^supporters?$/i,
  /^members?$/i,
  /^clients?$/i,
  /^customers?$/i,

  // Collective terms
  /^limited partners?$/i,
  /^general partners?$/i,
  /^angel investors?$/i,
  /^seed investors?$/i,
  /^early investors?$/i,
  /^institutional investors?$/i,
  /^private investors?$/i,
  /^individual investors?$/i,
  /^retail investors?$/i,
  /^accredited investors?$/i,

  // Platform-based collectives
  /kickstarter backers?/i,
  /crowdfunding/i,
  /manifund donors?/i,
  /patreon/i,
  /gofundme/i,

  // Unknown/various/anonymous
  /^unknown/i,
  /^various/i,
  /^anonymous/i,
  /^unnamed/i,
  /^undisclosed/i,
  /^unidentified/i,
  /^multiple /i,
  /^several /i,
  /^other /i,
  /^misc /i,

  // Too short/vague (less than 3 chars or single common words)
  /^[a-z]{1,2}$/i,
  /^inc\.?$/i,
  /^llc\.?$/i,
  /^corp\.?$/i,
  /^co\.?$/i,

  // Non-entities
  /^employees?$/i,
  /^staff$/i,
  /^team$/i,
  /^board$/i,
  /^committee$/i,
  /^government$/i,
  /^federal government$/i,
  /^state government$/i,
  /^local government$/i,
  /^private sector$/i,
  /^public sector$/i,
  /^industry$/i,
  /^academia$/i,
  /^individuals?$/i,
  /^people$/i,
  /^users?$/i,
  /^community$/i,
]

// Specific names to reject (exact match, case-insensitive)
const REJECT_EXACT = [
  'investors',
  'Limited Partners',
  'angel investors',
  'seed investors',
  'Manifund donors',
  'Kickstarter backers',
  'individual donor',
  'individual entrepreneurs and angel investors',
  'individuals',
  'Unknown',
  'Unknown investors',
  'Journalists (various)',
  'N/A',
  'TBD',
  'None',
  'Self',
  'Personal funds',
  'Self-funded',
  'Bootstrap',
  'Bootstrapped',
  // Too generic for funding relationships
  'U.S. Congress',
  'U.S. Senate',
  'U.S. House of Representatives',
  'Congress',
  'Senate',
  'researchers',
  'research teams around the world',
  'Professor Mark Walker', // Generic "Professor X" pattern
]

// Known short names that are REAL companies - do not reject
const KEEP_SHORT_NAMES = [
  'G42',  // UAE AI company
  'fal',  // fal.ai - AI platform
  'Ink',  // web3 company
  'Eni',  // Italian energy company
  'Jio',  // Indian telecom
  'Cue',  // Apple acquisition
  'Ego',  // Startup
  'Ned',  // Brooklyn startup
  'Noa',  // RTX-backed company
  'IBM',
  'AWS',
  'GCP',
  'AMD',
  'ARM',
  'SAP',
  'HPE',
  'EMC',
  'RSA',
  'VMware',
]

function shouldReject(name) {
  // Check exact matches first
  if (REJECT_EXACT.some(r => r.toLowerCase() === name.toLowerCase())) {
    return { reject: true, reason: 'exact match' }
  }

  // Check patterns
  for (const pattern of REJECT_PATTERNS) {
    if (pattern.test(name)) {
      return { reject: true, reason: `pattern: ${pattern}` }
    }
  }

  // DO NOT reject short names - too many false positives (G42, fal, Eni, etc.)
  // Short company names are common and legitimate

  return { reject: false }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const apply = process.argv.includes('--apply')

  if (!dryRun && !apply) {
    console.log('Usage:')
    console.log('  --dry-run  Show what would be rejected without making changes')
    console.log('  --apply    Actually perform the rejections')
    process.exit(1)
  }

  console.log(`=== POST-PROCESS STEP 2: REJECT GENERIC NAMES ===`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING CHANGES'}\n`)

  // Get all pending entity suggestions
  const suggestions = await neon.query(`
    SELECT suggestion_id, extracted_name, times_seen
    FROM entity_suggestion
    WHERE status = 'pending'
    ORDER BY times_seen DESC
  `)

  console.log(`Checking ${suggestions.rows.length} pending suggestions...\n`)

  let rejected = 0
  let kept = 0
  const rejectList = []

  for (const sugg of suggestions.rows) {
    const result = shouldReject(sugg.extracted_name)
    if (result.reject) {
      rejectList.push({
        ...sugg,
        reason: result.reason
      })
      rejected++
    } else {
      kept++
    }
  }

  // Show what will be rejected
  console.log(`--- WILL REJECT (${rejected}) ---\n`)
  for (const item of rejectList.slice(0, 30)) {
    console.log(`  ✗ "${item.extracted_name}" (seen ${item.times_seen}x) - ${item.reason}`)
  }
  if (rejectList.length > 30) {
    console.log(`  ... and ${rejectList.length - 30} more`)
  }

  if (!dryRun) {
    console.log(`\nApplying rejections...`)

    for (const item of rejectList) {
      // Mark suggestion as rejected
      await neon.query(`
        UPDATE entity_suggestion
        SET status = 'rejected'
        WHERE suggestion_id = $1
      `, [item.suggestion_id])

      // Mark associated edge_discovery records as rejected
      await neon.query(`
        UPDATE edge_discovery
        SET status = 'rejected'
        WHERE source_suggestion_id = $1 OR target_suggestion_id = $1
      `, [item.suggestion_id])
    }

    console.log(`Rejected ${rejected} suggestions and their associated discoveries.`)
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Total checked: ${suggestions.rows.length}`)
  console.log(`Rejected: ${rejected}`)
  console.log(`Kept: ${kept}`)

  if (dryRun) {
    console.log(`\nRun with --apply to execute these rejections.`)
  }

  // Show remaining counts
  const remaining = await neon.query(`
    SELECT status, COUNT(*) as count
    FROM entity_suggestion
    GROUP BY status
  `)
  console.log(`\nEntity suggestion status:`)
  for (const r of remaining.rows) {
    console.log(`  ${r.status}: ${r.count}`)
  }

  await neon.end()
}

main().catch(console.error)
