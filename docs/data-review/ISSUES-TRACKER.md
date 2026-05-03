# Data Quality Issues Tracker

Generated: 2026-05-03
Last updated: 2026-05-03

---

## Review Process

This section documents how data quality reviews are conducted. The batch JSON files are gitignored (regenerable from DB), but this process is preserved for future reviews.

### 1. Export Data for Review

```bash
# Export entities and edges for review (script: scripts/export-for-review.js)
node scripts/export-for-review.js

# Split into batches for Claude context limits
cd docs/data-review
cat orgs-review.json | jq '.[0:230]' > orgs-batch-1.json
cat orgs-review.json | jq '.[230:460]' > orgs-batch-2.json
# ... etc
```

### 2. Review with Claude Web Platform

Upload each batch to Claude with this prompt structure:

> You are reviewing data for **Mapping AI** (mapping-ai.org), an interactive stakeholder map of the U.S. AI policy landscape.
>
> **Flag these serious issues only:**
> - HALLUCINATED: Factually incorrect claims, made-up entities
> - BAD_RESOLUTION: Duplicates, same entity under different names
> - MISCLASSIFIED: Blog posts/articles listed as organizations
> - NOT_AI_RELATED: Entities with no connection to AI policy
> - TOO_GENERIC: Vague names like "Investors" or "Tech Companies"
> - MISSING_RELATIONSHIP: Obvious parent/child relationships not captured
>
> **Don't flag:** Missing optional fields, minor formatting, subjective categorization disagreements, niche but real organizations you haven't heard of.
>
> **Output format:**
> ```
> **Entity**: [name] (ID: [id])
> **Type**: [error type]
> **Severity**: P0-critical | P1-serious | P2-minor
> **Description**: [what's wrong]
> **Recommendation**: [how to fix]
> ```

### 3. Triage and Fix

1. Aggregate issues from all batches into this tracker
2. Prioritize by severity (P0 → P1 → P2)
3. For each fix:
   - **Research first**: Web search to verify claims before changing data
   - **Preserve edges**: When merging duplicates, move edges to the kept entity
   - **Check constraints**: Delete submissions before entities (FK constraint)
   - **Log everything**: Add to Resolution Log below
4. Run `node scripts/audit-changes.js` to verify no orphaned edges
5. Regenerate map data: `pnpm run db:export-map`
6. Upload: `node scripts/upload-map-data.js`

### 4. Verification

```bash
# Triple-check database integrity
node scripts/audit-changes.js

# Verify map data excludes deleted/pending entities
node -e "const d=require('./map-data.json'); console.log(d.people.length, d.organizations.length)"
```

---

## Triage Philosophy

This tracker focuses on **data quality issues that would mislead users or break functionality**. We distinguish between:

- **Data errors**: Wrong info, duplicates, hallucinated entities — must fix
- **Scope questions**: "Should this entity be on the map?" — editorial decisions, lower priority

Issues are triaged by impact, not by count. A map with 900 good entities and 50 questionable ones is still useful.

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| P0-critical | 20 | Duplicates, hallucinations, test entries |
| P1-serious | 25 | Misclassified types, defunct orgs, title/org mismatches |
| P2-backlog | 40+ | Scope questions, minor cleanup, historical figures |

---

## Batches Reviewed

- [x] orgs-batch-1.json (IDs ~128-400)
- [x] orgs-batch-2.json (IDs ~400-800)
- [x] orgs-batch-3.json (IDs ~800-1700)
- [x] orgs-batch-4.json (IDs ~1700-2400)
- [x] people-batch-1.json
- [x] people-batch-2.json
- [x] people-batch-3.json
- [ ] edges batches (6 files)
- [ ] resources-review.json

---

## P0 - Critical (Must Fix Before Launch)

### Duplicates

| Issue | Entity A | Entity B | Action |
|-------|----------|----------|--------|
| 1 | EA Long-Term Future Fund (242) | Long-Term Future Fund (284) | ✓ Merged → 284 |
| 2 | TIME Magazine (276) | Time (AI coverage) (460) | ✓ Merged → 276 |
| 3 | Google Brain (1065) | Google DeepMind (146) | Keep both (parent structure) |
| 4 | FAIR (1070) | Meta AI (204) | Keep both (FAIR → Meta) |
| 5 | Senate Commerce Committee: 232, 1107, 1148, 1428 | 4 entries | ✓ Merged → 1107 |
| 6 | Princeton AI Lab (1139) vs (1584) | Same lab | ✓ Merged → 1139 |
| 7 | AISI (1358) vs CAISI (205) | Renamed 2025 | ✓ Merged → 205 |
| 8 | MATS (415) vs MATS Research (2115) | Same program | ✓ Merged → 415 |
| 9 | Pivotal Research (417) vs (2193) | Same fellowship | ✓ Merged → 417 |
| 10 | PIBBSS (418) vs Principles of Intelligence (2200) | Rebranded | ✓ Merged → 2200 |
| 11 | Public AI (540) vs Public AI Network (344) | 540 has bad data | ✓ 540 set to pending |
| 12 | National Infrastructure Fund (1340) vs (2239) | Same Saudi fund | ✓ Merged → 1340 |
| 13 | Robert Long (1353) vs Rob Long (1354) | 1354 doesn't exist | ✓ Not a duplicate |
| 14 | Matthew Salganik (1452) vs (2126) | Same professor | ✓ Merged → 2126 |
| 15 | Nate Thomas (1508) vs Buck Shlegeris (1507) | CEO conflict | ✓ Fixed: Nate is Board |

### Test/Junk Entries

| Issue | Entity | Problem | Action |
|-------|--------|---------|--------|
| 16 | Submit Test XYZ (1848) | Test form submission | ✓ Deleted |

### Hallucinated / Wrong Data

| Issue | Entity | Problem | Action |
|-------|--------|---------|--------|
| 17 | NoHarm (767) | Notes say "no evidence found" | ✓ Deleted |
| 18 | Metaplanet (1607) | Website is wrong company (Japanese Bitcoin firm) | Fix or delete |
| 19 | Public AI (540) | Website links to White House PDF, not org | Fix website URL |
| 20 | Public First (2201) | Conflates polling firm with PAC (1439) | ✓ Different entities, both valid |
| 21 | Stefano Mazzocchi (934) | Cannot verify this person exists in this role | Set to pending ✓ |

### Wrong Category

| Issue | Entity | Problem | Action |
|-------|--------|---------|--------|
| 17 | McGill AI Lab (1333) | Listed as "Frontier Lab" (same as OpenAI) | ✓ Changed to Academic |
| 18 | Luma AI (2112) | Listed as "Frontier Lab" | ✓ Changed to Deployers & Platforms |

---

## P1 - Serious (Fix Before Launch If Time)

### Misclassified Entity Types (Not an Org)

These are documents, blogs, newsletters, or tools incorrectly entered as organizations.

| ID | Name | Actually Is | Action |
|----|------|-------------|--------|
| 144 | How to pursue a career in technical AI alignment | EA Forum blog post | Remove or → Resource |
| 197 | From AI to ZI | Substack blog | Remove or → Resource |
| 384 | An Overview of the AI Safety Funding Situation | EA Forum post | Remove or → Resource |
| 328 | Steve Byrnes's Brain-Like AGI Safety | Alignment Forum post series | Remove; create Person for Byrnes |
| 142 | Cyborgism | Concept/strategy, not org | Remove |
| 184 | Narrow Path (by ControlAI) | Policy document | Remove; content belongs under ControlAI (246) |
| 201 | OpenBook | Grants database tool (defunct) | Remove or → Resource |
| 333 | AI Alignment Forum | Web forum | Add parent → Lightcone (302); consider → Resource |
| 335 | Donations List Website | Personal database | Remove or → Resource |
| 407 | The Compendium | Living document | Remove or → Resource |
| 423 | generative.ink | Personal blog | Remove or → Resource |
| 424 | ML & AI Safety Updates | Newsletter/podcast (defunct) | Remove |
| 421 | AI Safety Support Newsletter | Newsletter (discontinued) | Remove |

