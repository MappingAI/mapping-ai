# Entity Enrichment Batch 64

**Date:** 2026-04-10
**Entities:** 12
**Phase:** phase3-manual

## Summary

Enriched 12 entities (7 persons, 4 organizations, 1 duplicate person) — AI policy advocacy org (Public First Action), Biden-era policy staffers (Hansmann), Stanford/MIT economists studying AI's labor/macro impacts (Unger, McAfee, Raymond), law school (Columbia), universities (Stony Brook, Seoul National), NLP researchers (Cardie, Hancock), and an Oxford AI ethics philosopher (Tasioulas). All were truly empty (notes null, beliefs null). No edges modified.

## DUPLICATE FINDING — PROMINENT

- **President Biden (1445) / Joe Biden (1376):** CONFIRMED DUPLICATE. Same person — 46th U.S. President. Entity 1376 "Joe Biden" was already enriched (phase3-manual) with full notes, beliefs (Moderate/Serious/Explicitly stated), and 4 edges (Prabhakar advisor, Sanders supporter, Reed employer, Nelson employer). Entity 1445 "President Biden" has 1 edge: edge 1602 (`employer: Tim Wu -> President Biden`, role="Special Assistant to President Biden for competition and tech policy"). Enriched 1445 with matching data and DUPLICATE flag. **Recommend: merge edge 1602 to target entity 1376, then soft-delete entity 1445.**

## Changes

### 1439 — Public First Action (organization, Political Campaign/PAC)
- **notes:** Bipartisan 501(c)(4) nonprofit focused on AI policy advocacy, co-founded in 2025 by former Congressmen Brad Carson (D) and Chris Stewart (R). Received $20M from Anthropic in Feb 2026 — its largest single donation — to counter 'Leading the Future,' a $125M super PAC backed by tech billionaires opposing AI regulation. Policy priorities: AI model transparency safeguards, federal AI governance framework, smart export controls on AI chips, targeted regulation of near-term high risks (bioweapons, cyberattacks). Plans to back 30-50 candidates from both parties in 2026 state and federal races.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Donor-funded
- **influence_type:** Organizer/advocate
- **confidence:** 5

### 1440 — Lisa Hansmann (person, Policymaker)
- **notes:** Former Special Assistant to the President and Senior Advisor in the Biden White House Chief of Staff office, where she drove implementation of the Inflation Reduction Act, Bipartisan Infrastructure Law, and CHIPS and Science Act. Previously Senior Policy Advisor at the White House National Economic Council (2021-2023) focusing on industrial strategy and energy market resilience. Now Director at Foundry Logic, scaling businesses addressing structural supply-demand imbalances. Co-authored AI energy policy proposals with Brian Deese (MIT) on 'National AI Additionality Framework' for managing AI data center electricity demands. Stanford SIEPR affiliated.
- **regulatory_stance:** Targeted | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **influence_type:** Advisor/strategist, Implementer
- **confidence:** 4

### 1441 — Gabriel Unger (person, Academic)
- **notes:** Postdoctoral fellow at the Stanford Digital Economy Lab directed by Erik Brynjolfsson. Macroeconomist studying AI's economic impacts. Co-authored 'The Macroeconomics of Artificial Intelligence' (IMF Finance & Development, Dec 2023) with Brynjolfsson, examining whether transformative AI can fulfill its revolutionary economic potential. Research addresses three fundamental questions: shared vision for AI's economic role, implications for growth theory, and redesigning education and social connections in the age of transformative AI.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst
- **confidence:** 4

### 1442 — Andrew McAfee (person, Academic)
- **notes:** Principal Research Scientist at MIT Sloan School of Management. Co-founder and co-director of MIT's Initiative on the Digital Economy (IDE). Co-authored 'The Second Machine Age' (2014) with Erik Brynjolfsson — influential book arguing technology races ahead of skills, organizations, and economic institutions. Also authored 'More from Less' (2019). Inaugural Visiting Fellow at Google's Technology and Society organization. Research focuses on how digital technologies reshape work, firms, and the economy. Prominent voice on AI's labor market disruption potential.
- **regulatory_stance:** Light-touch | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst, Narrator
- **confidence:** 5

### 1443 — Lindsey Raymond (person, Researcher)
- **notes:** Economist and AI researcher. Postdoctoral fellow in Economics and Computation at Microsoft Research. Will join MIT as Assistant Professor (joint Economics and Computer Science) in summer 2026. PhD from MIT (2024), BA from Yale. Former staffer at White House Council of Economic Advisers (2021-2022). Key research: 'Generative AI at Work' (with Brynjolfsson and Li), studying 5,179 customer support agents — found AI tools increased productivity 14% on average, 35% for novice workers. Schmidt Sciences AI2050 Fellow. Research focus: AI's effects on labor markets, firms, and global organization of work.
- **regulatory_stance:** Unknown | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1444 — Columbia Law School (organization, Academic)
- **notes:** Ivy League law school at Columbia University, New York. Active in AI governance research and education. Faculty-led task force (professors Gillis, Liebman, Talley, Wexler) developing AI curriculum. Key AI faculty: Tim Wu (Julius Silver Professor — competition and tech policy, former Biden White House advisor), Rebecca Wexler (AI and criminal justice/due process). Offers seminar on 'Emerging Law of AI' comparing regulatory approaches across US, EU, and China. Hosted 2023 symposium on new legal frameworks for generative AI revolution. Adopted formal generative AI policy for academic integrity (Aug 2025).
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** University endowment
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1445 — President Biden (person, Executive) — DUPLICATE OF 1376
- **notes:** DUPLICATE of entity 1376 (Joe Biden). Same person — '46th U.S. President (2021-2025).' Issued Executive Order 14110 (Oct 2023), the most comprehensive U.S. AI governance action, requiring safety reporting from frontier AI developers and coordinating federal agency standards. Released Blueprint for an AI Bill of Rights (2022). Also issued EO on AI Infrastructure (Jan 2025). EO 14110 was rescinded by President Trump on Jan 20, 2025. Recommend merging edges to entity 1376 and soft-deleting this entity.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Federal government
- **influence_type:** Decision-maker
- **confidence:** 5
- **Edge to migrate:** edge 1602 (`employer: Tim Wu -> President Biden [1445]`) should be retargeted to Joe Biden (1376)

