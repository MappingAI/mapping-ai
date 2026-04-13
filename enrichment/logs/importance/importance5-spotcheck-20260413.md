# Importance=5 QC Spot-Check

**Date:** 2026-04-13
**Source ratings:** `logs/importance/importance_ratings_{persons,orgs,resources}.csv`
**Scope:** all 114 entities rated `importance=5` (39 persons + 65 orgs + 10 resources)
**Method:** pulled full DB rows, cross-checked against training-data knowledge (no external web calls)

---

## 0. Stale CSV entries (ratings reference deleted rows)

Both IDs below have an `importance=5` row in the ratings CSV but no longer exist in `entity`. Likely resolved by an earlier dedup pass; the CSVs just weren't updated.

| ID | Name (CSV) | Status |
| -: | ---------- | ------ |
| 862 | The New York Times | deleted (id=1059 survives) |
| 1742 | Stuart J. Russell | deleted (id=1 survives) |

**Action:** drop these two rows from the ratings CSVs (or regenerate them from the current `entity` table).

---

## 1. Critical — factual / placeholder problems

### 1a. "TEST DATA" placeholder notes never replaced (3 resources)

Notes begin with the literal string `TEST DATA —`. These were seed stubs that never got enriched.

| ID | Resource | Current notes |
| -: | -------- | ------------- |
| 643 | Human Compatible | `TEST DATA — Foundational text on AI alignment for general audience` |
| 550 | NIST AI Risk Management Framework | `TEST DATA — De facto standard for AI risk management in US industry` |
| 549 | Statement on AI Risk | `TEST DATA — One-sentence statement signed by hundreds of AI researchers and public figures` |

**Action:** write real notes for all three.

### 1b. Resource date likely wrong — `id=633 Trump AI Action Plan (Jan 2025)`

The name says "Jan 2025" but per `id=1169 Trump administration` notes (in this same DB) the **"America's AI Action Plan"** from OSTP was released **July 2025**. The January 2025 action was `EO 14179 "Removing Barriers to American Leadership in AI"`, which *initiated* the plan. Either the resource name is wrong or it's conflating two documents. `resource_url` is also null, making it hard to disambiguate.

**Action:** rename to "America's AI Action Plan (July 2025)" and add URL, OR retitle to the EO 14179 name if that's what's intended.

### 1c. Resource `id=635 EU AI Act` — `resource_url=null`

The canonical Regulation (EU) 2024/1689 URL is public. Importance=5 resource shouldn't have a null URL.

### 1d. Likely hallucinated specifics — `id=821 Geoffrey Hinton`

Notes claim: *"Testified to Senate Judiciary Committee in December 2025 and receives funding from Good Ventures foundation ($700,000) to continue AI safety advocacy work."*
I can't substantiate either detail from training knowledge. The $700K-from-Good-Ventures-to-Hinton-personally claim in particular smells wrong (Good Ventures funds orgs, not individual professors). **Verify or remove.**

### 1e. Likely conflation — `id=733 Jensen Huang`

Notes claim: *"Committed to building $500 billion in AI supercomputers during Trump's term to reindustrialize America."*
$500B is the **Stargate** figure (SoftBank + OpenAI + Oracle, with Nvidia as chip supplier) — not Nvidia's own commitment. Rewrite to reflect Nvidia's role as supplier/partner.

### 1f. Odd notes — `id=47 Mark Zuckerberg`

Notes lead with *"Mark Zuckerberg is building an artificial intelligence agent to help him perform his executive duties autonomously"* and spend two sentences on his wife/daughters. Very thin for an importance=5 executive. No mention of Meta's open-source Llama strategy, lobbying posture, Superintelligence Labs push, or his personal $ commitments. **Rewrite.**

### 1g. Shallow notes — `id=3 Marc Andreessen`

Notes are biographical only (Netscape, Mosaic, net worth). Missing **the entire reason he's rated 5**: the 2023 Techno-Optimist Manifesto, a16z's aggressive AI-policy lobbying, Little Tech Agenda, opposition to SB 1047, role co-leading *Leading the Future* PAC. **Rewrite.**

