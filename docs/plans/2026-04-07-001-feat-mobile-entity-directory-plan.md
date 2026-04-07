---
title: "feat: Mobile entity directory with deep links"
type: feat
status: active
date: 2026-04-07
origin: docs/brainstorms/2026-04-07-mobile-directory-requirements.md
---

# feat: Mobile entity directory with deep links

## Overview

Replace the unusable D3 force-directed map on mobile (<768px) with a purpose-built entity directory: interactive category bubbles + belief spectrum bars hero section, searchable card list grouped by category, and entity deep links with native share support. Desktop experience unchanged.

## Problem Frame

Phase 2 outreach launches today. Most link recipients will open shared URLs on phones. Currently they see a broken D3 map with a banner saying "Best viewed on desktop" — a dead end. There is also no way to link to a specific entity, so every shared conversation requires "go search for X." (see origin: docs/brainstorms/2026-04-07-mobile-directory-requirements.md)

## Requirements Trace

- R1. Conditional rendering at 768px breakpoint
- R2. Category bubble chart hero
- R3. Belief spectrum bars hero
- R4. Bubble/spectrum tap → filter cards
- R5. Desktop CTA banner
- R6. Search bar (reuses SEMANTIC_MAP)
- R7. Horizontal scroll filter chips (People/Orgs/Resources/All)
- R8. Card list grouped by category
- R9. Medium-density entity cards (thumbnail, name, badge, subtitle, stance dots)
- R10. Card tap → full-screen detail panel
- R11. Query parameter deep links (`?entity=<slug>`)
- R12. Slug generation and lookup
- R13. Share button in detail panel (navigator.share / clipboard)
- R14. Graceful fallback for missing entities

## Scope Boundaries

- **In scope:** Mobile directory in map.html, deep links, share button
- **Not in scope:** Contribute form mobile, offline/PWA, OG meta previews, admin panel mobile
- **Not in scope:** Any changes to desktop D3 map experience

## Context & Research

### Relevant Code and Patterns

- **map.html** — single file containing all HTML, CSS, JS for the map page (~4000+ lines inline)
- **`showDetail(d, allNodes)`** (line 3023) — renders entity detail panel. Core rendering reads only entity properties (name, category, title, org, beliefs, notes, etc.) and works with raw map-data.json objects. D3 coupling exists only in linked-entity click handlers (lines 3217-3265) which need node x/y for zoom — on mobile, skip zoom and just navigate between cards
- **`allData`** (line 1210) — loaded from map-data.json. Contains `people[]`, `organizations[]`, `resources[]`, `relationships[]`, `person_organizations[]`
- **Color systems:**
  - `CATEGORY_COLORS` (line 881): category name → hex color (RColorBrewer Paired)
  - `getColor(cat)` (line 926): accessor, falls back to `DEFAULT_COLOR`
  - `STANCE_COLORS` (line 1221): 7 labels → amber gradient hex values
  - `TIMELINE_COLORS` (line 1233): 5 labels → blue gradient hex values
  - `RISK_COLORS` (line 1243): 5 labels → red gradient hex values
  - `getDimensionColor(dim, val)` (line 1253): unified accessor
- **SEMANTIC_MAP** (line 3294): ~25 topic keys with synonym arrays. `expandQuery()` + `scoreEntity()` work purely on allData arrays — zero D3 dependency
- **Search debounce:** 150ms on input events (line 3431+)
- **`normalizeCategory()`** (line 1872): merges variant names to canonical forms
- **`CLUSTER_ORDER`** (line 1895): defines category ordering
- **Mobile CSS:** @media queries at 600px (line 429, 463, 517) and 768px (line 443). Detail panel already goes `width: 100%` at 600px (line 438, 495)
- **Mobile banner:** already exists at 768px breakpoint (line 443), shows "Best viewed on desktop"
- **Existing image patterns:** Google Favicons for org logos, Wikipedia photos for people — loaded via `loadImage()` async functions

### Data Shape (map-data.json)

654 approved entities. Each entity has: `id`, `entity_type`, `name`, `category`, `other_categories`, `title`, `primary_org`, `other_orgs`, `location`, `regulatory_stance`, `agi_timeline`, `ai_risk_level`, `stance_score` (1-7 numeric), `timeline_score` (1-5), `risk_score` (1-5), `thumbnail_url`, `submission_count`, `source_type`, plus type-specific fields.

