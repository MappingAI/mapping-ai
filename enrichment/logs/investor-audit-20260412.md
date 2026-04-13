# Investor tagging audit — LIVE RUN
*2026-04-13 00:43 UTC*

## Category audit

| id | name | category | primary_org | influence_type (head) | enrichment_version |
| ---: | --- | --- | --- | --- | --- |
| 3 | Marc Andreessen | Investor | Andreessen Horowitz (a16z) | Funder/investor | v2 |
| 38 | Peter Thiel | Investor | Founders Fund | Funder/investor | v2 |
| 848 | Reid Hoffman | Investor | _NULL_ | Funder/investor | v1 |
| 849 | Vinod Khosla | Investor | _NULL_ | Funder/investor | v1 |

- All four tagged `category=Investor`: **True**
- All four lead `influence_type` with `Funder/investor`: **True**

## primary_org backfill

| id | name | before | after |
| ---: | --- | --- | --- |
| 848 | Reid Hoffman | _NULL_ | Greylock Partners |
| 849 | Vinod Khosla | _NULL_ | Khosla Ventures |

[OK] UPDATE 848 — rows affected: 1
[OK] UPDATE 849 — rows affected: 1

## Discovered edge-coverage gaps (logged for future seeding, not fixed here)

- **[849] Vinod Khosla** has 1 outgoing edge(s): employer→Khosla Ventures. Thin coverage for a major AI investor (Khosla Ventures is the largest outside investor in OpenAI). No funder edge to OpenAI or other portfolio AI cos — candidate for a future seeding pass.
- **[848] Reid Hoffman** has 1 `funder` edge(s). Missing funder edges to Greylock portfolio (OpenAI, Inflection AI) and to orgs he co-founded. Candidate for future seeding pass.

