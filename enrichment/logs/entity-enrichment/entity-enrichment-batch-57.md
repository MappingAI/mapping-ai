# Entity Enrichment — Batch 57
**Date:** 2026-04-10
**Entities:** 12 (IDs 1317-1333)
**Phase:** phase3-manual

## Summary
Enriched 12 entities connected to the Element AI / Montreal AI ecosystem, Canadian AI policy, and related academic/VC/rights organizations. All were truly empty (notes=NULL, all beliefs=NULL).

## Entities Updated

| ID | Name | Type | Category | Reg. Stance | AI Risk | Evidence | Confidence |
|----|------|------|----------|-------------|---------|----------|------------|
| 1317 | Block Center for Technology and Society | organization | Academic | Moderate | Serious | Inferred | 5 |
| 1318 | Manish Parashar | person | Academic | Moderate | Manageable | Inferred | 5 |
| 1319 | Amii | organization | Academic | Moderate | Manageable | Inferred | 5 |
| 1320 | Jean-François Gagné | person | Executive | Light-touch | Manageable | Inferred | 4 |
| 1322 | Government of Canada | organization | Government/Agency | Targeted | Serious | Explicitly stated | 5 |
| 1323 | Data Collective | organization | VC/Capital/Philanthropy | Light-touch | Manageable | Inferred | 5 |
| 1324 | Real Ventures | organization | VC/Capital/Philanthropy | Light-touch | Manageable | Inferred | 5 |
| 1325 | Amnesty International | organization | Ethics/Bias/Rights | Restrictive | Serious | Explicitly stated | 5 |
| 1326 | Singapore Management University | organization | Academic | Targeted | Manageable | Inferred | 5 |
| 1331 | McGill Centre for Intelligent Machines | organization | Academic | Unknown | Unknown | Unknown | 5 |
| 1332 | McGill Collaborative for AI and Society | organization | Academic | Moderate | Serious | Inferred | 5 |
| 1333 | McGill AI Lab | organization | Frontier Lab | Unknown | Unknown | Unknown | 3 |

## Notes

### McGill cluster (1331, 1332, 1333)
Three distinct McGill entities with different scopes:
- **CIM (1331):** Engineering-focused research center (est. 1985) — robotics, vision, control. Pure technical research, no explicit policy stance.
- **McCAIS (1332):** Interdisciplinary AI-and-society initiative under CDSI — responsible AI, algorithmic fairness, policy engagement.
- **McGill AI Lab (1333):** Umbrella for ML research labs (Reasoning & Learning Lab, iSMART). Connected to Mila via shared faculty. Lower confidence (3) because "McGill AI Lab" isn't an official entity name — it maps to multiple labs.
All three are distinct and should remain separate entities. CIM and McCAIS have parent_company edges to McGill University. McGill AI Lab has an affiliated edge to McGill University.

### Jean-François Gagné (1320)
LinkedIn shows "Stealth AI Startup" as current role. Element AI acquired by ServiceNow in 2020. Confidence=4 due to limited info on current activities.

### Government of Canada (1322)
Strong explicit stance via AIDA legislation and Pan-Canadian AI Strategy. First country with a national AI strategy (2017). Targeted stance — sector-specific regulation focused on high-impact systems, not broad R&D restrictions.

### Amnesty International (1325)
Strongest regulatory stance in this batch (Restrictive). Explicitly calls for bans on facial recognition for mass surveillance, legally binding regulation, and community involvement in AI governance decisions.

## Edges (unchanged)
No edges created or modified. Existing edges verified:
- 1154: affiliated → Block Center ← Responsible AI Initiative
- 1155: employer → Manish Parashar → Responsible AI Initiative
- 1166: partner → Mila ↔ Amii
- 1170: founder → J-F Gagné → Element AI
- 1173: funder → Gov of Canada → Element AI
- 1174: funder → Data Collective → Element AI (Lead investor)
- 1176: founder → Element AI → Real Ventures
- 1177: partner → Element AI ↔ Amnesty International
- 1178: partner → Element AI ↔ SMU
- 1192: parent_company → McGill CIM → McGill University
- 1193: parent_company → McGill McCAIS → McGill University
- 1194: affiliated → McGill University → McGill AI Lab
