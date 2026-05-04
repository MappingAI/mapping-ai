-- Update Unknown Categories
-- Generated from Claude research on 2026-05-03
--
-- Note: VC/Capital and Philanthropy are currently combined as "VC/Capital/Philanthropy" in the schema
-- This script uses that combined category for now; split later as separate task

BEGIN;

-- ============================================
-- FUNDERS (135 entities)
-- ============================================

-- Philanthropy (using VC/Capital/Philanthropy for now)
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Alfred P. Sloan Foundation' AND category IS NULL OR category = 'Unknown';
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Effective Altruism Funds' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Future Fund' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'FTX Future Fund' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Centre for Effective Altruism' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Hertz Foundation' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Gordon and Betty Moore Foundation' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'The Eric & Wendy Schmidt Fund for Strategic Innovation' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'The Andrew W. Mellon Foundation' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Hector Stiftung' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Andrew Carnegie Foundation' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Community Jameel' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Survival & Flourishing Fund' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Astera Institute' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Effective Altruism Foundation' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'ACX Grants' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Giving What We Can USA Inc.' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Dreamery Foundation' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Heising-Simons Foundation' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Dieter Schwarz Foundation' AND (category IS NULL OR category = 'Unknown');

-- VC/Capital
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Bessemer Venture Partners' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Alameda Research' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Goldman Sachs' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'D. E. Shaw Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Databricks Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Fidelity' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Felicis Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Blackbird Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'DCVC' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Cambridge Innovation Capital' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Baron Capital Group' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Dragoneer' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = '4DX Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Alpha Venture Partners' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Character Capital' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'AlleyCorp' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Conviction Partners' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Airtree Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Adverb Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'CrimsoNox Capital' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Decibel VC' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'FPV Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = '500 Global' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'O''Shaughnessy Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'High-Flyer Capital Management' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'AlbionVC' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'ABN AMRO Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Evolution Equity Partners' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Dawn Capital' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Fidelity Investments Canada' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'General Catalyst' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Bain Capital Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Elevation Capital' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Alumni Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'C5 Capital' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'First Minute Capital' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'AMD Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Adobe Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Polaris Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'RAISE Invest' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'HUMAIN Ventures' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Heron' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Cassini Fund' AND (category IS NULL OR category = 'Unknown');

-- Government/Agency
UPDATE entity SET category = 'Government/Agency' WHERE name = 'NIH' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Advanced Research Projects Agency for Health' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'European Research Council' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Digital Research Alliance of Canada' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Deutsche Forschungsgemeinschaft' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Alberta' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'EPSRC' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Canada Foundation for Innovation' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Federal Economic Development Agency for Southern Ontario' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'European Commission''s AI Office' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Empire State Development' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'British Patient Capital' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'BNDES' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'North Carolina General Assembly' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'State of California Department of Health Care Access and Information' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'U.S. Department of Health and Human Services, Administration for Children and Families' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'CNPq' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Caisse de dépôt et placement du Québec' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Business Development Bank of Canada' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Federal Ministry of Education and Research' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'A*STAR' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Government of India' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'City of Seattle' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'BDC Capital' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Canada First Research Excellence Fund' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Advanced Research Projects Agency-Energy' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'State of Utah - Utah Attorney General''s Office' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Office of Science and Technology Policy' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Organisation for Economic Co-operation and Development (OECD)' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Government/Agency' WHERE name = 'Anusandhan National Research Foundation' AND (category IS NULL OR category = 'Unknown');

-- Deployers & Platforms
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Capital One' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Cisco' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Accenture' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Samsung' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Citi' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'BioNTech SE' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Alibaba' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'BNY' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Booz Allen Hamilton' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Netflix Inc' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Autodesk' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'General Motors' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Baidu' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'BMO' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Forethought' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'GE HealthCare' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Freed' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Harvey' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Borderless AI' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Augment' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Braintrust' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'BAE Systems' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'G42' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Alltius' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Fathom (YC W21)' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Abnormal AI' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Enveil' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Axiamatic' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Applied Intuition' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Kayhan Space' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = '/dev/agents' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Embodied Intelligence' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Asymmetric Security' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Accordance' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Callosum' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Transformer' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Cylake' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'INHealthVI' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Alden Scientific' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Deployers & Platforms' WHERE name = 'Sentinel Bio' AND (category IS NULL OR category = 'Unknown');

-- Infrastructure & Compute
UPDATE entity SET category = 'Infrastructure & Compute' WHERE name = 'Applied Materials, Inc.' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Infrastructure & Compute' WHERE name = 'CoreWeave' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Infrastructure & Compute' WHERE name = 'Fathom Computing' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Infrastructure & Compute' WHERE name = 'CommonAI' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Infrastructure & Compute' WHERE name = 'Antimetal' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Infrastructure & Compute' WHERE name = 'GlobalFoundries' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Infrastructure & Compute' WHERE name = 'Annapurna Labs' AND (category IS NULL OR category = 'Unknown');

-- Academic
UPDATE entity SET category = 'Academic' WHERE name = 'CIFAR' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Academic' WHERE name = 'Cambridge Enterprise' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Academic' WHERE name = 'American Association for the Advancement of Science' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Academic' WHERE name = 'AAAS Leshner Leadership Institute for Public Engagement with Science' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Academic' WHERE name = 'Harvard Technology and Public Purpose program' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Academic' WHERE name = 'Centre for Innovation and Entrepreneurship at the Rotman School of Management' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Academic' WHERE name = 'Acceleration Consortium' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Academic' WHERE name = 'Australian Research Council Centre of Excellence on Automated Decision-Making & Society' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Academic' WHERE name = 'Vector Institute' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Academic' WHERE name = 'Empire AI Consortium' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Academic' WHERE name = 'Aalto University' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Academic' WHERE name = 'Delaware Innovation Space' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Academic' WHERE name = 'TU Berlin' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Academic' WHERE name = 'Center for Mind, Brain, and Consciousness (NYU)' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Academic' WHERE name = 'Centre for Human-Inspired Artificial Intelligence (CHIA)' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Academic' WHERE name = 'Cardiff University' AND (category IS NULL OR category = 'Unknown');

