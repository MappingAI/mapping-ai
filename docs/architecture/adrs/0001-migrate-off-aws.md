# ADR-0001: Migrate off AWS to Cloudflare + Neon + TanStack Start

**Status:** Accepted
**Date:** 2026-04-21
**Authors:** Anushree Chaudhuri, with advice from Raunak (Reducto)

## Context

The current stack (see [`current.md`](../current.md)) runs on AWS: RDS Postgres, Lambda + API Gateway (6 functions), S3 + CloudFront, SAM for IaC, GitHub Actions for CI/CD, npm for packages. Cloudflare provides DNS only.

Pain points that accumulated over the first three launch phases (Phase 1 trusted contacts through Phase 3 public release, shipped April 2026):

1. **SAM deploy is a landmine.** Running `sam deploy` for a 2-line CORS change on 2026-04-16 wiped all CloudFront config (custom domains, SSL cert, URL rewrite function) that was set manually in the AWS Console but not in `template.yaml`. Caused a full production outage. The failure mode is structural: CloudFormation treats the template as sole source of truth and silently resets drift.
2. **Two deploy units.** Frontend auto-deploys on push to main, backend (Lambda) requires separate manual `sam build && sam deploy`. Easy to forget. Rollbacks are awkward because the two units can get out of sync.
3. **AWS is hostile to contributors.** Onboarding a collaborator requires AWS IAM setup, SAM CLI, configured credentials, and understanding of the SAM/CloudFormation model. For a project where we want external contributors (and soon an OpenAI engineer implementing search/chatbot), this is unnecessary friction.
4. **No ergonomic preview DBs.** Testing PRs against a non-production DB requires spinning up additional RDS instances or hand-managing staging data. We've run into data contamination and credential-leak incidents (2026-04-18) partly because staging and prod lived in the same AWS account.
5. **Lambda cold starts + separate backend** make local development feel different from production. `dev-server.js` (Express) diverges from Lambda handlers in subtle ways.
6. **npm is slow and wastes disk** across projects.

Meanwhile, an OpenAI engineer has offered to implement the search/chatbot feature. The short-term goal is to hand them a codebase that's easy to onboard into, with preview deploys that Just Work. Migrating infrastructure first means they never have to learn the AWS side.

## Decision

Migrate the stack from AWS to:

- **Cloudflare Workers** for compute + static hosting (via TanStack Start)
- **Neon Postgres** for the database, with per-PR preview branches
- **Cloudflare R2** for object storage (map-data.json, thumbnails)
- **TanStack Start** as the frontend framework (replacing Vite MPA + separate Lambda backend)
- **pnpm** for package management
- **`wrangler deploy`** as the single deploy command for frontend + backend + static assets

Migrate in phases (see [target.md](../target.md) for the status table):

- **Phase 0:** docs hygiene. Establish `docs/architecture/` as the single source of truth for architecture. Stop asserting stack details in CLAUDE.md and memory files.
- **Phase 1:** low-risk standalone wins. pnpm migration, security baseline via `/security-review`, reconnaissance on thumbnail pipeline and pending-entity IDs.
- **Phase 2:** Neon Postgres migration. Per-PR preview branch workflow. RDS kept warm as fallback.
- **Phase 3:** TanStack Start + Cloudflare Workers + R2. Largest change, preceded by a throwaway spike of the map page alone to prove D3 + Canvas + Tiptap survive the framework.
- **Phase 4:** Preview deploys wired end-to-end (Neon branch + wrangler preview URL per PR). Contractor-facing onboarding docs.
- **Phase 5:** Tech debt cleanup (pending-entity IDs, analytics upgrade, enrichment flow isolation).

## Alternatives considered

### Stay on AWS

Rejected. The SAM drift failure mode is real and won't go away without moving off CloudFormation. Collaborator friction is real and won't go away without moving off AWS credentials. The cost/benefit of familiarity is outweighed by the cost of every onboarded contributor (human or agent) having to learn AWS specifics.

