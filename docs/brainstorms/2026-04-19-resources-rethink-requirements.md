---
date: 2026-04-19
topic: resources-rethink
---

# Resources Rethink: Library-First Surface, Multi-Tag Taxonomy, Advocated-Stance Enrichment

## Problem Frame

Resources on mapping-ai are a weak signal today. 154 approved resources vs. 1,423 people+orgs. Only 120 edges touch a resource, so most average under one connection and render as isolated islands on the force-directed graph. The nine `resource_type` values (Report, Substack, Website, Book, Academic Paper, Video, Essay, Podcast, News Article) are format descriptors, not topical groupings — the map's Resources tab is organised by the wrong dimension. Resources also lack any belief signal (regulatory stance, AGI timeline, AI-risk level), so they cannot be filtered, plotted, or compared the way actors can.

Underneath the UI pain there is a category error: resources are _cited artefacts_, not _actors_. A node with one edge in a force-directed graph is noise. Putting resources in the same spatial model as actors under-serves both newcomers (who want a reading on-ramp) and researchers (who want faceted lookup).

Affected users:

- **Newcomers** — need a fast on-ramp; "read these ten things" is more useful than 1,500 nodes
- **Researchers / journalists** — need to find resources by topic, stance, year, author
- **Contributors** — need a submission flow that captures topic richly without format becoming a straitjacket
- **Admins** — need to enrich 154 existing resources without per-item manual work

## Requirements

### Library surface

