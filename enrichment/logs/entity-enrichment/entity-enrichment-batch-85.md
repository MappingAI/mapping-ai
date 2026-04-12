# Entity Enrichment — Batch 85
*2026-04-11*
Mode: manual (claude-code)
Entities processed: 23
Fields updated: 138

---

## Summary

All 23 entities are resources (reports, papers, executive orders, hearing transcripts, testimony, essays, news articles). Each received a 1-2 sentence description in `notes`, with the original value preserved in `notes_v1`. Only entity 685 had a prior notes value ("this is a test update from Anushree").

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 683 | The Annual AI Governance Report 2025: Steering the Future of AI | 6 | 4 |
| 684 | AI Governance Profession Report 2025 | 6 | 4 |
| 685 | Gradual Disempowerment | 6 | 4 |
| 686 | AI Safety Index 2025: How Frontier AI Companies \| Libertify | 6 | 3 |
| 687 | 2025 AI Safety Index - Future of Life Institute | 6 | 4 |
| 688 | AI Safety Index Winter 2025 - Future of Life Institute | 6 | 4 |
| 689 | Canaries in the Coal Mine? Six Facts about the Recent Employment Effects of AI | 6 | 4 |
| 690 | MIT study finds AI can already replace 11.7% of U.S. ... | 6 | 4 |
| 691 | Canaries in the Coal Mine? Six Facts about the Recent ... | 6 | 4 |
| 692 | Transcript: US House Subcommittee Hosts Hearing on "AI ..." | 6 | 3 |
| 693 | Adam Thierer Testimony before JEC on AI & Economic Opportunity | 6 | 4 |
| 694 | Senate Judiciary written testimony - Helen Toner 2024-09-17 | 6 | 4 |
| 695 | Machines of Loving Grace | 6 | 4 |
| 696 | The Federal AI Preemption Push: President Trump Signs The EO... | 6 | 4 |
| 697 | Executive Order on the Safe, Secure, and Trustworthy Development and Use of AI | 6 | 5 |
| 698 | Gradual Disempowerment: How AI Could Erode Human Control | 6 | 4 |
| 699 | Executive Order 14110—Safe, Secure, and Trustworthy ... | 6 | 5 |
| 700 | Examining the Harm of AI Chatbots | 6 | 4 |
| 701 | Transcript: Senate Judiciary Subcommittee Hosts Hearing on Oversight of AI... | 6 | 4 |
| 702 | Blackburn Unveils National Policy Framework for AI... | 6 | 4 |
| 703 | 2025 Q4 Update from our Frontier AI Risk Monitoring Platform | 6 | 3 |
| 704 | Labor Demand in the Age of Generative AI: Early Evidence from U.S. Job Posting Data | 6 | 4 |
| 705 | Transcript: Joint Hearing on "AI and Its Potential to Fuel Economic Growth..." | 6 | 4 |

---

## Changes

### [683] The Annual AI Governance Report 2025 — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Annual report examining the state of AI governance in 2025, covering policy frameworks, regulatory developments, and strategies for steering AI's future trajectory. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 4 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | NULL | TRUE |

**Confidence:** 4/5 — well-known annual governance report; title is descriptive

---

### [684] AI Governance Profession Report 2025 — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Report surveying the AI governance profession landscape in 2025, including roles, skills, and career trends for practitioners working in AI policy and oversight. |

**Confidence:** 4/5 — title clearly describes content

---

### [685] Gradual Disempowerment — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | this is a test update from Anushree | Research paper examining how AI systems could gradually erode human control and autonomy over time, even without a single catastrophic event. |
| notes_v1 | NULL | this is a test update from Anushree |

**Confidence:** 4/5 — known AI safety paper; category already set to AI Safety/Alignment

---

### [686] AI Safety Index 2025: How Frontier AI Companies | Libertify — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Coverage by Libertify of the Future of Life Institute's 2025 AI Safety Index, which benchmarks how frontier AI companies manage safety practices. |

**Confidence:** 3/5 — third-party coverage; less authoritative than primary source

---

### [687] 2025 AI Safety Index - Future of Life Institute — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | The Future of Life Institute's 2025 AI Safety Index, a benchmarking report assessing how leading AI companies address safety in their development practices. |

**Confidence:** 4/5 — primary FLI source

---

### [688] AI Safety Index Winter 2025 - Future of Life Institute — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | The Winter 2025 edition of the Future of Life Institute's AI Safety Index, evaluating frontier AI companies' safety commitments and practices. |

**Confidence:** 4/5 — primary FLI source

---

### [689] Canaries in the Coal Mine? Six Facts... — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Economics research paper presenting six key findings on the early employment effects of artificial intelligence, framing affected workers as 'canaries in the coal mine' for broader labor market disruption. |

**Confidence:** 4/5 — academic paper with descriptive title

---

### [690] MIT study finds AI can already replace 11.7% of U.S. ... — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | News article covering an MIT study finding that AI technology is already capable of replacing approximately 11.7% of tasks in the U.S. workforce. |

**Confidence:** 4/5 — news coverage of well-known MIT study

---

### [691] Canaries in the Coal Mine? Six Facts about the Recent ... — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Economics research paper presenting six key findings on AI's recent employment effects, using early labor market data to assess which workers are most impacted. |

**Confidence:** 4/5 — same paper as 689 with truncated title

