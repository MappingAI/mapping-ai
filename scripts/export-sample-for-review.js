/**
 * Export a random sample of 50 orgs + 50 people with their edges
 * for manual quality review
 */
import pg from 'pg';
import fs from 'fs';
import 'dotenv/config';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();

  console.log('Exporting sample for quality review...\n');

  // Get 50 random people (stratified by category)
  const people = await client.query(`
    WITH ranked AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY category ORDER BY RANDOM()) as rn
      FROM entity
      WHERE entity_type = 'person' AND status = 'approved'
    )
    SELECT id, name, category, title, primary_org, other_orgs,
           belief_regulatory_stance, belief_agi_timeline, belief_ai_risk,
           twitter, bluesky, location, notes
    FROM ranked
    WHERE rn <= 7
    ORDER BY category, name
    LIMIT 50
  `);

  // Get 50 random orgs (stratified by category)
  const orgs = await client.query(`
    WITH ranked AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY category ORDER BY RANDOM()) as rn
      FROM entity
      WHERE entity_type = 'organization' AND status = 'approved'
    )
    SELECT id, name, category, website, funding_model, parent_org_id,
           belief_regulatory_stance, location, notes
    FROM ranked
    WHERE rn <= 6
    ORDER BY category, name
    LIMIT 50
  `);

  // Get all edges for these entities
  const entityIds = [
    ...people.rows.map(p => p.id),
    ...orgs.rows.map(o => o.id)
  ];

  const edges = await client.query(`
    SELECT e.source_id, e.target_id, e.edge_type, e.role, e.is_primary, e.created_by,
           s.name as source_name, s.entity_type as source_type,
           t.name as target_name, t.entity_type as target_type
    FROM edge e
    JOIN entity s ON s.id = e.source_id
    JOIN entity t ON t.id = e.target_id
    WHERE e.source_id = ANY($1) OR e.target_id = ANY($1)
    ORDER BY s.name, t.name
  `, [entityIds]);

  // Build markdown output
  let md = `# Data Quality Review Sample

Generated: ${new Date().toISOString()}

This is a random sample of 50 people and 50 orgs with their edges.
Please review for:
1. **Incorrect edges** - person connected to wrong org
2. **Missing edges** - obvious affiliations not captured
3. **Wrong field values** - stance, timeline, risk that seem off
4. **Stale information** - outdated titles, former positions listed as current

---

## PEOPLE (${people.rows.length})

`;

  for (const p of people.rows) {
    const personEdges = edges.rows.filter(e => e.source_id === p.id || e.target_id === p.id);

    md += `### [${p.id}] ${p.name}\n`;
    md += `**Category:** ${p.category}\n`;
    md += `**Title:** ${p.title || '(empty)'}\n`;
    md += `**Primary Org (text):** ${p.primary_org || '(empty)'}\n`;
    if (p.other_orgs) md += `**Other Orgs (text):** ${p.other_orgs.substring(0, 200)}...\n`;
    md += `**Stance:** ${p.belief_regulatory_stance || '(empty)'} | **Timeline:** ${p.belief_agi_timeline || '(empty)'} | **Risk:** ${p.belief_ai_risk || '(empty)'}\n`;
    md += `**Location:** ${p.location || '(empty)'}\n`;

    if (personEdges.length > 0) {
      md += `**Edges (${personEdges.length}):**\n`;
      for (const e of personEdges) {
        const direction = e.source_id === p.id ? '→' : '←';
        const other = e.source_id === p.id ? e.target_name : e.source_name;
        const role = e.role ? ` (${e.role})` : '';
        const primary = e.is_primary ? ' ★' : '';
        md += `- ${direction} ${other} [${e.edge_type}]${role}${primary}\n`;
      }
    } else {
      md += `**Edges:** ⚠️ NONE\n`;
    }

    if (p.notes) {
      md += `**Notes:** ${p.notes.substring(0, 300)}${p.notes.length > 300 ? '...' : ''}\n`;
    }
    md += `\n---\n\n`;
  }

  md += `## ORGANIZATIONS (${orgs.rows.length})

`;

  for (const o of orgs.rows) {
    const orgEdges = edges.rows.filter(e => e.source_id === o.id || e.target_id === o.id);

    md += `### [${o.id}] ${o.name}\n`;
    md += `**Category:** ${o.category}\n`;
    md += `**Website:** ${o.website || '(empty)'}\n`;
    md += `**Funding Model:** ${o.funding_model || '(empty)'}\n`;
    md += `**Stance:** ${o.belief_regulatory_stance || '(empty)'}\n`;
    md += `**Location:** ${o.location || '(empty)'}\n`;

    if (orgEdges.length > 0) {
      md += `**Edges (${orgEdges.length}):**\n`;
      for (const e of orgEdges.slice(0, 15)) {
        const direction = e.source_id === o.id ? '→' : '←';
        const other = e.source_id === o.id ? e.target_name : e.source_name;
        const otherType = e.source_id === o.id ? e.target_type : e.source_type;
        const role = e.role ? ` (${e.role})` : '';
        md += `- ${direction} ${other} [${otherType}] [${e.edge_type}]${role}\n`;
      }
      if (orgEdges.length > 15) md += `- ... and ${orgEdges.length - 15} more\n`;
    } else {
      md += `**Edges:** ⚠️ NONE\n`;
    }

    if (o.notes) {
      md += `**Notes:** ${o.notes.substring(0, 300)}${o.notes.length > 300 ? '...' : ''}\n`;
    }
    md += `\n---\n\n`;
  }

  // Summary stats
  md += `## SUMMARY STATS

- People sampled: ${people.rows.length}
- Orgs sampled: ${orgs.rows.length}
- Total edges involving sampled entities: ${edges.rows.length}
- People with no edges: ${people.rows.filter(p => !edges.rows.some(e => e.source_id === p.id || e.target_id === p.id)).length}
- Orgs with no edges: ${orgs.rows.filter(o => !edges.rows.some(e => e.source_id === o.id || e.target_id === o.id)).length}

## REVIEW CHECKLIST

For each entity, check:
- [ ] Is the category correct?
- [ ] Are the edges accurate? (correct orgs, correct edge types)
- [ ] Are there obvious missing edges?
- [ ] Is the stance/timeline/risk believable for this person/org?
- [ ] Is the title/role current or outdated?
`;

  fs.writeFileSync('data/sample-review.md', md);
  console.log(`Exported ${people.rows.length} people + ${orgs.rows.length} orgs`);
  console.log(`Total edges: ${edges.rows.length}`);
  console.log(`\nOutput: data/sample-review.md`);

  client.release();
  await pool.end();
}

main().catch(console.error);