### Defunct Orgs Shown as Active

| ID | Name | Status | Action |
|----|------|--------|--------|
| 236 | Future of Humanity Institute | Closed April 2024 | Flag as defunct in UI |
| 372 | Global Priorities Institute | Closed 2025 | Flag as defunct |
| 420 | AI Safety Communications Centre | Inactive 2024 | Flag or remove |
| 443 | Center for AI Policy (CAIP) | Shut down Sept 2025 | Flag or remove |
| 1114 | Element AI | Acquired by ServiceNow Jan 2021 | Remove |
| 1360 | UK Frontier AI Taskforce | Transitioned to AISI Nov 2023 | Remove |
| 2137 | MosaicML | Acquired by Databricks June 2023 | Remove |
| 2313 | Vicarious | Acquired by Alphabet/Intrinsic | Remove |

### Missing Key Relationships

| Child Entity | Parent Entity | Relationship |
|--------------|---------------|--------------|
| Anthropic Institute (137) | Anthropic (133) | Division of |
| RAND CAST (1571) | RAND Corporation (152) | Center within |
| Safeguarded AI Programme (2227) | ARIA (428) | Program of |
| The Alignment Project (2286) | UK AI Security Institute (533) | Program of |

### People: Title/Org Mismatches

These people have contradictions between their title, primary_org, and notes fields. Fix before launch to avoid embarrassment.

| ID | Name | Problem | Fix |
|----|------|---------|-----|
| 43 | Tom Kalil | Title says "CTO UC Berkeley" but notes say CEO of Renaissance Philanthropy | Update title |
| 51 | Joanne Jang | Listed as OpenAI but notes say she left to start OAI Labs | Update primary_org |
| 61 | Holden Karnofsky | primary_org is Coefficient Giving but he joined Anthropic Jan 2025 | Update to Anthropic |
| 14 | David Evan Harris | primary_org is CAIS but title says UC Berkeley/California Initiative | Verify & fix |
| 92 | Yann LeCun | Title leads with "former Meta" but primary is AMI Labs | Reorder title |
| 1440 | Lisa Hansmann | Title says Foundation for American Innovation, notes say Foundry Logic | Verify & fix |
| 1530 | Matt Botvinick | Notes contradict: DeepMind employee but "joining Anthropic Institute" | Verify current role |

### People: Pseudonyms/Incomplete Names

| ID | Name | Problem | Fix |
|----|------|---------|-----|
| 1551 | NicholasKees | LessWrong username, not real name | Change to Nicholas Kees Dupuis |
| 1552 | janus | Pseudonym only, no real name anywhere | Identify or remove |
| 1579 | Brittney G | Incomplete last name | Change to Brittney Gallagher |

### People: Entity Confusion

| ID | Name | Problem | Fix |
|----|------|---------|-----|
| 2295 | Andy Ayrey | Entry conflates person with his AI bot (Truth Terminal) | Split or clarify |
| 1646/1648 | Trajectory Labs | Two different orgs share this name (Toronto nonprofit vs security startup) | Disambiguate names |

---

## P2 - Backlog (Post-Launch)

### Scope Questions: NOT_AI_RELATED

These entities use AI or are tangentially connected but aren't AI policy stakeholders. **Editorial decision**: keep, remove, or recategorize. Not blocking.

**Orgs:**
- Wild Dolphin Project (765) - marine biology with one AI project
- KoBold Metals (756) - mining company using AI
- Splice (763), Tryolabs (762), Pony.ai (754), Mobileye (748), Agility Robotics (753), Unitree (747) - AI deployers, not policy actors
- Various defense contractors: Draper Lab (2048), IvySys (2066)
- Various foundations that made one-time grants: Guggenheim (2075), Okawa (2174), Lord Foundation (2107)
- Crypto/fintech: Coinbase (1104), Delphi Ventures (1608), The Operating Group (1609)
- Small AI startups: Captions (2041), Lemni (2099), Composite (2045), Respan (2218), Pulse AI (2203), Recraft (2214)

**People:**
- Joanna Rodriguez (1337) - NRSC communications director who defended one AI ad
- Kim Jungsik (2089) - deceased Korean industrialist, one donation to Korean university in 2019
- Caroline Mehl (2042) - included only as ARI donor/partner of ARI director
- Jesse Jackson Jr. (715) - if kept, needs context about 2013 conviction (currently omitted)

### Scope Questions: TOO_GENERIC

These are overly broad entities that overlap with more specific sub-entities already in the dataset.

- Republican Party (1039), Democratic Party (1040) - too broad; specific PACs already exist
- US Senate (1027), US House (1028) - too broad; specific committees exist
- White House (1031) - overlaps with OSTP (345)
- European Union (1082) - overlaps with European Commission (915), EU AI Office (234)
- United Nations (1081) - too broad
- Top universities without specific AI programs: Louisville (1087), SUNY Albany (1089), Tulane (1092), Vanderbilt (1045), American (1088)
- German Federal Government (2040), Land Berlin (2095), Land Brandenburg (2096) - German state governments

### Missing Relationships (Lower Priority)

- Aether (145) ↔ Trajectory Labs (180) - co-location
- Mila (1113) ↔ Université de Montréal (1112) - founding relationship
- Good Ventures (1583) ↔ Coefficient Giving (128) - primary funder
- Oxford Martin School (1618) ↔ Oxford Martin AI Governance Initiative (168) - parent
- McGill sub-units (1331, 1332, 1333) ↔ McGill (1116)
- USC sub-units (1279, 1280, 1281, 1283) ↔ USC (1090)

### Name/Data Cleanup

- Coefficient Giving (128) - audit all "Open Philanthropy" references across dataset (renamed Nov 2025)
- GiveWiki (198) - check if "Impact Markets" exists elsewhere
- Responsible AI Initiative (1111) - conflates 3 different university programs
- Radical AI (1542) - name collision with AI ethics podcast
- Symbolica AI (2275) - verify official name; remove unverified claim about founder
- FAIR Laboratory UK (2300) - disambiguate from Facebook FAIR
- Schmidt Sciences (2240) vs Schmidt Futures (814) - clarify relationship

### Defunct (Lower Priority)

**Orgs:**
- Arbital (260) - shut down 2017-2018
- MLAB (202) - inactive, no future plans
- Preamble Windfall Foundation (339) - defunct
- Superlinear Prizes (340) - no longer accepting applications
- AI Alignment Awards (419) - concluded 2023
- Jukedeck (1400) - acquired 2019
- AT&T Bell Labs (1434) - historical entity
- SARC at FHI (2269) - defunct sub-initiative of closed org
- Research Network on Opening Governance (2217) - ended 2018
- VAISU (2315) - event series, not org

**People (deceased/incarcerated):**
- Allen Newell (1253) - died 1992, historical AI pioneer
- Herb Simon (1254) - died 2001, historical AI pioneer
- Max Chiswick (2127) - died Jan 2025, needs deceased flag if kept
- Sam Bankman-Fried (2231) - incarcerated, no current influence

