# Entity Enrichment Batch 71

**Date:** 2026-04-10
**Entities:** 12
**Phase:** phase3-manual

## Summary

Enriched 12 entities (6 persons, 6 organizations) connected to the Goodfire interpretability ecosystem and the Existential Risk Observatory. All were truly empty (notes null, beliefs null). No edges modified.

**Key finding:** Radical AI (id 1542) was categorized as "AI Safety/Alignment" but is actually a materials science company using AI for autonomous materials discovery. Category corrected to "Deployers & Platforms."

## Changes

| ID | Name | Type | Confidence | Regulatory | Risk | Notes |
|----|------|------|-----------|------------|------|-------|
| 1532 | Yale Law School | organization | 5 | Moderate | Serious | ISP founded by Jack Balkin; "information fiduciary" framework; AI governance research center |
| 1533 | Otto Barten | person | 4 | Precautionary | Existential | Founder/president of Existential Risk Observatory; physicist turned x-risk advocate; TIME contributor |
| 1534 | Rebecca Scholefield | person | 3 | Precautionary | Existential | Oxford-educated AI governance researcher at ERO; co-authored Conditional AI Safety Treaty |
| 1535 | Samuel Martin | person | 2 | Precautionary | Existential | Unaffiliated co-author of Conditional AI Safety Treaty paper; low public profile |
| 1537 | Nik Samoylov | person | 3 | Precautionary | Existential | Founded Conjointly + Campaign for AI Safety (merged with ERO 2024); runs x-risk public opinion surveys |
| 1538 | Eric Ho | person | 5 | Targeted | Serious | Co-founder/CEO of Goodfire; $1.25B valuation; leading AI interpretability company |
| 1539 | B Capital | organization | 5 | Light-touch | Manageable | Eduardo Saverin's $9B+ AUM VC; led Goodfire Series B at $1.25B |
| 1540 | Menlo Ventures | organization | 5 | Light-touch | Manageable | Major VC; $1.35B fund; Anthropic investor; led Goodfire Series A; $100M Anthology Fund with Anthropic |
| 1541 | Mayo Clinic | organization | 5 | Moderate | Manageable | 200+ AI projects; Google Cloud AI factory; Goodfire partner for genomic medicine interpretability |
| 1542 | Radical AI | organization | 4 | Unknown | Unknown | Materials science co. (NOT AI safety); autonomous labs; 370x acceleration; Goodfire partner; **category corrected** |
| 1543 | Sarah Friar | person | 5 | Targeted | Manageable | OpenAI's first CFO (June 2024); ex-Square CFO, ex-Nextdoor CEO; Walmart board; OBE |
| 1544 | Ankesh Chandaria | person | 4 | Moderate | Catastrophic | CEO of AI Safety Foundation; litigation lawyer turned AI safety leader; Cambridge AI Ethics MSc |

## Category Correction

- **1542 Radical AI**: Changed from `AI Safety/Alignment` to `Deployers & Platforms`. Radical AI (radical-ai.com) is a NYC-based autonomous materials science discovery company, not an AI safety organization. It was likely miscategorized due to the name containing "AI" and the word "Radical" being associated with safety/ethics discourse.

## Edges (unchanged)

- 1785: Otto Barten -> Existential Risk Observatory (founder, "founder, president, daily management")
- 1786: Existential Risk Observatory -> Rebecca Scholefield (collaborator)
- 1787: Existential Risk Observatory -> Samuel Martin (collaborator)
- 1789: Existential Risk Observatory -> Nik Samoylov (collaborator)
- 1791: Eric Ho -> Goodfire (employer, "CEO")
- 1792: B Capital -> Goodfire (funder, "Lead investor")
- 1793: Menlo Ventures -> Goodfire (funder)
- 1796: Goodfire -> Mayo Clinic (partner)
- 1798: Goodfire -> Radical AI (partner)
- 1804: Sarah Friar -> OpenAI (employer, "CFO")
- 1807: Ankesh Chandaria -> AI Safety Foundation (employer, "Chief Executive Officer")

## Sources

- law.yale.edu/isp, law.yale.edu/jack-m-balkin
- existentialriskobservatory.org/about-us
- forum.effectivealtruism.org/posts/XJuPEyF6DkCEzb7un (Conditional AI Safety Treaty)
- goodfire.ai, sequoiacap.com/podcast/training-data-eric-ho
- prnewswire.com (Goodfire Series B: $150M at $1.25B)
- b.capital, b.capital/team/eduardo-saverin
- menlovc.com, menlovc.com/focus-areas/ai
- mayoclinic.org, goodfire.ai/blog/mayo-clinic-collaboration
- radical-ai.com, rdworldonline.com, governor.ny.gov (Hochul announcement)
- en.wikipedia.org/wiki/Sarah_Friar, cnbc.com
- aisfoundation.ai/about/chandaria, policyoptions.irpp.org
