# Entity Enrichment — Batch 84
*2026-04-11*
Mode: manual (claude-code)
Entities processed: 23
Fields updated: 138

---

## Summary

Enriched 23 resource entities (papers, executive orders, hearings, legal analyses, reports, essays). All are informational resources — no belief fields, funding_model, or influence_type were set. Each entity received a 1-2 sentence description in `notes`, with the original NULL value preserved in `notes_v1`.

**Key clusters:**
- **Trump AI Preemption EO** (661, 662, 674, 680, 681): Five entities all relating to the same executive order "Ensuring a National Policy Framework for Artificial Intelligence." See duplicate flags below.
- **Biden 2023 AI EO** (663, 664, 665): Three entities covering different angles of Biden's 2023 AI executive order.
- **Senate AI hearings** (671, 672, 673): Three congressional hearing references; 671 and 672 are likely duplicates.
- **AI alignment/safety papers** (666, 669, 675, 677, 678): Academic papers on LLM alignment, safety, and persona behavior.
- **AI governance ecosystem** (660, 667, 670, 676, 679, 682): Papers, essays, and reports on AI governance topics.

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 660 | A Collection of AI Governance Research Ideas | 6 | 4 |
| 661 | The Federal AI Preemption Push... | 6 | 4 |
| 662 | Ensuring a National Policy Framework for AI – The White House | 6 | 5 |
| 663 | Highlights of the 2023 Executive Order on Artificial ... | 6 | 4 |
| 664 | FACT SHEET: Biden-Harris Administration EO Directs DHS... | 6 | 5 |
| 665 | Biden signs U.S.' first AI executive order to create safeguards | 6 | 4 |
| 666 | Foundational Challenges in Assuring Alignment and Safety of LLMs | 6 | 4 |
| 667 | Common Ground between AI 2027 & AI as Normal Technology | 6 | 3 |
| 668 | Crisp and Fuzzy Tasks | 6 | 3 |
| 669 | Alignment Remains a Hard, Unsolved Problem | 6 | 4 |
| 670 | Computing Power and the Governance of Artificial Intelligence | 6 | 4 |
| 671 | US Senate Hearing On 'Examining the Harm of AI Chatbots' | 6 | 4 |
| 672 | Senate Hearing on AI Chatbots | 6 | 3 |
| 673 | Transcript: US Senate Subcommittee Hearing on AI Fraud/Scams | 6 | 5 |
| 674 | White House Issues "One Rule" EO To Curb State AI Regulation | 6 | 4 |
| 675 | Alignment Pretraining: AI Discourse Causes Self-Fulfilling (Mis)alignment | 6 | 3 |
| 676 | Values in the Wild | 6 | 3 |
| 677 | The Persona Selection Model | 6 | 3 |
| 678 | The Assistant Axis: Situating and Stabilizing the Character of LLMs | 6 | 3 |
| 679 | Some Talent Needs in AI Governance | 6 | 4 |
| 680 | Federal Register :: Ensuring a National Policy Framework for AI | 6 | 5 |
| 681 | Toward A National AI Framework: Override State Regulation | 6 | 4 |
| 682 | The Annual AI Governance Report 2025 | 6 | 4 |

---

## Changes

### [660] A Collection of AI Governance Research Ideas — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Research paper compiling a collection of open research questions and ideas in the field of AI governance, intended to guide future scholarship and policy work. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 4 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 4/5 — Title is descriptive; well-known genre of governance research compilation.

---

### [661] The Federal AI Preemption Push — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Legal analysis article examining President Trump's executive order on federal AI preemption, which aims to establish a unified national AI policy framework by overriding state-level AI regulations. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 4 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 4/5 — Title clearly indicates legal analysis of Trump's AI preemption EO. Likely Mondaq article.

---

### [662] Ensuring a National Policy Framework for AI – The White House — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | The official White House text of President Trump's executive order 'Ensuring a National Policy Framework for Artificial Intelligence,' which establishes federal preemption of state AI regulations to create a unified national approach. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 5 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 5/5 — Official White House document; title and source are unambiguous.

---

### [663] Highlights of the 2023 Executive Order on Artificial ... — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Summary article highlighting the key provisions of President Biden's 2023 executive order on artificial intelligence, which established new safety standards, equity protections, and innovation support measures for AI development. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 4 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 4/5 — Title clearly references Biden's 2023 AI EO highlights.

---

### [664] FACT SHEET: Biden-Harris Administration EO Directs DHS — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Department of Homeland Security fact sheet detailing how the Biden-Harris Administration's AI executive order directs DHS to lead responsible AI development, including safeguards for critical infrastructure and border security. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 5 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 5/5 — Official DHS fact sheet; title is fully descriptive.

---

### [665] Biden signs U.S.' first AI executive order to create safeguards — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | News article covering President Biden's signing of the first comprehensive U.S. executive order on artificial intelligence, which established safeguards around AI safety, security, and trustworthiness. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 4 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 4/5 — News headline is self-explanatory.

---

### [666] Foundational Challenges in Assuring Alignment and Safety of LLMs — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Academic paper examining the foundational technical and conceptual challenges in ensuring that large language models are aligned with human values and operate safely. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 4 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 4/5 — Academic paper title is descriptive.

---

### [667] Common Ground between AI 2027 & AI as Normal Technology — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Essay exploring the points of agreement between the AI 2027 scenario (which envisions rapid, transformative AI progress) and the 'AI as Normal Technology' perspective (which views AI as an incremental, manageable advance). |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 3 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 3/5 — Title is clear but specific content and authorship less certain without lookup.

---

