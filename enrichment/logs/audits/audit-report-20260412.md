# Baseline Audit — mapping_ai_staging

*Generated: 2026-04-12 19:33 UTC*

---

## Summary

| Metric                   | Value         |
| ------------------------ | ------------- |
| Total entities           | 1651          |
| Total edges              | 2221          |
| Empty notes              | 0 (0.0%)      |
| Edges missing source_url | 2221 (100.0%) |
| Orphan entities          | 306 (18.5%)   |

---

## 1. Entity Counts

| Type         | Count |
| ------------ | ----: |
| organization |   790 |
| person       |   710 |
| resource     |   151 |
| **TOTAL**    |  1651 |

---

## 2. Entity Categories

### Persons (710 total)

| Category        | Count |
| --------------- | ----: |
| Policymaker     |   149 |
| Researcher      |   142 |
| Executive       |   138 |
| Academic        |   137 |
| Organizer       |    68 |
| Investor        |    36 |
| Journalist      |    25 |
| Cultural figure |    14 |
| (null)          |     1 |

### Organizations (790 total)

| Category                 | Count |
| ------------------------ | ----: |
| Academic                 |   190 |
| AI Safety/Alignment      |   171 |
| Government/Agency        |    90 |
| VC/Capital/Philanthropy  |    88 |
| Think Tank/Policy Org    |    73 |
| Deployers & Platforms    |    48 |
| Media/Journalism         |    30 |
| Labor/Civil Society      |    27 |
| Frontier Lab             |    24 |
| Ethics/Bias/Rights       |    22 |
| Infrastructure & Compute |    14 |
| Political Campaign/PAC   |    12 |
| (null)                   |     1 |

### Resources (151 total)

| Category            | Count |
| ------------------- | ----: |
| (null)              |   150 |
| AI Safety/Alignment |     1 |

---

## 3. Entity Status

| Status   | Count |
| -------- | ----: |
| approved |  1588 |
| internal |    60 |
| pending  |     3 |

---

## 4. Field Completeness

### Core fields (all entities)

| Field          | Filled |   Rate | Empty |
| -------------- | -----: | -----: | ----: |
| name           |   1651 | 100.0% |     0 |
| category       |   1499 |  90.8% |   152 |
| notes          |   1651 | 100.0% |     0 |
| notes_html     |     19 |   1.2% |  1632 |
| notes_sources  |   1063 |  64.4% |   588 |
| influence_type |   1341 |  81.2% |   310 |
| thumbnail_url  |    782 |  47.4% |   869 |

### Person fields (710 people)

| Field       | Filled |  Rate |
| ----------- | -----: | ----: |
| title       |    328 | 46.2% |
| primary_org |    187 | 26.3% |
| other_orgs  |    295 | 41.5% |
| twitter     |    132 | 18.6% |
| bluesky     |      5 |  0.7% |
| location    |    325 | 45.8% |

### Organization fields (790 orgs)

| Field         | Filled |  Rate |
| ------------- | -----: | ----: |
| website       |    522 | 66.1% |
| funding_model |    559 | 70.8% |
| parent_org_id |     52 |  6.6% |
| location      |    382 | 48.4% |

### Resource fields (151 resources)

| Field                 | Filled |   Rate |
| --------------------- | -----: | -----: |
| resource_title        |    151 | 100.0% |
| resource_url          |    125 |  82.8% |
| resource_author       |     79 |  52.3% |
| resource_type         |    150 |  99.3% |
| resource_category     |    151 | 100.0% |
| resource_year         |     90 |  59.6% |
| resource_key_argument |     64 |  42.4% |

### Enrichment tracking (all entities)

| Metric                 | Count |  Rate |
| ---------------------- | ----: | ----: |
| qa_approved = TRUE     |  1590 | 96.3% |
| notes_confidence set   |  1063 | 64.4% |
| enrichment_version set |  1650 | 99.9% |
| notes_v1 (backup) set  |   854 | 51.7% |

---

## 5. Edge Statistics

**Total edges:** 2221

### Edge types

| Type            | Count | Canonical? |
| --------------- | ----: | ---------- |
| employer        |   632 | yes        |
| member          |   283 | yes        |
| collaborator    |   268 | yes        |
| affiliated      |   223 | **NO**     |
| founder         |   208 | yes        |
| partner         |   161 | yes        |
| funder          |   141 | yes        |
| parent_company  |   124 | yes        |
| advisor         |    85 | yes        |
| author          |    30 | yes        |
| critic          |    23 | yes        |
| supporter       |    19 | yes        |
| publisher       |    16 | yes        |
| affiliated_with |     7 | **NO**     |
| mentioned       |     1 | **NO**     |

### Edge field completeness

| Field      | Filled |   Rate |
| ---------- | -----: | -----: |
| role       |   1221 |  55.0% |
| evidence   |   1476 |  66.5% |
| source_url |      0 |   0.0% |
| confidence |   1472 |  66.3% |
| is_primary |   2221 | 100.0% |
| start_date |      0 |   0.0% |
| end_date   |      0 |   0.0% |
| created_by |   2221 | 100.0% |

---

## 6. Orphan Entities (zero edges)

**306 orphan entities** (18.5% of all entities)

| Type         | Orphans |
| ------------ | ------: |
| organization |     192 |
| resource     |     107 |
| person       |       7 |

---

## 7. Belief Fields

Applicable entities (people + orgs): **1500**

### belief_regulatory_stance

