#!/usr/bin/env node
/**
 * Apply rejections from Claude.ai review of pending_entities edges - Batch 3
 * (Rows 2121-2650 from pending-entities-batch3.csv)
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/apply-pending-rejections-batch3.js --dry-run
 *   node scripts/edge-enrichment/post-process/apply-pending-rejections-batch3.js --apply
 */
import 'dotenv/config'
import pg from 'pg'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

// Rejections from Claude.ai review of batch 3 (rows 2121-2650)
const REJECTIONS = [
  // Financial/non-AI startups
  { funder: 'Kevin Weil', recipient: 'Digits', reason: 'Financial software startup, not AI' },
  { funder: 'Kevin Weil', recipient: 'MainStreet', reason: 'SMB tax credit startup, not AI' },
  { funder: 'Kevin Weil', recipient: 'Rival', reason: 'Sports analytics startup, not AI' },
  { funder: 'Khosla Ventures', recipient: 'Glydways', reason: 'Autonomous transit pods, mobility infrastructure not AI' },

  // Political donations
  { funder: 'Kiran Gill', recipient: 'Ro Khanna', reason: 'Political donation' },
  { funder: 'Kraken', recipient: 'Cynthia Lummis', reason: 'Crypto exchange political donation' },
  { funder: 'LAZOWSKI, ALAN B', recipient: 'Richard Blumenthal', reason: 'Parking company CEO political donation' },
  { funder: 'Larry Heyman', recipient: 'Joni Ernst', reason: 'Real estate CEO political donation' },
  { funder: 'Larry Nichols', recipient: 'Marco Rubio', reason: 'Oil executive political donation' },
  { funder: 'Larry Summers', recipient: 'Josh Gottheimer', reason: 'Political campaign donation' },
  { funder: 'Laura Bush', recipient: 'Cory Gardner', reason: 'Political campaign donation' },
  { funder: 'Lee Beaman', recipient: 'Marsha Blackburn', reason: 'Auto dealer political donation' },
  { funder: 'Lockheed Martin', recipient: 'Roger Wicker', reason: 'Defense contractor political donation' },
  { funder: 'M******* A.', recipient: 'Jesse Jackson Jr.', reason: 'Redacted individual political donation' },
  { funder: 'MELUGIN, KIMBERLY', recipient: 'Josh Hawley', reason: 'Individual political donation' },
  { funder: 'MGM Resorts', recipient: 'Catherine Cortez Masto', reason: 'Casino industry political donation' },
  { funder: 'Marc Gonzales', recipient: 'Valerie Foushee', reason: 'AT&T lobbyist political donation' },
  { funder: 'Mark Gallogly', recipient: 'Josh Gottheimer', reason: 'PE firm manager political donation' },
  { funder: 'Mark Lowham', recipient: 'Pete Buttigieg', reason: 'Political campaign donation' },
  { funder: 'Mark Warner', recipient: 'Hashmi for Lt Governor', reason: 'Political donation between politicians' },
  { funder: 'Mark Warner', recipient: 'House Democratic Caucus', reason: 'Political party donation' },
  { funder: 'Mark Warner', recipient: 'Spanberger for Governor', reason: 'Political campaign donation' },
  { funder: 'Marsha Blackburn', recipient: 'Bill Frist', reason: 'Political donation between politicians' },
  { funder: 'Marsha Blackburn', recipient: 'Fred Dalton Thompson', reason: 'Political donation' },
  { funder: 'Marsha Blackburn', recipient: 'Lamar Alexander', reason: 'Political donation' },
  { funder: 'Marsha Blackburn', recipient: 'Steve Gill', reason: 'Political donation' },
  { funder: 'Marsha Blackburn', recipient: 'Tennessee Republican Party', reason: 'Political party donation' },
  { funder: 'Martinus Hoffman Nickerson', recipient: 'Andy Kim', reason: 'Retired individual political donation' },
  { funder: 'McDonald\'s', recipient: 'Ted Lieu', reason: 'Fast food company political donation' },
  { funder: 'Michael J. Muldoon', recipient: 'Eric Schmitt', reason: 'Timeshare megadonor political donation' },
  { funder: 'Mike Johnson', recipient: 'Grow the Majority Committee', reason: 'Political party giving' },
  { funder: 'Mike Johnson', recipient: 'House Republicans', reason: 'Political party giving' },
  { funder: 'Mike Johnson', recipient: 'National Congressional Campaign Committee', reason: 'Political party giving' },
  { funder: 'Mike Johnson', recipient: 'state parties and committees', reason: 'Political party giving' },
  { funder: 'Miyares for Virginia', recipient: 'Andrew N. Ferguson', reason: 'Political salary payment' },
  { funder: 'Multicoin Capital', recipient: 'Cynthia Lummis', reason: 'Crypto fund political donation' },
  { funder: 'NATIONAL AIR TRAFFIC CONTROLLERS ASSOCIATION', recipient: 'Valerie Foushee', reason: 'Union PAC political donation' },
  { funder: 'Netflix', recipient: 'Ted Lieu', reason: 'Streaming company political donation' },
  { funder: 'New Pioneers PAC', recipient: 'Marsha Blackburn', reason: 'Political PAC donation' },
  { funder: 'Noble Energy PAC', recipient: 'Cory Gardner', reason: 'Oil company political donation' },
  { funder: 'NRA', recipient: 'Marsha Blackburn', reason: 'Gun rights organization endorsement/donation' },
  { funder: 'OFFSHORE MARINE SERVICE ASSOCIATION', recipient: 'Maria Cantwell', reason: 'Offshore marine industry PAC' },
  { funder: 'Ohio Republican State Central', recipient: 'Jon Husted', reason: 'Political party donation' },
  { funder: 'Ondřej Havlíček', recipient: 'political party', reason: 'Czech political party donation' },
  { funder: 'PACs', recipient: 'Alexandria Ocasio-Cortez', reason: 'General political PAC receipts' },
  { funder: 'PACs', recipient: 'Laurie Buckhout', reason: 'General political PAC receipts' },
  { funder: 'PELOSI', recipient: 'Valerie Foushee', reason: 'Political donation from Pelosi\'s office' },
  { funder: 'Palmer Luckey', recipient: '58th Presidential Inaugural Committee', reason: 'Trump inauguration donation' },
  { funder: 'Paul Brathwaite', recipient: 'Valerie Foushee', reason: 'Political donation' },
  { funder: 'Paul Reid', recipient: 'Todd Young', reason: 'Oil company CEO political donation' },
  { funder: 'Paul Seo', recipient: 'Andy Kim', reason: 'Political donation' },
  { funder: 'Paul Singer', recipient: 'Marco Rubio', reason: 'Hedge fund megadonor political support' },
  { funder: 'Penthouse Club', recipient: 'Scott Wiener', reason: 'Adult entertainment political donation' },
  { funder: 'Pete Ricketts For Senate', recipient: 'Pete Ricketts', reason: 'Self-funded political campaign' },
  { funder: 'Peter H Coors', recipient: 'Cory Gardner', reason: 'Brewing company political donation' },
  { funder: 'Peter S Kalikow', recipient: 'Joni Ernst', reason: 'Real estate CEO political donation' },
  { funder: 'Peter Thiel', recipient: 'Americans for Job Security', reason: 'General political spending group' },
  { funder: 'Peter Thiel', recipient: 'California Business Roundtable', reason: 'Anti-wealth-tax political donation' },
  { funder: 'Peter Thiel', recipient: 'Mayday PAC', reason: 'Campaign finance reform PAC' },
  { funder: 'Phil Bredesen', recipient: 'John Hickenlooper', reason: 'Political donation between politicians' },
  { funder: 'Portugal\'s parliament', recipient: 'António Guterres', reason: 'Human rights prize' },
  { funder: 'Price Realty Group', recipient: 'Spencer Cox', reason: 'Real estate company political donation' },
  { funder: 'R****** J.', recipient: 'Jesse Jackson Jr.', reason: 'Redacted individual political donation' },
  { funder: 'ROSE, JOHN', recipient: 'Josh Hawley', reason: 'Oracle engineer political donation' },
  { funder: 'Randi Weingarten', recipient: 'Hillary Clinton campaigns', reason: 'Union leader political donation' },
  { funder: 'Randi Weingarten', recipient: 'Ready for Hillary PAC', reason: 'Political campaign donation' },
  { funder: 'Reed Hastings', recipient: 'Pete Buttigieg', reason: 'Netflix CEO political donation' },
  { funder: 'Reef Capital Partners', recipient: 'Spencer Cox', reason: 'Real estate company political donation' },
  { funder: 'Reginald Love', recipient: 'Valerie Foushee', reason: 'Political donation' },
  { funder: 'Reid Hoffman', recipient: 'Kamala Harris campaign', reason: 'Political campaign donation' },
  { funder: 'Reid Hoffman', recipient: 'Mayday PAC', reason: 'Campaign finance reform PAC' },

  // Non-AI foundations/education
  { funder: 'Kirkland & Ellis', recipient: 'Stanford Law School', reason: 'Law school clinical programs, not AI' },
  { funder: 'Konstantin Sokolov', recipient: 'Munich Security Conference Foundation', reason: 'Security conference endowment, not AI' },
  { funder: 'Kuebler Family Foundation', recipient: 'Wild Dolphin Project', reason: 'Marine wildlife, not AI' },
  { funder: 'Kyle O\'Brien', recipient: 'Little Spoon', reason: 'Baby food startup, not AI' },
  { funder: 'Kyunghyun Cho', recipient: 'Soongsil University', reason: 'Korean literature department donation, not AI' },
  { funder: 'Land O\'Lakes', recipient: 'Joint Economic Committee', reason: 'Agriculture cooperative lobbying' },
  { funder: 'Laudes Foundation', recipient: 'Pulitzer Center', reason: 'Journalism/climate reporting, not AI' },
  { funder: 'Laurance S. Rockefeller/Rockefeller Brothers', recipient: 'Sherry Turkle', reason: 'Endowed professorship, general chair not AI grant' },
  { funder: 'Laurene Powell Jobs', recipient: 'Waverley Street Foundation', reason: 'Climate-focused philanthropy, not AI' },
  { funder: 'Laurene Powell Jobs', recipient: 'XQ Super School Project', reason: 'High school education project, not AI' },
  { funder: 'Leinweber Foundation', recipient: 'MIT', reason: 'Theoretical physics research, not AI' },
  { funder: 'Leinweber Foundation', recipient: 'Stanford University', reason: 'Stanford Institute for Theoretical Physics, not AI' },
  { funder: 'Lev Leviev', recipient: 'Mobileye', reason: 'Diamond magnate angel investor, no AI specificity' },
  { funder: 'Li Lu', recipient: 'Columbia Law School', reason: 'Law school library renovation, not AI' },
  { funder: 'Lilly Endowment', recipient: 'Emory University', reason: 'Lay minister education grant, not AI' },
  { funder: 'Lionheart Ventures', recipient: 'Trek Health', reason: 'Healthcare startup, not AI' },
  { funder: 'Lise and Giuseppe Racanelli Foundation', recipient: 'HEC Montréal', reason: 'Business school donation, not AI' },
  { funder: 'Lockheed Martin', recipient: 'CSIS', reason: 'General think tank defense industry donor' },
  { funder: 'Lux Capital', recipient: 'Auris Health', reason: 'Surgical robotics, not AI' },
  { funder: 'Lux Capital', recipient: 'Kurion', reason: 'Nuclear waste cleanup robotics, not AI' },
  { funder: 'Lux Capital', recipient: 'Reflect Orbital', reason: 'Satellite constellation, not AI' },
  { funder: 'Lynn and Sherry Nichols', recipient: 'Wichita State University', reason: 'UAV flight testing facility, not AI' },
  { funder: 'Lynne Benioff', recipient: 'TIME Magazine', reason: 'Media acquisition, not AI' },
  { funder: 'METAvivor', recipient: 'Rachel Freedman', reason: 'Breast cancer research charity, not AI' },
  { funder: 'MIT GOV/LAB', recipient: 'Blair Read', reason: 'Political science dissertation fieldwork, not AI' },
  { funder: 'MIT GOV/LAB', recipient: 'Elizabeth Sperber', reason: 'Political science research, not AI' },
  { funder: 'MIT GOV/LAB', recipient: 'Gabrielle Kruks-Wisner', reason: 'Political science research, not AI' },
  { funder: 'MIT GOV/LAB', recipient: 'Gwyneth McClendon', reason: 'Political science research, not AI' },
  { funder: 'MIT GOV/LAB', recipient: 'Natalia Bueno', reason: 'Political science research, not AI' },
  { funder: 'MIT GOV/LAB', recipient: 'O\'Brien Kaaba', reason: 'Political science research, not AI' },
  { funder: 'MIT GOV/LAB', recipient: 'Tanushree Goyal', reason: 'Political science research, not AI' },
  { funder: 'MIT Knight Science Journalism', recipient: 'Karen Hao', reason: 'Science journalism fellowship, not AI research' },
  { funder: 'MIT Sloan', recipient: 'MIT Climate Policy Center', reason: 'Climate policy research, not AI' },
  { funder: 'MUSIC (Matt Pincus)', recipient: 'Splice', reason: 'Music production platform investment, not AI' },
  { funder: 'MUSIC joint venture', recipient: 'Splice', reason: 'Music platform, not AI' },
  { funder: 'MacArthur Foundation', recipient: 'Community Solutions International', reason: 'Homelessness initiative, not AI' },
  { funder: 'MacArthur Foundation', recipient: 'RF Catalytic Capital', reason: 'Economic justice, not AI' },
  { funder: 'MacArthur Foundation', recipient: 'The Leadership Conference Education Fund', reason: 'Civil rights general operations, not AI' },
  { funder: 'MacArthur Foundation', recipient: 'Writers Guild Foundation', reason: 'Writers fellowship, not AI' },
  { funder: 'MacKenzie Scott', recipient: 'Roosevelt Institute', reason: 'Economic equity/progressive policy, not AI' },
  { funder: 'Macquarie Asset Management', recipient: 'Vertelo', reason: 'EV fleet electrification, not AI' },
  { funder: 'Macquarie Asset Management', recipient: 'Vilogia', reason: 'Affordable housing financing, not AI' },
  { funder: 'Macquarie Asset Management', recipient: 'lyntia', reason: 'Telecom operator financing, not AI' },
  { funder: 'Macroscopic Ventures', recipient: 'Freckle', reason: 'Business/productivity software, not AI' },
  { funder: 'Macroscopic Ventures', recipient: 'Lore', reason: 'Healthcare technology, not AI' },
  { funder: 'Macroscopic Ventures', recipient: 'Zag Bio', reason: 'Biotech, not AI' },
  { funder: 'Maison Luxe NY', recipient: 'Aether', reason: 'Nanoscale molecule assembly, not AI' },
  { funder: 'Manhattan Beer Distributors', recipient: 'Alex Bores', reason: 'Beverage company political donation' },
  { funder: 'Margaret Mitchell', recipient: 'Morehouse College students', reason: 'Historical 1940s education philanthropy' },
  { funder: 'Mastercard Impact Fund', recipient: 'Public Interest Technology University Network', reason: 'General tech education network, not AI-specific' },
  { funder: 'Mati Staniszewski', recipient: 'Mirai', reason: 'No AI description in citation' },
  { funder: 'Mati Staniszewski', recipient: 'Replenit', reason: 'Pre-seed startup, no AI description' },
  { funder: 'Mati Staniszewski', recipient: 'Smartschool', reason: 'Ed tech startup, not AI' },
  { funder: 'Matthew Prince', recipient: 'Scorbit', reason: 'Pinball/gaming tracking startup, not AI' },
  { funder: 'Max Planck Society', recipient: 'John A. Bargh', reason: 'Social psychology research prize, not AI' },
  { funder: 'Mellon Foundation', recipient: 'Wichita State University', reason: 'Humanities internship program, not AI' },
  { funder: 'Menlo Ventures', recipient: 'Chime', reason: 'Neobanking/fintech, not AI' },
  { funder: 'Menlo Ventures', recipient: 'Harness', reason: 'DevOps platform, not AI' },
  { funder: 'Menlo Ventures', recipient: 'ShipBob', reason: 'E-commerce fulfillment, not AI' },
  { funder: 'Meta Charity Funders', recipient: 'Ark Philanthropy', reason: 'EA-adjacent small grant, not AI' },
  { funder: 'Meta Charity Funders', recipient: 'Bedrock', reason: 'No description, unclear' },
  { funder: 'Meta Charity Funders', recipient: 'Benefficienza', reason: 'Italian EA/giving organization, not AI' },
  { funder: 'Meta Charity Funders', recipient: 'Benjamin Anderson', reason: 'UK aid consultation, not AI' },
  { funder: 'Meta Charity Funders', recipient: 'EA Nigeria', reason: 'General EA community, not AI' },
  { funder: 'Meta Charity Funders', recipient: 'Effective Giving Ireland', reason: 'Donation facilitation, not AI' },
  { funder: 'Meta Charity Funders', recipient: 'Ge Effektivt', reason: 'Swedish effective giving, not AI' },
  { funder: 'Meta Charity Funders', recipient: 'Mieux Donner', reason: 'French effective giving, not AI' },
  { funder: 'Meta Charity Funders', recipient: 'Mission Motor', reason: 'Unclear without context' },
  { funder: 'Meta Charity Funders', recipient: 'Overcome', reason: 'Unclear recipient, not AI' },
  { funder: 'Michael Chae', recipient: 'Yale Law School', reason: 'Law school leadership track, not AI' },
  { funder: 'Michel Justen', recipient: 'charity', reason: 'General anonymous charity donation' },
  { funder: 'Mike Krieger', recipient: 'CodeCrafters', reason: 'Software engineering practice platform, not AI' },
  { funder: 'Mike Krieger', recipient: 'GiveWell', reason: 'Global health charity evaluator, not AI' },
  { funder: 'Mike Krieger', recipient: 'Portola', reason: 'Unclear startup, no AI description' },
  { funder: 'Mohammed bin Salman', recipient: 'Uber', reason: 'Ride-sharing investment, not AI' },
  { funder: 'Montréal Exchange', recipient: 'HEC Montréal Foundation', reason: 'Financial derivatives scholarship, not AI' },
  { funder: 'Morgan Stanley', recipient: 'ByteDance', reason: 'Bank debt facility, not AI' },
  { funder: 'Motorola', recipient: 'MIT Media Lab', reason: '1999 connected devices grant, not AI' },
  { funder: 'Mphasis', recipient: 'IIT Madras', reason: 'Quantum computing research, not AI' },
  { funder: 'Mussafer Family Foundation', recipient: 'Tulane University', reason: 'Career readiness/internship, not AI' },
  { funder: 'NASA', recipient: 'Matthew Johnson-Roberson', reason: 'Satellite swarms space technology, not AI' },
  { funder: 'NASA Ames Research Center', recipient: 'Bay Area Environmental Research Institute', reason: 'Earth science/environmental research, not AI' },
  { funder: 'NASA Ames Research Center', recipient: 'SBIR/STTR program recipients', reason: 'General NASA small business grants' },
  { funder: 'NASA Ames Research Center', recipient: 'Starfish Space', reason: 'Satellite debris mitigation, not AI' },
  { funder: 'NEA', recipient: 'Cloudflare', reason: 'Network security/CDN investment, not AI' },
  { funder: 'NOMIS Foundation', recipient: 'David Autor', reason: 'Economics award, not AI research' },
  { funder: 'NRF Foundation', recipient: 'Georgetown University', reason: 'Retail business initiative, not AI' },
  { funder: 'NTIA', recipient: 'Zito Media Communications', reason: 'Rural broadband deployment, not AI' },
  { funder: 'Nathan Cummings Foundation', recipient: 'Roosevelt Institute', reason: 'Climate policy/Justice 40, not AI' },
  { funder: 'National Academy of Sciences', recipient: 'Ryan Calo', reason: 'Honorary events organization, not funding grant' },
  { funder: 'National Association of Manufacturers', recipient: 'Joint Economic Committee', reason: 'Manufacturing lobby political activity' },
  { funder: 'National Association of Wholesaler-Distributors', recipient: 'Joint Economic Committee', reason: 'Wholesale industry lobbying' },
  { funder: 'National Bureau of Economic Research', recipient: 'Danielle Li', reason: 'Faculty research fellow affiliation, not funding' },
  { funder: 'National Cancer Institute', recipient: 'Rachel Freedman', reason: 'Cancer research, not AI' },
  { funder: 'National Cancer Institute', recipient: 'UCL', reason: 'Cancer research, not AI' },
  { funder: 'National Center for Advancing Translational Research', recipient: 'Baylor College of Medicine', reason: 'Clinical/translational biomedical, not AI' },
  { funder: 'National Endowment for the Humanities', recipient: 'Hélène Landemore', reason: 'Humanities lecture course award, not AI' },
  { funder: 'National Institute of General Medical Sciences', recipient: 'University of Louisville', reason: 'Clinical research, not AI' },
  { funder: 'National Institute of Health', recipient: 'Bei Xiao', reason: 'Human material perception psychology, not AI' },
  { funder: 'National Institute of Mental Health', recipient: 'Carnegie Mellon University', reason: '1950s historical computer funding, not current AI grant' },
  { funder: 'NIST', recipient: 'AMAG Consulting', reason: 'Scanning electron microscope simulation, not AI' },
  { funder: 'NIST', recipient: 'Applied Imaging Solutions', reason: 'Imaging standards, not AI' },
  { funder: 'NIST', recipient: 'Michigan Manufacturing Technology Center', reason: 'Manufacturing supply chain, not AI' },
  { funder: 'NIST', recipient: 'Norwich University Applied Research Institutes', reason: 'Cybersecurity/research general, no clear AI tie' },
  { funder: 'NIH', recipient: 'ClearGuide Medical', reason: 'Medical imaging navigation device, not AI' },
  { funder: 'NIH', recipient: 'Francis Doyle', reason: 'Automated glucose regulation/diabetes, not AI' },
  { funder: 'NIH', recipient: 'Matthew Salganik', reason: 'HIV/AIDS social science research, not AI' },
  { funder: 'National Retail Federation', recipient: 'Georgetown University', reason: 'Retail business initiative, not AI' },
  { funder: 'NTIA', recipient: 'California Department of Technology', reason: 'Digital equity/broadband, not AI' },
  { funder: 'NTIA', recipient: 'State of California', reason: 'Digital equity broadband, not AI' },
  { funder: 'NTIA', recipient: 'State of Colorado', reason: 'BEAD broadband deployment, not AI' },
  { funder: 'Natural Capital', recipient: 'Aether', reason: 'Nanoscale molecule assembly, not AI' },
  { funder: 'Naval Ravikant', recipient: 'Bitwise Asset Management', reason: 'Cryptocurrency index fund, not AI' },
  { funder: 'Naval Ravikant', recipient: 'Blockstack', reason: 'Blockchain/crypto platform, not AI' },
  { funder: 'Naval Ravikant', recipient: 'Filecoin', reason: 'Crypto storage protocol, not AI' },
  { funder: 'Naval Ravikant', recipient: 'Galaxy', reason: 'Early-stage startup, insufficient AI description' },
  { funder: 'Naval Ravikant', recipient: 'Notion', reason: 'Note-taking/productivity software, not AI' },
  { funder: 'Naval Ravikant', recipient: 'OpenSea', reason: 'NFT marketplace, not AI' },
  { funder: 'Naval Ravikant', recipient: 'Twitter', reason: 'Social media platform investment, not AI' },
  { funder: 'Naval Ravikant', recipient: 'Uber', reason: 'Ride-sharing investment, not AI' },
  { funder: 'Nestlé', recipient: 'UNESCO', reason: 'Youth projects/grants/training, not AI' },
  { funder: 'New York State', recipient: 'NYS Office of Information Technology Services', reason: 'General state IT procurement, not AI' },
  { funder: 'New York State Assembly', recipient: 'AMDeC Research Facility', reason: 'Medical/research facility, not AI' },
  { funder: 'New York State Assembly', recipient: 'Bedford Stuyvesant Family Health Center', reason: 'Community health center, not AI' },
  { funder: 'New York State Assembly', recipient: 'Brooklyn Academy of Music', reason: 'Arts institution, not AI' },
  { funder: 'New York State Assembly', recipient: 'Brooklyn Public Library', reason: 'Library, not AI' },
  { funder: 'New York State Assembly', recipient: 'Queens Museum of Art', reason: 'Art museum, not AI' },
  { funder: 'New York State Assembly', recipient: 'State University of New York', reason: 'General capital maintenance, not AI' },
  { funder: 'Norman Barry Foundation', recipient: 'Dr Swati Gupta', reason: 'Wrong person - NZ scientist, not Georgia Tech AI researcher' },
  { funder: 'North Carolina General Assembly', recipient: 'UNC System', reason: 'Nursing education expansion, not AI' },
  { funder: 'Northern Illinois Community Initiatives', recipient: 'Think Big!', reason: 'Women/minority entrepreneurship, not AI' },
  { funder: 'Northrop Grumman', recipient: 'CSIS', reason: 'Defense company general think tank donor' },
  { funder: 'Northrop Grumman', recipient: 'USC Viterbi', reason: 'Optical materials research, not AI' },
  { funder: 'Norway', recipient: 'WEF', reason: 'Norway foreign aid to WEF programs, not AI' },
  { funder: 'Norway\'s International Climate and Forest Initiative', recipient: 'Pulitzer Center', reason: 'Climate/rainforest journalism, not AI' },
  { funder: 'Norwegian Agency for Development Cooperation', recipient: 'Pulitzer Center', reason: 'Climate journalism, not AI' },
  { funder: 'Oak Foundation', recipient: 'Human Rights Data Analysis Group', reason: 'Human rights data/war crimes, not AI' },
  { funder: 'Oberlin College', recipient: 'Nick Winter', reason: 'General student entrepreneurship grant, not AI' },
  { funder: 'Office of Refugee Resettlement', recipient: 'Ohio Department of Job and Family Services', reason: 'Refugee services block grant, not AI' },
  { funder: 'Office of Science and Technology Policy', recipient: 'PCAST', reason: 'Administrative budget, not AI grant' },
  { funder: 'Office of the Governor of Indiana', recipient: '15 regions', reason: 'Quality of place/life initiative, not AI' },
  { funder: 'Office of the Governor of Indiana', recipient: 'broadband service providers', reason: 'Broadband connectivity, not AI' },
  { funder: 'Omidyar Network', recipient: 'Garrison Lovely', reason: 'Employment relationship, not external grant' },
  { funder: 'Open Society Foundation', recipient: 'Pulitzer Center', reason: 'Journalism general operating support, not AI' },
  { funder: 'Open Society Foundations', recipient: 'ACLU', reason: 'Civil liberties general support, not AI' },
  { funder: 'Open Society Foundations', recipient: 'CSIS', reason: 'General think tank donor, not AI' },
  { funder: 'Open Society Foundations', recipient: 'Human Rights Data Analysis Group', reason: 'Human rights data analysis, not AI' },
  { funder: 'Orland Bethel', recipient: 'University of Pittsburgh', reason: 'Musculoskeletal research center, not AI' },
  { funder: 'Orland Bethel Family Foundation', recipient: 'University of Pittsburgh', reason: 'Musculoskeletal research expansion, not AI' },
  { funder: 'Osage University Partners', recipient: 'University of Pennsylvania', reason: 'BioNTech therapeutic drugs, not AI' },
  { funder: 'Otoki Ham Tae-ho Foundation', recipient: 'Seoul National University', reason: 'General university donations, not AI' },
  { funder: 'Oxford Internet Institute', recipient: 'Samantha Bradshaw', reason: 'DPhil student affiliation, not grant' },
  { funder: 'PBS Digital', recipient: 'Shirin Ghaffary', reason: 'YouTube journalism series, not AI' },
  { funder: 'Palmer Luckey', recipient: 'Valar Atomics', reason: 'Nuclear energy startup, not AI' },
  { funder: 'Patrick Collison', recipient: 'Arc Institute', reason: 'Biomedical/biology research, not AI' },
  { funder: 'Patrick Collison', recipient: 'Fast Grants', reason: 'COVID-19 research grants, not AI' },
  { funder: 'Patrick Collison', recipient: 'Open Philanthropy Abundance and Growth Fund', reason: 'Housing/infrastructure regulatory reform, not AI' },
  { funder: 'Paul & Daisy Soros Fellowship', recipient: 'Alvaro Bedoya', reason: 'Legal fellowship for privacy/tech lawyer, not AI' },
  { funder: 'Paul & Daisy Soros Fellowships', recipient: 'Tarun Chhabra', reason: 'Indian-American scholarship program, not AI' },
  { funder: 'Paul, Weiss', recipient: 'Jonathan Kanter', reason: 'Law firm partner compensation, not grant' },
  { funder: 'Paycheck Protection Program', recipient: 'Khan Academy', reason: 'PPP COVID loan, not AI' },
  { funder: 'Perry World House', recipient: 'Samantha Bradshaw', reason: 'Fellowship at foreign policy center, not AI' },
  { funder: 'Peter Lee', recipient: 'EnerVenue', reason: 'Grid-scale energy storage, not AI' },
  { funder: 'Peter Wildeford', recipient: 'Against Malaria Foundation', reason: 'Global health charity, not AI' },
  { funder: 'Peter and Brynn Huntsman', recipient: 'University of Utah', reason: 'General university gift, not AI' },
  { funder: 'Petershill Partners', recipient: 'Thrive Capital', reason: 'Investment stake in VC firm, not AI' },
  { funder: 'Phi Beta Kappa Society', recipient: 'The American Scholar', reason: 'Academic society magazine support, not AI' },
  { funder: 'Phillip (Terry) Ragon', recipient: 'MIT', reason: 'Giant Magellan Telescope astronomy, not AI' },
  { funder: 'Pierre Lassonde Family Foundation', recipient: 'Polytechnique Montréal', reason: 'General natural sciences research, not AI' },
  { funder: 'Pivotal', recipient: 'Roosevelt Institute', reason: 'Economic equity/power-balancing policy, not AI' },
  { funder: 'Pivotal Research', recipient: 'Renan Araujo', reason: 'Fellowship program, insufficient AI description' },
  { funder: 'Players Philanthropy Fund', recipient: 'NEO Philanthropy', reason: 'Progressive organizing, not AI' },
  { funder: 'Players Philanthropy Fund', recipient: 'Tides Center', reason: 'Progressive organizing, not AI' },
  { funder: 'Players Philanthropy Fund', recipient: 'Transgender Law Center', reason: 'LGBTQ legal organization, not AI' },
  { funder: 'Plural', recipient: 'Oriole Networks', reason: 'Network connectivity startup, not AI' },
  { funder: 'Plural', recipient: 'Rivanindustries', reason: 'Insufficient description, no AI mention' },
  { funder: 'Powoki Foundation', recipient: 'Centre for Future Generations', reason: 'General EA operating support, not AI' },
  { funder: 'Primary Venture Partners', recipient: 'Plural', reason: 'Kubernetes management platform, not AI' },
  { funder: 'Prosus', recipient: 'DST Global', reason: 'Financial corporate round in VC firm, not AI' },
  { funder: 'Proteus Fund', recipient: 'Court Watch NOLA', reason: 'Court monitoring nonprofit, not AI' },
  { funder: 'Providence Equity Partners', recipient: 'Vox Media', reason: 'Media company investment, not AI' },
  { funder: 'Public Investment Fund', recipient: 'Uber', reason: 'Ride-sharing investment, not AI' },
  { funder: 'Puppy Up Foundation', recipient: 'Princeton University', reason: 'Canine mammary tumor research, not AI' },
  { funder: 'Quadrature Climate Foundation', recipient: 'Centre for Future Generations', reason: 'Climate governance, not AI' },
  { funder: 'Qualcomm', recipient: 'Jio', reason: 'Indian telecom investment, not AI' },
  { funder: 'Qualcomm', recipient: 'MapMyIndia', reason: 'Mapping/navigation company, not AI' },
  { funder: 'Qualcomm', recipient: 'ideaForge', reason: 'Drone startup, not AI' },
  { funder: 'Quebec government', recipient: 'Inovia Capital', reason: 'VC fund LP investment, not AI-specific' },
  { funder: 'Randall R. Kendrick', recipient: 'USC Marshall School of Business', reason: 'Global supply chain management, not AI' },
  { funder: 'Refik Anadol', recipient: 'Turkiye Entrepreneurship Foundation', reason: 'AI artist donation to general entrepreneurship, not AI' },
  { funder: 'Reid Hoffman', recipient: 'Chan Zuckerberg Initiative', reason: 'General CZI philanthropy, not AI' },
  { funder: 'Resilience Reserve', recipient: 'Aether', reason: 'Nanoscale molecule assembly, not AI' },
  { funder: 'Reuben Foundation', recipient: 'University of Oxford', reason: 'General Oxford college scholarships, not AI' },
  { funder: 'Rhodes Trust', recipient: 'Amba Kak', reason: 'Rhodes scholarship academic study, not AI grant' },
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

  console.log(`=== APPLY BATCH 3 REJECTIONS (rows 2121-2650) ===`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING CHANGES'}\n`)

  let found = 0
  let notFound = 0

  for (const rej of REJECTIONS) {
    // Find the edge_discovery record
    const discovery = await neon.query(`
      SELECT discovery_id, source_entity_name, target_entity_name
      FROM edge_discovery
      WHERE LOWER(source_entity_name) = LOWER($1)
        AND LOWER(target_entity_name) = LOWER($2)
        AND status = 'pending_entities'
    `, [rej.funder, rej.recipient])

    if (discovery.rows.length === 0) {
      console.log(`⊘ Not found: ${rej.funder} → ${rej.recipient}`)
      notFound++
      continue
    }

    const disc = discovery.rows[0]
    console.log(`✗ ${disc.source_entity_name} → ${disc.target_entity_name}`)
    console.log(`  Reason: ${rej.reason}`)
    found++

    if (!dryRun) {
      // Update edge_discovery status to rejected
      await neon.query(`
        UPDATE edge_discovery
        SET status = 'rejected',
            review_notes = $2,
            reviewed_at = NOW()
        WHERE discovery_id = $1
      `, [disc.discovery_id, rej.reason])
    }
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Rejections defined: ${REJECTIONS.length}`)
  console.log(`Found in database: ${found}`)
  console.log(`Not found: ${notFound}`)

  if (dryRun) {
    console.log(`\nRun with --apply to execute these rejections.`)
  }

  await neon.end()
}

main().catch(console.error)
