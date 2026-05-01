# Internal RDS Entity Duplicates

Found during entity overlap check (April 29, 2026).

## Confirmed Duplicates (MERGE)

| Entity A | Entity B | Status |
|----------|----------|--------|
| DAIR [#417] | DAIR Institute [#418] | MERGE - Same organization (Distributed AI Research Institute) |
| International Association for Safe and Ethical AI [#731] | International Association for Safe & Ethical AI (IASEAI) [#732] | MERGE - Same org, ampersand variant |
| MIT CSAIL [#1020] | MIT Computer Science & Artificial Intelligence Laboratory [#1019] | MERGE - Same lab, abbreviated vs full name |
| Survival and Flourishing Fund [#1403] | Survival & Flourishing Fund [#1404] | MERGE - Same fund, ampersand variant |
| Mila [#1010] | Mila - Quebec Artificial Intelligence Institute [#1012] | MERGE - Same institute, short vs long name |
| Long-Term Future Fund [#904] | LTFF [#906] | MERGE - LTFF is the abbreviation |
| ML Alignment & Theory Scholars (MATS) [#1034] | SERI-MATS [#1318] | MERGE - SERI-MATS was renamed to MATS |

## Needs Investigation

| Entity A | Entity B | Notes |
|----------|----------|-------|
| AI Research Institute on Interaction for AI assistants (ARIA) [#57] | Advanced Research + Invention Agency (ARIA) [#23] | DISTINCT ORGS - US NSF institute vs UK government agency; confirm acronym collision doesn't cause confusion |
| EA Long-Term Future Fund [#508] | Long-Term Future Fund [#904] | May be older name or variant of same fund — verify |
| Science of Trustworthy AI (Schmidt Sciences) [#1294] | AI2050 (Schmidt Sciences) [#30] | Both Schmidt Sciences programs — AI2050 is fellowship, Science of Trustworthy AI is broader initiative; may be distinct |
| Centre for the Governance of AI (GovAI) [#331] | Oxford Martin AI Governance Initiative [#1120] | GovAI originated from Oxford Martin, now independent — confirm distinct |

## Action Required

1. For MERGE cases: Use `scripts/db-operations/merge-entities.js` to merge duplicates
2. For INVESTIGATE cases: Research and confirm whether they are distinct or should be merged
3. After merging, update any edges that reference the removed entity ID
