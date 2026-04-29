# Deployment & Review Process

How code gets from a local branch to production, and what checks must pass at each stage.

> **Stack context:** Cloudflare Pages (static + Pages Functions) + Neon Postgres + R2. See [`docs/architecture/current.md`](architecture/current.md) for the full topology. AWS infrastructure is archived in `archive/aws-legacy/` with a rollback README.

---

## Architecture

```
Feature branch -> PR (review + CI) -> main -> Cloudflare Pages auto-deploy
                                               ├── Vite build -> dist/
                                               ├── Pages Functions (functions/api/*)
                                               └── Post-deploy smoke test
```

Pushing to `main` deploys both frontend and backend in one step. Cloudflare Pages builds from the GitHub repo, serves `dist/` as static assets and `functions/` as Pages Functions (API endpoints).

## Branch Strategy

| Branch   | Purpose                                   | Deploys to                               |
| -------- | ----------------------------------------- | ---------------------------------------- |
| `main`   | Production. Every push auto-deploys.      | mapping-ai.org                           |
| `feat/*` | Feature branches. Work in progress.       | Preview at `<hash>.mapping-ai.pages.dev` |
| `fix/*`  | Hotfix branches. Urgent production fixes. | Preview until merged to main             |

**Rules:**

- Never push directly to `main`. Always use a PR.
- Exception: P0 hotfixes (site is down) may push directly to main with post-hoc PR for documentation.
- Feature branches get automatic Cloudflare Pages preview deployments.
- PRs touching backend files (`api/`, `functions/`, `scripts/migrate*`, `scripts/seed*`, `scripts/enrich-*`) also get a Neon preview branch.

## Pull Request Requirements

### 1. Local verification

Before creating the PR, test locally:

```bash
pnpm run dev
```

| Page       | URL                       | What to check                                                           |
| ---------- | ------------------------- | ----------------------------------------------------------------------- |
| Contribute | localhost:5173/contribute | Form loads, dropdowns work, org search returns results                  |
| Map        | localhost:5173/map        | Map renders with nodes. Click a node, detail panel opens. Filters work. |
| Admin      | localhost:5173/admin      | Auth gate appears, can type password                                    |
| Insights   | localhost:5173/insights   | Charts render with data                                                 |
| Homepage   | localhost:5173/           | Page loads, navigation works                                            |

Also run:

```bash
pnpm exec tsc --noEmit    # Type checking
pnpm exec vitest run      # Unit tests
```

### 2. PR description

Include a summary, testing notes, and risk assessment.

### 3. CI checks pass

**`.github/workflows/ci.yml`** runs on every PR:

| Check                 | What it runs            |
| --------------------- | ----------------------- |
| Prettier format-check | `pnpm run format:check` |
| ESLint                | `pnpm run lint`         |
| TypeScript type-check | `pnpm run typecheck`    |
| Vitest                | `pnpm test`             |
| Vite build            | `pnpm run build`        |

**`.github/workflows/deploy.yml`** runs on push to `main`: builds, generates map-data.json from Neon, waits for Cloudflare Pages build, then runs a smoke test.

### 4. Review

- At least one human or thorough AI review must approve the PR
- Changes to map.html, D3 code, or script tags require extra scrutiny

## Deploy Process

```
git push origin main
-> Cloudflare Pages auto-build (~2-3 min)
-> GitHub Actions: map-data export + smoke test
-> Live at mapping-ai.org
```

**What gets deployed:** `dist/` (Vite build), `functions/` (Pages Functions), `public/_headers` (security headers)

**What does NOT get deployed:** `scripts/`, `archive/`, `node_modules/`, `src/` (compiled into dist)

## Rollback

### Quick rollback (~2 min)

```bash
# Revert the bad commit and push
git revert HEAD
git push origin main
# Cloudflare Pages rebuilds from the reverted state
```

### Full AWS rollback (emergency, ~10 min)

See `archive/aws-legacy/README.md` for the procedure: flip DNS back to CloudFront, Lambda + RDS are still warm.

## Post-Push Verification (MANDATORY)

After every push to main, verify the site works:

```bash
for page in "/" "/contribute" "/map" "/about" "/insights" "/admin"; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' https://mapping-ai.org${page}) ${page}"
done
```

The deploy workflow runs a smoke test automatically, but always verify manually too.

## Security Headers

CSP and security headers are configured in `public/_headers` (Cloudflare Pages convention). Changes to CSP policy go in that file and deploy with the next push to main.

## Environment & Secrets

Secrets are managed in two places:

| Secret               | Where                    | Purpose                         |
| -------------------- | ------------------------ | ------------------------------- |
| `DATABASE_URL`       | Cloudflare Pages secrets | Neon production connection      |
| `ADMIN_KEY`          | Cloudflare Pages secrets | Admin endpoint auth             |
| `DATABASE_URL`       | GitHub Secrets           | Deploy workflow map-data export |
| `CF_ANALYTICS_TOKEN` | GitHub Secrets           | Cloudflare Web Analytics        |
| `SITE_PASSWORD`      | GitHub Secrets           | Password gate hash              |

Set Cloudflare Pages secrets via: `npx wrangler pages secret put <NAME> --project-name mapping-ai`

## Known Risks by File

| File(s)                        | Risk                               | Key checks                                        |
| ------------------------------ | ---------------------------------- | ------------------------------------------------- |
| `map.html`                     | **P0**: primary product page       | Browser test: nodes render, D3 loads              |
| `src/contribute/`              | **P1**: can't collect data         | Form renders, dropdowns work, submission succeeds |
| `api/export-map.ts`            | **P0**: map data malformed         | Run export locally, verify JSON                   |
| `functions/api/admin.ts`       | **P1**: admin can't approve/reject | Test with admin key                               |
| `.github/workflows/deploy.yml` | **P0**: deploy pipeline breaks     | Review carefully                                  |
| `src/hooks/useSubmitEntity.ts` | **P1**: form submission broken     | Test submit end-to-end                            |
| `src/lib/api.ts`               | **P1**: all API calls broken       | Check search + submit work                        |
| `public/_headers`              | **P1**: CSP blocks scripts/styles  | Check response headers after deploy               |

## Incident Response

If the live site is broken:

1. **Assess:** Is the map empty? Whole site down? Just a visual glitch?
2. **Check CI:** `gh run list --limit 1` (did the last deploy succeed?)
3. **Identify:** `git log --oneline -5` (what changed?)
4. **Fix or revert:** obvious fix -> commit and push. Unclear -> `git revert HEAD && git push`
5. **Verify:** Wait for Cloudflare Pages deploy (~2-3 min), check all pages
6. **Document:** Write a post-mortem in `docs/post-mortems/`
