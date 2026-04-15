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

**Add resource_url (26):** ✅ Done. 25 URLs added (635 already had one). 633 also renamed from "Trump AI Action Plan (Jan 2025)" → "Trump AI Action Plan (July 2025)" with `resource_title` set to the official title *Winning the Race: America's AI Action Plan* (the January 2025 doc was EO 14179, a different artifact).
- [x] 594 SB 53 (CA) — leginfo.legislature.ca.gov (202520260SB53)
- [x] 608 RAISE Act — nysenate.gov/legislation/bills/2025/S6953
- [x] 616 A Guide to the AI Tribes — micheljusten.substack.com
- [x] 617 The Left is Missing Out on AI — transformernews.ai
- [x] 618 AI 2027 scenario — ai-2027.com
- [x] 619 AI as Normal Technology — knightcolumbia.org
- [x] 620 Dignity in a Digital Age — Simon & Schuster
- [x] 621 The Entrepreneurial State — marianamazzucato.com
- [x] 622 Power and Progress — PublicAffairs
- [x] 623 Recoding America — recodingamerica.us
- [x] 624 Governing the Commons — Cambridge University Press
- [x] 626 Techno-Optimist Manifesto — a16z.com
- [x] 627 The Internet Con — versobooks.com
- [x] 628 Chip War — christophermiller.net
- [x] 629 Secure AI Project bills tracker — secureaiproject.org/bills-we-support/
- [x] 630 Dean Ball "How I Approach AI Policy" — hyperdimensional.co
- [x] 631 Digitalist Papers Vol. 2 — digitaleconomy.stanford.edu
- [x] 632 Alex Bores Congressional AI Framework — alexbores.nyc PDF
- [x] 633 Trump AI Action Plan — renamed to "(July 2025)"; URL → whitehouse.gov PDF
- [x] 634 Sacks federal preemption EO (Dec 2025) — whitehouse.gov/presidential-actions/2025/12/...
- [x] 635 EU AI Act — *already had eur-lex.europa.eu URL*
- [x] 636 New Consensus AI platform — newconsensus.com
- [x] 637 Secure AI Project state bill tracker — secureaiproject.org/bills-we-support/ ⚠️ *same URL as 629; these may be near-duplicates — flag for merge review*
- [x] 639 Blueprint for an AI Bill of Rights — bidenwhitehouse.archives.gov/ostp/ai-bill-of-rights/
- [x] 640 SB 1047 (CA, vetoed) — leginfo.legislature.ca.gov (202320240SB1047)
- [x] 641 Colorado AI anti-discrimination law — leg.colorado.gov/bills/sb24-205

---

## Phase 2: Sampled Issues + Expanded Sweeps

Fix the known examples, then run broader sampling to surface the rest.

**Category miscodings:** ✅ Done. 3 known org fixes + full person-category sweep across all 8 categories (752 rows scanned). Total **53 category updates** applied.
- [x] 1376 Joe Biden — *already `Policymaker`; no change needed*
- [x] 1042 Microsoft: Frontier Lab → Deployers & Platforms
- [x] 1043 Meta: Frontier Lab → Deployers & Platforms
- [x] 1041 Google: Frontier Lab → Deployers & Platforms
- [x] **Sweep (50 fixes applied):**
  - **Researcher → Academic (9):** tenured university professors miscoded as Researcher — Aaronson (1741), Weller (1142), Courville (1330), Chalmers (1352), Darrell (1311), Cardie (1449), Duvenaud (1547), Grosse (1548), Leshinskaya (1582)
  - **Policymaker → Organizer (14):** staff at advocacy nonprofits (CHT, Coefficient Giving, Secure AI Project, ENAIS, CLTR, CAP) — Mock (1203), Carlton (1204), Muehlhauser (1504), Lempel (1755), Wisor (1756), Woodside (1758), Doris (1761), Orazbekov (1637), Hobbs (1775), Whittlestone (1776), Shaffer Shane (1777), Alvarez (1778), Shahi (1779), Conner (1780)
  - **Executive → Organizer (6):** CEOs/founders of advocacy nonprofits — Miotti/ControlAI (1660), Mckenzie/AI Objectives (1577), Duettmann/Foresight (1605), Campos/SaferAI (1625), Chandaria/AI Safety Foundation (1544), Beckstead/Secure AI Project (1757)
  - **Investor → Executive (4):** actively run companies — Schmidt/Relativity Space (855), P. Collison/Stripe (1749), J. Collison/Stripe (1750), Breitman/Tezos (1751)
  - **Executive → Academic (2):** CMU professors who co-founded startups — Fredrikson (1499), Kolter (1500)
  - **Executive → Researcher (2):** research-lead roles — Fergus/FAIR (1700), Hobbhahn/Apollo (60)
  - **Policymaker → Executive (3):** former-gov now CEOs/company roles — Reinhardt (44), Kalil/Renaissance Philanthropy (43), Chhabra/Anthropic (1817)
  - **Organizer → Researcher (2):** DAIR research leads — Miceli (66), Hanna (900)
  - **Cultural figure → Academic (2):** tenured professors — Turkle/MIT (1847), Rushkoff/CUNY (1845)
  - **Investor → Academic (1):** Ito/Chiba Institute of Technology president (70)
  - **Investor → Researcher (1):** Karnofsky/Anthropic MTS (61)
  - **Academic → Executive (1):** Matheny/CEO RAND (826)
  - **Academic → Researcher (1):** Bostrom — FHI closed (847)
  - **Journalist → Academic (1):** Tufekci/Princeton (987)
  - **Policymaker → Academic (1):** Harris/UC Berkeley (14)
