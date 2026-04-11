# Entity Enrichment Batch 61

**Date:** 2026-04-10
**Entities:** 12
**Phase:** phase3-manual

## Summary

Enriched 12 entities (3 persons, 9 organizations) — Stanford HAI co-director (Etchemendy), major philanthropy (Ford Foundation), Indian and German academic institutions (IIT Kanpur, Uni Tuebingen), ML researcher (Hennig), AI blogger/forecaster (Scott Alexander), MIT data governance consortium (Trust::Data Alliance), ByteDance/TikTok ecosystem (including acquired Jukedeck), open-source AI lab (Stability AI), and AI-focused holding company (Thrive Holdings). All were truly empty (notes null, beliefs null). No edges modified.

## Notable Findings

- **Jukedeck (1400):** Confirmed acquired by ByteDance in July 2019. Site went offline post-acquisition. Founder Ed Newton-Rex went to ByteDance AI Lab, then Stability AI VP Audio (resigned over copyright stance). Already captured in existing edges (1440, 1441, 1442, 1444).
- **Stability AI (1402):** Founder Emad Mostaque stepped down March 2024. Current CEO Prem Akkaraju (since June 2024). Raised $80M, eliminated debt, growing at triple-digit rates.
- **TikTok (1403) / ByteDance (1401):** PAFACA ban law led to multiple executive order delays. US operations divested to TikTok USDS consortium (Oracle, Silver Lake, MGX) — deal closed Jan 2026.
- **Thrive Holdings (1404):** Distinct from Thrive Capital (the VC firm). Holdings is a PE-style entity launched April 2025 that buys/runs companies for AI transformation. OpenAI took ownership stake Dec 2025.
- **Edge 1402** (`founder`, Fei-Fei Li -> John Etchemendy, role="co-director"): Edge type appears incorrect — Etchemendy is co-director of HAI, not a founder of Fei-Fei Li. Should likely be `collaborator` or a HAI-focused edge. Not modified per instructions.

## Changes

### 1388 — John Etchemendy (person, Academic)
- **notes:** Stanford professor of philosophy and former provost (2000-2017). Co-founded and co-directs Stanford HAI with Fei-Fei Li since 2019. Leading advocate for national AI research resource to counter industry concentration. Argues 'the science has outgrown the university model.' HAI promotes human-centered approach: evaluation and accountability over hype.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Advisor/strategist, Researcher/analyst, Connector/convener
- **confidence:** 5

### 1390 — Ford Foundation (organization, VC/Capital/Philanthropy)
- **notes:** Major US philanthropy with significant AI accountability funding. Part of $200M+ coalition for public-interest AI. Co-launched Humanity AI ($500M, Oct 2025). Funds AI Now Institute. Focus: transparency, algorithmic accountability, worker protections.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **other_categories:** Ethics/Bias/Rights
- **funding_model:** Endowment/philanthropy
- **influence_type:** Funder/investor, Organizer/advocate
- **confidence:** 5

### 1391 — Indian Institute of Technology, Kanpur (organization, Academic)
- **notes:** Premier Indian tech university. Established Wadhwani School of Advanced AI and Intelligent Systems (2025). Hosts Sustainable Cities CoE in AI. Partnerships with TCS, IBM. Growing AI policy outreach.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **funding_model:** Government/public
- **influence_type:** Researcher/analyst, Builder
- **confidence:** 4

### 1392 — Trust::Data Alliance (organization, AI Safety/Alignment)
- **notes:** MIT-based consortium founded by Sandy Pentland. Builds open-source tools for secure, privacy-preserving data sharing. Advocates collective data governance model over individualized data control.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Inferred | **agi_timeline:** Unknown
- **other_categories:** Ethics/Bias/Rights
- **funding_model:** Consortium/membership
- **influence_type:** Builder, Researcher/analyst
- **confidence:** 4

### 1393 — Scott Alexander (person, Researcher)
- **notes:** Blogger (Astral Codex Ten/Slate Star Codex). Psychiatrist. Most influential AI forecasting voice in rationalist community. Co-authored AI 2027 scenario. Supports safety research. Nuanced on regulation: supports safety standards but worries about US-China race dynamics. Personal AGI median later 2020s/early 2030s.
- **regulatory_stance:** Targeted | **ai_risk:** Catastrophic | **evidence:** Explicitly stated | **agi_timeline:** 5-10 years
- **influence_type:** Narrator, Researcher/analyst
- **confidence:** 5

### 1397 — University of Tuebingen (organization, Academic)
- **notes:** German research university, major European AI hub. Home to Tübingen AI Center and Cluster of Excellence 'Machine Learning: New Perspectives for Science' (renewed 2025). Partners with MPI Intelligent Systems, ELLIS Institute, Cyber Valley.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **funding_model:** Government/public
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1398 — Philipp Hennig (person, Academic)
- **notes:** Chair for Methods of Machine Learning at Uni Tübingen. Co-director of Tübingen AI Center since July 2025. Pioneer of probabilistic numerics. Author of CUP textbook. 11,000+ citations.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1400 — Jukedeck (organization, Deployers & Platforms)
- **notes:** British AI music startup (2012, Ed Newton-Rex). Generated royalty-free music via AI. Raised $2.5M. Acquired by ByteDance/TikTok July 2019; site went offline. Tech integrated into ByteDance AI music capabilities.
- **regulatory_stance:** Mixed/unclear | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **funding_model:** VC-backed (acquired)
- **influence_type:** Builder
- **confidence:** 5

### 1401 — ByteDance (organization, Deployers & Platforms)
- **notes:** Chinese tech giant, parent of TikTok. Major AI in recommendation, content moderation, generative AI. $5.4M US lobbying H1 2025. Subject to PAFACA; US TikTok ops divested Jan 2026. Acquired Jukedeck (2019). Developing LLMs internally.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Corporate revenue
- **influence_type:** Builder, Decision-maker
- **confidence:** 5

### 1402 — Stability AI (organization, Frontier Lab)
- **notes:** Open-source generative AI company. Creator of Stable Diffusion. Founder Mostaque stepped down March 2024. CEO Prem Akkaraju since June 2024. Raised $80M. Strong open-source advocate. Wrote to US Senate. B2B2C model. Expanding to video, audio, 3D.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** VC-backed
- **influence_type:** Builder, Organizer/advocate
- **confidence:** 5

### 1403 — TikTok (organization, Deployers & Platforms)
- **notes:** Short-form video platform (ByteDance). Central to US-China tech tensions. PAFACA ban law; multiple delays; US ops divested to TikTok USDS Jan 2026 (Oracle, Silver Lake, MGX). AI recommendation, 85%+ AI content moderation. Requires AI content labeling. ~150M US users.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** Corporate revenue
- **influence_type:** Builder, Implementer
- **confidence:** 5

### 1404 — Thrive Holdings (organization, VC/Capital/Philanthropy)
- **notes:** AI-focused holding company (April 2025, Joshua Kushner/Thrive Capital). Buys and runs companies for AI transformation — accounting, IT services. OpenAI took ownership stake Dec 2025. Parent Thrive Capital manages $25B+. Early OpenAI investor. Also invested in Databricks, Anduril, Cursor. TIME100 AI 2025 (Kushner).
- **regulatory_stance:** Accelerate | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Unknown
- **funding_model:** VC-backed
- **influence_type:** Funder/investor, Builder
- **confidence:** 5