-- Think Tank/Policy Org
UPDATE entity SET category = 'Think Tank/Policy Org' WHERE name = 'Horizon Institute for Public Service' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Think Tank/Policy Org' WHERE name = 'Center for Security and Emerging Technology' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Think Tank/Policy Org' WHERE name = 'Global Priorities Institute' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Think Tank/Policy Org' WHERE name = 'Blueprint' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Think Tank/Policy Org' WHERE name = 'Future of Privacy Forum' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Think Tank/Policy Org' WHERE name = 'Ash Institute for Democratic Governance and Innovation' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Think Tank/Policy Org' WHERE name = 'Orion AI Governance Initiative' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Think Tank/Policy Org' WHERE name = 'Data & Society Research Institute' AND (category IS NULL OR category = 'Unknown');

-- AI Safety/Alignment
UPDATE entity SET category = 'AI Safety/Alignment' WHERE name = 'Center for Existential Safety' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'AI Safety/Alignment' WHERE name = 'Canadian Singularity Institute for Artificial Intelligence' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'AI Safety/Alignment' WHERE name = 'AI Safety Fund' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'AI Safety/Alignment' WHERE name = 'London Initiative for Safe AI' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'AI Safety/Alignment' WHERE name = '2077AI Open Source Foundation' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'AI Safety/Alignment' WHERE name = 'Atla' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'AI Safety/Alignment' WHERE name = 'Nous' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'AI Safety/Alignment' WHERE name = 'CFAR' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'AI Safety/Alignment' WHERE name = 'Haize Labs' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'AI Safety/Alignment' WHERE name = 'AI Safety Poland' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'AI Safety/Alignment' WHERE name = 'LASR Labs' AND (category IS NULL OR category = 'Unknown');

-- Ethics/Bias/Rights
UPDATE entity SET category = 'Ethics/Bias/Rights' WHERE name = 'DAIR' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Ethics/Bias/Rights' WHERE name = 'Created by Humans' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Ethics/Bias/Rights' WHERE name = 'AI Accountability Lab' AND (category IS NULL OR category = 'Unknown');

-- Labor/Civil Society
UPDATE entity SET category = 'Labor/Civil Society' WHERE name = 'Apache Software Foundation' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Labor/Civil Society' WHERE name = 'American Talent Initiative' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Labor/Civil Society' WHERE name = 'Civic Hall' AND (category IS NULL OR category = 'Unknown');

-- Investor (individuals)
UPDATE entity SET category = 'Investor' WHERE name = 'Dustin Moskovitz and Cari Tuna' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Investor' WHERE name = 'Erik Otto' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Investor' WHERE name = 'Brad Burnham' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Investor' WHERE name = 'David Siegel' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Investor' WHERE name = 'Eric Ries' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Investor' WHERE name = 'Clement Delangue' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Investor' WHERE name = 'Gordon Irlam' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Investor' WHERE name = 'Adam Dingle' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Investor' WHERE name = 'Juliana Seawell' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Investor' WHERE name = 'Greg Colbourn' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Investor' WHERE name = 'Ben Delo' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Investor' WHERE name = 'Eva Lau' AND (category IS NULL OR category = 'Unknown');

-- Researcher (individuals)
UPDATE entity SET category = 'Researcher' WHERE name = 'Carl Shulman' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Researcher' WHERE name = 'Alex Kastner' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Researcher' WHERE name = 'Andrew Tulloch' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Researcher' WHERE name = 'Aidan O''Gara' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Researcher' WHERE name = 'Christian Schroeder de Witt' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Researcher' WHERE name = 'Eitán Sprejer' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Researcher' WHERE name = 'Aaron Maiwald' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Researcher' WHERE name = 'Alan Chan' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Researcher' WHERE name = 'Alexander Turner' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Researcher' WHERE name = 'Caleb Withers' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Researcher' WHERE name = 'Florian Tramer' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Researcher' WHERE name = 'Akbir Khan' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Researcher' WHERE name = 'Ashwinee Panda' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Researcher' WHERE name = 'Bonaventure Dossou' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'Researcher' WHERE name = 'Gabriel Mukobi' AND (category IS NULL OR category = 'Unknown');

-- Executive (individuals)
UPDATE entity SET category = 'Executive' WHERE name = 'Anil Varanasi' AND (category IS NULL OR category = 'Unknown');

-- Organizer (individuals)
UPDATE entity SET category = 'Organizer' WHERE name = 'Anna Counselman' AND (category IS NULL OR category = 'Unknown');

-- Philanthropy (EA orgs using VC/Capital/Philanthropy)
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Global AI Opportunity Fund' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Ethics and Governance of Artificial Intelligence Fund' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Effective Altruists of Berkeley' AND (category IS NULL OR category = 'Unknown');
UPDATE entity SET category = 'VC/Capital/Philanthropy' WHERE name = 'Czech Association for Effective Altruism' AND (category IS NULL OR category = 'Unknown');

COMMIT;

-- Verification query
SELECT category, COUNT(*) as count
FROM entity
WHERE category IS NOT NULL
GROUP BY category
ORDER BY count DESC;