Filled: 1314 / 1500 (87.6%)

| Value         | Count | Canonical? |
| ------------- | ----: | ---------- |
| Moderate      |   328 | yes        |
| Targeted      |   321 | yes        |
| Light-touch   |   201 | yes        |
| Precautionary |   164 | yes        |
| Mixed/unclear |   128 | yes        |
| Restrictive   |    93 | yes        |
| Unknown       |    51 | **NO**     |
| Accelerate    |    26 | yes        |
| Nationalize   |     2 | yes        |

### belief_agi_timeline

Filled: 1271 / 1500 (84.7%)

| Value              | Count | Canonical? |
| ------------------ | ----: | ---------- |
| Unknown            |   854 | yes        |
| 5-10 years         |   209 | yes        |
| 2-3 years          |   113 | yes        |
| 10-25 years        |    57 | yes        |
| Ill-defined        |    28 | yes        |
| 25+ years or never |     8 | yes        |
| Already here       |     2 | yes        |

### belief_ai_risk

Filled: 1303 / 1500 (86.9%)

| Value         | Count | Canonical? |
| ------------- | ----: | ---------- |
| Serious       |   546 | yes        |
| Manageable    |   247 | yes        |
| Existential   |   175 | yes        |
| Catastrophic  |   124 | yes        |
| Unknown       |   116 | yes        |
| Mixed/nuanced |    86 | yes        |
| Overstated    |     9 | yes        |

### belief_evidence_source

Filled: 1301 / 1500 (86.7%)

| Value             | Count | Canonical? |
| ----------------- | ----: | ---------- |
| Explicitly stated |   746 | yes        |
| Inferred          |   483 | yes        |
| Unknown           |    72 | yes        |

### belief_regulatory_stance_detail

Filled: 696 / 1500 (46.4%)

### belief_threat_models

Filled: 674 / 1500 (44.9%)

---

## 8. Citation Artifacts

**16 entities** have citation artifacts (`[n]` patterns) in notes.

|   ID | Name                                       | Type         | Count | Examples                        |
| ---: | ------------------------------------------ | ------------ | ----: | ------------------------------- |
|    1 | Stuart Russell                             | person       |     4 | [1,6], [1,6,8], [1,6,8], [7,10] |
|   33 | Demis Hassabis                             | person       |     4 | [1,4,5], [5,9], [5,6], [5,7]    |
|   37 | Ro Khanna                                  | person       |     4 | [2,7,9], [6,8], [2,10], [2,3,4] |
|   49 | Liang Wenfeng                              | person       |     4 | [1,5], [1,5], [1,5], [1,11]     |
|   53 | Ganesh Sitaraman                           | person       |     4 | [6,7,8], [6,8], [8,11], [6,8]   |
|   70 | Joi Ito                                    | person       |     4 | [1,3], [1,3,6], [1,3,5], [1,3]  |
|   80 | Richard Blumenthal                         | person       |     3 | [1,3,4], [6,8], [7,10]          |
|   86 | Alondra Nelson                             | person       |     4 | [1,7], [6,7], [2,7], [2,7]      |
|   94 | Daniel Ho                                  | person       |     4 | [1,2], [1,2], [1,2], [1,2]      |
|  102 | Yejin Choi                                 | person       |     4 | [1,6], [1,6], [1,3], [1,2]      |
|  120 | Suresh Venkatasubramanian                  | person       |     4 | [1,6], [5,6,7], [5,6], [7,8]    |
|  142 | Cyborgism                                  | organization |     4 | [3,5], [3,5], [3,5], [3,5]      |
|  183 | Forethought (AI Safety Research Nonprofit) | organization |     4 | [1,6], [7,8], [1,7], [7,8]      |
|  193 | Leaf: Dilemmas and Dangers in AI           | organization |     4 | [1,7], [1,7], [1,7], [1,2,7]    |
| 1043 | Meta                                       | organization |     4 | [1,3], [2,5], [6,7], [10,11]    |

*...and 1 more.*

---

## 9. Notes Quality Overview

| Category              | Count |  Rate |
| --------------------- | ----: | ----: |
| Empty / null          |     0 |  0.0% |
| Short (< 50 chars)    |     0 |  0.0% |
| Medium (50–200 chars) |   185 | 11.2% |
| Long (> 200 chars)    |  1466 | 88.8% |

---

## 10. Edge Connectivity

### Edges per entity (distribution)

| Edges      | Entities |
| ---------- | -------: |
| 0 (orphan) |      306 |
| 1          |      764 |
| 2-5        |      342 |
| 6-10       |      144 |
| 11-20      |       80 |
| 21+        |       15 |

### Top 15 most-connected entities

| Name                                            | Type         | Edges |
| ----------------------------------------------- | ------------ | ----: |
| OpenAI                                          | organization |    66 |
| Google                                          | organization |    45 |
| Democratic Party                                | organization |    45 |
| Stanford University                             | organization |    45 |
| Anthropic                                       | organization |    41 |
| Republican Party                                | organization |    33 |
| Senate AI Working Group                         | organization |    31 |
| Microsoft                                       | organization |    30 |
| United States Senate                            | organization |    29 |
| Massachusetts Institute of Technology           | organization |    27 |
| UC Berkeley                                     | organization |    27 |
| Coefficient Giving (formerly Open Philanthropy) | organization |    26 |
| Google DeepMind                                 | organization |    22 |
| Harvard University                              | organization |    21 |
| Stuart Russell                                  | person       |    21 |


