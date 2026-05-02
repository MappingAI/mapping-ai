## Issues Surfaced

### 1. Citation Artifacts in 20% of All Entities

- **Scope:** 316 of 1,604 entities (20%) contain `[n]` citation formatting artifacts in their notes, totaling 1,438 instances.
- **Example:** ID 166 (Senate AI Working Group) has 11 `[n]` artifacts; ID 210 (SAG-AFTRA) has 11; ID 68 (Mike Rounds) has 10.
- **Cause:** AI-assisted enrichment injected inline citation references (e.g., `[6][7][9]`) that were never cleaned up. The notes_sources array exists for this purpose but the artifact text was left behind.
- **Suggested fix:** Regex pass with `\[\d+[\d,\s]*\]` across all entity notes. Can be automated in a single script run. Approximately 316 entities need cleanup.

### 2. Duplicate Congressional Entities (4 clusters, ~10 extra entries)

- **Scope:** At least 4 clusters of duplicate or near-duplicate congressional committee/caucus entries across 18 committee-type organizations.
- **Examples:**
  - **Senate Commerce Committee** appears 4 times: ID 232 ("Senate Commerce Committee (AI jurisdiction)"), ID 1107 ("Senate Commerce, Science, and Transportation Committee"), ID 1148 ("Senate Committee on Commerce, Science and Transportation"), ID 1428 ("U.S. Senate Commerce Committee")
  - **House Science Committee** appears twice: ID 1150 ("House Committee on Science Space & Tech"), ID 1467 ("House Science, Space, and Technology Committee")
  - **AI Caucus** appears 3 times: ID 1484 ("Congressional AI Caucus"), ID 1481 ("Congressional Artificial Intelligence Caucus"), ID 1408 ("Senate AI Caucus") -- the first two may be the same body
  - **House AI Task Force** appears twice: ID 1149 ("House Bipartisan Task Force on Artificial Intelligence"), ID 1483 ("House Task Force on Artificial Intelligence")
- **Suggested fix:** Merge duplicates into canonical entries with standardized names. Redirect edges from deprecated IDs to the canonical ID. Establish a naming convention for congressional entities (e.g., use the official committee name from congress.gov).

### 3. 65% of Noted Entities Have No Source URLs

- **Scope:** 577 of 894 entities with notes (65%) have an empty `notes_sources` field. Only 317 entities (35%) have any source URLs.
- **Example:** Many entities with substantial multi-sentence notes have zero source URLs, making their claims unverifiable without re-researching from scratch.
- **Cause:** The enrichment pipeline wrote notes but did not capture or persist the source URLs used during research.
- **Suggested fix:** Prioritize a backfill pass for high-profile entities (those with belief scores, which appear on the map). For each, verify existing notes and populate notes_sources. This is the single highest-impact quality improvement since it directly addresses the hallucination verification problem.

### 4. Future Dates in 18 Entities May Be Hallucinated

- **Scope:** 18 entities reference years 2027-2035 in their notes. An additional 53 entities contain hyper-specific dates (e.g., "March 5, 2026") that are common hallucination markers.
- **Examples:**
  - ID 59 (Daniel Kokotajlo): references "2027" and "2029" -- these are legitimate (AGI forecast dates), but need sourcing
  - ID 34 (Gina Raimondo): references "2028" -- needs verification
  - ID 778 (Masayoshi Son): references "2035" -- needs verification
  - ID 733 (Jensen Huang): references "2028" -- needs verification
- **Suggested fix:** Audit all 18 future-date entities and 53 hyper-specific-date entities. For each date, either verify against a primary source or remove. Legitimate forecasts (e.g., someone's stated AGI timeline) should be sourced; fabricated dates should be deleted. This can be batched efficiently.

### 5. Systematic Field Gaps on Enriched Entities

- **Scope:** Among 336 people with notes, 62% are missing `notes_sources`, 61% missing `twitter`, 10% missing `belief_agi_timeline`, 7% missing `belief_ai_risk`. Among 474 organizations with notes, 60% missing `notes_sources`, 40% missing `funding_model`, 20% missing `location`.
- **Example:** Entities that were enriched with detailed notes and belief scores still have blank social media handles, locations, and source citations -- suggesting the enrichment pipeline captured some fields but systematically skipped others.
- **Suggested fix:** Design the enrichment pipeline to fill all applicable fields in a single pass rather than notes-only. A second remediation pass focused on `notes_sources`, `twitter`, and `location` for existing enriched entities would close the most visible gaps.
