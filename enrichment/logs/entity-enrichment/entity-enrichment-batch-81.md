# Entity Enrichment Batch 81

**Date:** 2026-04-10
**Entities:** 12
**Phase:** phase3-manual
**Note:** FINAL batch -- these are the last 12 truly empty entities in mapping_ai_staging.

## Summary

Enriched 12 entities (11 persons, 1 organization) spanning two clusters: (1) Cooperative AI Summer School speakers (academic AI researchers) and (2) the Alignment of Complex Systems (ACS) research group at Charles University, Prague, plus IAPS leadership.

**Key clusters:**
- **Cooperative AI Summer School speakers** (1671-1674): Tan Zhi Xuan (NUS, ex-MIT, cooperative intelligence), Michael P. Wellman (U Michigan, game-theoretic AI, AAAI/ACM Fellow), Kate Larson (U Waterloo, multi-agent systems, 2025 AAAI Fellow, DeepMind affiliate), Vincent Conitzer (CMU/Oxford, AI ethics, computational social choice, PECASE recipient).
- **ACS group at Charles University** (1675-1680): Charles University (institutional home), Jan Kulveit (PI, ex-FHI, gradual disempowerment), Raymond Douglas (senior researcher, ex-SERI MATS, U Toronto affiliate), Theia Vogel (LLM persona research, repeng creator), Ondrej Havlicek (cognitive scientist turned LLM psychology), Annie Stephenson (applied physics PhD, complex systems).
- **ACS affiliate** (1681): Nora Ammann (ARIA Safeguarded AI Programme Director, PIBBSS co-founder).
- **IAPS** (1682): Jenny Marron (Executive Director, ex-NSC/State Dept).

**Category correction:**
- 1674 Vincent Conitzer: Researcher -> Academic (tenured professor at CMU and Oxford, primary role is academic)

## Changes

| ID | Name | Type | Confidence | Regulatory | Risk | Notes |
|----|------|------|-----------|------------|------|-------|
| 1671 | Tan Zhi Xuan | person | 4 | Moderate | Serious | NUS Presidential Young Professor; ex-MIT PhD; CoSI lab; cooperative intelligence, Bayesian alignment, probabilistic programming |
| 1672 | Michael P. Wellman | person | 5 | Moderate | Serious | U Michigan Lynn A. Conway Professor; strategic reasoning, game-theoretic AI; AAAI+ACM Fellow; 2026 IFAAMAS award; FAR.AI/CHAI |
| 1673 | Kate Larson | person | 5 | Moderate | Serious | U Waterloo professor, Pasupalak AI Fellow; multi-agent systems, mechanism design; 2025 AAAI Fellow; DeepMind affiliate |
| 1674 | Vincent Conitzer | person | 5 | Moderate | Serious | CMU+Oxford professor; Foundations of Cooperative AI Lab; AI ethics, social choice; PECASE, IJCAI C&T Award; **cat corrected** |
| 1675 | Charles University | organization | 5 | Mixed/unclear | Unknown | Oldest university in Central Europe (1348); hosts ACS group; top 2% worldwide; Humane AI Net |
| 1676 | Jan Kulveit | person | 5 | Restrictive | Existential | ACS PI/co-founder; ex-FHI Oxford; gradual disempowerment thesis; PhD physics Charles U; COVID forecasting advisor |
| 1677 | Raymond Douglas | person | 4 | Restrictive | Existential | ACS senior researcher; U Toronto affiliate; ex-SERI MATS; gradual disempowerment co-author; agency and societal AI impact |
| 1678 | Theia Vogel | person | 4 | Moderate | Serious | ACS LLM persona researcher; repeng library creator; 2024 New Science Fellow; ex-SecureDNA, ex-Nous Research |
| 1679 | Ondrej Havlicek | person | 4 | Moderate | Serious | ACS researcher; PhD cognitive scientist (LMU Munich); EEG/fMRI background; AI identity/introspection; "The Artificial Self" co-author |
| 1680 | Annie Stephenson | person | 3 | Unknown | Serious | ACS researcher; PhD applied physics Harvard; postdoc Princeton; complex systems + ecology methods for LLM sociology |
| 1681 | Nora Ammann | person | 5 | Restrictive | Catastrophic | ARIA Safeguarded AI Programme Director; PIBBSS co-founder; ACS affiliate; guaranteed safe AI framework; Foresight Fellow |
| 1682 | Jenny Marron | person | 5 | Moderate | Serious | IAPS Executive Director; ex-White House NSC, State Dept; CSIS; bipartisan AI governance; translates research to policy |

## Category Corrections

- **1674 Vincent Conitzer**: Researcher -> Academic. Tenured full professor at Carnegie Mellon and Oxford, directing the Foundations of Cooperative AI Lab. Primary identity and contribution is academic.

## Edges (unchanged)

- 2056: Cooperative AI Summer School -> Tan Zhi Xuan (affiliated, "speaker")
- 2057: Cooperative AI Summer School -> Michael P. Wellman (affiliated, "speaker")
- 2058: Cooperative AI Summer School -> Kate Larson (affiliated, "speaker")
- 2059: Cooperative AI Summer School -> Vincent Conitzer (affiliated, "speaker")
- 2060: ACS -> Charles University (affiliated, "interdisciplinary research group at Charles University")
- 2061: Jan Kulveit -> ACS (employer, "Principal Investigator")
- 2062: Raymond Douglas -> ACS (employer, "Senior Researcher")
- 2063: Theia Vogel -> ACS (employer, "LLM Psychology and Sociology Researcher")
- 2064: Ondrej Havlicek -> ACS (employer, "LLM Psychology and Sociology Researcher")
- 2065: Annie Stephenson -> ACS (employer, "LLM Psychology and Sociology Researcher")
- 2066: ACS -> Nora Ammann (affiliated, "Research Affiliate")
- 2070: Jenny Marron -> IAPS (employer, "Executive Director")

## Sources

- ztangent.github.io, comp.nus.edu.sg/cs/people/tanzx, arxiv.org/pdf/2408.16984, theblockchainsocialist.com
- en.wikipedia.org/wiki/Michael_Wellman, cse.engin.umich.edu, strategicreasoning.org, far.ai/about/people/michael-wellman
- en.wikipedia.org/wiki/Kate_Larson_(computer_scientist), cs.uwaterloo.ca/~klarson, uwaterloo.ca/computer-science/news
- cs.cmu.edu/~conitzer, oxford-aiethics.ox.ac.uk/vincent-conitzer-0, futureoflife.org/ai-researcher-vincent-conitzer, arxiv.org/abs/2404.10271
- cuni.cz, mff.cuni.cz, acsresearch.org/about, ai4europe.eu
- acsresearch.org/team, alignmentforum.org/users/jan_kulveit, arxiv.org/abs/2501.16946, gradual-disempowerment.ai
- raymonddouglas.co.uk/about, raymonddouglas.co.uk/research, alignmentforum.org/users/raymond-douglas
- vgel.me, acsresearch.org/team
- acsresearch.org/team, linkedin.com/in/ohavlicek, ondrejhavlicek.com/about
- acsresearch.org/team
- nora-ammann.replit.app, pibbss.ai, foresight.org/people/nora-ammann, aria.org.uk, podcast.futureoflife.org
- iaps.ai/jenny-marron, iaps.ai/news/iaps-leadership-announcements, csis.org/people/jennifer-marron, justsecurity.org/author/marronjenny
