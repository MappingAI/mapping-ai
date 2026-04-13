# Audit URL Cleanup — 2026-04-11
*Phase 3 close-out pass #2 (dead URL replacements)*

## TL;DR

The 2026-04-11 audit flagged **42 dead URLs across 34 entities**. After re-verification, only **2 URLs needed actual removal** from the DB. The other 40 fall into three categories:

1. **Already gone from DB** (2 URLs) — Rob Portman's `portman.senate.gov` and Allison Duettmann's `events.foresight.org/our-team/...` URLs are not in any current field (`notes_sources` or `edge.source_url`). They were likely cleaned in a prior pass.
2. **Bot-block false positives** (~35 URLs) — 403/429/999/406 responses from LinkedIn, Crunchbase, Axios, Congress.gov, Science.org, GovTrack, IMF, ResearchGate, Defense.gov, etc. These sites block automated crawlers but render normally in a user's browser. Not user-visible breaks.
3. **Soft failures** (~3 URLs) — 301 redirects (functional) and transient timeouts (e.g., SNU .kr domains with intermittent connection resets).

## Actual DB changes (2 URLs removed)

### [944] Stanford Digital Economy Lab
- **Removed:** `https://secure.businesswire.com/news/home/20251211080126/en/Stanford-Digital-Economy-Lab-Releases-The-Digitalist-Papers-Volume-2-The-Economics-of-Transformative-AI` (persistent timeout — redundant press release)
- **Remaining sources (3):** `digitaleconomy.stanford.edu/` (main site), `ai-and-labor-markets-what-we-know-and-dont-know/`, `Canaries_BrynjolfssonChandarChen.pdf`

### [952] Harvard Berkman Klein Center
- **Removed:** `https://cyber.harvard.edu/topics/ethics-and-governance-ai` (consistent HTTP 500 — page appears to be permanently broken on Harvard's side)
- **Remaining sources (2):** `projects/artificial-intelligence-initiative` (verified 200), `about/support` (verified 200)

## Not removed (bot blocks — still functional for users)

35 URLs across 29 entities. These return 403/429/999/406/timeout to crawlers but are live in browsers. Documenting here so we don't re-investigate.

| Domain / Issue | Affected entities | Count |
|-----------------|-------------------|------:|
| LinkedIn 999 | 1536, 1662, 1694, 1700, 1709, 1710 | 6 |
| Crunchbase 403 | 1687, 1688, 1701 | 3 |
| Axios 403 | 1365, 1439 | 2 |
| Congress.gov 403 | 1148, 1422 | 2 |
| Data & Society 403 | 906 | 3 |
| ServiceNow timeout | 1321 | 3 |
| SNU (.kr) timeout / reset | 1448 | 2 |
| OpenPhil 301 redirect | 1590 | 1 |
| Single-URL bot blocks | 914, 1127, 1185, 1192, 1221, 1330, 1409, 1418, 1420, 1441, 1451, 1510, 1692, 1701 (wellfound), 1710 (openreview) | 13 |

## Audit-flagged but not in current DB

| ID | Name | URL fragment |
|-----:|------|--------------|
| 1414 | Rob Portman | `portman.senate.gov/...` — not in notes_sources or edge.source_url |
| 1605 | Allison Duettmann | `events.foresight.org/our-team/...` — not in notes_sources or edge.source_url |

These URLs appeared in the 2026-04-11 audit but are no longer present in the DB as of this pass. No action needed.

## Why this matters

The audit's URL check runs as an unauthenticated crawler with a minimal User-Agent. Many sites (LinkedIn, Crunchbase, Congress.gov, most news sites) deploy standard bot-protection that returns 403/429/999. These are **not dead URLs from a user's perspective** — they render correctly when clicked in a browser.

Future audits should either (a) skip known bot-blocking domains, or (b) distinguish "crawler-blocked" from "genuinely broken" in the report, to avoid generating false-positive cleanup work.

## Phase 3 close-out status

- [x] Pass #1: Test deletions (5) + thin v1 expansions (12) — batch 86
- [x] Pass #2: URL cleanup — 2 real fixes applied, 35 false positives documented (this log)
- [ ] Pass #3: Resource dedup (~25 duplicates across ~8 clusters)
- [ ] Pass #4: Category corrections (ASML, AMPTP, Radical AI, EliseAI, PIT-UN, etc.)
- [ ] Pass #5: short_notes_high_confidence (8 flagged) + sample no_beliefs_high_confidence
