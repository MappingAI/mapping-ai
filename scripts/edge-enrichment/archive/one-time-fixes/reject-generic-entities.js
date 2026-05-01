#!/usr/bin/env node
/**
 * Reject edges with generic/non-AI entities from Claude.ai entity review
 *
 * These are entities that are either:
 * - Generic aggregates ("researchers", "universities", "organizations")
 * - Political donations/PACs
 * - Non-AI philanthropy
 * - Crypto/blockchain without AI connection
 * - Country-level dues (ITU, WEF)
 * - Employment misclassified as grants
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/reject-generic-entities.js --dry-run
 *   node scripts/edge-enrichment/post-process/reject-generic-entities.js --apply
 */
import 'dotenv/config'
import pg from 'pg'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

// REJECT entities from Claude.ai review
const REJECT_ENTITIES = [
  // Generic aggregates
  'Alignment Project researchers',
  'Stanford researchers',
  'universities',
  'Catalyze Impact incubated organizations',
  'eligible organizations',
  'faith-based groups and others',
  'founders building AI with intention, care, and a long-term view',
  'interdisciplinary teams',
  'interdisciplinary teams from DOE National Laboratories, U.S. industry, and academia',
  'journalists',
  'nonprofits, Resource Partners, and educational organizations',
  'open-source AI projects',
  'proof-of-concept projects with local authorities',
  'quantum and nanotechnology research sites',
  'research teams',
  'seed grant recipients across Tulane University',
  'semiconductor research projects',
  'seven organizations',
  'small and medium-sized manufacturers and their partners',
  'small manufacturers',
  'state and local entities',
  'state and territory governments',
  'state, local, and territorial prosecuting agencies',
  'states and territories and local and Tribal communities',
  '10 AI safety projects',
  '12 Tech Hubs',
  '12 projects for industrial catalyst development',
  '12 public universities and North Carolina\'s Area Health Education Centers',
  '13 organizations and institutions',
  '143 researchers from 87 institutions',
  '15 regions representing all 92 counties',
  '19 teams',
  '37 AI startups',
  '37 startups across California',
  '39 separate affiliates and organizations',
  '46 educator-led teams',
  '47 teams of U.S. citizen exchange alumni',
  '610 institutions and their contract research labs',
  'ACX Grants participants',
  'ACX Grants program participants',
  'AFT Innovation Fund recipients',
  'AI Policy Fellowship participants',
  'AI Safety Fellows',
  'AI Safety Fellows program participants',
  'AI governance programs globally',
  'AI researchers',
  'AI resilience projects',
  'AI safety researchers',
  'AI safety whistleblowers',
  'AI startups',
  'AI talent',
  'AI.Humanity Seed Grant Program recipients',
  'Advanced Connectivity Technologies programme recipients',
  'Alignment researchers',
  'American Indians, Alaska Natives, and Native Hawaiians',
  'American universities including Harvard',
  'Anthropic AI Safety Fellows',
  'Astra Fellowship participants',
  'Back-to-school grants programs',
  'Critical Minerals Infrastructure Fund projects',
  'Critical Minerals Research, Development and Demonstration projects',
  'Data Workers\' Inquiry researchers',
  'Dean\'s Innovation Fund contributors',
  'Energy Innovation Program projects',
  'External alignment researchers',
  'FAST (Faculty and Students Together) Funds',
  'Fellows',
  'Fellows (early-career journalists)',
  'First and Last Mile Fund projects',
  'Global Challenges Prize 2017 winners',
  'Incubator participants',
  'India AI infrastructure',
  'India startups',
  'Indian AI startups',
  'Indigenous Natural Resource Partnerships projects',
  'Internship Programme participants',
  'K-12 public schools and community colleges',
  'K-12 schools, colleges, nonprofits, public agencies, and other orgs',
  'Korean universities, research institutes, corporate R&D centers, and startups',
  'Lake, Orange, Riverside... regions',
  'Lawyers and legal professionals',
  'MATS Fellowship recipients',
  'MATS Program scholars',
  'NSF FINDERS FOUNDRY program participants',
  'OpenAI Safety Fellowship participants',
  'Princeton faculty',
  'Princeton faculty and lecturers',
  'SBIR/STTR program recipients',
  'Senior Fellows',
  'Series',
  'Small Business Investment Companies',
  'Sovereign AI Strategic Assets Grants Programme recipients',
  'Stanford Research Teams',
  'Summer Research Fellowship participants',
  'Visiting Fellowship participants',
  'Yale faculty',
  'advocacy efforts',
  'alignment research projects',
  'broadband service providers and utility cooperatives',
  'charities working in the poorest countries',
  'cities, towns, counties, Tribal governments and MPOs',
  'community organisers',
  'community organizations',
  'early-career journalists',
  'charitable donations and grants',
  'contributions and grants',
  'donations',
  'eBay founders',
  'investors including Amazon',
  'philanthropic foundation',
  'private and public pensions, family offices...',
  'private foundations',
  'traditional donors',
  'unspecified funders',
  'unspecified lead investors',
  'Corporate Founding Members',
  'Manifund regrantors',
  'Facebook founders',
  '8 investors',

  // Political donations/PACs
  'Constellation Brands Inc Political Action Committee',
  'Cisco Systems Inc Federal PAC',
  'Cracker Barrel PAC',
  'Directv PAC',
  'Genentech Inc. PAC',
  'Gilead Sciences PAC',
  'H&R Block PAC',
  'Intel Corporation Political Action Committee',
  'International Association of Heat & Frost Insulators',
  'International Association of Machinists',
  'Investment Company Institute PAC',
  'National Rifle Association',
  'Noble Energy PAC',
  'American Postal Workers Union PAC',
  'American Staffing Association PAC',
  'Anadarko Petroleum PAC',
  'SEAFARERS INTERNATIONAL UNION',
  'UNITED FOOD AND COMMERCIAL WORKERS',
  'AMERICAN FEDERATION OF STATE, COUNTY AND MUNICIPAL EMPLOYEES AFL-CIO',
  'AMERICAN ROLL-ON ROLL-OFF CARRIER GROUP PAC',
  'BRANCH 193 NATIONAL ASSOCIATION OF LETTER CARRIERS PAC',
  'Hbp Marketing Llc',
  'Ohio Republican State Central Committee',
  'Senate Appropriations Committee',
  'Kamala Harris campaign',
  'Hashmi for Lt Governor - Ghazala',
  'Smith for Delegate - Stephen',
  'Spanberger for Governor - Abigail',
  'Tennessee Republican Party Federal Election Account',
  'International Union of Painters PAC',
  'Iupat Member and Family Fundraising PC Account',
  'Political Educational Fund of Building Trades',

  // Non-AI philanthropy/research
  'Bowelbabe Fund for Cancer Research UK',
  'Cancer Research UK',
  'National Cancer Institute',
  'Alliance for Clinical Trials Foundation',
  'Against Malaria Foundation (AMF)',
  'Lilly Endowment Inc.',
  'Robert Wood Johnson Foundation',
  'Leinweber Foundation',
  'Edward Fein Charitable Trust',
  'James M. and Cathleen D. Stone Foundation',
  'James S. McDonnell Foundation',
  'Betty and David Koetser Foundation for Brain Research',
  'Bender Foundation, Inc.',
  'Bakala Foundation',
  'Goizueta Foundation',
  'The Hutchins Family Foundation',
  'The Andrew H. And Ann R. Tisch Foundation',
  'The Atlantic Philanthropies',
  'Washington Research Foundation',
  'Weill Family Foundation',
  'Winston Churchill Foundation',
  'Paul & Daisy Soros Fellowship for New Americans',
  'Paul & Daisy Soros Fellowships for New Americans',
  'Shuttleworth Foundation',
  'Someland Foundation',
  'Susan Ragon',
  'Suzanne Dworak-Peck',
  'Suzanne Kelley',
  'Swati Mylavarapu',
  'Tadashi Yanai',
  'Phillip (Terry) Ragon',
  'We Are Family Foundation',

  // Crypto/blockchain without AI
  'Blockchain Capital',
  'a16z crypto',
  'Chainlink Labs',
  'Foresight Ventures',
  'IOBC Capital',
  'NEAR Foundation',
  'Solana Foundation',
  'Filecoin Foundation for the Decentralized Web',
  'Aptos',
  'Aptos Foundation',
  'Block Chain Defense Initiative',
  'Bain Capital Crypto',
  'Polymarket',
  'Augur',
  'Saudi Telecom Group',

  // Non-AI investments/companies
  'Bold.org',
  'Breakthrough Energy Ventures',
  'Bridgepoint Development Capital',
  'British Academy',
  'CME Group and Mathematical Science Research Institute (MSRI)',
  'Campaign for Accountability',
  'Carl ROTH',
  'Carnegie Mellon University\'s Secure Blockchain Initiative',
  'Centre for Innovation and Entrepreneurship at Rotman',
  'Challenge Seattle',
  'Clikia',
  'Cognitive Science Society',
  'Colloquium on Scholarship in Employment and Labor Law',
  'Company Ventures',
  'Conjointly',
  'Cosmos Holdings',
  'Cotchett, Pitre & McCarthy',
  'Dasein Capital',
  'Davis Polk & Wardwell LLP',
  'Didier Elzinga',
  'Digital Trust Foundation',
  'Distributed Global',
  'Dominion Energy',
  'Durable Capital Partners LP',
  'Dwight and Dian Diercks',
  'Eni',
  'Ewing Marion Kauffman Foundation',
  'Financial Industry Regulatory Authority (FINRA)',
  'Finnish Fund for Industrial Cooperation Ltd',
  'First Row Partners',
  'Fit 4 Start',
  'Fonds de solidarité FTQ',
  'Founders Growth Equity Fund',
  'FundersClub',
  'Government of Australia',
  'Government of Japan',
  'Government of the Federal Republic of Germany',
  'Government of the Free State of Bavaria',
  'Gratitude America Ltd',
  'Helena',
  'Henkel',
  'Hitachi',
  'Hogan Lovells',
  'Hutchison Whampoa Group',
  'ICICI Foundation for Inclusive Growth',
  'IIT Kanpur 1986 Batch Alumni',
  'IIT Kanpur 2000 Batch Alumni',
  'IIT Kanpur Alumni',
  'Industrial Technology Investment Corporation',
  'Infinite Capital',
  'Institute for Operations Research and the Management Sciences',
  'Jacob Eliosoff',
  'Jeff and Liesl Wilke',
  'Kaphan Foundation',
  'Keith Block',
  'Kensington Capital Partners',
  'KolnBusiness',
  'Land O\'Lakes Inc',
  'Laurance S. Rockefeller and the Rockefeller Brothers Fund',
  'Lockheed Martin Corporation',
  'MFV Partners',
  'MGM Resorts International',
  'MIT Knight Science Journalism program',
  'MUSIC joint venture with Liontree',
  'Manhattan Beer Distributors LLC',
  'Mark Cuban',
  'Mark and Debra Leslie',
  'Markus Persson',
  'Maxwell Capital',
  'McDonald\'s Corp',
  'Meki',
  'NET Institute',
  'NHMRC',
  'NEH',
  'Noa',
  'Northleaf Capital',
  'Northrop Grumman',
  'Northrop Grumman Corporation',
  'Norway',
  'Norway\'s NICFI',
  'Norwegian Agency for Development Cooperation',
  'OCP Foundation',
  'OVO Fund',
  'Office of the Attorney General of Virginia',
  'Others Others',
  'PROMPT',
  'Paul Forster',
  'Paul, Weiss, Rifkind, Wharton & Garrison',
  'PayPal',
  'PayPal Ventures',
  'Pelion Ventures',
  'Peter and Brynn Huntsman and the Huntsman Family Foundation',
  'Princeton University Center for Human Values',
  'Radicle Impact',
  'Ron Conway',
  'Safar Partners',
  'Scott Levitan',
  'Seldon Lab',
  'Shinrai Investments LLC',
  'Shrug Capital',
  'Strong Start to Finish',
  'Switzerland',
  'TVM Ventures',
  'Taiwan Semiconductor Manufacturing Company',
  'Tom Shaughnessy',
  'Twine Ventures',
  'U.S. Census Bureau',
  'U.S. Department of Education',
  'U.S. Department of Energy Office of Environmental Management',
  'U.S. Department of Health and Human Services',
  'U.S. Department of HHS, Administration for Children and Families',
  'UAE Zayed Award for Human Fraternity',
  'UN institutions',
  'United States Department of Agriculture',
  'Venrock',
  'Vocal Ventures',
  'Vy Capital',
  'Walter Kortschak',
  'XLMedia',
  'Yosemite',
  'ZUFFA LLC/UFC',
  'weXelerate',
  'Accomplice',
  'Alfred Lin',
  'Allan Keen',
  'American Express',
  'Andy Florance',
  'Andy Florance and Heather Florance',
  'Aramco',
  'Archewell Foundation',
  'Assurant Inc. PAC',
  'Backed VC',
  'Baseline Ventures',
  'Bank of America Corporation',
  'Berkeley Law Foundation',
  'BHP Foundation',
  'BMO Capital Markets',

  // Country-level dues
  'France',
  'Germany',
  'Italy',
  'Japan',
  'Russian Federation',
  'Saudi Arabia',
  'United States',

  // Non-AI targets
  'Adobe Film & TV Fund',
  'OneWeb Ltd',
  'Space Exploration Technologies (SpaceX)',
  'Blue Origin, Inc.',
  'Hemlock Semiconductor',
  'Nebraska Department of Transportation',
  'Ohio faith-based institutions',
  'California Workforce Development Board and CalTrans',
  'McKinstry Essention LLC',
  'Zito Media Communications II, LLC',
  'New York Public Library',
  'New York Times Company',
  'Newark Public Schools Red Hawks Rising Teacher Academy',
  'Pinterest Inc.',
  'Pop-Up Magazine Productions, Inc.',
  'Press Forward coalition',
  'Stanford University Trust for Post Retirement',
  'The Atlantic Monthly Group, LLC',
  'The New York Times\'s Neediest Cases Fund',
  'TNW (The Next Web)',
  'UCLA Luskin School of Public Affairs',
  'UCLA Luskin School of Public Affairs Department of Social Welfare',
  'University of Hawaii Sea Grant',
  'University of Wisconsin-Madison Department of Sociology',
  'Wallace Community College-Dothan',
  'Pittsburgh',
  'Singularity Summit',
  'Isaacson School for New Media at Colorado Mountain College',
  'Francis Doyle',
  'Norwich University Applied Research Institutes',
  'Rockefeller Philanthropy Advisors (RPA)',
  'Udacity',
  'Leap Motion',
  'Jaron Lanier startup',

  // Unknown/insufficient info
  '375ai',
  'Alien',
  'AKG Group',
  'AMAG Consulting LLC',
  'Applied Imaging Solutions LLC',
  'Beacon',
  'Brain Co.',
  'ClearGuide Medical',
  'Corridor',
  'Cove',
  'Ego',
  'Elmnts',
  'Ezee Assist',
  'Finster',
  'Glowstick',
  'Helical',
  'Kindling',
  'Lemon Slice',
  'Modem',
  'Monaco',
  'Reppo Labs',
  'Riverside',
  'Sumble',
  'Testmachine',
  'TrueNorth',
  'Valid',
  'Akave',
  'Chinese Educational Commission',
  'C******* D.',
  'Charles "Ed" Bailey',
  'Donors via Every.org',
]

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const apply = process.argv.includes('--apply')

  if (!dryRun && !apply) {
    console.log('Usage:')
    console.log('  --dry-run  Show what would be rejected')
    console.log('  --apply    Actually perform the rejections')
    process.exit(1)
  }

  console.log(`=== REJECT EDGES WITH GENERIC/NON-AI ENTITIES ===`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING CHANGES'}`)
  console.log(`Checking ${REJECT_ENTITIES.length} entity patterns\n`)

  let totalFound = 0
  let totalRejected = 0

  for (const entityName of REJECT_ENTITIES) {
    // Find edges where this entity is source OR target
    const edges = await neon.query(`
      SELECT discovery_id, source_entity_name, target_entity_name
      FROM edge_discovery
      WHERE status = 'pending_entities'
        AND (LOWER(source_entity_name) = LOWER($1) OR LOWER(target_entity_name) = LOWER($1))
    `, [entityName])

    if (edges.rows.length === 0) continue

    totalFound += edges.rows.length
    console.log(`\n${entityName} (${edges.rows.length} edges):`)

    for (const edge of edges.rows) {
      const isSource = edge.source_entity_name.toLowerCase() === entityName.toLowerCase()
      console.log(`  ✗ ${edge.source_entity_name} → ${edge.target_entity_name}`)
      console.log(`    Rejected ${isSource ? 'source' : 'target'}: generic/non-AI entity`)

      if (!dryRun) {
        await neon.query(`
          UPDATE edge_discovery
          SET status = 'rejected',
              review_notes = $2,
              reviewed_at = NOW()
          WHERE discovery_id = $1
        `, [edge.discovery_id, `Entity rejected: ${entityName} is generic/non-AI`])
        totalRejected++
      }
    }
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Entity patterns checked: ${REJECT_ENTITIES.length}`)
  console.log(`Edges found: ${totalFound}`)
  if (!dryRun) {
    console.log(`Edges rejected: ${totalRejected}`)
  }

  if (dryRun) {
    console.log(`\nRun with --apply to execute these rejections.`)
  }

  await neon.end()
}

main().catch(console.error)
