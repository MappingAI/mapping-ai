/**
 * Add Stephen Clare + Carina Prunkl as people, update IASR resource (id=653),
 * and wire up author/affiliation edges.
 *
 * Usage:
 *   node scripts/add-iasr-entities.js              # dry run (default)
 *   node scripts/add-iasr-entities.js --execute    # commit in a transaction
 */
import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const EXECUTE = process.argv.includes('--execute')
const CREATED_BY = 'add-iasr-entities'

const CLARE = {
  entity_type: 'person',
  name: 'Stephen Clare',
  category: 'Researcher',
  other_categories: 'Academic',
  title: 'Lead Writer, International AI Safety Report',
  primary_org: 'Centre for the Governance of AI (GovAI)',
  other_orgs: 'International AI Safety Report, Founders Pledge, 80,000 Hours, CIGI',
  website: 'https://unfoldingatlas.substack.com',
  location: 'London, United Kingdom',
  twitter: 'stephenclare_',
  bluesky: null,
  thumbnail_url:
    'https://cdn.prod.website-files.com/614b70a71b9f71c9c240c7a7/68b71e1c2644f61bf4150e9a_Stephen%20Clare-2-p-1080.jpeg',
  belief_regulatory_stance: 'Targeted',
  belief_evidence_source: 'Explicitly stated',
  belief_agi_timeline: '10-25 years',
  belief_ai_risk: 'Catastrophic',
  belief_threat_models:
    'Bio/chem weapon uplift, automated cyberattacks, loss of control, concentration of power / stable totalitarianism, great-power AI race, systemic labor and autonomy risks',
  notes_html: `<p>London-based researcher on AI governance and global catastrophic risks. Lead Writer of the <strong>International AI Safety Report</strong> (2025–2026, chaired by Yoshua Bengio), producing the policy-neutral evidence base used by governments. Affiliate and former Research Manager at <strong>GovAI</strong> (Centre for the Governance of AI, Oxford). Earlier work at <strong>Founders Pledge</strong> on great-power conflict and existential risk, with problem profiles at <strong>80,000 Hours</strong> on great-power conflict and stable totalitarianism.</p>
<p>Signature method: historical-analogy-driven risk modeling (power-law fits on the Correlates of War dataset; WWI→WWII escalation; 20th-century totalitarian precedents). Threat models he emphasizes: bio/chem weapon uplift from frontier models, automated cyberattacks, loss of control, concentration of power enabling stable totalitarianism, and great-power AI races. Publicly critiqued Aschenbrenner's <em>Situational Awareness</em> for dismissing the feasibility of international AI treaties.</p>
<p>PhD-level work at McGill University. Writes the "Unfolding Atlas" Substack.</p>`,
}

const PRUNKL = {
  entity_type: 'person',
  name: 'Carina Prunkl',
  category: 'Researcher',
  other_categories: 'Academic',
  title:
    'Researcher, Inria REGALIA team; Lead Writer, International AI Safety Report; Research Affiliate, Oxford Institute for Ethics in AI',
  primary_org: 'Inria (REGALIA team)',
  other_orgs:
    'International AI Safety Report, Oxford Institute for Ethics in AI, Centre for the Governance of AI, Utrecht University (former)',
  website: 'https://www.carinaprunkl.com',
  location: 'Oxford, United Kingdom',
  twitter: 'carinaprunkl',
  bluesky: 'carinaprunkl.bsky.social',
  thumbnail_url: null,
  belief_regulatory_stance: 'Targeted',
  belief_evidence_source: 'Explicitly stated',
  belief_agi_timeline: 'Ill-defined',
  belief_ai_risk: 'Mixed/nuanced',
  belief_threat_models:
    'Loss of control / meaningful human oversight, erosion of human autonomy, democratic erosion via bureaucratic AI decision-making, labor displacement, plus systemic risks (cyber, bio, misinformation) covered in IASR co-lead role',
  notes_html: `<p>Philosopher of AI and co-lead writer (with <strong>Stephen Clare</strong>) of the <strong>International AI Safety Report 2026</strong>. Researcher at <strong>Inria</strong> on the REGALIA project-team (evaluation and regulation of AI algorithms) and Research Affiliate at the <strong>Oxford Institute for Ethics in AI</strong>. Former Assistant Professor for Ethics of Technology at Utrecht, Senior Research Scholar at FHI (closed 2024), and Junior Research Fellow at Jesus College, Oxford.</p>
<p>Signature research: human autonomy and meaningful human oversight under AI; institutionalising ethics in AI development (broader-impact requirements, verifiable-claims mechanisms); AI for bureaucratic decision-making and its implications for legitimacy. Co-authored the influential 2020 "Beyond Near- and Long-Term" AIES paper on moving past the binary between short-term and existential risk framings.</p>
<p>Training: DPhil in Philosophy of Physics (Oxford, 2018, thesis "The Scope of Thermodynamics"); MSc Physics, FU Berlin. ORCID 0000-0002-0123-9561.</p>`,
}

