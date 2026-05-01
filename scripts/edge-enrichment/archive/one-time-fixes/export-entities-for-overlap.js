#!/usr/bin/env node
/**
 * Export entities for overlap checking between CREATE list and existing RDS entities
 *
 * Outputs:
 * - docs/create-entities-for-overlap-check.csv - Pending entities to create
 * - docs/existing-rds-entities.csv - Current RDS entities
 * - docs/entity-overlap-check.md - Combined file for Claude.ai review
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
  // Get unique pending entities (the CREATE list)
  const pending = await neon.query(`
    SELECT DISTINCT source_entity_name, target_entity_name, source_entity_id, target_entity_id
    FROM edge_discovery
    WHERE status = 'pending_entities'
  `)

  const createEntities = new Set()
  for (const r of pending.rows) {
    if (r.source_entity_id === null && r.source_entity_name) {
      createEntities.add(r.source_entity_name)
    }
    if (r.target_entity_id === null && r.target_entity_name) {
      createEntities.add(r.target_entity_name)
    }
  }

  // Get existing RDS entities
  const existing = await rds.query(`
    SELECT id, name, entity_type, category
    FROM entity
    WHERE status = 'approved'
    ORDER BY name
  `)

  console.log('=== Entity Export for Overlap Check ===')
  console.log(`Pending CREATE entities: ${createEntities.size}`)
  console.log(`Existing RDS entities: ${existing.rows.length}`)

  // Export CREATE entities
  const createList = Array.from(createEntities).sort()
  fs.writeFileSync('docs/create-entities-for-overlap-check.csv',
    'entity_name\n' + createList.join('\n')
  )
  console.log('\nExported: docs/create-entities-for-overlap-check.csv')

  // Export existing entities
  const existingCsv = 'id,name,type,category\n' + existing.rows.map(r => {
    const name = (r.name || '').replace(/"/g, '""')
    return `${r.id},"${name}",${r.entity_type},${r.category || ''}`
  }).join('\n')
  fs.writeFileSync('docs/existing-rds-entities.csv', existingCsv)
  console.log('Exported: docs/existing-rds-entities.csv')

  // Create combined markdown for Claude.ai
  const combined = `# Entity Overlap Check

## Instructions for Claude.ai
Review these two lists and identify:
1. **DUPLICATES**: Entities in the CREATE list that already exist in RDS (exact match or variant)
2. **OVERLAPS**: Entities in the CREATE list that are variants/aliases of existing RDS entities
3. **INTERNAL DUPLICATES**: Any duplicates within the existing RDS entities themselves

For each finding, output in this format:
| CREATE Entity | RDS Match | Action | Reason |
|---------------|-----------|--------|--------|
| Entity Name | Matching RDS Name | MAP/INVESTIGATE | Why they're the same |

Common patterns to look for:
- Abbreviations (e.g., "MIT" vs "Massachusetts Institute of Technology")
- With/without "The" prefix
- Inc/Corp/LLC suffixes
- Variant spellings
- Parent company vs subsidiary

## CREATE Entities (${createList.length} total, pending for RDS creation)

${createList.map((e, i) => `${i + 1}. ${e}`).join('\n')}

## Existing RDS Entities (${existing.rows.length} total)

${existing.rows.map((r, i) => `${i + 1}. ${r.name} [${r.entity_type}] (${r.category || 'no category'})`).join('\n')}
`

  fs.writeFileSync('docs/entity-overlap-check.md', combined)
  console.log('Exported: docs/entity-overlap-check.md')

  await neon.end()
  await rds.end()
}

main().catch(console.error)
