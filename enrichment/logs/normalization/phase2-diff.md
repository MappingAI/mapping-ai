# Phase 2 Database Diff — Baseline vs Current
*Queried from mapping_ai_staging*

## 1. Edge Type Distribution

| Type | Baseline | Current | Delta |
| ---- | -------: | ------: | ----: |
| affiliated | 585 | 585 | — |
| employer | — | 589 | +589 |
| employed_by | 518 | — | -518 |
| collaborator | 239 | 265 | +26 |
| founder | — | 189 | +189 |
| funder | 17 | 141 | +124 |
| partner | — | 155 | +155 |
| partner_of | 155 | — | -155 |
| parent_company | — | 128 | +128 |
| founded | 118 | — | -118 |
| subsidiary_of | 116 | — | -116 |
| funded_by | 79 | — | -79 |
| person_organization | 72 | — | -72 |
| co_founded_with | 71 | — | -71 |
| invested_in | 45 | — | -45 |
| advisor | — | 42 | +42 |
| board_member | 36 | — | -36 |
| member | — | 36 | +36 |
| author | — | 30 | +30 |
| authored_by | 30 | — | -30 |
| advises | 26 | — | -26 |
| former_colleague | 26 | — | -26 |
| critic | 1 | 23 | +22 |
| critic_of | 22 | — | -22 |
| supporter | — | 19 | +19 |
| supporter_of | 19 | — | -19 |
| published_by | 16 | — | -16 |
| publisher | — | 16 | +16 |
| mentored_by | 15 | — | -15 |
| affiliated_with | 7 | 7 | — |
| spun_out_from | 13 | — | -13 |
| mentioned | 1 | 1 | — |
| mentor_of | 1 | — | -1 |
| **TOTAL** | **2228** | **2226** | **-2** |

## 2. Citation Artifacts in Entity Notes

| Metric | Baseline | Current |
| ------ | -------: | ------: |
| Entities with `[n]` artifacts | 316 | 0 |

## 3. Belief Field: `belief_agi_timeline`

| Value | Baseline | Current | Delta |
| ----- | -------: | ------: | ----: |
| Unknown | 297 | 297 | — |
| 5-10 years | 187 | 188 | +1 |
| 2-3 years | 97 | 97 | — |
| 10-25 years | 52 | 52 | — |
| Ill-defined | 19 | 21 | +2 |
| 25+ years or never | 7 | 7 | — |
| Already here | 2 | 2 | — |
| Ill-defined concept | 2 | 0 | -2 |

## 4. Belief Field: `belief_evidence_source`

| Value | Baseline | Current | Delta |
| ----- | -------: | ------: | ----: |
| Explicitly stated | 537 | 546 | +9 |
| Inferred | 34 | 136 | +102 |
| Inferred from actions | 94 | 0 | -94 |
| Public statements | 5 | 0 | -5 |
| Unknown | 2 | 2 | — |
| Policy proposals | 3 | 0 | -3 |
| Inferred from associations | 3 | 0 | -3 |
| Super PAC mission statement and candidate support patterns | 1 | 0 | -1 |
| Public statements, Campaign messaging | 1 | 0 | -1 |
| Campaign backing, Super PAC support | 1 | 0 | -1 |
| Campaign backing and endorsements | 1 | 0 | -1 |
| Super PAC spending, Campaign positions, Organization endorsements | 1 | 0 | -1 |
| FEC filings, candidate support patterns, stated mission | 1 | 0 | -1 |

## 5. Spot Check: Sample Entity Notes (post-cleanup)

**ID 2 — Chuck Schumer:**
> Chuck Schumer is a Democratic U.S. Senator from New York who has served since 1999 and is currently Senate Majority Leader. He led a bipartisan working group that released a 31-page AI policy roadmap ...

**ID 8 — Dario Amodei:**
> Dario Amodei (born 1983) is an American artificial intelligence researcher and entrepreneur who co-founded Anthropic in 2021 with his sister Daniela Amodei. He previously served as vice president of r...

**ID 133 — Anthropic:**
> Anthropic is an artificial intelligence company founded in 2021 by former OpenAI leaders including Dario Amodei and Daniela Amodei. The company specializes in Constitutional AI and has developed Claud...

**ID 210 — SAG-AFTRA:**
> SAG-AFTRA represents approximately 160,000 actors, announcers, broadcast journalists, dancers, DJs, news writers, news editors, program hosts, puppeteers, recording artists, singers, stunt performers,...

**ID 1031 — White House:**
> The White House released its National Policy Framework for Artificial Intelligence on March 20, 2026, outlining the Trump administration's legislative priorities for federal AI governance. The framewo...

## 6. Spot Check: Sample Edges (post-normalization)

| Edge ID | Type | Source | → | Target | Role |
| ------: | ---- | ------ | - | ------ | ---- |
| 746 | founder | Stuart Russell (person) | → | International Association for Safe & Ethical AI (IASEAI) (organization) | President |
| 797 | advisor | Yoshua Bengio (person) | → | Ian Goodfellow (person) | Mentor |
| 814 | employer | Billy Perrigo (person) | → | Time (AI coverage) (organization) | Correspondent |
| 912 | funder | Engineering and Physical Sciences Research Council (organization) | → | University College London (organization) | — |
| 944 | founder | Tristan Harris (person) | → | Center for Humane Technology (organization) | Co-Founder |
| 963 | member | Pierre Boivin (person) | → | Mila (organization) | Chairman of the Board |