const IASR_ID = 653
const IASR_UPDATES = {
  resource_title: 'International AI Safety Report',
  name: 'International AI Safety Report',
  resource_type: 'Report',
  resource_category: 'AI Safety',
  resource_url: 'https://internationalaisafetyreport.org/publication/international-ai-safety-report-2026',
  resource_year: '2026',
  primary_org: 'UK AI Security Institute',
  resource_author: 'Yoshua Bengio, Stephen Clare, Carina Prunkl',
  resource_key_argument:
    'The first comprehensive international scientific synthesis of what general-purpose AI systems can do, what risks they pose, and how those risks can be managed. Mandated by the 2023 Bletchley AI Safety Summit and chaired by Yoshua Bengio, it is written by 100+ independent experts from 30+ countries plus the EU, OECD, and UN. Explicitly an evidence base for global decision-makers, not policy recommendations.',
  notes_html: `<p>Published 3 February 2026 (DSIT 2026/001) ahead of the India AI Impact Summit. 200 pages, 1,451 references. Second annual edition in an ongoing series.</p>
<p><strong>Secretariat</strong>: UK AI Security Institute (within DSIT), which has pledged to host until a long-term international home is established. The institute rebranded from "AI Safety Institute" between the 2025 and 2026 editions.</p>
<p><strong>Chair</strong>: Yoshua Bengio. <strong>Lead writers</strong>: Stephen Clare and Carina Prunkl. Senior advisers span Daron Acemoglu, Geoffrey Hinton, Stuart Russell, Andrew Yao, and Yi Zeng.</p>
<p><strong>Series history</strong>: May 2024 Interim Report (ahead of Seoul Summit); 29 January 2025 first full annual (DSIT 2025/001, ahead of France AI Action Summit); 15 October 2025 First Key Update on Capabilities and Risk Implications (arXiv:2510.13653); 25 November 2025 Second Key Update on Technical Safeguards and Risk Management (arXiv:2511.19863); 3 February 2026 second full annual.</p>
<p><strong>Scope</strong>: risk taxonomy covers misuse (bio/chem uplift, cyberattacks, influence operations), malfunctions (loss of control, bias, reliability), and systemic risks (labor markets, market concentration, environmental, privacy). Deliberately makes no policy recommendations.</p>`,
}

// Affiliation edges: person → org
const CLARE_AFFILIATIONS = [
  { org_id: 225, role: 'Affiliate (former Research Manager)', is_primary: true, edge_type: 'affiliated' },
  { org_id: 1597, role: 'Former Applied Researcher', is_primary: false, edge_type: 'affiliated' },
  { org_id: 351, role: 'Author, problem profiles', is_primary: false, edge_type: 'affiliated' },
]

const PRUNKL_AFFILIATIONS = [
  { org_id: 225, role: 'Research Affiliate', is_primary: false, edge_type: 'affiliated' },
  { org_id: 236, role: 'Former Senior Research Scholar', is_primary: false, edge_type: 'affiliated' },
]

// Authored_by edges: resource → person
const BENGIO_ID = 29