---

## 2. High — category / role miscoding

| ID | Entity | Current | Should be | Reason |
| -: | ------ | ------- | --------- | ------ |
| 1376 | Joe Biden | category=`Executive` | `Policymaker` | He's a former POTUS, not a corp exec. "Executive" in this schema = corporate executives. |
| 1042 | Microsoft | category=`Frontier Lab` | `Deployers & Platforms` | Microsoft funds & deploys OpenAI; their own in-house frontier lab (MAI) is newer/smaller. Azure/Copilot/M365 = deployer. |
| 1043 | Meta | category=`Frontier Lab` | `Deployers & Platforms` (or rely on `Meta AI` id=204 for the lab role) | Same argument — Meta-the-corp is a deployer; Meta AI / FAIR is the lab. |
| 1041 | Google | category=`Frontier Lab` | `Deployers & Platforms` (or dedup w/ DeepMind) | Google DeepMind (id=146) is already coded as Frontier Lab. Coding Google *again* as Frontier Lab double-counts. |
| 1006 | Marco Rubio | primary_org=`U.S. Senate` | `U.S. Department of State` | Title says he's Sec of State 2025–present; primary_org should follow current role. |
| 92 | Yann LeCun | primary_org=`Meta AI` | `AMI Labs` (Advanced Machine Intelligence Labs) | Title literally says "(former)" for Meta AI. |

---

## 3. High — belief_ai_risk = `Existential` applied too liberally

`Existential` should denote species-level x-risk concern. These four entries use it for industry-specific or job-loss framings:

| ID | Person | Their actual AI concern | Suggested |
| -: | ------ | ----------------------- | --------- |
| 67 | Ezra Klein | Nuanced — has written favorably of capability acceleration ("Abundance"), skeptical of both doomers and accelerationists | `Serious` or `Mixed/nuanced` |
| 10 | Alexandria Ocasio-Cortez | Labor displacement, deepfakes, data-center moratorium, antitrust — **not** x-risk | `Serious` |
| 96 | Bernie Sanders | Worker displacement, 32-hour work week, inequality — **not** x-risk | `Serious` |
| 36 | Fran Drescher | Actor likeness rights / industry survival — uses "existential" rhetorically *for the acting profession*, not humanity | `Serious` |

(Genuinely existential voices in this set — Bengio, Hinton, Russell, Amodei, Sutskever, Harari — are fine.)

Also worth re-checking:
- **id=1 Stuart Russell `reg=Restrictive`** — he advocates "provably beneficial AI" + regulatory oversight; `Precautionary` matches his writing better than `Restrictive`.
- **id=140 OpenAI `reg=Light-touch`** — captures their 2024–25 lobbying tilt (SB 1047 opposition, pre-emption push) but misses their historical advocacy (Altman Senate testimony, compute-threshold licensing). Could go `Mixed/unclear`.

---

## 4. Medium — near-duplicate conceptual entities (all rated 5)

Three clusters where multiple importance=5 nodes cover effectively the same turf. Not necessarily wrong to keep both, but worth deciding which is the "canonical" node and whether the other should drop to 4.

| Cluster | Entities (id) | Note |
| ------- | ------------- | ---- |
| Google/Alphabet/DeepMind | 1041 (Google) + 1225 (Alphabet) + 146 (Google DeepMind) | Three imp=5 nodes. Alphabet is holding co; Google is op co; DeepMind is the lab. Likely want Alphabet=3–4, Google=4, DeepMind=5. |
| Meta corp vs Meta AI | 1043 (Meta) + 204 (Meta AI) | Keep one at 5. Meta AI is the policy-relevant node. |
| US executive branch | 1031 (White House) + 1169 (Trump administration) + 345 (OSTP) | Three overlapping imp=5. "Trump administration" is time-bounded; "White House" is institution; OSTP is sub-unit. Consider: keep OSTP=5 + one of the other two. |

---

## 5. Medium — missing fields on importance=5 entities

### Persons missing `title` (7)

Every importance=5 person should have a title line. These are blank:

