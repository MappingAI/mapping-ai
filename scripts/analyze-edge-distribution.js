/**
 * Analyze edge distribution for people
 */
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();

  // Get edge counts per person
  const edgeCounts = await client.query(`
    SELECT
      p.id,
      p.name,
      p.category,
      p.primary_org,
      p.other_orgs,
      COUNT(e.id)::int as edge_count,
      COUNT(DISTINCT CASE WHEN t.entity_type = 'organization' THEN e.target_id END)::int as org_edges,
      COUNT(DISTINCT CASE WHEN t.entity_type = 'person' THEN e.target_id END)::int as person_edges
    FROM entity p
    LEFT JOIN edge e ON e.source_id = p.id
    LEFT JOIN entity t ON t.id = e.target_id
    WHERE p.entity_type = 'person' AND p.status = 'approved'
    GROUP BY p.id
    ORDER BY edge_count DESC
  `);

  // Distribution analysis
  const distribution = { 0: 0, 1: 0, 2: 0, 3: 0, '4+': 0 };
  const orgDistribution = { 0: 0, 1: 0, 2: 0, 3: 0, '4+': 0 };

  for (const p of edgeCounts.rows) {
    // Total edges
    if (p.edge_count === 0) distribution[0]++;
    else if (p.edge_count === 1) distribution[1]++;
    else if (p.edge_count === 2) distribution[2]++;
    else if (p.edge_count === 3) distribution[3]++;
    else distribution['4+']++;

    // Org edges only
    if (p.org_edges === 0) orgDistribution[0]++;
    else if (p.org_edges === 1) orgDistribution[1]++;
    else if (p.org_edges === 2) orgDistribution[2]++;
    else if (p.org_edges === 3) orgDistribution[3]++;
    else orgDistribution['4+']++;
  }

  const total = edgeCounts.rows.length;

  console.log('EDGE DISTRIBUTION ANALYSIS');
  console.log('==========================\n');

  console.log('TOTAL EDGES PER PERSON:');
  console.log(`  0 edges:  ${distribution[0]} people (${Math.round(distribution[0]/total*100)}%)`);
  console.log(`  1 edge:   ${distribution[1]} people (${Math.round(distribution[1]/total*100)}%)`);
  console.log(`  2 edges:  ${distribution[2]} people (${Math.round(distribution[2]/total*100)}%)`);
  console.log(`  3 edges:  ${distribution[3]} people (${Math.round(distribution[3]/total*100)}%)`);
  console.log(`  4+ edges: ${distribution['4+']} people (${Math.round(distribution['4+']/total*100)}%)`);

  console.log('\nORG EDGES PER PERSON (excluding person-to-person edges):');
  console.log(`  0 orgs:  ${orgDistribution[0]} people (${Math.round(orgDistribution[0]/total*100)}%)`);
  console.log(`  1 org:   ${orgDistribution[1]} people (${Math.round(orgDistribution[1]/total*100)}%)`);
  console.log(`  2 orgs:  ${orgDistribution[2]} people (${Math.round(orgDistribution[2]/total*100)}%)`);
  console.log(`  3 orgs:  ${orgDistribution[3]} people (${Math.round(orgDistribution[3]/total*100)}%)`);
  console.log(`  4+ orgs: ${orgDistribution['4+']} people (${Math.round(orgDistribution['4+']/total*100)}%)`);

  // People with 4+ org edges (show detail)
  console.log('\n==========================');
  console.log('PEOPLE WITH 4+ ORG AFFILIATIONS:');
  console.log('==========================\n');

  const multiOrg = edgeCounts.rows.filter(p => p.org_edges >= 4);
  for (const p of multiOrg.slice(0, 15)) {
    console.log(`[${p.id}] ${p.name} (${p.org_edges} orgs, ${p.person_edges} people)`);

    // Get their org edges
    const edges = await client.query(`
      SELECT t.name, e.edge_type, e.role
      FROM edge e
      JOIN entity t ON t.id = e.target_id
      WHERE e.source_id = $1 AND t.entity_type = 'organization'
      ORDER BY t.name
    `, [p.id]);

    for (const e of edges.rows) {
      console.log(`    → ${e.name} (${e.edge_type})`);
    }
    console.log('');
  }

  // People with exactly 1 org edge
  console.log('==========================');
  console.log('SAMPLE: PEOPLE WITH EXACTLY 1 ORG (first 20):');
  console.log('==========================\n');

  const oneOrg = edgeCounts.rows.filter(p => p.org_edges === 1);
  for (const p of oneOrg.slice(0, 20)) {
    const edges = await client.query(`
      SELECT t.name, e.edge_type
      FROM edge e
      JOIN entity t ON t.id = e.target_id
      WHERE e.source_id = $1 AND t.entity_type = 'organization'
    `, [p.id]);

    const org = edges.rows[0];
    const hasOtherOrgs = p.other_orgs && p.other_orgs.trim().length > 0;
    console.log(`[${p.id}] ${p.name}`);
    console.log(`    → ${org.name} (${org.edge_type})`);
    if (hasOtherOrgs) {
      console.log(`    other_orgs: "${p.other_orgs.substring(0, 80)}..."`);
    }
    console.log('');
  }

  // Check other_orgs field usage
  const withOtherOrgs = await client.query(`
    SELECT COUNT(*)::int as cnt
    FROM entity
    WHERE entity_type = 'person' AND status = 'approved'
      AND other_orgs IS NOT NULL AND other_orgs != ''
  `);

  console.log('==========================');
  console.log('OTHER_ORGS FIELD ANALYSIS:');
  console.log('==========================\n');
  console.log(`People with other_orgs field populated: ${withOtherOrgs.rows[0].cnt}`);

  // Sample of other_orgs content
  const otherOrgsSample = await client.query(`
    SELECT id, name, other_orgs
    FROM entity
    WHERE entity_type = 'person' AND status = 'approved'
      AND other_orgs IS NOT NULL AND other_orgs != ''
    LIMIT 10
  `);

  console.log('\nSample other_orgs content:');
  for (const p of otherOrgsSample.rows) {
    console.log(`\n[${p.id}] ${p.name}:`);
    console.log(`    "${p.other_orgs}"`);
  }

  client.release();
  await pool.end();
}

main().catch(console.error);
