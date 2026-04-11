# Entity Enrichment Batch 55

**Date:** 2026-04-10
**Entities:** 12
**Phase:** phase3-manual

## Summary

Enriched 12 entities (7 persons, 5 organizations) — mostly Wharton School AI faculty/leadership, two Tulane AI centers, Court Watch NOLA, NASA Ames, and Sebastian Thrun. All were truly empty (notes null, beliefs null). No edges modified.

## Changes

### 1284 — Carol L. Folt (person, Academic)
- **notes:** President of USC (2019-2025), launched Frontiers of Computing and USC School of Advanced Computing. Now President Emeritus.
- **regulatory_stance:** Moderate | **ai_risk:** Unknown | **evidence:** Inferred | **agi_timeline:** Unknown
- **influence_type:** Decision-maker
- **confidence:** 4

### 1286 — Erika James (person, Academic)
- **notes:** Dean of Wharton, launched AI & Analytics Initiative, new AI major/concentration. Emphasizes responsible AI.
- **regulatory_stance:** Moderate | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **influence_type:** Decision-maker
- **confidence:** 5

### 1287 — Kartik Hosanagar (person, Academic)
- **notes:** Wharton professor, author of "A Human's Guide to Machine Intelligence." Advocates algorithmic bill of rights, issue-specific regulation, regulatory sandboxes.
- **regulatory_stance:** Targeted | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst, Narrator
- **confidence:** 5

### 1288 — Kevin Werbach (person, Academic)
- **notes:** Wharton professor, directs Accountable AI Lab. Hosts "Road to Accountable AI" podcast. Former FCC/Obama transition team.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Inferred | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst, Advisor/strategist
- **confidence:** 5

### 1289 — Eric Bradlow (person, Academic)
- **notes:** Vice Dean of AI & Analytics at Wharton, leads AI & Analytics Initiative. Applied statistician (PhD Harvard).
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **influence_type:** Decision-maker, Researcher/analyst
- **confidence:** 5

### 1290 — Prasanna (Sonny) Tambe (person, Academic)
- **notes:** Wharton professor, Co-Director of Human-AI Research. Research on AI workforce economics. Co-advises AI major.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1291 — Giles Hooker (person, Academic)
- **notes:** Wharton professor of statistics. Research in ML, functional data analysis. Co-advises AI programs. Developed deep learning course.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst
- **confidence:** 4

### 1292 — Jurist Center for Artificial Intelligence (organization, Academic)
- **notes:** Tulane AI research center, endowment-funded. Applied AI research across ML, multi-agent systems, CV, NLP, ethics.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **funding_model:** Endowment/university
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1293 — Center for Community-Engaged Artificial Intelligence (organization, Academic)
- **notes:** Tulane Center of Excellence. Human-centered AI with community engagement. Partners with Court Watch NOLA ($1.5M NSF grant).
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** University/grants
- **influence_type:** Researcher/analyst, Organizer/advocate
- **confidence:** 5

### 1294 — Court Watch NOLA (organization, Labor/Civil Society)
- **notes:** Oldest court-watching program in U.S. (est. 2007). Partnered with Tulane on NSF-funded AI platform for criminal justice transparency.
- **regulatory_stance:** Targeted | **ai_risk:** Serious | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Nonprofit/grants
- **influence_type:** Organizer/advocate
- **confidence:** 5

### 1296 — NASA Ames Research Center (organization, Government/Agency)
- **notes:** Silicon Valley NASA center. Intelligent Systems Division (autonomy, robotics, systems health). Key AI projects: Data Fabric, RAM-AO.
- **regulatory_stance:** Moderate | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Researcher/analyst, Builder
- **confidence:** 5

### 1297 — Sebastian Thrun (person, Academic)
- **notes:** Founded Google X, Waymo, Udacity, Kitty Hawk. Stanford AI Lab director. Strong AI optimist, warns against premature regulation. Favors liability-based approach. CEO of Sage AI Labs.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **other_categories:** Executive
- **influence_type:** Builder, Researcher/analyst, Narrator
- **confidence:** 5

## Edges (existing, not modified)
- 1082: employer — Carol L. Folt -> USC (President)
- 1084: employer — Erika James -> Wharton School (Dean)
- 1085: employer — Kartik Hosanagar -> Wharton School
- 1086: employer — Kevin Werbach -> Wharton School (Accountable AI Lab director)
- 1087: employer — Eric Bradlow -> Wharton School (Vice Dean AI & Analytics)
- 1088: employer — Prasanna (Sonny) Tambe -> Wharton School
- 1089: employer — Giles Hooker -> Wharton School
- 1090: parent_company — Jurist Center for AI -> Tulane University
- 1091: parent_company — CEAI -> Tulane University
- 1092: partner — Tulane University -> Court Watch NOLA
- 1097: employer — Peter Norvig -> NASA Ames Research Center
- 1099: collaborator — Peter Norvig -> Sebastian Thrun (co-teacher)