### Resolved / Not Issues

- Dan Wang (65) - flagged as conflating 3 people, but **confirmed correct**: the China expert at Yale/Hoover, author of "Breakneck"
- Daniela Amodei (13) - Karnofsky marriage claim verified correct
- David Sacks (42) - data is internally consistent (former czar, now PCAST)

---

## Resolution Log

_Track fixes as they're made._

| Date | Issue | Action Taken | By |
|------|-------|--------------|-----|
| 2026-05-03 | Dan Wang (65) | Updated notes & primary_org to Hoover Institution | Claude |
| 2026-05-03 | Stefano Mazzocchi (934) | Set status='pending' (unverifiable) | Claude |
| 2026-05-03 | Breton/Wyden | Removed from fabricated list (events are real) | Claude |
| 2026-05-03 | Submit Test XYZ (1848) | Deleted (test entry) | Claude |
| 2026-05-03 | NoHarm (767) | Deleted (hallucinated entity) | Claude |
| 2026-05-03 | McGill AI Lab (1333) | Changed category: Frontier Lab → Academic | Claude |
| 2026-05-03 | Luma AI (2112) | Changed category: Frontier Lab → Deployers & Platforms | Claude |
| 2026-05-03 | Matthew Salganik (1452) | Merged into 2126 (moved edges, deleted 1452) | Claude |
| 2026-05-03 | Robert Long (1353) | Not a duplicate - 1354 doesn't exist, removed incorrect note | Claude |
| 2026-05-03 | Public First (2201) | Not a duplicate - 501c4 vs Super PAC are related but separate | Claude |
| 2026-05-03 | Public AI (540) | Set status='pending' (bad data: wrong website, unverifiable) | Claude |
| 2026-05-03 | Nate Thomas (1508) | Fixed title: "CEO" → "Co-founder, Board Member" (Buck is current CEO) | Claude |
| 2026-05-03 | EA Long-Term Future Fund (242) | Merged into 284 (deleted 242, no edges) | Claude |
| 2026-05-03 | Time (AI coverage) (460) | Merged into TIME Magazine (276), moved 4 edges | Claude |
| 2026-05-03 | Senate Commerce x4 | Merged 232, 1148, 1428 into 1107 (final: 17 edges) | Claude |
| 2026-05-03 | Princeton AI Lab (1584) | Merged into 1139 (formal name) | Claude |
| 2026-05-03 | AISI (1358) | Merged into CAISI (205) - org was renamed June 2025 | Claude |
| 2026-05-03 | MATS Research (2115) | Merged into MATS (415) | Claude |
| 2026-05-03 | Pivotal Research (2193) | Merged into Pivotal Research Fellowship (417) | Claude |
| 2026-05-03 | PIBBSS (418) | Merged into Principles of Intelligence (2200) - org rebranded | Claude |
| 2026-05-03 | National Infrastructure Fund (2239) | Merged into 1340 (has website) | Claude |
| | | | |

---

## Raw Review Notes

The detailed issue-by-issue notes from Claude web platform reviews are archived below for reference. These informed the triaged issues above.

<details>
<summary>Click to expand raw review notes (orgs batches 1-4)</summary>

### Orgs Batch 1 (20 issues)

**Issue 1**: How to pursue a career in technical AI alignment (ID: 144)
- Type: MISCLASSIFIED
- Severity: P1-serious
- This is an EA Forum blog post/guide, not an organization.

**Issue 2**: From AI to ZI (ID: 197)
- Type: MISCLASSIFIED
- This is a Substack blog by Robert Huben, not an organization.

**Issue 3**: An Overview of the AI Safety Funding Situation (ID: 384)
- Type: MISCLASSIFIED
- This is an EA Forum post, not an organization.

**Issue 4**: Arbital (ID: 260)
- Type: MISCLASSIFIED (defunct)
- Shut down 2017-2018, website is archive mirror.

**Issue 5**: Steve Byrnes's Brain-Like AGI Safety (ID: 328)
- Type: MISCLASSIFIED
- This is a blog post series. Create Person entity for Steve Byrnes instead.

**Issue 6**: Aether (ID: 145)
- Type: MISSING_RELATIONSHIP
- Notes say "based at Trajectory Labs" but no relationship edge exists.

**Issue 7**: EA Long-Term Future Fund (ID: 242) and Long-Term Future Fund (ID: 284)
- Type: BAD_RESOLUTION (P0)
- Same organization listed twice. Same website, same fund managers.

**Issue 8**: Anthropic Institute (ID: 137)
- Type: MISSING_RELATIONSHIP
- No parent relationship to Anthropic (133) despite being a division.

**Issue 9**: MLAB (ID: 202)
- Type: MISCLASSIFIED (defunct)
- Inactive with no future plans. Parent is Redwood Research (129).

**Issue 10**: Global Priorities Institute (ID: 372)
- Type: MISCLASSIFIED (defunct)
- Closed in 2025.

**Issue 11**: Future of Humanity Institute (ID: 236)
- Type: MISCLASSIFIED (defunct)
- Closed April 2024.

**Issue 12**: Cyborgism (ID: 142)
- Type: MISCLASSIFIED
- This is a strategy/concept, not an organization.

**Issue 13**: Narrow Path (by ControlAI) (ID: 184)
- Type: MISCLASSIFIED
- This is a policy document. Content belongs under ControlAI (246).

**Issue 14**: Preamble Windfall Foundation (ID: 339)
- Type: MISCLASSIFIED (defunct)
- Now defunct for unknown reasons.

**Issue 15**: Superlinear Prizes (ID: 340)
- Type: MISCLASSIFIED (defunct)
- No longer accepting applications as of 2026.

**Issue 16**: OpenBook (ID: 201)
- Type: MISCLASSIFIED
- Grants database/tool, no longer maintained.

**Issue 17**: AI Alignment Forum (ID: 333)
- Type: MISCLASSIFIED
- Online discussion platform managed by Lightcone Infrastructure (302).

**Issue 18**: Donations List Website (ID: 335)
- Type: MISCLASSIFIED
- Personal website/database by Vipul Naik, not an organization.

**Issue 19**: GiveWiki (ID: 198)
- Type: BAD_RESOLUTION
- Formerly "Impact Markets" — check if that exists elsewhere.

**Issue 20**: Coefficient Giving (ID: 128)
- Type: BAD_RESOLUTION
- Renamed from Open Philanthropy Nov 2025. Audit all references.

### Orgs Batch 2 (39 issues)

