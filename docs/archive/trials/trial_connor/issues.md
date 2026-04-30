## Issues Surfaced

### 1. Pervasive Citation Artifacts in Notes
- **Scope:** Widespread — at least the first 18 people entities (IDs 1-18) all contain `[n]` or `[n,n,n]` citation artifacts in their notes. Likely affects hundreds of entities database-wide.
- **Example:** ID 1 (Stuart Russell): "holds the Smith-Zadeh Chair in Engineering [1,6]"
- **Suggested fix:** Regex sweep to strip all `[n]`, `[n,n]`, `[n,n,n]` patterns from notes fields across the database. Then manual review of a sample to ensure no content was lost.

### 2. notes_sources Stored as JSON Strings Instead of Arrays
- **Scope:** Many entities have `notes_sources` stored as a JSON-encoded string (e.g., `"[\"url1\",\"url2\"]"`) rather than a proper JSON array. This means the field contains a string that looks like an array but isn't one.
- **Example:** ID 3 (Marc Andreessen): `notes_sources` value is `"[\"https://...\",\"https://...\"]"` — a string, not an array.
- **Suggested fix:** Parse and convert all string-encoded arrays to actual JSON arrays in the database. This is likely a serialization bug in the export or ingestion pipeline.

### 3. Incorrect primary_org Assignments
- **Scope:** At least one confirmed case; likely more given the AI-assisted enrichment process.
- **Example:** ID 14 (David Evan Harris) had `primary_org` set to "Center for AI Safety (CAIS)" — a completely different organization (Dan Hendrycks' AI safety research org) from his actual primary affiliation (UC Berkeley). This is a serious data quality issue as it creates false connections.
- **Suggested fix:** Cross-reference all `primary_org` fields against entity notes and known affiliations. Flag any where the org name doesn't appear in the notes or verifiable sources.

### 4. Duplicate Entity for House AI Task Force
- **Scope:** 2 entities for the same body.
- **Example:** ID 1149 ("House Bipartisan Task Force on Artificial Intelligence") and ID 1470 ("Bipartisan Taskforce on Artificial Intelligence") appear to refer to the same congressional body. Both are empty shells.
- **Suggested fix:** Merge into a single entity and redirect any edges from the duplicate. Run a broader fuzzy-match deduplication pass across all entities.

### 5. Notes Lack AI Policy Relevance
- **Scope:** Many entities have notes that read like Wikipedia biographies rather than explaining why the person/org matters to U.S. AI policy.
- **Example:** ID 15 (Kim Stanley Robinson) — original notes covered his birthdate, PhD dissertation, DSA membership, and Mars trilogy but never mentioned his views on AI or why he's in an AI policy database. ID 3 (Marc Andreessen) — notes mentioned his net worth and Mosaic browser history but not SB 1047, his "Why AI Will Save the World" essay, or his role advising Trump on technology.
- **Suggested fix:** Develop a rubric requiring all notes to include at least one sentence explicitly connecting the entity to AI policy. Flag entities where "AI" or "artificial intelligence" doesn't appear in the notes text.

### 6. Hallucinated Government Titles
- **Scope:** At least one confirmed case; likely more given that AI models often confuse government titles.
- **Example:** ID 27 (Michael Kratsios) listed as "Under Secretary of War" — this title does not exist. The correct title was "Acting Under Secretary of Defense for Research and Engineering." The error likely arose from the DoD website being recently rebranded to war.gov, which a scraper or AI model incorporated into the title itself.
- **Suggested fix:** Cross-reference all government titles against official sources (congress.gov, whitehouse.gov, agency websites). Government titles are frequently hallucinated or outdated.

### 7. 710 Empty-Notes Entities (44% of Database)
- **Scope:** 710 out of 1,604 entities have null/empty notes, including notable figures like Marc Benioff (Salesforce CEO), Ron DeSantis (Florida Governor), and 260 organizations.
- **Suggested fix:** Prioritize enrichment by: (1) entities with existing edges (they're already connected, just need notes), (2) entities with high-profile names that users will search for, (3) organizations before people, as org notes provide context for multiple connected people. A batch AI enrichment pass with mandatory human verification would be the most efficient approach.

### 8. ALL 2,228 Edges Have Null source_url
- **Scope:** Every single edge in the database. 100% of edges lack a `source_url`, and 33.5% (747 edges) also have null `evidence` text. This means no relationship in the database is sourced.
- **Example:** Edge ID 1 (Yoshua Bengio → Stanford HAI, "affiliated", role: "Advisor") has `evidence: null`, `source_url: null`.
- **Suggested fix:** This is the highest-priority data quality issue. Prioritize adding sources to edges that have `evidence` text (they have a claim but no URL backing it), then tackle edges missing both fields. A batch process could attempt to auto-match edge claims against entity notes_sources.

### 9. 254 Orphan Entities With Zero Edges
- **Scope:** 254 entities (16% of the database) have no inbound or outbound edges at all — they are completely disconnected from the graph. This includes 132 organizations and 116 resources.
- **Example:** Many empty-shell entities added during migration have no connections, making them invisible in a relationship-mapping product.
- **Suggested fix:** Prioritize connecting orphan entities before adding new ones. Entities with notes but no edges are the lowest-hanging fruit — their notes often describe relationships that could be extracted as edges.

### 10. Non-Standard Edge Types
- **Scope:** 98 edges use edge types not listed in the schema, including `person_organization` (72 edges), `funder` (17), `affiliated_with` (7), `mentioned` (1), and `critic` (1).
- **Example:** `person_organization` appears to be a migration artifact; these should likely be `employed_by` or `affiliated` depending on context. `affiliated_with` should be normalized to `affiliated`. `critic` should be `critic_of`.
- **Suggested fix:** Map each non-standard type to its canonical equivalent and batch-update. Review `person_organization` edges individually as they may need different canonical types.

### 11. Dangling Edge References
- **Scope:** At least 2 edges reference entity IDs that don't exist in entities.json.
- **Example:** Two edges reference `target_id=450` (labeled "Vector Institute"), but no entity with ID 450 exists in the dataset. These are broken references.
- **Suggested fix:** Run a referential integrity check: for every edge, verify both `source_id` and `target_id` exist in entities.json. Delete or fix any dangling references.

### 12. Stale primary_org for Former Officials
- **Scope:** Entities for people who have changed roles since the data was assembled.
- **Example:** ID 34 (Gina Raimondo) still had `primary_org` as "U.S. Department of Commerce" though she left in January 2025. She is now a Distinguished Fellow at the Council on Foreign Relations.
- **Suggested fix:** Flag all entities where `primary_org` is a government agency and the person's title includes "Former" or date ranges ending before 2025. These likely need updating.