- [ ] **4 low-confidence flags from sweep** (defer — judgment calls):
  - 30 Paul Christiano: head of AI Safety at NIST — Researcher vs Policymaker
  - 1430 Matt Pottinger: former Deputy NSA, now FDD think tank — Policymaker vs Researcher
  - 1592 Jonas Vollmer: CFO Macroscopic Ventures grantmaker — Executive vs Investor
  - Several research-nonprofit CEOs (Redwood/FAR.AI/etc.) left as Executive per existing convention

**Stale primary_org:** ✅ Done. Both known fixes already correct in DB. Sweep of 64 persons with "former"/"formerly" in title surfaced **38 stale or missing primary_org values** (all applied in one txn).
- [x] 1006 Marco Rubio — *already `U.S. Department of State`*
- [x] 92 Yann LeCun — *already `AMI Labs`*
- [x] **Sweep (38 fixes):**
  - **Stale (replaced wrong/old org, 7):** 28 Pahlka (Civic Signals → Recoding America Fund), 42 Sacks (White House → PCAST, post-Mar 2026 czar departure), 59 Kokotajlo (CAIS → AI Futures Project), 70 Joi Ito (MIT Media Lab → Chiba Institute of Technology), 79 Husted (State of Ohio → U.S. Senate), 86 Nelson (OSTP → Institute for Advanced Study), 107 Hao (MIT Tech Review → Independent)
  - **Missing (NULL → filled, 31):** Anthropic for 822 Leike, 995 Huang; CSET for 825 Toner; RAND for 826 Matheny; Horizon Institute for 828 Zwetsloot; DeepMind for 840 Shah; Cambridge for 843 Ó hÉigeartaigh; Humane Intelligence for 844 Chowdhury; Macrostrategy Research Initiative for 847 Bostrom; a16z for 850 Casado; Relativity Space for 855 Schmidt; Slow Ventures for 858 Lessin; UK AI Security Institute for 860 Hogarth; METR for 861 Cotra; FT for 881 Heikkilä; Situational Awareness LP for 888 Aschenbrenner; Eye on AI for 893 Smith; HRW for 896 Wareham; DAIR for 900 Hanna; Thinking Machines Lab for 902 Murati; AI Now for 923 West; ORCAA for 926 O'Neil; ANSI for 930 Locascio; Yale SOM for 968 Scott Morton; Univ. Michigan for 969 Stevenson; SIEPR for 971 Toloui; Stanford GSB for 973 Athey; Harvard Kennedy for 974 Furman; Govt of Taiwan for 994 Tang; Stanford HAI for 996 Schaake; Virtual World Society for 998 Graylin