**Issue 1**: generative.ink (ID: 423) - Personal blog, not org
**Issue 2**: ML & AI Safety Updates (ID: 424) - Defunct newsletter/podcast
**Issue 3**: The Compendium (ID: 407) - Living document, not org
**Issue 4**: AI Safety Communications Centre (ID: 420) - Inactive as of 2024
**Issue 5**: AI Safety Support Newsletter (ID: 421) - Discontinued newsletter
**Issue 6**: AI Alignment Awards (ID: 419) - Completed program (2023)
**Issue 7**: Center for AI Policy (CAIP) (ID: 443) - Shut down Sept 2025
**Issue 8**: Time (AI coverage) (ID: 460) - Duplicate of TIME Magazine (276)
**Issue 9**: PEAKS (ID: 402) - Coworking space, not research org
**Issue 10**: Pause House (ID: 401) - Private residence, not org
**Issue 11**: NoHarm (ID: 767) - HALLUCINATED, no evidence found
**Issue 12**: Wild Dolphin Project (765) - Not AI related
**Issue 13**: KoBold Metals (756) - Mining company using AI
**Issue 14**: Splice (763) - Music platform, not AI policy
**Issue 15**: Tryolabs (762) - AI consulting, not policy
**Issue 16**: Pony.ai (754) - Autonomous driving company
**Issue 17**: Mobileye (748) - Automotive AI, not governance
**Issue 18**: Agility Robotics (753) - Robotics manufacturer
**Issue 19**: Unitree Robotics (747) - Chinese robotics company
**Issue 20**: Asteria Film Co. (749) - AI film studio, not policy
**Issue 21**: Surge AI (761) - Data labeling company
**Issue 22**: Google Brain (1065) - Merged into DeepMind 2023
**Issue 23**: Facebook AI Research (FAIR) (1070) - Internal Meta team, not standalone
**Issue 24**: Google Research (1066) - Division of Google, overlaps with DeepMind
**Issue 25**: Top universities (1019-1026) - Too generic, specific labs already exist
**Issue 26**: Lesser universities (1087, 1089, 1092, 1045, 1088) - Not AI policy relevant
**Issue 27**: Republican/Democratic Party (1039, 1040) - Too generic
**Issue 28**: US Senate/House (1027, 1028) - Too generic
**Issue 29**: White House (1031) - Overlaps with OSTP (345)
**Issue 30**: European Union (1082) - Overlaps with Commission, AI Office
**Issue 31**: United Nations (1081) - Too generic
**Issue 32**: Samaya AI (751) - Financial services, not AI safety
**Issue 33**: Fred Hutchinson (768) - Cancer research center
**Issue 34**: Bayesian Logic Inc. (1097) - Seismic monitoring, not AI policy
**Issue 35**: IAPS Fellowship (439) - Program of IAPS (191), not standalone
**Issue 36**: Orion AI Governance Initiative (440) - Program of Arcadia Impact
**Issue 37**: Microsoft/Google Research (1069, 1066) - Internal divisions
**Issue 38**: Public AI (540) - Wrong website (links to WH PDF)
**Issue 39**: Public AI (540) vs Public AI Network (344) - Likely duplicates

### Orgs Batch 3 (40 issues)

**Issue 1**: Senate Commerce Committee x4 (232, 1107, 1148, 1428) - 4 duplicate entries
**Issue 2**: Responsible AI Initiative (1111) - Conflates 3 university programs
**Issue 3**: Element AI (1114) - Acquired by ServiceNow Jan 2021
**Issue 4**: NRSC (1118) - Campaign committee, not AI policy
**Issue 5**: Trump administration (1169) - Too generic, overlaps with OSTP
**Issue 6**: UK Frontier AI Taskforce (1360) - Transitioned to AISI Nov 2023
**Issue 7**: AISI (1358) vs CAISI (205) - Same org, renamed
**Issue 8**: AISIC (1629) - Membership body of AISI, needs relationship
**Issue 9**: Princeton AI Lab (1139) vs (1584) - Duplicate
**Issue 10**: RAND CAST (1571) - Missing parent relationship to RAND (152)
**Issue 11**: AT&T Bell Labs (1434) - Historical entity from 1990s
**Issue 12**: Collège de France (1435) - Not AI related (LeCun visited 2016)
**Issue 13**: AMI Labs (1432) vs (1433) - Self-identified duplicate
**Issue 14**: Coinbase (1104) - Crypto exchange, not AI policy
**Issue 15**: CTBTO (1299) - Nuclear treaty org, not AI
**Issue 16**: Idaho National Lab (1303) - Nuclear lab using AI
**Issue 17**: Delphi Ventures (1608) - Crypto VC
**Issue 18**: The Operating Group (1609) - Tiny BVI crypto fund
**Issue 19**: Jukedeck (1400) - Acquired by ByteDance 2019
**Issue 20**: Colorado AI Policy Work Group (1345) - Completed advisory body
**Issue 21**: Helion Energy (1347) - Fusion company, not AI
**Issue 22**: Metaplanet (1607) - Wrong info (Japanese Bitcoin company)
**Issue 23**: National Infrastructure Fund (1340) - Saudi infrastructure, not AI
**Issue 24**: Ohio DJFS (1165) - State agency using AI
**Issue 25**: UVA ITS (1172) - University IT department
**Issue 26**: Speed School of Engineering (1271) - Generic engineering school
**Issue 27**: USC sub-units (1279-1283) - 4 entities without parent relationships
**Issue 28**: Emory AI Group (1316) vs Emory U (1315) - Missing relationship
**Issue 29**: AI Tennessee Initiative (1487) vs UT (1486) - Missing relationship
**Issue 30**: McGill sub-units (1331-1333) - Missing parent relationships
**Issue 31**: McGill AI Lab (1333) - Wrong category (listed as Frontier Lab)
**Issue 32**: Tulane sub-units (1292, 1293) - Marginal parent entity
**Issue 33**: Pathos Consulting (1459) - K-12 AI ethics consulting
**Issue 34**: The American Scholar (1410) - Literary magazine
**Issue 35**: Radical AI (1542) - Name collision with AI ethics podcast
**Issue 36**: The Operating Group (1609) - Also wrong category
**Issue 37**: Eleos AI (1351) - Missing relationship to Anthropic
**Issue 38**: Mila (1113) ↔ UdeM (1112) - Missing relationship
**Issue 39**: Good Ventures (1583) ↔ Coefficient Giving (128) - Missing relationship
**Issue 40**: Oxford Martin School (1618) ↔ AI Governance Initiative (168) - Missing relationship

### Orgs Batch 4 (45 issues)

**Issue 1**: National Infrastructure Fund (1340) vs (2239) - Duplicate
**Issue 2**: MATS (415) vs MATS Research (2115) - Duplicate
**Issue 3**: Pivotal Research (417) vs (2193) - Duplicate
**Issue 4**: PIBBSS (418) vs Principles of Intelligence (2200) - Duplicate
**Issue 5**: SARC at FHI (2269) - Defunct sub-initiative
**Issue 6**: Athena (438) vs Athena 2.0 (2039) - Duplicate
**Issue 7**: FAIR Lab UK (2300) - Needs relationship to EPSRC/ARIA
**Issue 8**: Safeguarded AI (2227) - Missing parent ARIA (428)
**Issue 9**: The Alignment Project (2286) - Missing parent UK AISI (533)
**Issue 10**: FAIR Lab UK (2300) - Name collision with Facebook FAIR
**Issue 11**: Metaplanet (1607) - Confirmed wrong website
**Issue 12**: MosaicML (2137) - Acquired by Databricks June 2023
**Issue 13**: Vicarious (2313) - Acquired by Alphabet
**Issue 14**: VAISU (2315) - Event series, not org
**Issue 15**: Jukedeck (1400) - Referenced in UCEF notes
**Issue 16**: Land Berlin (2095), Brandenburg (2096) - German states, not AI
**Issue 17**: German Federal Government (2040) - Too generic
**Issue 18**: Ontario Early Researcher Awards (2177) - General grant program
**Issue 19**: Pasupalak AI Fellowship (2187) - Single endowed fellowship
**Issue 20**: Quantitative Foundation (2205) - One-time gift to UVA
**Issue 21**: Guggenheim Foundation (2075) - General fellowship program
**Issue 22**: Infosys Foundation (2062) - Endowed ACM award in 2007
**Issue 23**: Lord Foundation (2107) - Sunsetting foundation
**Issue 24**: Draper Laboratory (2048) - Defense contractor
**Issue 25**: IvySys Technologies (2066) - Small defense contractor
**Issue 26**: Schmidt Sciences (2240) vs Schmidt Futures (814) - Clarify relationship
**Issue 27**: Lucidworks (2110) - Enterprise search vendor
**Issue 28**: Polar Semiconductor (2196) - Power chip manufacturer
**Issue 29**: Wolfspeed (2323) - SiC semiconductor company
**Issue 30**: Texas Semiconductor Innovation Fund (2284) - State grant program
**Issue 31**: NDSEG Fellowship (2142) - General defense fellowship
**Issue 32**: Okawa Foundation (2174) - General CS grant program
**Issue 33**: Public First (2201) - Conflates with Public First Action (1439)
**Issue 34**: Research Network on Opening Governance (2217) - Ended 2018
**Issue 35**: 100 Plus Capital (1689) - Longevity VC
**Issue 36**: Captions (2041) - Video editing app
**Issue 37**: Lemni (2099) - Customer service startup
**Issue 38**: Composite (2045) - Browser automation startup
**Issue 39**: Respan (2218) - AI observability startup
**Issue 40**: Pulse AI (2203) - Document extraction startup
**Issue 41**: Recraft (2214) - Generative design app
**Issue 42**: Luma AI (2112) - Wrong category (Frontier Lab)
**Issue 43**: Merge Labs (2131) - BCI company, borderline
**Issue 44**: Symbolica AI (2275) - Name discrepancy, unverified founder claim
**Issue 45**: DeepTechXL (2046) - Dutch deep-tech fund

