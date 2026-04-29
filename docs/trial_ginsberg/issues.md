## Issues Surfaced

### 1. Citation Artifacts in Notes (316 entities)
- **Scope:** 316 out of ~894 entities with notes contain `[n]` or `[n,n]` citation artifacts
- **Example:** Entity ID 1 (Stuart Russell): "holds the Smith-Zadeh Chair in Engineering [1,6]"
- **Suggested fix:** Bulk regex removal of `\[\d+[\d,\s]*\]` patterns from all notes fields. This is a straightforward automated cleanup.

### 2. `notes_sources` Stored as Strings Instead of Arrays (317 entities)
- **Scope:** 317 entities have `notes_sources` as a JSON-encoded string (e.g., `"[\"url1\",\"url2\"]"`) rather than an actual JSON array
- **Example:** Entity ID 1 (Stuart Russell): notes_sources is a string containing `["https://vcresearch.berkeley.edu/..."]` rather than a proper array
- **Suggested fix:** Parse these strings into actual JSON arrays during a data migration. The strings appear to be valid JSON, so `JSON.parse()` should work for all of them.

### 3. `belief_threat_models` Field Corruption (widespread)
- **Scope:** 259 entities exceed the documented maximum of 3 comma-separated threat models. Many entries contain full paragraph-length descriptions instead of values from the allowed list.
- **Example:** Entity ID 8 (Dario Amodei) has 9 threat models including non-standard values like "Bioterrorism" and "Mass surveillance." Other entities have multi-sentence descriptions embedded in the field, such as "Existential risk (warns of potential human extinction or permanent disempowerment with median estimate of 25% by 2100)."
- **Non-standard values found:** "National security" (137), "Weapons proliferation" (83), "Bias/discrimination" (70), "Privacy" (52), plus dozens of one-off paragraph-length entries
- **Suggested fix:** Two-step process: (1) Map common non-standard values to allowed values (e.g., "Weapons proliferation" → "Weapons", "National security" → closest match or add to allowed list). (2) Truncate all entries to max 3 values and move descriptive text to a separate field or remove it. Consider expanding the allowed values list to include "National security" and "Bias/discrimination" given their frequency.

### 4. Empty Notes Affecting Nearly Half the Database (710 entities)
- **Scope:** 710 out of 1,604 entities (44%) have completely empty notes
- **Breakdown:** Concentrated in recently added entities (IDs 1100+), suggesting batch imports without enrichment
- **Suggested fix:** Prioritize enrichment by entity importance/influence. High-value entities like Brad Smith (ID 1196, Microsoft President) and Marc Benioff (ID 1123, Salesforce CEO) had zero information beyond a name and category.

### 5. Missing `primary_org` for People (523 entities)
- **Scope:** 523 out of 709 people (74%) have no primary_org set
- **Example:** Brad Smith (ID 1196) had no primary_org despite being Microsoft's President
- **Suggested fix:** For well-known figures, this can be partially automated by cross-referencing edge data (employed_by edges with is_primary=true) to populate primary_org. Remaining gaps require manual research.

### 6. Anachronistic "Department of War" References
- **Scope:** At least entity ID 27 (Michael Kratsios) refers to the Pentagon role using the post-September 2025 name "Department of War" for a position held in 2020-2021 when it was still the Department of Defense
- **Suggested fix:** Audit all entities with government/military affiliations for anachronistic naming. Historical titles should use the name that was accurate at the time of service.

### 7. Incorrect Edge: Brad Smith → University of Washington
- **Scope:** Entity ID 1196 (Brad Smith) has an existing edge showing "University of Washington → Brad Smith (employed_by)" which appears incorrect — Brad Smith is employed by Microsoft, not the University of Washington
- **Suggested fix:** Verify and correct or remove this edge. Brad Smith may have a connection to UW (e.g., as a speaker or advisory role) but "employed_by" appears wrong.
