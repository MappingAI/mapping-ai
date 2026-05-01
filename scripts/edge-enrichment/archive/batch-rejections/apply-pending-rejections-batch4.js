#!/usr/bin/env node
/**
 * Apply rejections from Claude.ai review of pending_entities edges - Batch 4
 * (Rows 3181-3700 from pending-entities-batch4.csv)
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/apply-pending-rejections-batch4.js --dry-run
 *   node scripts/edge-enrichment/post-process/apply-pending-rejections-batch4.js --apply
 */
import 'dotenv/config'
import pg from 'pg'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

// Rejections from Claude.ai review of batch 4 (rows 3181-3700)
const REJECTIONS = [
  // Informal/non-structured funding
  { funder: 'Rich patrons', recipient: 'Scott Alexander', reason: 'Substack/patron informal gifts, not structured AI funding' },
  { funder: 'Substack subscribers', recipient: 'Scott Alexander', reason: 'Informal subscriptions, not AI' },

  // Non-AI investments/donations
  { funder: 'Richard Branson', recipient: 'Malcolm Murray', reason: 'Train travel offer for charity event, not AI' },
  { funder: 'Richard Calabrese', recipient: 'Georgetown University', reason: 'STEM/medical scholarships bequest, not AI' },
  { funder: 'Richard King Mellon Foundation', recipient: 'Carnegie Mellon University', reason: 'General CMU grant, no AI program described' },
  { funder: 'Richard Phillips', recipient: 'Saint Thomas Aquinas High School', reason: 'High school scholarship, not AI' },
  { funder: 'Richard Phillips', recipient: 'Saint Thomas Aquinas High School students', reason: 'High school scholarship, not AI' },
  { funder: 'Rick Rubin', recipient: 'Magic Spoon', reason: 'Cereal startup investment, not AI' },
  { funder: 'Rives Croissance', recipient: 'Forward Global', reason: 'Strategic consulting firm, not AI' },
  { funder: 'Robert Bosch Stiftung', recipient: 'Munich Security Conference Foundation', reason: 'Security conference donation, not AI' },
  { funder: 'Robert David Lion Gardiner Foundation', recipient: 'Columbia University', reason: 'Digital humanities/historical mapping, not AI' },
  { funder: 'Robert J. Jones', recipient: 'Illinois Commitment program', reason: 'University scholarship contribution, not AI' },
  { funder: 'Robert Wood Johnson Foundation', recipient: 'Brookings', reason: 'Health research think tank support, not AI' },
  { funder: 'Robert Wood Johnson Foundation', recipient: 'RAND Corporation', reason: 'Health/education research, not AI' },
  { funder: 'Robina Foundation', recipient: 'Yale Law School', reason: 'Human rights law endowment, not AI' },
  { funder: 'Rockefeller Brothers Fund', recipient: 'Roosevelt Institute', reason: 'Progressive economic policy support, not AI' },
  { funder: 'Ron Conway', recipient: 'Reddit', reason: 'Social media platform investment, not AI' },
  { funder: 'Ron Lauder', recipient: 'Munich Security Conference Foundation', reason: 'Security conference donation, not AI' },
  { funder: 'Ronald and Marianne Renaud', recipient: 'USC Marshall School of Business', reason: 'Healthcare innovation business program, not AI' },

  // Political donations
  { funder: 'Richard Schaps', recipient: 'John Hickenlooper', reason: 'Political campaign donation' },
  { funder: 'Robert Bigelow', recipient: 'Ron DeSantis', reason: 'Space entrepreneur political donation' },
  { funder: 'Robert F. Kennedy Jr.', recipient: 'Carlos De La Cruz', reason: 'Political fundraising' },
  { funder: 'Robert Kraft', recipient: 'Ed Markey', reason: 'Football owner political donation' },
  { funder: 'Robert Krastch', recipient: 'Amy Klobuchar', reason: 'Political campaign donation' },
  { funder: 'Robert Mercer', recipient: 'Ted Cruz', reason: 'Hedge fund political mega-donation' },
  { funder: 'Robert R Hermann Jr', recipient: 'Eric Schmitt', reason: 'Political donation' },
  { funder: 'Rodger Riney', recipient: 'Eric Schmitt', reason: 'Political campaign donation' },
  { funder: 'Roger Perry', recipient: 'Valerie Foushee', reason: 'Political donation' },
  { funder: 'Rudin family', recipient: 'Kathy Hochul', reason: 'Real estate company political donations' },
  { funder: 'SAXENA, PARAG', recipient: 'Richard Blumenthal', reason: 'Political donation' },
  { funder: 'SUSSMAN, S DONALD', recipient: 'Richard Blumenthal', reason: 'Investment advisor political donation' },
  { funder: 'Sander R Gerber', recipient: 'Steve Scalise', reason: 'Hedge fund CEO political donation' },
  { funder: 'Sara Deen', recipient: 'Alexandria Ocasio-Cortez', reason: 'Political donation' },
  { funder: 'Scott Wiener', recipient: 'California Democratic Party', reason: 'Political party donation' },
  { funder: 'Scott Wiener', recipient: 'Catherine Blakespear', reason: 'Political donation' },
  { funder: 'Scott Wiener', recipient: 'Melissa Hurtado', reason: 'Political donation' },
  { funder: 'Sean Donegan', recipient: 'Alex Bores', reason: 'Political donation' },
  { funder: 'Sean McGarvey', recipient: 'International Union of Painters', reason: 'Union political committee donation' },
  { funder: 'Sean McGarvey', recipient: 'Iupat Member and Family Fundraising', reason: 'Union political committee' },
  { funder: 'Sean McGarvey', recipient: 'Political Educational Fund of Building Trades', reason: 'Union political fund' },
  { funder: 'Seddie LLC', recipient: 'Spencer Cox', reason: 'Real estate company political donation' },
  { funder: 'Senate Conservatives Fund', recipient: 'Josh Hawley', reason: 'Political PAC donation' },
  { funder: 'Senate Leadership Fund', recipient: 'Jon Husted', reason: 'Republican super PAC political spending' },
  { funder: 'Sentinel Action Fund', recipient: 'Jon Husted', reason: 'Political PAC spending' },
  { funder: 'Service Employees International Union', recipient: 'Ayanna Pressley', reason: 'Union PAC' },
  { funder: 'Seville Classics', recipient: 'Ted Lieu', reason: 'Company political donation' },
  { funder: 'Shawna Williams', recipient: 'Valerie Foushee', reason: 'Individual political donation' },
  { funder: 'Shuvro Nil Chowdhury', recipient: 'Ro Khanna', reason: 'Political donation' },
  { funder: 'Steve Wynn', recipient: 'Eric Schmitt', reason: 'Casino billionaire political donation' },
  { funder: 'Suellen Lazarus', recipient: 'Pete Buttigieg', reason: 'Political donation' },
  { funder: 'Swati Mylavarapu', recipient: 'Pete Buttigieg', reason: 'Political donation' },
  { funder: 'THOMAS, JACK E', recipient: 'Josh Hawley', reason: 'Political donation' },
  { funder: 'Therese A Rooney', recipient: 'Todd Young', reason: 'Political donation' },
  { funder: 'Thomas E McInerney', recipient: 'Joni Ernst', reason: 'Political donation' },
  { funder: 'Thomas Secunda', recipient: 'Alex Bores', reason: 'Political donation' },
  { funder: 'Thomas W Smith', recipient: 'Eric Schmitt', reason: 'Political donation' },
  { funder: 'Thomas W Smith', recipient: 'Todd Young', reason: 'Political donation' },
  { funder: 'Tom Klingenstein', recipient: 'Eric Schmitt', reason: 'Political donation' },
  { funder: 'Torus, Inc.', recipient: 'Spencer Cox', reason: 'Energy company political donation' },
  { funder: 'UNITED CATCHER BOATS', recipient: 'Maria Cantwell', reason: 'Fishing industry PAC' },
  { funder: 'UNITED FOOD AND COMMERCIAL WORKERS', recipient: 'Maria Cantwell', reason: 'Grocery union PAC' },
  { funder: 'Unite Here', recipient: 'Ayanna Pressley', reason: 'Hotel/restaurant union PAC' },
  { funder: 'University of Colorado', recipient: 'John Hickenlooper', reason: 'University political donations' },
  { funder: 'WIN IT BACK', recipient: 'Jacky Rosen', reason: 'Political PAC donation' },
  { funder: 'Wall Street employees', recipient: 'Marco Rubio', reason: 'Finance sector political donations' },
  { funder: 'Wayne Paglieri', recipient: 'Andy Kim', reason: 'Political donations' },
  { funder: 'West Texas donors', recipient: 'Tom Sell', reason: 'Political campaign donations' },
  { funder: 'William Ackman', recipient: 'Pete Buttigieg', reason: 'Political campaign donation' },
  { funder: 'YOUNG VICTORY COMMITTEE', recipient: 'Jacky Rosen', reason: 'Political PAC donation' },
  { funder: 'Yuri Vanetik', recipient: 'Cory Gardner', reason: 'Political donation' },
  { funder: 'ZUFFA/UFC', recipient: 'Thomas Umberg', reason: 'Sports company political donation' },
  { funder: 'Zurich North America', recipient: 'Thomas Umberg', reason: 'Insurance company political donation' },
  { funder: 'campaign donors', recipient: 'Tom Sell', reason: 'General political campaign donors' },

  // ITU membership dues
  { funder: 'Russian Federation', recipient: 'ITU', reason: 'ITU membership dues, not AI' },
  { funder: 'Saudi Arabia', recipient: 'ITU', reason: 'ITU membership dues, not AI' },
  { funder: 'United States', recipient: 'ITU', reason: 'ITU membership dues, not AI' },

  // General philanthropy/foundations
  { funder: 'SAG-AFTRA Foundation', recipient: 'Hurricane Relief Fund', reason: 'Disaster relief, not AI' },
  { funder: 'SAP Ventures', recipient: 'LinkedIn', reason: 'Professional network funding, not AI' },
  { funder: 'SAW Entertainment', recipient: 'Scott Wiener', reason: 'Adult entertainment political donation' },
  { funder: 'SC Ventures', recipient: 'Mox', reason: 'Digital banking fintech, not AI' },
  { funder: 'SEAFARERS INTERNATIONAL UNION', recipient: 'Maria Cantwell', reason: 'Maritime union PAC' },
  { funder: 'SFBSC Management', recipient: 'Scott Wiener', reason: 'Adult entertainment political donation' },
  { funder: 'SIG China', recipient: 'ByteDance', reason: 'TikTok parent early investment, not AI' },
  { funder: 'SV Angel', recipient: 'SV Angel Fund VII', reason: 'Self-referential VC fundraising' },
  { funder: 'SV Angel', recipient: 'Y Combinator startups', reason: 'Broad batch seed investment, too vague' },
  { funder: 'Saikat Chakrabarti', recipient: 'Abstract', reason: 'No AI description' },
  { funder: 'Saikat Chakrabarti', recipient: 'Saikat Chakrabarti congressional campaign', reason: 'Self-funded political campaign' },
  { funder: 'Sailing Capital', recipient: 'Mobileye', reason: 'General PE financial investment' },
  { funder: 'Sam Lessin', recipient: 'Marina Mogilko', reason: 'YouTuber revenue share investment, not AI' },
  { funder: 'Santa Fe Institute', recipient: 'Ted Chiang', reason: 'Creative writer-in-residence, not AI research' },
  { funder: 'Saudi Arabia\'s Public Investment Fund', recipient: 'SpaceX', reason: 'Space launch company investment, not AI' },
  { funder: 'Scott Alexander', recipient: 'Kasey Markel', reason: 'ACX grant for corn/agriculture, not AI' },
  { funder: 'Scottish Youth Hostel Association', recipient: 'Malcolm Murray', reason: 'Hostel accommodation for charity walk, not AI' },
  { funder: 'Seattle Foundation', recipient: 'Duy Nguyen', reason: 'General scholarship support, not AI' },
  { funder: 'Secretaría de Políticas Universitarias', recipient: 'Universidad de Buenos Aires', reason: 'Argentine university research, not AI' },
  { funder: 'Shuttleworth Foundation', recipient: 'Cory Doctorow', reason: 'Honorary steward appointment, not financial grant' },
  { funder: 'Sigrid Rausing Trust', recipient: 'Human Rights Data Analysis Group', reason: 'Human rights/war crimes data, not AI' },
  { funder: 'Skoll Foundation', recipient: 'Mozilla Foundation', reason: 'Mozilla Festival Zambia, not AI' },
  { funder: 'Slow Ventures', recipient: 'creator entrepreneurs', reason: 'General creator economy fund, not AI' },
  { funder: 'SBA', recipient: 'Small Business Investment Companies', reason: 'General SBIC program, not AI' },
  { funder: 'SBA', recipient: 'community organizations', reason: 'General entrepreneurship support, not AI' },
  { funder: 'SBA', recipient: 'nonprofits, Resource Partners', reason: 'General entrepreneurship counseling, not AI' },
  { funder: 'SBA', recipient: 'small manufacturers', reason: 'Manufacturing initiative, not AI' },
  { funder: 'SBA', recipient: 'state and territory governments', reason: 'Export expansion program, not AI' },
  { funder: 'Snoop Dogg', recipient: 'Reddit', reason: 'Social media platform investment, not AI' },
  { funder: 'SoftBank Group', recipient: 'OneWeb', reason: 'Satellite internet startup, not AI' },
  { funder: 'Solana Foundation', recipient: 'PublicAI', reason: 'Blockchain/crypto foundation funding, not AI' },
  { funder: 'Someland Foundation', recipient: 'EFF', reason: 'General EFF support, not AI' },
  { funder: 'South Korean government', recipient: 'Seoul National University', reason: 'General university spending target, not AI' },
  { funder: 'Spencer Cox', recipient: 'International Rescue Committee', reason: 'Refugee charity fundraising, not AI' },
  { funder: 'Stanley and Rosemary Hayes Jones', recipient: 'George Mason University', reason: 'Networking testbed lab, not AI' },
  { funder: 'State of California', recipient: '37 startups', reason: 'General small business innovation grants, not AI' },
  { funder: 'State of California', recipient: 'California Workforce Development Board and CalTrans', reason: 'Highway workforce training, not AI' },
  { funder: 'State of California', recipient: 'Discovery Science Center of Orange County', reason: 'Science museum, not AI' },
  { funder: 'State of California', recipient: 'homelessness regions', reason: 'Homeless prevention, not AI' },
  { funder: 'State of California Department of Health Care Access', recipient: 'USC Social Work', reason: 'Substance use disorder training, not AI' },
  { funder: 'State of Colorado', recipient: 'Aspen School District', reason: 'Education funding, not AI' },
  { funder: 'State of Colorado', recipient: 'McKinstry Essention', reason: 'Thermal energy network, not AI' },
  { funder: 'State of Kentucky', recipient: 'University of Louisville', reason: 'Health sciences building capital project, not AI' },
  { funder: 'State of New York', recipient: 'Communities', reason: 'Downtown revitalization, not AI' },
  { funder: 'State of New York', recipient: 'Five manufacturers', reason: 'Heat pump manufacturing grants, not AI' },
  { funder: 'State of New York', recipient: 'Long Island', reason: 'Economic development competition, not AI' },
  { funder: 'State of New York', recipient: 'Mohawk Valley', reason: 'Economic development, not AI' },
  { funder: 'State of New York', recipient: 'New York City', reason: 'Economic development, not AI' },
  { funder: 'State of New York', recipient: 'Southern Tier', reason: 'Economic development, not AI' },
  { funder: 'State of Ohio', recipient: '44 law enforcement agencies', reason: 'Violent crime reduction grants, not AI' },
  { funder: 'State of Texas', recipient: 'Blue Origin', reason: 'Space rocket propulsion, not AI' },
  { funder: 'State of Utah - Attorney General\'s Office', recipient: 'Melissa Holyoak', reason: 'Salary payment, not grant' },
  { funder: 'Stavros Niarchos Foundation', recipient: 'Columbia University', reason: 'Precision psychiatry/mental health, not AI' },
  { funder: 'StepStone', recipient: 'KoBold Metals', reason: 'Mineral exploration investment, not AI' },
  { funder: 'Steven Roth', recipient: 'Dartmouth College', reason: 'Arts center renovation gift, not AI' },
  { funder: 'Stichting Nieuwe Waarde', recipient: 'Future Matters', reason: 'Climate policy EU, not AI' },
  { funder: 'Strong Start to Finish', recipient: 'CUNY', reason: 'Remedial course reform, not AI' },
  { funder: 'Stuart and Molly Sloan', recipient: 'Fred Hutchinson Cancer Center', reason: 'Cancer center gift, not AI' },
  { funder: 'Survival and Flourishing Fund', recipient: 'Good Ancestor Foundation', reason: 'General EA/longtermist support, no clear AI focus' },
  { funder: 'Susan G Komen', recipient: 'Rachel Freedman', reason: 'Breast cancer research, not AI' },
  { funder: 'Susan Ragon', recipient: 'MIT', reason: 'Giant Magellan Telescope construction, not AI' },
  { funder: 'Suzanne Dworak-Peck', recipient: 'USC School of Social Work', reason: 'Social work school endowment, not AI' },
  { funder: 'Suzanne Kelley', recipient: 'Block Center for Technology and Society', reason: 'General tech/society, not AI-specific' },
  { funder: 'Switzerland', recipient: 'WEF', reason: 'Swiss government WEF funding, not AI' },
  { funder: 'T. Rowe Price', recipient: 'KoBold Metals', reason: 'Mineral exploration, not AI' },
  { funder: 'TEDCO', recipient: 'Players Philanthropy Fund', reason: 'Maryland tech grant to philanthropy fund, not AI' },
  { funder: 'Tadashi Yanai', recipient: 'UCLA', reason: 'Japan-US university initiative, not AI' },
  { funder: 'Tanka Foundation', recipient: 'Centre for Future Generations', reason: 'General EA operating support, not AI' },
  { funder: 'Tanoto Foundation', recipient: 'Mayo Clinic', reason: 'Healthcare/personalized medicine, not AI' },
  { funder: 'Ted Turner', recipient: 'United Nations Foundation', reason: 'UN general support, not AI' },
  { funder: 'Templeton World Charity Foundation', recipient: 'Denise Herzing', reason: 'Dolphin communication research, not AI' },
  { funder: 'Tencent', recipient: 'Reddit', reason: 'Social media platform investment, not AI' },
  { funder: 'Tennessee Department of Economic and Community Development', recipient: 'Vanderbilt University', reason: 'Transportation/automotive grants, not AI' },
  { funder: 'Tennessee Valley Authority', recipient: 'University of Tennessee', reason: 'Nuclear engineering chair endowment, not AI' },
  { funder: 'Texas Blockchain Council', recipient: 'Cynthia Lummis', reason: 'Crypto industry political donation' },
  { funder: 'The Andrew H. And Ann R. Tisch Foundation', recipient: 'Brookings', reason: 'General think tank support, not AI' },
  { funder: 'The Andrew W. Mellon Foundation', recipient: 'NYU', reason: 'Cultural knowledge/data protection indigenous, not AI' },
  { funder: 'The Atlantic Philanthropies', recipient: 'Leadership Conference on Civil Rights', reason: 'Civil rights general support, not AI' },
  { funder: 'The Atlantic Philanthropies', recipient: 'Yale Law School', reason: 'Human rights litigation, not AI' },
  { funder: 'The Ballmer Group', recipient: 'Stanford Center on Poverty and Inequality', reason: 'Tax/Census data infrastructure, not AI' },
  { funder: 'The Bill and Donna Marriott Foundation', recipient: 'Mayo Clinic', reason: 'Healthcare transformation, not AI' },
  { funder: 'The Broad Foundations', recipient: 'Khan Academy', reason: 'Education platform support, not AI' },
  { funder: 'The Hutchins Family Foundation', recipient: 'Brookings', reason: 'General think tank support, not AI' },
  { funder: 'The J. Willard and Alice S. Marriott Foundation', recipient: 'Mayo Clinic', reason: 'Healthcare philanthropy, not AI' },
  { funder: 'The Jefferson Trust', recipient: 'University of Virginia', reason: 'General UVA initiatives, not AI' },
  { funder: 'The Kellner Family Foundation', recipient: 'Charles University', reason: 'International scientists visiting, not AI' },
  { funder: 'The LAD Climate Fund', recipient: 'Centre for Future Generations', reason: 'Climate governance, not AI' },
  { funder: 'The Leona M. and Harry B. Helmsley Charitable Trust', recipient: 'Khan Academy', reason: 'Education, not AI' },
  { funder: 'The Long Term for Planet and People foundation', recipient: 'Centre for Future Generations', reason: 'Climate/environment, not AI' },
  { funder: 'The Louisiana Freedom Fund', recipient: 'Bill Cassidy', reason: 'Political super PAC donation' },
  { funder: 'The Lukens Company', recipient: 'Pete Ricketts', reason: 'Political independent expenditure' },
  { funder: 'The Marisla Foundation', recipient: 'Wild Dolphin Project', reason: 'Marine wildlife research, not AI' },
  { funder: 'The McGraw-Hill Companies', recipient: 'LinkedIn', reason: 'Publishing company investing in professional network, not AI' },
  { funder: 'The National Endowment for Democracy', recipient: 'Human Rights Data Analysis Group', reason: 'Human rights data, not AI' },
  { funder: 'The Navigation Fund', recipient: 'Food System Innovations', reason: 'Food/agriculture systems, not AI' },
  { funder: 'The Navigation Fund', recipient: 'Vanguard Charitable Endowment Program', reason: 'Criminal justice reform, not AI' },
  { funder: 'The New York Times', recipient: 'Neediest Cases Fund', reason: 'NFT charity auction, not AI' },
  { funder: 'The O\'Sullivan Foundation', recipient: 'Khan Academy', reason: 'Education platform support, not AI' },
  { funder: 'The Operating Group', recipient: 'Birch Hill Holdings', reason: 'Crypto/blockchain startup, not AI' },
  { funder: 'The Operating Group', recipient: 'HANG Media', reason: 'Media startup, not AI' },
  { funder: 'The Operating Group', recipient: 'Karate Combat', reason: 'Sports/martial arts startup, not AI' },
  { funder: 'The Operating Group', recipient: 'Sport.Fun', reason: 'Sports platform, not AI' },
  { funder: 'The Operating Group', recipient: 'Veera', reason: 'No AI description' },
  { funder: 'The Operating Group', recipient: 'Zodia Markets', reason: 'Crypto exchange, not AI' },
  { funder: 'The Rockefeller Foundation', recipient: 'Forward Global', reason: 'International development experts hub, not AI' },
  { funder: 'The Rockefeller Foundation', recipient: 'RadicalxChange Foundation', reason: 'Governance/democracy tech, not AI' },
  { funder: 'The Silicon Valley Community Foundation', recipient: 'Centre for Future Generations', reason: 'General EA operating support, not AI' },
  { funder: 'The Wallace Foundation', recipient: 'RAND Corporation', reason: 'Health/education/safety research, not AI' },
  { funder: 'Thermo Fisher Scientific', recipient: 'University of Melbourne', reason: 'Biomedical/genomics research, not AI' },
  { funder: 'Thomas A. Russo', recipient: 'Dartmouth College', reason: 'Undergraduate housing gift, not AI' },
  { funder: 'Thomas J. Watson Foundation', recipient: 'Priya Donti', reason: 'Pre-PhD travel fellowship, not AI research funding' },
  { funder: 'Thomson Corp.', recipient: 'Reuters', reason: 'News/media company acquisition, not AI' },
  { funder: 'Thrive Capital', recipient: 'Instacart', reason: 'Grocery delivery platform, not AI' },
  { funder: 'Thrive Capital', recipient: 'Robinhood', reason: 'Online brokerage, not AI' },
  { funder: 'Thrive Capital', recipient: 'San Francisco Giants', reason: 'Sports team minority stake, not AI' },
  { funder: 'Tiger Global', recipient: 'ByteDance', reason: 'TikTok parent PE investment, not AI' },
  { funder: 'Tiger Global Management', recipient: 'AngelList', reason: 'Startup investing platform, not AI' },
  { funder: 'TikTok', recipient: 'creators', reason: 'Creator fund for video creators, not AI' },
  { funder: 'Tim Ney', recipient: 'Nat Friedman', reason: '1990s personal check to programmer, not AI' },
  { funder: 'Toby Ord', recipient: 'charities', reason: 'General global health/poverty charities, not AI' },
  { funder: 'Toby Ord', recipient: 'charities working in poorest countries', reason: 'Global health charities, not AI' },
  { funder: 'Tom Bye and David Bohne', recipient: 'UCLA Department of Linguistics', reason: 'Linguistics endowed chair, not AI' },
  { funder: 'Trager family', recipient: 'University of Louisville', reason: 'Urban micro-forest/green space, not AI' },
  { funder: 'Trail of Bits', recipient: 'iVerify', reason: 'Mobile security startup, not AI' },
  { funder: 'Tribe Capital', recipient: 'Aether', reason: 'Nanoscale molecule assembly, not AI' },
  { funder: 'Trirec', recipient: 'Aether', reason: 'Nanoscale molecule assembly, not AI' },
  { funder: 'True Ventures', recipient: 'Splice', reason: 'Music production platform, not AI' },
  { funder: 'Twenty-nine Dartmouth families', recipient: 'Dartmouth College', reason: 'University housing gift, not AI' },
  { funder: 'Twine Ventures', recipient: 'Wall Street Journal', reason: 'Media company investment, not AI' },
  { funder: 'U.S. Department of Agriculture', recipient: 'Ohio Department of Job and Family Services', reason: 'SNAP recertification IT, not AI' },
  { funder: 'U.S. Department of Education', recipient: 'UNC System', reason: 'Academic degree access/technical upgrades, not AI' },
  { funder: 'U.S. Department of Energy OEM', recipient: 'Vanderbilt University', reason: 'Environmental management/nuclear risk, not AI' },
  { funder: 'U.S. Department of Energy Office of Nuclear Energy', recipient: 'Idaho National Laboratory', reason: 'Nuclear reactor innovation, not AI' },
  { funder: 'U.S. Dept. of HHS', recipient: 'USC Social Work', reason: 'Scholarships for social work students, not AI' },
  { funder: 'U.S. Dept. of HHS Administration for Children and Families', recipient: 'Ohio DJFS', reason: 'Early childhood care/education, not AI' },
  { funder: 'U.S. Department of Labor', recipient: 'American Indians/Alaska Natives', reason: 'Employment/training for indigenous communities, not AI' },
  { funder: 'U.S. Department of Labor', recipient: 'Ohio Reentry Entities', reason: 'Prison reentry workforce programs, not AI' },
  { funder: 'U.S. Department of Labor', recipient: 'State Workforce Agencies', reason: 'Skills training fund, not AI' },
  { funder: 'U.S. Department of Labor', recipient: 'public-private partnerships', reason: 'Infrastructure jobs workforce training, not AI' },
  { funder: 'U.S. Department of Labor', recipient: 'states and territories', reason: 'Registered Apprenticeship expansion, not AI' },
  { funder: 'U.S. Department of State', recipient: '47 exchange alumni teams', reason: 'Citizen diplomacy fund, not AI' },
  { funder: 'U.S. Department of Transportation', recipient: 'Illinois transportation projects', reason: 'Highway/rail infrastructure, not AI' },
  { funder: 'U.S. Department of Transportation', recipient: 'Mississippi infrastructure projects', reason: 'Freight corridor infrastructure, not AI' },
  { funder: 'U.S. Department of Transportation', recipient: 'Research Triangle Park', reason: 'Multimodal transportation center, not AI' },
  { funder: 'U.S. Department of Transportation', recipient: 'cities, counties', reason: 'Roadway safety improvements, not AI' },
  { funder: 'U.S. House of Representatives', recipient: 'Hawai\'i State Department of Law Enforcement', reason: 'Law enforcement funding, not AI' },
  { funder: 'U.S. House of Representatives', recipient: 'University of Hawaii Sea Grant', reason: 'Marine/ocean research, not AI' },
  { funder: 'U.S. National Science Foundation', recipient: 'quantum and nanotechnology sites', reason: 'Quantum/nanoscale facilities, not AI' },
  { funder: 'U.S. Space Force', recipient: 'University of Michigan', reason: 'Spacecraft maneuvering research, not AI' },
  { funder: 'U.S. Treasury Department', recipient: 'State of Colorado', reason: 'Small business credit initiative, not AI' },
  { funder: 'UAE Zayed Award', recipient: 'António Guterres', reason: 'Human fraternity prize, not AI' },
  { funder: 'UC Law SF Foundation', recipient: 'Veena Dubal', reason: 'Outstanding scholarship award for labor law, not AI' },
  { funder: 'UK Atomic Energy Authority', recipient: 'University of Oxford', reason: 'Physics/materials science research, not AI' },
  { funder: 'UOB', recipient: 'Singapore Management University', reason: 'Asian enterprise/business institute, not AI' },
  { funder: 'UPS', recipient: 'Gwanhoo Lee', reason: 'UPS scholarship, not AI' },
  { funder: 'Union Square Ventures', recipient: 'Cloudflare', reason: 'CDN/security startup investment, not AI' },
  { funder: 'Union Square Ventures', recipient: 'Protocol Labs', reason: 'Blockchain/crypto protocol, not AI' },
  { funder: 'Union Square Ventures', recipient: 'Splice', reason: 'Music production platform, not AI' },
  { funder: 'Universal Studios', recipient: 'Lisa Takeuchi Cullen', reason: 'Film/TV overall deal, not AI' },
  { funder: 'Universidad de Buenos Aires', recipient: '97 research projects', reason: 'General university-funded research, not AI' },
  { funder: 'University of Cambridge', recipient: 'Cavendish Laboratory', reason: 'Physics laboratory matching funds, not AI' },
  { funder: 'University of Louisville', recipient: 'Health Equity Innovation Hub', reason: 'Health equity research hub, not AI' },
  { funder: 'University of Louisville', recipient: 'Health Sciences Building', reason: 'Capital construction for health sciences, not AI' },
  { funder: 'University of Louisville', recipient: 'Louisville Clinical and Translational Research Center', reason: 'Clinical research matching funds, not AI' },
  { funder: 'University of North Carolina System', recipient: '12 public universities', reason: 'Nursing education expansion, not AI' },
  { funder: 'University of Pittsburgh', recipient: 'Pittsburgh (city)', reason: 'Neighborhood revitalization/public safety, not AI' },
  { funder: 'University of Virginia', recipient: 'David LaCross gift', reason: 'Business school matching funds, not AI' },
  { funder: 'University of Virginia', recipient: 'UVA Clark Scholars Program', reason: 'Engineering scholarship, not AI-specific' },
  { funder: 'Unless', recipient: 'Aether', reason: 'Nanoscale molecule assembly, not AI' },
  { funder: 'Unorthodox Philanthropy', recipient: 'Arati Prabhakar', reason: 'Social innovation model, not AI grant' },
  { funder: 'V Foundation for Cancer Research', recipient: 'Richard Phillips', reason: 'Cancer research fund, not AI' },
  { funder: 'VicHealth', recipient: 'University of Melbourne', reason: 'Racism/public health postdoctoral fellowships, not AI' },
  { funder: 'Vocal Ventures', recipient: 'Wall Street Journal', reason: 'Media company investment, not AI' },
  { funder: 'Vox Media', recipient: 'Recode', reason: 'Media company acquisition, not AI' },
  { funder: 'Vy Capital', recipient: 'Reddit', reason: 'Social media platform investment, not AI' },
  { funder: 'WPP', recipient: 'Avi Goldfarb', reason: 'Advertising company research support 2009, not AI' },
  { funder: 'Walter Isaacson', recipient: 'Isaacson School for New Media', reason: 'Journalism/media school donation, not AI' },
  { funder: 'Washington Research Foundation', recipient: 'Fred Hutchinson Cancer Center', reason: 'Cancer center technology collaboration, not AI' },
  { funder: 'Weill Family Foundation', recipient: 'UCSF', reason: 'Cancer research, not AI' },
  { funder: 'Wellcome Trust', recipient: 'Thrive Capital', reason: 'VC fund LP investment, not AI' },
  { funder: 'Wellington', recipient: 'Mobileye', reason: 'PE investment in autonomous driving, general financial' },
  { funder: 'Wells Fargo Strategic Capital', recipient: 'Arkose Labs', reason: 'Online fraud prevention cybersecurity, not AI' },
  { funder: 'William & Flora Hewlett Foundation', recipient: 'Leadership Conference Education Fund', reason: 'K-12 teaching/learning, not AI' },
  { funder: 'William and Flora Hewlett Foundation', recipient: 'MIT Sloan Sustainability Initiative', reason: 'Sustainable asset management research, not AI' },
  { funder: 'Winston Churchill Foundation', recipient: 'Sam Rodriques', reason: 'Churchill Scholarship, not AI-specific research grant' },
  { funder: 'Y Combinator', recipient: 'Tenet Industries', reason: 'Swedish drone startup, not AI' },
  { funder: 'Y Combinator', recipient: 'Text Blaze', reason: 'Text expansion/keyboard shortcut tool, not AI' },
  { funder: 'Y Combinator', recipient: 'Totalis', reason: 'Prediction markets/stablecoin startup, not AI' },
  { funder: 'Y Combinator', recipient: 'Watsi', reason: 'Healthcare crowdfunding nonprofit, not AI' },
  { funder: 'Yosemite', recipient: 'UCL', reason: 'Oncology VC firm cancer research, not AI' },
  { funder: 'Yossi Matias', recipient: 'Enso', reason: 'Insufficient description, not AI' },
  { funder: 'Yusuke Umeda', recipient: 'Quartz', reason: 'Debt financing for digital news media, not AI' },
  { funder: 'Zennström Philanthropies', recipient: 'Human Rights Data Analysis Group', reason: 'Human rights data analysis, not AI' },
  { funder: 'entities in Qatar', recipient: 'Georgetown University', reason: 'Foreign funding, primarily political/educational, not AI' },
  { funder: 'global institutional investors', recipient: 'Metaplanet', reason: 'Bitcoin company capital raise, not AI' },
  { funder: 'leading research bodies', recipient: 'Daniel Susskind', reason: 'COVID/labour markets research, not AI' },
  { funder: 'overseas investors', recipient: 'Metaplanet', reason: 'Bitcoin company capital raise, not AI' },
  { funder: 'potential donor', recipient: 'Chris Smalls', reason: 'Labor organizer fundraising, not AI' },
  { funder: 'private and public pensions', recipient: 'B Capital', reason: 'General multi-stage VC fund, not AI' },

  // Suspicious/wrong person citations
  { funder: 'Sanjeev Arora', recipient: 'Chief Minister Rangla Punjab Fund', reason: 'Wrong person - Indian politician, not Princeton CS professor' },
  { funder: 'Techstars', recipient: 'Meta', reason: 'Implausible data error - Techstars investing in Meta 2024' },
  { funder: 'UC Berkeley EECS Department', recipient: 'Nathan Lambert', reason: 'Employment stipend, not external grant' },
  { funder: 'Veritex Community Bank', recipient: 'David S Krueger', reason: 'Wrong person - insurance agent, not AI researcher' },
  { funder: 'a16z Bio Health', recipient: 'Midjourney', reason: 'Likely attribution error - life sciences fund investing in AI image generator' },
  { funder: 'donor (unnamed)', recipient: 'USC Marshall School of Business', reason: 'Wrong institution - citation describes Wharton' },
  { funder: 'iAngels', recipient: 'Simplex', reason: 'Citation doesn\'t mention iAngels, attribution mismatch' },
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

  console.log(`=== APPLY BATCH 4 REJECTIONS (rows 3181-3700) ===`)
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
