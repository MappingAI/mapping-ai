# Baseline Audit — mapping_ai_staging

*Generated: 2026-04-10 23:44 UTC*

---

## Summary

| Metric                   | Value         |
| ------------------------ | ------------- |
| Total entities           | 1672          |
| Total edges              | 2228          |
| Empty notes              | 715 (42.8%)   |
| Edges missing source_url | 2228 (100.0%) |
| Orphan entities          | 321 (19.2%)   |

---

## 1. Entity Counts

| Type         | Count |
| ------------ | ----: |
| organization |   796 |
| person       |   714 |
| resource     |   162 |
| **TOTAL**    |  1672 |

---

## 2. Entity Categories

### Persons (714 total)

| Category        | Count |
| --------------- | ----: |
| Policymaker     |   148 |
| Executive       |   146 |
| Researcher      |   139 |
| Academic        |   135 |
| Organizer       |    68 |
| Investor        |    36 |
| Journalist      |    25 |
| Cultural figure |    14 |
| (null)          |     3 |

### Organizations (796 total)

| Category                 | Count |
| ------------------------ | ----: |
| Academic                 |   191 |
| AI Safety/Alignment      |   172 |
| Government/Agency        |    93 |
| VC/Capital/Philanthropy  |    91 |
| Think Tank/Policy Org    |    74 |
| Deployers & Platforms    |    46 |
| Media/Journalism         |    30 |
| Labor/Civil Society      |    27 |
| Frontier Lab             |    24 |
| Ethics/Bias/Rights       |    21 |
| Infrastructure & Compute |    13 |
| Political Campaign/PAC   |    12 |
| (null)                   |     2 |

### Resources (162 total)

| Category            | Count |
| ------------------- | ----: |
| (null)              |   161 |
| AI Safety/Alignment |     1 |

---

## 3. Entity Status

| Status   | Count |
| -------- | ----: |
| approved |  1604 |
| internal |    60 |
| pending  |     8 |

---

## 4. Field Completeness

### Core fields (all entities)

| Field          | Filled |   Rate | Empty |
| -------------- | -----: | -----: | ----: |
| name           |   1672 | 100.0% |     0 |
| category       |   1506 |  90.1% |   166 |
| notes          |    957 |  57.2% |   715 |
| notes_html     |     19 |   1.1% |  1653 |
| notes_sources  |    317 |  19.0% |  1355 |
| influence_type |    713 |  42.6% |   959 |
| thumbnail_url  |    783 |  46.8% |   889 |

### Person fields (714 people)

| Field       | Filled |  Rate |
| ----------- | -----: | ----: |
| title       |    330 | 46.2% |
| primary_org |    189 | 26.5% |
| other_orgs  |    295 | 41.3% |
| twitter     |    132 | 18.5% |
| bluesky     |      5 |  0.7% |
| location    |    325 | 45.5% |

### Organization fields (796 orgs)

| Field         | Filled |  Rate |
| ------------- | -----: | ----: |
| website       |    523 | 65.7% |
| funding_model |    286 | 35.9% |
| parent_org_id |     54 |  6.8% |
| location      |    383 | 48.1% |

### Resource fields (162 resources)

| Field                 | Filled |   Rate |
| --------------------- | -----: | -----: |
| resource_title        |    162 | 100.0% |
| resource_url          |    133 |  82.1% |
| resource_author       |     88 |  54.3% |
| resource_type         |    161 |  99.4% |
| resource_category     |    162 | 100.0% |
| resource_year         |    101 |  62.3% |
| resource_key_argument |     72 |  44.4% |

### Enrichment tracking (all entities)

| Metric                 | Count |  Rate |
| ---------------------- | ----: | ----: |
| qa_approved = TRUE     |  1023 | 61.2% |
| notes_confidence set   |   317 | 19.0% |
| enrichment_version set |  1586 | 94.9% |
| notes_v1 (backup) set  |   858 | 51.3% |

