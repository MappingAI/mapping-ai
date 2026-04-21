# Target architecture

**Status:** planned. See [ADR-0001](adrs/0001-migrate-off-aws.md) for the decision and rationale.

This document describes where the stack is heading. Everything here is **not yet implemented** unless explicitly marked shipped. For what's actually running today, read [`current.md`](current.md).

---

## Topology (target)

```
              ┌──────────────────┐
  users ────► │ Cloudflare DNS   │
              └────────┬─────────┘
                       │
              ┌────────▼─────────────────┐
              │ Cloudflare Workers       │ (TanStack Start: static + server routes)
              │ - static HTML/CSS/JS     │
              │ - /api/* server routes   │
              └────┬──────────────┬──────┘
                   │              │
           ┌───────▼──────┐  ┌────▼────────┐
           │ Cloudflare R2│  │ Neon        │
           │ (static JSON │  │ Postgres    │
           │  + thumbs)   │  │ (+ branches)│
           └──────────────┘  └─────────────┘
```

## Status table

| Area                | Current                          | Target                                              | Phase                     |
| ------------------- | -------------------------------- | --------------------------------------------------- | ------------------------- |
| **Package manager** | **pnpm (shipped)**               | pnpm                                                | **Phase 1 ✅ 2026-04-21** |
| Database            | AWS RDS Postgres 17              | Neon Postgres (+ preview branches)                  | Phase 2                   |
| Static storage      | AWS S3                           | Cloudflare R2                                       | Phase 2 or 3              |
| CDN                 | AWS CloudFront                   | Cloudflare (Workers + R2)                           | Phase 3                   |
| Compute             | AWS Lambda + API Gateway (6 fns) | TanStack Start server routes                        | Phase 3                   |
| Frontend build      | Vite 8 MPA                       | TanStack Start                                      | Phase 3                   |
| Map page            | Inline HTML + D3 + Canvas        | Client-rendered React component                     | Phase 3                   |
| IaC                 | AWS SAM                          | `wrangler.toml`                                     | Phase 3                   |
| Deploy trigger      | push to main → GitHub Actions    | push to main → `wrangler deploy` via GitHub Actions | Phase 3                   |
| DNS                 | Cloudflare (DNS-only)            | Cloudflare (Workers-aware)                          | Phase 3                   |
| Analytics           | Cloudflare Web Analytics         | Cloudflare Web Analytics (unchanged for now)        | (none)                    |
| Secrets             | GitHub Secrets + Lambda env      | Cloudflare Workers secrets + GitHub Secrets         | Phase 3                   |

Shipped rows get marked in bold and linked to the PR that delivered them. Rows stay in this table after shipping so the "before/after" contrast remains explicit.

## Key principles (target)

1. **Frontend never touches the database directly.** All writes go through TanStack Start server routes. Already true today via Lambda; preserved through the migration.
2. **Static pages stay static.** Landing, about, theory-of-change, workshop: pre-rendered at build. Not dynamically served by a Worker on every request.
3. **Map + insights pages are client-rendered React components.** Not SSR, not static. Client fetches `map-data.json` from R2, renders in browser.
4. **Contribute form is client-rendered + posts to a server route.** Hosted on the same TanStack Start deploy as the rest of the app.
5. **One deploy unit.** `wrangler deploy` ships frontend + backend routes + static assets in one operation. No separate backend deploy step (contrast with current AWS stack where `sam deploy` is manual and separate).
6. **Preview deploys = live + isolated.** Every PR gets a wrangler preview URL and a Neon DB branch. The OpenAI contractor and future collaborators should be able to land feature PRs, click a preview URL, and see it backed by its own database without touching production.

## Open questions

These resolve before or during Phase 3, not now. Captured here so they don't get lost.

- **CSP + security headers:** currently configured in `template.yaml` on the CloudFront response headers policy. In Cloudflare Workers, CSP is set in response headers from the Worker itself or via Transform Rules. Migrate the CSP ruleset without loosening it.
- **URL rewrites:** CloudFront Function rewrites `/contribute` → `/contribute.html`. TanStack Start's router handles clean URLs natively; the rewrite function becomes unnecessary but verify nothing relies on the old behavior.
- **Throttling:** `/semantic-search` is rate-limited at the API Gateway layer (1 req/s + 3 burst). Cloudflare Workers has per-zone and per-route rate limiting; replicate this ceiling.
- **Admin endpoint auth:** currently a static `ADMIN_KEY` env var + `X-Admin-Key` header. Preserved as-is for now; any upgrade to real auth is a separate decision (see `memory/db_audit_log.md` for related planned work).
- **Pending-entity ID system:** currently uses negative IDs as a placeholder. Decouple from migration; see Phase 5 in ADR-0001.
- **Thumbnail pipeline:** keep the `scripts/cache-thumbnails.js` flow. Upload target flips from S3 to R2. `entity.thumbnail_url` single-source-of-truth rule preserved.

## What does NOT change

- Database schema (`entity`, `submission`, `edge`). Neon is Postgres-compatible. Migration is connection-string and data copy, not schema redesign.
- API contract (request/response shapes, CORS allowlist, CORS headers). Route names stay (`/submit`, `/search`, etc.).
- The client-side search-and-cache pattern using `map-data.json`. Store moves from S3 to R2; fetch URL changes; semantics stay.
- Cloudflare Web Analytics. Already on Cloudflare; unaffected by migration.
- Writing style, safety rules, PR requirements, branch protection, test-after-push discipline.
