# Tasks

Pre-launch items to complete before deployment.

**Deadline:** All features done and debugged before team meeting Wednesday 4/1.

## Rollout Strategy

**Phase 1 — Trusted contacts | Thursday 4/2**

Sharing with our immediate network for feedback on the visualization, form contribution mechanism, and where the mapping tool could be most useful. Honest feedback from trusted people is the priority. No need for a formal intro script.

**Phase 2 — Contributor outreach | Monday 4/6**

Reaching out to "super connectors" we want contributing to the map. Testing two narratives:
- Open source framing: we're building a tool for anyone involved to use, and want their input
- Policy framework framing: this is our literature review period for a broader policy initiative — contribute now, and we'll follow up to engage your perspectives

Building the "readership" model (see: Situational Awareness). Getting organizations and key thought leaders behind us early adds credibility.

**Phase 3 — Public release | Wednesday 4/8**

Open contribution from the public. Needs:
- Create an X account (check if mapping-ai is available)
- Begin outreach to major AI-focused Substacks
- Research blog on methodology and insights derived
- Product polished and mostly filled in

---

## Bugs (Launch-Critical — fixing now)

- [x] **Edges pipeline broken**: export outputs `edges` but map.html reads `relationships`/`person_organizations` — all network connections invisible on map (fixed: export-map.js now JOINs entity types and outputs both `relationships` + `person_organizations` arrays)
- [x] **Search API leaks pending/internal entities**: default status filter was a no-op — now defaults to `AND status = 'approved'`
- [x] **Admin key in client source**: removed hardcoded key from admin.html (now prompt-on-load with localStorage), removed fallback in admin.js
- [x] **update_entity doesn't refresh map**: added `refreshMapData()` call to update_entity action
- [x] **Admin cache never invalidates**: added `invalidateEntityCaches()` to all mutation handlers (approve/reject/merge/edit/delete)
- [x] **Export leaks DB columns**: replaced `{ ...row }` spread with explicit field allowlist in `toFrontendShape()`
- [x] **Submit drops parent_org_id**: added column to submission table schema, trigger, and submit.js INSERT
- [x] **Merge can't clear fields**: removed null-overwrite guard — admin merge selections are now applied as-is
- [x] **dev-server.js completely broken**: rewrote all queries for 3-table schema (entity/submission/edge), uses shared `generateMapData` for /submissions endpoint
- [x] **Dropdown border artifact**: fixed — `z-index:41` on `.custom-select.open` + `translateZ(0)` on options panel eliminates bleed-through lines
- [x] **Dropdown CLEAR shrinks box**: fixed — clear handler now restores "Select..." placeholder instead of emptying trigger text
- [x] **Admin auth gate missing**: restored auth-gate HTML, admin key prompt-on-load with localStorage persistence
- [x] **Admin API_BASE hardcoded**: added localhost detection (same pattern as contribute.html)
- [x] **No sticky submit on mobile**: added `position: sticky; bottom: 0` on mobile submit button
- [x] **Academic category illegible**: changed from pale yellow (#FFFF99) to golden amber (#D4A017)
- [x] **Category chips lack selected/deselected contrast**: active chips now 25% opacity bg + full color text; inactive chips 10% opacity bg + faded text

## Features

- [ ] Mobile view: search feature for map optimized
- [ ] Mobile view: contribute form responsive
- [x] Tooltip on how the viz can be used (basic onboarding overlay + "About this map" button added — still needs: animated walkthrough, stakeholder-specific guidance, contribution flow tutorial)
- [x] Contribute form: "How it works" popup explaining review process, AI enrichment, belief scores, and privacy
- [ ] Entity/node information more condensed in detail panel -- right now, too overwhelming
- [ ] Edge/All visualization: hide resources not attached to people/orgs
- [ ] Resources visualization improvements
- [ ] Entity sizing based on importance (LLM)
- [x] Decisionmaker/influence: support multiple hats via "tags" (implemented as other_categories — primary + secondary categories)
- [x] People: support multiple roles (e.g., Researcher + Policymaker) (multi-select checkboxes on form, filter matches both primary + secondary, detail panel shows badges)
- [ ] Community page (e.g., community Slack link/signup)

## Data
- [ ] DB persistence ("transactions" db for merges, edits, etc.)
- [ ] DB needs to be production tested (edge cases, traffic, etc.)
- [ ] Data manual review (e.g., "Adolescence of Technology" vs "Technology Adolescence")
- [x] Data enrichment: Tier 1 entities across all stakeholder categories (321 people, 430 orgs, 288 edges as of 4/1); all orgs now enriched
- [x] Data cleanup: deduplicated 31 duplicate orgs (461 → 430), added 16 notable US AI figures (Pichai, Nadella, Tristan Harris, etc.)
- [ ] Data enrichment: Tier 2 entities (policymakers, executives, labor/advocacy — script ready but not run)
- [ ] Fix tagging between people and organizations (right now, many people are missing organizational tags)
- [ ] Add missing organizations (may need Exa API)
- [ ] Production-scale DB structure and data persistence review

## Production Readiness
- [ ] **Load testing**: 1,000 simultaneous read/write to DB — verify Lambda/RDS can handle Phase 3 traffic
- [ ] **Entity cache layer**: pre-load all entities (including pending) into a cached copy so dropdowns, @mentions, and autocomplete are instant
- [ ] **Thumbnail caching**: cache Google Favicon + Wikipedia headshots to reduce 404s and load faster
- [ ] **Search API auth for pending**: `/search?status=pending` currently accessible without admin key — should require auth
- [ ] **Parameterize SQL type clause**: search.js type param uses string interpolation — switch to parameterized query
- [ ] **Map physics damping**: reduce D3 force simulation jiggle when dragging nodes (alpha decay / velocity decay tuning)
- [ ] Static JSON pulls: verify map-data.json served correctly from CloudFront
- [ ] Caching strategy: proper cache headers, invalidation timing, CDN behavior
- [ ] Full-text search: evaluate static filtering client-side vs live DB queries
- [ ] Staging pipeline: separate staging environment for testing before prod deploys
- [ ] **Mobile: SEE MAP button overlaps sticky submit** on contribute.html at 375px width

## UI/UX
- [x] Contribute form dropdown has weird lines (fixed CSS border artifact)
- [x] Contribute form: replace "Clear" with select/deselect toggle for dropdowns (click-to-deselect, grey background on selected, fixed column width expansion)
- [ ] Contribute form: move "Your Relationship" section to the very top
- [ ] Contribute form: make adding an org more obvious/discoverable
- [ ] Theory of Change: revise "existing landscape" sentence (too dramatic/cosmetic)

## Additional Material
- [ ] Short research blog on visualization methodology, data processing, and results (showcasing how the tool can be used)

---

## In Progress

| Task | Owner | Notes |
|------|-------|-------|
| Map onboarding: animated walkthrough | | Basic overlay done, needs stakeholder-specific guidance + contribution flow tutorial |
| Resource viz improvements | | Tier 2: topic-based clustering, orphan anchoring, multi-category tags |
| Mobile optimization | | Tier 2: bottom sheet controls, progressive form, touch gestures |

## Done

| Task | Owner | Completed | Notes |
|------|-------|-----------|-------|
| Edges pipeline (map connections broken) | Anushree | 3/31 | Export now JOINs entity types, outputs relationships + person_organizations |
| Search API leaks pending/internal entities | Anushree | 3/31 | Defaults to `AND status = 'approved'` |
| Admin key removed from source | Anushree | 3/31 | Prompt-on-load with localStorage, fallback removed from admin.js |
| update_entity refreshes map | Anushree | 3/31 | Added refreshMapData() call |
| Admin cache invalidation | Anushree | 3/31 | invalidateEntityCaches() on all mutations |
| Export column allowlist | Anushree | 3/31 | No more leaked belief_*_wavg/wvar/n in map-data.json |
| parent_org_id in submit pipeline | Anushree | 3/31 | Added to submission table, trigger, and submit.js |
| Merge null-overwrite guard removed | Anushree | 3/31 | Admin merge selections now apply as-is |
| Dropdown line artifacts | Anushree | 3/31 | z-index stacking context + translateZ fix |
| Dropdown CLEAR shrinks box | Anushree | 3/31 | Restores "Select..." placeholder |
| Admin auth gate restored | Anushree | 3/31 | Was missing from HTML; now prompt + localStorage |
| Admin API_BASE localhost detection | Anushree | 3/31 | Same pattern as contribute.html |
| Dev server rewritten for 3-table schema | Anushree | 3/31 | All endpoints work with entity/submission/edge |
| Dev server stats format fixed | Anushree | 3/31 | Matches production Lambda response shape |
| Map controls scrollable | Anushree | 3/31 | overflow-y: auto so About button reachable |
| Basic map onboarding overlay | Anushree | 3/31 | First-visit overlay + "About this map" button |
| Academic category color fix | Anushree | 3/31 | #FFFF99 → #D4A017 (golden amber) |
| Category chip active/inactive contrast | Anushree | 3/31 | Active=25% bg + full color, inactive=10% bg + faded |
| Homepage View Map + Contribute buttons | Sophia | 3/31 | Two CTA buttons: primary (View Map) + secondary outline (Contribute) |
| TIME100 AI 2025 seeding + enrichment | Sophia | 4/1 | 41 people, 38 orgs added with edges; all enriched with stances/timelines via Exa + Claude |
| Tier 1 data seeding: Academics/Investors | Sophia | 4/1 | 41 people, 15 orgs added with edges; enriched via Exa + Claude (~$5.45) |
| Tier 1 data seeding: Journalists/Organizers | Sophia | 4/1 | 26 people, 15 orgs added; enriched (~$3.46) |
| Tier 1 data seeding: Ethics/Govt/Cultural | Sophia | 4/1 | 28 people, 13 orgs added; enriched (~$3.72) |
| Expanded academics list (user consolidated) | Sophia | 4/1 | 37 people, 18 orgs added (political economy, law, STS, AI safety, discourse); enriched (~$4.90) |
| Full enrichment pipeline run | Sophia | 4/1 | All new entities enriched + pushed to production; final counts: 305 people, 461 orgs, 286 edges |
| Organization enrichment (all 99 unenriched) | Sophia | 4/1 | All 461 orgs now have stance/timeline/risk data; 97 orgs enriched via Exa + Claude (~$8.69) |
| URL validation bug fix | Sophia | 4/1 | Changed from type="url" to type="text" with auto-prefix; accepts any TLD (.gov, .ai, etc.) |
| affiliatedOrgIds storage fix | Sophia | 4/1 | Added JSONB column to submission table; backend creates edges on approve/merge |
| Utility scripts schema migration | Sophia | 4/1 | 11 scripts updated from old tables to unified entity table |
| Dropdown UX improvements | Sophia | 4/1 | Click-to-deselect, grey background on selected, fixed column width with text truncation |
| Map: show stance detail in detail panel | Sophia | 4/1 | regulatory_stance_detail now displayed for people and orgs |
| Map: affiliated person click navigates properly | Sophia | 4/1 | Clicking affiliated person switches view, zooms to node, shows full details |
| Election enrichment: PACs + candidates | Anushree | 3/31 | 6 PACs, 13 candidates, 16 edges via Exa; notes_html added to entity table |
| Multi-category support (primary + secondary) | Anushree | 4/1 | other_categories on entity/submission; form checkboxes, map filter + detail badges |
| Data cleanup: org deduplication | Sophia | 4/1 | 31 duplicate orgs merged (461 → 430); edges re-linked to canonical orgs |
| Data cleanup: notable US figures added | Sophia | 4/1 | 16 people added (Pichai, Nadella, Tristan Harris, etc.) and enriched with stances |
| enrich-deep.js DB compatibility fix | Sophia | 4/1 | Fixed column names (belief_* prefix), removed non-existent threat_models_detail |
| Contribute form: "How it works" popup | Sophia | 4/1 | First-visit overlay explaining review, enrichment, belief scores, privacy |

---

## Distribution

Fill out the [distribution spreadsheet](https://docs.google.com/spreadsheets/d/1qB7tuY6b0viw60wIvV_1QB4_fOCFJtV2tIl2ZjtvkRc/edit?usp=sharing) to cover all stakeholder categories for well-rounded feedback from Phase 1 onwards.
