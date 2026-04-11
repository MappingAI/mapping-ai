# Batch 56 — Entity Enrichment Log

**Date:** 2026-04-10
**Entities:** 12
**Phase:** phase3-manual
**Status:** Complete

## Entities Enriched

| ID | Name | Type | Category | Confidence | Reg. Stance | AI Risk | Key Finding |
|----|------|------|----------|-----------|-------------|---------|-------------|
| 1298 | Nimar Arora | person | Executive | 4 | Unknown | Unknown | Co-founder Bayesian Logic Inc., invented NET-VISA for CTBTO nuclear detection, PhD UC Berkeley under Stuart Russell, now at JazzX AI |
| 1299 | CTBT organization | organization | Government/Agency | 4 | Unknown | Unknown | International treaty body using AI/ML for nuclear test detection, 337 IMS facilities worldwide, connected to Bayesian Logic via NET-VISA |
| 1303 | Idaho National Laboratory | organization | Government/Agency | 5 | Unknown | Unknown | DOE national lab leading AI for nuclear energy; major 2025 partnerships with AWS, Microsoft, NVIDIA; DOE AI data center site |
| 1304 | Pam Bondi | person | Policymaker | 5 | Light-touch | Unknown | U.S. Attorney General; created DOJ AI Litigation Task Force to challenge state AI laws; supports "minimally burdensome" federal framework |
| 1305 | Mike Johnson | person | Policymaker | 5 | Light-touch | Unknown | House Speaker; 3-point AI plan emphasizing national security and innovation; "government must resist the siren song of control" |
| 1306 | Steve Scalise | person | Policymaker | 5 | Light-touch | Unknown | House Majority Leader; co-led national AI framework commitment; pushed state AI preemption in NDAA |
| 1310 | Ylli Bajraktari | person | Executive | 5 | Targeted | Serious | CEO of SCSP (Eric Schmidt's AI policy org); former NSCAI Executive Director; advocates targeted oversight of high-consequence AI |
| 1311 | Trevor Darrell | person | Researcher | 5 | Unknown | Unknown | UC Berkeley EECS prof; founding co-director of BAIR; ~300K citations; created Caffe deep-learning library |
| 1312 | Clarifai | organization | Deployers & Platforms | 5 | Unknown | Unknown | Enterprise AI platform (2013); Project Maven participant; Army R&D partner; $100M total funding; Neural Net One gov subsidiary |
| 1313 | College of Computing, Data Science, and Society | organization | Academic | 5 | N/A | N/A | UC Berkeley college (est. 2023); houses CS, Data Science, Statistics; includes Berkeley Institute for Data Science |
| 1315 | Emory University | organization | Academic | 4 | N/A | N/A | Private research university; AI.Humanity initiative; AI.Health institute; Center for AI Learning |
| 1316 | Emory AI Group | organization | Academic | 4 | N/A | N/A | Multi-lab research collective at Emory: NLP, simulation, health AI, imaging AI; part of AI.Humanity |

## Notable Observations

- **Bondi/Johnson/Scalise cluster**: All three policymakers share a Light-touch regulatory stance, aligned with the Trump administration's pro-innovation, anti-state-regulation AI framework. They form a coherent Republican House leadership bloc on AI policy.
- **Bajraktari stands out**: Unlike the Light-touch policymakers, Bajraktari and SCSP advocate for Targeted regulation — sector-specific rules focused on high-consequence AI use cases. This is a more nuanced position rooted in his NSCAI experience.
- **CTBTO-Bayesian Logic connection**: The edge between CTBT organization and Bayesian Logic Inc. is explained by the NET-VISA model — Nimar Arora's invention for probabilistic nuclear explosion detection.
- **INL as AI infrastructure hub**: Idaho National Laboratory is emerging as a major node in the AI-energy nexus, with simultaneous partnerships with AWS, Microsoft, and NVIDIA, plus DOE designation as an AI data center site.
- **Clarifai defense orientation**: Clarifai's government work (Project Maven, Army contracts, Neural Net One subsidiary) makes it a notable defense-AI deployer, distinct from purely commercial AI platforms.

## Edges (Pre-existing, Not Modified)

- 1298 (Nimar Arora) --founder--> Bayesian Logic Inc. (role: co-Founder)
- 1299 (CTBT org) <--partner-- Bayesian Logic Inc.
- 1303 (Idaho National Laboratory) <--supporter-- Jim Risch
- 1304 (Pam Bondi) --employer--> Donald Trump (role: U.S. Attorney General)
- 1305 (Mike Johnson) <--supporter-- Donald Trump (role: Republican House Speaker)
- 1306 (Steve Scalise) <--supporter-- Donald Trump (role: Republican House leader)
- 1310 (Ylli Bajraktari) --employer--> SCSP (role: President and CEO)
- 1311 (Trevor Darrell) --founder--> BAIR (role: Professor/co-founder)
- 1312 (Clarifai) <--partner-- BAIR
- 1313 (CDSS) --parent_company--> Berkeley Institute for Data Science
- 1315 (Emory University) <--affiliated-- Responsible AI Initiative
- 1316 (Emory AI Group) <--partner-- Responsible AI Initiative