Score-to-label arrays for dots:
- Stance (1-7): Accelerate, Light-touch, Targeted, Moderate, Restrictive, Precautionary, Nationalize
- Timeline (1-5): Already here, 2-3 years, 5-10 years, 10-25 years, 25+ years or never
- Risk (1-5): Overstated, Manageable, Serious, Catastrophic, Existential

### Slug Collision Analysis

Zero collisions across all 654 entities. Names are unique within AND across entity types. Simple name-based slugs are safe. IDs are always present as fallback.

## Key Technical Decisions

- **Pure CSS bubbles, not D3 pack layout:** Category bubble count is small (~10 org categories + ~8 person roles + 1 resources). CSS flexbox with sized circles is simpler and faster than d3-pack. Avoids loading D3 on mobile path entirely.
- **Skip D3 import on mobile entirely:** The mobile directory path needs zero D3. Guard the D3 initialization behind the 768px check. This cuts mobile page weight significantly (D3 is ~250KB).
- **showDetail() decoupling for mobile:** The detail panel rendering works with raw entities. On mobile, linked-entity click handlers should find the target in allData and call showDetail() directly, skipping the D3 zoom transition. On desktop, existing behavior unchanged.
- **Slug format: name-based with type prefix:** `?entity=person/sam-altman` or `?entity=org/openai`. Type prefix prevents hypothetical future collisions and makes URLs self-documenting. Slugify: lowercase, spaces→hyphens, strip non-alphanumeric except hyphens.
- **Belief spectrum bars as pure HTML/CSS:** Stacked `<div>` segments with `flex-grow` proportional to entity count per bucket. Tappable. No SVG or D3 needed.
- **Reuse existing mobile banner position:** The hero section replaces the existing mobile banner content area. The "View full map on desktop" CTA lives in the hero section, not as a separate banner.

## Open Questions

### Resolved During Planning

- **Can showDetail() work without D3?** YES — core rendering uses only entity properties. D3 coupling is only in linked-entity zoom transitions, which we skip on mobile.
- **Slug collisions?** Zero across 654 entities. Name-based slugs are safe. Type prefix added for future-proofing.
- **Bubble chart: CSS or D3?** CSS — only ~18 categories, flexbox with sized circles is simpler.
- **Score-to-color for dots?** Score → label via ordered arrays, label → color via existing `*_COLORS` objects.

### Deferred to Implementation

