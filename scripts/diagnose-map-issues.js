/**
 * Comprehensive diagnostic for map rendering issues
 * Finds all potential problems that could cause edges without visible nodes
 */
import pg from 'pg'
import fs from 'fs'
import 'dotenv/config'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  const client = await pool.connect()

  console.log('MAP DIAGNOSTIC REPORT')
  console.log('=====================\n')

  // Load map-data.json for comparison
  const mapData = JSON.parse(fs.readFileSync('map-data.json', 'utf-8'))
  const exportedIds = new Set([
    ...mapData.people.map((p) => p.id),
    ...mapData.organizations.map((o) => o.id),
    ...mapData.resources.map((r) => r.id),
  ])

  console.log('Exported entities:', exportedIds.size)
  console.log('Exported edges:', mapData.edges.length)
  console.log('')

  // 1. Find edges in DB pointing to non-approved entities
  console.log('1. EDGES TO NON-APPROVED ENTITIES')
  console.log('----------------------------------')
  const badEdges = await client.query(`
    SELECT e.id, e.source_id, e.target_id, e.edge_type,
           s.name as source_name, s.status as source_status, s.entity_type as source_type,
           t.name as target_name, t.status as target_status, t.entity_type as target_type
    FROM edge e
    JOIN entity s ON s.id = e.source_id
    JOIN entity t ON t.id = e.target_id
    WHERE s.status != 'approved' OR t.status != 'approved'
  `)

  if (badEdges.rows.length > 0) {
    console.log(`   ⚠ Found ${badEdges.rows.length} edges involving non-approved entities:`)
    for (const e of badEdges.rows.slice(0, 10)) {
      console.log(
        `   Edge ${e.id}: ${e.source_name} (${e.source_status}) → ${e.target_name} (${e.target_status})`,
      )
    }
    if (badEdges.rows.length > 10) console.log(`   ... and ${badEdges.rows.length - 10} more`)
  } else {
    console.log('   ✓ All edges connect approved entities')
  }
  console.log('')

  // 2. Find edges in map-data.json that reference non-exported entities
  console.log('2. EDGES IN EXPORT REFERENCING MISSING ENTITIES')
  console.log('------------------------------------------------')
  let missingInExport = 0
  for (const edge of mapData.edges) {
    if (!exportedIds.has(edge.source_id) || !exportedIds.has(edge.target_id)) {
      missingInExport++
      if (missingInExport <= 10) {
        console.log(
          `   Edge ${edge.id}: source=${edge.source_id} (${exportedIds.has(edge.source_id) ? 'ok' : 'MISSING'}), target=${edge.target_id} (${exportedIds.has(edge.target_id) ? 'ok' : 'MISSING'})`,
        )
      }
    }
  }
  if (missingInExport > 10) console.log(`   ... and ${missingInExport - 10} more`)
  if (missingInExport === 0) console.log('   ✓ All exported edges reference exported entities')
  console.log('')

  // 3. Check specific orgs: Democratic Party, Republican Party
  console.log('3. POLITICAL PARTY ANALYSIS')
  console.log('---------------------------')
  const parties = ['Democratic Party', 'Republican Party']

  for (const partyName of parties) {
    const party = await client.query(`SELECT id, name, status FROM entity WHERE name = $1`, [
      partyName,
    ])

    if (party.rows.length === 0) {
      console.log(`   ⚠ "${partyName}" not found in DB`)
      continue
    }

    const p = party.rows[0]
    console.log(`   ${p.name} [${p.id}] (${p.status})`)

    // Get all edges
    const edges = await client.query(
      `
      SELECT e.*,
             s.name as source_name, s.status as source_status,
             t.name as target_name, t.status as target_status
      FROM edge e
      JOIN entity s ON s.id = e.source_id
      JOIN entity t ON t.id = e.target_id
      WHERE e.source_id = $1 OR e.target_id = $1
    `,
      [p.id],
    )

    console.log(`     Edges in DB: ${edges.rows.length}`)

    // Check how many are in the export
    const partyEdgesInExport = mapData.edges.filter(
      (e) => e.source_id === p.id || e.target_id === p.id,
    )
    console.log(`     Edges in export: ${partyEdgesInExport.length}`)

    // Show connections
    for (const e of edges.rows.slice(0, 5)) {
      const other =
        e.source_id === p.id
          ? { name: e.target_name, status: e.target_status, id: e.target_id }
          : { name: e.source_name, status: e.source_status, id: e.source_id }
      const inExport = exportedIds.has(other.id) ? '✓' : '✗'
      console.log(`     ${inExport} → ${other.name} (${other.status})`)
    }
    if (edges.rows.length > 5) console.log(`     ... and ${edges.rows.length - 5} more`)
    console.log('')
  }

  // 4. Find all entities with edges where the connected entity isn't exported
  console.log('4. ENTITIES WITH BROKEN EDGE TARGETS')
  console.log('-------------------------------------')
  const allEdges = await client.query(`
    SELECT e.source_id, e.target_id,
           s.name as source_name, s.status as source_status,
           t.name as target_name, t.status as target_status
    FROM edge e
    JOIN entity s ON s.id = e.source_id
    JOIN entity t ON t.id = e.target_id
  `)

  const brokenTargets = new Map()
  for (const e of allEdges.rows) {
    // Check if target is in export but source isn't, or vice versa
    const sourceExported = exportedIds.has(e.source_id)
    const targetExported = exportedIds.has(e.target_id)

    if (sourceExported && !targetExported) {
      if (!brokenTargets.has(e.target_id)) {
        brokenTargets.set(e.target_id, { name: e.target_name, status: e.target_status, count: 0 })
      }
      brokenTargets.get(e.target_id).count++
    }
    if (targetExported && !sourceExported) {
      if (!brokenTargets.has(e.source_id)) {
        brokenTargets.set(e.source_id, { name: e.source_name, status: e.source_status, count: 0 })
      }
      brokenTargets.get(e.source_id).count++
    }
  }

  if (brokenTargets.size > 0) {
    console.log(`   ⚠ Found ${brokenTargets.size} entities referenced by edges but not exported:`)
    const sorted = [...brokenTargets.entries()].sort((a, b) => b[1].count - a[1].count)
    for (const [id, info] of sorted.slice(0, 15)) {
      console.log(`   [${id}] ${info.name} (${info.status}) - ${info.count} edges`)
    }
  } else {
    console.log('   ✓ No broken edge targets')
  }
  console.log('')

  // 5. Check for duplicate edges
  console.log('5. DUPLICATE EDGES')
  console.log('------------------')
  const dupeEdges = await client.query(`
    SELECT source_id, target_id, edge_type, COUNT(*) as cnt
    FROM edge
    GROUP BY source_id, target_id, edge_type
    HAVING COUNT(*) > 1
  `)

  if (dupeEdges.rows.length > 0) {
    console.log(`   ⚠ Found ${dupeEdges.rows.length} duplicate edge combinations`)
  } else {
    console.log('   ✓ No duplicate edges')
  }
  console.log('')

  // 6. Check for self-referential edges
  console.log('6. SELF-REFERENTIAL EDGES')
  console.log('-------------------------')
  const selfEdges = await client.query(`
    SELECT e.*, s.name FROM edge e JOIN entity s ON s.id = e.source_id
    WHERE e.source_id = e.target_id
  `)

  if (selfEdges.rows.length > 0) {
    console.log(`   ⚠ Found ${selfEdges.rows.length} self-referential edges:`)
    for (const e of selfEdges.rows) {
      console.log(`   [${e.id}] ${e.name} → itself (${e.edge_type})`)
    }
  } else {
    console.log('   ✓ No self-referential edges')
  }
  console.log('')

  // 7. Policymakers without government org connections
  console.log('7. POLICYMAKERS WITHOUT GOVERNMENT CONNECTIONS')
  console.log('----------------------------------------------')
  const policymakers = await client.query(`
    SELECT p.id, p.name, p.primary_org,
           COUNT(e.id) as edge_count,
           COUNT(CASE WHEN o.category = 'Government/Agency' THEN 1 END) as gov_edges
    FROM entity p
    LEFT JOIN edge e ON e.source_id = p.id
    LEFT JOIN entity o ON o.id = e.target_id AND o.entity_type = 'organization'
    WHERE p.entity_type = 'person' AND p.category = 'Policymaker' AND p.status = 'approved'
    GROUP BY p.id
    HAVING COUNT(CASE WHEN o.category = 'Government/Agency' THEN 1 END) = 0
    ORDER BY p.name
  `)

  console.log(`   Policymakers with no government org edges: ${policymakers.rows.length}`)
  for (const p of policymakers.rows.slice(0, 10)) {
    console.log(
      `   [${p.id}] ${p.name} (${p.edge_count} total edges, primary_org: ${p.primary_org || 'null'})`,
    )
  }
  if (policymakers.rows.length > 10) console.log(`   ... and ${policymakers.rows.length - 10} more`)
  console.log('')

  // 8. Summary
  console.log('=====================')
  console.log('ISSUES SUMMARY')
  console.log('=====================')
  console.log(`Edges to non-approved entities: ${badEdges.rows.length}`)
  console.log(`Edges in export with missing targets: ${missingInExport}`)
  console.log(`Entities with broken edge targets: ${brokenTargets.size}`)
  console.log(`Duplicate edges: ${dupeEdges.rows.length}`)
  console.log(`Self-referential edges: ${selfEdges.rows.length}`)

  client.release()
  await pool.end()
}

main().catch(console.error)
