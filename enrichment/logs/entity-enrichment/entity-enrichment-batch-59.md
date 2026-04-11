# Entity Enrichment Batch 59

**Date:** 2026-04-10
**Entities:** 12
**Phase:** phase3-manual

## Summary

Enriched 12 entities (7 persons, 5 organizations) — AI consciousness/welfare researchers (Eleos AI cluster), major AI figures (Chalmers, Mitchell, Jumper), policy orgs (Niskanen, AISI, METR), and diversity org (Black in AI). All were truly empty (notes null, beliefs null). No edges modified.

## Duplicate Findings

- **Robert Long (1353) / Rob Long (1354):** CONFIRMED DUPLICATE. Same person — Robert Long, Executive Director of Eleos AI. "Rob" is informal name. Both enriched with cross-reference notes. Recommend merging edges to 1353 and soft-deleting 1354.
- **U.S. Artificial Intelligence Safety Institute (1358):** Related to entity 205 (U.S. AI Safety Institute (NIST)) — likely the SAME entity under different naming. Entity 1629 (US AI Safety Institute Consortium) is AISI's consortium membership body, distinct but related. Entity 1309 (NIST) is the parent agency. All noted in enrichment. Recommend merging 1358 into 205.

## Changes

### 1350 — Clay Bavor (person, Executive)
- **notes:** Co-founder of Sierra AI (with Bret Taylor), an enterprise AI agent platform valued at $10B. Former Google VP (18 years), led Google Labs, AR/VR, Project Starline, Google Lens. Sierra hit $100M ARR in 7 quarters. AI optimist focused on applied/enterprise AI.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **influence_type:** Builder, Decision-maker
- **confidence:** 5

### 1351 — Eleos AI (organization, AI Safety/Alignment)
- **notes:** Nonprofit research org focused on AI welfare, consciousness, and moral patienthood. Co-founded by Kyle Fish, Robert Long, Kathleen Finlinson. Published landmark report "Taking AI Welfare Seriously." Five research priorities: welfare interventions, human-AI cooperation, leveraging AI for welfare research, standardized evaluations, credible communication.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Nonprofit/donations
- **influence_type:** Researcher/analyst, Organizer/advocate
- **confidence:** 5

### 1352 — David Chalmers (person, Researcher)
- **notes:** University Professor of Philosophy and Neural Science at NYU. Co-director of Center for Mind, Brain, and Consciousness. Formulated the "hard problem of consciousness." Leading voice on AI consciousness and moral status. Author of "Reality+" on virtual worlds. Warns against corporate control of virtual/AI worlds.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Ill-defined
- **other_categories:** Academic
- **influence_type:** Researcher/analyst, Narrator
- **confidence:** 5

### 1353 — Robert Long (person, Researcher)
- **notes:** Executive Director of Eleos AI. PhD Philosophy from NYU. Former research fellow at Future of Humanity Institute (Oxford) and CAIS Philosophy Fellow (2023). Leading researcher on AI consciousness, sentience, and moral status. Co-author of "Consciousness in Artificial Intelligence" with Butlin, Bengio, et al. NOTE: Same person as Rob Long (entity 1354).
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1354 — Rob Long (person, Researcher) — DUPLICATE
- **notes:** DUPLICATE of entity 1353 (Robert Long). Rob Long is the informal name for Robert Long, Executive Director of Eleos AI. See entity 1353 for full enrichment.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1355 — Kathleen Finlinson (person, Researcher)
- **notes:** Head of Strategy and co-founder of Eleos AI. Background in applied mathematics, data science, and AI forecasting. Researches strategic considerations for AI welfare action. Advocates balancing AI control with cooperative strategies that respect AI welfare.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst, Advisor/strategist
- **confidence:** 5

### 1356 — Niskanen Center (organization, Think Tank/Policy Org)
- **notes:** Centrist/center-right think tank founded 2015 by Jerry Taylor (ex-Cato). Named "Most Interesting Think Tank" by TIME (2023). AI policy stance: regulatory restraint, intervene only when harm is realistic. Has 501(c)(3) research arm and 501(c)(4) lobbying arm. Major funders include Hewlett Foundation, Open Philanthropy, Carnegie Corp.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Nonprofit/foundation grants
- **influence_type:** Advisor/strategist, Researcher/analyst
- **confidence:** 5