</details>

---

## People Batches

<details>
<summary>Click to expand raw review notes (people batches 1-3)</summary>

### People Batch 1

## Issue 1

**Entity**: Daniela Amodei (ID: 13)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: Notes state she is "Married to Holden Karnofsky" — this is incorrect. Holden Karnofsky is married to Dario Amodei's sister, but Daniela Amodei is Dario's sister. Holden Karnofsky is married to Daniela Amodei according to multiple public sources. Actually — on reflection, this *is* correct per public reporting (Holden Karnofsky and Daniela Amodei are married). However, this information appears in `other_orgs` rather than a personal notes field, which is a classification oddity. Not flagging further.

*Withdrawing Issue 1 — upon review this appears accurate.*

---

## Issue 1

**Entity**: David Evan Harris (ID: 14)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: `primary_org` is listed as "Center for AI Safety (CAIS)" but the title and notes describe him as "Senior Policy Advisor, California Initiative for Technology and Democracy" and a Chancellor's Public Scholar at UC Berkeley. CAIS does not appear in his title or notes as a current primary affiliation.
**Recommendation**: Correct `primary_org` to "UC Berkeley" or "California Initiative for Technology and Democracy" based on the stated title.
**Evidence/Reasoning**: His title explicitly names different organizations. CAIS appears nowhere in the notes as a current role — it may be a data entry error or confusion with another person.

---

## Issue 2

**Entity**: Tom Kalil (ID: 43)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: Title lists him as "Deputy Director for Policy, White House Office of Science and Technology Policy (Obama Administration, 2009-2017); Chief Technology Officer, UC Berkeley (2017-present)" but the notes correctly identify him as CEO of Renaissance Philanthropy (launched May 2024) and previously Chief Innovation Officer at Schmidt Futures. The title is significantly out of date and the "CTO of UC Berkeley" role doesn't match the notes.
**Recommendation**: Update title to reflect his current role as CEO of Renaissance Philanthropy. The listed title appears to be a historical role, not a current one, and may be confused with another person's title.
**Evidence/Reasoning**: The notes explicitly contradict the title field, describing a completely different current role. Publishing this would be embarrassing.

---

## Issue 3

**Entity**: David Sacks (ID: 42)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: Notes say he "stepped down from his role as White House AI and crypto czar in March 2026" and is now "co-chair of the President's Council of Advisors on Science and Technology alongside Michael Kratsios." However, `primary_org` is listed as "President's Council of Advisors on Science and Technology (PCAST)" which may now be accurate, but the title still reads "Former White House AI and Crypto Czar (Jan 2025 - Mar 2026)" — this is actually internally consistent and correctly flagged as former. This appears fine.

*Withdrawing Issue 3 — data appears internally consistent.*

---

## Issue 3

**Entity**: Dan Wang (ID: 65)
**Type**: BAD_RESOLUTION
**Severity**: P0-critical
**Description**: The notes explicitly acknowledge that this entry conflates *three different people* named Dan Wang: (1) a Canadian technology analyst at Gavekal Dragonomics/Hoover Institution, (2) a Columbia Business School professor who created CAiSEY, and (3) a director on Eurasia Group's China team. The entry is publishing a single record that the data itself admits is ambiguous.
**Recommendation**: This entry must be split into separate records for each distinct individual, or the correct Dan Wang must be identified and the others removed. Publishing a record that openly acknowledges uncertainty about which person is being described would be a serious quality issue.
**Evidence/Reasoning**: The notes state "There are multiple individuals named Dan Wang who are journalists or writers" and then describe three different people. This is not a single entity.

---

## Issue 4

**Entity**: Joanne Jang (ID: 51)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: Notes state she "announced her departure from OpenAI after four and a half years" and "is departing to establish OAI Labs." However, her title still lists her as "Head of Model Behavior and Policy, OpenAI" and `primary_org` is still "OpenAI." If she has departed, this is factually incorrect as a current affiliation.
**Recommendation**: Update title and `primary_org` to reflect her departure and new venture (OAI Labs), or add a "former" qualifier. If the dataset is meant to capture current roles, this needs updating before public launch.
**Evidence/Reasoning**: The notes and title directly contradict each other — the notes describe a past role, while the title presents it as current.

---

## Issue 5

**Entity**: Yann LeCun (ID: 92)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: Title lists him as "Chief AI Scientist (former), Meta AI" but the notes describe him as having "announced plans to leave Meta after ten years to found his own company... AMI Labs raised $1.03 billion in funding... in March 2026." The `primary_org` is correctly listed as "Advanced Machine Intelligence Labs" but the title leads with his former Meta role without clearly marking it as former.
**Recommendation**: Update title to reflect his current role at AMI Labs as primary. The "(former)" designation is present but the title structure is confusing since it leads with the outdated role.
**Evidence/Reasoning**: Minor but worth fixing for public launch — the title structure implies the Meta role is primary when his current primary affiliation is AMI Labs.

---

## Issue 6

**Entity**: Jesse Jackson Jr. (ID: 715)
**Type**: HALLUCINATED
**Severity**: P0-critical
**Description**: Jesse Jackson Jr. is a former U.S. Representative who resigned from Congress in 2012, was convicted of federal charges (wire fraud, mail fraud) in 2013, and served prison time. The notes describe him as "a Democratic politician and former U.S. Representative from Illinois's 2nd Congressional District seeking to reclaim his seat in 2026." While he may be running, the notes omit his criminal conviction entirely — which is highly material public information for an AI policy stakeholder map. The entry as written could be seen as misleading.
**Recommendation**: Either add accurate biographical context about his prior conviction (which is well-documented public record and highly relevant to his candidacy), or verify that the described 2026 candidacy is real and current. Publishing this entry without that context would be embarrassing.
**Evidence/Reasoning**: Jesse Jackson Jr.'s conviction and resignation are major public facts. An entry describing him only as a politician "seeking to reclaim his seat" with no context is materially incomplete in a way that could mislead readers.

---

## Issue 7

