/**
 * Check policymakers missing party edges
 */
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();

  // Get party IDs
  const parties = await client.query(`
    SELECT id, name FROM entity
    WHERE name IN ('Democratic Party', 'Republican Party') AND status = 'approved'
  `);

  const demId = parties.rows.find(r => r.name === 'Democratic Party')?.id;
  const repId = parties.rows.find(r => r.name === 'Republican Party')?.id;

  console.log('PARTY AFFILIATION ANALYSIS');
  console.log('==========================\n');
  console.log(`Democratic Party ID: ${demId}`);
  console.log(`Republican Party ID: ${repId}\n`);

  // Policymakers who should have party affiliations
  const policymakers = await client.query(`
    SELECT p.id, p.name, p.primary_org, p.title,
           EXISTS(SELECT 1 FROM edge e WHERE e.source_id = p.id AND e.target_id IN ($1, $2)) as has_party_edge
    FROM entity p
    WHERE p.entity_type = 'person' AND p.category = 'Policymaker' AND p.status = 'approved'
    ORDER BY p.name
  `, [demId, repId]);

  const withParty = policymakers.rows.filter(r => r.has_party_edge);
  const withoutParty = policymakers.rows.filter(r => !r.has_party_edge);

  console.log(`Policymakers with party edge: ${withParty.length}`);
  console.log(`Policymakers WITHOUT party edge: ${withoutParty.length}\n`);

  // Show the ones without, grouped by likely party
  console.log('POLICYMAKERS MISSING PARTY EDGES:');
  for (const p of withoutParty.slice(0, 30)) {
    const org = p.primary_org || '';
    const partyHint = org.includes('Democratic') ? '(D)' : org.includes('Republican') ? '(R)' : '(?)';
    console.log(`  [${p.id}] ${p.name} ${partyHint} - ${org.substring(0, 50)}`);
  }
  if (withoutParty.length > 30) {
    console.log(`  ... and ${withoutParty.length - 30} more`);
  }

  client.release();
  await pool.end();
}

main().catch(console.error);
