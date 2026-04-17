/**
 * Quick export of people and orgs for review
 */
import pg from 'pg'
import { writeFileSync } from 'fs'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function exportData() {
  const client = await pool.connect()
  try {
    const people = await client.query(`
      SELECT e.id, e.name, e.category, e.title, e.primary_org, e.influence_type
      FROM entity e
      WHERE entity_type = 'person' AND status = 'approved'
      ORDER BY e.category, e.name
    `)

    const orgs = await client.query(`
      SELECT id, name, category, funding_model
      FROM entity
      WHERE entity_type = 'organization' AND status = 'approved'
      ORDER BY category, name
    `)

    const affiliations = await client.query(`
      SELECT
        p.name as person_name,
        o.name as org_name,
        e.role,
        e.is_primary
      FROM edge e
      JOIN entity p ON e.source_id = p.id AND p.entity_type = 'person'
      JOIN entity o ON e.target_id = o.id AND o.entity_type = 'organization'
      WHERE e.edge_type = 'affiliated'
      ORDER BY p.name, e.is_primary DESC
    `)

    let output = '# AI Mapping Data Export (4/1/2026)\n\n'

    // People by category
    output += `## PEOPLE (${people.rows.length})\n\n`
    let currentCat = null
    for (const p of people.rows) {
      if (p.category !== currentCat) {
        currentCat = p.category
        output += `\n### ${currentCat || 'Uncategorized'}\n`
      }
      output += `- **${p.name}**`
      if (p.title) {
        const shortTitle = p.title.length > 100 ? p.title.substring(0, 100) + '...' : p.title
        output += ` — ${shortTitle}`
      }
      if (p.primary_org) output += ` @ ${p.primary_org}`
      output += '\n'
    }

    // Orgs by category
    output += `\n\n## ORGANIZATIONS (${orgs.rows.length})\n\n`
    currentCat = null
    for (const o of orgs.rows) {
      if (o.category !== currentCat) {
        currentCat = o.category
        output += `\n### ${currentCat || 'Uncategorized'}\n`
      }
      output += `- **${o.name}**`
      if (o.funding_model) output += ` (${o.funding_model})`
      output += '\n'
    }

    writeFileSync('data/export-for-review.md', output)
    console.log('Saved to data/export-for-review.md')
    console.log(`People: ${people.rows.length}`)
    console.log(`Organizations: ${orgs.rows.length}`)
    console.log(`Affiliations: ${affiliations.rows.length}`)
  } finally {
    client.release()
    await pool.end()
  }
}

exportData()
