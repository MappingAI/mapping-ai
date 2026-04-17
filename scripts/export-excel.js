/**
 * Export people and orgs to Excel (.xlsx)
 *
 * Usage: node scripts/export-excel.js
 * Output: data/mapping-ai-export.xlsx
 */
import pg from 'pg'
import XLSX from 'xlsx'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// Field options for headers: { options, multi }
// multi: false = pick 1, true = pick any number
const FIELD_OPTIONS = {
  // People categories
  category_people: {
    options:
      'Executive | Researcher | Policymaker | Investor | Organizer | Journalist | Academic | Cultural figure',
    multi: false,
  },
  // Org categories
  category_orgs: {
    options:
      'Frontier Lab | AI Safety/Alignment | Think Tank/Policy Org | Government/Agency | Academic | VC/Capital/Philanthropy | Labor/Civil Society | Ethics/Bias/Rights | Media/Journalism | Political Campaign/PAC',
    multi: false,
  },
  // Shared fields
  regulatory_stance: {
    options:
      'Accelerate | Light-touch | Targeted | Moderate | Restrictive | Precautionary | Nationalize | Mixed/unclear',
    multi: false,
  },
  evidence_source: {
    options: 'Explicitly stated | Inferred from actions | Inferred from associations',
    multi: false,
  },
  agi_timeline: {
    options:
      'Already here | 2-3 years | 5-10 years | 10-25 years | 25+ years or never | Ill-defined | Unknown',
    multi: false,
  },
  ai_risk_level: {
    options:
      'Overstated | Manageable | Serious | Catastrophic | Existential | Mixed/nuanced | Unknown',
    multi: false,
  },
  threat_models: {
    options:
      'Labor displacement | Economic inequality | Power concentration | Democratic erosion | Cybersecurity | Misinformation | Environmental | Weapons proliferation | Loss of control | Copyright/IP | Existential risk | Bias/discrimination | Privacy | National security',
    multi: true,
  },
  influence_type: {
    options:
      'Decision-maker | Advisor/strategist | Researcher/analyst | Funder/investor | Builder | Organizer/advocate | Narrator | Implementer | Connector/convener',
    multi: true,
  },
  funding_model: {
    options:
      'Venture-backed | Revenue-generating | Government-funded | Philanthropic | Membership | Mixed | Public benefit | Self-funded | Other',
    multi: false,
  },
  status: {
    options: 'pending | approved | rejected',
    multi: false,
  },
}

// Create header with options and selection type
function makeHeader(field, entityType) {
  // Special case for category which differs by entity type
  if (field === 'category') {
    const config =
      entityType === 'people' ? FIELD_OPTIONS.category_people : FIELD_OPTIONS.category_orgs
    return `category [pick 1] (${config.options})`
  }
  if (FIELD_OPTIONS[field]) {
    const config = FIELD_OPTIONS[field]
    const label = config.multi ? 'pick any' : 'pick 1'
    return `${field} [${label}] (${config.options})`
  }
  return field
}

async function main() {
  const client = await pool.connect()

  try {
    // Query people
    const peopleResult = await client.query(`
      SELECT id, name, title, primary_org, other_orgs, category, location,
             regulatory_stance, regulatory_stance_detail, evidence_source,
             agi_timeline, ai_risk_level, threat_models, threat_models_detail,
             influence_type, twitter, bluesky, notes,
             submission_count, status, created_at
      FROM people
      ORDER BY name
    `)

    // Query organizations
    const orgsResult = await client.query(`
      SELECT id, name, category, website, location, funding_model,
             regulatory_stance, regulatory_stance_detail, evidence_source,
             agi_timeline, ai_risk_level, threat_models, threat_models_detail,
             influence_type, twitter, bluesky, notes,
             submission_count, status, created_at
      FROM organizations
      ORDER BY name
    `)

    console.log(`Found ${peopleResult.rows.length} people`)
    console.log(`Found ${orgsResult.rows.length} organizations`)

    // Create workbook
    const wb = XLSX.utils.book_new()

    // Get column names from first row
    const peopleFields = peopleResult.rows.length > 0 ? Object.keys(peopleResult.rows[0]) : []
    const orgFields = orgsResult.rows.length > 0 ? Object.keys(orgsResult.rows[0]) : []

    // Create headers with options
    const peopleHeaders = peopleFields.map((f) => makeHeader(f, 'people'))
    const orgHeaders = orgFields.map((f) => makeHeader(f, 'orgs'))

    // Add People sheet
    const peopleSheet = XLSX.utils.json_to_sheet(peopleResult.rows, { header: peopleFields })
    // Replace header row with custom headers
    peopleFields.forEach((field, idx) => {
      const cell = XLSX.utils.encode_cell({ r: 0, c: idx })
      peopleSheet[cell].v = peopleHeaders[idx]
    })
    XLSX.utils.book_append_sheet(wb, peopleSheet, 'People')

    // Add Organizations sheet
    const orgsSheet = XLSX.utils.json_to_sheet(orgsResult.rows, { header: orgFields })
    // Replace header row with custom headers
    orgFields.forEach((field, idx) => {
      const cell = XLSX.utils.encode_cell({ r: 0, c: idx })
      orgsSheet[cell].v = orgHeaders[idx]
    })
    XLSX.utils.book_append_sheet(wb, orgsSheet, 'Organizations')

    // Write file
    const outputPath = 'data/mapping-ai-export.xlsx'
    XLSX.writeFile(wb, outputPath)

    console.log(`\nExported to ${outputPath}`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Export failed:', err)
  process.exit(1)
})
