# Entity Enrichment — Batch 22
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 4
Fields updated: 48 (12 per entity)

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1507 | Buck Shlegeris | 12 | 4 |
| 1481 | Congressional Artificial Intelligence Caucus | 12 | 3 |
| 1431 | Encode AI | 12 | 4 |
| 1428 | U.S. Senate Commerce Committee | 12 | 5 |

---

## Changes

### 1507 Buck Shlegeris — person / Executive
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "CEO of Redwood Research, an AI safety nonprofit focused on AI control — ensuring safe deployment of potentially misaligned AI. Co-founder of Redwood and board member at ARC. Argues that robust control techniques may be humanity's best near-term safeguard given insufficient industry investment in alignment." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://blog.redwoodresearch.org/p/announcing-controlconf-2026", "https://80000hours.org/podcast/episodes/buck-shlegeris-ai-control-scheming/", "https://www.redwoodresearch.org/team"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Restrictive |
| belief_ai_risk | NULL | Existential |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | 2-3 years |
| funding_model | NULL | Nonprofit/grant |
| influence_type | NULL | Researcher/analyst, Builder |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:** https://blog.redwoodresearch.org/p/announcing-controlconf-2026 · https://80000hours.org/podcast/episodes/buck-shlegeris-ai-control-scheming/ · https://www.redwoodresearch.org/team

**Confidence:** 4/5 — Redwood Research website and 80k Hours podcast confirm CEO role and co-founder status. ControlConf 2026 blog post confirms active leadership. AI control research is explicitly framed as a near-term catastrophic/existential risk mitigation tool; podcast episode title ("controlling AI that wants to take over") and his writing confirm Existential risk framing. Restrictive stance inferred from advocacy for robust external controls on AI deployment. 2-3 year AGI timeline inferred from ControlConf 2026 framing that control techniques are now "load-bearing for the safety of real agent deployments." Confidence not 5 because explicit personal regulatory stance statements are limited vs. research outputs.

---

### 1481 Congressional Artificial Intelligence Caucus — organization / Government/Agency
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Bipartisan House caucus promoting AI education and policy dialogue. Originally co-chaired by Reps. Anna Eshoo (D-CA) and Michael McCaul (R-TX); Don Beyer (D-VA) was an active co-chair figure. Convenes members to engage on AI legislation, coordinates with the House AI Task Force, and maintains a nonpartisan pro-innovation stance." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://artificialintelligencecaucus-beyer.house.gov/", "https://mccaul.house.gov/media-center/press-releases/congressional-ai-caucus-co-chairs-announce-vice-chairs-and-new-core", "https://cha.house.gov/_cache/files/5/1/5125a39b-f6bd-49b7-bd12-4e5a8fd4abc0/8B91F2ACB97E056CEF32EEDE1124205FC72CD55278014EF44521CC111F40B52E.119th-congress-cmo-list-1-.pdf"] |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Government |
| influence_type | NULL | Decision-maker, Connector/convener |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:** https://artificialintelligencecaucus-beyer.house.gov/ · https://mccaul.house.gov/media-center/press-releases/congressional-ai-caucus-co-chairs-announce-vice-chairs-and-new-core · https://cha.house.gov (119th CMO list)

**Confidence:** 3/5 — The caucus official site and McCaul press release confirm structure. However, Eshoo retired after the 118th Congress (2024), and 119th Congress (2025–) co-chair succession is not definitively confirmed in public sources reviewed — the Beyer-domain site remains live but Beyer also retired in 2024. DB edges show Don Beyer and Anna Eshoo both as co-chairs, consistent with 118th Congress records. Light-touch stance and Manageable risk are inferred from the caucus's consistently pro-innovation, education-oriented framing rather than any precautionary stance. Note: qa_approved was already TRUE before this batch; kept TRUE.

---

### 1431 Encode AI — organization / Think Tank/Policy Org
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "Youth-led DC-based nonprofit founded by Sneha Revanur advocating for responsible AI governance. Sponsored California SB 53 and New York's RAISE Act; challenged OpenAI's for-profit conversion. Funded by FLI, Heising-Simons, Survival and Flourishing Fund, and others; explicitly rejects corporate and AI-executive funding." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://encodeai.org/", "https://fortune.com/2025/10/10/a-3-person-policy-non-profit-that-worked-on-californias-ai-safety-law-is-publicly-accusing-openai-of-intimidation-tactics/", "https://www.influencewatch.org/non-profit/encode-justice/"] |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Nonprofit/grant |
| influence_type | NULL | Organizer/advocate, Advisor/strategist |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:** https://encodeai.org/ · https://fortune.com/2025/10/10/a-3-person-policy-non-profit-that-worked-on-californias-ai-safety-law-is-publicly-accusing-openai-of-intimidation-tactics/ · https://www.influencewatch.org/non-profit/encode-justice/

**Confidence:** 4/5 — encodeai.org and Fortune article confirm core facts (SB 53, RAISE Act, OpenAI challenge, funding sources). Regulatory stance Moderate assigned because Encode supports binding safety standards (mandatory AI audits, liability rules) rather than either blocking AI development (Precautionary) or purely light-touch rules; they explicitly backed state-level safety legislation. Serious risk assessment is supported by their focus on harms from current AI (misinformation, child safety, corporate accountability) rather than existential framing. Funded by FLI and Survival & Flourishing Fund which have x-risk leanings, but Encode's public advocacy focuses on near-term harms.

---

### 1428 U.S. Senate Commerce Committee — organization / Government/Agency
| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | "U.S. Senate committee with primary jurisdiction over AI, technology, and telecommunications. Chaired by Ted Cruz (R-TX) since 2025, who introduced the SANDBOX Act and a five-pillar light-touch AI framework. Oversees the Senate AI Working Group and has held hearings on U.S. AI competitiveness vs. China." |
| notes_v1 | NULL | NULL |
| notes_sources | NULL | ["https://www.commerce.senate.gov/2025/9/sen-cruz-unveils-ai-policy-framework-to-strengthen-american-ai-leadership", "https://www.commerce.senate.gov/about/", "https://www.commerce.senate.gov/meetings/winning-the-ai-race-strengthening-u-s-capabilities-in-computing-and-innovation/"] |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Government |
| influence_type | NULL | Decision-maker, Implementer |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:** https://www.commerce.senate.gov/2025/9/sen-cruz-unveils-ai-policy-framework-to-strengthen-american-ai-leadership · https://www.commerce.senate.gov/about/ · https://www.commerce.senate.gov/meetings/winning-the-ai-race-strengthening-u-s-capabilities-in-computing-and-innovation/

**Confidence:** 5/5 — Official Senate Commerce Committee website confirms jurisdiction, chairmanship, the SANDBOX Act, and the five-pillar AI framework. Cruz's statements explicitly advocate light-touch regulation and U.S. AI leadership over China. Edge data confirms Ted Cruz is Chairman and committee oversees the Senate AI Working Group (entity 1937). High confidence given primary government source.

**Duplicate note:** Entity 1148 ("Senate Committee on Commerce, Science and Transportation") covers the same body and was already enriched in a prior batch. Entity 1428 uses a slightly shortened name ("U.S. Senate Commerce Committee"). Both records have distinct edge sets: 1428 has Ted Cruz as Chairman + the Senate AI Working Group child; 1148 has Maria Cantwell, Jerry Moran, and a parent_company link to the U.S. Senate. These are complementary rather than redundant edge sets. Both records kept per instructions; duplication noted here for future deduplication review.
