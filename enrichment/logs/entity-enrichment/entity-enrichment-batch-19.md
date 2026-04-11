# Entity Enrichment — Batch 19
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 45 (11 per person entity, 12 for Vector Institute including other_categories)

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1616 | Ben Garfinkel | 11 | 4 |
| 450 | Vector Institute | 12 | 5 |
| 1606 | Vishal Maini | 11 | 4 |
| 1605 | Allison Duettmann | 11 | 4 |

---

## Changes

### 1616 Ben Garfinkel — person / Researcher
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Director of the Centre for the Governance of AI (GovAI), a non-profit research org. Previously postdoctoral researcher at the Oxford Martin AI Governance Initiative. Researches security implications of AI, causes of war, and methodology of technology risk forecasting." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://www.governance.ai/team/ben-garfinkel", "https://www.oxfordmartin.ox.ac.uk/people/ben-garfinkel", "https://80000hours.org/podcast/episodes/ben-garfinkel-classic-ai-risk-arguments/"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | 10-25 years |
| funding_model | NULL | NULL |
| influence_type | NULL | Researcher/analyst, Advisor/strategist |
| enrichment_version | v2-auto | phase3-manual |

**Sources:** https://www.governance.ai/team/ben-garfinkel · https://www.oxfordmartin.ox.ac.uk/people/ben-garfinkel · https://80000hours.org/podcast/episodes/ben-garfinkel-classic-ai-risk-arguments/

**Confidence:** 4/5 — GovAI team page and Oxford Martin confirm his Director role and research areas. 80,000 Hours podcast episode documents his views on AI risk arguments at length. Regulatory stance (Moderate) based on published GovAI position recommending mandatory high-level safety principles with close regulatory oversight — explicitly stated in GovAI policy writing. Risk level set to Serious (not Existential) reflecting his documented scrutiny of classic x-risk arguments and preference for nuanced risk assessment over catastrophism.

---

### 450 Vector Institute — organization / (no prior category)
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Toronto-based nonprofit AI research institute founded in 2017, focused on machine learning and deep learning. Funded jointly by the Government of Ontario, the federal Pan-Canadian AI Strategy (CIFAR), and industry sponsors. New President & CEO Glenda Crisp appointed April 2025." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://vectorinstitute.ai/", "https://en.wikipedia.org/wiki/Vector_Institute_(Canada)", "https://vectorinstitute.ai/vector-institute-announces-the-appointment-of-glenda-crisp-as-president-and-ceo/"] |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Government grants, Industry sponsorship |
| other_categories | NULL | Academic |
| influence_type | NULL | Researcher/analyst, Connector/convener |
| enrichment_version | NULL | phase3-manual |

**Sources:** https://vectorinstitute.ai/ · https://en.wikipedia.org/wiki/Vector_Institute_(Canada) · https://vectorinstitute.ai/vector-institute-announces-the-appointment-of-glenda-crisp-as-president-and-ceo/

**Confidence:** 5/5 — Vector Institute is well-documented. Wikipedia, official site, and press releases confirm founding, structure, funding sources, and leadership transition. Category was blank in DB; set `other_categories` to "Academic" (the correct org category for a university-affiliated research institute). Note: `category` column remains NULL as it was unset; the Academic classification is captured in `other_categories` per schema convention for organizations lacking a primary category.

---

### 1606 Vishal Maini — person / Investor
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Founder and Managing Partner of Mythos Ventures, a San Francisco seed-stage VC firm focused on AI. Former Google DeepMind researcher. Closed a $14M inaugural fund in 2023 targeting pro-social AI startups. Also a board member at Manifund." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://techcrunch.com/2023/09/27/mythos-ventures-ai-14m-fund/", "https://www.mythos.vc/about", "https://signal.nfx.com/investors/vishal-maini"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | 5-10 years |
| funding_model | NULL | NULL |
| influence_type | NULL | Funder/investor, Builder |
| enrichment_version | v2-auto | phase3-manual |

**Sources:** https://techcrunch.com/2023/09/27/mythos-ventures-ai-14m-fund/ · https://www.mythos.vc/about · https://signal.nfx.com/investors/vishal-maini

**Confidence:** 4/5 — TechCrunch and Bloomberg Law articles confirm $14M fund raise and DeepMind background. Mythos.vc about page confirms Maini as Managing Partner. DB edge confirms Manifund board membership. Beliefs inferred from VC positioning and focus on "pro-social" (not safety-restrictive) AI startups; no public regulatory stance found. Timeline is inferred from his active investment thesis in near-term AI transformation.

---

### 1605 Allison Duettmann — person / Executive
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "President and CEO of Foresight Institute, a San Francisco nonprofit advancing beneficial frontier technologies. Co-initiated Foresight's AI Safety Grant Program. Focuses on existential risk reduction, AI governance, and longtermist coordination. Co-authored 'Gaming the Future' and 'Superintelligence: Coordination & Strategy'." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://foresight.org/people/allison-duettmann/", "https://events.foresight.org/our-team/allison-duettmann-president-ceo/", "https://www.existentialhope.com/team/allison-duettmann"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Existential |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | 10-25 years |
| funding_model | NULL | NULL |
| influence_type | NULL | Organizer/advocate, Advisor/strategist |
| enrichment_version | v2-auto | phase3-manual |

**Sources:** https://foresight.org/people/allison-duettmann/ · https://events.foresight.org/our-team/allison-duettmann-president-ceo/ · https://www.existentialhope.com/team/allison-duettmann

**Confidence:** 4/5 — Foresight Institute bio, events page, and existentialhope.com all confirm role and focus areas. Existential risk stance is explicitly stated in published work including co-authored papers at First Colloquium on Catastrophic and Existential Risk, and through Existentialhope.com which she founded. Regulatory stance set to Targeted (rather than Precautionary) because Foresight's approach emphasizes coordination and voluntary cooperation over broad moratoria — consistent with longtermist governance framing. Timeline (10-25 years) inferred from existential risk focus without near-term AGI claims.
