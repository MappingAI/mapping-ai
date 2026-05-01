#!/usr/bin/env node
/**
 * Apply rejections from Claude.ai review of pending_entities batch 1
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/apply-pending-rejections-batch1.js --dry-run
 *   node scripts/edge-enrichment/post-process/apply-pending-rejections-batch1.js --apply
 */
import 'dotenv/config'
import pg from 'pg'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

// Rejections from Claude.ai review of batch 1
const REJECTIONS = [
  { funder: '100 Plus Capital', recipient: 'Repair Biotechnologies', reason: 'Biotech/longevity, not AI' },
  { funder: '100 Plus Capital', recipient: 'Thecathealth', reason: 'Health tech, no AI mention' },
  { funder: '100 Plus Capital', recipient: 'Wild Earth', reason: 'Pet food startup, not AI' },
  { funder: '127 alumni and parents', recipient: 'Dartmouth College', reason: 'General university fundraising' },
  { funder: '3DMEDiTech investors', recipient: 'University of Melbourne', reason: 'Medical technologies, not AI' },
  { funder: '8VC', recipient: 'Deliverr', reason: 'E-commerce/logistics, not AI' },
  { funder: '8VC', recipient: 'Saronic', reason: 'Robotic boat drones/defense hardware, no AI focus' },
  { funder: '8VC', recipient: 'Starpath', reason: 'Space resource mining, not AI' },
  { funder: 'A Safer Virginia PAC', recipient: 'Andrew N. Ferguson', reason: 'Political consulting fee' },
  { funder: 'A. James & Alice B. Clark Foundation', recipient: 'University of Virginia', reason: 'General scholarship program' },
  { funder: 'AAAS Leshner Leadership Institute', recipient: 'Michael Littman', reason: 'Science communication fellowship' },
  { funder: 'ADQ', recipient: 'Gates Foundation', reason: 'General philanthropy partnership' },
  { funder: 'AHRC', recipient: 'University College London', reason: 'Humanities doctoral partnership' },
  { funder: 'AIPAC', recipient: 'Steve Scalise', reason: 'Political lobbying donation' },
  { funder: 'AMD', recipient: 'Nutanix', reason: 'Cloud infrastructure, not AI-specific' },
  { funder: 'AMERICAN FEDERATION OF STATE, COUNTY AND MUNICIPAL EMPLOYEES', recipient: 'Valerie Foushee', reason: 'Union PAC political donation' },
  { funder: 'AMERICAN ROLL-ON ROLL-OFF CARRIER GROUP', recipient: 'Maria Cantwell', reason: 'Shipping industry PAC' },
  { funder: 'ASML', recipient: 'Eindhoven Metropolitan Region', reason: 'Transportation infrastructure' },
  { funder: 'ASML', recipient: 'Eindhoven University of Technology', reason: 'General university investment' },
  { funder: 'Academy of Management', recipient: 'Kate Kellogg', reason: 'Academic award, not funding' },
  { funder: 'Accel Partners', recipient: 'Vox Media', reason: 'Media company investment' },
  { funder: 'Airbus', recipient: 'Polytechnique Montréal', reason: 'Gender equity scholarships' },
  { funder: 'Alan Davidson Foundation', recipient: 'Longitude Prize on ALS', reason: 'ALS research, not AI' },
  { funder: 'Alan Davidson Foundation', recipient: 'MND-SMART', reason: 'Motor neurone disease, not AI' },
  { funder: 'Alan Meltzer', recipient: 'American University', reason: 'General university naming gift' },
  { funder: 'Alex Bores', recipient: 'Alex Bores 2026', reason: 'Self-funding political campaign' },
  { funder: 'Alex Hanna', recipient: 'University of Wisconsin-Madison Sociology', reason: 'LGBTQ+ sociology scholarship' },
  { funder: 'Alexandria Ocasio-Cortez', recipient: 'Democratic Congressional Campaign Committee', reason: 'Political party donation' },
  { funder: 'Alfred Lin', recipient: 'Reddit', reason: 'Social media investment' },
  { funder: 'Alfred P. Sloan Foundation', recipient: 'Brookings Institution', reason: 'General think tank support' },
  { funder: 'Alfred P. Sloan Foundation', recipient: 'Bryan Parno', reason: 'Cybersecurity fellowship, not AI' },
  { funder: 'Alfred P. Sloan Foundation', recipient: 'Daniela Rus', reason: 'Old general robotics fellowship (1998)' },
  { funder: 'Alfred P. Sloan Foundation', recipient: 'David Autor', reason: 'Labor economics fellowship' },
  { funder: 'Alfred P. Sloan Foundation', recipient: 'Joshua Gans', reason: 'Economics research' },
  { funder: 'Alfred P. Sloan Foundation', recipient: 'Kate Kellogg', reason: 'Academic award, not direct grant' },
  { funder: 'Alfred P. Sloan Foundation', recipient: 'Shalini Kantayya', reason: 'Documentary film support' },
  { funder: 'Alfred P. Sloan Foundation', recipient: 'danah boyd', reason: 'General research, not specifically AI' },
  { funder: 'Allen & Company', recipient: 'Vox Media', reason: 'Media investment' },
  { funder: 'Allen Lau', recipient: 'University of Toronto', reason: 'General entrepreneurship gift' },
  { funder: 'Alwaleed Philanthropies', recipient: 'UNESCO', reason: 'Cultural/educational projects' },
  { funder: "Alzheimer's Research UK", recipient: 'University of Oxford', reason: 'Alzheimer disease research' },
  { funder: 'Amazon', recipient: 'Housing Equity Fund', reason: 'Affordable housing' },
  { funder: 'Amazon', recipient: 'affordable housing fund', reason: 'Affordable housing' },
  { funder: 'Amazon', recipient: 'local organizations in Puget Sound region', reason: 'Community philanthropy' },
  { funder: 'Amazon, Inc.', recipient: 'Democratic Legislative Campaign Committee', reason: 'Political donation' },
  { funder: 'Amazon.com', recipient: 'CSIS', reason: 'General think tank support' },
  { funder: 'American Academy of Sciences and Letters', recipient: 'Danielle Allen', reason: 'Humanities prize' },
  { funder: 'American Cancer Society', recipient: 'Rachel Freedman', reason: 'Cancer research' },
  { funder: 'American Chemistry Council PAC', recipient: 'Steve Scalise', reason: 'Chemical industry PAC' },
  { funder: 'American Council of Learned Societies', recipient: 'David M. Chalmers', reason: 'Humanities fellowship' },
  { funder: 'American Endowment Foundation', recipient: 'Court Watch NOLA', reason: 'Court monitoring nonprofit' },
  { funder: 'American Federation of Teachers', recipient: '39 affiliates', reason: 'Union education grants' },
  { funder: 'American Federation of Teachers', recipient: 'AFT Innovation Fund', reason: 'Student services, not AI' },
  { funder: 'American Federation of Teachers', recipient: 'Back-to-school grants', reason: 'Literacy grants' },
  { funder: 'American Federation of Teachers', recipient: 'Clinton Foundation', reason: 'Political/charity' },
  { funder: 'American Federation of Teachers', recipient: 'FAST Funds', reason: 'Student housing/food' },
  { funder: 'American Federation of Teachers', recipient: 'Newark Public Schools', reason: 'Teacher training' },
  { funder: 'American Israel Public Affairs Cmte', recipient: 'Jim Banks', reason: 'AIPAC political donation' },
  { funder: 'American Israel Public Affairs Committee', recipient: 'Roger Wicker', reason: 'AIPAC political donation' },
  { funder: 'American Israel Public Affairs Committee', recipient: 'Ted Lieu', reason: 'AIPAC political donation' },
  { funder: 'American Online Giving Foundation', recipient: 'Wild Dolphin Project', reason: 'Marine wildlife research' },
  { funder: 'American Postal Workers Union', recipient: 'Ayanna Pressley', reason: 'Union PAC political donation' },
  { funder: 'American Sociological Association', recipient: 'Kate Kellogg', reason: 'Sociology award' },
  { funder: 'American Staffing Association PAC', recipient: 'Todd Young', reason: 'Staffing industry PAC' },
  { funder: 'American University', recipient: 'students', reason: 'General internship stipends' },
  { funder: 'Americans for Job Security', recipient: 'Ken Buck', reason: 'Political advertising' },
  { funder: 'Amir Banifatemi', recipient: 'Auralife', reason: 'Angel investment, no AI mention' },
  { funder: 'Amir Banifatemi', recipient: 'Digsy', reason: 'Real estate tech' },
  { funder: 'Amir Banifatemi', recipient: 'Payouts Network', reason: 'Payments startup' },
  { funder: 'Amnon Shashua', recipient: 'First Digital Bank', reason: 'Bank startup' },
  { funder: 'Amnon Shashua', recipient: 'WE-19 foundation', reason: 'COVID relief' },
  { funder: 'Amy Meltzer', recipient: 'American University', reason: 'General university gift' },
  { funder: 'Anadarko Petroleum PAC', recipient: 'Cory Gardner', reason: 'Oil industry PAC' },
  { funder: 'Andrew Carnegie', recipient: 'Carnegie Corporation of New York', reason: 'Historical 1911 endowment' },
  { funder: 'Andrew F Barth', recipient: 'Todd Young', reason: 'Political donation' },
  { funder: 'Andrew H Tisch', recipient: 'Alex Bores', reason: 'Political donation' },
  { funder: 'Andrew Tavakoli', recipient: 'USC Marshall School of Business', reason: 'Real estate education gift' },
  { funder: 'Andrew W Mellon Foundation', recipient: 'Mozilla Foundation', reason: 'Justice/equity grant' },
  { funder: 'Angela Calabrese', recipient: 'Georgetown University', reason: 'STEM/medical scholarships' },
  { funder: 'Anita Bekenstein', recipient: 'Andy Kim', reason: 'Political donation' },
  { funder: 'Anthony Basalari', recipient: 'Ro Khanna', reason: 'Political donation' },
  { funder: 'António Guterres', recipient: 'Portuguese Refugees Council', reason: 'Refugee humanitarian' },
  { funder: 'António Guterres', recipient: 'UN High Commissioner for Refugees', reason: 'Refugee humanitarian' },
  { funder: 'Apple', recipient: 'Bay Area Housing Innovation Fund', reason: 'Affordable housing' },
  { funder: 'Apple', recipient: 'Cue', reason: '2013 acquisition, no AI' },
  { funder: 'Apple', recipient: 'Spyware Accountability Initiative', reason: 'Digital rights, not AI' },
  { funder: 'Apple', recipient: 'Trust for the National Mall', reason: 'Ballroom donation' },
  { funder: 'Aramco', recipient: 'CSIS', reason: 'General think tank donor' },
  { funder: 'Ardian', recipient: 'Iliad', reason: 'French telecom' },
  { funder: 'Arnold Ventures', recipient: 'RAND Corporation', reason: 'Health/education research' },
  { funder: 'Arnold Ventures', recipient: 'State of Colorado', reason: 'Economic opportunity program' },
  { funder: 'Art E Favre', recipient: 'Bill Cassidy', reason: 'Political donation' },
  { funder: 'Arts and Humanities Research Council', recipient: 'John Tasioulas', reason: 'Humanities/philosophy' },
  { funder: 'Assurant Inc. PAC', recipient: 'Bill Cassidy', reason: 'Insurance industry PAC' },
  { funder: 'Australia', recipient: 'International Telecommunication Union', reason: 'ITU membership dues' },
  { funder: 'Australian BioCommons', recipient: 'University of Melbourne', reason: 'Biomedical/genomics' },
  { funder: 'Australian Medical Research Future Fund', recipient: 'University of Melbourne', reason: 'Medical research' },
  { funder: 'BBC', recipient: 'Andy Parsons', reason: 'Comedy prize/media' },
  { funder: 'BGR Group', recipient: 'Roger Wicker', reason: 'Lobbying firm political donation' },
  { funder: 'BHP Foundation', recipient: 'Brookings', reason: 'General think tank support' },
  { funder: 'BIGLARI, HAMID', recipient: 'Richard Blumenthal', reason: 'Political donation' },
  { funder: 'Bakes for Breast Cancer', recipient: 'Rachel Freedman', reason: 'Cancer research' },
  { funder: 'Ballmer Group', recipient: 'California State University, Los Angeles', reason: 'Youth mental health' },
  { funder: 'Ballmer Group', recipient: 'National Council for Mental Wellbeing', reason: 'Mental health' },
  { funder: 'Ballmer Group', recipient: 'UCLA Luskin School of Public Affairs', reason: 'Youth mental health' },
  { funder: 'Ballmer Group', recipient: 'Washington State', reason: 'Early childhood education' },
  { funder: 'Bank of America', recipient: 'CSIS', reason: 'General think tank donor' },
  { funder: 'Becton Dickinson and Company PAC', recipient: 'Josh Gottheimer', reason: 'Medical device PAC' },
  { funder: 'Ben Appen', recipient: 'Ron Wyden', reason: 'Political donation' },
  { funder: 'Ben Horowitz', recipient: 'Las Vegas Metropolitan Police', reason: 'Law enforcement philanthropy' },
  { funder: 'Ben Horowitz', recipient: 'entities supporting Harris Walz campaign', reason: 'General political donation' },
  { funder: 'Bezos Earth Fund', recipient: 'UC Berkeley', reason: 'Biodegradable textiles' },
  { funder: 'Bezos family', recipient: 'Fred Hutchinson Cancer Center', reason: 'Cancer research' },
  { funder: 'BioNTech', recipient: 'University of Pennsylvania', reason: 'Biomedical drug fund' },
  { funder: 'Bioplatforms Australia', recipient: 'University of Melbourne', reason: 'Biomedical/genomics' },
  { funder: 'BlackRock, Inc.', recipient: 'The BlackRock Foundation', reason: 'General social impact' },
  { funder: 'Blavatnik Family Foundation', recipient: 'Harvard University', reason: 'Biomedical research' },
  { funder: 'Blavatnik Family Foundation', recipient: 'Yale University', reason: 'Life sciences' },
  { funder: 'Blockchain Builders Fund', recipient: 'PublicAI', reason: 'Crypto/blockchain infrastructure' },
  { funder: 'Bloomberg Philanthropies', recipient: 'Johns Hopkins University', reason: 'Medical school/nursing' },
  { funder: 'Bloomberg Philanthropies', recipient: 'Stony Brook University', reason: 'General innovation grant' },
  { funder: 'Blue Cross and Blue Shield of Kansas', recipient: 'Wichita State University', reason: 'Nursing scholarships' },
  { funder: 'Bobby Kotick', recipient: 'Joni Ernst', reason: 'Gaming CEO political donation' },
  { funder: 'Borealis Philanthropy', recipient: 'Court Watch NOLA', reason: 'Court monitoring' },
  { funder: 'Bowelbabe Fund for Cancer Research UK', recipient: 'UCL', reason: 'Cancer research' },
  { funder: 'Brian Acton', recipient: 'Signal Foundation', reason: 'Encrypted messaging, not AI' },
  { funder: 'Brian Long', recipient: 'Jito Labs', reason: 'Crypto/blockchain' },
  { funder: 'Brown University', recipient: 'Building Futures', reason: 'Workforce organization' },
  { funder: 'Brown University', recipient: 'Community College of Rhode Island', reason: 'General support' },
  { funder: 'Bryce Roberts', recipient: 'Heart To Heart', reason: 'No AI mention' },
  { funder: 'Bukhman Foundation', recipient: 'University of Oxford', reason: 'Diabetes research' },
  { funder: 'C. Michael Armstrong', recipient: 'Johns Hopkins University', reason: 'Stem cell research' },
  { funder: 'CAA', recipient: 'Asteria Film Co.', reason: 'Film production' },
  { funder: 'CAF', recipient: 'Universidad de Buenos Aires', reason: 'Sustainable building' },
  { funder: 'CME Group / MSRI', recipient: 'Susan Athey', reason: 'Economics prize' },
  { funder: 'California Democratic Party', recipient: 'Thomas Umberg', reason: 'State party donation' },
  { funder: 'California Department of General Services', recipient: 'K-12 schools', reason: 'General state procurement' },
  { funder: 'California Department of Technology', recipient: 'California state departments', reason: 'General IT modernization' },
  { funder: 'California Department of Technology', recipient: 'eligible organizations', reason: 'Digital equity/broadband' },
  { funder: 'California State Senate', recipient: 'Heal the Ocean', reason: 'Marine environmental' },
  { funder: 'California State Senate', recipient: 'High-Speed Rail Project', reason: 'Transportation infrastructure' },
  { funder: 'Canada', recipient: 'International Telecommunication Union', reason: 'ITU membership dues' },
  { funder: 'Carnegie Corporation', recipient: 'Chinese Educational Commission', reason: 'Historical 1914 grant' },
  { funder: 'Carnegie Corporation', recipient: 'New York Public Library', reason: 'Historical 1926 grant' },
  { funder: 'Carnegie Corporation', recipient: 'New York Times Company', reason: 'Journalism grant' },
  { funder: 'Carnegie Corporation', recipient: 'Press Forward coalition', reason: 'Local news journalism' },
  { funder: 'Carnegie Corporation', recipient: 'seven organizations', reason: 'Nuclear war risk reduction' },
  { funder: "Carnegie Mellon University's SBI", recipient: 'Bryan Parno', reason: 'Blockchain security' },
  { funder: 'Charity Entrepreneurship', recipient: 'High Impact Professionals', reason: 'EA career support' },
  { funder: 'Charles Merinoff', recipient: 'Josh Gottheimer', reason: 'Beverage industry donation' },
  { funder: 'Charles Pankow Foundation', recipient: 'Federation of American Scientists', reason: 'Construction industry' },
  { funder: 'Chicago Blackhawks Foundation', recipient: 'Think Big!', reason: 'Youth education' },
  { funder: 'China', recipient: 'International Telecommunication Union', reason: 'ITU membership' },
  { funder: 'Chris Gober', recipient: 'Chris Gober campaign', reason: 'Self-funded campaign' },
  { funder: 'Chris Murphy', recipient: 'Indivisible', reason: 'Political organizing' },
  { funder: 'Chris Murphy', recipient: 'grassroots groups', reason: 'Political organizing' },
  { funder: 'Chris Rokos', recipient: 'University of Cambridge', reason: 'School of Government' },
  { funder: 'Cisco Systems PAC', recipient: 'Anna Eshoo', reason: 'Tech company PAC' },
  { funder: 'Citigroup', recipient: 'ByteDance', reason: 'Bank loan facility' },
  { funder: 'Civil-Military Innovation Institute', recipient: 'Roger Wicker', reason: 'Defense/political donation' },
  { funder: 'Club for Growth', recipient: 'Jim Banks', reason: 'Political spending' },
  { funder: 'Club for Growth', recipient: 'Ted Cruz', reason: 'Political campaign' },
  { funder: 'Club for Growth PAC', recipient: 'Chris Gober', reason: 'Political campaign' },
  { funder: 'Clyde Companies', recipient: 'Spencer Cox', reason: 'Construction company donation' },
  { funder: 'Cognizant', recipient: '77 organizations globally', reason: 'General philanthropy' },
  { funder: 'Cognizant', recipient: 'Blind Institute of Technology', reason: 'Disability employment' },
  { funder: 'Cognizant', recipient: 'Center for Inclusive Computing', reason: 'Computing diversity' },
  { funder: 'Cognizant Foundation', recipient: '13 organizations', reason: 'Underrepresented groups' },
  { funder: 'Colloquium on Scholarship', recipient: 'Veena Dubal', reason: 'Labor law award' },
  { funder: 'Comcast Corporation', recipient: 'Steve Scalise', reason: 'Cable company PAC' },
  { funder: 'Comcast Ventures', recipient: 'Asteria Film Co.', reason: 'Film production' },
  { funder: 'Comcast Ventures', recipient: 'Ezra Klein', reason: 'Media/journalism' },
  { funder: 'Comcast Ventures', recipient: 'Vox Media', reason: 'Media investment' },
  { funder: 'Community Bankers Association of Illinois', recipient: 'Joint Economic Committee', reason: 'Banking industry PAC' },
  { funder: 'Congressional Leadership Fund', recipient: 'Laurie Buckhout', reason: 'Political campaign advertising' },
  { funder: 'Conservation Media Group', recipient: 'Shalini Kantayya', reason: 'Documentary filmmaking' },
  { funder: 'Constellation Brands PAC', recipient: 'Cory Gardner', reason: 'Alcohol industry PAC' },
  { funder: 'Constellation Brands PAC', recipient: 'Todd Young', reason: 'Alcohol industry PAC' },
  { funder: 'Cory Doctorow', recipient: 'Ivanhoe Elementary', reason: 'Elementary school donation' },
  { funder: 'Cory Gardner', recipient: 'Marilyn N Musgrave', reason: 'Political donation' },
  { funder: 'Courtois Foundation', recipient: 'Université de Montréal', reason: 'General university fundraising' },
  { funder: 'Cracker Barrel PAC', recipient: 'Marsha Blackburn', reason: 'Restaurant chain PAC' },
  { funder: 'Craig J Duchossois', recipient: 'Bill Cassidy', reason: 'Manufacturing CEO donation' },
  { funder: 'Craig Newmark Philanthropies', recipient: 'Columbia Journalism School', reason: 'Journalism ethics' },
  { funder: 'Craig Newmark Philanthropies', recipient: 'Cybercrime Support Network', reason: 'Cybercrime victim support' },
  { funder: 'Craig Newmark Philanthropies', recipient: 'Poynter Institute', reason: 'Journalism ethics' },
  { funder: 'Craig Smith', recipient: "Children's Hospital Colorado Foundation", reason: 'Pediatric healthcare' },
  { funder: 'Crédit Agricole d\'Ile-de-France', recipient: 'Collège de France', reason: 'Heritage cultural sponsorship' },
  { funder: 'Cybernet Entertainment', recipient: 'Scott Wiener', reason: 'Adult entertainment PAC' },
  { funder: 'Cynthia Secunda', recipient: 'Alex Bores', reason: 'Political donation' },
  { funder: 'DARR, WILLIAM H', recipient: 'Josh Hawley', reason: 'Food industry donation' },
  { funder: 'DFJ', recipient: 'Median', reason: '2004 Series A, no AI mention' },
  { funder: 'DST Global', recipient: 'Console', reason: 'IT ticketing software' },
  { funder: 'DST Global', recipient: 'Upgrade, Inc.', reason: 'Financial services/lending' },
  { funder: 'DURKIN, KEVIN', recipient: 'Richard Blumenthal', reason: 'Political donation' },
  { funder: 'Dana Foundation', recipient: 'The Hastings Center', reason: 'Neuroscience bioethics' },
  { funder: 'Daniel J Hilferty', recipient: 'Todd Young', reason: 'Health insurance CEO donation' },
  { funder: 'Daniel Sturman', recipient: 'Ro Khanna', reason: 'Political donation' },
  { funder: 'Daryl Roth', recipient: 'Dartmouth College', reason: 'Arts center renovation' },
  { funder: 'Data Collective', recipient: 'Redbooth', reason: 'Project management software' },
  { funder: 'Dave McCormick', recipient: 'Dave McCormick campaign', reason: 'Self-funded campaign' },
  { funder: 'David A. Duffield', recipient: 'Cornell University', reason: 'General university donation' },
  { funder: 'David Geffen', recipient: 'Pete Buttigieg', reason: 'Entertainment mogul donation' },
  { funder: 'David LaCross', recipient: 'Darden School of Business', reason: 'Business school gift' },
  { funder: 'David M. LaCross', recipient: 'Darden School of Business', reason: 'Business school gift' },
  { funder: 'David Sacks', recipient: 'GrowSF for Change', reason: 'Local political group' },
  { funder: 'David Sacks', recipient: 'Hillary Clinton', reason: 'Political donation' },
  { funder: 'David Sacks', recipient: 'Mitt Romney', reason: 'Political donation' },
  { funder: 'David Sacks', recipient: 'Republican political action committees', reason: 'General political donations' },
  { funder: 'David Steinglass', recipient: 'Andy Kim', reason: 'Political donation' },
  { funder: 'Davis Polk & Wardwell', recipient: 'Columbia Law School', reason: 'Law school clinic' },
  { funder: 'Dawn Drescher', recipient: 'Against Malaria Foundation', reason: 'Global health charity' },
  { funder: 'Dawn Drescher', recipient: 'Animal Charity Evaluators', reason: 'Animal welfare' },
  { funder: 'Dawn Drescher', recipient: 'Wild Animal Initiative', reason: 'Animal welfare' },
  { funder: 'Dawn Drescher', recipient: 'donor lottery', reason: 'EA donor lottery' },
  { funder: 'Dayton Development Coalition', recipient: 'Joint Economic Committee', reason: 'Regional economic development' },
  { funder: 'Democracy Engine', recipient: 'John Hickenlooper', reason: 'Political donation platform' },
  { funder: 'Denise Cassell', recipient: 'American University', reason: 'General university gift' },
  { funder: 'Dennis Bastas', recipient: 'University of Melbourne', reason: 'Health leadership academy' },
  { funder: 'Department of Defense', recipient: 'Lithium Nevada Corporation', reason: 'Lithium mining' },
  { funder: 'Department of Defense', recipient: 'Magrathea', reason: 'Magnesium metal production' },
  { funder: 'Department of Energy', recipient: '20 projects under INFUSE program', reason: 'Nuclear fusion energy' },
  { funder: 'Department of Energy', recipient: 'grid infrastructure projects', reason: 'Power grid upgrades' },
  // Suspicious/non-funding
  { funder: '40 investors', recipient: 'Data Collective', reason: 'Backwards relationship (investors → VC fund)' },
  { funder: 'ACX Grants', recipient: 'Odyssean Institute', reason: 'Citation says $0 raised' },
  { funder: 'Anjney Midha', recipient: 'AMP', reason: 'Founded, not funded as LP' },
]

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const apply = process.argv.includes('--apply')

  if (!dryRun && !apply) {
    console.log('Usage: --dry-run or --apply')
    process.exit(1)
  }

  console.log(`=== APPLY PENDING ENTITIES REJECTIONS (BATCH 1) ===`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING'}\n`)

  let found = 0, notFound = 0

  for (const rej of REJECTIONS) {
    const result = await neon.query(`
      SELECT discovery_id, source_entity_name, target_entity_name
      FROM edge_discovery
      WHERE LOWER(source_entity_name) = LOWER($1)
        AND LOWER(target_entity_name) = LOWER($2)
        AND status = 'pending_entities'
    `, [rej.funder, rej.recipient])

    if (result.rows.length === 0) {
      console.log(`⊘ Not found: ${rej.funder} → ${rej.recipient}`)
      notFound++
      continue
    }

    found++
    console.log(`✗ ${rej.funder} → ${rej.recipient}`)
    console.log(`  Reason: ${rej.reason}`)

    if (!dryRun) {
      for (const row of result.rows) {
        await neon.query(`
          UPDATE edge_discovery
          SET status = 'rejected',
              review_notes = $2,
              reviewed_at = NOW()
          WHERE discovery_id = $1
        `, [row.discovery_id, rej.reason])
      }
      console.log(`  Rejected ${result.rows.length} edge(s)`)
    }
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Rejections defined: ${REJECTIONS.length}`)
  console.log(`Found: ${found}`)
  console.log(`Not found: ${notFound}`)

  if (dryRun) {
    console.log(`\nRun with --apply to execute.`)
  }

  await neon.end()
}

main().catch(console.error)
