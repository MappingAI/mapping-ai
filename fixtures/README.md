# Fixtures

Static sample data used when the app runs without a live database connection — a public fork should be able to `git clone && npm install && npm run dev` and see a working map without setting up RDS or API keys.

## Files

| File | Purpose |
|------|---------|
| `map-data.json` | Small synthetic dataset (≈10 entities + a few edges) spanning the main categories. Loaded by `src/lib/api.ts` as a fallback when the live `/map-data.json` isn't available. |
| `map-detail.json` | Matching detail file. Same fallback pattern. |

## What makes this safe to commit publicly

The entities here are **fictional**. Names, quotes, and affiliations don't reference any real person or organization. This is intentional: fixture files commit to git history and a PII leak would be irreversible.

Live production data never flows through this directory.

## Refreshing the fixture

The current fixture is hand-crafted. A future `scripts/generate-fixtures.ts` (tracked as a follow-up PR) will pull a sanitized snapshot from the live DB using an allowlist sanitizer — this is the maintainer-only workflow.

Until that lands, updating the fixture is a manual edit. Keep it:
- Small (≈10 entities) — just enough to exercise the map's category clusters and edge rendering.
- Obviously synthetic — fictional names, no real quotes or affiliations.
- Schema-current — match the fields `api/export-map.js` produces, which is what `src/types/entity.ts` describes.

After editing, run `npm run build` to confirm the frontend still parses it cleanly.

## Why a hand-crafted baseline instead of skipping fixtures entirely

Without this file, a first-time contributor runs `npm run dev` and sees an empty map with a network error — a discouraging first impression. A handful of fake entities turn that into a working demo they can immediately tinker with.
