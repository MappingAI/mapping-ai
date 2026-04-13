# Gap Analysis — Phase 5A
*2026-04-12 21:35 UTC*

Coverage gaps across the staging DB. No changes made — read-only report.

## 1. Entity counts by category

### Persons

| Category | Count | In canonical list? |
| --- | ---: | --- |
| Executive | 138 | ✓ |
| Researcher | 142 | ✓ |
| Policymaker | 149 | ✓ |
| Investor | 36 | ✓ |
| Organizer | 68 | ✓ |
| Journalist | 25 | ✓ |
| Academic | 137 | ✓ |
| Cultural figure | 14 | ✓ |
| (NULL) | 1 | ✗ non-canonical |
| **Total** | **710** | |

### Organizations

| Category | Count | In canonical list? |
| --- | ---: | --- |
| Frontier Lab | 24 | ✓ |
| Infrastructure & Compute | 14 | ✓ |
| Deployers & Platforms | 48 | ✓ |
| AI Safety/Alignment | 171 | ✓ |
| Think Tank/Policy Org | 73 | ✓ |
| Government/Agency | 90 | ✓ |
| Academic | 190 | ✓ |
| VC/Capital/Philanthropy | 88 | ✓ |
| Labor/Civil Society | 27 | ✓ |
| Ethics/Bias/Rights | 22 | ✓ |
| Media/Journalism | 30 | ✓ |
| Political Campaign/PAC | 12 | ✓ |
| (NULL) | 1 | ✗ non-canonical |
| **Total** | **790** | |

### Resources — total: 151

## 2. Resource breakdown (type × category)

### By resource_type

| resource_type | Count | Canonical? |
| --- | ---: | --- |
| Essay | 10 | ✓ |
| Book | 12 | ✓ |
| Report | 46 | ✓ |
| Podcast | 8 | ✓ |
| Video | 12 | ✓ |
| Website | 14 | ✓ |
| Academic Paper | 8 | ✓ |
| News Article | 3 | ✓ |
| Substack/Newsletter | 37 | ✓ |
| (NULL) | 1 | ✗ non-canonical |
| **Total** | **151** | |

### By resource_category

| resource_category | Count | Canonical? |
| --- | ---: | --- |
| AI Safety | 84 | ✓ |
| AI Governance | 0 | — **missing** |
| AI Capabilities | 2 | ✓ |
| Labor & Economy | 4 | ✓ |
| National Security | 2 | ✓ |
| Industry Analysis | 0 | — **missing** |
| Policy Proposal | 1 | ✓ |
| Technical | 0 | — **missing** |
| Philosophy/Ethics | 1 | ✓ |
| AI Policy | 52 | ✗ non-canonical |
| AI Safety, Philosophy/Ethics | 2 | ✗ non-canonical |
| AI Safety, Policy Proposal | 1 | ✗ non-canonical |
| Ethics | 1 | ✗ non-canonical |
| Media | 1 | ✗ non-canonical |

## 3. Orphan entities (zero edges)

**Total orphans:** 303

| entity_type | category | Count |
| --- | --- | ---: |
| organization | AI Safety/Alignment | 88 |
| organization | Academic | 40 |
| organization | Think Tank/Policy Org | 25 |
| organization | VC/Capital/Philanthropy | 15 |
| organization | Labor/Civil Society | 11 |
| organization | Media/Journalism | 7 |
| organization | Government/Agency | 2 |
| organization | Deployers & Platforms | 1 |
| person | Journalist | 2 |
| person | Cultural figure | 2 |
| person | Researcher | 2 |
| person | (NULL) | 1 |
| resource | (NULL) | 106 |
| resource | AI Safety/Alignment | 1 |

## 4. Executive team coverage (key orgs)

For each listed org, we show whether someone fills CEO / CTO / Chief Scientist / Head of Policy based on inbound `employer`/`founder`/`member`/`advisor` edges. Match is substring on the edge `role` field. Orgs are resolved by exact-name first, then `ILIKE` fallback.