**Entity**: Holden Karnofsky (ID: 61)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: `primary_org` is listed as "Coefficient Giving (formerly Open Philanthropy)" but the notes correctly state he "joined Anthropic in January 2025 as member of the technical staff." His title also says "Member of Technical Staff - Anthropic." The primary_org should be Anthropic, not Coefficient Giving, given he left that organization.
**Recommendation**: Update `primary_org` to "Anthropic" to match the stated title and notes.
**Evidence/Reasoning**: Direct contradiction between `primary_org` field and both the title and notes fields.

---

## Issue 8

**Entity**: Mike Krieger (ID: 19)
**Type**: HALLUCINATED
**Severity**: P2-minor
**Description**: Notes state he "recently moved from his CPO role to co-lead Anthropic's internal incubator called the 'Labs' team," but his title still lists him as "Chief Product Officer, Anthropic." If the role change is accurate, the title is outdated.
**Recommendation**: Update title to reflect his current role on the Labs team, or verify which is accurate for the data snapshot date.
**Evidence/Reasoning**: Internal contradiction between notes and title field.


### People Batch 2

## Issue 1

**Entity**: Stefano Mazzocchi (ID: 934)
**Type**: HALLUCINATED
**Severity**: P0-critical
**Description**: The notes explicitly state "No information found in search results for a Stefano Mazzocchi serving as Chief AI Officer at the Department of Commerce." All fields beyond name, title, and category are null. This entry should not be published — it is an unverified placeholder.
**Recommendation**: Remove this entry entirely, or hold it until the person and role can be verified. Publishing a record whose own notes admit the person cannot be confirmed would be embarrassing.
**Evidence/Reasoning**: The notes directly state the person could not be found. There is a Stefano Mazzocchi who is a well-known semantic web researcher (formerly at MIT and Apache), but he is not known to hold a Commerce Department role.

---

## Issue 2

**Entity**: Robert Long (ID: 1353)
**Type**: BAD_RESOLUTION
**Severity**: P0-critical
**Description**: The notes explicitly state "NOTE: Same person as Rob Long (entity 1354) — 'Rob' is informal name." This is a confirmed duplicate within the dataset that has not been resolved before the public launch.
**Recommendation**: Merge the two entries into one, keeping whichever has more complete information. Remove the duplicate before publishing.
**Evidence/Reasoning**: The notes on ID 1353 directly identify the duplication with entity 1354.

---

## Issue 3

**Entity**: Alan Davidson (ID: 929)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: Davidson's title lists him as "Assistant Secretary for Communications and Information, NTIA" and the notes describe him working on Biden-era AI policy. However, the notes also reference a report "due to White House in July 2024" as a future deliverable, suggesting the data snapshot may be significantly outdated. More importantly, Davidson departed NTIA in early 2025 when the Trump administration took office. His `primary_org` is still listed as NTIA, which is no longer accurate.
**Recommendation**: Update title with "Former" qualifier and update `primary_org` to reflect his post-government role, or note his departure. Publishing him as a current NTIA official would be factually incorrect.
**Evidence/Reasoning**: Presidential transitions routinely result in political appointees like assistant secretaries departing. The notes themselves reference mid-2024 timelines as future events, suggesting the data is stale on this entry.

---

## Issue 4

**Entity**: Laurie Locascio (ID: 930)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: Title states "Former Director, National Institute of Standards and Technology (NIST); Former Under Secretary of Commerce for Standards and Technology" but lists `primary_org` as "American National Standards Institute (ANSI)" — her current role. The title correctly marks her NIST role as former and the notes describe her current ANSI role. However, the title field is truncated mid-sentence ("Former Under Secretary of Commerce for Standards and Techn...") suggesting a data truncation issue.
**Recommendation**: Fix the truncated title field to read the complete title including her current ANSI role as primary. Minor fix but worth catching before launch.
**Evidence/Reasoning**: The title is visibly cut off, which will display oddly on the public platform.

---

## Issue 5

**Entity**: Allen Newell (ID: 1253)
**Type**: NOT_AI_RELATED (marginal) / HALLUCINATED
**Severity**: P2-minor
**Description**: Allen Newell died in 1992. While he is historically important to AI, including a deceased person from over 30 years ago with no current AI policy relevance on a map of "the U.S. AI policy landscape" is questionable. Similarly for Herb Simon (ID: 1254, died 2001). These are historical figures with no current policy role or influence.
**Recommendation**: Consider whether the platform intends to include historical/deceased figures. If not, these entries should be removed. If yes, they need a clear "Historical figure" tag to avoid confusion. Both entries do note "DECEASED" prominently in their notes, which is good.
**Evidence/Reasoning**: The platform description focuses on current AI policy landscape. Deceased researchers from the 1990s-2000s are unlikely to be useful stakeholder map entries. That said, they are clearly labeled as deceased so this is lower severity.

---

## Issue 6

**Entity**: Herb Simon (ID: 1254)
**Type**: NOT_AI_RELATED (marginal)
**Severity**: P2-minor
**Description**: Same issue as Allen Newell above — deceased (2001), historical AI pioneer with no current policy relevance. See Issue 5.
**Recommendation**: Same as Issue 5 — evaluate whether deceased historical figures belong on a current policy landscape map.
**Evidence/Reasoning**: As above.

---

## Issue 7

**Entity**: Joanna Rodriguez (ID: 1337)
**Type**: NOT_AI_RELATED
**Severity**: P1-serious
**Description**: Rodriguez is listed as Communications Director at the National Republican Senatorial Committee. Her notes describe her defending AI-generated campaign ads, but her primary role is partisan political communications, not AI policy. Her `regulatory_stance` is "Light-touch" and `ai_risk_level` is "Overstated" — but these appear to be inferred from a single incident involving an AI-generated ad, not from any substantive AI policy work.
**Recommendation**: Remove this entry. A party committee communications director who once defended an AI-generated attack ad does not constitute a meaningful AI policy stakeholder. Including her risks making the map appear partisan or poorly scoped.
**Evidence/Reasoning**: The notes describe no AI policy positions, legislation, research, advocacy, or governance work. The sole AI connection is defending the use of AI in a campaign ad, which is too thin a basis for inclusion.

---

## Issue 8

**Entity**: Lisa Hansmann (ID: 1440)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: Title and `primary_org` list her as "Director, Foundation for American Innovation" but the notes describe her as "Director at Foundry Logic" (a different organization). The `primary_org` and notes contradict each other. Foundation for American Innovation and Foundry Logic are distinct organizations.
**Recommendation**: Verify her actual current primary affiliation and correct either the title/primary_org or the notes to be consistent. Publishing with this contradiction would be misleading.
**Evidence/Reasoning**: Direct contradiction between the `primary_org` field ("Foundation for American Innovation") and the notes ("Director at Foundry Logic"). These are two different organizations.

---

## Issue 9

**Entity**: Meredith Stiehm (ID: 1369)
**Type**: HALLUCINATED
**Severity**: P2-minor
**Description**: Title says "Former President, WGA West" and the notes say she served as "President of WGA West (2021-2025)." However, her `primary_org` is still listed as "Writers Guild of America West" without a "Former" qualifier, which is internally inconsistent with her stated departure.
**Recommendation**: Update `primary_org` to clarify her former status, or note her current primary affiliation (she is listed as a TV showrunner, which would be "Independent").
**Evidence/Reasoning**: The title says "Former" but the `primary_org` does not reflect this, creating a minor inconsistency that could mislead users.

---

## Issue 10