- Exact scroll-position restoration when returning from detail panel — may need to store scrollTop in a variable or use history.pushState
- Whether to lazy-render cards below the fold for initial load speed, or render all ~654 upfront (likely fast enough given they're simple DOM elements)

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
Page Load Flow:
  1. Load map-data.json (same fetch as desktop)
  2. Check window width
     ├─ >= 768px → existing D3 map (unchanged)
     └─ < 768px → mobile directory mode:
          a. Build slug→entity Map for deep links
          b. Compute category counts + belief distributions from allData
          c. Render hero (bubbles + spectrum bars)
          d. Render search + type chip rail
          e. Render card list grouped by category
          f. Check ?entity= param → if match, scroll to card + open detail
          g. Bind tap handlers: bubbles/segments → filter, cards → detail

Filter State Machine:
  activeFilters = { category: Set, stance: Set, timeline: Set, risk: Set, type: Set }
  Any filter change → recompute visible cards → update DOM (show/hide sections + cards)
  Filter sources: bubble tap, spectrum tap, type chip, search query

Detail Panel (mobile):
  Card tap or deep link → showDetail(entity) with mobile flag
  Linked-entity clicks → find target in allData → showDetail(target) (no zoom)
  Back button → hide detail panel, restore card list scroll position
```

## Implementation Units

- [ ] **Unit 1: Deep link infrastructure (slugs + URL parsing)**

  **Goal:** Build the slug system and URL parameter parsing that both mobile and desktop will use.

  **Requirements:** R11, R12, R14

  **Dependencies:** None — foundation unit

  **Files:**
  - Modify: `map.html` (add slug utilities + URL parsing after data load)

  **Approach:**
  - Add `slugify(name)` function: lowercase, replace spaces/special chars with hyphens, collapse multiples, trim
  - After allData loads, build `slugMap`: a Map keyed by `"person/slug"`, `"org/slug"`, `"resource/slug"` → entity object. Also build a reverse lookup (entity id → slug string) for the share button
  - Parse `URLSearchParams` on page load. If `?entity=type/slug` found, store the target for later rendering (both mobile and desktop paths use this)
  - On desktop path: after D3 renders, if deep link target exists, find the node and call existing showDetail + zoom
  - On mobile path: handled in Unit 6
  - If entity not found: render a subtle inline "Entity not found — browse the directory" message

  **Patterns to follow:**
  - Existing `entityByName` pattern at line 3969 for name-based lookup
  - Existing `getVisibleNodes()` pattern for filtering data arrays

  **Test scenarios:**
  - Happy path: `?entity=person/sam-altman` → entity found, detail panel opens
  - Happy path: `?entity=org/openai` → org entity found
  - Edge case: `?entity=person/nonexistent` → "Entity not found" message shown
  - Edge case: Entity name with special characters (ampersands, periods) → slug generated and matched correctly
  - Edge case: No `?entity` param → no action, normal page load
  - Edge case: `?entity=` (empty value) → treated as no param

  **Verification:**
  - Deep link URLs resolve to correct entities on both mobile and desktop
  - Missing entities show graceful fallback, not errors

- [ ] **Unit 2: Share button in detail panel**

  **Goal:** Add a share button to the detail panel that generates and shares/copies the deep link URL.

  **Requirements:** R13

  **Dependencies:** Unit 1 (slug system)

  **Files:**
  - Modify: `map.html` (showDetail function + CSS for share button + toast)

  **Approach:**
  - In `showDetail()`, add a share icon button in the detail panel header (next to close button)
  - On click: build URL using `window.location.origin + window.location.pathname + '?entity=' + entitySlug`
  - If `navigator.share` available (mobile): call it with `{ title: entity.name, url: deepLinkUrl }`
  - Else: copy to clipboard via `navigator.clipboard.writeText()`, show a brief "Link copied!" toast that fades after 2s
  - Toast: fixed-position, bottom-center, minimal styling matching existing mono font

  **Patterns to follow:**
  - Existing detail panel header layout (close button pattern at line 3023+)
  - Existing font/color variables (var(--mono), var(--text-3))

  **Test scenarios:**
  - Happy path: Tap share → navigator.share called with correct title and URL
  - Happy path: Desktop → clipboard.writeText called, toast appears
  - Edge case: Clipboard API unavailable → graceful no-op or fallback alert
  - Integration: Share URL → open in new tab → correct entity detail opens

  **Verification:**
  - Share button visible in detail panel on both mobile and desktop
  - Generated URLs are correct and resolve when opened

- [ ] **Unit 3: Mobile directory scaffold + conditional rendering**

  **Goal:** Gate the D3 force simulation behind a width check. On mobile (<768px), render a mobile directory container instead of the SVG map.

  **Requirements:** R1

  **Dependencies:** None (parallel with Unit 1)

  **Files:**
  - Modify: `map.html` (JS initialization logic + add mobile directory HTML container + CSS)

  **Approach:**
  - After data load, check `window.innerWidth < 768`
  - If mobile: hide `.map-container`, `.controls`, existing `.mobile-banner`. Show `#mobile-directory` container. Skip all D3 initialization (force simulation, zoom behavior, node rendering, tick handlers)
  - If desktop: existing behavior unchanged
  - Add `#mobile-directory` container to the HTML (hidden by default, shown via JS). Structure: `<div id="mobile-directory">` with child containers for hero, search, chips, card-list
  - CSS: mobile directory takes full viewport below nav. Smooth scroll behavior. Use existing CSS variables for colors/fonts
  - Do NOT handle resize/orientation change reactively — the initial load determines the mode (matches existing pattern where `isMobile` is computed once)

  **Patterns to follow:**
  - Existing `isMobile = width < 600` check at line 2678 for pattern of single-check-at-init
  - Existing CSS variable usage throughout map.html

  **Test scenarios:**
  - Happy path: Window < 768px → mobile directory visible, D3 map hidden, no force simulation running
  - Happy path: Window >= 768px → D3 map visible, mobile directory hidden
  - Edge case: Window exactly 768px → D3 map (breakpoint is exclusive)
  - Integration: Dark/light theme toggle works on mobile directory (uses same CSS variables)

  **Verification:**
  - On a phone-width viewport, no D3-related JS executes
  - On desktop viewport, zero changes to existing behavior
  - Page load is noticeably faster on mobile (no force simulation)

- [ ] **Unit 4: Hero section — category bubbles + belief spectrum bars**

  **Goal:** Render the interactive hero visualization: category bubble chart and three belief distribution bars.

  **Requirements:** R2, R3, R4 (filter wiring in Unit 6)

  **Dependencies:** Unit 3 (mobile directory container exists)

  **Files:**
  - Modify: `map.html` (JS rendering functions + CSS for hero section)

  **Approach:**

  *Category Bubbles:*
  - Count entities per normalized category using `normalizeCategory()` + include `other_categories`
  - Render as CSS flexbox with `flex-wrap: wrap`, centered. Each bubble is a `<div>` with `border-radius: 50%`, sized via `width`/`height` proportional to sqrt(count) (sqrt scaling prevents large categories from dominating). Min size 40px for touch targets.
  - Background color from `getColor(category)`. Label inside (category short name + count). White text with text-shadow for readability.
  - Add `data-category` attribute for filter binding

  *Belief Spectrum Bars:*
  - For each dimension (stance/timeline/risk): count entities per label bucket from the text label fields (`regulatory_stance`, `agi_timeline`, `ai_risk_level`). Track null count separately.
  - Render as horizontal flex container. Each segment is a `<div>` with `flex-grow` = entity count for that bucket. Background color from `STANCE_COLORS`/`TIMELINE_COLORS`/`RISK_COLORS`. Min-width 24px for tappable segments.
  - Label row below each bar showing the scale endpoints
  - Show "(N without data)" in small text if nulls exist
  - Add `data-dimension` and `data-value` attributes for filter binding

  **Patterns to follow:**
  - `normalizeCategory()` at line 1872 for category merging
  - `CATEGORY_COLORS`, `STANCE_COLORS`, `TIMELINE_COLORS`, `RISK_COLORS` objects
  - Existing chip styling (mono font, small size, rounded) for segment labels

  **Test scenarios:**
  - Happy path: All categories rendered as bubbles with correct colors and counts
  - Happy path: Three spectrum bars rendered with correct segment proportions
  - Edge case: Category with only 1 entity → still renders as minimum-size bubble
  - Edge case: Dimension where most entities have null scores → bar shows only non-null segments + "(N without data)" note
  - Edge case: Entity with `other_categories` → counted in both primary and secondary category bubbles
  - Integration: Bubble colors match desktop map node colors for same categories

  **Verification:**
  - Bubbles are legible and tappable on a 375px screen
  - Spectrum bar segment widths are proportional to actual entity counts
  - All entities are accounted for (sum of bubble counts >= total entities, allowing for multi-category)

- [ ] **Unit 5: Card list with category grouping + entity cards**

  **Goal:** Render the scrollable card list grouped by category with medium-density entity cards.

  **Requirements:** R8, R9

  **Dependencies:** Unit 3 (mobile directory container)

  **Files:**
  - Modify: `map.html` (JS card rendering + CSS for cards and sections)

  **Approach:**
  - Group all entities by normalized category, ordered per `CLUSTER_ORDER`
  - For each category group: render a sticky section header (category name + colored dot + count)
  - For each entity: render a card with:
    - Thumbnail: 36px circle. Orgs use Google Favicons (`https://www.google.com/s2/favicons?domain=WEBSITE&sz=64`). People use existing thumbnail_url or placeholder. Resources use a small type icon.
    - Name: bold, truncated with ellipsis if too long
    - Category badge: small colored pill using `getColor()`
    - Subtitle: for people = title + " at " + primary_org; for orgs = category; for resources = author + " (" + year + ")"
    - Three stance dots (6px circles): stance=amber palette, timeline=blue, risk=red. Filled circle if score exists (color from score→label→COLOR_MAP), hollow/gray outline if null. Tooltip on hold showing label.
  - Cards use `data-entity-id`, `data-category`, `data-type`, `data-stance`, `data-timeline`, `data-risk` attributes for filtering
  - Add `data-slug` attribute for deep link scrolling

  **Patterns to follow:**
  - Existing detail panel entity rendering in `showDetail()` for field access patterns
  - Existing `getColor()` for category colors
  - Existing `getDimensionColor()` for belief colors
  - Existing card-like styling in `.existing-card` on contribute.html for reference

  **Test scenarios:**
  - Happy path: All 654 entities rendered as cards under correct category headers
  - Happy path: Cards show correct thumbnails, names, subtitles, stance dots
  - Edge case: Entity with null scores → hollow gray dots
  - Edge case: Entity with very long name → truncated with ellipsis
  - Edge case: Resource entity → shows author + year subtitle, type icon thumbnail
  - Edge case: Entity with `other_categories` → appears under primary category section

  **Verification:**
  - Card list renders in under 500ms for 654 entities
  - Cards are readable and tappable on 375px width
  - Category sections appear in CLUSTER_ORDER

- [ ] **Unit 6: Search, filter chips, and filter integration**

  **Goal:** Wire up search bar, type filter chips, hero section taps, and the filter state machine that shows/hides cards.

  **Requirements:** R4, R6, R7, R10, R11 (deep link scroll)

  **Dependencies:** Unit 4 (hero section), Unit 5 (card list), Unit 1 (deep links)

  **Files:**
  - Modify: `map.html` (JS filter logic + search integration + CSS for chips and active states)

  **Approach:**

  *Filter state:*
  - Maintain `mobileFilters = { categories: Set, stance: Set, timeline: Set, risk: Set, type: Set, searchQuery: '' }`
  - On any filter change: iterate all card elements, show/hide based on data attributes matching active filters. Show/hide category sections that have zero visible cards.
  - Active filters shown as dismissible chips above the card list. Tap × to remove.

  *Search:*
  - Reuse `expandQuery()` and `scoreEntity()` functions from existing search system
  - On input (80ms debounce): score all entities, sort by score, show matching cards only. If query empty, clear search filter.
  - Full-width input with search icon, styled with existing mono font

  *Type chips:*
  - Horizontal scroll `<div>` with `overflow-x: auto`, `scroll-snap-type: x mandatory`
  - Chips: All (default), People, Organizations, Resources. Tap to toggle. One active at a time (radio behavior).

  *Hero → filter:*
  - Bubble tap: toggle category in `mobileFilters.categories`. Add/remove `active` class on bubble.
  - Spectrum segment tap: toggle value in `mobileFilters[dimension]`. Add/remove `active` class on segment.

  *Card tap → detail:*
  - On card click: find entity from `data-entity-id`, call `showDetail(entity)` with mobile flag
  - showDetail on mobile: skip zoom transitions, linked-entity clicks → find target in allData → showDetail(target) recursively
  - Back button in detail panel: hide panel, restore scroll position (store in variable before opening)

  *Deep link scroll:*
  - After card list renders, if deep link target exists (from Unit 1): scroll to matching card element, highlight briefly (CSS animation), open detail panel

  *Desktop CTA:*
  - Render between hero and search: "View the full interactive map on desktop →" with dismiss button, localStorage persistence

  **Patterns to follow:**
  - Existing `activeCategories` Set pattern for filter state
  - Existing `expandQuery()` and `scoreEntity()` at lines 3346-3397
  - Existing chip styling and toggle behavior
  - Existing localStorage patterns for persistence

  **Test scenarios:**
  - Happy path: Search "openai" → only matching cards shown
  - Happy path: Tap "Frontier Lab" bubble → card list filters to Frontier Lab entities only
  - Happy path: Tap "Restrictive" stance segment → only entities with Restrictive stance shown
  - Happy path: Tap People chip → only person entities shown
  - Happy path: Combine bubble filter + type chip → intersection shown
  - Happy path: Card tap → detail panel opens full-screen, back button returns to cards
  - Happy path: Deep link → card scrolled into view, highlighted, detail opens
  - Edge case: Search with no results → "No matching entities" message
  - Edge case: Clear search → all cards shown (respecting other active filters)
  - Edge case: Tap active filter to deselect → filter removed, cards expand
  - Edge case: Multiple filters active → dismissible chip for each, tap × to remove individually
  - Integration: SEMANTIC_MAP expansion works (search "safety" finds alignment orgs)
  - Integration: Desktop CTA dismiss persists across page loads

  **Verification:**
  - All filter combinations produce correct card visibility
  - Search results match expected semantic expansion
  - Deep link + mobile directory renders correct entity on page load
  - Filter state is visually clear (active bubbles/segments/chips are highlighted)

- [ ] **Unit 7: Mobile CSS polish + dark mode**

  **Goal:** Ensure the mobile directory looks polished in both light and dark themes, with proper spacing, typography, and touch targets.

  **Requirements:** R5, R9 (visual polish)

  **Dependencies:** Units 3-6 (all rendering complete)

  **Files:**
  - Modify: `map.html` (CSS refinement)

  **Approach:**
  - Verify all mobile directory elements use CSS variables (--bg-panel, --text-1, --text-3, --line, --mono, --accent) so dark mode works automatically
  - Ensure all tap targets are ≥44px
  - Add smooth transitions on filter state changes (card show/hide)
  - Test at 375px (iPhone SE), 390px (iPhone 14), and 768px boundary
  - Adjust hero section spacing so bubbles + bars + CTA fit comfortably above the fold on a typical phone
  - Sticky category section headers during scroll
  - Safe-area-inset-bottom on the last card for notched phones

  **Patterns to follow:**
  - Existing `[data-theme="dark"]` CSS variable overrides
  - Existing `env(safe-area-inset-bottom)` usage at line 495

  **Test scenarios:**
  - Happy path: Light theme renders correctly at 375px, 390px
  - Happy path: Dark theme renders correctly (all elements use CSS variables)
  - Edge case: 768px exactly → desktop mode, no mobile directory elements visible
  - Edge case: Notched phone → bottom content not hidden behind home indicator

  **Verification:**
  - Visual inspection at multiple widths in both themes
  - No text smaller than 11px, no tap targets smaller than 44px
  - Hero section fits above the fold on 667px-height viewport (iPhone SE)

## System-Wide Impact

- **Interaction graph:** `showDetail()` is the shared entry point for both mobile cards and desktop node clicks. Mobile path adds a new caller but reuses the same function. Linked-entity clicks inside the detail panel need a branch: mobile → navigate to card, desktop → zoom to node.
- **Error propagation:** Deep link with invalid slug → graceful "not found" inline message. No error pages or alerts.
- **State lifecycle:** Mobile filter state is ephemeral (no localStorage). Only the desktop CTA dismissal and theme are persisted. Detail panel scroll-position restoration needs careful handling (store before opening, restore after closing).
- **API surface parity:** Deep links work on both mobile and desktop — same URL format, different rendering behavior. Share button works on both.
- **Performance:** Skipping D3 on mobile eliminates the heaviest JS execution. 654 cards is ~654 DOM nodes — should render in <500ms. If sluggish, can defer below-fold cards with IntersectionObserver.

## Risks & Dependencies

- **Risk: showDetail() has hidden D3 dependencies beyond what research found.** Mitigation: Unit 3 tests should verify detail panel renders correctly on mobile without any D3 initialization. If issues found, create a `showDetailMobile()` wrapper that handles the differences.
- **Risk: 654 cards cause scroll jank on low-end phones.** Mitigation: Monitor during Unit 5. If needed, add virtual scrolling or pagination in a follow-up. Likely fine for this entity count.
- **Risk: Query params stripped by CloudFront or S3.** Mitigation: S3 static hosting serves `map.html` regardless of query params (they're ignored server-side, parsed client-side). CloudFront forwards query strings by default. Low risk.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-07-mobile-directory-requirements.md](docs/brainstorms/2026-04-07-mobile-directory-requirements.md)
- Related code: `map.html` (all changes are in this single file)
- Color systems: lines 881-926 (CATEGORY_COLORS), 1221-1259 (dimension colors)
- Search system: lines 3294-3531 (SEMANTIC_MAP, expandQuery, scoreEntity)
- Detail panel: line 3023 (showDetail function)
- Category ordering: line 1895 (CLUSTER_ORDER)
