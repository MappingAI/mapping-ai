# Entity Enrichment — Batch 18
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 43 (11 per entity, except Daniel Gross where funding_model left NULL)

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1649 | Daniel Gross | 10 | 4 |
| 1629 | US AI Safety Institute Consortium | 11 | 4 |
| 1628 | SecureBio | 11 | 4 |
| 1618 | Oxford Martin School | 11 | 4 |

---

## Changes

### 1649 Daniel Gross — person / Executive
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Israeli-American entrepreneur who co-founded Cue (acquired by Apple 2013), was a YC partner, and launched Pioneer. Co-founded Safe Superintelligence Inc. with Ilya Sutskever in 2024; left as CEO in July 2025 to join Meta Superintelligence Labs." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://en.wikipedia.org/wiki/Daniel_Gross_(businessman)", "https://www.cnbc.com/2025/07/03/ilya-sutskever-is-ceo-of-safe-superintelligence-after-meta-hired-gross.html"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | 2-3 years |
| funding_model | NULL | NULL (person — not applicable) |
| influence_type | NULL | Builder, Funder/investor |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:** https://en.wikipedia.org/wiki/Daniel_Gross_(businessman) · https://www.cnbc.com/2025/07/03/ilya-sutskever-is-ceo-of-safe-superintelligence-after-meta-hired-gross.html · https://siliconangle.com/2025/07/03/safe-superintelligence-ceo-daniel-gross-joins-metas-new-ai-lab/

**Confidence:** 4/5 — Wikipedia and multiple news sources confirm career arc and SSI co-founding. Beliefs inferred: co-founding an explicitly safety-focused superintelligence company signals he takes AI risk seriously, but his move to Meta and investor/builder orientation points to Light-touch regulation. AGI timeline of 2-3 years inferred from founding SSI in the first place and Meta's superintelligence focus. No explicit regulatory testimony found.

---

### 1629 US AI Safety Institute Consortium — organization / Government/Agency
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "NIST-led consortium of 290+ companies, universities, and civil society organizations launched in February 2024 to advance AI safety research and standards. Renamed to Center for AI Standards and Innovation (CAISI) in June 2025 under the Trump administration, shifting focus from safety to innovation and national security." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://www.nist.gov/news-events/news/2024/02/biden-harris-administration-announces-first-ever-consortium-dedicated-ai", "https://fedscoop.com/trump-administration-rebrands-ai-safety-institute-aisi-caisi/"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | NULL |
| funding_model | NULL | Government |
| influence_type | NULL | Implementer, Connector/convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | TRUE (already) | TRUE |

**Sources:** https://www.nist.gov/news-events/news/2024/02/biden-harris-administration-announces-first-ever-consortium-dedicated-ai · https://fedscoop.com/trump-administration-rebrands-ai-safety-institute-aisi-caisi/ · https://www.nist.gov/caisi

**Confidence:** 4/5 — NIST official announcements confirm founding and member count. FedScoop and multiple outlets confirm the June 2025 rebrand to CAISI. Regulatory stance coded Moderate to reflect the original AISIC mandate (mandatory safety evals, standards); noting mission shift in notes. Risk belief Serious per NIST's own published AI risk frameworks.

---

### 1628 SecureBio — organization / Think Tank/Policy Org
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Nonprofit biosecurity organization founded in 2022 by MIT professor Kevin Esvelt. Develops AI biosecurity benchmarks and evaluations cited by all major frontier labs (Anthropic, Google DeepMind, Meta, OpenAI, xAI). Funded partly by effective altruism philanthropy." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://securebio.org/ai/", "https://securebio.org/blog/securebio-ai-2025-in-review/", "https://forum.effectivealtruism.org/posts/C2ygbqWWzF8MGfcoL/securebio-notes-from-sogive"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Precautionary |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | NULL |
| funding_model | NULL | Nonprofit/philanthropy |
| influence_type | NULL | Researcher/analyst, Advisor/strategist |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:** https://securebio.org/ai/ · https://securebio.org/blog/securebio-ai-2025-in-review/ · https://forum.effectivealtruism.org/posts/C2ygbqWWzF8MGfcoL/securebio-notes-from-sogive · https://www.founderspledge.com/research/secure-bio

**Confidence:** 4/5 — SecureBio's own website explicitly describes the catastrophic risk framing (catastrophic pandemics, bioweapons). Work is well-documented via model cards at frontier labs. EA Forum and Founders Pledge confirm nonprofit/philanthropic funding model. Regulatory stance Precautionary — their mission implies advocating for strict AI biosecurity guardrails before deployment.

---

### 1618 Oxford Martin School — organization / Think Tank/Policy Org
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Interdisciplinary research institute at the University of Oxford, founded 2005 via £70M+ endowment from James Martin. Houses the Oxford Martin AI Governance Initiative, which bridges technical AI research and global policy through research, fellowships, and engagement with the UN, EU, and US." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://www.oxfordmartin.ox.ac.uk/ai-governance", "https://aigi.ox.ac.uk/", "https://en.wikipedia.org/wiki/Oxford_Martin_School"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | NULL |
| funding_model | NULL | Endowment/academic |
| influence_type | NULL | Researcher/analyst, Advisor/strategist, Connector/convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:** https://www.oxfordmartin.ox.ac.uk/ai-governance · https://aigi.ox.ac.uk/ · https://en.wikipedia.org/wiki/Oxford_Martin_School · https://aigi.ox.ac.uk/technical-ai-governance-programme/

**Confidence:** 4/5 — Oxford Martin School and AIGI websites explicitly describe mission, programs, and global governance engagement. Wikipedia confirms founding endowment. Regulatory stance Moderate — AIGI's published research advocates for mandatory safety frameworks building on existing international standards (ISO), not a moratorium or purely voluntary approach. Risk belief Serious per their published work on frontier AI risks.