**Entity**: John Tasioulas (ID: 1451)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: The notes state he "resigned Sep 2025 during harassment investigation" from his role as inaugural Director of the Institute for Ethics in AI at Oxford. However, his title still lists him as "Professor of Ethics and Legal Philosophy" at Oxford without clearly flagging that he resigned from a prominent role under a cloud. More importantly, this is significant context that's buried in the notes — his current status is unclear from the title field.
**Recommendation**: The title should clarify his current affiliation status. If he remains a professor at Oxford (separate from the institute director role), that should be explicit. If his Oxford affiliation ended, that needs updating. The harassment investigation context is material public information.
**Evidence/Reasoning**: The notes acknowledge the resignation and investigation but the title field doesn't reflect this change in status, which could be misleading on a public platform.

---

## Issue 11

**Entity**: Jeff Hancock (ID: 1450)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: The notes mention that "a federal judge barred his testimony" after he submitted a court filing "relying on ChatGPT that contained fabricated citations." This is a significant professional credibility issue that's disclosed in the notes, but it's worth flagging explicitly: this is material context that users of a public AI policy map should be aware of when evaluating his influence.
**Recommendation**: This is more of a data completeness flag — the notes do disclose it, which is good practice. No structural change needed, but confirm this disclosure is intentional given it's reputationally sensitive. No action required if intentional.
**Evidence/Reasoning**: The notes appropriately include this context. Flagging here only to confirm this disclosure is deliberate rather than accidental.

---

## Issue 12

**Entity**: Mohammed bin Salman (ID: 1339)
**Type**: HALLUCINATED
**Severity**: P2-minor
**Description**: Listed as "Executive" with `primary_org` "Government of Saudi Arabia." MBS is a head of government/state actor, not an executive in the conventional sense used elsewhere in this dataset (which appears to mean corporate executive). His category should likely be "Policymaker" rather than "Executive."
**Recommendation**: Change category from "Executive" to "Policymaker" for consistency with how other government leaders (e.g., Trump, Biden, DeSantis) are categorized in this dataset.
**Evidence/Reasoning**: All other heads of government/state in this dataset are categorized as "Policymaker." MBS is a government leader, not a corporate executive.

---

## Issue 13

**Entity**: Ron Wyden (ID: 1005)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: The notes state he is "Currently fighting Trump administration's ban on Anthropic, vowing to 'pull out all the stops.'" A "ban on Anthropic" is not a verifiable event — there is no publicly known Trump administration ban on Anthropic as of the knowledge cutoff. This appears to be either a fabricated claim or a significant mischaracterization of actual events.
**Recommendation**: Verify and correct or remove this specific claim. Publishing a statement that the Trump administration has "banned" a major AI company without solid factual basis would be seriously embarrassing.
**Evidence/Reasoning**: No publicly known "ban on Anthropic" by the Trump administration exists in the public record. This reads like a hallucinated or severely mischaracterized data point.

---

## Issue 14

**Entity**: Thierry Breton (ID: 936)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: The notes state he was "Sanctioned by the US in December 2024 with travel ban and asset freeze for his role in EU tech regulation, specifically the Digital Services Act." This is not a verifiable event — the U.S. did not sanction Thierry Breton for EU tech regulation activities. This appears to be a fabricated claim.
**Recommendation**: Remove or verify this specific claim before publishing. U.S. sanctions on an EU Commissioner for regulatory activities would be a major geopolitical event that is not in the public record.
**Evidence/Reasoning**: No such U.S. sanctions against Thierry Breton are in the public record. This is almost certainly a hallucinated data point that would be highly embarrassing if published on a credible AI policy platform.

### People Batch 3

## Issue 1

**Entity**: Submit Test XYZ (ID: 1848)
**Type**: TOO_GENERIC
**Severity**: P0-critical
**Description**: This is clearly a test submission with no name, category, title, org, or notes. All fields are null except the name field itself, which reads "Submit Test XYZ" — an obvious form test entry.
**Recommendation**: Delete this record entirely before public launch. Publishing a "Submit Test XYZ" entry on a credible AI policy map would be immediately embarrassing.
**Evidence/Reasoning**: The entry has zero substantive content and the name is transparently a test artifact.

---

## Issue 2

**Entity**: NicholasKees (ID: 1551)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: The entity name is listed as "NicholasKees" (no space, appears to be a username/handle), though the notes clarify the person's full name is "Nicholas Kees Dupuis." The name field should use the person's actual name, not their LessWrong username.
**Recommendation**: Update the name field to "Nicholas Kees Dupuis" and note "NicholasKees" as an alias/handle. Publishing a person's LessWrong username as their display name on a public-facing policy map looks unprofessional.
**Evidence/Reasoning**: The notes themselves identify the full name as "Nicholas Kees Dupuis." All other entries in the dataset use real names.

---

## Issue 3

**Entity**: janus (ID: 1552)
**Type**: HALLUCINATED / BAD_RESOLUTION
**Severity**: P1-serious
**Description**: The entity name is listed as "janus" — a pseudonym/handle — with no real name provided anywhere in the record. The notes identify them as "@repligate on X" but provide no actual name. Publishing a pseudonymous handle as a standalone stakeholder entry without any real-name attribution creates credibility and verification problems.
**Recommendation**: Either identify this person's real name and update the entry, or remove the entry if the person wishes to remain pseudonymous. A credible AI policy map should not list unidentified individuals by pseudonym alone, as it cannot be verified and could cause confusion or misattribution.
**Evidence/Reasoning**: All other individuals in the dataset are listed by their real names. "janus" has no verifiable identity attached to the record.

---

## Issue 4

**Entity**: Nate Thomas (ID: 1508)
**Type**: BAD_RESOLUTION
**Severity**: P0-critical
**Description**: This entry describes the "Co-founder and CEO of Redwood Research" but Buck Shlegeris (ID: 1507) is already listed as CEO of Redwood Research. Redwood Research has one CEO. Either Nate Thomas is not currently CEO, or one of these entries is wrong. The two entries contradict each other on who leads Redwood Research.
**Recommendation**: Verify current leadership of Redwood Research. Based on public records, Buck Shlegeris is Redwood Research's CEO. Nate Thomas may be a co-founder but likely not the current CEO. Correct whichever entry is wrong to avoid publishing two people as CEO of the same organization.
**Evidence/Reasoning**: ID 1507 (Buck Shlegeris) is listed as CEO of Redwood Research; ID 1508 (Nate Thomas) is also listed as "Co-founder and CEO of Redwood Research." An organization cannot have two CEOs simultaneously.

---

## Issue 5

**Entity**: Matt Botvinick (ID: 1530)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: The notes contain a direct internal contradiction: they state he is "Senior Director of Research and Senior Technology and Policy Advisor at Google DeepMind (joined 2016)" and then immediately state "Joining the Anthropic Institute to lead work on AI and the rule of law." His `primary_org` is listed as "Google DeepMind" but the notes suggest an imminent or recent move to the Anthropic Institute.
**Recommendation**: Verify his current primary affiliation. If he has moved to the Anthropic Institute, update `primary_org` and title accordingly. If the Anthropic Institute role is future/planned, note this clearly. Publishing him as a current DeepMind employee while the notes say he's joining Anthropic is contradictory.
**Evidence/Reasoning**: Direct contradiction within the notes field between current and stated new role.

---

## Issue 6

