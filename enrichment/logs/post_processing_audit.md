# Baseline Audit — mapping_ai_staging

*Generated: 2026-04-13 16:37 UTC*

---

## Summary

| Metric                   | Value       |
| ------------------------ | ----------- |
| Total entities           | 1706        |
| Total edges              | 2319        |
| Empty notes              | 0 (0.0%)    |
| Edges missing source_url | 135 (5.8%)  |
| Orphan entities          | 307 (18.0%) |

---

## 1. Entity Counts

| Type         | Count |
| ------------ | ----: |
| organization |   796 |
| person       |   755 |
| resource     |   155 |
| **TOTAL**    |  1706 |

---

## 2. Entity Categories

### Persons (755 total)

| Category        | Count |
| --------------- | ----: |
| Policymaker     |   158 |
| Executive       |   151 |
| Researcher      |   147 |
| Academic        |   138 |
| Organizer       |    69 |
| Journalist      |    37 |
| Investor        |    36 |
| Cultural figure |    18 |
| (null)          |     1 |

### Organizations (796 total)

| Category                 | Count |
| ------------------------ | ----: |
| Academic                 |   190 |
| AI Safety/Alignment      |   171 |
| Government/Agency        |    92 |
| VC/Capital/Philanthropy  |    88 |
| Think Tank/Policy Org    |    74 |
| Deployers & Platforms    |    48 |
| Media/Journalism         |    31 |
| Labor/Civil Society      |    27 |
| Frontier Lab             |    26 |
| Ethics/Bias/Rights       |    22 |
| Infrastructure & Compute |    14 |
| Political Campaign/PAC   |    12 |
| (null)                   |     1 |

### Resources (155 total)

| Category            | Count |
| ------------------- | ----: |
| (null)              |   154 |
| AI Safety/Alignment |     1 |

---

## 3. Entity Status

| Status   | Count |
| -------- | ----: |
| approved |  1643 |
| internal |    60 |
| pending  |     3 |

---

## 4. Field Completeness

### Core fields (all entities)

| Field          | Filled |   Rate | Empty |
| -------------- | -----: | -----: | ----: |
| name           |   1706 | 100.0% |     0 |
| category       |   1550 |  90.9% |   156 |
| notes          |   1706 | 100.0% |     0 |
| notes_html     |     19 |   1.1% |  1687 |
| notes_sources  |   1121 |  65.7% |   585 |
| influence_type |   1384 |  81.1% |   322 |
| thumbnail_url  |    778 |  45.6% |   928 |

### Person fields (755 people)

| Field       | Filled |  Rate |
| ----------- | -----: | ----: |
| title       |    375 | 49.7% |
| primary_org |    236 | 31.3% |
| other_orgs  |    307 | 40.7% |
| twitter     |    132 | 17.5% |
| bluesky     |      5 |  0.7% |
| location    |    325 | 43.0% |

### Organization fields (796 orgs)

| Field         | Filled |  Rate |
| ------------- | -----: | ----: |
| website       |    528 | 66.3% |
| funding_model |    558 | 70.1% |
| parent_org_id |     56 |  7.0% |
| location      |    380 | 47.7% |

### Resource fields (155 resources)

| Field                 | Filled |   Rate |
| --------------------- | -----: | -----: |
| resource_title        |    155 | 100.0% |
| resource_url          |    129 |  83.2% |
| resource_author       |     83 |  53.5% |
| resource_type         |    154 |  99.4% |
| resource_category     |    155 | 100.0% |
| resource_year         |     94 |  60.6% |
| resource_key_argument |     68 |  43.9% |

### Enrichment tracking (all entities)

| Metric                 | Count |  Rate |
| ---------------------- | ----: | ----: |
| qa_approved = TRUE     |  1584 | 92.8% |
| notes_confidence set   |  1059 | 62.1% |
| enrichment_version set |  1705 | 99.9% |
| notes_v1 (backup) set  |   851 | 49.9% |

---

## 5. Edge Statistics

**Total edges:** 2319

### Edge types

| Type            | Count | Canonical? |
| --------------- | ----: | ---------- |
| employer        |   729 | yes        |
| member          |   299 | yes        |
| collaborator    |   268 | yes        |
| founder         |   217 | yes        |
| partner         |   167 | yes        |
| affiliated      |   164 | **NO**     |
| funder          |   149 | yes        |
| parent_company  |   134 | yes        |
| advisor         |    83 | yes        |
| author          |    38 | yes        |
| critic          |    23 | yes        |
| publisher       |    21 | yes        |
| supporter       |    19 | yes        |
| affiliated_with |     7 | **NO**     |
| mentioned       |     1 | **NO**     |

