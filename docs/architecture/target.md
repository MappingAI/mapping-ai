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

| Area                | Before                             | After                                            | Status                                           |
| ------------------- | ---------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| **Package manager** | npm                                | **pnpm**                                         | **✅ 2026-04-21**                                |
| **Database**        | AWS RDS Postgres 17                | **Neon Postgres (+ preview branches)**           | **✅ 2026-04-28**                                |
| **Static storage**  | AWS S3                             | **Cloudflare R2 (claims + AGI defs)**            | **✅ 2026-04-26** (partial: thumbnails still S3) |
| **CDN**             | AWS CloudFront                     | **Cloudflare Pages**                             | **✅ 2026-04-28**                                |
| **Compute**         | AWS Lambda + API Gateway (6 fns)   | **Cloudflare Pages Functions (6 fns)**           | **✅ 2026-04-28**                                |
| **IaC**             | AWS SAM                            | **`wrangler.toml` + Cloudflare Pages dashboard** | **✅ 2026-04-28**                                |
| **Deploy trigger**  | push to main → GitHub Actions → S3 | **push to main → Cloudflare Pages auto-build**   | **✅ 2026-04-28**                                |
| **DNS**             | Cloudflare (DNS-only → CloudFront) | **Cloudflare (proxied → Pages)**                 | **✅ 2026-04-28**                                |
| **Secrets**         | GitHub Secrets + Lambda env        | **Cloudflare Pages secrets + GitHub Secrets**    | **✅ 2026-04-28**                                |
| Analytics           | Cloudflare Web Analytics           | Cloudflare Web Analytics (unchanged)             | (none)                                           |
| Frontend build      | Vite 8 MPA                         | Vite 8 MPA (TanStack Start shelved)              | Shelved                                          |
| Map page            | Inline HTML + D3 + Canvas          | Inline HTML + D3 + Canvas (React port shelved)   | Shelved                                          |

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