- **R1.** A `/library` page (Vite MPA entry, React like the other non-map pages) is the primary home for resources. It is a faceted searchable list, not a force-directed graph.
- **R2.** The library supports filtering by topic tag, format tag, advocated regulatory stance, advocated AGI timeline, advocated AI-risk level, year, author, and free-text search over title + key argument + notes.
- **R3.** The library supports two display modes toggled in the header: a visual card grid (cover-forward) and a dense list/table. Display mode persists to localStorage.
- **R4.** Selecting a resource opens a detail view that shows title, author(s), format tag(s), topic tag(s), year, URL, key argument, advocated stance/timeline/risk, connected people/orgs (cited-by, authored-by, mentioned-in), and notes.
- **R5.** A secondary tab inside `/library` surfaces curated reading tracks — short editorial sequences (e.g. "New to AI policy", "The regulation debate", "Alignment foundations") — each containing an ordered list of resources with a one-line context blurb per item. Tracks are admin-authored (no contributor submission flow in MVP).
- **R6.** Other AI ecosystem maps (CAIDP AI Index, MIT AI Governance, IAPP Ecosystem Map, Gabriel's Stakeholder Map, democracybuild.org, GovAI People, Global Partners Digital, Springer Academic Map, etc.) are themselves entries in the library — each treated as a first-class resource with a format tag like "Interactive Map" or "Index", its own topic tags, an author/org, and a link-out URL.
- **R6a.** The library surfaces these sister maps in a highlighted section or pinned row in addition to appearing in normal filter results, so newcomers notice them without search.
- **R6b.** Where a sister map publishes structured data we can ingest (entities, resource lists, taxonomies), the seeding/enrichment pipeline imports that data with clear source attribution (e.g. "Via MIT AI Governance") and layers our own topic tags and advocated-stance enrichment on top. Imported items remain visible as our records, not iframed duplicates.

### Taxonomy

- **R7.** Topic tags are multi-valued per resource. Contributors can add arbitrary topic tags; admins periodically review and promote high-use tags into a canonical core set, merge synonyms, and retire low-use tags.
- **R8.** A canonical core of 15-20 topic tags (e.g. AI Safety, Alignment, AGI Governance, Policy Proposal, Regulatory Analysis, Economics, Compute, National Security, Labor, Ethics/Bias, Existential Risk, Forecasting, Foundational/Historical, Empirical Research, Deployment) is seeded and surfaced as default filter chips; emergent tags appear below a "More tags" affordance.
- **R9.** Format is stored as a multi-tag (not a single category). A resource can be both a Podcast and a Blog Post, both a Book and an Essay anthology. Formats remain a small closed set.
- **R10.** Resources drop the single-value `category` field in their UI model; everything topical is a tag.

### Beliefs on resources

- **R11.** Resources gain three advocated-belief fields distinct from author beliefs: advocated regulatory stance, advocated AGI timeline, advocated AI-risk level. Semantics: "what position does this resource argue for", not "what does its author personally hold".
- **R12.** Advocated beliefs are nullable. Library filters tolerate nulls (show "Stance: unknown" chip, filter by "has stance data" vs "all").
- **R13.** Advocated beliefs are optional at submission time. Contributors can leave them blank; admins or the enrichment pipeline fill them in later.

### Map integration

- **R14.** The map's top-level Network tabs are reduced to [All | Orgs | People]; the standalone Resources tab is removed. Library becomes a sibling top-level tab alongside [Network | Library | Plot].
- **R15.** In the Network "All" view, resources are shown by default but only when they have ≥1 edge (no more 0-edge floaters). A visible "Show resources" toggle lets the user hide them.
- **R16.** Clicking a resource node on the map opens the same detail view used in the library (consistent affordance across surfaces).

### Enrichment (UI-first; data follows)

- **R17.** The library UI ships without requiring every resource to be enriched. Empty facets are acceptable in Phase 1 as long as the UI gracefully communicates "unknown" and search still works.
- **R18.** An admin-facing enrichment workflow is spec'd (not necessarily built in Phase 1) that proposes topic tags and advocated stance/timeline/risk for each resource via Claude Haiku reading the resource URL/title/key argument; admin reviews and accepts in a batched queue.

## Success Criteria

- A user unfamiliar with AI policy can land on `/library`, open a reading track, and finish with a clear "what to read next" answer within five minutes.
- A researcher can filter the library to "topic = Alignment, format = Essay, stance = Cautious, year ≥ 2024" and get a non-empty, non-noisy result set within two clicks.
- Resources no longer appear on the map unless they have at least one connection; the "All" view feels like a graph of actors rather than a dumping ground.
- The `/library` page functions usefully even before enrichment is complete — filters that have data work, and resources without data are discoverable through search and tags.
- No resource requires admin to pick a single primary category to exist (multi-tag only).

## Scope Boundaries

- **Not in scope (Phase 1):** LLM enrichment pipeline UI and admin review queue. Phase 1 ships the _schema_ and _library UI_ so enrichment can land without UI changes later.
- **Ingestion of external resource data IS in scope** at the seeding/enrichment stage — imported with source attribution and wrapped in our tag/stance enrichment. Sister maps themselves live in the library as resources. What remains out of scope is _live sync_ or _iframe federation_ — one-off ingest, our copy lives on.
- **Not in scope:** Contributor-submitted reading tracks. Tracks are admin-authored only in Phase 1.
- **Not in scope:** A wiki-style long-form page per resource. Detail view is a panel/modal; full annotated pages can come later.
- **Not in scope:** Changing how people/organisation beliefs are modelled. Resource beliefs are a parallel, distinct schema.
- **Not in scope:** Cross-resource "read-next" recommendations. Tracks provide sequencing; automated recommendations come later.

## Key Decisions

- **Library is the primary surface; map is a lens, not the home.** Resources are cited artefacts; forcing them into an actor-graph is a category error. The library is the right default for newcomers and researchers alike.
- **Hybrid tag system (curated core + emergent).** Pure folksonomy creates sprawl; pure closed set can't keep up with the discourse. Hybrid balances discovery-friendliness against filter quality, with admin promotion doing the normalisation.
- **Format is a tag, not a category.** A podcast episode can also be an interview, a policy explainer, and a foundational conversation. Over-tag is better than under-tag; nothing depends on format being singular.
- **"Stance the resource advocates" over "stance the author holds".** Preserves fidelity for journalism, steel-manning essays, and resources whose authors argue positions they personally doubt (e.g. The Coming Wave). Slightly more enrichment cost; much better semantics.
- **UI-first MVP.** Ships schema + library UI. Enrichment pipeline and reading-track content follow. Avoids a chicken-and-egg problem where enrichment is half-done and has nowhere to render.
- **Edges-only default on map for resources.** Respects the user's intuition that resources are "cited, not actors" while still showing them in-context when they do have connections.
- **Sister maps are resources, plus one-off ingest with our enrichment on top.** Each external map is itself a first-class library entry and highlighted prominently. Where they expose structured data, we ingest once at seeding/enrichment time with clear attribution and apply our own topic tags and advocated-stance enrichment. Avoids ongoing sync burden while still letting us claim richer coverage and consistent metadata than link-out alone would.

## Dependencies / Assumptions

- The existing `entity.other_categories` column (currently a comma-separated string) can be repurposed as the topic-tags column, or a new `topic_tags` column can be added. This is a planning decision.
- Contributor form (`src/contribute/ResourceForm.tsx`) will need a new multi-tag topic input (reuse existing `TagInput` component) and stance/timeline/risk fields. Out of scope for this brainstorm's deliverable but required before Phase 1 ships.
- Admin dashboard will need a tag-merge tool to normalize emergent tags. Can ship in Phase 2 as long as admins are willing to write raw SQL in the meantime.

## Outstanding Questions

### Resolve Before Planning

- _(none — all product decisions above are settled)_

### Deferred to Planning

- **[Affects R7, R10][Technical]** Schema shape for topic tags: new `topic_tags TEXT[]` column on entity, reuse `other_categories` as comma-separated, or a separate `entity_tag` join table. Driven by query performance and admin-tool ergonomics.
- **[Affects R11-R13][Technical]** Storage of advocated-belief fields: reuse the existing `belief_*` columns (currently semantically "beliefs held") for resources, interpreted differently per entity*type, or add `advocated*\*`columns. Driven by how much rework the triggers and`export-map.js` need.
- **[Affects R5][Needs research]** Storage and authoring format for reading tracks: a JSON file in the repo, a new `track` table, or markdown files in `content/tracks/`. Driven by how often admins want to edit them.
- **[Affects R14-R16][Technical]** How to refactor the map's tab state + filter logic to treat Library as a sibling tab without breaking existing view persistence (localStorage `view_mode`, `sub_view` keys).
- **[Affects R2, R17][Technical]** Where faceted filtering happens: client-side over map-data.json (fast, simple) vs. a new `/library` API endpoint (scales further but adds a Lambda). Given 154 resources and likely sub-1k even after enrichment, client-side is the obvious default; confirm at planning time.
- **[Affects R18][Needs research]** Claude Haiku prompt design for advocated-stance extraction. Needs piloting on 10-20 resources to confirm it can reliably distinguish "advocated" from "author-held" before full rollout.
- **[Affects R6b][Needs research]** Per-source ingest design: which sister maps publish structured data (JSON, CSV, scraped HTML) usable without per-item review; what an `entity.source` attribution field should capture; whether to model "sister-map → resource" as an edge. Needs a scouting pass over CAIDP, MIT AI Governance, IAPP, Gabriel's, democracybuild.org, GovAI People, Global Partners Digital, Springer before planning firms up ingest scope.

## Next Steps

→ `/ce:plan` for structured implementation planning.

Also delivered alongside this doc: `docs/mockups/resources-library/index.html` — three UI-only variants (grid, list, tracks-first) with mock data, openable directly in a browser for team review before implementation begins.
