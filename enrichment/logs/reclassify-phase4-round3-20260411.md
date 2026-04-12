# Phase 4.1 Round 3 — Target-specific & Educational Rules
*Applied: 2026-04-11*

## Summary

Added two new rule classes to `scripts/reclassify_affiliated.py` and
applied them live. 44 more affiliated/affiliated_with edges reclassified
deterministically, leaving 230 for manual review.

## New Rules

### `--target-specific` (25 edges)

Hand-coded mapping of `(source_category, target_id)` → canonical edge type
for well-known orgs where the relationship is clear from source category alone
(role typically describes the person's other job, not the relationship).

| source_cat      | target_id | target                      | → edge_type |
| --------------- | --------: | --------------------------- | ----------- |
| Policymaker     | 166       | Senate AI Working Group     | member      |

Also: any `org → org` edge with `role = 'alumni workplace'` → `collaborator`.

### `--role-relationship` (19 new matches from expanded patterns)

- **Educational detector** (`_is_educational_role`): catches `PhD`, `Ph.D.`,
  `BA graduate`, `B.S. and M.S. student`, `BTech`, `Law School graduate`,
  `PhD Candidate`, `Graduate Research Assistant`, `Bachelor of Science`,
  `former student`, `part time student`, `sociology graduate`, etc.
  Checked **before** the `fmr|former` exclusion (historical is expected here).
- **Committee member / senior member**: regex now matches `Committee Member`,
  `Senior member`, `Founding member`, etc.
- **Vice-chair hyphen fix**: `vice-chair` now matches alongside `vice chair`.

## Edges Reclassified

| Edge ID | New Type | Role | Source → Target |
| ------: | -------- | ---- | --------------- |
| 2207 | collaborator | alumni workplace | BlueDot Impact → Anthropic |
| 2208 | collaborator | alumni workplace | BlueDot Impact → Google DeepMind |
| 2209 | collaborator | alumni workplace | BlueDot Impact → UK AI Security Institute |
| 40 | member | U.S. Senator, IA | Joni Ernst → Senate AI Working Group |
| 43 | member | U.S. Senator, TN | Marsha Blackburn → Senate AI Working Group |
| 44 | member | U.S. Senator, IN | Todd Young → Senate AI Working Group |
| 45 | member | U.S. Senator, NH | Maggie Hassan → Senate AI Working Group |
| 46 | member | U.S. Senator, NM | Ben Ray Luján → Senate AI Working Group |
| 47 | member | U.S. Senator, WA | Maria Cantwell → Senate AI Working Group |
| 48 | member | U.S. Senator, KS | Jerry Moran → Senate AI Working Group |
| 52 | member | U.S. Senator, HI | Brian Schatz → Senate AI Working Group |
| 59 | member | U.S. Senator, MA | Ed Markey → Senate AI Working Group |
| 72 | member | U.S. Senator, SD | Mike Rounds → Senate AI Working Group |
| 73 | member | U.S. Senator, VT | Bernie Sanders → Senate AI Working Group |
| 77 | member | U.S. Senator, NJ | Cory Booker → Senate AI Working Group |
| 81 | member | U.S. Senator, NM | Martin Heinrich → Senate AI Working Group |
| 82 | member | U.S. Senator, DE | Chris Coons → Senate AI Working Group |
| 83 | member | U.S. Senator, MI | Gary Peters → Senate AI Working Group |
| 84 | member | CA State Senator | Scott Wiener → Senate AI Working Group |
| 86 | member | U.S. Senator, TX | Ted Cruz → Senate AI Working Group |
| 87 | member | U.S. Senator, CO | John Hickenlooper → Senate AI Working Group |
| 92 | member | U.S. Senator, WY | Cynthia Lummis → Senate AI Working Group |
| 94 | member | U.S. Senator, NV | Jacky Rosen → Senate AI Working Group |
| 96 | member | U.S. Senator, CT | Richard Blumenthal → Senate AI Working Group |
| 97 | member | U.S. Senator, VA | Mark Warner → Senate AI Working Group |
| 767 | member | Former PhD student | Stuart Russell → Stanford University |
| 798 | member | Ph.D. graduate | Yoshua Bengio → McGill University |
| 800 | member | BA graduate, Honorary Fellow | Stuart Russell → University of Oxford |
| 1114 | member | Committee Member | Andy Kim → Senate Commerce, Science, and Transporta |
| 1185 | member | B.S. and M.S. student | Ian Goodfellow → Stanford University |
| 1250 | member | former student | Sam Altman → Stanford University |
| 1294 | member | Graduate Research Assistant | Paul Christiano → UC Berkeley |
| 1321 | member | PhD Candidate | Timnit Gebru → Stanford University |
| 1387 | member | Bachelor of Science (B.Sc.), Mathematica | Joanne Jang → Stanford University |
| 1413 | member | BTech in Computer Science graduate | Sayash Kapoor → Indian Institute of Technology, Kanpur |
| 1430 | member | Ph.D. student | Marius Hobbhahn → University of Tuebingen |
| 1456 | member | sociology graduate | Milagros Miceli → Universidad de Buenos Aires |
| 1497 | member | Senior member | Jerry Moran → Senate Committee on Commerce, Science an |
| 1541 | member | Law School graduate (J.D. 1980) | Mark Warner → Harvard University |
| 1547 | member | Law degree graduate | Greg Abbott → Vanderbilt University |
| 1586 | member | Bachelor of Science in Industrial & Labo | Alex Bores → Cornell University |
| 1608 | member | graduate student | Yejin Choi → Cornell University |
| 1664 | member | part time student | Don Beyer → George Mason University |
| 1680 | member | vice-chair | Jay Obernolte → Congressional AI Caucus |

## Current Edge Type Counts (post-round-3)

| edge_type | count |
| --------- | ----: |
| employer | 632 |
| member | 283 |
| collaborator | 268 |
| affiliated | 223 |
| founder | 208 |
| partner | 161 |
| funder | 141 |
| parent_company | 124 |
| advisor | 85 |
| author | 30 |
| critic | 23 |
| supporter | 19 |
| publisher | 16 |
| affiliated_with | 7 |
| mentioned | 1 |

## Remaining 230 Unresolved (by category pattern)

| source_cat | target_cat | count |
| ---------- | ---------- | ----: |
| Academic | Academic | 23 |
| Policymaker | Government/Agency | 17 |
| Policymaker | Think Tank/Policy Org | 15 |
| AI Safety/Alignment | Academic | 11 |
| Policymaker | Academic | 9 |
| Policymaker | AI Safety/Alignment | 8 |
| Academic | VC/Capital/Philanthropy | 7 |
| Investor | Frontier Lab | 7 |
| Academic | Government/Agency | 6 |
| AI Safety/Alignment | AI Safety/Alignment | 6 |
| Cultural figure | Academic | 6 |
| None | Think Tank/Policy Org | 6 |
| Organizer | Frontier Lab | 5 |
| Organizer | Think Tank/Policy Org | 5 |
| Academic | Think Tank/Policy Org | 4 |
| Policymaker | Labor/Civil Society | 4 |
| Policymaker | VC/Capital/Philanthropy | 4 |
| Researcher | Think Tank/Policy Org | 4 |
| Executive | Frontier Lab | 3 |
| Investor | Academic | 3 |
| Investor | Think Tank/Policy Org | 3 |
| Investor | VC/Capital/Philanthropy | 3 |
| Journalist | Academic | 3 |
| Organizer | AI Safety/Alignment | 3 |
| Policymaker | Deployers & Platforms | 3 |
| Academic | Deployers & Platforms | 2 |
| Academic | Ethics/Bias/Rights | 2 |
| AI Safety/Alignment | Think Tank/Policy Org | 2 |
| Executive | Deployers & Platforms | 2 |
| Government/Agency | Government/Agency | 2 |
| Investor | Deployers & Platforms | 2 |
| Investor | Media/Journalism | 2 |
| Journalist | Think Tank/Policy Org | 2 |
| Organizer | Academic | 2 |
| Organizer | Labor/Civil Society | 2 |
| Policymaker | Frontier Lab | 2 |
| Policymaker | Media/Journalism | 2 |
| Researcher | Academic | 2 |
| Researcher | AI Safety/Alignment | 2 |
| Think Tank/Policy Org | Think Tank/Policy Org | 2 |
| Academic | AI Safety/Alignment | 1 |
| Academic | Frontier Lab | 1 |
| AI Safety/Alignment | Frontier Lab | 1 |
| AI Safety/Alignment | VC/Capital/Philanthropy | 1 |
| Cultural figure | Frontier Lab | 1 |
| Cultural figure | Media/Journalism | 1 |
| Cultural figure | Think Tank/Policy Org | 1 |
| Executive | Academic | 1 |
| Executive | AI Safety/Alignment | 1 |
| Executive | Government/Agency | 1 |
| Executive | Investor | 1 |
| Executive | Think Tank/Policy Org | 1 |
| Frontier Lab | Academic | 1 |
| Frontier Lab | Frontier Lab | 1 |
| Investor | Ethics/Bias/Rights | 1 |
| Investor | Executive | 1 |
| Journalist | AI Safety/Alignment | 1 |
| Journalist | Frontier Lab | 1 |
| Labor/Civil Society | Labor/Civil Society | 1 |
| Organizer | Ethics/Bias/Rights | 1 |
| Policymaker | Political Campaign/PAC | 1 |
| Political Campaign/PAC | Political Campaign/PAC | 1 |
| Researcher | Deployers & Platforms | 1 |
| Researcher | Government/Agency | 1 |
| Researcher | Labor/Civil Society | 1 |
| Researcher | Media/Journalism | 1 |
| Researcher | Researcher | 1 |
| Researcher | VC/Capital/Philanthropy | 1 |
| Think Tank/Policy Org | Academic | 1 |
| Think Tank/Policy Org | Government/Agency | 1 |
| VC/Capital/Philanthropy | Think Tank/Policy Org | 1 |
| None | Government/Agency | 1 |

## Cumulative Phase 4.1 Progress

- Round 1 (initial auto-reclassifier, `--all`): **95 edges**
- Round 2 (role_relationship + structural_default): **222 edges**
- Round 3 (target_specific + expanded role_relationship): **44 edges**
- **Total reclassified: 361 / 591 (61.1%)**
- **Remaining for manual review: 230** (223 affiliated + 7 affiliated_with)

## What the Remaining 230 Look Like

These are genuinely ambiguous and require either domain knowledge or a web
search per edge. Common patterns:

- **Policymaker → non-gov org** (~48 edges): senator/rep affiliated with a
  think tank, lab, or Labor/Civil Society org — often the role field just
  re-states their elected position. Per user guidance: *do not delete*;
  leave for later manual review.
- **Academic → Academic** (23): secondary affiliations where role describes
  home institution (e.g. Tim Wu → Tsinghua IAIIT, role='Columbia Law').
  Could be visiting scholar / member / collaborator — needs research.
- **Policymaker → Gov/Agency with oversight/former roles** (~17 edges):
  e.g. `Raimondo → Senate Commerce Committee, role='Former Secretary of
  Commerce'`, `Blumenthal → DOE, role='Legislative oversight'`. These are
  borderline — may be `member`, `critic`, or should be dropped entirely.
- **AI Safety org → Academic** (11): e.g. MIRI/CHAI/etc. affiliations with
  universities. Need research to distinguish member vs collaborator.
