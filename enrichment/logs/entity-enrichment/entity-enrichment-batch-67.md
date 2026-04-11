# Entity Enrichment Batch 67

**Date:** 2026-04-10
**Entities:** 12
**Phase:** phase3-manual

## Summary

Enriched 12 entities (2 persons, 10 organizations) — civil rights orgs (Lawyers' Committee, Leadership Conference), government bodies (Senate Commerce Committee dupe, House AI Task Force dupe, Congressional AI Caucus dupe, NAIIO), academic institutions (GMU, UCLA, UT Knoxville, AI Tennessee Initiative), and notable individuals (Ken Buck, Rodney Brooks). All were truly empty (notes null, beliefs null). No edges modified.

## Duplicate Findings

### CONFIRMED DUPLICATES (3 entities)

- **1479 "Commerce, Science and Transportation Committee"** is a CONFIRMED DUPLICATE of:
  - **1148** "Senate Committee on Commerce, Science and Transportation" (phase3-manual, qa_approved)
  - **1428** "U.S. Senate Commerce Committee" (phase3-manual, qa_approved)
  - **1107** "Senate Commerce, Science, and Transportation Committee" (v2)
  - All refer to the same Senate standing committee. **Recommend merging edges to 1148** (most complete record) and soft-deleting 1479. Edge 1663 (Ed Markey -> 1479, employer, "Member") should be retargeted to 1148.

- **1483 "House Task Force on Artificial Intelligence"** is a CONFIRMED DUPLICATE of:
  - **1149** "House Bipartisan Task Force on Artificial Intelligence" (phase3-manual, qa_approved)
  - **1470** "Bipartisan Taskforce on Artificial Intelligence" (v2-auto, qa_approved)
  - All refer to the same body established Feb 2024. **Recommend merging edges to 1149** and soft-deleting 1483. Edge 1679 (Jay Obernolte -> 1483, affiliated, "Chairman") should be retargeted to 1149.

- **1484 "Congressional AI Caucus"** is a CONFIRMED DUPLICATE of:
  - **1481** "Congressional Artificial Intelligence Caucus" (phase3-manual, qa_approved)
  - "Congressional AI Caucus" is just the informal short name. **Recommend merging edges to 1481** and soft-deleting 1484. Edge 1680 (Jay Obernolte -> 1484, affiliated, "vice-chair") should be retargeted to 1481.

## Changes

### 1477 — Lawyers' Committee for Civil Rights Under Law (organization, Ethics/Bias/Rights)
- **notes:** Nonpartisan civil rights legal organization founded in 1963 at the request of President Kennedy. Champions the AI Civil Rights Act (co-endorsed with Rep. Pressley, Sen. Markey, Rep. Clarke) requiring transparency, accountability, and anti-discrimination safeguards in AI systems used in housing, lending, healthcare, employment, education, and law enforcement. Applauded Biden's AI Executive Order and White House AI Bill of Rights. Opposed Trump-era executive order seeking to bar states from addressing AI harms. Leverages the nation's largest pro bono legal network (62,000+ hours/year). Headquarters: Washington, D.C.
- **regulatory_stance:** Restrictive | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Nonprofit/philanthropic
- **influence_type:** Organizer/advocate
- **confidence:** 5

### 1478 — The Leadership Conference on Civil and Human Rights (organization, Ethics/Bias/Rights)
- **notes:** America's oldest and largest civil rights coalition (240+ member organizations including ACLU, NAACP LDF, Sierra Club). Launched the Center for Civil Rights and Technology in 2023 focused on AI policy impacts on civil and human rights. Published an Innovation Framework guiding responsible AI investment, creation, and use. Led a 50+ organization letter to the Senate opposing a 10-year ban on state/local AI laws. Submitted comments to NSF on national AI R&D strategy and to NIST on AI standards, emphasizing civil rights must be embedded at every stage of the AI lifecycle. Headquarters: Washington, D.C.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Nonprofit/philanthropic
- **influence_type:** Organizer/advocate, Connector/convener
- **confidence:** 5

### 1479 — Commerce, Science and Transportation Committee (organization, Government/Agency) [DUPLICATE]
- **notes:** DUPLICATE — this is the same entity as 1148 ('Senate Committee on Commerce, Science and Transportation'), 1428 ('U.S. Senate Commerce Committee'), and 1107 ('Senate Commerce, Science, and Transportation Committee'). Recommend merging edges to 1148 (the most complete record) and soft-deleting this entity. See those entries for full enrichment.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Decision-maker
- **confidence:** 5

### 1480 — George Mason University (organization, Academic)
- **notes:** Virginia public research university (est. 1972) with significant AI research infrastructure. Key AI centers: Mason Autonomy and Robotics Center (MARC) for autonomous systems and responsible AI; Center for Mathematics and Artificial Intelligence (CMAI) for applied math/AI research funded by NSF, DOE, DTRA, and DoD. Offers MS in AI. Home to the Mercatus Center, a libertarian-leaning policy think tank with an active AI & Progress Project (led by Dean Ball) advocating light-touch, innovation-first AI governance. GMU's AI policy output tends toward deregulatory/innovation perspectives.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Government, Private
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1482 — Ken Buck (person, Policymaker)
- **notes:** Former Republican U.S. Representative from Colorado's 4th district (2015-2024). Resigned March 22, 2024. Rare GOP champion of Big Tech antitrust enforcement — co-chaired Congressional Big Tech Antitrust Caucus with bipartisan allies. Co-sponsored bipartisan AI commission bill with Rep. Ted Lieu to develop a comprehensive federal AI regulatory framework. Co-introduced legislation preventing AI from making nuclear launch decisions. Advocated for dispersed AI competition ('five or six major generative AI competitors'). Also engaged with Georgetown Law on AI regulation dialogue. Left Congress citing frustration with party's direction on Jan. 6 and democratic norms.
- **regulatory_stance:** Targeted | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Decision-maker
- **confidence:** 5

### 1483 — House Task Force on Artificial Intelligence (organization, Government/Agency) [DUPLICATE]
- **notes:** DUPLICATE — this is the same entity as 1149 ('House Bipartisan Task Force on Artificial Intelligence') and likely 1470 ('Bipartisan Taskforce on Artificial Intelligence'). The official name is 'Bipartisan House Task Force on Artificial Intelligence,' established Feb 2024 by Speaker Johnson and Leader Jeffries, co-chaired by Reps. Obernolte (R-CA) and Lieu (D-CA). Released 273-page final report Dec 2024 with 66 findings and 85 recommendations. Recommend merging edges to 1149 and soft-deleting this entity.
- **regulatory_stance:** Targeted | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Advisor/strategist
- **confidence:** 5

### 1484 — Congressional AI Caucus (organization, Government/Agency) [DUPLICATE]
- **notes:** DUPLICATE — this is the same entity as 1481 ('Congressional Artificial Intelligence Caucus'). 'Congressional AI Caucus' is an informal short name for the Congressional Artificial Intelligence Caucus, the bipartisan House caucus co-founded by Reps. Eshoo and McCaul to inform policymakers on AI impacts. Recommend merging edges to 1481 and soft-deleting this entity.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Connector/convener
- **confidence:** 5

### 1485 — University of California, Los Angeles (organization, Academic)
- **notes:** Major public research university and UC system flagship. Launched the AI Innovation Initiative — a campus-wide effort to build AI fluency and drive responsible AI adoption. First California university to partner with OpenAI (Sept 2024), also partnered with Google. Supported 68 AI pilot projects across 27 departments. Maintains multi-layered AI governance structure for responsible, ethical adoption. UCLA Health established the Health AI Council (HAIC) for clinical AI oversight. UCLA Law offers Strategic AI for Legal Professionals executive education. Strong interdisciplinary AI presence across engineering, medicine, law, and social sciences.
- **regulatory_stance:** Moderate | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Government, Private
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1486 — University of Tennessee (organization, Academic)
- **notes:** Public flagship university in Knoxville, Tennessee. Home to the AI Tennessee Initiative — the first statewide AI initiative of its kind in the U.S., founded and directed by Lynne Parker (former White House Deputy CTO and founding NAIIO director). Launched major AI cluster hiring in Foundational AI and Science-Informed AI. CECS houses Tennessee's first applied AI degree program. AI focus areas: smart manufacturing, climate-smart agriculture, precision health, future mobility, and AI for science. Partners with Oak Ridge National Laboratory on computing/AI research.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **funding_model:** Government, Private
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1487 — AI Tennessee Initiative (organization, Academic)
- **notes:** First statewide AI initiative in the U.S., launched by the University of Tennessee, Knoxville. Founded and directed by Lynne Parker, who served as White House Deputy CTO and founding director of the National AI Initiative Office (2018-2022) before returning to UT. Coordinates AI research, education, and workforce development across disciplines and institutions statewide. Focus areas: smart manufacturing, climate-smart agriculture and forestry, precision health, future mobility, and AI for science. Offers AI education courses (AI 101, AI 401) and is developing an applied AI degree. Engages academic, industry, and community partners across Tennessee.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **funding_model:** Government, Private
- **influence_type:** Researcher/analyst, Implementer
- **confidence:** 5

### 1488 — National Artificial Intelligence Initiative Office (organization, Government/Agency)
- **notes:** Federal coordinating office established by the National AI Initiative Act of 2020, housed within the White House Office of Science and Technology Policy (OSTP). Serves as central coordination hub for AI R&D across federal agencies, industry, academia, nonprofits, and state/tribal governments. Led the National AI R&D Strategic Plan updates. Four statutory mandates: ensure continued U.S. AI R&D leadership, develop trustworthy AI systems, prepare the workforce for AI integration, and coordinate federal AI activities across civilian agencies, DoD, and intelligence community. First director was Lynne Parker (2021-2022).
- **regulatory_stance:** Moderate | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Implementer, Connector/convener
- **confidence:** 5

### 1489 — Rodney Brooks (person, Academic)
- **notes:** Australian-American roboticist, MIT Professor Emeritus (Panasonic Professor of Robotics), former director of MIT CSAIL. Co-founded iRobot (1990, makers of Roomba) and Rethink Robotics (2008, Baxter/Sawyer collaborative robots). Currently CTO of Robust.AI (warehouse automation robotics). One of the most prominent AI skeptics — argues AGI and superintelligence are centuries away, that LLMs 'don't know what's true' and are 'bullshitters,' and that practical humanoid robots won't be viable for years. Maintains popular blog with annual AI prediction scorecards. Views AI risk concerns from non-practitioners as uninformed about the actual difficulty of AI development.
- **regulatory_stance:** Light-touch | **ai_risk:** Overstated | **evidence:** Explicitly stated | **agi_timeline:** 25+ years or never
- **other_categories:** Executive
- **influence_type:** Researcher/analyst, Builder
- **confidence:** 5
