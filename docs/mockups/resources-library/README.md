# Resources Library — UI mockups

Static, UI-only mockups paired with the requirements doc at
[`docs/brainstorms/2026-04-19-resources-rethink-requirements.md`](../../brainstorms/2026-04-19-resources-rethink-requirements.md).

## Open it

```
open docs/mockups/resources-library/index.html
```

It's a single standalone HTML file. No build step. Tailwind loads from CDN.
All data in `data.js` is fabricated to exercise the schema we plan to ship
(multi-tag format, multi-tag topic, advocated stance / timeline / risk,
source attribution for sister maps).

## Variants

| Tab   | Variant             | What it's testing                                                                                                                                                                                                                                            |
| ----- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A** | Reading-room grid   | Cover-forward cards; topic tags + stance bar visible at a glance. Left rail holds faceted filters (topic, format, stance, year) and the "Other ecosystem maps" link-out list. Sister maps also appear as a pinned highlighted row at the top of the results. |
| **B** | Dense research list | Table-like layout with one row per resource, key argument inline, stance bar in-row, and strong sorting (most cited). Aimed at researcher / power-user use.                                                                                                  |
| **C** | Tracks-first        | Editorial landing page that leads with curated reading tracks (New to AI policy, the regulation debate, alignment foundations). Each track item has an editorial blurb. Intended as a secondary view inside /library, not a replacement.                     |
| **D** | Detail panel        | What you see when you click into a single resource from any of the above. Shows advocated beliefs, topic tags, authored-by / cited-by, which tracks include it, and (later) source attribution when ingested from a sister map.                              |

## Dimensions visualised

- **Topic tags** as filter chips, with counts; emergent tags collapsed under "+ 23 emergent tags" and styled with dashed borders to distinguish core vs. emergent.
- **Format tags** as secondary chips on every resource (multi-valued).
- **Advocated stance** as a horizontal gradient bar with a position marker (Accelerationist → Cautious). Shown both in cards (A) and inline in table rows (B).
- **Advocated timeline / advocated risk** as short labels in the card footer or dedicated columns.
- **Cited-by count** as a quiet "cited × N" chip, so influence is visible without dominating.
- **Source attribution** (D) for items that came from a sister map ingest.
- **Sister ecosystem maps** both pinned at the top of the grid (A) and appearing in the regular list as first-class resources with format = "Interactive Map" / "Index".

## What these mockups are _not_

- Not wired to real data. The DB has 154 resources; mockups show 16 curated to cover every field we want to render.
- Not responsive yet. Desktop-first. Mobile comes later.
- Not using the real app chrome (Navigation component). Intentionally isolated so we can iterate on the inner layout without dragging Vite/Tailwind config into the prototype.
- Not a React app. Plain JS + template strings, to keep this as a throwaway mockup.

## How to iterate

Edit `data.js` to test more edge cases (missing stance, long titles, sister-map resources, resources with no cited-by, etc.). Edit the `renderA/B/C/D` functions at the bottom of `index.html` to try new layouts; each variant is self-contained so you can rip one out without breaking the others.
