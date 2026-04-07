---
date: 2026-04-07
topic: mobile-entity-directory
---

# Mobile Entity Directory + Deep Links

## Problem Frame

The map page (map.html) and contribute form (contribute.html) are unusable on mobile. The D3 force-directed graph cannot work on small touch screens — nodes are too small, cluster labels are illegible, the bottom control bar is cramped (9px fonts), and the detail panel goes full-width obscuring the map entirely. The mobile banner already admits "Best viewed on desktop." With Phase 2 outreach launching today, most link recipients will open shared URLs on phones and hit a dead end.

The contribute form is a secondary concern addressed in a separate ideation track. This document covers the mobile map page experience and entity deep linking.

## Requirements

### Mobile Directory Mode (<768px)

- R1. **Conditional rendering at 768px breakpoint.** Below 768px, skip D3 force simulation entirely. Render the mobile directory mode instead. Above 768px, render the existing desktop map unchanged.

- R2. **Hero section: Category bubble chart.** Render an interactive bubble chart where each bubble represents a category (Frontier Lab, AI Safety, Think Tank, Government, etc.), sized proportionally to entity count, using the existing category color palette. Bubbles are touch-friendly tap targets. Lightweight D3 or pure CSS — no force simulation.

- R3. **Hero section: Belief spectrum bars.** Below the bubbles, render three horizontal stacked bar charts showing the distribution of all entities across Regulatory Stance (7-point scale), AGI Timeline (5-point scale), and AI Risk Level (5-point scale). Each segment uses the existing dimension color palettes (amber gradient for stance, blue for timeline, red for risk). Segments are tappable.

- R4. **Bubble/spectrum tap → filter cards.** Tapping a category bubble filters the card list below to only entities in that category (primary or secondary). Tapping a spectrum segment filters to entities with that belief value. Tap again to clear the filter. Active filter state shown as a dismissible chip above the card list. Multiple filters can combine (category + belief).

- R5. **Desktop CTA banner.** Between the hero section and the card list, a subtle banner: "View the full interactive map on desktop" with a dismiss button. Persisted to localStorage when dismissed.

- R6. **Search bar.** Persistent search input above the card list. Reuses the existing client-side search infrastructure (SEMANTIC_MAP with 40+ term groups, 80ms debounce against map-data.json). Autocomplete dropdown styled for mobile (full-width, large tap targets).

- R7. **Horizontal scroll filter chips.** Below the search bar, a single horizontally scrollable chip rail for quick filtering by entity type (People / Orgs / Resources / All). These combine with hero section filters.

- R8. **Card list grouped by category.** Cards are grouped under category section headers (matching the bubble chart categories). Section headers show category name + count. Tapping a bubble scrolls to that category section AND filters.

- R9. **Medium-density entity cards.** Each card shows: thumbnail (Google Favicons for orgs, Wikipedia photos for people), entity name, category badge (colored), subtitle (title + primary org for people; category for orgs; author + year for resources), and three small stance dots (colored circles for stance/timeline/risk scores, hollow if null). Cards are full-width, stacked vertically.

- R10. **Card tap → full-screen detail panel.** Tapping a card opens the existing detail panel as a full-screen overlay (already implemented at 600px breakpoint). Back button/swipe returns to the card list at the same scroll position. The detail panel content is unchanged from desktop.

### Entity Deep Links + Sharing

- R11. **Query parameter deep links.** Support `map.html?entity=<slug>` where slug is a URL-safe version of the entity name (lowercased, spaces to hyphens, special chars stripped). On page load, parse the query param, find the matching entity in map-data.json, and open its detail panel. On desktop: also zoom to the node. On mobile: scroll to the card and open the detail panel.

- R12. **Slug generation and lookup.** Generate slugs deterministically from entity names. Handle collisions by appending entity ID (e.g., `sam-altman` or `john-smith-42` if multiple). Slug lookup must be fast (build a Map on data load).

- R13. **Share button in detail panel.** Add a share button (share icon) to the detail panel header. On mobile, uses `navigator.share()` with title = entity name, url = deep link. On desktop or when navigator.share is unavailable, copies the deep link URL to clipboard with a "Copied!" toast.

- R14. **Graceful fallback for missing entities.** If a deep link points to an entity not found in current map-data.json (deleted, renamed), show a brief "Entity not found" message with a link to browse the directory. Do not show an error page.

## Success Criteria

- A mobile user opening a shared link sees a visually rich directory (not a broken map) within 1 second of page load
- Tapping a category bubble or spectrum segment filters cards instantly (<100ms)
- Entity deep links work end-to-end: share button → copy/share URL → recipient opens → sees entity detail
- The hero section (bubbles + spectrum bars) communicates "this is a data-rich visualization tool" without requiring the full D3 map
- Desktop experience is completely unchanged

## Scope Boundaries

- **In scope:** Mobile directory mode for map.html, deep links, share button
- **Not in scope:** Mobile contribute form improvements (separate track), offline/PWA (future), OG meta tag previews for social cards (can add later without changing the URL scheme), admin panel mobile
- **Not in scope:** Any changes to the desktop D3 map experience
- **Deferred:** "Claim your profile" flow, quick tip micro-contribution mode

## Key Decisions

- **768px breakpoint** for directory mode: Matches existing mobile banner trigger and inline org panel fallback pattern. iPads in portrait get directory; landscape gets map.
- **Category grouping** over type tabs: Creates a direct visual link between the bubble chart hero and the card list. Category is the primary organizational axis of the desktop map too.
- **Query params over hash routing**: `?entity=openai` is more readable than `#entity=123` for sharing. Still works with static hosting (query params are ignored by S3/CloudFront for static files).
- **Full-screen detail panel** over bottom sheet or inline expansion: Reuses existing code (detail panel already goes full-width at 600px). Simpler to implement. Consistent mental model with desktop.
- **No force simulation on mobile**: The card directory is not a degraded map — it is a purpose-built mobile experience. The hero visualizations (bubbles + spectrum) give the "map preview" feeling without the performance and usability costs of SVG force layout on phones.

## Dependencies / Assumptions

- map-data.json structure is stable (entity fields, scores, edges)
- Existing category color palette and dimension color palettes are reusable
- The existing detail panel `showDetail()` function can be called from card tap without requiring the D3 SVG context
- SEMANTIC_MAP search infrastructure works independently of the D3 rendering

## Outstanding Questions

### Deferred to Planning
- [Affects R2][Technical] Can the bubble chart be pure CSS/HTML or does it need lightweight D3? Need to assess whether d3-force is needed for bubble packing or if a simpler CSS grid with sized circles suffices.
- [Affects R9][Technical] How to render stance dots on cards — need to check what score values map to what colors. The existing plot view has this mapping.
- [Affects R11][Technical] Does `showDetail()` in map.html depend on D3 simulation data (node x/y positions, etc.) or can it work from raw map-data.json entity objects? If coupled, need to decouple.
- [Affects R12][Needs research] Slug collision frequency — how many entities share names? Determines whether simple slug generation is sufficient or if ID-appended slugs should be the default.
- [Affects R3][Technical] How to compute belief distributions from map-data.json on the client side — need to count entities per score bucket. Straightforward but need to handle nulls.

## Next Steps

-> `/ce:plan` for structured implementation planning