### Edge field completeness

| Field      | Filled |   Rate |
| ---------- | -----: | -----: |
| role       |   1324 |  57.1% |
| evidence   |   1587 |  68.4% |
| source_url |   2184 |  94.2% |
| confidence |   1579 |  68.1% |
| is_primary |   2319 | 100.0% |
| start_date |      0 |   0.0% |
| end_date   |      0 |   0.0% |
| created_by |   2319 | 100.0% |

---

## 6. Orphan Entities (zero edges)

**307 orphan entities** (18.0% of all entities)

| Type         | Orphans |
| ------------ | ------: |
| organization |     186 |
| resource     |     107 |
| person       |      14 |

---

## 7. Belief Fields

Applicable entities (people + orgs): **1551**

### belief_regulatory_stance

Filled: 1265 / 1551 (81.6%)

| Value         | Count | Canonical? |
| ------------- | ----: | ---------- |
| Moderate      |   328 | yes        |
| Targeted      |   321 | yes        |
| Light-touch   |   204 | yes        |
| Precautionary |   164 | yes        |
| Mixed/unclear |   128 | yes        |
| Restrictive   |    92 | yes        |
| Accelerate    |    26 | yes        |
| Nationalize   |     2 | yes        |

### belief_agi_timeline

Filled: 1273 / 1551 (82.1%)

| Value              | Count | Canonical? |
| ------------------ | ----: | ---------- |
| Unknown            |   857 | yes        |
| 5-10 years         |   209 | yes        |
| 2-3 years          |   113 | yes        |
| 10-25 years        |    56 | yes        |
| Ill-defined        |    28 | yes        |
| 25+ years or never |     8 | yes        |
| Already here       |     2 | yes        |

### belief_ai_risk

Filled: 1305 / 1551 (84.1%)

| Value         | Count | Canonical? |
| ------------- | ----: | ---------- |
| Serious       |   546 | yes        |
| Manageable    |   247 | yes        |
| Existential   |   174 | yes        |
| Catastrophic  |   124 | yes        |
| Unknown       |   118 | yes        |
| Mixed/nuanced |    87 | yes        |
| Overstated    |     9 | yes        |

### belief_evidence_source

Filled: 1303 / 1551 (84.0%)

| Value             | Count | Canonical? |
| ----------------- | ----: | ---------- |
| Explicitly stated |   748 | yes        |
| Inferred          |   483 | yes        |
| Unknown           |    72 | yes        |

### belief_regulatory_stance_detail

Filled: 694 / 1551 (44.7%)

### belief_threat_models

Filled: 672 / 1551 (43.3%)

---

## 8. Citation Artifacts

**0 entities** have citation artifacts (`[n]` patterns) in notes.

---

## 9. Notes Quality Overview

| Category              | Count |  Rate |
| --------------------- | ----: | ----: |
| Empty / null          |     0 |  0.0% |
| Short (< 50 chars)    |     0 |  0.0% |
| Medium (50–200 chars) |   184 | 10.8% |
| Long (> 200 chars)    |  1522 | 89.2% |

---

## 10. Edge Connectivity

### Edges per entity (distribution)

| Edges      | Entities |
| ---------- | -------: |
| 0 (orphan) |      307 |
| 1          |      749 |
| 2-5        |      410 |
| 6-10       |      144 |
| 11-20      |       80 |
| 21+        |       16 |

### Top 15 most-connected entities

| Name                                            | Type         | Edges |
| ----------------------------------------------- | ------------ | ----: |
| OpenAI                                          | organization |    73 |
| Google                                          | organization |    49 |
| Anthropic                                       | organization |    47 |
| Stanford University                             | organization |    46 |
| Democratic Party                                | organization |    45 |
| Microsoft                                       | organization |    34 |
| Republican Party                                | organization |    33 |
| Senate AI Working Group                         | organization |    31 |
| UC Berkeley                                     | organization |    29 |
| United States Senate                            | organization |    29 |
| Massachusetts Institute of Technology           | organization |    27 |
| Coefficient Giving (formerly Open Philanthropy) | organization |    26 |
| Google DeepMind                                 | organization |    25 |
| Harvard University                              | organization |    21 |
| Stuart Russell                                  | person       |    21 |

