/**
 * Phase 3 - Step 3: Extract edges from other_orgs with STRICT matching
 *
 * Safety measures:
 * 1. Only matches orgs with 6+ character names (avoids "AI", "MIT", "Time")
 * 2. Requires word boundaries (not substring matches)
 * 3. Exports to review file before any DB writes
 * 4. Tracks all edges with created_by for potential rollback
 *
 * Usage:
 *   node scripts/extract-other-orgs-edges.js --analyze     # Analysis only, exports review file
 *   node scripts/extract-other-orgs-edges.js --dry-run     # Show what would be created
 *   node scripts/extract-other-orgs-edges.js --execute     # Actually create edges
 */
import pg from 'pg'
import fs from 'fs'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const args = process.argv.slice(2)
const analyzeOnly = args.includes('--analyze')
const dryRun = !args.includes('--execute')

// Minimum org name length to match (avoid "AI", "MIT", "Time", etc.)
const MIN_ORG_NAME_LENGTH = 6

// Orgs to NEVER match (too common/ambiguous)
const BLOCKLIST = new Set([
  'time',
  'nature',
  'science',
  'ai',
  'mit',
  'the atlantic',
  'new york',
  'san francisco',
  'los angeles',
  'washington',
  'london',
  'board',
  'advisory',
  'council',
  'committee',
  'foundation',
  'institute',
  'university',
  'research',
  'former',
  'current',
  'co-founder',
  'founder',
  'director',
  'president',
  'ceo',
  'cto',
])

