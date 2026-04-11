# Entity Enrichment Batch 74

**Date:** 2026-04-10
**Entities:** 12
**Phase:** phase3-manual

## Summary

Enriched 12 entities (1 organization, 11 persons) spanning three clusters: RAND CAST (defense/AI policy research center), Geodesic Research (UK AI safety lab), and the AI Objectives Institute (nonprofit founded by the late Peter Eckersley). All were truly empty (notes null, beliefs null). No edges modified.

**Key findings:**
- **Peter Eckersley** (1576): Deceased September 2, 2022 at age 43. Co-founder of Let's Encrypt and AOI. All beliefs set to Unknown per deceased-entity protocol. Historical significance as a bridge between internet privacy/security and early AI governance movements.
- **Tomek Korbak** (1575): Now at OpenAI (monitoring LLM agents for misalignment), previously UK AISI and Anthropic. 6,235+ citations. MATS mentor. High-profile alignment researcher.
- **Anna Leshinskaya** (1582): Added `other_categories: Academic` — she is a tenure-track professor at UC Irvine in addition to her AOI affiliation.

## Changes

| ID | Name | Type | Confidence | Regulatory | Risk | Notes |
|----|------|------|-----------|------------|------|-------|
| 1571 | RAND Center on AI, Security, and Technology | organization | 5 | Moderate | Serious | RAND CAST; AI+cybersecurity+biotech policy research; fellows program; government-funded |
| 1572 | Cameron Tice | person | 4 | Moderate | Catastrophic | Founder/Co-Director of Geodesic Research; Marshall Scholar; Goldman Sachs → ML engineer → AI safety |
| 1573 | Kyle O'Brien | person | 4 | Moderate | Catastrophic | Founding researcher at Geodesic; pretraining safety; EleutherAI/Microsoft alum; ICLR published |
| 1574 | Alexandra Narin | person | 3 | Moderate | Serious | Strategic Delivery at Geodesic; co-founder UK AI Forum; neuroscience background at UCL |
| 1575 | Tomek Korbak | person | 5 | Moderate | Catastrophic | OpenAI MTS (LLM agent monitoring); ex-UK AISI, ex-Anthropic; PhD Sussex; MATS mentor; 6K+ citations |
| 1576 | Peter Eckersley | person | 5 | Unknown | Unknown | DECEASED 2022. Let's Encrypt co-founder; EFF 2006-2018; Partnership on AI; co-founded AOI 2021 |
| 1577 | Colleen Mckenzie | person | 4 | Moderate | Serious | Executive Director of AOI; ex-Google PM/SWE; ex-Center for Humane Technology CoS; Columbia CS+Neuro |
| 1578 | Stacey Svetlichnaya | person | 4 | Moderate | Serious | CTO of AOI; ex-Weights & Biases DL engineer; ML visualization/explainability; climate+AI interest |
| 1579 | Brittney G | person | 3 | Moderate | Serious | VP/Board Chair of AOI; co-founded AOI with Eckersley 2021; Digital Village host; media tech |
| 1580 | Adam Schumacher | person | 3 | Moderate | Serious | Program Director at AOI; ex-USAID Deputy Director East Asian Affairs; $800M portfolio management |
| 1581 | Zoey Tseng | person | 3 | Moderate | Serious | APAC Partnerships at AOI; g0v civic tech; deployed Talk to the City for Taiwan MoDA |
| 1582 | Anna Leshinskaya | person | 4 | Moderate | Serious | Asst. Prof. UCI Cognitive Sciences; AOI Principal Researcher; Harvard PhD; Schmidt Sciences grantee |

## Edges (unchanged)

- 1858: RAND CAST -> RAND Corporation (parent_company)
- 1859: Cameron Tice -> Geodesic Research (founder, "Founder & Co-Director")
- 1860: Kyle O'Brien -> Geodesic Research (employer, "Founding Member of Technical Staff")
- 1861: Alexandra Narin -> Geodesic Research (employer, "Strategic Delivery")
- 1865: Geodesic Research -> Tomek Korbak (advisor, "Advisor")
- 1866: Peter Eckersley -> AI Objectives Institute (founder, "Founder & Chief Scientist")
- 1867: Colleen Mckenzie -> AI Objectives Institute (employer, "Executive Director")
- 1868: Stacey Svetlichnaya -> AI Objectives Institute (employer, "Chief Technology Officer")
- 1869: Brittney G -> AI Objectives Institute (founder, "Co-Founder, Vice President")
- 1870: Adam Schumacher -> AI Objectives Institute (employer, "Program Director")
- 1871: Zoey Tseng -> AI Objectives Institute (employer, "APAC Partnership")
- 1875: AI Objectives Institute -> Anna Leshinskaya (collaborator, "Dr.")

## Sources

- rand.org/global-and-emerging-risks/centers/ai-security-and-technology
- geodesicresearch.org/cameron-tice, geodesicresearch.ai
- kyleobrien.io, geodesicresearch.org/kyle-o-brien
- linkedin.com/in/alexandra-narin, ukaiforum.com/team
- tomekkorbak.com, far.ai/about/people/tomasz-korbak, matsprogram.org/mentor/korbak
- en.wikipedia.org/wiki/Peter_Eckersley_(computer_scientist), eff.org, letsencrypt.org, internethalloffame.org
- ai.objectives.institute/blog/colleen-mckenzie-executive-director
- ai.objectives.institute/team (Svetlichnaya, Schumacher, Tseng, Leshinskaya)
- brittneygallagher.com/about, digitalvillage.org/about
- annaleshinskaya.com, schmidtsciences.org/grantee/anna-leshinskaya, relcoglab.org