- [x] **Deferred 9 resolved via web search:**
  - 928 Lina Khan → **Columbia Law School** (Assoc. Prof. + co-director Center for Law and the Economy, Apr 2026)
  - 933 Jen Easterly → **RSAC** (CEO; also West Point Distinguished Chair)
  - 935 Margrethe Vestager → **Technical University of Denmark (DTU)** (Chair of Board of Governors since 2024)
  - 1794 Craig Martell → **Lockheed Martin** (VP & CTO, June 2025)
  - 1813 Douglas Matty → **U.S. Department of Defense** (departed CDAO Dec 2025 to lead Golden Dome missile-defense initiative; still DoD; dropped "(former)" suffix)
  - 854 Elad Gil → **Cosmic** (solo VC; Cosmic Aleph 3 fund ~$1.1B, 2025)
  - 40 Pete Buttigieg → **Independent** (no formal role; declined 2026 MI Senate run; potential 2028 presidential bid)
  - 936 Thierry Breton → **Independent** (no formal role found post-Sep 2024 EU resignation)
  - 1012 Chris Smalls → *left as Amazon Labor Union* (still co-founder; no new formal role per searches)

**Belief field misapplications (4 found — sweep importance 1–4):** ✅ Scalar fix already applied. All 4 now have `belief_ai_risk='Serious'` in the DB (verified 2026-04-14). The original flag conflated two separate fields: `belief_ai_risk` is the single overall-risk scalar (Overstated/Manageable/Serious/Catastrophic/Existential/Mixed/Unknown), while `belief_threat_models` is a comma-separated list of specific harms that *includes* a value literally named "Existential risk". The Existential tag that remains for Klein/AOC/Sanders is in `belief_threat_models`, not `belief_ai_risk`.
- [x] 67 Ezra Klein: `belief_ai_risk` already = Serious ✓ (still has "Existential risk" in `belief_threat_models` — arguably defensible given his x-risk writing)
- [x] 10 Alexandria Ocasio-Cortez: `belief_ai_risk` already = Serious ✓ (still has "Existential risk" in `belief_threat_models` — likely residue, consider removing)
- [x] 96 Bernie Sanders: `belief_ai_risk` already = Serious ✓ (still has "Existential risk" in `belief_threat_models` — likely residue, consider removing)
- [x] 36 Fran Drescher: `belief_ai_risk` already = Serious ✓ (threat_models clean: Labor displacement, Copyright/IP)
- [x] **Follow-up:** `belief_threat_models` trimmed to top-3 for the 3 flagged entities:
  - 67 Ezra Klein → `Existential risk, Loss of control, Power concentration` (kept Existential risk — defensible given his x-risk interviewing/writing)
  - 96 Bernie Sanders → `Labor displacement, Economic inequality, Power concentration` (dropped Existential risk — not a Sanders theme)
  - 10 Alexandria Ocasio-Cortez → `Labor displacement, Environmental, Power concentration` (dropped Existential risk; Environmental reflects Mar 2026 Data Center Moratorium Act)
- [ ] Sweep: sample `belief_ai_risk` and `belief_regulatory_stance` at importance 1–4, and audit `belief_threat_models` for the 3-value cap. **Audit run 2026-04-14** surfaced a much broader data-quality issue — flagged for user decision before bulk remediation:
  - **255 entities over 3-cap** (imp5=34, imp4=62, imp3=61, imp2=73, imp1=28); max observed = 10 values.
  - **141 distinct non-canonical tokens, 486 instances.** Top culprits: `National security` (136), `Weapons proliferation` (83 — maps to canon `Weapons`), `Bias/discrimination` (69), `Privacy` (50), `Unknown` (7).
  - **Several rows contain prose fragments** as "values" — entire sentences like "Research focuses on CBRN weapons risks", "Loss of control (warns about o1-style RL...)", full paragraph continuations comma-split into values. Came from an earlier enrichment pass that stuffed note-text into the field.
  - **Scope estimate**: proper normalization requires (a) token map (e.g. `Weapons proliferation`→`Weapons`; `Bias/discrimination`/`Privacy`/`National security` are not in canon — decide map-vs-drop), (b) parse malformed rows, (c) LLM-assisted top-3 pick per entity based on notes. ~255 entity-level edits.

