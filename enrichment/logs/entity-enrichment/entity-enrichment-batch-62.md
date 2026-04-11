# Entity Enrichment Batch 62

**Date:** 2026-04-10
**Entities:** 12
**Phase:** phase3-manual

## Summary

Enriched 12 entities (5 persons, 7 organizations) — German academic/research orgs (Weizenbaum Institute, TU Berlin), Argentine university (UBA), Senate AI Caucus, The American Scholar magazine, five U.S. Senators (McCormick, Wicker, Welch, Banks, Capito), and two federal agencies (NIST duplicate, SBA). All were truly empty (notes null, beliefs null). No edges modified.

## DUPLICATE FINDINGS

- **Entity 1416 "National Institute for Standards and Technology":** CONFIRMED DUPLICATE (THIRD instance, technically FOURTH). The correct name is "National Institute **of** Standards and Technology" — entity 1416 uses "for" instead of "of." Existing NIST entities:
  - **911** — "NIST" (phase3-manual, qa_approved=TRUE)
  - **1309** — "National Institute of Standards and Technology" (phase3-manual, qa_approved=TRUE)
  - **1468** — "National Institutes of Standard and Technology" (v2-auto, qa_approved=FALSE) — yet another duplicate with typo
  
  Entity 1416 has 1 edge: Ben Ray Lujan -> 1416 (collaborator). Entity 1468 has 1 edge: Frank Lucas -> 1468 (affiliated). Recommend reassigning these edges to entity 1309 and soft-deleting 1416 and 1468.

## Changes

### 1405 — Weizenbaum Institute (organization, Academic)
- **notes:** German research institute for interdisciplinary digitalization research, formally 'Weizenbaum Institute for the Networked Society.' Founded 2017, funded by German Federal Ministry of Education and Research (~EUR50M over 5 years). Consortium led by Berlin Social Science Center (WZB), includes TU Berlin, FU Berlin, HU Berlin, UdK Berlin, Uni Potsdam, Fraunhofer FOKUS. Studies social impact of digitalization — AI ethics, data governance, platform economies. Named after Joseph Weizenbaum.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1406 — Technische Universitat Berlin (organization, Academic)
- **notes:** Major German technical university (TU9 member). ~50 academic chairs in AI and computer science. Hosts BIFOLD (Berlin Institute for Foundations of Learning and Data), one of Germany's six national AI competence centers. Co-founded Einstein Center Digital Future (ECDF). Strong socio-technical AI focus. Key partner in Weizenbaum Institute consortium.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1407 — Universidad de Buenos Aires (organization, Academic)
- **notes:** Argentina's largest public university, ~40% of national research output. Has IALAB (Law Faculty — AI governance) and LIAA (Applied AI Lab). IALAB published guide on responsible generative AI use for judiciary. Key institution in Latin American AI policy discourse.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Researcher/analyst
- **confidence:** 4

### 1408 — Senate AI Caucus (organization, Government/Agency)
- **notes:** Bipartisan U.S. Senate caucus launched March 2019 by Heinrich (D-NM) and Portman (R-OH). Original members: Schatz, Gardner, Peters, Ernst. Mike Rounds (R-SD) became co-chair after Portman retired. Works toward responsible AI policy balancing innovation with ethical standards.
- **regulatory_stance:** Targeted | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Connector/convener, Decision-maker
- **confidence:** 5

### 1410 — The American Scholar (organization, Media/Journalism)
- **notes:** Quarterly magazine published by Phi Beta Kappa Society since 1932. Named after Emerson's 1837 oration. Multiple National Magazine Award winner. Publishes essays, criticism, poetry, fiction. Relevant to AI discourse through cultural/intellectual essays on technology and society.
- **regulatory_stance:** (null) | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **funding_model:** Nonprofit/donations
- **influence_type:** Narrator
- **confidence:** 5

### 1411 — Dave McCormick (person, Policymaker)
- **notes:** Republican U.S. Senator from PA (Jan 2025). Former CEO Bridgewater Associates (2020-2022). West Point grad, Bronze Star (82nd Airborne). Under Secretary of Treasury under Bush. AI-and-energy nexus advocate — hosted PA Energy and Innovation Summit (July 2025) at CMU with Trump. Champions Pittsburgh as AI hub. Pro-innovation, pro-competitiveness.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Decision-maker
- **confidence:** 5

### 1412 — Roger Wicker (person, Policymaker)
- **notes:** Republican U.S. Senator from MS (since 2007). Chairman of Senate Armed Services Committee (119th Congress). Key defense AI champion — secured AI funding in FY2025/FY2026 NDAAs ($10M autonomous AI C2, $10M AI-enabled Army multi-domain ops). 'Restoring Freedom's Forge' plan to reform Pentagon procurement for commercial AI. Pushed $925B defense bill. Focus: AI for military modernization to counter China.
- **regulatory_stance:** Targeted | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Decision-maker
- **confidence:** 5

### 1415 — Peter Welch (person, Policymaker)
- **notes:** Democratic U.S. Senator from VT (since 2023). Most active Senate voice on AI copyright/consent legislation. Introduced ~6 AI bills: TRAIN Act (copyright holder subpoena power for AI training data), AI CONSENT Act (consent for personal data in AI training), Digital Platform Commission Act. Serves on Judiciary (copyright) and Finance Committees. Champions artist protections from AI.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Decision-maker
- **confidence:** 5

### 1416 — National Institute for Standards and Technology (organization, Government/Agency) — DUPLICATE
- **notes:** DUPLICATE of entities 911 (NIST), 1309 (National Institute of Standards and Technology), and 1468 (National Institutes of Standard and Technology). Name uses 'for' instead of correct 'of.' Recommend merging edges and soft-deleting.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Implementer, Researcher/analyst
- **confidence:** 5

### 1419 — Small Business Administration (organization, Government/Agency)
- **notes:** U.S. federal agency (est. 1953). Increasingly relevant as small business AI adoption surges (58% using generative AI per 2025 survey). Provides AI guidance (sba.gov/ai). Subject of bipartisan Small Business AI Training Act (2026). Under Senate oversight scrutiny on AI practices. Trump admin's 2026 AI framework includes small business support pillar.
- **regulatory_stance:** Targeted | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Implementer
- **confidence:** 5

### 1423 — Jim Banks (person, Policymaker)
- **notes:** Republican U.S. Senator from IN (Jan 2025, formerly House 2017-2025). Armed Services Committee (Personnel, Seapower, Strategic Forces subcommittees) and Banking Committee. Former ranking member of House Cyber, Innovative Technologies, and Information Systems subcommittee. Also served on House U.S.-China Strategic Competition select committee. Conservative defense hawk. No significant public AI-specific policy positions identified.
- **regulatory_stance:** Light-touch | **ai_risk:** Unknown | **evidence:** Inferred | **agi_timeline:** Unknown
- **influence_type:** Decision-maker
- **confidence:** 4

### 1424 — Shelley Moore Capito (person, Policymaker)
- **notes:** Republican U.S. Senator from WV (since 2015). Key AI legislation author: VET AI Act (with Hickenlooper) directs NIST to develop voluntary AI assurance/verification guidelines; AI Scam Prevention Act prohibits deepfakes for fraud. Commerce, Science, and Transportation Committee. Pragmatic bipartisan approach — favors voluntary guidelines over heavy regulation.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Decision-maker
- **confidence:** 5
