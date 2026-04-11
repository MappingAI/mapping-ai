# Entity Enrichment — Batch 48
*2026-04-11*
Mode: manual (claude-code)
Entities processed: 12
Fields updated: 129

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1190 | Baylor College of Medicine | 11 | 3 |
| 1191 | City University of New York | 11 | 3 |
| 1193 | Richard Zemel | 10 | 4 |
| 1195 | Robert J. Jones | 10 | 4 |
| 1196 | Brad Smith | 10 | 5 |
| 1197 | Richard M. Locke | 10 | 3 |
| 1198 | Sinan Aral | 10 | 4 |
| 1199 | Kate Kellogg | 10 | 4 |
| 1200 | Roberto Rigobon | 10 | 4 |
| 1202 | Swati Gupta | 10 | 4 |
| 1203 | Casey Mock | 10 | 4 |
| 1204 | Camille Carlton | 10 | 4 |

Batch clusters: MIT Sloan cluster (1197-1200, 1202), Center for Humane Technology cluster (1203-1204), Columbia/academic (1193), UW cluster (1195-1196), NYC academic (1190-1191).

---

## Changes

### [1190] Baylor College of Medicine — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | ai.jmir.org, news.rice.edu, cpd.education.bcm.edu |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Tuition & grants |
| influence_type | NULL | Research/education hub |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — Leading medical school with active AI ethics research through Center for Medical Ethics and Health Policy. Co-leads NEH-funded CHHAIN with Rice. Focus on healthcare AI ethics and equity. No explicit broad regulatory stance — inferred Targeted from focus on healthcare-specific AI safety standards.

---

### [1191] City University of New York — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | cuny.edu/academics/ai-academic-hub, cuny.edu/news, gc.cuny.edu |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Mixed/unclear |
| belief_ai_risk | NULL | Mixed/nuanced |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Public university system |
| influence_type | NULL | Research/education hub |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — Largest urban public university system in the U.S. $3M AI Innovation Fund, $1M Google.org AI literacy grant, five-pillar AI strategy. Institutional focus on AI literacy, equity, and workforce readiness. No external regulatory position — internal AI policy frameworks being developed at school level.

---

### [1193] Richard Zemel — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | cs.columbia.edu/~zemel, engineering.columbia.edu, en.wikipedia.org/wiki/Richard_Zemel, magazine.engineering.columbia.edu |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher, Technical leader |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Well-documented career (U of T, Vector Institute VP Research, now Columbia). Directs NSF ARNI Institute. Pioneer in algorithmic fairness and statistical guarantees for model performance. Collaborates with Columbia Law on AI governance. Stance inferred from fairness research focus and governance engagement.

---

### [1195] Robert J. Jones — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | geekwire.com/2025, washington.edu/news/2026/02/24, washington.edu/president, magazine.washington.edu |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Institutional leader, Convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — 34th UW president (Aug 2025). Expanded UW-Microsoft AI partnership. Calls AI "just an amazing tool" — optimistic, access-focused framing. Aims to dispel job-loss fears and ensure every graduate gains AI skills. No restrictive regulatory statements found.

---

### [1196] Brad Smith — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | cbsnews.com, blogs.microsoft.com/on-the-issues, cnbc.com/2026/02/18, cnn.com, thehill.com, fedscoop.com |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Corporate leader, Policy advocate |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 5/5 — Microsoft President, one of the most prominent corporate voices on AI governance globally. Supports federal AI regulatory agency, frontier model licensing, Blumenthal-Hawley framework. Testified before Senate Judiciary Subcommittee. Warns AI can be "both a tool and a weapon" — demands human control. Co-chairs Microsoft Responsible AI Council. Moderate: pro-regulation but insists on maintaining innovation. Extensive public record of explicitly stated positions.

---

### [1197] Richard M. Locke — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | mitsloan.mit.edu/faculty/directory/richard-m-locke, news.mit.edu/2025, en.wikipedia.org/wiki/Richard_M._Locke |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Mixed/unclear |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Institutional leader |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — New MIT Sloan dean (July 2025), previously Brown provost and Apple University. Labor standards scholar by training. Believes AI in education is "inexorable" and augments rather than replaces. No explicit regulatory or risk positions found — stance inferred from institutional optimism about AI integration.

---