**Factual errors in notes (5 found — sample broader):** ✅ Done for the 5 known. Sweep done; ~30 candidates flagged for follow-up (see below).
- [x] 821 Geoffrey Hinton: $700K Good Ventures gift **confirmed** (via Schwartz Reisman Institute, Jan 2026) and kept; Senate Dec 2025 testimony **could not be verified** for U.S. Senate Judiciary — claim removed; Nobel Prize 2024 added; `notes_sources` populated.
- [x] 733 Jensen Huang: Push-back on premise — the $500B figure is **Nvidia's own** four-year U.S. manufacturing buildout with TSMC/Foxconn/Wistron/Amkor/SPIL (first U.S.-made Blackwell wafers), **not Stargate**. Notes rewritten to make the partner structure explicit; AGI quote and Trump-meeting kept.
- [x] 47 Mark Zuckerberg: Notes expanded — Llama open-weights strategy, MSL formation (Jun 2025), August 2025 four-team restructure (TBD Lab/FAIR + product + infra), $1B signing bonuses, $68B 2025 capex, "personal superintelligence" framing.
- [x] 3 Marc Andreessen: Notes expanded — Techno-Optimist Manifesto (Oct 2023), e/acc alignment, "AI regulation is a form of murder" line, a16z's lead role in killing SB 1047 (stopsb1047.com, Newsom-advisor lobbyist, Wiener quote), Nov 2024 a16z–Microsoft joint anti-regulation plea.
- [x] 633 Trump AI Action Plan: Notes rewritten — clearly distinguishes the **July 23 2025** Action Plan from **EO 14179 (Jan 23 2025)** that mandated it; notes EO 14110 revocation. (Title was already corrected in Phase 1.)
- [x] **Sweep follow-ups resolved (12 fixes + 5 false positives)** — web-verified each flag:
  - **Fixed (12):**
    - 933 Jen Easterly — replaced EO 14028 (Biden's 2021 Cybersecurity EO) with EO 14110 (Biden's Oct 2023 AI EO, since rescinded by Trump's EO 14179).
    - 43 Tom Kalil — dropped fabricated "$40B" NNI figure; clarified NNI was launched at ~$500M/yr (FY2001) by Clinton in Jan 2000.
    - 376 LawZero — corrected funding from "$60M incl. Gates Foundation" to $30M from Tallinn / Schmidt / Open Phil / FLI; Gates Foundation removed (not a funder).
    - 764 Shield AI — updated stale "seeking $1B at $12B" to actual March 2026 close ($2B round, $12.7B post-money, $540M+ revenue projection).
    - 888 Leopold Aschenbrenner — clarified $5.5B is *disclosed 13F equity exposure*; AUM ~$1.5B.
    - 940 Cory Doctorow — corrected book title to "The Reverse Centaur's Guide to **Life After AI**" (FSG/Verso, June 23 2026).
    - 1008 Palmer Luckey — replaced "Anduril valued at $14B (Aug 2024)" with current $30.5B (June 2025) and $60B target round (March 2026).
    - 1058 Anduril Industries — kept $20B Army contract (verified) but added nuance: 10-year IDIQ ceiling, first task order $87M; added 2025 valuation/revenue.
    - 1176 College of Connected Computing — fixed temporal contradictions ("graduate programs began fall 2026" → "scheduled to begin fall 2026"; dropped "expected spring 2026").
    - 1281 USC Marshall + 1282 Geoff Garrett — harmonized: $4M = $2M Knight + $2M USC Marshall match; both records now consistent.
    - 1346 Greg Brockman — corrected PAC framing: $125M+ raised (not $100M), Brockman a major donor ($12.5M with wife) not co-founder.
    - 1839 Shirin Ghaffary — replaced bogus "OpenAI $110B raise in 2025" with actual March 2026 $122B round at $852B valuation.
  - **False positives (5) — claims verified accurate, no change:**
    - 1377 SpaceX — Feb 2026 SpaceX–xAI merger creating $1.25T entity is **real** (CNBC, Bloomberg, TechCrunch all report).
    - 63 Joshua Kushner / 1404 Thrive Holdings — Thrive's $1B in OpenAI at $285B valuation in Dec 2024 is **confirmed** (CNBC).
    - 1823 Joel Kaplan — Meta's $600B AI infrastructure push announced at Davos 2026 is **confirmed** (CNBC, podcasts).
    - 922 Alexandra Reeve Givens — Jan 14 2026 House Education & Workforce testimony "Building an AI-Ready America" is **confirmed** (CDT, official transcript).
    - 1660 Andrea Miotti — testimony before Canada's Access to Information, Privacy and Ethics Committee is **confirmed** (openparliament.ca).

---

## Phase 3: Backfill Missing Required Data

Prioritize by importance (5 → 1).

**Importance=5 gaps (first):** ✅ Done. Re-verified against DB (2026-04-14): 10 of 11 were already filled during earlier enrichment passes; only Kara Swisher (886) actually still had a NULL `primary_org`. One update applied.
- [x] 1007 Andrej Karpathy — *already `Eureka Labs`*
- [x] 1103 Donald Trump — *already has title + `Trump administration`*
- [x] 1476 Elizabeth Warren — *already has title + `United States Senate`*
- [x] 821 Geoffrey Hinton — *already `University of Toronto`*
- [x] 835 Ilya Sutskever — *already `Safe Superintelligence Inc.`*
- [x] 1223 Jeff Dean — *already has title + `Google DeepMind`*
- [x] 1366 John M. Jumper — *already has title + `Google DeepMind`*
- [x] 1425 John Thune — *already has title + `United States Senate`*
- [x] 886 Kara Swisher — set `primary_org='Vox Media'` (matches org entity 869; Vox Media produces both *Pivot* and *On with Kara Swisher*)
- [x] 1305 Mike Johnson — *already has title + `U.S. House of Representatives`*
- [x] 938 Yuval Noah Harari — *already `Sapienship`*

**High-importance orgs missing influence_type:** ✅ Done. Values chosen to match peer-org patterns in each category (no formal canon for this field — it's free-text, multi-valued, comma-separated).
- [x] 1041 Google → `Builder, Decision-maker, Funder/investor` (matches Amazon pattern)
- [x] 1042 Microsoft → `Builder, Decision-maker, Funder/investor` (major OpenAI funder + platform builder)
- [x] 1043 Meta → `Builder, Decision-maker` (Llama builder + platform decisions; not an outside AI investor at Google/MSFT scale)
- [x] 1031 White House → `Decision-maker, Implementer` (matches DoD/DHS/DoJ pattern)
- [x] 1059 The New York Times → `Narrator, Organizer/advocate` (matches Narrator pattern of WSJ/WaPo/FT + advocate via OpenAI copyright suit)
- [x] **Follow-up (broader data-quality issue): Normalize `influence_type` to canon.** ✅ Done. Canon was already in `docs/canon.md:73-87` (and ONBOARDING.md:896-906); enriched canon.md with descriptors. Sweep identified **19 non-canonical tokens across 65 rows** out of 1,378. All 65 updated via explicit mapping (e.g. `Electoral spending` → `Funder/investor, Organizer/advocate` for PACs; `Regulator` → `Decision-maker` per canon description; `Product/platform`/`Industry`/`Market leader`/`Infrastructure provider` → `Builder`; `Litigation`/`Lobbyist`/`Policy advocate` → `Organizer/advocate`; `Research/academic`/`Research/education hub`/`Research output` → `Researcher/analyst`; `Funder`/`Funder/donor`/`Funder/grantor`/`Capital allocation`/`Research enabler` → `Funder/investor`; `Product deployment` → `Implementer`). Also fixed separator spacing (`X,Y` → `X, Y`) and deduped repeated tokens. **Result: 0 non-canon tokens remaining, 9 distinct tokens in use (matching canon exactly).**

**Bulk backfill (by importance tier):** ✅ Done. Re-counted 2026-04-14 start state: 371 person titles, 470 person primary_orgs, 259 org websites, 50 unmatched-text values.
- [x] Fill `title` for persons — **all done (369/371 filled)**. Remaining 2 are genuinely indeterminate edge cases.
- [x] Fill `primary_org` for persons — **all done (468/470 filled)**.
- [x] Fill `website` for orgs — **254/259 filled**. 5 skipped as defunct/no web presence: 1609 The Operating Group, 1400 Jukedeck, 767 NoHarm, 1434 AT&T Bell Laboratories (successor = Nokia Bell Labs, distinct entity), 1114 Element AI (ServiceNow acquisition 2020).
- [x] Reconcile unmatched `primary_org` text — 20 alias renames applied (46 rows): `MIT`→`Massachusetts Institute of Technology` (11), `U.S. Senate`→`United States Senate` (6), `a16z`→`Andreessen Horowitz (a16z)` (5+1), `U.S. Department of Defense`→`Department of Defense` (3), OSTP variants (4), METR/MIRI/DAIR/CSET/NYT/UC Berkeley long-form unifications, etc.
- [ ] **Follow-up — post-backfill unmatched orgs (162 rows, 108 distinct values).** Agents filled many legitimate orgs that aren't yet in the entity table (Wharton 7, Institute for AI Policy and Strategy 6, MIT Sloan 4, Alignment Research Center 3, Rotman School 3, Coefficient Giving 5, etc.). 25 rows are "Independent" + 5 are "Unknown" — both are legitimate text values and shouldn't be orgs. Remaining ~130 rows are real orgs that should likely be created as org entities — **requires user decision on whether to bulk-create**.
- Method: two passes — imp 4-5 via 2 parallel research agents, imp 1-3 via 9 parallel agents. Most values extracted from existing QC'd notes; web-search used sparingly (only when notes silent on title/org, and for all org websites). 2-step DB apply per pass with sanity-check (name verification → rollback-on-mismatch → batch UPDATE → commit).
- Notes for review: Joe Biden→`Independent`; DeSantis→`State of Florida`; Spencer Cox→`State of Utah`; Tom DiNapoli→`New York State`; Armstrong→`Independent` (xAI→?, Apr 2026); Lindsey Raymond→`Microsoft Research` (joins MIT summer 2026); Jonathan Kanter→`Washington University School of Law` (post-DOJ); Pieter Abbeel→`UC Berkeley` (+Amazon AGI in title); Ibrahim→Chief AI Readiness Officer at Google DeepMind; Turek→`STR` (post-DARPA Oct 2025); Mazzocchi→`Department of Commerce` (title already had it); Senate Commerce Committee appears as two entities (1148, 1428) — **flag for dedup pass**; Princeton AI Lab (1584) and The Princeton Laboratory for AI (1139) are duplicates — **flag for dedup**.

---

## Phase 4: Connectivity

**Importance=5 with 0–1 edges (21):**
Connectivity sweep 2026-04-14: 17 edges added via `qc-connectivity-sweep`. All 15 listed entities now have ≥2 edges except 735 Andy Jassy (no AWS entity to link to — employer→Amazon is already in place).
- [x] 643 Human Compatible — author: Stuart Russell (1→643)
- [x] 635 EU AI Act — publisher: European Commission (915→635)
- [x] 633 Trump AI Action Plan — publisher: White House (1031→633)
- [x] 647 Superintelligence — author: Nick Bostrom (847→647)
- [x] 1169 Trump administration — member: Donald Trump (1103→1169, role=President)
- [x] 1223 Jeff Dean — employer: Google DeepMind (1223→146, Chief Scientist)
- [x] 1305 Mike Johnson — member: U.S. House (1305→1028, Speaker)
- [x] 1725 ASML — partner: TSMC (1725→740, EUV supply)
- [x] 740 TSMC — covered by ASML partner edge (now 2 edges)
- [x] 708 Leading the Future — supporter: Greg Brockman (1346→708, co-founder/donor)
- [x] 1338 Public Investment Fund — member: Mohammed bin Salman (1339→1338, Chairman)
- [x] 550 NIST AI RMF — supporter: White House (1031→550, EO 14110 direction)
- [x] 549 Statement on AI Risk — authors/signatories: Hinton, Bengio, Altman, Hassabis, Amodei (821, 29, 18, 33, 8 → 549) — now 6 edges
- [ ] 735 Andy Jassy — still at 1 edge (employer→Amazon). No AWS entity exists; skip or create AWS org later.
- [x] 1425 John Thune — member: U.S. Senate (1425→1027, Majority Leader)

**Unclassified edges / orphans:**
- [x] Classify 164 remaining `affiliated` edges — **done 2026-04-14**. Final count was 171 (164 `affiliated` + 7 `affiliated_with`). Rule-based classifier + manual review flagged **55 spurious** edges (deleted) and **116 legit** (reclassified). Spurious edges were biographical "affiliations" where the `role` text named an entirely different org than the `target` (e.g., "U.S. Senator, HI" → The Verge, "CSO, Anthropic" → Senate AI Working Group, "Stanford HAI" → Tsinghua, "Director" for Hendrycks → Campaign for AI Safety instead of Center for AI Safety). Reclassification distribution: 48 `member`, 38 `partner`, 21 `employer`, 7 `publisher` (source/target flipped), 2 `parent_company` (fiscal sponsor). Post-reclassification dedup removed 10 edges that collided with pre-existing canonical edges. 58 duplicate (src,tgt,type) groups pre-date this work and remain for a future dedup pass. 0 `affiliated`/`affiliated_with` edges remain in DB.
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
