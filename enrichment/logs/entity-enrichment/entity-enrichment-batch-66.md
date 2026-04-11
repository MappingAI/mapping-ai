# Entity Enrichment Batch 66

**Date:** 2026-04-10
**Entities:** 12
**Phase:** phase3-manual

## Summary

Enriched 12 entities (8 persons, 4 organizations) — U.S. policymakers (Schmitt, Tillis, Gottheimer, Clarke, Jayapal, Lee, Pressley, Warren), congressional bodies (House Democratic Commission on AI, Bipartisan Taskforce on AI, House Science Space & Tech Committee), and a journalism school (Craig Newmark Graduate School of Journalism). All were truly empty (notes null, beliefs null). No edges modified.

## Duplicate Findings

- **1467 "House Science, Space, and Technology Committee"** is a CONFIRMED DUPLICATE of entity 1150 ("House Committee on Science Space & Tech"). Same U.S. House committee — full formal name vs. abbreviated name. Entity 1150 is already enriched (phase3-manual). Edge 1646 (employer: Frank Lucas -> 1467, role='Chairman') should be reassigned to 1150. Recommend merging edges to 1150 and soft-deleting 1467.

- **1470 "Bipartisan Taskforce on Artificial Intelligence"** is a CONFIRMED DUPLICATE of entity 1149 ("House Bipartisan Task Force on Artificial Intelligence"). Same body. Entity 1149 is already enriched (phase3-manual). Edge 1651 (employer: Ted Lieu -> 1470, role='Co-Chair') should be reassigned to 1149. Recommend merging edges to 1149 and soft-deleting 1470.

## Notable Patterns

- **AI Civil Rights Act cohort:** Clarke (1472), Jayapal (1473), Lee (1474), Pressley (1475), and Warren (1476) are all co-sponsors of the AI Civil Rights Act (reintroduced Dec 2025 with Sen. Markey). All classified as Restrictive/Serious. Existing edges connect them via Ed Markey collaborator relationships.
- **Schmitt-Warren bipartisan pair:** Schmitt (1465) and Warren (1476) co-introduced the Protecting AI and Cloud Competition in Defense Act despite being on opposite ends of the regulatory spectrum (Light-touch vs. Restrictive). Existing edge 1639 connects Schmitt to Gary Peters, not Warren — no edge between Schmitt and Warren currently exists.
- **Commission succession:** House Democratic Commission on AI (1469) is the Democratic successor to the expired Bipartisan AI Task Force (1149/1470). Gottheimer (1471) is co-chair of the new commission alongside Ted Lieu.

## Changes

### 1464 — Craig Newmark Graduate School of Journalism (organization, Media/Journalism)
- **notes:** Public graduate journalism school at CUNY (est. 2006), only public graduate J-school in northeastern U.S. Named after Craig Newmark ($20M + $10M endowment). Runs AI Journalism Labs training journalists on generative AI. Community Media Training on AI's impact on vulnerable populations.
- **regulatory_stance:** null | **ai_risk:** null | **evidence:** null | **agi_timeline:** null
- **funding_model:** Government | **other_categories:** Academic
- **influence_type:** Narrator, Researcher/analyst
- **confidence:** 5

### 1465 — Eric Schmitt (person, Policymaker)
- **notes:** Republican U.S. Senator from Missouri. Co-introduced Protecting AI and Cloud Competition in Defense Act with Warren. Co-introduced AI Workforce Framework Act with Peters. Secured $250M for AI in Cyber Command. Frames AI around national security and startup competition.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Decision-maker
- **confidence:** 5

### 1466 — Thom Tillis (person, Policymaker)
- **notes:** Republican U.S. Senator from North Carolina. Co-sponsored Secure AI Act (2024) with Warner, NO FAKES Act (2024), federal AI procurement bill with Peters. Sole senator to vote against removing state AI regulation moratorium.
- **regulatory_stance:** Targeted | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Decision-maker
- **confidence:** 5

