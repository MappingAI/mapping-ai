# Resource Dedup — 2026-04-11
*Phase 3 close-out pass #3 (resource duplicate merging)*

## TL;DR

11 duplicate resource entities merged into 6 canonical entities. Resource count: **162 → 151**. One edge redirected (697→650). Zero orphan edges after merge. All URLs from deleted entities preserved in canonical's `notes_sources` array.

## Approach

For each cluster:
1. Pick canonical based on: most complete title, existing edges, presence of a `resource_url`.
2. Merge all URLs from duplicates (`resource_url` + `notes_sources`) into canonical's `notes_sources`, deduping.
3. Redirect any edges from duplicate → canonical.
4. Delete duplicate entity.

Existing resource notes in duplicates were **not** merged into canonical notes — the canonical's notes were already written at similar quality in batches 82-85. Resource notes_sources previously contained the string `"Title context"`; this has been replaced with the actual URL arrays from merged entities.

## Merges executed

### Cluster 1: Biden EO 14110 → canonical **650**
Canonical: `[650] Executive Order on Safe, Secure, and Trustworthy AI` — official WH URL, held 2 edges before merge (now 3).

Deleted:
- `[638] Biden AI Executive Order (Oct 2023)` — summary entry, no URL, 0 edges
- `[697] Executive Order on the Safe, Secure, and Trustworthy Development and Use of Artificial Intelligence` — full-title variant, same WH URL, 1 edge (redirected)
- `[699] Executive Order 14110—Safe, Secure, and Trustworthy ...` — truncated title, UCSB Presidency Project URL

Canonical now carries 2 URLs: WH official + UCSB Presidency Project.

### Cluster 2: Trump preemption EO → canonical **634**
Canonical: `[634] Sacks federal preemption EO (Dec 2025)` — concise summary entry, 1 edge.

Deleted:
- `[662] Ensuring a National Policy Framework for Artificial Intelligence – The White House` — WH URL
- `[680] Federal Register :: Ensuring a National Policy Framework for Artificial Intelligence` — Federal Register URL

Canonical now carries 2 URLs: whitehouse.gov + federalregister.gov.

**Deliberately kept separate** (distinct articles about the EO, not duplicates of the EO itself):
- 657 Ropes & Gray LLP alert
- 658 CNN Business article
- 661 Comm Law Group legal analysis
- 674, 681, 696 — three separate Mondaq legal analyses with different article IDs (1719974, 1722598, 1720220)

### Cluster 3: Gradual Disempowerment → canonical **685**
Canonical: `[685] Gradual Disempowerment` — shorter canonical title with history (had v1 notes), `gradual-disempowerment.ai` URL.

Deleted: `[698] Gradual Disempowerment: How AI Could Erode Human Control` — same URL, longer title.

### Cluster 4: Canaries in the Coal Mine → canonical **689**
Canonical: `[689] Canaries in the Coal Mine? Six Facts about the Recent Employment Effects of Artificial Intelligence` — full title, specific authors (Brynjolfsson/Li/Raymond/Sheehy), 1 edge.

Deleted: `[691] Canaries in the Coal Mine? Six Facts about the Recent ...` — truncated title, generic author attribution (Stanford Digital Economy Lab), CDN-path URL variant.

Canonical now carries 2 URLs: `wp-content/uploads/` and `app/uploads/` (same PDF, different Stanford CDN paths).

### Cluster 5: Senate AI chatbot hearing → canonical **671**
Canonical: `[671] US Senate Hearing On 'Examining the Harm of AI Chatbots'` — most descriptive title, TechPolicy.Press transcript URL.

Deleted:
- `[672] Senate Hearing on AI Chatbots` — YouTube URL
- `[700] Examining the Harm of AI Chatbots` — judiciary.senate.gov URL

Canonical now carries 3 URLs (transcript + video + official committee page).

### Cluster 6: Technology Adolescence → canonical **655**
Canonical: `[655] The Adolescence of Technology` — has `darioamodei.com/technology-adolescence` URL and 1 edge.

Deleted:
- `[625] Technology Adolescence` — no URL, generic summary
- `[642] Dario Amodei "Technology Adolescence"` — no URL, author-attributed

## Clusters reviewed but NOT merged

### AI Safety Index (686/687/688) — kept all 3
- `[687]` = Future of Life Institute **Summer 2025** edition
- `[688]` = Future of Life Institute **Winter 2025** edition
- `[686]` = Libertify (third-party) coverage of the FLI index

Summer and Winter are distinct editions of the index with different URLs and different content. Libertify is an independent coverage source.

### Annual AI Governance Report 2025 (682/683) — kept both
- `[682]` = International Telecommunication Union (ITU) — "The Annual AI Governance Report 2025"
- `[683]` = World Economic Forum (WEF) — "AI Governance Dialogue: Steering the Future of AI"

Different authors (ITU vs WEF), different documents, different URLs. They share a similar title convention but are genuinely distinct reports.

### Biden EO articles (663/664/665) — kept all 3
These are articles *about* the EO, not the EO itself:
- `[663]` Congressional Research Service summary (R47843)
- `[664]` DHS fact sheet
- `[665]` CNBC news coverage

### Trump EO articles (657/658/661/674/681/696) — kept all 6
Articles/legal analyses about the Trump EO, with distinct authors and URLs:
- `[657]` Ropes & Gray
- `[658]` CNN Business
- `[661]` Comm Law Group
- `[674]` Mondaq article 1719974 ("One Rule" framing)
- `[681]` Mondaq article 1722598 ("Toward A National AI Framework")
- `[696]` Mondaq article 1720220 ("Federal AI Preemption Push")

Mondaq articles have different article IDs and titles — these are genuinely different commentaries that happen to be syndicated through the same platform.

## Post-dedup DB state

| entity_type | count | delta |
| ----------- | ----: | ----: |
| organization | 790 | 0 |
| person | 710 | 0 |
| resource | 151 | −11 |
| **TOTAL** | **1651** | **−11** |

- Orphan edges: 0 (verified)
- Canonical entities with merged URLs: 6
- Total URLs preserved from deleted duplicates: 11

## Phase 3 close-out status

- [x] Pass #1: Test deletions (5) + thin v1 expansions (12) — batch 86
- [x] Pass #2: URL cleanup — 2 real fixes, 35 false positives documented
- [x] Pass #3: Resource dedup — 11 merges, 0 orphans (this log)
- [ ] Pass #4: Category corrections (ASML, AMPTP, Radical AI, EliseAI, PIT-UN, etc.)
- [ ] Pass #5: short_notes_high_confidence (8 flagged) + sample no_beliefs_high_confidence
