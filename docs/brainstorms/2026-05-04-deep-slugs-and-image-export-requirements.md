---
date: 2026-05-04
topic: deep-slugs-and-image-export
---

# Deep Slugs & Static Image Export

## Problem Frame

Mapping-ai.org's map URLs are opaque query params (`?entity=person%2F42`) that are hard to share, hard to remember, and invisible to search engines. Stakeholders sharing entity links in emails, Slack, and reports need clean URLs like `/map/person/dario-amodei`. Separately, users presenting map findings in meetings or reports have no way to export what they see as an image.

## Requirements

### Deep Slugs

- R1. Entity URLs follow the pattern `/map/{type}/{name-slug}` where type is `person`, `org`, or `resource` and name-slug is a URL-safe lowercase kebab-case version of the entity name.
- R2. A `slug` column is added to the entity table. Slugs are generated on entity creation and stored persistently. Existing entities get a one-time backfill migration.
- R3. Slugs are unique within each entity type. Same-type name collisions append a numeric suffix (`-2`, `-3`). Cross-type collisions are avoided by the type prefix in the URL.
- R4. Opening a deep slug URL loads the map, zooms the camera to the entity node (3x scale), highlights connected edges, dims unconnected nodes, and opens the detail panel. This matches the current `?entity=` behavior.
- R5. The share button and copy-link functionality use the new slug-based URL format.
- R6. Old `?entity=person/42` links continue to work as a fallback (resolve by ID if slug lookup fails).
- R7. `map-data.json` includes the slug field for each entity so the client can build slug-to-entity lookup maps without an API call.
- R8. A Cloudflare Pages routing rule (via `_redirects`, `_routes.json`, or a Pages Function) rewrites `/map/{type}/{slug}` requests to `map.html` so the client-side code can parse the path and resolve the entity.

### Static Image Export

- R9. A download button in the map controls exports the current view as a PNG at 2x the viewport resolution.
- R10. The export captures exactly what the user sees: active filters, dimmed/highlighted nodes, current zoom and pan, cluster labels. "What you see is what you get."
- R11. Both network view (canvas) and plot view (SVG) support export.
- R12. The downloaded file is named with the current view context (e.g., `mapping-ai-network-all.png`, `mapping-ai-plot-stance-vs-timeline.png`).

## Success Criteria

- A link like `mapping-ai.org/map/person/dario-amodei` loads the map and zooms to that entity with detail panel open.
- Sharing an entity copies the slug URL, and recipients land on the correct entity.
- Old ID-based links still resolve correctly.
- The download button produces a clear 2x PNG of the current map state for both network and plot views.

## Scope Boundaries

- No server-side rendering or OG image generation (could be a future addition for social previews).
- No resolution picker for image export. Single 2x export only.
- No detail-panel-as-card image export.
- Slug editing/customization by admins is out of scope (could be added later since the DB column supports it).
- No redirect from old `?entity=` URLs to new slug URLs. Both formats just work.

## Key Decisions

- **Type prefix in URL path**: `/map/person/...` and `/map/org/...` rather than flat `/map/dario-amodei`. Eliminates cross-type collisions and makes URLs self-documenting.
- **DB-stored slugs**: Stable across rebuilds, sharable, and manually overridable for edge cases. Requires a migration but avoids the fragility of build-time or client-side generation.
- **Numeric suffix for collisions**: Simple `-2`, `-3` suffixes for same-type name collisions rather than context-based disambiguators (org name, category). Predictable and doesn't break if the disambiguating data changes.
- **2x single-resolution export**: Keeps the UI simple. Good enough for presentations, reports, and social sharing.
- **WYSIWYG export**: Captures current filter/selection state rather than full unfiltered view.

## Dependencies / Assumptions

- Cloudflare Pages supports the routing rewrite needed for `/map/person/*` to serve `map.html`. This can be done via `_redirects` (splat rules) or a catch-all Pages Function.
- The slug backfill migration can run against prod without downtime (Neon supports online ALTER TABLE ADD COLUMN).
- `db:export-map` script will need updating to include the slug field in `map-data.json`.

## Outstanding Questions

### Deferred to Planning

- [Affects R2][Technical] What's the best slugify function to use? Need to handle unicode names, accented characters, CJK, etc.
- [Affects R8][Needs research] Should the routing rewrite use `_redirects` splat rules or a Pages Function? Need to check Cloudflare Pages capabilities for path-based rewrites to a specific HTML file.
- [Affects R9][Technical] For canvas export, should the download use `canvas.toBlob()` (async, better for large images) or `canvas.toDataURL()` (sync, simpler)?
- [Affects R11][Technical] For SVG plot export, should we use a library like html-to-canvas or serialize the SVG and render to a canvas for PNG conversion?
- [Affects R10][Technical] How to include UI elements outside the canvas (legend, axis labels in plot view) in the export? May need to composite multiple elements.

## Next Steps

→ `/ce:plan` for structured implementation planning