### 1467 — House Science, Space, and Technology Committee (organization, Government/Agency) — DUPLICATE
- **notes:** DUPLICATE of entity 1150. Enriched with cross-reference. Recommend merging edges to 1150 and soft-deleting.
- **regulatory_stance:** Targeted | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Decision-maker, Implementer
- **confidence:** 5

### 1469 — House Democratic Commission on AI and the Innovation Economy (organization, Government/Agency)
- **notes:** Launched Dec 2025 by Leader Jeffries. Co-chaired by Lieu, Gottheimer, Foushee. Ex officio: Lofgren, Pallone. Successor to Bipartisan AI Task Force. Convening throughout 2026.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Advisor/strategist, Decision-maker
- **confidence:** 5

### 1470 — Bipartisan Taskforce on Artificial Intelligence (organization, Government/Agency) — DUPLICATE
- **notes:** DUPLICATE of entity 1149. Enriched with cross-reference. Recommend merging edges to 1149 and soft-deleting.
- **regulatory_stance:** Targeted | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Advisor/strategist
- **confidence:** 5

### 1471 — Josh Gottheimer (person, Policymaker)
- **notes:** Democratic U.S. Rep from NJ-05. Centrist. Co-Chair of House Democratic Commission on AI. Key AI bills: Financial Services AI Innovation Act, AI Security Readiness Act, AI Workforce Training Act. Critical of White House AI framework. Advocates balanced 'Smart AI' regulation.
- **regulatory_stance:** Targeted | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Decision-maker, Advisor/strategist
- **confidence:** 5

### 1472 — Yvette Clarke (person, Policymaker)
- **notes:** Democratic U.S. Rep from NY-09. CBC Chair. Early AI regulation champion: Algorithmic Accountability Act (2019/2022/2025), DEEPFAKES Accountability Act, REAL Political Ads Act, AI Civil Rights Act co-lead. Focuses on election integrity, marginalized community protection, AI transparency.
- **regulatory_stance:** Restrictive | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Decision-maker, Organizer/advocate
- **confidence:** 5

### 1473 — Pramila Jayapal (person, Policymaker)
- **notes:** Democratic U.S. Rep from WA-07. Former CPC Chair. Co-lead of AI Civil Rights Act banning algorithmic discrimination with mandatory pre/post-deployment testing. Civil rights and equity lens on AI regulation.
- **regulatory_stance:** Restrictive | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Decision-maker, Organizer/advocate
- **confidence:** 5

### 1474 — Summer Lee (person, Policymaker)
- **notes:** Democratic U.S. Rep from PA-12. Co-lead of AI Civil Rights Act and Eliminating BIAS Act (mandating civil rights offices in federal agencies overseeing AI). Focus on algorithmic discrimination in jobs, housing, healthcare.
- **regulatory_stance:** Restrictive | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Decision-maker, Organizer/advocate
- **confidence:** 5

### 1475 — Ayanna Pressley (person, Policymaker)
- **notes:** Democratic U.S. Rep from MA-07. 'Squad' member. Co-lead of AI Civil Rights Act. Co-introduced No Biometric Barriers Housing Act. Focuses on AI's disparate impact on communities of color, facial recognition, deepfakes.
- **regulatory_stance:** Restrictive | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Decision-maker, Organizer/advocate
- **confidence:** 5

### 1476 — Elizabeth Warren (person, Policymaker)
- **notes:** Democratic U.S. Senator from Massachusetts. AI antitrust champion: co-introduced Protecting AI and Cloud Competition in Defense Act with Schmitt, co-sponsored GAIN AI Act, investigated Google-Anthropic and Microsoft-OpenAI partnerships, supported Nvidia antitrust probe. Co-sponsor AI Civil Rights Act. Led opposition to AI regulation moratorium in NDAA.
- **regulatory_stance:** Restrictive | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Decision-maker, Organizer/advocate
- **confidence:** 5
