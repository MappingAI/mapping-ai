# QC Task List

Execution tracker for QC remediation. Source: [`logs/audits/qc-report-20260414.md`](../logs/audits/qc-report-20260414.md).

**Conventions:**
- ✓ Complete = exhaustive DB scan, just execute the fix
- ⚠️ Sampled = examples only, fix + run additional sampling to find more

---

## Phase 1: Known Complete Issues (execute directly)

No further investigation needed — lists are exhaustive.

**Merge explicit duplicates (11):** ✅ Done via `scripts/merge_qc_duplicates.py` — report: [`logs/audits/merge-qc-duplicates-20260414.md`](../logs/audits/merge-qc-duplicates-20260414.md). 9 edges redirected, 2 collisions dropped, 3 notes_sources URLs appended, 11 stub entities deleted.
- [x] 1445 President Biden → 1376 Joe Biden
- [x] 1354 Rob Long → 1353 Robert Long
- [x] 1470 Bipartisan Taskforce on AI → 1149 House Bipartisan Task Force on AI
- [x] 1238 Pentagon → 1420 Department of Defense
- [x] 1433 AMI Labs → 1432 Advanced Machine Intelligence Labs
- [x] 1467 House Science, Space, and Technology Committee → 1150 House Committee on Science Space & Tech
- [x] 1479 Commerce, Science and Transportation Committee → 1148 Senate Committee on Commerce, Science and Transportation
- [x] 1483 House Task Force on Artificial Intelligence → 1149 House Bipartisan Task Force on AI
- [x] 1484 Congressional AI Caucus → 1481 Congressional Artificial Intelligence Caucus
- [x] 1632 Distributed AI Research Institute → 875 DAIR
- [x] 1745 Open Philanthropy Project → 128 Coefficient Giving

**Rewrite TEST DATA resource notes (8):** ✅ Done. 544/545/548/551/552 had "TEST DATA — ..." placeholder notes and were rewritten from scratch (3–5 sentences each, modeled on the existing notes for 549/550/643). 549/550/643 already had proper notes and only needed `notes_sources` added. Also corrected **548** metadata: author was wrong (`RAND Corporation` → `Microsoft (Brad Smith)`), year was wrong (`2024` → `2023`), and `resource_url` replaced with the real Microsoft blog URL. All 8 now have populated `notes_sources`.
- [x] 544 Situational Awareness
- [x] 545 The AI Index Report 2024
- [x] 548 Governing AI: A Blueprint for the Future — *also fixed author/year/URL*
- [x] 549 Statement on AI Risk — *notes_sources only; notes already good*
- [x] 550 NIST AI Risk Management Framework — *notes_sources only; notes already good*
- [x] 551 Stochastic Parrots Paper
- [x] 552 The Alignment Problem
- [x] 643 Human Compatible — *notes_sources only; notes already good*

**Add resource_url (26):**
- [ ] 594 SB 53 (CA)
- [ ] 608 RAISE Act
- [ ] 616 A Guide to the AI Tribes
- [ ] 617 The Left is Missing Out on AI
- [ ] 618 AI 2027 scenario
- [ ] 619 AI as Normal Technology
- [ ] 620 Dignity in a Digital Age
- [ ] 621 The Entrepreneurial State
- [ ] 622 Power and Progress
- [ ] 623 Recoding America
- [ ] 624 Governing the Commons
- [ ] 626 Techno-Optimist Manifesto
- [ ] 627 The Internet Con
- [ ] 628 Chip War
- [ ] 629 Secure AI Project bills tracker
- [ ] 630 Dean Ball "How I Approach AI Policy"
- [ ] 631 Digitalist Papers Vol. 2
- [ ] 632 Alex Bores Congressional AI Framework
- [ ] 633 Trump AI Action Plan (name says Jan 2025 — actually July 2025; rename + URL)
- [ ] 634 Sacks federal preemption EO (Dec 2025)
- [ ] 635 EU AI Act
- [ ] 636 New Consensus AI platform
- [ ] 637 Secure AI Project state bill tracker
- [ ] 639 Blueprint for an AI Bill of Rights
- [ ] 640 SB 1047 (CA, vetoed)
- [ ] 641 Colorado AI anti-discrimination law

---

## Phase 2: Sampled Issues + Expanded Sweeps

Fix the known examples, then run broader sampling to surface the rest.

**Category miscodings (4 found — sweep remaining categories):**
- [ ] 1376 Joe Biden: Executive → Policymaker
- [ ] 1042 Microsoft: Frontier Lab → Deployers & Platforms
- [ ] 1043 Meta: Frontier Lab → Deployers & Platforms
- [ ] 1041 Google: Frontier Lab → Deployers & Platforms
- [ ] Sweep: sample Researcher, Academic, Policymaker, Journalist, Cultural figure, Investor categories for miscodings

**Stale primary_org (2 found — sweep all "former" roles):**
- [ ] 1006 Marco Rubio: U.S. Senate → U.S. Department of State
- [ ] 92 Yann LeCun: Meta AI → AMI Labs
- [ ] Sweep: query all persons with "former" in title, verify primary_org reflects current role

