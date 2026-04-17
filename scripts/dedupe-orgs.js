import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// Duplicate groups: array of [canonicalName, ...variantNames]
const DUPLICATE_GROUPS = [
  // 1. CHAI / UC Berkeley AI Safety
  [
    'Center for Human-Compatible AI (CHAI)',
    'Center for Human-Compatible AI',
    'Center for Human-Compatible AI (CHAI) - UC Berkeley',
    'Center for Human-Compatible Artificial Intelligence (CHAI) - UC Berkeley',
    'Berkeley CHAI',
  ],
  // 2. UK AI Safety/Security Institute
  [
    'UK AI Security Institute',
    'UK AI Safety Institute',
    'AI Security Institute (AISI)',
    'AI Security Institute (UK government)',
    'AI Security Institute (formerly UK AI Safety Institute)',
  ],
  // 3. NIST AI Institute
  [
    'U.S. AI Safety Institute (NIST)',
    'NIST AI Safety Institute',
    'NIST AI Safety Institute (CAISI)',
    'NIST AI Safety Institute (Center for AI Standards and Innovation - CAISI)',
    'Center for AI Standards and Innovation',
    'Center for AI Standards and Innovation (CAISI)',
    'Center for AI Standards and Innovation (CAISI) - NIST',
  ],
  // 4. Open Philanthropy / Coefficient Giving
  [
    'Coefficient Giving (formerly Open Philanthropy)',
    'Open Philanthropy',
    'Coefficient Giving',
    'Coefficient Giving (fka Open Philanthropy)',
  ],
  // 5. MIRI
  [
    'Machine Intelligence Research Institute (MIRI)',
    'MIRI',
    'Machine Intelligence Research Institute',
  ],
  // 6. ARC
  ['Alignment Research Center (ARC)', 'Alignment Research Center', 'ARC'],
  // 7. CSET
  [
    'Center for Security and Emerging Technology (CSET)',
    'Georgetown CSET',
    'Center for Security and Emerging Technology (Georgetown University)',
  ],
  // 8. GovAI
  ['Centre for the Governance of AI (GovAI)', 'Centre for the Governance of AI', 'GovAI'],
  // 9. FHI
  [
    'Future of Humanity Institute (closed 2024)',
    'Future of Humanity Institute',
    'Future of Humanity Institute (Oxford University) - CLOSED 2024',
    'Oxford Future of Humanity Institute (legacy)',
  ],
  // 10. CAIS
  ['Center for AI Safety (CAIS)', 'Center for AI Safety', 'CAIS'],
  // 11. Stanford HAI
  ['Stanford HAI', 'Stanford Institute for Human-Centered Artificial Intelligence (HAI)'],
  // 12. Brookings
  [
    'Brookings Institution',
    'Brookings Institution (AI Governance)',
    'Brookings Institution (Artificial Intelligence and Emerging Technology Initiative)',
  ],
  // 13. a16z
  ['Andreessen Horowitz (a16z)', 'a16z', 'a16z (Andreessen Horowitz)'],
  // 14. Stanford RegLab
  ['Stanford RegLab', 'Stanford RegLab (Regulation, Evaluation, and Governance Lab)'],
]

const DRY_RUN = process.argv.includes('--dry-run')

