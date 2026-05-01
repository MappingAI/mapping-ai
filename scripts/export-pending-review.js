import pg from 'pg';
import 'dotenv/config';
import fs from 'fs';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();

  // Get all pending v2-auto entities with their edge info
  const entities = await client.query(`
    SELECT
      e.id, e.name, e.entity_type, e.category,
      COUNT(edge.id) as edge_count,
      string_agg(DISTINCT src.name, '; ') as created_from,
      string_agg(DISTINCT edge.edge_type, '; ') as edge_types,
      LEFT(string_agg(edge.evidence, ' | '), 300) as evidence_snippet
    FROM entity e
    LEFT JOIN edge ON edge.target_id = e.id
    LEFT JOIN entity src ON edge.source_id = src.id
    WHERE e.enrichment_version = 'v2-auto' AND e.qa_approved = false
    GROUP BY e.id, e.name, e.entity_type, e.category
    ORDER BY e.category, e.name
  `);

  // Escape fields for CSV
  const escapeCsv = (s) => {
    if (s === null || s === undefined) return '';
    const str = String(s).replace(/"/g, '""');
    return (str.includes(',') || str.includes('"') || str.includes('\n')) ? '"' + str + '"' : str;
  };

  // Create CSV
  let csv = 'id,name,type,category,edge_count,created_from,edge_types,evidence_snippet,decision\n';

  for (const e of entities.rows) {
    csv += [
      e.id,
      escapeCsv(e.name),
      e.entity_type,
      escapeCsv(e.category),
      e.edge_count,
      escapeCsv(e.created_from),
      escapeCsv(e.edge_types),
      escapeCsv(e.evidence_snippet),
      '' // decision column for manual review
    ].join(',') + '\n';
  }

  fs.writeFileSync('data/pending-review.csv', csv);
  console.log('Exported ' + entities.rows.length + ' entities to data/pending-review.csv');

  // Also show category breakdown
  const byCategory = {};
  for (const e of entities.rows) {
    byCategory[e.category] = (byCategory[e.category] || 0) + 1;
  }
  console.log('\nBy category:');
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log('  ' + cat + ': ' + count);
  }

  client.release();
  await pool.end();
}

main().catch(console.error);