**Entity**: Andy Ayrey (ID: 2295)
**Type**: MISCLASSIFIED / BAD_RESOLUTION
**Severity**: P1-serious
**Description**: The entity name is "Andy Ayrey" but the notes describe "Truth Terminal" (an AI bot/agent), conflating the creator with his creation. The notes are almost entirely about the Truth Terminal bot — its memecoin promotion, its Goatse Gospels, its wallet value — rather than about Andy Ayrey the person. The `influence_type`, `regulatory_stance`, and all other fields appear to describe the bot, not the human.
**Recommendation**: This entry needs to be split or clarified. If Andy Ayrey is the intended entity, the notes should focus on him as a researcher/founder (Upward Spiral) with Truth Terminal mentioned as a project. If Truth Terminal is a separate entity worth tracking, it should be its own entry. As written, a person and an AI bot are merged into one record.
**Evidence/Reasoning**: The notes open with "Truth Terminal (also known as @truth_terminal...)" as if describing the bot, not the person. Andy Ayrey's title and primary_org fields are null. This is functionally an entry about an AI bot that happens to name its creator.

---

## Issue 7

**Entity**: Matthew J. Salganik (ID: 2126)
**Type**: BAD_RESOLUTION
**Severity**: P1-serious
**Description**: Matthew Salganik already exists in the dataset as ID: 1452 (also listed as "Matt Salganik," Alexander Stewart 1886 Professor of Sociology at Princeton). These are the same person — identical title, university, and research description. ID: 2126 provides more detail but is a clear duplicate.
**Recommendation**: Merge IDs 1452 and 2126 into a single entry, keeping the more complete information from ID: 2126. Remove the duplicate before launch.
**Evidence/Reasoning**: Both entries share the same name variant (Matthew/Matt Salganik), same title (Alexander Stewart 1886 Professor of Sociology), same institution (Princeton), and same research focus (computational social science, SICSS co-founder, Bit by Bit author).

---

## Issue 8

**Entity**: Max Chiswick (ID: 2127)
**Type**: NOT_AI_RELATED (marginal) / HALLUCINATED
**Severity**: P1-serious
**Description**: The notes state Max Chiswick "passed away on January 7, 2025, while traveling." This person is deceased. While his historical contributions to AI safety community-building are noted, including a deceased person as a current stakeholder on a policy landscape map — with no "deceased" flag in the name or category fields — is misleading. Unlike Allen Newell and Herb Simon (flagged in Batch 2), Chiswick died very recently (January 2025) and his entry does not prominently mark his death.
**Recommendation**: Either remove this entry or add a very clear "Deceased (January 2025)" marker in the title or name field. The notes do disclose the death but it's buried at the end of a long paragraph.
**Evidence/Reasoning**: A recently deceased person listed without prominent deceased-status marking could confuse users trying to reach or understand current stakeholders.

---

## Issue 9

**Entity**: Sam Bankman-Fried (ID: 2231)
**Type**: HALLUCINATED
**Severity**: P1-serious
**Description**: The entry describes SBF as a "Major funder of effective altruism-aligned organizations working on AI safety." While historically accurate, SBF is currently incarcerated (sentenced to 25 years in March 2024) and all his assets were forfeited ($11+ billion). The entry notes this but lists his `primary_org` as "FTX Trading Ltd. (defunct)" — meaning the org no longer exists. His current influence on AI policy is essentially zero. Publishing him as an active stakeholder alongside current funders and researchers could mislead users.
**Recommendation**: Either remove this entry as a historical artifact with no current relevance, or add a clear "Incarcerated / No current influence" flag. The entry is informative about past funding patterns but could mislead users about current AI safety funding dynamics.
**Evidence/Reasoning**: SBF has been convicted, sentenced, and incarcerated. His assets were forfeited. The organizations he funded through FTX Future Fund have already noted the disruption to their pipelines. He has no current ability to fund AI safety work.

---

## Issue 10

**Entity**: Kim Jungsik (ID: 2089)
**Type**: NOT_AI_RELATED / HALLUCINATED
**Severity**: P1-serious
**Description**: Kim Jungsik died in April 2019. His primary AI-related contribution was a one-time donation to Seoul National University in February 2019 to establish an AI research center — made while hospitalized and shortly before his death. He was a Korean PCB manufacturer with no ongoing role in AI policy, governance, safety, or research. The connection to AI is extremely tenuous (a single philanthropic gift 6+ years ago by someone now deceased).
**Recommendation**: Remove this entry. A deceased Korean industrialist whose only AI connection was a single 2019 donation does not belong on a map of the U.S. AI policy landscape. This is also clearly not U.S.-focused.
**Evidence/Reasoning**: (1) Deceased since 2019. (2) Korean national with no U.S. AI policy connections. (3) AI connection is a single donation to a Korean university. (4) No policy, governance, research, or advocacy role of any kind.

---

## Issue 11

**Entity**: Trajectory Labs (ID: 1646) vs. Trajectory Labs PBC (ID: 1648)
**Type**: BAD_RESOLUTION
**Severity**: P1-serious
**Description**: The notes for ID: 1648 (Peter McIntyre) explicitly state "Trajectory Labs PBC (the security startup) is a separate entity from Trajectory Labs (the Toronto AI safety coworking nonprofit)." These two organizations share a name but are entirely different entities — one is a nonprofit coworking space in Toronto, the other is a stealth AI security startup. This could easily cause confusion for map users.
**Recommendation**: Ensure both entities are clearly differentiated in their names/descriptions on the map. Consider adding a disambiguating note to both entries (e.g., "Trajectory Labs [Toronto nonprofit]" vs. "Trajectory Labs PBC [AI security startup]"). As the notes themselves acknowledge the confusion, this needs a clean resolution before public launch.
**Evidence/Reasoning**: The notes on ID: 1648 directly flag that these are two different entities with the same name. Publishing both without clear disambiguation will confuse users.

---

## Issue 12

**Entity**: Caroline Mehl (ID: 2042)
**Type**: NOT_AI_RELATED
**Severity**: P2-minor
**Description**: The `category` is listed as "Investor" but her description makes clear she is not an AI investor — she is the Executive Director of the Constructive Dialogue Institute (which teaches communication across differences) and is included solely because she is a donor to ARI and the partner of ARI's executive director. Her own work has no meaningful AI policy connection.
**Recommendation**: Consider removing this entry, or if kept, recategorize as "Organizer" and note that her AI policy connection is entirely through personal relationships and minor donations, not through her professional work. Including a person because they are romantically partnered with an AI policy figure could be seen as inappropriate on a public map.
**Evidence/Reasoning**: The notes themselves acknowledge her connection to AI policy is through being "Partner of Eric Gastfriend (ARI Executive Director)" and an "Individual Donor." Her professional organization (Constructive Dialogue Institute) has no AI mission.

---

## Issue 13

**Entity**: Brittney G (ID: 1579)
**Type**: HALLUCINATED
**Severity**: P2-minor
**Description**: The entity is listed as "Brittney G" — using only an initial for the last name. The notes refer to her as "Brittney Gallagher" (she co-founded AOI with Peter Eckersley). Using an initial rather than a full last name on a public-facing map is inconsistent with all other entries and may suggest the last name was unknown.
**Recommendation**: Update the name to "Brittney Gallagher" (which the notes implicitly confirm — "she co-founded" with Peter Eckersley, and public records identify the co-founder as Brittney Gallagher). Verify and use the full name.
**Evidence/Reasoning**: All other entries use full names. "Brittney G" appears to be an incomplete data entry. The notes reference Peter Eckersley as her co-founder, and public sources confirm AI Objectives Institute was co-founded by Brittney Gallagher.

</details>