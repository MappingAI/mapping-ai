# Entity Enrichment Batch 68

**Date:** 2026-04-10
**Phase:** Phase 3 manual enrichment
**Entities:** 12 (IDs 1490-1501)
**Enrichment version:** `phase3-manual`
**QA approved:** TRUE (all)
**Edges modified:** None

---

## Summary

Enriched 12 truly empty entities (all fields null). Mix of NY state AI ecosystem organizations, Brookings researchers, CMU/Gray Swan AI safety researchers, and a NY state policymaker.

## Entities Updated

### Organizations

| ID | Name | Category | Reg. Stance | AI Risk | Confidence | Influence |
|----|------|----------|-------------|---------|------------|-----------|
| 1490 | AI Research Institute on Interaction for AI assistants (ARIA) | Academic | Moderate | Serious | 4 | Researcher/analyst |
| 1491 | ACM US Technology Policy Committee | Think Tank/Policy Org | Moderate | Serious | 4 | Advisor/strategist, Researcher/analyst |
| 1492 | Empire AI | Government/Agency | Targeted | Manageable | 4 | Builder, Connector/convener |
| 1493 | University at Buffalo | Academic | Targeted | Manageable | 4 | Researcher/analyst, Builder |
| 1494 | SUNY | Academic | Targeted | Manageable | 4 | Researcher/analyst, Builder |

### People

| ID | Name | Category | Reg. Stance | AI Risk | Confidence | Influence |
|----|------|----------|-------------|---------|------------|-----------|
| 1495 | Tom DiNapoli | Policymaker | Moderate | Serious | 5 | Decision-maker, Implementer |
| 1496 | Mark Muro | Researcher | Targeted | Serious | 4 | Researcher/analyst |
| 1497 | Darrell M. West | Researcher | Moderate | Serious | 4 | Researcher/analyst, Narrator |
| 1498 | Valerie Wirtschafter | Researcher | Moderate | Serious | 4 | Researcher/analyst |
| 1499 | Matt Fredrikson | Executive | Moderate | Serious | 4 | Researcher/analyst, Builder |
| 1500 | Zico Kolter | Executive | Moderate | Serious | 5 | Researcher/analyst, Decision-maker, Builder |
| 1501 | Rob Jenks | Executive | Moderate | Serious | 4 | Builder, Advisor/strategist |

## Key Decisions

- **ARIA (1490):** Categorized as Moderate/Serious based on NSF-funded focus on trustworthy, safe AI assistants for mental health — emphasis on interpretability and participatory design implies wanting meaningful safety standards. Funding model = Government/public ($20M NSF grant).
- **ACM USTPC (1491):** Moderate regulatory stance based on explicit published principles calling for mandatory transparency, accountability, auditability, and their proactive engagement with regulators. Evidence source = Explicitly stated (published policy statements).
- **Empire AI (1492):** Targeted/Manageable — a state-funded infrastructure consortium focused on responsible AI for public good; not calling for broad regulation but structurally oriented toward responsible development. $500M+ public/private investment.
- **UB (1493) & SUNY (1494):** Targeted/Manageable — both are public institutions focused on responsible AI research and education. SUNY has the new Center for AI Responsibility and Research at Binghamton plus AI literacy in Gen Ed.
- **DiNapoli (1495):** Confidence 5 — multiple audits and public statements directly call for stronger AI oversight. Moderate stance (mandatory transparency, accountability) not Restrictive (not calling for external oversight of compute or moratoriums).
- **Muro (1496):** Targeted rather than Moderate — focuses on workforce policy (retraining, transition support) rather than mandatory safety evals. Evidence directly from published research and quotes.
- **West (1497):** Moderate — explicitly advocates for regulation acknowledging real harms, transparency, accountability. Published book on AI governance blueprint.
- **Wirtschafter (1498):** Moderate/Serious inferred from her work on democratic erosion, information space threats, and co-leading Brookings AI principles.
- **Fredrikson (1499):** Moderate/Serious inferred from building a company specifically to identify and fix AI vulnerabilities. Academic + CEO dual role.
- **Kolter (1500):** Confidence 5 — explicitly stated views on broad AI safety (not just existential). Chairs OpenAI Safety Committee with veto power. Regulators conditioned OpenAI restructuring on his oversight.
- **Jenks (1501):** Moderate/Serious inferred from choosing to work at an AI safety company; no direct public statements on regulation found.

## Existing Edges (preserved, not modified)

- 1490: Suresh Venkatasubramanian -> ARIA (founder, Co-Director)
- 1491: Suresh Venkatasubramanian -> ACM USTPC (collaborator, Co-chair AI & Algorithms)
- 1492: Kathy Hochul -> Empire AI (founder, Governor who launched)
- 1493: Kathy Hochul -> University at Buffalo (partner)
- 1494: Kathy Hochul -> SUNY (collaborator)
- 1495: Kathy Hochul -> Tom DiNapoli (collaborator)
- 1496: Mark Muro -> Brookings Institution (employer, Senior Fellow)
- 1497: Darrell M. West -> Brookings Institution (employer, Senior Fellow)
- 1498: Valerie Wirtschafter -> Brookings Institution (employer, Fellow)
- 1499: Matt Fredrikson -> Gray Swan (founder, Co-Founder & CEO)
- 1500: Zico Kolter -> Gray Swan (founder, Co-Founder & Chief Scientist)
- 1501: Rob Jenks -> Gray Swan (employer, Chief Strategy Officer)

## Sources

- https://www.brown.edu/news/2025-07-29/aria-ai-institute-brown
- https://aria.brown.edu/
- https://www.acm.org/public-policy/ustpc
- https://www.acm.org/public-policy/ustpc/policy-products
- https://www.governor.ny.gov/news/governor-hochul-unveils-fifth-proposal-2024-state-state-empire-ai-consortium-make-new-york
- https://www.empireai.edu/
- https://www.buffalo.edu/ai-data-science.html
- https://www.suny.edu/impact/research/priorities/ai/
- https://www.osc.ny.gov/press/releases/2025/04/dinapoli-improved-guidance-needed-state-agencies-using-ai-avoid-risks
- https://www.osc.ny.gov/press/releases/2023/02/dinapoli-audit-recommends-stronger-oversight-nycs-artificial-intelligence-programs
- https://www.brookings.edu/people/mark-muro/
- https://www.brookings.edu/people/darrell-m-west/
- https://www.brookings.edu/people/valerie-wirtschafter/
- https://mattfredrikson.com/
- https://zicokolter.com/bio/
- https://www.grayswan.ai/about
- https://www.grayswan.ai/blog/gray-swan-appoints-rob-jenks-as-chief-strategy-officer-to-lead-global-ai-security-market-expansion
- https://www.usnews.com/news/business/articles/2025-11-02/who-is-zico-kolter-a-professor-leads-openai-safety-panel-with-power-to-halt-unsafe-ai-releases
- https://www.cityandstateny.com/policy/2026/03/hochul-dinapoli-want-more-information-ais-threat-and-benefits-workforce/412245/