**Belief field misapplications (4 found — sweep importance 1–4):**
- [ ] 67 Ezra Klein: `belief_ai_risk=Existential` → Serious (nuanced on acceleration)
- [ ] 10 Alexandria Ocasio-Cortez: Existential → Serious (labor/deepfakes/antitrust)
- [ ] 96 Bernie Sanders: Existential → Serious (worker displacement/inequality)
- [ ] 36 Fran Drescher: Existential → Serious (actor likeness rights)
- [ ] Sweep: sample `belief_ai_risk` and `belief_stance` at importance 1–4

**Factual errors in notes (5 found — sample broader):**
- [ ] 821 Geoffrey Hinton: verify "$700K from Good Ventures" + "Senate testimony Dec 2025"
- [ ] 733 Jensen Huang: "$500B AI supercomputers" is Stargate (SoftBank/OpenAI/Oracle), not Nvidia
- [ ] 47 Mark Zuckerberg: thin notes — add Llama strategy, lobbying posture, Superintelligence Labs
- [ ] 3 Marc Andreessen: biographical only — add Techno-Optimist Manifesto, a16z lobbying, SB 1047 opposition
- [ ] 633 Trump AI Action Plan: rename (actually July 2025, not Jan 2025; Jan 2025 was EO 14179)
- [ ] Sweep: spot-check notes for dollar amounts, dates, and specific claims at importance 1–4

---

## Phase 3: Backfill Missing Required Data

Prioritize by importance (5 → 1).

**Importance=5 gaps (first):**
- [ ] 1007 Andrej Karpathy — primary_org
- [ ] 1103 Donald Trump — title, primary_org
- [ ] 1476 Elizabeth Warren — title, primary_org
- [ ] 821 Geoffrey Hinton — primary_org
- [ ] 835 Ilya Sutskever — primary_org
- [ ] 1223 Jeff Dean — title, primary_org
- [ ] 1366 John M. Jumper — title, primary_org
- [ ] 1425 John Thune — title, primary_org
- [ ] 886 Kara Swisher — primary_org
- [ ] 1305 Mike Johnson — title, primary_org
- [ ] 938 Yuval Noah Harari — primary_org

**High-importance orgs missing influence_type:**
- [ ] 1041 Google
- [ ] 1042 Microsoft
- [ ] 1043 Meta
- [ ] 1031 White House
- [ ] 1059 The New York Times

**Bulk backfill (by importance tier):**
- [ ] Fill `title` for 378 persons
- [ ] Fill `primary_org` for 517 persons
- [ ] Reconcile 43 `primary_org` text values that don't match an existing org (create org or update text)
- [ ] Fill `website` for 268 orgs

---

## Phase 4: Connectivity

**Importance=5 with 0–1 edges (21):**
- [ ] 643 Human Compatible (0 edges)
- [ ] 635 EU AI Act (0)
- [ ] 633 Trump AI Action Plan (0)
- [ ] 647 Superintelligence: Paths, Dangers, Strategies (0)
- [ ] 1169 Trump administration (1)
- [ ] 1223 Jeff Dean (1)
- [ ] 1305 Mike Johnson (1)
- [ ] 1725 ASML (1)
- [ ] 740 TSMC (1)
- [ ] 708 Leading the Future (1)
- [ ] 1338 Public Investment Fund (1)
- [ ] 550 NIST AI Risk Management Framework (1)
- [ ] 549 Statement on AI Risk (1)
- [ ] 735 Andy Jassy (1)
- [ ] 1425 John Thune (1)

**Unclassified edges / orphans:**
- [ ] Classify 164 remaining `affiliated` edges via web search
- [ ] Address 246 orphan entities (add edges or document why standalone is OK)
  - 105 resources (no category)
  - 63 AI Safety/Alignment orgs
  - 21 Think Tank/Policy orgs
  - 14 Academic orgs
  - 11 Labor/Civil Society orgs
  - 11 VC/Capital/Philanthropy orgs
  - 6 Media/Journalism orgs
  - 5 Cultural figures, 4 Journalists, 2 Researchers, 1 Policymaker
  - 2 Government orgs, 1 Deployer

**Near-duplicate importance=5 clusters (demote one per cluster):**
- [ ] Alphabet (1225) / Google (1041) / DeepMind (146) — keep DeepMind=5, Google=4, Alphabet=3–4
- [ ] Meta (1043) / Meta AI (204) — keep Meta AI=5, Meta corp=4
- [ ] White House (1031) / Trump admin (1169) / OSTP (345) — keep OSTP=5 + one other

---

## Phase 5: Additional QC Checks Not Yet Run

- [ ] HEAD-request all `website` and `resource_url` values to catch 404s
- [ ] Validate Twitter handles
- [ ] Validate Bluesky handles
- [ ] Edge directionality audit on edges added after Phase 4B
- [ ] Person→person edges: find + review (many should route through an org)
- [ ] Org→org edges: audit `edge_type` appropriateness
- [ ] Extract entity names from notes → surface missing entities to seed
- [ ] Location field consistency check (non-standard formats)