| Label | Matched DB entity | CEO | CTO | Chief Sci | Policy | Total linked |
| --- | --- | --- | --- | --- | --- | ---: |
| OpenAI | [140] OpenAI | Sam Altman | — | Jakub Pachocki | Chris Lehane | 36 |
| Anthropic | [133] Anthropic | Daniela Amodei | — | Jared Kaplan | — | 21 |
| Google DeepMind | [146] Google DeepMind | Demis Hassabis | John M. Jumper | — | — | 12 |
| Meta AI | [204] Meta AI | — | Jérôme Pesenti | — | — | 10 |
| xAI | [177] xAI | Elon Musk | — | — | — | 4 |
| Mistral AI | [213] Mistral AI | Arthur Mensch | Timothée Lacroix | — | — | 3 |
| **Cohere** | _not in DB_ | — | — | — | — | 0 |
| **Inflection AI** | _not in DB_ | — | — | — | — | 0 |
| Microsoft | [1042] Microsoft | Satya Nadella | — | — | — | 12 |
| Google | [1041] Google | Sundar Pichai | Peter Norvig | Fei-Fei Li | — | 20 |
| Amazon | [729] Amazon | Andy Jassy | — | — | — | 1 |
| Apple | [1329] Apple | — | Ian Goodfellow | — | — | 2 |
| Meta | [1043] Meta | Mark Zuckerberg | Mike Krieger | — | — | 10 |
| NVIDIA | [728] Nvidia | Jensen Huang | — | — | — | 1 |
| NIST | [1309] National Institute of Standards and Technology | — | Arati Prabhakar | — | — | 6 |
| OSTP | [345] White House Office of Science and Technology Policy (OSTP) | Lynne Parker | Lynne Parker | — | — | 7 |
| FTC | [909] Federal Trade Commission | — | — | — | — | 6 |
| NSF | [1185] U.S. National Science Foundation | — | Lynne Parker | — | — | 2 |
| **US AISI (NIST)** | [205] U.S. AI Safety Institute (NIST) | — | — | — | — | 0 |
| Commerce Dept | [914] Department of Commerce | — | — | — | — | 4 |
| **State Department** | _not in DB_ | — | — | — | — | 0 |
| **DoD** | [1420] Department of Defense | — | — | — | — | 0 |
| **OMB** | [1295] Office of Management and Budget | — | — | — | — | 0 |
| **NSC** | _not in DB_ | — | — | — | — | 0 |
| **PCAST** | _not in DB_ | — | — | — | — | 0 |
| **CAISI** | _not in DB_ | — | — | — | — | 0 |
| **BIS** | _not in DB_ | — | — | — | — | 0 |
| Brookings | [124] Brookings Institution | — | — | — | — | 4 |
| RAND | [152] RAND Corporation | — | — | — | — | 2 |
| **CSIS** | [349] CSIS AI Policy Podcast (Center for Strategic and International Studies) | — | — | — | — | 0 |
| CAIS | [209] Center for AI Safety (CAIS) | — | Dan Hendrycks | — | — | 6 |
| **CAIP** | [443] Center for AI Policy (CAIP) | — | — | — | — | 0 |
| FLI | [229] Future of Life Institute | Max Tegmark | — | — | — | 7 |
| MIRI | [341] Machine Intelligence Research Institute (MIRI) | — | — | — | — | 4 |
| Apollo Research | [217] Apollo Research | Marius Hobbhahn | — | — | — | 3 |
| METR | [356] Model Evaluation & Threat Research (METR) | — | — | — | — | 1 |

### Not in DB — real seeding gap (7)

- **Cohere** (searched `Cohere`)
- **Inflection AI** (searched `Inflection%`)
- **State Department** (searched `%State Department%`)
- **NSC** (searched `%National Security Council%`)
- **PCAST** (searched `%President%Council of Advisors%`)
- **CAISI** (searched `CAISI`)
- **BIS** (searched `%Bureau of Industry%`)

### In DB but zero leadership edges (5)

- **US AISI (NIST)** → [205] U.S. AI Safety Institute (NIST)
- **DoD** → [1420] Department of Defense
- **OMB** → [1295] Office of Management and Budget
- **CSIS** → [349] CSIS AI Policy Podcast (Center for Strategic and International Studies)
- **CAIP** → [443] Center for AI Policy (CAIP)

## 5. Organizations by staff edge count

| Employer edges in | Orgs |
| --- | ---: |
| 0 | 538 |
| 1 | 125 |
| 2-4 | 91 |
| 5-9 | 30 |
| 10+ | 6 |
| **Total orgs** | **790** |

**Orgs with zero employer edges pointing in:** 538 (68.1%). Sample (first 30):

| ID | Name | Category |
| ---: | --- | --- |
| 1689 | 100 Plus Capital | VC/Capital/Philanthropy |
| 444 | 5050 | AI Safety/Alignment |
| 434 | 5050 AI (by Fifty Years) | VC/Capital/Philanthropy |
| 351 | 80,000 Hours | Think Tank/Policy Org |
| 516 | 80,000 Hours Problem Profile | Academic |
| 1491 | ACM US Technology Policy Committee | Think Tank/Policy Org |
| 1458 | Adaptive Security | Deployers & Platforms |
| 758 | Adobe | Deployers & Platforms |
| 1432 | Advanced Machine Intelligence Labs | Frontier Lab |
| 428 | Advanced Research + Invention Agency (ARIA) | Government/Agency |
| 145 | Aether | AI Safety/Alignment |
| 479 | AI2050 | VC/Capital/Philanthropy |
| 330 | AI2050 (Schmidt Sciences) | VC/Capital/Philanthropy |
| 1384 | AI4ALL | Labor/Civil Society |
| 419 | AI Alignment Awards | AI Safety/Alignment |
| 333 | AI Alignment Forum | AI Safety/Alignment |
| 267 | AI Alignment Foundation | VC/Capital/Philanthropy |
| 1140 | ai@cam | Academic |
| 1243 | AI Fund | VC/Capital/Philanthropy |
| 436 | AI Governance and Safety Institute (AIGSI) | AI Safety/Alignment |
| 290 | AI Governance & Safety Canada | Think Tank/Policy Org |
| 739 | AI Grant | VC/Capital/Philanthropy |
| 404 | AI Lab Watch | AI Safety/Alignment |
| 405 | AI-Plans | AI Safety/Alignment |
| 226 | AI Policy Institute | Think Tank/Policy Org |
| 1490 | AI Research Institute on Interaction for AI assistants (ARIA) | Academic |
| 278 | AI Risk Mitigation Fund | VC/Capital/Philanthropy |
| 490 | AI Safety Asia | Academic |
| 437 | AI Safety Asia (AISA) | AI Safety/Alignment |
| 514 | AI Safety Awareness Project | AI Safety/Alignment |

