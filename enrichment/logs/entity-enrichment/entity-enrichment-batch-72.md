# Entity Enrichment Batch 72

**Date:** 2026-04-10
**Entities:** 12
**Phase:** phase3-manual

## Summary

Enriched 12 entities — 5 AI Safety Foundation (AISF) board/staff members, 1 journalism organization (CJF), and 6 AI safety/alignment researchers from the Cyborgism, IAPS, EffiSciences, and Palisade Research communities. All were truly empty (notes null, beliefs null). No edges modified.

**Key findings:**
- David Duvenaud (1547) and Roger Grosse (1548) are prominent U of T professors who both work on Anthropic's Alignment Science team. Duvenaud has explicitly stated ~85% P(doom) and advocates AGI development slowdown. Both re-categorized from Executive to Researcher.
- Roger Grosse is NOT a co-founder of Safe Superintelligence Inc. (SSI) as the task context suggested — SSI was co-founded by Ilya Sutskever, Daniel Gross, and Daniel Levy.
- janus (1552) is pseudonymous (known as Repligate); originated the influential "simulators" framework for understanding LLMs.
- Canadian Journalism Foundation (1550) launched the CJF-Hinton Award for AI Safety Reporting in Oct 2025, partnered with AISF.

## Changes

| ID | Name | Type | Confidence | Regulatory | Risk | Notes |
|----|------|------|-----------|------------|------|-------|
| 1545 | Richard Phillips | person | 3 | Moderate | Catastrophic | AISF Board Chair; former Deputy Chairman CIBC World Markets; investment management background |
| 1546 | Meg Sintzel | person | 3 | Unknown | Unknown | AISF Director; former MD Marketing/Comms at Accenture Canada (36 years); low-profile on AI beliefs |
| 1547 | David Duvenaud | person | 4 | Precautionary | Existential | U of T prof; fmr Anthropic Alignment Evals lead; ~85% P(doom); AISF Director; **category: Executive->Researcher** |
| 1548 | Roger Grosse | person | 4 | Moderate | Catastrophic | U of T prof; Anthropic alignment staff; Vector Institute founder; AISF Director; **category: Executive->Researcher** |
| 1549 | Bill Morris | person | 3 | Unknown | Unknown | AISF Director; former CEO Accenture Canada (35+ years); low-profile on AI beliefs |
| 1550 | Canadian Journalism Foundation | organization | 4 | Targeted | Serious | Founded 1990; CJF-Hinton Award for AI Safety Reporting; AISF partner; media literacy + AI misinfo research |
| 1551 | NicholasKees | person | 3 | Moderate | Catastrophic | Nicholas Kees Dupuis; co-founder/CEO Mosaic Labs; co-founder Cyborgism; AI Safety Camp 2023 |
| 1552 | janus | person | 3 | Mixed/unclear | Catastrophic | Pseudonymous (Repligate); co-founder Cyborgism; "simulators" framework; Act I project ($68K Manifund) |
| 1553 | Daniel Clothiaux | person | 3 | Unknown | Catastrophic | CMU PhD student (Language Technologies); cyborgism co-developer with Conjecture/Connor Leahy |
| 1554 | Sven Herrmann | person | 3 | Moderate | Serious | 2025 IAPS AI Policy Fellow; European AI governance at Future Society; PhD mathematics; fmr Oxford GPI |
| 1555 | Jérémy Andréoletti | person | 3 | Moderate | Serious | AI security researcher at GPAI Policy Lab; co-founder/Gen Sec EffiSciences; PhD ENS Paris |
| 1556 | Charlie Rogers-Smith | person | 3 | Moderate | Catastrophic | Chief of Staff at Palisade Research; author of widely-cited AI alignment career guide; fmr CFAR instructor |

## Category Changes

- **1547 David Duvenaud**: Executive -> Researcher (he is a professor/researcher who serves on the AISF board, not primarily an executive)
- **1548 Roger Grosse**: Executive -> Researcher (same rationale — professor at U of T, alignment researcher at Anthropic)

## Edge Notes (no modifications)

Existing edges verified as correct:
- 1545 Richard Phillips -> AI Safety Foundation (member, Chair of the Board)
- 1546 Meg Sintzel -> AI Safety Foundation (member, Director)
- 1547 David Duvenaud -> AI Safety Foundation (member, Director)
- 1548 Roger Grosse -> AI Safety Foundation (member, Director)
- 1549 Bill Morris -> AI Safety Foundation (member, Director)
- 1550 Canadian Journalism Foundation <- AI Safety Foundation (partner)
- 1551 NicholasKees -> Cyborgism (founder, Co-founder)
- 1552 janus -> Cyborgism (founder, Co-founder)
- 1553 Daniel Clothiaux <- Cyborgism (collaborator)
- 1554 Sven Herrmann -> Effective Thesis (member, Senior AI Policy Fellow at IAPS)
- 1555 Jérémy Andréoletti -> Effective Thesis (member, Co-founder of EffiSciences / Researcher at GPAI Policy Lab)
- 1556 Charlie Rogers-Smith -> How to pursue a career in technical AI alignment (founder, Author)