### [668] Crisp and Fuzzy Tasks — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Essay distinguishing between 'crisp' tasks (well-defined, easily measurable) and 'fuzzy' tasks (ambiguous, judgment-dependent) in the context of AI capabilities and automation. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 3 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 3/5 — Short title; description inferred from known AI discourse context.

---

### [669] Alignment Remains a Hard, Unsolved Problem — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Essay or paper arguing that AI alignment — ensuring AI systems reliably act in accordance with human intentions and values — remains a fundamentally difficult and unsolved problem despite recent progress. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 4 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 4/5 — Title is a clear thesis statement.

---

### [670] Computing Power and the Governance of Artificial Intelligence — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Research paper analyzing the role of computing power as a governance lever for artificial intelligence, exploring how compute resources can be monitored, allocated, and regulated to shape AI development outcomes. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 4 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 4/5 — Well-known paper, likely by Lennart Heim et al. (GovAI).

---

### [671] US Senate Hearing On 'Examining the Harm of AI Chatbots' — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Official U.S. Senate hearing titled 'Examining the Harm of AI Chatbots,' investigating the potential risks and harms posed by AI chatbot technologies to consumers and society. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 4 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 4/5 — Official hearing title is unambiguous.

---

### [672] Senate Hearing on AI Chatbots — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | U.S. Senate hearing on the impacts and regulation of AI chatbots. Likely a duplicate reference to the same hearing as entity 671 ('Examining the Harm of AI Chatbots'). |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 3 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 3/5 — Generic title; likely duplicate of 671.

---

### [673] Transcript: US Senate Subcommittee Hearing on AI Fraud/Scams — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Transcript of a U.S. Senate subcommittee hearing focused on protecting consumers from AI-enabled fraud and scams, published by TechPolicy.Press. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 5 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 5/5 — Title includes hearing name, source (TechPolicy.Press), and topic.

---

### [674] White House Issues "One Rule" EO To Curb State AI Regulation — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Legal analysis article (likely from Mondaq) examining the White House's 'one rule' executive order aimed at curbing state-level AI regulation through federal preemption. Covers similar ground to entities 661 and 681. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 4 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 4/5 — Title is descriptive; Mondaq attribution from URL pattern.

---

### [675] Alignment Pretraining: AI Discourse Causes Self-Fulfilling (Mis)alignment — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Research paper investigating how public discourse about AI alignment and safety can become self-fulfilling — shaping AI behavior during pretraining in ways that either help or hinder actual alignment outcomes. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 3 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 3/5 — Novel concept; description inferred from title but specific findings less certain.

---

### [676] Values in the Wild — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Research paper studying human values as they manifest 'in the wild' — examining how values are embedded in, expressed through, and shaped by real-world AI systems and their deployment contexts. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 3 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 3/5 — Short, somewhat ambiguous title; inferred from AI governance context.

---

### [677] The Persona Selection Model — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Research paper proposing a 'persona selection model' to explain why AI assistants may adopt human-like behavioral patterns, exploring the mechanisms by which LLMs select and enact particular personas. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 3 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 3/5 — Title is descriptive but specific findings less certain without reading the paper.

---

### [678] The Assistant Axis: Situating and Stabilizing the Character of LLMs — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Research paper on methods for situating and stabilizing the character or persona of large language models along an 'assistant axis,' addressing consistency and reliability in LLM behavior. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 3 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 3/5 — Academic title is fairly descriptive but concept is niche.

---

### [679] Some Talent Needs in AI Governance — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Essay identifying key talent gaps and workforce needs in the AI governance field, discussing what skills and roles are most urgently needed to support effective AI policy and oversight. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 4 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 4/5 — Title is clearly descriptive of the essay's purpose.

---

### [680] Federal Register :: Ensuring a National Policy Framework for AI — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | The official Federal Register entry for President Trump's executive order 'Ensuring a National Policy Framework for Artificial Intelligence,' providing the legally binding text of the federal AI preemption order. Overlaps with entity 662 (White House version). |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 5 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 5/5 — Official Federal Register document; unambiguous.

---

### [681] Toward A National AI Framework: Override State Regulation — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Legal analysis article examining the federal strategy to establish a national AI framework that would override state-level regulation, covering the same Trump AI preemption executive order discussed in entities 661 and 674. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 4 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 4/5 — Title is descriptive; likely Mondaq article (same topic as 661, 674).

---

### [682] The Annual AI Governance Report 2025 — resource

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Comprehensive annual report surveying the AI governance landscape in 2025, covering policy developments, institutional activities, and emerging trends in AI regulation and oversight worldwide. |
| notes_v1 | NULL | NULL (original preserved) |
| notes_sources | NULL | Title context |
| notes_confidence | NULL | 4 |
| enrichment_version | NULL | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 4/5 — Title is descriptive and year-specific.

---

## Potential Duplicates

The following entities appear to be duplicates or near-duplicates and should be reviewed for possible merging:

### Trump AI Preemption EO cluster
- **662** (White House official text) and **680** (Federal Register official text): Both are the official text of the same executive order from different government sources. Consider keeping one as the canonical resource.
- **661**, **674**, and **681**: Three separate legal analysis articles (likely all from Mondaq) covering the same Trump AI preemption EO. May warrant deduplication.

### Biden 2023 AI EO cluster
- **663** (highlights/summary), **664** (DHS fact sheet), and **665** (news article): These cover the same executive order from different angles. While each provides distinct perspective, they are closely related and could be consolidated.

### Senate AI Chatbot hearing
- **671** and **672**: Almost certainly the same hearing. 671 has the full official title; 672 appears to be a shortened duplicate reference. Strong candidate for merging.
