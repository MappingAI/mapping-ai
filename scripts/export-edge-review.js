import pg from 'pg';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function exportEdgeReview() {
  const client = await pool.connect();
  try {
    console.log('Fetching people and edges for review...\n');

    // Get all approved people with their details
    const peopleResult = await client.query(`
      SELECT id, name, category, title, primary_org
      FROM entity
      WHERE entity_type = 'person' AND status = 'approved'
      ORDER BY category, name
    `);
    const people = peopleResult.rows;

    // Get all approved orgs for lookup
    const orgsResult = await client.query(`
      SELECT id, name
      FROM entity
      WHERE entity_type = 'organization' AND status = 'approved'
    `);
    const orgs = orgsResult.rows;
    const orgById = new Map(orgs.map(o => [o.id, o.name]));
    const orgByNameLower = new Map(orgs.map(o => [o.name.toLowerCase().trim(), o]));

    // Get all edges where source is a person
    const edgesResult = await client.query(`
      SELECT e.source_id, e.target_id, e.edge_type, e.role, e.is_primary,
             t.name as target_name, t.entity_type as target_type
      FROM edge e
      JOIN entity t ON t.id = e.target_id
      WHERE e.source_id IN (SELECT id FROM entity WHERE entity_type = 'person' AND status = 'approved')
    `);

    // Group edges by source person
    const edgesByPerson = new Map();
    for (const edge of edgesResult.rows) {
      if (!edgesByPerson.has(edge.source_id)) {
        edgesByPerson.set(edge.source_id, []);
      }
      edgesByPerson.get(edge.source_id).push(edge);
    }

    // Group people by category
    const peopleByCategory = new Map();
    for (const person of people) {
      const cat = person.category || 'Uncategorized';
      if (!peopleByCategory.has(cat)) {
        peopleByCategory.set(cat, []);
      }
      peopleByCategory.get(cat).push(person);
    }

    // Build report
    let output = `# People Edge Status Review\n\n`;
    output += `Generated: ${new Date().toISOString()}\n\n`;
    output += `## Summary\n\n`;
    output += `- **Total people:** ${people.length}\n`;
    output += `- **Total organizations:** ${orgs.length}\n`;
    output += `- **Total edges:** ${edgesResult.rows.length}\n\n`;

    // Stats tracking
    let okCount = 0;
    let noEdgesCount = 0;
    let mismatchCount = 0;
    const issues = [];

    // Process each category
    const sortedCategories = [...peopleByCategory.keys()].sort();

    for (const category of sortedCategories) {
      const categoryPeople = peopleByCategory.get(category);
      output += `---\n\n## ${category} (${categoryPeople.length})\n\n`;

      for (const person of categoryPeople) {
        const edges = edgesByPerson.get(person.id) || [];
        const primaryOrgText = person.primary_org?.trim() || '';

        // Check if primary_org matches any edge target
        let hasPrimaryOrgEdge = false;
        let primaryOrgMatch = null;

        if (primaryOrgText) {
          // Look for org in DB
          primaryOrgMatch = orgByNameLower.get(primaryOrgText.toLowerCase());

          // Check if there's an edge to this org
          if (primaryOrgMatch) {
            hasPrimaryOrgEdge = edges.some(e =>
              e.target_id === primaryOrgMatch.id &&
              (e.edge_type === 'affiliated' || e.edge_type === 'employed_by')
            );
          }
        }

        // Determine status
        let status;
        let statusEmoji;

        if (edges.length === 0) {
          status = 'NO EDGES';
          statusEmoji = '⚠️';
          noEdgesCount++;
          issues.push({ person, issue: 'no_edges' });
        } else if (primaryOrgText && primaryOrgMatch && !hasPrimaryOrgEdge) {
          status = 'MISMATCH';
          statusEmoji = '⚠️';
          mismatchCount++;
          issues.push({ person, issue: 'mismatch', primaryOrg: primaryOrgText, match: primaryOrgMatch });
        } else if (primaryOrgText && !primaryOrgMatch) {
          status = 'ORG NOT FOUND';
          statusEmoji = '❓';
          issues.push({ person, issue: 'org_not_found', primaryOrg: primaryOrgText });
        } else {
          status = 'OK';
          statusEmoji = '✓';
          okCount++;
        }

        output += `### [${person.id}] ${person.name} (${person.category || 'No category'})\n`;
        if (person.title) {
          output += `**Title:** ${person.title}\n`;
        }
        output += `**primary_org (text):** ${primaryOrgText || '(none)'}\n`;

        if (edges.length > 0) {
          output += `**Edges:**\n`;
          for (const edge of edges) {
            const roleStr = edge.role ? `, ${edge.role}` : '';
            const primaryStr = edge.is_primary ? ' ★' : '';
            output += `  - → ${edge.target_name} (${edge.edge_type}${roleStr})${primaryStr}\n`;
          }
        } else {
          output += `**Edges:** (none)\n`;
        }

        output += `**Status:** ${statusEmoji} ${status}\n\n`;
      }
    }

    // Add summary at top
    const summarySection = `## Status Summary\n\n` +
      `| Status | Count |\n` +
      `|--------|-------|\n` +
      `| ✓ OK | ${okCount} |\n` +
      `| ⚠️ NO EDGES | ${noEdgesCount} |\n` +
      `| ⚠️ MISMATCH | ${mismatchCount} |\n` +
      `| ❓ ORG NOT FOUND | ${issues.filter(i => i.issue === 'org_not_found').length} |\n\n`;

    // Insert summary after the initial stats
    const insertPoint = output.indexOf('---\n\n##');
    output = output.slice(0, insertPoint) + summarySection + output.slice(insertPoint);

    // Write to file
    const outputPath = path.join(process.cwd(), 'data', 'people-edge-review.md');
    fs.writeFileSync(outputPath, output);
    console.log(`✓ Exported to ${outputPath}`);
    console.log(`\nSummary:`);
    console.log(`  ✓ OK: ${okCount}`);
    console.log(`  ⚠️ NO EDGES: ${noEdgesCount}`);
    console.log(`  ⚠️ MISMATCH: ${mismatchCount}`);
    console.log(`  ❓ ORG NOT FOUND: ${issues.filter(i => i.issue === 'org_not_found').length}`);

  } finally {
    client.release();
    await pool.end();
  }
}

exportEdgeReview().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
