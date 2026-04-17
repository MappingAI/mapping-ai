/**
 * Phase 0: Org Cleanup Script
 *
 * Step 1: Merge duplicate orgs (same name ± abbreviation)
 * Step 2: Create parent orgs (Stanford University, MIT, etc.)
 * Step 3: Set parent_org_id on sub-orgs
 * Step 4: Create subsidiary_of edges for visibility
 *
 * Usage:
 *   node scripts/cleanup-orgs.js --dry-run              # Show what would happen (default)
 *   node scripts/cleanup-orgs.js --dry-run --limit=3    # Test with 3 duplicate clusters
 *   node scripts/cleanup-orgs.js --execute              # Actually do it
 *   node scripts/cleanup-orgs.js --execute --step=1     # Only run step 1
 */
import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const args = process.argv.slice(2)
const dryRun = !args.includes('--execute')
const limitArg = args.find((a) => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null
const stepArg = args.find((a) => a.startsWith('--step='))
const onlyStep = stepArg ? parseInt(stepArg.split('=')[1], 10) : null

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// Parent orgs to create (if they don't exist)
const PARENT_ORGS = [
  { name: 'Stanford University', category: 'Academic', website: 'https://stanford.edu' },
  {
    name: 'Massachusetts Institute of Technology',
    category: 'Academic',
    website: 'https://mit.edu',
  },
  { name: 'Harvard University', category: 'Academic', website: 'https://harvard.edu' },
  { name: 'Princeton University', category: 'Academic', website: 'https://princeton.edu' },
  { name: 'University of Cambridge', category: 'Academic', website: 'https://cam.ac.uk' },
  { name: 'University of Oxford', category: 'Academic', website: 'https://ox.ac.uk' },
]

// Sub-org to parent mappings (sub-org name pattern → parent name)
const PARENT_MAPPINGS = [
  // Stanford
  { pattern: /^Stanford\s/i, parent: 'Stanford University', exclude: ['Stanford University'] },
  // MIT
  {
    pattern: /^MIT\s/i,
    parent: 'Massachusetts Institute of Technology',
    exclude: ['Massachusetts Institute of Technology', 'MIT Technology Review'],
  },
  // Harvard
  { pattern: /^Harvard\s/i, parent: 'Harvard University', exclude: ['Harvard University'] },
  // Princeton
  { pattern: /^Princeton\s/i, parent: 'Princeton University', exclude: ['Princeton University'] },
  // Cambridge
  {
    pattern: /Cambridge/i,
    parent: 'University of Cambridge',
    exclude: ['University of Cambridge', 'Cambridge Boston Alignment Initiative'],
  },
  // Leverhulme (Cambridge)
  { pattern: /^Leverhulme/i, parent: 'University of Cambridge', exclude: [] },
  // Oxford
  { pattern: /Oxford/i, parent: 'University of Oxford', exclude: ['University of Oxford'] },
  // 80,000 Hours
  { pattern: /^80,000 Hours/i, parent: '80,000 Hours', exclude: ['80,000 Hours'] },
  // Nonlinear
  { pattern: /^Nonlinear/i, parent: 'Nonlinear', exclude: ['Nonlinear'] },
  // Anthropic
  { pattern: /^Anthropic/i, parent: 'Anthropic', exclude: ['Anthropic'] },
]

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: MERGE DUPLICATES
// ═══════════════════════════════════════════════════════════════════════════════

async function mergeDuplicates(client) {
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('STEP 1: MERGE DUPLICATE ORGS')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Find duplicates: same base name with/without abbreviation
  const orgs = await client.query(`
    SELECT id, name, category, website
    FROM entity
    WHERE entity_type = 'organization' AND status = 'approved'
    ORDER BY name
  `)

  const duplicates = []
  const seen = new Map()

  for (const org of orgs.rows) {
    // Extract base name (without parenthetical abbreviation)
    const match = org.name.match(/^(.+?)\s*\(([A-Z]{2,})\)$/)
    const baseName = match ? match[1].trim() : org.name

    const key = baseName.toLowerCase()
    if (seen.has(key)) {
      seen.get(key).push(org)
    } else {
      seen.set(key, [org])
    }
  }

  // Collect duplicate clusters
  for (const [key, group] of seen) {
    if (group.length > 1) {
      duplicates.push(group)
    }
  }

  // Apply limit if specified
  const toProcess = limit ? duplicates.slice(0, limit) : duplicates

  console.log(`Found ${duplicates.length} duplicate clusters`)
  if (limit) console.log(`Processing first ${limit} only\n`)

  let mergedCount = 0
  let edgesUpdated = 0

  for (const group of toProcess) {
    // Keep the one with abbreviation (more canonical), or first one
    const withAbbrev = group.find((o) => /\([A-Z]{2,}\)$/.test(o.name))
    const keep = withAbbrev || group[0]
    const toDelete = group.filter((o) => o.id !== keep.id)

    console.log(`\nMerging → [${keep.id}] ${keep.name}`)
    for (const del of toDelete) {
      console.log(`  ✗ [${del.id}] ${del.name} (will be deleted)`)

      // Check for edges pointing to/from the duplicate
      const edgesFrom = await client.query(
        'SELECT id, target_id, edge_type FROM edge WHERE source_id = $1',
        [del.id],
      )
      const edgesTo = await client.query(
        'SELECT id, source_id, edge_type FROM edge WHERE target_id = $1',
        [del.id],
      )

      if (edgesFrom.rows.length > 0 || edgesTo.rows.length > 0) {
        console.log(
          `    Edges to redirect: ${edgesFrom.rows.length} outgoing, ${edgesTo.rows.length} incoming`,
        )
      }

      if (!dryRun) {
        // Redirect edges FROM deleted org → keep org
        for (const edge of edgesFrom.rows) {
          try {
            await client.query('UPDATE edge SET source_id = $1 WHERE id = $2', [keep.id, edge.id])
            edgesUpdated++
          } catch (e) {
            // Might conflict with existing edge - delete instead
            await client.query('DELETE FROM edge WHERE id = $1', [edge.id])
          }
        }

        // Redirect edges TO deleted org → keep org
        for (const edge of edgesTo.rows) {
          try {
            await client.query('UPDATE edge SET target_id = $1 WHERE id = $2', [keep.id, edge.id])
            edgesUpdated++
          } catch (e) {
            // Might conflict with existing edge - delete instead
            await client.query('DELETE FROM edge WHERE id = $1', [edge.id])
          }
        }

        // Update any primary_org references in people
        await client.query('UPDATE entity SET primary_org = $1 WHERE primary_org = $2', [
          keep.name,
          del.name,
        ])

        // Delete the duplicate org
        await client.query('DELETE FROM entity WHERE id = $1', [del.id])
        mergedCount++
      }
    }
  }

  console.log(`\n${dryRun ? 'Would merge' : 'Merged'}: ${mergedCount} duplicate orgs`)
  console.log(`${dryRun ? 'Would update' : 'Updated'}: ${edgesUpdated} edges`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: CREATE PARENT ORGS
// ═══════════════════════════════════════════════════════════════════════════════

async function createParentOrgs(client) {
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('STEP 2: CREATE PARENT ORGS')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const existing = await client.query(`
    SELECT name FROM entity
    WHERE entity_type = 'organization' AND status = 'approved'
  `)
  const existingNames = new Set(existing.rows.map((r) => r.name.toLowerCase()))

  let created = 0
  for (const parent of PARENT_ORGS) {
    if (existingNames.has(parent.name.toLowerCase())) {
      console.log(`  ✓ ${parent.name} (already exists)`)
    } else {
      console.log(`  + ${parent.name} (${dryRun ? 'would create' : 'creating'})`)
      if (!dryRun) {
        await client.query(
          `
          INSERT INTO entity (entity_type, name, category, website, status)
          VALUES ('organization', $1, $2, $3, 'approved')
        `,
          [parent.name, parent.category, parent.website],
        )
        created++
      }
    }
  }

  console.log(`\n${dryRun ? 'Would create' : 'Created'}: ${created} parent orgs`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: SET PARENT_ORG_ID
// ═══════════════════════════════════════════════════════════════════════════════

async function setParentOrgIds(client) {
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('STEP 3: SET PARENT_ORG_ID ON SUB-ORGS')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Get all orgs with their IDs
  const orgs = await client.query(`
    SELECT id, name, parent_org_id
    FROM entity
    WHERE entity_type = 'organization' AND status = 'approved'
  `)

  const orgByName = new Map(orgs.rows.map((o) => [o.name.toLowerCase(), o]))
  const orgById = new Map(orgs.rows.map((o) => [o.id, o]))

  let updated = 0
  for (const org of orgs.rows) {
    // Skip if already has parent
    if (org.parent_org_id) continue

    // Find matching parent rule
    for (const mapping of PARENT_MAPPINGS) {
      if (mapping.pattern.test(org.name) && !mapping.exclude.includes(org.name)) {
        const parent = orgByName.get(mapping.parent.toLowerCase())
        if (parent && parent.id !== org.id) {
          console.log(`  [${org.id}] ${org.name}`)
          console.log(`      → parent: [${parent.id}] ${parent.name}`)

          if (!dryRun) {
            await client.query('UPDATE entity SET parent_org_id = $1 WHERE id = $2', [
              parent.id,
              org.id,
            ])
            updated++
          }
          break
        }
      }
    }
  }

  console.log(`\n${dryRun ? 'Would set' : 'Set'} parent_org_id on: ${updated} orgs`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4: CREATE SUBSIDIARY_OF EDGES
// ═══════════════════════════════════════════════════════════════════════════════

async function createSubsidiaryEdges(client) {
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('STEP 4: CREATE SUBSIDIARY_OF EDGES')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Find all orgs with parent_org_id set
  const orgsWithParent = await client.query(`
    SELECT o.id, o.name, o.parent_org_id, p.name as parent_name
    FROM entity o
    JOIN entity p ON p.id = o.parent_org_id
    WHERE o.entity_type = 'organization'
  `)

  // Check for existing edges
  const existingEdges = await client.query(`
    SELECT source_id, target_id FROM edge WHERE edge_type = 'subsidiary_of'
  `)
  const existingSet = new Set(existingEdges.rows.map((e) => `${e.source_id}-${e.target_id}`))

  let created = 0
  for (const org of orgsWithParent.rows) {
    const key = `${org.id}-${org.parent_org_id}`
    if (existingSet.has(key)) {
      console.log(`  ✓ ${org.name} → ${org.parent_name} (edge exists)`)
    } else {
      console.log(
        `  + ${org.name} → ${org.parent_name} (${dryRun ? 'would create' : 'creating'} edge)`,
      )
      if (!dryRun) {
        await client.query(
          `
          INSERT INTO edge (source_id, target_id, edge_type, created_by)
          VALUES ($1, $2, 'subsidiary_of', 'cleanup-orgs-script')
          ON CONFLICT (source_id, target_id, edge_type) DO NOTHING
        `,
          [org.id, org.parent_org_id],
        )
        created++
      }
    }
  }

  console.log(`\n${dryRun ? 'Would create' : 'Created'}: ${created} subsidiary_of edges`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('Phase 0: Org Cleanup')
  console.log('====================')
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'EXECUTE'}`)
  if (limit) console.log(`Limit: ${limit} clusters`)
  if (onlyStep) console.log(`Only running step: ${onlyStep}`)

  const client = await pool.connect()

  try {
    if (!onlyStep || onlyStep === 1) await mergeDuplicates(client)
    if (!onlyStep || onlyStep === 2) await createParentOrgs(client)
    if (!onlyStep || onlyStep === 3) await setParentOrgIds(client)
    if (!onlyStep || onlyStep === 4) await createSubsidiaryEdges(client)

    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log(dryRun ? 'DRY RUN COMPLETE - No changes made' : 'COMPLETE')
    console.log('═══════════════════════════════════════════════════════════════')

    if (dryRun) {
      console.log('\nTo execute, run:')
      console.log('  node scripts/cleanup-orgs.js --execute')
      if (limit) {
        console.log(`\nOr to execute just these ${limit} clusters:`)
        console.log(`  node scripts/cleanup-orgs.js --execute --limit=${limit}`)
      }
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Cleanup failed:', err)
  process.exit(1)
})
