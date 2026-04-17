/**
 * Verify database integrity after changes
 */
import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function verify() {
  const client = await pool.connect()

  console.log('DATABASE INTEGRITY CHECK')
  console.log('========================\n')

  // 1. Orphaned edges check
  console.log('1. ORPHANED EDGES CHECK')
  const orphanedSource = await client.query(`
    SELECT e.id, e.source_id, e.target_id, e.edge_type
    FROM edge e LEFT JOIN entity s ON s.id = e.source_id WHERE s.id IS NULL
  `)
  const orphanedTarget = await client.query(`
    SELECT e.id, e.source_id, e.target_id, e.edge_type
    FROM edge e LEFT JOIN entity t ON t.id = e.target_id WHERE t.id IS NULL
  `)

  if (orphanedSource.rows.length === 0 && orphanedTarget.rows.length === 0) {
    console.log('   ✓ No orphaned edges')
  } else {
    console.log('   ⚠ ORPHANED EDGES FOUND:')
    for (const e of [...orphanedSource.rows, ...orphanedTarget.rows]) {
      console.log(`     Edge ${e.id}: ${e.source_id} -> ${e.target_id}`)
    }
  }

  // 2. Verify new parent orgs exist
  console.log('\n2. NEW PARENT ORGS CHECK')
  const newParents = await client.query(`
    SELECT id, name FROM entity
    WHERE name IN ('Stanford University', 'Massachusetts Institute of Technology',
                   'Harvard University', 'Princeton University', 'University of Cambridge',
                   'University of Oxford', 'UC Berkeley', 'New York University')
    AND entity_type = 'organization'
  `)
  for (const p of newParents.rows) {
    console.log(`   ✓ [${p.id}] ${p.name}`)
  }

  // 3. Verify subsidiary_of edges were created
  console.log('\n3. SUBSIDIARY_OF EDGES')
  const subEdges = await client.query(`
    SELECT s.name as child, t.name as parent
    FROM edge e
    JOIN entity s ON s.id = e.source_id
    JOIN entity t ON t.id = e.target_id
    WHERE e.edge_type = 'subsidiary_of'
    ORDER BY t.name, s.name
  `)
  console.log(`   Found ${subEdges.rows.length} subsidiary_of edges`)

  // Group by parent
  const byParent = new Map()
  for (const e of subEdges.rows) {
    if (!byParent.has(e.parent)) byParent.set(e.parent, [])
    byParent.get(e.parent).push(e.child)
  }
  for (const [parent, children] of byParent) {
    console.log(`   ${parent}:`)
    for (const child of children) {
      console.log(`     └── ${child}`)
    }
  }

  // 4. Verify parent_org_id is set
  console.log('\n4. PARENT_ORG_ID CHECK')
  const withParent = await client.query(`
    SELECT COUNT(*)::int as cnt FROM entity WHERE parent_org_id IS NOT NULL
  `)
  console.log(`   Entities with parent_org_id set: ${withParent.rows[0].cnt}`)

  // 5. Spot check key people still have edges
  console.log('\n5. SPOT CHECK: Key people edges')
  const spotChecks = ['Dario Amodei', 'Casey Newton', 'Sam Altman', 'Fei-Fei Li']

  for (const name of spotChecks) {
    const result = await client.query(
      `
      SELECT p.name as person, o.name as org, e.edge_type
      FROM entity p
      JOIN edge e ON e.source_id = p.id
      JOIN entity o ON o.id = e.target_id
      WHERE p.name ILIKE $1 AND p.entity_type = 'person'
    `,
      [`%${name}%`],
    )

    if (result.rows.length > 0) {
      console.log(`   ✓ ${name}:`)
      for (const r of result.rows) {
        console.log(`       → ${r.org} (${r.edge_type})`)
      }
    } else {
      console.log(`   ⚠ ${name}: NO EDGES (pre-existing issue)`)
    }
  }

  // 6. Check for any broken parent_org_id references
  console.log('\n6. BROKEN PARENT_ORG_ID REFERENCES')
  const brokenParent = await client.query(`
    SELECT e.id, e.name, e.parent_org_id
    FROM entity e
    WHERE e.parent_org_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM entity p WHERE p.id = e.parent_org_id)
  `)
  if (brokenParent.rows.length === 0) {
    console.log('   ✓ No broken parent_org_id references')
  } else {
    console.log('   ⚠ BROKEN REFERENCES:')
    for (const e of brokenParent.rows) {
      console.log(`     [${e.id}] ${e.name} points to non-existent parent ${e.parent_org_id}`)
    }
  }

  // 7. Final counts
  console.log('\n7. FINAL ENTITY COUNTS')
  const counts = await client.query(`
    SELECT entity_type, COUNT(*)::int as cnt
    FROM entity WHERE status = 'approved'
    GROUP BY entity_type
  `)
  for (const row of counts.rows) {
    console.log(`   ${row.entity_type}: ${row.cnt}`)
  }
  const edgeCount = await client.query('SELECT COUNT(*)::int as cnt FROM edge')
  console.log(`   edges: ${edgeCount.rows[0].cnt}`)

  console.log('\n========================')
  console.log('INTEGRITY CHECK COMPLETE')
  console.log('========================')

  client.release()
  await pool.end()
}

verify().catch((err) => {
  console.error('Verification failed:', err)
  process.exit(1)
})
