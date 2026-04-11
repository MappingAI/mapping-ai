# Entity Enrichment — Batch 44
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 12
Fields updated: 122

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1133 | Kempner Institute | 11 | 4 |
| 1134 | Massachusetts Green High Performance Computing Center | 10 | 4 |
| 1135 | Sanjeev Arora | 10 | 4 |
| 1136 | Arthur Spirling | 10 | 3 |
| 1137 | Olga Troyanskaya | 10 | 4 |
| 1138 | Tom Griffiths | 10 | 4 |
| 1139 | The Princeton Laboratory for Artificial Intelligence | 10 | 4 |
| 1140 | ai@cam | 11 | 3 |
| 1141 | Neil Lawrence | 10 | 4 |
| 1142 | Adrian Weller | 10 | 4 |
| 1144 | Saïd Business School | 10 | 3 |
| 1145 | Kyunghyun Cho | 10 | 4 |

Primarily academic AI researchers and their institutional homes — Princeton cluster (Arora, Spirling, Troyanskaya, Griffiths, Princeton AI Lab), Cambridge cluster (ai@cam, Lawrence, Weller), Harvard/compute (Kempner, MGHPCC), Oxford (Saïd), and NYU (Cho).

---

## Changes

### [1133] Kempner Institute — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | kempnerinstitute.harvard.edu, en.wikipedia.org/wiki/Kempner_Institute, chanzuckerberg.com, thecrimson.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Mixed/unclear |
| belief_ai_risk | NULL | Unknown |
| belief_evidence_source | NULL | Unknown |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Philanthropy (CZI $500M/15yr) |
| influence_type | NULL | Researcher/analyst, Builder |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Well-documented Harvard institute. $500M CZI gift, co-directed by Kakade and Sabatini. Operates Kempner AI Cluster (1,144 H100 GPUs, TOP500 #85). No institutional stance on regulation; research-focused on understanding intelligence rather than policy advocacy.

---

### [1134] Massachusetts Green High Performance Computing Center — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | mghpcc.org, en.wikipedia.org/wiki/Massachusetts_Green_High_Performance_Computing_Center, rc.fas.harvard.edu |
| notes_confidence | NULL | 4 |
| funding_model | NULL | Consortium (university partners) |
| influence_type | NULL | Builder |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Infrastructure facility, not a policy actor. LEED Platinum, >90% carbon-free power. BU/Harvard/MIT/Northeastern/UMass/Yale consortium. $16M quantum expansion announced Oct 2024. Belief fields left NULL — infrastructure entity with no policy positions.

---

### [1135] Sanjeev Arora — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | cs.princeton.edu/~arora, engineering.princeton.edu, en.wikipedia.org/wiki/Sanjeev_Arora_(computer_scientist), simonsfoundation.org |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Mixed/unclear |
| belief_ai_risk | NULL | Unknown |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Highly decorated theoretician (NAS, ACM Prize, Gödel Prize x2). Founding director of Princeton Language and Intelligence. Research explicitly targets "better and safer AI" through mathematical understanding, suggesting concern for safety, but no public regulatory stance found.

---

### [1136] Arthur Spirling — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | politics.princeton.edu, arthurspirling.org, as.nyu.edu |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — Political scientist, not ML researcher per se. Publications on LLM governance implications and advocacy for open-source AI models suggest targeted regulation stance and concern about societal impacts. Stance inferred from publication record rather than direct policy statements.

---

### [1137] Olga Troyanskaya — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | cs.princeton.edu, pph.princeton.edu, en.wikipedia.org/wiki/Olga_Troyanskaya, simonsfoundation.org |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Unknown |
| belief_ai_risk | NULL | Unknown |
| belief_evidence_source | NULL | Unknown |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst, Builder |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Well-documented computational biologist. Director of Princeton Precision Health, deputy director at Flatiron Institute. Work is AI-for-biology rather than AI policy. No public statements on AI regulation or risk found.

---

### [1138] Tom Griffiths — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | cocosci.princeton.edu, psych.princeton.edu, en.wikipedia.org/wiki/Tom_Griffiths_(cognitive_scientist), ai.princeton.edu |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Mixed/unclear |
| belief_ai_risk | NULL | Unknown |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst, Connector/convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Inaugural director of Princeton AI Lab, strong institutional role. Cognitive science approach to AI. No clear public policy stance, but as AI Lab director bridges multiple disciplines (psychology, CS, social sciences, humanities), suggesting nuanced view. "Connector/convener" from AI Lab leadership role.

---

### [1139] The Princeton Laboratory for Artificial Intelligence — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | ai.princeton.edu, dof.princeton.edu |
| notes_confidence | NULL | 4 |
| funding_model | NULL | University (Princeton) |
| influence_type | NULL | Researcher/analyst, Builder, Connector/convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | TRUE | TRUE |

**Confidence:** 4/5 — Well-documented university research lab. Three clear initiatives (PLI, AI^2, NAM), 300 H100 GPUs, postdoc program. Belief fields left NULL — research institution without institutional policy positions.

---

### [1140] ai@cam — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | ai.cam.ac.uk, cam.ac.uk/stories/ai-at-cam |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | University (Cambridge) |
| influence_type | NULL | Researcher/analyst, Connector/convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — Cambridge flagship AI mission. Emphasis on responsible development, meaningful human oversight, and protection from harms. Stance inferred from public dialogue work and institutional messaging. Less specific than individual researchers' positions.

---

### [1141] Neil Lawrence — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | inverseprobability.com, ai.cam.ac.uk, en.wikipedia.org/wiki/Neil_Lawrence, committees.parliament.uk |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst, Narrator, Advisor/strategist |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Prominent public voice on AI governance. Parliamentary testimony, Guardian articles, book ("The Atomic Human"). Explicitly warns against regulation serving "digital oligarchy," advocates for strong public sector oversight and data transparency. "Sowing seeds of 10,000 Horizon scandals" quote is strong evidence of serious risk view with moderate regulatory stance.

---

### [1142] Adrian Weller — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | mlg.eng.cam.ac.uk/adrian, turing.ac.uk, weforum.org, lcfi.ac.uk, cam.ac.uk |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst, Advisor/strategist |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — MBE, multiple high-profile advisory roles (UNESCO AI Ethics, IEEE XAI, Turing Institute, WEF). Explicitly advocates for technically sensible regulation, human accountability for AI decisions. Heads Safe and Ethical AI at Turing. Labor displacement concerns place him firmly in "Serious" risk category.

---

### [1144] Saïd Business School — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | sbs.ox.ac.uk, getsmarter.com |
| notes_confidence | NULL | 3 |
| funding_model | NULL | University (Oxford) |
| influence_type | NULL | Connector/convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — Executive education institution. Offers AI programmes (AI Programme, AI for Business diploma, AI Implementation, Generative AI). Faculty include Mike Wooldridge. Role is training business leaders on AI rather than producing policy positions. Belief fields left NULL.

---

### [1145] Kyunghyun Cho — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | kyunghyuncho.me, cds.nyu.edu, en.wikipedia.org/wiki/Kyunghyun_Cho, techzine.eu |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst, Builder |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Co-head of NYU Global AI Frontier Lab with LeCun. Co-authored foundational attention mechanism paper (2014). Explicitly questions existential risk framing; argues focus should be on concrete current risks (healthcare, military). Critical of alarmist narratives; wants practical sector-specific regulation. "Manageable" reflects his view that risks are real but current-application focused, not existential.
