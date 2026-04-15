# Entity Extraction from Notes — 2026-04-15

Source: regex scan of `entity.notes` for capitalized multi-word phrases, filtered against existing entity names + parenthetical aliases, then role/title/geographic exclusions.

Method limitations: regex can't reliably distinguish org names from prose. This list is a **surfacing pass** for manual review; expect ~50% false positives in the 133-candidate raw list. Full raw list at `tmp/entity_candidates_refined.json`.

## Tier 1: Likely-missing organizations

| Candidate | Notes |
|-----------|-------|
| Centre for Effective Altruism (5x) | CEA — umbrella org for many EA entities (EA Forum, EA Funds, LTFF, GiveWell) |
| EA Funds (5x) | EA Funds — grant funds administered by CEA/Effective Ventures |
| EA Forum (4x) | EA Forum — online community forum at forum.effectivealtruism.org |
| Meta FAIR (4x) | Facebook/Meta AI Research — frontier research division of Meta |
| Astera Institute (4x) | Astera — philanthropic research institute funding AI/biology/neuro work |
| Stanford Existential Risks Initiative (4x) | SERI — Stanford research program on x-risk |
| Center for Information Technology Policy (4x) | Princeton CITP — likely needs to be added |
| Bayesian Logic Inc (4x) | Bayesian Logic — Stuart Russell's company |
| Bletchley Park AI Safety Summit (3x) | First AI Safety Summit (UK 2023) — foundational event |
| AI Security Institute (3x) | UK AISI rebrand (Feb 2025) — formerly UK AI Safety Institute |
| Quebec AI Institute (3x) | Mila/IVADO alternative name — check if already via Mila |
| Hugging Face (3x) | HF — major open-source AI platform, missing from DB |
| Palantir Technologies (3x) | Palantir — check if in DB as "Palantir" |
| Omidyar Network (3x) | Pierre Omidyar philanthropy — major AI policy funder |
| Safe Superintelligence Inc (3x) | Ilya Sutskever's company — major frontier lab |
| Knight Foundation (3x) | Knight Foundation — journalism/tech funder |
| Silver Lake (3x) | Silver Lake — tech PE firm |
| SANDBOX Act (3x) | SANDBOX Act — AI legislation |
| Pan-Canadian AI Strategy (3x) | Canada's national AI strategy — gov program |
| ARC Evals (3x) | ARC Evals — predecessor name for METR (likely just alias) |
| AI Safety Index (5x) | FLI publication — check if already resource entity |
| AI Action Plan (12x) | Trump AI Action Plan — resource 633 likely aliased |

## Tier 2: Likely-missing persons

| Candidate | Notes |
|-----------|-------|
| Olga Russakovsky (3x) | Princeton CS professor, ImageNet co-author |
| Ron Conway (3x) | SV Angel — major Silicon Valley investor |
| Oliver Habryka (3x) | Lightcone Infrastructure founder (LessWrong/Alignment Forum) |

## Tier 3: Alias suggestions (already in DB, add as alternate name)

| Phrase in notes | Existing entity |
|-----------------|-----------------|
| Governance of AI | Centre for the Governance of AI (GovAI) — id 225 |
| AI RMF | NIST AI Risk Management Framework — resource id 550 |
| AI Executive Order | Likely Biden EO 14110 — resource id 650 |
| AMI Labs | Advanced Machine Intelligence Labs — id 1432 |
| White House Office of Science and Technology | White House OSTP — id 345 |
| University of California | generic umbrella; should refer to specific campus |

## Tier 4: Junk / false-positive phrases (for filter tuning in future runs)

San Francisco, Congressional District, In March, In November, In January, In December, Long-Term Risk, Responsible AI, Foreign Relations, The Institute, The University, Effective Altruism, Nobel Prize, Los Angeles, FEC ID, Compatible AI, On AI, Air Force, Center for Human, School of Computer Science, Google AI, Menlo Park, Palo Alto, Generative AI, Term Resilience, Stanford Institute for Human, Ethical AI, LessWrong and Alignment Forum, EA and AI, Stanford CS, Carnegie Mellon, UT Austin, Modern Approach, Early OpenAI, Digital Economy, Partner of Partnership, Founded May, AI Lab, Eric and Wendy Schmidt, US-China AI, Attorney General, Abu Dhabi, AI Civil Rights Act, AI Bill of Rights, Alignment of Complex Systems, Superintelligence Labs, Language Models, Centered Artificial Intelligence


