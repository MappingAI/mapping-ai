# Entity Enrichment Batch 78

**Date:** 2026-04-10
**Entities:** 12
**Phase:** phase3-manual

## Summary

Enriched 12 entities (9 persons, 3 organizations) spanning the European AI safety community network, the Safe AI Forum / IDAIS ecosystem, and two corporate entities (Cisco Investments, xAI). All were truly empty (notes null, beliefs null). No edges modified.

**Key clusters:**
- **ENAIS network** (1634-1637, 1638-1639): Gergő Gáspár (Director, now EA UK), Esben Kran (Apart Research founder, board), Jonathan Claybrough (board), Kambar Orazbekov (Policy Lead). AI Safety Dublin and Dutch Network for AI Safety are ENAIS-affiliated local chapters.
- **Safe AI Forum / IDAIS** (1642-1644): Fynn Heide (Executive Director), Conor McGurk (co-founder, now at Coefficient Giving/Open Phil), Saad Siddiqui (Senior AI Policy Researcher). Focus on China-West AI safety Track 2 diplomacy.
- **Workshop Labs** (1633): Rudolf Laine, co-founder of privacy-preserving AI infrastructure PBC.
- **Corporate** (1640, 1641): Cisco Investments ($1B AI fund, xAI investor), Anthony Armstrong (former xAI CFO, departed April 2026).

**Category corrections:**
- 1635 Esben Kran: Executive -> Researcher (founder/director of Apart Research, primary role is research leadership)
- 1636 Jonathan Claybrough: Executive -> Organizer (board member/coordinator at ENAIS and EffiSciences, not exec role)

## Changes

| ID | Name | Type | Confidence | Regulatory | Risk | Notes |
|----|------|------|-----------|------------|------|-------|
| 1633 | Rudolf Laine | person | 3 | Moderate | Serious | Workshop Labs PBC co-founder; privacy-preserving AI infra; Oxford; London AI safety ecosystem |
| 1634 | Gergő Gáspár | person | 4 | Moderate | Catastrophic | ENAIS Director (2yr), now EA UK Executive Director; founded AI Safety Hungary 2022; Amplify Reason co-founder |
| 1635 | Esben Kran | person | 5 | Moderate | Serious | Apart Research founder/director; 20+ papers, 4000+ participants; ENAIS board; EA Denmark board; **category corrected** |
| 1636 | Jonathan Claybrough | person | 3 | Moderate | Serious | ENAIS board, EffiSciences board; software engineer turned AI safety; FOSDEM 2024 speaker; **category corrected** |
| 1637 | Kambar Orazbekov | person | 3 | Moderate | Serious | ENAIS AI Policy Lead; developed Deep Dive 201 AI policy course; AIS Hungary |
| 1638 | AI Safety Dublin | organization | 4 | Moderate | Catastrophic | Grassroots AI safety community in Dublin; ENAIS member; runs reading groups, governance intro, alignment programs, Alignment Jams |
| 1639 | Dutch Network for AI Safety | organization | 4 | Moderate | Catastrophic | ENAIS-affiliated field-building org for Netherlands; courses, mentoring, career pathways; planning AI safety hub |
| 1640 | Cisco Investments | organization | 5 | Light-touch | Manageable | Cisco CVC arm (est. 1993); $1B AI fund (2024); invested in Cohere, Mistral AI, Scale AI, World Labs; 20+ AI acquisitions |
| 1641 | Anthony Armstrong | person | 5 | Accelerate | Manageable | Former xAI CFO (Oct 2025 - Apr 2026); ex-Morgan Stanley global head of tech M&A; advised Musk on Twitter deal; DOGE advisor |
| 1642 | Fynn Heide | person | 5 | Restrictive | Catastrophic | Safe AI Forum co-founder/ED; runs IDAIS; ex-GovAI; China AI policy specialist; SCAI 2025 participant; MATS mentor |
| 1643 | Conor McGurk | person | 5 | Restrictive | Catastrophic | Safe AI Forum co-founder/MD; now Chief of Staff Biosecurity at Coefficient Giving (Open Phil); ex-Meta, ex-Deloitte |
| 1644 | Saad Siddiqui | person | 5 | Moderate | Serious | SAIF Senior AI Policy Researcher; IDAIS China-West dialogue; Oxford Martin AIGI affiliate; ex-Bain, ex-GovAI; Tsinghua MA |

## Category Corrections

- **1635 Esben Kran**: Executive -> Researcher. Founder/director of Apart Research, but primary contribution is research leadership and running research sprints.
- **1636 Jonathan Claybrough**: Executive -> Organizer. Board member at ENAIS and EffiSciences; role is coordination/governance, not executive leadership.

## Edges (unchanged)

- 1981: Rudolf Laine -> Workshop Labs (founder, "co-founder")
- 1983: Gergő Gáspár -> European Network for AI Safety (ENAIS) (employer, "Director")
- 1984: Esben Kran -> European Network for AI Safety (ENAIS) (member, "Board member")
- 1985: Jonathan Claybrough -> European Network for AI Safety (ENAIS) (member, "Board member")
- 1986: Kambar Orazbekov -> European Network for AI Safety (ENAIS) (employer, "AI Policy Lead")
- 1988: European Network for AI Safety (ENAIS) -> AI Safety Dublin (founder)
- 1989: European Network for AI Safety (ENAIS) -> Dutch Network for AI Safety (founder)
- 1994: Cisco Investments -> xAI (funder, "strategic investor")
- 1995: Anthony Armstrong -> xAI (employer, "CFO")
- 1996: Fynn Heide -> Safe AI Forum (founder, "Executive Director")
- 1997: Conor McGurk -> Safe AI Forum (founder)
- 1999: Saad Siddiqui -> Safe AI Forum (employer, "Senior AI Policy Researcher")

## Sources

- linkedin.com/in/rudolf-laine-b1b79a1b6, workshoplabs.ai
- forum.effectivealtruism.org (Announcing EA UK Director, ENAIS ED hiring, Announcing ENAIS, Deep Dive), amplifyreason.com, aishungary.com
- kran.ai, apartresearch.com/person/esben-kran, crunchbase.com/person/esben-kran
- enais.co/about, archive.fosdem.org/2024/schedule/speaker/7PSZ3U, linkedin.com/in/jonathan-claybrough
- forum.effectivealtruism.org (Deep Dive AI policy course), enais.co
- sites.google.com/view/aisdublin, linkedin.com/company/aisdublin
- dnais.co, forum.effectivealtruism.org (Dutch AI Safety Coordination Forum)
- investor.cisco.com, newsroom.cisco.com, ciscoinvestments.com
- cnbc.com/2025/10/07 (Armstrong xAI CFO), techcrunch.com/2025/10/07, tipranks.com, cfodive.com
- saif.org/about-and-contact, far.ai/about/people/fynn-heide, scai.gov.sg/2025/participants/fynn-heide
- openphilanthropy.org/about/team/conor-mcgurk, far.ai/about/people/conor-mcgurk, coefficientgiving.org
- aigi.ox.ac.uk/people/saad-siddiqui, far.ai/about/people/saad-siddiqui, oxfordchinapolicylab.com/saad-siddiqui
