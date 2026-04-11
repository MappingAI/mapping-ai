# Entity Enrichment — Batch 40
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 6
Fields updated: 62

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1761 | Andrew Doris | 9 | 3 |
| 1762 | Economic Security Action California | 10 | 4 |
| 1763 | Paul Scharre | 11 | 5 |
| 1764 | Vivek Chilukuri | 11 | 4 |
| 1765 | Carnegie Corporation of New York | 10 | 4 |
| 1766 | Effective Ventures | 10 | 4 |

Mixed batch: two CNAS leaders (Scharre, Chilukuri), one Secure AI Project analyst (Doris), one California AI advocacy org (ESCAA), and two major funders/fiscal sponsors (Carnegie Corp, Effective Ventures).

---

## Changes

### [1761] Andrew Doris — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | secureaiproject.org, linkedin.com, foreignpolicy.com, defensepriorities.org |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst |
| enrichment_version | v2-auto | phase3-manual |

**Confidence:** 3/5 — Senior Policy Analyst at Secure AI Project. Former Army officer, Yale M.A., JHU B.A. Previously at Foreign Policy Analytics and Capitol Hill. Beliefs inferred from Secure AI Project affiliation (catastrophic risk framing, moderate regulation stance).

---

### [1762] Economic Security Action California — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | economicsecurity.us, economicsecurityproject.org, sd11.senate.ca.gov |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Restrictive |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Organizer/advocate |
| funding_model | NULL | Nonprofit/advocacy |
| enrichment_version | v2-auto | phase3-manual |

**Confidence:** 4/5 — Directed by Teri Olle. Co-sponsored SB 1047 and SB 53. Explicitly advocates mandatory safety guardrails, opposes industry self-regulation, frames AI risk as serious societal/economic concern (power concentration, accountability). Restrictive stance clearly stated in public advocacy.

---

### [1763] Paul Scharre — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | cnas.org, 80000hours.org, foreignaffairs.com, carnegiecouncil.org, paulscharre.com |
| notes_confidence | NULL | 5 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Decision-maker, Researcher/analyst, Narrator |
| other_categories | NULL | Researcher |
| enrichment_version | v2-auto | phase3-manual |

**Confidence:** 5/5 — EVP and Director of Studies at CNAS. TIME100/AI honoree. Led DoD working group on autonomous weapons policy (Directive 3000.09). Author of "Army of None" and "Four Battlegrounds." Testified before Armed Services Committees. Advocates targeted governance: anti-personnel autonomous weapons ban + nuclear human control agreements, but opposes total bans as unrealistic. Added Researcher as other_categories given prolific published work.

---

### [1764] Vivek Chilukuri — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | cnas.org, linkedin.com, conference.cnas.org |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Targeted |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst, Advisor/strategist |
| other_categories | NULL | Policymaker |
| enrichment_version | v2-auto | phase3-manual |

**Confidence:** 4/5 — Senior Fellow and Director, Technology and National Security Program at CNAS. Former senior staff for Sen. Michael Bennet (technology/democracy policy advisor, deputy chief of staff, legislative director). State Dept background. Research on responsible AI, U.S. tech leadership, technology-democracy intersection. Stance inferred from CNAS institutional orientation (targeted regulation, national security lens). Added Policymaker as other_categories given extensive Hill/policy background.

---

### [1765] Carnegie Corporation of New York — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | carnegie.org, carnegie.org/grants |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Funder/investor |
| funding_model | NULL | Endowment/philanthropy |
| enrichment_version | v2-auto | phase3-manual |

**Confidence:** 4/5 — Major philanthropy ($4.5B assets, $174M annual giving). AI-related grants include: CNAS funding (existing edge), $8.2M AI-nuclear risk package (Jan 2026), AI capacity building in Africa ($900K), AI ethics ratings ($350K to Common Sense Media), AI-driven intelligence tools ($1M to CFR). Regulatory stance inferred as moderate from grantmaking pattern — funds both security-oriented and governance research without explicitly advocating specific regulatory framework.

---

### [1766] Effective Ventures — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | ev.org, effectivealtruism.org, forum.effectivealtruism.org, wikipedia.org |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Funder/investor, Connector/convener |
| funding_model | NULL | Nonprofit/donations |
| enrichment_version | v2-auto | phase3-manual |

**Confidence:** 4/5 — EA umbrella org (UK + USA entities). Renamed from CEA Ops in 2022. Fiscal sponsors/hosts: CEA, 80,000 Hours, Giving What We Can, EA Funds, GovAI (existing edge), Longview Philanthropy, Asterisk, Atlas Fellowship, Non-trivial. Budget >$50M. EA Funds Long-Term Future Fund is among earliest AI safety funders. Catastrophic risk view inferred from EA/longtermist ecosystem orientation. FTX collapse connection via former leadership.
