const pg = require('pg')
const fs = require('fs')
require('dotenv').config()

// Production database connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function migrate() {
  console.log('=== MIGRATION: Staging → Production ===\n')
  console.log('Strategy: Modified Approach A')
  console.log('- REPLACE entity table from staging')
  console.log('- REPLACE edge table from staging')
  console.log('- PRESERVE submission table (untouched)\n')

  // Load staging backup data
  const entities = JSON.parse(
    fs.readFileSync('backups/staging-20260415-with-importance/entities.json'),
  )
  const edges = JSON.parse(fs.readFileSync('backups/staging-20260415-with-importance/edges.json'))

  // Dedupe edges before insertion (staging backup may have duplicates)
  const edgeKeys = new Set()
  const uniqueEdges = []
  for (const edge of edges) {
    const key = edge.source_id + '-' + edge.target_id + '-' + edge.edge_type
    if (!edgeKeys.has(key)) {
      edgeKeys.add(key)
      uniqueEdges.push(edge)
    }
  }

  console.log('Staging data loaded:')
  console.log('  Entities:', entities.length)
  console.log('  Edges (raw):', edges.length)
  console.log('  Edges (unique):', uniqueEdges.length)
  if (edges.length !== uniqueEdges.length) {
    console.log('  Duplicates removed:', edges.length - uniqueEdges.length)
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Temporarily disable FK constraints on entity table
    console.log('\n[0/5] Temporarily disabling FK constraints...')
    await client.query('ALTER TABLE entity DROP CONSTRAINT IF EXISTS entity_parent_org_id_fkey')
    await client.query('ALTER TABLE edge DROP CONSTRAINT IF EXISTS edge_source_id_fkey')
    await client.query('ALTER TABLE edge DROP CONSTRAINT IF EXISTS edge_target_id_fkey')
    await client.query('ALTER TABLE submission DROP CONSTRAINT IF EXISTS submission_entity_id_fkey')
    console.log('  Constraints disabled')

    // Step 1: Clear edge table first
    console.log('\n[1/5] Clearing edge table...')
    const edgeDeleteResult = await client.query('DELETE FROM edge')
    console.log('  Deleted', edgeDeleteResult.rowCount, 'edges')

    // Step 2: Clear entity table
    console.log('\n[2/5] Clearing entity table...')
    await client.query('UPDATE submission SET entity_id = NULL WHERE entity_id IS NOT NULL')
    const entityDeleteResult = await client.query('DELETE FROM entity')
    console.log('  Deleted', entityDeleteResult.rowCount, 'entities')

    // Step 3: Insert entities from staging
    console.log('\n[3/5] Inserting entities from staging...')

    const entityColumns = Object.keys(entities[0])

    let entityInserted = 0
    let entityErrors = 0

    for (const entity of entities) {
      try {
        const values = entityColumns.map((col) => entity[col])
        const placeholders = entityColumns.map((_, i) => '$' + (i + 1)).join(', ')
        const columnList = entityColumns.map((c) => '"' + c + '"').join(', ')

        await client.query(
          'INSERT INTO entity (' + columnList + ') VALUES (' + placeholders + ')',
          values,
        )
        entityInserted++
      } catch (e) {
        entityErrors++
        if (entityErrors <= 5) {
          console.error('  Error inserting entity', entity.id, ':', e.message)
        }
      }
    }
    console.log('  Inserted:', entityInserted)
    if (entityErrors > 0) console.log('  Errors:', entityErrors)

    // Step 4: Insert edges from staging (use deduplicated list)
    console.log('\n[4/5] Inserting edges from staging...')

    const edgeColumns = Object.keys(uniqueEdges[0])

    let edgeInserted = 0
    let edgeErrors = 0

    for (const edge of uniqueEdges) {
      try {
        const values = edgeColumns.map((col) => edge[col])
        const placeholders = edgeColumns.map((_, i) => '$' + (i + 1)).join(', ')
        const columnList = edgeColumns.map((c) => '"' + c + '"').join(', ')

        await client.query(
          'INSERT INTO edge (' + columnList + ') VALUES (' + placeholders + ')',
          values,
        )
        edgeInserted++
      } catch (e) {
        edgeErrors++
        if (edgeErrors <= 5) {
          console.error('  Error inserting edge', edge.id, ':', e.message)
        }
      }
    }
    console.log('  Inserted:', edgeInserted)
    if (edgeErrors > 0) console.log('  Errors:', edgeErrors)

    // Step 5: Re-enable FK constraints
    console.log('\n[5/5] Re-enabling FK constraints...')
    await client.query(
      'ALTER TABLE entity ADD CONSTRAINT entity_parent_org_id_fkey FOREIGN KEY (parent_org_id) REFERENCES entity(id)',
    )
    await client.query(
      'ALTER TABLE edge ADD CONSTRAINT edge_source_id_fkey FOREIGN KEY (source_id) REFERENCES entity(id) ON DELETE CASCADE',
    )
    await client.query(
      'ALTER TABLE edge ADD CONSTRAINT edge_target_id_fkey FOREIGN KEY (target_id) REFERENCES entity(id) ON DELETE CASCADE',
    )
    await client.query(
      'ALTER TABLE submission ADD CONSTRAINT submission_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES entity(id)',
    )
    console.log('  Constraints re-enabled')

    // Commit transaction
    await client.query('COMMIT')
    console.log('\n✓ Transaction committed')

    // Verify
    console.log('\n=== VERIFICATION ===')
    const entityCount = await pool.query('SELECT COUNT(*) FROM entity')
    const edgeCount = await pool.query('SELECT COUNT(*) FROM edge')
    const submissionCount = await pool.query('SELECT COUNT(*) FROM submission')
    const pendingCount = await pool.query(
      "SELECT COUNT(*) FROM submission WHERE status = 'pending'",
    )

    console.log('Entity count:', entityCount.rows[0].count)
    console.log('Edge count:', edgeCount.rows[0].count)
    console.log('Submission count:', submissionCount.rows[0].count, '(preserved)')
    console.log('Pending submissions:', pendingCount.rows[0].count, '(preserved)')

    // Check importance distribution
    const importance = await pool.query(
      'SELECT importance, COUNT(*) as count FROM entity GROUP BY importance ORDER BY importance',
    )
    console.log('\nImportance distribution in production:')
    for (const row of importance.rows) {
      console.log('  ' + (row.importance || 'NULL') + ': ' + row.count)
    }

    // Sample check - verify a few entities match staging
    console.log('\n=== SAMPLE VERIFICATION ===')
    const samples = [1, 544, 928]
    for (const id of samples) {
      const dbResult = await pool.query('SELECT name, importance FROM entity WHERE id = $1', [id])
      const backupEntity = entities.find((e) => e.id === id)
      if (dbResult.rows[0] && backupEntity) {
        const match =
          dbResult.rows[0].name === backupEntity.name &&
          dbResult.rows[0].importance === backupEntity.importance
        console.log(
          '[' +
            id +
            '] ' +
            dbResult.rows[0].name +
            ' (importance: ' +
            dbResult.rows[0].importance +
            ') ' +
            (match ? '✓' : '✗'),
        )
      }
    }
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('\n✗ Transaction rolled back due to error:', e.message)
    throw e
  } finally {
    client.release()
    pool.end()
  }
}

migrate().catch((e) => {
  console.error('Migration failed:', e)
  process.exit(1)
})