---

## 5. Edge Statistics

**Total edges:** 2228

### Edge types

| Type                | Count | Canonical? |
| ------------------- | ----: | ---------- |
| affiliated          |   585 | **NO**     |
| employed_by         |   518 | **NO**     |
| collaborator        |   239 | yes        |
| partner_of          |   155 | **NO**     |
| founded             |   118 | **NO**     |
| subsidiary_of       |   116 | **NO**     |
| funded_by           |    79 | **NO**     |
| person_organization |    72 | **NO**     |
| co_founded_with     |    71 | **NO**     |
| invested_in         |    45 | **NO**     |
| board_member        |    36 | **NO**     |
| authored_by         |    30 | **NO**     |
| former_colleague    |    26 | **NO**     |
| advises             |    26 | **NO**     |
| critic_of           |    22 | **NO**     |
| supporter_of        |    19 | **NO**     |
| funder              |    17 | yes        |
| published_by        |    16 | **NO**     |
| mentored_by         |    15 | **NO**     |
| spun_out_from       |    13 | **NO**     |
| affiliated_with     |     7 | **NO**     |
| mentioned           |     1 | **NO**     |
| mentor_of           |     1 | **NO**     |
| critic              |     1 | yes        |

### Edge field completeness

| Field      | Filled |   Rate |
| ---------- | -----: | -----: |
| role       |   1206 |  54.1% |
| evidence   |   1481 |  66.5% |
| source_url |      0 |   0.0% |
| confidence |   1479 |  66.4% |
| is_primary |   2228 | 100.0% |
| start_date |      0 |   0.0% |
| end_date   |      0 |   0.0% |
| created_by |   2228 | 100.0% |

---

## 6. Orphan Entities (zero edges)

**321 orphan entities** (19.2% of all entities)

| Type         | Orphans |
| ------------ | ------: |
| organization |     193 |
| resource     |     117 |
| person       |      11 |

---

## 7. Belief Fields

Applicable entities (people + orgs): **1510**

### belief_regulatory_stance

Filled: 705 / 1510 (46.7%)

| Value         | Count | Canonical? |
| ------------- | ----: | ---------- |
| Targeted      |   211 | yes        |
| Precautionary |   139 | yes        |
| Light-touch   |   109 | yes        |
| Moderate      |   100 | yes        |
| Mixed/unclear |    85 | yes        |
| Restrictive   |    49 | yes        |
| Accelerate    |    10 | yes        |
| Nationalize   |     2 | yes        |

### belief_agi_timeline

Filled: 663 / 1510 (43.9%)

| Value               | Count | Canonical? |
| ------------------- | ----: | ---------- |
| Unknown             |   297 | yes        |
| 5-10 years          |   187 | yes        |
| 2-3 years           |    97 | yes        |
| 10-25 years         |    52 | yes        |
| Ill-defined         |    19 | yes        |
| 25+ years or never  |     7 | yes        |
| Ill-defined concept |     2 | **NO**     |
| Already here        |     2 | yes        |

### belief_ai_risk

Filled: 688 / 1510 (45.6%)

| Value         | Count | Canonical? |
| ------------- | ----: | ---------- |
| Serious       |   306 | yes        |
| Existential   |   128 | yes        |
| Manageable    |    82 | yes        |
| Mixed/nuanced |    80 | yes        |
| Catastrophic  |    58 | yes        |
| Unknown       |    28 | yes        |
| Overstated    |     6 | yes        |

### belief_evidence_source

Filled: 684 / 1510 (45.3%)

