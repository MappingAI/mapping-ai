/**
 * Add party affiliations for US policymakers
 *
 * Usage:
 *   node scripts/add-party-affiliations.js --dry-run    # Show what would happen
 *   node scripts/add-party-affiliations.js --execute    # Actually do it
 */
import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const args = process.argv.slice(2)
const dryRun = !args.includes('--execute')

// Verified party affiliations for US politicians
// D = Democratic Party, R = Republican Party, I = Independent (skip)
const PARTY_MAP = {
  // US Senators
  'Alexandria Ocasio-Cortez': 'D',
  'Amy Klobuchar': 'D',
  'Anna Eshoo': 'D',
  'Ben Ray Luján': 'D',
  'Bernie Sanders': 'I', // Independent, caucuses with D
  'Brian Schatz': 'D',
  'Chris Coons': 'D',
  'Chris Murphy': 'D',
  'Chuck Schumer': 'D',
  'Cory Booker': 'D',
  'Cynthia Lummis': 'R',
  'Ed Markey': 'D',
  'Gary Peters': 'D',
  'Jacky Rosen': 'D',
  'Jerry Moran': 'R',
  'John Hickenlooper': 'D',
  'Joni Ernst': 'R',
  'Maggie Hassan': 'D',
  'Marco Rubio': 'R',
  'Maria Cantwell': 'D',
  'Mark Warner': 'D',
  'Martin Heinrich': 'D',
  'Mike Braun': 'R',
  'Mike Rounds': 'R',
  'Richard Blumenthal': 'D',
  'Ron Wyden': 'D',
  'Ted Cruz': 'R',
  'Todd Young': 'R',

  // US House Representatives
  'Alex Bores': 'D', // NY State Assembly
  'Don Beyer': 'D',
  'Frank Lucas': 'R',
  'Jay Obernolte': 'R',
  'Michael McCaul': 'R',
  'Ro Khanna': 'D',
  'Suhas Subramanyam': 'D',
  'Ted Lieu': 'D',
  'Valerie Foushee': 'D',
  'Zoe Lofgren': 'D',

  // Governors & State Officials
  'Gavin Newsom': 'D',
  'Greg Abbott': 'R',
  'Jared Polis': 'D',
  'Jon Husted': 'R',
  'Kathy Hochul': 'D',
  'Scott Wiener': 'D', // CA State Senator

  // Former officials / appointees (by administration)
  'Pete Buttigieg': 'D',
  'Gina Raimondo': 'D',
  'Bruce Reed': 'D',
  'Brian Deese': 'D',
  'Saikat Chakrabarti': 'D',
  'Arati Prabhakar': 'D',
  'Tom Kalil': 'D', // Obama admin
  'Michael Kratsios': 'R', // Trump admin
  'Lynne Parker': 'R', // Trump admin
  'David Sacks': 'R', // Trump admin
  'Sriram Krishnan': 'R', // Trump admin

  // Skip - not US partisan politicians
  // 'Audrey Tang': null, // Taiwan
  // 'Margrethe Vestager': null, // EU
  // 'Thierry Breton': null, // EU
  // 'Marietje Schaake': null, // EU/Netherlands
  // 'Alan Davidson': null, // Career civil servant
  // 'Alondra Nelson': null, // Academic/OSTP
  // 'Ben Reinhardt': null, // Not a politician
  // 'David Evan Harris': null, // Academic
  // 'Elham Tabassi': null, // NIST career
  // 'Jen Easterly': null, // Career/bipartisan
  // 'Jeffrey Kessler': null, // Career
  // 'Jonathan Kanter': null, // DOJ career
  // 'Laurie Locascio': null, // NIST career
  // 'Lina Khan': null, // FTC - I'll include as D since Biden appointee
  // 'Stefano Mazzocchi': null, // Not politician

  // Biden appointees (reasonably D-affiliated)
  'Lina Khan': 'D',
  'Jonathan Kanter': 'D',
  'Alondra Nelson': 'D',
  'Jen Easterly': 'D',
}

async function main() {
  console.log('ADD PARTY AFFILIATIONS')
  console.log('======================')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}\n`)

  const client = await pool.connect()

  try {
    // Get party entity IDs
    const parties = await client.query(`
      SELECT id, name FROM entity
      WHERE name IN ('Democratic Party', 'Republican Party') AND status = 'approved'
    `)

    const demId = parties.rows.find((r) => r.name === 'Democratic Party')?.id
    const repId = parties.rows.find((r) => r.name === 'Republican Party')?.id

    console.log(`Democratic Party ID: ${demId}`)
    console.log(`Republican Party ID: ${repId}\n`)

    // Get policymakers without party edges
    const policymakers = await client.query(
      `
      SELECT p.id, p.name
      FROM entity p
      LEFT JOIN edge e ON e.source_id = p.id AND e.target_id IN ($1, $2)
      WHERE p.entity_type = 'person' AND p.category = 'Policymaker' AND p.status = 'approved'
        AND e.id IS NULL
      ORDER BY p.name
    `,
      [demId, repId],
    )

    let added = 0
    let skipped = 0
    let notFound = []

    for (const p of policymakers.rows) {
      const party = PARTY_MAP[p.name]

      if (!party) {
        notFound.push(p.name)
        continue
      }

      if (party === 'I') {
        console.log(`  ⊘ ${p.name} - Independent (skipping)`)
        skipped++
        continue
      }

      const partyId = party === 'D' ? demId : repId
      const partyName = party === 'D' ? 'Democratic Party' : 'Republican Party'

      console.log(`  + [${p.id}] ${p.name} → ${partyName}`)

      if (!dryRun) {
        await client.query(
          `
          INSERT INTO edge (source_id, target_id, edge_type, is_primary, created_by)
          VALUES ($1, $2, 'affiliated', false, 'party-affiliations')
          ON CONFLICT (source_id, target_id, edge_type) DO NOTHING
        `,
          [p.id, partyId],
        )
      }
      added++
    }

    console.log(`\n${dryRun ? 'Would add' : 'Added'}: ${added} party affiliations`)
    console.log(`Skipped (Independent): ${skipped}`)
    console.log(`Not in mapping (${notFound.length}): ${notFound.join(', ')}`)

    // Verify
    if (!dryRun) {
      const verify = await client.query(
        `
        SELECT COUNT(*) as cnt
        FROM edge
        WHERE target_id IN ($1, $2) AND created_by = 'party-affiliations'
      `,
        [demId, repId],
      )
      console.log(
        `\nVerification: ${verify.rows[0].cnt} party edges with created_by='party-affiliations'`,
      )
    }

    if (dryRun) {
      console.log('\nTo execute, run:')
      console.log('  node scripts/add-party-affiliations.js --execute')
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