### 1358 — U.S. Artificial Intelligence Safety Institute (organization, Government/Agency)
- **notes:** Housed within NIST. Develops science-based metrics, tools, and guidelines for AI safety evaluation. Established by Biden EO 14110 (Oct 2023). Paul Christiano served as Head of AI Safety. Runs AISIC consortium (290+ members). Renamed to CAISI in 2025. Budget ~$10M (2024). NOTE: Related — 205 (likely same entity), 1629 (AISIC consortium), 1309 (NIST parent).
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Implementer, Researcher/analyst
- **confidence:** 5

### 1359 — Model Evaluation and Threat Research (organization, AI Safety/Alignment)
- **notes:** Nonprofit AI safety eval org (formerly ARC Evals, spun off Dec 2023). Founded by Beth Barnes (ex-OpenAI). Evaluates frontier model capabilities for catastrophic risk. Worked with OpenAI (o3, GPT-4.5) and Anthropic (Claude). Does NOT accept lab funding to avoid conflicts. Budget ~$13-15M/year. Funded via Audacious Project (TED).
- **regulatory_stance:** Moderate | **ai_risk:** Catastrophic | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Nonprofit/donations
- **influence_type:** Researcher/analyst, Implementer
- **confidence:** 5

### 1366 — John M. Jumper (person, Researcher)
- **notes:** Director at Google DeepMind. Led development of AlphaFold (protein structure prediction). Nobel Prize in Chemistry 2024 (shared with Hassabis and Baker). PhD theoretical chemistry (U of Chicago). AI optimist — believes AI has "unparalleled potential to improve the lives of billions."
- **regulatory_stance:** Unknown | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst, Builder
- **confidence:** 5

### 1367 — Black in AI (organization, Labor/Civil Society)
- **notes:** Nonprofit founded 2017 by Timnit Gebru and Rediet Abebe. Increases presence and inclusion of Black people in AI. Four pillars: education pathways, financial barriers, visibility, community support. MacArthur Foundation funded. Hosts annual NeurIPS workshop.
- **regulatory_stance:** Targeted | **ai_risk:** Serious | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Nonprofit/foundation grants
- **influence_type:** Organizer/advocate, Connector/convener
- **confidence:** 5

### 1368 — Margaret Mitchell (person, Researcher)
- **notes:** Chief Ethics Scientist at Hugging Face. Previously founded and co-led Google Ethical AI group (fired 2021 alongside Timnit Gebru). Pioneered "Model Cards" for ML model reporting. Created "Seeing AI" for blind/low-vision users. ~100 papers on NLG, assistive tech, CV, AI ethics. Strong advocate for diversity in AI and regulation centering those most harmed.
- **regulatory_stance:** Restrictive | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **other_categories:** Academic
- **influence_type:** Researcher/analyst, Organizer/advocate, Narrator
- **confidence:** 5

## Edges (existing, not modified)
- 1257: collaborator — Josh Woodward -> Clay Bavor (former head of Google Labs)
- 1273: founder — Kyle Fish -> Eleos AI (co-founder)
- 1274: collaborator — Kyle Fish -> David Chalmers
- 1275: collaborator — Kyle Fish -> Robert Long
- 1276: collaborator — Kyle Fish -> Rob Long (DUPLICATE edge — points to duplicate entity 1354)
- 1277: collaborator — Kyle Fish -> Kathleen Finlinson
- 1287: employer — Jennifer Pahlka -> Niskanen Center (senior fellow)
- 1290: employer — Paul Christiano -> U.S. Artificial Intelligence Safety Institute (Head of AI Safety)
- 1296: founder — Paul Christiano -> Model Evaluation and Threat Research (NOTE: Beth Barnes is actual founder; Paul Christiano founded ARC, parent org)
- 1311: collaborator — Demis Hassabis -> John M. Jumper
- 1317: founder — Timnit Gebru -> Black in AI (Co-founder)
- 1323: collaborator — Timnit Gebru -> Margaret Mitchell (Co-lead)
