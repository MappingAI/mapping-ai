# Sample Data for Edge Review Discussion

Generated: 2026-04-02T22:28:03.464Z

## Context

This is a sample of 50 people and 50 organizations from our AI policy stakeholder map database.

**The Problem:**
- `primary_org` is a TEXT field on each person (e.g., "OpenAI")
- `edge` table contains actual relationships (person → org, org → org)
- These can be mismatched: person says primary_org="OpenAI" but has no edge to OpenAI

**Edge types:** affiliated, employed_by, person_organization, collaborator, funder, critic, board_member, advisor, founder, authored_by

---

## PEOPLE (50 sample)

### [12] Anton Korinek
- **Category:** Academic
- **Title:** Professor of Economics, University of Virginia Department of Economics and Darden School of Business; Faculty Director, Economics of Transformative AI Initiative
- **primary_org:** University of Virginia
- **other_orgs:** Nonresident Senior Fellow at Brookings Institution and Peterson Institute for International Economics, Research Associate at National Bureau of Economic Research (NBER), Research Fellow at Centre
- **Edges:**
  - → Brookings Institution (affiliated, UVA ★)
- **Status:** ❓ ORG NOT IN DB

### [103] Arvind Narayanan
- **Category:** Academic
- **Title:** Professor of Computer Science and Director of the Center for Information Technology Policy
- **primary_org:** Princeton University
- **other_orgs:** Stanford University (former postdoc), University of Texas at Austin (PhD), Indian Institute of Technology Madras (undergraduate), Knight First Amendment Institute (collaborator)
- **Edges:**
  - → Institute for AI Policy and Strategy (affiliated, Professor of Computer Science, Princeton University ★)
- **Status:** ❓ ORG NOT IN DB

### [94] Daniel Ho
- **Category:** Academic
- **Title:** William Benjamin Scott and Luna M. Scott Professor of Law, Professor of Political Science, Professor of Computer Science (by courtesy), Senior Fellow at Stanford Institute for Human-Centered AI, 
- **primary_org:** Stanford RegLab
- **other_orgs:** National Artificial Intelligence Advisory Committee (NAIAC), Senior Advisor on Responsible AI at U.S. Department of Labor, Public Member of Administrative Conference of the United States (ACUS), 
- **Edges:**
  - → Stanford HAI (affiliated, Stanford RegLab ★)
- **Status:** ⚠️ MISMATCH (primary_org exists but no edge)

### [52] Daron Acemoglu
- **Category:** Academic
- **Title:** Institute Professor of Economics, MIT; Nobel Prize Winner in Economic Sciences (2024)
- **primary_org:** Massachusetts Institute of Technology
- **other_orgs:** MIT Stone Center on Inequality and Shaping the Future of Work (Faculty Co-Director), MIT Blueprint Labs (Research Affiliate), National Academy of Sciences (Fellow), American Philosophical Society
- **Edges:**
  - → AI Risk Mitigation Fund (affiliated, MIT Economics ★)
- **Status:** ❓ ORG NOT IN DB

### [100] Erik Brynjolfsson
- **Category:** Academic
- **Title:** Jerry Yang and Akiko Yamazaki Professor and Senior Fellow at Stanford Institute for Human-Centered AI; Director of Stanford Digital Economy Lab; Ralph Landau Senior Fellow at Stanford Institute f
- **primary_org:** Stanford University
- **other_orgs:** National Bureau of Economic Research (Research Associate), Stanford Graduate School of Business (Professor by Courtesy), Stanford Department of Economics (Professor by Courtesy), formerly MIT
- **Edges:**
  - → Stanford HAI (affiliated, Stanford HAI ★)
- **Status:** ❓ ORG NOT IN DB