// Create a word-boundary regex for an org name
function createOrgRegex(orgName) {
  // Escape special regex characters
  const escaped = orgName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Match with word boundaries (or start/end of string)
  return new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?:[^a-zA-Z0-9]|$)`, 'i')
}

async function main() {
  console.log('Phase 3 - Step 3: Extract Edges from other_orgs')
  console.log('================================================')
  console.log(`Mode: ${analyzeOnly ? 'ANALYZE ONLY' : dryRun ? 'DRY RUN' : 'EXECUTE'}\n`)

  const client = await pool.connect()

  try {
    // Get all existing orgs for matching
    const orgs = await client.query(`
      SELECT id, name FROM entity
      WHERE entity_type = 'organization' AND status = 'approved'
    `)

    // Filter orgs suitable for matching
    const matchableOrgs = orgs.rows.filter((o) => {
      const nameLower = o.name.toLowerCase()
      // Must be long enough
      if (o.name.length < MIN_ORG_NAME_LENGTH) return false
      // Must not be in blocklist
      if (BLOCKLIST.has(nameLower)) return false
      return true
    })

    console.log(`Total orgs: ${orgs.rows.length}`)
    console.log(
      `Matchable orgs (${MIN_ORG_NAME_LENGTH}+ chars, not blocklisted): ${matchableOrgs.length}\n`,
    )

    // Get all people with other_orgs
    const people = await client.query(`
      SELECT p.id, p.name, p.other_orgs,
             array_agg(DISTINCT e.target_id) FILTER (WHERE e.target_id IS NOT NULL) as current_org_ids
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

    console.log(`People with other_orgs: ${people.rows.length}\n`)

    // Find matches
    const proposedEdges = []
    const matchDetails = []

    for (const person of people.rows) {
      const otherOrgs = person.other_orgs
      const currentOrgIds = new Set(person.current_org_ids || [])
      const matches = []

      for (const org of matchableOrgs) {
        // Skip if already connected
        if (currentOrgIds.has(org.id)) continue

        // Try strict word-boundary match
        const regex = createOrgRegex(org.name)
        if (regex.test(otherOrgs)) {
          // Found a match - extract context
          const matchIndex = otherOrgs.toLowerCase().indexOf(org.name.toLowerCase())
          const contextStart = Math.max(0, matchIndex - 20)
          const contextEnd = Math.min(otherOrgs.length, matchIndex + org.name.length + 20)
          const context = otherOrgs.substring(contextStart, contextEnd)

          matches.push({
            orgId: org.id,
            orgName: org.name,
            context: context,
          })
        }
      }

      if (matches.length > 0) {
        for (const m of matches) {
          proposedEdges.push({
            personId: person.id,
            personName: person.name,
            orgId: m.orgId,
            orgName: m.orgName,
            context: m.context,
          })
        }

        matchDetails.push({
          person,
          matches,
        })
      }
    }

    // Generate review file
    const reviewContent = generateReviewFile(matchDetails, proposedEdges)
    const reviewPath = 'data/phase3-edge-review.md'
    fs.writeFileSync(reviewPath, reviewContent)
    console.log(`Review file written to: ${reviewPath}\n`)

    // Summary
    console.log('================================================')
    console.log('SUMMARY')
    console.log('================================================')
    console.log(`People with matches: ${matchDetails.length}`)
    console.log(`Total proposed edges: ${proposedEdges.length}`)
    console.log(`Review file: ${reviewPath}`)

    if (analyzeOnly) {
      console.log('\nAnalysis complete. Review the file before proceeding.')
      console.log('Next: node scripts/extract-other-orgs-edges.js --dry-run')
      return
    }

    // Show sample of proposed edges
    console.log('\n================================================')
    console.log('SAMPLE PROPOSED EDGES (first 20)')
    console.log('================================================\n')

    for (const edge of proposedEdges.slice(0, 20)) {
      console.log(`[${edge.personId}] ${edge.personName}`)
      console.log(`    → [${edge.orgId}] ${edge.orgName}`)
      console.log(`    Context: "...${edge.context}..."`)
      console.log('')
    }

    if (proposedEdges.length > 20) {
      console.log(`... and ${proposedEdges.length - 20} more proposed edges\n`)
    }

    // Execute if not dry run
    if (!dryRun) {
      console.log('================================================')
      console.log('CREATING EDGES')
      console.log('================================================\n')

      let created = 0
      let skipped = 0

      for (const edge of proposedEdges) {
        try {
          await client.query(
            `
            INSERT INTO edge (source_id, target_id, edge_type, is_primary, created_by)
            VALUES ($1, $2, 'affiliated', false, 'phase3-other-orgs')
            ON CONFLICT (source_id, target_id, edge_type) DO NOTHING
          `,
            [edge.personId, edge.orgId],
          )
          created++
        } catch (err) {
          console.log(`  ✗ Failed: ${edge.personName} → ${edge.orgName}: ${err.message}`)
          skipped++
        }
      }

      console.log(`Created: ${created} edges`)
      console.log(`Skipped/Failed: ${skipped} edges`)

      // Final count
      const edgeCount = await client.query('SELECT COUNT(*)::int as cnt FROM edge')
      console.log(`\nTotal edges in database: ${edgeCount.rows[0].cnt}`)
    } else {
      console.log('\nTo execute, run:')
      console.log('  node scripts/extract-other-orgs-edges.js --execute')
    }
  } finally {
    client.release()
    await pool.end()
  }
}

function generateReviewFile(matchDetails, proposedEdges) {
  let content = `# Phase 3: other_orgs Edge Extraction Review\n\n`
  content += `Generated: ${new Date().toISOString()}\n\n`
  content += `## Summary\n\n`
  content += `- People with matches: ${matchDetails.length}\n`
  content += `- Total proposed edges: ${proposedEdges.length}\n\n`
  content += `## Review Instructions\n\n`
  content += `Look for false positives - cases where the org name appears in text but doesn't indicate affiliation.\n\n`
  content += `---\n\n`
  content += `## Proposed Edges\n\n`

  for (const detail of matchDetails) {
    content += `### [${detail.person.id}] ${detail.person.name}\n\n`
    content += `**other_orgs:** ${detail.person.other_orgs}\n\n`
    content += `**Proposed edges:**\n`
    for (const m of detail.matches) {
      content += `- → [${m.orgId}] **${m.orgName}**\n`
      content += `  - Context: "...${m.context}..."\n`
    }
    content += `\n---\n\n`
  }

  return content
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