function buildInsertPerson(p) {
  const cols = [
    'entity_type',
    'name',
    'category',
    'other_categories',
    'title',
    'primary_org',
    'other_orgs',
    'website',
    'location',
    'twitter',
    'bluesky',
    'thumbnail_url',
    'notes_html',
    'belief_regulatory_stance',
    'belief_evidence_source',
    'belief_agi_timeline',
    'belief_ai_risk',
    'belief_threat_models',
    'status',
  ]
  const vals = [
    p.entity_type,
    p.name,
    p.category,
    p.other_categories,
    p.title,
    p.primary_org,
    p.other_orgs,
    p.website,
    p.location,
    p.twitter,
    p.bluesky,
    p.thumbnail_url,
    p.notes_html,
    p.belief_regulatory_stance,
    p.belief_evidence_source,
    p.belief_agi_timeline,
    p.belief_ai_risk,
    p.belief_threat_models,
    'approved',
  ]
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')
  const sql = `INSERT INTO entity (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`
  return { sql, vals }
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN (use --execute to commit)'}\n`)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1) Preflight — make sure Clare/Prunkl not already in DB; IASR still at id=653.
    const { rows: preflight } = await client.query(
      `SELECT id, name, entity_type FROM entity
       WHERE (entity_type = 'person' AND name IN ('Stephen Clare', 'Carina Prunkl'))
          OR (id = $1)`,
      [IASR_ID],
    )
    const existingClare = preflight.find((r) => r.name === 'Stephen Clare')
    const existingPrunkl = preflight.find((r) => r.name === 'Carina Prunkl')
    const iasr = preflight.find((r) => r.id === IASR_ID)
    if (!iasr) throw new Error(`IASR resource id=${IASR_ID} not found`)
    console.log(`Preflight: IASR id=${iasr.id} "${iasr.name}" (${iasr.entity_type}) ✓`)
    if (existingClare) console.log(`  Stephen Clare already exists at id=${existingClare.id} — will skip insert`)
    if (existingPrunkl) console.log(`  Carina Prunkl already exists at id=${existingPrunkl.id} — will skip insert`)

    // Reset sequences in case they've drifted from explicit-id inserts.
    await client.query(`SELECT setval(pg_get_serial_sequence('entity', 'id'), (SELECT MAX(id) FROM entity))`)
    await client.query(`SELECT setval(pg_get_serial_sequence('edge', 'id'), (SELECT MAX(id) FROM edge))`)

    // 2) Insert Clare + Prunkl
    let clareId = existingClare?.id
    if (!clareId) {
      const { sql, vals } = buildInsertPerson(CLARE)
      const res = await client.query(sql, vals)
      clareId = res.rows[0].id
      console.log(`  Inserted Stephen Clare → id=${clareId}`)
    }
    let prunklId = existingPrunkl?.id
    if (!prunklId) {
      const { sql, vals } = buildInsertPerson(PRUNKL)
      const res = await client.query(sql, vals)
      prunklId = res.rows[0].id
      console.log(`  Inserted Carina Prunkl → id=${prunklId}`)
    }

    // 3) Update IASR
    await client.query(
      `UPDATE entity SET
         name = $1,
         resource_title = $2,
         resource_type = $3,
         resource_category = $4,
         resource_url = $5,
         resource_year = $6,
         primary_org = $7,
         resource_author = $8,
         resource_key_argument = $9,
         notes_html = $10
       WHERE id = $11`,
      [
        IASR_UPDATES.name,
        IASR_UPDATES.resource_title,
        IASR_UPDATES.resource_type,
        IASR_UPDATES.resource_category,
        IASR_UPDATES.resource_url,
        IASR_UPDATES.resource_year,
        IASR_UPDATES.primary_org,
        IASR_UPDATES.resource_author,
        IASR_UPDATES.resource_key_argument,
        IASR_UPDATES.notes_html,
        IASR_ID,
      ],
    )
    console.log(`  Updated IASR (id=${IASR_ID})`)

    // 4) Edges: affiliations
    const allEdges = [
      ...CLARE_AFFILIATIONS.map((a) => ({
        source_id: clareId,
        target_id: a.org_id,
        edge_type: a.edge_type,
        role: a.role,
        is_primary: a.is_primary,
      })),
      ...PRUNKL_AFFILIATIONS.map((a) => ({
        source_id: prunklId,
        target_id: a.org_id,
        edge_type: a.edge_type,
        role: a.role,
        is_primary: a.is_primary,
      })),
      // Authored_by edges: resource → authors
      { source_id: IASR_ID, target_id: BENGIO_ID, edge_type: 'authored_by', role: 'Chair', is_primary: true },
      { source_id: IASR_ID, target_id: clareId, edge_type: 'authored_by', role: 'Lead Writer', is_primary: false },
      { source_id: IASR_ID, target_id: prunklId, edge_type: 'authored_by', role: 'Lead Writer', is_primary: false },
    ]

    for (const e of allEdges) {
      await client.query(
        `INSERT INTO edge (source_id, target_id, edge_type, role, is_primary, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (source_id, target_id, edge_type) DO NOTHING`,
        [e.source_id, e.target_id, e.edge_type, e.role, e.is_primary, CREATED_BY],
      )
      console.log(`  Edge ${e.source_id} --${e.edge_type}--> ${e.target_id} (${e.role})`)
    }

    if (EXECUTE) {
      await client.query('COMMIT')
      console.log('\n✓ COMMITTED')
      console.log(`\nIDs: Clare=${clareId}, Prunkl=${prunklId}, IASR=${IASR_ID}`)
    } else {
      await client.query('ROLLBACK')
      console.log('\n~ DRY RUN — rolled back. Re-run with --execute to commit.')
    }
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('\n✗ Error, rolled back:', err.message)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