| Value                                                             | Count | Canonical? |
| ----------------------------------------------------------------- | ----: | ---------- |
| Explicitly stated                                                 |   537 | yes        |
| Inferred from actions                                             |    94 | **NO**     |
| Inferred                                                          |    34 | yes        |
| Public statements                                                 |     5 | **NO**     |
| Inferred from associations                                        |     3 | **NO**     |
| Policy proposals                                                  |     3 | **NO**     |
| Unknown                                                           |     2 | yes        |
| Public statements, Campaign messaging                             |     1 | **NO**     |
| Campaign backing and endorsements                                 |     1 | **NO**     |
| Super PAC spending, Campaign positions, Organization endorsements |     1 | **NO**     |
| Super PAC mission statement and candidate support patterns        |     1 | **NO**     |
| FEC filings, candidate support patterns, stated mission           |     1 | **NO**     |
| Campaign backing, Super PAC support                               |     1 | **NO**     |

### belief_regulatory_stance_detail

Filled: 697 / 1510 (46.2%)

### belief_threat_models

Filled: 675 / 1510 (44.7%)

---

## 8. Citation Artifacts

**316 entities** have citation artifacts (`[n]` patterns) in notes.

| ID | Name                     | Type   | Count | Examples                        |
| -: | ------------------------ | ------ | ----: | ------------------------------- |
|  1 | Stuart Russell           | person |     4 | [1,6], [1,6,8], [1,6,8], [7,10] |
|  2 | Chuck Schumer            | person |     6 | [2], [7], [2], [5], [3]         |
|  3 | Marc Andreessen          | person |     4 | [1], [3], [6], [6]              |
|  4 | Casey Newton             | person |     6 | [6], [7], [6], [7], [6]         |
|  7 | Brian Schatz             | person |     5 | [6], [6], [12], [10], [12]      |
|  8 | Dario Amodei             | person |     4 | [5], [7], [7], [5]              |
| 10 | Alexandria Ocasio-Cortez | person |     4 | [1], [10], [6], [7]             |
| 11 | Marsha Blackburn         | person |     4 | [6], [1], [12], [6]             |
| 12 | Anton Korinek            | person |     4 | [1], [1], [1], [1]              |
| 13 | Daniela Amodei           | person |     6 | [1], [6], [1], [6], [6]         |
| 14 | David Evan Harris        | person |     6 | [6], [7], [8], [6], [7]         |
| 15 | Kim Stanley Robinson     | person |     4 | [10,11], [7], [7], [7]          |
| 92 | Yann LeCun               | person |     4 | [4], [6], [6], [6]              |
| 16 | Jakub Pachocki           | person |     4 | [1], [6], [6], [6]              |
| 17 | Jared Polis              | person |     6 | [6], [9], [6], [9], [1]         |

*...and 301 more.*

---

## 9. Notes Quality Overview

| Category              | Count |  Rate |
| --------------------- | ----: | ----: |
| Empty / null          |   715 | 42.8% |
| Short (< 50 chars)    |    37 |  2.2% |
| Medium (50–200 chars) |   142 |  8.5% |
| Long (> 200 chars)    |   778 | 46.5% |

---

## 10. Edge Connectivity

### Edges per entity (distribution)

| Edges      | Entities |
| ---------- | -------: |
| 0 (orphan) |      321 |
| 1          |      767 |
| 2-5        |      345 |
| 6-10       |      144 |
| 11-20      |       80 |
| 21+        |       15 |

### Top 15 most-connected entities

| Name                                            | Type         | Edges |
| ----------------------------------------------- | ------------ | ----: |
| OpenAI                                          | organization |    66 |
| Stanford University                             | organization |    47 |
| Democratic Party                                | organization |    46 |
| Google                                          | organization |    45 |
| Anthropic                                       | organization |    41 |
| Republican Party                                | organization |    34 |
| Senate AI Working Group                         | organization |    31 |
| Microsoft                                       | organization |    30 |
| United States Senate                            | organization |    29 |
| Massachusetts Institute of Technology           | organization |    29 |
| UC Berkeley                                     | organization |    27 |
| Coefficient Giving (formerly Open Philanthropy) | organization |    26 |
| Google DeepMind                                 | organization |    22 |
| Harvard University                              | organization |    21 |
| Stuart Russell                                  | person       |    21 |

