/**
 * Phase 3 - Step 1: ANALYSIS ONLY
 *
 * Analyze other_orgs field and identify potential edges.
 * NO DATABASE WRITES - just analysis and reporting.
 */
import pg from 'pg'
import 'dotenv/config'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  const client = await pool.connect()

  console.log('PHASE 3 - ANALYSIS: other_orgs Edge Extraction')
  console.log('===============================================')
  console.log('MODE: READ-ONLY ANALYSIS (no database changes)\n')

  // Get all existing orgs for matching
  const orgs = await client.query(`
    SELECT id, name FROM entity
    WHERE entity_type = 'organization' AND status = 'approved'
  `)

  const orgNames = orgs.rows.map((o) => o.name)
  const orgByNameLower = new Map(orgs.rows.map((o) => [o.name.toLowerCase(), o]))

  console.log(`Loaded ${orgs.rows.length} existing orgs for matching\n`)

  // Get all people with other_orgs
  const people = await client.query(`
    SELECT p.id, p.name, p.other_orgs, p.primary_org,
           array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as current_orgs
    FROM entity p
    LEFT JOIN edge e ON e.source_id = p.id
    LEFT JOIN entity t ON t.id = e.target_id AND t.entity_type = 'organization'
    WHERE p.entity_type = 'person'
      AND p.status = 'approved'
      AND p.other_orgs IS NOT NULL
      AND p.other_orgs != ''
    GROUP BY p.id
    ORDER BY p.name
  `)

  console.log(`Found ${people.rows.length} people with other_orgs field\n`)

  // Try to find org mentions in other_orgs
  let potentialMatches = []
  let noMatches = []

  for (const person of people.rows) {
    const otherOrgs = person.other_orgs
    const currentOrgs = person.current_orgs || []
    const matches = []

    // Try each existing org name against the other_orgs text
    for (const org of orgs.rows) {
      // Skip if already connected
      if (currentOrgs.includes(org.name)) continue

      // Check if org name appears in other_orgs (case-insensitive)
      const orgNameLower = org.name.toLowerCase()
      const otherOrgsLower = otherOrgs.toLowerCase()

      // Direct match
      if (otherOrgsLower.includes(orgNameLower)) {
        matches.push({
          orgId: org.id,
          orgName: org.name,
          matchType: 'direct',
        })
        continue
      }

      // Try without common suffixes
      const shortNames = [
        org.name.replace(/\s*\([^)]+\)\s*$/, ''), // Remove parenthetical
        org.name.replace(/\s+(Inc\.?|LLC|Corp\.?|Foundation|Institute|University)$/i, ''),
      ]

      for (const shortName of shortNames) {
        if (shortName.length > 3 && otherOrgsLower.includes(shortName.toLowerCase())) {
          matches.push({
            orgId: org.id,
            orgName: org.name,
            matchType: 'partial',
            matchedText: shortName,
          })
          break
        }
      }
    }

    if (matches.length > 0) {
      potentialMatches.push({
        personId: person.id,
        personName: person.name,
        otherOrgs: person.other_orgs,
        currentOrgs,
        matches,
      })
    } else {
      noMatches.push({
        personId: person.id,
        personName: person.name,
        otherOrgs: person.other_orgs,
      })
    }
  }

  // Report findings
  console.log('===============================================')
  console.log('POTENTIAL EDGE MATCHES')
  console.log('===============================================\n')

  let totalPotentialEdges = 0
  for (const p of potentialMatches.slice(0, 30)) {
    console.log(`[${p.personId}] ${p.personName}`)
    console.log(`  Current orgs: ${p.currentOrgs.length > 0 ? p.currentOrgs.join(', ') : '(none)'}`)
    console.log(`  other_orgs: "${p.otherOrgs.substring(0, 100)}..."`)
    console.log(`  Potential matches:`)
    for (const m of p.matches) {
      console.log(
        `    → [${m.orgId}] ${m.orgName} (${m.matchType}${m.matchedText ? ': "' + m.matchedText + '"' : ''})`,
      )
      totalPotentialEdges++
    }
    console.log('')
  }

  if (potentialMatches.length > 30) {
    console.log(`... and ${potentialMatches.length - 30} more people with potential matches\n`)
  }

  // Summary
  console.log('===============================================')
  console.log('SUMMARY')
  console.log('===============================================')
  console.log(`People with other_orgs: ${people.rows.length}`)
  console.log(`People with potential matches: ${potentialMatches.length}`)
  console.log(`People with no matches found: ${noMatches.length}`)
  console.log(
    `Total potential new edges: ${potentialMatches.reduce((sum, p) => sum + p.matches.length, 0)}`,
  )

  // Show sample of no-matches to understand why
  console.log('\n===============================================')
  console.log('SAMPLE: NO MATCHES FOUND (first 10)')
  console.log('===============================================\n')

  for (const p of noMatches.slice(0, 10)) {
    console.log(`[${p.personId}] ${p.personName}`)
    console.log(`  other_orgs: "${p.otherOrgs.substring(0, 150)}..."`)
    console.log('')
  }

  // Common orgs mentioned but not in DB
  console.log('===============================================')
  console.log('ORGS MENTIONED IN other_orgs BUT NOT IN DATABASE')
  console.log('===============================================\n')

  // Common org patterns to look for
  const commonPatterns = [
    /Y Combinator/gi,
    /Google Brain/gi,
    /Google Research/gi,
    /Facebook AI/gi,
    /Microsoft Research/gi,
    /Amazon/gi,
    /Apple/gi,
    /Tesla/gi,
    /SpaceX/gi,
    /Stripe/gi,
    /World Economic Forum/gi,
    /United Nations/gi,
    /European Union/gi,
    /Brookings/gi,
    /Council on Foreign Relations/gi,
    /National Bureau of Economic Research/gi,
    /NBER/gi,
  ]

  const mentionedOrgs = new Map()
  for (const p of people.rows) {
    for (const pattern of commonPatterns) {
      const matches = p.other_orgs.match(pattern)
      if (matches) {
        for (const match of matches) {
          const normalized = match.toLowerCase()
          if (!mentionedOrgs.has(normalized)) {
            mentionedOrgs.set(normalized, { name: match, count: 0 })
          }
          mentionedOrgs.get(normalized).count++
        }
      }
    }
  }

  const sortedMentions = [...mentionedOrgs.values()].sort((a, b) => b.count - a.count)
  for (const m of sortedMentions) {
    const inDb = orgByNameLower.has(m.name.toLowerCase()) ? '✓ IN DB' : '✗ NOT IN DB'
    console.log(`  ${m.name}: ${m.count} mentions ${inDb}`)
  }

  client.release()
  await pool.end()
}

main().catch(console.error)