### Next.js + Vercel

Rejected. Next.js defaults to dynamic rendering on every request. Static pages (landing, about) would be dynamically served by a Worker unless carefully configured to pre-render. The framework is bloated for our needs. TanStack Start keeps static content static by default.

### Drizzle + another Postgres-compatible DB

Not evaluated in depth. Neon's per-branch preview feature is the load-bearing benefit; other providers (Supabase, Railway) don't offer the same branching UX. Revisit if Neon becomes untenable for other reasons.

### Keep AWS but move off CloudFormation

Considered. Terraform or Pulumi would avoid the SAM drift problem. Rejected because it doesn't address the onboarding-friction or preview-DB problems.

## Consequences

**What changes:**

- Single deploy command (`wrangler deploy`) replaces the current two-step (GitHub Actions for frontend, manual `sam deploy` for backend)
- 6 Lambda handlers (`api/*.ts`) become TanStack Start server routes (directory structure may change)
- `template.yaml`, `samconfig.toml` retire. `wrangler.toml` takes their place.
- `map.html` becomes a client-rendered React component inside the TanStack Start app. The current inline D3 + Canvas logic ports into that component.
- `package-lock.json` is replaced by `pnpm-lock.yaml`. CI and contributor docs update to `pnpm install` / `pnpm run`.
- Environment variables move from Lambda env + SAM parameters to Cloudflare Workers secrets + GitHub Secrets.
- Every PR gets its own Neon DB branch and wrangler preview URL.

**What stays:**

- Database schema. Neon is Postgres-compatible; migration is connection string + `pg_dump`/`pg_restore`.
- API contract (request/response shapes, CORS allowlist, route names).
- Client-side search-and-cache pattern using `map-data.json`.
- Cloudflare Web Analytics. Already on Cloudflare.
- Writing style, safety rules, PR requirements, branch protection, test-after-push discipline.

**Risks:**

- TanStack Start is newer than Next.js and less battle-tested for complex interactive visualization. The map page's 5700+ lines of D3 + Canvas 2D is the specific risk. Mitigation: throwaway spike of the map page alone in TanStack Start before committing to full Phase 3.
- Dual-running cost during the migration window (AWS + Cloudflare both active). Keep AWS running until Phase 3 cutover has been stable for ≥1 week.
- Documentation rot during migration. Mitigation: Phase 0 establishes `docs/architecture/` so that `current.md` flips atomically at cutover and nothing else asserts infra.
- CSP + URL rewrite + throttling behaviors need explicit re-implementation in the Cloudflare Workers model. Easy to miss a subtle behavior. Mitigation: write a checklist per Lambda function before porting.

**Compensating controls during migration:**

- `current.md` reflects today's live prod at every point. Never lies about "we're migrating" mid-sentence.
- `target.md` status table marks each row as shipped / in-progress / planned with PR links.
- AWS infra stays up throughout Phase 1-2 so rollback is cheap.
- Each phase is a separate PR (or series of PRs) with `/security-review` run before merge.
- Post-mortem docs keep their AWS-era context; they are framed as "as of [date], AWS stack" rather than deleted.

## References

- [`current.md`](../current.md): live production stack as of 2026-04-21
- [`target.md`](../target.md): target architecture and migration status table
- `docs/solutions/integration-issues/sam-deploy-overwrites-manual-cloudfront-config-2026-04-16.md`: SAM drift incident
- `docs/post-mortems/2026-04-18-workshop-overwrite-and-credential-leak.md`: staging/prod separation incident
- Raunak's guidance transcript (2026-04-21): rationale for TanStack Start over Next.js, Neon over RDS, R2 over S3, pnpm over npm
- https://ai-sdk.dev/docs/getting-started/tanstack-start: target stack integration pattern for the OpenAI contractor's search/chatbot work (Phase 5 or later; out of scope for the current migration)