### 1447 — Stony Brook University (organization, Academic)
- **notes:** SUNY flagship research university on Long Island, New York. Home to the AI Innovation Institute (AI3) directed by Lav Varshney. Participates in Empire AI — SUNY's multi-campus partnership for AI research and public-good applications. Three faculty received SUNY-IBM AI Research Alliance grants (Zadok, Balasubramanian, Ferdman) for cloud computing, sustainable energy, and supercomputer optimization. Computer science department has active AI/ML, NLP, and computer vision research groups. Governor Hochul proposed Empire AI Beta (2026 State of the State) to scale to world's most advanced academic supercomputer. Yejin Choi was previously an assistant professor of CS here.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **funding_model:** Public university
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1448 — Seoul National University (organization, Academic)
- **notes:** South Korea's top research university, located in Seoul. Major AI research hub with 100+ AI professors, 200+ AI application labs, and 2,000+ AI researchers. Houses the Artificial Intelligence Institute (AIIS), selected as core part of Korea's National Strategy AI Development Project. Established Interdisciplinary Program in Artificial Intelligence (IPAI). Key labs: Biointelligence Lab (Prof. Byoung-Tak Zhang — biological/artificial intelligence), Data Science & AI Lab, AI and Biomedical Informatics Lab. Yejin Choi is affiliated with SNU (edge 1609). Strong in NLP, computer vision, and biomedical AI.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **funding_model:** Public university
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1449 — Claire Cardie (person, Researcher)
- **notes:** John C. Ford Professor of Engineering in Computer Science and Information Science at Cornell University. Leading NLP researcher specializing in coreference resolution, information extraction, and opinion mining. Founding chair of Cornell's Department of Information Science and led development of its academic programs. AAAI Fellow (2024), ACM Fellow (2019, 'for contributions to NLP including coreference resolution, information and opinion extraction'), AAAS Fellow (2021). Doctoral advisor to Yejin Choi (edge 1611). Research group develops ML/neural network techniques for large-scale NLP tasks.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1450 — Jeff Hancock (person, Academic)
- **notes:** Harry and Norman Chandler Professor of Communication at Stanford University. Founding director of the Stanford Social Media Lab. Research focuses on AI's effects on trust, deception, and human communication — from AI-generated text detection to social media well-being impacts. His TED talk 'The Future of Lying' (2012) has 1M+ views. Author of 80+ journal articles. Collaborator with Yejin Choi (edge 1612). Notable controversy: in 2024, as expert witness defending a state deepfake law, he submitted a court filing relying on ChatGPT that contained fabricated citations; a federal judge barred his testimony.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Inferred | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst, Narrator
- **confidence:** 5

### 1451 — John Tasioulas (person, Academic)
- **notes:** Greek-Australian moral and legal philosopher. Was inaugural Director of the Institute for Ethics in AI at the University of Oxford (resigned Sep 2025 during harassment investigation). Professor of Ethics and Legal Philosophy, Senior Research Fellow at Balliol College Oxford. Rhodes Scholar. Previously held chairs at King's College London, UCL, and University of Glasgow. Schmidt Sciences AI2050 Fellow — his project takes a 'humanistic approach' to AI ethics centered on distinctive value and capabilities of human beings. Collaborator with Yejin Choi (edge 1613). Published widely on moral philosophy, legal philosophy, and philosophy of technology.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst, Narrator
- **confidence:** 5

## Edge Notes (no modifications)

Existing edges verified, none modified:
- 1588: `supporter: Alex Bores -> Public First Action` (1439)
- 1591: `collaborator: Brian Deese -> Lisa Hansmann` (1440)
- 1597: `collaborator: Erik Brynjolfsson -> Gabriel Unger` (1441)
- 1598: `collaborator: Erik Brynjolfsson -> Andrew McAfee` (1442)
- 1600: `collaborator: Erik Brynjolfsson -> Lindsey Raymond` (1443)
- 1601: `employer: Tim Wu -> Columbia Law School` (1444), role="Julius Silver Professor of Law, Science and Technology"
- 1602: `employer: Tim Wu -> President Biden` (1445), role="Special Assistant to President Biden for competition and tech policy"
- 1607: `employer: Yejin Choi -> Stony Brook University` (1447), role="Assistant Professor of Computer Science"
- 1609: `affiliated: Yejin Choi -> Seoul National University` (1448)
- 1611: `advisor: Claire Cardie -> Yejin Choi` (1449), role="doctoral advisor"
- 1612: `collaborator: Yejin Choi -> Jeff Hancock` (1450)
- 1613: `collaborator: Yejin Choi -> John Tasioulas` (1451)