### [1198] Sinan Aral — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | mitsloan.mit.edu/faculty/directory/sinan-aral, mitsloan.mit.edu/ideas-made-to-matter, techcrunch.com/2020/12/14, ide.mit.edu |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher, Public intellectual |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — MIT Sloan professor and Director of MIT Initiative on the Digital Economy. Author of "The Hype Machine." Explicitly advocates four-lever regulatory approach (business models, code, norms, laws). Focus on platform competition, algorithmic amplification, and misinformation. Raises deep epistemic questions about truth-determination in AI systems. Well-documented public positions.

---

### [1199] Kate Kellogg — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | mitsloan.mit.edu/faculty/directory/kate-kellogg, mitsloan.mit.edu/ideas-made-to-matter/ai-expert-spotlight-kate-kellogg, mitsloan.mit.edu/ideas-made-to-matter/3-ways-to-use-ai |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — MIT Sloan professor studying AI implementation among frontline knowledge workers. Developed cyborg/centaur/self-automator framework. Research shows GenAI boosts performance up to 40% but degrades it when misapplied. Recent work on human vulnerability to LLM manipulation. Emphasis on careful organizational design for AI adoption. Stance inferred from research cautioning about over-reliance.

---

### [1200] Roberto Rigobon — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | mitsloan.mit.edu/faculty/directory/roberto-rigobon, dspace.mit.edu/handle/1721.1/150785, nber.org/people/roberto_rigobon |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — MIT Sloan economics professor, NBER associate, five-time Teacher of the Year. Co-founder of Billion Prices Project and Aggregate Confusion Project. Developed EPOCH Framework for human-AI complementarity. Coauthored research showing ML-based lending consolidates existing racial/gender bias. Measurement-focused economist — critical lens on AI metrics and fairness claims. Stance inferred from bias research.

---

### [1202] Swati Gupta — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | mitsloan.mit.edu/faculty/directory/swati-gupta, mitsloan.mit.edu/ideas-made-to-matter/ai-expert-spotlight-swati-gupta, swatigupta.tech |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — MIT Sloan associate professor, NSF CAREER Award for "Advancing Equity in Selection Problems Through Bias-Aware Optimization." Bridges optimization, ML, and algorithmic fairness across hiring, admissions, healthcare, and more. Serves on NeurIPS and FAccT program committees. Technical researcher explicitly motivated by equity outcomes. Stance inferred from fairness-focused research agenda.

---

### [1203] Casey Mock — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | humanetech.com, calmatters.org/commentary/2024/01, podcasts.apple.com, streetinsider.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Restrictive |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Policy advocate |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Chief of Policy and Public Affairs at Center for Humane Technology. Previously led Amazon tax policy. Explicitly advocates liability-focused AI regulation. Compares tech industry lobbying to tobacco industry. Argues clear liability rules empower innovation. Public voice on AI governance through opinion pieces and podcasts. Well-documented positions.

---

### [1204] Camille Carlton — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | humanetech.com/team-board/camille-carlton, americanbazaaronline.com/2026/01/30, techpolicy.press, regulatingai.org |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Restrictive |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Policy advocate |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Policy Director at Center for Humane Technology. Business Insider AI 100 (2023). Involved in lawsuits against CharacterAI and OpenAI. Argues AI amplifies social media harms. Advocates design-focused regulation addressing root causes. Writes for TechPolicy.Press. Explicitly stated positions on AI accountability and safety standards.

---

## Notes

- **Brad Smith (1196)** is the standout at 5/5 confidence — one of the most publicly vocal corporate figures on AI policy with extensive Senate testimony, blog posts, and media appearances.
- **MIT Sloan cluster** (1197-1200, 1202): Five MIT Sloan faculty/leadership with varied but complementary perspectives. Locke (dean) is institutional; Aral focuses on platforms/misinformation; Kellogg on workforce implementation; Rigobon on measurement/bias; Gupta on algorithmic fairness.
- **Center for Humane Technology cluster** (1203-1204): Both explicitly advocate restrictive, liability-focused AI regulation. Organization is a leading voice for AI accountability.
- **Robert J. Jones (1195)** connects to Brad Smith via UW-Microsoft AI partnership expanded in Feb 2026.
- No AGI timeline positions found for any entity in this batch.