---

### [692] Transcript: US House Subcommittee Hosts Hearing on "AI ..." — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Transcript of a U.S. House subcommittee hearing examining artificial intelligence policy, published by TechPolicy.Press. |

**Confidence:** 3/5 — truncated title; specific hearing topic unclear

---

### [693] Adam Thierer Testimony before JEC on AI & Economic Opportunity — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Written testimony by Adam Thierer before the Joint Economic Committee on the economic opportunities presented by AI and the policy conditions needed to realize them. |

**Confidence:** 4/5 — well-known tech policy researcher; title is descriptive

---

### [694] Senate Judiciary written testimony - Helen Toner 2024-09-17 — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Written testimony by Helen Toner, former OpenAI board member, before the Senate Judiciary Committee in September 2024, offering an insider's perspective on AI governance and safety. |

**Confidence:** 4/5 — high-profile testimony following OpenAI board incident

---

### [695] Machines of Loving Grace — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Essay by Anthropic CEO Dario Amodei (October 2024) exploring the potential positive impacts of advanced AI on science, health, economic development, and governance. |

**Confidence:** 4/5 — well-known essay with wide circulation

---

### [696] The Federal AI Preemption Push... — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Legal analysis published on Mondaq examining President Trump's executive order on ensuring a national AI policy framework, focusing on its implications for federal preemption of state AI regulations. |

**Confidence:** 4/5 — legal analysis article; topic clearly identified from title

---

### [697] Executive Order on the Safe, Secure, and Trustworthy Development and Use of AI — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | President Biden's Executive Order on the Safe, Secure, and Trustworthy Development and Use of Artificial Intelligence, establishing comprehensive federal AI governance requirements across agencies. |

**Confidence:** 5/5 — landmark executive order; widely documented

---

### [698] Gradual Disempowerment: How AI Could Erode Human Control — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Research paper titled 'Gradual Disempowerment: How AI Could Erode Human Control,' analyzing pathways through which AI systems may incrementally reduce human oversight and decision-making authority. |

**Confidence:** 4/5 — known AI safety paper; full title version of 685

---

### [699] Executive Order 14110—Safe, Secure, and Trustworthy ... — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Federal Register citation for Executive Order 14110, President Biden's comprehensive directive on safe, secure, and trustworthy AI development and use. |

**Confidence:** 5/5 — official Federal Register entry; well-documented

---

### [700] Examining the Harm of AI Chatbots — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Senate hearing examining the potential harms of AI-powered chatbots, including risks to consumers, misinformation, and safety concerns. |

**Confidence:** 4/5 — Senate hearing title is descriptive

---

### [701] Transcript: Senate Judiciary Subcommittee Hosts Hearing on Oversight of AI... — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Transcript of a Senate Judiciary Subcommittee hearing featuring insider perspectives on AI oversight, published by TechPolicy.Press. |

**Confidence:** 4/5 — TechPolicy.Press transcript; hearing topic clear from title

---

### [702] Blackburn Unveils National Policy Framework for AI... — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Announcement by Senator Marsha Blackburn of a national policy framework for artificial intelligence, outlining proposed federal AI governance principles. |

**Confidence:** 4/5 — well-known legislative announcement

---

### [703] 2025 Q4 Update from our Frontier AI Risk Monitoring Platform — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Quarterly update (Q4 2025) from a frontier AI risk monitoring platform, reporting on emerging risks and safety developments at leading AI labs. |

**Confidence:** 3/5 — specific organization unclear from title alone

---

### [704] Labor Demand in the Age of Generative AI... — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Economics research paper analyzing how generative AI is affecting U.S. labor demand, using job posting data to identify early shifts in employer hiring patterns. |

**Confidence:** 4/5 — academic paper with descriptive title

---

### [705] Transcript: Joint Hearing on "AI and Its Potential to Fuel Economic Growth..." — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Transcript of a joint congressional hearing on artificial intelligence's potential to fuel economic growth and improve governance, published by TechPolicy.Press. |

**Confidence:** 4/5 — TechPolicy.Press transcript; hearing topic clear

---

## Potential Duplicates

The following entities in this batch are likely duplicates of each other or of entities in previous batches. All were still enriched, but these should be reviewed for merging.

### Within this batch

| Duplicate Set | IDs | Reason |
| ------------- | --- | ------ |
| Gradual Disempowerment paper | 685, 698 | Same paper; 685 has short title, 698 has full title |
| AI Safety Index 2025 (FLI) | 686, 687, 688 | All reference the same FLI report; 686 is third-party coverage, 687/688 are FLI pages |
| Canaries in the Coal Mine paper | 689, 691 | Same economics paper; 691 has truncated title |
| Biden EO 14110 | 697, 699 | Same executive order; 697 is White House version, 699 is Federal Register citation |

### Cross-batch duplicates

| This Batch | Other Batch | IDs | Reason |
| ---------- | ----------- | --- | ------ |
| 683 | Batch 84 | 683 ~ 682 | Both are the Annual AI Governance Report 2025 |
| 696 | Batch 84 | 696 ~ 661/674/681 | All cover Trump's AI preemption EO |
| 697, 699 | Earlier batches | 697/699 ~ 638/650 | All reference Biden's EO 14110 |
| 700 | Batch 84 | 700 ~ 671/672 | All reference Senate hearing on AI chatbot harms |