async function dedupe() {
  const client = await pool.connect()

  try {
    console.log(`Organization Deduplication ${DRY_RUN ? '(DRY RUN)' : ''}\n`)
    console.log('='.repeat(60) + '\n')

    let totalDeleted = 0
    let totalEdgesUpdated = 0
    let totalPrimaryOrgUpdated = 0

    for (const group of DUPLICATE_GROUPS) {
      const [canonicalName, ...variants] = group

      // Find canonical org
      const { rows: canonicalRows } = await client.query(
        `SELECT id, name FROM entity WHERE entity_type = 'organization' AND name = $1`,
        [canonicalName],
      )

      // Find all variants that exist
      const allNames = [canonicalName, ...variants]
      const { rows: allOrgs } = await client.query(
        `SELECT id, name FROM entity WHERE entity_type = 'organization' AND name = ANY($1)`,
        [allNames],
      )

      if (allOrgs.length === 0) {
        console.log(`⚪ ${canonicalName}: no matches found\n`)
        continue
      }

      if (allOrgs.length === 1) {
        const existing = allOrgs[0]
        if (existing.name !== canonicalName) {
          // Single variant exists but with wrong name - rename it
          console.log(`🔄 ${existing.name}`)
          console.log(`   → Rename to: ${canonicalName}`)
          if (!DRY_RUN) {
            await client.query(`UPDATE entity SET name = $1, updated_at = NOW() WHERE id = $2`, [
              canonicalName,
              existing.id,
            ])
          }
          console.log('')
        } else {
          console.log(`✓ ${canonicalName}: already canonical (id=${existing.id})\n`)
        }
        continue
      }

      // Multiple entries exist - need to merge
      console.log(`🔀 Merging group: ${canonicalName}`)
      console.log(`   Found ${allOrgs.length} entries:`)
      allOrgs.forEach((o) => console.log(`     - id=${o.id}: "${o.name}"`))

      // Determine canonical: prefer the one with canonical name, else lowest ID
      let canonical = canonicalRows[0]
      if (!canonical) {
        // Canonical name doesn't exist - rename lowest ID variant
        canonical = allOrgs.sort((a, b) => a.id - b.id)[0]
        console.log(`   → No exact match for canonical, using id=${canonical.id}`)
        if (!DRY_RUN) {
          await client.query(`UPDATE entity SET name = $1, updated_at = NOW() WHERE id = $2`, [
            canonicalName,
            canonical.id,
          ])
        }
      }

      const canonicalId = canonical.id
      const duplicateIds = allOrgs.filter((o) => o.id !== canonicalId).map((o) => o.id)

      console.log(`   → Canonical: id=${canonicalId}`)
      console.log(`   → Duplicates to merge: [${duplicateIds.join(', ')}]`)

      // Update edges: source_id
      const { rowCount: sourceEdges } = await client.query(
        `UPDATE edge SET source_id = $1 WHERE source_id = ANY($2)${DRY_RUN ? ' AND FALSE' : ''}`,
        [canonicalId, duplicateIds],
      )
      if (!DRY_RUN && sourceEdges > 0) {
        totalEdgesUpdated += sourceEdges
        console.log(`   → Updated ${sourceEdges} edges (source_id)`)
      }

      // Update edges: target_id
      const { rowCount: targetEdges } = await client.query(
        `UPDATE edge SET target_id = $1 WHERE target_id = ANY($2)${DRY_RUN ? ' AND FALSE' : ''}`,
        [canonicalId, duplicateIds],
      )
      if (!DRY_RUN && targetEdges > 0) {
        totalEdgesUpdated += targetEdges
        console.log(`   → Updated ${targetEdges} edges (target_id)`)
      }

      // Update parent_org_id references
      const { rowCount: parentRefs } = await client.query(
        `UPDATE entity SET parent_org_id = $1 WHERE parent_org_id = ANY($2)${DRY_RUN ? ' AND FALSE' : ''}`,
        [canonicalId, duplicateIds],
      )
      if (!DRY_RUN && parentRefs > 0) {
        console.log(`   → Updated ${parentRefs} parent_org_id references`)
      }

      // Update primary_org text references (match by name)
      for (const dupId of duplicateIds) {
        const dupOrg = allOrgs.find((o) => o.id === dupId)
        if (dupOrg) {
          const { rowCount: primaryOrgRefs } = await client.query(
            `UPDATE entity SET primary_org = $1, updated_at = NOW()
             WHERE entity_type = 'person' AND primary_org = $2${DRY_RUN ? ' AND FALSE' : ''}`,
            [canonicalName, dupOrg.name],
          )
          if (!DRY_RUN && primaryOrgRefs > 0) {
            totalPrimaryOrgUpdated += primaryOrgRefs
            console.log(`   → Updated ${primaryOrgRefs} primary_org refs from "${dupOrg.name}"`)
          }
        }
      }

      // Check for duplicate edge conflicts before deleting
      if (!DRY_RUN) {
        // Remove duplicate edges that would violate unique constraint
        await client.query(`
          DELETE FROM edge e1
          USING edge e2
          WHERE e1.id > e2.id
            AND e1.source_id = e2.source_id
            AND e1.target_id = e2.target_id
            AND e1.edge_type = e2.edge_type
        `)
      }

      // Delete duplicate orgs
      if (!DRY_RUN) {
        const { rowCount: deleted } = await client.query(`DELETE FROM entity WHERE id = ANY($1)`, [
          duplicateIds,
        ])
        totalDeleted += deleted
        console.log(`   → Deleted ${deleted} duplicate(s)`)
      } else {
        console.log(`   → Would delete ${duplicateIds.length} duplicate(s)`)
        totalDeleted += duplicateIds.length
      }

      console.log('')
    }

    console.log('='.repeat(60))
    console.log(`\nSummary ${DRY_RUN ? '(DRY RUN - no changes made)' : ''}:`)
    console.log(`  Organizations deleted: ${totalDeleted}`)
    if (!DRY_RUN) {
      console.log(`  Edges updated: ${totalEdgesUpdated}`)
      console.log(`  Primary org refs updated: ${totalPrimaryOrgUpdated}`)
    }

    // Final org count
    const {
      rows: [{ count }],
    } = await client.query(
      `SELECT COUNT(*) FROM entity WHERE entity_type = 'organization' AND status = 'approved'`,
    )
    console.log(`  Current org count: ${count}`)
  } finally {
    client.release()
    await pool.end()
  }
}

dedupe().catch((err) => {
  console.error('Deduplication failed:', err)
  process.exit(1)
})