## 6. Influence-type coverage by person category

| Category | Total | Advisor | Advisor/strategist | Builder | Connector/convener | Convener | Corporate leader | Decision-maker | Educator | Electoral | Funder | Funder/investor | Funding | Implementer | Institutional governance | Institutional leader | Investor | Legislative | Narrator | Operations | Organizer/advocate | Policy advocate | Public intellectual | Research | Researcher | Researcher/analyst | Researcher/engineer | Technical implementation | Technical leader | Thought leader | Thought leadership | Thought-leader |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| (NULL) | 1 | · | · | 1 | · | · | · | 1 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| Academic | 137 | 1 | 66 | 16 | 19 | 2 | · | 14 | 1 | · | · | 2 | · | 2 | · | 5 | · | · | 58 | · | 17 | · | 1 | · | 5 | 118 | 1 | · | 2 | · | · | 2 |
| Cultural figure | 14 | · | 1 | 2 | 3 | · | · | · | · | · | · | · | · | · | · | · | · | · | 13 | · | 5 | · | · | · | · | 3 | · | · | · | · | · | · |
| Executive | 138 | · | 26 | 84 | 15 | 2 | 1 | 82 | · | · | 1 | 14 | · | 13 | 1 | · | · | · | 23 | · | 18 | 1 | · | 1 | · | 35 | · | · | 2 | 1 | 2 | · |
| Investor | 36 | · | 19 | 6 | 12 | · | · | 16 | · | · | · | 33 | · | · | · | · | · | · | 13 | · | 3 | · | · | · | · | · | · | · | · | · | · | · |
| Journalist | 25 | · | 1 | · | 8 | · | · | · | · | · | · | 1 | · | · | · | · | · | · | 24 | · | 1 | · | · | · | · | 11 | · | · | · | · | 1 | · |
| Organizer | 68 | · | 7 | 6 | 23 | 2 | · | 13 | · | · | · | 4 | 1 | 5 | · | · | · | · | 15 | 2 | 62 | · | · | · | · | 14 | · | · | · | 1 | · | · |
| Policymaker | 149 | · | 35 | 4 | 39 | · | · | 108 | · | 11 | · | 2 | · | 29 | · | · | · | 2 | 15 | · | 37 | 2 | · | · | · | 15 | · | · | · | 1 | · | · |
| Researcher | 142 | · | 36 | 28 | 12 | · | · | 10 | · | · | · | 5 | · | 4 | · | · | 1 | · | 24 | · | 25 | · | · | 1 | · | 132 | · | 1 | 3 | · | · | · |

## 7. Belief-field coverage by person category

| Category | Persons | stance | agi_timeline | ai_risk |
| --- | ---: | ---: | ---: | ---: |
| Policymaker | 149 | 144 (96.6%) | 34 (22.8%) | 127 (85.2%) |
| Researcher | 142 | 132 (93.0%) | 47 (33.1%) | 134 (94.4%) |
| Executive | 138 | 128 (92.8%) | 58 (42.0%) | 126 (91.3%) |
| Academic | 137 | 123 (89.8%) | 51 (37.2%) | 113 (82.5%) |
| Organizer | 68 | 66 (97.1%) | 11 (16.2%) | 64 (94.1%) |
| Investor | 36 | 34 (94.4%) | 25 (69.4%) | 32 (88.9%) |
| Journalist | 25 | 25 (100.0%) | 18 (72.0%) | 25 (100.0%) |
| Cultural figure | 14 | 14 (100.0%) | 9 (64.3%) | 14 (100.0%) |
| (NULL) | 1 | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

## 8. Watchlist presence check

Spot-check for high-profile names we'd expect in the DB. Exact name match only.

- **Present:** 26 / 27
- **Missing (by exact name):** 1

| Missing name |
| --- |
| Nancy Pelosi |

*Note: may exist under a variant spelling (e.g., full name vs. known-as). Investigate before seeding.*

