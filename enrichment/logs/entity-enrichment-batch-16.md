# Entity Enrichment — Batch 16
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 44 (11 per entity)

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1127 | Stanford Artificial Intelligence Laboratory (SAIL) | 11 | 4 |
| 1060 | Platformer | 11 | 5 |
| 1058 | Anduril Industries | 11 | 5 |
| 1234 | NYU School of Medicine | 11 | 4 |

---

## Changes

### 1127 Stanford Artificial Intelligence Laboratory (SAIL) — organization (Academic)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "One of the oldest AI research labs, founded at Stanford in 1962 by John McCarthy. Research spans NLP, computer vision, robotics, reinforcement learning, and computational biomedicine. In 2025, Carlos Guestrin became Director and SAIL formally joined forces with Stanford HAI, integrating safety and policy work alongside core capabilities research." |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | ["https://ai.stanford.edu/about/", "https://news.stanford.edu/stories/2025/02/carlos-guestrin-to-lead-stanford-ai-lab-as-it-joins-forces-with-stanford-hai", "https://hai.stanford.edu/news/carlos-guestrin-named-director-stanford-artificial-intelligence-lab-sail-joining-efforts"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Academic/federal grants |
| influence_type | NULL | Researcher/analyst, Connector/convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | NULL | TRUE |

**Sources:**
- https://ai.stanford.edu/about/
- https://news.stanford.edu/stories/2025/02/carlos-guestrin-to-lead-stanford-ai-lab-as-it-joins-forces-with-stanford-hai
- https://hai.stanford.edu/news/carlos-guestrin-named-director-stanford-artificial-intelligence-lab-sail-joining-efforts

**Confidence:** 4/5 — Well-documented merger with HAI and new director confirmed via Stanford News and HAI official announcements. Belief fields inferred from SAIL's integration with HAI (which emphasizes human-centered, responsible AI) rather than any explicit SAIL policy statement.

---

### 1060 Platformer — organization (Media/Journalism)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Independent tech newsletter founded in 2020 by Casey Newton, focusing on the intersection of technology and democracy. Covers major AI labs and platforms with a critical, product-focused lens. Subscriber-funded via Ghost; Newton declined Substack advances and moved the publication off Substack in 2024 over content moderation concerns." |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | ["https://www.platformer.news/", "https://en.wikipedia.org/wiki/Casey_Newton", "https://www.platformer.news/why-im-having-trouble-covering-ai/"] |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Subscription/reader-funded |
| influence_type | NULL | Narrator |
| enrichment_version | v2-insufficient | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:**
- https://www.platformer.news/
- https://en.wikipedia.org/wiki/Casey_Newton
- https://www.platformer.news/why-im-having-trouble-covering-ai/

**Confidence:** 5/5 — Well-documented independent newsletter; funding model and editorial stance drawn directly from Newton's own writing and Wikipedia. Belief fields inferred from editorial coverage patterns (critical scrutiny of AI companies, focus on societal harms of platforms) rather than formal policy endorsements.

---

### 1058 Anduril Industries — organization (Deployers & Platforms)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Defense technology company founded in 2017 by Palmer Luckey, building AI-powered autonomous weapons, surveillance systems, and battlefield software (Lattice OS). Awarded a $20B Army AI contract in 2026. Luckey publicly opposes private corporate restrictions on military AI use, arguing elected government—not corporate executives—should set AI weapons policy." |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | ["https://www.anduril.com/", "https://en.wikipedia.org/wiki/Anduril_Industries", "https://fortune.com/2026/03/06/palmer-luckey-pentagon-anthropic-debate-dario-amodei-claude-ai/", "https://www.overtdefense.com/2026/03/24/u-s-army-awards-anduril-20-billion-ai-battlefield-tech-contract/"] |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Private/VC-backed |
| influence_type | NULL | Builder, Implementer |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:**
- https://www.anduril.com/
- https://en.wikipedia.org/wiki/Anduril_Industries
- https://fortune.com/2026/03/06/palmer-luckey-pentagon-anthropic-debate-dario-amodei-claude-ai/
- https://www.overtdefense.com/2026/03/24/u-s-army-awards-anduril-20-billion-ai-battlefield-tech-contract/

**Confidence:** 5/5 — Luckey's regulatory stance is explicitly stated across multiple interviews (Fortune, Axios, March 2026): government/elected officials should set limits on AI weapons, not private companies. Light-touch coded because he actively opposes corporate AI restrictions and supports maximum government/military discretion without additional regulatory frameworks.

---

### 1234 NYU School of Medicine — organization (Academic)

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "NYU Grossman School of Medicine at NYU Langone Health, a leading academic medical center. Notable for the fastMRI project—a collaboration with Facebook AI Research (FAIR) using deep learning to accelerate MRI reconstruction 10x. Also developed NYUTron, an LLM trained on clinical notes for in-hospital risk prediction." |
| notes_v1 | NULL | NULL (original was NULL) |
| notes_sources | NULL | ["https://fastmri.med.nyu.edu/", "https://engineering.fb.com/2018/08/20/ai-research/facebook-and-nyu-school-of-medicine-launch-research-collaboration-to-improve-mri/", "https://hslguides.med.nyu.edu/aihsl/nyutron", "https://nyulangone.org/news/new-research-finds-fastmri-scans-generated-artificial-intelligence-are-accurate-traditional-mri"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Academic/federal grants/clinical revenue |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://fastmri.med.nyu.edu/
- https://engineering.fb.com/2018/08/20/ai-research/facebook-and-nyu-school-of-medicine-launch-research-collaboration-to-improve-mri/
- https://hslguides.med.nyu.edu/aihsl/nyutron
- https://nyulangone.org/news/new-research-finds-fastmri-scans-generated-artificial-intelligence-are-accurate-traditional-mri

**Confidence:** 4/5 — fastMRI and NYUTron are well-documented public projects with primary sources. Belief fields inferred from institutional framing (responsible AI use, strict data governance guidelines, equitable application) rather than explicit policy statements. No explicit AGI timeline position identified.