### [55] Fei-Fei Li
- **Category:** Academic
- **Title:** Co-Director, Stanford Institute for Human-Centered Artificial Intelligence; Co-founder, World Labs
- **primary_org:** Stanford University
- **other_orgs:** Former Chief Scientist at Google Cloud (2017-2018), Co-founder AI4ALL (2017), Joint California Policy Working Group on AI Frontier Models Co-Lead (2024-2025), Former Director Stanford AI Lab (201
- **Edges:** (none)
- **Status:** ⚠️ NO EDGES (has primary_org)

### [53] Ganesh Sitaraman
- **Category:** Academic
- **Title:** New York Alumni Chancellor's Chair in Law & Professor of Law; Director of the Vanderbilt Policy Accelerator for Political Economy and Regulation
- **primary_org:** Vanderbilt University Law School
- **other_orgs:** Roosevelt Institute, Center for American Progress (former senior fellow), Elizabeth Warren's 2012 Senate campaign (former policy director and senior counsel)
- **Edges:**
  - → Tsinghua University (AI governance) (affiliated, Vanderbilt Law ★)
  - → Center for American Progress (affiliated, Vanderbilt Law ★)
- **Status:** ❓ ORG NOT IN DB

### [56] Latanya Sweeney
- **Category:** Academic
- **Title:** Daniel Paul Professor of the Practice of Government and Technology, Harvard Kennedy School and Harvard Faculty of Arts and Sciences; Director and Founder, Public Interest Tech Lab; Editor-in-Chie
- **primary_org:** Harvard University
- **other_orgs:** Former Chief Technology Officer, U.S. Federal Trade Commission; Former Distinguished Career Professor of Computer Science, Technology and Policy, Carnegie Mellon University; Director and Founder,
- **Edges:**
  - → Tsinghua University (AI governance) (affiliated, Harvard ★)
- **Status:** ❓ ORG NOT IN DB

### [21] Lawrence Lessig
- **Category:** Academic
- **Title:** Roy L. Furman Professor of Law and Leadership at Harvard Law School
- **primary_org:** Harvard Law School
- **other_orgs:** Founder of Equal Citizens, Founding board member of Creative Commons, Scientific Board of AXA Research Fund, American Academy of Arts and Sciences, American Philosophical Society
- **Edges:** (none)
- **Status:** ⚠️ NO EDGES (has primary_org)

### [54] Mariana Mazzucato
- **Category:** Academic
- **Title:** Professor in the Economics of Innovation and Public Value at University College London, Founding Director of UCL Institute for Innovation and Public Purpose
- **primary_org:** University College London
- **other_orgs:** Co-Chair of Global Commission on the Economics of Water, Co-Chair of Group of Experts to G20 Taskforce for Global Mobilization Against Climate Change, Chair of WHO Council on the Economics of Hea
- **Edges:**
  - → Tsinghua University (AI governance) (affiliated, UCL IIPP ★)
- **Status:** ❓ ORG NOT IN DB

### [803] Mitesh Khapra
- **Category:** Academic
- **Title:** Associate Professor, Department of Data Science and AI, IIT Madras; Co-founder of AI4Bharat
- **primary_org:** IIT Madras
- **other_orgs:** AI4Bharat, One Fourth Labs, Nilekani Centre at AI4Bharat
- **Edges:**
  - → IIT Madras (affiliated, Associate Professor ★)
- **Status:** ✓

### [798] Priya Donti
- **Category:** Academic
- **Title:** Assistant Professor and Silverman Family Career Development Professor, MIT EECS and LIDS
- **primary_org:** MIT
- **other_orgs:** Co-founder and Chair of Climate Change AI nonprofit, MIT-IBM Watson AI Lab
- **Edges:** (none)
- **Status:** ⚠️ NO EDGES (has primary_org)

### [31] Regina Barzilay
- **Category:** Academic
- **Title:** School of Engineering Distinguished Professor for AI and Health, MIT; AI Faculty Lead, Jameel Clinic
- **primary_org:** MIT
- **other_orgs:** Board of Directors at Dewpoint Therapeutics (2020-present), Scientific Advisory Board at Immunai (2019-present), Scientific Advisory Board at Janssen R&D/Johnson & Johnson (2018-present), America
- **Edges:**
  - → AI Risk Mitigation Fund (affiliated, MIT ★)
- **Status:** ❓ ORG NOT IN DB

### [58] Sandy Pentland
- **Category:** Academic
- **Title:** Toshiba Professor of Media Arts and Sciences at MIT; HAI Fellow at Stanford University
- **primary_org:** MIT Media Lab
- **other_orgs:** Stanford Institute for Human-Centered Artificial Intelligence (HAI) Fellow, UN Secretary General's Data Revolutionaries, World Economic Forum Council Member, U.S. National Academy of Engineering, MIT Connection Science Director, Trust::Data Alliance 
- **Edges:**
  - → AI Risk Mitigation Fund (affiliated, MIT ★)
- **Status:** ⚠️ MISMATCH (primary_org exists but no edge)

### [57] Sayash Kapoor
- **Category:** Academic
- **Title:** Ph.D. Candidate in Computer Science, Center for Information Technology Policy
- **primary_org:** Princeton University
- **other_orgs:** Mozilla (Senior Fellow), Princeton Center for Human Values (former Laurance S. Rockefeller Fellow), Facebook (former software engineer), Columbia University (former researcher), EPFL Switzerland 
- **Edges:**
  - → Princeton (Narayanan/Kapoor AI Snake Oil) (affiliated, Princeton ★)
- **Status:** ❓ ORG NOT IN DB

### [26] Simon Johnson
- **Category:** Academic
- **Title:** Ronald A. Kurtz (1954) Professor of Entrepreneurship, MIT Sloan School of Management; Co-director, MIT Shaping the Future of Work Initiative
- **primary_org:** MIT Sloan
- **other_orgs:** NBER Research Associate, Stone Center on Inequality and Shaping the Future of Work, Blueprint Labs MIT Research Affiliate, Project Syndicate columnist (since 2010), Fannie Mae Board of Directors 
- **Edges:** (none)
- **Status:** ⚠️ NO EDGES (has primary_org)

### [1] Stuart Russell
- **Category:** Academic
- **Title:** Professor of Computer Science, UC Berkeley / Director, Center for Human-Compatible AI / President, International Association for Safe & Ethical AI
- **primary_org:** University of California, Berkeley
- **other_orgs:** Distinguished Professor of Computational Precision Health at UCSF, Co-chair of World Economic Forum's Council on AI, Co-chair of OECD Expert Group on AI Futures, US representative at Global Partn
- **Edges:** (none)
- **Status:** ⚠️ NO EDGES (has primary_org)

### [120] Suresh Venkatasubramanian
- **Category:** Academic
- **Title:** Director, Center for Technological Responsibility, Reimagination, and Redesign (CNTR), Brown University
- **primary_org:** Brown University
- **other_orgs:** Former Assistant Director for Science and Justice, White House Office of Science and Technology Policy (2021-2022); Board Member, Data & Society; Former Board Member, ACLU Utah (2017-2021); Forme
- **Edges:**
  - → Tsinghua University (AI governance) (affiliated, Director, Center for Tech Responsibility, Brown University ★)
- **Status:** ❓ ORG NOT IN DB

### [101] Tim Wu
- **Category:** Academic
- **Title:** Julius Silver Professor of Law, Science and Technology at Columbia Law School
- **primary_org:** Columbia University
- **other_orgs:** Former Special Assistant to the President for Technology and Competition Policy (White House, 2021-2023), Former Senior Advisor at Federal Trade Commission (2011-2012), Former Senior Enforcement 
- **Edges:**
  - → Tsinghua University (AI governance) (affiliated, Columbia Law ★)
- **Status:** ❓ ORG NOT IN DB

### [102] Yejin Choi
- **Category:** Academic
- **Title:** Dieter Schwarz Foundation HAI Professor of Computer Science, Senior Fellow at Stanford HAI, Co-Director at Stanford HAI
- **primary_org:** University of Washington
- **other_orgs:** Allen Institute for Artificial Intelligence (AI2) - Senior Director, Mosaic project leader; MacArthur Foundation Fellow; AI2050 (Schmidt Sciences) Senior Fellow; Scientific Advisor at Kyutai (French foundational AI
- **Edges:**
  - → Tsinghua University (AI governance) (affiliated, Stanford HAI ★)
- **Status:** ❓ ORG NOT IN DB

### [29] Yoshua Bengio
- **Category:** Academic
- **Title:** Full Professor & Scientific Director of Mila, Chair of International AI Safety Report, Co-President & Scientific Director of LawZero
- **primary_org:** Mila
- **other_orgs:** Canada CIFAR AI Chair, Senior Fellow at CIFAR, Special Advisor and Founding Scientific Director of IVADO, Member of UN Scientific Advisory Board for Independent Advice on Breakthroughs in Science
- **Edges:**
  - → Dan Hendrycks (collaborator)
  - → Stanford HAI (affiliated, Advisor)
- **Status:** ❓ ORG NOT IN DB

### [1015] Kevin Kelly
- **Category:** Cultural figure
- **Title:** Senior Maverick at Wired Magazine, Founding Executive Editor, Technology Author and Futurist
- **primary_org:** Wired
- **other_orgs:** Co-chair of The Long Now Foundation, Cool Tools website founder and editor, former publisher and editor of Whole Earth Review (1984-1990), co-founder of Hackers' Conference, involved in launch of
- **Edges:**
  - → Wired (affiliated, Senior Maverick ★)
- **Status:** ✓

### [783] Natasha Lyonne
- **Category:** Cultural figure
- **Title:** Co-founder, Asteria Film Co.; Actress, Writer, Director
- **primary_org:** Asteria Film Co.
- **other_orgs:** Animal Pictures (production company), Moonvalley AI (subsidiary relationship)
- **Edges:**
  - → Asteria Film Co. (affiliated, Co-founder ★)
- **Status:** ✓

### [779] Adam Evans
- **Category:** Executive
- **Title:** EVP & GM, Salesforce AI Platform
- **primary_org:** Salesforce
- **other_orgs:** Former co-founder/CTO of RelateIQ (acquired 2014) and Airkit.ai (acquired 2023), former Palantir
- **Edges:**
  - → Salesforce (affiliated, EVP and GM ★)
- **Status:** ✓

### [799] Alan Descoins
- **Category:** Executive
- **Title:** CEO, Tryolabs
- **primary_org:** Tryolabs
- **Edges:**
  - → Tryolabs (affiliated, CEO ★)
- **Status:** ✓

### [772] Alexandr Wang
- **Category:** Executive
- **Title:** CEO and Founder, Scale AI
- **primary_org:** Scale AI
- **other_orgs:** Former Chief AI Officer at Meta (2025-2026)
- **Edges:**
  - → Scale AI (affiliated, CEO ★)
- **Status:** ✓

### [785] Alex Blania
- **Category:** Executive
- **Title:** Co-founder and CEO, Tools for Humanity; Co-founder, World; Co-founder, Merge Labs
- **primary_org:** Tools for Humanity
- **other_orgs:** World, Merge Labs, Worldcoin Foundation
- **Edges:**
  - → Tools for Humanity (affiliated, Co-founder and CEO ★)
- **Status:** ✓

### [736] Allie K. Miller
- **Category:** Executive
- **Title:** CEO, Open Machine; Former Global Head of Machine Learning for Startups and VC at AWS
- **primary_org:** Open Machine
- **other_orgs:** Former IBM Watson AI team lead, Mozilla Ventures backed, Creative Artists Agency speaker, Arianna Huffington scientific advisory board
- **Edges:**
  - → Open Machine (affiliated, CEO ★)
- **Status:** ✓

### [782] Amnon Shashua
- **Category:** Executive
- **Title:** President and CEO, Mobileye; Senior Vice President (former), Intel; Professor, Hebrew University of Jerusalem
- **primary_org:** Mobileye
- **other_orgs:** Hebrew University of Jerusalem, OrCam Technologies, AI21 Labs, One Zero Digital Bank, Mentee Robotics, AAI Technologies
- **Edges:**
  - → Mobileye (affiliated, President and CEO ★)
- **Status:** ✓

### [735] Andy Jassy
- **Category:** Executive
- **Title:** President and CEO, Amazon
- **primary_org:** Amazon
- **other_orgs:** Former member of National Security Commission on Artificial Intelligence (2018-2021), Member of The Business Council, Chairman of Rainier Prep charter school
- **Edges:**
  - → Amazon (affiliated, President and CEO ★)
- **Status:** ✓

### [794] Andy Parsons
- **Category:** Executive
- **Title:** Senior Director of Content Authenticity Initiative, Adobe
- **primary_org:** Adobe
- **other_orgs:** Content Authenticity Initiative (CAI), Coalition for Content Provenance and Authenticity (C2PA), Partnership on AI
- **Edges:**
  - → Adobe (affiliated, Senior Director of Content Authenticity ★)
- **Status:** ✓

### [801] Brandon Tseng
- **Category:** Executive
- **Title:** Co-founder and President, Shield AI
- **primary_org:** Shield AI
- **Edges:**
  - → Shield AI (affiliated, Co-founder and President ★)
- **Status:** ✓

### [774] C.C. Wei
- **Category:** Executive
- **Title:** Chairman and CEO, Taiwan Semiconductor Manufacturing Company (TSMC)
- **primary_org:** TSMC
- **Edges:**
  - → TSMC (affiliated, Chairman and CEO ★)
- **Status:** ✓

### [99] Chris Lehane
- **Category:** Executive
- **Title:** Chief Global Affairs Officer, OpenAI
- **primary_org:** OpenAI
- **other_orgs:** Former Operating Partner at Haun Ventures (2022-2024), Former SVP Policy Communications at Airbnb (2015-2022), Former Co-Founder at Fabiani & Lehane (2001-2015), Former Press Secretary for Gore-L
- **Edges:**
  - → Institute for AI Policy and Strategy (affiliated, Chief Global Affairs, OpenAI ★)
- **Status:** ⚠️ MISMATCH (primary_org exists but no edge)

### [771] Cristiano Amon
- **Category:** Executive
- **Title:** President and CEO, Qualcomm Incorporated
- **primary_org:** Qualcomm
- **other_orgs:** USPTO Council for Inclusive Innovation, Father Joe's Villages (board of directors)
- **Edges:**
  - → Qualcomm (affiliated, President and CEO ★)
- **Status:** ✓

### [13] Daniela Amodei
- **Category:** Executive
- **Title:** Co-Founder and President, Anthropic
- **primary_org:** Anthropic
- **other_orgs:** Former VP of Safety and Policy at OpenAI (2020), Former Risk Manager at Stripe (2016-2018), Married to Holden Karnofsky (Co-founder of Coefficient Giving (formerly Open Philanthropy) (formerly Open Philanthropy))
- **Edges:** (none)
- **Status:** ⚠️ NO EDGES (has primary_org)

### [8] Dario Amodei
- **Category:** Executive
- **Title:** CEO and Co-founder
- **primary_org:** Anthropic
- **other_orgs:** Former VP Research at OpenAI (2016-2020), Former Senior Research Scientist at Google Brain (2015-2016), Former researcher at Baidu (2014-2015), Postdoctoral scholar at Stanford University School 
- **Edges:**
  - → Sam Altman (former_colleague)
- **Status:** ⚠️ MISMATCH (primary_org exists but no edge)

### [796] David Ha
- **Category:** Executive
- **Title:** Co-founder and CEO, Sakana AI
- **primary_org:** Sakana AI
- **other_orgs:** Former Research Scientist at Google Brain, Former Managing Director at Goldman Sachs Japan
- **Edges:**
  - → Sakana AI (affiliated, Co-founder and CEO ★)
- **Status:** ✓

### [775] David Holz
- **Category:** Executive
- **Title:** Founder and CEO, Midjourney
- **primary_org:** Midjourney
- **other_orgs:** Co-founder, Leap Motion (sold 2019)
- **Edges:**
  - → Midjourney (affiliated, Founder ★)
- **Status:** ✓

### [33] Demis Hassabis
- **Category:** Executive
- **Title:** CEO and Co-Founder, Google DeepMind
- **primary_org:** Google DeepMind
- **other_orgs:** Co-founder and CEO of Isomorphic Labs, UK Government AI Adviser, Fellow of the Royal Society, former visiting scientist at MIT and Harvard
- **Edges:** (none)
- **Status:** ⚠️ NO EDGES (has primary_org)

### [797] Edwin Chen
- **Category:** Executive
- **Title:** Founder and CEO, Surge AI
- **primary_org:** Surge AI
- **other_orgs:** Former research scientist at Facebook, Google, Twitter; MIT CSAIL researcher
- **Edges:**
  - → Surge AI (affiliated, Founder and CEO ★)
- **Status:** ✓

### [48] Elon Musk
- **Category:** Executive
- **Title:** Founder and CEO, xAI; CEO and Product Architect, Tesla; Founder, CEO, and Chief Engineer, SpaceX
- **primary_org:** xAI
- **other_orgs:** X Corp. (owner), Neuralink (co-founder), The Boring Company (founder), OpenAI (co-founder, departed 2018), Tesla (CEO and Product Architect), SpaceX (founder and CEO), Former Senior Advisor to Pr
- **Edges:**
  - → xAI (affiliated, Founder, xAI ★)
- **Status:** ✓

### [734] Fidji Simo
- **Category:** Executive
- **Title:** CEO of Applications, OpenAI
- **primary_org:** OpenAI
- **other_orgs:** Board Chair of Instacart, Board member of Shopify, Founder and President of Complex Disorders Alliance (CODA), Co-founder of ChronicleBio
- **Edges:**
  - → OpenAI (affiliated, CEO of Applications ★)
- **Status:** ✓

### [790] James Peng
- **Category:** Executive
- **Title:** Founder and CEO, Pony.ai
- **primary_org:** Pony.ai
- **Edges:**
  - → Pony.ai (affiliated, Founder and CEO ★)
- **Status:** ✓

### [50] Jared Kaplan
- **Category:** Executive
- **Title:** Co-founder and Chief Science Officer, Anthropic; Responsible Scaling Officer
- **primary_org:** Anthropic
- **other_orgs:** Johns Hopkins University (Associate Professor, Physics & Astronomy), OpenAI (former researcher)
- **Edges:**
  - → Senate AI Working Group (affiliated, CSO, Anthropic ★)
- **Status:** ⚠️ MISMATCH (primary_org exists but no edge)

### [805] Jeff Leek
- **Category:** Executive
- **Title:** VP and Chief Data Officer, Fred Hutchinson Cancer Center; Co-founder and Co-CEO, Synthesize Bio
- **primary_org:** Fred Hutchinson Cancer Center
- **other_orgs:** Synthesize Bio (Co-founder and Co-CEO), Cancer AI Alliance (Scientific Director), University of Washington (Professor affiliations), American Statistical Association (Fellow)
- **Edges:**
  - → Fred Hutchinson Cancer Center (affiliated, VP and Chief Data Officer ★)
- **Status:** ✓

### [733] Jensen Huang
- **Category:** Executive
- **Title:** Founder, President & CEO, Nvidia
- **primary_org:** Nvidia
- **other_orgs:** National Academy of Engineering (member), Various AI industry partnerships including Partnership on AI
- **Edges:**
  - → Nvidia (affiliated, CEO ★)
- **Status:** ✓

### [20] Josh Woodward
- **Category:** Executive
- **Title:** VP Google Labs, Gemini App, and AI Studio
- **primary_org:** Google
- **other_orgs:** Former Next Billion Users initiative co-founder at Google, University of Oxford (MPhil Comparative Government), University of Oklahoma (BBA Economics/Marketing/History)
- **Edges:** (none)
- **Status:** ⚠️ NO EDGES (has primary_org)

### [800] Kakul Srivastava
- **Category:** Executive
- **Title:** CEO, Splice
- **primary_org:** Splice
- **other_orgs:** Former VP Creative Cloud Experience & Engagement at Adobe, Former VP Product Management & Marketing at GitHub, Former CPO at WeWork, Board member at Splice
- **Edges:**
  - → Splice (affiliated, CEO ★)
- **Status:** ✓

### [49] Liang Wenfeng
- **Category:** Executive
- **Title:** CEO and Founder, DeepSeek
- **primary_org:** DeepSeek
- **other_orgs:** Co-founder and Managing Partner, High-Flyer Quantitative Investment Management; Founder, Jacobi Investment Management
- **Edges:**
  - → DeepSeek (affiliated, CEO, DeepSeek ★)
- **Status:** ✓

---

## ORGANIZATIONS (50 sample)

### [315] AI Safety Initiative at Georgia Tech
- **Category:** Academic
- **Website:** https://aisi.dev
- **Incoming edges (people → this org):** 0

### [366] Alignment Research Engineer Accelerator (ARENA)
- **Category:** Academic
- **Website:** https://www.arena.education/
- **Incoming edges (people → this org):** 0

### [323] Arcadia Impact
- **Category:** Academic
- **Website:** https://www.arcadiaimpact.org/
- **Incoming edges (people → this org):** 0

### [410] Cambridge ERA:AI Fellowship
- **Category:** Academic
- **Website:** https://erafellowship.org/
- **Incoming edges (people → this org):** 0

### [459] Cambridge Leverhulme Centre for Future of Intelligence
- **Category:** Academic
- **Incoming edges (people → this org):** 0

### [219] Center for Human-Compatible AI (CHAI)
- **Category:** Academic
- **Website:** https://humancompatible.ai/
- **Incoming edges (people → this org):** 2

### [274] Center for Long-Term Cybersecurity
- **Category:** Academic
- **Website:** https://cltc.berkeley.edu/
- **Incoming edges (people → this org):** 0

### [367] Center on Long-Term Risk: Summer Research Fellowship
- **Category:** Academic
- **Website:** https://longtermrisk.org/summer-research-fellowship/
- **Incoming edges (people → this org):** 0

### [310] Centre for the Study of Existential Risk (CSER)
- **Category:** Academic
- **Website:** https://www.cser.ac.uk/
- **Incoming edges (people → this org):** 0

### [354] Computational and Biological Learning Lab (University of Cambridge)
- **Category:** Academic
- **Website:** https://cbl.eng.cam.ac.uk/
- **Incoming edges (people → this org):** 0

### [189] Cooperative AI Summer School
- **Category:** Academic
- **Website:** https://www.cooperativeai.com/summer-school/summer-school-2025
- **Incoming edges (people → this org):** 0

### [954] Creative Destruction Lab
- **Category:** Academic
- **Website:** https://creativedestructionlab.com
- **Incoming edges (people → this org):** 0

### [818] CSER
- **Category:** Academic
- **Website:** https://cser.ac.uk
- **Incoming edges (people → this org):** 2

### [326] Dr. Roman Yampolskiy
- **Category:** Academic
- **Website:** https://www.romanyampolskiy.com/
- **Incoming edges (people → this org):** 0

### [327] Dylan Hadfield-Menell
- **Category:** Academic
- **Website:** https://people.csail.mit.edu/dhm/
- **Incoming edges (people → this org):** 0

### [955] EconTAI
- **Category:** Academic
- **Website:** https://econtai.org/
- **Incoming edges (people → this org):** 0

### [143] Effective Thesis
- **Category:** Academic
- **Website:** https://www.effectivethesis.org/
- **Incoming edges (people → this org):** 0

### [768] Fred Hutchinson Cancer Center
- **Category:** Academic
- **Website:** https://fredhutch.org
- **Incoming edges (people → this org):** 1

### [321] Future Impact Group: Fellowship
- **Category:** Academic
- **Website:** https://futureimpact.group/
- **Incoming edges (people → this org):** 0

### [236] Future of Humanity Institute (closed 2024)
- **Category:** Academic
- **Website:** https://www.fhi.ox.ac.uk/
- **Incoming edges (people → this org):** 1

### [322] Global Challenges Project
- **Category:** Academic
- **Website:** https://www.globalchallengesproject.org/
- **Incoming edges (people → this org):** 0

### [372] Global Priorities Institute (University of Oxford)
- **Category:** Academic
- **Website:** https://globalprioritiesinstitute.org/
- **Incoming edges (people → this org):** 0

### [951] Harvard Ash Center
- **Category:** Academic
- **Website:** https://ash.harvard.edu
- **Incoming edges (people → this org):** 0

### [952] Harvard Berkman Klein Center
- **Category:** Academic
- **Website:** https://cyber.harvard.edu
- **Incoming edges (people → this org):** 0

### [411] Human-aligned AI Summer School
- **Category:** Academic
- **Website:** https://humanaligned.ai/
- **Incoming edges (people → this org):** 0

### [766] IIT Madras
- **Category:** Academic
- **Website:** https://iitm.ac.in
- **Incoming edges (people → this org):** 1

### [414] Impact Research Groups
- **Category:** Academic
- **Website:** https://www.impactresearchgroups.org/
- **Incoming edges (people → this org):** 0

### [355] Krueger AI Safety Lab (KASL)
- **Category:** Academic
- **Website:** https://www.kasl.ai/publications/
- **Incoming edges (people → this org):** 0

### [193] Leaf: Dilemmas and Dangers in AI
- **Category:** Academic
- **Website:** https://leaf.courses/dilemmas-and-dangers-in-ai
- **Incoming edges (people → this org):** 0

### [461] Leverhulme Centre for the Future of Intelligence
- **Category:** Academic
- **Website:** http://lcfi.ac.uk/
- **Incoming edges (people → this org):** 0

### [240] Leverhulme Centre for the Future of Intelligence (University of Cambridge)
- **Category:** Academic
- **Website:** https://www.lcfi.ac.uk/
- **Incoming edges (people → this org):** 0

### [194] Mentorship for Alignment Research Students (MARS)
- **Category:** Academic
- **Website:** https://caish.org/mars
- **Incoming edges (people → this org):** 0

### [363] Meridian Cambridge
- **Category:** Academic
- **Website:** https://www.meridiancambridge.org/
- **Incoming edges (people → this org):** 0

### [235] MIT Algorithmic Alignment Group
- **Category:** Academic
- **Website:** https://algorithmicalignment.csail.mit.edu/
- **Incoming edges (people → this org):** 0

### [947] MIT CSAIL
- **Category:** Academic
- **Website:** https://csail.mit.edu
- **Incoming edges (people → this org):** 0

### [247] MIT FutureTech
- **Category:** Academic
- **Website:** https://futuretech.mit.edu
- **Incoming edges (people → this org):** 0

### [948] MIT GOV/LAB
- **Category:** Academic
- **Website:** https://mitgovlab.org
- **Incoming edges (people → this org):** 0

### [949] MIT Media Lab
- **Category:** Academic
- **Website:** https://media.mit.edu
- **Incoming edges (people → this org):** 0

### [946] MIT Shaping the Future of Work
- **Category:** Academic
- **Website:** https://shapingwork.mit.edu
- **Incoming edges (people → this org):** 0

### [369] ML4Good Laboratory - New York University
- **Category:** Academic
- **Website:** https://wp.nyu.edu/ml4good/
- **Incoming edges (people → this org):** 0

### [416] Non-Trivial
- **Category:** Academic
- **Website:** https://www.non-trivial.org/
- **Incoming edges (people → this org):** 0

### [216] NYU Alignment Research Group (ARG)
- **Category:** Academic
- **Website:** https://wp.nyu.edu/arg/
- **Incoming edges (people → this org):** 0

### [440] Orion AI Governance Initiative (Arcadia Impact)
- **Category:** Academic
- **Website:** https://www.orionaigov.org/
- **Incoming edges (people → this org):** 0

### [168] Oxford Martin AI Governance Initiative
- **Category:** Academic
- **Website:** https://aigi.ox.ac.uk/
- **Incoming edges (people → this org):** 0

### [441] Pathfinder Fellowship (Kairos)
- **Category:** Academic
- **Website:** https://pathfinder.kairos-project.org/
- **Incoming edges (people → this org):** 0

### [418] PIBBSS Fellowship (Principles of Intelligent Behavior in Biological and Social Systems)
- **Category:** Academic
- **Website:** https://princint.ai/programs/fellowship/
- **Incoming edges (people → this org):** 0

### [417] Pivotal Research Fellowship
- **Category:** Academic
- **Website:** https://www.pivotal-research.org/fellowship
- **Incoming edges (people → this org):** 0

### [950] Princeton CITP
- **Category:** Academic
- **Website:** https://citp.princeton.edu
- **Incoming edges (people → this org):** 0

### [528] Princeton (Narayanan/Kapoor AI Snake Oil)
- **Category:** Academic
- **Website:** https://research.princeton.edu/news/ai-snake-oil-conversation-princeton-ai-experts-arvind-narayanan-and-sayash-kapoor
- **Incoming edges (people → this org):** 2

### [239] Princeton University Center for Information Technology Policy (Narayanan/Kapoor AI Snake Oil)
- **Category:** Academic
- **Website:** https://citp.princeton.edu
- **Incoming edges (people → this org):** 0

---

## Questions to Consider

1. **Missing edges:** Many people have `primary_org` set but no edge. Should we auto-create edges from primary_org text?

2. **Org name mismatches:** Some primary_org values don't match any org in DB (typos, abbreviations, orgs not yet added). How to handle?
   - Examples: "Stanford University" vs "Stanford HAI", "MIT" vs "Massachusetts Institute of Technology"

3. **Edge types:** What edge_type should we use for primary employment? Currently mixed: `affiliated`, `employed_by`, `person_organization`

4. **Data cleanup approach:**
   - Option A: Script to auto-create edges from primary_org (fuzzy match org names)
   - Option B: Manual review and fix in admin UI
   - Option C: Hybrid - script generates suggestions, human approves

5. **Validation going forward:** Should we enforce that every person has at least one edge?