| ID | Name | Suggested title |
| -: | ---- | --------------- |
| 1376 | Joe Biden | `46th President of the United States (2021–2025)` |
| 1103 | Donald Trump | `47th President of the United States (2025–present)` |
| 1476 | Elizabeth Warren | `U.S. Senator, Massachusetts (2013–present)` |
| 1425 | John Thune | `Senate Majority Leader (2025–present); U.S. Senator, South Dakota` |
| 1305 | Mike Johnson | `Speaker of the U.S. House of Representatives` |
| 1223 | Jeff Dean | `Chief Scientist, Google DeepMind & Google Research` |
| 1366 | John M. Jumper | `Director, Google DeepMind; 2024 Nobel Laureate in Chemistry (AlphaFold)` |

### Persons missing `primary_org` (12)

Hinton, Harari, Biden, Swisher, Trump, Warren, Thune, Johnson, Karpathy, Sutskever, Dean, Jumper. Suggested fills:

| ID | Name | Suggested primary_org |
| -: | ---- | --------------------- |
| 821 | Hinton | University of Toronto |
| 938 | Harari | Sapienship (or Hebrew University of Jerusalem) |
| 1376 | Biden | (none — former POTUS, no active org) |
| 886 | Swisher | (self-employed — or "Vox Media Podcast Network") |
| 1103 | Trump | White House (or "Trump administration") |
| 1476 | Warren | United States Senate |
| 1425 | Thune | United States Senate |
| 1305 | Johnson | U.S. House of Representatives |
| 1007 | Karpathy | Eureka Labs |
| 835 | Sutskever | Safe Superintelligence Inc. (SSI) |
| 1223 | Dean | Google DeepMind |
| 1366 | Jumper | Google DeepMind |

### Orgs missing `influence_type` (21)

Acceptable as null for ~7 universities (Harvard/MIT/Princeton/Stanford/Berkeley/Cambridge/Oxford — institutional roles are too broad).
**Should not be null** for these importance=5 orgs:
Palantir, Tesla, Google, Meta, Microsoft, EU, UN, US Senate, US House, White House, NYT, CFR, BlackRock, Gates Foundation.

### Resources missing `resource_url` (2)

- 635 EU AI Act
- 633 Trump AI Action Plan (Jan 2025)

---

## 6. Summary counts

| Severity | Count | Category |
| -------- | ----: | -------- |
| Critical | 3 | TEST DATA notes (643, 550, 549) |
| Critical | 2 | Stale CSV rows for deleted IDs (862, 1742) |
| Critical | ~5 | Factual errors / likely hallucinations (Hinton funding, Huang $500B, Zuck notes, Andreessen thin notes, Trump AI Action Plan date) |
| High | 6 | Category / primary_org miscodes (Biden, Microsoft, Meta, Google, Rubio, LeCun) |
| High | 4 | belief_ai_risk=`Existential` misapplied (Klein, AOC, Sanders, Drescher) |
| Medium | 3 | Near-duplicate imp=5 clusters (Google/Alphabet/DeepMind, Meta/Meta AI, WH/Trump admin/OSTP) |
| Medium | 7 | Persons missing title |
| Medium | 12 | Persons missing primary_org |
| Medium | 14 | Orgs that should have influence_type but don't |
| Low | 2 | Resources missing resource_url |

## 7. Recommended follow-up order

1. Delete/replace the 3 `TEST DATA` resource notes (trivial SQL).
2. Fix the 2 stale CSV rows (regenerate ratings CSVs from DB).
3. Back-fill `title` + `primary_org` for the 12 flagged persons (low-token SQL patch, no research needed).
4. Flip category for Joe Biden → Policymaker; decide Microsoft/Meta/Google category.
5. Revisit `belief_ai_risk` for Klein, AOC, Sanders, Drescher.
6. Decide dedup strategy for the 3 near-duplicate clusters — rate demotions rather than deletes.
7. Rewrite the 2 notably shallow/odd person notes (Zuckerberg, Andreessen).
8. Investigate the 2 factual/conflation issues (Hinton, Huang).
9. Add URLs to the 2 resources.
