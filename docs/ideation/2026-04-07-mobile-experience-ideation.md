---
date: 2026-04-07
topic: mobile-experience
focus: "Mobile UX overhaul for map.html and contribute.html — replace D3 map with mobile directory, fix contribute form"
---

# Ideation: Mobile Experience Overhaul

## Codebase Context

**Project:** Static HTML/CSS/JS app with D3.js stakeholder map, crowdsourced contribution forms, and admin panel. Backend is AWS Lambda + RDS Postgres.

**Current mobile state:** Scattered @media queries at 600/768px breakpoints. Bottom-sheet controls attempted but cramped (9px fonts). Detail panel goes full-width on mobile. TipTap mention dropdown overflows (min-width 420px). Zoom-behind-panel bug. SEE MAP / sticky submit overlap at 375px. No pinch-zoom. Cluster labels illegible. The mobile banner literally says "Best viewed on desktop." ~2500 lines of inline CSS per page, no shared stylesheet.

**Launch context:** Phase 2 outreach launching 4/7. Mobile users will be people receiving shared links — they need a working experience, not a broken map.

**Past learnings:** Client-side search from map-data.json is the proven fast pattern (80ms debounce). Side panels fall back to full-page at <768px. Bottom sheet pattern identified as correct replacement for mobile controls but rated High complexity. Zoom-behind-panel is a documented known issue.

## Ranked Ideas

### 1. Mobile Entity Directory (Hybrid: Category Bubbles + Belief Spectrum Bars + Card List)
**Description:** On screens <768px, skip D3 force simulation. Show a hero section with interactive category bubbles (sized by entity count) and three belief spectrum bar charts, followed by a searchable card list grouped by category. Tapping bubbles/segments filters cards. Medium-density cards with thumbnail, name, category badge, subtitle, stance dots. Full-screen detail panel on tap.
**Rationale:** The D3 map is fundamentally unusable on mobile. A purpose-built directory with visual previews gives the "data-rich tool" feeling without force simulation costs. All data and search infrastructure already exist client-side.
**Downsides:** Two rendering paths to maintain. Card + viz design needs to feel intentional, not like a fallback.
**Confidence:** 90%
**Complexity:** Medium
**Status:** Explored (brainstormed 2026-04-07 → docs/brainstorms/2026-04-07-mobile-directory-requirements.md)

### 2. Entity Deep Links + Social Sharing
**Description:** Query param deep links (map.html?entity=openai) with navigator.share() on mobile, clipboard copy on desktop. Slug-based lookup against map-data.json. Share button in detail panel.
**Rationale:** Zero deep-linking exists. Phase 2 outreach means shared links — every entity needs to be directly linkable. Highest-leverage feature for viral distribution.
**Downsides:** OG preview cards deferred (would need serverless image generation). Slug collisions need handling.
**Confidence:** 85%
**Complexity:** Low-Medium
**Status:** Explored (included in mobile directory requirements)

### 3. "Claim Your Profile" Contribution Flow
**Description:** For outreach targets who receive deep links to their own entity, show "Is this you? Update your profile" button. Pre-fills contribute form with existing data. Self-reports get 10x belief score weighting.
**Rationale:** Phase 2 targets people already in the database. Edit submissions and self-report weighting already exist in the pipeline.
**Downsides:** Needs light verification. Pre-filling requires data passing between pages. "Claim" framing might feel invasive.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

### 4. Progressive Form Wizard with Mobile-Native Components
**Description:** Break contribute form into 4-step wizard on mobile. Replace TipTap with plain textarea, checkboxes with chip toggles, location geocoding with text input. Inline duplicate detection banner instead of sidebar overlay.
**Rationale:** 15+ fields in single-column mobile scroll is overwhelming. TipTap toolbar (26x24px) and checkboxes (18x18px) are below touch-target minimums.
**Downsides:** Two form rendering modes to maintain. Step boundaries are somewhat arbitrary.
**Confidence:** 80%
**Complexity:** Medium-High
**Status:** Unexplored

### 5. Quick Tip Micro-Contribution Mode
**Description:** 3-field rapid capture: name/org, one belief stance (tap scale), free-text note. Existing LLM review pipeline can extract structured fields. Conference hallway use case.
**Rationale:** Full form takes 2+ minutes on mobile. Quick tip takes 10 seconds. Submission pipeline already handles partial data.
**Downsides:** Lower-quality submissions requiring more admin work. May fragment contribution UX.
**Confidence:** 70%
**Complexity:** Low
**Status:** Unexplored

### 6. Offline-Ready PWA with Service Worker Caching
**Description:** Service worker caching map-data.json + static assets. Stale-while-revalidate strategy. Card browser + search work entirely from cache. Offline form queue in IndexedDB.
**Rationale:** Architecture is accidentally perfect — single static JSON file contains entire dataset, search is 100% client-side. Conference WiFi use case.
**Downsides:** Cache invalidation complexity. PWA install prompts.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Shared CSS design token layer | Infrastructure refactor, not a mobile UX idea |
| 2 | Unified localStorage manager | Premature abstraction for current project size |
| 3 | Chat interface for contribute | Entire new product; too expensive relative to value |
| 4 | Conference mode / "Who's here?" | Location data too sparse to be useful |
| 5 | Entity bookmarks / watchlist | No returning-user base yet; premature |
| 6 | Simplified cluster tap map | Complex; card browser is simpler and more useful |
| 7 | Mini relationship graph in cards | Expensive per-card D3 rendering; text links suffice |
| 8 | Landscape mode layout | Edge case of an edge case |
| 9 | Progressive map rendering / entity budget | Card browser eliminates need to optimize D3 on mobile |
| 10 | Touch gesture layer (pinch-zoom, swipe) | Card browser eliminates D3 touch problems |
| 11 | Auto-detect entity type from input | Unreliable; wrong guesses frustrate more than toggle costs |
| 12 | Swipeable entity navigation | Nice but non-essential; tappable links work |
| 13 | Compact belief radar on cards | Premature card optimization; start with text labels |
| 14 | Auto-fill from existing graph data | Unreliable pre-fills confuse users |
| 15 | Mobile belief voting (slider) | New feature, not mobile optimization |
| 16 | Accessibility / screen reader | Important but separate initiative |
| 17 | Retry queue with connection status | Rare failure case; covered by offline PWA idea |
| 18 | Bottom sheet detail panel | Card browser changes interaction model enough |
| 19 | SEE MAP / submit overlap fix | Real bug but too small for ideation; just fix it |
| 20 | Swipe-dismissible detail panel | Subsumed by card browser approach |

## Session Log
- 2026-04-07: Initial ideation — 48 raw ideas from 6 sub-agents, 32 unique after dedupe, 6 survivors. Brainstormed idea #1+#2 into requirements doc.
