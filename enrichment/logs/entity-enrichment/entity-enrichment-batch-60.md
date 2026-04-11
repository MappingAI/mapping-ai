# Entity Enrichment Batch 60

**Date:** 2026-04-10
**Entities:** 12
**Phase:** phase3-manual

## Summary

Enriched 12 entities (7 persons, 5 organizations) — WGA presidents (Stiehm, Cullen), conservative PAC (Club for Growth Action), university (Notre Dame), Brookings fellow (Kinder), international security conference (Munich Security Conference), BCI company (Neuralink), law professor (Narechania), AI diversity nonprofit (AI4ALL), and three World Labs co-founders (Johnson, Lassner, Mildenhall). All were truly empty (notes null, beliefs null). No edges modified.

## Notable Findings

- **World Labs cluster (1385, 1386, 1387):** Justin Johnson, Christoph Lassner, and Ben Mildenhall are all co-founders of World Labs with Fei-Fei Li (who already has edges to them). Spatial intelligence startup valued at $5B with $1B+ raised. All three are technical researchers with no public AI policy positions — beliefs set to Unknown.
- **Neuralink (1379):** Already had qa_approved=TRUE but notes were empty. Category "Infrastructure & Compute" retained — BCI technology is at the intersection of hardware/AI but doesn't fit neatly into another category.
- **WGA pair (1369, 1370):** Both strongly pro-regulation on AI in creative industries. Stiehm (WGA West) and Cullen (WGA East) both have collaborator edges to Fran Drescher (SAG-AFTRA). Both set to Restrictive stance.
- **Tejas Narechania (1381):** Co-authored antimonopoly AI regulation paper with Ganesh Sitaraman (edge exists). Advocates structural separation and nondiscrimination rules — set to Restrictive.

## Changes

### 1369 — Meredith Stiehm (person, Organizer)
- **notes:** President of WGA West (2021-2025). TV showrunner (The Rookie, Code Black, Cold Case, NYPD Blue). Named TIME 100 Most Influential People in AI 2024. Led WGA during historic 148-day strike in 2023 that secured precedent-setting AI protections for writers. Called on studios to sue AI companies for using copyrighted work to train models.
- **regulatory_stance:** Restrictive | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Organizer/advocate, Decision-maker
- **confidence:** 5

### 1370 — Lisa Takeuchi Cullen (person, Organizer)
- **notes:** President of WGA East (elected Sept 2023). First person of color to hold the position. Participated in April 2024 White House roundtable on AI and Workers Rights. Launched WGA East AI Task Force. Strong enforcement of 2023 MBA AI protections.
- **regulatory_stance:** Restrictive | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Organizer/advocate, Decision-maker
- **confidence:** 5

### 1371 — Club for Growth Action (organization, Political Campaign/PAC)
- **notes:** Conservative super PAC. Supports limited-government, free-market candidates. Major donors include Peter Thiel. Focuses on tax cuts, deregulation, free trade. No specific AI policy position — general deregulatory stance inferred.
- **regulatory_stance:** Accelerate | **ai_risk:** Unknown | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Donor-funded PAC
- **influence_type:** Funder/investor
- **confidence:** 4

### 1372 — University of Notre Dame (organization, Academic)
- **notes:** Private Catholic research university. Major AI initiatives: AI@ND hub, Lucy Family Institute. $50.8M Lilly Endowment grant for faith-based AI ethics (DELTA Network). $1M Bloomberg award for human-centered AI in public service.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Endowment/tuition/grants
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1373 — Molly Kinder (person, Researcher)
- **notes:** Senior Fellow at Brookings. Leading multi-year project on generative AI's impact on work and workers. Advocates worker voice in AI implementation, enhanced union protections, public investment in workforce training. Argues U.S. lags Europe in worker protections.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst, Advisor/strategist
- **confidence:** 5

### 1374 — Munich Security Conference (organization, Think Tank/Policy Org)
- **notes:** Premier annual international security conference (since 1963). Convened AI Elections Accord signed by 27 tech companies (2024). Hosts Frontier AI Safety Commitments discussions. Frames AI as 'decisive factor' in systemic competition.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Government/corporate sponsorship
- **influence_type:** Connector/convener
- **confidence:** 5

### 1379 — Neuralink (organization, Infrastructure & Compute)
- **notes:** Brain-computer interface company co-founded by Elon Musk (2016). Developing implantable N1 chip for paralysis patients. FDA IDE approval May 2023; first human implant Jan 2024. FDA Breakthrough Device Designation for speech restoration (May 2025). Raised over $700M.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Venture-funded
- **influence_type:** Builder
- **confidence:** 5

### 1381 — Tejas N. Narechania (person, Academic)
- **notes:** Professor of Law at UC Berkeley. Faculty co-director of Berkeley Center for Law & Technology. Former SCOTUS clerk (Justice Breyer). Published 'An Antimonopoly Approach to Governing AI' with Ganesh Sitaraman. Advocates structural separation, nondiscrimination, public cloud options. Work cited in 2024 Economic Report of the President.
- **regulatory_stance:** Restrictive | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst, Advisor/strategist
- **confidence:** 5

### 1384 — AI4ALL (organization, Labor/Civil Society)
- **notes:** Nonprofit co-founded 2017 by Fei-Fei Li, Olga Russakovsky, Rick Sommer. Grew from 2015 Stanford program. 2022 pivot to College Pathways for underrepresented students. 16+ university partnerships. Early funders include Melinda French Gates/Pivotal Ventures and Jensen Huang.
- **regulatory_stance:** Moderate | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Nonprofit/philanthropy
- **influence_type:** Organizer/advocate
- **confidence:** 5

### 1385 — Justin Johnson (person, Executive)
- **notes:** Co-founder of World Labs (spatial intelligence, $5B valuation). Assistant Professor of CS at University of Michigan. PhD Stanford (Fei-Fei Li). Key PyTorch contributor. Created CLEVR benchmark. NSF CAREER Award.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **other_categories:** Academic
- **influence_type:** Builder, Researcher/analyst
- **confidence:** 5

### 1386 — Christoph Lassner (person, Executive)
- **notes:** Co-founder of World Labs. PhD University of Tubingen. Previously led research at Epic Games and Meta Reality Labs. Created Pulsar differentiable renderer (precursor to Gaussian Splatting). Built human pose estimation for Amazon Halo.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **influence_type:** Builder, Researcher/analyst
- **confidence:** 5

### 1387 — Ben Mildenhall (person, Executive)
- **notes:** Co-founder of World Labs. Co-creator of NeRF (Neural Radiance Fields), ECCV 2020 honorable mention. PhD UC Berkeley, Hertz Fellow. Former Google Research scientist (2021-2023). Research spans computational photography and 3D reconstruction.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **influence_type:** Builder, Researcher/analyst
- **confidence:** 5
